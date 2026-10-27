import type { StateCreator } from "zustand";
import type { AppState } from "./index";

/* Intake: queue and referral (New Intake, extraction, triage). Section-specific actions on IntakeRecord go here; generic ones (fields, suggestions, tasks, audit) are in intake.ts. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IntakeReferralSlice {}

export const createIntakeReferralSlice: StateCreator<AppState, [], [], IntakeReferralSlice> = () => ({});
