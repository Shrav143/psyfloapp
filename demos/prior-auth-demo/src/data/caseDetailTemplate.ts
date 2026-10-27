import { DAY } from "@/lib/time";
import { paths } from "@/routes";
import type { CaseDetail, CheckDef, Criterion, DimRating, DraftSection, DriverRow, Evidence, Med, OpenItem, Rec } from "./caseDetail";
import { movedText, screenersFor, type CaseScreener, type ScreenerId } from "./caseScreeners";
import { FRAMEWORKS, frameworkFor, type FrameworkId } from "./frameworks";
import { DX, MH_DX, daysRequested, dxKeyFor, dxLine, dxTrackOf, hashOf, scoresFor, type DxKey, type MhDxKey, type Phase, type QueueItem, type Score } from "./queue";
import { SEED_REQUESTS, payerById } from "./seed";
import type { AgentKey, PayerId, Program, PsyRequest, RequestType, Tone } from "./types";
import { PROGRAM_LABEL } from "./types";

/* Builds a sensible case page for any request that is not hand-written: from its queue row or its Dashboard request.
   The numbers are consistent by construction: the driver rows add up to the chance now and, with every action applied, to chance + lift. */

export interface CaseSeed {
  id: string; requestId: string; fromQueue: boolean; denialId?: string; initials: string; age: number; payerId: PayerId; program: Program; type: RequestType;
  levelLabel: string; dxKey: DxKey; mh?: MhDxKey; dx: string; scores: Score[]; days: number; dueAt?: number; dueVerb: string; chip?: { text: string; tone: Tone };
  chance: number; liftPts: number; phase: Phase; agent: AgentKey; needsInput: boolean; coverageFix: boolean;
}

export function seedFromItem(i: QueueItem): CaseSeed {
  return {
    id: i.id, requestId: i.id, fromQueue: true, initials: i.initials, age: i.age, payerId: i.payerId, program: i.program, type: i.type, levelLabel: i.levelLabel, dxKey: i.dxKey, mh: i.mh, dx: i.dx, scores: i.scores,
    days: i.days, dueAt: i.dueAt, dueVerb: i.dueVerb, chance: i.chance, liftPts: i.liftPts, phase: i.phase, agent: i.agent, needsInput: i.needsInput, coverageFix: i.coverageFix,
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
    chance, liftPts: phase === "preparing" && chance < 85 ? 8 : 0, phase, agent: r.agent, needsInput: !!r.needsYou, coverageFix: false,
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
    why: (p) => `In past decisions, ${p} often approved a shorter stay when no step-down was named, then asked for the plan at the first review.`,
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
    criteria: `All ${payer} requirements are backed by the chart`, trace: "Every sentence traces to the chart", short: `In past decisions, ${payer} often granted fewer days`,
  };
  const bases = weights.map((x) => Math.floor((pos * x) / 17));
  bases[0] += pos - bases.reduce((a, b) => a + b, 0);
  return { start, rows: [...ids.map((id, i) => ({ id, label: labels[id], base: bases[i] })), { id: "short", label: labels.short, base: -4 - moved("short") }] };
}

