import { SLA_MIN, URGENCY_RANK, issueCount, type Referral, type ReferralStatus, type SourceKind } from "@/data/referrals";
import type { Tone } from "@/data/types";
import { DAY, duration, shortDate, typical } from "@/lib/time";
import type { ReferralFilters, StatusView } from "@/store/referrals";

const PERIOD_MIN: Record<ReferralFilters["period"], number> = { "7d": 7 * DAY, "30d": 30 * DAY, quarter: 90 * DAY };

const ageOf = (r: Referral, clock: number): number => Math.max(0, clock - r.receivedAt);
/** Waiting for a first decision and already past the response target for its urgency. */
export const pastTarget = (r: Referral, clock: number): boolean => (r.status === "new" || r.status === "in_review") && ageOf(r, clock) > SLA_MIN[r.urgency];
const decisionMinutes = (r: Referral): number | undefined => (r.decidedAt === undefined ? undefined : r.decidedAt - r.receivedAt);

/** Dropdown filters, the period and the past-target switch. `skip` leaves one out so a chart can show the choices it filters by. */
export function baseFilter(refs: Referral[], f: ReferralFilters, clock: number, skip: { source?: boolean; period?: boolean } = {}): Referral[] {
  return refs.filter((r) => {
    if (!skip.source && f.source !== "all" && r.source.kind !== f.source) return false;
    if (f.payer !== "all" && (f.payer === "none" ? r.payerId !== null : r.payerId !== f.payer)) return false;
    if (f.program !== "all" && r.program !== f.program) return false;
    if (f.urgency !== "all" && r.urgency !== f.urgency) return false;
    const issues = issueCount(r.checks);
    if (f.docCheck === "issues" && issues === 0) return false;
    if (f.docCheck === "clear" && issues > 0) return false;
    if (!skip.period && r.receivedAt <= clock - PERIOD_MIN[f.period]) return false;
    if (f.late && !pastTarget(r, clock)) return false;
    return true;
  });
}

const VIEW_STATUSES: Record<StatusView, ReferralStatus[] | null> = {
  review: ["new", "in_review"],
  new: ["new"],
  in_review: ["in_review"],
  awaiting: ["awaiting_info"],
  accepted: ["accepted", "scheduled"],
  admitted: ["admitted"],
  declined: ["declined"],
  all: null,
};
export const inView = (r: Referral, view: StatusView): boolean => VIEW_STATUSES[view]?.includes(r.status) ?? true;

export function countByView(refs: Referral[]): Record<StatusView, number> {
  const out = {} as Record<StatusView, number>;
  for (const v of Object.keys(VIEW_STATUSES) as StatusView[]) out[v] = refs.filter((r) => inView(r, v)).length;
  return out;
}

/** Received, Reviewed (a person has looked), Accepted (accepted, scheduled or admitted), Admitted. */
export function funnelSteps(refs: Referral[]): { label: string; value: number }[] {
  return [
    { label: "Received", value: refs.length },
    { label: "Reviewed", value: refs.filter((r) => r.status !== "new").length },
    { label: "Accepted", value: refs.filter((r) => inView(r, "accepted") || r.status === "admitted").length },
    { label: "Admitted", value: refs.filter((r) => r.status === "admitted").length },
  ];
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
export const medianDecision = (refs: Referral[]): number | undefined => median(refs.map(decisionMinutes).filter((m): m is number => m !== undefined));

export interface SourceStat {
  kind: SourceKind;
  count: number;
  admitted: number;
}
export function sourceStats(refs: Referral[]): SourceStat[] {
  const map = new Map<SourceKind, SourceStat>();
  for (const r of refs) {
    const s = map.get(r.source.kind) ?? { kind: r.source.kind, count: 0, admitted: 0 };
    s.count += 1;
    if (r.status === "admitted") s.admitted += 1;
    map.set(r.source.kind, s);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

/** Eight rolling weeks ending now. Each column is labelled with the date its week started. */
export function weeklyCounts(refs: Referral[], clock: number): { label: string; value: number }[] {
  return Array.from({ length: 8 }, (_, k) => {
    const start = clock - (8 - k) * 7 * DAY;
    const end = start + 7 * DAY;
    return { label: shortDate(start), value: refs.filter((r) => r.receivedAt > start && r.receivedAt <= end).length };
  });
}

const GROUP: Record<ReferralStatus, number> = { new: 0, in_review: 0, awaiting_info: 1, accepted: 2, scheduled: 2, admitted: 3, declined: 4 };
/** Open referrals first by urgency then by how long they have waited; closed ones newest first. */
export function sortReferrals(refs: Referral[]): Referral[] {
  return [...refs].sort((a, b) => {
    if (GROUP[a.status] !== GROUP[b.status]) return GROUP[a.status] - GROUP[b.status];
    if (GROUP[a.status] <= 1) return URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || a.receivedAt - b.receivedAt;
    return b.receivedAt - a.receivedAt;
  });
}

export function coverageVerdict(r: Referral): { label: string; tone: Tone } {
  if (!r.coverage) return { label: "Not checked", tone: "neutral" };
  switch (r.coverage.kind) {
    case "cleared":
      return { label: "Active", tone: "good" };
    case "auth_first":
      return { label: "Needs authorization", tone: "mid" };
    case "lapsed":
      return { label: "Lapsed", tone: "risk" };
    case "unconfirmed":
      return { label: "Not found", tone: "mid" };
  }
}

export function matchesQuery(r: Referral, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  return [r.id, r.patient.initials, r.source.name, r.status.replace("_", " ")].some((x) => x.toLowerCase().includes(t));
}

interface ClockInfo {
  main: string;
  of?: string;
  note?: string;
  tone: "ok" | "late" | "very" | "quiet";
}
/** The Clock column: age against the response target while waiting, time to decision once decided. */
export function clockInfo(r: Referral, clock: number): ClockInfo {
  const target = SLA_MIN[r.urgency];
  if (r.status === "new" || r.status === "in_review") {
    const age = ageOf(r, clock);
    const tone = age > 2 * target ? "very" : age > target ? "late" : "ok";
    return { main: duration(age), of: `of ${typical(target)}`, note: tone === "ok" ? undefined : tone === "very" ? "very late" : "late", tone };
  }
  if (r.status === "awaiting_info") return { main: duration(clock - (r.infoAskedAt ?? r.receivedAt)), note: "waiting on the referrer", tone: "quiet" };
  const took = decisionMinutes(r) ?? 0;
  return { main: duration(took), note: took > target ? "to decide, late" : "to decide", tone: took > target ? "late" : "quiet" };
}
