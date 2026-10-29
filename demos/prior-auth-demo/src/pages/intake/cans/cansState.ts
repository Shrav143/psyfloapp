import type { InstrumentInstance, InstrumentStatus } from "@/data/assess/types";
import type { CansAssessment, CansItem, IntakeRecord, Suggestion } from "@/data/intake/types";
import type { Tone } from "@/data/types";

/* Pure reading of a CANS record: how much is addressed, what blocks a review or a signature, and the instrument instance the workspace navigation and
   the readiness cards read (mirrorCans, mirrorLon). Nothing here rates an item or computes a result: an item is "addressed" when a person typed a
   rating label or a note. */

export const addressed = (i: CansItem): boolean => !!(i.response?.trim() || i.note?.trim());

export interface CansCompletion { total: number; addressed: number; rated: number; missing: CansItem[] }
export function cansCompletion(c: CansAssessment): CansCompletion {
  const done = c.items.filter(addressed);
  return { total: c.items.length, addressed: done.length, rated: c.items.filter((i) => !!i.response?.trim()).length, missing: c.items.filter((i) => !addressed(i)) };
}

/** The agent's evidence proposals nobody has accepted or rejected yet. */
export const pendingEvidence = (r: IntakeRecord): Suggestion[] => r.suggestions.filter((x) => x.section === "cans" && x.field.startsWith("evidence:") && x.status === "pending");
/** The agent's draft summary, when it waits for a person. */
export const pendingSummary = (r: IntakeRecord): Suggestion | undefined => r.suggestions.find((x) => x.section === "cans" && x.field === "narrative" && x.status === "pending");

export interface CansBlocker { id: "template" | "assessor" | "evidence" | "summary" | "items"; label: string }
/** Why a CANS record cannot be marked ready or signed yet. Empty means a clinician can. */
export function cansBlockers(r: IntakeRecord): CansBlocker[] {
  const c = r.cans;
  if (!c) return [];
  const out: CansBlocker[] = [];
  if (!c.template || !c.items.length) out.push({ id: "template", label: "No item template is loaded: the official mapping is not available" });
  if (!c.assessor) out.push({ id: "assessor", label: "No assessor is assigned" });
  const ev = pendingEvidence(r).length;
  if (ev) out.push({ id: "evidence", label: `${ev} evidence statement${ev === 1 ? " waits" : "s wait"} for a decision` });
  if (pendingSummary(r)) out.push({ id: "summary", label: "An AI-generated summary waits for a decision" });
  const missing = cansCompletion(c).missing.length;
  if (c.items.length && missing) out.push({ id: "items", label: `${missing} item${missing === 1 ? " has" : "s have"} no rating label or note` });
  return out;
}

export interface ItemStatus { label: string; tone: Tone }
/** The assessment status of one item, in words. */
export function itemStatus(i: CansItem, pendingForItem: number, signed: boolean): ItemStatus {
  if (signed && addressed(i)) return { label: "Signed off", tone: "good" };
  if (i.state === "needs_review") return { label: "Needs review", tone: "mid" };
  if (i.response?.trim()) return { label: "Rated", tone: "good" };
  if (i.note?.trim()) return { label: "Note only", tone: "neutral" };
  if (pendingForItem) return { label: "Evidence waiting", tone: "mid" };
  return { label: "Not rated", tone: "neutral" };
}

const INSTRUMENT_STATUS: Record<CansAssessment["status"], InstrumentStatus> = { not_started: "not_started", in_progress: "in_progress", ready_for_review: "awaiting_review", signed: "signed" };

/** The CANS record as an instrument instance (`instruments.cans`), so the left navigation, the status and the readiness cards see its progress. */
export function mirrorCans(r: IntakeRecord, at: number): IntakeRecord {
  const c = r.cans;
  if (!c) return r;
  const comp = cansCompletion(c);
  const complete = comp.total > 0 && comp.addressed === comp.total;
  const inst: InstrumentInstance = {
    moduleId: "cans", version: c.version ?? 1, status: INSTRUMENT_STATUS[c.status],
    fields: { "cans.items": { value: complete ? `${comp.total} of ${comp.total} items addressed` : "", state: "verified", at, by: "system" } },
    notes: c.narrative, evidence: [], startedAt: c.startedAt, updatedAt: at, reviewedBy: c.signedBy, signedBy: c.signedBy, signedAt: c.signedAt, rolePlay: c.rolePlay,
    history: (c.history ?? []).map((h) => ({ version: h.version, status: "superseded" as const, fields: {}, signedBy: h.signedBy, signedAt: h.signedAt, supersededAt: h.supersededAt, note: h.note })),
  };
  return { ...r, instruments: { ...(r.instruments ?? {}), cans: inst } };
}

/** The Level of Need review as an instrument instance (`instruments.lon`). The disposition a clinician records counts as the sign-off; it is never a level. */
export function mirrorLon(r: IntakeRecord, at: number): IntakeRecord {
  const l = r.lon;
  if (!l) return r;
  const done = l.status === "dispositioned";
  const inst: InstrumentInstance = {
    moduleId: "lon", version: 1, status: done ? "signed" : l.status === "in_review" ? "in_progress" : "not_started",
    fields: { "lon.review": { value: done ? "Disposition recorded by a clinician (not a level)" : "", state: "verified", at, by: "system" } },
    notes: l.reviewNote ?? "", evidence: [], startedAt: l.startedAt, updatedAt: at, reviewedBy: l.reviewer, signedBy: done ? l.decidedBy : undefined, signedAt: done ? l.decidedAt : undefined, rolePlay: done ? l.rolePlay : undefined, history: [],
  };
  return { ...r, instruments: { ...(r.instruments ?? {}), lon: inst } };
}
