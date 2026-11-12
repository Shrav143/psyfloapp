import { Button, Modal } from "@/components/ui";
import { shortDate } from "@/lib/time";
import type { StepWord } from "./lib/step";
import type { DenialView } from "./lib/useDenialView";

/** Confirm gate for the written route: nothing is drafted until the person says go. A denial that can be corrected and sent again says so, since the same letter flow carries it. */
export function ConfirmAppealModal({ view, word, onClose, onConfirm }: { view: DenialView; word: StepWord; onClose: () => void; onConfirm: () => void }) {
  const { req, analysis } = view;
  const c = analysis.options[1].chance;
  const resubmit = word === "Correct and resubmit";
  const due = req.deadlineAt !== undefined && (req.clockSub === "to file" || req.clockSub === "to resubmit") ? shortDate(req.deadlineAt) : undefined;
  return (
    <Modal open onClose={onClose} size="sm" title={resubmit ? "Confirm the next step: correct and resubmit" : "Confirm the next step: written appeal"} subtitle={`${req.id} · ${analysis.ctx.payerName}`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={onConfirm}>{resubmit ? "Draft the corrected request" : "Draft the appeal"}</Button></>}>
      <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 text-[13px]">
        {c ? <><dt className="text-muted">Chance</dt><dd className="font-medium">{c.value}% · likely {c.low}–{c.high}%</dd></> : null}
        <dt className="text-muted">Gets back</dt><dd className="font-medium">{analysis.regained}</dd>
        {due ? <><dt className="text-muted">Due</dt><dd className="font-medium">{due}</dd></> : null}
        <dt className="text-muted">Sign-off</dt><dd className="font-medium">A clinician signs before it is filed</dd>
      </dl>
    </Modal>
  );
}
