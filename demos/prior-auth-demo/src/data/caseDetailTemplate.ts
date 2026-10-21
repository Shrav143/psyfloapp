import { DAY } from "@/lib/time";
import { paths } from "@/routes";
import type { CaseDetail, CheckDef, Criterion, DraftSection, DriverRow, Evidence, KeyScore, OpenItem, Rec, TrendSeries } from "./caseDetail";
import { DX, daysRequested, dxKeyFor, dxLine, hashOf, scoresFor, type DxKey, type Phase, type QueueItem, type Score } from "./queue";
import { SEED_REQUESTS, payerById } from "./seed";
import type { AgentKey, PayerId, Program, PsyRequest, RequestType, Tone } from "./types";
import { PROGRAM_LABEL } from "./types";

/* Builds a sensible case page for any request that is not hand-written: from its queue row or its Dashboard request.
   The numbers are consistent by construction: the driver rows add up to the chance now and, with every action applied, to chance + lift. */

export interface CaseSeed {
  id: string; requestId: string; fromQueue: boolean; denialId?: string; initials: string; age: number; payerId: PayerId; program: Program; type: RequestType;
  levelLabel: string; dxKey: DxKey; dx: string; scores: Score[]; days: number; dueAt?: number; dueVerb: string; chip?: { text: string; tone: Tone };
  atStake: number; chance: number; liftPts: number; phase: Phase; agent: AgentKey; statusLine: string; needsInput: boolean; coverageFix: boolean;
}

export function seedFromItem(i: QueueItem): CaseSeed {
  return {
    id: i.id, requestId: i.id, fromQueue: true, initials: i.initials, age: i.age, payerId: i.payerId, program: i.program, type: i.type, levelLabel: i.levelLabel, dxKey: i.dxKey, dx: i.dx, scores: i.scores,
    days: i.days, dueAt: i.dueAt, dueVerb: i.dueVerb, atStake: i.atStake, chance: i.chance, liftPts: i.liftPts, phase: i.phase, agent: i.agent, statusLine: i.status, needsInput: i.needsInput, coverageFix: i.coverageFix,
  };
}

export function seedFromRequest(r: PsyRequest): CaseSeed {
  const chance = SEED_REQUESTS.find((x) => x.id === r.id)?.chance ?? r.chance ?? 70; // the seed value, so a write-back never counts twice
  const dxKey = dxKeyFor(r.id, r.program);
  const phase: Phase = r.track === "denial" ? "denial" : r.stage === "preparing" ? "preparing" : "payer";
  const decided = r.stage === "decided";
  return {
    id: r.id, requestId: r.id, fromQueue: false, initials: r.patient.initials, age: r.patient.age, payerId: r.payerId, program: r.program, type: r.type, levelLabel: PROGRAM_LABEL[r.program], dxKey, dx: dxLine(r.id, dxKey, r.type, r.program),
    scores: scoresFor(r.id, dxKey), days: daysRequested(r.program), dueAt: decided ? undefined : r.deadlineAt ?? Math.max(120, r.stageSince + (r.typicalMin ?? DAY)),
    dueVerb: r.track === "denial" ? "Window closes" : "Decision expected", chip: decided ? { text: r.chip, tone: r.tone } : undefined,
    atStake: r.atStake, chance, liftPts: phase === "preparing" && chance < 85 ? 8 : 0, phase, agent: r.agent, statusLine: r.next, needsInput: !!r.needsYou, coverageFix: false,
  };
}

