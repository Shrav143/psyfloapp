import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export interface CardDef {
  id: string;
  label: string;
  /** One line on what the card holds. */
  line: string;
  count: number;
}

/** A row of clickable cards that filter the list below. The selected card is outlined and checked; clicking it again clears the filter. The
    count is the number of rows the card filters to, so the two always agree. */
export function StatusCards({ cards, selected, onSelect, label }: { cards: readonly CardDef[]; selected: string | null; onSelect: (id: string | null) => void; label: string }) {
  return (
    <section aria-label={label} className="@container">
      <div className={cn("grid grid-cols-2 gap-2.5 @min-[560px]:grid-cols-3", cards.length === 6 ? "@min-[1000px]:grid-cols-6" : cards.length === 4 ? "@min-[760px]:grid-cols-4" : "@min-[760px]:grid-cols-4")}>
        {cards.map((c) => {
          const on = selected === c.id;
          return (
            <button
              key={c.id}
              type="button"
              data-card={c.id}
              aria-pressed={on}
              onClick={() => onSelect(on ? null : c.id)}
              className={cn("flex min-h-[96px] flex-col items-start rounded-2xl border px-4 py-3 text-left transition-colors", on ? "border-forest bg-[#EEF7F6] outline-2 -outline-offset-2 outline-forest" : "border-edge bg-white hover:bg-tile")}
            >
              <span className="flex w-full items-start justify-between gap-2">
                <span className="text-[13px] leading-snug font-semibold">{c.label}</span>
                {on ? <Check size={15} className="ico mt-0.5 shrink-0 text-forest" aria-label="Selected" /> : null}
              </span>
              <span className="mt-1 text-[24px] leading-none font-semibold tracking-tight tabular-nums">{c.count}</span>
              <span className="mt-auto pt-1.5 text-[12px] text-muted">{c.line}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
