import { ChevronDown } from "lucide-react";
import { Button, Card } from "@/components/ui";
import { BAND_META, type Band, type QueueItem } from "@/data/queue";
import { cn } from "@/lib/cn";
import { RequestTile, type RowInfo } from "./RequestTile";
import type { Stats } from "./queueLogic";

const SHOWN = 5;

interface Props {
  band: Band;
  items: QueueItem[];
  stats: Stats;
  collapsed: boolean;
  showAll: boolean;
  clock: number;
  rows: Record<string, RowInfo>;
  onToggle: () => void;
  onShowAll: (on: boolean) => void;
}

/** A priority band: click the header to collapse it. Shows the five top requests, with a link for the rest.
    A band with no request left says so instead of vanishing. */
export function BandCard({ band, items, stats, collapsed, showAll, clock, rows, onToggle, onShowAll }: Props) {
  const meta = BAND_META[band];
  const visible = showAll ? items : items.slice(0, SHOWN);
  return (
    <Card data-testid={`band-${band}`}>
      <h3 className="m-0">
        <button type="button" onClick={onToggle} aria-expanded={!collapsed} className="flex w-full items-center gap-3 rounded-[20px] px-6 py-5 text-left hover:bg-[#FBF8F3]">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.dot }} aria-hidden="true" />
          <span className="font-serif text-[21px] font-semibold leading-tight tracking-tight">{meta.name}</span>
          <span className="text-[15px] font-normal text-muted">({stats.count} {stats.count === 1 ? "request" : "requests"})</span>
          <ChevronDown size={18} className={cn("ico ml-auto shrink-0 text-muted transition-transform", collapsed && "-rotate-90")} />
        </button>
      </h3>
      {collapsed ? null : (
        <div className="flex flex-col gap-3 border-t border-line px-5 py-5">
          {items.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <div className="font-serif text-xl font-semibold">Nothing needs you today</div>
              <div className="mt-1 text-sm text-muted">Everything in {meta.name} has been sent or handled.</div>
            </div>
          ) : null}
          {visible.map((i) => (
            <RequestTile key={i.id} item={i} clock={clock} info={rows[i.id]} />
          ))}
          {items.length > SHOWN ? (
            <div className="flex justify-center">
              <Button variant="ghost" size="sm" onClick={() => onShowAll(!showAll)}>
                {showAll ? "Show fewer" : `Show ${items.length - SHOWN} more`}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
