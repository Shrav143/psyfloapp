import { useSearchParams } from "react-router-dom";
import { ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { useStore } from "@/store";
import type { CaseEnv } from "./caseEnv";
import { ExistingIntake } from "./ExistingIntake";
import { InitialIntake } from "./InitialIntake";
import { PayerChangeNote } from "./PayerChangeNote";
import { RetroIntake } from "./RetroIntake";
import { StepFooter } from "./StepFooter";
import { stepPatch } from "./steps";
import { useSaveDraft } from "./useSaveDraft";
import { foldWorkflow } from "./workflow/fold";
import { useUnmetSync } from "./useUnmetSync";

/** Step 1, Intake. An initial or retroactive authorization onboards the patient (an import, a referral, a known patient, or typed in); a review, renewal or modification
    starts from a patient who exists. Nothing here stops the person from going on; what is missing is listed on Review & submit. */
export function IntakeStep({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const [params] = useSearchParams();
  const patch = useStore((s) => s.patchCaseDraft);
  const saveDraft = useSaveDraft(draft.id);
  useUnmetSync(draft);

  const showing = draft.kind === "initial" ? !params.get("ref") : draft.kind === "retro" ? true : !!draft.patientId;

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5">
      <PayerChangeNote draft={draft} />
      {draft.kind === "initial" ? <InitialIntake draft={draft} env={env} /> : draft.kind === "retro" ? <RetroIntake draft={draft} env={env} /> : <ExistingIntake draft={draft} env={env} />}
      {showing ? (
        <StepFooter
          actions={
            <>
              <Button icon={Save} onClick={saveDraft}>
                Save as draft
              </Button>
              <Button variant="primary" trailing={ArrowRight} onClick={() => patch(draft.id, stepPatch(1))}>
                Continue to Eligibility &amp; Benefits
              </Button>
            </>
          }
          hint={foldWorkflow(null, env)}
        />
      ) : null}
    </div>
  );
}
