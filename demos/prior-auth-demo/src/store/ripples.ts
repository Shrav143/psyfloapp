import type { StateCreator } from "zustand";
import { uid } from "@/lib/format";
import type { AppState } from "./index";

/* Effects that one module has on another. The module that causes the effect appends a line; the module that shows it reads the list.
   That keeps every slice owned by one module and still lets "accept a denial" show up in Case Manager and Analytics. */

export type AppealResult = "overturned" | "partly" | "upheld";

export interface AppealDecision { id: string; denialId: string; requestId?: string; payerId?: string; result: AppealResult; nextLevel?: string; at: number }
export interface DenialAccepted { id: string; denialId: string; requestId?: string; payerId?: string; at: number }
export interface Dismissal { id: string; requestId: string; reason: string; at: number }
export interface PayerChangeUpdate { id: string; changeId: string; payerId: string; draftIds: string[]; at: number }

export interface RipplesSlice {
  /** Authorizations: clinical context a person added to a request (Recommended actions). New case and the Draft tab fold it into the narrative. */
  clinicalContext: Record<string, string[]>;
  addClinicalContext: (requestId: string, text: string) => void;
  appealDecisions: AppealDecision[];
  deniesAccepted: DenialAccepted[];
  dismissals: Dismissal[];
  payerChangeUpdates: PayerChangeUpdate[];
  /** Denial Intelligence: the payer ruled on a filed appeal. */
  recordAppealDecision: (d: Omit<AppealDecision, "id" | "at">) => void;
  /** Denial Intelligence: the clinic accepted a denial. Case Manager starts a step-down plan; Analytics counts the accepted denial. */
  recordDenialAccepted: (d: Omit<DenialAccepted, "id" | "at">) => void;
  /** Authorizations: a recommendation was dismissed with a reason. Analytics reads the reasons. */
  recordDismissal: (d: Omit<Dismissal, "id" | "at">) => void;
  /** Payers: drafts were updated after a payer change. Case Manager marks those rows. */
  recordPayerChangeUpdate: (d: Omit<PayerChangeUpdate, "id" | "at">) => void;
}

export const createRipplesSlice: StateCreator<AppState, [], [], RipplesSlice> = (set, get) => ({
  clinicalContext: {},
  addClinicalContext: (requestId, text) => set((s) => ({ clinicalContext: { ...s.clinicalContext, [requestId]: [...(s.clinicalContext[requestId] ?? []), text] } })),
  appealDecisions: [],
  deniesAccepted: [],
  dismissals: [],
  payerChangeUpdates: [],
  recordAppealDecision: (d) => set((s) => ({ appealDecisions: [{ ...d, id: uid("ad"), at: get().clock }, ...s.appealDecisions] })),
  recordDenialAccepted: (d) => set((s) => ({ deniesAccepted: [{ ...d, id: uid("da"), at: get().clock }, ...s.deniesAccepted] })),
  recordDismissal: (d) => set((s) => ({ dismissals: [{ ...d, id: uid("dm"), at: get().clock }, ...s.dismissals] })),
  recordPayerChangeUpdate: (d) => set((s) => ({ payerChangeUpdates: [{ ...d, id: uid("pc"), at: get().clock }, ...s.payerChangeUpdates] })),
});
