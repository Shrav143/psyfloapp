import { AgentChip, Button, Modal } from "@/components/ui";
import type { StepWord } from "./lib/step";
import type { DenialView } from "./lib/useDenialView";

/** Confirm gate for the written route. Nothing is drafted until the user says go. A denial that can be corrected and sent again says so, since the same letter flow carries it. */
export function ConfirmAppealModal({ view, word, onClose, onConfirm }: { view: DenialView; word: StepWord; onClose: () => void; onConfirm: () => void }) {
  const c = view.analysis.options[1].chance;
  const resubmit = word === "Correct and resubmit";
  return (
    <Modal open onClose={onClose} title={resubmit ? "Confirm the next step: correct and resubmit" : "Confirm the next step: written appeal"} subtitle="The agents stop here until you say go." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={onConfirm}>{resubmit ? "Draft the corrected request" : "Draft the appeal"}</Button></>}>
      <div className="flex flex-col gap-3 text-sm">
        <ul className="flex flex-col gap-2 rounded-2xl bg-tile px-4 py-3.5">
          <li className="flex items-center gap-2"><AgentChip agent="advocate" />drafts the letter from the findings and the evidence list</li>
          <li className="flex items-center gap-2"><AgentChip agent="integrity" />checks every sentence against the chart</li>
          <li className="flex items-center gap-2"><AgentChip agent="navigator" />files it through the payer's portal after a clinician signs</li>
        </ul>
        <p className="text-ink2">Chance of overturning is {c?.value}% (likely {c?.low}–{c?.high}%). You can edit the letter before it goes. Nothing leaves without a clinician's signature.</p>
      </div>
    </Modal>
  );
}
