import { Clock, Gauge, Radar, TriangleAlert, UserRound, X } from "lucide-react";
import { Button, Stat } from "@/components/ui";
import type { Band, StatusFilter } from "@/data/queue";
import { band as chanceBand } from "@/lib/format";
import { InfoTip } from "@/components/ui/InfoTip";
import { shortSpan, type Stats } from "./queueLogic";

const WORD = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
export const numberWord = (n: number): string => WORD[n] ?? String(n);

/** The Cardinal payer signal, on one line. "Review the four" filters the queue to the requests it affects (counted at the sites in view); the X hides it for the session. */
export function SignalBanner({ affected, active, onReview, onClear, onHide }: { affected: number; active: boolean; onReview: () => void; onClear: () => void; onHide: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-neutral-bg px-[18px] py-2.5 text-sm text-neutral-ink">
      <Radar size={18} className="ico shrink-0" aria-hidden="true" />
      <p className="m-0 min-w-0 flex-1">
        <b className="font-semibold">Payer signal.</b> Cardinal Health Plan: 31% more IOP continued-stay denials this week.
      </p>
      <InfoTip label="More about this signal" align="end">
        The denials were mostly for thin recertification evidence. {affected === 1 ? "One of your open requests is" : `${numberWord(affected)[0].toUpperCase()}${numberWord(affected).slice(1)} of your open requests are`} affected, and the agents have re-scored {affected === 1 ? "it" : "them"}.
      </InfoTip>
      <Button variant="ghost" size="sm" onClick={active ? onClear : onReview}>{active ? "Show all requests" : affected === 1 ? "Review it" : `Review the ${numberWord(affected)}`}</Button>
      <button type="button" onClick={onHide} aria-label="Dismiss signal" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-black/5">
        <X size={16} className="ico" />
      </button>
    </div>
  );
}

/** Tiles hug their figure: the row does not stretch to the page width. */
const TILE = "sm:w-auto sm:min-w-[150px] sm:px-4";

export interface QueueFigures {
  urgent: number;
  day: Stats;
  waiting: number;
  all: Stats;
}

/** Four figures for the whole queue. The first three also work as filters. */
export function QueueTiles({ figures, urgency, status, onUrgency, onStatus }: { figures: QueueFigures; urgency: Band | "all"; status: StatusFilter; onUrgency: (b: Band) => void; onStatus: (s: StatusFilter) => void }) {
  const { all, day } = figures;
  const lo = Math.max(1, all.avg - 5);
  const hi = Math.min(99, all.avg + 5);
  return (
    <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
      <Stat tone="risk" icon={TriangleAlert} value={figures.urgent} label="Urgent now" onClick={() => onUrgency("now")} selected={urgency === "now"} className={TILE} />
      <Stat tone="mid" icon={Clock} value={day.count} label="Due within 24 hours" sub={day.firstDue === null ? "nothing open" : day.firstDue <= 0 ? "next due now" : `next due in ${shortSpan(day.firstDue)}`} onClick={() => onUrgency("day")} selected={urgency === "day"} className={TILE} />
      <Stat tone="neutral" icon={UserRound} value={figures.waiting} label="Waiting on you" onClick={() => onStatus("you")} selected={status === "you"} className={TILE} />
      <Stat tone={chanceBand(all.avg).tone} icon={Gauge} value={`${all.avg}%`} label="Approval chance" sub={`average · likely ${lo}–${hi}%`} className={TILE} />
    </div>
  );
}
