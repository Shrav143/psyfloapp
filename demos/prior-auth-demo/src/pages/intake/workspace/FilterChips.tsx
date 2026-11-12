import { cn } from "@/lib/cn";

/** A row of filter buttons that wrap, each with its count. The one pressed is the filter in use. */
export function FilterChips<T extends string>({ items, value, onChange, label }: { items: { id: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <button
          key={i.id}
          type="button"
          aria-pressed={i.id === value}
          onClick={() => onChange(i.id)}
          className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium", i.id === value ? "border-forest bg-forest text-white" : "border-field bg-white text-ink2 hover:bg-tile")}
        >
          {i.label}
          {i.count !== undefined ? <span className={cn("text-[12px]", i.id === value ? "text-white/85" : "text-muted")}>{i.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
