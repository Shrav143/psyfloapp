import { shortDay } from "@/lib/dates";
import type { PayerRule, StepOutcome, Verification, WorkflowStatus } from "@/data/workflow/types";
import type { Tone } from "@/data/types";

/** One tone per meaning, used the same way on every Studio screen. The word always comes with the color. */
export const VERIFICATION_TONE: Record<Verification, Tone> = { verified: "good", needs_review: "mid", unverified: "mid", superseded: "risk" };
export const STATUS_TONE: Record<WorkflowStatus, Tone> = { draft: "neutral", published: "good", archived: "neutral" };
export const STATUS_WORD: Record<WorkflowStatus, string> = { draft: "Draft", published: "Published", archived: "Archived" };
export const OUTCOME_TONE: Record<StepOutcome, Tone> = { done: "good", skipped: "neutral", failed: "risk", waiting: "mid", manual_review: "mid" };
export const OUTCOME_WORD: Record<StepOutcome, string> = { done: "Done", skipped: "Skipped", failed: "Failed", waiting: "Waiting", manual_review: "Manual review" };

/** "Oct 20, 2026 onward", "Oct 20, 2026 to Jan 1, 2027". */
export function datesOf(from: string, to?: string): string {
  return to ? `${shortDay(from, true)} to ${shortDay(to, true)}` : `From ${shortDay(from, true)}`;
}
export const ruleSource = (r: PayerRule): string => r.source.label;
