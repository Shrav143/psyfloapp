import type { CaseDetail, Evidence } from "./caseDetail";

/* R-1042 (J.M., 34, Summit Medicaid HMO, Residential 3.5, admission), written by hand.
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

export const R1042_DETAIL: CaseDetail = {
  id: "R-1042", requestId: "R-1042", fromQueue: true, initials: "J.M.", age: 34, payerId: "summit", program: "RES", levelLabel: "Residential 3.5", type: "Admission", days: 14,
  dx: "Alcohol use disorder, severe, with recurrent depression",
  scores: [{ label: "AUDIT-C", value: "11" }, { label: "PHQ-9", value: "17", trend: "up" }, { label: "CIWA", value: "14 → 4" }],
  dueAt: 5 * 60, dueVerb: "Notice due", phase: "preparing", agent: "scribe", statusLine: "Scribe is drafting the case",
  baseChance: 62, spread: [5, 4], similar: { own: 212, network: 806, benchmark: 230 },
  start: 58,
  rows: [
    { id: "lower", label: "A lower level of care was tried and failed", base: 4 },
    { id: "severity", label: "Withdrawal and depression severity are documented", base: 6 },
    { id: "home", label: "Home environment is documented", base: 2 },
    { id: "criteria", label: "All nine Summit requirements are backed by the chart", base: 0 },
    { id: "trace", label: "Every sentence traces to the chart", base: 0 },
    { id: "short", label: "Summit usually grants only the first 7 days", base: -8 },
  ],
  recs: [
    {
      id: "stepdown", title: "Name the step-down provider", agent: "scribe", moves: { criteria: 5, short: 4, lower: 2 },
      bullets: ["Scribe adds the partial hospitalization program and the first appointment", "Satisfies Summit's requirement for a documented step-down", "One input needed: confirm the program and the start date"],
      why: "Summit often approves only the first seven days when no step-down is named, then asks for the plan at the first review.",
      input: { label: "Step-down program and first appointment", placeholder: "e.g. Partial hospitalization at …, first visit Mon 11/2 at 9 am" },
      add: { section: "plan", text: (a) => `Step-down plan: ${a.trim().replace(/\.$/, "")}.`, source: ev("Your answer", "Typed by you for Scribe on this request.") },
    },
    {
      id: "iop", title: "Attach the 2025 IOP closing summary", agent: "packet", moves: { lower: 5 },
      bullets: ["Packet adds the summary as an exhibit", "Shows that a lower level of care was tried and ended early"],
      why: "Summit weighs a documented earlier attempt at a lower level of care more than any other single item.",
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
      bullets: ["Reader found a group therapy note dated 10/18 in the chart system", "Packet attaches it so all 9 of Summit's documents are present"],
      why: "Summit lists a therapy note from the last 14 days among its nine required documents. Eight are in the packet today.",
      add: { section: "current", text: () => "A group therapy note from 10/18 shows full attendance and active participation.", source: ev("Group therapy note 10/18", "Attended all three groups. Spoke about the relapse and the plan for the first week.") },
    },
    {
      id: "home", title: "Describe home safety in plain terms", agent: "scribe", moves: { home: 4 },
      bullets: ["Scribe states that he lives with a partner who drinks daily", "Adds that there is no transport to outpatient visits"],
      why: "Approved Summit requests described the home in plain, specific terms rather than general words such as unstable.",
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
  asam: [
    { n: 1, name: "Acute intoxication and withdrawal potential", level: 2, sentence: "Withdrawal needed medication and fell from 14 to 4 on the CIWA-Ar in two days." },
    { n: 2, name: "Biomedical conditions and complications", level: 1, sentence: "Liver tests are mildly raised. No condition needs a medical unit." },
    { n: 3, name: "Emotional, behavioral or cognitive conditions", level: 3, sentence: "Depression score 17 and anxiety score 14, both above the clinical cutoff." },
    { n: 4, name: "Readiness to change", level: 1, sentence: "He is engaged and asked for residential care himself." },
    { n: 5, name: "Relapse, continued use or continued problem potential", level: 3, sentence: "Relapse on 9/28 after eleven months. An IOP attempt in 2025 ended in week 3." },
    { n: 6, name: "Recovery and living environment", level: 3, sentence: "He lives with a partner who drinks daily and has no transport to outpatient visits." },
  ],
  trendLabels: ["10/17", "10/18", "10/19"],
  trend: [{ name: "CIWA-Ar", color: "#B5553A", data: [14, 9, 4] }, { name: "Craving (0 to 10)", color: "#1D4F43", data: [7, 7, 6] }],
  keyScores: [{ label: "Withdrawal now", value: "4", of: "/ 67, peak 14", tone: "good" }, { label: "Depression now", value: "17", of: "/ 27", tone: "mid" }],
  standsOut: ["Relapse on 9/28 after eleven months of abstinence", "Withdrawal needed medication and fell from 14 to 4 in two days", "Depression and craving are still above the clinical cutoff", "An IOP attempt in 2025 ended in week 3 when housing was lost"],
  engagement: { pct: 92, checks: ["Attended every group so far", "Asked for residential care himself", "Accepted medication changes"] },
  open: [
    { id: "o1", kind: "conflict", text: "One date conflict needs your answer: sertraline start 9/14 or 9/21", fixRec: "sertraline" },
    { id: "o2", kind: "risk", text: "Relapse risk is high without a named step-down", fixRec: "stepdown" },
    { id: "o3", kind: "missing", text: "A therapy note from the last 14 days is missing (8 of 9 Summit documents)", fixRec: "therapy" },
  ],
  policy: "v2026.3",
  criteria: [
    { id: "c1", text: "A substance use disorder diagnosis, with severity", evidence: "ICD-10 F10.20 and AUDIT-C 11 are in the evaluation", source: PSY1, note: "Diagnosis and severity are both stated, as Summit asks.", metNow: true },
    { id: "c2", text: "Withdrawal risk is assessed with dated scores", evidence: "CIWA-Ar 14 on 10/17, 4 on 10/19", source: NURSE, note: "Two dated scores found. A third (10/18) is in the nursing notes.", metNow: true },
    { id: "c3", text: "Medical and psychiatric conditions are addressed", evidence: "Depression and anxiety are treated, medications reconciled", source: MEDS, note: "Reconciled, apart from one start date. Integrity holds it until you answer.", metNow: true },
    { id: "c4", text: "Readiness to change is described", evidence: "Patient engaged, wants residential care", source: SOC2, note: "Stated in his own words in the psychosocial assessment.", metNow: true },
    { id: "c5", text: "Relapse and continued-use risk is documented", evidence: "Relapse on 9/28 after eleven months", source: PSY3, note: "Date and length of abstinence are both in the evaluation.", metNow: true },
    { id: "c6", text: "The recovery environment is described", evidence: "Lives with a partner who drinks daily", source: SOC4, note: "Present in the chart. The draft does not say it in plain words yet.", metNow: true },
    { id: "c7", text: "A lower level of care was tried or ruled out", evidence: "IOP in 2025 ended in week 3", source: SOC2, note: "Documented in the chart. The closing summary is not attached yet.", metNow: true },
    { id: "c8", text: "The treatment plan has measurable goals", evidence: "Seven goals with dates", source: PLAN2, note: "All seven goals have a target date.", metNow: true },
    { id: "c9", text: "A step-down plan is named", evidence: "Program and provider are not named yet", source: PLAN4, note: "Covered in the draft, but not backed by the chart yet. Summit tends to approve a shorter stay when this is open. One input from you closes it.", metNow: false, fixRec: "stepdown" },
  ],
  keepHigh: "When no step-down is named, Summit tends to approve a shorter stay and ask again at the first review.",
  tool: "Ohio level-of-care assessment",
  biggest: { title: "No named step-down provider", text: "In past Summit decisions, requests like this one were cut to the first 7 days more than half the time when the plan was left open.", seen: "Seen in 212 of your own decisions and 806 from the network" },
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
    { id: "criteria", label: "Payer criteria are covered", okNote: "All 9 Summit requirements are covered and backed by the chart.", warnNote: "9 of 9 are covered, but the step-down plan is not backed by the chart yet.", blockedBy: ["stepdown"] },
    { id: "dates", label: "Dates are consistent", okNote: "No two documents disagree on a date.", warnNote: "Sertraline start is 9/14 in the medication list and 9/21 in the psychiatric evaluation.", blockedBy: ["sertraline"] },
    { id: "ids", label: "Identifiers are protected", okNote: "Names, dates of birth and member IDs are masked.", warnNote: "", blockedBy: [] },
  ],
};
