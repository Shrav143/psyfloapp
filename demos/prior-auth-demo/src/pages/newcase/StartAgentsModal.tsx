import { Button, Modal } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import type { Readiness } from "./typicalDocs";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";

/** The confirm gate before the agents start, from the Authorization preparation section of Clinical documentation. */
export function StartAgentsModal({ draft, readiness, open, onClose, onStart }: { draft: CaseDraft; readiness: Readiness; open: boolean; onClose: () => void; onStart: () => void }) {
  const missing = readiness.missingRequired;
  const payer = draft.payerId ? payerById(draft.payerId) : null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Start the agents?"
      subtitle={`${draft.patient.initials || "New Authorization"}${draft.patient.initials ? "," : ""} ${draft.program ? PROGRAM_LABEL[draft.program] : ""} · ${payer?.name ?? ""}`.trim()}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onStart}>Start the agents</Button>
        </>
      }
    >
      <p className="text-[14px] text-ink2">
        {readiness.ready} of {readiness.total} documents ready
      </p>
      {missing.length ? <p className="mt-1 text-[13px] text-mid-ink">Missing: {missing.map((m) => m.label).join(", ")}</p> : null}
    </Modal>
  );
}
