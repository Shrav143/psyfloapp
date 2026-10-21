import type { AgentKey, AppNotification, PayerId, PayerSummary, Program, PsyRequest, RequestEvent, RequestType, StageKey, Tone } from "./types";
import { DAY, HOUR } from "@/lib/time";

/* ------------------------------------------------------------------ payers */
export const PAYERS: PayerSummary[] = [
  { id: "summit", name: "Summit Medicaid HMO", shortName: "Summit", type: "Managed care plan", group: "Ohio Medicaid", reachedBy: "Portal", approvedAsAsked: 74, avgDecisionDays: 1.4, typicalDecisionDays: 1.5, denied30d: 11, infoAsks30d: 6 },
  { id: "cardinal", name: "Cardinal Health Plan", shortName: "Cardinal", type: "Managed care plan", group: "Ohio Medicaid", reachedBy: "Portal", approvedAsAsked: 63, avgDecisionDays: 2.8, typicalDecisionDays: 2, denied30d: 18, infoAsks30d: 9 },
  { id: "evergreen", name: "Evergreen", shortName: "Evergreen", type: "Managed care plan", group: "Ohio Medicaid", reachedBy: "Phone", approvedAsAsked: 69, avgDecisionDays: 3.4, typicalDecisionDays: 2, denied30d: 3, infoAsks30d: 4 },
  { id: "beacon", name: "Beacon PPO", shortName: "Beacon", type: "PPO", group: "Commercial", reachedBy: "Portal", approvedAsAsked: 81, avgDecisionDays: 1.1, typicalDecisionDays: 1, denied30d: 5, infoAsks30d: 3 },
  { id: "harborview", name: "Harborview MA", shortName: "Harborview", type: "Medicare Advantage", group: "Medicare Advantage", reachedBy: "Portal and fax", approvedAsAsked: 77, avgDecisionDays: 3.1, typicalDecisionDays: 3, denied30d: 6, infoAsks30d: 7 },
  { id: "lakeshore", name: "Lakeshore Behavioral", shortName: "Lakeshore", type: "Carve-out", group: "Behavioral carve-out", reachedBy: "Fax", approvedAsAsked: 86, avgDecisionDays: 2.2, typicalDecisionDays: 2, denied30d: 3, infoAsks30d: 2 },
];
export const payerById = (id: PayerId): PayerSummary => PAYERS.find((p) => p.id === id) as PayerSummary;

/* ------------------------------------------------------------------ requests (39 distinct) */
type Track = "auth" | "denial";
interface Spec {
  id: string; caseId?: string; who: string; age: number; payer: PayerId; prog: Program; type: RequestType;
  stage: StageKey; chip: string; tone: Tone; track?: Track; pos: 0 | 1 | 2 | 3;
  inStage: number; typ?: number; usd: number; agent: AgentKey; next: string;
  needsYou?: boolean; decidedToday?: boolean; outcome?: PsyRequest["outcome"]; via?: PsyRequest["sentVia"];
  chance?: number; deadline?: number; clockNote?: string; clockSub?: string;
}
const ev = (reqId: string, at: number, actor: RequestEvent["actor"], text: string, done = true, detail?: string): RequestEvent => ({ id: `${reqId}@${at}`, at, actor, text, done, detail });

