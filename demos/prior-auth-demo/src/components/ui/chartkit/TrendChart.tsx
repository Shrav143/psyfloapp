import { useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { CHART, ChartFrame, Tooltip, niceMax, smoothPath, summaryId, useChartWidth, type ChartTableData } from "./core";

export interface TrendSeries {
  key: string;
  name: string;
  color: string;
  values: (number | null)[];
  /** Fill the area under the line. */
  area?: boolean;
  dashed?: boolean;
}
export interface TrendChartProps {
  /** One label per point (the month). */
  labels: string[];
  /** The heading of each point's tooltip ("21 Sep to 20 Oct 2026"). */
  details: string[];
  series: TrendSeries[];
  /** Stack the series on top of each other (counts that add up to a total). */
  stacked?: boolean;
  format: (v: number) => string;
  yMin?: number;
  yMax?: number;
  height?: number;
  /** Shade the points of the chosen period. */
  highlight?: { from: number; to: number; label: string };
  /** Click on a point, or Enter on the focused chart. */
  onPoint?: (index: number) => void;
  /** More lines for a point's tooltip. */
  extra?: (index: number) => ReactNode;
  summary: string;
  table: ChartTableData;
  ariaLabel: string;
  hint?: ReactNode;
  testId?: string;
}

const M = { l: 46, r: 16, t: 14, b: 30 };

/** A line or stacked-area chart over twelve points, with gridlines, an axis, a legend, a tooltip with the exact values, and keyboard use
    (arrow keys move between points, Enter opens one). The tooltip floats above a chart of fixed height, so nothing moves on hover. */
export function TrendChart(p: TrendChartProps) {
  const [ref, w] = useChartWidth();
  const id = useId();
  const h = p.height ?? 260;
  const n = p.labels.length;
  const iw = Math.max(40, w - M.l - M.r);
  const ih = h - M.t - M.b;
  const [active, setActive] = useState<number | null>(null);
  const focused = useRef(false);
  const stacks = p.series.map((_, si) => p.labels.map((__, i) => p.series.slice(0, si + 1).reduce((a, s) => a + (s.values[i] ?? 0), 0)));
  const all = p.stacked ? stacks[stacks.length - 1] : p.series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const yMin = p.yMin ?? 0;
  const yMax = p.yMax ?? niceMax(Math.max(1, ...all) * 1.05);
  const x = (i: number): number => M.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number): number => M.t + ih - ((v - yMin) / (yMax - yMin || 1)) * ih;
  const ticks = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) * i) / 4);
  const step = n > 1 ? iw / (n - 1) : iw;
  const everyOther = w < 520;

  const indexAt = (clientX: number, el: Element): number => {
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.min(n - 1, Math.round(((clientX - r.left - M.l) / iw) * (n - 1))));
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => setActive(indexAt(e.clientX, e.currentTarget));
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setActive((a) => Math.max(0, Math.min(n - 1, (a ?? n - 1) + (e.key === "ArrowRight" ? 1 : -1))));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : n - 1);
    } else if ((e.key === "Enter" || e.key === " ") && p.onPoint) {
      e.preventDefault();
      p.onPoint(active ?? n - 1);
    }
  };

  const total = active === null ? 0 : p.series.reduce((a, s) => a + (s.values[active] ?? 0), 0);
  const live = active === null ? "" : `${p.details[active]}. ${p.series.map((s) => `${s.name} ${s.values[active] === null ? "no data" : p.format(s.values[active] as number)}`).join(", ")}.`;

  return (
    <ChartFrame id={id} summary={`${p.summary} Use the left and right arrow keys to move between months${p.onPoint ? " and Enter to list the cases of the month" : ""}.`} table={p.table} hint={p.hint}>
      <ul className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-ink2" aria-label="Legend">
        {p.series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <svg width="22" height="10" aria-hidden="true">
              {s.area ? <rect x="0" y="2" width="22" height="8" fill={s.color} opacity="0.16" /> : null}
              <line x1="0" y1="3" x2="22" y2="3" stroke={s.color} strokeWidth="2.4" strokeDasharray={s.dashed ? "4 3" : undefined} strokeLinecap="round" />
            </svg>
            {s.name}
          </li>
        ))}
      </ul>
      <div
        ref={ref}
        role="group"
        aria-label={p.ariaLabel}
        aria-describedby={summaryId(id)}
        tabIndex={0}
        data-testid={p.testId}
        onKeyDown={onKey}
        onFocus={() => {
          focused.current = true;
          setActive((a) => a ?? n - 1);
        }}
        onBlur={() => {
          focused.current = false;
          setActive(null);
        }}
        style={{ height: h }}
        className="relative w-full rounded-xl outline-offset-4"
      >
        <svg
          width={w}
          height={h}
          className="block touch-pan-y select-none"
          style={{ cursor: p.onPoint ? "pointer" : "default" }}
          onPointerMove={onMove}
          onPointerLeave={() => {
            if (!focused.current) setActive(null);
          }}
          onClick={(e) => p.onPoint?.(indexAt(e.clientX, e.currentTarget))}
        >
          <defs>
            {p.series.map((s) => (
              <linearGradient key={s.key} id={`${id}-g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={p.stacked ? 0.34 : 0.22} />
                <stop offset="100%" stopColor={s.color} stopOpacity={p.stacked ? 0.18 : 0.02} />
              </linearGradient>
            ))}
          </defs>
          {p.highlight ? (
            <g>
              <rect x={x(p.highlight.from) - step / 2} y={M.t} width={x(p.highlight.to) - x(p.highlight.from) + step} height={ih} fill={CHART.band} />
              <text x={x(p.highlight.from) - step / 2 + 6} y={M.t + 12} fontSize="10.5" fill={CHART.muted} fontFamily="inherit">
                {p.highlight.label}
              </text>
            </g>
          ) : null}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.l} x2={w - M.r} y1={y(t)} y2={y(t)} stroke={t === yMin ? CHART.axis : CHART.grid} strokeWidth="1" />
              <text x={M.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={CHART.muted} fontFamily="inherit">
                {p.format(t)}
              </text>
            </g>
          ))}
          {p.labels.map((l, i) =>
            everyOther && i % 2 === 1 ? null : (
              <text key={i} x={x(i)} y={h - 9} textAnchor="middle" fontSize="11" fill={active === i ? CHART.ink : CHART.muted} fontWeight={active === i ? 600 : 400} fontFamily="inherit">
                {l}
              </text>
            ),
          )}
          {(p.stacked ? [...p.series].reverse() : p.series).map((s) => {
            const si = p.series.indexOf(s);
            const top = p.labels.map((_, i) => (s.values[i] === null && !p.stacked ? null : { x: x(i), y: y(p.stacked ? stacks[si][i] : (s.values[i] as number)) }));
            const line = smoothPath(top);
            const below = p.stacked ? p.labels.map((_, i) => ({ x: x(i), y: y(si === 0 ? yMin : stacks[si - 1][i]) })).reverse() : null;
            const firstPt = top.find((t) => t !== null);
            const lastPt = [...top].reverse().find((t) => t !== null);
            const areaPath =
              (s.area || p.stacked) && firstPt && lastPt
                ? p.stacked && below
                  ? `${line} L${below.map((b) => `${b.x.toFixed(1)},${b.y.toFixed(1)}`).join(" L")} Z`
                  : `${line} L${lastPt.x.toFixed(1)},${y(yMin)} L${firstPt.x.toFixed(1)},${y(yMin)} Z`
                : null;
            return (
              <g key={s.key}>
                {areaPath ? <path d={areaPath} fill={`url(#${id}-g-${s.key})`} /> : null}
                <path d={line} fill="none" stroke={s.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.dashed ? "5 4" : undefined} />
              </g>
            );
          })}
          {p.series.map((s, si) =>
            s.values.map((v, i) => (v === null ? null : <circle key={`${s.key}${i}`} cx={x(i)} cy={y(p.stacked ? stacks[si][i] : v)} r={active === i ? 5 : 2.8} fill={active === i ? s.color : "#fff"} stroke={s.color} strokeWidth="2" />)),
          )}
          {active !== null ? <line x1={x(active)} x2={x(active)} y1={M.t} y2={M.t + ih} stroke={CHART.text} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" /> : null}
        </svg>
        {active !== null ? (
          <Tooltip x={x(active)} y={M.t + 4} bound={w}>
            <div className="mb-1 font-semibold">{p.details[active]}</div>
            {p.series.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <b className="tabular-nums">{s.values[active] === null ? "-" : p.format(s.values[active] as number)}</b>
              </div>
            ))}
            {p.stacked ? (
              <div className="mt-1 flex items-center justify-between gap-3 border-t border-line pt-1 text-ink2">
                <span>All decisions</span>
                <b className="tabular-nums">{p.format(total)}</b>
              </div>
            ) : null}
            {p.extra ? <div className="mt-1 border-t border-line pt-1 text-muted">{p.extra(active)}</div> : null}
          </Tooltip>
        ) : null}
        <span className="sr-only" aria-live="polite">
          {live}
        </span>
      </div>
    </ChartFrame>
  );
}
