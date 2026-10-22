import { APPEAL_WINDOW_DAYS, AUTHORED_TEXT, SEED_DENIAL_META, type AnalysisText, type DenialMeta, type DimText, type FindingText } from "@/data/denials";
import { TEMPLATES } from "@/data/denialsTemplates";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type AgentKey, type PsyRequest } from "@/data/types";
import { DAY, shortDate } from "@/lib/time";
import { leftLabel } from "./format";

export type Verdict = "Worth challenging" | "Borderline" | "Probably accept";
export type OptionId = "p2p" | "appeal" | "accept";
export interface Chance { value: number; low: number; high: number }
export interface Finding extends FindingText { id: string }
export interface DenialOption {
  id: OptionId;
  title: string;
  summary: string;
  /** How long the route takes, on its own: the report compares it across the three options. */
  time: string;
  /** What the route gets back. */
  gain: string;
  chance?: Chance;
  needs: string[];
}
export interface DenialAnalysis {
  verdict: Verdict;
  verdictLine: string;
  headline: string;
  steps: { agent: AgentKey; text: string }[];
  doneIn: string;
  quote: string;
  chartShows: string;
  findings: Finding[];
  dimsSub: string;
  dims: DimText[];
  options: DenialOption[];
  recommended: OptionId;
  regained: string;
  similar: number;
  benchmark: boolean;
  ask: string;
  opening: string;
  points: { title: string; detail: string; source: string }[];
  pushback: [string, string][];
  /** Values the placeholders were filled with, reused by the appeal letter and the brief. */
  ctx: Record<string, string>;
}

/** Fills the {placeholders} of the denial text from the values in `ctx`. A placeholder with no value is left as written. */
export const fill = (s: string, ctx: Record<string, string>): string => s.replace(/\{(\w+)\}/g, (m, k: string) => ctx[k] ?? m);

/** A request that turned into a denial elsewhere (the Dashboard demo control) has no stored meta, so make one up from its core data. */
export function resolveMeta(r: PsyRequest, stored: DenialMeta | undefined): DenialMeta {
  if (stored) return stored;
  const seeded = SEED_DENIAL_META[r.id];
  if (seeded) return seeded;
  const partly = r.outcome === "partly_approved";
  return { type: partly ? "Partial approval" : "Full denial", summary: partly ? "Partial approval" : "Full denial", daysRequested: partly ? 14 : undefined, daysApproved: partly ? 7 : undefined, similar: 140 + (r.id.charCodeAt(r.id.length - 1) % 60) };
}

function contextOf(r: PsyRequest, m: DenialMeta): Record<string, string> {
  const payer = payerById(r.payerId);
  const requested = m.daysRequested ?? 14;
  const approved = m.daysApproved ?? Math.floor(requested / 2);
  const gap = requested - approved;
  const unitsRequested = m.unitsRequested ?? 48;
  const unitsApproved = m.unitsApproved ?? 30;
  const since = r.stageSince;
  return {
    payer: payer.shortName,
    payerName: payer.name,
    program: PROGRAM_LABEL[r.program],
    age: String(r.patient.age),
    who: `${r.patient.initials}, ${r.patient.age}`,
    approved: String(approved),
    requested: String(requested),
    from: String(approved + 1),
    gap: String(gap),
    regain: `${Math.max(1, Math.round(gap * 0.7))} to ${gap}`,
    unitsRequested: String(unitsRequested),
    unitsApproved: String(unitsApproved),
    unitsDiff: String(unitsRequested - unitsApproved),
    noteDate: shortDate(since - DAY),
    rangeDates: `${shortDate(since - 4 * DAY)}–${shortDate(since - DAY).split("/")[1]}`,
    similar: String(m.similar),
  };
}

const chanceOf = (value: number): Chance => ({ value, low: Math.max(0, value - 9), high: Math.min(99, value + 8) });

const verdictOf = (c: number): Verdict => (c >= 50 ? "Worth challenging" : c >= 35 ? "Borderline" : "Probably accept");
const VERDICT_LINE: Record<Verdict, string> = {
  "Worth challenging": "The chart supports the request, and the reason given does not match it.",
  Borderline: "Part of the chart supports the request. A call is worth the time, but expect pushback.",
  "Probably accept": "The chart does not yet support a challenge. Accepting may be the better use of time.",
};
const VERDICT_SENTENCE: Record<Verdict, string> = {
  "Worth challenging": "The chart supports challenging it.",
  Borderline: "It is borderline, and a call is worth the time.",
  "Probably accept": "Accepting may be the better use of time.",
};

