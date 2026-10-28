import type { WorkspaceTarget } from "@/data/assess/nav";
import type { AssessmentPlan, DualReadiness, ReadinessTrack } from "@/data/assess/types";
import { isOpen, type CheckItem } from "@/data/intake/checklist";
import type { IntakeRecord } from "@/data/intake/types";
import { AUTH_STATUS_LABEL, AUTH_STATUS_TONE, authorizationsOf, type PatientBook } from "@/data/patients";
import type { Tone } from "@/data/types";
import { paths } from "@/routes";
import { instrumentProgress } from "./modules";

/* The progress indicators under the patient's name. Each one is read from the record, so it changes the moment the data does. The two readiness
   tracks are kept apart on purpose: neither is an approval and neither says medical necessity is established. Pure. */

export type ProgressKey = "referral" | "coverage" | "assessments" | "clinical" | "administrative" | "care" | "authorization";
export interface ProgressCell {
  key: ProgressKey;
  label: string;
  value: string;
  detail?: string;
  tone: Tone;
  ratio?: { done: number; total: number };
  /** Where in the workspace it is dealt with. */
  to?: WorkspaceTarget;
  /** Or another page (an authorization, a New Authorization draft). */
  href?: string;
}

export interface AuthState { value: string; tone: Tone; detail?: string; href?: string }

/** Where the intake stands with the authorization: one the patient book lists for its episode, a draft packet or New Authorization draft, or nothing yet. */
export function authorizationState(r: IntakeRecord, book: PatientBook | null): AuthState {
  const episode = r.episodeId && book ? book.episodes.find((e) => e.id === r.episodeId) : undefined;
  const auth = episode && book ? authorizationsOf(book, episode.id)[0] : undefined;
  if (episode && auth) return { value: AUTH_STATUS_LABEL[auth.status], tone: AUTH_STATUS_TONE[auth.status], detail: `${auth.id} · ${auth.label}`, href: paths.case(episode.caseId) };
  if (r.triage === "closed") return { value: "None", tone: "neutral", detail: `The intake ended without an authorization.${r.triageNote ? ` ${r.triageNote}` : ""}`.trim() };
  const h = r.handoff;
  if (h.status === "in_new_case") return { value: "Draft started", tone: "neutral", detail: "In New Authorization", href: h.draftId ? paths.newCase({ draft: h.draftId }) : paths.newCase({ intake: r.id }) };
  if (h.status === "ready") return { value: "Packet approved", tone: "good", detail: "Not submitted", href: paths.newCase({ intake: r.id }) };
  if (h.status === "draft") return { value: "Packet draft", tone: "neutral", detail: "Waits for approval" };
  return { value: "Not started", tone: "neutral" };
}

const open = (xs: CheckItem[]) => xs.filter((i) => isOpen(i.status)).length;

function referralCell(r: IntakeRecord, items: CheckItem[]): ProgressCell {
  const n = open(items.filter((i) => i.category === "referral"));
  const to: WorkspaceTarget = { section: "referral" };
  if (n) return { key: "referral", label: "Referral", value: `${n} open`, detail: "Items to review", tone: "mid", to };
  if (r.triage === "new") return { key: "referral", label: "Referral", value: "To triage", tone: "mid", to };
  if (r.triage === "needs_info") return { key: "referral", label: "Referral", value: "Needs information", tone: "mid", to };
  return { key: "referral", label: "Referral", value: "Complete", tone: "good", to };
}

function coverageCell(r: IntakeRecord): ProgressCell {
  const e = r.eligibility;
  const to: WorkspaceTarget = { section: "patient", tab: "coverage" };
  const cell = (value: string, tone: Tone, detail?: string): ProgressCell => ({ key: "coverage", label: "Coverage", value, tone, detail, to });
  if (!r.payerId) return cell("No plan on file", "mid");
  if (e.status === "inactive") return cell("Not active", "risk", "Simulated response");
  if (e.status === "conflict" || e.conflicts.length) return cell("Conflict", "mid", "Sources disagree");
  if (e.status === "not_checked") return cell("Not checked", "neutral");
  if (e.status === "checking") return cell("Checking", "neutral", "Simulated");
  const v = e.verified ?? {};
  if (v.member && v.benefit && v.network) return cell("Verified", "good", "Confirmed with the plan");
  return cell(e.status === "uncertain" ? "Uncertain" : "To confirm", "mid", "Simulated response");
}

const WORD: Record<ReadinessTrack["state"], string> = { complete: "Complete", in_progress: "In progress", not_started: "Not started", blocked: "Blocked" };
const TONE: Record<ReadinessTrack["state"], Tone> = { complete: "good", in_progress: "mid", not_started: "neutral", blocked: "risk" };
export const trackCounts = (t: ReadinessTrack): { done: number; total: number } => {
  const counted = t.items.filter((i) => i.status !== "na");
  return { done: counted.filter((i) => i.status === "complete").length, total: counted.length };
};
function trackCell(key: "clinical" | "administrative", label: string, t: ReadinessTrack): ProgressCell {
  const ratio = trackCounts(t);
  return { key, label, value: WORD[t.state], detail: ratio.total ? `${ratio.done} of ${ratio.total} items${t.open ? `, ${t.open} open` : ""}` : "No items", tone: TONE[t.state], ratio, to: { section: "overview" } };
}

export function headerProgress(r: IntakeRecord, plan: AssessmentPlan | null, items: CheckItem[], rd: DualReadiness, auth: AuthState): ProgressCell[] {
  const prog = instrumentProgress(r, plan);
  const assessments: ProgressCell = !r.config
    ? { key: "assessments", label: "Assessments", value: "Not configured", tone: "neutral", to: { section: "instrument" } }
    : !prog.total
      ? { key: "assessments", label: "Assessments", value: "None required", tone: "neutral", to: { section: "instrument" } }
      : {
          key: "assessments", label: "Assessments", value: `${prog.signed} of ${prog.total} signed`, ratio: { done: prog.signed, total: prog.total }, to: { section: "instrument" },
          tone: prog.signed === prog.total ? "good" : prog.items.some((i) => i.status !== "not_started") ? "mid" : "neutral",
        };
  const cp = r.carePlan?.status;
  const selected = r.pathways.some((p) => p.status === "selected");
  const care: ProgressCell = { key: "care", label: "Care plan", to: { section: "care" },
    ...(cp === "approved" ? { value: "Approved", tone: "good" as const } : cp === "draft" ? { value: "Draft", tone: "mid" as const } : selected ? { value: "Service selected", tone: "neutral" as const } : { value: "Not started", tone: "neutral" as const }) };
  return [
    referralCell(r, items),
    coverageCell(r),
    assessments,
    trackCell("clinical", "Clinical readiness", rd.clinical),
    trackCell("administrative", "Administrative readiness", rd.administrative),
    care,
    { key: "authorization", label: "Authorization", value: auth.value, detail: auth.detail, tone: auth.tone, href: auth.href, to: auth.href ? undefined : { section: "care" } },
  ];
}
