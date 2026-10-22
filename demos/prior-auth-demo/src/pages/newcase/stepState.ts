/* The state of each of the five steps. One meaning each, shown on the stepper and in the step's own header:
   Complete (everything required is done), Needs attention (something to fix, and the person can still go on), Pending (not started, or waiting on an agent or a reply),
   Not applicable (the payer needs no authorization), Blocked (a condition that stops sending: no patient, payer, service or dates, inactive coverage with no documented exception, an unanswered duplicate). */
import { RUN_STEPS, draftState, runStarted, type CaseDraft } from "@/data/cases";
import type { Tone } from "@/data/types";
import type { CaseEnv } from "./caseEnv";
import { eligibilityIssues, intakeIssues } from "./caseIssues";
import { reasonOf } from "./verificationFor";
import type { ReviewModel } from "./reviewModel";
import type { StepId } from "./steps";

export type StepState = "complete" | "attention" | "pending" | "na" | "blocked";
export const STEP_STATE_LABEL: Record<StepState, string> = { complete: "Complete", attention: "Needs attention", pending: "Pending", na: "Not applicable", blocked: "Blocked" };
export const STEP_STATE_TONE: Record<StepState, Tone> = { complete: "good", attention: "mid", pending: "neutral", na: "neutral", blocked: "risk" };

export interface StepInfo {
  id: StepId;
  state: StepState;
  /** One short reason, for the step's header and the stepper's tooltip. */
  note: string;
}

/** The payer needs no authorization for this service and the person has not chosen to go on anyway: nothing is prepared or sent. */
export const noAuthNeeded = (env: CaseEnv): boolean => env.verification.noAuth && !reasonOf(env.draft, "no_auth");

const intakeStarted = (d: CaseDraft): boolean => d.started || !!d.patient.initials.trim() || d.patient.age !== null || !!d.payerId || !!d.program;

function intakeInfo(env: CaseEnv): StepInfo {
  const issues = intakeIssues(env);
  const open = issues.filter((i) => i.severity !== "note");
  if (!intakeStarted(env.draft)) return { id: "intake", state: "pending", note: "Not started" };
  if (open.some((i) => i.id === "duplicate")) return { id: "intake", state: "blocked", note: "A matching request exists" };
  if (open.length) return { id: "intake", state: "attention", note: `${open.length} ${open.length === 1 ? "item" : "items"} to fill in` };
  return { id: "intake", state: "complete", note: "Patient, payer, service and dates are in" };
}

function eligibilityInfo(env: CaseEnv): StepInfo {
  const v = env.verification;
  if (v.status === "needs_input") return { id: "eligibility", state: "pending", note: "Needs the payer, member ID and dates" };
  if (v.status === "none" || v.status === "other") return { id: "eligibility", state: "pending", note: "Verify has not checked yet" };
  const issues = eligibilityIssues(env).filter((i) => i.severity !== "note");
  if (issues.some((i) => i.severity === "block")) return { id: "eligibility", state: "blocked", note: "Coverage is not active" };
  if (issues.length) return { id: "eligibility", state: "attention", note: `${issues.length} ${issues.length === 1 ? "warning" : "warnings"}` };
  if (v.status === "stale") return { id: "eligibility", state: "attention", note: v.staleBecause === "dates" ? "The check covers other dates. Refresh it" : "The last check is old. Refresh it" };
  if (v.noAuth) return { id: "eligibility", state: "complete", note: "No authorization required" };
  return { id: "eligibility", state: "complete", note: "Coverage and benefits checked" };
}

function documentationInfo(env: CaseEnv): StepInfo {
  const d = env.draft;
  const r = env.readiness;
  if (d.documents.some((x) => x.status === "validating")) return { id: "documentation", state: "pending", note: "Reader is reading the files" };
  const anything = d.documents.length > 0 || Object.keys(d.unavailable).length > 0;
  if (!anything) return { id: "documentation", state: "pending", note: "No documents yet" };
  if (r.missingRequired.length) return { id: "documentation", state: "attention", note: `${r.missingRequired.length} required ${r.missingRequired.length === 1 ? "document" : "documents"} to add` };
  const flagged = d.documents.filter((x) => x.findings.some((f) => !f.ok && !(f.resolvedBy && d.answers.some((a) => a.key === f.resolvedBy)))).length;
  if (flagged) return { id: "documentation", state: "attention", note: `${flagged} ${flagged === 1 ? "document has" : "documents have"} a finding` };
  return { id: "documentation", state: "complete", note: `${r.ready} of ${r.total} ready` };
}

function preparationInfo(d: CaseDraft, holding: boolean): StepInfo {
  const s = draftState(d);
  if (d.run.failed) return { id: "preparation", state: "attention", note: "An agent could not finish" };
  if (s === "question") return { id: "preparation", state: "attention", note: "An agent has a question" };
  if (d.run.done >= RUN_STEPS.length) return { id: "preparation", state: d.run.skipped.length ? "attention" : "complete", note: d.run.skipped.length ? "A step was skipped" : "The draft is ready" };
  if (holding && d.run.done > 0) return { id: "preparation", state: "attention", note: "Paused in Settings" };
  if (!runStarted(d)) return { id: "preparation", state: "pending", note: "Not started" };
  return { id: "preparation", state: "pending", note: "The agents are working" };
}

function reviewInfo(d: CaseDraft, review: ReviewModel | null): StepInfo {
  if (d.sent) return { id: "review", state: "complete", note: "Sent" };
  if (d.run.done < RUN_STEPS.length || !review) return { id: "review", state: "pending", note: "After the agents finish" };
  if (review.blocking.length) return { id: "review", state: "blocked", note: `${review.blocking.length} ${review.blocking.length === 1 ? "item stops" : "items stop"} sending` };
  const open = review.missing.filter((m) => m.severity === "ack");
  if (open.length) return { id: "review", state: "attention", note: `${open.length} to acknowledge` };
  return { id: "review", state: "pending", note: "Waiting for a clinician to sign" };
}

/** The five states. `review` is null until the draft has a summary to read; `holding` is true while the agent whose turn it is is paused in Settings. */
export function stepStates(env: CaseEnv, review: ReviewModel | null, holding: boolean): StepInfo[] {
  const na = noAuthNeeded(env);
  const later = (id: StepId): StepInfo => ({ id, state: "na", note: "The payer needs no authorization" });
  return [
    intakeInfo(env),
    eligibilityInfo(env),
    na ? later("documentation") : documentationInfo(env),
    na ? later("preparation") : preparationInfo(env.draft, holding),
    na ? later("review") : reviewInfo(env.draft, review),
  ];
}
