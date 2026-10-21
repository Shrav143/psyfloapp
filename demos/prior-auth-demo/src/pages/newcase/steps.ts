import type { CaseDraft } from "@/data/cases";

/** The four steps a person sees. The draft keeps three numbered steps; the first of them holds the referral and the medical records. */
export const NEW_CASE_STEPS = ["Referral", "Medical records", "Agents work", "Review and sign"];

/** Which of the four the draft is on. */
export const stepIndex = (d: Pick<CaseDraft, "step" | "phase">): number => (d.step === 0 ? (d.phase === "referral" ? 0 : 1) : d.step + 1);

/** What a click on step `i` of the stepper changes in the draft. */
export const stepPatch = (i: number): Pick<CaseDraft, "step" | "phase"> =>
  i === 0 ? { step: 0, phase: "referral" } : i === 1 ? { step: 0, phase: "records" } : { step: (i - 1) as 1 | 2, phase: "records" };
