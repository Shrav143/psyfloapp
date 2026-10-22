import { Button, Modal } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL } from "@/data/types";

/** The confirm gate before the agents start. Used from Clinical documentation (Continue) and from Authorization preparation (when it is opened before the agents ran). */
export function StartAgentsModal({ draft, open, onClose, onStart }: { draft: CaseDraft; open: boolean; onClose: () => void; onStart: () => void }) {
  const payer = draft.payerId ? payerById(draft.payerId) : null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Start the agents?"
      subtitle={`${draft.patient.initials || "New case"}${draft.patient.initials ? "," : ""} ${draft.program ? PROGRAM_LABEL[draft.program] : ""} · ${payer?.name ?? ""}`.trim()}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onStart}>Start the agents</Button>
        </>
      }
    >
      <p className="text-sm text-ink2">Reader swaps names, dates and IDs for codes and reads the chart. Verify, Criteria, Historian and Placement check coverage, rules and how {payer?.shortName ?? "the payer"} has ruled. Scribe drafts the case and may ask you a question or two.</p>
      <p className="mt-3 text-sm font-medium">Nothing is sent to the payer until a clinician signs.</p>
    </Modal>
  );
}