/* ------------------------------------------------------------------ chart-side content */
/** The two series the case page's trend chart drew before it showed every screener. They stay the defaults and keep their values. */
const TREND: Record<DxKey, [{ name: string; data: number[] }, { name: string; data: number[] }]> = {
  aud: [{ name: "CIWA-Ar", data: [14, 9, 4] }, { name: "Craving (0 to 10)", data: [7, 7, 6] }],
  oud: [{ name: "COWS", data: [12, 9, 6] }, { name: "Craving (0 to 10)", data: [7, 6, 6] }],
  stim: [{ name: "PHQ-9", data: [15, 14, 12] }, { name: "Craving (0 to 10)", data: [8, 6, 5] }],
  cann: [{ name: "DAST-10", data: [8, 7, 6] }, { name: "PHQ-9", data: [11, 9, 8] }],
  mdd: [{ name: "PHQ-9", data: [18, 16, 14] }, { name: "GAD-7", data: [13, 11, 9] }],
  gad: [{ name: "GAD-7", data: [16, 14, 12] }, { name: "AUDIT-C", data: [8, 7, 6] }],
};
/** The other screeners on file, by diagnosis. */
const MORE_SCREENERS: Record<DxKey | MhDxKey, ScreenerId[]> = {
  aud: ["bam"], oud: ["bam", "phq9"], stim: ["dast10", "bam"], cann: ["gad7", "craving"], mdd: ["auditc", "cssrs"], gad: ["phq9"],
  mdd_rec: ["gad7", "whodas"], ptsd: ["cssrs", "whodas"], bipolar: ["whodas"], gad_mh: ["whodas"],
};
const MEDS: Record<DxKey | MhDxKey, Med[]> = {
  aud: [{ name: "Naltrexone", dose: "50 mg daily" }, { name: "Gabapentin", dose: "300 mg three times a day" }],
  oud: [{ name: "Buprenorphine and naloxone", dose: "16 mg / 4 mg daily" }],
  stim: [{ name: "Bupropion XL", dose: "150 mg daily" }],
  cann: [{ name: "Hydroxyzine", dose: "25 mg as needed" }],
  mdd: [{ name: "Sertraline", dose: "100 mg daily" }, { name: "Naltrexone", dose: "50 mg daily" }],
  gad: [{ name: "Escitalopram", dose: "10 mg daily" }],
  mdd_rec: [{ name: "Sertraline", dose: "150 mg daily" }, { name: "Trazodone", dose: "50 mg at night" }],
  ptsd: [{ name: "Sertraline", dose: "100 mg daily" }, { name: "Prazosin", dose: "2 mg at night" }],
  bipolar: [{ name: "Lithium carbonate", dose: "900 mg daily" }, { name: "Quetiapine", dose: "100 mg at night" }],
  gad_mh: [{ name: "Escitalopram", dose: "15 mg daily" }, { name: "Hydroxyzine", dose: "25 mg as needed" }],
};

/** Ratings by level of care. ASAM rates risk 0 to 4; LOCUS and CALOCUS-CASII rate 1 to 5. */
const ASAM_LEVELS: Record<Program, number[]> = { RES: [2, 1, 3, 2, 3, 3], WM: [3, 2, 2, 2, 2, 2], PHP: [1, 1, 2, 2, 2, 2], IOP: [1, 1, 2, 1, 2, 1] };
const LOCUS_LEVELS: Record<Program, number[]> = { RES: [3, 4, 2, 3, 4, 3], WM: [3, 4, 2, 3, 4, 3], PHP: [3, 4, 2, 4, 3, 3], IOP: [2, 3, 2, 3, 3, 2] };
/** What the chart shows for each dimension, from a low to a high rating. */
const ASAM_TEXT: string[][] = [
  ["Withdrawal risk is low. Scores are dated and stable.", "Withdrawal needed monitoring. Scores are dated and falling.", "Withdrawal risk is high and needs round-the-clock monitoring."],
  ["No medical condition affects treatment.", "A medical condition is present and managed.", "A medical condition needs close follow-up during treatment."],
  ["Mood and anxiety are near the clinical cutoff.", "Mood and anxiety scores are above the clinical cutoff.", "Mood and anxiety scores are well above the cutoff and still active."],
  ["Engaged and asking for treatment.", "Engaged, with some doubt about staying.", "Little engagement so far. Motivation is being built."],
  ["Relapse risk is low with current supports.", "Relapse risk is moderate. An earlier attempt did not hold.", "Relapse risk is high. Recent relapse and an earlier attempt that ended early."],
  ["Home is stable with supports nearby.", "Home is mixed. Supports are present but limited.", "Home works against recovery and visits are hard to reach."],
];
const LOCUS_TEXT: string[][] = [
  ["No current thoughts of harm. Past risk is documented.", "Passive thoughts of death, no plan or intent. A safety plan is on file.", "Recent thoughts of self-harm with some intent. Checked every day."],
  ["Daily function is mostly intact.", "Work and home tasks are limited by symptoms.", "Cannot keep up with daily tasks without structure."],
  ["No medical or substance use condition affects treatment.", "A medical condition is present and stable.", "A co-occurring condition complicates treatment."],
  ["Supportive home and steady routines.", "Some stress at home. Supports are limited.", "High stress at home and few supports."],
  ["Earlier outpatient care helped.", "Earlier outpatient care helped only in part.", "Earlier care did not hold. Symptoms returned within weeks."],
  ["Engaged and attends every session.", "Engaged, with some missed sessions.", "Little engagement so far."],
];
const ASAM_SRC = ["Nursing notes", "Medication list", "Psychiatric eval p.5", "Psychosocial p.2", "Psychiatric eval p.3", "Psychosocial p.4"];
const LOCUS_SRC = ["Psychiatric eval p.3", "Psychosocial p.2", "Psychiatric eval p.1", "Psychosocial p.4", "Psychosocial p.2", "Treatment plan p.2"];

