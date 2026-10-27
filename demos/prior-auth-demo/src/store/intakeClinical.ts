import type { StateCreator } from "zustand";
import type { AppState } from "./index";

/* Intake: clinical assessment, AI Scribe and Voice Intake Assistant. Section-specific actions on IntakeRecord go here; generic ones (fields, suggestions, tasks, audit) are in intake.ts. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IntakeClinicalSlice {}

export const createIntakeClinicalSlice: StateCreator<AppState, [], [], IntakeClinicalSlice> = () => ({});
