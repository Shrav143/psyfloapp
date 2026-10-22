import type { BuiltInPayerId, Program } from "./types";

/* Analytics calibration. The case-level dataset (data/decisions.ts) is generated to hit these numbers for "this quarter, Both sites":
   1,070 decisions, 71% approved as asked (so 29% not, 311 denials), per payer Lakeshore 86, Beacon 81, Harborview 77, Summit 74,
   Evergreen 69, Cardinal 63, the denial reasons below (73 at the top: continued-stay evidence at Cardinal), 207 preventable denials,
   96 appeal rulings of which 54 were overturned or partly restored (56%), 17 denials accepted, 84% advice taken works, 68 / 27 / 5
   edits, program shares 40 / 30 / 20 / 10 and a decision-weighted average of 2.4 days. Every figure on the Analytics page is
   computed from the records, never from these tables, so a chart, its table and its case list cannot disagree. */

export const MIN_DECISIONS = 20;

export type PeriodId = "quarter" | "last_quarter" | "year";
export type MonthRange = readonly [first: number, last: number];

export interface PeriodInfo {
  id: PeriodId;
  label: string;
  /** "this quarter", used in sentences. */
  phrase: string;
  /** Month indexes (0 = Nov 2025 ... 11 = Oct 2026) the period covers, both ends included. */
  months: MonthRange;
  /** What the change on a figure compares: the months it looks at now and the months before them. */
  compare: { now: MonthRange; before: MonthRange; words: string };
}
export const PERIODS: PeriodInfo[] = [
  { id: "quarter", label: "This quarter", phrase: "this quarter", months: [9, 11], compare: { now: [9, 11], before: [6, 8], words: "vs last quarter" } },
  { id: "last_quarter", label: "Last quarter", phrase: "last quarter", months: [6, 8], compare: { now: [6, 8], before: [3, 5], words: "vs the quarter before" } },
  { id: "year", label: "Last 12 months", phrase: "the last 12 months", months: [0, 11], compare: { now: [6, 11], before: [0, 5], words: "last 6 months vs the 6 before" } },
];

export const PROGRAM_ORDER: Program[] = ["RES", "IOP", "PHP", "WM"];
/** Program shares of this quarter's decisions, in percent (Demo values). */
export const PROGRAM_SHARE: Record<Program, number> = { RES: 40, IOP: 30, PHP: 20, WM: 10 };

export const PAYER_ORDER: BuiltInPayerId[] = ["lakeshore", "beacon", "harborview", "summit", "evergreen", "cardinal"];

/** One payer in one quarter. `decisions` and `denials` are counts; the approved-as-asked rate each leaves rounds to the canonical percentage. */
export interface PayerBase {
  decisions: number;
  /** Denied outright or approved in part: everything that was not approved as asked. */
  denials: number;
  /** The canonical approved-as-asked percentage these counts must round to. */
  rate: number;
  /** Requests where FLO's advice was applied. */
  adviceN: number;
  /** Agent drafts, and how they were edited (percent, adds to 100). */
  draftsN: number;
  written: number;
  light: number;
  rewritten: number;
  /** Appeals ruled on, how many of them were overturned or partly restored, and denials the clinic accepted. */
  appeals: number;
  overturned: number;
  accepted: number;
}
export const BASE: Record<BuiltInPayerId, PayerBase> = {
  cardinal: { decisions: 382, denials: 141, rate: 63, adviceN: 301, draftsN: 342, written: 64, light: 29, rewritten: 7, appeals: 38, overturned: 21, accepted: 6 },
  summit: { decisions: 250, denials: 65, rate: 74, adviceN: 205, draftsN: 231, written: 70, light: 25, rewritten: 5, appeals: 21, overturned: 12, accepted: 4 },
  evergreen: { decisions: 170, denials: 53, rate: 69, adviceN: 133, draftsN: 148, written: 66, light: 28, rewritten: 6, appeals: 12, overturned: 6, accepted: 2 },
  beacon: { decisions: 110, denials: 21, rate: 81, adviceN: 94, draftsN: 101, written: 72, light: 24, rewritten: 4, appeals: 8, overturned: 5, accepted: 1 },
  harborview: { decisions: 100, denials: 23, rate: 77, adviceN: 78, draftsN: 90, written: 70, light: 25, rewritten: 5, appeals: 14, overturned: 8, accepted: 3 },
  lakeshore: { decisions: 58, denials: 8, rate: 86, adviceN: 17, draftsN: 54, written: 75, light: 21, rewritten: 4, appeals: 3, overturned: 2, accepted: 1 },
};

/** Share of the drafts that were approved in full or in part, by edit class: sent as written, light edits, rewritten. */
export const EDIT_APPROVAL: [number, number, number] = [89, 76, 45];
/** Share of the requests where advice was applied that were approved in full or in part, across all payers. */
export const ADVICE_WORKS = 84;

