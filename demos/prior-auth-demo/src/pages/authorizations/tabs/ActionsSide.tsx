import { useState } from "react";
import { Check, CircleX, MessageSquare, WandSparkles } from "lucide-react";
import { Button, Card, Modal, Pill, TextArea } from "@/components/ui";
import type { FocusId } from "@/data/caseDetail";
import { CONTEXT_PTS_MAX, type CaseWork } from "@/data/caseModel";
import { RefineModal } from "./RefineModal";

interface Props {
  included: number;
  openCount: number;
  running: boolean;
  refining: boolean;
  work: CaseWork;
  onApply: () => void;
  onRefine: (focus: FocusId) => void;
  onContext: (text: string) => void;
  onDismiss: () => void;
}

/** The side panel: how many are included and the four buttons. Send to payer is in the header, once. What was decided here is in History. */
export function ActionsSide({ included, openCount, running, refining, work, onApply, onRefine, onContext, onDismiss }: Props) {
  const [ctxOpen, setCtxOpen] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [text, setText] = useState("");
  return (
    <div className="sticky top-4 flex flex-col gap-4">
      <Card className="flex flex-col gap-2 px-4 py-4">
        <div className="text-[12px] text-muted" data-testid="included">{openCount === 0 ? "None open" : `${included} of ${openCount} selected`}</div>
        <Button size="sm" variant="primary" icon={Check} loading={running} disabled={included === 0} onClick={onApply}>Apply selected ({included})</Button>
        <Button size="sm" icon={WandSparkles} loading={refining} disabled={running} onClick={() => setRefineOpen(true)}>Refine recommendations</Button>
        <Button size="sm" icon={MessageSquare} disabled={running} onClick={() => setCtxOpen(true)}>Add clinical context</Button>
        <Button size="sm" variant="danger" icon={CircleX} disabled={included === 0 || running} onClick={onDismiss}>Dismiss recommendations</Button>
      </Card>
      {work.context.length > 0 ? (
        <Card className="px-4 py-3" data-testid="context-list">
          <div className="mb-2 text-[13px] font-semibold">Context you added</div>
          <ul className="flex flex-col gap-2">
            {work.context.map((c, i) => (
              <li key={`${i}-${c}`} className="flex items-start gap-2 text-[13px] text-ink2">
                <span className="min-w-0 flex-1">{c}</span>
                {i < CONTEXT_PTS_MAX ? <Pill tone="good">+1 pt</Pill> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <Modal
        open={ctxOpen} onClose={() => setCtxOpen(false)} title="Add clinical context" size="sm"
        footer={<><Button onClick={() => setCtxOpen(false)}>Cancel</Button><Button variant="primary" disabled={!text.trim()} onClick={() => { onContext(text.trim()); setText(""); setCtxOpen(false); }}>Add context</Button></>}
      >
        <TextArea rows={4} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. He called the program himself on 10/19 and asked for a bed." aria-label="Clinical context" />
        <div className="mt-2 text-[12px] text-muted">+1 pt each, up to {CONTEXT_PTS_MAX}. Not sent to the payer.</div>
      </Modal>
      {refineOpen ? <RefineModal current={work.focus} onClose={() => setRefineOpen(false)} onApply={(f) => { setRefineOpen(false); onRefine(f); }} /> : null}
    </div>
  );
}