function eventsFor(s: Spec): RequestEvent[] {
  const since = -s.inStage;
  const via = s.via ?? (payerById(s.payer).reachedBy.toLowerCase().includes("phone") ? "phone" : payerById(s.payer).reachedBy.toLowerCase().includes("fax") && !payerById(s.payer).reachedBy.toLowerCase().includes("portal") ? "fax" : "portal");
  const sentWord = via === "portal" ? "through the payer's portal" : via === "fax" ? "by fax" : "by phone";
  const out: RequestEvent[] = [];
  if (s.stage === "preparing") {
    out.push(ev(s.id, since - 20, "reader", "Reader pulled the chart and matched the insurance card"));
    out.push(ev(s.id, since - 5, "verify", "Verify checked coverage and benefits"));
    out.push(ev(s.id, 0, "scribe", s.needsYou ? "Scribe has a question for you" : "Scribe is drafting the case", false));
    return out;
  }
  const sentAt = since - (s.stage === "received" ? 0 : Math.min(240, s.inStage));
  out.push(ev(s.id, sentAt - 6, "navigator", `Navigator sent the request ${sentWord}`));
  out.push(ev(s.id, sentAt - 4, "navigator", "Navigator saved the receipt to the case"));
  if (s.stage === "received") { out.push(ev(s.id, 25, "navigator", "Navigator checks again", false)); return out; }
  out.push(ev(s.id, sentAt + 30, "navigator", "Navigator checked: received"));
  if (s.stage === "under_review") {
    out.push(ev(s.id, since, "navigator", "Navigator checked: under review"));
    out.push(ev(s.id, 40, "caller", "Caller will phone the payer if it is still pending", false));
  } else if (s.stage === "info_requested") {
    out.push(ev(s.id, since - 10, "navigator", "Navigator checked: under review"));
    out.push(ev(s.id, since, "payer", "The payer asked for more information"));
    out.push(ev(s.id, since + 20, "packet", s.needsYou ? "Packet drafted the answer. Waiting for your review" : "Packet is drafting the answer", s.needsYou));
  } else if (s.outcome === "approved") {
    out.push(ev(s.id, since - 10, "navigator", "Navigator checked: under review"));
    out.push(ev(s.id, since, "payer", s.next.includes("Write-back") ? "The payer approved the request" : "The payer approved the request"));
    out.push(ev(s.id, since + 3, "cadence", "Cadence updated the ledger and booked the next review"));
  } else {
    out.push(ev(s.id, since - 10, "navigator", "Navigator checked: under review"));
    out.push(ev(s.id, since, "payer", s.stage === "appeal" ? "The payer did not approve the full request" : "Decision received"));
    out.push(ev(s.id, since + 4, "advocate", "Advocate opened the denial and chose a route"));
  }
  return out;
}

const S = (s: Spec): PsyRequest => ({
  id: s.id,
  caseId: s.caseId ?? s.id,
  patient: { initials: s.who, age: s.age },
  payerId: s.payer,
  program: s.prog,
  type: s.type,
  stage: s.stage,
  chip: s.chip,
  tone: s.tone,
  track: s.track ?? "auth",
  progress: s.pos,
  stageSince: -s.inStage,
  typicalMin: s.typ,
  deadlineAt: s.deadline,
  clockNote: s.clockNote,
  clockSub: s.clockSub,
  atStake: s.usd,
  agent: s.agent,
  next: s.next,
  needsYou: s.needsYou,
  decidedToday: s.decidedToday,
  outcome: s.outcome,
  sentVia: s.via ?? (payerById(s.payer).reachedBy.toLowerCase().includes("phone") ? "phone" : payerById(s.payer).reachedBy === "Fax" ? "fax" : "portal"),
  chance: s.chance,
  events: eventsFor(s),
});

const M = (h: number, m = 0) => h * HOUR + m;

