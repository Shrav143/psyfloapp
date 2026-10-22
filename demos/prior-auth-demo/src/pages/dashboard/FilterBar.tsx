import { Button, Dropdown, type Option } from "@/components/ui";
import { useStore } from "@/store";
import { PAYER_OPTIONS, PROGRAM_OPTIONS, TYPE_OPTIONS } from "./helpers";
import type { StageMenuValue } from "./workList";

interface Props {
  /** What the Stage menu shows: a stage, one of the three groupings from the key figures, or no stage. */
  stage: StageMenuValue;
  stageOptions: Option<StageMenuValue>[];
  onStage: (v: StageMenuValue) => void;
  canClear: boolean;
  onClear: () => void;
}

/** Payer, Program, Request type and Stage are menus. They apply as soon as they are picked and write to the shared filters. */
export function FilterBar({ stage, stageOptions, onStage, canClear, onClear }: Props) {
  const filters = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);
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
    </div>
  );
}
