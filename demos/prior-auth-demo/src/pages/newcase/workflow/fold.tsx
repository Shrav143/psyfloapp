import type { ReactNode } from "react";
import type { CaseEnv } from "../caseEnv";

/** A step keeps its one alert. When the payer workflow has a warning of its own ("Submission window: 1 business day left, rule unverified"), it is added to that step's own line instead of becoming a second one. */
export function foldWorkflow(hint: ReactNode, env: CaseEnv): ReactNode {
  const warning = env.workflow?.warnings[0];
  if (!warning || env.workflow?.noAuth) return hint;
  return (
    <>
      {hint} <span className="font-medium text-mid-ink">Workflow: {warning}</span>
    </>
  );
}
