import { useSearchParams } from "react-router-dom";
import type { CaseDraft } from "@/data/cases";
import { OutOfSite } from "@/components/layout/OutOfSite";
import { useScope } from "@/lib/scope";
import { useStore } from "@/store";
import { ReferralChecklist } from "@/pages/referrals/ReferralChecklist";
import type { CaseEnv } from "./caseEnv";
import { DuplicateWarning } from "./DuplicateWarning";
import { IntakeForm } from "./IntakeForm";
import { IntakeSources } from "./IntakeSources";

/** Intake for an initial authorization: patient onboarding. The ways in sit in one row at the top (an import, a referral, a known patient), then the form.
    ?ref=RF-2051 shows that referral's checklist instead, until it is continued into the case. */
export function InitialIntake({ draft, env }: { draft: CaseDraft; env: CaseEnv }) {
  const [params, setParams] = useSearchParams();
  const scope = useScope();
  const referrals = useStore((s) => s.referrals);
  const ref = params.get("ref");
  const reviewing = ref ? referrals.find((x) => x.id === ref) : undefined;

  if (ref && reviewing && !scope.has(reviewing.id)) return <OutOfSite id={reviewing.id} what="referral" />;
  if (reviewing) {
    return (
      <ReferralChecklist
        r={reviewing}
        draftId={draft.id}
        onReplace={() =>
          setParams((p) => {
            const next = new URLSearchParams(p);
            next.set("ref", "");
            return next;
          })
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <IntakeSources draft={draft} env={env} />
      <DuplicateWarning env={env} />
      <IntakeForm draft={draft} />
    </div>
  );
}
