import type { CaseDetail } from "@/data/caseDetail";
import type { CaseWork, LiveView } from "@/data/caseModel";

export type TabId = "actions" | "picture" | "criteria" | "risk" | "draft";
export const TABS: { id: TabId; label: string }[] = [
  { id: "actions", label: "Recommended actions" }, { id: "picture", label: "Clinical picture" }, { id: "criteria", label: "Payer criteria" }, { id: "risk", label: "Risk analysis" }, { id: "draft", label: "Draft" },
];

/** What every tab gets: the case, the user's work on it, and the numbers derived from both. */
export interface CaseCtx {
  detail: CaseDetail;
  work: CaseWork;
  key: string; // where this case's work is kept in the store
  chance: number; // approval chance now
  projected: number; // with every open action applied
  canSend: boolean;
  sendReason: string;
  sent: boolean; // already with the payer or decided: "Send to payer" is replaced by a disabled "Sent to payer"
  live: LiveView | null; // the Dashboard request's current stage, once it has left Preparing
  send: () => void;
  goTab: (tab: TabId, rec?: string) => void;
  focusRec: string | null;
}
