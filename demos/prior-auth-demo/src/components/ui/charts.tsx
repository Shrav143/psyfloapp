import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Donut with an optional center label. `parts` values are shares (they are normalized). */
export function Donut({ parts, size = 170, thickness = 26, center }: { parts: { value: number; color: string; label?: string }[]; size?: number; thickness?: number; center?: ReactNode }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let off = 0;
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {parts.map((p, i) => {
            const len = (c * p.value) / total;
            const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={thickness} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} />;
            off += len;
            return el;
          })}
        </g>
      </svg>
      {center ? <span className="absolute text-center">{center}</span> : null}
    </span>
  );
}

/** Horizontal bars with a label on the left and a value on the right. */
export function HBars({ rows, max = 100, labelWidth = 130, valueWidth = 46, className }: { rows: { label: string; value: number; color?: string; display?: string }[]; max?: number; labelWidth?: number; valueWidth?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3.5", className)}>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="truncate" style={{ width: labelWidth }}>{r.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F0ECE4]">
            <i className="block h-full rounded-full" style={{ width: `${Math.min(100, (r.value / max) * 100)}%`, background: r.color ?? "#2F6F5C" }} />
          </div>
          <b className="text-right" style={{ width: valueWidth }}>{r.display ?? `${r.value}%`}</b>
        </div>
      ))}
    </div>
  );
}

/** A funnel drawn as stacked bars that narrow, with the step-to-step rate. */
export function Funnel({ steps, color = "#1D4F43" }: { steps: { label: string; value: number }[]; color?: string }) {
  const top = steps[0]?.value || 1;
  return (
    <div className="flex flex-col gap-2.5">
      {steps.map((s, i) => (
        <div key={s.label} className="flex items-center gap-3">
          <span className="w-[120px] text-[13px] text-ink2">{s.label}</span>
          <div className="relative h-8 flex-1 rounded-lg bg-[#F5F0E8]">
            <div className="flex h-full items-center rounded-lg px-3 text-[13px] font-semibold text-white" style={{ width: `${Math.max(8, (s.value / top) * 100)}%`, background: color, opacity: 1 - i * 0.14 }}>
              {s.value}
            </div>
          </div>
          <span className="w-[52px] text-right text-xs text-muted">{i === 0 || !steps[i - 1].value ? "" : `${Math.round((s.value / steps[i - 1].value) * 100)}%`}</span>
        </div>
      ))}
    </div>
  );
}

/** Simple vertical columns with labels underneath. */
export function Columns({ data, height = 140, color = "#2F6F5C", highlight }: { data: { label: string; value: number }[]; height?: number; color?: string; highlight?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2.5" style={{ height: height + 28 }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-xs font-semibold">{d.value}</span>
          <div className="w-full rounded-t-md" style={{ height: Math.max(3, (d.value / max) * height), background: d.label === highlight ? "#1D4F43" : color, opacity: d.label === highlight ? 1 : 0.7 }} />
          <span className="text-[11px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Sparkline({ data, width = 120, height = 32, color = "#2F6F5C" }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - 3 - ((v - min) / (max - min || 1)) * (height - 6)}`).join(" ");
  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A two-line trend chart (used for symptom trends and similar). */
export function Lines({ series, labels, height = 130 }: { series: { name: string; color: string; data: number[] }[]; labels: string[]; height?: number }) {
  const w = 460;
  const all = series.flatMap((s) => s.data);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const x = (i: number) => 16 + (i / Math.max(1, labels.length - 1)) * (w - 32);
  const y = (v: number) => 10 + (1 - (v - min) / (max - min || 1)) * (height - 36);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img">
      {series.map((s) => (
        <g key={s.name}>
          <polyline points={s.data.map((v, i) => `${x(i)},${y(v)}`).join(" ")} fill="none" stroke={s.color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
          {s.data.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r={3.2} fill={s.color} />
          ))}
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={l} x={x(i)} y={height - 6} textAnchor="middle" fontSize="10.5" fill="#6E6A63">
          {l}
        </text>
      ))}
    </svg>
  );
}
