import type { CaseDraft } from "@/data/cases";
import type { CaseEnv } from "./caseEnv";
import { DuplicateWarning } from "./DuplicateWarning";
import { IntakeForm } from "./IntakeForm";
import { IntakeSources } from "./IntakeSources";

/** Intake for an initial authorization: patient onboarding. The ways in sit in one row at the top (an import or a known patient; the referral was chosen in the step before), then the form. */
export function InitialIntake({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  return (
    <div className="flex flex-col gap-4">
      <IntakeSources draft={draft} env={env} />
      <DuplicateWarning env={env} />
      <IntakeForm draft={draft} />
    </div>
  );
}
