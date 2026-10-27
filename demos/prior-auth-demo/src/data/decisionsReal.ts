import type { DxId, EditKind, Outcome, P2pState, AppealState, PopulationId } from "./decisionTypes";
import { SEED_ACCEPT_DENIAL } from "./denials";
import { SEED_LEDGER } from "./manager";
import { QUEUE_ITEMS, dxKeyFor, type DxKey, type RequestKind } from "./queue";
import { SEED_REQUESTS } from "./seed";
import type { BuiltInPayerId, Program } from "./types";

/* The cases the rest of the demo already has, as payer decisions: the eight open denials in Denial Intelligence and the approvals that
   created the Case Manager ledger. They sit inside the dataset's quarter, so every figure counts them, and each one links to its real page. */

export interface RealDecision {
  id: string;
  denialId?: string;
  linkId?: string;
  caseId: string;
  initials: string;
  age: number;
  payerId: BuiltInPayerId;
  program: Program;
  kind: RequestKind;
  dx: DxId;
  population: PopulationId;
  outcome: Outcome;
  day: number;
  unit: "days" | "units";
  requested: number;
  approvedAmt: number;
  reason?: string;
  p2p: P2pState;
  appeal: AppealState;
  edit?: EditKind;
}

const DX_OF: Record<DxKey, DxId> = { aud: "aud", oud: "oud", stim: "stim", cann: "stim", mdd: "cooc", gad: "cooc" };

/** The diagnosis group a queue or ledger case has: the queue's own cluster, which says "with alcohol use" for depression and anxiety, so those are co-occurring. */
function dxOfCase(id: string, program: Program): DxId {
  const item = QUEUE_ITEMS.find((i) => i.id === id);
  return DX_OF[item?.dxKey ?? dxKeyFor(id, program)];
}

function kindOfNote(note: string): RequestKind {
  if (/^Recertification/.test(note)) return "reauth";
  if (/^Retro/.test(note)) return "retro";
  if (/^Step-up/.test(note)) return "modify";
  if (/^(Initial|Admission|Active)/.test(note)) return "initial";
  return "concurrent";
}

const populationOf = (payerId: BuiltInPayerId, age: number, kind: RequestKind): PopulationId => {
  if (age < 18) return "adolescent";
  if (payerId === "harborview" && age >= 60) return "dual";
  if (kind === "initial") return "first";
  if (kind === "concurrent" || kind === "reauth") return "prior";
  return "adult";
};

/** The eight open denials, by hand: what the payer decided and why, and what has been done so far. D-3318 and D-3297 have calls booked,
    D-3279, D-3284 and D-3272 have an appeal filed with no ruling yet, D-3301 is being drafted and D-3306 is the one that may be accepted. */
interface DenialSpec {
  id: string;
  caseId: string;
  dx: DxId;
  kind: RequestKind;
  reason: string;
  outcome: Outcome;
  requested: number;
  approvedAmt: number;
  p2p: P2pState;
  appeal: AppealState;
  day: number;
}
const DENIALS: DenialSpec[] = [
  { id: "D-3318", caseId: "R-0997", dx: "cooc", kind: "concurrent", reason: "Continued-stay evidence incomplete", outcome: "partial", requested: 14, approvedAmt: 7, p2p: "scheduled", appeal: "none", day: 1 },
  { id: "D-3297", caseId: "I-2141", dx: "trauma", kind: "reauth", reason: "Units requested above criteria", outcome: "partial", requested: 48, approvedAmt: 30, p2p: "scheduled", appeal: "none", day: 0 },
  { id: "D-3290", caseId: "P-1544", dx: "mood", kind: "initial", reason: "Peer-to-peer window missed", outcome: "denied", requested: 10, approvedAmt: 0, p2p: "none", appeal: "none", day: 0 },
  { id: "D-3279", caseId: "R-0902-b", dx: "aud", kind: "initial", reason: "Missing level-of-care form", outcome: "denied", requested: 14, approvedAmt: 0, p2p: "stood", appeal: "pending", day: 15 },
  { id: "D-3284", caseId: "R-0931", dx: "aud", kind: "retro", reason: "Phone confirmation not on file", outcome: "denied", requested: 5, approvedAmt: 0, p2p: "none", appeal: "pending", day: 4 },
  { id: "D-3272", caseId: "P-1488", dx: "aud", kind: "reauth", reason: "Recertification filed too late", outcome: "partial", requested: 10, approvedAmt: 5, p2p: "none", appeal: "pending", day: 11 },
  { id: "D-3301", caseId: "R-0969", dx: "mood", kind: "initial", reason: "Level of care does not match mood severity", outcome: "denied", requested: 14, approvedAmt: 0, p2p: "none", appeal: "none", day: 2 },
  { id: "D-3306", caseId: "I-2127", dx: "aud", kind: "retro", reason: "Retro-authorization window missed", outcome: "denied", requested: 24, approvedAmt: 0, p2p: "none", appeal: "none", day: 3 },
];

