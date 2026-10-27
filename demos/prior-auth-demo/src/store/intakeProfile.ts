import type { StateCreator } from "zustand";
import type { AppState } from "./index";

/* Intake: patient profile and insurance & eligibility. Section-specific actions on IntakeRecord go here; generic ones (fields, suggestions, tasks, audit) are in intake.ts. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IntakeProfileSlice {}

export const createIntakeProfileSlice: StateCreator<AppState, [], [], IntakeProfileSlice> = () => ({});
