import { Pill } from "@/components/ui";
import { specsFor } from "@/data/intake/fields";
import type { IntakeRecord } from "@/data/intake/types";
import { useIntakeNow } from "../lib/policyNow";
import { SectionHead } from "../profile/bits";
import { ConflictCard } from "../profile/ConflictCard";
import { planCandidates } from "../profile/coverageModel";
import { CoverageCard } from "../profile/CoverageCard";
import { DeterminationsCard } from "../profile/Determinations";
import { EligibilityCard, useVerifyStatus } from "../profile/EligibilityCard";
import { ExistingAuthCard } from "../profile/ExistingAuthCard";
import { FollowUpsCard } from "../profile/FollowUps";
import { requiredProgress } from "../profile/model";
import { useDerivedFields } from "../profile/sync";

/** D. Insurance & eligibility: insurance records that disagree, the Identity & Eligibility Agent (Verify), the five separate determinations,
    coverage on file, existing authorizations and the follow-ups. Every payer answer is simulated and says so. */
export function CoverageSection({ record }: { record: IntakeRecord }) {
  useDerivedFields(record);
  const now = useIntakeNow();
  const status = useVerifyStatus(record);
  const p = requiredProgress(record, specsFor("coverage"));
  return (
    <div className="space-y-4">
      <SectionHead
        title="Insurance & eligibility"
        right={
          <>
            <Pill tone={p.done === p.total ? "good" : "mid"}>{p.done} of {p.total} required</Pill>
            <Pill tone={status.tone}>Eligibility: {status.word}</Pill>
          </>
        }
      />
      {/* A new set of disagreeing records starts with nothing chosen. */}
      <ConflictCard key={planCandidates(record).map((c) => `${c.payerId}:${c.from}`).join("|")} record={record} />
      <EligibilityCard record={record} now={now} />
      <DeterminationsCard record={record} now={now} />
      <CoverageCard record={record} />
      <ExistingAuthCard record={record} now={now} />
      <FollowUpsCard record={record} />
    </div>
  );
}
