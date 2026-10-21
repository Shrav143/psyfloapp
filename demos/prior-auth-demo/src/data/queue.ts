import type { AgentKey, PayerId, Program, PsyRequest, RequestType } from "./types";
import { PROGRAM_LABEL } from "./types";

/* The Authorizations queue: 56 open requests in three priority bands. The band totals shown on the
   page are computed from these rows, so the amounts and chances below add up to the canonical numbers:
   Act now 5 / $86K / 58% / 5 h, Due within 24 hours 14 / $142K / 76% / 3 h, Due this week 37 / $310K / 83% / 2 d. */

export type Band = "now" | "day" | "week";
export type Phase = "preparing" | "ready" | "payer" | "denial";
export type Trend = "up" | "down" | "flat";
export type DxKey = "aud" | "oud" | "stim" | "cann" | "mdd" | "gad";
export interface Score { label: string; value: string; trend?: Trend }

export interface QueueItem {
  id: string;
  initials: string;
  age: number;
  payerId: PayerId;
  program: Program;
  type: RequestType;
  levelLabel: string;
  dxKey: DxKey;
  dx: string;
  scores: Score[];
  band: Band;
  dueAt: number; // demo minutes
  dueVerb: string;
  atStake: number;
  chance: number;
  liftPts: number;
  liftLabel: string;
  phase: Phase;
  agent: AgentKey;
  status: string;
  needsInput: boolean;
  coverageFix: boolean;
  signal: boolean; // affected by the Cardinal IOP payer signal
  rule?: string;
  days: number; // days requested
}

export const BAND_META: Record<Band, { name: string; dot: string }> = {
  now: { name: "Act now: most money at risk", dot: "#B5553A" },
  day: { name: "Due within 24 hours", dot: "#A87A26" },
  week: { name: "Due this week", dot: "#739C8E" },
};
export const BANDS: Band[] = ["now", "day", "week"];
export const APPROVED_30D = 112;
export const DENIED_30D = 46;

export type StatusFilter = "all" | "input" | Phase;
export const STATUS_LABEL: Record<StatusFilter, string> = {
  all: "All statuses", input: "Needs your input", preparing: "Preparing", ready: "Ready to sign", payer: "With the payer", denial: "Denial route",
};

/* ------------------------------------------------------------------ diagnosis clusters and scores */
interface Scale { label: string; lo: number; hi: number; of?: number }
export const DX: Record<DxKey, { name: string; scales: Scale[] }> = {
  aud: { name: "Alcohol use disorder, severe", scales: [{ label: "AUDIT-C", lo: 8, hi: 12 }, { label: "PHQ-9", lo: 8, hi: 18 }, { label: "CIWA", lo: 4, hi: 14 }] },
  oud: { name: "Opioid use disorder", scales: [{ label: "COWS", lo: 4, hi: 12 }, { label: "DAST-10", lo: 5, hi: 9 }] },
  stim: { name: "Stimulant use disorder", scales: [{ label: "PHQ-9", lo: 8, hi: 16 }, { label: "Craving", lo: 3, hi: 8, of: 10 }] },
  cann: { name: "Cannabis use disorder", scales: [{ label: "DAST-10", lo: 4, hi: 8 }, { label: "PHQ-9", lo: 5, hi: 11 }] },
  mdd: { name: "Major depressive disorder with alcohol use", scales: [{ label: "PHQ-9", lo: 10, hi: 19 }, { label: "GAD-7", lo: 6, hi: 14 }] },
  gad: { name: "Generalized anxiety with substance use", scales: [{ label: "GAD-7", lo: 9, hi: 17 }, { label: "AUDIT-C", lo: 4, hi: 9 }] },
};
const DX_BY_PROGRAM: Record<Program, DxKey[]> = {
  RES: ["aud", "oud", "stim", "mdd"], WM: ["oud", "aud"], IOP: ["aud", "oud", "stim", "cann", "mdd", "gad"], PHP: ["aud", "mdd", "gad", "oud", "stim"],
};

export const hashOf = (s: string): number => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const TRENDS: Trend[] = ["down", "down", "flat", "up"];

