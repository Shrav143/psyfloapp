import type { PsyRequest, Tone } from "./types";
import { DAY, HOUR } from "@/lib/time";

/* Denial Intelligence data: what we know about each denial beyond the core request.
   The core request (store `requests`) carries payer, program, amount, chip and clock. */

export type DenialType = "Partial approval" | "Level-of-care downgrade" | "Units cut" | "Late notice" | "Retro-authorization denied" | "Full denial";

export interface DenialMeta {
  type: DenialType;
  /** The short line shown in lists, e.g. "Units cut 48 to 30". */
  summary: string;
  daysRequested?: number;
  daysApproved?: number;
  unitsRequested?: number;
  unitsApproved?: number;
  /** Number of similar decisions behind the chance. Below 60 the chance is labelled a benchmark estimate. */
  similar: number;
  /** The call window for a denial that already had a call booked when the demo starts. */
  bookedWindow?: string;
  /** Set when the denial came from a letter added on the Denial Intelligence screen. */
  letterName?: string;
  note?: string;
}

export const SEED_DENIAL_META: Record<string, DenialMeta> = {
  "D-3318": { type: "Partial approval", summary: "Partial approval", daysRequested: 14, daysApproved: 7, similar: 312, bookedWindow: "Wed 10/21, 9–11 am" },
  "D-3301": { type: "Level-of-care downgrade", summary: "Level-of-care downgrade", similar: 188 },
  "D-3297": { type: "Units cut", summary: "Units cut 48 to 30", unitsRequested: 48, unitsApproved: 30, similar: 204, bookedWindow: "Fri 10/23" },
  "D-3290": { type: "Late notice", summary: "Late notice", similar: 96 },
  "D-3284": { type: "Retro-authorization denied", summary: "Retro-auth denied", similar: 71 },
  "D-3279": { type: "Full denial", summary: "Full denial", similar: 143 },
  "D-3272": { type: "Partial approval", summary: "Partial approval", daysRequested: 10, daysApproved: 5, similar: 58 },
  "D-3306": { type: "Retro-authorization denied", summary: "Retro-auth denied", similar: 119 },
};

/** Words that tie a denial type to the reason texts Analytics uses ("Missing recent therapy notes"). A reason filter matches a denial
    when the reason and one of these words (or the type itself) contain each other. */
export const REASON_TERMS: Record<DenialType, string[]> = {
  "Partial approval": ["partial", "continued-stay", "continued stay", "evidence", "therapy note", "step-down"],
  "Level-of-care downgrade": ["level of care", "level-of-care", "asam", "mood severity"],
  "Units cut": ["units"],
  "Late notice": ["late notice", "filed too late", "filed late", "window missed", "phone confirmation"],
  "Retro-authorization denied": ["retro"],
  "Full denial": ["missing", "documentation", "incomplete", "certification", "fax", "duplicate"],
};

/** The one seeded denial where the best option is to accept. It is added to the Dashboard's requests when the store starts (see store/denials.ts). */
const logged = (at: number, actor: PsyRequest["events"][number]["actor"], text: string): PsyRequest["events"][number] => ({ id: `D-3306@${at}`, at, actor, text, done: true });
export const SEED_ACCEPT_DENIAL: PsyRequest = {
  id: "D-3306", caseId: "I-2127", patient: { initials: "S.K.", age: 41 }, payerId: "summit", program: "IOP", type: "Peer-to-peer",
  stage: "appeal", chip: "Analyzed", tone: "mid", track: "denial", progress: 0, stageSince: -(3 * DAY + 4 * HOUR), deadlineAt: 4 * DAY, clockSub: "peer-to-peer window",
  atStake: 5400, agent: "advocate", next: "Advocate laid out the options. Accepting may be the better use of time", chance: 27, outcome: "denied", sentVia: "portal",
  events: [
    logged(-(3 * DAY + 4 * HOUR), "payer", "The payer denied the retro-authorization request"),
    logged(-(3 * DAY + 4 * HOUR) + 6, "reader", "Reader read the denial letter and removed identifiers"),
    logged(-(3 * DAY + 4 * HOUR) + 9, "advocate", "Advocate checked the notice, the deadline and how the payer applied its own criteria"),
    logged(-(3 * DAY + 4 * HOUR) + 12, "historian", "Historian compared 119 similar Summit decisions"),
  ],
};

