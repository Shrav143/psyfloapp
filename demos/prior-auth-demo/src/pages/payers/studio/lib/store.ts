/* The one place the studio reads and writes the workflows store. If the store's names or shapes move, only this file changes. */
import { useMemo } from "react";
import { useStore } from "@/store";
import { selectPayerRules, workflowStorageStatus, type NewWorkflowMeta, type PublishResult, type WorkflowPatch } from "@/store/workflows";
import type { PayerRule, Workflow, WorkflowVersion } from "@/data/workflow/types";

export type { NewWorkflowMeta, PublishResult, WorkflowPatch };
export { workflowStorageStatus };

const RANK = { published: 0, draft: 1, archived: 2 } as const;

/** What a person works on: a draft of the next version when one exists, otherwise the saved record. */
const effective = (live: Workflow, drafts: Record<string, Workflow>): Workflow => drafts[live.id] ?? live;

/** A payer's workflows: published first, then drafts, then archived, each by name. A published workflow with a draft of its next version shows as that draft. */
export function usePayerWorkflows(payerId: string): Workflow[] {
  const live = useStore((s) => s.workflows);
  const drafts = useStore((s) => s.workflowDrafts);
  return useMemo(() => live.filter((w) => w.payerId === payerId).map((w) => effective(w, drafts)).sort((a, b) => RANK[a.status] - RANK[b.status] || a.name.localeCompare(b.name)), [live, drafts, payerId]);
}
/** The published workflows only, as New Authorization sees them. */
export function usePublishedWorkflows(payerId: string): Workflow[] {
  const live = useStore((s) => s.workflows);
  return useMemo(() => live.filter((w) => w.payerId === payerId && w.status === "published"), [live, payerId]);
}
export function useWorkflowById(id: string | undefined): Workflow | undefined {
  const live = useStore((s) => s.workflows);
  const drafts = useStore((s) => s.workflowDrafts);
  return useMemo(() => (id ? (drafts[id] ?? live.find((w) => w.id === id)) : undefined), [live, drafts, id]);
}
/** The workflow as the cases see it (the published record), whatever draft sits on top. */
export const useLiveWorkflow = (id: string | undefined): Workflow | undefined => useStore((s) => s.workflows.find((w) => w.id === id));

export function useVersions(id: string | undefined): WorkflowVersion[] {
  const all = useStore((s) => s.workflowVersions);
  return useMemo(() => all.filter((v) => v.workflowId === id).sort((a, b) => b.version - a.version || b.savedAt - a.savedAt), [all, id]);
}
/** The payer's rules library: the saved rules read through from Payers plus the ones the library owns. The selector is cached, so it is safe to subscribe to. */
export const usePayerRules = (payerId: string): PayerRule[] => useStore((s) => selectPayerRules(s, payerId));

/** Every write the studio makes. */
export const api = {
  create: (meta: NewWorkflowMeta, templateId?: string): string => useStore.getState().createWorkflow(meta, templateId),
  duplicate: (id: string): string | undefined => useStore.getState().duplicateWorkflow(id),
  saveDraft: (id: string, patch: WorkflowPatch, reason: string): boolean => useStore.getState().saveWorkflowDraft(id, patch, reason),
  publish: (id: string, reason: string): PublishResult => useStore.getState().publishWorkflow(id, reason),
  archive: (id: string, reason?: string): void => useStore.getState().archiveWorkflow(id, reason),
  restore: (id: string, version: number): string | undefined => useStore.getState().restoreWorkflowVersion(id, version),
  discardDraft: (id: string): boolean => useStore.getState().deleteDraft(id),
};
