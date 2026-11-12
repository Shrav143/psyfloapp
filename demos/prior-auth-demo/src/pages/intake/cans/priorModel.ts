import type { PriorAssessment } from "@/data/assess/types";
import type { IntakeRecord, PriorDecision } from "@/data/intake/types";
import { DAY } from "@/lib/time";

/* What the "Existing assessment found" card says about one assessment found for the person. Pure. The staleness flag is a demo heuristic, not a policy:
   whether and for how long a prior assessment may be reused is not verified, and the card says so. */

/** Months after which the card flags an assessment as possibly stale. A demo heuristic; the policy interval is not verified. */
export const STALE_AFTER_MONTHS = 6;
const MONTH = 30.4375 * DAY;

export function monthsOld(p: PriorAssessment, now: number): number {
  return Math.max(0, Math.floor((now - p.date) / MONTH));
}
export function ageLabel(p: PriorAssessment, now: number): string {
  const days = Math.max(0, Math.round((now - p.date) / DAY));
  const months = monthsOld(p, now);
  return months >= 1 ? `${months} month${months === 1 ? "" : "s"} old` : `${days} day${days === 1 ? "" : "s"} old`;
}
export function staleFlag(p: PriorAssessment, now: number): string | null {
  if (p.status === "outdated") return "The source marks it outdated.";
  if (monthsOld(p, now) >= STALE_AFTER_MONTHS) return "May be stale. The reuse window per policy is not verified.";
  return null;
}

export const REUSE_LABEL: Record<PriorAssessment["reuse"], string> = { permitted: "Reuse allowed by policy", unverified: "Reuse rule not verified", not_permitted: "Reuse not permitted" };
export const STATUS_LABEL: Record<PriorAssessment["status"], string> = { current: "Current", outdated: "Outdated", incomplete: "Incomplete" };

/** What the consent ledger says about a release for the source: none recorded in the ledger means the card cannot tell, and says so. */
export function releaseStatus(r: IntakeRecord): "on_file" | "needed" | "unknown" {
  if (!r.consents?.length) return "unknown";
  return r.consents.some((c) => c.type === "release" && c.status === "on_file") ? "on_file" : "needed";
}

export const DECISION_LABEL: Record<PriorDecision["action"], string> = {
  reviewed: "Reviewed", reused: "Carried forward as a draft, needs review", update_requested: "Update requested from the source", new_started: "Started a new assessment", cannot_reuse: "Cannot reuse",
};
