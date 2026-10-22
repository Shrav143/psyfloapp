/* The summary, the four checks, the validation rows and "What is missing" for one draft, in one pure function.
   Review & submit draws them; the stepper reads the same list, so its state for the last step always matches what the step says. */
import type { NarrativeSection } from "@/data/cases";
import { eligibilityIssues, intakeIssues } from "./caseIssues";
import type { CaseEnv } from "./caseEnv";
import { integrityChecks, type IntegrityCheck } from "./checks";
import type { RecAdd } from "./fromRequest";
import { missingItems, type MissingItem } from "./missing";
import { narrativeOf } from "./narrative";
import { validationRows, type ValidationRow } from "./ValidationSummary";

export interface ReviewModel {
  sections: NarrativeSection[];
  checks: IntegrityCheck[];
  rows: ValidationRow[];
  missing: MissingItem[];
  /** What stops a signature: the items marked "block". */
  blocking: MissingItem[];
}

export function reviewModel(env: CaseEnv, context: string[], adds: RecAdd[], rechecking = false): ReviewModel {
  const { draft, clock, ctx } = env;
  const sections = narrativeOf(draft, context, adds);
  const checks = integrityChecks(draft, sections, rechecking, { clock, ctx, verification: env.verification.record });
  const rows = validationRows(draft, clock, ctx);
  const missing = missingItems(rows, checks, [...intakeIssues(env), ...eligibilityIssues(env)]);
  return { sections, checks, rows, missing, blocking: missing.filter((m) => m.severity === "block") };
}
