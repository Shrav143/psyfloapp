import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button, Dropdown, useEscape } from "@/components/ui";
import { cn } from "@/lib/cn";
import { countedOptions, type FacetDef, type Query } from "./facets";

/** The filter bar of a worklist: the main filters in a row, the rest in a More filters popover, and every active filter as a chip you can remove.
    Each choice shows how many rows it would leave. */
export function FilterBar<R>({ defs, rows, query, searchOf, set, clear, hide = [] }: {
  defs: readonly FacetDef<R>[];
  rows: readonly R[];
  query: Query;
  searchOf: (r: R) => string;
  set: (key: string, value: string | null) => void;
  clear: () => void;
  /** Filters this page does not offer. */
  hide?: string[];
}) {
  const shown = defs.filter((d) => !hide.includes(d.id));
  const main = shown.filter((d) => d.primary);
  const more = shown.filter((d) => !d.primary);
  const moreActive = more.filter((d) => query.facets[d.id]).length;
  const chips = shown.filter((d) => query.facets[d.id]);

  const drop = (d: FacetDef<R>, variant: "filter" | "field" = "filter") => {
    const opts = countedOptions(d, rows, defs, query, searchOf);
    return (
      <Dropdown<string>
        key={d.id}
        variant={variant}
        ariaLabel={d.label}
        value={query.facets[d.id] ?? "all"}
        defaultValue="all"
        onChange={(v) => set(d.id, v === "all" ? null : v)}
        options={[{ value: "all", label: d.allLabel }, ...opts.map((o) => ({ value: o.value, label: o.label, hint: String(o.count), group: o.group }))]}
        menuWidth={d.menuWidth ?? 240}
        className={variant === "filter" ? "max-w-[220px]" : undefined}
      />
    );
  };
  const labelOf = (d: FacetDef<R>) => countedOptions(d, rows, defs, query, searchOf).find((o) => o.value === query.facets[d.id])?.label ?? query.facets[d.id];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
        {main.map((d) => drop(d))}
        {more.length ? <MoreFilters count={moreActive}>{more.map((d) => <div key={d.id} className="flex flex-col gap-1 text-[12px] font-medium text-muted"><span>{d.label}</span>{drop(d, "field")}</div>)}</MoreFilters> : null}
      </div>
      {chips.length || query.q.trim() ? (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {query.q.trim() ? (
            <button type="button" data-chip="q" onClick={() => set("q", null)} aria-label={`Remove search ${query.q}`} className="inline-flex items-center gap-1.5 rounded-full border border-forest bg-sage-bg px-2.5 py-0.5 text-forest">
              <span className="text-[12px] font-semibold">Search: {query.q}</span>
              <X size={13} className="ico" />
            </button>
          ) : null}
          {chips.map((d) => (
            <button key={d.id} type="button" data-chip={d.id} onClick={() => set(d.id, null)} aria-label={`Remove filter ${d.label}: ${labelOf(d)}`} className="inline-flex items-center gap-1.5 rounded-full border border-forest bg-sage-bg px-2.5 py-0.5 text-forest">
              <span className="text-[12px] font-semibold">{d.label}: {labelOf(d)}</span>
              <X size={13} className="ico" />
            </button>
          ))}
          <Button size="sm" variant="ghost" onClick={clear}>Clear filters</Button>
        </div>
      ) : null}
    </div>
  );
}

/** The popover for the less-used filters. Escape and a click outside close it; the button says how many of its filters are on. */
function MoreFilters({ count, children }: { count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEscape(open, () => {
    setOpen(false);
    btn.current?.focus();
  });
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        ref={btn}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn("flex h-[38px] items-center gap-2 rounded-xl border bg-white px-3 text-sm text-ink transition-colors hover:bg-tile", count ? "border-forest bg-[#EEF7F6] font-semibold" : "border-field")}
      >
        <SlidersHorizontal size={15} className="ico" />
        More filters
        {count ? <span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-forest px-1.5 text-[11px] font-semibold text-white">{count}</span> : null}
      </button>
      {open ? (
        <div role="dialog" aria-label="More filters" className="psy-fade-up absolute top-[44px] left-0 z-40 grid w-[min(520px,calc(100vw-48px))] gap-3 rounded-[14px] border border-field bg-white p-4 shadow-[0_12px_32px_rgba(21,27,36,0.12)] sm:grid-cols-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}