/** Sample letters for the "Use sample letter" button. Each one becomes a new denial. */
export interface SampleLetter {
  file: string;
  initials: string;
  age: number;
  payerId: "beacon" | "summit" | "harborview" | "lakeshore";
  program: "RES" | "IOP" | "PHP";
  meta: DenialMeta;
  atStake: number;
  chance: number;
  /** Minutes from now until the peer-to-peer window closes. */
  windowMin: number;
}
export const SAMPLE_LETTERS: SampleLetter[] = [
  { file: "beacon-denial-letter-sample.pdf", initials: "R.V.", age: 44, payerId: "beacon", program: "RES", atStake: 11200, chance: 59, windowMin: 4 * DAY, meta: { type: "Level-of-care downgrade", summary: "Level-of-care downgrade", similar: 167 } },
  { file: "summit-denial-letter-sample.pdf", initials: "A.G.", age: 31, payerId: "summit", program: "IOP", atStake: 5600, chance: 66, windowMin: 2 * DAY + 6 * HOUR, meta: { type: "Units cut", summary: "Units cut 36 to 24", unitsRequested: 36, unitsApproved: 24, similar: 221 } },
  { file: "harborview-denial-letter-sample.pdf", initials: "W.S.", age: 58, payerId: "harborview", program: "PHP", atStake: 7800, chance: 48, windowMin: 5 * DAY, meta: { type: "Partial approval", summary: "Partial approval", daysRequested: 12, daysApproved: 6, similar: 84 } },
];

export interface FindingText {
  sev: "Critical" | "Strong";
  title: string;
  detail: string;
  source: string;
  /** What the source says, shown when someone opens the source chip. */
  excerpt: string;
  fix: string;
}
export interface PointText { title: string; detail: string; source: string }
export interface DimText { name: string; tone: Tone; text: string }

/** All the words of one analysis and brief. `{payer}`-style placeholders are filled from the denial (see lib/analysis). */
export interface AnalysisText {
  short: string;
  quote: string;
  chartShows: string;
  findings: FindingText[];
  dimsSub: string;
  dims: DimText[];
  opening: string;
  points: PointText[];
  pushback: [string, string][];
  ask: string;
  regained: string;
}

const DIMS: DimText[] = [
  { name: "D1 Withdrawal", tone: "mid", text: "Withdrawal scores are low, but cravings are still reported at the most recent review." },
  { name: "D2 Medical", tone: "good", text: "Medications are still being adjusted, and monitoring continues." },
  { name: "D3 Mood and thinking", tone: "risk", text: "Symptom scores were above the clinical cutoff at the last review." },
  { name: "D4 Readiness", tone: "mid", text: "Engaged in treatment, with the link between cravings and mood still forming." },
  { name: "D5 Relapse risk", tone: "risk", text: "Risk is high, and no outpatient provider is lined up." },
  { name: "D6 Home", tone: "risk", text: "The home setting has little support for recovery." },
];
export const GENERIC_DIMS = DIMS;

/** D-3318 is written out in full, as in the mockup, and so is D-3306, whose findings are thin on purpose: it is the denial where accepting is the better choice.
    Every other denial is generated from a template. */
