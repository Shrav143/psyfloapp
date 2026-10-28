import type { CansAssessment } from "@/data/intake/types";
import { cn } from "@/lib/cn";

/** A native select of the template's items, grouped by domain. `allowNone` adds "Not tied to an item". */
export function ItemSelect({ cans, value, onChange, label, allowNone, disabled, className }: { cans: CansAssessment; value: string; onChange: (v: string) => void; label: string; allowNone?: boolean; disabled?: boolean; className?: string }) {
  return (
    <select aria-label={label} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={cn("h-[38px] w-full min-w-0 rounded-xl border border-field bg-white px-3 text-[14px] text-ink disabled:bg-tile disabled:text-muted", className)}>
      {allowNone ? <option value="">Not tied to an item</option> : null}
      {cans.domains.map((d) => (
        <optgroup key={d.id} label={d.label}>
          {d.itemIds.map((iid) => <option key={iid} value={iid}>{cans.items.find((i) => i.id === iid)?.name ?? iid}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
