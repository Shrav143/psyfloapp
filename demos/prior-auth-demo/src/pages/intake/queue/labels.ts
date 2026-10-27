import type { ClinicalAssessment, TriageStatus } from "@/data/intake/types";
import type { Tone, Urgency } from "@/data/types";

/* Words and tones the queue and the referral section share. Every tone has a word beside it on screen. */

export const TRIAGE_TONE_Q: Record<TriageStatus, Tone> = {
  new: "mid", needs_info: "mid", ready_screening: "neutral", clinical_review: "risk", accepted: "good", redirected: "neutral", declined: "neutral", closed: "neutral",
};

export const ASSESSMENT_LABEL: Record<ClinicalAssessment["status"], string> = {
  not_started: "Not started", in_progress: "In progress", awaiting_review: "Awaiting review", signed: "Signed",
};
export const ASSESSMENT_TONE: Record<ClinicalAssessment["status"], Tone> = { not_started: "neutral", in_progress: "mid", awaiting_review: "mid", signed: "good" };

export const URGENCY_LABEL: Record<Urgency, string> = { routine: "Routine", urgent: "Urgent", emergent: "Emergent" };
export const URGENCY_TONE: Record<Urgency, Tone> = { routine: "neutral", urgent: "mid", emergent: "risk" };
export const URGENCY_RANK: Record<Urgency, number> = { emergent: 0, urgent: 1, routine: 2 };

/** Triage outcomes that end the intake here. */
export const CLOSED_TRIAGE: TriageStatus[] = ["declined", "closed", "redirected"];
