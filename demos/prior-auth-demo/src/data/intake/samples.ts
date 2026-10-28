import type { DocBlock } from "@/components/ui/DocumentSheet";
import type { BuiltInPayerId, Urgency } from "../types";
import { vaPlanOf } from "../va/plans";
import type { VaServiceId } from "../va/services";
import type { IntakeDocument, IntakeRecord, ReferralMethod } from "./types";

/* Synthetic referral documents for the New Intake and Add a document flows. Every organization is marked (fictional), phone numbers use 555-01xx,
   member IDs are masked, people appear by initials or role. The demo never reads an uploaded file: it attaches one of these instead and says so. */

export interface SampleExtract {
  section: "referral" | "profile" | "coverage";
  field: string;
  value: string;
  /** The block of the document the value comes from. */
  block: string;
  quote?: string;
  confidence: "high" | "medium" | "low";
  /** Set when two parts of the source disagree. */
  conflict?: string;
  /** Set when the value is a summary or an inference the Referral Agent made, not words the document states: it is tagged AI suggested. */
  inferred?: boolean;
}

export type SampleMethod = Extract<ReferralMethod, "upload" | "fax" | "email" | "emr" | "webform">;
export const SAMPLE_METHODS: SampleMethod[] = ["upload", "fax", "email", "emr", "webform"];

export interface ReferralSample {
  id: string;
  method: SampleMethod;
  label: string;
  summary: string;
  docName: string;
  docKind: IntakeDocument["kind"];
  sourceOrg: string;
  serviceId: VaServiceId;
  /** null when the sources disagree about the plan: a person confirms it. */
  payerId: BuiltInPayerId | null;
  initials: string;
  age: number | null;
  memberLast4: string;
  urgency: Urgency;
  tags: string[];
  blocks: DocBlock[];
  extract: SampleExtract[];
  /** Safety language the Referral Agent raises for a clinician. It never resolves it. */
  safety?: { block: string; quote: string; text: string };
  /** The date the document carries, as written. */
  dated?: string;
  /** Whether the document names the service it asks for (stated, the default), or the Referral Agent infers it from the reason (inferred), or nothing says (unstated). */
  serviceBasis?: "stated" | "inferred" | "unstated";
  /** The fictional EMR an EMR import comes from. */
  emrSystem?: string;
}