export function dxKeyFor(id: string, program: Program): DxKey {
  const pool = DX_BY_PROGRAM[program];
  return pool[hashOf(id) % pool.length];
}
export function scoresFor(id: string, key: DxKey): Score[] {
  return DX[key].scales.slice(0, 2).map((s) => {
    const n = hashOf(id + s.label);
    return { label: s.label, value: `${s.lo + (n % (s.hi - s.lo + 1))}${s.of ? `/${s.of}` : ""}`, trend: TRENDS[(n >> 3) % 4] };
  });
}
const PHRASE: Record<RequestType, (n: number, p: Program) => string> = {
  "Initial request": () => "initial authorization", Admission: () => "admission", "Continued stay": (n) => `continued-stay review ${1 + (n % 4)}`,
  Recertification: (n, p) => (p === "IOP" || p === "PHP" ? `recertification at unit ${20 + (n % 20)} of 48` : `recertification at day ${14 + (n % 10)} of 28`),
  "Retro-authorization": () => "retro-authorization", "Peer-to-peer": () => "peer-to-peer call", Appeal: () => "appeal", Resubmission: () => "resubmission",
};
export const dxLine = (id: string, key: DxKey, type: RequestType, program: Program): string => `${DX[key].name} · ${PHRASE[type](hashOf(id), program)}`;
export const daysRequested = (p: Program): number => (p === "RES" ? 14 : p === "PHP" ? 10 : p === "IOP" ? 21 : 5);

const DEFAULT_VERB: Record<Phase, (t: RequestType) => string> = {
  preparing: (t) => (t === "Continued stay" || t === "Recertification" ? "Review due" : t === "Retro-authorization" ? "Window closes" : "Notice due"),
  ready: () => "Review due", payer: () => "Decision expected", denial: () => "P2P",
};
const STATUS_POOL: Record<Phase, [AgentKey, string][]> = {
  preparing: [["scribe", "Scribe is drafting the case"], ["reader", "Reader is reading the chart"], ["packet", "Packet is assembling the request"], ["criteria", "Criteria is matching the chart to the policy"]],
  ready: [["integrity", "Ready to sign. Integrity passed all four checks"]],
  payer: [["navigator", "Payer is reviewing. Navigator checks again in 30 minutes"], ["cadence", "Cadence is scheduling the next review"], ["navigator", "Payer has it. Navigator checks again in 15 minutes"]],
  denial: [["advocate", "Advocate is working the denial"]],
};

/* ------------------------------------------------------------------ rows */
interface Extra {
  dx?: string; dxKey?: DxKey; scores?: Score[]; level?: string; agent?: AgentKey; status?: string; verb?: string;
  needs?: boolean; cov?: boolean; signal?: boolean; rule?: string; lift?: number; liftLabel?: string;
}
type Row = [id: string, who: string, age: number, payer: PayerId, prog: Program, type: RequestType, dueHours: number, usd: number, chance: number, phase: Phase, extra?: Extra];

function make(band: Band, [id, initials, age, payerId, program, type, dueHours, atStake, chance, phase, x = {}]: Row): QueueItem {
  const dxKey = x.dxKey ?? dxKeyFor(id, program);
  const pool = STATUS_POOL[phase][hashOf(id) % STATUS_POOL[phase].length];
  const auto = phase === "preparing" ? (chance >= 85 ? 0 : Math.max(3, Math.min(16, Math.round((92 - chance) * 0.6)))) : phase === "ready" ? 3 : 0;
  const liftPts = x.lift ?? auto;
  return {
    id, initials, age, payerId, program, type, levelLabel: x.level ?? PROGRAM_LABEL[program], dxKey,
    dx: x.dx ?? dxLine(id, dxKey, type, program), scores: x.scores ?? scoresFor(id, dxKey), band, dueAt: dueHours * 60, dueVerb: x.verb ?? DEFAULT_VERB[phase](type),
    atStake, chance, liftPts, liftLabel: x.liftLabel ?? (liftPts > 0 ? `+${liftPts} pts possible` : phase === "payer" ? "waiting on the payer" : phase === "denial" ? "chance to overturn" : "on track"),
    phase, agent: x.agent ?? pool[0], status: x.status ?? pool[1], needsInput: !!x.needs, coverageFix: !!x.cov, signal: !!x.signal, rule: x.rule, days: daysRequested(program),
  };
}

