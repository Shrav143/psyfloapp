import { useState } from "react";
import { AgentBadge, Button, ChoiceCard, Field, Modal, TextArea } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { QUESTIONS, type CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { useStore } from "@/store";
import { questionCount } from "./questions";

/** The "answer" gate: an agent stopped to ask one thing. Pick a button or type a note; the agents carry on at once. */
export function QuestionModal({ draft, open, onClose }: { draft: CaseDraft; open: boolean; onClose: () => void }) {
  const answer = useStore((s) => s.answerCaseQuestion);
  const [choice, setChoice] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const key = draft.run.question;
  if (!key) return null;
  const def = QUESTIONS[key];
  const agent = AGENTS[def.agent].name;
  const payer = draft.payerId ? payerById(draft.payerId).shortName : "the payer";
  const chosen = def.choices.find((c) => c.id === choice);
  const text = note.trim();
  const q = questionCount(draft);
  const ready = !!chosen || text.length > 0;

  const send = () => {
    answer(draft.id, { choice: chosen?.id ?? "", answer: chosen ? chosen.label.replace(/ \(.*\)$/, "") : text, note: chosen && text ? text : undefined });
    setChoice(null);
    setNote("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${agent} has a question`}
      subtitle={`Question ${q.n} of ${q.of} for this case. The agents wait for you.`}
      footer={
        <>
          <Button onClick={onClose}>Answer later</Button>
          <Button variant="primary" disabled={!ready} onClick={send}>
            Send answer
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3.5">
        <AgentBadge agent={def.agent} size={40} />
        <p className="pt-1 text-[15px] font-medium">{def.text(payer)}</p>
      </div>
      <div role="radiogroup" aria-label="Answer" className="mt-4 flex flex-col gap-2.5">
        {def.choices.map((c) => (
          <ChoiceCard key={c.id} selected={choice === c.id} onClick={() => setChoice(c.id)} title={c.label} />
        ))}
      </div>
      <Field label="Or add a note in your own words" className="mt-4" hint="Optional with a button above, or use it on its own.">
        <TextArea aria-label="Add a note in your own words" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Type here" />
      </Field>
    </Modal>
  );
}
