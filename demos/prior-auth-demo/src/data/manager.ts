import { DAY, HOUR } from "@/lib/time";
import type { PayerId, Program } from "./types";

/* Case Manager ledger. 56 active cases. Ids that also appear on the Dashboard use the same initials, age,
   payer and program as src/data/seed.ts. Nine cases are not yet approved (no units), so 47 have a review this week. */

export type LedgerStatus = "needs_action" | "review_due" | "awaiting" | "on_track";
export const LEDGER_STATUS_LABEL: Record<LedgerStatus, string> = { needs_action: "Needs action", review_due: "Review due", awaiting: "Awaiting payer", on_track: "On track" };

/** The next event that binds. The clock text is built from the kind and the due time, so it moves with the demo clock. */
export type ClockKind = "notice" | "window" | "p2p" | "answer" | "expiry" | "review" | "decision" | "units";

export interface LedgerCase {
  id: string;
  /** The case page this row opens. Differs from `id` for a denial, which belongs to an earlier case. */
  caseId: string;
  initials: string;
  age: number;
  program: Program;
  payerId: PayerId;
  /** Review type or stay description, shown under the level-of-care chip. */
  note: string;
  used: number | null;
  total: number | null;
  /** Days for residential, PHP and detox; units for IOP. */
  unit: "days" | "units";
  clockKind: ClockKind;
  /** Demo minutes (0 = Tue 20 Oct, 10:42 am) when the binding event happens. */
  dueAt: number;
  chance: number;
  status: LedgerStatus;
}

const h = (n: number) => n * HOUR;
const d = (n: number) => n * DAY;
const NA: LedgerStatus = "needs_action";
const RD: LedgerStatus = "review_due";
const AW: LedgerStatus = "awaiting";
const OT: LedgerStatus = "on_track";

type Row = [id: string, who: string, age: number, prog: Program, payer: PayerId, note: string, used: number | null, total: number | null, kind: ClockKind, dueAt: number, chance: number, status: LedgerStatus, caseId?: string];

