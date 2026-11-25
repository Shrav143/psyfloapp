import { ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { useStore } from "@/store";
import type { CaseEnv } from "./caseEnv";
import { PayerChangeNote } from "./PayerChangeNote";
import { EpisodeSection } from "./service/EpisodeSection";
import { PersonSection } from "./service/PersonSection";
import { ServiceSection } from "./service/ServiceSection";
import { StepFooter } from "./StepFooter";
import { stepPatchOf } from "./steps";
import { useSaveDraft } from "./useSaveDraft";
import { useUnmetSync } from "./useUnmetSync";
import { foldWorkflow } from "./workflow/fold";

/** Stage 1, Patient & Service: who the request is for (read from the shared record), the treatment episode, the service the clinician selected, the request type and the dates.
    Nothing known is asked again. Nothing here stops the person from going on; what is missing is listed on Review & Submit. */
export function ServiceStep({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const patch = useStore((s) => s.patchCaseDraft);
  const saveDraft = useSaveDraft(draft.id);
  useUnmetSync(draft);
  const hasPerson = !!draft.intakeId || !!env.patient || !!draft.patient.initials.trim() || draft.patient.age !== null;

  return (
    <div className="mx-auto flex w-full max-w-[960px] flex-col gap-5">
      <PayerChangeNote draft={draft} />
      <PersonSection draft={draft} env={env} />
      {hasPerson ? (
        <>
          <EpisodeSection env={env} />
          <ServiceSection draft={draft} />
          <StepFooter
            actions={
              <>
                <Button icon={Save} onClick={saveDraft}>Save as draft</Button>
                <Button variant="primary" trailing={ArrowRight} onClick={() => patch(draft.id, stepPatchOf("coverage"))}>Continue to Coverage &amp; Requirements</Button>
              </>
            }
            hint={foldWorkflow(null, env)}
          />
        </>
      ) : null}
    </div>
  );
}
