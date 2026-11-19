import { create } from "zustand";
import { customToSummary } from "@/data/payerConfig";
import { syncCustomPayers } from "@/data/seed";
import { createAgentSettingsSlice, type AgentSettingsSlice } from "./agentSettings";
import { createCasesSlice, type CasesSlice } from "./cases";
import { createCoreSlice, resetCoreCounters, type CoreSlice } from "./core";
import { createDenialsSlice, type DenialsSlice } from "./denials";
import { createEligibilitySlice, type EligibilitySlice } from "./eligibility";
import { createManagerSlice, type ManagerSlice } from "./manager";
import { createPayerConfigSlice, initPayerConfigPersistence, type PayerConfigSlice } from "./payerConfig";
import { createQueueSlice, type QueueSlice } from "./queue";
import { createRipplesSlice, type RipplesSlice } from "./ripples";
import { createReferralsSlice, type ReferralsSlice } from "./referrals";
import { createSessionSlice, type SessionSlice } from "./session";
import { createWorkflowsSlice, initWorkflowPersistence, type WorkflowsSlice } from "./workflows";

/** One store, built from slices. Each module owns its slice file. */
export type AppState = CoreSlice & QueueSlice & CasesSlice & EligibilitySlice & ReferralsSlice & DenialsSlice & PayerConfigSlice & ManagerSlice & AgentSettingsSlice & RipplesSlice & SessionSlice & WorkflowsSlice;

export const useStore = create<AppState>()((...a) => ({
  ...createCoreSlice(...a),
  ...createQueueSlice(...a),
  ...createCasesSlice(...a),
  ...createEligibilitySlice(...a),
  ...createReferralsSlice(...a),
  ...createDenialsSlice(...a),
  ...createPayerConfigSlice(...a),
  ...createManagerSlice(...a),
  ...createAgentSettingsSlice(...a),
  ...createRipplesSlice(...a),
  ...createSessionSlice(...a),
  ...createWorkflowsSlice(...a),
}));

/* The workflows and the rules library are saved in this browser (try/catch: storage can be blocked). What was saved is merged with the seeds and put back here, and every later change is written. */
initWorkflowPersistence(useStore);

/* The payers added, each payer's saved rules and documents and the edit log are saved in this browser too (guarded), so they match the workflows that were saved with them. */
initPayerConfigPersistence(useStore);

/* Payers added on Payers join the shared payer list, so New Case, Eligibility and the queue offer them too. */
useStore.subscribe((s, prev) => {
  if (s.customPayers !== prev.customPayers) syncCustomPayers(s.customPayers.map(customToSummary));
});

/** Put every slice back to its seed data. Wired to Demo, Reset. */
export function resetDemo(): void {
  resetCoreCounters();
  useStore.setState(useStore.getInitialState(), true);
}