function dimsFor(framework: FrameworkId, program: Program): DimRating[] {
  const fw = FRAMEWORKS[framework];
  const asam = framework === "asam";
  const levels = (asam ? ASAM_LEVELS : LOCUS_LEVELS)[program];
  const text = asam ? ASAM_TEXT : LOCUS_TEXT;
  return fw.dims.map((d, i) => {
    const rating = levels[i];
    const band = asam ? (rating <= 1 ? 0 : rating === 2 ? 1 : 2) : rating <= 2 ? 0 : rating === 3 ? 1 : 2;
    const sentence = text[i][band];
    return { n: d.n, name: d.name, rating, sentence, source: ev((asam ? ASAM_SRC : LOCUS_SRC)[i], sentence) };
  });
}

function criteriaFor(seed: CaseSeed, hasDates: boolean, hasStep: boolean, dxName: string, framework: FrameworkId): Criterion[] {
  const [a, b] = seed.scores;
  const sud = framework === "asam";
  const row = (id: string, text: string, evidence: string, source: Evidence, note: string, metNow = true, fixRec?: string): Criterion => ({ id, text, evidence, source, note, metNow, fixRec });
  return [
    row("c1", sud ? "A substance use disorder diagnosis, with severity" : "A mental health diagnosis, with severity", "The diagnosis code and a severity rating are in the evaluation", ev("Psychiatric eval p.1", `Diagnosis: ${dxName}. ${a.label} ${a.value}.`), "Diagnosis and severity are both stated."),
    row("c2", "Symptoms are assessed with dated scores", `${a.label} ${a.value} and ${b.label} ${b.value} are dated in the chart`, ev("Nursing notes", `${a.label} ${a.value} and ${b.label} ${b.value}, both with dates.`), "Dated scores found for the last review period."),
    row("c3", "Medical and psychiatric conditions are addressed", "Co-occurring conditions are treated and medications are reconciled", ev("Medication list", "Medications reconciled against the psychiatric evaluation."), hasDates ? "Reconciled, apart from one date. Integrity holds it until you answer." : "The medication list matches the evaluation.", !hasDates, hasDates ? "dates" : undefined),
    sud
      ? row("c4", "Readiness to change is described", "Engagement is described in the psychosocial assessment", ev("Psychosocial p.2", "Engaged in assessment and agreed to the plan."), "Stated in the psychosocial assessment.")
      : row("c4", "Engagement in treatment is described", "Attendance and participation are in the notes", ev("Treatment plan p.2", "Attends sessions and agreed to the plan."), "Stated in the treatment plan."),
    sud
      ? row("c5", "Relapse and continued-use risk is documented", "Recent use and the risk of continued use are recorded", ev("Psychiatric eval p.3", "Recent use pattern and relapse risk are recorded."), "Dates and the length of any abstinence are in the evaluation.")
      : row("c5", "Risk of harm is assessed and documented", "A risk assessment and a safety plan are in the evaluation", ev("Psychiatric eval p.3", "Risk of harm assessed. Safety plan on file."), "The risk assessment is dated and signed."),
    row("c6", "The recovery environment is described", "Living situation and supports are in the assessment", ev("Psychosocial p.4", "Living situation, supports and transport are described."), "Present in the chart."),
    row("c7", "A lower level of care was tried or ruled out", "Earlier treatment and why it did not hold are recorded", ev("Psychosocial p.2", "Earlier treatment did not hold. Reason recorded."), "Documented in the chart."),
    row("c8", "The treatment plan has measurable goals", "Goals have target dates", ev("Treatment plan p.2", "Goals with target dates and a planned length of stay."), "Every goal has a target date."),
    row("c9", "A step-down plan is named", hasStep ? "Program and provider are not named yet" : "Program and first appointment are named", ev("Treatment plan p.4", hasStep ? "Step-down: program and provider not yet named." : "Step-down program and first appointment are named."), hasStep ? "Covered in the draft, not backed by the chart yet." : "Named in the plan.", !hasStep, hasStep ? "stepdown" : undefined),
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
  const n = hashOf(seed.id);
  const lift = seed.liftPts > 0 ? seed.liftPts : Math.max(2, Math.min(4, 96 - seed.chance));
  const recs = buildRecs(seed, payer.shortName, lift);
  const preparing = seed.phase === "preparing";
  const hasStep = preparing && recs.some((r) => r.id === "stepdown");
  const hasDates = preparing && recs.some((r) => r.id === "dates");
  const hasCov = preparing && recs.some((r) => r.id === "coverage");
  const { start, rows } = buildRows(payer.shortName, seed.chance, recs);
  const little = n % 7 === 0 && !known;
  const dxName = seed.mh ? MH_DX[seed.mh].name : DX[seed.dxKey].name;
  const framework = frameworkFor({ program: seed.program, track: dxTrackOf(seed), age: seed.age });
  const stable = seed.chance >= 80;
  const screeners: CaseScreener[] = screenersFor({
    id: seed.id, program: seed.program, scores: seed.scores, improving: stable,
    trend: seed.mh ? [] : TREND[seed.dxKey], trendLabels: seed.program === "RES" || seed.program === "WM" ? ["10/17", "10/18", "10/19"] : ["10/6", "10/13", "10/20"],
    extra: MORE_SCREENERS[seed.mh ?? seed.dxKey],
  });
  const [s0, s1] = screeners.filter((x) => x.shown);
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
  const stands = [`${s0.name} ${movedText(s0)} over the review period`, `${s1.name} ${movedText(s1)}`, "Treatment is on schedule and attendance is steady", `${payer.shortName} reviews this level of care by ${payer.reachedBy.toLowerCase()}`];
  const decile = Math.floor(clamp(seed.chance + lift, 10, 99) / 10) * 10;
  return {
    id: seed.id, requestId: seed.requestId, fromQueue: seed.fromQueue, denialId: seed.denialId, initials: seed.initials, age: seed.age, payerId: seed.payerId, program: seed.program, levelLabel: seed.levelLabel, type: seed.type, days: seed.days,
    dx: seed.dx, scores: seed.scores, dueAt: seed.dueAt, dueVerb: seed.dueVerb, chip: seed.chip, phase: seed.phase, agent: seed.agent, needsInput: seed.needsInput,
    baseChance: seed.chance, spread: known?.spread ?? (little ? [8, 7] : [5, 5]),
    similar: known?.similar ?? (little ? { own: 6, network: 22, benchmark: 210 } : { own: 40 + (n % 160), network: 300 + (n % 500), benchmark: 120 + (n % 160) }),
    recs, start, rows,
    summary: {
      diagnosis: `${dxName}.`, status: stable ? { text: "Stable and improving", tone: "good" } : seed.chance >= 55 ? { text: "Stable, still symptomatic", tone: "mid" } : { text: "Active symptoms, needs support", tone: "risk" },
      trajectory: `${s0.name} ${movedText(s0)}. ${s1.name} ${movedText(s1)}.`,
      readiness: preparing && recs.length ? "The request is ready for signature once the open items are settled." : "The draft is ready for signature.",
      sources: { diagnosis: ev("Psychiatric eval p.1", `Diagnosis: ${dxName}.`), status: ev("Nursing notes", "Daily notes describe symptoms and function."), trajectory: ev("Psychiatric eval p.5", `${[s0, s1].map((x) => `${x.name} ${x.points.slice(-3).map((p) => p.value).join(", ")}`).join(". ")}.`), readiness: ev("Treatment plan p.2", "Goals with target dates and a planned length of stay.") },
    },
    framework, dims: dimsFor(framework, seed.program), screeners, meds: MEDS[seed.mh ?? seed.dxKey], standsOut: stands,
    engagement: { pct: 78 + (n % 17), checks: ["Attends groups and sessions", "Takes part in the plan", "Accepts medication changes"] },
    open: openItems(recs, preparing), policy: payer.id === "cardinal" ? "v2026.3" : payer.id === "harborview" ? "v2026.1" : "v2026.2", criteria: criteriaFor(seed, hasDates, hasStep, dxName, framework),
    keepHigh: `In the sample decisions, ${payer.shortName} tended to approve a shorter stay and ask again at the first review when the evidence was thin or a plan was left open.`,
    tool: `${FRAMEWORKS[framework].name} assessment`,
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