export const SEED_REQUESTS: PsyRequest[] = [
  /* ----- Preparing (5) ----- */
  S({ id: "R-1042", who: "J.M.", age: 34, payer: "summit", prog: "RES", type: "Admission", stage: "preparing", chip: "Preparing", tone: "neutral", pos: 0, inStage: M(1, 12), typ: 2 * HOUR, usd: 22400, agent: "scribe", next: "Needs your input. Scribe has a question", needsYou: true, chance: 62 }),
  S({ id: "I-2207", who: "T.R.", age: 29, payer: "cardinal", prog: "IOP", type: "Recertification", stage: "preparing", chip: "Preparing", tone: "neutral", pos: 0, inStage: 100, typ: HOUR, usd: 5400, agent: "packet", next: "Needs your input. Packet has one question", needsYou: true, chance: 71 }),
  S({ id: "R-0988", who: "D.L.", age: 41, payer: "beacon", prog: "RES", type: "Admission", stage: "preparing", chip: "Preparing", tone: "neutral", pos: 0, inStage: 35, typ: HOUR, usd: 9100, agent: "integrity", next: "Ready to sign. All four checks passed", chance: 79 }),
  S({ id: "R-1101", who: "K.W.", age: 26, payer: "summit", prog: "RES", type: "Retro-authorization", stage: "preparing", chip: "Preparing", tone: "neutral", pos: 0, inStage: 52, typ: 2 * HOUR, usd: 18900, agent: "packet", next: "Packet is assembling the request from the detox chart", chance: 47 }),
  S({ id: "I-2262", who: "S.N.", age: 31, payer: "lakeshore", prog: "IOP", type: "Initial request", stage: "preparing", chip: "Preparing", tone: "neutral", pos: 0, inStage: 18, typ: HOUR, usd: 4400, agent: "reader", next: "Reader is reading the chart", chance: 84 }),
  /* ----- Received (4) ----- */
  S({ id: "I-2231", who: "S.B.", age: 37, payer: "cardinal", prog: "IOP", type: "Initial request", stage: "received", chip: "Received", tone: "neutral", pos: 1, inStage: 25, typ: 25, usd: 4800, agent: "navigator", next: "Navigator checks again in 5 minutes", chance: 74 }),
  S({ id: "R-1088", who: "L.T.", age: 45, payer: "beacon", prog: "RES", type: "Initial request", stage: "received", chip: "Received", tone: "neutral", pos: 1, inStage: 40, typ: 25, usd: 9800, agent: "navigator", next: "Navigator checks again in 10 minutes", chance: 83 }),
  S({ id: "P-1611", who: "A.K.", age: 33, payer: "summit", prog: "PHP", type: "Initial request", stage: "received", chip: "Received", tone: "neutral", pos: 1, inStage: 12, typ: 25, usd: 6900, agent: "navigator", next: "Navigator checks again in 12 minutes", chance: 81 }),
  S({ id: "P-1637", who: "N.C.", age: 52, payer: "harborview", prog: "PHP", type: "Initial request", stage: "received", chip: "Received", tone: "neutral", pos: 1, inStage: 30, typ: 25, usd: 7200, agent: "navigator", next: "Navigator checks again in 20 minutes", chance: 77, via: "portal" }),
  /* ----- Under review (14) ----- */
  S({ id: "R-1021", who: "V.P.", age: 48, payer: "cardinal", prog: "RES", type: "Continued stay", stage: "under_review", chip: "Under review", tone: "neutral", pos: 2, inStage: 3 * DAY + 5 * HOUR, typ: 2 * DAY, usd: 9700, agent: "navigator", next: "Navigator checks again in 15 minutes", chance: 58 }),
  S({ id: "I-2249", who: "C.G.", age: 27, payer: "cardinal", prog: "IOP", type: "Initial request", stage: "under_review", chip: "Under review", tone: "neutral", pos: 2, inStage: DAY, typ: 2 * DAY, usd: 5100, agent: "navigator", next: "Navigator checks again in 30 minutes", chance: 66 }),
  S({ id: "P-1602", who: "R.H.", age: 39, payer: "cardinal", prog: "PHP", type: "Continued stay", stage: "under_review", chip: "Under review", tone: "neutral", pos: 2, inStage: DAY + 2 * HOUR, typ: 2 * DAY, usd: 6600, agent: "navigator", next: "Navigator checks again in 30 minutes", chance: 69 }),
  S({ id: "I-2236", who: "B.J.", age: 30, payer: "cardinal", prog: "IOP", type: "Recertification", stage: "under_review", chip: "Under review", tone: "neutral", pos: 2, inStage: 14 * HOUR, typ: 2 * DAY, usd: 4200, agent: "navigator", next: "Navigator checks again in 30 minutes", chance: 72 }),
  S({ id: "R-0870", who: "M.R.", age: 36, payer: "summit", prog: "RES", type: "Admission", stage: "under_review", chip: "Under review", tone: "neutral", pos: 2, inStage: DAY + 4 * HOUR, typ: 1.5 * DAY, usd: 18600, agent: "navigator", next: "Navigator checks again in 22 minutes", chance: 82 }),
  S({ id: "I-2158", who: "D.O.", age: 43, payer: "summit", prog: "IOP", type: "Recertification", stage: "under_review", chip: "Under review", tone: "neutral", pos: 2, inStage: 20 * HOUR, typ: 1.5 * DAY, usd: 3900, agent: "navigator", next: "Navigator checks again in 40 minutes", chance: 85 }),
  S({ id: "P-1580", who: "F.L.", age: 35, payer: "summit", prog: "PHP", type: "Continued stay", stage: "under_review", chip: "Under review", tone: "neutral", pos: 2, inStage: DAY, typ: 1.5 * DAY, usd: 5200, agent: "navigator", next: "Navigator checks again in 35 minutes", chance: 80 }),
  S({ id: "R-0902", who: "G.W.", age: 50, payer: "summit", prog: "RES", type: "Continued stay", stage: "under_review", chip: "Under review", tone: "neutral", pos: 2, inStage: 2 * DAY, typ: 1.5 * DAY, usd: 12400, agent: "navigator", next: "Navigator checks again in 18 minutes", chance: 76 }),
  S({ id: "I-2166", who: "H.A.", age: 24, payer: "summit", prog: "IOP", type: "Initial request", stage: "under_review", chip: "Under review", tone: "neutral", pos: 2, inStage: 6 * HOUR, typ: 1.5 * DAY, usd: 4000, agent: "navigator", next: "Navigator checks again in 1 hour", chance: 83 }),
  S({ id: "R-0934", who: "E.Y.", age: 38, payer: "beacon", prog: "RES", type: "Continued stay", stage: "under_review", chip: "Under review", tone: "neutral", pos: 2, inStage: 14 * HOUR, typ: DAY, usd: 10500, agent: "navigator", next: "Navigator checks again in 25 minutes", chance: 88 }),
  S({ id: "P-1590", who: "Z.T.", age: 46, payer: "harborview", prog: "PHP", type: "Continued stay", stage: "under_review", chip: "Under review", tone: "neutral", pos: 2, inStage: 2 * DAY, typ: 3 * DAY, usd: 6300, agent: "navigator", next: "Navigator checks again in 1 hour", chance: 79, via: "fax" }),
  S({ id: "R-1015", who: "W.D.", age: 57, payer: "harborview", prog: "RES", type: "Initial request", stage: "under_review", chip: "Under review", tone: "neutral", pos: 2, inStage: DAY + 8 * HOUR, typ: 3 * DAY, usd: 15800, agent: "navigator", next: "Navigator checks again in 50 minutes", chance: 70 }),
  S({ id: "I-2190", who: "R.P.", age: 31, payer: "lakeshore", prog: "IOP", type: "Initial request", stage: "under_review", chip: "Under review", tone: "neutral", pos: 2, inStage: 2 * DAY, typ: 3 * DAY, usd: 6100, agent: "navigator", next: "Navigator checks again in 1 hour", chance: 86, via: "fax" }),
  S({ id: "R-0912", who: "C.D.", age: 44, payer: "evergreen", prog: "RES", type: "Continued stay", stage: "under_review", chip: "Under review", tone: "neutral", pos: 2, inStage: 4 * DAY + 12 * HOUR, typ: 2 * DAY, usd: 11600, agent: "caller", next: "Caller is phoning Evergreen", chance: 67, via: "phone" }),
  /* ----- Info requested (3) ----- */
  S({ id: "P-1499", who: "E.S.", age: 42, payer: "harborview", prog: "PHP", type: "Continued stay", stage: "info_requested", chip: "Info requested", tone: "mid", pos: 2, inStage: DAY + 14 * HOUR, typ: DAY, usd: 8200, agent: "packet", next: "Packet drafted the answer. Waiting for your review", needsYou: true, chance: 74 }),
  S({ id: "I-2218", who: "O.H.", age: 28, payer: "cardinal", prog: "IOP", type: "Continued stay", stage: "info_requested", chip: "Info requested", tone: "mid", pos: 2, inStage: 5 * HOUR, typ: DAY, usd: 5900, agent: "packet", next: "Packet is drafting the answer", chance: 68 }),
  S({ id: "R-0975", who: "B.N.", age: 53, payer: "evergreen", prog: "RES", type: "Continued stay", stage: "info_requested", chip: "Info requested", tone: "mid", pos: 2, inStage: 2 * HOUR, typ: DAY, usd: 10900, agent: "packet", next: "Packet is drafting the answer", chance: 71, via: "phone" }),
  /* ----- Decided today: approved (6) ----- */
  S({ id: "R-0951", who: "F.W.", age: 47, payer: "evergreen", prog: "RES", type: "Continued stay", stage: "decided", chip: "Approved", tone: "good", pos: 3, inStage: 90, typ: 2 * DAY, usd: 12000, agent: "cadence", next: "Next review booked. Write-back waits for you", decidedToday: true, outcome: "approved", via: "phone" }),
  S({ id: "I-2144", who: "G.N.", age: 33, payer: "summit", prog: "IOP", type: "Recertification", stage: "decided", chip: "Approved", tone: "good", pos: 3, inStage: 150, typ: 1.5 * DAY, usd: 4300, agent: "cadence", next: "Ledger updated. Next review in 10 days", decidedToday: true, outcome: "approved" }),
  S({ id: "R-0944", who: "M.B.", age: 40, payer: "beacon", prog: "RES", type: "Continued stay", stage: "decided", chip: "Approved", tone: "good", pos: 3, inStage: 200, typ: DAY, usd: 8800, agent: "cadence", next: "Ledger updated. Next review in 7 days", decidedToday: true, outcome: "approved" }),
  S({ id: "I-2171", who: "Q.Z.", age: 25, payer: "lakeshore", prog: "IOP", type: "Initial request", stage: "decided", chip: "Approved", tone: "good", pos: 3, inStage: 260, typ: 2 * DAY, usd: 4600, agent: "cadence", next: "Ledger updated. Next review in 14 days", decidedToday: true, outcome: "approved", via: "fax" }),
  S({ id: "P-1573", who: "A.S.", age: 51, payer: "harborview", prog: "PHP", type: "Continued stay", stage: "decided", chip: "Approved", tone: "good", pos: 3, inStage: 310, typ: 3 * DAY, usd: 5700, agent: "cadence", next: "Ledger updated. Next review in 6 days", decidedToday: true, outcome: "approved" }),
  S({ id: "R-0960", who: "H.V.", age: 39, payer: "summit", prog: "RES", type: "Recertification", stage: "decided", chip: "Approved", tone: "good", pos: 3, inStage: 340, typ: 1.5 * DAY, usd: 13300, agent: "cadence", next: "Ledger updated. Next review in 7 days", decidedToday: true, outcome: "approved" }),
  /* ----- Appeal or call (7). D-3297 and D-3290 were denied today, so they also count as decided today ----- */
  S({ id: "D-3318", caseId: "R-0997", who: "M.C.", age: 38, payer: "cardinal", prog: "RES", type: "Peer-to-peer", stage: "appeal", chip: "Call booked", tone: "neutral", track: "denial", pos: 0, inStage: 18 * HOUR, usd: 22400, agent: "advocate", next: "Call booked Wed 9 to 11 am. The brief is ready", chance: 64, deadline: 36 * HOUR, clockSub: "peer-to-peer window", outcome: "partly_approved" }),
  S({ id: "D-3297", caseId: "I-2141", who: "T.O.", age: 32, payer: "cardinal", prog: "IOP", type: "Peer-to-peer", stage: "appeal", chip: "Call booked", tone: "neutral", track: "denial", pos: 0, inStage: 80, usd: 6200, agent: "advocate", next: "Denied today. Call booked Fri 10/23", chance: 61, deadline: 3 * DAY, clockSub: "peer-to-peer window", decidedToday: true, outcome: "denied" }),
  S({ id: "D-3290", caseId: "P-1544", who: "J.K.", age: 36, payer: "cardinal", prog: "PHP", type: "Resubmission", stage: "appeal", chip: "Resubmitting", tone: "mid", track: "auth", pos: 0, inStage: 120, usd: 3100, agent: "packet", next: "Denied today. Packet is writing the resubmission", chance: 38, deadline: 5 * DAY, clockSub: "to resubmit", decidedToday: true, outcome: "denied" }),
  S({ id: "D-3279", caseId: "R-0902-b", who: "L.F.", age: 49, payer: "beacon", prog: "RES", type: "Appeal", stage: "appeal", chip: "Appeal filed", tone: "neutral", track: "denial", pos: 1, inStage: 15 * DAY, usd: 3600, agent: "navigator", next: "Waiting on the payer", chance: 57, clockNote: "decision 11/02", clockSub: "filed 10/05", outcome: "denied" }),
  S({ id: "D-3284", caseId: "R-0931", who: "P.U.", age: 55, payer: "evergreen", prog: "WM", type: "Appeal", stage: "appeal", chip: "Appeal filed", tone: "neutral", track: "denial", pos: 1, inStage: 4 * DAY, usd: 9400, agent: "navigator", next: "Waiting on the payer", chance: 44, clockNote: "decision 11/10", clockSub: "filed 10/16", outcome: "denied", via: "phone" }),
  S({ id: "D-3272", caseId: "P-1488", who: "I.D.", age: 60, payer: "harborview", prog: "PHP", type: "Appeal", stage: "appeal", chip: "External review", tone: "neutral", track: "denial", pos: 3, inStage: 11 * DAY, usd: 2900, agent: "navigator", next: "Waiting on the reviewer", chance: 41, clockNote: "decision 11/20", clockSub: "requested 10/09", outcome: "partly_approved" }),
  S({ id: "D-3301", caseId: "R-0969", who: "O.P.", age: 34, payer: "summit", prog: "RES", type: "Appeal", stage: "appeal", chip: "Appeal drafting", tone: "mid", track: "denial", pos: 1, inStage: 2 * DAY, usd: 14800, agent: "advocate", next: "Advocate is drafting the appeal", chance: 52, deadline: 41 * DAY, clockSub: "to file", outcome: "denied" }),
];

