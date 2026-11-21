import { useEffect } from "react";
import type { CaseDraft } from "@/data/cases";
import { useStore } from "@/store";
import { usePayerContext } from "./payerContext";

/** Payers can change while a draft sits in Case Manager. When a New Authorization step opens, or the payer's list or rules change under it,
    the count of what the case does not meet is made again, so the approval chance and the checks agree. */
export function useUnmetSync(draft: CaseDraft): void {
  const refresh = useStore((s) => s.refreshCaseUnmet);
  const { items, rules } = usePayerContext(draft);
  useEffect(() => refresh(draft.id), [draft.id, items, rules, refresh]);
}
