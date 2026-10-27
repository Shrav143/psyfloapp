/* Shared domain types. Every module imports from here. Module-specific shapes live in the module. */

export type Program = "RES" | "IOP" | "PHP" | "WM";
export const PROGRAM_LABEL: Record<Program, string> = { RES: "Residential 3.5", IOP: "IOP", PHP: "PHP", WM: "Detox" };
export const PROGRAMS: Program[] = ["RES", "IOP", "PHP", "WM"];

/** The four levels of care the seed authorization data is built on. */
export type CoreProgram = "RES" | "IOP" | "PHP" | "WM";
/** The other Virginia Medicaid behavioral health services (data/va/services.ts names each one). */
export type VaProgram = "ACT" | "ABA" | "MHCM" | "CRISIS" | "OPT" | "IIH" | "TDT" | "MHSS" | "PSR" | "CPST_A" | "CPST_Y" | "CPST_S" | "CSC" | "CLUB";
/** Any service an authorization can be for. */
export type AuthProgram = Program | VaProgram;
export const VA_PROGRAM_LABEL: Record<VaProgram, string> = {
  ACT: "ACT", ABA: "ABA", MHCM: "MH case management", CRISIS: "Crisis services", OPT: "Outpatient therapy",
  IIH: "IIH", TDT: "TDT", MHSS: "MHSS", PSR: "PSR", CPST_A: "CPST Adult", CPST_Y: "CPST Youth", CPST_S: "CPST School", CSC: "CSC", CLUB: "Clubhouse",
};
export const authProgramLabel = (p: AuthProgram): string => (p in PROGRAM_LABEL ? PROGRAM_LABEL[p as Program] : VA_PROGRAM_LABEL[p as VaProgram]);

export type BuiltInPayerId = "summit" | "cardinal" | "beacon" | "harborview" | "lakeshore" | "evergreen";
/** A built-in payer, or one added on Payers (its id is made up when it is added). */
export type PayerId = BuiltInPayerId | (string & {});

export interface PayerSummary {
  id: PayerId;
  name: string;
  shortName: string;
  type: string; // "Medicaid plan", "Commercial"…
  group: "Ohio Medicaid" | "Commercial" | "Medicare Advantage" | "Behavioral carve-out";
  reachedBy: string;
  approvedAsAsked: number; // %, last 90 days
  avgDecisionDays: number;
  typicalDecisionDays: number;
  denied30d: number;
  infoAsks30d: number;
}

export type AgentKey =
  | "verify" | "caller" | "navigator"
  | "reader" | "criteria" | "placement" | "scribe" | "integrity"
  | "historian" | "forecaster" | "sentinel" | "analyst"
  | "packet" | "scrubber" | "cadence" | "advocate";

export type CrewKey = "coverage" | "documentation" | "intelligence" | "casework";

export type Tone = "good" | "mid" | "risk" | "neutral";

/** The six stages on the Dashboard strip. A request denied today is in "appeal" and also counts as decided today. */
export type StageKey = "preparing" | "received" | "under_review" | "info_requested" | "decided" | "appeal";
export const STAGE_LABEL: Record<StageKey, string> = {
  preparing: "Preparing",
  received: "Received",
  under_review: "Under review",
  info_requested: "Info requested",
  decided: "Decided today",
  appeal: "Appeal or call",
};
export const STAGES: StageKey[] = ["preparing", "received", "under_review", "info_requested", "decided", "appeal"];

export type RequestType =
  | "Initial request" | "Admission" | "Continued stay" | "Recertification" | "Modification"
  | "Retro-authorization" | "Peer-to-peer" | "Appeal" | "Resubmission";
export const REQUEST_TYPES: RequestType[] = [
  "Initial request", "Admission", "Continued stay", "Recertification", "Modification", "Retro-authorization", "Peer-to-peer", "Appeal", "Resubmission",
];

export type Outcome = "approved" | "partly_approved" | "denied";
export type SentVia = "portal" | "fax" | "phone";

/** One line in a request's history. `at` is demo minutes (see lib/time). */
export interface RequestEvent {
  id: string;
  at: number;
  actor: AgentKey | "you" | "payer" | "system";
  text: string;
  done: boolean; // false = scheduled in the future (drawn dashed)
  detail?: string; // e.g. call notes
}

/** A request (authorization, review, denial route) as shown on the Dashboard. */
export interface PsyRequest {
  id: string; // R-1042, I-2207, P-1499 or D-3318 for a denial
  caseId: string; // the case it belongs to
  patient: { initials: string; age: number };
  payerId: PayerId;
  program: Program;
  type: RequestType;
  stage: StageKey; // where it sits now
  chip: string; // chip text: "Under review", "Approved", "Call booked"…
  tone: Tone; // chip tone
  track: "auth" | "denial"; // which four bars to draw
  progress: 0 | 1 | 2 | 3; // bar position (0-3)
  stageSince: number; // demo minutes when it entered its stage
  typicalMin?: number; // typical minutes in this stage for this payer
  deadlineAt?: number; // demo minutes; denials show time left instead of time in stage
  clockNote?: string; // overrides the clock text, e.g. "decision 11/10"
  clockSub?: string; // second line under the clock
  agent: AgentKey; // who has it
  next: string; // "What happens next"
  needsYou?: boolean;
  decidedToday?: boolean;
  outcome?: Outcome;
  sentVia: SentVia;
  chance?: number; // approval chance 0-100 (for requests) or chance of winning (for denials)
  referralId?: string; // set when the case was started from a referral
  /** Set by New Case: the patient, the treatment episode, the authorization and the verification the request belongs to (see data/patients.ts). */
  patientId?: string;
  episodeId?: string;
  authorizationId?: string;
  verificationId?: string;
  events: RequestEvent[];
}

/* ---------- referrals (shared so the new-case flow can pre-fill from one) ---------- */
export type Urgency = "routine" | "urgent" | "emergent";

/** What the New Case flow needs to start from a referral. Implemented by store/referrals.ts: referralPrefill(). */
export interface NewCasePrefill {
  referralId: string;
  patientInitials: string;
  age: number;
  payerId: PayerId | null;
  memberIdMasked: string;
  program: Program;
  diagnoses: { code: string; label: string }[];
  reason: string;
  urgency: Urgency;
  referrerName: string;
  sourceName: string;
}

export interface AppNotification {
  id: string;
  at: number;
  agent: AgentKey | "system";
  title: string;
  body: string;
  to?: string; // route to open
  read: boolean;
  tone: Tone;
}

export interface Toast {
  id: string;
  title: string;
  body?: string;
  tone: Tone;
}
