import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { CHART, ChartFrame, Tooltip, summaryId, useChartWidth, wrapLabel, type ChartTableData } from "./core";

export interface HeatCell {
  n: number;
  /** Approved as requested, in percent. null when there is nothing to divide. */
  rate: number | null;
  /** The line the tooltip adds under the numbers. */
  detail?: string;
}
export interface HeatmapProps {
  rows: { key: string; label: string; sub?: string; emphasis?: boolean }[];
  cols: { key: string; label: string }[];
  cells: HeatCell[][];
  /** Cells with fewer decisions than this are drawn quiet and grey. */
  minN?: number;
  onCell?: (row: number, col: number) => void;
  onRow?: (row: number) => void;
  onCol?: (col: number) => void;
  /** Words for a cell's accessible name: "Cardinal, Opioid use disorder". */
  cellName?: (row: number, col: number) => string;
  summary: string;
  table: ChartTableData;
  ariaLabel: string;
  hint?: ReactNode;
  /** The cell shows this value ("approved as requested"). */
  metric?: string;
}

const STOPS: [number, [number, number, number]][] = [
  [35, [196, 104, 77]],
  [55, [232, 185, 167]],
  [68, [241, 236, 226]],
  [80, [207, 227, 219]],
  [95, [95, 150, 128]],
];
/** Color for an approval rate: terracotta below 55, cream in the middle, green from 80. */
export function heatColor(rate: number): { fill: string; text: string } {
  const r = Math.max(STOPS[0][0], Math.min(STOPS[STOPS.length - 1][0], rate));
  let i = 0;
  while (i < STOPS.length - 2 && r > STOPS[i + 1][0]) i++;
  const [a, ca] = STOPS[i];
  const [b, cb] = STOPS[i + 1];
  const t = (r - a) / (b - a || 1);
  const c = ca.map((v, k) => Math.round(v + (cb[k] - v) * t));
  return { fill: `rgb(${c[0]},${c[1]},${c[2]})`, text: rate <= 42 || rate >= 91 ? "#FFFFFF" : "#151B24" };
}
const band = (rate: number): string => (rate >= 80 ? "strong, 80% and above" : rate >= 55 ? "moderate, 55 to 79%" : "at risk, below 55%");

const MIN_CELL = 74;
const HEAD_H = 46;
const CELL_H = 54;

/** A grid of rows and columns where each cell shows an approval rate and how many decisions stand behind it. Cells are buttons: Tab reaches them,
    Enter opens the cases. Color is never the only signal: a low cell carries a stripe and a down mark, a high cell an up mark, and the rate is printed. */
