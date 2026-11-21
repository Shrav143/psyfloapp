import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import { recordDocs } from "@/data/assess/recordDocs";
import type { CaseDraft, DocSlotId } from "@/data/cases";
import type { IntakeDocument } from "@/data/intake/types";
import { paths } from "@/routes";
import { useStore } from "@/store";
import { slotLabel } from "./documents";
import { Frame } from "./RecordEditors";

const KIND_LABEL: Record<IntakeDocument["kind"], string> = {
  referral: "Referral", fax: "Fax", email: "Email", emr_summary: "EMR summary", school_report: "School report", discharge_summary: "Discharge summary", consent: "Consent", insurance_card: "Insurance card", other: "Document",
};

/** For a request prepared from an intake record, the choices on a document the payer's list asks for and nothing holds yet. There is no sample file: a document is one of the record's own, one somebody is asked for (a task on the intake, nothing is sent),
    one marked not available with a reason, or a file added by its name and type (files are not read in the demo). */
export function RecordDocActions({ draft, slot, labelId, missing, onAttach, onUnavailable, onPick }: { draft: CaseDraft; slot: DocSlotId; labelId: string; missing: boolean; onAttach: () => void; onUnavailable: () => void; onPick: (slot: DocSlotId) => void }) {
  const request = useStore((s) => s.requestCaseDoc);
  const cancel = useStore((s) => s.cancelCaseDocRequest);
  const asked = draft.requested?.[slot];
  return (
    <div className="flex max-w-[460px] flex-wrap justify-end gap-2">
      <Button size="sm" variant={missing ? "outline" : "ghost"} aria-describedby={labelId} onClick={onAttach}>Attach from the record</Button>
      {asked ? (
        <Button size="sm" variant="ghost" aria-describedby={labelId} onClick={() => cancel(draft.id, slot)}>Cancel the request</Button>
      ) : (
        <Button size="sm" variant="ghost" aria-describedby={labelId} onClick={() => request(draft.id, slot)}>Request this document</Button>
      )}
      <Button size="sm" variant="ghost" aria-describedby={labelId} onClick={onUnavailable}>Mark not available</Button>
      <Button size="sm" variant="ghost" aria-describedby={labelId} onClick={() => onPick(slot)}>Add file</Button>
    </div>
  );
}

/** The documents the intake record holds that no slot of this request uses yet. Choosing one attaches the record's own document: nothing is read, copied or checked. */
export function AttachFromRecord({ draft, slot, close }: { draft: CaseDraft; slot: DocSlotId; close: () => void }) {
  const intake = useStore((s) => s.intakes.find((r) => r.id === draft.intakeId));
  const attach = useStore((s) => s.attachRecordDoc);
  const used = useMemo(() => {
    const ids = new Set<string>();
    if (intake) for (const d of recordDocs(intake)) if (d.docId && draft.documents.some((x) => x.slot === d.slot)) ids.add(d.docId);
    if (intake) for (const x of draft.documents) if (x.chosen) ids.add(x.file.id.replace(`rec-${intake.id}-`, ""));
    return ids;
  }, [intake, draft.documents]);
  if (!intake) return null;
  const free = intake.documents.filter((d) => !used.has(d.id));
  return (
    <Frame onClose={close} done={false}>
      <p className="text-[13px] text-ink2">Documents on {intake.id} that no item of this request uses yet. Psyflo does not read them or decide which item they fit: you choose.</p>
      {free.length ? (
        <ul className="flex flex-col gap-1.5" aria-label={`Documents on ${intake.id}`}>
          {free.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2 text-[13px]">
              <span className="min-w-0 flex-1"><b className="font-semibold">{d.name}</b> <span className="text-muted">{KIND_LABEL[d.kind]}{d.simulated ? ", simulated import" : ""}</span></span>
              <Button size="sm" onClick={() => { attach(draft.id, slot, d.id); close(); }}>Attach for {slotLabel(slot)}</Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-muted">Nothing else on the record to attach.</p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Link to={paths.intakeRecord(intake.id, "documents")} className="text-[13px] font-semibold text-forest hover:underline">Open Documents in the intake</Link>
        <Button size="sm" variant="ghost" onClick={close}>Close</Button>
      </div>
    </Frame>
  );
}
