import type { CaseDetail, Evidence } from "./caseDetail";
import { SCREENERS, atOf, type CaseScreener, type ScreenerId } from "./caseScreeners";

/* R-1042 (J.M., 34, Sentara Community Plan, Residential 3.5, admission), written by hand.
   Chance 62% before any action, 88% once all six recommendations are applied:
   58 (start) + 11 + 9 + 6 + 5 + 3 - 4 = 88, and 58 + 4 + 6 + 2 + 0 + 0 - 8 = 62 before. */

const ev = (label: string, quote: string): Evidence => ({ label, quote });
const PSY1 = ev("Psychiatric eval p.1", "Diagnosis: alcohol use disorder, severe (F10.20). Major depressive disorder, recurrent, moderate (F33.1). AUDIT-C 11.");
const PSY3 = ev("Psychiatric eval p.3", "Relapse on 9/28 after eleven months of abstinence. Drinking daily for the two weeks before this request.");
const PSY5 = ev("Psychiatric eval p.5", "PHQ-9 17. GAD-7 14. Craving rated 7 out of 10 on 10/17.");
const NURSE = ev("Nursing notes", "CIWA-Ar 14 on 10/17 at 06:10, treated per protocol. CIWA-Ar 9 on 10/18. CIWA-Ar 4 on 10/19 at 06:00.");
const SOC2 = ev("Psychosocial p.2", "Intensive outpatient program in 2025 ended in week 3 when housing was lost. Asked for residential care himself.");
const SOC4 = ev("Psychosocial p.4", "Lives with a partner who drinks daily. No reliable transport to outpatient visits.");
const PLAN2 = ev("Treatment plan p.2", "Seven goals with target dates. Planned stay: fourteen days of residential care.");
const PLAN4 = ev("Treatment plan p.4", "Step-down: program and provider not yet named.");
const MEDS = ev("Medication list", "Sertraline 50 mg daily. Start date 9/14.");

/** Twice-daily withdrawal and craving scores from the nursing notes (CIWA-Ar 14 on 10/17, 9 on 10/18, 4 on 10/19), weekly mood and anxiety scores from the outpatient chart. */
const at = (md: string, h: number, m = 0) => atOf(md, h, m);
const screener = (id: ScreenerId, shown: boolean, points: [number, number][]): CaseScreener => ({ id, ...SCREENERS[id], shown, points: points.map(([t, value]) => ({ at: t, value })) });
const SHIFTS: number[] = [at("10/17", 6, 10), at("10/17", 14), at("10/17", 22), at("10/18", 6), at("10/18", 14), at("10/18", 22), at("10/19", 6)];
const WEEKS: number[] = [at("9/15", 10), at("9/22", 10), at("9/29", 10), at("10/6", 10), at("10/13", 10), at("10/17", 9)];
const zip = (ts: number[], vs: number[]): [number, number][] => ts.map((t, i) => [t, vs[i]]);

