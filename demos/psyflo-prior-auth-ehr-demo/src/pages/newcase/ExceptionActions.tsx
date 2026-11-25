import { Link } from "react-router-dom";
import { Button } from "@/components/ui";
import { planTypeOf, type CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { paths } from "@/routes";
import { useStore } from "@/store";
import type { CaseEnv } from "./caseEnv";
import { DocumentedReasonForm } from "./DocumentedReasonForm";
import { stepPatch } from "./steps";

/** What the person can do about the warnings of a check, one short action each. The warnings themselves are listed by the verification summary above;
    nothing here forces anything. Coverage that is confirmed inactive, or a check that could not run, can be gone past with a documented exception. */
export function ExceptionActions({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const patch = useStore((s) => s.patchCaseDraft);
  const rec = env.verification.record;
  if (!rec) return null;
  const ex = new Set(rec.exceptions);
  const moved = rec.row.payerChanged?.to;
  const hasAction = ex.has("payer_changed") || ex.has("member_id_mismatch") || ex.has("service_not_covered") || ex.has("service_unavailable") || ex.has("coverage_inactive");
  if (!hasAction) return null;

  return (
    <section aria-label="What you can do" className="flex flex-col gap-3 rounded-[20px] border border-edge bg-white px-5 py-4">
      <h3 className="font-serif text-[18px] font-semibold tracking-tight">What you can do</h3>
      <div className="flex flex-wrap gap-2">
        {ex.has("payer_changed") && moved ? (
          <Button size="sm" onClick={() => patch(draft.id, { payerId: moved, planType: planTypeOf(moved), verificationId: null })}>
            Switch this case to {payerById(moved)?.shortName ?? "the new plan"}
          </Button>
        ) : null}
        {ex.has("member_id_mismatch") ? <Button size="sm" onClick={() => patch(draft.id, stepPatch(0))}>Correct the member ID in Intake</Button> : null}
        {ex.has("service_not_covered") ? <Button size="sm" onClick={() => patch(draft.id, stepPatch(0))}>Change the level of care in Intake</Button> : null}
        {ex.has("service_unavailable") ? (
          <Link to={paths.settings()} className="inline-flex h-[34px] items-center rounded-[10px] border border-field bg-white px-3 text-[13px] font-semibold text-forest hover:bg-tile">
            Open Settings to resume Verify
          </Link>
        ) : null}
      </div>
      {ex.has("coverage_inactive") || ex.has("member_id_mismatch") ? (
        <DocumentedReasonForm draft={draft} kind="coverage" about={rec.exceptions.includes("coverage_inactive") ? "Coverage is not active for these dates" : "The plan did not match the member ID"} button="Continue with a documented exception" prompt="Why go on without confirmed coverage?" placeholder="For example: the member renewed on 10/22 and the plan has not updated yet" />
      ) : null}
      {ex.has("service_unavailable") ? (
        <DocumentedReasonForm draft={draft} kind="unavailable" about="The check could not run" button="Continue without a verification" prompt="Why go on without a verification?" placeholder="For example: Verify is paused for maintenance and coverage was confirmed by phone" />
      ) : null}
    </section>
  );
}
