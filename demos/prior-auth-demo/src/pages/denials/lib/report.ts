import { AGENTS } from "@/data/agents";
import { APPEAL_WINDOW_DAYS } from "@/data/denials";
import type { Tone } from "@/data/types";
import { DAY, clockTime, longDate, shortDate, toDate } from "@/lib/time";
import type { ReportDoc, ReportFact, ReportTone } from "@/lib/pdf/report-doc";
import type { PsyRequest } from "@/data/types";
import { capitalize, leftLabel } from "./format";
import { buildLong, DIM_TONE_WORD, paragraphs } from "./long";
import type { DenialView } from "./useDenialView";

/** The denial whose report is the paraphrased worked example. */
export const WORKED_EXAMPLE_ID = "D-3297";
/** How long each of the three agents "works" before the report appears. A constant so a test can wait for exactly this. */
export const REPORT_STEP_MS = 850;

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dateTime = (m: number): string => `${WD[toDate(m).getDay()]} ${shortDate(m)}, ${clockTime(toDate(m))}`;
const chanceText = (c: { value: number; low: number; high: number } | undefined): string => (c ? `${c.value}% (likely ${c.low}–${c.high}%)` : "Nothing is regained");
const VERDICT_TONE: Record<string, ReportTone> = { "Worth challenging": "good", Borderline: "mid", "Probably accept": "risk" };

/** The nearest deadline in one line: the call window, the appeal due date, or where a filed appeal stands. */
function deadlineLine(r: PsyRequest, clock: number): string {
  if (r.deadlineAt === undefined) return r.clockNote ? capitalize(r.clockNote) : "No deadline is set";
  const left = r.deadlineAt - clock;
  if (r.clockSub === "peer-to-peer window") return left > 0 ? `Peer-to-peer window closes ${dateTime(r.deadlineAt)}, in ${leftLabel(left)}` : "The peer-to-peer window has closed";
  const what = r.clockSub === "to resubmit" ? "Resubmission" : "Appeal";
  return left > 0 ? `${what} due ${shortDate(r.deadlineAt)}, in ${leftLabel(left)}` : `${what} deadline has passed`;
}

function timeline(view: DenialView): ReportFact[] {
  const { req, meta, work, clock } = view;
  const rows: ReportFact[] = [["Denial received", dateTime(req.stageSince)]];
  if (req.deadlineAt !== undefined && req.clockSub === "peer-to-peer window") rows.push(["Peer-to-peer window", deadlineLine(req, clock)]);
  const call = work.slot?.label ?? meta.bookedWindow;
  rows.push(["Peer-to-peer call", call ? `Booked for ${call}` : "Not booked yet"]);
  const toFile = req.deadlineAt !== undefined && (req.clockSub === "to file" || req.clockSub === "to resubmit");
  rows.push(["Written appeal due", toFile ? deadlineLine(req, clock).replace(/^\w+ due /, "") : `${shortDate(req.stageSince + APPEAL_WINDOW_DAYS * DAY)} (${APPEAL_WINDOW_DAYS} days from the denial)`]);
  if (work.appealDraft) rows.push(["Appeal drafted", `${shortDate(work.appealDraft.draftedAt)}, waiting for a clinician's signature`]);
  if (work.appealFiled) rows.push(["Appeal filed", `${shortDate(work.appealFiled.at)}, signed as ${work.appealFiled.role}. Decision expected ${work.appealFiled.decisionBy}`]);
  if (work.outcome) rows.push(["Call outcome", `${work.outcome.kind === "overturned" ? "Overturned" : work.outcome.kind === "partly" ? "Partly restored" : "Upheld"} on ${shortDate(work.outcome.at)}${work.outcome.note ? `. ${work.outcome.note}` : ""}`]);
  if (work.decision) rows.push(["Payer's decision on appeal", `${work.decision.result === "overturned" ? "Overturned" : work.decision.result === "partly" ? "Partly overturned" : "Upheld"} on ${shortDate(work.decision.at)}${work.decision.nextLevel ? `. Next: ${work.decision.nextLevel}` : ""}`]);
  if (work.accepted) rows.push(["Accepted", `${shortDate(work.accepted.at)}. Reason: ${work.accepted.reason}`]);
  rows.push(["Where it stands", req.next.toLowerCase().includes(req.chip.toLowerCase()) ? req.next : `${req.chip}. ${req.next}`]);
  return rows;
}

