import type { IntakeRecord, IntakeSectionId } from "@/data/intake/types";
import { TRIAGE_LABEL } from "@/data/intake/types";
import type { Tone } from "@/data/types";
import { isMissingValue } from "./metrics";
import { CLOSED_TRIAGE } from "./labels";
import { openInfoRequests } from "../referral/logic";

export interface NextAction {
  label: string;
  section: IntakeSectionId;
  panel?: "scribe" | "voice";
  tone: Tone;
  /** Nothing left to do: shown muted. */
  done?: boolean;
}

/** What a person does when an agent's work in a section waits for them. */
const REVIEW_LABEL: Record<IntakeSectionId, string> = {
  referral: "Review the referral", profile: "Review the patient profile", coverage: "Review coverage", assessment: "Review the assessment draft",
  cans: "Review CANS evidence", pathway: "Review service options", review: "Review what is due",
};

/** The one thing to do next on an intake, and where in the record it is done. Safety comes first; then triage, contradictions,
    agent suggestions waiting for a person, consent, then the assessment and the handoff. */
export function nextActionOf(r: IntakeRecord): NextAction {
  if (r.safety?.status === "open") return { label: "Clinician safety review", section: "referral", tone: "risk" };
  if (r.safety?.status === "escalated") return { label: "Document the safety review", section: "referral", tone: "risk" };
  if (r.method === "voice" && r.voice && r.voice.status === "idle" && r.triage === "new") return { label: "Start the voice intake", section: "referral", panel: "voice", tone: "neutral" };
  if (r.triage === "new") return { label: "Triage the referral", section: "referral", tone: "mid" };
  if (CLOSED_TRIAGE.includes(r.triage)) return { label: `None (${TRIAGE_LABEL[r.triage].toLowerCase()})`, section: "referral", tone: "neutral", done: true };

  const pending = r.suggestions.filter((s) => s.status === "pending");
  const conflict = pending.find((s) => s.conflict);
  if (conflict) return { label: conflict.field === "plan" ? "Confirm the current plan" : "Resolve a conflict", section: conflict.section, tone: "mid" };
  if (pending.length) {
    const bySection = new Map<IntakeSectionId, number>();
    for (const s of pending) bySection.set(s.section, (bySection.get(s.section) ?? 0) + 1);
    const section = [...bySection.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return { label: `Review ${pending.length} suggestion${pending.length === 1 ? "" : "s"}`, section, tone: "mid" };
  }
  if (openInfoRequests(r).length) return { label: "Waiting on the referrer", section: "referral", tone: "neutral" };
  if (r.triage === "needs_info") return { label: "Request missing information", section: "referral", tone: "mid" };
  if (r.age !== null && r.age < 18 && (isMissingValue(r.profile.consentTreatment) || r.profile.consentTreatment?.value !== "Signed")) return { label: "Get guardian consent", section: "profile", tone: "mid" };
  const needsYou = r.tasks.find((t) => t.status === "needs_you" && t.section);
  if (needsYou?.section) return { label: needsYou.role === "completion" ? needsYou.action : REVIEW_LABEL[needsYou.section], section: needsYou.section, tone: "mid" };
  if (r.legacy && !r.pathways.some((p) => p.status === "selected")) return { label: "Review service options", section: "pathway", tone: "neutral" };
  if (r.assessment.status === "awaiting_review") return { label: "Clinician sign-off", section: "assessment", tone: "mid" };
  if (r.triage === "clinical_review") return { label: "Clinical review", section: "assessment", tone: "mid" };
  if (r.assessment.status === "not_started") return { label: "Start the assessment", section: "assessment", tone: "neutral" };
  if (r.assessment.status === "in_progress") return { label: "Continue the assessment", section: "assessment", tone: "neutral" };
  if (r.handoff.status === "in_new_case") return { label: "Open the authorization", section: "review", tone: "good" };
  return { label: "Prepare handoff", section: "review", tone: "good" };
}