export function Heatmap(p: HeatmapProps) {
  const [ref, w] = useChartWidth(760);
  const id = useId();
  const minN = p.minN ?? 10;
  const LABEL_W = w < 560 ? 96 : 128;
  const cw = Math.max(MIN_CELL, (w - LABEL_W) / p.cols.length);
  const sw = Math.max(w, LABEL_W + cw * p.cols.length);
  const h = HEAD_H + p.rows.length * CELL_H + 2;
  const [hot, setHot] = useState<{ r: number; c: number } | null>(null);
  const chars = Math.max(8, Math.floor(cw / 6.4));
  const key = (e: KeyboardEvent, r: number, c: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      p.onCell?.(r, c);
    }
  };
  const cell = hot ? p.cells[hot.r][hot.c] : null;
  return (
    <ChartFrame id={id} summary={p.summary} table={p.table} hint={p.hint}>
      <div ref={ref} role="group" aria-label={p.ariaLabel} aria-describedby={summaryId(id)} className="w-full overflow-x-auto overflow-y-hidden pb-1">
      <div className="relative" style={{ height: h, width: sw }}>
        <svg width={sw} height={h} className="block select-none">
          <defs>
            <pattern id={`${id}-stripe`} patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="7" stroke="#7A2E1B" strokeWidth="1.6" opacity="0.28" />
            </pattern>
          </defs>
          {p.cols.map((c, ci) => {
            const lines = wrapLabel(c.label, chars, 3);
            const head = (
              <text x={LABEL_W + cw * ci + cw / 2} y={HEAD_H - 8 - (lines.length - 1) * 12} textAnchor="middle" fontSize="11.5" fill={CHART.text} fontWeight={600} fontFamily="inherit">
                {lines.map((l, i) => (
                  <tspan key={i} x={LABEL_W + cw * ci + cw / 2} dy={i === 0 ? 0 : 12}>
                    {l}
                  </tspan>
                ))}
              </text>
            );
            return p.onCol ? (
              <g key={c.key} role="button" tabIndex={0} aria-label={`${c.label}: open all cases`} onClick={() => p.onCol?.(ci)} onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? (e.preventDefault(), p.onCol?.(ci)) : undefined)} style={{ cursor: "pointer" }}>
                <rect x={LABEL_W + cw * ci} y="0" width={cw} height={HEAD_H} fill="transparent" />
                {head}
              </g>
            ) : (
              <g key={c.key}>{head}</g>
            );
          })}
          {p.rows.map((r, ri) => {
            const rowLabel = (
              <g>
                <text x="0" y={HEAD_H + ri * CELL_H + CELL_H / 2 - (r.sub ? 2 : -4)} fontSize="13" fill={CHART.ink} fontWeight={r.emphasis ? 700 : 500} fontFamily="inherit">
                  {r.label}
                </text>
                {r.sub ? (
                  <text x="0" y={HEAD_H + ri * CELL_H + CELL_H / 2 + 13} fontSize="11" fill={CHART.muted} fontFamily="inherit">
                    {r.sub}
                  </text>
                ) : null}
              </g>
            );
            return (
              <g key={r.key}>
                {p.onRow ? (
                  <g role="button" tabIndex={0} aria-label={`${r.label}: open analysis`} onClick={() => p.onRow?.(ri)} onKeyDown={(e) => (e.key === "Enter" || e.key === " " ? (e.preventDefault(), p.onRow?.(ri)) : undefined)} style={{ cursor: "pointer" }}>
                    <rect x="0" y={HEAD_H + ri * CELL_H} width={LABEL_W - 8} height={CELL_H - 4} fill="transparent" />
                    {rowLabel}
                  </g>
                ) : (
                  rowLabel
                )}
                {p.cols.map((c, ci) => {
                  const d = p.cells[ri][ci];
                  const few = d.n < minN;
                  const color = d.rate !== null && !few ? heatColor(d.rate) : null;
                  const x = LABEL_W + cw * ci + 2;
                  const y = HEAD_H + ri * CELL_H + 2;
                  const on = hot?.r === ri && hot.c === ci;
                  const name = `${p.cellName ? p.cellName(ri, ci) : `${r.label}, ${c.label}`}: ${d.rate === null ? "no decisions" : `${d.rate}% ${p.metric ?? "approved as requested"}${few ? ", few decisions" : `, ${band(d.rate)}`}`}, ${d.n} ${d.n === 1 ? "decision" : "decisions"}. Open the cases.`;
                  return (
                    <g
                      key={c.key}
                      role="button"
                      tabIndex={d.n > 0 ? 0 : -1}
                      aria-label={name}
                      onClick={() => d.n > 0 && p.onCell?.(ri, ci)}
                      onKeyDown={(e) => key(e, ri, ci)}
                      onPointerEnter={() => setHot({ r: ri, c: ci })}
                      onPointerLeave={() => setHot(null)}
                      onFocus={() => setHot({ r: ri, c: ci })}
                      onBlur={() => setHot(null)}
                      style={{ cursor: d.n > 0 && p.onCell ? "pointer" : "default" }}
                    >
                      <rect x={x} y={y} width={cw - 4} height={CELL_H - 4} rx="10" fill={color?.fill ?? "#F6F5F1"} stroke={on ? CHART.ink : few ? CHART.axis : "transparent"} strokeWidth={on ? 2 : 1} strokeDasharray={few && !on ? "3 3" : undefined} />
                      {d.rate !== null && !few && d.rate < 55 ? <rect x={x} y={y} width={cw - 4} height={CELL_H - 4} rx="10" fill={`url(#${id}-stripe)`} /> : null}
                      {d.n > 0 ? (
                        <>
                          <text x={x + (cw - 4) / 2} y={y + 24} textAnchor="middle" fontSize="16" fontWeight={700} fill={color?.text ?? CHART.muted} fontFamily="inherit">
                            {d.rate === null ? "-" : `${d.rate}%`}
                          </text>
                          <text x={x + (cw - 4) / 2} y={y + 40} textAnchor="middle" fontSize="11" fill={color?.text ?? CHART.muted} opacity={0.85} fontFamily="inherit">
                            {few ? `${d.n} (few)` : `${d.n.toLocaleString("en-US")} decisions`}
                          </text>
                          {d.rate !== null && !few && d.rate < 55 ? (
                            <text x={x + cw - 16} y={y + 14} fontSize="9" fill={color?.text} aria-hidden="true">
                              ▼
                            </text>
                          ) : null}
                          {d.rate !== null && !few && d.rate >= 80 ? (
                            <text x={x + cw - 16} y={y + 14} fontSize="9" fill={color?.text} aria-hidden="true">
                              ▲
                            </text>
                          ) : null}
                        </>
                      ) : (
                        <text x={x + (cw - 4) / 2} y={y + 31} textAnchor="middle" fontSize="12" fill={CHART.neutral} fontFamily="inherit">
                          none
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
        {hot && cell && cell.n > 0 ? (
          <Tooltip x={LABEL_W + cw * hot.c + cw / 2 - 14} y={HEAD_H + hot.r * CELL_H + CELL_H - 2} bound={sw} width={230}>
            <div className="font-semibold">{p.cellName ? p.cellName(hot.r, hot.c) : `${p.rows[hot.r].label}, ${p.cols[hot.c].label}`}</div>
            <div className="mt-0.5">
              <b>{cell.rate === null ? "-" : `${cell.rate}%`}</b> {p.metric ?? "approved as requested"}
            </div>
            <div className="text-muted">
              {cell.n} {cell.n === 1 ? "decision" : "decisions"}
              {cell.n < minN ? ". Small number: read with care." : ""}
            </div>
            {cell.detail ? <div className="mt-1 border-t border-line pt-1 text-muted">{cell.detail}</div> : null}
          </Tooltip>
        ) : null}
      </div>
      </div>
      <HeatLegend minN={minN} />
    </ChartFrame>
  );
}

/** The color scale, with the same three bands the approval chance uses. */
export function HeatLegend({ minN }: { minN: number }) {
  const stops = STOPS.map(([v], i) => `${heatColor(v).fill} ${(i / (STOPS.length - 1)) * 100}%`).join(", ");
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-ink2" aria-label="Color scale">
      <div className="flex items-center gap-2">
        <span>Approved as requested</span>
        <span aria-hidden="true" className="inline-block h-2.5 w-[132px] rounded-full" style={{ background: `linear-gradient(90deg, ${stops})` }} />
        <span className="tabular-nums text-muted">35% to 95%</span>
      </div>
      <span className="flex items-center gap-1.5">
        <i className="inline-block h-3 w-3 rounded-[3px]" style={{ background: heatColor(45).fill, backgroundImage: "repeating-linear-gradient(45deg, rgba(122,46,27,.3) 0 1.5px, transparent 1.5px 5px)" }} />
        Below 55%, striped ▼
      </span>
      <span className="flex items-center gap-1.5">
        <i className="inline-block h-3 w-3 rounded-[3px]" style={{ background: heatColor(86).fill }} />
        80% and above ▲
      </span>
      <span className="flex items-center gap-1.5">
        <i className="inline-block h-3 w-3 rounded-[3px] border border-dashed border-[#D9D6CF] bg-[#F6F5F1]" />
        Fewer than {minN} decisions
      </span>
    </div>
  );
}
