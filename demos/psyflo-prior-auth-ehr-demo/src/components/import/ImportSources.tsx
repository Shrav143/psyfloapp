import { useEffect, useRef, useState, type ReactNode } from "react";
import { ClipboardPaste, CloudDownload, FileUp, ImageUp, Upload, X } from "lucide-react";
import { Button, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { EmrPull } from "./EmrPull";
import { makeDoc } from "./fields";
import { MappingStep } from "./MappingStep";
import { ReviewList, type Found } from "./ReviewList";
import { SAMPLE_CSV, sampleShotUrl, simulatedRead } from "./samples";
import { parseDelimited, parseXlsx, readTable, type Table } from "./table";
import type { ImportResult, ImportSource, ImportSourcesProps } from "./types";

const READ_MS = 1000;
const FILE_ACCEPT = ".csv,.tsv,.txt,.xlsx,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const MOD = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";

type Phase =
  | { at: "choose" }
  | { at: "reading"; thumb?: string; name: string }
  | { at: "mapping"; table: Table; fileName: string }
  | { at: "review"; found: Found; source: ImportSource; sourceLabel: string; thumb?: string; simulated: boolean };

const isImage = (f: File): boolean => f.type.startsWith("image/");
const isPdf = (f: File): boolean => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isXlsx = (f: File): boolean => /\.xlsx$/i.test(f.name) || f.type.includes("spreadsheetml");
const titleOf = (name: string): string => name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim() || name;
const dataUrl = (f: File): Promise<string> =>
  new Promise((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => fail(r.error);
    r.readAsDataURL(f);
  });

/** A drop zone that also opens the file chooser. Files stay in the browser. */
function Zone({ label, accept, icon: Icon, onFile, focus, children }: { label: string; accept: string; icon: typeof Upload; onFile: (f: File) => void; focus?: boolean; children: ReactNode }) {
  const input = useRef<HTMLInputElement>(null);
  const zone = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);
  useEffect(() => {
    if (focus) zone.current?.focus();
  }, [focus]);
  return (
    <>
      <div
        ref={zone}
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            input.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOver(false);
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
        className={cn("flex min-h-[56px] cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-dashed px-4 text-center text-[13px] text-muted transition-colors", over ? "border-forest bg-[#F3F7F4]" : "border-field bg-tile hover:bg-[#F3EDE4]")}
      >
        <Icon size={16} className="ico shrink-0" aria-hidden="true" />
        {children}
      </div>
      <input
        ref={input}
        type="file"
        hidden
        accept={accept}
        aria-label={label}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

const LINK = "text-[13px] font-medium text-forest underline underline-offset-2 hover:text-forest-dark";

/** Three ways to bring a record in: pull from a connected EMR, import an export (CSV or XLSX with a field mapping, or a PDF), or paste a screenshot.
    Every way ends in the same review, and nothing is applied until Apply. Files and images are read in the browser and never uploaded. */
export function ImportSources({ target, onImport, emr, compact, className, current, emrChart, initial, extra }: ImportSourcesProps) {
  const [mode, setMode] = useState<ImportSource | null>(initial ?? null);
  const [phase, setPhase] = useState<Phase>({ at: "choose" });
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const offerEmr = !!emr && target !== "denial_letter";

  const open = (m: ImportSource | null) => {
    clearTimeout(timer.current);
    setError(null);
    setPhase({ at: "choose" });
    setMode(m);
  };
  const review = (found: Found, source: ImportSource, sourceLabel: string, extra?: { thumb?: string; simulated?: boolean }) => {
    setMode(source);
    if (!found.fields.length && !found.documents.length) {
      setPhase({ at: "choose" });
      setError(`Nothing to import was found. ${found.unread.length ? found.unread.map((u) => `${u.label}: ${u.problem}`).join(". ") : ""}`.trim());
      return;
    }
    setPhase({ at: "review", found, source, sourceLabel, thumb: extra?.thumb, simulated: !!extra?.simulated });
  };
  /** FLO reads a screenshot or a PDF: about a second, then the fields found. The demo's reading is simulated and the same file always reads the same. */
  const readLater = (source: ImportSource, name: string, seed: string | null, label: string, thumb?: string, asDocument?: string) => {
    setError(null);
    setMode(source);
    setPhase({ at: "reading", thumb, name });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const r = simulatedRead(target, seed);
      const pdfDoc = asDocument ? [makeDoc(asDocument)] : [];
      const fields = asDocument ? r.fields.map((f) => ({ ...f, confidence: "check" as const })) : r.fields;
      review({ fields: target === "documents" && asDocument ? [] : fields, documents: target === "documents" && asDocument ? pdfDoc : [...pdfDoc, ...r.documents], unread: [] }, source, label, { thumb, simulated: true });
    }, READ_MS);
  };
  const toMapping = (table: Table, fileName: string) => {
    if (!table.headers.length || !table.rows.length) {
      setError(`${fileName} has no rows to import.`);
      return;
    }
    setError(null);
    setMode("file");
    setPhase({ at: "mapping", table, fileName });
  };

  /** Any file, from the chooser, a drop or a paste, goes the way its type says. */
  const take = async (f: File, how: "paste" | "drop" | "choose") => {
    setError(null);
    try {
      if (isImage(f)) {
        const thumb = await dataUrl(f);
        readLater("screenshot", f.name, `${f.size}|${f.type}`, how === "paste" ? "From a pasted screenshot" : `From screenshot ${f.name}`, thumb);
      } else if (isPdf(f)) readLater("file", f.name, `${f.name}|${f.size}`, `From ${f.name}`, undefined, titleOf(f.name));
      else if (isXlsx(f)) toMapping(await parseXlsx(await f.arrayBuffer()), f.name);
      else if (/\.(csv|tsv|txt)$/i.test(f.name) || f.type.startsWith("text/")) toMapping(parseDelimited(await f.text()), f.name);
      else setError(`${f.name} is not a CSV, XLSX, PDF or image.`);
    } catch {
      setError(`Could not read ${f.name}. Save it as CSV and try again.`);
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if ((e.target as HTMLElement).closest("input, textarea, [contenteditable='true']")) return;
    const items = Array.from(e.clipboardData.items);
    const file = Array.from(e.clipboardData.files)[0] ?? items.find((i) => i.kind === "file")?.getAsFile() ?? null;
    if (file) {
      e.preventDefault();
      void take(file, "paste");
      return;
    }
    /* Cells copied from a spreadsheet arrive as tab-separated text: they map like an export. */
    const text = e.clipboardData.getData("text/plain");
    if (text && text.trim().includes("\n") && /[\t,]/.test(text)) {
      e.preventDefault();
      toMapping(parseDelimited(text), "Pasted cells");
    }
  };

  const apply = (p: Extract<Phase, { at: "review" }>, fields: ImportResult["fields"], documents: NonNullable<ImportResult["documents"]>) => {
    onImport({ source: p.source, sourceLabel: p.sourceLabel, fields, documents });
    open(null);
  };

  const ways: { id: ImportSource; label: string; icon: typeof Upload }[] = [
    ...(offerEmr ? [{ id: "emr" as const, label: "Pull from EMR", icon: CloudDownload }] : []),
    { id: "file", label: "Import a file", icon: FileUp },
    { id: "screenshot", label: "Paste a screenshot", icon: ClipboardPaste },
  ];

  const body = (() => {
    if (phase.at === "reading") {
      return (
        <div className="flex items-center gap-3" role="status" aria-live="polite">
          {phase.thumb ? <img src={phase.thumb} alt="The screenshot being read" className="h-12 w-[72px] rounded-md border border-line object-cover object-left-top" /> : null}
          <Spinner />
          <span className="text-[13px] text-ink2">Reading{phase.thumb ? "" : ` ${phase.name}`}…</span>
        </div>
      );
    }
    if (phase.at === "mapping") {
      return (
        <MappingStep
          table={phase.table}
          target={target}
          fileName={phase.fileName}
          onCancel={() => open("file")}
          onApply={(mapping, row) => review(readTable(phase.table, mapping, row, target), "file", phase.fileName === "Pasted cells" ? "From pasted cells" : `From export ${phase.fileName}`)}
        />
      );
    }
    if (phase.at === "review") {
      return <ReviewList found={phase.found} sourceLabel={phase.sourceLabel} thumb={phase.thumb} simulated={phase.simulated} current={current} onCancel={() => open(phase.source)} onApply={(f, d) => apply(phase, f, d)} />;
    }
    if (mode === "emr") return <EmrPull target={target} preferred={emrChart} onFound={(found, label) => review(found, "emr", label)} />;
    if (mode === "file") {
      const sample = SAMPLE_CSV[target];
      return (
        <div className="flex flex-col gap-2">
          <Zone label="Choose or drop a CSV, XLSX or PDF export" accept={FILE_ACCEPT} icon={Upload} onFile={(f) => void take(f, "choose")}>
            Choose or drop a CSV, XLSX or PDF export
          </Zone>
          <div>
            <button type="button" className={LINK} onClick={() => toMapping(parseDelimited(sample.text), sample.name)}>
              Use a sample export
            </button>
          </div>
        </div>
      );
    }
    if (mode === "screenshot") {
      return (
        <div className="flex flex-col gap-2">
          <Zone label={`Paste a screenshot with ${MOD}+V, or drop or choose an image`} accept="image/*" icon={ImageUp} onFile={(f) => void take(f, "choose")} focus>
            Paste ({MOD}+V), drop or choose an image
          </Zone>
          <div>
            <button type="button" className={LINK} onClick={() => readLater("screenshot", "sample", null, "From the sample screenshot", sampleShotUrl(target))}>
              Use a sample screenshot
            </button>
          </div>
        </div>
      );
    }
    return null;
  })();

  return (
    <section
      aria-label="Import from the EHR"
      tabIndex={-1}
      onPaste={onPaste}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files[0];
        if (f) void take(f, "drop");
      }}
      className={cn("outline-none", compact ? "" : "rounded-2xl border border-edge bg-white px-4 py-3", className)}
    >
      <div className="flex flex-wrap items-center gap-2">
        {ways.map((w) => (
          <Button
            key={w.id}
            size="sm"
            icon={w.icon}
            aria-pressed={mode === w.id}
            onClick={() => open(mode === w.id ? null : w.id)}
            className={cn(mode === w.id && "border-forest bg-[#F3F7F4]")}
          >
            {w.label}
          </Button>
        ))}
        {extra ? (
          <>
            <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-line min-[640px]:block" />
            {extra}
          </>
        ) : null}
        {mode ? (
          <button type="button" aria-label="Close import" onClick={() => open(null)} className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-tile hover:text-ink">
            <X size={16} className="ico" />
          </button>
        ) : null}
      </div>
      {mode || phase.at !== "choose" || error ? (
        <div className={cn("psy-fade-up mt-3 flex flex-col gap-2", compact && "rounded-2xl border border-edge bg-white px-4 py-3")}>
          {body}
          {error ? (
            <p role="alert" className="text-[13px] text-risk-ink">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
