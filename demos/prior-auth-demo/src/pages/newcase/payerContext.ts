/* What the saved Payers configuration says about a case: the document list for its level of care and the payer's rules.
   New case reads it live, so an edit on Payers reaches every draft the next time its page draws. */
import { useMemo } from "react";
import type { CaseDraft } from "@/data/cases";
import type { DocItem, Rule } from "@/data/payerConfig";
import { useStore, type AppState } from "@/store";
import { selectPayerDocs, selectPayerRules } from "@/store/payerConfig";

/** `items` is null when the payer has no saved list yet (then the built-in list is used). */
export interface PayerContext {
  items: DocItem[] | null;
  rules: Rule[];
}
const NO_RULES: Rule[] = [];
type Key = Pick<CaseDraft, "payerId" | "program">;

export function payerContextOf(s: AppState, d: Key): PayerContext {
  if (!d.payerId || !s.payerConfig[d.payerId]) return { items: null, rules: NO_RULES };
  return { items: d.program ? selectPayerDocs(s, d.payerId, d.program) : null, rules: selectPayerRules(s, d.payerId) };
}

/** The same, for a component: it draws again when the payer's list or rules are saved. */
export function usePayerContext(d: Key): PayerContext {
  const items = useStore((s) => payerContextOf(s, d).items);
  const rules = useStore((s) => payerContextOf(s, d).rules);
  return useMemo(() => ({ items, rules }), [items, rules]);
}