function realDenials(): RealDecision[] {
  return DENIALS.map((d) => {
    const req = [...SEED_REQUESTS, SEED_ACCEPT_DENIAL].find((r) => r.id === d.id);
    const payerId = (req?.payerId ?? "cardinal") as BuiltInPayerId;
    const program = req?.program ?? "RES";
    const age = req?.patient.age ?? 40;
    return {
      id: d.id,
      denialId: d.id,
      caseId: d.caseId,
      initials: req?.patient.initials ?? "A.B.",
      age,
      payerId,
      program,
      kind: d.kind,
      dx: d.dx,
      population: populationOf(payerId, age, d.kind),
      outcome: d.outcome,
      day: d.day,
      unit: program === "IOP" ? "units" : "days",
      requested: d.requested,
      approvedAmt: d.approvedAmt,
      reason: d.reason,
      p2p: d.p2p,
      appeal: d.appeal,
    };
  });
}

/** The approvals behind the 47 ledger cases that have units (D-3318 is the partial approval above). The decision is dated from how much of the approval is used. */
function realApprovals(): RealDecision[] {
  const decidedToday = new Set(SEED_REQUESTS.filter((r) => r.decidedToday && r.outcome === "approved").map((r) => r.id));
  return SEED_LEDGER.filter((c) => c.total !== null && c.id !== "D-3318").map((c) => {
    const used = c.used ?? 0;
    const perUnit = c.program === "IOP" ? 1.5 : 1;
    const day = decidedToday.has(c.id) ? 0 : Math.min(58, used > 0 ? Math.max(1, Math.round(used * perUnit)) : 1);
    const kind = kindOfNote(c.note);
    return {
      id: c.id,
      caseId: c.caseId,
      initials: c.initials,
      age: c.age,
      payerId: c.payerId as BuiltInPayerId,
      program: c.program,
      kind,
      dx: dxOfCase(c.id, c.program),
      population: populationOf(c.payerId as BuiltInPayerId, c.age, kind),
      outcome: "approved" as const,
      day,
      unit: c.unit,
      requested: c.total ?? 0,
      approvedAmt: c.total ?? 0,
      p2p: "none" as const,
      appeal: "none" as const,
    };
  });
}

/** R-1042 (J.M., 34, Sentara, residential admission) is still being prepared, so it has no decision yet. Its chart does record an intensive outpatient
    attempt in 2025 that ended in week 3 when housing was lost: that approval is in the history, and its case panel opens R-1042. */
const PRIOR: RealDecision[] = [
  { id: "I-1993", linkId: "R-1042", caseId: "R-1042", initials: "J.M.", age: 34, payerId: "summit", program: "IOP", kind: "initial", dx: "cooc", population: "first", outcome: "approved", day: 355, unit: "units", requested: 36, approvedAmt: 36, p2p: "none", appeal: "none" },
];

export const REAL_DECISIONS: RealDecision[] = [...realDenials(), ...realApprovals(), ...PRIOR];

/** Every id that opens a real page in the demo: a queue row, a Dashboard request or its case, a ledger case. */
export const DEMO_CASE_IDS: Set<string> = new Set([
  ...QUEUE_ITEMS.map((i) => i.id),
  ...SEED_REQUESTS.flatMap((r) => [r.id, r.caseId]),
  ...SEED_LEDGER.flatMap((c) => [c.id, c.caseId]),
]);
