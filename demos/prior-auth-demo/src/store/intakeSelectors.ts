import { ACTIVE_STATUSES, effectiveStatus } from "@/data/assess/status";
import type { IntakeRecord, TriageStatus } from "@/data/intake/types";
import { TRIAGE_ORDER } from "@/data/intake/types";
import { sitesInView } from "@/lib/scope";
import type { AppState } from "./index";

/* Pure selectors for Referrals & Intake. Every count a person sees (the six cards, the Active Intakes cards, the sidebar badges) comes from here,
   and every one reads the status the work shows (effectiveStatus), never `record.triage` directly, so a card and the rows it filters to are one set. */

/** The intakes the viewer may see (by site), and, when a program is in focus, only that program's. */
export const intakesInView = (s: AppState, focus = true): IntakeRecord[] => {
  const sites = sitesInView(s);
  return s.intakes.filter((r) => sites.includes(r.site) && (!focus || s.programFocus === "all" || r.serviceId === s.programFocus));
};
/** The legacy clients the viewer may see. */
export const rosterInView = (s: AppState) => {
  const sites = sitesInView(s);
  return s.legacyRoster.filter((c) => sites.includes(c.site));
};

/** How many records are in each of the eleven statuses. */
export function countByStatus(records: readonly IntakeRecord[]): Record<TriageStatus, number> {
  const out = Object.fromEntries(TRIAGE_ORDER.map((t) => [t, 0])) as Record<TriageStatus, number>;
  for (const r of records) out[effectiveStatus(r)] += 1;
  return out;
}

/** The six cards of the Referral Queue. Each one is a status; Ready for screening and the four closed statuses are reached through the status filter. */
export type QueueCardId = "new" | "needs_info" | "assessment" | "clinical_review" | "care_planning" | "ready_for_auth";
export interface QueueCard {
  id: QueueCardId;
  label: string;
  status: TriageStatus;
  /** One line on what the card holds. */
  line: string;
}
export const QUEUE_CARDS: QueueCard[] = [
  { id: "new", label: "New Referrals", status: "new", line: "Waiting for triage" },
  { id: "needs_info", label: "Awaiting Information", status: "needs_info", line: "Waiting on the referrer" },
  { id: "assessment", label: "Assessments In Progress", status: "assessment", line: "Started, not yet signed" },
  { id: "clinical_review", label: "Clinical Review Needed", status: "clinical_review", line: "A clinician reviews next" },
  { id: "care_planning", label: "Ready for Care Planning", status: "care_planning", line: "Assessment signed off" },
  { id: "ready_for_auth", label: "Ready for Authorization", status: "ready_for_auth", line: "Care plan approved" },
];
/** The cards of the Active Intakes page: the four statuses that follow the work. */
export const ACTIVE_CARDS: QueueCard[] = QUEUE_CARDS.filter((c) => (ACTIVE_STATUSES as TriageStatus[]).includes(c.status));

/** The count on each card, in the same order as the cards. */
export function cardCounts(records: readonly IntakeRecord[], cards: readonly QueueCard[] = QUEUE_CARDS): Record<QueueCardId, number> {
  const by = countByStatus(records);
  return Object.fromEntries(cards.map((c) => [c.id, by[c.status]])) as Record<QueueCardId, number>;
}

/** The records in the statuses that follow the work (assessment to ready for authorization). */
export const activeIntakes = (records: readonly IntakeRecord[]): IntakeRecord[] => records.filter((r) => (ACTIVE_STATUSES as TriageStatus[]).includes(effectiveStatus(r)));

/* Sidebar badges. Each reads the sites in view, not the program in the top bar, so a badge never changes with the program choice. */
const inStatus = (s: AppState, status: TriageStatus): number => intakesInView(s, false).filter((r) => effectiveStatus(r) === status).length;
/** New referrals waiting for triage. */
export const selectIntakeBadge = (s: AppState): number => inStatus(s, "new");
/** Referrals waiting on the referrer. */
export const selectNeedsInfoBadge = (s: AppState): number => inStatus(s, "needs_info");
/** Intakes waiting for a clinician's review. */
export const selectClinicalReviewBadge = (s: AppState): number => inStatus(s, "clinical_review");
