import type { CaseDetail } from "@/data/caseDetail";
import type { CaseWork, LiveView } from "@/data/caseModel";

export type TabId = "actions" | "draft" | "criteria";
export const TABS: { id: TabId; label: string }[] = [
  { id: "actions", label: "Recommended actions" }, { id: "draft", label: "Clinical picture & draft" }, { id: "criteria", label: "Criteria & risk" },
];

/** Where an address lands: the tab, and the section to scroll to. The five old tab names still work: Clinical picture and Draft are one tab now,
    and so are Payer criteria and Risk analysis. */
export function tabOf(param: string | null): { tab: TabId; section: "picture" | "risk" | null } {
  if (param === "picture") return { tab: "draft", section: "picture" };
  if (param === "risk") return { tab: "criteria", section: "risk" };
  return { tab: TABS.some((t) => t.id === param) ? (param as TabId) : "actions", section: null };
}

/** What every tab gets: the case, the user's work on it, and the numbers derived from both. */
export interface CaseCtx {
  detail: CaseDetail;
  work: CaseWork;
  key: string; // where this case's work is kept in the store
  chance: number; // approval chance now
  projected: number; // with every open action applied
  canSend: boolean;
  /** Why Send to payer is off, in a few words, for its tooltip. */
  sendReason: string;
  sent: boolean; // already with the payer or decided: "Send to payer" is replaced by a disabled "Sent to payer"
  live: LiveView | null; // the Dashboard request's current stage, once it has left Preparing
  send: () => void;
  goTab: (tab: TabId, rec?: string) => void;
  focusRec: string | null;
}