const ev = (label: string, quote: string): Evidence => ({ label, quote });
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/* ------------------------------------------------------------------ recommendations */
interface Tpl { title: string; agent: AgentKey; bullets: string[]; why: (p: string) => string; input?: Rec["input"]; rows: string[]; add: NonNullable<Rec["add"]> }
const POOL: Record<string, Tpl> = {
  coverage: {
    title: "Fix the coverage before sending", agent: "verify", rows: ["criteria"],
    bullets: ["Verify found a gap in the plan dates on the payer's file", "Confirm the plan and member ID, then Verify checks again", "One input needed: the plan and member ID to use"],
    why: (p) => `${p} can deny a request outright when the plan dates do not cover the start of care.`,
    input: { label: "Plan and member ID to use", placeholder: "e.g. plan name, member ID ending 4821" },
    add: { section: "clinical", text: (a) => `Coverage was confirmed against ${a.trim().replace(/\.$/, "")}.`, source: ev("Your answer", "Typed by you for Verify on this request.") },
  },
  dates: {
    title: "Settle the conflicting date", agent: "integrity", rows: ["trace"],
    bullets: ["Two documents give different start dates for the same medication", "Integrity will not let a conflicting date into the draft"],
    why: () => "A date that differs between two documents is one of the most common reasons for an information request.",
    input: { label: "Which date is correct?", placeholder: "e.g. the date written in the psychiatric evaluation" },
    add: { section: "current", text: (a) => `The medication start date is ${a.trim().replace(/\.$/, "")}.`, source: ev("Your answer", "Typed by you for Integrity on this request.") },
  },
  stepdown: {
    title: "Name the step-down provider", agent: "scribe", rows: ["criteria", "short"],
    bullets: ["Scribe adds the next level of care and the first appointment to the plan", "Meets the payer's expectation of a documented step-down", "One input needed: confirm the program and the start date"],
    why: (p) => `${p} often approves a shorter stay when no step-down is named, then asks for the plan at the first review.`,
    input: { label: "Step-down program and first appointment", placeholder: "e.g. Intensive outpatient at …, first visit on …" },
    add: { section: "plan", text: (a) => `Step-down plan: ${a.trim().replace(/\.$/, "")}.`, source: ev("Your answer", "Typed by you for Scribe on this request.") },
  },
  summary: {
    title: "Attach the earlier treatment summary", agent: "packet", rows: ["lower"],
    bullets: ["Packet adds the closing summary from the earlier program as an exhibit", "Shows that a lower level of care was tried and why it did not hold"],
    why: (p) => `${p} gives the most weight to a documented earlier attempt at a lower level of care.`,
    add: { section: "lower", text: () => "The closing summary from the earlier program is attached as an exhibit.", source: ev("Earlier treatment summary", "Earlier program ended before completion. Symptoms returned within weeks.") },
  },
  therapy: {
    title: "Add the therapy note from the last 14 days", agent: "reader", rows: ["severity", "trace"],
    bullets: ["Reader found a recent group therapy note in the chart system", "Packet attaches it so the document list is complete"],
    why: (p) => `${p} lists a therapy note from the last 14 days among its required documents.`,
    add: { section: "current", text: () => "A recent group therapy note shows regular attendance and active participation.", source: ev("Group therapy note", "Attended all scheduled groups this week and took part in each.") },
  },
  home: {
    title: "Describe the home environment in plain terms", agent: "scribe", rows: ["home"],
    bullets: ["Scribe states who lives in the home and what supports are nearby", "Adds what transport is available for visits"],
    why: () => "Approved requests described the home in plain, specific terms rather than general words such as unstable.",
    add: { section: "lower", text: () => "The home environment is described in the chart, including who lives there and how visits are reached.", source: ev("Psychosocial p.4", "Living situation, supports and transport are described.") },
  },
};

function buildRecs(seed: CaseSeed, payer: string, lift: number): Rec[] {
  const keys: string[] = [];
  if (seed.coverageFix) keys.push("coverage");
  if (seed.needsInput) keys.push("dates");
  if (seed.program !== "IOP" || seed.type === "Initial request") keys.push("stepdown");
  keys.push("summary", "therapy", "home");
  const chosen = keys.slice(0, lift >= 14 ? 4 : lift >= 6 ? 3 : 2);
  const w = [5, 3, 2, 1].slice(0, chosen.length);
  const gains = w.map((x) => Math.max(1, Math.round((lift * x) / w.reduce((a, b) => a + b, 0))));
  gains[0] += lift - gains.reduce((a, b) => a + b, 0);
  return chosen.map((key, i) => {
    const t = POOL[key];
    const g = gains[i];
    const moves: Record<string, number> = { [t.rows[0]]: t.rows.length > 1 ? g - Math.floor(g / 2) : g };
    if (t.rows.length > 1 && Math.floor(g / 2) > 0) moves[t.rows[1]] = Math.floor(g / 2);
    return { id: key, title: t.title, agent: t.agent, bullets: t.bullets, why: t.why(payer), input: t.input, moves, add: t.add, link: key === "coverage" ? { label: "Open Eligibility & Benefits", to: paths.eligibilityVerify({ case: seed.id }) } : undefined };
  });
}

