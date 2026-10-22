import { useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { CHART, ChartFrame, Tooltip, niceMax, summaryId, useChartWidth, type ChartTableData } from "./core";

export interface ColumnSeries {
  key: string;
  name: string;
  color: string;
  values: (number | null)[];
}
export interface ColumnChartProps {
  labels: string[];
  details: string[];
  series: ColumnSeries[];
  /** Stack the series (true) or draw one column per series side by side. */
  stacked?: boolean;
  format: (v: number) => string;
  height?: number;
  yMax?: number;
  onColumn?: (index: number) => void;
  extra?: (index: number) => ReactNode;
  summary: string;
  table: ChartTableData;
  ariaLabel: string;
  hint?: ReactNode;
}
const M = { l: 40, r: 10, t: 12, b: 28 };

/** Vertical columns by month, stacked or single, with a tooltip and keyboard use. */
export function ColumnChart(p: ColumnChartProps) {
  const [ref, w] = useChartWidth();
  const id = useId();
  const h = p.height ?? 200;
  const n = p.labels.length;
  const iw = Math.max(40, w - M.l - M.r);
  const ih = h - M.t - M.b;
  const [active, setActive] = useState<number | null>(null);
  const focused = useRef(false);
  const totals = p.labels.map((_, i) => p.series.reduce((a, s) => a + (s.values[i] ?? 0), 0));
  const top = p.stacked ? Math.max(1, ...totals) : Math.max(1, ...p.series.flatMap((s) => s.values.map((v) => v ?? 0)));
  const yMax = p.yMax ?? niceMax(top * 1.05);
  const y = (v: number): number => M.t + ih - (v / yMax) * ih;
  const slot = iw / n;
  const bar = Math.min(34, slot * 0.62);
  const ticks = Array.from({ length: 5 }, (_, i) => (yMax * i) / 4);
  const cx = (i: number): number => M.l + slot * i + slot / 2;
  const everyOther = w < 480;
  const indexAt = (clientX: number, el: Element): number => Math.max(0, Math.min(n - 1, Math.floor((clientX - el.getBoundingClientRect().left - M.l) / slot)));
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setActive((a) => Math.max(0, Math.min(n - 1, (a ?? n - 1) + (e.key === "ArrowRight" ? 1 : -1))));
    } else if ((e.key === "Enter" || e.key === " ") && p.onColumn) {
      e.preventDefault();
      p.onColumn(active ?? n - 1);
    }
  };
  return (
    <ChartFrame id={id} summary={p.summary} table={p.table} hint={p.hint}>
      <ul className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-ink2" aria-label="Legend">
        {p.series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
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
          className="block select-none"
          style={{ cursor: p.onColumn ? "pointer" : "default" }}
          onPointerMove={(e: PointerEvent<SVGSVGElement>) => setActive(indexAt(e.clientX, e.currentTarget))}
          onPointerLeave={() => {
            if (!focused.current) setActive(null);
          }}
          onClick={(e) => p.onColumn?.(indexAt(e.clientX, e.currentTarget))}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.l} x2={w - M.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? CHART.axis : CHART.grid} />
              <text x={M.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={CHART.muted} fontFamily="inherit">
                {p.format(t)}
              </text>
            </g>
          ))}
          {active !== null ? <rect x={M.l + slot * active} y={M.t} width={slot} height={ih} fill={CHART.band} /> : null}
          {p.labels.map((l, i) => {
            const group = p.stacked ? 1 : p.series.length;
            const bw = p.stacked ? bar : bar / group;
            let acc = 0;
            return (
              <g key={i}>
                {p.series.map((s, si) => {
                  const v = s.values[i] ?? 0;
                  const x0 = p.stacked ? cx(i) - bar / 2 : cx(i) - bar / 2 + si * bw;
                  const y0 = p.stacked ? y(acc + v) : y(v);
                  const hh = p.stacked ? y(acc) - y(acc + v) : y(0) - y(v);
                  acc += v;
                  return <rect key={s.key} x={x0} y={y0} width={Math.max(1, bw - (p.stacked ? 0 : 1))} height={Math.max(0, hh)} fill={s.color} rx={p.stacked ? 0 : 2} opacity={active === null || active === i ? 1 : 0.55} />;
                })}
                {everyOther && i % 2 === 1 ? null : (
                  <text x={cx(i)} y={h - 9} textAnchor="middle" fontSize="11" fill={active === i ? CHART.ink : CHART.muted} fontWeight={active === i ? 600 : 400} fontFamily="inherit">
                    {l}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {active !== null ? (
          <Tooltip x={cx(active)} y={M.t + 2} bound={w} width={210}>
            <div className="mb-1 font-semibold">{p.details[active]}</div>
            {p.series.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  <i className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
                  {s.name}
                </span>
                <b className="tabular-nums">{s.values[active] === null ? "-" : p.format(s.values[active] as number)}</b>
              </div>
            ))}
            {p.extra ? <div className="mt-1 border-t border-line pt-1 text-muted">{p.extra(active)}</div> : null}
          </Tooltip>
        ) : null}
        <span className="sr-only" aria-live="polite">
          {active === null ? "" : `${p.details[active]}. ${p.series.map((s) => `${s.name} ${p.format(s.values[active] ?? 0)}`).join(", ")}.`}
        </span>
      </div>
    </ChartFrame>
  );
}
