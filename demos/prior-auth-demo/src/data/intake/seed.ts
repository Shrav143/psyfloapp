import type { DocBlock } from "@/components/ui/DocumentSheet";
import { DAY, HOUR } from "@/lib/time";
import type { BuiltInPayerId, Urgency } from "../types";
import type { SiteId } from "../sites";
import { vaDate } from "../va/policy";
import { VA_PLANS } from "../va/plans";
import { serviceById, type VaServiceId } from "../va/services";
import { legacyIntakes } from "./legacyReferrals";
import { extendCans } from "./ext/cans";
import { extendClinical } from "./ext/clinical";
import { extendProfile } from "./ext/profile";
import { extendReferral } from "./ext/referral";
import { extendReview } from "./ext/review";
import { extendScenarios } from "./ext/scenarios";
import type {
  AgentTask, AuditEvent, CansAssessment, EligibilityCheck, FieldState, FieldValue, IntakeDocument, IntakeRecord, IntakeStaff, ReferralMethod,
  ReferralOut, ServiceRecommendation, SourceRef, Suggestion, TriageStatus,
} from "./types";

/* Synthetic records only. Every name, date of birth, member ID and organization marked (fictional) is made up; no real PHI. */

export const INTAKE_STAFF: IntakeStaff[] = [
  { id: "jp", name: "Jordan Perez", initials: "JP", role: "UR coordinator", qualified: false },
  { id: "tb", name: "Taylor Brooks", initials: "TB", role: "Intake coordinator", qualified: false },
  { id: "ml", name: "Morgan Lee", initials: "ML", role: "Intake coordinator", qualified: false },
  { id: "dr", name: "Dr. Rivera", initials: "DR", role: "Licensed clinician", qualified: true, credentials: "PsyD, licensed clinical psychologist" },
  { id: "hk", name: "Heather K.", initials: "HK", role: "Clinical director", qualified: true, credentials: "LCSW" },
  { id: "am", name: "Alex Morgan", initials: "AM", role: "Clinic owner", qualified: false },
  { id: "so", name: "Sam Okafor", initials: "SO", role: "Billing", qualified: false },
];
export const staffOf = (id: string): IntakeStaff | undefined => INTAKE_STAFF.find((s) => s.id === id);
/** The qualified clinician who signs at each site in the demo. */
export const CLINICIAN_AT: Record<SiteId, string> = { A: "dr", B: "hk" };
/** The intake staff id of the person viewing (Demo menu, Viewing as). */
export const VIEWER_STAFF: Record<string, string> = { jordan: "jp", rivera: "dr", okafor: "so", morgan: "am" };

let seq = 0;
const nid = (p: string) => `${p}-${++seq}`;
const F = (value: string, state: FieldState, at: number, by: string, source?: SourceRef, confidence?: FieldValue["confidence"]): FieldValue => ({ value, state, at, by, source, confidence });
const doc = (docId: string, ref: string, blockId: string, quote?: string): SourceRef => ({ kind: "document", ref, docId, blockId, quote });
const ev = (at: number, actor: string, action: string, detail?: string, ai = false, section?: AuditEvent["section"]): AuditEvent => ({ id: nid("ev"), at, actor, action, detail, ai, section });
const task = (t: Omit<AgentTask, "id">): AgentTask => ({ id: nid("task"), ...t });
const sug = (s: Omit<Suggestion, "id" | "status">): Suggestion => ({ id: nid("sg"), status: "pending", ...s });
const NOT_CHECKED: EligibilityCheck = { status: "not_checked", simulated: true, member: "unknown", benefit: "unknown", network: "unknown", necessity: "not_determined", authorization: "unknown", conflicts: [], exceptions: [] };
const planName = (id: BuiltInPayerId) => VA_PLANS.find((p) => p.payerId === id)?.name ?? id;
const coverageType = (id: BuiltInPayerId) => (VA_PLANS.find((p) => p.payerId === id)?.coverage === "ffs" ? "Fee-for-service" : "Cardinal Care managed care (MCO)");

function base(o: {
  id: string; site: SiteId; createdAt: number; title: string; serviceId: VaServiceId; serviceDate: number; method: ReferralMethod; sourceOrg: string; triage: TriageStatus;
  urgency: Urgency; priority?: boolean; assignedTo: string; payerId: BuiltInPayerId | null; initials: string; age: number | null; scenario?: IntakeRecord["scenario"];
}): IntakeRecord {
  return {
    ...o, priority: !!o.priority,
    referral: {}, profile: {}, coverage: {}, eligibility: NOT_CHECKED,
    assessment: { mode: "manual", status: "not_started", fields: {} },
    cans: null, lon: null, pathways: [], referralsOut: [], documents: [], suggestions: [], tasks: [], audit: [ev(o.createdAt, "system", "Intake created", `${o.sourceOrg} · ${serviceById(o.serviceId).short}`)],
    scribe: null, voice: null, safety: null, handoff: { status: "not_started" },
  };
}
const path = (o: Omit<ServiceRecommendation, "id" | "evidence" | "suggestedBy" | "status"> & Partial<Pick<ServiceRecommendation, "status" | "evidence">>): ServiceRecommendation => ({
  id: nid("pw"), evidence: [], suggestedBy: "placement", status: "suggested", ...o,
});

