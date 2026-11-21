import { useEffect } from "react";
import type { IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";

/** Age follows the date of birth, and the payer and coverage type follow the plan, however the field was changed (typed, a suggestion accepted,
    a conflict resolved). Both store actions do nothing when the record already agrees, so running them on every change is safe. */
export function useDerivedFields(r: IntakeRecord) {
  const syncAge = useStore((s) => s.syncIntakeAge);
  const syncPlan = useStore((s) => s.syncIntakePlan);
  const dob = r.profile.dob?.value;
  const plan = r.coverage.plan?.value;
  useEffect(() => {
    if (dob) syncAge(r.id);
  }, [r.id, dob, syncAge]);
  useEffect(() => {
    if (plan) syncPlan(r.id);
  }, [r.id, plan, syncPlan]);
}
