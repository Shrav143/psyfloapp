import type { CaseDraft } from "@/data/cases";
import type { Stage } from "@/data/workflow/types";

/** The five steps a person sees: Referral comes first, before Intake. The agents' run ("Authorization preparation") is the last section of Clinical documentation.
    The draft keeps three numbered steps (`step`): 0 holds Referral, Intake, Eligibility & Benefits and Clinical documentation (told apart by `phase`),
    1 is Clinical documentation with the agents started (the page opens on their section), 2 is Review & submit. */
export type StepId = "referral" | "intake" | "eligibility" | "documentation" | "review";
export const STEP_IDS: StepId[] = ["referral", "intake", "eligibility", "documentation", "review"];
export const NEW_CASE_STEPS = ["Referral", "Intake", "Eligibility & Benefits", "Clinical documentation", "Review & submit"];
/** The id of the agents' section, for links and scrolling. */
export const PREPARATION_ID = "preparation";

/** Step names from earlier rounds, in links and notes: Medical records became Clinical documentation, Agents work and Authorization preparation are the last section of
    Clinical documentation, Review and sign is Review & submit. */
const LEGACY: Record<string, StepId> = { records: "documentation", agents: "documentation", preparation: "documentation", sign: "review" };
export function stepIdOf(value: string | null | undefined): StepId | null {
  if (!value) return null;
  const v = value.toLowerCase();
  return STEP_IDS.find((s) => s === v) ?? LEGACY[v] ?? null;
}
/** The address names the agents' section (?step=preparation, or the older ?step=agents). */
export const opensPreparation = (value: string | null | undefined): boolean => !!value && ["preparation", "agents"].includes(value.toLowerCase());

/** Which of the five the draft is on (0 to 4). */
export const stepIndex = (d: Pick<CaseDraft, "step" | "phase">): number =>
  d.step === 2 ? 4 : d.step === 1 ? 3 : d.phase === "referral" ? 0 : d.phase === "intake" ? 1 : d.phase === "eligibility" ? 2 : 3;
export const stepIdAt = (d: Pick<CaseDraft, "step" | "phase">): StepId => STEP_IDS[stepIndex(d)];

const PATCH: Record<StepId, Pick<CaseDraft, "step" | "phase">> = {
  referral: { step: 0, phase: "referral" },
  intake: { step: 0, phase: "intake" },
  eligibility: { step: 0, phase: "eligibility" },
  documentation: { step: 0, phase: "records" },
  review: { step: 2, phase: "records" },
};
/** What a click on step `i` of the stepper changes in the draft. */
export const stepPatch = (i: number): Pick<CaseDraft, "step" | "phase"> => PATCH[STEP_IDS[i] ?? "intake"];
/** Clinical documentation, opened on the agents' section. */
export const preparationPatch: Pick<CaseDraft, "step" | "phase"> = { step: 1, phase: "records" };

export const stepPatchOf = (id: StepId): Pick<CaseDraft, "step" | "phase"> => PATCH[id];

/** The stage of the payer workflow engine (it keeps five) that the draft is at: Clinical documentation is the documentation stage until the agents start, then preparation. */
export const engineStage = (d: Pick<CaseDraft, "step" | "phase"> & { agentsStarted: boolean }): Stage => {
  const id = stepIdAt(d);
  return id === "referral" || id === "intake" ? "intake" : id === "eligibility" ? "eligibility" : id === "review" ? "review" : d.step === 1 || d.agentsStarted ? "preparation" : "documentation";
};
