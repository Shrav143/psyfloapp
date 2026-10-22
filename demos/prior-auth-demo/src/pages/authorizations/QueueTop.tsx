import { CircleCheck, CircleX, Clock, Gauge, Radar, TriangleAlert, X } from "lucide-react";
import { Banner, Button, Stat } from "@/components/ui";
import { APPROVED_30D, DENIED_30D } from "@/data/queue";
import { shortSpan, type Stats } from "./queueLogic";

const WORD = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
export const numberWord = (n: number): string => WORD[n] ?? String(n);

/** The Cardinal payer signal. "Review the four" filters the queue to the requests it affects; the X hides it for the session. */
export function SignalBanner({ affected, active, onReview, onClear, onHide }: { affected: number; active: boolean; onReview: () => void; onClear: () => void; onHide: () => void }) {
  return (
    <Banner
      icon={Radar}
      action={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={active ? onClear : onReview}>{active ? "Show all requests" : `Review the ${numberWord(affected)}`}</Button>
          <button type="button" onClick={onHide} aria-label="Dismiss signal" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-black/5">
            <X size={16} className="ico" />
          </button>
        </div>
      }
    >
      <b className="font-semibold">Payer signal.</b> Cardinal Health Plan has denied 31% more IOP continued-stay requests this week, mostly for thin recertification evidence. {affected === 1 ? "One of your open requests is" : `${numberWord(affected)[0].toUpperCase()}${numberWord(affected).slice(1)} of your open requests are`} affected, and the agents have re-scored {affected === 1 ? "it" : "them"}.
    </Banner>
  );
}

/** Five tinted tiles for the whole queue. Urgent and In flight also work as filters. */
export function QueueTiles({ all, urgent, onUrgent, onAll }: { all: Stats; urgent: number; onUrgent: () => void; onAll: () => void }) {
  const lo = Math.max(1, all.avg - 5);
  const hi = Math.min(99, all.avg + 5);
  return (
    <div className="grid grid-cols-5 gap-4">
      <Stat tone="mid" icon={Gauge} value={`${all.avg}%`} label="Approval chance" sub={`average · likely ${lo}–${hi}%`} />
      <Stat tone="risk" icon={TriangleAlert} value={urgent} label="Urgent" sub="the Act now band" onClick={onUrgent} />
      <Stat tone="neutral" icon={Clock} value={all.count} label="In flight" sub={all.firstDue === null ? "nothing open" : all.firstDue <= 0 ? "next one is due now" : `next due in ${shortSpan(all.firstDue)}`} onClick={onAll} />
      <Stat tone="good" icon={CircleCheck} value={APPROVED_30D} label="Approved" sub="last 30 days" />
      <Stat tone="risk" icon={CircleX} value={DENIED_30D} label="Denied" sub="last 30 days" />
    </div>
  );
}
