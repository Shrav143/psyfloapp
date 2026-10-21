import { ChevronDown } from "lucide-react";
import { Button, Card, Pill } from "@/components/ui";
import { BAND_META, type Band, type QueueItem } from "@/data/queue";
import { band as chanceBand, money } from "@/lib/format";
import { cn } from "@/lib/cn";
import { RequestTile } from "./RequestTile";
import { shortSpan, type Stats } from "./queueLogic";

const SHOWN = 5;

interface Props {
  band: Band;
  items: QueueItem[];
  stats: Stats;
  collapsed: boolean;
  showAll: boolean;
  clock: number;
  chances: Record<string, { chance: number; lift: string; ready: boolean }>;
  onToggle: () => void;
  onShowAll: (on: boolean) => void;
}

/** A priority band: click the header to collapse it. Shows the five top requests, with a link for the rest. */
export function BandCard({ band, items, stats, collapsed, showAll, clock, chances, onToggle, onShowAll }: Props) {
  const meta = BAND_META[band];
  const avg = chanceBand(stats.avg);
  const visible = showAll ? items : items.slice(0, SHOWN);
  return (
    <Card data-testid={`band-${band}`}>
      <h3 className="m-0">
        <button type="button" onClick={onToggle} aria-expanded={!collapsed} className="flex w-full items-center gap-3 rounded-[20px] px-6 py-5 text-left hover:bg-[#FBF8F3]">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.dot }} aria-hidden="true" />
          <span className="font-serif text-[21px] font-semibold leading-tight tracking-tight">{meta.name}</span>
          <Pill>{stats.count} {stats.count === 1 ? "request" : "requests"}</Pill>
          <span className="ml-auto flex items-center gap-6 text-[13.5px] font-normal">
            <span><b>{money(stats.dollars)}</b> <span className="text-muted">at stake</span></span>
            <span><b style={{ color: avg.color }}>{stats.avg}%</b> <span className="text-muted">avg chance</span></span>
            <span><b>{stats.firstDue === null ? "none" : shortSpan(stats.firstDue)}</b> <span className="text-muted">first due</span></span>
          </span>
          <ChevronDown size={18} className={cn("ico shrink-0 text-muted transition-transform", collapsed && "-rotate-90")} />
        </button>
      </h3>
      {collapsed ? null : (
        <div className="flex flex-col gap-3 border-t border-line px-5 py-5">
          {visible.map((i) => (
            <RequestTile key={i.id} item={i} clock={clock} chance={chances[i.id].chance} lift={chances[i.id].lift} ready={chances[i.id].ready} />
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