/** The report for one denial, built for any kind of denial from the analysis, the long text and what the person has done so far. `generatedAt` is the demo time it was generated. */
export function buildReport(view: DenialView, generatedAt: number = view.clock): ReportDoc {
  const { req, meta, analysis: a, work, clock } = view;
  const long = buildLong(req.id, meta.type, a);
  const [p2p, appeal] = a.options;
  const fixes = a.findings.map((f) => ({ text: f.fix, source: f.source, added: work.fixes.includes(f.id) }));
  const tone = (t: Tone): ReportTone => t;

  return {
    id: req.id,
    fileName: `Psyflo-appeal-analysis-${req.id}.pdf`,
    workedExample: req.id === WORKED_EXAMPLE_ID,
    payerName: a.ctx.payerName,
    generatedOn: longDate(generatedAt),
    facts: [
      ["Denial", req.id],
      ["Patient", a.ctx.who],
      ["Payer", a.ctx.payerName],
      ["Program", a.ctx.program],
      ["Denial type", meta.type],
      ["Report date", longDate(generatedAt)],
      ["Deadline", deadlineLine(req, clock)],
      ["Similar decisions", `${a.similar}${a.benchmark ? " (benchmark estimate)" : ` ${a.ctx.payer} decisions`}`],
    ],
    verdict: { word: a.verdict, tone: VERDICT_TONE[a.verdict] ?? "neutral", line: a.verdictLine },
    chances: [
      ["Chance of overturning on a call", chanceText(p2p.chance)],
      ["Chance on a written appeal", chanceText(appeal.chance)],
    ],
    chanceNote: a.benchmark ? `Benchmark estimate: only ${a.similar} similar decisions, so the range is wider than usual.` : undefined,
    reasoning: { quote: a.quote, gap: a.findings[0]?.detail ?? paragraphs(a.chartShows)[0] ?? a.chartShows },
    synthesis: paragraphs(long.synthesis),
    findings: a.findings.map((f, i) => ({ n: i + 1, sev: f.sev, title: f.title, text: long.findings[i], source: f.source, excerpt: f.excerpt, fix: f.fix, added: work.fixes.includes(f.id) })),
    dims: long.dims.map((d) => ({ name: d.label, tone: tone(d.tone), toneWord: DIM_TONE_WORD[d.tone], text: d.text })),
    dimsSub: a.dimsSub,
    dimsTitle: `${a.framework.name} dimensions`,
    recommendations: long.recommendations,
    options: a.options.map((o) => ({ title: o.title, recommended: a.recommended === o.id, chance: chanceText(o.chance), time: o.time, gain: o.gain, needs: o.needs })),
    criteria: long.criteria,
    documents: long.evidence,
    fixes,
    pushback: a.pushback,
    ask: a.ask,
    outlook: long.outlook,
    timeline: timeline(view),
    agents: a.steps.map((s) => ({ name: AGENTS[s.agent].name, text: s.text })),
    method: [
      `Done in ${a.doneIn}. Integrity checked each statement against the chart before it was written down.`,
      `${a.similar} similar ${a.ctx.payer} decisions were compared${a.benchmark ? ", which is fewer than 60, so the chance is a benchmark estimate" : ""}.`,
      "A clinician reviews and signs before anything is sent to the payer. FLO and the agents never send or file on their own.",
      "The patient appears as initials and age only. No name, member ID, date of birth or address is in this report.",
    ],
  };
}
