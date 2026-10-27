import { Ban, CircleAlert, CircleCheck, Clock3, Eye, MinusCircle, type LucideIcon } from "lucide-react";
import { Pill } from "@/components/ui";
import { CHECK_LABEL, READINESS_LABEL, type CheckStatus, type ReadinessStatus } from "@/data/intake/checklist";
import type { Tone } from "@/data/types";
import type { PolicyRule } from "@/data/va/policy";
import { SOURCES } from "@/data/va/policy";
import { cn } from "@/lib/cn";
import { ruleStatusLabel } from "./packet";

export const CHECK_TONE: Record<CheckStatus, Tone> = { complete: "good", missing: "mid", verify: "mid", na: "neutral", blocked: "risk", pending: "neutral" };
const CHECK_ICON: Record<CheckStatus, { icon: LucideIcon; cls: string }> = {
  complete: { icon: CircleCheck, cls: "text-good" },
  missing: { icon: CircleAlert, cls: "text-mid" },
  verify: { icon: Eye, cls: "text-mid" },
  na: { icon: MinusCircle, cls: "text-faint" },
  blocked: { icon: Ban, cls: "text-risk" },
  pending: { icon: Clock3, cls: "text-muted" },
};

export function CheckIcon({ status, className }: { status: CheckStatus; className?: string }) {
  const I = CHECK_ICON[status];
  return <I.icon size={16} className={cn("ico shrink-0", I.cls, className)} aria-hidden="true" />;
}
export function CheckPill({ status }: { status: CheckStatus }) {
  return <Pill tone={CHECK_TONE[status]}>{CHECK_LABEL[status]}</Pill>;
}

export const READINESS_TONE: Record<ReadinessStatus, Tone> = { not_needed: "neutral", not_ready: "mid", ready: "good", handed_off: "good" };
export function ReadinessPill({ status }: { status: ReadinessStatus }) {
  return <Pill tone={READINESS_TONE[status]} dot>{READINESS_LABEL[status]}</Pill>;
}

export function RuleStatusPill({ rule }: { rule: Pick<PolicyRule, "status"> }) {
  return <Pill tone={rule.status === "final" ? "good" : rule.status === "draft" ? "mid" : "neutral"}>{ruleStatusLabel(rule)}</Pill>;
}

/** A policy row's source, opening the official page in a new tab. Drafts without their own address point at the DMAS redesign page, where they are posted. */
export function SourceAnchor({ rule, className }: { rule: Pick<PolicyRule, "source">; className?: string }) {
  const src = SOURCES[rule.source];
  const url = src.url ?? SOURCES.redesignPage.url;
  return (
    <a href={url} target="_blank" rel="noreferrer noopener" className={cn("relative text-[12px] font-medium text-forest hover:underline", className)}>
      {src.title}
      {!src.url ? " (posted on the DMAS redesign page)" : ""}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