function buildRows(payer: string, chance: number, recs: Rec[]): { start: number; rows: DriverRow[] } {
  const start = clamp(chance - 20, 40, 70);
  const moved = (row: string) => recs.reduce((a, r) => a + (r.moves[row] ?? 0), 0);
  const pos = chance - start + 4 + moved("short"); // points the five positive rows already hold
  const weights = [4, 5, 3, 3, 2];
  const ids = ["lower", "severity", "home", "criteria", "trace"];
  const labels: Record<string, string> = {
    lower: "A lower level of care was tried or ruled out", severity: "Symptom severity is documented with dated scores", home: "Home environment is documented",
    criteria: `All ${payer} requirements are backed by the chart`, trace: "Every sentence traces to the chart", short: `${payer} usually grants fewer days than asked`,
  };
  const bases = weights.map((x) => Math.floor((pos * x) / 17));
  bases[0] += pos - bases.reduce((a, b) => a + b, 0);
  return { start, rows: [...ids.map((id, i) => ({ id, label: labels[id], base: bases[i] })), { id: "short", label: labels.short, base: -4 - moved("short") }] };
}

/* ------------------------------------------------------------------ chart-side content */
const TREND: Record<DxKey, [TrendSeries, TrendSeries]> = {
  aud: [{ name: "CIWA-Ar", color: "#B5553A", data: [14, 9, 4] }, { name: "Craving (0 to 10)", color: "#1D4F43", data: [7, 7, 6] }],
  oud: [{ name: "COWS", color: "#B5553A", data: [12, 9, 6] }, { name: "Craving (0 to 10)", color: "#1D4F43", data: [7, 6, 6] }],
  stim: [{ name: "PHQ-9", color: "#B5553A", data: [15, 14, 12] }, { name: "Craving (0 to 10)", color: "#1D4F43", data: [8, 6, 5] }],
  cann: [{ name: "DAST-10", color: "#B5553A", data: [8, 7, 6] }, { name: "PHQ-9", color: "#1D4F43", data: [11, 9, 8] }],
  mdd: [{ name: "PHQ-9", color: "#B5553A", data: [18, 16, 14] }, { name: "GAD-7", color: "#1D4F43", data: [13, 11, 9] }],
  gad: [{ name: "GAD-7", color: "#B5553A", data: [16, 14, 12] }, { name: "AUDIT-C", color: "#1D4F43", data: [8, 7, 6] }],
};
const SCALE_MAX: Record<string, number> = { "CIWA-Ar": 67, COWS: 48, "PHQ-9": 27, "GAD-7": 21, "DAST-10": 10, "AUDIT-C": 12, "Craving (0 to 10)": 10 };

const ASAM_NAMES = ["Acute intoxication and withdrawal potential", "Biomedical conditions and complications", "Emotional, behavioral or cognitive conditions", "Readiness to change", "Relapse, continued use or continued problem potential", "Recovery and living environment"];
const ASAM_LEVELS: Record<Program, (0 | 1 | 2 | 3 | 4)[]> = { RES: [2, 1, 3, 2, 3, 3], WM: [3, 2, 2, 2, 2, 2], PHP: [1, 1, 2, 2, 2, 2], IOP: [1, 1, 2, 1, 2, 1] };
const ASAM_TEXT: string[][] = [
  ["Withdrawal risk is low. Scores are dated and stable.", "Withdrawal needed monitoring. Scores are dated and falling.", "Withdrawal risk is high and needs round-the-clock monitoring."],
  ["No medical condition affects treatment.", "A medical condition is present and managed.", "A medical condition needs close follow-up during treatment."],
  ["Mood and anxiety are near the clinical cutoff.", "Mood and anxiety scores are above the clinical cutoff.", "Mood and anxiety scores are well above the cutoff and still active."],
  ["Engaged and asking for treatment.", "Engaged, with some doubt about staying.", "Little engagement so far. Motivation is being built."],
  ["Relapse risk is low with current supports.", "Relapse risk is moderate. An earlier attempt did not hold.", "Relapse risk is high. Recent relapse and an earlier attempt that ended early."],
  ["Home is stable with supports nearby.", "Home is mixed. Supports are present but limited.", "Home puts recovery at risk and visits are hard to reach."],
];