/* ---------------------------------------------------------------- Scenario A: youth CPST referral from a school */
const A_AT = -2 * DAY - 3 * HOUR;
const A_DOC: IntakeDocument = {
  id: "doc-a1", name: "Rivermont Middle School student support referral.pdf", kind: "school_report", receivedAt: A_AT, simulated: true,
  pages: [[
    { kind: "letterhead", org: "Rivermont Middle School (fictional)", sub: "Student Support Services · Henrico County (fictional address)" },
    { kind: "title", text: "Student support referral for community mental health services" },
    { kind: "meta", items: [["Student", "T.W., grade 8"], ["Date of birth", "03/14/2012"], ["Referred by", "Dana Whitfield, school counselor"], ["Date", "10/16/2026"]] },
    { kind: "h", text: "Reason for referral" },
    { kind: "p", id: "a-reason", text: "Since September T. has missed 9 school days, leaves class most afternoons, and has had three conflicts with peers that ended in removal from class. Teachers describe him as withdrawn and tearful. We are asking for school-based mental health support and a community assessment." },
    { kind: "h", text: "What we see at school" },
    { kind: "list", id: "a-concerns", items: ["Falling grades in 3 of 5 classes", "Sleeping in class, says he is up late", "Says he 'does not care what happens'; counselor screened for safety on 10/14 and found no current plan", "Gets on well with the art teacher and a small group of friends"] },
    { kind: "h", text: "Current supports" },
    { kind: "p", id: "a-supports", text: "504 plan for attention concerns since 2024. No current therapist. Saw an outpatient counselor in 2025 for a few months." },
    { kind: "h", text: "Family and school contact" },
    { kind: "p", id: "a-involve", text: "Ms. Wright is involved and agrees to take part in family sessions. She works evenings and the family has no car, so a visit at school or a call before her shift works best." },
    { kind: "p", id: "a-contact", text: "School contact: Dana Whitfield, school counselor. A callback number was not written on this form." },
    { kind: "h", text: "Family and insurance" },
    { kind: "table", id: "a-family", head: ["Item", "As written"], rows: [["Guardian", "Keisha Wright (mother)"], ["Guardian phone", "(804) 555-0142"], ["Insurance", "Sentara Community Plan, member ID ending 4471"], ["Language at home", "English"]] },
    { kind: "p", id: "a-consent", text: "Parent release of school records: not yet signed. Counselor to send the release home this week." },
    { kind: "sig", id: "a-sig", text: "Dana Whitfield, M.Ed., school counselor" },
  ] satisfies DocBlock[]],
};
const A_EMR: IntakeDocument = {
  id: "doc-a2", name: "EMR record from 2025 outpatient episode (import).txt", kind: "emr_summary", receivedAt: A_AT + 30, simulated: true,
  pages: [[
    { kind: "letterhead", org: "Psyflo demo clinic, Site A", sub: "Prior episode summary (EMR import, simulated)" },
    { kind: "meta", items: [["Patient", "T.W."], ["Episode", "Outpatient therapy, 02/2025 to 05/2025"], ["Coverage then", "Aetna Better Health of Virginia (ended 06/30/2026)"]] },
    { kind: "p", id: "a-emr", text: "Seen for 7 sessions for low mood and school avoidance. Discharged when family moved. No hospitalizations. No medications." },
  ]],
};
const scenarioA = (): IntakeRecord => {
  const r = base({ id: "IN-3101", scenario: "A", site: "A", createdAt: A_AT, title: "School-linked referral: CPST Youth, School Setting for the 2027-28 school year", serviceId: "cpst-school", serviceDate: vaDate("2027-08-23"), method: "upload", sourceOrg: "Rivermont Middle School (fictional)", triage: "ready_screening", urgency: "routine", assignedTo: "tb", payerId: "summit", initials: "T.W.", age: 14 });
  const s = (b: string, q?: string) => doc("doc-a1", "School referral p.1", b, q);
  r.documents = [A_DOC, A_EMR];
  r.referral = {
    sourceOrg: F("Rivermont Middle School (fictional)", "document_extracted", A_AT, "reader", s("a-sig"), "high"),
    referringClinician: F("Dana Whitfield, M.Ed., school counselor", "document_extracted", A_AT, "reader", s("a-sig"), "high"),
    reason: F("Missed 9 school days since September, leaves class most afternoons, three peer conflicts ending in removal from class; asks for school-based support and a community assessment.", "document_extracted", A_AT, "reader", s("a-reason"), "high"),
    concerns: F("Withdrawn and tearful at school; falling grades in 3 of 5 classes; sleeping in class.", "document_extracted", A_AT, "reader", s("a-concerns"), "medium"),
    previousServices: F("504 plan since 2024; outpatient counseling 02/2025 to 05/2025 (7 sessions).", "document_extracted", A_AT, "reader", s("a-supports"), "high"),
  };
  r.profile = {
    legalName: F("Tavion Wright", "needs_confirmation", A_AT, "reader", s("a-family", "T.W., grade 8; guardian Keisha Wright"), "medium"),
    dob: F("2012-03-14", "document_extracted", A_AT, "reader", s("a-family"), "high"),
    language: F("English", "document_extracted", A_AT, "reader", s("a-family"), "high"),
    guardianName: F("Keisha Wright (mother)", "document_extracted", A_AT, "reader", s("a-family"), "high"),
    consentTreatment: F("", "not_collected", A_AT, "system"),
    schoolConsent: F("Needed", "document_extracted", A_AT, "reader", s("a-consent", "Parent release of school records: not yet signed."), "high"),
  };
  r.coverage = {
    medicaidId: F("•••• 4471", "document_extracted", A_AT, "reader", s("a-family"), "high"),
    coverageType: F(coverageType("summit"), "ai_suggested", A_AT, "verify", s("a-family"), "medium"),
  };
  r.suggestions = [
    sug({ section: "profile", field: "guardianPhone", value: "(804) 555-0142", source: s("a-family", "Guardian phone (804) 555-0142"), confidence: "high", agent: "reader", at: A_AT }),
    sug({ section: "coverage", field: "plan", value: planName("summit"), source: s("a-family", "Insurance: Sentara Community Plan, member ID ending 4471"), confidence: "high", agent: "reader", at: A_AT, conflict: "The 2025 EMR record lists Aetna Better Health of Virginia, ended 06/30/2026. Confirm the current plan before eligibility is checked." }),
    sug({ section: "referral", field: "symptoms", value: "Low mood, withdrawal, poor sleep; counselor safety screen on 10/14 found no current plan.", source: s("a-concerns", "counselor screened for safety on 10/14 and found no current plan"), confidence: "medium", agent: "reader", at: A_AT }),
    sug({ section: "profile", field: "supports", value: "Mother; a small group of friends; a trusted art teacher.", source: s("a-concerns", "Gets on well with the art teacher and a small group of friends"), confidence: "medium", agent: "reader", at: A_AT }),
  ];
  r.pathways = [
    path({ serviceId: "tdt", fit: "possible", rationale: "School-based support is requested now. TDT is in effect until June 30, 2027 and could bridge the current school year.", outstanding: ["Clinical review of fit for TDT", "Guardian consent"], availability: "available", referralReqs: ["Signed school release", "Guardian consent"] }),
    path({ serviceId: "cpst-school", fit: "possible", rationale: "The school asks for school-based support next year. CPST: Youth, School Setting starts July 1, 2027.", outstanding: ["Service cannot start before July 1, 2027", "CANS Lifetime when the official assessment is configured", "Authorization requirements pending DMAS"], availability: "not_yet", referralReqs: ["Signed school release"] }),
    path({ serviceId: "opt", fit: "possible", rationale: "No current therapist; outpatient therapy is available now.", outstanding: ["Guardian consent"], availability: "available", referralReqs: [] }),
    path({ serviceId: "cpst-youth", fit: "less_likely", rationale: "Community-based CPST is an option if school-based delivery is not available.", outstanding: ["Starts July 1, 2027"], availability: "not_yet", referralReqs: [] }),
  ];
  r.tasks = [
    task({ role: "referral", agent: "reader", action: "Extracted 11 fields from the school referral and the 2025 EMR record", status: "needs_you", section: "referral", source: A_DOC.name, at: A_AT + 2, approval: "required", result: "4 suggestions wait for review; 1 conflicts with the EMR record" }),
    task({ role: "eligibility", agent: "verify", action: "Prepare an eligibility check", status: "blocked", section: "coverage", at: A_AT + 3, approval: "none", result: "Two plans on file (Sentara now, Aetna in 2025). Confirm the current plan first." }),
    task({ role: "completion", agent: "integrity", action: "Check intake completeness", status: "done", section: "review", at: A_AT + 4, approval: "none", result: "Guardian consent and school release missing; legal name needs confirmation" }),
  ];
  r.audit.push(ev(A_AT + 1, "tb", "Uploaded the school referral", A_DOC.name, false, "referral"), ev(A_AT + 2, "reader", "Read the referral and suggested 11 fields", undefined, true, "referral"));
  return r;
};