const up = (label: string, value: string): Score => ({ label, value, trend: "up" });
const down = (label: string, value: string): Score => ({ label, value, trend: "down" });
const flat = (label: string, value: string): Score => ({ label, value, trend: "flat" });

const NOW_ROWS: Row[] = [
  ["R-1042", "J.M.", 34, "summit", "RES", "Admission", 5, 22400, 62, "preparing", { dxKey: "aud", dx: "Alcohol use disorder, severe, with recurrent depression · admission", scores: [{ label: "AUDIT-C", value: "11" }, up("PHQ-9", "17"), { label: "CIWA", value: "14 → 4" }], agent: "scribe", status: "Scribe is drafting the case", needs: true, verb: "Notice due", rule: "Summit expects a named step-down provider with the first request.", lift: 26, liftLabel: "+26 pts once drafted" }],
  ["R-1101", "K.W.", 26, "summit", "RES", "Retro-authorization", 18, 18900, 47, "preparing", { level: "Detox → Residential", dxKey: "oud", dx: "Opioid use disorder · retro-authorization", scores: [down("COWS", "9"), { label: "DAST-10", value: "8" }], agent: "packet", status: "Packet is assembling the request", cov: true, verb: "Window closes", lift: 14 }],
  ["D-3318", "M.C.", 38, "cardinal", "RES", "Peer-to-peer", 36, 22400, 64, "denial", { dxKey: "mdd", dx: "Denied 7 of 14 days · continued stay", scores: [flat("PHQ-9", "15"), { label: "Craving", value: "7/10" }], agent: "advocate", status: "Advocate has a peer-to-peer brief ready", verb: "P2P" }],
  ["R-0912", "C.D.", 44, "evergreen", "RES", "Continued stay", 22, 11600, 67, "payer", { agent: "caller", status: "Caller is phoning Evergreen for the decision", verb: "Review due" }],
  ["R-1117", "F.R.", 39, "harborview", "RES", "Continued stay", 30, 10700, 50, "preparing", { agent: "scribe", status: "Scribe is drafting the continued-stay review", needs: true, verb: "Review due", lift: 12 }],
];
const DAY_ROWS: Row[] = [
  ["R-0988", "D.L.", 41, "beacon", "RES", "Admission", 3, 9100, 79, "ready", { dxKey: "stim", dx: "Stimulant use disorder · admission", scores: [down("PHQ-9", "12"), down("Craving", "4/10")], agent: "integrity", status: "Waiting for Heather to sign", verb: "Review due", lift: 4 }],
  ["I-2207", "T.R.", 29, "cardinal", "IOP", "Recertification", 5, 5400, 71, "preparing", { dxKey: "oud", dx: "Opioid use disorder · recertification at unit 38 of 48", scores: [down("DAST-10", "8"), down("PHQ-9", "10")], agent: "packet", status: "Packet is drafting the recertification", needs: true, signal: true, verb: "Recert due", lift: 12 }],
  ["R-0870", "M.R.", 36, "summit", "RES", "Admission", 8, 18600, 82, "payer", { agent: "navigator", status: "Payer is reviewing. Navigator checks again in 22 minutes" }],
  ["I-2262", "S.N.", 31, "lakeshore", "IOP", "Initial request", 10, 4400, 84, "preparing", { agent: "reader", status: "Reader is reading the chart", verb: "Packet due" }],
  ["I-2218", "O.H.", 28, "cardinal", "IOP", "Continued stay", 14, 5900, 68, "payer", { agent: "packet", status: "Packet is drafting the answer to the payer's question", signal: true, verb: "Answer due" }],
  ["P-1499", "E.S.", 42, "harborview", "PHP", "Continued stay", 9, 8200, 74, "payer", { agent: "packet", status: "Packet drafted the answer. Waiting for your review", needs: true, verb: "Answer due" }],
  ["R-0975", "B.N.", 53, "evergreen", "RES", "Continued stay", 20, 10900, 71, "payer", { agent: "packet", status: "Packet is drafting the answer", verb: "Answer due" }],
  ["R-1021", "V.P.", 48, "cardinal", "RES", "Continued stay", 12, 9700, 58, "payer", { agent: "navigator", status: "Payer is reviewing. Navigator checks again in 15 minutes" }],
  ["I-2236", "B.J.", 30, "cardinal", "IOP", "Recertification", 16, 4200, 72, "payer", { signal: true, agent: "navigator", status: "Payer is reviewing. Navigator checks again in 30 minutes" }],
  ["I-2271", "V.S.", 35, "cardinal", "IOP", "Continued stay", 6, 4600, 75, "preparing", { agent: "scribe", status: "Scribe is drafting the continued-stay review", signal: true, verb: "Review due", lift: 8 }],
  ["R-1131", "H.N.", 45, "beacon", "RES", "Continued stay", 13, 20400, 84, "payer"],
  ["R-1138", "K.L.", 50, "summit", "RES", "Recertification", 15, 12200, 82, "preparing", { lift: 6 }],
  ["R-1142", "W.G.", 32, "lakeshore", "RES", "Admission", 18, 11000, 86, "ready"],
  ["R-1146", "Y.D.", 56, "evergreen", "RES", "Continued stay", 21, 17400, 78, "payer"],
];
const WEEK_ROWS: Row[] = [
  ["P-1522", "A.S.", 52, "summit", "PHP", "Continued stay", 72, 6800, 86, "payer", { level: "PHP → IOP", dxKey: "mdd", dx: "Step-down request", scores: [down("PHQ-9", "8"), down("AUDIT-C", "5")], agent: "cadence", status: "Cadence is scheduling the review", verb: "Review due" }],
  ["I-2190", "R.P.", 31, "lakeshore", "IOP", "Initial request", 130, 6100, 86, "payer", { dxKey: "cann", dx: "Cannabis use disorder · initial authorization", scores: [{ label: "DAST-10", value: "6" }, { label: "PHQ-9", value: "7" }], verb: "Decision" }],
  ["R-1088", "L.T.", 45, "beacon", "RES", "Initial request", 54, 9800, 83, "payer"],
  ["P-1611", "A.K.", 33, "summit", "PHP", "Initial request", 66, 6900, 81, "payer"],
  ["P-1637", "N.C.", 52, "harborview", "PHP", "Initial request", 80, 7200, 77, "payer"],
  ["I-2231", "S.B.", 37, "cardinal", "IOP", "Initial request", 56, 4800, 74, "payer"],
  ["I-2249", "C.G.", 27, "cardinal", "IOP", "Initial request", 90, 5100, 66, "payer"],
  ["P-1602", "R.H.", 39, "cardinal", "PHP", "Continued stay", 100, 6600, 69, "payer"],
  ["I-2158", "D.O.", 43, "summit", "IOP", "Recertification", 70, 3900, 85, "payer"],
  ["P-1580", "F.L.", 35, "summit", "PHP", "Continued stay", 84, 5200, 80, "payer"],
  ["R-0902", "G.W.", 50, "summit", "RES", "Continued stay", 62, 12400, 76, "payer"],
  ["I-2166", "H.A.", 24, "summit", "IOP", "Initial request", 78, 4000, 83, "payer"],
  ["R-0934", "E.Y.", 38, "beacon", "RES", "Continued stay", 96, 10500, 88, "payer"],
  ["P-1590", "Z.T.", 46, "harborview", "PHP", "Continued stay", 110, 6300, 79, "payer"],
  ["R-1015", "W.D.", 57, "harborview", "RES", "Initial request", 120, 15800, 70, "payer"],
  ["R-1150", "A.B.", 46, "summit", "RES", "Admission", 52, 13400, 86, "preparing"],
  ["R-1153", "C.F.", 33, "beacon", "RES", "Continued stay", 60, 12800, 88, "payer"],
  ["R-1156", "E.H.", 58, "harborview", "RES", "Initial request", 75, 14200, 84, "preparing", { needs: true, cov: true, lift: 7 }],
  ["R-1159", "G.J.", 41, "lakeshore", "RES", "Admission", 90, 11600, 90, "ready"],
  ["R-1162", "I.K.", 29, "evergreen", "RES", "Continued stay", 100, 13000, 82, "payer"],
  ["R-1165", "L.O.", 52, "summit", "RES", "Recertification", 72, 12200, 85, "payer"],
  ["R-1168", "N.P.", 37, "cardinal", "RES", "Initial request", 110, 14600, 87, "preparing", { needs: true }],
  ["R-1171", "Q.R.", 62, "beacon", "RES", "Continued stay", 120, 10800, 89, "ready"],
  ["R-1174", "S.U.", 44, "harborview", "RES", "Continued stay", 130, 12000, 83, "payer"],
  ["R-1177", "T.V.", 35, "summit", "RES", "Admission", 140, 13600, 91, "payer"],
  ["P-1640", "V.W.", 48, "summit", "PHP", "Continued stay", 100, 7400, 80, "payer"],
  ["P-1643", "X.Y.", 36, "cardinal", "PHP", "Initial request", 80, 6600, 88, "preparing", { needs: true }],
  ["P-1646", "Z.A.", 55, "beacon", "PHP", "Continued stay", 66, 8000, 84, "payer"],
  ["P-1649", "B.C.", 29, "lakeshore", "PHP", "Initial request", 125, 7000, 90, "preparing"],
  ["P-1652", "D.E.", 61, "evergreen", "PHP", "Continued stay", 95, 6800, 86, "payer"],
  ["I-2280", "F.G.", 27, "summit", "IOP", "Initial request", 70, 5400, 92, "preparing"],
  ["I-2283", "H.I.", 40, "beacon", "IOP", "Recertification", 85, 4800, 85, "payer"],
  ["I-2286", "J.K.", 32, "harborview", "IOP", "Continued stay", 105, 5600, 87, "payer"],
  ["I-2289", "N.S.", 49, "lakeshore", "IOP", "Initial request", 150, 4400, 90, "preparing"],
  ["I-2292", "Q.T.", 34, "evergreen", "IOP", "Continued stay", 115, 5200, 82, "payer"],
  ["R-1183", "S.W.", 34, "summit", "WM", "Initial request", 55, 4800, 80, "payer"],
  ["R-1186", "U.X.", 51, "beacon", "WM", "Initial request", 62, 4400, 79, "preparing", { needs: true }],
];