function criteriaFor(seed: CaseSeed, hasDates: boolean, hasStep: boolean, dxName: string): Criterion[] {
  const [a, b] = seed.scores;
  const row = (id: string, text: string, evidence: string, source: Evidence, note: string, metNow = true, fixRec?: string): Criterion => ({ id, text, evidence, source, note, metNow, fixRec });
  return [
    row("c1", "A substance use disorder diagnosis, with severity", "The diagnosis code and a severity rating are in the evaluation", ev("Psychiatric eval p.1", `Diagnosis: ${dxName}. ${a.label} ${a.value}.`), "Diagnosis and severity are both stated."),
    row("c2", "Symptoms are assessed with dated scores", `${a.label} ${a.value} and ${b.label} ${b.value} are dated in the chart`, ev("Nursing notes", `${a.label} ${a.value} and ${b.label} ${b.value}, both with dates.`), "Dated scores found for the last review period."),
    row("c3", "Medical and psychiatric conditions are addressed", "Co-occurring conditions are treated and medications are reconciled", ev("Medication list", "Medications reconciled against the psychiatric evaluation."), hasDates ? "Reconciled, apart from one date. Integrity holds it until you answer." : "The medication list matches the evaluation.", !hasDates, hasDates ? "dates" : undefined),
    row("c4", "Readiness to change is described", "Engagement is described in the psychosocial assessment", ev("Psychosocial p.2", "Engaged in assessment and agreed to the plan."), "Stated in the psychosocial assessment."),
    row("c5", "Relapse and continued-use risk is documented", "Recent use and the risk of continued use are recorded", ev("Psychiatric eval p.3", "Recent use pattern and relapse risk are recorded."), "Dates and the length of any abstinence are in the evaluation."),
    row("c6", "The recovery environment is described", "Living situation and supports are in the assessment", ev("Psychosocial p.4", "Living situation, supports and transport are described."), "Present in the chart."),
    row("c7", "A lower level of care was tried or ruled out", "Earlier treatment and why it did not hold are recorded", ev("Psychosocial p.2", "Earlier treatment did not hold. Reason recorded."), "Documented in the chart."),
    row("c8", "The treatment plan has measurable goals", "Goals have target dates", ev("Treatment plan p.2", "Goals with target dates and a planned length of stay."), "Every goal has a target date."),
    row("c9", "A step-down plan is named", hasStep ? "Program and provider are not named yet" : "Program and first appointment are named", ev("Treatment plan p.4", hasStep ? "Step-down: program and provider not yet named." : "Step-down program and first appointment are named."), hasStep ? "Covered in the draft, but not backed by the chart yet. The payer tends to approve a shorter stay when this is open. One input from you closes it." : "Named in the plan.", !hasStep, hasStep ? "stepdown" : undefined),
  ];
}

function openItems(recs: Rec[], blocked: boolean): OpenItem[] {
  if (!blocked) return [];
  const text: Record<string, [OpenItem["kind"], string]> = {
    coverage: ["missing", "Coverage needs a fix before this can be sent"], dates: ["conflict", "One date conflict needs your answer"], stepdown: ["risk", "A step-down plan is not named yet"],
    summary: ["missing", "The earlier treatment summary is not attached"], therapy: ["missing", "A therapy note from the last 14 days is not in the packet"],
  };
  return recs.filter((r) => text[r.id]).slice(0, 3).map((r, i) => ({ id: `o${i}`, kind: text[r.id][0], text: text[r.id][1], fixRec: r.id }));
}

/** Numbers the demo states elsewhere: D-3318 has 312 similar decisions and a 55 to 72% range at 64%. */
const KNOWN: Record<string, { similar: CaseDetail["similar"]; spread: [number, number] }> = {
  "D-3318": { similar: { own: 61, network: 207, benchmark: 44 }, spread: [9, 8] },
};

