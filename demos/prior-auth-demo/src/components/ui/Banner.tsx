import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Tone } from "@/data/types";

const TONE: Record<Tone, { box: string; icon: LucideIcon }> = {
  neutral: { box: "bg-neutral-bg text-neutral-ink", icon: Info },
  mid: { box: "bg-mid-bg text-mid-ink border border-mid-edge", icon: AlertTriangle },
  good: { box: "bg-good-bg text-good-ink", icon: CheckCircle2 },
  risk: { box: "bg-risk-bg text-risk-ink border border-risk-edge", icon: XCircle },
};

/** Neutral for information, ochre for caution, green for good news, terracotta for danger. */
export function Banner({ tone = "neutral", icon, title, children, action, className }: { tone?: Tone; icon?: LucideIcon; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const T = TONE[tone];
  const Icon = icon ?? T.icon;
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl px-[18px] py-3.5", T.box, className)}>
      <Icon size={18} className="ico mt-0.5" />
      <div className="min-w-0 flex-1 text-sm">
        {title ? <div className="font-semibold">{title}</div> : null}
        {children ? <div className={cn(title && "mt-0.5")}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
