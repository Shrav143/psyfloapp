import { useState } from "react";
import { FilePlus2 } from "lucide-react";
import { Button, FileDrop, FileRow, Modal, type DemoFile } from "@/components/ui";
import { sampleDocument, SUPPORTING_SAMPLES } from "@/data/intake/samples";
import type { IntakeRecord } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { useStore } from "@/store";
import { readReferralDocument } from "./agent";

/** Add a document to the record (a synthetic sample, or any dropped file the demo does not read), then Reader reads it for anything new. */
export function AddDocumentButton({ record, onAdded }: { record: IntakeRecord; onAdded: (docId: string) => void }) {
  const add = useStore((s) => s.addIntakeDocument);
  const toast = useStore((s) => s.toast);
  const [open, setOpen] = useState(false);
  const options = SUPPORTING_SAMPLES.filter((s) => s.fits(record));
  const [pick, setPick] = useState(options[0]?.id ?? "");
  const [file, setFile] = useState<DemoFile | null>(null);
  const close = () => {
    setOpen(false);
    setFile(null);
  };
  const submit = () => {
    const sample = options.find((o) => o.id === pick) ?? options[0];
    if (!sample) return;
    const built = sample.build(record);
    const st = useStore.getState();
    const doc = sampleDocument(built, `doc-${record.id}-${Date.now().toString(36)}`, st.clock);
    add(record.id, doc, file ? `${file.name} was not read; the demo attached the ${sample.label.toLowerCase()} sample instead (simulated import)` : "Simulated import");
    const task = readReferralDocument(record.id, doc, built.extract);
    onAdded(doc.id);
    /* A paused agent raises its own notice. */
    if (task) toast({ title: `Added: ${doc.name}`, body: "Reader is reading it. Suggestions appear for review.", tone: "good" });
    close();
  };
  return (
    <>
      <Button size="sm" icon={FilePlus2} onClick={() => setOpen(true)} data-add-doc>Add a document</Button>
      {open ? (
        <Modal
          open
          onClose={close}
          title="Add a document"
          subtitle={`${record.id} · Reader reads it and suggests anything new. Nothing is saved until a person accepts it.`}
          footer={
            <>
              <Button onClick={close}>Cancel</Button>
              <Button variant="primary" onClick={submit} disabled={!options.length}>Add and read it</Button>
            </>
          }
        >
          <div role="radiogroup" aria-label="Sample document" className="flex flex-col gap-2">
            {options.map((o) => {
              const on = o.id === pick;
              return (
                <button key={o.id} type="button" role="radio" aria-checked={on} data-support={o.id} onClick={() => setPick(o.id)} className={cn("flex items-start gap-3 rounded-2xl border px-4 py-3 text-left", on ? "border-forest bg-sage-bg" : "border-edge bg-white hover:bg-tile")}>
                  <span className={cn("mt-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px]", on ? "border-forest" : "border-[#D9D6CF]")}>{on ? <span className="h-2 w-2 rounded-full bg-forest" /> : null}</span>
                  <span>
                    <span className="block text-[14px] font-semibold">{o.label}</span>
                    <span className="block text-[13px] text-muted">{o.summary} · synthetic sample</span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-4">
            {file ? <FileRow file={file} onRemove={() => setFile(null)} status="warn" /> : <FileDrop onFiles={(f) => setFile(f[0] ?? null)} hint="Or drop your own file" />}
            <p className="mt-1.5 text-[12px] text-muted">The demo does not read your file. It attaches the selected sample instead and the record says so.</p>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