/** Inside each band, requests waiting on a person come first, then dollars at risk times a weight for the time left. */
const weight = (mins: number): number => (mins < 360 ? 3 : mins < 1440 ? 2 : mins < 4320 ? 1.5 : 1);
export const riskScore = (i: QueueItem): number => i.atStake * weight(i.dueAt);
const waitingOnYou = (i: QueueItem): number => (i.phase === "preparing" || i.phase === "ready" || i.phase === "denial" || i.needsInput ? 1 : 0);
export const QUEUE_ITEMS: QueueItem[] = [
  ...NOW_ROWS.map((r) => make("now", r)), ...DAY_ROWS.map((r) => make("day", r)), ...WEEK_ROWS.map((r) => make("week", r)),
].sort((a, b) => BANDS.indexOf(a.band) - BANDS.indexOf(b.band) || waitingOnYou(b) - waitingOnYou(a) || riskScore(b) - riskScore(a));

/** Ready-to-sign and preparing requests leave the queue once they are sent (they then show as Received on the Dashboard). */
export const isSendable = (i: QueueItem): boolean => i.phase === "preparing" || i.phase === "ready";
export function openItems(items: QueueItem[], requests: PsyRequest[]): QueueItem[] {
  return items.filter((i) => {
    if (!isSendable(i)) return true;
    const r = requests.find((x) => x.id === i.id);
    return !r || r.stage === "preparing";
  });
}
