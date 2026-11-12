import { Card, CardBody, CardHeader } from "@/components/ui";
import { isRequired, specsFor } from "@/data/intake/fields";
import type { IntakeRecord } from "@/data/intake/types";
import { PROGRAM_NAME, VA_PLANS, vaPlanOf } from "@/data/va/plans";
import { FieldStateBadge, IntakeField } from "../shared/provenance";
import { RequiredPill } from "./bits";
import { hasPlanConflict } from "./coverageModel";
import { ctxOf, foldable, requiredProgress, reviewerOf } from "./model";
import { OptionalFields } from "./ProfileCards";

const PLAN_NAMES = VA_PLANS.map((p) => p.name);
const ORDER = ["medicaidId", "plan", "coverageType", "effective", "secondary", "otherCoverage"];

/** The coverage type is read from the plan, never typed: a Cardinal Care MCO or Virginia Medicaid fee-for-service. */
function CoverageTypeRow({ record }: { record: IntakeRecord }) {
  const plan = VA_PLANS.find((p) => p.name === record.coverage.plan?.value);
  const fv = record.coverage.coverageType;
  return (
    <div data-field="coverage.coverageType" className="border-b border-line py-3 last:border-b-0">
      <div className="text-[13px] font-semibold text-ink2">
        Coverage type<span className="ml-1 text-risk" aria-label="required">*</span>
      </div>
      {plan ? (
        <>
          <p className="mt-1 text-[14px]">{plan.coverage === "ffs" ? "Fee-for-service" : `${PROGRAM_NAME} managed care (MCO)`}</p>
          <p className="mt-1 text-[12px] text-muted">Follows the plan: {plan.name} is {plan.coverage === "ffs" ? "Virginia Medicaid fee-for-service" : `a ${PROGRAM_NAME} MCO`}.</p>
        </>
      ) : fv?.value ? (
        <>
          <p className="mt-1 text-[14px]">{fv.value}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted">
            <FieldStateBadge state={fv.state} />
            <span>Follows the plan once the plan is on file.</span>
          </div>
        </>
      ) : (
        <p className="mt-1 text-[14px] text-risk-ink">Missing. It follows the plan.</p>
      )}
    </div>
  );
}

/** While insurance records disagree, the plan is chosen in the conflict card, not here. */
function PlanInConflict() {
  return (
    <div data-field="coverage.plan" className="border-b border-line py-3 last:border-b-0">
      <div className="text-[13px] font-semibold text-ink2">
        Plan (MCO or fee-for-service)<span className="ml-1 text-risk" aria-label="required">*</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] text-risk-ink">Insurance records disagree. Choose the current plan first.</p>
        <button type="button" onClick={() => document.querySelector('[data-conflict="plan"]')?.scrollIntoView({ behavior: "smooth", block: "start" })} className="text-[12px] font-semibold text-forest hover:underline">Choose the plan</button>
      </div>
    </div>
  );
}

/** Coverage on file: member ID, plan (Virginia names only), coverage type, dates and other coverage. */
export function CoverageCard({ record }: { record: IntakeRecord }) {
  /* The plan comes before the coverage type, which is read from it. */
  const specs = specsFor("coverage").filter((s) => s.key !== "existingAuths").sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
  const p = requiredProgress(record, specs);
  const reviewer = reviewerOf(record.payerId);
  const plan = vaPlanOf(record.payerId ?? "");
  const conflict = hasPlanConflict(record);
  return (
    <Card data-card="coverage">
      <CardHeader title="Coverage on file" right={<RequiredPill {...p} />} />
      <CardBody className="py-2">
        {specs.filter((s) => !foldable(record, s)).map((s) =>
          s.key === "coverageType" ? (
            <CoverageTypeRow key={s.key} record={record} />
          ) : s.key === "plan" && conflict ? (
            <PlanInConflict key={s.key} />
          ) : (
            <IntakeField key={s.key} record={record} section="coverage" field={s.key} label={s.key === "plan" ? "Plan (MCO or fee-for-service)" : s.label} kind={s.key === "plan" ? "select" : s.kind} options={s.key === "plan" ? PLAN_NAMES : s.options} required={isRequired(s, ctxOf(record))} hint={s.hint} />
          ),
        )}
        <OptionalFields record={record} specs={specs.filter((s) => foldable(record, s))} />
        {reviewer ? (
          <p data-reviewer={record.payerId} className="mt-2 mb-2 rounded-xl bg-tile px-3 py-2 text-[12px] text-ink2">
            <span className="font-semibold">Who reviews authorizations for {plan?.short ?? "this plan"}:</span> {reviewer}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
