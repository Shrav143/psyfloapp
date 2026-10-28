import type { IntakeRecord, TriageStatus } from "../intake/types";
import type { Tone } from "../types";

/* The status a referral or intake shows. Four statuses follow the work (assessment, clinical review, care planning, ready for authorization); the
   others are decisions a person makes and are shown as set. */

export const STATUS_TONE: Record<TriageStatus, Tone> = {
  new: "mid", needs_info: "mid", ready_screening: "neutral", assessment: "neutral", clinical_review: "mid", care_planning: "neutral", ready_for_auth: "good",
  accepted: "good", redirected: "neutral", declined: "neutral", closed: "neutral",
};

/* "Accepted" is the person's decision to take the referral; once the intake is configured the status follows the work instead. */
const SET_BY_PERSON: TriageStatus[] = ["new", "needs_info", "redirected", "declined", "closed"];

/** The status to show. A configured intake follows its progress; an unconfigured one (and any new, needs-information, redirected, declined or closed referral) shows what a person set. */
export function effectiveStatus(r: IntakeRecord): TriageStatus {
  if (SET_BY_PERSON.includes(r.triage) || !r.config) return r.triage;
  const ins = r.instruments ?? {};
  const required = r.config.modules.filter((c) => c.state === "active" && c.level === "required").map((c) => c.id);
  const instrumentRequired = required.filter((id) => !["patient-referral", "insurance", "clinical-history", "safety", "social-functional", "clinical-notes", "review-signoff"].includes(id));
  const states: string[] = instrumentRequired.map((id) => ins[id]?.status ?? "not_started");
  const assessed: string = r.assessment.status;
  const allSigned = states.every((s) => s === "signed") && assessed === "signed";
  const allReviewable = states.every((s) => s === "signed" || s === "awaiting_review") && (assessed === "signed" || assessed === "awaiting_review");
  const started = assessed !== "not_started" || states.some((s) => s !== "not_started");
  if (r.carePlan?.status === "approved" && allSigned) return "ready_for_auth";
  if (allSigned) return "care_planning";
  if (allReviewable && started) return "clinical_review";
  if (started) return "assessment";
  return "ready_screening";
}

/** The statuses that are still a referral, not yet an intake in progress. */
export const REFERRAL_STATUSES: TriageStatus[] = ["new", "needs_info", "ready_screening"];
/** The statuses of work in progress. */
export const ACTIVE_STATUSES: TriageStatus[] = ["assessment", "clinical_review", "care_planning", "ready_for_auth"];
/** The statuses that end the intake's work. */
export const CLOSED_STATUSES: TriageStatus[] = ["accepted", "redirected", "declined", "closed"];
