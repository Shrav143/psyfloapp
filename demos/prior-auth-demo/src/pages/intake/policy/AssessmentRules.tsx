import { useState } from "react";
import { Chip, Label, Pill } from "@/components/ui";
import { moduleById } from "@/data/assess/modules";
import { reviewLine } from "@/data/assess/reviewLine";
import { RULES } from "@/data/assess/rules";
import { SOURCE_LABEL, VERIFICATION_LABEL, type AssessmentRule, type Verification } from "@/data/assess/types";
import type { Tone } from "@/data/types";
import { vaPlanOf } from "@/data/va/plans";

const TONE: Record<Verification, Tone> = { verified: "good", draft: "mid", unverified: "mid", demo: "neutral" };
const FIRST = 6;

const windowOf = (r: AssessmentRule): string => (r.from && r.to ? `${r.from} to ${r.to}` : r.from ? `Effective ${r.from}` : r.to ? `Through ${r.to}` : "In effect now");
const modulesOf = (r: AssessmentRule): string => {
  const names = r.modules.map((m) => m.label ?? moduleById(m.id).label);
  return names.length > 4 ? `${names.slice(0, 4).join(", ")} and ${names.length - 4} more` : names.join(", ");
};

/** The assessment configuration rows that match the drawer's filters. Every configured rule shows its source, version, effective date, verification status, last update and
    responsible reviewer (the client's Part 20), beside the DMAS rows above, so the drawer answers "where does this requirement come from, and who owns it". */
export function AssessmentRules({ rules }: { rules: AssessmentRule[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? rules : rules.slice(0, FIRST);
  return (
    <section aria-label="Assessment rules" className="mt-6" data-assess-rules>
      <div className="flex items-baseline justify-between gap-2">
        <Label>Assessment rules</Label>
        <span data-testid="assess-rule-count" className="text-[12px] text-muted">{rules.length} of {RULES.length} {RULES.length === 1 ? "row" : "rows"}</span>
      </div>
      {rules.length ? (
        <ul className="mt-2 space-y-2.5">
          {shown.map((r) => (
            <li key={r.id} data-assess-rule={r.id} className="rounded-2xl border border-edge bg-white px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold">{r.label}</span>
                <Pill tone={TONE[r.status]}>{VERIFICATION_LABEL[r.status]}</Pill>
                <Chip>{SOURCE_LABEL[r.source]}</Chip>
              </div>
              <p className="mt-1 text-[13px] text-ink2">Asks for {modulesOf(r)}.</p>
              <p className="mt-1 text-[12px] text-muted">{[windowOf(r), `version ${r.version}`, r.payers ? r.payers.map((p) => vaPlanOf(p)?.short ?? p).join(", ") : null].filter(Boolean).join(" · ")}</p>
              <p className="mt-0.5 text-[12px] text-muted" data-review-line>{reviewLine(r)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-muted">No assessment rule matches these filters.</p>
      )}
      {rules.length > FIRST ? (
        <button type="button" className="mt-2 text-[12px] font-semibold text-forest hover:underline" onClick={() => setAll((v) => !v)}>{all ? "Show fewer rules" : `Show ${rules.length - FIRST} more rules`}</button>
      ) : null}
    </section>
  );
}
