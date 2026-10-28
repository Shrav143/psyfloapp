import { create } from "zustand";
import { customToSummary } from "@/data/payerConfig";
import { syncCustomPayers } from "@/data/seed";
import { createAgentSettingsSlice, type AgentSettingsSlice } from "./agentSettings";
import { createCasesSlice, type CasesSlice } from "./cases";
import { createCoreSlice, resetCoreCounters, type CoreSlice } from "./core";
import { createDenialsSlice, type DenialsSlice } from "./denials";
import { createEligibilitySlice, type EligibilitySlice } from "./eligibility";
import { createIntakeSlice, policyNowOf, type IntakeSlice } from "./intake";
import { createIntakeCansSlice, type IntakeCansSlice } from "./intakeCans";
import { createIntakeCarePlanSlice, type IntakeCarePlanSlice } from "./intakeCarePlan";
import { createIntakeClinicalSlice, type IntakeClinicalSlice } from "./intakeClinical";
import { createIntakeInstrumentSlice, type IntakeInstrumentSlice } from "./intakeInstruments";
import { createIntakePlanSlice, type IntakePlanSlice } from "./intakePlan";
import { createIntakeProfileSlice, type IntakeProfileSlice } from "./intakeProfile";
import { createIntakeReferralSlice, type IntakeReferralSlice } from "./intakeReferral";
import { createIntakeReviewSlice, type IntakeReviewSlice } from "./intakeReview";
import { createManagerSlice, type ManagerSlice } from "./manager";
import { createPayerConfigSlice, initPayerConfigPersistence, type PayerConfigSlice } from "./payerConfig";
import { createQueueSlice, type QueueSlice } from "./queue";
import { createRipplesSlice, type RipplesSlice } from "./ripples";
import { createReferralsSlice, type ReferralsSlice } from "./referrals";
import { createSessionSlice, type SessionSlice } from "./session";
import { bindPolicyNow } from "@/data/assess/status";
import { initPersist } from "./persist";
import { createWorkflowsSlice, initWorkflowPersistence, type WorkflowsSlice } from "./workflows";

/** One store, built from slices. Each module owns its slice file. */
export type AppState = CoreSlice & QueueSlice & CasesSlice & EligibilitySlice & ReferralsSlice & DenialsSlice & PayerConfigSlice & ManagerSlice & AgentSettingsSlice & RipplesSlice & SessionSlice & WorkflowsSlice & IntakeSlice & IntakeReferralSlice & IntakeProfileSlice & IntakeClinicalSlice & IntakeCansSlice & IntakeReviewSlice & IntakePlanSlice & IntakeInstrumentSlice & IntakeCarePlanSlice;

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
  ...createIntakeSlice(...a),
  ...createIntakeReferralSlice(...a),
  ...createIntakeProfileSlice(...a),
  ...createIntakeClinicalSlice(...a),
  ...createIntakeCansSlice(...a),
  ...createIntakeReviewSlice(...a),
  ...createIntakePlanSlice(...a),
  ...createIntakeInstrumentSlice(...a),
  ...createIntakeCarePlanSlice(...a),
}));

/* The workflows and the rules library are saved in this browser (try/catch: storage can be blocked). What was saved is merged with the seeds and put back here, and every later change is written. */
initWorkflowPersistence(useStore);

/* The payers added, each payer's saved rules and documents and the edit log are saved in this browser too (guarded), so they match the workflows that were saved with them. */
initPayerConfigPersistence(useStore);

/* Intake records, New Authorization drafts and the plan readiness a person changed are saved in this browser too (guarded; storage can be blocked), merged over the seeds when the app starts. */
initPersist(useStore);

/* The status a record shows ignores modules whose rules start after the policy date, so it reads the same policy date the screens use. */
bindPolicyNow(() => policyNowOf(useStore.getState()));

/* Payers added on Payers join the shared payer list, so New Authorization, Eligibility and the queue offer them too. */
useStore.subscribe((s, prev) => {
  if (s.customPayers !== prev.customPayers) syncCustomPayers(s.customPayers.map(customToSummary));
});

/** Put every slice back to its seed data. Wired to Demo, Reset. */
export function resetDemo(): void {
  resetCoreCounters();
  useStore.setState(useStore.getInitialState(), true);
}
