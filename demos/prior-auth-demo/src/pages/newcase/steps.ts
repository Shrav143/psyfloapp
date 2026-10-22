import type { CaseDraft } from "@/data/cases";

/** The five steps a person sees. The draft keeps three numbered steps (`step`): 0 holds Intake, Eligibility & Benefits and Clinical documentation
    (told apart by `phase`), 1 is Authorization preparation (the agents) and 2 is Review & submit. */
export type StepId = "intake" | "eligibility" | "documentation" | "preparation" | "review";
export const STEP_IDS: StepId[] = ["intake", "eligibility", "documentation", "preparation", "review"];
export const NEW_CASE_STEPS = ["Intake", "Eligibility & Benefits", "Clinical documentation", "Authorization preparation", "Review & submit"];

/** Step names from before the five steps, in links and notes: Referral became Intake, Medical records Clinical documentation, Agents work Authorization preparation, Review and sign Review & submit. */
const LEGACY: Record<string, StepId> = { referral: "intake", records: "documentation", agents: "preparation", review: "review", sign: "review" };
export function stepIdOf(value: string | null | undefined): StepId | null {
  if (!value) return null;
  const v = value.toLowerCase();
  return STEP_IDS.find((s) => s === v) ?? LEGACY[v] ?? null;
}

/** Which of the five the draft is on (0 to 4). */
export const stepIndex = (d: Pick<CaseDraft, "step" | "phase">): number => (d.step === 0 ? (d.phase === "intake" ? 0 : d.phase === "eligibility" ? 1 : 2) : d.step + 2);

/** What a click on step `i` of the stepper changes in the draft. */
export const stepPatch = (i: number): Pick<CaseDraft, "step" | "phase"> =>
  i === 0 ? { step: 0, phase: "intake" } : i === 1 ? { step: 0, phase: "eligibility" } : i === 2 ? { step: 0, phase: "records" } : { step: (i - 2) as 1 | 2, phase: "records" };

export const stepPatchOf = (id: StepId): Pick<CaseDraft, "step" | "phase"> => stepPatch(STEP_IDS.indexOf(id));
