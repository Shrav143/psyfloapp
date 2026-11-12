import { cn } from "@/lib/cn";
import { band } from "@/lib/format";

type BarTone = "neutral" | "mid" | "good" | "risk";
const CURRENT: Record<BarTone, string> = { neutral: "#217A78", mid: "#A87A26", good: "#2E7D52", risk: "#B5553A" };

/** Four short bars under a stage chip. Done = green, current = dark green (ochre when waiting), later = grey. */
export function ProgressBars({ pos, tone = "neutral", count = 4, className }: { pos: number; tone?: BarTone; count?: number; className?: string }) {
  return (
    <div className={cn("mt-[7px] flex items-center gap-[3px]", className)} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className="block h-1.5 w-[30px] rounded-full" style={{ background: i < pos ? "#2E7D52" : i === pos ? (tone === "good" ? "#2E7D52" : CURRENT[tone]) : "#E6E3DD" }} />
      ))}
    </div>
  );
}

/** Thin percent bar. Color follows the approval-chance bands unless `color` is given. */
export function Meter({ value, color, className, height = 6 }: { value: number; color?: string; className?: string; height?: number }) {
  return (
    <div className={cn("overflow-hidden rounded-full bg-[#EBE9E4]", className)} style={{ height }}>
      <i className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color ?? band(value).color }} />
    </div>
  );
}

/** Approval chance: a bold colored number with a thin bar. Always pair with a range or band word nearby. */
export function Chance({ value, className }: { value: number; className?: string }) {
  const b = band(value);
  return (
    <div className={cn("w-[84px]", className)}>
      <div className="font-semibold" style={{ color: b.color }}>{Math.round(value)}%</div>
      <Meter value={value} className="mt-1" height={5} />
    </div>
  );
}

/** The ring used for the approval chance on the case page. */
export function Ring({ value, size = 72, stroke = 8, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const col = band(value).color;
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} role="img" aria-label={`${Math.round(value)} percent`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EBE9E4" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(c * value) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dasharray .5s ease" }} />
      </svg>
      <span className="absolute text-center font-semibold leading-none" style={{ color: col, fontSize: size * 0.28 }}>
        {Math.round(value)}%{label ? <span className="block pt-0.5 text-[10px] font-medium text-muted">{label}</span> : null}
      </span>
    </span>
  );
}
