import { CORE_MODULES, moduleById } from "@/data/assess/modules";
import type { AssessmentPlan, ModuleId } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { planItems } from "../modules";

/** The modules a document can support: the core ones, then the assessment instruments of this intake's plan. */
export function moduleOptions(r: IntakeRecord, plan: AssessmentPlan | null): { id: ModuleId; label: string }[] {
  const core = CORE_MODULES.filter((id) => id !== "review-signoff").map((id) => ({ id, label: moduleById(id).label }));
  return [...core, ...planItems(r, plan).map((i) => ({ id: i.id, label: i.label }))];
}
