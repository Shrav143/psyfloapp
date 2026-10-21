import { useState } from "react";
import { Check, CircleX, MessageSquare, Send, WandSparkles } from "lucide-react";
import { Button, Card, Modal, TextArea } from "@/components/ui";
import type { CaseWork } from "@/data/caseModel";
import { stamp } from "@/lib/time";

interface Props {
  included: number;
  openCount: number;
  running: boolean;
  canSend: boolean;
  sendReason: string;
  refining: boolean;
  work: CaseWork;
  onApply: () => void;
  onSend: () => void;
  onRefine: () => void;
  onContext: (text: string) => void;
  onDismiss: () => void;
}

/** The side panel: how many are included, the five buttons, and the log of decisions. */
export function ActionsSide({ included, openCount, running, canSend, sendReason, refining, work, onApply, onSend, onRefine, onContext, onDismiss }: Props) {
  const [ctxOpen, setCtxOpen] = useState(false);
  const [text, setText] = useState("");
  return (
    <div className="sticky top-4 flex flex-col gap-4">
      <Card className="px-5 py-5">
        <div className="flex flex-col gap-3">
          <div className="text-sm text-muted">{openCount === 0 ? "No open recommendations. Applied ones are listed on the left." : `${included} of ${openCount} ${openCount === 1 ? "recommendation" : "recommendations"} will be included in the draft.`}</div>
          <Button icon={Check} loading={running} disabled={included === 0} onClick={onApply}>Apply selected ({included})</Button>
          <Button variant="primary" icon={Send} disabled={!canSend || running} title={canSend ? undefined : sendReason} onClick={onSend}>Send to payer</Button>
          <Button icon={WandSparkles} loading={refining} disabled={running} onClick={onRefine}>Refine recommendations</Button>
          <Button icon={MessageSquare} disabled={running} onClick={() => setCtxOpen(true)}>Add clinical context</Button>
          <Button variant="danger" icon={CircleX} disabled={included === 0 || running} onClick={onDismiss}>Dismiss recommendations</Button>
          {canSend ? null : <div className="text-xs text-muted">{sendReason}</div>}
          <div className="text-xs text-muted">Uncheck a card to leave it out. Every decision is logged.</div>
        </div>
      </Card>
      {work.log.length > 0 ? (
        <Card className="px-5 py-4" data-testid="decision-log">
          <div className="mb-2 text-sm font-semibold">Logged decisions</div>
          <ul className="flex flex-col gap-2">
            {[...work.log].reverse().slice(0, 6).map((l, i) => (
              <li key={`${l.at}-${i}`} className="text-[13px] text-ink2">
                <span className="block text-xs text-muted">{stamp(l.at)}</span>
                {l.text}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <Modal
        open={ctxOpen} onClose={() => setCtxOpen(false)} title="Add clinical context" subtitle="Something the chart does not show. Scribe uses it in the next draft. Nothing goes to the payer."
        footer={<><Button onClick={() => setCtxOpen(false)}>Cancel</Button><Button variant="primary" disabled={!text.trim()} onClick={() => { onContext(text.trim()); setText(""); setCtxOpen(false); }}>Add context</Button></>}
      >
        <TextArea rows={4} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. He called the program himself on 10/19 and asked for a bed." aria-label="Clinical context" />
      </Modal>
    </div>
  );
}
