import { Label, Pill } from "@/components/ui";
import { VERIFICATION_LABEL, type AssessmentPlan, type Verification } from "@/data/assess/types";
import type { Tone } from "@/data/types";
import { dateWords } from "./model";

export const VERIFICATION_TONE: Record<Verification, Tone> = { verified: "good", draft: "mid", unverified: "mid", demo: "neutral" };

/** "Configured for: Virginia Medicaid, <plan>" with what that configuration rests on: the policy date, the plan version, the framework, who may complete
    the assessment and what signs it off. The status is the weakest of the required modules, so the band never looks more certain than its rows. */
export function PlanHeader({ plan, payerName, dateLabel }: { plan: AssessmentPlan; payerName: string | null; dateLabel: string }) {
  const fw = plan.framework;
  return (
    <section aria-label="Configuration" className="rounded-[20px] border border-edge bg-tile px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-serif text-[18px] font-semibold">Configured for: Virginia Medicaid, {payerName ?? "payer not selected"}</h3>
        <Pill tone={VERIFICATION_TONE[plan.status]}>Required modules: {VERIFICATION_LABEL[plan.status].toLowerCase()}</Pill>
      </div>
      <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 @min-[640px]:grid-cols-2">
        <Fact label="Policy date" value={dateLabel} />
        <Fact label="Plan version" value={`${plan.version}, effective ${dateWords(plan.effective)}`} />
        <Fact label="Assessment framework" value={fw ? `${fw.label}${fw.edition ? `, ${fw.edition}` : ""}` : "None required by the configuration"} />
        <Fact label="Who completes it" value={plan.credentials} />
        <Fact label="Review and sign-off" value={plan.signoff} className="@min-[640px]:col-span-2" />
      </dl>
    </section>
  );
}

function Fact({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt><Label>{label}</Label></dt>
      <dd className="mt-0.5 text-[13px] text-ink2">{value}</dd>
    </div>
  );
}
