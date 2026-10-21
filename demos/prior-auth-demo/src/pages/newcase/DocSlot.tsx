import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, CircleDashed, Sparkles } from "lucide-react";
import { FileDrop, FileRow, Spinner, type DemoFile } from "@/components/ui";
import type { CaseDraft, DocSlotId } from "@/data/cases";
import { payerById } from "@/data/seed";
import { cn } from "@/lib/cn";
import { useStore } from "@/store";
import { DOC_SLOTS, findingText, isOpen, makeDocument, openFindings } from "./documents";
import { DocPreviewDrawer } from "./DocPreviewDrawer";

const STEP_MS = 550;

/** The progress list shown while a file is checked: scanning, the payer's guidelines, required components, completeness. */
function Validating({ step, payer, file }: { step: number; payer: string; file: string }) {
  const labels = ["Scanning the file", `Checking ${payer} guidelines`, "Verifying required components", "Confirming everything is complete"];
  return (
    <ul className="rounded-xl bg-tile px-3.5 py-3" role="status">
      <li className="mb-1 truncate text-[13px] font-semibold">
        Validating <span className="font-normal text-muted">{file}</span>
      </li>
      {labels.map((l, i) => (
        <li key={l} className={cn("flex items-center gap-2.5 py-[3px] text-[13px]", i > step && "text-muted")}>
          {i < step ? <CircleCheck size={15} className="ico text-good" /> : i === step ? <Spinner size={15} /> : <CircleDashed size={15} className="ico text-faint" />}
          {l}
        </li>
      ))}
    </ul>
  );
}

/** One document slot: drop zone, then the file, then what the check found. */
export function DocSlot({ draft, slot, required }: { draft: CaseDraft; slot: DocSlotId; required: boolean }) {
  const def = DOC_SLOTS[slot];
  const doc = draft.documents.find((d) => d.slot === slot);
  const put = useStore((s) => s.putCaseDocs);
  const drop = useStore((s) => s.dropCaseDoc);
  const finish = useStore((s) => s.finishCaseDoc);
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState(false);
  const [view, setView] = useState(false);
  const payer = draft.payerId ? payerById(draft.payerId).shortName : "the payer";
  const validating = doc?.status === "validating";
  const fileId = doc?.file.id;

  useEffect(() => {
    if (!validating) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => s + 1), STEP_MS);
    return () => clearInterval(t);
  }, [validating, fileId]);
  useEffect(() => {
    if (validating && step >= 4) finish(draft.id, slot);
  }, [validating, step, finish, draft.id, slot]);

  const open = doc ? openFindings(doc, draft.answers) : 0;
  const status = validating ? "checking" : open ? "warn" : "ok";

  return (
    <div className="rounded-2xl border border-edge bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold">
          {def.label}
          {required ? <span className="text-risk" aria-label="Required"> *</span> : <span className="ml-1.5 text-[13px] font-normal text-muted">(Recommended)</span>}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-sage-bg px-2 py-0.5 text-[11px] font-semibold text-forest">
          <Sparkles size={11} className="ico" />
          Validated by Reader
        </span>
      </div>
      <div className="mt-0.5 text-[13px] text-muted">{def.hint}</div>
      {doc ? (
        <div className="mt-3 flex flex-col gap-2.5">
          <FileRow file={doc.file} status={status} onView={() => setView(true)} onRemove={() => drop(draft.id, slot)} />
          {validating ? (
            <Validating step={step} payer={payer} file={doc.file.name} />
          ) : (
            <div>
              <div className={cn("flex items-center gap-2 text-[13px] font-medium", open ? "text-mid-ink" : "text-good-ink")}>
                {open ? <CircleAlert size={15} className="ico text-mid" /> : <CircleCheck size={15} className="ico text-good" />}
                {open ? `${open} ${open === 1 ? "finding" : "findings"} to look at` : `Looks good. ${doc.findings.length} checks passed`}
                {!open ? (
                  <button type="button" onClick={() => setDetails((d) => !d)} aria-expanded={details} className="ml-auto text-xs font-semibold text-forest hover:underline">
                    {details ? "Hide details" : "Details"}
                  </button>
                ) : null}
              </div>
              {open || details ? (
                <ul className="mt-2 flex flex-col gap-1">
                  {doc.findings.map((f) => (
                    <li key={f.id} className={cn("flex items-start gap-2 text-[13px]", isOpen(f, draft.answers) ? "text-mid-ink" : "text-ink2")}>
                      {isOpen(f, draft.answers) ? <CircleAlert size={14} className="ico mt-0.5 text-mid" /> : <CircleCheck size={14} className="ico mt-0.5 text-good" />}
                      {findingText(f, draft.answers)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        <FileDrop className="mt-3" onFiles={(files: DemoFile[]) => files[0] && put(draft.id, [makeDocument(slot, files[0])])} sampleName={def.sampleName} hint="Drag and drop a file here, or click to select" />
      )}
      <DocPreviewDrawer draft={draft} slot={view ? slot : null} onClose={() => setView(false)} />
    </div>
  );
}
