import { Button, Dropdown } from "@/components/ui";
import { useStore } from "@/store";
import { PAYER_OPTIONS, PERIOD_OPTIONS, PROGRAM_OPTIONS, STAGE_OPTIONS, TYPE_OPTIONS, hasNarrowingFilter } from "./helpers";

/** Payer, Program, Request type, Stage, Period. They apply as soon as they are picked and write to the shared filters. */
export function FilterBar() {
  const filters = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);
  const clearFilters = useStore((s) => s.clearFilters);
  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Dashboard filters">
      <Dropdown ariaLabel="Payer" value={filters.payer} defaultValue="all" options={PAYER_OPTIONS} onChange={(v) => setFilter("payer", v)} menuWidth={250} />
      <Dropdown ariaLabel="Program" value={filters.program} defaultValue="all" options={PROGRAM_OPTIONS} onChange={(v) => setFilter("program", v)} />
      <Dropdown ariaLabel="Request type" value={filters.type} defaultValue="all" options={TYPE_OPTIONS} onChange={(v) => setFilter("type", v)} menuWidth={250} />
      <Dropdown ariaLabel="Stage" value={filters.stage} defaultValue="all" options={STAGE_OPTIONS} onChange={(v) => setFilter("stage", v)} />
      <Dropdown ariaLabel="Period" value={filters.period} options={PERIOD_OPTIONS} onChange={(v) => setFilter("period", v)} />
      {hasNarrowingFilter(filters) ? (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
