import { useState } from "react";
import { Button, Field, Modal, TextArea } from "@/components/ui";
import { money } from "@/lib/format";
import { useStore } from "@/store";
import type { DenialView } from "./lib/useDenialView";
import { ACCEPT_REASONS, ReasonField } from "./ReasonField";

/** Confirm gate for Accept: a reason goes on the record before anything is written off. Mounted only while open. */
export function AcceptModal({ view, onClose }: { view: DenialView; onClose: () => void }) {
  const accept = useStore((s) => s.acceptDecision);
  const [reason, setReason] = useState(ACCEPT_REASONS[0].value);
  const [note, setNote] = useState("");
  const confirm = () => {
    accept(view.req.id, note.trim() ? `${reason}. ${note.trim()}` : reason);
    onClose();
  };
  return (
    <Modal open onClose={onClose} size="sm" title="Accept the decision?" subtitle="Nothing is regained. This closes the denial." footer={<><Button onClick={onClose}>Cancel</Button><Button variant="danger" onClick={confirm}>Accept and close</Button></>}>
      <div className="flex flex-col gap-4">
        <ul className="list-disc pl-5 text-sm text-ink2">
          <li>Analytics counts the write-off of {money(view.req.atStake)}.</li>
          <li>Case Manager adds a step-down plan.</li>
          <li>{view.req.id} leaves Appeal or call on the Dashboard.</li>
        </ul>
        <ReasonField value={reason} onChange={setReason} />
        <Field label="Note (optional)">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the team should know" className="min-h-[72px]" />
        </Field>
      </div>
    </Modal>
  );
}
