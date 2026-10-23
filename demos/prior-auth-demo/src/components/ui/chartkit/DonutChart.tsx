import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { CHART, ChartFrame, type ChartTableData } from "./core";

export interface DonutPart {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Draw the slice striped, so two slices differ without color. */
  hatch?: boolean;
  note?: string;
}
export interface DonutChartProps {
  parts: DonutPart[];
  size?: number;
  thickness?: number;
  center?: ReactNode;
  onPart?: (key: string) => void;
  summary: string;
  table: ChartTableData;
  ariaLabel: string;
  hint?: ReactNode;
}

const polar = (cx: number, cy: number, r: number, a: number): [number, number] => [cx + r * Math.cos(a - Math.PI / 2), cy + r * Math.sin(a - Math.PI / 2)];

/** A donut with a legend that lists every slice with its count and share. Slices and legend rows highlight together and both open the cases. */
export function DonutChart(p: DonutChartProps) {
  const id = useId();
  const size = p.size ?? 168;
  const t = p.thickness ?? 24;
  const total = p.parts.reduce((a, x) => a + x.value, 0) || 1;
  const r = (size - t) / 2 - 2;
  const c = size / 2;
  const [hot, setHot] = useState<string | null>(null);
  let angle = 0;
  const arcs = p.parts.map((part) => {
    const a0 = angle;
    const a1 = angle + (part.value / total) * Math.PI * 2;
    angle = a1;
    const full = part.value / total > 0.9999;
    const [x0, y0] = polar(c, c, r, a0);
    const [x1, y1] = polar(c, c, r, full ? a0 + Math.PI * 1.9999 : a1);
    const d = `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
    return { part, d };
  });
  return (
    <ChartFrame id={id} summary={p.summary} table={p.table} hint={p.hint}>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4" role="group" aria-label={p.ariaLabel}>
        <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} role="presentation">
            <defs>
              {p.parts.map((x) =>
                x.hatch ? (
                  <pattern key={x.key} id={`${id}-h-${x.key}`} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                    <rect width="6" height="6" fill={x.color} />
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#fff" strokeWidth="2.2" opacity="0.55" />
                  </pattern>
                ) : null,
              )}
            </defs>
            <circle cx={c} cy={c} r={r} fill="none" stroke={CHART.track} strokeWidth={t} />
            {arcs.map(({ part, d }) => (
              <path
                key={part.key}
                d={d}
                fill="none"
                stroke={part.hatch ? `url(#${id}-h-${part.key})` : part.color}
                strokeWidth={hot === part.key ? t + 4 : t}
                opacity={hot && hot !== part.key ? 0.5 : 1}
                onPointerEnter={() => setHot(part.key)}
                onPointerLeave={() => setHot(null)}
                onClick={() => p.onPart?.(part.key)}
                style={{ cursor: p.onPart ? "pointer" : "default" }}
              >
                <title>{`${part.label}: ${part.value} of ${total}`}</title>
              </path>
            ))}
          </svg>
          {p.center ? <span className="pointer-events-none absolute text-center">{p.center}</span> : null}
        </span>
        <ul className="m-0 flex min-w-[210px] flex-1 list-none flex-col gap-1 p-0">
          {p.parts.map((x) => {
            const body = (
              <>
                <svg width="14" height="14" aria-hidden="true" className="mt-0.5 shrink-0">
                  {x.hatch ? (
                    <>
                      <defs>
                        <pattern id={`${id}-l-${x.key}`} patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
                          <rect width="5" height="5" fill={x.color} />
                          <line x1="0" y1="0" x2="0" y2="5" stroke="#fff" strokeWidth="1.8" opacity="0.6" />
                        </pattern>
                      </defs>
                      <rect width="14" height="14" rx="3" fill={`url(#${id}-l-${x.key})`} />
                    </>
                  ) : (
                    <rect width="14" height="14" rx="3" fill={x.color} />
                  )}
                </svg>
                <span className="min-w-0 flex-1 text-left">
                  <b className="block text-[13px] font-semibold">{x.label}</b>
                  {x.note ? <span className="block text-[12px] text-muted">{x.note}</span> : null}
                </span>
                <span className="text-right text-[13px] tabular-nums">
                  <b>{x.value.toLocaleString("en-US")}</b>
                  <span className="ml-1.5 text-muted">{Math.round((x.value / total) * 100)}%</span>
                </span>
              </>
            );
            return (
              <li key={x.key} onPointerEnter={() => setHot(x.key)} onPointerLeave={() => setHot(null)}>
                {p.onPart ? (
                  <button type="button" onClick={() => p.onPart?.(x.key)} className={cn("flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 hover:bg-[#FBF8F3]", hot === x.key && "bg-[#FBF8F3]")}>
                    {body}
                  </button>
                ) : (
                  <div className="flex items-start gap-2.5 px-2.5 py-2">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </ChartFrame>
  );
}
