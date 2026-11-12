import type { IntakeRecord, TriageStatus } from "../intake/types";
import type { BuiltInPayerId, Tone } from "../types";
import { REDESIGN_START } from "../va/policy";
import { buildAssessmentPlan } from "./plan";

/* The status a referral or intake shows. Four statuses follow the work (assessment, clinical review, care planning, ready for authorization); the
   others are decisions a person makes and are shown as set. */

export const STATUS_TONE: Record<TriageStatus, Tone> = {
  new: "mid", needs_info: "mid", ready_screening: "neutral", assessment: "neutral", clinical_review: "mid", care_planning: "neutral", ready_for_auth: "good",
  accepted: "good", redirected: "neutral", declined: "neutral", closed: "neutral",
};

/* "Accepted" is the person's decision to take the referral; once the intake is configured the status follows the work instead. */
const SET_BY_PERSON: TriageStatus[] = ["new", "needs_info", "redirected", "declined", "closed"];

/* The policy date the app is using ("now" for rules). The store binds it; until then it is the post-transition demo date, the app's default. */
let policyNow: () => number = () => REDESIGN_START;
export function bindPolicyNow(fn: () => number): void {
  policyNow = fn;
}

/** The overall sign-off is the signature on this core module's instance (see signOffAssessment in pages/intake/workspace/actions.ts). */
const OVERALL_SIGNOFF = "review-signoff";

/* A module whose rules start after the policy date is preparation only: it never holds up the status, as it never holds up readiness. */
const prepCache = new WeakMap<object, { key: string; ids: Set<string> }>();
function preparationIds(r: IntakeRecord, now: number): Set<string> {
  const c = r.config;
  if (!c) return new Set();
  const key = `${now}|${c.programId}|${c.purposeId}|${c.population}|${c.setting}|${c.state}|${r.payerId}`;
  const hit = prepCache.get(c);
  if (hit && hit.key === key) return hit.ids;
  const plan = buildAssessmentPlan({ programId: c.programId, purposeId: c.purposeId, population: c.population, setting: c.setting, state: c.state, payerId: (r.payerId as BuiltInPayerId | null) ?? null, policyDate: now });
  const ids = new Set<string>(plan.modules.filter((m) => m.preparation).map((m) => m.id));
  prepCache.set(c, { key, ids });
  return ids;
}

/** The overall sign-off: whether the plan asks for it (the core "Review & sign-off" module is required and in use; an override can remove it, as for any required module)
    and whether a clinician has signed it. `done` is true when it is signed or not asked for. One definition for the status, the readiness gate and the next step. */
export function overallSignoff(r: IntakeRecord, now: number = policyNow()): { required: boolean; signed: boolean; done: boolean } {
  const required = !!r.config?.modules.some((c) => c.id === OVERALL_SIGNOFF && c.state === "active" && c.level === "required" && !preparationIds(r, now).has(c.id));
  const signed = r.instruments?.[OVERALL_SIGNOFF]?.status === "signed";
  return { required, signed, done: !required || signed };
}

/** The status to show. A configured intake follows its progress; an unconfigured one (and any new, needs-information, redirected, declined or closed referral) shows what a person set. */
export function effectiveStatus(r: IntakeRecord, now: number = policyNow()): TriageStatus {
  if (SET_BY_PERSON.includes(r.triage) || !r.config) return r.triage;
  const ins = r.instruments ?? {};
  const prep = preparationIds(r, now);
  const required = r.config.modules.filter((c) => c.state === "active" && c.level === "required" && !prep.has(c.id)).map((c) => c.id);
  const instrumentRequired = required.filter((id) => !["patient-referral", "insurance", "clinical-history", "safety", "social-functional", "clinical-notes", "review-signoff"].includes(id));
  const states: string[] = instrumentRequired.map((id) => ins[id]?.status ?? "not_started");
  const assessed: string = r.assessment.status;
  /* Care planning follows the overall sign-off ("Clinician attestation is required before care planning"): the required modules and the clinical assessment
     signed are not enough while a clinician has not signed off the whole assessment (the "review-signoff" instance the Review & sign-off section writes).
     Until then the work is in clinical review. A plan that does not require the overall sign-off (a person removed it with an override) does not wait for it. */
  const allSigned = states.every((s) => s === "signed") && assessed === "signed" && overallSignoff(r, now).done;
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
