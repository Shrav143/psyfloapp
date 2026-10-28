import { moduleCompletion } from "@/data/assess/completion";
import { isCoreModule, moduleById } from "@/data/assess/modules";
import { sectionParam } from "@/data/assess/nav";
import { overallSignoff } from "@/data/assess/status";
import type { AssessmentPlan, ModuleId } from "@/data/assess/types";
import { REPLY_TASK_ACTION } from "@/data/intake/ext/referral";
import type { IntakeRecord, IntakeSectionId, TriageStatus } from "@/data/intake/types";
import { TRIAGE_LABEL } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { paths } from "@/routes";
import { isMissingValue } from "./missing";

export interface NextAction {
  /** A concrete verb phrase: what a person does next. */
  label: string;
  /** Where in the workspace it is done. */
  to: string;
  tone: Tone;
  /** Nothing left to do: shown muted. */
  done?: boolean;
}

const CLOSED: TriageStatus[] = ["accepted", "redirected", "declined", "closed"];

/** What a person does when an agent's work in a section waits for them. */
const REVIEW_LABEL: Record<IntakeSectionId, string> = {
  referral: "Review the referral", profile: "Review the patient profile", coverage: "Review coverage", assessment: "Review the assessment draft",
  cans: "Review CANS evidence", pathway: "Review service options", review: "Review what is due",
};

const at = (r: IntakeRecord, section: string, panel?: "scribe" | "voice") => paths.intakeRecord(r.id, section, panel);
/** The authorization step of an intake: its draft in New Authorization, or a new one from the intake. The same places the workspace header's next step opens. */
const authorizationOf = (r: IntakeRecord): string =>
  r.handoff.status === "sent" && r.handoff.requestId ? paths.case(r.handoff.requestId) : r.handoff.status === "in_new_case" ? (r.handoff.draftId ? paths.newCase({ draft: r.handoff.draftId }) : paths.newCase({ intake: r.id })) : paths.newCase({ intake: r.id, ...(r.episodeId ? { episode: r.episodeId } : {}) });
const waitingOnReferrer = (r: IntakeRecord): boolean => r.tasks.some((t) => t.role === "coordination" && t.action === REPLY_TASK_ACTION && (t.status === "running" || t.status === "queued"));

/** The modules a configured intake still has to get signed, in the plan's order: the required instruments and sections in use. */
export function unsignedModules(r: IntakeRecord, plan: AssessmentPlan | null): { id: ModuleId; label: string }[] {
  if (!r.config) return [];
  const label = (id: ModuleId) => plan?.modules.find((m) => m.id === id)?.label ?? moduleById(id).label;
  const required = r.config.modules.filter((c) => c.state === "active" && c.level === "required" && !isCoreModule(c.id)).map((c) => c.id);
  const order = plan ? plan.modules.map((m) => m.id) : [];
  required.sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999));
  return required.filter((id) => r.instruments?.[id]?.status !== "signed").map((id) => ({ id, label: label(id) }));
}

/** The next step of a configured intake: the clinical assessment, then each required module, then care planning, then the authorization. */
function configuredNext(r: IntakeRecord, plan: AssessmentPlan | null, status: TriageStatus): NextAction {
  const a = r.assessment.status;
  if (a !== "signed") {
    const label = a === "not_started" ? "Start the clinical assessment" : a === "in_progress" ? "Continue the clinical assessment" : "Review and sign the clinical assessment";
    return { label, to: at(r, "clinical"), tone: a === "awaiting_review" ? "mid" : "neutral" };
  }
  const next = unsignedModules(r, plan)[0];
  if (next) {
    const inst = r.instruments?.[next.id];
    const s = inst?.status ?? "not_started";
    const pct = moduleCompletion(next.id, inst).percent;
    const label = s === "awaiting_review" ? `Review and sign ${next.label}` : s === "in_progress" ? `Continue ${next.label} (${pct}%)` : `Start ${next.label}`;
    return { label, to: at(r, sectionParam({ section: "instrument", module: next.id })), tone: s === "awaiting_review" ? "mid" : "neutral" };
  }
  /* The overall sign-off comes before care planning (effectiveStatus keeps the intake in clinical review until it is signed). */
  if (!overallSignoff(r).done) return { label: "Sign off the assessment", to: at(r, "signoff"), tone: "mid" };
  if (r.carePlan?.status !== "approved") return { label: r.carePlan?.status === "draft" ? "Approve the care plan" : "Select the service and write the care plan", to: at(r, "care"), tone: "neutral" };
  if (r.handoff.status === "sent") return { label: "Open the request", to: authorizationOf(r), tone: "good" };
  if (r.handoff.status === "in_new_case") return { label: "Open the authorization", to: authorizationOf(r), tone: "good" };
  return status === "ready_for_auth" ? { label: "Prepare the authorization", to: authorizationOf(r), tone: "good" } : { label: "Review and hand off", to: at(r, "signoff"), tone: "good" };
}

