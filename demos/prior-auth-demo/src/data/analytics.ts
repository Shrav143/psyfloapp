import type { PayerId, Program } from "./types";

/* Analytics. "This quarter" with all payers and all programs is the canonical set: 1,070 decisions, 71% approved as asked
   (so 29% denied, 311 denials), 84% advice taken works, 75% sent without edits; approval by payer Lakeshore 86, Beacon 81,
   Harborview 77, Summit 74, Evergreen 69, Cardinal 63; edits 68 / 27 / 5. Appeals overturned 56% of 96 decided, 17 denials accepted.
   Turnaround is the decision-weighted average of each payer's avgDecisionDays in data/seed.ts (2.4 days).
   Every other view (another period, one payer, one program) is derived from the tables below. */

export const MIN_DECISIONS = 20;

export type PeriodId = "quarter" | "last_quarter" | "year";
export type PayerFilter = PayerId | "all";

export interface PeriodInfo {
  id: PeriodId;
  label: string;
  /** "this quarter", used in sentences. */
  phrase: string;
  /** What the trend line compares with. */
  prev: string;
  /** Volume relative to this quarter. */
  scale: number;
}
export const PERIODS: PeriodInfo[] = [
  { id: "quarter", label: "This quarter", phrase: "this quarter", prev: "last quarter", scale: 1 },
  { id: "last_quarter", label: "Last quarter", phrase: "last quarter", prev: "the quarter before", scale: 0.96 },
  { id: "year", label: "Last 12 months", phrase: "the last 12 months", prev: "the year before", scale: 3.9 },
];

/** The Program filter. The model has no per-program split, so these weights are Demo values. Shares add to 100, and the shifts
    and multipliers are balanced against those shares, so "All programs" stays the canonical set. */
export type ProgramFilter = Program | "all";
export interface ProgramWeights {
  label: string;
  /** Share of decisions, in percent. */
  share: number;
  /** Points added to every payer's approved-as-asked rate. Weighted by share they add to 0. */
  approvalShift: number;
  /** Multiplier on a payer's average decision time. Weighted by share it averages 1. */
  turnaround: number;
  /** Points added to "advice taken works". */
  adviceShift: number;
  /** Points moved between "sent as written" and "light edits". */
  writtenShift: number;
  /** Weight on denial reasons the team can fix before sending, and on the others. Each averages 1 across programs. */
  preventable: number;
  other: number;
}
export const PROGRAM_WEIGHTS: Record<Program, ProgramWeights> = {
  RES: { label: "Residential", share: 40, approvalShift: -3, turnaround: 1.1, adviceShift: -2, writtenShift: -3, preventable: 0.9, other: 1.13 },
  IOP: { label: "IOP", share: 30, approvalShift: 4, turnaround: 0.95, adviceShift: 3, writtenShift: 4, preventable: 1.1, other: 0.86 },
  PHP: { label: "PHP", share: 20, approvalShift: 2, turnaround: 0.95, adviceShift: 1, writtenShift: 2, preventable: 1.1, other: 0.88 },
  WM: { label: "Withdrawal management", share: 10, approvalShift: -4, turnaround: 0.85, adviceShift: -3, writtenShift: -4, preventable: 0.9, other: 1.14 },
};
export const PROGRAM_ORDER: Program[] = ["RES", "IOP", "PHP", "WM"];

/** Demo values: how decision times drift in other periods (a multiplier on the payer averages), and what each period is compared with. */
export const TURNAROUND_SCALE: Record<PeriodId, number> = { quarter: 1, last_quarter: 1.06, year: 1.04 };
export const TURNAROUND_PREV: Record<PeriodId, number> = { quarter: 1.06, last_quarter: 1.12, year: 1.1 };

export const PAYER_ORDER: PayerId[] = ["lakeshore", "beacon", "harborview", "summit", "evergreen", "cardinal"];

export interface PayerBase {
  /** Decisions in a quarter. They add up to 1,070. */
  decisions: number;
  /** Requests in a quarter where advice was applied, and the share approved. */
  adviceN: number;
  advice: number;
  /** Agent drafts in a quarter and how they were edited (percent, adds to 100). */
  draftsN: number;
  written: number;
  light: number;
  rewritten: number;
}
export const BASE: Record<PayerId, PayerBase> = {
  cardinal: { decisions: 380, adviceN: 301, advice: 81, draftsN: 342, written: 64, light: 29, rewritten: 7 },
  summit: { decisions: 250, adviceN: 205, advice: 85, draftsN: 231, written: 70, light: 25, rewritten: 5 },
  evergreen: { decisions: 170, adviceN: 133, advice: 82, draftsN: 148, written: 66, light: 28, rewritten: 6 },
  beacon: { decisions: 110, adviceN: 94, advice: 88, draftsN: 101, written: 72, light: 24, rewritten: 4 },
  harborview: { decisions: 100, adviceN: 78, advice: 86, draftsN: 90, written: 70, light: 25, rewritten: 5 },
  lakeshore: { decisions: 60, adviceN: 17, advice: 90, draftsN: 54, written: 75, light: 21, rewritten: 4 },
};

