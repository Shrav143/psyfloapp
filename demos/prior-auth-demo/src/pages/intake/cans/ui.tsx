import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Pill } from "@/components/ui";
import { SOURCES, type PolicyRule, type PolicyStatus, type SourceId } from "@/data/va/policy";
import type { Tone } from "@/data/types";
import { cn } from "@/lib/cn";

/* Small pieces shared by the CANS, Level of Need and pathway screens. */

export const POLICY_STATUS_LABEL: Record<PolicyStatus, string> = { final: "Final", draft: "Draft policy", unresolved: "Unresolved" };
const POLICY_STATUS_TONE: Record<PolicyStatus, Tone> = { final: "good", draft: "mid", unresolved: "mid" };

export function PolicyStatusPill({ status }: { status: PolicyStatus }) {
  return <Pill tone={POLICY_STATUS_TONE[status]}>{POLICY_STATUS_LABEL[status]}</Pill>;
}

/** A source from SOURCES, as a link when it has an official address. */
export function SourceCite({ id, className }: { id: SourceId; className?: string }) {
  const s = SOURCES[id];
  const text = `Source: ${s.title}`;
  if (!s.url) return <span className={cn("text-[12px] text-muted", className)}>{text}</span>;
  return (
    <a href={s.url} target="_blank" rel="noreferrer" className={cn("inline-flex items-start gap-1 text-[12px] font-medium text-forest hover:underline", className)}>
      <span>{text}</span>
      <ExternalLink size={12} className="ico mt-0.5 shrink-0" aria-hidden="true" />
    </a>
  );
}

/** One policy rule: its label, status (final, draft, unresolved), what it says and where it comes from. */
export function RuleNote({ rule, className }: { rule: PolicyRule; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-line bg-tile px-3.5 py-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-ink">{rule.label}</span>
        <PolicyStatusPill status={rule.status} />
      </div>
      <p className="mt-1 text-[13px] text-ink2">{rule.detail}</p>
      <SourceCite id={rule.source} className="mt-1.5" />
    </div>
  );
}

/** Label and value pairs in two columns that drop to one at narrow widths. */
export function Facts({ items, className }: { items: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-1 gap-x-5 gap-y-2.5 sm:grid-cols-2", className)}>
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[12px] text-muted">{k}</dt>
          <dd className="text-[13px] font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A native select styled like the kit's fields (used where a short list of plain options is enough). */
export function Select({ value, onChange, options, label, className, disabled }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string; className?: string; disabled?: boolean }) {
  return (
    <select aria-label={label} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={cn("h-[38px] w-full min-w-0 rounded-xl border border-field bg-white px-3 text-[14px] text-ink disabled:bg-tile disabled:text-muted", className)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