/* ------------------------------------------------------------------ the builder */
export function buildFromSeed(seed: CaseSeed): CaseDetail {
  const payer = payerById(seed.payerId);
  const known = KNOWN[seed.denialId ?? seed.requestId];
  const dxName = DX[seed.dxKey].name;
  const n = hashOf(seed.id);
  const lift = seed.liftPts > 0 ? seed.liftPts : Math.max(2, Math.min(4, 96 - seed.chance));
  const recs = buildRecs(seed, payer.shortName, lift);
  const preparing = seed.phase === "preparing";
  const hasStep = preparing && recs.some((r) => r.id === "stepdown");
  const hasDates = preparing && recs.some((r) => r.id === "dates");
  const hasCov = preparing && recs.some((r) => r.id === "coverage");
  const { start, rows } = buildRows(payer.shortName, seed.chance, recs);
  const little = n % 7 === 0 && !known;
  const [s0, s1] = TREND[seed.dxKey];
  const series: TrendSeries[] = [s0, s1];
  const stable = seed.chance >= 80;
  const dateLabels = seed.program === "RES" || seed.program === "WM" ? ["10/17", "10/18", "10/19"] : ["10/6", "10/13", "10/20"];
  const keyScores: KeyScore[] = series.map((s) => {
    const now = s.data[s.data.length - 1];
    const max = SCALE_MAX[s.name] ?? 27;
    return { label: `${s.name.replace(" (0 to 10)", "")} now`, value: String(now), of: `/ ${max}, peak ${Math.max(...s.data)}`, tone: now / max >= 0.5 ? "mid" : "good" };
  });
  const sections: DraftSection[] = [
    { id: "clinical", title: "Clinical picture", text: `${seed.initials}, ${seed.age}, has ${dxName.toLowerCase()}. The request is for ${seed.days} days of ${seed.levelLabel} (${seed.type.toLowerCase()}) with ${payer.name}.`, sources: [ev("Psychiatric eval p.1", `Diagnosis: ${dxName}.`)] },
    { id: "lower", title: "Why a lower level of care is not enough", text: "The chart records an earlier attempt that did not hold and symptoms that are still active.", sources: [ev("Psychosocial p.2", "Earlier treatment did not hold. Reason recorded.")] },
    { id: "current", title: "Current severity", text: `${seed.scores.map((s) => `${s.label} ${s.value}`).join(" and ")}, with dates in the chart.`, sources: [ev("Nursing notes", `${seed.scores.map((s) => `${s.label} ${s.value}`).join(", ")}, dated.`)] },
    { id: "plan", title: "Plan", text: `${seed.days} days of ${seed.levelLabel}, then a step-down to a lower level of care.`, sources: [ev("Treatment plan p.2", "Goals with target dates and a planned length of stay.")] },
  ];
  const blocks = (id: string): string[] => (preparing && recs.some((r) => r.id === id) ? [id] : []);
  const checks: CheckDef[] = [
    { id: "chart", label: "Every sentence matches the chart", okNote: "Each statement links to a page in the chart.", warnNote: "", blockedBy: [] },
    { id: "criteria", label: "Payer criteria are covered", okNote: `All 9 ${payer.shortName} requirements are covered and backed by the chart.`, warnNote: hasCov ? "Coverage needs a fix first. Verify found a gap in the plan dates." : "9 of 9 are covered, but the step-down plan is not backed by the chart yet.", blockedBy: [...blocks("coverage"), ...blocks("stepdown")] },
    { id: "dates", label: "Dates are consistent", okNote: "No two documents disagree on a date.", warnNote: "Two documents give different start dates for the same medication.", blockedBy: blocks("dates") },
    { id: "ids", label: "Identifiers are protected", okNote: "Names, dates of birth and member IDs are masked.", warnNote: "", blockedBy: [] },
  ];
  const stands = [`${s0.name} fell from ${s0.data[0]} to ${s0.data[2]} over the review period`, `${s1.name.replace(" (0 to 10)", "")} is moving more slowly`, "Treatment is on schedule and attendance is steady", `${payer.shortName} reviews this level of care by ${payer.reachedBy.toLowerCase()}`];
  const decile = Math.floor(clamp(seed.chance + lift, 10, 99) / 10) * 10;
  return {
    id: seed.id, requestId: seed.requestId, fromQueue: seed.fromQueue, denialId: seed.denialId, initials: seed.initials, age: seed.age, payerId: seed.payerId, program: seed.program, levelLabel: seed.levelLabel, type: seed.type, days: seed.days,
    dx: seed.dx, scores: seed.scores, dueAt: seed.dueAt, dueVerb: seed.dueVerb, chip: seed.chip, atStake: seed.atStake, phase: seed.phase, agent: seed.agent, statusLine: seed.statusLine,
    baseChance: seed.chance, spread: known?.spread ?? (little ? [8, 7] : [5, 5]),
    similar: known?.similar ?? (little ? { own: 6, network: 22, benchmark: 210 } : { own: 40 + (n % 160), network: 300 + (n % 500), benchmark: 120 + (n % 160) }),
    recs, start, rows,
    summary: {
      diagnosis: `${dxName}.`, status: stable ? { text: "Stable and improving", tone: "good" } : seed.chance >= 55 ? { text: "Stable, still symptomatic", tone: "mid" } : { text: "Active symptoms, needs support", tone: "risk" },
      trajectory: `${s0.name} scores are falling with treatment. ${s1.name.replace(" (0 to 10)", "")} is moving more slowly.`,
      readiness: preparing && recs.length ? "The request is ready for signature once the open items are settled." : "The draft is ready for signature.",
      sources: { diagnosis: ev("Psychiatric eval p.1", `Diagnosis: ${dxName}.`), status: ev("Nursing notes", "Daily notes describe symptoms and function."), trajectory: ev("Psychiatric eval p.5", `${series.map((s) => `${s.name} ${s.data.join(", ")}`).join(". ")}.`), readiness: ev("Treatment plan p.2", "Goals with target dates and a planned length of stay.") },
    },
    asam: ASAM_NAMES.map((name, i) => {
      const level = ASAM_LEVELS[seed.program][i];
      return { n: i + 1, name, level, sentence: ASAM_TEXT[i][level <= 1 ? 0 : level === 2 ? 1 : 2] };
    }),
    trendLabels: dateLabels, trend: series, keyScores, standsOut: stands,
    engagement: { pct: 78 + (n % 17), checks: ["Attends groups and sessions", "Takes part in the plan", "Accepts medication changes"] },
    open: openItems(recs, preparing), policy: payer.id === "cardinal" ? "v2026.3" : payer.id === "harborview" ? "v2026.1" : "v2026.2", criteria: criteriaFor(seed, hasDates, hasStep, dxName),
    keepHigh: `${payer.shortName} tends to approve a shorter stay and ask again at the first review when the evidence is thin or a plan is left open.`,
    tool: seed.program === "RES" || seed.program === "WM" ? "Ohio level-of-care assessment" : "Ohio outpatient level-of-care screen",
    biggest: { title: hasStep ? "No named step-down provider" : "Thin evidence of recent progress", text: `In past ${payer.shortName} decisions, requests like this one were cut to fewer days when ${hasStep ? "the plan was left open" : "progress was not shown with dated scores"}.`, seen: `Seen in ${Math.max(6, 20 + (n % 90))} of your own decisions and ${300 + (n % 400)} from the network` },
    common: ["Earlier lower level of care was documented", "Symptom scores were dated and trending down", "The home situation was described in plain terms", "The step-down program was named"],
    comparable: [
      { who: "Yours", what: "Earlier attempt did not hold, plan named", outcome: `Approved ${seed.days}/${seed.days}`, tone: "good", match: "high match" },
      { who: "Network", what: `${payer.shortName}, same level of care, scores falling`, outcome: `Approved ${seed.days}/${seed.days}`, tone: "good", match: "high match" },
      { who: "Yours", what: "No step-down named", outcome: `Approved ${Math.round(seed.days / 2)}/${seed.days}`, tone: "mid", match: "close match" },
    ],
    calibration: { said: `${decile} to ${decile + 10}%`, actual: clamp(seed.chance + lift - 2, 10, 98), n: 150 + (n % 120) },
    draft: sections, versions: [{ n: 1, at: -35, by: "Scribe", note: "First draft from the chart" }, { n: 2, at: -10, by: "Scribe", note: "Checked by Integrity" }],
    checks,
  };
}
