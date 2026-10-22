import { Button, DateRangePicker, Dropdown, type Option } from "@/components/ui";
import { useStore } from "@/store";
import { DEFAULT_RANGE } from "@/store/core";
import { PAYER_OPTIONS, PROGRAM_OPTIONS, TYPE_OPTIONS, rangePresets, todayOf } from "./helpers";
import type { StageMenuValue } from "./workList";

interface Props {
  /** What the Stage menu shows: a stage, one of the three groupings from the key figures, or no stage. */
  stage: StageMenuValue;
  stageOptions: Option<StageMenuValue>[];
  onStage: (v: StageMenuValue) => void;
  canClear: boolean;
  onClear: () => void;
}

/** Payer, Program, Request type and Stage are menus. The days are a separate calendar control on the right. All apply as soon as they are picked and write to the shared filters. */
export function FilterBar({ stage, stageOptions, onStage, canClear, onClear }: Props) {
  const filters = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);
  const today = todayOf(useStore((s) => s.clock));
  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Dashboard filters">
      <Dropdown ariaLabel="Payer" value={filters.payer} defaultValue="all" options={PAYER_OPTIONS} onChange={(v) => setFilter("payer", v)} menuWidth={250} />
      <Dropdown ariaLabel="Program" value={filters.program} defaultValue="all" options={PROGRAM_OPTIONS} onChange={(v) => setFilter("program", v)} />
      <Dropdown ariaLabel="Request type" value={filters.type} defaultValue="all" options={TYPE_OPTIONS} onChange={(v) => setFilter("type", v)} menuWidth={250} />
      <Dropdown ariaLabel="Stage" value={stage} defaultValue="all" options={stageOptions} onChange={onStage} menuWidth={250} />
      {canClear ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      ) : null}
      <div className="ml-auto flex items-center gap-3 border-l border-field pl-4">
        <span className="text-[13px] text-muted">Outcomes for</span>
        <DateRangePicker ariaLabel="Date range" value={filters.range} defaultValue={DEFAULT_RANGE} max={today} presets={rangePresets(today)} onChange={(r) => setFilter("range", r)} />
      </div>
    </div>
  );
}
