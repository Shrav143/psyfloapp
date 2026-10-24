import { useStore } from "@/store";

/** Save as draft: the case gets its ID and shows in Case Manager. */
export function useSaveDraft(draftId: string): () => void {
  const save = useStore((s) => s.saveCaseDraft);
  const toast = useStore((s) => s.toast);
  return () => {
    save(draftId);
    const id = useStore.getState().caseDrafts.find((d) => d.id === draftId)?.caseId;
    toast({ title: "Draft saved", body: `${id ?? "The draft"} is in Authorizations.`, tone: "good" });
  };
}
