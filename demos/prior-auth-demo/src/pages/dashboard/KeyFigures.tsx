import { useId } from "react";
import { cn } from "@/lib/cn";
import type { Figure, FigureId } from "./workList";

const NUMBER = { ink: "text-ink", mid: "text-mid-ink", risk: "text-risk-ink" } as const;

/** Four figures that are also shortcuts. A click applies the matching filter; a second click clears it. Colour only marks urgency. */
export function KeyFigures({ figures, pressed, onPick }: { figures: Figure[]; pressed: FigureId | null; onPick: (id: FigureId) => void }) {
  const uid = useId();
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4" role="group" aria-label="Key figures">
      {figures.map((f) => {
        const on = pressed === f.id;
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={on}
            aria-describedby={`${uid}-${f.id}`}
            onClick={() => onPick(f.id)}
            className={cn("flex min-w-0 flex-col items-start rounded-[18px] border px-5 py-4 text-left transition-colors hover:bg-tile", on ? "border-forest bg-[#F3F7F4] outline-2 outline-offset-[3px] outline-forest" : "border-edge bg-white")}
          >
            <span className="text-[11.5px] font-medium uppercase tracking-[0.1em] text-muted">{f.label}</span>
            <span className={cn("mt-1 text-[34px] font-semibold leading-[1.1]", NUMBER[f.tone])}>{f.value}</span>
            <span className="mt-0.5 text-[13px] text-muted">{f.note}</span>
            <span id={`${uid}-${f.id}`} className="sr-only">
              {f.means} Click to show only these requests.
            </span>
          </button>
        );
      })}
    </div>
  );
}
