import { MIN_DECISIONS } from "@/data/analytics";
import { cmsApplies, type Decision } from "@/data/decisions";

/* The one place a rate, a count or an average is worked out. The headline figures, the charts, the tables and the case lists all call
   `statsOf` on the same rows, so a figure and the cases behind it cannot disagree. */

export interface Stats {
  n: number;
  /** Approved as requested. */
  approved: number;
  /** Approved in part: fewer days or units than requested. */
  partial: number;
  denied: number;
  /** Everything that was not approved as requested: the denials. */
  notApproved: number;
  /** Approved as requested with no request for more information. */
  firstPass: number;
  infoRequests: number;
  hours: number;
  /** Decisions at plans the CMS decision time applies to, and how many of them took longer. */
  cmsN: number;
  pastCms: number;
  /** Denials the team could have prevented. */
  preventable: number;
  /** Appeals the payer ruled on, and how many were overturned or partly restored. */
  rulings: number;
  overturned: number;
  accepted: number;
  /** Requested and approved days or units, summed over decisions that approved something (as requested or in part). */
  requested: number;
  approvedAmt: number;
  amountN: number;
}

export function statsOf(rows: readonly Decision[]): Stats {
  const s: Stats = { n: rows.length, approved: 0, partial: 0, denied: 0, notApproved: 0, firstPass: 0, infoRequests: 0, hours: 0, cmsN: 0, pastCms: 0, preventable: 0, rulings: 0, overturned: 0, accepted: 0, requested: 0, approvedAmt: 0, amountN: 0 };
  for (const d of rows) {
    if (d.outcome === "approved") {
      s.approved += 1;
      if (!d.infoRequest) s.firstPass += 1;
    } else {
      s.notApproved += 1;
      if (d.outcome === "partial") s.partial += 1;
      else s.denied += 1;
      if (d.preventable) s.preventable += 1;
      if (d.accepted) s.accepted += 1;
    }
    if (d.infoRequest) s.infoRequests += 1;
    s.hours += d.hours;
    if (cmsApplies(d.payerId)) {
      s.cmsN += 1;
      if (d.pastCms) s.pastCms += 1;
    }
    if (d.appeal === "overturned" || d.appeal === "partly" || d.appeal === "upheld") {
      s.rulings += 1;
      if (d.appeal !== "upheld") s.overturned += 1;
    }
    if (d.outcome !== "denied") {
      s.requested += d.requested;
      s.approvedAmt += d.approvedAmt;
      s.amountN += 1;
    }
  }
  return s;
}

/** A whole percent, or null when there is nothing to divide by. */
export const pctOf = (part: number, whole: number): number | null => (whole > 0 ? Math.round((100 * part) / whole) : null);
/** A figure resting on fewer than 20 decisions (or denials, or rulings) is not shown. */
export const enough = (n: number): boolean => n >= MIN_DECISIONS;
/** The percent, hidden when it rests on too few. */
export const shownPct = (part: number, whole: number): number | null => (enough(whole) ? pctOf(part, whole) : null);
/** Average days to decision, one decimal, or null when there is nothing. */
export const avgDays = (s: Stats): number | null => (s.n > 0 ? Math.round((s.hours / s.n / 24) * 10) / 10 : null);
export const avgDaysShown = (s: Stats): number | null => (enough(s.n) ? avgDays(s) : null);
export const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

export const fmt = (n: number): string => n.toLocaleString("en-US");
export const pctText = (v: number | null): string => (v === null ? "-" : `${v}%`);
export const daysText = (v: number | null): string => (v === null ? "-" : `${v.toFixed(1)} days`);
/** "+6 pts", "-3 pts", "no change". */
export function ptsText(delta: number | null): string {
  if (delta === null) return "no earlier data";
  if (delta === 0) return "no change";
  return `${delta > 0 ? "+" : "-"}${Math.abs(delta)} ${Math.abs(delta) === 1 ? "pt" : "pts"}`;
}
export const daysDeltaText = (delta: number | null): string => {
  if (delta === null) return "no earlier data";
  if (Math.abs(delta) < 0.05) return "no change";
  return `${delta > 0 ? "+" : "-"}${Math.abs(delta).toFixed(1)} days`;
};

/** Groups rows by a key. Keys that never appear are still returned (empty), so a chart keeps its categories. */
export function groupBy<T extends string>(rows: readonly Decision[], keys: readonly T[], keyOf: (d: Decision) => T): Map<T, Decision[]> {
  const m = new Map<T, Decision[]>(keys.map((k) => [k, []]));
  for (const d of rows) m.get(keyOf(d))?.push(d);
  return m;
}
