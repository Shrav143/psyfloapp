import type { CaseDraft } from "@/data/cases";
import type { Stage } from "@/data/workflow/types";

/** The four stages a person sees in New Authorization: Patient & Service, Coverage & Requirements, Clinical Documentation, Review & Submit. The agents' run ("Authorization preparation")
    is the last section of Clinical Documentation. The draft keeps three numbered steps (`step`): 0 holds the first three stages (told apart by `phase`), 1 is Clinical Documentation
    with the agents started (the page opens on their section), 2 is Review & Submit. */
export type StepId = "service" | "coverage" | "documentation" | "review";
export const STEP_IDS: StepId[] = ["service", "coverage", "documentation", "review"];
export const NEW_AUTH_STEPS = ["Patient & Service", "Coverage & Requirements", "Clinical Documentation", "Review & Submit"];
/** The id of the agents' section, for links and scrolling. */
export const PREPARATION_ID = "preparation";

/** Stage names from earlier rounds, in links and notes: Referral and Intake became Patient & Service (a referral lives in Referrals & Intake now), Eligibility & Benefits became Coverage & Requirements,
    Medical records became Clinical Documentation, Agents work and Authorization preparation are its last section, Review and sign is Review & Submit. */
const LEGACY: Record<string, StepId> = { referral: "service", intake: "service", patient: "service", eligibility: "coverage", records: "documentation", agents: "documentation", preparation: "documentation", sign: "review" };
export function stepIdOf(value: string | null | undefined): StepId | null {
  if (!value) return null;
  const v = value.toLowerCase();
  return STEP_IDS.find((s) => s === v) ?? LEGACY[v] ?? null;
}
/** The address names the agents' section (?step=preparation, or the older ?step=agents). */
export const opensPreparation = (value: string | null | undefined): boolean => !!value && ["preparation", "agents"].includes(value.toLowerCase());

/** A draft saved before round 10 may hold the old phase names. */
const PHASE_INDEX: Record<string, number> = { service: 0, referral: 0, intake: 0, coverage: 1, eligibility: 1, records: 2 };
/** Which of the four the draft is on (0 to 3). */
export const stepIndex = (d: Pick<CaseDraft, "step" | "phase">): number => (d.step === 2 ? 3 : d.step === 1 ? 2 : PHASE_INDEX[d.phase] ?? 0);
export const stepIdAt = (d: Pick<CaseDraft, "step" | "phase">): StepId => STEP_IDS[stepIndex(d)];

const PATCH: Record<StepId, Pick<CaseDraft, "step" | "phase">> = {
  service: { step: 0, phase: "service" },
  coverage: { step: 0, phase: "coverage" },
  documentation: { step: 0, phase: "records" },
  review: { step: 2, phase: "records" },
};
/** What a click on stage `i` of the stepper changes in the draft. */
export const stepPatch = (i: number): Pick<CaseDraft, "step" | "phase"> => PATCH[STEP_IDS[i] ?? "service"];
/** Clinical Documentation, opened on the agents' section. */
export const preparationPatch: Pick<CaseDraft, "step" | "phase"> = { step: 1, phase: "records" };

export const stepPatchOf = (id: StepId): Pick<CaseDraft, "step" | "phase"> => PATCH[id];

/** The stage of the payer workflow engine (it keeps five) that the draft is at: Clinical Documentation is the documentation stage until the agents start, then preparation. */
export const engineStage = (d: Pick<CaseDraft, "step" | "phase"> & { agentsStarted: boolean }): Stage => {
  const id = stepIdAt(d);
  return id === "service" ? "intake" : id === "coverage" ? "eligibility" : id === "review" ? "review" : d.step === 1 || d.agentsStarted ? "preparation" : "documentation";
};
