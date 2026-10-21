import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StageKey, Tone } from "@/data/types";
import type { StripCell } from "./helpers";

/* The kit Stat centers its text and puts the number above the label. The mockup's strip is left aligned
   with the label first, so this tile uses the same tone tokens with that layout. */
const TONE: Record<Tone, string> = {
  good: "bg-good-bg text-good-ink border-good-edge",
  mid: "bg-mid-bg text-mid-ink border-mid-edge",
  risk: "bg-risk-bg text-risk-ink border-risk-edge",
  neutral: "bg-neutral-bg text-neutral-ink border-neutral-edge",
};

/** Six tinted tiles with chevrons between them. A click sets Stage; a second click clears it. */
export function StageStrip({ cells, selected, onPick }: { cells: StripCell[]; selected: StageKey | "all"; onPick: (s: StageKey | "all") => void }) {
  return (
    <div className="grid grid-cols-6 gap-[22px]" role="group" aria-label="Stages">
      {cells.map((c, i) => {
        const on = selected === c.stage;
        return (
          <div key={c.stage} className="relative">
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onPick(on ? "all" : c.stage)}
              className={cn("flex h-full w-full flex-col items-start rounded-[18px] border px-4 pt-4 pb-3.5 text-left transition-transform hover:-translate-y-0.5", TONE[c.tone], on && "outline-2 outline-offset-[3px] outline-forest")}
            >
              <span className="text-[11.5px] font-medium uppercase tracking-[0.1em] opacity-85">{c.label}</span>
              <span className="mt-1.5 mb-0.5 text-[36px] font-semibold leading-[1.1]">{c.value}</span>
              <span className="text-sm font-medium">{c.desc}</span>
              <span className="mt-1 text-xs opacity-80">{c.note}</span>
            </button>
            {i < cells.length - 1 ? <ChevronRight size={18} className="ico pointer-events-none absolute top-[46%] -right-[20px] text-faint" aria-hidden="true" /> : null}
          </div>
        );
      })}
    </div>
  );
}