const ROWS: Row[] = [
  /* the rows the mockup shows first */
  ["R-1042", "J.M.", 34, "RES", "summit", "Admission", null, null, "notice", h(5), 62, NA],
  ["R-1101", "K.W.", 26, "RES", "summit", "Retro-authorization", null, null, "window", h(18), 47, NA],
  ["D-3318", "M.C.", 38, "RES", "cardinal", "Partial · 7 of 14 days", 7, 7, "p2p", h(36), 64, NA, "R-0997"],
  ["I-2207", "T.R.", 29, "IOP", "cardinal", "Recertification", 38, 48, "expiry", d(3), 71, RD],
  ["R-0988", "D.L.", 41, "RES", "beacon", "Continued stay 3", 10, 21, "review", h(5) + 18, 79, RD],
  ["P-1573", "A.S.", 51, "PHP", "harborview", "Concurrent", 8, 15, "expiry", d(6), 84, AW],
  ["I-2190", "R.P.", 31, "IOP", "lakeshore", "Initial", null, null, "decision", d(2), 86, AW],
  ["I-2144", "G.N.", 33, "IOP", "summit", "Active", 16, 48, "units", d(30), 88, OT],
  /* approved today on the Dashboard */
  ["R-0951", "F.W.", 47, "RES", "evergreen", "Continued stay", 0, 14, "expiry", d(14), 82, OT],
  ["R-0944", "M.B.", 40, "RES", "beacon", "Continued stay", 0, 7, "expiry", d(7), 85, OT],
  ["R-0960", "H.V.", 39, "RES", "summit", "Recertification", 0, 7, "expiry", d(7), 81, OT],
  ["I-2171", "Q.Z.", 25, "IOP", "lakeshore", "Initial", 0, 24, "units", d(14), 90, OT],
  /* next stay requested, waiting on the payer or on us */
  ["R-0902", "G.W.", 50, "RES", "summit", "Continued stay", 14, 14, "decision", d(2), 76, AW],
  ["R-0934", "E.Y.", 38, "RES", "beacon", "Continued stay 2", 14, 14, "decision", d(2) + h(2), 88, AW],
  ["R-1021", "V.P.", 48, "RES", "cardinal", "Continued stay", 14, 14, "decision", d(2) + h(5), 58, AW],
  ["P-1580", "F.L.", 35, "PHP", "summit", "Continued stay", 10, 10, "decision", d(3), 80, AW],
  ["R-0912", "C.D.", 44, "RES", "evergreen", "Continued stay", 21, 21, "decision", -h(20), 67, NA],
  ["P-1499", "E.S.", 42, "PHP", "harborview", "Continued stay", 9, 12, "answer", h(20), 74, NA],
  ["P-1602", "R.H.", 39, "PHP", "cardinal", "Continued stay", 7, 10, "decision", d(3) + h(4), 69, AW],
  ["P-1590", "Z.T.", 46, "PHP", "harborview", "Continued stay", 10, 12, "decision", d(4), 79, AW],
  ["I-2158", "D.O.", 43, "IOP", "summit", "Recertification", 44, 48, "decision", d(2) + h(9), 85, AW],
  ["I-2236", "B.J.", 30, "IOP", "cardinal", "Recertification", 46, 48, "decision", d(3) + h(2), 72, AW],
  ["I-2218", "O.H.", 28, "IOP", "cardinal", "Continued stay", 30, 36, "answer", h(22), 68, NA],
  ["R-0975", "B.N.", 53, "RES", "evergreen", "Continued stay", 14, 14, "answer", h(30), 71, NA],
  /* first requests still with the payer or being prepared */
  ["I-2262", "S.N.", 31, "IOP", "lakeshore", "Initial", null, null, "notice", h(40), 84, OT],
  ["I-2231", "S.B.", 37, "IOP", "cardinal", "Initial", null, null, "decision", d(2) + h(1), 74, AW],
  ["R-1088", "L.T.", 45, "RES", "beacon", "Initial", null, null, "decision", d(2) + h(3), 83, AW],
  ["P-1611", "A.K.", 33, "PHP", "summit", "Initial", null, null, "decision", d(3) + h(6), 81, AW],
  ["I-2249", "C.G.", 27, "IOP", "cardinal", "Initial", null, null, "decision", d(3) + h(1), 66, AW],
  ["R-1015", "W.D.", 57, "RES", "harborview", "Initial", null, null, "decision", d(4), 70, AW],
  /* the rest of the ledger */
  ["R-0881", "T.E.", 35, "RES", "cardinal", "Continued stay 2", 12, 14, "expiry", h(20), 61, NA],
  ["I-2193", "L.M.", 42, "IOP", "summit", "Continued stay", 46, 48, "expiry", h(14), 77, NA],
  ["P-1551", "K.A.", 37, "PHP", "evergreen", "Concurrent", 9, 10, "window", h(30), 59, NA],
  ["R-0899", "N.F.", 29, "WM", "cardinal", "Step-up", 3, 5, "notice", h(9), 56, NA],
  ["R-0856", "J.S.", 51, "RES", "summit", "Continued stay 2", 12, 14, "review", h(2), 78, RD],
  ["R-0873", "A.G.", 33, "RES", "beacon", "Continued stay 4", 18, 21, "review", h(6), 84, RD],
  ["P-1538", "M.H.", 44, "PHP", "harborview", "Concurrent", 8, 10, "review", h(8), 73, RD],
  ["I-2179", "R.V.", 26, "IOP", "cardinal", "Recertification", 40, 48, "review", d(1), 68, RD],
  ["I-2201", "D.W.", 39, "IOP", "beacon", "Continued stay", 21, 24, "review", d(1) + h(3), 82, RD],
  ["R-0864", "P.N.", 47, "RES", "evergreen", "Continued stay 3", 13, 14, "review", d(1), 66, RD],
  ["P-1546", "S.O.", 58, "PHP", "summit", "Concurrent", 9, 10, "review", d(2), 79, RD],
  ["I-2185", "C.L.", 32, "IOP", "lakeshore", "Recertification", 44, 48, "review", d(2), 87, RD],
  ["R-0890", "B.K.", 41, "RES", "cardinal", "Continued stay 2", 9, 14, "review", d(2) + h(5), 64, RD],
  ["P-1559", "W.R.", 36, "PHP", "beacon", "Concurrent", 7, 10, "review", d(3), 85, RD],
  ["I-2212", "H.T.", 30, "IOP", "summit", "Continued stay", 22, 24, "review", d(3), 80, RD],
  ["R-0878", "E.D.", 54, "RES", "harborview", "Continued stay 2", 10, 14, "review", d(4), 75, RD],
  ["R-0845", "G.P.", 38, "RES", "lakeshore", "Continued stay", 6, 21, "expiry", d(11), 89, OT],
  ["I-2150", "V.C.", 28, "IOP", "beacon", "Active", 10, 36, "units", d(25), 91, OT],
  ["P-1520", "O.B.", 49, "PHP", "lakeshore", "Active", 4, 15, "expiry", d(9), 88, OT],
  ["R-0834", "Y.M.", 35, "RES", "summit", "Continued stay 2", 5, 21, "expiry", d(14), 86, OT],
  ["I-2164", "F.H.", 34, "IOP", "evergreen", "Active", 12, 36, "units", d(20), 83, OT],
  ["P-1531", "Z.L.", 43, "PHP", "summit", "Active", 3, 15, "expiry", d(10), 87, OT],
  ["R-0848", "K.T.", 31, "RES", "beacon", "Admission", 2, 14, "expiry", d(12), 90, OT],
  ["I-2157", "U.A.", 40, "IOP", "harborview", "Active", 8, 24, "units", d(30), 85, OT],
  ["I-2170", "N.B.", 23, "IOP", "summit", "Active", 14, 48, "units", d(26), 89, OT],
  ["R-0839", "L.J.", 46, "RES", "evergreen", "Continued stay", 4, 14, "expiry", d(10), 81, OT],
];

export const SEED_LEDGER: LedgerCase[] = ROWS.map(([id, initials, age, program, payerId, note, used, total, clockKind, dueAt, chance, status, caseId]) => ({
  id, caseId: caseId ?? id, initials, age, program, payerId, note, used, total, unit: program === "IOP" ? "units" : "days", clockKind, dueAt, chance, status,
}));
