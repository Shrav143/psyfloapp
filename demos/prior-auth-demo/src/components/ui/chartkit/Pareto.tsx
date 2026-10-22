import { useId, type ReactNode } from "react";
import { Wrench } from "lucide-react";
import { cn } from "@/lib/cn";
import { CHART, ChartFrame, type ChartTableData } from "./core";

export interface ParetoRow {
  key: string;
  label: string;
  count: number;
  /** Share of all denials, and the running share down the list, in percent. */
  share: number;
  cum: number;
  /** The team could have fixed this before sending. */
  marked: boolean;
  /** The row that rolls up the rest. */
  other?: boolean;
  sub?: string;
}
export interface ParetoChartProps {
  rows: ParetoRow[];
  total: number;
  onRow?: (key: string) => void;
  /** The word on the marker ("Preventable"). */
  markLabel: string;
  summary: string;
  table: ChartTableData;
  ariaLabel: string;
  hint?: ReactNode;
}

/** A Pareto chart on its side: reasons from the most to the least common, a bar for each, a marker on the ones the team could have prevented, and a
    running total at the right, so the few reasons behind most denials stand out. The marker is a word and a pattern, never color alone. */
export function ParetoChart(p: ParetoChartProps) {
  const id = useId();
  const top = Math.max(1, ...p.rows.filter((r) => !r.other).map((r) => r.count));
  const named = p.rows.filter((r) => !r.other);
  const reach = named.findIndex((r) => r.cum >= 80);
  return (
    <ChartFrame id={id} summary={p.summary} table={p.table} hint={p.hint}>
      <ul className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-ink2" aria-label="Legend">
        <li className="flex items-center gap-2">
          <svg width="16" height="12" aria-hidden="true">
            <defs>
              <pattern id={`${id}-p`} patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
                <rect width="5" height="5" fill={CHART.mid} />
                <line x1="0" y1="0" x2="0" y2="5" stroke="#fff" strokeWidth="1.8" opacity="0.55" />
              </pattern>
            </defs>
            <rect width="16" height="12" rx="3" fill={`url(#${id}-p)`} />
          </svg>
          {p.markLabel}: the team could fix it before sending
        </li>
        <li className="flex items-center gap-2">
          <i className="inline-block h-3 w-4 rounded-[3px]" style={{ background: CHART.umber }} />
          Not preventable
        </li>
      </ul>
      <div className="@container">
        <div className="hidden grid-cols-[minmax(200px,1.5fr)_minmax(0,1fr)_52px_64px] items-center gap-3 px-2.5 pb-1 text-[11px] font-medium tracking-[0.08em] text-muted uppercase @xl:grid" aria-hidden="true">
          <span>Reason</span>
          <span />
          <span className="text-right">Denials</span>
          <span className="text-right">Running</span>
        </div>
        <ul aria-label={p.ariaLabel} className="m-0 flex list-none flex-col p-0">
          {p.rows.map((r, i) => {
            const body = (
              <div className="grid grid-cols-[minmax(0,1fr)_48px_52px] items-center gap-x-3 gap-y-1.5 @xl:grid-cols-[minmax(200px,1.5fr)_minmax(0,1fr)_52px_64px]">
                <span className="min-w-0 text-left @xl:col-start-1">
                  <span className="block text-[13.5px] leading-snug">{r.label}</span>
                  {r.marked ? (
                    <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-mid-bg px-2 py-px text-[10.5px] font-semibold text-mid-ink">
                      <Wrench size={10} className="ico" aria-hidden="true" />
                      {p.markLabel}
                    </span>
                  ) : null}
                  {r.sub ? <span className="ml-1.5 text-[11.5px] text-muted">{r.sub}</span> : null}
                </span>
                <svg width="100%" height="16" role="presentation" className="col-span-3 row-start-2 block @xl:col-span-1 @xl:col-start-2 @xl:row-start-1">
                  <rect x="0" y="0" width="100%" height="16" rx="4" fill={CHART.track} />
                  <rect x="0" y="0" width={`${Math.min(100, (r.count / top) * 100)}%`} height="16" rx="4" fill={r.other ? CHART.midSoft : r.marked ? `url(#${id}-p)` : CHART.umber} />
                </svg>
                <span className="text-right text-[13.5px] font-semibold tabular-nums @xl:col-start-3">
                  {r.count}
                  <span className="block text-[11px] font-normal text-muted">{r.share}%</span>
                </span>
                <span className="text-right text-[13px] tabular-nums text-ink2 @xl:col-start-4">
                  <span className="text-[11px] text-muted @xl:hidden">running </span>
                  {r.cum}%
                </span>
              </div>
            );
            return (
              <li key={r.key} className={cn(!r.other && i === reach && "border-b border-dashed border-field")}>
                {p.onRow ? (
                  <button type="button" onClick={() => p.onRow?.(r.key)} className="block w-full rounded-xl px-2.5 py-2 text-left hover:bg-[#FBF8F3]">
                    {body}
                  </button>
                ) : (
                  <div className="px-2.5 py-2">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {reach >= 0 ? (
        <p className="mt-2 px-2.5 text-[12px] text-muted">
          The first {reach + 1} {reach === 0 ? "reason accounts" : "reasons account"} for {named[reach].cum}% of the {p.total.toLocaleString("en-US")} denials (dashed line).
        </p>
      ) : null}
    </ChartFrame>
  );
}