/** Extra detail for the two requests whose history is shown in the demo. */
const HIST: Record<string, RequestEvent[]> = {
  "R-0870": [
    ev("R-0870", -(DAY + 4 * HOUR) - 10, "navigator", "Navigator sent the request through the payer's portal"),
    ev("R-0870", -(DAY + 4 * HOUR) - 8, "navigator", "Navigator saved the receipt to the case"),
    ev("R-0870", -(DAY + 4 * HOUR) + 22, "navigator", "Navigator checked: received"),
    ev("R-0870", -(DAY + 2 * HOUR) - 30, "navigator", "Navigator checked: under review"),
    ev("R-0870", -(DAY - 3 * HOUR), "navigator", "Navigator checked: under review"),
    ev("R-0870", 6 * HOUR + 18, "caller", "Caller will phone Summit if it is still pending", false),
  ],
};
for (const r of SEED_REQUESTS) if (HIST[r.id]) r.events = HIST[r.id];
/** R-1042 was started from referral RF-2050 (see data/referrals.ts). */
const r1042 = SEED_REQUESTS.find((r) => r.id === "R-1042");
if (r1042) r1042.referralId = "RF-2050";

/* ------------------------------------------------------------------ notifications */
export const SEED_NOTIFICATIONS: AppNotification[] = [
  { id: "n1", at: -16, agent: "packet", title: "Payer asked for info", body: "Harborview MA wants more on P-1499. Packet drafted the answer.", to: "/dashboard?request=P-1499", read: false, tone: "mid" },
  { id: "n2", at: -38, agent: "scribe", title: "Scribe has a question", body: "R-1042 needs one answer before the draft can finish.", to: "/authorizations/new/draft-r1042", read: false, tone: "mid" },
  { id: "n3", at: -80, agent: "advocate", title: "Denied today", body: "Cardinal denied D-3297 (units cut 48 to 30). A call is booked.", to: "/denials?id=D-3297", read: false, tone: "risk" },
  { id: "n4", at: -90, agent: "cadence", title: "Approved", body: "Evergreen approved R-0951 for 14 days. Write-back waits for you.", to: "/dashboard?request=R-0951", read: true, tone: "good" },
  { id: "n5", at: -240, agent: "sentinel", title: "Payer rule changed", body: "Cardinal updated its criteria (version 2026.3). 4 drafts are affected.", to: "/payers/cardinal?tab=changes", read: false, tone: "mid" },
  { id: "n6", at: -300, agent: "caller", title: "Very late", body: "Evergreen has had R-0912 for 4 days. Caller is phoning.", to: "/dashboard?request=R-0912", read: true, tone: "risk" },
];
