import { STATUS_TONE } from "@/data/assess/status";
import type { FieldState } from "@/data/intake/types";
import type { Tone, Urgency } from "@/data/types";

/* Words and tones for the referral screens. Every tone has a word beside it. */

export const STATUS_TONE_REF = STATUS_TONE;
export const URGENCY_LABEL: Record<Urgency, string> = { routine: "Routine", urgent: "Urgent", emergent: "Emergent" };
export const URGENCY_TONE: Record<Urgency, Tone> = { routine: "neutral", urgent: "mid", emergent: "risk" };
export const URGENCY_OF_LABEL: Record<string, Urgency> = { Routine: "routine", Urgent: "urgent", Emergent: "emergent" };

/** The client's names for how a value got here. "Not collected" reads "Missing" in a referral. */
export const REFERRAL_STATE_LABEL: Record<FieldState, string> = {
  verified: "Verified", patient_reported: "Patient reported", document_extracted: "Extracted from document", ai_suggested: "AI suggested",
  not_collected: "Missing", not_applicable: "Not applicable", needs_confirmation: "Needs confirmation",
};
export const REFERRAL_STATE_TONE: Record<FieldState, Tone> = {
  verified: "good", patient_reported: "neutral", document_extracted: "neutral", ai_suggested: "mid", not_collected: "risk", not_applicable: "neutral", needs_confirmation: "mid",
};
