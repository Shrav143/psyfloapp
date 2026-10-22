/* Types, constants and pure helpers for the New case flow and Case Manager.
   The store slice (store/cases.ts) and every page under pages/newcase and pages/active read from here. */
import type { DemoFile } from "@/components/ui";
import { payerById } from "./seed";
import type { AgentKey, PayerId, Program, RequestType, Tone } from "./types";
import type { Verdict } from "./eligibility";
import { clockTime, toDate } from "@/lib/time";

/* ------------------------------------------------------------------ documents */
export type FixedDocSlot = "referral" | "psych_eval" | "asam" | "psychosocial" | "nursing" | "uds" | "meds" | "treatment_plan" | "therapy_note" | "attendance";
/** A document a payer asks for that no fixed slot fits (a line added on Payers): the title follows `item:`. */
export type DocSlotId = FixedDocSlot | `item:${string}`;
export type QuestionKey = "stepdown" | "sertraline" | "recert" | "duration" | "lowerlevel";

/** One thing the document validation looked at. `resolvedBy` means an answer to that question settles it. */
export interface DocFinding {
  id: string;
  ok: boolean;
  text: string;
  resolvedBy?: QuestionKey;
  resolvedText?: string;
}
export interface DraftDocument {
  slot: DocSlotId;
  file: DemoFile;
  sample: boolean;
  status: "validating" | "done";
  findings: DocFinding[];
}

/* ------------------------------------------------------------------ the draft */
/** A field of the intake, or a document slot, that Reader filled in from a file. */
export type ReadKey = "patient" | "payer" | "member" | "program" | "type" | "diagnoses" | "reason" | `doc:${DocSlotId}`;
/** `value` is what the field held when Reader filled it, so the "read from" note goes quiet once the person changes it. */
export interface ReadNote {
  file: string;
  value: string;
}
export interface Diagnosis {
  code: string;
  label: string;
}
export interface Answer {
  key: QuestionKey;
  agent: AgentKey;
  question: string;
  choice: string; // the id of the chosen button, empty when only a note was typed
  answer: string; // what was chosen, in words
  note?: string;
  /** Given on the case page's Recommended actions. The action adds its own sentence to the summary, so the summary does not repeat it. */
  fromCase?: boolean;
}
/** `done` counts finished agents. `question` is set while an agent waits for a person.
    `asked` is true once the current agent has stopped for a question. `failed` is the agent that could not finish and waits for Retry or Skip;
    `retried` stays true after a Retry, so a second run does not fail again; `skipped` lists agents the person skipped and noted. */
export interface RunState {
  done: number;
  asked: boolean;
  question: QuestionKey | null;
  elapsed: number[];
  failed: AgentKey | null;
  retried: boolean;
  skipped: AgentKey[];
}
export interface NarrativeSection {
  id: string;
  heading: string;
  text: string;
  sources: string[];
  /** Comes from somewhere else (clinical context added on the case page), so it is shown but not edited here. */
  fixed?: boolean;
}
export interface CoverageSummary {
  key: string;
  verdict: Verdict;
  at: number;
}
export type DueKind = "notice" | "window" | "expires" | "review" | "packet";

