import { useSearchParams } from "react-router-dom";
import { ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { useStore } from "@/store";
import type { CaseEnv } from "./caseEnv";
import { intakeIssues } from "./caseIssues";
import { ExistingIntake } from "./ExistingIntake";
import { InitialIntake } from "./InitialIntake";
import { PayerChangeNote } from "./PayerChangeNote";
import { RetroIntake } from "./RetroIntake";
import { StepFooter } from "./StepFooter";
import { stepPatch } from "./steps";
import { useUnmetSync } from "./useUnmetSync";

/** Step 1, Intake. What it asks depends on the Authorization type: an initial authorization starts from a referral or a patient, a review, renewal or modification starts from a patient
    who exists, and a retroactive authorization starts from the care that was given. Nothing here stops the person from going on; what is missing is listed again on Review & submit. */
export function IntakeStep({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const [params] = useSearchParams();
  const save = useStore((s) => s.saveCaseDraft);
  const patch = useStore((s) => s.patchCaseDraft);
  const toast = useStore((s) => s.toast);
  useUnmetSync(draft);

  const showing = draft.kind === "initial" ? draft.started && !params.has("ref") : draft.kind === "retro" ? draft.started : !!draft.patientId;
  const open = intakeIssues(env).filter((i) => i.severity !== "note");
  const labels = open.map((i) => i.label.toLowerCase());
  const hint = open.some((i) => i.id === "duplicate")
    ? "A matching request exists. Open it, or continue with a reason."
    : labels.length
      ? `Still to add: ${labels.slice(0, 3).join(", ")}${labels.length > 3 ? ` and ${labels.length - 3} more` : ""}. You can go on; Review & submit lists what is missing.`
      : "Nothing is sent to the payer until a clinician signs.";

  const saveDraft = () => {
    save(draft.id);
    const id = useStore.getState().caseDrafts.find((d) => d.id === draft.id)?.caseId;
    toast({ title: "Draft saved", body: `${id ?? "The draft"} is in Case Manager. Pick it up whenever you like.`, tone: "good" });
  };

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
          hint={hint}
        />
      ) : null}
    </div>
  );
}
