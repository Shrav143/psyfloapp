import { useState } from "react";
import { Button, ChoiceCard, Field, Modal, TextArea } from "@/components/ui";
import { APPEAL_LEVELS, levelOf, type OutcomeKind } from "@/data/denials";
import { DAY, shortDate } from "@/lib/time";
import { useStore } from "@/store";
import type { PayerDecisionInput } from "@/store/denials";
import type { DenialView } from "./lib/useDenialView";
import { ACCEPT_REASONS, ReasonField } from "./ReasonField";

const RESULTS: { id: OutcomeKind; title: string; text: string }[] = [
  { id: "overturned", title: "Overturned", text: "The payer restored the requested days. The denial closes." },
  { id: "partly", title: "Partly overturned", text: "The payer restored some of them. The denial closes with a new end date." },
  { id: "upheld", title: "Upheld", text: "The payer kept its decision. You choose the next step." },
];

/** Record what the payer decided on the filed appeal. Upheld goes on to the next appeal level, with a new deadline, or to Accept. Mounted only while open. */
export function DecisionModal({ view, onClose, onNextLevel }: { view: DenialView; onClose: () => void; onNextLevel: () => void }) {
  const { req, work, clock } = view;
  const further = APPEAL_LEVELS[levelOf(req.chip, work) + 1];
  const [result, setResult] = useState<OutcomeKind>("overturned");
  const [next, setNext] = useState<"level" | "accept">(further ? "level" : "accept");
  const [reason, setReason] = useState(ACCEPT_REASONS[0].value);
  const [note, setNote] = useState("");

  const label = result !== "upheld" ? "Record the decision" : next === "level" ? `Record and start the ${further?.name.toLowerCase()}` : "Record and accept the denial";
  const save = () => {
    const n = note.trim();
    const input: PayerDecisionInput = result !== "upheld" ? { result, note: n } : next === "level" && further ? { result, note: n, next: "level" } : { result, note: n, next: "accept", reason };
    useStore.getState().recordDecision(req.id, input);
    if (input.result === "upheld" && input.next === "level") onNextLevel();
    else onClose();
  };

  return (
    <Modal open onClose={onClose} title="Record the payer's decision" subtitle={`${req.id} · ${view.analysis.ctx.payerName}`} footer={<><Button onClick={onClose}>Cancel</Button><Button variant={label === "Record and accept the denial" ? "danger" : "primary"} onClick={save}>{label}</Button></>}>
      <div className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="The payer's decision" className="flex flex-col gap-2.5">
          {RESULTS.map((c) => (
            <ChoiceCard key={c.id} selected={result === c.id} onClick={() => setResult(c.id)} title={c.title}>{c.text}</ChoiceCard>
          ))}
        </div>
        {result === "upheld" ? (
          <div>
            <div className="mb-2 text-[13px] font-medium text-ink2">Next step</div>
            <div role="radiogroup" aria-label="Next step" className="flex flex-col gap-2.5">
              {further ? (
                <ChoiceCard selected={next === "level"} onClick={() => setNext("level")} title={`Appeal to the next level: ${further.name}`}>
                  New deadline {shortDate(clock + further.days * DAY)}, {further.days} days to file. Advocate drafts the letter and a clinician signs it.
                </ChoiceCard>
              ) : null}
              <ChoiceCard selected={next === "accept"} onClick={() => setNext("accept")} title="Accept the denial">
                Nothing is regained. Analytics logs it as an accepted denial and Case Manager adds a step-down plan.
              </ChoiceCard>
            </div>
            {further ? null : <p className="mt-2 text-[13px] text-muted">External review is the last level, so no further appeal is offered.</p>}
            {next === "accept" ? <div className="mt-3"><ReasonField value={reason} onChange={setReason} /></div> : null}
          </div>
        ) : null}
        <Field label="Note (optional)" hint="What the payer wrote, or who you spoke to.">
          <TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: decision letter received, reviewer restored days 8 to 14" />
        </Field>
      </div>
    </Modal>
  );
}
