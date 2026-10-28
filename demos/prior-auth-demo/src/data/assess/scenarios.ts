import { paths } from "@/routes";
import type { SiteId } from "../sites";
import type { ProgramId, PurposeId } from "./types";

/* The demo scenarios: fictional people, each on a different program, at a different stage, with different documents, missing items, consents and coverage,
   so the intake visibly changes from one to the next. The records are seeded in data/intake/ext/scenarios.ts; this list is what the switcher, the Demo menu and
   the tests read. `walk` is the ordered tour of one scenario: where to go and what to do there. */
export interface WalkStep {
  label: string;
  /** An app address, built with `paths`. */
  path: string;
  /** What to do or look at there, in a sentence. */
  doing: string;
}
export interface DemoScenario {
  key: string;
  label: string;
  intakeId: string;
  programId: ProgramId;
  purposeId: PurposeId;
  /** The site the record belongs to: Dr. Rivera sees Site A; at Site B a person who is not the clinician signs as the labeled role-play. */
  site: SiteId;
  /** One line on what it shows. */
  shows: string;
  /** Where it starts, in a few words: the stage and what is missing. */
  stage: string;
  walk: WalkStep[];
}

const at = (id: string, section?: string, panel?: "scribe" | "voice") => paths.intakeRecord(id, section, panel);

