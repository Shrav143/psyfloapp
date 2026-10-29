import { Button, Dropdown, type Option } from "@/components/ui";
import type { StageKey } from "@/data/types";
import { cn } from "@/lib/cn";
import { useStore } from "@/store";
import { PROGRAM_OPTIONS, TYPE_OPTIONS, payerOptions } from "./helpers";

/** Opens the menu to the left of its button, so a menu near the card's right edge never runs off the page. */
const OPEN_LEFT = "[&>[role=listbox]]:right-0 [&>[role=listbox]]:left-auto";

interface Props {
  needsToday: boolean;
  onNeedsToday: (on: boolean) => void;
  /** The Status menu's entries, each with its count. */
  statusOptions: Option<StageKey | "all">[];
  canClear: boolean;
  onClear: () => void;
}

/** "Needs me today" is a toggle; Payer, Program, Status and Request type are menus. They apply as soon as they are picked and write to the shared filters (and so to the address). */
export function TableControls({ needsToday, onNeedsToday, statusOptions, canClear, onClear }: Props) {
  const filters = useStore((s) => s.filters);
  const setFilter = useStore((s) => s.setFilter);
  return (
    <div className="flex flex-wrap items-center justify-end gap-2.5" role="group" aria-label="Table filters">
      <button
        type="button"
        aria-pressed={needsToday}
        onClick={() => onNeedsToday(!needsToday)}
        className={cn("h-[38px] rounded-xl border px-3.5 text-sm text-ink transition-colors hover:bg-tile", needsToday ? "border-forest bg-[#EEF7F6] font-semibold" : "border-field bg-white")}
      >
        Needs me today
      </button>
      <Dropdown ariaLabel="Payer" value={filters.payer} defaultValue="all" options={payerOptions()} onChange={(v) => setFilter("payer", v)} menuWidth={250} />
      <Dropdown ariaLabel="Program" value={filters.program} defaultValue="all" options={PROGRAM_OPTIONS} onChange={(v) => setFilter("program", v)} className={OPEN_LEFT} />
      <Dropdown ariaLabel="Status" value={filters.stage} defaultValue="all" options={statusOptions} onChange={(v) => setFilter("stage", v)} menuWidth={240} className={OPEN_LEFT} />
      <Dropdown ariaLabel="Request type" value={filters.type} defaultValue="all" options={TYPE_OPTIONS} onChange={(v) => setFilter("type", v)} menuWidth={240} className={OPEN_LEFT} />
      {canClear ? (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