export const AUTHORED_TEXT: Record<string, AnalysisText> = {
  "D-3318": {
    short: "Cardinal approved 7 of 14 days",
    quote: "Cardinal approved 7 of the 14 days requested and wrote that continued stay is not supported by documented progress, recommending a step-down to a lower level of care.",
    chartShows: "Mood and craving scores are still above the clinical cutoff on day 6, both medications are mid-titration, and no outpatient program is lined up. Leaving now would stop treatment before it has worked.",
    findings: [
      { sev: "Critical", title: "Cardinal's reason conflicts with the chart", detail: "Craving was 7 of 10 and the depression score was still 15 on day 6.", source: "Progress note 10/14", excerpt: "Day 6. Craving rated 7 of 10 by the clinician. PHQ-9 15, GAD-7 13, both above the clinical cutoff. Group attendance full. Not yet linking cravings to low mood.", fix: "Add the progress note from 10/14" },
      { sev: "Critical", title: "Medication changes are still in progress", detail: "Naltrexone started day 3 and sertraline was adjusted day 5.", source: "MAR 10/11–14", excerpt: "Naltrexone 50 mg started 10/11 (day 3). Sertraline raised from 50 to 100 mg on 10/13 (day 5). Next dose review 10/17. No adverse effects recorded.", fix: "Attach the medication record for 10/11 to 10/14" },
      { sev: "Strong", title: "No safe step-down exists this week", detail: "Home is unsafe and the only partial hospital program has a waitlist.", source: "Referral log", excerpt: "Partial hospital referral sent 10/14. Waitlist, earliest opening 10/28. Lives with a roommate who uses. No family contact, no outpatient provider.", fix: "Attach the referral log showing the waitlist" },
    ],
    dimsSub: "Day 6",
    dims: [
      { name: "D1 Withdrawal", tone: "mid", text: "Craving rated 7 of 10 by the clinician. Withdrawal scores are low, but cannabis use continues." },
      { name: "D2 Medical", tone: "good", text: "Medications are still being titrated. Naltrexone started on day 3, sertraline adjusted on day 5." },
      { name: "D3 Mood and thinking", tone: "risk", text: "Depression score 15 and anxiety score 13 on day 6, both still above the clinical cutoff." },
      { name: "D4 Readiness", tone: "mid", text: "Engaged in group, but does not yet connect cravings to the mood symptoms." },
      { name: "D5 Relapse risk", tone: "risk", text: "High. Cannabis is the main way he copes and no outpatient provider is lined up." },
      { name: "D6 Home", tone: "risk", text: "Lives with a roommate who uses. No family contact and no support network." },
    ],
    opening: "I am calling about a partial approval for a 38-year-old man in residential care for severe alcohol use disorder with depression. Cardinal approved 7 of 14 days. I would like to review why, and ask you to restore days 8 to 14.",
    points: [
      { title: "Craving and mood are still above the clinical cutoff on day 6", detail: "Craving 7 of 10 and depression score 15 on the day of the denial. Stopping now would end treatment before it works.", source: "Progress note 10/14" },
      { title: "Both medications are mid-titration", detail: "Naltrexone started on day 3 and sertraline was adjusted on day 5. Neither has reached its full effect.", source: "MAR 10/11–14" },
      { title: "There is no safe step-down this week", detail: "The only partial hospital program has a waitlist, and the home has no support.", source: "Referral log" },
    ],
    pushback: [
      ["“He is engaged and stable, so outpatient is enough.”", "Engagement is a reason to continue. Scores are still above cutoff, and the 2025 outpatient attempt ended in week 3."],
      ["“Seven days is the usual first approval.”", "Seven days ends before the medications take effect. Ask for days 8 to 14 with a review on day 14."],
      ["“Why not partial hospitalization now?”", "No program has an opening, and he would return to a home with active use."],
    ],
    ask: "Restore days 8 to 14, with a review on day 14 and the step-down provider named at that review.",
    regained: "5 to 7 days regained",
  },
  "D-3306": {
    short: "{payer} denied the retro-authorization",
    quote: "{payer} denied the retro-authorization request because it was received 9 days after admission, outside the 72-hour window, and coverage was not pending on the admission date.",
    chartShows: "The chart confirms the admission date and the date the request was sent. No eligibility check from the day of admission is on file, so nothing shows that coverage was pending.",
    findings: [
      { sev: "Strong", title: "Coverage became effective 3 days after admission", detail: "The payer's eligibility update covers the later days of the stay, but not the first three.", source: "Eligibility update", excerpt: "Member coverage effective from 3 days after the admission date. No pending status is recorded for the admission date.", fix: "Attach the eligibility update for the days after the effective date" },
      { sev: "Strong", title: "The 72-hour rule has one exception, and the chart does not meet it", detail: "A late retro request is accepted when coverage was pending on the admission date and the check is on file.", source: "Payer rules, Backdating", excerpt: "A retro request is accepted within 72 hours of admission, or later when coverage was pending on the admission date and the eligibility check is on file.", fix: "Find the eligibility check from the admission date" },
    ],
    dimsSub: "",
    dims: [],
    opening: "I am calling about a retro-authorization denial for a {age}-year-old in {program} care. The request reached {payer} on day 9. I would like to ask whether the days after the coverage effective date can be approved.",
    points: [
      { title: "Coverage became effective 3 days after admission", detail: "The days after the effective date can be asked for, even if the first three cannot.", source: "Eligibility update" },
      { title: "The receipt shows the send date", detail: "The ask is limited to what the rule allows.", source: "Portal receipt" },
      { title: "The rule allows a late request when coverage was pending", detail: "The admission-date check is not on file yet, so this point is not ready to use.", source: "Payer rules, Backdating" },
    ],
    pushback: [
      ["“The request came outside the 72 hours.”", "Agreed for the first days. The ask is limited to the days after coverage became effective."],
      ["“Coverage was not pending at admission.”", "No check from that day is on file, so this is not an argument we can make yet."],
    ],
    ask: "Approve the days after the coverage effective date, and treat the first 3 days as not covered.",
    regained: "Part of the retro days at most",
  },
};

