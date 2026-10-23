import { PanelRightOpen } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button, Pill } from "@/components/ui";
import { STATUS_LABEL, type Phase, type QueueItem } from "@/data/queue";
import { payerById } from "@/data/seed";
import { cn } from "@/lib/cn";
import { band as chanceBand } from "@/lib/format";
import { paths } from "@/routes";
import { DUE_TONE, PHASE_TONE, dueText } from "./queueLogic";

/** What the row needs besides the queue item: its chance now, its status now, and the next action. */
export interface RowInfo { chance: number; phase: Phase; next: string }

/** One open request, on one line: case and patient, status, deadline, the next action and the approval chance. Only tiles in Act now use the urgent tint.
    Below 1280 px the same cells sit on two lines. Scores, agent activity and payer notes live on the case page.
    The Quick view button (and a click on the row away from a link or button) opens the quick view; the case ID link and Open still go to the case. */
export function RequestTile({ item, clock, info, quick, onQuick }: { item: QueueItem; clock: number; info: RowInfo; quick: boolean; onQuick: (id: string) => void }) {
  const navigate = useNavigate();
  const payer = payerById(item.payerId);
  const b = chanceBand(info.chance);
  const asks = item.needsInput && info.phase !== "ready";
  return (
    <div
      data-testid={`tile-${item.id}`}
      onClick={(e) => !(e.target as Element).closest("button, a") && onQuick(item.id)}
      className={cn(
        "grid cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 rounded-2xl border px-5 py-4 xl:grid-cols-[minmax(0,1.4fr)_130px_150px_minmax(0,1.25fr)_76px_60px]",
        item.band === "now" ? "border-risk-edge bg-risk-bg" : "border-tile-edge bg-tile", quick && "ring-2 ring-forest/35",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-1.5">
          <Link to={paths.case(item.id)} className="font-semibold underline decoration-1 underline-offset-[3px] hover:text-forest">{item.id}</Link>
          <span className="text-muted">· {item.initials}, {item.age}</span>
          <button
            type="button" data-quick={item.id} aria-label={`Quick view ${item.id}`} title="Quick view" aria-haspopup="dialog" onClick={() => onQuick(item.id)}
            className="inline-grid h-6 w-6 translate-y-[3px] place-items-center rounded-md text-muted hover:bg-black/5 hover:text-ink"
          >
            <PanelRightOpen size={15} className="ico" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-0.5 text-[13px] text-muted">{item.levelLabel} · {payer.name} · {item.type}</div>
      </div>

      <div className="order-3 col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 xl:contents">
        <div className="flex min-w-[130px] flex-col items-start gap-1 xl:min-w-0">
          <Pill tone={PHASE_TONE[info.phase]}>{STATUS_LABEL[info.phase]}</Pill>
          {asks ? <Pill tone="mid">Needs your input</Pill> : null}
          {item.coverageFix ? (
            <Link to={paths.eligibilityVerify({ case: item.id })} aria-label={`Coverage needs a fix for ${item.id}. Open Eligibility and Benefits`}>
              <Pill tone="risk" dot>Coverage needs a fix</Pill>
            </Link>
          ) : null}
        </div>
        <div className="min-w-[150px] xl:min-w-0">
          <Pill tone={DUE_TONE[item.band]} dot={item.band === "now"}>{dueText(item.dueVerb, item.dueAt, clock)}</Pill>
        </div>
        <div className="min-w-[200px] flex-1 text-[13px] xl:min-w-0"><span className="font-semibold text-forest">Next:</span> {info.next}</div>
      </div>

      <div className="order-2 flex items-center gap-4 xl:contents">
        <div className="text-right">
          <div className="text-[16px] leading-tight font-semibold" style={{ color: b.color }}>{Math.round(info.chance)}%</div>
          <div className="text-xs font-semibold" style={{ color: b.color }}>{b.word}</div>
        </div>
        <Button size="sm" onClick={() => navigate(paths.case(item.id))} aria-label={`Open ${item.id}`}>Open</Button>
      </div>
    </div>
  );
}
