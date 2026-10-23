/* The one place New case reaches into the Payers module's engine and store. Everything else in this folder imports from here, so the contract with the engine is one short file. */
import { useMemo } from "react";
import { approveAll, runWorkflow } from "@/data/workflow/engine";
import { matchWorkflow } from "@/data/workflow/match";
import type { PayerRule } from "@/data/workflow/types";
import { useStore } from "@/store";
import { selectPayerRules } from "@/store/workflows";
import type { WorkflowLibrary } from "./model";

export { approveAll, matchWorkflow, runWorkflow };
export { DEFAULT_NOTE, defaultWorkflowFor, isDefaultWorkflowId } from "@/data/workflow/default";

const NO_RULES: PayerRule[] = [];

/** The published workflows, their saved versions and the payer's rules, as the engine reads them. */
export function useWorkflowLibrary(payerId: string | null): WorkflowLibrary {
  const workflows = useStore((s) => s.workflows);
  const versions = useStore((s) => s.workflowVersions);
  const rules = useStore((s) => (payerId ? selectPayerRules(s, payerId) : NO_RULES));
  return useMemo(() => ({ workflows, versions, rules }), [workflows, versions, rules]);
}
