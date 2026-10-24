import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/data/types";

const TONE: Record<Tone, string> = {
  good: "bg-good-bg text-good-ink border-good-edge",
  mid: "bg-mid-bg text-mid-ink border-mid-edge",
  risk: "bg-risk-bg text-risk-ink border-risk-edge",
  neutral: "bg-neutral-bg text-neutral-ink border-neutral-edge",
};

/** Tinted stat tile. Optional icon, big value, uppercase label, one muted line. Pass onClick to make it a filter. */
export function Stat({ tone = "neutral", icon: Icon, value, label, sub, onClick, selected, className }: { tone?: Tone; icon?: LucideIcon; value: ReactNode; label: string; sub?: ReactNode; onClick?: () => void; selected?: boolean; className?: string }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      aria-pressed={onClick ? !!selected : undefined}
      className={cn("flex flex-col items-center gap-0.5 rounded-2xl border px-3 py-3 text-center", TONE[tone], onClick && "transition-transform hover:-translate-y-0.5", selected && "outline-2 outline-offset-[3px] outline-forest", className)}
    >
      {Icon ? (
        <span className="mb-0.5 grid h-7 w-7 place-items-center rounded-full bg-white/70">
          <Icon size={16} className="ico" />
        </span>
      ) : null}
      <div className="text-[18px] font-semibold leading-[1.1] tracking-tight">{value}</div>
      <div className="text-[11px] font-medium uppercase tracking-[0.1em]">{label}</div>
      {sub ? <div className="mt-0.5 text-[12px] opacity-85">{sub}</div> : null}
    </Tag>
  );
}