export const APPEAL_WINDOW_DAYS = 60;

/** The ladder after a peer-to-peer call: a first appeal, a payer second level, then external review. Each level has its own window to file. */
export interface AppealLevel {
  name: string;
  /** The chip on the request once a letter for this level is filed. */
  filedChip: string;
  /** Days to file once the level before it was upheld. */
  days: number;
}
export const APPEAL_LEVELS: AppealLevel[] = [
  { name: "Appeal", filedChip: "Appeal filed", days: APPEAL_WINDOW_DAYS },
  { name: "Second-level appeal", filedChip: "Second-level appeal filed", days: 60 },
  { name: "External review", filedChip: "External review", days: 120 },
];

/* ---------- work the user has done on a denial (kept in the denials slice) ---------- */
export interface CallSlot {
  id: string;
  /** "Wed 10/21, 9–11 am" */
  label: string;
  /** "Wed 10/21 9 am" */
  short: string;
  startAt: number;
}
export type OutcomeKind = "overturned" | "partly" | "upheld";
export interface DenialWork {
  slot?: CallSlot;
  /** Fix ids from the Where it is weak card that the user added to the evidence. */
  fixes: string[];
  /** Documents ticked on the brief's "Have these open" list. */
  ticked: string[];
  appealDraft?: { text: string; evidence: string[]; draftedAt: number };
  appealFiled?: { at: number; role: string; decisionBy: string };
  outcome?: { kind: OutcomeKind; note: string; at: number };
  /** The payer's decision on a filed appeal, recorded by the user. `nextLevel` is set when an upheld decision went on to the next level. */
  decision?: { result: OutcomeKind; note: string; at: number; nextLevel?: string };
  /** Which rung of APPEAL_LEVELS the current or last appeal is on. Not set until a next level starts. */
  level?: number;
  accepted?: { reason: string; at: number };
}

/** Rung of the appeal ladder for a denial: set once a next level starts, otherwise read from the chip (seeded external reviews). */
export const levelOf = (chip: string, work: DenialWork | undefined): number => work?.level ?? (chip === "External review" ? 2 : 0);
