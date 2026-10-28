import type { StateCreator } from "zustand";
import type { AppState } from "./index";

/* Care planning: the clinician's service selection, goals and approval, and the preparation of an authorization from the intake. The care planning
   engineer builds this slice; it is registered here so the store compiles. */

export interface IntakeCarePlanSlice {
  /** Placeholder until the care planning engineer adds the actions. */
  carePlanReady?: true;
}

export const createIntakeCarePlanSlice: StateCreator<AppState, [], [], IntakeCarePlanSlice> = () => ({});
