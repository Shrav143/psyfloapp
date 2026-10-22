import { X } from "lucide-react";
import { payerLabel, type DenialFilter } from "./lib/filters";

/** "Filtered: Cardinal, Late notice" with one clear button. The address asked for it (?payer= and ?reason=, as the Analytics rows link). */
export function FilterChip({ filter, onClear }: { filter: DenialFilter; onClear: () => void }) {
  const parts = [filter.payer ? payerLabel(filter.payer) : null, filter.reason].filter((p): p is string => !!p);
  return (
    <span role="group" aria-label="Filters on open denials" className="inline-flex max-w-full items-center gap-1.5 self-start rounded-full bg-neutral-bg py-1 pr-1.5 pl-3 text-[13px] font-medium text-neutral-ink">
      <span className="min-w-0 break-words">Filtered: {parts.join(", ")}</span>
      <button type="button" aria-label="Clear filters" onClick={onClear} className="grid h-5 w-5 shrink-0 place-items-center rounded-full hover:bg-white">
        <X size={13} className="ico" />
      </button>
    </span>
  );
}
