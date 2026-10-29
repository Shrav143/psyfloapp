import { useMemo } from "react";
import type { RequestEvent } from "@/data/types";
import { useStore } from "@/store";
import type { LedgerRow } from "./ledgerRows";

/** The payer workflow a case follows, for the Case Manager: "Initial Authorization, Residential SUD v3", and what the workflow did on a case that is not a request yet (a review being prepared
    for it in New Authorization). A case that is a request has its lines in the request's History already. Null for a case with no workflow. */
export interface WorkflowLine {
  /** "Initial Authorization, Residential SUD, version 3", or the default's name. */
  text: string;
  usedDefault: boolean;
  /** History lines that were not written to a request. */
  events: RequestEvent[];
}

export function useWorkflowLine(row: Pick<LedgerRow, "id" | "caseId">): WorkflowLine | null {
  const drafts = useStore((s) => s.caseDrafts);
  return useMemo(() => {
    const mine = drafts
      .filter((d) => d.appliedWorkflow && (d.caseId === row.caseId || d.caseId === row.id || d.episodeId === `EP-${row.id}`))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const w = mine[0]?.appliedWorkflow;
    if (!w) return null;
    const events: RequestEvent[] = mine.flatMap((d) => (d.workflowLog ?? []).filter((e) => !e.posted).map((e): RequestEvent => ({ id: `wf-${d.id}-${e.key}`, at: e.at, actor: e.actor, text: e.text, detail: e.detail, done: true })));
    return { text: w.usedDefault ? w.name : `${w.name}, version ${w.version}`, usedDefault: w.usedDefault, events };
  }, [drafts, row.caseId, row.id]);
}