/* ---------------------------------------------------------------- Scenario B: adult on a retiring service */
const B_AT = -6 * DAY;
const B_EMR: IntakeDocument = {
  id: "doc-b1", name: "Current MHSS service record (EMR import).txt", kind: "emr_summary", receivedAt: B_AT, simulated: true,
  pages: [[
    { kind: "letterhead", org: "Psyflo demo clinic, Site B", sub: "Current service summary (EMR import, simulated)" },
    { kind: "meta", items: [["Client", "R.H., 41"], ["Service", "Mental Health Skill-Building (H0046)"], ["Authorization", "VA-MHSS-2291, through 03/31/2027"], ["Plan", "Anthem HealthKeepers Plus"]] },
    { kind: "p", id: "b-svc", text: "Receives MHSS 3 times a week since 2024 for daily living skills, medication routines and budgeting after two hospitalizations in 2023. Lives alone in an apartment. Works part time at a grocery store." },
    { kind: "p", id: "b-goals", text: "Goals: keep his apartment, manage medications without reminders, return to full-time work." },
    { kind: "p", id: "b-dx", text: "Documented diagnosis: schizoaffective disorder, bipolar type (chart)." },
  ]],
};
const scenarioB = (): IntakeRecord => {
  const r = base({ id: "IN-3102", scenario: "B", site: "B", createdAt: B_AT, title: "Adult on Mental Health Skill-Building (H0046): plan the move before June 30, 2027", serviceId: "cpst-adult", serviceDate: vaDate("2027-07-01"), method: "emr", sourceOrg: "Psyflo demo clinic, Site B (existing client)", triage: "clinical_review", urgency: "routine", assignedTo: "jp", payerId: "cardinal", initials: "R.H.", age: 41 });
  r.legacy = { serviceId: "mhss", authorizationId: "VA-MHSS-2291", authEnds: vaDate("2027-03-31") };
  const s = (b: string) => doc("doc-b1", "Current service record", b);
  r.documents = [B_EMR];
  r.referral = {
    sourceOrg: F("Psyflo demo clinic, Site B (existing client)", "verified", B_AT, "jp"),
    referringClinician: F("Heather K., LCSW (clinical director)", "verified", B_AT, "jp"),
    referrerContact: F("Internal", "verified", B_AT, "jp"),
    reason: F("Receives MHSS, which retires June 30, 2027. Needs a clinical review of which redesigned or current service fits from July 1, 2027.", "verified", B_AT, "jp"),
    concerns: F("Daily living skills, medication routines and budgeting; stable for 18 months.", "document_extracted", B_AT, "reader", s("b-svc"), "high"),
    previousServices: F("MHSS 3 times a week since 2024; two hospitalizations in 2023.", "document_extracted", B_AT, "reader", s("b-svc"), "high"),
    dxDocumented: F("Schizoaffective disorder, bipolar type (as documented in the chart)", "document_extracted", B_AT, "reader", s("b-dx"), "high"),
  };
  r.profile = {
    legalName: F("Ramon Hale", "verified", B_AT, "jp"), dob: F("1985-05-02", "verified", B_AT, "jp"), phone: F("(757) 555-0187", "verified", B_AT, "jp"),
    address: F("Norfolk, VA (synthetic)", "verified", B_AT, "jp"), language: F("English", "verified", B_AT, "jp"), consentTreatment: F("Signed", "verified", B_AT, "jp"),
    housing: F("Lives alone in an apartment", "document_extracted", B_AT, "reader", s("b-svc"), "high"), educationEmployment: F("Part time at a grocery store", "document_extracted", B_AT, "reader", s("b-svc"), "high"),
  };
  r.coverage = {
    medicaidId: F("•••• 2291", "verified", B_AT, "jp"), coverageType: F(coverageType("cardinal"), "verified", B_AT, "verify"), plan: F(planName("cardinal"), "verified", B_AT, "verify"),
    existingAuths: F("VA-MHSS-2291: Mental Health Skill-Building, through 03/31/2027", "verified", B_AT, "verify"),
  };
  r.eligibility = { status: "active", simulated: true, checkedAt: -1 * DAY, member: "yes", benefit: "yes", network: "yes", necessity: "not_determined", authorization: "existing", existingAuth: "VA-MHSS-2291 through 03/31/2027", conflicts: [], exceptions: ["The current authorization ends before the service retires. A renewal through June 30, 2027 may be needed."] };
  r.assessment = { mode: "manual", status: "in_progress", fields: {
    presenting: F("Stable on MHSS; needs a plan for services after June 30, 2027.", "verified", B_AT + DAY, "hk"),
    goals: F("Keep his apartment, manage medications without reminders, return to full-time work.", "document_extracted", B_AT, "reader", s("b-goals"), "high"),
  } };
  r.pathways = [
    path({ serviceId: "cpst-adult", fit: "possible", rationale: "Skill-building and community support needs could fit CPST: Adult, Community from July 1, 2027.", outstanding: ["CANS Lifetime (official items pending)", "Level of Need pending validated configuration", "Authorization requirements pending DMAS"], availability: "not_yet", referralReqs: [] }),
    path({ serviceId: "clubhouse", fit: "possible", rationale: "Goal of returning to full-time work; a clubhouse focuses on work and community.", outstanding: ["Starts July 1, 2027", "CANS applicability for Clubhouse not confirmed"], availability: "not_yet", referralReqs: [] }),
    path({ serviceId: "mhcm", fit: "possible", rationale: "Care coordination could continue alongside a new service.", outstanding: ["Updated case management policy pending"], availability: "available", referralReqs: [] }),
    path({ serviceId: "mhss", fit: "possible", rationale: "Continue the current service through June 30, 2027; renew the authorization ending 03/31/2027.", outstanding: ["Renewal through June 30, 2027"], availability: "available", referralReqs: [] }),
  ];
  r.tasks = [
    task({ role: "pathway", agent: "placement", action: "Prepared four service options for clinical review", status: "needs_you", section: "pathway", at: B_AT + DAY, approval: "required", result: "No option is selected until a clinician reviews them" }),
    task({ role: "eligibility", agent: "verify", action: "Checked eligibility (simulated)", status: "done", section: "coverage", at: -1 * DAY, approval: "none", result: "Member active with Anthem HealthKeepers Plus; existing MHSS authorization through 03/31/2027" }),
    task({ role: "cans", agent: "criteria", action: "Prepare CANS Lifetime evidence", status: "blocked", section: "cans", at: -1 * DAY, approval: "required", result: "Waits for the official DMAS item mapping" }),
  ];
  r.audit.push(ev(B_AT + DAY, "hk", "Started the clinical assessment", undefined, false, "assessment"));
  return r;
};

