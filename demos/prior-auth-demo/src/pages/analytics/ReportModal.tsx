import { useEffect, useState } from "react";
import { Check, FileDown, FileSpreadsheet, Printer } from "lucide-react";
import { AgentChip, Button, Modal, Spinner } from "@/components/ui";
import { blockedInHosted } from "@/lib/hosted";
import { useStore } from "@/store";
import { downloadFile, reportCsv, reportDoc, reportMarkdown, type ReportInput } from "./report";
import { ReportSheet } from "./ReportSheet";

const STEP_MS = 750;

/** Analyst "builds" the monthly report in four short steps, then offers the real files and a printout. */
export function ReportModal({ input, onClose }: { input: ReportInput; onClose: () => void }) {
  const b = input.board;
  const steps = [`Collecting the decisions for ${b.period.phrase}`, "Dropping any figure with fewer than 20 decisions", "Writing the summary", "Laying out the report"];
  const [done, setDone] = useState(0);
  const finished = done >= steps.length;

  useEffect(() => {
    if (finished) return;
    const t = setTimeout(() => setDone((d) => d + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [done, finished]);

  const f = b.filters;
  const base = `psyflo-monthly-report-${f.period}-${f.payer}-${f.program.toLowerCase()}-${f.dx}-${input.siteKey}`;
  const save = (kind: "md" | "csv") => {
    if (blockedInHosted("Download")) return;
    if (kind === "md") downloadFile(`${base}.md`, "text/markdown;charset=utf-8", reportMarkdown(input));
    else downloadFile(`${base}.csv`, "text/csv;charset=utf-8", reportCsv(input));
    useStore.getState().toast({ title: "Report downloaded", body: `${base}.${kind} has the figures you see on this page.`, tone: "good" });
  };
  /* The printer gets ReportSheet, a plain page of the same figures, not the screen behind the window. */
  const print = () => {
    if (blockedInHosted("Print")) return;
    window.print();
  };
  const doc = reportDoc(input);
  const subtitle = doc.meta.slice(0, 5).map((m) => m.replace(/^[^:]+: /, "")).join(" · ");

  return (
    <Modal open onClose={onClose} title="Monthly report" subtitle={subtitle} footer={<Button onClick={onClose}>{finished ? "Done" : "Cancel"}</Button>}>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted">
        Built by <AgentChip agent="analyst" />
      </div>
      <ol className="flex flex-col gap-3" aria-label="Report steps">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span className="grid h-6 w-6 place-items-center">{i < done ? <Check size={18} className="ico text-good" aria-label="Done" /> : i === done ? <Spinner /> : <span className="h-2 w-2 rounded-full bg-[#D9D6CF]" />}</span>
            <span className={i > done ? "text-muted" : undefined}>{s}</span>
          </li>
        ))}
      </ol>
      {finished ? (
        <div className="psy-fade-up mt-5 rounded-2xl border border-good-edge bg-good-bg px-4 py-3.5">
          <div className="font-semibold text-good-ink">Your report is ready</div>
          <p className="mt-0.5 text-[13px] text-good-ink">Same figures as this page, for the site view and filters you have set. Save a file or print it.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" icon={FileDown} onClick={() => save("md")}>
              Download report
            </Button>
            <Button icon={FileSpreadsheet} onClick={() => save("csv")}>
              Download data (CSV)
            </Button>
            <Button icon={Printer} onClick={print}>
              Print
            </Button>
          </div>
        </div>
      ) : null}
      {finished ? <ReportSheet doc={doc} /> : null}
    </Modal>
  );
}
