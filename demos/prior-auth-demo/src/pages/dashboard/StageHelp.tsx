import { Disclosure } from "@/components/ui";
import { STAGES, STAGE_LABEL, type StageKey } from "@/data/types";
import { cn } from "@/lib/cn";
import { STAGE_STATUS } from "./workList";

/** The six stage names, each beside the status the rest of Psyflo uses, with how many requests sit there. A stage name is also a shortcut to that filter. */
export function StageHelp({ counts, selected, onPick }: { counts: Record<StageKey, number>; selected: StageKey | "all" | string; onPick: (s: StageKey) => void }) {
  return (
    <Disclosure variant="plain" title="What the stages mean" summary="Each stage name next to the status Psyflo uses for it, and how many requests are there">
      <ul className="divide-y divide-line">
        {STAGES.map((s) => (
          <li key={s} className="grid grid-cols-[132px_1fr_auto] items-baseline gap-x-4 px-6 py-2.5 text-[13.5px]">
            <button type="button" aria-pressed={selected === s} onClick={() => onPick(s)} className={cn("text-left font-semibold underline decoration-1 underline-offset-[3px] hover:text-forest", selected === s && "text-forest")}>
              {STAGE_LABEL[s]}
            </button>
            <span className="min-w-0 text-ink2">{STAGE_STATUS[s]}</span>
            <span className="text-muted tabular-nums" aria-label={`${counts[s]} requests`}>
              {counts[s]}
            </span>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-6 py-3 text-[13px] text-muted">
        The bars show progress: Prepared, Received, In review, Decided. A denial shows Call, Appeal 1, Appeal 2, External. Over 1.5 × the payer's typical time is late; over 2 × is very late.
      </p>
    </Disclosure>
  );
}