export const REFERRAL_SAMPLES: ReferralSample[] = [
  {
    id: "s-upload-peds", method: "upload", label: "Pediatric practice referral", summary: "L.M., 12 · anxiety and missed school · outpatient therapy · guardian listed",
    docName: "Maple Grove Pediatrics referral (scan).pdf", docKind: "referral", sourceOrg: "Maple Grove Pediatrics (fictional)", serviceId: "opt", payerId: "cardinal",
    initials: "L.M.", age: 12, memberLast4: "2087", urgency: "routine", tags: ["Guardian"], dated: "10/19/2026",
    blocks: [
      { kind: "letterhead", org: "Maple Grove Pediatrics (fictional)", sub: "Pediatric primary care · Chesterfield, VA (fictional address)" },
      { kind: "title", text: "Referral for behavioral health services" },
      { kind: "meta", items: [["Patient", "L.M., age 12"], ["Date", "10/19/2026"]] },
      { kind: "h", text: "Reason for referral" },
      { kind: "p", id: "reason", text: "L. has had stomach aches most school mornings since August and has missed 11 days of school. Her mother reports panic-like episodes before school and at bedtime. Requesting outpatient therapy for anxiety." },
      { kind: "h", text: "Clinical information" },
      { kind: "list", id: "concerns", items: ["Worry about school and about being away from her mother", "Takes about an hour to fall asleep most nights", "No prior behavioral health treatment", "Medical workup for stomach pain normal (09/2026)"] },
      { kind: "p", id: "dx", text: "Working diagnosis: generalized anxiety disorder (F41.1), per the pediatric visit on 10/12/2026." },
      { kind: "h", text: "Family and coverage" },
      { kind: "table", id: "family", head: ["Item", "As written"], rows: [["Date of birth", "05/09/2014"], ["Parent or guardian", "Rosa M. (mother), legal guardian"], ["Guardian phone", "(804) 555-0163"], ["Medicaid plan", "Anthem HealthKeepers Plus"], ["Member ID", "ending 2087"], ["Language at home", "Spanish and English; mother prefers Spanish"]] },
      { kind: "p", id: "prefs", text: "The family prefers after-school appointments and a Spanish-speaking clinician if possible." },
      { kind: "sig", id: "sig", text: "Dr. A. Brennan, MD, pediatrics (fictional) · (804) 555-0150" },
    ],
    extract: [
      { section: "referral", field: "sourceOrg", value: "Maple Grove Pediatrics (fictional)", block: "sig", confidence: "high" },
      { section: "referral", field: "referringClinician", value: "Dr. A. Brennan, MD, pediatrics (fictional)", block: "sig", confidence: "high" },
      { section: "referral", field: "referrerContact", value: "(804) 555-0150 (practice)", block: "sig", quote: "(804) 555-0150", confidence: "high" },
      { section: "referral", field: "reason", value: "Stomach aches most school mornings since August, 11 missed school days, panic-like episodes before school and at bedtime. Requests outpatient therapy for anxiety.", block: "reason", confidence: "high" },
      { section: "referral", field: "concerns", value: "Worry about school and separation from her mother; about an hour to fall asleep most nights.", block: "concerns", confidence: "medium", inferred: true },
      { section: "referral", field: "dxDocumented", value: "Generalized anxiety disorder (F41.1), working diagnosis from the pediatric visit on 10/12/2026", block: "dx", confidence: "medium" },
      { section: "referral", field: "previousServices", value: "No prior behavioral health treatment", block: "concerns", quote: "No prior behavioral health treatment", confidence: "high" },
      { section: "referral", field: "preferences", value: "After-school appointments; a Spanish-speaking clinician if possible.", block: "prefs", confidence: "high" },
      { section: "profile", field: "dob", value: "2014-05-09", block: "family", quote: "Date of birth 05/09/2014", confidence: "high" },
      { section: "profile", field: "guardianName", value: "Rosa M. (mother), legal guardian", block: "family", confidence: "high" },
      { section: "profile", field: "guardianPhone", value: "(804) 555-0163", block: "family", confidence: "high" },
      { section: "profile", field: "language", value: "Spanish", block: "family", quote: "Spanish and English; mother prefers Spanish", confidence: "medium", inferred: true },
      { section: "coverage", field: "plan", value: "Anthem HealthKeepers Plus", block: "family", confidence: "high" },
      { section: "coverage", field: "medicaidId", value: "•••• 2087", block: "family", quote: "Member ID ending 2087", confidence: "high" },
    ],
  },
  {
    id: "s-fax-ed", method: "fax", label: "Emergency department fax", summary: "D.R., 44 · alcohol withdrawal risk · ARTS withdrawal management, then residential",
    docName: "James River Medical Center ED referral (fax).pdf", docKind: "fax", sourceOrg: "James River Medical Center (fictional), emergency department", serviceId: "arts-wm", payerId: "lakeshore",
    initials: "D.R.", age: 44, memberLast4: "5530", urgency: "urgent", tags: ["Urgent"], dated: "10/20/2026",
    blocks: [
      { kind: "letterhead", org: "James River Medical Center (fictional)", sub: "Emergency department · fax referral" },
      { kind: "title", text: "ED referral for substance use treatment" },
      { kind: "meta", items: [["Patient", "D.R., 44"], ["Seen", "10/20/2026, 2:15 am"]] },
      { kind: "h", text: "Reason" },
      { kind: "p", id: "reason", text: "Brought in after a fall while intoxicated. Drinks about a fifth of liquor daily for 3 years. Last drink 10/19 at 9 pm. History of withdrawal seizures in 2024. Asking for medically monitored withdrawal management today and residential treatment afterwards." },
      { kind: "h", text: "ED course" },
      { kind: "list", id: "course", items: ["CIWA-Ar 14 at 6 am; treated per protocol", "Head CT negative", "Blood alcohol 0.21 on arrival", "Wants treatment; says his family is supportive"] },
      { kind: "p", id: "prior", text: "Prior treatment: a 28-day residential program in 2023 (fictional program). No current outpatient provider." },
      { kind: "table", id: "ins", head: ["Item", "As written"], rows: [["Insurance", "UnitedHealthcare Community Plan"], ["Member ID", "ending 5530"], ["Emergency contact", "Sister, (757) 555-0191"]] },
      { kind: "sig", id: "sig", text: "K. Alvarez, NP, emergency department (fictional) · callback (804) 555-0128" },
    ],
    extract: [
      { section: "referral", field: "sourceOrg", value: "James River Medical Center (fictional), emergency department", block: "sig", confidence: "high" },
      { section: "referral", field: "referringClinician", value: "K. Alvarez, NP (fictional)", block: "sig", confidence: "high" },
      { section: "referral", field: "referrerContact", value: "(804) 555-0128 (ED callback)", block: "sig", quote: "callback (804) 555-0128", confidence: "high" },
      { section: "referral", field: "reason", value: "Daily heavy drinking for 3 years with withdrawal seizures in 2024; asks for medically monitored withdrawal management today, then residential treatment.", block: "reason", confidence: "high" },
      { section: "referral", field: "concerns", value: "Fall while intoxicated; about a fifth of liquor daily; last drink 10/19 at 9 pm.", block: "reason", confidence: "high", inferred: true },
      { section: "referral", field: "symptoms", value: "Withdrawal signs in the ED (CIWA-Ar 14 at 6 am), treated per protocol.", block: "course", confidence: "medium" },
      { section: "referral", field: "hospitalization", value: "ED visit on 10/20/2026 after a fall; head CT negative.", block: "course", confidence: "high" },
      { section: "referral", field: "previousServices", value: "28-day residential program in 2023; no current outpatient provider.", block: "prior", confidence: "high" },
      { section: "profile", field: "emergencyContact", value: "Sister, (757) 555-0191", block: "ins", confidence: "high" },
      { section: "coverage", field: "plan", value: "UnitedHealthcare Community Plan", block: "ins", confidence: "high" },
      { section: "coverage", field: "medicaidId", value: "•••• 5530", block: "ins", quote: "Member ID ending 5530", confidence: "high" },
    ],
  },
  {
    id: "s-email-pcp", method: "email", label: "Referral email from primary care", summary: "V.N., 52 · care coordination · the email and the face sheet name different plans",
    docName: "Referral email, Harbor Family Medicine (import).eml", docKind: "email", sourceOrg: "Harbor Family Medicine (fictional)", serviceId: "mhcm", payerId: null,
    initials: "V.N.", age: 52, memberLast4: "8812", urgency: "routine", tags: ["Coverage conflict"], dated: "10/19/2026",
    blocks: [
      { kind: "letterhead", org: "Harbor Family Medicine (fictional)", sub: "Referral email, imported from the intake inbox (simulated)" },
      { kind: "meta", items: [["From", "Care coordinator, Harbor Family Medicine (fictional)"], ["Sent", "10/19/2026, 4:52 pm"], ["Subject", "Referral: V.N., 52, case management"]] },
      { kind: "p", id: "body", text: "We are referring V.N., 52, for mental health case management. She has bipolar disorder and missed her last two psychiatry visits after losing her ride. She is behind on rent and asked for help with benefits. Her plan is Humana Healthy Horizons in Virginia." },
      { kind: "h", text: "Attached face sheet" },
      { kind: "table", id: "face", head: ["Field", "Value"], rows: [["Patient", "V.N."], ["Date of birth", "02/27/1974"], ["Plan", "UnitedHealthcare Community Plan (since 09/01/2026)"], ["Member ID", "ending 8812"], ["Phone", "(757) 555-0137"]] },
      { kind: "p", id: "contact", text: "Reply to: J. Ortiz, LCSW, care coordinator (fictional), (757) 555-0110." },
    ],
    extract: [
      { section: "referral", field: "sourceOrg", value: "Harbor Family Medicine (fictional)", block: "contact", confidence: "high" },
      { section: "referral", field: "referringClinician", value: "J. Ortiz, LCSW, care coordinator (fictional)", block: "contact", confidence: "high" },
      { section: "referral", field: "referrerContact", value: "(757) 555-0110", block: "contact", confidence: "high" },
      { section: "referral", field: "reason", value: "Mental health case management: missed two psychiatry visits after losing transportation, behind on rent, asks for help with benefits.", block: "body", confidence: "high" },
      { section: "referral", field: "concerns", value: "Missed psychiatry visits, housing instability, benefits.", block: "body", confidence: "medium" },
      { section: "referral", field: "dxDocumented", value: "Bipolar disorder (as stated in the referral email)", block: "body", quote: "She has bipolar disorder", confidence: "medium" },
      { section: "profile", field: "dob", value: "1974-02-27", block: "face", quote: "Date of birth 02/27/1974", confidence: "high" },
      { section: "profile", field: "phone", value: "(757) 555-0137", block: "face", confidence: "high" },
      { section: "profile", field: "transportation", value: "Lost her ride to appointments", block: "body", quote: "missed her last two psychiatry visits after losing her ride", confidence: "medium" },
      { section: "profile", field: "housing", value: "Behind on rent", block: "body", confidence: "medium" },
      {
        section: "coverage", field: "plan", value: "UnitedHealthcare Community Plan", block: "face", quote: "Plan: UnitedHealthcare Community Plan (since 09/01/2026)", confidence: "medium",
        conflict: "The referral email says Humana Healthy Horizons in Virginia; the attached face sheet says UnitedHealthcare Community Plan since 09/01/2026. Confirm the current plan before eligibility is checked.",
      },
      { section: "coverage", field: "medicaidId", value: "•••• 8812", block: "face", quote: "Member ID ending 8812", confidence: "high" },
    ],
  },
  {
    id: "s-emr-psych", method: "emr", label: "EMR referral from clinic psychiatry", summary: "R.A., 29 · depression worse despite treatment · mental health IOP",
    docName: "Internal referral, outpatient psychiatry (EMR import).txt", docKind: "emr_summary", sourceOrg: "Psyflo demo clinic, outpatient psychiatry (internal)", serviceId: "mh-iop", payerId: "evergreen",
    initials: "R.A.", age: 29, memberLast4: "3349", urgency: "urgent", tags: ["Urgent"], dated: "10/20/2026",
    blocks: [
      { kind: "letterhead", org: "Psyflo demo clinic", sub: "Internal referral (EMR import, simulated)" },
      { kind: "meta", items: [["Patient", "R.A., 29"], ["Ordered", "10/20/2026, 8:05 am"], ["Order", "Referral to mental health IOP"]] },
      { kind: "p", id: "reason", text: "Depression has worsened over 6 weeks despite sertraline and weekly therapy. Missing work; sleeping 12 hours a day. A step up to intensive outpatient is requested." },
      { kind: "list", id: "meds", items: ["Sertraline 150 mg daily", "Hydroxyzine 25 mg as needed for sleep"] },
      { kind: "p", id: "prior", text: "Current services: weekly outpatient therapy at this clinic since 03/2026; psychiatry every 4 weeks." },
      { kind: "p", id: "screen", text: "PHQ-9 on 10/16/2026: 19." },
      { kind: "table", id: "cov", head: ["Item", "On file"], rows: [["Plan", "Aetna Better Health of Virginia"], ["Member ID", "ending 3349"], ["Preferred contact", "Text messages, (571) 555-0102"]] },
      { kind: "sig", id: "sig", text: "Dr. M. Castillo, psychiatrist (fictional) · internal extension 0144" },
    ],
    extract: [
      { section: "referral", field: "sourceOrg", value: "Psyflo demo clinic, outpatient psychiatry (internal)", block: "sig", confidence: "high" },
      { section: "referral", field: "referringClinician", value: "Dr. M. Castillo, psychiatrist (fictional)", block: "sig", confidence: "high" },
      { section: "referral", field: "referrerContact", value: "Internal extension 0144", block: "sig", confidence: "high" },
      { section: "referral", field: "reason", value: "Depression worse over 6 weeks despite medication and weekly therapy; step up to intensive outpatient requested.", block: "reason", confidence: "high" },
      { section: "referral", field: "concerns", value: "Missing work; sleeping 12 hours a day.", block: "reason", confidence: "high" },
      { section: "referral", field: "symptoms", value: "Low mood for 6 weeks, hypersomnia; PHQ-9 of 19 on 10/16/2026.", block: "screen", confidence: "medium" },
      { section: "referral", field: "previousServices", value: "Weekly outpatient therapy since 03/2026; psychiatry every 4 weeks.", block: "prior", confidence: "high" },
      { section: "referral", field: "currentProviders", value: "Dr. M. Castillo (psychiatry) and the clinic's outpatient therapist", block: "prior", confidence: "medium" },
      { section: "profile", field: "medications", value: "Sertraline 150 mg daily; hydroxyzine 25 mg as needed for sleep", block: "meds", confidence: "high" },
      { section: "profile", field: "phone", value: "(571) 555-0102", block: "cov", confidence: "high" },
      { section: "profile", field: "commPrefs", value: "Text messages", block: "cov", confidence: "high" },
      { section: "coverage", field: "plan", value: "Aetna Better Health of Virginia", block: "cov", confidence: "high" },
      { section: "coverage", field: "medicaidId", value: "•••• 3349", block: "cov", quote: "Member ID ending 3349", confidence: "high" },
    ],
  },
  {
    id: "s-web-safety", method: "webform", label: "Caregiver web form", summary: "J.T., 16 · grandmother is the legal guardian · the form contains safety language",
    docName: "Caregiver web form submission.pdf", docKind: "other", sourceOrg: "Caregiver (web form)", serviceId: "mh-iop", payerId: "summit",
    initials: "J.T.", age: 16, memberLast4: "6604", urgency: "urgent", tags: ["Guardian", "Safety language"], dated: "10/20/2026", serviceBasis: "inferred",
    blocks: [
      { kind: "letterhead", org: "Psyflo demo clinic, web intake form", sub: "Submitted 10/20/2026, 6:58 am · simulated submission" },
      { kind: "meta", items: [["Filled in by", "Grandmother (legal guardian)"], ["For", "J.T., 16"]] },
      { kind: "h", text: "What is going on?" },
      { kind: "p", id: "what", text: "My granddaughter has stopped eating with us and stays in her room. Her grades dropped this fall and she quit the soccer team. Two nights ago she told me she wishes she could go to sleep and not wake up. I don't know if she means it." },
      { kind: "h", text: "What kind of help are you looking for?" },
      { kind: "p", id: "help", text: "Her school counselor said an intensive program might help. We can do afternoons." },
      { kind: "h", text: "Contact and insurance" },
      { kind: "table", id: "contact", head: ["Question", "Answer"], rows: [["Your relationship", "Grandmother, legal guardian since 2021"], ["Best phone", "(434) 555-0175"], ["Insurance", "Sentara Community Plan"], ["Member ID", "ending 6604"], ["Language", "English"]] },
    ],
    safety: {
      block: "what",
      quote: "she told me she wishes she could go to sleep and not wake up",
      text: "The caregiver's web form says the patient said two nights ago that she wishes she could go to sleep and not wake up. A clinician must review safety today, before routine scheduling. Psyflo does not decide that a person is safe.",
    },
    extract: [
      { section: "referral", field: "sourceOrg", value: "Caregiver (web form): grandmother, legal guardian", block: "contact", confidence: "high" },
      { section: "referral", field: "referrerContact", value: "(434) 555-0175 (grandmother)", block: "contact", confidence: "high" },
      { section: "referral", field: "reason", value: "Grandmother asks for an intensive program, as the school counselor suggested.", block: "help", confidence: "high" },
      { section: "referral", field: "concerns", value: "Stays in her room, stopped eating with the family, grades dropped, quit the soccer team.", block: "what", confidence: "medium", inferred: true },
      { section: "referral", field: "safetyConcerns", value: "Her grandmother says she told her two nights ago that she wishes she could go to sleep and not wake up. A clinician reviews this.", block: "what", quote: "she told me she wishes she could go to sleep and not wake up", confidence: "medium" },
      { section: "referral", field: "preferences", value: "Afternoon appointments.", block: "help", confidence: "high" },
      { section: "profile", field: "guardianName", value: "Grandmother, legal guardian since 2021", block: "contact", confidence: "high" },
      { section: "profile", field: "guardianPhone", value: "(434) 555-0175", block: "contact", confidence: "high" },
      { section: "profile", field: "language", value: "English", block: "contact", confidence: "high" },
      { section: "coverage", field: "plan", value: "Sentara Community Plan", block: "contact", confidence: "high" },
      { section: "coverage", field: "medicaidId", value: "•••• 6604", block: "contact", quote: "Member ID ending 6604", confidence: "high" },
    ],
  },
  {
    id: "s-web-dup", method: "webform", label: "Parent web form", summary: "T.W., 14 · mother asks about help at school · may match an open intake",
    docName: "Parent web form submission.pdf", docKind: "other", sourceOrg: "Parent (web form)", serviceId: "cpst-school", payerId: "summit",
    initials: "T.W.", age: 14, memberLast4: "4471", urgency: "routine", tags: ["Guardian", "Possible duplicate"], dated: "10/20/2026", serviceBasis: "inferred",
    blocks: [
      { kind: "letterhead", org: "Psyflo demo clinic, web intake form", sub: "Submitted 10/20/2026, 7:40 am · simulated submission" },
      { kind: "meta", items: [["Filled in by", "Mother (guardian)"], ["For", "T.W., 14, grade 8"]] },
      { kind: "p", id: "what", text: "The school counselor said she sent you a referral. My son has been missing school and seems down. I want to know about help at school next year and what I need to sign." },
      { kind: "table", id: "contact", head: ["Question", "Answer"], rows: [["Your relationship", "Mother, guardian"], ["Best phone", "(804) 555-0142"], ["Insurance", "Sentara Community Plan"], ["Member ID", "ending 4471"], ["Best time to call", "After 5 pm"], ["Date of birth", "03/14/2012"]] },
    ],
    extract: [
      { section: "referral", field: "sourceOrg", value: "Parent (web form): mother, guardian", block: "contact", confidence: "high" },
      { section: "referral", field: "reason", value: "Mother asks about school-based help next year and what she needs to sign.", block: "what", confidence: "high" },
      { section: "referral", field: "preferences", value: "Calls after 5 pm.", block: "contact", quote: "Best time to call: After 5 pm", confidence: "high" },
      { section: "profile", field: "guardianName", value: "Mother, guardian", block: "contact", quote: "Your relationship: Mother, guardian", confidence: "high" },
      { section: "profile", field: "guardianPhone", value: "(804) 555-0142", block: "contact", confidence: "high" },
      { section: "profile", field: "dob", value: "2012-03-14", block: "contact", quote: "Date of birth 03/14/2012", confidence: "high" },
      { section: "coverage", field: "plan", value: "Sentara Community Plan", block: "contact", confidence: "high" },
      { section: "coverage", field: "medicaidId", value: "•••• 4471", block: "contact", quote: "Member ID ending 4471", confidence: "high" },
    ],
  },
  {
    id: "s-up-school", method: "upload", label: "School referral", summary: "A.K., 15 · anxiety and missed school · school-based support · guardian and school release on file",
    docName: "Ridgeview High School student referral.pdf", docKind: "school_report", sourceOrg: "Ridgeview High School (fictional)", serviceId: "cpst-school", payerId: "harborview",
    initials: "A.K.", age: 15, memberLast4: "7720", urgency: "routine", tags: ["Guardian", "School"], dated: "10/16/2026", serviceBasis: "inferred",
    blocks: [
      { kind: "letterhead", org: "Ridgeview High School (fictional)", sub: "Student Services · Henrico County (fictional address)" },
      { kind: "title", text: "Student referral for community mental health services" },
      { kind: "meta", items: [["Student", "A.K., grade 10"], ["Date", "10/16/2026"]] },
      { kind: "h", text: "Reason for referral" },
      { kind: "p", id: "reason", text: "A. has missed 14 days since September, often leaves class before tests, and has had two panic episodes in the hallway. Staff describe her as quiet and anxious. We are asking for school-based support and a community assessment." },
      { kind: "h", text: "What we see at school" },
      { kind: "list", id: "concerns", items: ["Missed 14 days since September", "Goes to the nurse before tests", "Counselor screened for safety on 10/15 and found no current concerns", "Close to the choir director and one friend"] },
      { kind: "h", text: "Supports" },
      { kind: "p", id: "supports", text: "No IEP or 504 plan. No current therapist. Seen by the school counselor weekly since September." },
      { kind: "h", text: "Family and insurance" },
      { kind: "table", id: "family", head: ["Item", "As written"], rows: [["Date of birth", "08/22/2011"], ["Parent or guardian", "Marcus K. (father)"], ["Guardian phone", "(804) 555-0166"], ["Insurance", "Humana Healthy Horizons in Virginia"], ["Member ID", "ending 7720"], ["Language at home", "English"]] },
      { kind: "p", id: "consent", text: "Parent release of school records: signed 10/15/2026." },
      { kind: "sig", id: "sig", text: "Priya Nandan, M.Ed., school counselor (fictional) · (804) 555-0128" },
    ],
    extract: [
      { section: "referral", field: "sourceOrg", value: "Ridgeview High School (fictional)", block: "sig", confidence: "high" },
      { section: "referral", field: "referringClinician", value: "Priya Nandan, M.Ed., school counselor (fictional)", block: "sig", confidence: "high" },
      { section: "referral", field: "referrerContact", value: "(804) 555-0128", block: "sig", quote: "(804) 555-0128", confidence: "high" },
      { section: "referral", field: "reason", value: "Missed 14 school days since September, leaves class before tests, two panic episodes in the hallway. Asks for school-based support and a community assessment.", block: "reason", confidence: "high" },
      { section: "referral", field: "concerns", value: "Anxious and quiet at school; goes to the nurse before tests.", block: "concerns", confidence: "medium", inferred: true },
      { section: "referral", field: "previousServices", value: "No IEP or 504 plan, no current therapist; weekly visits with the school counselor since September.", block: "supports", confidence: "high" },
      { section: "profile", field: "dob", value: "2011-08-22", block: "family", quote: "Date of birth 08/22/2011", confidence: "high" },
      { section: "profile", field: "guardianName", value: "Marcus K. (father)", block: "family", confidence: "high" },
      { section: "profile", field: "guardianPhone", value: "(804) 555-0166", block: "family", confidence: "high" },
      { section: "profile", field: "language", value: "English", block: "family", quote: "Language at home English", confidence: "high" },
      { section: "profile", field: "schoolConsent", value: "On file", block: "consent", quote: "Parent release of school records: signed 10/15/2026.", confidence: "high" },
      { section: "coverage", field: "plan", value: "Humana Healthy Horizons in Virginia", block: "family", confidence: "high" },
      { section: "coverage", field: "medicaidId", value: "•••• 7720", block: "family", quote: "Member ID ending 7720", confidence: "high" },
    ],
  },
  {
    id: "s-up-court", method: "upload", label: "Court or probation letter", summary: "V.R., 31 · probation condition · alcohol use · release of information not yet signed",
    docName: "Riverside Court Services Unit letter.pdf", docKind: "other", sourceOrg: "Riverside Court Services Unit (fictional)", serviceId: "arts-iop", payerId: "beacon",
    initials: "V.R.", age: 31, memberLast4: "5516", urgency: "routine", tags: ["Court", "Release needed"], dated: "10/14/2026", serviceBasis: "inferred",
    blocks: [
      { kind: "letterhead", org: "Riverside Court Services Unit (fictional)", sub: "Probation and community supervision · Richmond, VA (fictional address)" },
      { kind: "title", text: "Letter to the treatment provider" },
      { kind: "meta", items: [["Client", "V.R., 31"], ["Date", "10/14/2026"]] },
      { kind: "h", text: "Request" },
      { kind: "p", id: "request", text: "V.R. is on supervised probation. As a condition of release, the court asks that he complete a substance use assessment and, if one is recommended, an intensive outpatient program. Please send attendance reports to the probation officer once a release is signed." },
      { kind: "h", text: "Background" },
      { kind: "list", id: "background", items: ["Two alcohol-related charges, in 2024 and 2026", "Reports drinking most evenings; last drink 10/12", "Works full time; stable housing", "No earlier formal treatment"] },
      { kind: "table", id: "contact", head: ["Item", "As written"], rows: [["Date of birth", "02/09/1995"], ["Phone", "(804) 555-0155"], ["Insurance", "Virginia Medicaid fee-for-service"], ["Member ID", "ending 5516"], ["Probation officer", "D. Whitaker (fictional), (804) 555-0194"]] },
      { kind: "p", id: "release", text: "Release of information to the court: not yet signed." },
      { kind: "sig", id: "sig", text: "D. Whitaker, probation officer (fictional) · (804) 555-0194" },
    ],
    extract: [
      { section: "referral", field: "sourceOrg", value: "Riverside Court Services Unit (fictional)", block: "sig", confidence: "high" },
      { section: "referral", field: "referringClinician", value: "D. Whitaker, probation officer (fictional)", block: "sig", confidence: "high" },
      { section: "referral", field: "referrerContact", value: "(804) 555-0194", block: "sig", quote: "(804) 555-0194", confidence: "high" },
      { section: "referral", field: "reason", value: "Court-ordered substance use assessment and, if recommended, an intensive outpatient program, as a probation condition.", block: "request", confidence: "high" },
      { section: "referral", field: "previousServices", value: "No earlier formal treatment", block: "background", quote: "No earlier formal treatment", confidence: "high" },
      { section: "profile", field: "dob", value: "1995-02-09", block: "contact", quote: "Date of birth 02/09/1995", confidence: "high" },
      { section: "profile", field: "phone", value: "(804) 555-0155", block: "contact", confidence: "high" },
      { section: "profile", field: "substanceUse", value: "Drinks most evenings; last drink 10/12/2026", block: "background", confidence: "medium" },
      { section: "profile", field: "legal", value: "Supervised probation; two alcohol-related charges (2024 and 2026)", block: "background", confidence: "high" },
      { section: "profile", field: "roi", value: "Needed", block: "release", quote: "Release of information to the court: not yet signed.", confidence: "high" },
      { section: "coverage", field: "plan", value: "Virginia Medicaid fee-for-service", block: "contact", confidence: "high" },
      { section: "coverage", field: "medicaidId", value: "•••• 5516", block: "contact", quote: "Member ID ending 5516", confidence: "high" },
    ],
  },
  {
    id: "s-up-card", method: "upload", label: "Insurance card", summary: "M.O. · front and back of a member card only · everything else is missing",
    docName: "Insurance card (front and back).pdf", docKind: "insurance_card", sourceOrg: "Insurance card (no referral source)", serviceId: "other-bh", payerId: "evergreen",
    initials: "M.O.", age: null, memberLast4: "6190", urgency: "routine", tags: ["Coverage only"], dated: "10/20/2026", serviceBasis: "unstated",
    blocks: [
      { kind: "letterhead", org: "Aetna Better Health of Virginia", sub: "Cardinal Care, Virginia Medicaid managed care" },
      { kind: "meta", items: [["Member", "M.O."], ["Card", "Front and back, scanned"]] },
      { kind: "table", id: "card", head: ["Item", "On the card"], rows: [["Plan", "Aetna Better Health of Virginia"], ["Member ID", "ending 6190"], ["Effective", "07/01/2026"], ["Member services", "(800) 555-0100 (fictional)"]] },
    ],
    extract: [
      { section: "coverage", field: "plan", value: "Aetna Better Health of Virginia", block: "card", confidence: "high" },
      { section: "coverage", field: "medicaidId", value: "•••• 6190", block: "card", quote: "Member ID ending 6190", confidence: "high" },
      { section: "coverage", field: "effective", value: "Effective 07/01/2026", block: "card", confidence: "high" },
    ],
  },
  {
    id: "s-emr-gn", method: "emr", emrSystem: "Meridian EHR (fictional)", label: "G.N., 47", summary: "Current client · order to look at services after PSR ends · matches an existing record",
    docName: "Chart summary, G.N. (EMR import).txt", docKind: "emr_summary", sourceOrg: "Psyflo demo clinic, Site A (existing client)", serviceId: "cpst-adult", payerId: "beacon",
    initials: "G.N.", age: 47, memberLast4: "3062", urgency: "routine", tags: ["Existing client"], dated: "10/20/2026", serviceBasis: "inferred",
    blocks: [
      { kind: "letterhead", org: "Psyflo demo clinic", sub: "Chart summary from Meridian EHR (fictional) · simulated EMR import" },
      { kind: "meta", items: [["Patient", "G.N., 47"], ["Date of birth", "06/02/1979"], ["Order", "10/20/2026"]] },
      { kind: "p", id: "order", text: "Receives psychosocial rehabilitation three days a week. That service ends June 30, 2027. Please evaluate for community support services and clubhouse before then." },
      { kind: "list", id: "meds", items: ["Lurasidone 40 mg daily", "Metformin 500 mg twice daily"] },
      { kind: "table", id: "demo", head: ["Item", "On file"], rows: [["Plan", "Virginia Medicaid fee-for-service"], ["Member ID", "ending 3062"], ["Phone", "(804) 555-0119"], ["Language", "English"]] },
      { kind: "sig", id: "sig", text: "Case manager, Site A (fictional) · internal extension 0152" },
    ],
    extract: [
      { section: "referral", field: "sourceOrg", value: "Psyflo demo clinic, Site A (existing client)", block: "sig", confidence: "high" },
      { section: "referral", field: "referrerContact", value: "Internal extension 0152", block: "sig", confidence: "high" },
      { section: "referral", field: "reason", value: "Receives psychosocial rehabilitation, which ends June 30, 2027; asks for an evaluation for community support services and clubhouse before then.", block: "order", confidence: "high" },
      { section: "referral", field: "previousServices", value: "Psychosocial rehabilitation three days a week", block: "order", confidence: "high" },
      { section: "profile", field: "dob", value: "1979-06-02", block: "order", quote: "Date of birth 06/02/1979", confidence: "high" },
      { section: "profile", field: "medications", value: "Lurasidone 40 mg daily; metformin 500 mg twice daily", block: "meds", confidence: "high" },
      { section: "profile", field: "phone", value: "(804) 555-0119", block: "demo", confidence: "high" },
      { section: "profile", field: "language", value: "English", block: "demo", confidence: "high" },
      { section: "coverage", field: "plan", value: "Virginia Medicaid fee-for-service", block: "demo", confidence: "high" },
      { section: "coverage", field: "medicaidId", value: "•••• 3062", block: "demo", quote: "Member ID ending 3062", confidence: "high" },
    ],
  },
  {
    id: "s-emr-cd", method: "emr", emrSystem: "Harborlight Clinical (fictional)", label: "C.D., 8", summary: "Child · autism evaluation done · applied behavior analysis · mother is the guardian",
    docName: "Chart summary, C.D. (EMR import).txt", docKind: "emr_summary", sourceOrg: "Harborlight developmental pediatrics (fictional)", serviceId: "aba", payerId: "summit",
    initials: "C.D.", age: 8, memberLast4: "9183", urgency: "routine", tags: ["Guardian", "Child"], dated: "10/19/2026",
    blocks: [
      { kind: "letterhead", org: "Harborlight developmental pediatrics (fictional)", sub: "Chart summary from Harborlight Clinical (fictional) · simulated EMR import" },
      { kind: "meta", items: [["Patient", "C.D., 8"], ["Date of birth", "04/12/2018"], ["Order", "10/19/2026"]] },
      { kind: "p", id: "order", text: "Referral for applied behavior analysis after the developmental evaluation on 09/22/2026." },
      { kind: "p", id: "dx", text: "Diagnosis: autism spectrum disorder (F84.0), per the evaluation on 09/22/2026. A copy of the evaluation report is requested." },
      { kind: "list", id: "func", items: ["Limited spoken language; uses a few words and picture cards", "Needs help with transitions and daily routines", "Hits his head when upset about 3 times a week"] },
      { kind: "table", id: "demo", head: ["Item", "On file"], rows: [["Guardian", "Ana D. (mother), legal guardian"], ["Guardian phone", "(757) 555-0138"], ["Plan", "Sentara Community Plan"], ["Member ID", "ending 9183"], ["Language at home", "English"]] },
      { kind: "sig", id: "sig", text: "Dr. P. Lindgren, developmental pediatrics (fictional) · (757) 555-0160" },
    ],
    extract: [
      { section: "referral", field: "sourceOrg", value: "Harborlight developmental pediatrics (fictional)", block: "sig", confidence: "high" },
      { section: "referral", field: "referringClinician", value: "Dr. P. Lindgren, developmental pediatrics (fictional)", block: "sig", confidence: "high" },
      { section: "referral", field: "referrerContact", value: "(757) 555-0160", block: "sig", quote: "(757) 555-0160", confidence: "high" },
      { section: "referral", field: "reason", value: "Applied behavior analysis after the developmental evaluation on 09/22/2026.", block: "order", confidence: "high" },
      { section: "referral", field: "dxDocumented", value: "Autism spectrum disorder (F84.0), per the evaluation on 09/22/2026", block: "dx", confidence: "high" },
      { section: "referral", field: "functional", value: "Limited spoken language; needs help with transitions and daily routines; hits his head when upset about 3 times a week.", block: "func", confidence: "medium", inferred: true },
      { section: "referral", field: "existingAssessments", value: "Developmental evaluation, 09/22/2026 (report requested)", block: "dx", quote: "A copy of the evaluation report is requested.", confidence: "high" },
      { section: "profile", field: "dob", value: "2018-04-12", block: "order", quote: "Date of birth 04/12/2018", confidence: "high" },
      { section: "profile", field: "guardianName", value: "Ana D. (mother), legal guardian", block: "demo", confidence: "high" },
      { section: "profile", field: "guardianPhone", value: "(757) 555-0138", block: "demo", confidence: "high" },
      { section: "profile", field: "language", value: "English", block: "demo", confidence: "high" },
      { section: "coverage", field: "plan", value: "Sentara Community Plan", block: "demo", confidence: "high" },
      { section: "coverage", field: "medicaidId", value: "•••• 9183", block: "demo", quote: "Member ID ending 9183", confidence: "high" },
    ],
  },
  {
    id: "s-emr-rt", method: "emr", emrSystem: "Westbrook Health Record (fictional)", label: "R.T., 62", summary: "Older adult · depression and alcohol use · the demographics and billing tabs name different plans",
    docName: "Chart summary, R.T. (EMR import).txt", docKind: "emr_summary", sourceOrg: "Westbrook primary care (fictional)", serviceId: "mh-iop", payerId: null,
    initials: "R.T.", age: 62, memberLast4: "2275", urgency: "routine", tags: ["Coverage conflict"], dated: "10/18/2026",
    blocks: [
      { kind: "letterhead", org: "Westbrook primary care (fictional)", sub: "Chart summary from Westbrook Health Record (fictional) · simulated EMR import" },
      { kind: "meta", items: [["Patient", "R.T., 62"], ["Date of birth", "09/30/1964"], ["Order", "10/18/2026"]] },
      { kind: "p", id: "order", text: "Referral to a mental health intensive outpatient program. Low mood for four months after a retirement and the loss of a spouse. Drinks two to three glasses of wine most nights." },
      { kind: "list", id: "meds", items: ["Escitalopram 10 mg daily", "Amlodipine 5 mg daily"] },
      { kind: "table", id: "demo", head: ["Tab", "Plan listed"], rows: [["Demographics", "Anthem HealthKeepers Plus"], ["Billing", "Sentara Community Plan (updated 10/01/2026)"], ["Member ID", "ending 2275"], ["Phone", "(757) 555-0166"]] },
      { kind: "sig", id: "sig", text: "Dr. S. Haddad, primary care (fictional) · (757) 555-0172" },
    ],
    extract: [
      { section: "referral", field: "sourceOrg", value: "Westbrook primary care (fictional)", block: "sig", confidence: "high" },
      { section: "referral", field: "referringClinician", value: "Dr. S. Haddad, primary care (fictional)", block: "sig", confidence: "high" },
      { section: "referral", field: "referrerContact", value: "(757) 555-0172", block: "sig", quote: "(757) 555-0172", confidence: "high" },
      { section: "referral", field: "reason", value: "Mental health intensive outpatient program for low mood over four months after a retirement and the loss of a spouse.", block: "order", confidence: "high" },
      { section: "profile", field: "dob", value: "1964-09-30", block: "order", quote: "Date of birth 09/30/1964", confidence: "high" },
      { section: "profile", field: "medications", value: "Escitalopram 10 mg daily; amlodipine 5 mg daily", block: "meds", confidence: "high" },
      { section: "profile", field: "substanceUse", value: "Two to three glasses of wine most nights", block: "order", quote: "Drinks two to three glasses of wine most nights.", confidence: "medium" },
      { section: "profile", field: "phone", value: "(757) 555-0166", block: "demo", confidence: "high" },
      {
        section: "coverage", field: "plan", value: "Sentara Community Plan", block: "demo", quote: "Billing: Sentara Community Plan (updated 10/01/2026)", confidence: "medium",
        conflict: "The demographics tab lists Anthem HealthKeepers Plus; the billing tab lists Sentara Community Plan, updated 10/01/2026. Confirm the current plan before eligibility is checked.",
      },
      { section: "coverage", field: "medicaidId", value: "•••• 2275", block: "demo", quote: "Member ID ending 2275", confidence: "high" },
    ],
  },
];

