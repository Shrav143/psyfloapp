import type { AssessmentPlan, FrameworkId } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";

/* The assessment framework an intake follows, from its configured plan on the policy date. Before the intake is configured there is no plan, so
   there is no framework to name: "Not configured" is its own value, never "None". */

export type FrameworkKey = FrameworkId | "unconfigured";
export const FRAMEWORK_KEYS: FrameworkKey[] = ["asam", "cans", "locus", "calocus", "none", "unconfigured"];
export const FRAMEWORK_LABEL: Record<FrameworkKey, string> = { asam: "ASAM", cans: "CANS", locus: "LOCUS", calocus: "CALOCUS-CASII", none: "None", unconfigured: "Not configured" };

export function frameworkOf(r: IntakeRecord, plan: AssessmentPlan | null): FrameworkKey {
  if (!r.config || !plan) return "unconfigured";
  return plan.framework?.id ?? "none";
}
