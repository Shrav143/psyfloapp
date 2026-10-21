import { useState } from "react";
import { Button, Dropdown, Field, Modal, TextArea } from "@/components/ui";
import { Labeled } from "./Labeled";
import { money } from "@/lib/format";
import { useStore } from "@/store";
import type { DenialView } from "./lib/useDenialView";

const REASONS = [
  { value: "The chart does not yet support a challenge", label: "The chart does not yet support a challenge" },
  { value: "The clinical team agrees with the payer's reasoning", label: "The clinical team agrees with the payer's reasoning" },
  { value: "The member and family chose to step down", label: "The member and family chose to step down" },
  { value: "The cost of an appeal outweighs the amount", label: "The cost of an appeal outweighs the amount" },
];

/** Confirm gate for Accept: a reason goes on the record before anything is written off. Mounted only while open. */
export function AcceptModal({ view, onClose }: { view: DenialView; onClose: () => void }) {
  const accept = useStore((s) => s.acceptDecision);
  const [reason, setReason] = useState(REASONS[0].value);
  const [note, setNote] = useState("");
  const confirm = () => {
    accept(view.req.id, note.trim() ? `${reason}. ${note.trim()}` : reason);
    onClose();
  };
  return (
    <Modal open onClose={onClose} size="sm" title="Accept the decision?" subtitle="Nothing is regained. This closes the denial." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" onClick={confirm}>Accept and close</Button></>}>
      <div className="flex flex-col gap-4">
        <ul className="list-disc pl-5 text-sm text-ink2">
          <li>Cadence logs the write-off of {money(view.req.atStake)}.</li>
          <li>Case Manager starts the step-down plan.</li>
          <li>{view.req.id} leaves Appeal or call on the Dashboard.</li>
        </ul>
        <Labeled label="Reason for the record" required>
          <Dropdown variant="field" value={reason} options={REASONS} onChange={setReason} ariaLabel="Reason for the record" menuWidth={380} />
        </Labeled>
        <Field label="Note (optional)">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the team should know" className="min-h-[72px]" />
        </Field>
      </div>
    </Modal>
  );
}