export const samplesFor = (m: ReferralMethod): ReferralSample[] => REFERRAL_SAMPLES.filter((s) => s.method === m);
export const sampleById = (id: string): ReferralSample | undefined => REFERRAL_SAMPLES.find((s) => s.id === id);

/** The document a sample becomes when it is attached. */
export const sampleDocument = (s: { docName: string; docKind: IntakeDocument["kind"]; blocks: DocBlock[] }, id: string, at: number): IntakeDocument => ({
  id, name: s.docName, kind: s.docKind, receivedAt: at, simulated: true, pages: [s.blocks],
});

/* ---------------------------------------------------------------- supporting documents added to an existing record */

export interface SupportingSample {
  id: string;
  label: string;
  summary: string;
  /** Offered only where it makes sense (a school release for a minor). */
  fits: (r: IntakeRecord) => boolean;
  build: (r: IntakeRecord) => { docName: string; docKind: IntakeDocument["kind"]; blocks: DocBlock[]; extract: SampleExtract[] };
}

/** A stable fictional 555-01xx number for a record. */
const phoneFor = (r: IntakeRecord) => `(804) 555-01${String(10 + ([...r.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 90)).padStart(2, "0")}`;
const last4Of = (r: IntakeRecord): string => {
  const onFile = r.coverage.medicaidId?.value ?? r.suggestions.find((s) => s.field === "medicaidId")?.value ?? "";
  const digits = onFile.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : String(1000 + ([...r.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 9000));
};
/** The plan an insurance card shows: the record's plan, or the latest plan an agent found. */
const planFor = (r: IntakeRecord): string => (r.payerId ? vaPlanOf(r.payerId)?.name : undefined) ?? [...r.suggestions].reverse().find((s) => s.field === "plan")?.value ?? r.coverage.plan?.value ?? "Virginia Medicaid fee-for-service";

export const SUPPORTING_SAMPLES: SupportingSample[] = [
  {
    id: "sup-school-release", label: "Signed release of school records", summary: "Parent or guardian allows the school to share records", fits: (r) => r.age !== null && r.age < 18,
    build: (r) => ({
      docName: "Signed release of school records.pdf", docKind: "consent",
      blocks: [
        { kind: "letterhead", org: r.sourceOrg.includes("School") ? r.sourceOrg : "School division records office (fictional)", sub: "Authorization to release student records" },
        { kind: "meta", items: [["Student", r.initials || "Not entered"], ["Released to", "Psyflo demo clinic"]] },
        { kind: "p", id: "scope", text: "I allow the school to share attendance, grades, behavior reports and any 504 or IEP plan with the Psyflo demo clinic for assessment and treatment planning, from 10/20/2026 to 06/30/2028." },
        { kind: "sig", id: "sig", text: `Signed by the parent or guardian${r.profile.guardianName?.value ? ` (${r.profile.guardianName.value})` : ""}, 10/20/2026` },
      ],
      extract: [
        { section: "profile", field: "schoolConsent", value: "On file", block: "sig", quote: "Signed by the parent or guardian, 10/20/2026", confidence: "high" },
        { section: "profile", field: "roi", value: "On file", block: "scope", confidence: "medium" },
      ],
    }),
  },
  {
    id: "sup-insurance-card", label: "Insurance card (front and back)", summary: "The member's current plan, ID and effective date", fits: () => true,
    build: (r) => {
      const plan = planFor(r);
      const last4 = last4Of(r);
      return {
        docName: "Insurance card (front and back).pdf", docKind: "insurance_card",
        blocks: [
          { kind: "letterhead", org: plan, sub: plan.includes("fee-for-service") ? "Virginia Medicaid (fee-for-service)" : "Cardinal Care, Virginia Medicaid managed care" },
          { kind: "meta", items: [["Member", r.initials || "Not entered"], ["Card", "Front and back, scanned"]] },
          { kind: "table", id: "card", head: ["Item", "On the card"], rows: [["Plan", plan], ["Member ID", `ending ${last4}`], ["Effective", "07/01/2026"], ["Member services", "(800) 555-0100 (fictional)"]] },
        ],
        extract: [
          { section: "coverage", field: "plan", value: plan, block: "card", confidence: "high" },
          { section: "coverage", field: "medicaidId", value: `•••• ${last4}`, block: "card", quote: `Member ID ending ${last4}`, confidence: "high" },
          { section: "coverage", field: "effective", value: "Effective 07/01/2026", block: "card", confidence: "high" },
        ],
      };
    },
  },
  {
    id: "sup-referrer-letter", label: "Referrer's cover letter", summary: "Who referred, and how to reach them", fits: () => true,
    build: (r) => {
      const who = r.referral.referringClinician?.value || `Referral coordinator, ${r.sourceOrg}`;
      const phone = phoneFor(r);
      return {
        docName: "Referrer cover letter.pdf", docKind: "referral",
        blocks: [
          { kind: "letterhead", org: r.sourceOrg, sub: "Cover letter (simulated import)" },
          { kind: "p", id: "letter", text: `Following up on our referral for ${r.initials || "this patient"}. Please contact ${who} at ${phone} with any questions. The best times are weekdays from 8 am to 3 pm.` },
          { kind: "sig", id: "sig", text: who },
        ],
        extract: [
          { section: "referral", field: "referrerContact", value: `${phone}, weekdays 8 am to 3 pm`, block: "letter", quote: phone, confidence: "high" },
          { section: "referral", field: "referringClinician", value: who, block: "sig", confidence: "high" },
        ],
      };
    },
  },
];
