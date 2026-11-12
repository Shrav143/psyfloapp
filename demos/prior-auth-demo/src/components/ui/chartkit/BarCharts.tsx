import { useId, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CHART, ChartFrame, type ChartTableData } from "./core";

export interface BarRow {
  key: string;
  label: string;
  sub?: string;
  value: number | null;
  /** A second bar under the first (requested against approved, this payer against the clinic). */
  value2?: number | null;
  display?: string;
  display2?: string;
  color?: string;
  color2?: string;
  /** A tick on the track, such as the clinic average. */
  marker?: number | null;
  /** A short word beside the label (a tag, never color alone). */
  tag?: string;
  /** Few cases behind it, so it is drawn quiet. */
  quiet?: boolean;
}
export interface HBarChartProps {
  rows: BarRow[];
  max?: number;
  labelWidth?: number;
  valueWidth?: number;
  /** Rows become buttons. */
  onRow?: (key: string) => void;
  rowHint?: (row: BarRow) => string;
  legend?: { name: string; color: string; marker?: boolean }[];
  summary: string;
  table: ChartTableData;
  ariaLabel: string;
  hint?: ReactNode;
  className?: string;
}

/** Horizontal bars: a label, a bar on a track (SVG, so it stays sharp), and the value. A row can carry a second bar and a marker, and can be a button. */
export function HBarChart(p: HBarChartProps) {
  const id = useId();
  const max = p.max ?? 100;
  const lw = p.labelWidth ?? 150;
  const vw = p.valueWidth ?? 56;
  const two = p.rows.some((r) => r.value2 !== undefined);
  const h = two ? 20 : 10;
  return (
    <ChartFrame id={id} summary={p.summary} table={p.table} hint={p.hint} className={p.className}>
      {p.legend ? (
        <ul className="mb-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-ink2" aria-label="Legend">
          {p.legend.map((l) => (
            <li key={l.name} className="flex items-center gap-2">
              {l.marker ? <i className="inline-block h-3 w-0.5" style={{ background: l.color }} /> : <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} />}
              {l.name}
            </li>
          ))}
        </ul>
      ) : null}
      <ul aria-label={p.ariaLabel} className="m-0 flex list-none flex-col gap-1 p-0">
        {p.rows.map((r) => {
          const body = (
            <div className="grid items-center gap-3" style={{ gridTemplateColumns: `minmax(0,${lw}px) minmax(0,1fr) ${vw}px` }}>
              <span className="min-w-0 text-left">
                <span className="block truncate text-[13px]" title={r.label}>
                  {r.label}
                </span>
                {r.sub || r.tag ? (
                  <span className="flex items-center gap-1.5 text-[11px] text-muted">
                    {r.tag ? <span className="rounded-full bg-mid-bg px-2 py-px text-[11px] font-semibold text-mid-ink">{r.tag}</span> : null}
                    <span className="truncate">{r.sub}</span>
                  </span>
                ) : null}
              </span>
              <svg width="100%" height={h} role="presentation" className="block">
                <rect x="0" y="0" width="100%" height={two ? 8 : h} rx="4" fill={CHART.track} />
                {r.value !== null ? <rect x="0" y="0" width={`${Math.max(0, Math.min(100, (r.value / max) * 100))}%`} height={two ? 8 : h} rx="4" fill={r.color ?? CHART.good} opacity={r.quiet ? 0.55 : 1} /> : null}
                {two ? (
                  <>
                    <rect x="0" y="11" width="100%" height="8" rx="4" fill={CHART.track} />
                    {r.value2 !== null && r.value2 !== undefined ? <rect x="0" y="11" width={`${Math.max(0, Math.min(100, (r.value2 / max) * 100))}%`} height="8" rx="4" fill={r.color2 ?? CHART.sage} /> : null}
                  </>
                ) : null}
                {r.marker !== null && r.marker !== undefined ? <line x1={`${(r.marker / max) * 100}%`} x2={`${(r.marker / max) * 100}%`} y1="-2" y2={h + 2} stroke={CHART.ink} strokeWidth="1.5" /> : null}
              </svg>
              <span className="text-right text-[13px] font-semibold tabular-nums">
                {r.display ?? (r.value === null ? "-" : `${r.value}%`)}
                {two ? <span className="block text-[11px] font-normal text-muted">{r.display2 ?? (r.value2 === null || r.value2 === undefined ? "-" : `${r.value2}%`)}</span> : null}
              </span>
            </div>
          );
          return (
            <li key={r.key}>
              {p.onRow ? (
                <button type="button" onClick={() => p.onRow?.(r.key)} aria-label={p.rowHint ? p.rowHint(r) : undefined} className={cn("block w-full rounded-xl px-2.5 py-2 text-left hover:bg-[#FAF9F6]", r.quiet && "text-muted")}>
                  {body}
                </button>
              ) : (
                <div className="px-2.5 py-2">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </ChartFrame>
  );
}

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}
export interface StackRow {
  key: string;
  label: string;
  total: number;
  segments: Segment[];
}
export interface StackedHBarsProps {
  rows: StackRow[];
  labelWidth?: number;
  onRow?: (key: string) => void;
  /** The legend, in order. */
  legend: { key: string; label: string; color: string }[];
  summary: string;
  table: ChartTableData;
  ariaLabel: string;
  hint?: ReactNode;
  totalLabel?: string;
}

/** One bar per row, split into segments that fill the bar (the mix), with the count at the right. Hover a segment for its reason and count. */
export function StackedHBars(p: StackedHBarsProps) {
  const id = useId();
  const lw = p.labelWidth ?? 190;
  return (
    <ChartFrame id={id} summary={p.summary} table={p.table} hint={p.hint}>
      <ul className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink2" aria-label="Legend">
        {p.legend.map((l) => (
          <li key={l.key} className="flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} />
            {l.label}
          </li>
        ))}
      </ul>
      <ul aria-label={p.ariaLabel} className="m-0 flex list-none flex-col gap-0.5 p-0">
        {p.rows.map((r) => {
          let acc = 0;
          const body = (
            <div className="grid items-center gap-3" style={{ gridTemplateColumns: `minmax(0,${lw}px) minmax(0,1fr) 44px` }}>
              <span className="truncate text-left text-[13px]" title={r.label}>
                {r.label}
              </span>
              <svg width="100%" height="16" role="presentation" className="block">
                <rect x="0" y="0" width="100%" height="16" rx="4" fill={CHART.track} />
                {r.total > 0
                  ? r.segments.map((s) => {
                      const x = (acc / r.total) * 100;
                      acc += s.value;
                      const wd = (s.value / r.total) * 100;
                      return s.value > 0 ? (
                        <rect key={s.key} x={`${x}%`} y="0" width={`${wd}%`} height="16" fill={s.color} stroke="#fff" strokeWidth="1.5">
                          <title>{`${s.label}: ${s.value} of ${r.total}`}</title>
                        </rect>
                      ) : null;
                    })
                  : null}
              </svg>
              <span className="text-right text-[13px] font-semibold tabular-nums">{r.total}</span>
            </div>
          );
          return (
            <li key={r.key}>
              {p.onRow ? (
                <button type="button" onClick={() => p.onRow?.(r.key)} className="block w-full rounded-xl px-2.5 py-1.5 text-left hover:bg-[#FAF9F6]">
                  {body}
                </button>
              ) : (
                <div className="px-2.5 py-1.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </ChartFrame>
  );
}
