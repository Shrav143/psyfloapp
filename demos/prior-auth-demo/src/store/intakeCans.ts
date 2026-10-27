import type { StateCreator } from "zustand";
import type { AppState } from "./index";

/* Intake: CANS Lifetime, Level of Need, care pathway and referral coordination. Section-specific actions on IntakeRecord go here; generic ones (fields, suggestions, tasks, audit) are in intake.ts. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IntakeCansSlice {}

export const createIntakeCansSlice: StateCreator<AppState, [], [], IntakeCansSlice> = () => ({});
