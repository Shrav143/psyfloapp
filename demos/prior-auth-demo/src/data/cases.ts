/* Types, constants and pure helpers for the New Authorization flow and Case Manager.
   The store slice (store/cases.ts) and every page under pages/newcase and pages/active read from here. */
import type { DemoFile } from "@/components/ui";
import { payerById } from "./seed";
import { chanceFor } from "./programTables";
import { daysRequested, dxKeyFor, dxLine, scoresFor, type QueueItem, type RequestKind } from "./queue";
import { siteOf, type SiteId } from "./sites";
import { isCoreProgram, PROGRAM_LABEL, type AgentKey, type CoreProgram, type PayerId, type Program, type PsyRequest, type RequestType, type Tone } from "./types";
import type { VaServiceId } from "./va/services";
import type { AppliedWorkflow } from "./workflow/types";
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
  /** A statement of where the document came from or what was not done, not a check that passed: drawn neutral, never as a green tick. */
  note?: boolean;
}
export interface DraftDocument {
  slot: DocSlotId;
  file: DemoFile;
  sample: boolean;
  status: "validating" | "done";
  findings: DocFinding[];
  /** Read from the shared intake record, not dropped here: where it comes from and who signed it ("ASAM assessment, signed by Dr. Rivera"). */
  from?: string;
  /** A file added to a request that comes from an intake: only its name and type are recorded. Files are never read in the demo, so no check ran. */
  unread?: boolean;
  /** A person chose this document of the record for this slot (Attach from the record); a refresh from the record leaves it alone. */
  chosen?: boolean;
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
/** Where a sentence of a record-based summary comes from: the intake's own section or module, as a link into the workspace. `to` is left out for what a person typed in New Authorization. */
export interface NarrativeRef {
  label: string;
  to?: string;
}
export interface NarrativeSection {
  id: string;
  heading: string;
  text: string;
  sources: string[];
  /** A summary drafted from an intake record: every section names the module or document it was read from (links into the workspace), or says "Not documented in the intake". */
  refs?: NarrativeRef[];
  /** Comes from somewhere else (clinical context added on the case page), so it is shown but not edited here. */
  fixed?: boolean;
}
export type DueKind = "notice" | "window" | "expires" | "review" | "packet";

/** The Authorization type chosen under the page heading. The ids are the request kinds the queue and the Dashboard already filter by. */
export type AuthKind = RequestKind;
/** What a modification asks to change. */
export type ChangeKind = "more_units" | "more_days" | "revised_dates" | "service" | "correction";
export interface ModificationChange {
  kind: ChangeKind;
  /** Days or units asked for, when the change is "more". */
  amount: number | null;
  detail: string;
}
/** What the authorization being reviewed, renewed or changed looked like when the person chose it. The summary quotes it, so the draft stays readable without the patient book. */
export interface AuthBasis {
  label: string;
  unit: "days" | "units";
  authorized: number | null;
  used: number | null;
  left: number | null;
  /** yyyy-mm-dd, or null while nothing is approved. */
  from: string | null;
  to: string | null;
}
/** Why a case went on past a warning: a duplicate, or a verification that cannot confirm coverage. It is written to the request's history. */
export interface DocumentedReason {
  kind: "duplicate" | "coverage" | "no_auth" | "unavailable";
  reason: string;
  /** What the warning was about: the case id of the duplicate, or the verification's headline. */
  about: string;
}

/** One line of the trace the payer workflow leaves on a case: which stage it ran to, what it skipped or waits for, an override, a rule it read. It is kept on the draft until the request exists,
    then written to the request's History (`posted`). Short on purpose. */
export interface WorkflowLogEntry {
  key: string;
  /** Demo minutes. */
  at: number;
  actor: AgentKey | "you" | "system";
  text: string;
  detail?: string;
  /** Already written to the request's History. */
  posted?: boolean;
}
/** A person chose between two equally specific workflows. It holds only while the same two still compete. */
export interface WorkflowChoice {
  workflowId: string;
  /** Every workflow that matched equally, so a changed case drops the choice. */
  among: string[];
  by: string;
  at: number;
}

/** The service the referral asked for and the one the clinician selected in Care planning. They stay visible whenever they differ. */
export interface ServiceNote {
  requested: VaServiceId;
  /** Null while no clinician has selected a service: the authorization then follows the request, and says so. */
  selected: VaServiceId | null;
  by?: string;
  at?: number;
  reason?: string;
  rolePlay?: boolean;
  /** The care plan version the draft was prepared from. A revised plan makes the draft ask to be refreshed. */
  carePlanVersion?: number;
}

export type PatientSex = "F" | "M" | "X";
export const SEX_LABEL: Record<PatientSex, string> = { F: "Female", M: "Male", X: "Other or not stated" };
export interface Onboarding {
  /** A second plan: its payer and member ID. Null payer means "No". */
  secondary?: { payerId: PayerId | null; memberId: string };
  clinician?: string;
  npi?: string;
  /** For a patient under 18: the guardian's initials and relationship. */
  guardian?: string;
  referralSource?: string;
}
/** The intake fields an import can fill. */
export type ImportedKey = "initials" | "dob" | "age" | "sex" | "payerId" | "planType" | "memberId" | "program" | "diagnosis" | "startDate";
export interface ImportMark {
  source: "emr" | "file" | "screenshot";
  value: string;
}

export interface CaseDraft {
  id: string;
  caseId: string | null;
  saved: boolean;
  sent: boolean;
  /** 0 holds the first three of the four stages, 1 is Clinical documentation with the agents started (it opens on their section, Authorization preparation), 2 is Review & submit. */
  step: 0 | 1 | 2;
  /** While step is 0: Patient & Service, then Coverage & Requirements, then Clinical documentation. A draft saved before round 10 may still say "referral", "intake" or "eligibility" (see stepIndex). */
  phase: "service" | "coverage" | "records";
  /** The Authorization type. It decides what Intake asks, how Eligibility behaves, which documents are typical and what the justification says. */
  kind: AuthKind;
  /** The site the case belongs to. A new patient's site is chosen in Intake; an existing patient's case is at the patient's site. */
  site: SiteId;
  /** The existing patient this case is for (a Patient id from data/patients.ts), or null for a new patient. Never a second record for the same person. */
  patientId: string | null;
  episodeId: string | null;
  authorizationId: string | null;
  /** The intake this authorization was prepared from (IN-…): the shared record Patient & Service and Clinical documentation read. Left out for a person who has no intake. */
  intakeId?: string;
  /** What the referral asked for and what the clinician selected, when the authorization comes from an intake. */
  serviceNote?: ServiceNote;
  /** The verification record this case uses: the same one Eligibility & Benefits shows. */
  verificationId: string | null;
  /** Intake has begun: a referral, a patient or "Create case manually" was chosen. */
  started: boolean;
  /** Requested last day of the stay, or the last date of service for a retro-authorization. Empty means the level of care's usual length. */
  endDate?: string;
  /** The authorization this case reviews, renews or changes, as it stood when chosen. */
  basis?: AuthBasis;
  /** Modification: what the request asks to change. */
  change?: ModificationChange;
  /** Retro-authorization: why the authorization was not obtained ahead of time. */
  retroReason?: string;
  /** The referring organization and clinician, from the referral. */
  referrer?: { org: string; clinician: string };
  /** The person went on past a warning and said why. Shown on Review and written to the request's history. */
  documented?: DocumentedReason[];
  /** Initials, age and, when known, the date of birth (yyyy-mm-dd; the age is computed from it) and sex. A draft from before the date of birth was asked keeps its age. */
  patient: { initials: string; age: number | null; dob?: string; sex?: PatientSex };
  /** The rarely needed parts of patient onboarding, folded under "More" on Intake. */
  onboarding?: Onboarding;
  /** Fields an import filled (EMR pull, file or screenshot), with the value it gave: the "From EMR" note shows until the person changes the field. */
  imported?: Partial<Record<ImportedKey, ImportMark>>;
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
  /** Documents the person asked for with "Request this document": the task it made on the intake. Nothing is sent. */
  requested?: Partial<Record<DocSlotId, { taskId: string; at: number }>>;
  referralId?: string;
  emrChart?: string;
  /** What Reader filled in from dropped files, for the note under each checklist row. */
  read?: Partial<Record<ReadKey, ReadNote>>;
  run: RunState;
  answers: Answer[];
  /** The questions the agents will ask in this run, in the order they come up. */
  questions: QuestionKey[];
  suggestions: string[];
  narrative: NarrativeSection[] | null;
  /** The "Current severity" line from the case's own scores, for a case the queue already knows (the case page says the same). Left out, the summary reads the documents. */
  severity?: string;
  /** The case page's applied actions whose sentences the edited summary already holds. Read only while `narrative` is set. */
  narrativeIncludes?: string[];
  revision: number;
  /** The records changed after the agents ran, so the run started over. Shown in the Authorization preparation section until the run ends. */
  recordsChanged?: boolean;
  /** Things the payer asks for that the case does not meet (required documents, backdating). Each holds the approval chance back a little. */
  unmet: number;
  sendBackNote?: string;
  startChance: number;
  finalChance: number;
  dueKind: DueKind | null;
  dueAt: number | null;
  updatedAt: number;
  /** The published payer workflow this case follows, by version (`appliedAt` is in it). Chosen once Intake knows the payer, the level of care and the Authorization type. */
  appliedWorkflow?: AppliedWorkflow;
  /** The workflow has run past Intake (or the request was sent): its version stays the one the case started with until a person reviews and applies another. */
  workflowPinned?: boolean;
  workflowChoice?: WorkflowChoice;
  /** The payer, level of care and Authorization type the workflow was matched for ("summit|RES|initial"). A pinned case offers a review only when these change. */
  workflowFor?: string;
  /** What the workflow did on this case, for History. */
  workflowLog?: WorkflowLogEntry[];
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
/** The payer whose portal Verify cannot reach on the first run of a case. Anthem's portal is down on Sundays and often shows no status (Payers › Anthem). */
export const FLAKY_PORTAL: PayerId = "cardinal";

/* ------------------------------------------------------------------ questions an agent can ask */
export interface QuestionDef {
  key: QuestionKey;
  agent: AgentKey;
  line: string; // one line for the Case Manager row
  /** `fromRecord`: the request is prepared from an intake record, so the question states no payer rule. */
  text: (payerShort: string, fromRecord?: boolean) => string;
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
    text: (p, fromRecord) => (fromRecord ? "Is a named step-down provider on file? Payer requirement not yet verified." : `Is a named step-down provider on file? ${p} asks for one in residential continued stays.`),
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
    text: (_p, fromRecord) => (fromRecord ? "Is a discharge or step-down date planned in the next 30 days? Payer requirement not yet verified." : "Is a discharge or step-down date planned in the next 30 days? The payer's form asks for it."),
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

/** The agents have been started on this case: some of their work is done, or the plan for the run has been made. Looking at Clinical documentation does not start them. */
export const runStarted = (d: Pick<CaseDraft, "run" | "questions">): boolean => d.run.done > 0 || d.questions.length > 0 || !!d.run.failed;

export function draftState(d: CaseDraft): DraftState {
  if (d.run.question) return "question";
  if (d.run.done >= RUN_STEPS.length) return "ready";
  if (runStarted(d)) return "working";
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
/** The approval chance a draft shows and a request carries, or null when none is shown: a Virginia service has no similar decisions, and a request prepared from an intake record gets no estimate
    (Psyflo does not predict approval of a request whose clinical content is the record's own). */
export const chanceOfDraft = (d: CaseDraft): number | null => (d.intakeId ? null : chanceFor(d.program, currentChance(d)));
/** "likely 83-92%". The range is wider until the forecast settles. */
export function chanceRange(chance: number, settled: boolean): { lo: number; hi: number } {
  const c = Math.round(chance);
  return settled ? { lo: c - 5, hi: Math.min(99, c + 4) } : { lo: c - 9, hi: Math.min(99, c + 8) };
}
/** Similar past decisions: 1,248 for Sentara residential (212 your own, 806 network, 230 benchmark), scaled for the rest. */
export function similarCases(payerId: PayerId, program: Program): { total: number; own: number; network: number; benchmark: number } {
  /* A Virginia service has no past decisions in the demo's data. */
  if (!isCoreProgram(program)) return { total: 0, own: 0, network: 0, benchmark: 0 };
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
/** R- residential and detox, I- IOP, P- PHP, S- a Virginia service (CPST, ACT, ABA and the rest). */
export const caseCode = (program: Program | null, n: number): string => `${program === "IOP" ? "I" : program === "PHP" ? "P" : program && !isCoreProgram(program) ? "S" : "R"}-${n}`;
/** The next case id for a site. A site is a function of the case id (data/sites.ts), so the id is chosen so the new case lands at the site it was made for. */
export function nextCaseCode(program: Program | null, seq: number, site: SiteId): { code: string; seq: number } {
  let n = seq;
  while (siteOf(caseCode(program, n)) !== site) n += 1;
  return { code: caseCode(program, n), seq: n + 1 };
}

/** Plan type the intake fills in once the payer is known. */
const PLAN_TYPE_OF: Record<string, string> = { summit: "Medicaid MCO", cardinal: "Medicaid MCO", evergreen: "Medicaid MCO", beacon: "Fee-for-service", harborview: "Medicaid MCO", lakeshore: "Medicaid MCO" };
/** The plan type to pre-fill for a payer. A payer added on Payers maps its own type onto the same list. */
export const planTypeOf = (id: PayerId): string => PLAN_TYPE_OF[id] ?? ({ "Managed care plan": "Medicaid MCO", "Fee-for-service": "Fee-for-service" } as Record<string, string>)[payerById(id)?.type ?? ""] ?? "";
export const PLAN_TYPES = ["Medicaid MCO", "Fee-for-service"];
/** The plans each payer offers, as its record says. The first is the one pre-filled. The five Cardinal Care MCOs are managed care; fee-for-service is the state's own. */
const PLANS_OF: Record<string, string[]> = {
  summit: ["Medicaid MCO"],
  cardinal: ["Medicaid MCO"],
  evergreen: ["Medicaid MCO"],
  beacon: ["Fee-for-service"],
  harborview: ["Medicaid MCO"],
  lakeshore: ["Medicaid MCO"],
};
/** The plan types to choose from for a payer. A payer added on Payers offers its own type. */
export const plansOf = (id: PayerId | null): string[] => (!id ? [] : PLANS_OF[id] ?? (planTypeOf(id) ? [planTypeOf(id)] : PLAN_TYPES));

/** Whole years between a date of birth (yyyy-mm-dd) and a demo minute. Null for a date that cannot be read or lies in the future. */
export function ageOn(dob: string, clock: number): number | null {
  const m = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const now = toDate(clock);
  let age = now.getFullYear() - Number(m[1]);
  if (now.getMonth() + 1 < Number(m[2]) || (now.getMonth() + 1 === Number(m[2]) && now.getDate() < Number(m[3]))) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}
export const NEW_REQUEST_TYPES: RequestType[] = ["Initial request", "Admission", "Continued stay", "Recertification", "Modification", "Retro-authorization"];

/** Where the approval chance starts and ends for a payer: its "approved as asked" rate plus 14 once the agents have worked. Sentara: 62 to 88. */
export function chanceBounds(payerId: PayerId | null): { start: number; final: number } {
  const final = Math.min(94, (payerId ? payerById(payerId).approvedAsAsked : 74) + 14);
  return { start: final - 26, final };
}

/** The Authorizations queue row for a request signed and sent in New Authorization. It is with the payer, so it sits in the band of the payer's usual decision time.
    The queue's case model covers the four core levels of care; a request for another Virginia service stays a Dashboard request with no queue row. */
export function queueItemOf(r: PsyRequest, program: CoreProgram, clock: number, levelLabel?: string): QueueItem {
  const dueAt = clock + payerById(r.payerId).typicalDecisionDays * 1440;
  const dxKey = dxKeyFor(r.id, program);
  return {
    id: r.id, initials: r.patient.initials, age: r.patient.age, payerId: r.payerId, program, type: r.type, levelLabel: levelLabel ?? PROGRAM_LABEL[program],
    dxKey, dx: dxLine(r.id, dxKey, r.type, program), scores: scoresFor(r.id, dxKey), band: dueAt - clock <= 1440 ? "day" : "week", dueAt, dueVerb: "Decision", chance: r.chance ?? 70, liftPts: 0,
    phase: "payer", agent: "navigator", status: "Payer has it. Navigator checks again in 30 minutes", needsInput: false, coverageFix: false, signal: false, days: daysRequested(program),
  };
}
