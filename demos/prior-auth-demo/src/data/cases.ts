/* Types, constants and pure helpers for the New case flow and Case Manager.
   The store slice (store/cases.ts) and every page under pages/newcase and pages/active read from here. */
import type { DemoFile } from "@/components/ui";
import { payerById } from "./seed";
import type { AgentKey, PayerId, Program, RequestType, Tone } from "./types";
import type { Verdict } from "./eligibility";
import { clockTime, toDate } from "@/lib/time";

/* ------------------------------------------------------------------ documents */
export type DocSlotId = "referral" | "psych_eval" | "asam" | "psychosocial" | "nursing" | "uds" | "meds" | "treatment_plan" | "therapy_note" | "attendance";
export type QuestionKey = "stepdown" | "sertraline" | "recert";

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
}
/** `done` counts finished agents. `question` is set while an agent waits for a person. */
export interface RunState {
  done: number;
  asked: boolean;
  question: QuestionKey | null;
  elapsed: number[];
}
export interface NarrativeSection {
  id: string;
  heading: string;
  text: string;
  sources: string[];
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
  referralId?: string;
  emrChart?: string;
  coverage: CoverageSummary | null;
  run: RunState;
  answers: Answer[];
  questionKey: QuestionKey | null;
  suggestions: string[];
  narrative: NarrativeSection[] | null;
  revision: number;
  sendBackNote?: string;
  startChance: number;
  finalChance: number;
  dueKind: DueKind | null;
  dueAt: number | null;
  updatedAt: number;
}

export const freshRun = (): RunState => ({ done: 0, asked: false, question: null, elapsed: [] });

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
export const MAX_QUESTIONS = 3;

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
/** A draft needs a person when intake is unfinished, an agent asked something, or it waits for a signature. */
export const needsPerson = (d: CaseDraft): boolean => draftState(d) !== "working";

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
export function currentChance(d: CaseDraft): number {
  const boost = SUGGESTIONS.filter((s) => d.suggestions.includes(s.id)).reduce((a, s) => a + s.boost, 0);
  return Math.min(97, Math.round(baseChance(d) + boost));
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
export const AT_STAKE: Record<Program, number> = { RES: 22400, IOP: 5400, PHP: 6900, WM: 9100 };

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
export const PLAN_TYPE: Record<PayerId, string> = { summit: "HMO", cardinal: "HMO", evergreen: "HMO", beacon: "PPO", harborview: "Medicare Advantage", lakeshore: "Behavioral carve-out" };
export const PLAN_TYPES = ["HMO", "PPO", "Medicare Advantage", "Behavioral carve-out", "Fee-for-service"];
export const NEW_REQUEST_TYPES: RequestType[] = ["Initial request", "Admission", "Continued stay", "Recertification", "Retro-authorization"];

/** Where the approval chance starts and ends for a payer: its "approved as asked" rate plus 14 once the agents have worked. Summit: 62 to 88. */
export function chanceBounds(payerId: PayerId | null): { start: number; final: number } {
  const final = Math.min(94, (payerId ? payerById(payerId).approvedAsAsked : 74) + 14);
  return { start: final - 26, final };
}
