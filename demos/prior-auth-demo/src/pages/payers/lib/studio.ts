import type { Workflow } from "@/data/workflow/types";
import { useStore } from "@/store";
import { workflowStorageStatus } from "@/store/workflows";

/* Where the payer pages read the Workflow Studio's data from: the workflows slice of the store. */

/** Every workflow record: published, archived, and drafts that have never been published. */
export const useAllWorkflows = (): Workflow[] => useStore((s) => s.workflows);

/** Where changes are kept, in a sentence for the foot of a page. */
export function savedWhere(): string {
  return workflowStorageStatus() === "saved in this browser" ? "Saved in this browser." : "Browser storage is blocked here, so changes last until you close the tab.";
}