/** The one thing to do next on an intake, and where it is done. Safety comes first; then triage, contradictions, agent suggestions waiting for a
    person, consent, and then the configured work: the clinical assessment, each unsigned module, care planning and the authorization. */
export function nextActionOf(r: IntakeRecord, status: TriageStatus, plan: AssessmentPlan | null): NextAction {
  if (r.safety?.status === "open") return { label: "Clinician safety review", to: at(r, "referral"), tone: "risk" };
  if (r.safety?.status === "escalated") return { label: "Document the safety review", to: at(r, "referral"), tone: "risk" };
  if (r.method === "voice" && r.voice && r.voice.status === "idle" && status === "new") return { label: "Start the voice intake", to: at(r, "referral", "voice"), tone: "neutral" };
  if (status === "new") return { label: "Triage the referral", to: at(r, "referral"), tone: "mid" };
  if (CLOSED.includes(status)) return { label: `None (${TRIAGE_LABEL[status].toLowerCase()})`, to: at(r, "referral"), tone: "neutral", done: true };

  const pending = r.suggestions.filter((s) => s.status === "pending");
  const conflict = pending.find((s) => s.conflict);
  if (conflict) return { label: conflict.field === "plan" ? "Confirm the current plan" : "Resolve a conflict", to: at(r, conflict.section), tone: "mid" };
  if (pending.length) {
    const bySection = new Map<IntakeSectionId, number>();
    for (const s of pending) bySection.set(s.section, (bySection.get(s.section) ?? 0) + 1);
    const section = [...bySection.entries()].sort((x, y) => y[1] - x[1])[0][0];
    return { label: `Review ${pending.length} suggestion${pending.length === 1 ? "" : "s"}`, to: at(r, section), tone: "mid" };
  }
  if (waitingOnReferrer(r)) return { label: "Waiting on the referrer", to: at(r, "referral"), tone: "neutral" };
  if (status === "needs_info") return { label: "Request missing information", to: at(r, "referral"), tone: "mid" };
  if (r.age !== null && r.age < 18 && (isMissingValue(r.profile.consentTreatment) || r.profile.consentTreatment?.value !== "Signed")) return { label: "Get guardian consent", to: at(r, "patient:profile"), tone: "mid" };
  const needsYou = r.tasks.find((t) => t.status === "needs_you" && t.section);
  if (needsYou?.section) return { label: needsYou.role === "completion" ? needsYou.action : REVIEW_LABEL[needsYou.section], to: at(r, needsYou.section), tone: "mid" };

  if (r.config) return configuredNext(r, plan, status);

  /* Before the intake is configured: what the older, unconfigured records still need. */
  if (r.legacy && !r.pathways.some((p) => p.status === "selected")) return { label: "Review service options", to: at(r, "care"), tone: "neutral" };
  if (r.assessment.status === "awaiting_review") return { label: "Clinician sign-off", to: at(r, "clinical"), tone: "mid" };
  if (status === "clinical_review") return { label: "Clinical review", to: at(r, "clinical"), tone: "mid" };
  if (r.assessment.status === "in_progress") return { label: "Continue the assessment", to: at(r, "clinical"), tone: "neutral" };
  if (r.handoff.status === "sent") return { label: "Open the request", to: authorizationOf(r), tone: "good" };
  if (r.handoff.status === "in_new_case") return { label: "Open the authorization", to: authorizationOf(r), tone: "good" };
  if (r.handoff.status === "draft" || r.handoff.status === "ready") return { label: "Prepare handoff", to: at(r, "signoff"), tone: "good" };
  return { label: "Configure the intake", to: paths.configure(r.id), tone: "neutral" };
}