export interface CaseDraft {
  id: string;
  caseId: string | null;
  saved: boolean;
  sent: boolean;
  step: 0 | 1 | 2;
  /** While step is 0: the referral comes first, then the medical records. */
  phase: "referral" | "records";
  patient: { initials: string; age: number | null };
  reference: string;
  payerId: PayerId | null;
  planType: string;
  state: string;
  memberId: string;
  cardRead: boolean;
  program: Program | null;
  levelLabel?: string;
  type: RequestType | null;
  what?: string;
  startDate: string; // yyyy-mm-dd
  reason: string;
  diagnoses: Diagnosis[];
  documents: DraftDocument[];
  /** Documents the person marked not available, with the reason they gave. */
  unavailable: Partial<Record<DocSlotId, string>>;
  referralId?: string;
  emrChart?: string;
  /** What Reader filled in from dropped files, for the note under each checklist row. */
  read?: Partial<Record<ReadKey, ReadNote>>;
  coverage: CoverageSummary | null;
  run: RunState;
  answers: Answer[];
  /** The questions the agents will ask in this run, in the order they come up. */
  questions: QuestionKey[];
  suggestions: string[];
  narrative: NarrativeSection[] | null;
  /** The case page's applied actions whose sentences the edited summary already holds. Read only while `narrative` is set. */
  narrativeIncludes?: string[];
  revision: number;
  /** The records changed after the agents ran, so the run started over. Shown on Agents work until the run ends. */
  recordsChanged?: boolean;
  /** Things the payer asks for that the case does not meet (required documents, backdating). Each holds the approval chance back a little. */
  unmet: number;
  sendBackNote?: string;
  startChance: number;
  finalChance: number;
  dueKind: DueKind | null;
  dueAt: number | null;
  updatedAt: number;
}

export const freshRun = (): RunState => ({ done: 0, asked: false, question: null, elapsed: [], failed: null, retried: false, skipped: [] });

/* ------------------------------------------------------------------ the agents' run */
export interface RunStep {
  agent: AgentKey;
  ms: number; // how long the step takes in the demo
  bar: number; // which of the eight progress steps it belongs to
}
export const BAR_STEPS = ["Read", "Rules", "Match", "Ask", "Draft", "Check", "Sign", "Send"] as const;
export const RUN_STEPS: RunStep[] = [
  { agent: "reader", ms: 1300, bar: 0 },
  { agent: "verify", ms: 1000, bar: 1 },
  { agent: "criteria", ms: 1400, bar: 1 },
  { agent: "historian", ms: 1300, bar: 2 },
  { agent: "placement", ms: 1000, bar: 2 },
  { agent: "forecaster", ms: 1100, bar: 2 },
  { agent: "scribe", ms: 2200, bar: 4 },
  { agent: "integrity", ms: 1400, bar: 5 },
  { agent: "packet", ms: 1300, bar: 5 },
  { agent: "scrubber", ms: 1000, bar: 5 },
];
export const SCRIBE_STEP = 6;
export const FORECAST_STEP = 6; // the approval chance is settled once this many agents are done
/** The payer whose portal Verify cannot reach on the first run of a case. Cardinal's portal is down on Sundays and often shows no status (Payers › Cardinal). */
export const FLAKY_PORTAL: PayerId = "cardinal";

/* ------------------------------------------------------------------ questions an agent can ask */
export interface QuestionDef {
  key: QuestionKey;
  agent: AgentKey;
  line: string; // one line for the Case Manager row
  text: (payerShort: string) => string;
  choices: { id: string; label: string }[];
}
export const QUESTIONS: Record<QuestionKey, QuestionDef> = {
  sertraline: {
    key: "sertraline",
    agent: "scribe",
    line: "Scribe is waiting on one answer: the sertraline start date",
    text: () => "Sertraline starts 9/14 on the medication list and 9/21 in the psychiatric evaluation. Which is right?",
    choices: [
      { id: "9/14", label: "9/14 (the medication list)" },
      { id: "9/21", label: "9/21 (the psychiatric evaluation)" },
    ],
  },
  stepdown: {
    key: "stepdown",
    agent: "scribe",
    line: "Scribe is waiting on one answer: whether a step-down provider is named",
    text: (p) => `Is a named step-down provider on file? ${p} asks for one in residential continued stays.`,
    choices: [
      { id: "named", label: "Yes, a named provider is on file" },
      { id: "later", label: "Not yet. One will be named before day 10" },
      { id: "na", label: "Not applicable for this request" },
    ],
  },
  recert: {
    key: "recert",
    agent: "packet",
    line: "Packet needs one clinician input to finish the recertification",
    text: () => "Is a discharge or step-down date planned in the next 30 days? The payer's form asks for it.",
    choices: [
      { id: "soon", label: "Yes, within 2 weeks" },
      { id: "month", label: "Yes, within 30 days" },
      { id: "open", label: "Not decided yet" },
    ],
  },
  duration: {
    key: "duration",
    agent: "scribe",
    line: "Scribe is waiting on one answer: how long the diagnosis has been present",
    text: () => "How long has the patient had this diagnosis? The psychiatric evaluation is not in the case, so Scribe cannot read it from there.",
    choices: [
      { id: "short", label: "Less than a year" },
      { id: "mid", label: "One to five years" },
      { id: "long", label: "More than five years" },
    ],
  },
  lowerlevel: {
    key: "lowerlevel",
    agent: "scribe",
    line: "Scribe is waiting on one answer: why a lower level of care is not enough",
    text: () => "Why is a lower level of care not enough? The chart does not say, and the payer will ask.",
    choices: [
      { id: "tried", label: "A lower level was tried and did not hold" },
      { id: "home", label: "Home is not safe or supportive enough" },
      { id: "severe", label: "Symptoms are too severe for a lower level" },
    ],
  },
};
export const defaultQuestion = (program: Program | null): QuestionKey => (program === "RES" || program === "WM" ? "stepdown" : "recert");

