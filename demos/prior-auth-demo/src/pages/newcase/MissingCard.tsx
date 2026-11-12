import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { Button, Card, CardHeader, Pill } from "@/components/ui";
import { unmetPenalty, type CaseDraft } from "@/data/cases";
import { noChanceFor } from "./ChancePanel";
import type { FixKind } from "./checks";
import type { MissingItem } from "./missing";

const FIX_LABEL: Record<FixKind, string> = { intake: "Open Patient & Service", eligibility: "Open Coverage & Requirements", records: "Open Clinical Documentation", edit: "Edit the summary", scribe: "Send back to Scribe" };

/** The first thing on Review & submit: what is missing, blocking items first, each with the action that fixes it. This is the page's one alert. */
export function MissingCard({ draft, items, onFix }: { draft: CaseDraft; items: MissingItem[]; onFix: (fix: FixKind) => void }) {
  if (items.length === 0) {
    return (
      <Card className="flex items-center gap-3 px-5 py-4">
        <CircleCheck size={20} className="ico shrink-0 text-good" aria-hidden="true" />
        <div>
          <div className="font-semibold">Nothing is missing</div>
        </div>
      </Card>
    );
  }
  const count = (sev: MissingItem["severity"]): number => items.filter((i) => i.severity === sev).length;
  const [blocks, acks, notes] = [count("block"), count("ack"), count("note")];
  const held = draft.unmet > 0 && !noChanceFor(draft) ? `−${unmetPenalty(draft.unmet)} points on the approval chance` : undefined;
  return (
    <Card data-testid="missing">
      <CardHeader
        title="What is missing"
        subtitle={held}
        right={<Pill tone={blocks > 0 ? "risk" : acks > 0 ? "mid" : "neutral"} dot>{blocks > 0 ? "Blocked" : acks > 0 ? `${acks} to acknowledge` : `${notes} to look at`}</Pill>}
      />
      <ul>
        {items.map((m) => (
          <li key={m.id} className="flex items-start gap-3 border-b border-line px-5 py-3 last:border-b-0">
            {m.severity === "block" ? <CircleX size={18} className="ico mt-0.5 shrink-0 text-risk" aria-label="Blocks signing" /> : <CircleAlert size={18} className={m.severity === "ack" ? "ico mt-0.5 shrink-0 text-mid" : "ico mt-0.5 shrink-0 text-faint"} aria-label={m.severity === "ack" ? "Acknowledge before signing" : "Does not stop signing"} />}
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{m.label}</div>
              <div className={m.severity === "block" ? "text-[13px] text-risk-ink" : m.severity === "ack" ? "text-[13px] text-mid-ink" : "text-[13px] text-ink2"}>{m.text}</div>
            </div>
            {m.fix ? <Button size="sm" onClick={() => onFix(m.fix as FixKind)}>{FIX_LABEL[m.fix]}</Button> : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