export const SCENARIOS: DemoScenario[] = [
  {
    key: "A", label: "Adult CPST", intakeId: "IN-3102", programId: "cpst-adult", purposeId: "initial", site: "B",
    shows: "Referral, assessment, CANS, Level of Need, care planning and authorization readiness for a person leaving a retiring service.",
    stage: "Assessment in progress. CANS template not loaded, coverage unverified, no payment consent.",
    walk: [
      { label: "Open the referral", path: at("IN-3102", "referral"), doing: "Read the accepted referral and its three documents: the service record, a community services board discharge summary and a psychiatric evaluation." },
      { label: "Confirm what the new records say", path: at("IN-3102", "patient:profile"), doing: "Three values wait for review, each with its source sentence. Accept one, edit one, reject one." },
      { label: "Review the configuration", path: paths.configure("IN-3102"), doing: "CPST: Adult, Community loads psychiatric history, functional needs, community living, CANS Lifetime, Level of Need and a service review. Each row names its source and status." },
      { label: "Reuse the earlier psychiatric history", path: at("IN-3102", "m:psych-history"), doing: "An assessment from an earlier episode is found. Review it, then reuse it as a starting point. It comes across as a draft and nothing is signed." },
      { label: "Decide on the evidence for functional needs", path: at("IN-3102", "m:functional-needs"), doing: "Three suggestions from the simulated evidence reader wait. Accept one, and watch the completion count change." },
      { label: "Finish the clinical interview", path: at("IN-3102", "clinical"), doing: "Six of twelve sections are documented. A clinician writes the safety section in their own words." },
      { label: "Open the CANS Lifetime", path: at("IN-3102", "m:cans"), doing: "No template is loaded. Start the CANS record, then load the demo placeholder structure as an administrator. It is not CANS content and no rating is final." },
      { label: "Check both readiness tracks", path: at("IN-3102", "signoff"), doing: "Clinical readiness waits on modules, CANS and Level of Need. Administrative readiness waits on coverage, a payment consent and documents." },
      { label: "Verify coverage with the plan", path: at("IN-3102", "patient:coverage"), doing: "The simulated response says active. Record that you confirmed it with the plan, and see the readiness item change." },
    ],
  },
  {
    key: "B", label: "Youth CPST, school", intakeId: "IN-3101", programId: "cpst-school", purposeId: "initial", site: "A",
    shows: "A school referral: caregiver information, school functioning, CANS, Level of Need and care planning.",
    stage: "Needs information. Guardian consent, school release and a callback number missing; plan conflict; a CANS from another provider found.",
    walk: [
      { label: "Open the referral", path: at("IN-3101", "referral"), doing: "The school's referral is waiting on information. See what is missing and what the reader found." },
      { label: "Resolve the plan conflict", path: at("IN-3101", "patient:coverage"), doing: "The school says Sentara and a 2025 record says Aetna, ended 06/30/2026. Confirm the current plan." },
      { label: "Record the guardian's consent and the school release", path: at("IN-3101", "patient:profile"), doing: "Set consent to Signed and the school release to On file. The two tasks close and the missing items clear." },
      { label: "Accept for assessment", path: at("IN-3101", "referral"), doing: "With the missing items in, accept the referral. Its status then follows the work." },
      { label: "Review the configuration", path: paths.configure("IN-3101"), doing: "CPST: Youth, School Setting for an adolescent loads school functioning, family, caregiver coordination, a school and family plan, CANS Lifetime and Level of Need." },
      { label: "Decide on the caregiver evidence", path: at("IN-3101", "m:caregiver-coordination"), doing: "Accept the guardian's role and contact from the school's referral. Consent stays a person's entry." },
      { label: "Decide on the school evidence", path: at("IN-3101", "m:school-functioning"), doing: "Five suggestions from the school's referral wait: absences, grades, behavior, strengths and the 504 plan." },
      { label: "Review the CANS from another provider", path: at("IN-3101", "m:cans"), doing: "A CANS from March is found. It is seven months old. Review it, then reuse it as a draft or ask the provider for an update." },
      { label: "Open the Level of Need", path: at("IN-3101", "m:lon"), doing: "No validated model is configured. A clinician records a review in their own words; no level is calculated." },
    ],
  },
  {
    key: "C", label: "SUD IOP", intakeId: "IN-3112", programId: "sud-iop", purposeId: "initial", site: "A",
    shows: "ASAM documentation, level-of-care review, treatment plan and authorization for a step-down from residential.",
    stage: "Assessment in progress. ASAM drafted from documents with evidence waiting; coverage ended; no Part 2 consent.",
    walk: [
      { label: "Open the referral", path: at("IN-3112", "referral"), doing: "The referrer's reply arrived: a residential discharge summary and a urine screen note. The buprenorphine dose is still missing." },
      { label: "Review the configuration", path: paths.configure("IN-3112"), doing: "SUD IOP loads the ASAM dimensions, a substance use history, recovery environment, an IOP level-of-care review and a psychiatric comorbidities module. No CANS." },
      { label: "Review the ASAM from the residential program", path: at("IN-3112", "m:asam"), doing: "An earlier ASAM is found. Review it. Its ratings and level are not carried over, and the licensed criteria are not loaded." },
      { label: "Open ASAM dimension 1 and accept the evidence", path: at("IN-3112", "m:asam"), doing: "Dimension 1 is drafted from the discharge summary. Open dimensions 2 to 4 and decide on each suggestion." },
      { label: "Decide on the substance use history", path: at("IN-3112", "m:sud-history"), doing: "Three suggestions wait: the overdose, prior treatment and how long she used." },
      { label: "Confirm the level of care", path: at("IN-3112", "m:loc-review"), doing: "The review lists what was found and what is missing. A clinician confirms a level from names only; the software never selects one." },
      { label: "See why coverage is blocked", path: at("IN-3112", "patient:coverage"), doing: "The simulated response shows Sentara coverage ended 09/30/2026. Record what the plan says." },
      { label: "Record the Part 2 and payment consents", path: at("IN-3112", "patient:profile"), doing: "Substance use records need her consent before they go to the plan. Organization protocol, not legal advice." },
      { label: "Check both readiness tracks", path: at("IN-3112", "signoff"), doing: "Administrative readiness is blocked on coverage and consent while clinical readiness is in progress." },
    ],
  },
  {
    key: "D", label: "SUD residential", intakeId: "IN-3110", programId: "sud-res", purposeId: "initial", site: "A",
    shows: "ASAM, withdrawal and medical review, residential admission review and authorization.",
    stage: "Ready for authorization. Every required module signed, care plan approved; phone number, provider participation and two documents open.",
    walk: [
      { label: "Open the referral", path: at("IN-3110", "referral"), doing: "Three documents: the referral, an emergency department note and a withdrawal management summary." },
      { label: "See the evidence trail in the ASAM", path: at("IN-3110", "m:asam"), doing: "Signed by Dr. Rivera. Open version history: what the reader proposed from the documents, what was edited, accepted and rejected." },
      { label: "Review withdrawal and medical stability", path: at("IN-3110", "m:medical-stability"), doing: "A clinician documented medical clearance. Psyflo only organized the evidence." },
      { label: "Review the residential admission", path: at("IN-3110", "m:residential-admission"), doing: "Proposed admission, facility, bed status, safety and the reasons lower levels were not enough." },
      { label: "Open the care plan", path: at("IN-3110", "care"), doing: "ARTS residential is selected and approved by Dr. Rivera. Partial hospitalization and IOP were considered and are listed." },
      { label: "Check both readiness tracks", path: at("IN-3110", "signoff"), doing: "Clinical readiness is complete. Administrative readiness still lists provider participation and two documents." },
      { label: "Add the phone number", path: at("IN-3110", "patient:profile"), doing: "Type a phone number. The task that waited for it closes." },
      { label: "Prepare Authorization", path: paths.newCase({ intake: "IN-3110" }), doing: "New Authorization opens with the patient, service, coverage and clinical documentation carried over. Nothing is submitted." },
    ],
  },
  {
    key: "E", label: "Mental health PHP", intakeId: "IN-3115", programId: "mh-php", purposeId: "initial", site: "B",
    shows: "Psychiatric assessment, functional impairment, PHP medical necessity documentation and authorization.",
    stage: "Care planning. Assessment signed; draft care plan with three options and no selection; coverage confirmed with the plan.",
    walk: [
      { label: "Open the referral", path: at("IN-3115", "referral"), doing: "A hospital step-down summary recommends a partial hospitalization program. A request for the discharge medication list waits for approval." },
      { label: "Review the signed assessment", path: at("IN-3115", "clinical"), doing: "The clinical interview is attested. Psyflo wrote none of it." },
      { label: "Open the psychiatric assessment", path: at("IN-3115", "m:psychiatric"), doing: "Signed, with the hospital's sentences it was drafted from. An inpatient assessment is found for reference." },
      { label: "Review the PHQ-9 result", path: at("IN-3115", "m:phq9"), doing: "The clinician typed the result from the form they gave. A clinician signs it. Psyflo scores nothing." },
      { label: "Sign off the assessment", path: at("IN-3115", "signoff"), doing: "Both tracks side by side: clinical readiness waits on the care plan and the service selection." },
      { label: "Choose the service", path: at("IN-3115", "care"), doing: "Three options: PHP, IOP and outpatient. Select PHP as the clinician and write the rationale, frequency and duration." },
      { label: "Approve the care plan", path: at("IN-3115", "care"), doing: "Approve it as the clinician. The status moves to Ready for authorization." },
      { label: "Prepare Authorization", path: paths.newCase({ intake: "IN-3115" }), doing: "New Authorization opens with the intake carried over. Nothing is submitted." },
    ],
  },
];