/** Things that raise the approval chance. Checking one adds a line to the draft. */
export const SUGGESTIONS = [
  { id: "stepdown", title: "Name the step-down provider", why: "Payers often cut days when none is named", gain: "+2-4", boost: 3 },
  { id: "iop", title: "Attach the 2025 IOP discharge summary", why: "Shows the lower level was tried", gain: "+1-3", boost: 2 },
] as const;

/* ------------------------------------------------------------------ pure helpers */
export type DraftState = "intake" | "question" | "working" | "ready";

export function draftState(d: CaseDraft): DraftState {
  if (d.run.question) return "question";
  if (d.run.done >= RUN_STEPS.length) return "ready";
  if (d.run.done > 0 || d.step >= 1) return "working";
  return "intake";
}
/** A draft needs a person when intake is unfinished, an agent asked something, an agent could not finish, or it waits for a signature. */
export const needsPerson = (d: CaseDraft): boolean => draftState(d) !== "working" || !!d.run.failed;

/** The eight-step bar: which step is current. -1 while intake is unfinished. */
export function barIndex(d: CaseDraft): number {
  const s = draftState(d);
  if (s === "intake") return -1;
  if (s === "question") return 3;
  if (s === "ready") return 6;
  return RUN_STEPS[Math.min(d.run.done, RUN_STEPS.length - 1)].bar;
}

/* The approval chance climbs while the first six agents finish, then holds. Cumulative share of the climb per agent done. */
const CLIMB = [0, 0, 3, 10, 16, 21, 26];
export function baseChance(d: Pick<CaseDraft, "startChance" | "finalChance" | "run">): number {
  const share = CLIMB[Math.min(d.run.done, CLIMB.length - 1)] / 26;
  return d.startChance + (d.finalChance - d.startChance) * share;
}
/** Each thing the payer asks for that the case does not meet holds the chance back by 3 points, up to 12. */
export const unmetPenalty = (unmet: number): number => Math.min(12, Math.max(0, unmet) * 3);
export function currentChance(d: CaseDraft): number {
  const boost = SUGGESTIONS.filter((s) => d.suggestions.includes(s.id)).reduce((a, s) => a + s.boost, 0);
  return Math.max(1, Math.min(97, Math.round(baseChance(d) + boost) - unmetPenalty(d.unmet)));
}
/** "likely 83-92%". The range is wider until the forecast settles. */
export function chanceRange(chance: number, settled: boolean): { lo: number; hi: number } {
  const c = Math.round(chance);
  return settled ? { lo: c - 5, hi: Math.min(99, c + 4) } : { lo: c - 9, hi: Math.min(99, c + 8) };
}
/** Similar past decisions: 1,248 for Summit residential (212 your own, 806 network, 230 benchmark), scaled for the rest. */
export function similarCases(payerId: PayerId, program: Program): { total: number; own: number; network: number; benchmark: number } {
  const total = payerId === "summit" && program === "RES" ? 1248 : 380 + ((payerId.length * 137 + program.charCodeAt(0) * 53) % 760);
  const own = Math.round(total * 0.17);
  const network = Math.round(total * 0.646);
  return { total, own, network, benchmark: total - own - network };
}

