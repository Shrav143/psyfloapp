import { useMemo } from "react";
import type { WorkflowStatus, WorkflowVersion } from "@/data/workflow/types";
import { useStore } from "@/store";

export interface VersionRow extends Pick<WorkflowVersion, "workflowId" | "version" | "savedAt" | "savedBy" | "reason" | "status"> {
  name: string;
}

/** The versions of a payer's workflows (every save, publish, archive and restore), newest first, and the action that restores one as a draft. */
export interface VersionsApi {
  rows: VersionRow[];
  workflows: { id: string; name: string; status: WorkflowStatus }[];
  restore: (workflowId: string, version: number) => void;
}

export function useVersionsApi(payerId: string): VersionsApi {
  const versions = useStore((s) => s.workflowVersions);
  const all = useStore((s) => s.workflows);
  return useMemo(() => {
    // Saves in the same demo minute keep the order they were made in, so a later entry in the store is the newer one.
    const mine = versions.filter((v) => v.meta.payerId === payerId);
    const order = new Map(mine.map((v, i) => [v, i]));
    const rows = [...mine]
      .sort((a, b) => b.savedAt - a.savedAt || (order.get(b) ?? 0) - (order.get(a) ?? 0))
      .map((v): VersionRow => ({ workflowId: v.workflowId, version: v.version, savedAt: v.savedAt, savedBy: v.savedBy, reason: v.reason, status: v.status, name: v.meta.name }));
    const workflows = all.filter((w) => w.payerId === payerId).map((w) => ({ id: w.id, name: w.name, status: w.status }));
    return {
      rows,
      workflows,
      // The store records the restore in the edit audit and says so in a toast.
      restore: (workflowId, version) => void useStore.getState().restoreWorkflowVersion(workflowId, version),
    };
  }, [versions, all, payerId]);
}