export const R1042_DETAIL: CaseDetail = {
  id: "R-1042", requestId: "R-1042", fromQueue: true, initials: "J.M.", age: 34, payerId: "summit", program: "RES", levelLabel: "Residential 3.5", type: "Admission", days: 14,
  dx: "Alcohol use disorder, severe, with recurrent depression",
  scores: [{ label: "AUDIT-C", value: "11" }, { label: "PHQ-9", value: "17", trend: "up" }, { label: "CIWA", value: "14 → 4" }],
  dueAt: 5 * 60, dueVerb: "Notice due", phase: "preparing", agent: "scribe", needsInput: true,
  baseChance: 62, spread: [5, 4], similar: { own: 212, network: 806, benchmark: 230 },
  start: 58,
  rows: [
    { id: "lower", label: "A lower level of care was tried and failed", base: 4 },
    { id: "severity", label: "Withdrawal and depression severity are documented", base: 6 },
    { id: "home", label: "Home environment is documented", base: 2 },
    { id: "criteria", label: "All nine Sentara requirements are backed by the chart", base: 0 },
    { id: "trace", label: "Every sentence traces to the chart", base: 0 },
    { id: "short", label: "In past decisions, Sentara often granted only 7 days", base: -8 },
  ],
  recs: [
    {
      id: "stepdown", title: "Name the step-down provider", agent: "scribe", moves: { criteria: 5, short: 4, lower: 2 },
      bullets: ["Scribe adds the partial hospitalization program and the first appointment", "Satisfies Sentara's requirement for a documented step-down", "One input needed: confirm the program and the start date"],
      why: "In past decisions, Sentara often approved only the first seven days when no step-down was named, then asked for the plan at the first review.",
      input: { label: "Step-down program and first appointment", placeholder: "e.g. Partial hospitalization at …, first visit Mon 11/2 at 9 am" },
      add: { section: "plan", text: (a) => `Step-down plan: ${a.trim().replace(/\.$/, "")}.`, source: ev("Your answer", "Typed by you for Scribe on this request.") },
    },
    {
      id: "iop", title: "Attach the 2025 IOP closing summary", agent: "packet", moves: { lower: 5 },
      bullets: ["Packet adds the summary as an exhibit", "Shows that a lower level of care was tried and ended early"],
      why: "In past decisions, a documented earlier attempt at a lower level of care weighed more with Sentara than any other single item.",
      add: { section: "lower", text: () => "The 2025 intensive outpatient closing summary is attached as Exhibit B and records that the program ended in week 3.", source: ev("IOP closing summary 2025", "Program ended in week 3 of 12. Reason: loss of housing. Not a clinical decision to step down.") },
    },
    {
      id: "sertraline", title: "Settle the sertraline start date", agent: "integrity", moves: { trace: 2 },
      bullets: ["The medication list says 9/14 and the psychiatric evaluation says 9/21", "Integrity will not let a conflicting date into the draft"],
      why: "A date that differs between two documents is one of the most common reasons for an information request.",
      input: { label: "Which start date is correct?", placeholder: "e.g. 9/21, as written in the psychiatric evaluation" },
      add: { section: "current", text: (a) => `Sertraline was started on ${a.trim().replace(/\.$/, "")}.`, source: ev("Your answer", "Typed by you for Integrity on this request.") },
    },
    {
      id: "therapy", title: "Add the therapy note from the last 14 days", agent: "reader", moves: { severity: 2, trace: 1 },
      bullets: ["Reader found a group therapy note dated 10/18 in the chart system", "Packet attaches it so all 9 of Sentara's documents are present"],
      why: "Sentara lists a therapy note from the last 14 days among its nine required documents. Eight are in the packet today.",
      add: { section: "current", text: () => "A group therapy note from 10/18 shows full attendance and active participation.", source: ev("Group therapy note 10/18", "Attended all three groups. Spoke about the relapse and the plan for the first week.") },
    },
    {
      id: "home", title: "Describe home safety in plain terms", agent: "scribe", moves: { home: 4 },
      bullets: ["Scribe states that he lives with a partner who drinks daily", "Adds that there is no transport to outpatient visits"],
      why: "Approved Sentara requests described the home in plain, specific terms rather than general words such as unstable.",
      add: { section: "lower", text: () => "He lives with a partner who drinks daily and has no transport to outpatient visits.", source: SOC4 },
    },
    {
      id: "scores", title: "Add dated withdrawal and craving scores", agent: "scribe", moves: { severity: 1 },
      bullets: ["Scribe lists CIWA-Ar 14 on 10/17, 9 on 10/18 and 4 on 10/19", "Adds craving at 6 to 7 of 10 on each date"],
      why: "Dated scores let the reviewer see the trend without opening the chart.",
      add: { section: "current", text: () => "Withdrawal scores (CIWA-Ar) were 14 on 10/17, 9 on 10/18 and 4 on 10/19, and craving stayed at 6 to 7 of 10.", source: NURSE },
    },
  ],
  summary: {
    diagnosis: "Alcohol use disorder, severe. Major depressive disorder, recurrent. Anxiety symptoms.",
    status: { text: "Stable in withdrawal, still symptomatic", tone: "mid" },
    trajectory: "Withdrawal scores falling with medication. Craving and mood scores still high.",
    readiness: "The request is ready for signature once the open items below are settled.",
    sources: { diagnosis: PSY1, status: NURSE, trajectory: PSY5, readiness: PLAN2 },
  },
  framework: "asam",
  dims: [
    { n: 1, name: "Acute intoxication and withdrawal potential", rating: 2, sentence: "Withdrawal needed medication and fell from 14 to 4 on the CIWA-Ar in two days.", source: NURSE },
    { n: 2, name: "Biomedical conditions and complications", rating: 1, sentence: "Liver tests are mildly raised. No condition needs a medical unit.", source: PSY1 },
    { n: 3, name: "Emotional, behavioral or cognitive conditions", rating: 3, sentence: "Depression score 17 and anxiety score 14, both above the clinical cutoff.", source: PSY5 },
    { n: 4, name: "Readiness to change", rating: 1, sentence: "He is engaged and asked for residential care himself.", source: SOC2 },
    { n: 5, name: "Relapse, continued use or continued problem potential", rating: 3, sentence: "Relapse on 9/28 after eleven months. An IOP attempt in 2025 ended in week 3.", source: PSY3 },
    { n: 6, name: "Recovery and living environment", rating: 3, sentence: "He lives with a partner who drinks daily and has no transport to outpatient visits.", source: SOC4 },
  ],
  screeners: [
    screener("ciwa", true, zip(SHIFTS, [14, 12, 11, 9, 8, 6, 4])),
    screener("craving", true, zip(SHIFTS, [7, 7, 7, 7, 7, 6, 6])),
    screener("phq9", false, zip(WEEKS, [12, 12, 14, 15, 16, 17])),
    screener("gad7", false, zip(WEEKS, [10, 10, 12, 13, 13, 14])),
  ],
  meds: [{ name: "Sertraline", dose: "50 mg daily" }],
  standsOut: ["Relapse on 9/28 after eleven months of abstinence", "Withdrawal needed medication and fell from 14 to 4 in two days", "Depression and craving are still above the clinical cutoff", "An IOP attempt in 2025 ended in week 3 when housing was lost"],
  engagement: { pct: 92, checks: ["Attended every group so far", "Asked for residential care himself", "Accepted medication changes"] },
  open: [
    { id: "o1", kind: "conflict", text: "One date conflict needs your answer: sertraline start 9/14 or 9/21", fixRec: "sertraline" },
    { id: "o2", kind: "risk", text: "Relapse risk is high without a named step-down", fixRec: "stepdown" },
    { id: "o3", kind: "missing", text: "A therapy note from the last 14 days is missing (8 of 9 Sentara documents)", fixRec: "therapy" },
  ],
  policy: "v2026.3",
  criteria: [
    { id: "c1", text: "A substance use disorder diagnosis, with severity", evidence: "ICD-10 F10.20 and AUDIT-C 11 are in the evaluation", source: PSY1, note: "Diagnosis and severity are both stated, as Sentara asks.", metNow: true },
    { id: "c2", text: "Withdrawal risk is assessed with dated scores", evidence: "CIWA-Ar 14 on 10/17, 4 on 10/19", source: NURSE, note: "Two dated scores found. A third (10/18) is in the nursing notes.", metNow: true },
    { id: "c3", text: "Medical and psychiatric conditions are addressed", evidence: "Depression and anxiety are treated, medications reconciled", source: MEDS, note: "Reconciled, apart from one start date. Integrity holds it until you answer.", metNow: true },
    { id: "c4", text: "Readiness to change is described", evidence: "Patient engaged, wants residential care", source: SOC2, note: "Stated in his own words in the psychosocial assessment.", metNow: true },
    { id: "c5", text: "Relapse and continued-use risk is documented", evidence: "Relapse on 9/28 after eleven months", source: PSY3, note: "Date and length of abstinence are both in the evaluation.", metNow: true },
    { id: "c6", text: "The recovery environment is described", evidence: "Lives with a partner who drinks daily", source: SOC4, note: "Present in the chart. The draft does not say it in plain words yet.", metNow: true },
    { id: "c7", text: "A lower level of care was tried or ruled out", evidence: "IOP in 2025 ended in week 3", source: SOC2, note: "Documented in the chart. The closing summary is not attached yet.", metNow: true },
    { id: "c8", text: "The treatment plan has measurable goals", evidence: "Seven goals with dates", source: PLAN2, note: "All seven goals have a target date.", metNow: true },
    { id: "c9", text: "A step-down plan is named", evidence: "Program and provider are not named yet", source: PLAN4, note: "Covered in the draft, not backed by the chart yet.", metNow: false, fixRec: "stepdown" },
  ],
  keepHigh: "In the sample decisions, when no step-down was named, Sentara tended to approve a shorter stay and ask again at the first review.",
  tool: "ASAM Criteria assessment",
  biggest: { title: "No named step-down provider", text: "In past Sentara decisions, requests like this one were cut to the first 7 days more than half the time when the plan was left open.", seen: "Seen in 212 of your own decisions and 806 from the network" },
  common: ["A failed lower level of care was documented", "Withdrawal scores were dated and trending down", "Home safety was described in plain terms", "The step-down program was named"],
  comparable: [
    { who: "Yours", what: "Prior outpatient failure, step-down named", outcome: "Approved 14/14", tone: "good", match: "high match" },
    { who: "Network", what: "Unsafe home, step-down named", outcome: "Approved 14/14", tone: "good", match: "high match" },
    { who: "Yours", what: "No step-down named", outcome: "Approved 7/14", tone: "mid", match: "close match" },
  ],
  calibration: { said: "80 to 90%", actual: 86, n: 214 },
  draft: [
    { id: "clinical", title: "Clinical picture", text: "J.M. is 34 and was admitted with severe alcohol use disorder and recurrent major depression after a relapse on 9/28 that followed eleven months of abstinence. Withdrawal scores peaked at 14 on 10/17 and fell to 4 with medication.", sources: [PSY3, NURSE] },
    { id: "lower", title: "Why a lower level of care is not safe", text: "An intensive outpatient program in 2025 ended in week 3 when housing was lost.", sources: [SOC2] },
    { id: "current", title: "Current severity", text: "Depression score 17 and anxiety score 14. Craving was 7 of 10 on 10/17.", sources: [PSY5] },
    { id: "plan", title: "Plan", text: "Fourteen days of residential care, then a step-down to a lower level of care.", sources: [PLAN2] },
  ],
  versions: [
    { n: 1, at: -71, by: "Scribe", note: "First draft from the chart" },
    { n: 2, at: -44, by: "Scribe", note: "After Reader's second pass" },
    { n: 3, at: -21, by: "Scribe", note: "Checked by Integrity" },
  ],
  checks: [
    { id: "chart", label: "Every sentence matches the chart", okNote: "Each statement links to a page in the chart.", warnNote: "", blockedBy: [] },
    { id: "criteria", label: "Payer criteria are covered", okNote: "All 9 Sentara requirements are covered and backed by the chart.", warnNote: "9 of 9 are covered, but the step-down plan is not backed by the chart yet.", blockedBy: ["stepdown"] },
    { id: "dates", label: "Dates are consistent", okNote: "No two documents disagree on a date.", warnNote: "Sertraline start is 9/14 in the medication list and 9/21 in the psychiatric evaluation.", blockedBy: ["sertraline"] },
    { id: "ids", label: "Identifiers are protected", okNote: "Names, dates of birth and member IDs are masked.", warnNote: "", blockedBy: [] },
  ],
};
