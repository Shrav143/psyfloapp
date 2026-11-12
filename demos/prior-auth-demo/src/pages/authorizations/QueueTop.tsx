import { Radar, X } from "lucide-react";
import { Button } from "@/components/ui";
import { IllustrativeTag } from "@/components/ui/IllustrativeTag";
import { InfoTip } from "@/components/ui/InfoTip";

const WORD = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
export const numberWord = (n: number): string => WORD[n] ?? String(n);

/** The Anthem payer signal, on one line. "Review the four" filters the queue to the requests it affects (counted at the sites in view); the X hides it for the session. */
export function SignalBanner({ affected, active, onReview, onClear, onHide }: { affected: number; active: boolean; onReview: () => void; onClear: () => void; onHide: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-neutral-bg px-[18px] py-2.5 text-sm text-neutral-ink">
      <Radar size={18} className="ico shrink-0" aria-hidden="true" />
      <p className="m-0 min-w-0 flex-1">
        <b className="font-semibold">Payer signal.</b> Anthem HealthKeepers Plus: 31% more IOP continued-stay denials this week. <IllustrativeTag className="ml-1 align-[1px]" />
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