/* ---------------------------------------------------------------- Scenario C: first episode psychosis */
const C_AT = -1 * DAY - 5 * HOUR;
const C_DOC: IntakeDocument = {
  id: "doc-c1", name: "Discharge referral, Blue Ridge Regional (fax).pdf", kind: "discharge_summary", receivedAt: C_AT, simulated: true,
  pages: [[
    { kind: "letterhead", org: "Blue Ridge Regional Medical Center (fictional)", sub: "Inpatient psychiatry · fax referral" },
    { kind: "title", text: "Discharge summary and referral for outpatient follow-up" },
    { kind: "meta", items: [["Patient", "A.K., 19"], ["Admitted", "10/12/2026"], ["Discharged", "10/19/2026"], ["Attending", "Dr. P. Shah (fictional)"]] },
    { kind: "h", text: "Hospital course" },
    { kind: "p", id: "c-course", text: "First psychiatric admission. Presented with 6 weeks of hearing voices, suspiciousness of roommates and stopping classes at the community college. Started risperidone 1 mg nightly; voices less frequent by discharge." },
    { kind: "p", id: "c-safety", text: "On day 2 the patient reported brief passive thoughts of death. These were not present at discharge. Safety plan completed with the patient and parent." },
    { kind: "h", text: "Recommendations" },
    { kind: "list", id: "c-recs", items: ["Referral to a Coordinated Specialty Care team for first episode psychosis", "Psychiatry follow-up within 7 days", "Family psychoeducation", "Supported education to return to classes"] },
    { kind: "table", id: "c-ins", head: ["Item", "As written"], rows: [["Insurance", "Aetna Better Health of Virginia"], ["Parent contact", "Lena K. (mother), (540) 555-0119"], ["Pharmacy", "Not listed"]] },
    { kind: "sig", id: "c-sig", text: "Dr. P. Shah, attending psychiatrist (fictional)" },
  ]],
};
const scenarioC = (): IntakeRecord => {
  const r = base({ id: "IN-3103", scenario: "C", site: "A", createdAt: C_AT, title: "Hospital referral for first episode psychosis: CSC, with care now", serviceId: "csc", serviceDate: vaDate("2027-07-01"), method: "fax", sourceOrg: "Blue Ridge Regional Medical Center (fictional)", triage: "new", urgency: "urgent", priority: true, assignedTo: "ml", payerId: "evergreen", initials: "A.K.", age: 19 });
  const s = (b: string, q?: string) => doc("doc-c1", "Discharge referral p.1", b, q);
  r.documents = [C_DOC];
  r.referral = {
    sourceOrg: F("Blue Ridge Regional Medical Center (fictional), inpatient psychiatry", "document_extracted", C_AT, "reader", s("c-sig"), "high"),
    referringClinician: F("Dr. P. Shah, attending psychiatrist (fictional)", "document_extracted", C_AT, "reader", s("c-sig"), "high"),
    reason: F("First psychiatric admission for psychosis; referred to a Coordinated Specialty Care team, psychiatry follow-up within 7 days, family psychoeducation and supported education.", "document_extracted", C_AT, "reader", s("c-recs"), "high"),
    concerns: F("Six weeks of hearing voices, suspiciousness of roommates, stopped classes.", "document_extracted", C_AT, "reader", s("c-course"), "high"),
    hospitalization: F("Admitted 10/12/2026, discharged 10/19/2026 (first admission).", "document_extracted", C_AT, "reader", s("c-course"), "high"),
  };
  r.profile = {
    legalName: F("Aiden Kowalski", "needs_confirmation", C_AT, "reader", s("c-ins"), "medium"),
    guardianName: F("", "not_applicable", C_AT, "system"),
    emergencyContact: F("Lena K. (mother), (540) 555-0119", "document_extracted", C_AT, "reader", s("c-ins"), "high"),
    medications: F("Risperidone 1 mg nightly (started in hospital)", "document_extracted", C_AT, "reader", s("c-course"), "high"),
  };
  r.coverage = { plan: F(planName("evergreen"), "document_extracted", C_AT, "reader", s("c-ins"), "high"), coverageType: F(coverageType("evergreen"), "ai_suggested", C_AT, "verify", s("c-ins"), "medium") };
  r.eligibility = { status: "active", simulated: true, checkedAt: C_AT + 40, member: "yes", benefit: "yes", network: "unknown", necessity: "not_determined", authorization: "unknown", conflicts: [], exceptions: ["Network status for a CSC team is not on file."] };
  r.safety = { raisedAt: C_AT + 5, raisedBy: "reader", text: "The discharge summary records brief passive thoughts of death on day 2, not present at discharge. A clinician must review safety before routine scheduling. Psyflo does not decide that a person is safe.", source: s("c-safety", "On day 2 the patient reported brief passive thoughts of death."), status: "open" };
  r.suggestions = [
    sug({ section: "assessment", field: "safety", value: "Passive thoughts of death on day 2 of admission, not present at discharge; safety plan completed with patient and parent. Needs clinician review.", source: s("c-safety"), confidence: "high", agent: "scribe", at: C_AT + 6 }),
    sug({ section: "referral", field: "symptoms", value: "Auditory hallucinations (less frequent at discharge), suspiciousness.", source: s("c-course"), confidence: "medium", agent: "reader", at: C_AT + 6 }),
  ];
  const cans: CansAssessment = {
    status: "in_progress", templateVersion: "awaiting-dmas-mapping", credentialStatus: "not_checked", domains: [], items: [], narrative: "", reassessDue: null,
    evidence: [
      { id: nid("evd"), text: "Stopped classes at the community college", source: s("c-course"), theme: "Functioning" },
      { id: nid("evd"), text: "Hearing voices for six weeks; less frequent at discharge", source: s("c-course"), theme: "Symptoms" },
      { id: nid("evd"), text: "Passive thoughts of death on day 2, not at discharge; safety plan done", source: s("c-safety"), theme: "Risk (needs clinician review)" },
      { id: nid("evd"), text: "Mother involved; completed the safety plan together", source: s("c-safety"), theme: "Supports and strengths" },
    ],
  };
  r.cans = cans;
  r.pathways = [
    path({ serviceId: "csc", fit: "possible", rationale: "The hospital recommends a Coordinated Specialty Care team. CSC becomes a Medicaid service on July 1, 2027.", outstanding: ["Clinical review", "CSC team availability", "Authorization requirements pending DMAS"], availability: "not_yet", referralReqs: ["Discharge summary", "Release of information"] }),
    path({ serviceId: "mh-iop", fit: "possible", rationale: "Care is needed now, before July 2027. Mental health IOP is available today.", outstanding: ["Clinical review", "Service authorization within 1 business day of admission"], availability: "available", referralReqs: [] }),
    path({ serviceId: "mhcm", fit: "possible", rationale: "Coordination of psychiatry follow-up within 7 days, school and family supports.", outstanding: ["Registration within 1 business day"], availability: "available", referralReqs: [] }),
    path({ serviceId: "external", externalLabel: "Early psychosis program, Valley University Health (fictional)", fit: "possible", rationale: "An external specialty program could provide team-based care now.", outstanding: ["Acceptance by the program", "Consent to share records"], availability: "external", referralReqs: ["Discharge summary", "Release of information"] }),
  ];
  const out: ReferralOut = {
    id: "RO-5101", serviceId: "external", destination: { org: "Early psychosis program, Valley University Health (fictional)", contact: "Intake line", phone: "(540) 555-0100", channel: "secure_message" },
    createdAt: C_AT + 2 * HOUR, referringClinician: "Dr. Rivera", consent: "on_file", priority: "urgent", status: "sent", followUpAt: C_AT + 2 * DAY,
    docs: [{ name: "Discharge summary", attached: true, required: true }, { name: "Release of information", attached: true, required: true }, { name: "Insurance card", attached: false, required: false }],
    approvedBy: "dr", timeline: [ev(C_AT + 2 * HOUR, "navigator", "Prepared the referral packet", undefined, true), ev(C_AT + 2 * HOUR + 20, "dr", "Approved and sent by secure message (simulated)")],
  };
  r.referralsOut = [out];
  r.tasks = [
    task({ role: "referral", agent: "reader", action: "Read the faxed discharge referral", status: "done", section: "referral", source: C_DOC.name, at: C_AT + 2, approval: "none", result: "7 fields extracted; safety content flagged for a clinician" }),
    task({ role: "coordination", agent: "navigator", action: "Watch for a reply from the early psychosis program", status: "running", section: "pathway", at: C_AT + 2 * HOUR + 25, approval: "none", result: "Follow up due in 2 days" }),
    task({ role: "documentation", agent: "scribe", action: "Draft the safety section from the discharge summary", status: "needs_you", section: "assessment", at: C_AT + 6, approval: "required", result: "Draft waits for clinician review" }),
  ];
  r.audit.push(ev(C_AT + 5, "reader", "Flagged safety content for clinician review", undefined, true, "referral"), ev(C_AT + 2 * HOUR + 20, "dr", "Sent a referral to the early psychosis program", undefined, false, "pathway"));
  return r;
};

