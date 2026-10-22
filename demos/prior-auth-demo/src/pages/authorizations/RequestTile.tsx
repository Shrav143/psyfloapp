import { Link, useNavigate } from "react-router-dom";
import { AgentBadge, Button, Chance, Chip, Pill } from "@/components/ui";
import type { Band, QueueItem } from "@/data/queue";
import { payerById } from "@/data/seed";
import type { Tone } from "@/data/types";
import { cn } from "@/lib/cn";
import { band as chanceBand } from "@/lib/format";
import { paths } from "@/routes";
import { dueText } from "./queueLogic";
import { Scores } from "./Scores";

const DUE_TONE: Record<Band, Tone> = { now: "risk", day: "mid", week: "neutral" };
/** One open request. Only tiles in Act now use the urgent tint. */
export function RequestTile({ item, clock, chance, lift, ready }: { item: QueueItem; clock: number; chance: number; lift: string; ready: boolean }) {
  const navigate = useNavigate();
  const payer = payerById(item.payerId);
  const b = chanceBand(chance);
  return (
    <div data-testid={`tile-${item.id}`} className={cn("flex items-start gap-5 rounded-2xl border px-5 py-4", item.band === "now" ? "border-risk-edge bg-risk-bg" : "border-tile-edge bg-tile")}>
      <div className="w-[132px] shrink-0 pt-0.5">
        <Chip>{item.levelLabel}</Chip>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <Link to={paths.case(item.id)} className="font-semibold underline decoration-1 underline-offset-[3px] hover:text-forest">{item.id}</Link>
          <span className="text-muted">· {item.initials}, {item.age} · {payer.name}</span>
        </div>
        <div className="mt-0.5">{item.dx}</div>
        <div className="mt-0.5"><Scores scores={item.scores} /></div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <AgentBadge agent={ready ? "integrity" : item.agent} size={22} />
          <span className="text-[13px] text-ink2">{ready ? "Ready to sign. Integrity passed all four checks" : item.status}</span>
          {item.needsInput && !ready ? <Pill tone="mid">Needs your input</Pill> : null}
          {item.coverageFix ? (
            <Link to={paths.eligibilityVerify({ case: item.id })} aria-label={`Coverage needs a fix for ${item.id}. Open Eligibility and Benefits`}>
              <Pill tone="risk" dot>Coverage needs a fix</Pill>
            </Link>
          ) : null}
        </div>
        {item.rule && !ready ? <div className="mt-1.5 text-[13px] text-forest">{item.rule}</div> : null}
      </div>
      <div className="shrink-0">
        <Pill tone={DUE_TONE[item.band]} dot={item.band === "now"}>{dueText(item.dueVerb, item.dueAt, clock)}</Pill>
      </div>
      <div className="w-[128px] shrink-0">
        <Chance value={chance} className="w-full" />
        <div className="mt-1 text-xs font-semibold" style={{ color: b.color }}>{b.word}</div>
        <div className="text-xs text-muted">{lift}</div>
      </div>
      <Button size="sm" onClick={() => navigate(paths.case(item.id))} aria-label={`Open ${item.id}`}>Open</Button>
    </div>
  );
}
