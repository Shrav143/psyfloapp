import { useMemo } from "react";
import type { AssessmentPlan } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { planFor } from "@/store/intakePlan";
import { useIntakeNow } from "./policyNow";

/** The assessment plan of a configured intake on the policy date (the post-transition demo environment unless switched to Today). Null before it is configured. */
export function usePlan(r: IntakeRecord): AssessmentPlan | null {
  const now = useIntakeNow();
  const c = r.config;
  const payer = r.payerId;
  return useMemo(() => planFor(r, now), [c?.programId, c?.purposeId, c?.population, c?.setting, c?.state, payer, now]); // eslint-disable-line react-hooks/exhaustive-deps
}
