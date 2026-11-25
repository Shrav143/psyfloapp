import type { CaseDraft } from "@/data/cases";
import type { Stage } from "@/data/workflow/types";

/** The four steps a person sees. The agents' run ("Authorization preparation") is the last section of Clinical documentation.
    The draft keeps three numbered steps (`step`): 0 holds Intake, Eligibility & Benefits and Clinical documentation (told apart by `phase`),
    1 is Clinical documentation with the agents started (the page opens on their section), 2 is Review & submit. */
export type StepId = "intake" | "eligibility" | "documentation" | "review";
export const STEP_IDS: StepId[] = ["intake", "eligibility", "documentation", "review"];
export const NEW_CASE_STEPS = ["Intake", "Eligibility & Benefits", "Clinical documentation", "Review & submit"];
/** The id of the agents' section, for links and scrolling. */
export const PREPARATION_ID = "preparation";

/** Step names from earlier rounds, in links and notes: Referral became Intake, Medical records Clinical documentation, Agents work and Authorization preparation are the last section of
    Clinical documentation, Review and sign is Review & submit. */
const LEGACY: Record<string, StepId> = { referral: "intake", records: "documentation", agents: "documentation", preparation: "documentation", review: "review", sign: "review" };
export function stepIdOf(value: string | null | undefined): StepId | null {
  if (!value) return null;
  const v = value.toLowerCase();
  return STEP_IDS.find((s) => s === v) ?? LEGACY[v] ?? null;
}
/** The address names the agents' section (?step=preparation, or the older ?step=agents). */
export const opensPreparation = (value: string | null | undefined): boolean => !!value && ["preparation", "agents"].includes(value.toLowerCase());

/** Which of the four the draft is on (0 to 3). */
export const stepIndex = (d: Pick<CaseDraft, "step" | "phase">): number => (d.step === 2 ? 3 : d.step === 1 ? 2 : d.phase === "intake" ? 0 : d.phase === "eligibility" ? 1 : 2);

/** What a click on step `i` of the stepper changes in the draft. */
export const stepPatch = (i: number): Pick<CaseDraft, "step" | "phase"> =>
  i === 0 ? { step: 0, phase: "intake" } : i === 1 ? { step: 0, phase: "eligibility" } : i === 2 ? { step: 0, phase: "records" } : { step: 2, phase: "records" };
/** Clinical documentation, opened on the agents' section. */
export const preparationPatch: Pick<CaseDraft, "step" | "phase"> = { step: 1, phase: "records" };

export const stepPatchOf = (id: StepId): Pick<CaseDraft, "step" | "phase"> => stepPatch(STEP_IDS.indexOf(id));

/** The stage of the payer workflow engine (it keeps five) that the draft is at: Clinical documentation is the documentation stage until the agents start, then preparation. */
export const engineStage = (d: Pick<CaseDraft, "step" | "phase"> & { agentsStarted: boolean }): Stage => {
  const i = stepIndex(d);
  return i === 0 ? "intake" : i === 1 ? "eligibility" : i === 3 ? "review" : d.step === 1 || d.agentsStarted ? "preparation" : "documentation";
};
