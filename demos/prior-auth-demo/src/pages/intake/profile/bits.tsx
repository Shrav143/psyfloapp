import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Chip, Pill } from "@/components/ui";
import { POLICY_VERSIONS, SOURCES, type PolicyRule, type PolicyStatus } from "@/data/va/policy";

/** The section's own title row inside the middle column. */
export function SectionHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-[18px] font-semibold tracking-tight">{title}</h2>
      {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
    </div>
  );
}

/** "3 of 5 required" in a card header. */
export function RequiredPill({ done, total }: { done: number; total: number }) {
  if (!total) return <Chip>None required</Chip>;
  return <Pill tone={done === total ? "good" : "mid"}>{done} of {total} required</Pill>;
}

const RULE_STATUS: Record<PolicyStatus, { word: string; tone: "neutral" | "mid" }> = {
  final: { word: "Final", tone: "neutral" },
  draft: { word: "Draft", tone: "mid" },
  unresolved: { word: "Unresolved", tone: "mid" },
};
export function RuleStatus({ status }: { status: PolicyStatus }) {
  const s = RULE_STATUS[status];
  return <Pill tone={s.tone}>{s.word}</Pill>;
}

/** One policy rule: what it says, whether it is final, draft or unresolved, its version and its source. */
export function RuleRow({ rule }: { rule: PolicyRule }) {
  const src = SOURCES[rule.source];
  return (
    <li className="py-2" data-rule={rule.id}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[13px] font-semibold">{rule.label}</span>
        <RuleStatus status={rule.status} />
        {rule.timing ? <span className="text-[12px] text-muted">{rule.timing}</span> : null}
      </div>
      <p className="mt-0.5 text-[12px] text-ink2">{rule.detail}</p>
      <p className="mt-0.5 text-[12px] text-muted">
        {POLICY_VERSIONS[rule.version].label} ·{" "}
        {src.url ? (
          <a href={src.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-forest hover:underline">
            {src.title}
            <ExternalLink size={12} className="ico" aria-hidden="true" />
          </a>
        ) : (
          <span>Source: {src.title}</span>
        )}
      </p>
    </li>
  );
}