const span = (min: number): string => {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h`;
  return `${Math.round(m / (24 * 60))} days`;
};
const weekday = (at: number): string => toDate(at).toLocaleDateString("en-US", { weekday: "short" });

export function dueChip(d: CaseDraft, clock: number): { text: string; tone: Tone } | null {
  if (d.dueAt === null || !d.dueKind) return null;
  const left = d.dueAt - clock;
  if (left <= 0) return { text: "Overdue", tone: "risk" };
  switch (d.dueKind) {
    case "notice":
      return { text: `Notice due in ${span(left)}`, tone: left < 1440 ? "risk" : "mid" };
    case "window":
      return { text: `Window closes in ${span(left)}`, tone: left < 1440 ? "risk" : "mid" };
    case "expires":
      return { text: `Expires in ${span(left)}`, tone: left < 4 * 1440 ? "mid" : "neutral" };
    case "review":
      return { text: `Review due ${left < 1440 ? clockTime(toDate(d.dueAt)) : weekday(d.dueAt)}`, tone: "mid" };
    case "packet":
      return { text: `Packet due ${weekday(d.dueAt)}`, tone: "neutral" };
  }
}
/** When the clock starts for a request of this type, in minutes from now. */
export const DUE_FOR: Record<RequestType, { kind: DueKind; in: number } | undefined> = {
  Admission: { kind: "notice", in: 300 },
  "Initial request": { kind: "packet", in: 2 * 1440 },
  "Continued stay": { kind: "review", in: 1440 },
  Recertification: { kind: "expires", in: 3 * 1440 },
  Modification: { kind: "packet", in: 2 * 1440 },
  "Retro-authorization": { kind: "window", in: 18 * 60 },
  "Peer-to-peer": undefined,
  Appeal: undefined,
  Resubmission: undefined,
};

export const describeRequest = (d: CaseDraft): string => d.what ?? (!d.type ? "New request" : /request$|ation$/.test(d.type) ? d.type : `${d.type} request`);
/** "…4821": only the last four characters of a member ID are ever shown. */
export const maskMember = (id: string): string => (!id ? "" : id.startsWith("…") ? id : `…${id.replace(/\W/g, "").slice(-4)}`);
export const caseCode = (program: Program | null, n: number): string => `${program === "IOP" ? "I" : program === "PHP" ? "P" : "R"}-${n}`;

/** Plan type the intake fills in once the payer is known. */
const PLAN_TYPE_OF: Record<string, string> = { summit: "HMO", cardinal: "HMO", evergreen: "HMO", beacon: "PPO", harborview: "Medicare Advantage", lakeshore: "Behavioral carve-out" };
/** The plan type to pre-fill for a payer. A payer added on Payers maps its own type onto the same list. */
export const planTypeOf = (id: PayerId): string => PLAN_TYPE_OF[id] ?? ({ "Managed care plan": "HMO", PPO: "PPO", "Medicare Advantage": "Medicare Advantage", "Carve-out": "Behavioral carve-out" } as Record<string, string>)[payerById(id)?.type ?? ""] ?? "";
export const PLAN_TYPES = ["HMO", "PPO", "Medicare Advantage", "Behavioral carve-out", "Fee-for-service"];
export const NEW_REQUEST_TYPES: RequestType[] = ["Initial request", "Admission", "Continued stay", "Recertification", "Modification", "Retro-authorization"];

/** Where the approval chance starts and ends for a payer: its "approved as asked" rate plus 14 once the agents have worked. Summit: 62 to 88. */
export function chanceBounds(payerId: PayerId | null): { start: number; final: number } {
  const final = Math.min(94, (payerId ? payerById(payerId).approvedAsAsked : 74) + 14);
  return { start: final - 26, final };
}
