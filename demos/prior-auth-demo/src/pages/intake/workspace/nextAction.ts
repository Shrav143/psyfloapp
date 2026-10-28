import { LEGACY_SECTION, type WorkspaceTarget } from "@/data/assess/nav";
import type { AssessmentPlan } from "@/data/assess/types";
import { SECTION_LABEL, type IntakeRecord, type IntakeSectionId } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { paths } from "@/routes";
import { holdsUp, pendingEvidence, planItems } from "./modules";
import type { SignoffModel } from "./signoff";

/* The one next step for an intake, as a sentence and a place to do it. The first rule that applies wins; the order follows the work: safety, the
   referral, the configuration, the assessment, sign-off, care planning, the authorization. Pure. */

export interface NextAction {
  text: string;
  tone: Tone;
  /** The button's words. */
  label: string;
  to?: WorkspaceTarget;
  /** Opens the configuration instead of a section. */
  configure?: boolean;
  /** Another page (New Authorization). */
  href?: string;
}

const REFERRAL_SECTIONS: IntakeSectionId[] = ["referral", "profile", "coverage"];

export function nextActionOf(r: IntakeRecord, plan: AssessmentPlan | null, so: SignoffModel): NextAction {
  if (r.safety?.status === "open") return { text: "A clinician reviews the safety alert", tone: "risk", label: "Open the alert", to: { section: "clinical" } };
  if (r.triage === "closed" || r.triage === "declined" || r.triage === "redirected") return { text: `This intake is ${r.triage}${r.triageNote ? `: ${r.triageNote}` : ""}`, tone: "neutral", label: "Open the referral", to: { section: "referral" } };
  if (r.triage === "new") return { text: "Triage the referral", tone: "mid", label: "Open the referral", to: { section: "referral" } };
  if (r.triage === "needs_info") return { text: "Waiting on the referrer for information", tone: "mid", label: "Open the referral", to: { section: "referral" } };

  const pending = r.suggestions.filter((s) => s.status === "pending" && REFERRAL_SECTIONS.includes(s.section));
  if (pending.length) {
    const first = pending[0].section;
    return { text: `Review ${pending.length} AI ${pending.length === 1 ? "suggestion" : "suggestions"} in ${SECTION_LABEL[first].toLowerCase()}`, tone: "mid", label: "Review", to: LEGACY_SECTION[first] };
  }
  if (!r.config) return { text: "Configure the intake: purpose, program, population and setting", tone: "mid", label: "Configure the intake", configure: true };

  const items = planItems(r, plan);
  const a = r.assessment.status;
  if (a === "not_started") return { text: "Start the clinical assessment", tone: "neutral", label: "Open the assessment", to: { section: "clinical" } };
  const ev = pendingEvidence(r)[0];
  if (ev) return { text: `Decide on the evidence proposed for ${items.find((i) => i.id === ev.moduleId)?.label ?? ev.moduleId}`, tone: "mid", label: "Review evidence", to: { section: "instrument", module: ev.moduleId } };
  const todo = items.filter(holdsUp).filter((i) => i.status !== "signed");
  const next = todo.find((i) => i.status === "awaiting_review") ?? todo.find((i) => i.status === "in_progress") ?? todo[0];
  if (next) {
    const text = next.status === "awaiting_review" ? `A clinician reviews and signs ${next.label}` : next.status === "in_progress" ? `Finish ${next.label}` : `Start ${next.label}`;
    return { text, tone: "neutral", label: next.status === "awaiting_review" ? "Open to sign" : "Open", to: { section: "instrument", module: next.id } };
  }
  if (a === "in_progress") return { text: "Finish the clinical assessment", tone: "neutral", label: "Open the assessment", to: { section: "clinical" } };
  if (a === "awaiting_review") return { text: "A clinician attests the clinical assessment", tone: "mid", label: "Open to sign", to: { section: "clinical" } };
  if (so.state === "ready") return { text: "A clinician signs off the assessment", tone: "mid", label: "Go to sign-off", to: { section: "signoff" } };
  if (so.state === "stale") return { text: "A module changed after sign-off. A clinician amends the sign-off", tone: "mid", label: "Go to sign-off", to: { section: "signoff" } };
  if (r.carePlan?.status !== "approved") return { text: r.carePlan?.status === "draft" ? "A clinician approves the care plan" : "A clinician selects the service and drafts the care plan", tone: "neutral", label: "Open care planning", to: { section: "care" } };
  if (r.handoff.status === "in_new_case") return { text: "Finish the authorization request in New Authorization", tone: "neutral", label: "Open the draft", href: r.handoff.draftId ? paths.newCase({ draft: r.handoff.draftId }) : paths.newCase({ intake: r.id }) };
  return { text: "Prepare the authorization request. A person sends it", tone: "good", label: "Start New Authorization", href: paths.newCase({ intake: r.id, ...(r.episodeId ? { episode: r.episodeId } : {}) }) };
}