/* ---------------------------------------------------------------- Scenario D: voice-assisted intake */
const D_AT = -40;
const scenarioD = (): IntakeRecord => {
  const r = base({ id: "IN-3104", scenario: "D", site: "B", createdAt: D_AT, title: "Self-referral by phone for outpatient therapy: voice-assisted intake", serviceId: "opt", serviceDate: vaDate("2026-11-02"), method: "voice", sourceOrg: "Self-referral (phone)", triage: "new", urgency: "routine", assignedTo: "ml", payerId: "beacon", initials: "M.S.", age: 33 });
  r.voice = { id: "VS-1", status: "idle", language: "English", turns: [], asked: [], scriptId: "voice-d", cursor: 0, simulated: true };
  r.tasks = [task({ role: "referral", agent: "reader", action: "Voice intake ready to start", status: "queued", section: "assessment", at: D_AT, approval: "none", result: "The coordinator starts the Voice Intake Assistant with the caller" })];
  return r;
};

/* ---------------------------------------------------------------- one record for every other service */
type Light = [id: string, svc: VaServiceId, initials: string, age: number, payer: BuiltInPayerId, site: SiteId, method: ReferralMethod, source: string, triage: TriageStatus, urgency: Urgency, priority: boolean, staff: string, daysAgo: number, reason: string];
const LIGHT: Light[] = [
  ["IN-3110", "arts-res", "J.B.", 36, "cardinal", "A", "fax", "Valley Withdrawal Center (fictional)", "accepted", "urgent", false, "ml", 3, "Completed withdrawal management; needs residential treatment for alcohol use disorder."],
  ["IN-3111", "arts-wm", "C.P.", 52, "lakeshore", "B", "emr", "Emergency department, Tidewater General (fictional)", "ready_screening", "urgent", true, "tb", 0.3, "Daily heavy drinking with a history of withdrawal seizures; asks for withdrawal management."],
  ["IN-3112", "arts-iop", "N.G.", 28, "summit", "A", "email", "Opioid treatment program, Richmond (fictional)", "needs_info", "routine", false, "tb", 4, "Stable on buprenorphine; step-down from residential to IOP."],
  ["IN-3113", "arts-php", "E.V.", 31, "harborview", "B", "manual", "Walk-in", "new", "routine", false, "ml", 0.5, "Methamphetamine use with missed work; asks for a day program."],
  ["IN-3114", "mh-iop", "S.L.", 24, "evergreen", "A", "webform", "Self-referral (web form)", "new", "urgent", true, "tb", 0.2, "Panic attacks and depression after a job loss; asks for an intensive program."],
  ["IN-3115", "mh-php", "H.T.", 45, "beacon", "A", "fax", "Inpatient unit, Shenandoah Health (fictional)", "clinical_review", "urgent", false, "jp", 1, "Step-down after an inpatient stay for major depression."],
  ["IN-3116", "act", "W.F.", 39, "cardinal", "A", "emr", "Community services board (fictional)", "accepted", "routine", false, "jp", 9, "Three hospitalizations this year; transfer to ACT."],
  ["IN-3117", "aba", "Z.A.", 6, "summit", "B", "webform", "Parent (web form)", "needs_info", "routine", false, "ml", 5, "Autism diagnosis in 2026; pediatrician recommends ABA."],
  ["IN-3118", "mhcm", "Y.O.", 58, "lakeshore", "A", "phone", "Primary care, Chesapeake (fictional)", "ready_screening", "routine", false, "tb", 2, "Needs help coordinating psychiatry, housing and benefits."],
  ["IN-3119", "crisis", "K.D.", 22, "harborview", "B", "phone", "988 Lifeline follow-up (fictional team)", "new", "emergent", true, "jp", 0.05, "Crisis follow-up after a 988 call; mobile crisis team visited last night."],
  ["IN-3120", "iih", "P.M.", 11, "evergreen", "A", "emr", "School social worker (fictional)", "new", "routine", false, "ml", 1.5, "Aggression at home and school; family asks for in-home services."],
  ["IN-3121", "tdt", "B.C.", 9, "summit", "B", "upload", "Elementary school (fictional)", "ready_screening", "routine", false, "tb", 6, "Classroom behavior needs; school asks for day treatment."],
  ["IN-3122", "psr", "G.N.", 47, "beacon", "A", "emr", "Psyflo demo clinic, Site A (existing client)", "ready_screening", "routine", false, "jp", 8, "Receives PSR, which retires June 30, 2027; plan what comes next."],
  ["IN-3123", "cpst-youth", "I.R.", 16, "cardinal", "B", "upload", "Juvenile court services unit (fictional)", "new", "routine", false, "ml", 2.5, "Probation officer asks for community support for a 16-year-old from summer 2027."],
  ["IN-3124", "clubhouse", "F.S.", 34, "lakeshore", "A", "manual", "Peer recovery specialist", "redirected", "routine", false, "tb", 12, "Wants a clubhouse; redirected to PSR now, Clubhouse from July 2027."],
];
function light([id, svc, initials, age, payer, site, method, source, triage, urgency, priority, staff, daysAgo, reason]: Light): IntakeRecord {
  const at = -Math.round(daysAgo * DAY);
  const s = serviceById(svc);
  const serviceDate = s.status === "redesign" ? vaDate("2027-07-01") : at + 5 * DAY;
  const r = base({ id, site, createdAt: at, title: `${source}: ${s.short}`, serviceId: svc, serviceDate, method, sourceOrg: source, triage, urgency, priority, assignedTo: staff, payerId: payer, initials, age });
  const docId = `doc-${id}`;
  const fromDoc = method !== "manual" && method !== "phone" && method !== "voice";
  if (fromDoc) {
    r.documents = [{ id: docId, name: `${source} referral.pdf`, kind: "referral", receivedAt: at, simulated: true, pages: [[
      { kind: "letterhead", org: source, sub: "Referral (simulated import)" },
      { kind: "meta", items: [["Patient", `${initials}, ${age}`], ["Requested", s.label], ["Insurance", planName(payer)]] },
      { kind: "p", id: `${id}-r`, text: reason },
    ]] }];
  }
  const src = fromDoc ? doc(docId, "Referral p.1", `${id}-r`) : undefined;
  const state: FieldState = fromDoc ? "document_extracted" : "patient_reported";
  r.referral = { sourceOrg: F(source, state, at, fromDoc ? "reader" : staff, src, "high"), reason: F(reason, state, at, fromDoc ? "reader" : staff, src, "high") };
  r.coverage = { plan: F(planName(payer), state, at, fromDoc ? "reader" : staff, src, "high"), coverageType: F(coverageType(payer), "ai_suggested", at, "verify", src, "medium") };
  r.pathways = [path({ serviceId: svc, fit: "possible", rationale: `Requested by the referral: ${s.short}.`, outstanding: s.status === "redesign" ? ["Starts July 1, 2027"] : ["Clinical review"], availability: s.status === "redesign" ? "not_yet" : "available", referralReqs: [] })];
  if (svc === "psr") r.legacy = { serviceId: "psr", authorizationId: "VA-PSR-1877", authEnds: vaDate("2027-01-31") };
  if (svc === "crisis") r.tasks.push(task({ role: "completion", agent: "integrity", action: "Registration due within 1 business day", status: "needs_you", section: "review", at, approval: "none", result: "Register the crisis service with the member's plan" }));
  if (svc === "clubhouse") r.triageNote = "Clubhouse starts July 1, 2027. Redirected to PSR until then.";
  r.tasks.push(task({ role: "referral", agent: "reader", action: fromDoc ? "Read the referral" : "Logged the referral", status: "done", section: "referral", at, approval: "none", result: fromDoc ? "2 fields extracted" : "Entered by staff" }));
  return r;
}

