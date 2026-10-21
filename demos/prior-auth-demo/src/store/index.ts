import { create } from "zustand";
import { customToSummary } from "@/data/payerConfig";
import { syncCustomPayers } from "@/data/seed";
import { createAgentSettingsSlice, type AgentSettingsSlice } from "./agentSettings";
import { createCasesSlice, type CasesSlice } from "./cases";
import { createCoreSlice, resetCoreCounters, type CoreSlice } from "./core";
import { createDenialsSlice, type DenialsSlice } from "./denials";
import { createEligibilitySlice, type EligibilitySlice } from "./eligibility";
import { createManagerSlice, type ManagerSlice } from "./manager";
import { createPayerConfigSlice, type PayerConfigSlice } from "./payerConfig";
import { createQueueSlice, type QueueSlice } from "./queue";
import { createRipplesSlice, type RipplesSlice } from "./ripples";
import { createReferralsSlice, type ReferralsSlice } from "./referrals";

/** One store, built from slices. Each module owns its slice file. */
export type AppState = CoreSlice & QueueSlice & CasesSlice & EligibilitySlice & ReferralsSlice & DenialsSlice & PayerConfigSlice & ManagerSlice & AgentSettingsSlice & RipplesSlice;

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
}));

/* Payers added on Payers join the shared payer list, so New case, Eligibility and the queue offer them too. */
useStore.subscribe((s, prev) => {
  if (s.customPayers !== prev.customPayers) syncCustomPayers(s.customPayers.map(customToSummary));
});

/** Put every slice back to its seed data. Wired to Demo, Reset. */
export function resetDemo(): void {
  resetCoreCounters();
  useStore.setState(useStore.getInitialState(), true);
}
