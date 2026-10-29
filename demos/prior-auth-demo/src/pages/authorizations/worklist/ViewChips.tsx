import { cn } from "@/lib/cn";
import { VIEW_LABEL, type View } from "./model";

const CHIP = "flex items-baseline gap-2 rounded-2xl border bg-white px-3.5 py-2.5 text-left transition-colors hover:bg-tile";

/** The views of the one worklist, with their counts. In progress, With the payer, Approved and Denied add up to All; Needs attention and Reviews this week
    cut across them (a request with the payer can still need someone), so they sit apart and are never added in. */
export function ViewChips({ view, counts, onPick }: { view: View; counts: Record<View, number>; onPick: (v: View) => void }) {
  const chip = (v: View) => {
    const on = view === v;
    return (
      <button key={v} type="button" aria-pressed={on} data-view={v} onClick={() => onPick(v)} className={cn(CHIP, on ? "border-forest outline-1 outline-forest" : "border-field")}>
        <span className={cn("text-[13px] font-medium", on && "text-forest")}>{VIEW_LABEL[v]}</span>
        <span className="text-[18px] font-semibold leading-none tabular-nums">{counts[v]}</span>
      </button>
    );
  };
  return (
    <div className="flex flex-wrap items-stretch gap-2" role="group" aria-label="Views">
      {chip("all")}
      {chip("attention")}
      <span className="mx-1 w-px self-stretch bg-line" aria-hidden="true" />
      {(["progress", "payer", "approved", "denied"] as View[]).map(chip)}
      <span className="mx-1 w-px self-stretch bg-line" aria-hidden="true" />
      {chip("reviews")}
    </div>
  );
}