export interface Reason {
  label: string;
  /** One line for the top-denial-cause figure. */
  short: string;
  payerId: BuiltInPayerId;
  /** How often the reason is cited, relative to the payer's other reasons. A quarter spreads the payer's denials over its reasons in these proportions. */
  count: number;
  /** True when the team can fix it before sending: missing or thin documentation, late notice, incomplete certification, a duplicate request. */
  preventable: boolean;
}
/** The first row of each payer is its most common reason. */
export const REASONS: Reason[] = [
  { label: "Continued-stay evidence incomplete", short: "Thin continued-stay evidence", payerId: "cardinal", count: 89, preventable: true },
  { label: "Units requested above criteria", short: "Units above criteria", payerId: "cardinal", count: 41, preventable: false },
  { label: "Missing recent therapy notes", short: "Missing therapy notes", payerId: "cardinal", count: 27, preventable: true },
  { label: "Peer-to-peer window missed", short: "Peer-to-peer window missed", payerId: "cardinal", count: 14, preventable: true },
  { label: "Recertification filed too late", short: "Recertification filed late", payerId: "harborview", count: 74, preventable: true },
  { label: "Missing physician certification", short: "Missing certification", payerId: "harborview", count: 31, preventable: true },
  { label: "Fax pages unreadable", short: "Unreadable fax pages", payerId: "harborview", count: 12, preventable: true },
  { label: "Partial approval without a stated reason", short: "Partial approvals unexplained", payerId: "evergreen", count: 61, preventable: false },
  { label: "Phone confirmation not on file", short: "No phone confirmation", payerId: "evergreen", count: 22, preventable: true },
  { label: "Recertification filed too late", short: "Recertification filed late", payerId: "evergreen", count: 11, preventable: true },
  { label: "Level of care does not match mood severity", short: "Level of care vs mood severity", payerId: "summit", count: 48, preventable: false },
  { label: "Retro-authorization window missed", short: "Retro window missed", payerId: "summit", count: 29, preventable: true },
  { label: "Missing ASAM dimension ratings", short: "Missing ASAM ratings", payerId: "summit", count: 21, preventable: true },
  { label: "Duplicate request", short: "Duplicate request", payerId: "summit", count: 12, preventable: true },
  { label: "Step-down plan not named", short: "Step-down plan not named", payerId: "beacon", count: 39, preventable: true },
  { label: "Out-of-network flag in error", short: "Network flag in error", payerId: "beacon", count: 14, preventable: false },
  { label: "Missing level-of-care form", short: "Missing form", payerId: "beacon", count: 9, preventable: true },
  { label: "Authorization number missing on the claim", short: "Number missing on claim", payerId: "lakeshore", count: 6, preventable: true },
  { label: "Units above the plan limit", short: "Units above plan limit", payerId: "lakeshore", count: 5, preventable: false },
  { label: "Late notice", short: "Late notice", payerId: "lakeshore", count: 3, preventable: true },
];
export const reasonsOf = (payerId: BuiltInPayerId): Reason[] => REASONS.filter((r) => r.payerId === payerId);

/** The steps FLO suggests. `base` is how many requests applied the step in a quarter across all payers, `approved` the share approved
    in full or in part, `affinity` how much more or less the step matters at each payer. */
export interface HelpAction {
  label: string;
  base: number;
  approved: number;
  affinity: Record<BuiltInPayerId, number>;
}
export const ACTIONS: HelpAction[] = [
  { label: "Document depression severity with dated scores", base: 389, approved: 91, affinity: { cardinal: 1.25, summit: 1.1, evergreen: 0.9, beacon: 0.8, harborview: 0.8, lakeshore: 0.7 } },
  { label: "Flag and appeal partial unit approvals before the window closes", base: 312, approved: 88, affinity: { cardinal: 0.9, summit: 0.8, evergreen: 1.9, beacon: 0.6, harborview: 0.9, lakeshore: 0.5 } },
  { label: "Name the step-down provider in the first request", base: 276, approved: 85, affinity: { cardinal: 0.8, summit: 1.0, evergreen: 0.8, beacon: 1.9, harborview: 1.0, lakeshore: 0.9 } },
  { label: "File recertification 72 hours before the unit limit", base: 198, approved: 83, affinity: { cardinal: 0.9, summit: 0.9, evergreen: 0.9, beacon: 0.9, harborview: 2.1, lakeshore: 0.8 } },
  { label: "Attach the last 14 days of therapy notes", base: 164, approved: 80, affinity: { cardinal: 1.8, summit: 0.9, evergreen: 0.7, beacon: 0.6, harborview: 0.8, lakeshore: 0.5 } },
  { label: "Answer an information request within 24 hours", base: 141, approved: 79, affinity: { cardinal: 1.0, summit: 1.2, evergreen: 1.1, beacon: 0.7, harborview: 1.3, lakeshore: 0.6 } },
];

/** Spreads `total` over `weights` in whole numbers that add up to `total` (largest remainder, ties go to the earlier one). */
export function apportion(total: number, weights: number[]): number[] {
  const weight = weights.reduce((a, b) => a + b, 0);
  if (!total || !weight) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / weight);
  const out = raw.map(Math.floor);
  const left = total - out.reduce((a, b) => a + b, 0);
  raw
    .map((r, i) => ({ i, f: r - Math.floor(r) }))
    .sort((a, b) => b.f - a.f || a.i - b.i)
    .slice(0, left)
    .forEach(({ i }) => {
      out[i] += 1;
    });
  return out;
}
