import { useState } from "react";
import { Button, ChoiceCard, Field, Modal, TextArea } from "@/components/ui";
import type { OutcomeKind } from "@/data/denials";
import { useStore } from "@/store";
import type { DenialView } from "./lib/useDenialView";

const CHOICES: { id: OutcomeKind; title: string; text: string }[] = [
  { id: "overturned", title: "Overturned", text: "Closes the denial" },
  { id: "partly", title: "Partly restored", text: "Closes with a new end date" },
  { id: "upheld", title: "Upheld", text: "Starts the written appeal" },
];

/** Log the outcome of the call. Overturned and partly restored close the denial, upheld starts the appeal. Mounted only while open. */
export function OutcomeModal({ view, onClose }: { view: DenialView; onClose: () => void }) {
  const [kind, setKind] = useState<OutcomeKind>("overturned");
  const [note, setNote] = useState("");
  const save = () => {
    useStore.getState().logOutcome(view.req.id, kind, note.trim());
    onClose();
  };
  return (
    <Modal open onClose={onClose} title="Record the call outcome" subtitle={`${view.req.id} · ${view.analysis.ctx.payerName}`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={save}>Log the outcome</Button></>}>
      <div className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="Call outcome" className="flex flex-col gap-2.5">
          {CHOICES.map((c) => (
            <ChoiceCard key={c.id} selected={kind === c.id} onClick={() => setKind(c.id)} title={c.title}>{c.text}</ChoiceCard>
          ))}
        </div>
        <Field label="Note (optional)">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: spoke with the reviewer, days 8 to 14 restored with a review on day 14" />
        </Field>
      </div>
    </Modal>
  );
}