export function seedIntakes(): IntakeRecord[] {
  seq = 0;
  const base = [scenarioA(), scenarioB(), scenarioC(), scenarioD(), ...LIGHT.map(light), ...legacyIntakes()];
  return [extendReferral, extendProfile, extendClinical, extendCans, extendReview, extendScenarios].reduce((rs, fn) => fn(rs), base);
}

/* ---------------------------------------------------------------- July 2027 transition */
export interface LegacyClient {
  id: string;
  initials: string;
  age: number;
  serviceId: VaServiceId;
  payerId: BuiltInPayerId;
  site: SiteId;
  authorizationId: string;
  authEnds: number;
  /** Possible next services for clinical review. Never one-to-one. */
  candidates: (VaServiceId | "external")[];
  status: "not_started" | "review_scheduled" | "assessment_prep" | "intake_open" | "pathway_selected";
  intakeId?: string;
  note?: string;
}
type Roster = [id: string, initials: string, age: number, svc: VaServiceId, payer: BuiltInPayerId, site: SiteId, auth: string, ends: string, cands: (VaServiceId | "external")[], status: LegacyClient["status"], intake?: string];
const ROSTER: Roster[] = [
  ["LC-01", "R.H.", 41, "mhss", "cardinal", "B", "VA-MHSS-2291", "2027-03-31", ["cpst-adult", "clubhouse", "mhcm"], "intake_open", "IN-3102"],
  ["LC-02", "G.N.", 47, "psr", "beacon", "A", "VA-PSR-1877", "2027-01-31", ["clubhouse", "cpst-adult"], "intake_open", "IN-3122"],
  ["LC-03", "D.W.", 13, "iih", "summit", "A", "VA-IIH-3302", "2026-12-15", ["cpst-youth", "opt"], "not_started"],
  ["LC-04", "K.T.", 10, "tdt", "evergreen", "B", "VA-TDT-4410", "2027-06-11", ["cpst-school", "cpst-youth"], "review_scheduled"],
  ["LC-05", "M.A.", 15, "tdt", "summit", "A", "VA-TDT-4415", "2027-06-11", ["cpst-school"], "not_started"],
  ["LC-06", "S.B.", 38, "mhss", "lakeshore", "A", "VA-MHSS-2304", "2027-02-28", ["cpst-adult", "mhcm"], "assessment_prep"],
  ["LC-07", "J.E.", 55, "psr", "cardinal", "B", "VA-PSR-1890", "2027-04-30", ["clubhouse"], "not_started"],
  ["LC-08", "T.R.", 16, "iih", "harborview", "B", "VA-IIH-3319", "2027-01-20", ["cpst-youth", "external"], "review_scheduled"],
  ["LC-09", "A.L.", 29, "mhss", "evergreen", "B", "VA-MHSS-2311", "2027-05-31", ["cpst-adult"], "not_started"],
  ["LC-10", "C.H.", 8, "tdt", "harborview", "A", "VA-TDT-4421", "2027-06-11", ["cpst-school", "opt"], "pathway_selected"],
  ["LC-11", "N.P.", 44, "psr", "lakeshore", "A", "VA-PSR-1902", "2027-03-15", ["clubhouse", "cpst-adult"], "not_started"],
  ["LC-12", "E.J.", 12, "iih", "cardinal", "A", "VA-IIH-3325", "2027-02-01", ["cpst-youth"], "assessment_prep"],
];
export const seedRoster = (): LegacyClient[] => ROSTER.map(([id, initials, age, serviceId, payerId, site, authorizationId, ends, candidates, status, intakeId]) => ({ id, initials, age, serviceId, payerId, site, authorizationId, authEnds: vaDate(ends), candidates, status, intakeId }));

/** Readiness items to confirm with each plan before July 1, 2027. All start unconfirmed: Psyflo knows nothing about a plan's readiness until staff record it. */
export interface ReadinessItem { id: string; label: string }
export const READINESS_ITEMS: ReadinessItem[] = [
  { id: "codes", label: "New service codes loaded for CPST, CSC and Clubhouse" },
  { id: "contract", label: "Contract or amendment covers the redesigned services" },
  { id: "credentialing", label: "Staff credentialing for the new services" },
  { id: "auth", label: "Authorization or registration process confirmed" },
  { id: "cans", label: "How the plan wants the CANS Lifetime submitted" },
];
export type ReadinessState = "not_confirmed" | "confirmed" | "issue";
export interface PlanReadiness { payerId: BuiltInPayerId; items: Record<string, { state: ReadinessState; note?: string; by?: string; at?: number }> }
export const seedReadiness = (): PlanReadiness[] => VA_PLANS.map((p) => ({ payerId: p.payerId, items: Object.fromEntries(READINESS_ITEMS.map((i) => [i.id, { state: "not_confirmed" as ReadinessState }])) }));
