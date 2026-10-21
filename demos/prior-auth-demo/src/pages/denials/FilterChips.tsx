import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { payerLabel, type DenialFilter } from "./lib/filters";

/** The filters the address asked for (?payer= and ?reason=), each removable, with Clear for both. */
export function FilterChips({ filter, onRemove, onClear }: { filter: DenialFilter; onRemove: (key: keyof DenialFilter) => void; onClear: () => void }) {
  const chips: { key: keyof DenialFilter; label: string }[] = [];
  if (filter.payer) chips.push({ key: "payer", label: payerLabel(filter.payer) });
  if (filter.reason) chips.push({ key: "reason", label: filter.reason });
  return (
    <div role="group" aria-label="Filters on open denials" className="flex flex-wrap items-center gap-2 text-[13px]">
      <span className="text-muted">Showing</span>
      {chips.map((c) => (
        <span key={c.key} className="flex items-center gap-1.5 rounded-full bg-neutral-bg py-1 pr-1.5 pl-3 font-medium text-neutral-ink">
          {c.label}
          <button type="button" aria-label={`Remove filter ${c.label}`} onClick={() => onRemove(c.key)} className="grid h-5 w-5 place-items-center rounded-full hover:bg-white">
            <X size={13} className="ico" />
          </button>
        </span>
      ))}
      <Button variant="ghost" size="sm" onClick={onClear}>Clear</Button>
    </div>
  );
}