/** Approved as asked, by payer and period. This quarter is the canonical set. */
export const APPROVED: Record<PeriodId, Record<PayerId, number>> = {
  quarter: { lakeshore: 86, beacon: 81, harborview: 77, summit: 74, evergreen: 69, cardinal: 63 },
  last_quarter: { lakeshore: 82, beacon: 77, harborview: 72, summit: 68, evergreen: 62, cardinal: 56 },
  year: { lakeshore: 84, beacon: 79, harborview: 75, summit: 72, evergreen: 66, cardinal: 60 },
};
/** The same payer one period earlier, for the trend line. This quarter compares with the table above. */
export const APPROVED_PREV: Record<PeriodId, Record<PayerId, number>> = {
  quarter: APPROVED.last_quarter,
  last_quarter: { lakeshore: 80, beacon: 75, harborview: 70, summit: 66, evergreen: 60, cardinal: 54 },
  year: { lakeshore: 77, beacon: 72, harborview: 68, summit: 64, evergreen: 58, cardinal: 52 },
};

/** Whole-practice figures that are not sums of the payer tables. Approval and denial rates are always summed from the payers. */
export interface AllFigures {
  advice: number;
  noEdits: number;
  written: number;
  light: number;
  rewritten: number;
  /** Share approved for as written, light edits, rewritten. */
  editApproval: [number, number, number];
}
export const ALL: Record<PeriodId, AllFigures> = {
  quarter: { advice: 84, noEdits: 75, written: 68, light: 27, rewritten: 5, editApproval: [89, 76, 45] },
  last_quarter: { advice: 81, noEdits: 71, written: 64, light: 29, rewritten: 7, editApproval: [86, 72, 41] },
  year: { advice: 79, noEdits: 70, written: 62, light: 31, rewritten: 7, editApproval: [85, 72, 42] },
};

export interface Reason {
  label: string;
  /** One line for the Top denial cause tile. */
  short: string;
  payerId: PayerId;
  /** How often the reason is cited, relative to the payer's other reasons. A view spreads the payer's denials over its reasons in these proportions. */
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

export interface HelpAction {
  label: string;
  /** Times applied in a quarter across all payers, and the share approved. */
  base: number;
  approved: number;
  /** How much more or less this step matters at each payer. */
  affinity: Record<PayerId, number>;
}
export const ACTIONS: HelpAction[] = [
  { label: "Document depression severity with dated scores", base: 389, approved: 91, affinity: { cardinal: 1.25, summit: 1.1, evergreen: 0.9, beacon: 0.8, harborview: 0.8, lakeshore: 0.7 } },
  { label: "Flag and appeal partial unit approvals before the window closes", base: 312, approved: 88, affinity: { cardinal: 0.9, summit: 0.8, evergreen: 1.9, beacon: 0.6, harborview: 0.9, lakeshore: 0.5 } },
  { label: "Name the step-down provider in the first request", base: 276, approved: 85, affinity: { cardinal: 0.8, summit: 1.0, evergreen: 0.8, beacon: 1.9, harborview: 1.0, lakeshore: 0.9 } },
  { label: "File recertification 72 hours before the unit limit", base: 198, approved: 83, affinity: { cardinal: 0.9, summit: 0.9, evergreen: 0.9, beacon: 0.9, harborview: 2.1, lakeshore: 0.8 } },
  { label: "Attach the last 14 days of therapy notes", base: 164, approved: 80, affinity: { cardinal: 1.8, summit: 0.9, evergreen: 0.7, beacon: 0.6, harborview: 0.8, lakeshore: 0.5 } },
  { label: "Answer an information request within 24 hours", base: 141, approved: 79, affinity: { cardinal: 1.0, summit: 1.2, evergreen: 1.1, beacon: 0.7, harborview: 1.3, lakeshore: 0.6 } },
];

/** Appeals a payer has ruled on in a quarter, and the share overturned or partly restored (percent). What Denial Intelligence records is added on top. */
export const APPEALS: Record<PayerId, { decided: number; rate: number }> = {
  cardinal: { decided: 38, rate: 55 },
  summit: { decided: 21, rate: 57 },
  evergreen: { decided: 12, rate: 50 },
  harborview: { decided: 14, rate: 57 },
  beacon: { decided: 8, rate: 63 },
  lakeshore: { decided: 3, rate: 67 },
};
/** Other periods drift a little from this quarter, in percentage points. */
export const OVERTURN_SHIFT: Record<PeriodId, number> = { quarter: 0, last_quarter: -3, year: -4 };

/** Denials the clinic accepted in a quarter. Each denial accepted in Denial Intelligence is added on top. */
export const ACCEPTED: Record<PayerId, number> = { cardinal: 6, summit: 4, evergreen: 2, harborview: 3, beacon: 1, lakeshore: 1 };