export function buildAnalysis(r: PsyRequest, m: DenialMeta, clock: number): DenialAnalysis {
  const ctx = contextOf(r, m);
  const text: AnalysisText = AUTHORED_TEXT[r.id] ?? TEMPLATES[m.type];
  const base = r.chance ?? 55;
  const verdict = verdictOf(base);
  const p2p = chanceOf(base);
  const appeal = chanceOf(Math.max(5, base - 6));
  const left = r.deadlineAt === undefined ? undefined : r.deadlineAt - clock;
  const toFile = r.clockSub === "to file" || r.clockSub === "to resubmit";
  const appealTime = toFile && left !== undefined ? (left > 0 ? `${leftLabel(left)} to ${r.clockSub === "to resubmit" ? "resubmit" : "file"}` : "Deadline passed") : `${APPEAL_WINDOW_DAYS} days to file`;
  const regained = fill(text.regained, ctx);
  const sources = text.findings.map((f) => fill(f.source, ctx));
  const windowClosed = left !== undefined && left <= 0 && !toFile;
  const recommended: OptionId = verdict === "Probably accept" ? "accept" : toFile || windowClosed || m.type === "Late notice" ? "appeal" : "p2p";
  const accept = m.type === "Partial approval" ? `Accept ${ctx.approved} days and plan the step-down` : "Accept the decision and plan the next step";
  return {
    verdict,
    verdictLine: VERDICT_LINE[verdict],
    headline: `${r.id}: ${fill(text.short, ctx)}. ${VERDICT_SENTENCE[verdict]}`,
    steps: [
      { agent: "reader", text: "Read the letter and the chart, and removed identifiers" },
      { agent: "advocate", text: `Checked the notice, the deadline and how ${ctx.payer} applied its own criteria` },
      { agent: "historian", text: `Compared ${m.similar} similar ${ctx.payer} decisions and appeals` },
    ],
    doneIn: `0:${r.id === "D-3318" ? 48 : 38 + (m.similar % 17)}`,
    quote: fill(text.quote, ctx),
    chartShows: fill(text.chartShows, ctx),
    findings: text.findings.map((f, i) => ({ ...f, id: `${r.id}-f${i}`, title: fill(f.title, ctx), detail: fill(f.detail, ctx), source: fill(f.source, ctx), excerpt: fill(f.excerpt, ctx), fix: fill(f.fix, ctx) })),
    dimsSub: text.dimsSub,
    dims: text.dims.map((d) => ({ ...d, text: fill(d.text, ctx) })),
    options: [
      { id: "p2p", title: "Peer-to-peer call", summary: `30 to 45 minutes of clinician time · ${regained}`, time: "30 to 45 minutes of clinician time", gain: regained, chance: p2p, needs: ["A clinician on the call", "The brief, written by Advocate and checked by Integrity", "A call time inside the payer's window"] },
      { id: "appeal", title: "Written appeal", summary: `${appealTime} · ${regained}`, time: appealTime, gain: regained, chance: appeal, needs: ["A clinician's signature on the letter", "The letter, drafted by Advocate and checked by Integrity", `Evidence attached: ${sources.slice(0, 3).join(", ")}`] },
      { id: "accept", title: accept, summary: "Fastest. Nothing regained.", time: "Fastest, nothing to prepare", gain: "Nothing regained", needs: ["A reason for the record", "Analytics logs the denial as accepted", "Case Manager adds a step-down plan"] },
    ],
    recommended,
    regained,
    similar: m.similar,
    benchmark: m.similar < 60,
    ask: fill(text.ask, ctx),
    opening: fill(text.opening, ctx),
    points: text.points.map((p) => ({ title: fill(p.title, ctx), detail: fill(p.detail, ctx), source: fill(p.source, ctx) })),
    pushback: text.pushback.map(([q, a]) => [fill(q, ctx), fill(a, ctx)] as [string, string]),
    ctx,
  };
}
