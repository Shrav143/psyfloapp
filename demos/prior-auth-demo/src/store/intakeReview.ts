import type { StateCreator } from "zustand";
import type { AppState } from "./index";

/* Intake: documentation & review, readiness, handoff, AI Assistant orchestration and the July 2027 transition view. Section-specific actions on IntakeRecord go here; generic ones (fields, suggestions, tasks, audit) are in intake.ts. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IntakeReviewSlice {}

export const createIntakeReviewSlice: StateCreator<AppState, [], [], IntakeReviewSlice> = () => ({});
