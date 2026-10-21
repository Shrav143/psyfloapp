import { create } from "zustand";
import { createCasesSlice, type CasesSlice } from "./cases";
import { createCoreSlice, resetCoreCounters, type CoreSlice } from "./core";
import { createDenialsSlice, type DenialsSlice } from "./denials";
import { createEligibilitySlice, type EligibilitySlice } from "./eligibility";
import { createManagerSlice, type ManagerSlice } from "./manager";
import { createPayerConfigSlice, type PayerConfigSlice } from "./payerConfig";
import { createQueueSlice, type QueueSlice } from "./queue";
import { createReferralsSlice, type ReferralsSlice } from "./referrals";

/** One store, built from slices. Each module owns its slice file. */
export type AppState = CoreSlice & QueueSlice & CasesSlice & EligibilitySlice & ReferralsSlice & DenialsSlice & PayerConfigSlice & ManagerSlice;

export const useStore = create<AppState>()((...a) => ({
  ...createCoreSlice(...a),
  ...createQueueSlice(...a),
  ...createCasesSlice(...a),
  ...createEligibilitySlice(...a),
  ...createReferralsSlice(...a),
  ...createDenialsSlice(...a),
  ...createPayerConfigSlice(...a),
  ...createManagerSlice(...a),
}));

/** Put every slice back to its seed data. Wired to Demo, Reset. */
export function resetDemo(): void {
  resetCoreCounters();
  useStore.setState(useStore.getInitialState(), true);
}
