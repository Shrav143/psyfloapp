import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/data/types";

export const TONE_PILL: Record<Tone, string> = {
  good: "bg-good-bg text-good-ink",
  mid: "bg-mid-bg text-mid-ink",
  risk: "bg-risk-bg text-risk-ink",
  neutral: "bg-neutral-bg text-neutral-ink",
};

/** A status chip. Always carries a word, never color alone. */
export function Pill({ tone = "neutral", dot, children, className }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-[11px] py-[3px] text-xs font-semibold", TONE_PILL[tone], className)}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

/** A plain neutral chip (level of care, tags). */
export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-block whitespace-nowrap rounded-full bg-neutral-bg px-2.5 py-[3px] text-xs font-semibold text-neutral-ink", className)}>{children}</span>;
}

/** Count bubble used in the sidebar and on tabs. */
export function Count({ children, className, on }: { children: ReactNode; className?: string; on?: boolean }) {
  return (
    <span className={cn("inline-grid h-[22px] min-w-[22px] place-items-center rounded-full px-1.5 text-xs font-semibold", on ? "bg-white/20 text-white" : "bg-[#E3E0DA] text-ink2", className)}>
      {children}
    </span>
  );
}