/** Also worth opening: a safety alert and CSC, a voice-assisted intake, and ABA. */
export const EXTRA_SCENARIOS: DemoScenario[] = [
  {
    key: "F", label: "CSC, safety alert", intakeId: "IN-3103", programId: "csc", purposeId: "initial", site: "A",
    shows: "A hospital referral with an open safety alert a clinician must review.",
    stage: "Clinical review. Safety alert open; discharge summary and an outgoing referral.",
    walk: [
      { label: "Open the safety alert", path: at("IN-3103", "referral"), doing: "A clinician reviews the alert and records what they did. Psyflo never decides that a person is safe." },
      { label: "Read the discharge summary", path: at("IN-3103", "documents"), doing: "The sentence the alert came from is highlighted in the source document." },
      { label: "Open the CANS preparation", path: at("IN-3103", "m:cans"), doing: "Evidence from the discharge summary waits for a decision. No item or rating is official." },
      { label: "Open the referral to the specialty program", path: at("IN-3103", "care"), doing: "A packet for the early psychosis program was sent with consent on file (simulated)." },
    ],
  },
  {
    key: "G", label: "Voice-assisted intake", intakeId: "IN-3104", programId: "mh-op", purposeId: "initial", site: "B",
    shows: "A coordinator collects the intake with the Voice Intake Assistant.",
    stage: "New. A self-referral by phone; the voice intake has not started.",
    walk: [
      { label: "Start the voice intake", path: at("IN-3104", "patient", "voice"), doing: "A simulated call: identity, language, consent to record, then the questions. Nothing is recorded or sent." },
      { label: "Review what it collected", path: at("IN-3104", "patient:profile"), doing: "Each answer is a suggestion with its transcript line. Save the draft, then accept or edit." },
    ],
  },
  {
    key: "H", label: "ABA", intakeId: "IN-3117", programId: "aba", purposeId: "initial", site: "B",
    shows: "Developmental and behavioral assessment modules.",
    stage: "Needs information. The diagnostic evaluation report is missing.",
    walk: [
      { label: "Open the referral", path: at("IN-3117", "referral"), doing: "The referral waits on the diagnostic evaluation report from the family's pediatrician." },
      { label: "Configure the intake", path: paths.configure("IN-3117"), doing: "Applied behavior analysis for a child loads developmental history, diagnostic information, adaptive functioning, behavior, goals and caregiver participation." },
    ],
  },
];
