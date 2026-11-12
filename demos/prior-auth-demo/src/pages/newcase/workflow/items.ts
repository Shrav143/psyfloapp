import type { CaseEnv } from "../caseEnv";
import type { MissingItem } from "../missing";

/** What the payer workflow adds to "What is missing": one note, never a blocking item. The workflow informs and warns; only the conditions that already stop sending (no patient, payer, service or dates,
    coverage confirmed inactive with no documented exception, an unanswered duplicate, no clinician signature) do. */
export function workflowItems(env: CaseEnv): MissingItem[] {
  const w = env.workflow;
  if (!w || w.noAuth || w.warnings.length === 0) return [];
  const [first, ...rest] = w.warnings;
  return [{ id: "workflow", label: `Workflow: ${w.applied.name}`, text: `${first}${rest.length ? ` ${rest.length} more in the workflow's trace.` : ""}`, severity: "note" }];
}
