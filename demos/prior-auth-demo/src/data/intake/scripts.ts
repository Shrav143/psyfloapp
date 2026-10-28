import { isCoreModule } from "../assess/modules";
import { programById } from "../assess/programs";
import type { ModuleId, ProgramId } from "../assess/types";
import { CORE_BLOCKS, SUD_BLOCKS, type Block, type ScribeField, type TurnSpec } from "./scriptBlocks";
import { PROGRAM_BLOCKS } from "./scriptBlocksProgram";
import { personaFor, type Persona } from "./scriptPersonas";
import type { AssessmentSectionId, IntakeRecord, NoteSectionId, TranscriptTurn } from "./types";

/* Scripted conversations for the simulated AI Scribe and Voice Intake Assistant, the Voice guided assessment questions and the safety
   screening prompts. Everything here is synthetic. Nothing is recorded: the demo plays these turns as if they were heard.
   Wording is careful on purpose: what a person said is attributed to them ("mother reports"), never turned into a clinical fact. */

export type Speaker = TranscriptTurn["speaker"];
export type FieldTarget = "referral" | "profile" | "coverage" | "assessment";
export interface Extract { section: FieldTarget; field: string; label: string; value: string; confidence: "high" | "medium" | "low" }

/* ------------------------------------------------------------------ AI Scribe */

export interface ScribeTurn {
  /** Seconds into the conversation. */
  at: number;
  speaker: Speaker;
  /** What speaker identification labeled it, when it got it wrong. */
  heardAs?: Speaker;
  text: string;
  /** Text the Clinical Documentation Agent adds to each note section. */
  note?: Partial<Record<NoteSectionId, string>>;
  /** What the scribe proposes from this turn: values for shared fields, evidence for an assessment module, or CANS evidence themes. */
  fields?: ScribeField[];
  /** The topic of the conversation this turn belongs to ("Withdrawal concerns"), for the scribe's "detected documentation" list. */
  block?: string;
  /** A statement about risk. It goes to "Risk information requiring review"; `alert` raises a safety alert for a clinician. */
  risk?: { text: string; alert: boolean };
  /** Information the conversation shows is missing, and items it answered. */
  missing?: string[];
  resolves?: string[];
}
export interface ScribeScript {
  id: string;
  /** Display label for each speaker. */
  labels: Partial<Record<Speaker, string>>;
  /** Who can give consent to the recording. */
  consenters: string[];
  encounterType: string;
  others: string;
  initialMissing: string[];
  turns: ScribeTurn[];
  /** What the agent writes when the recording stops. */
  closing: { summary: string; plan: string };
  /** The topics this interview covers, in order: the scribe's "detected documentation" list shows which have come up. Left out for the fixed scripts. */
  categories?: string[];
  /** The program the interview was composed for. Left out for the fixed scripts. */
  program?: ProgramId;
}

const A = (section: FieldTarget, field: string, label: string, value: string, confidence: Extract["confidence"] = "medium"): Extract => ({ section, field, label, value, confidence });
const L = Object.fromEntries((
  [["presenting", "Presenting problem"], ["symptoms", "Current symptoms"], ["history", "Clinical history"], ["functional", "Functional limitations"], ["strengths", "Strengths"], ["sdoh", "Social determinants and barriers"], ["prior", "Prior treatment"], ["goals", "Patient goals"], ["needs", "Preliminary service needs"]] as const
)) as Record<Exclude<AssessmentSectionId, "mse" | "safety" | "narrative">, string>;
const as = (id: keyof typeof L, value: string, c: Extract["confidence"] = "medium") => A("assessment", id, L[id], value, c);

const SCRIBE_A: ScribeScript = {
  id: "scribe-a",
  labels: { clinician: "Clinician", patient: "T.W.", caregiver: "Mother (guardian)", unknown: "Speaker not identified" },
  consenters: ["T.W. (patient)", "Mother (guardian)"],
  encounterType: "Intake assessment, in person",
  others: "Mother (guardian)",
  initialMissing: ["Guardian consent to treatment (signature)", "School release of records (signature)", "Pediatrician and date of last physical", "Medication history"],
  turns: [
    { at: 4, speaker: "clinician", text: "Thanks for coming in, both of you. You both agreed to the recording, so the scribe will take notes while we talk. T., can you tell me what has been going on at school?" },
    { at: 18, speaker: "patient", text: "I don't know. I just don't want to be there. People keep starting stuff with me.", note: { hpi: "T. says he does not want to be at school and describes conflicts with peers." } },
    { at: 33, speaker: "caregiver", text: "The school called me three times this month. He's missed nine days since September, and he leaves class most afternoons.",
      note: { reason: "Mother reports the school has called three times this month; T. has missed 9 school days since September and leaves class most afternoons." },
      fields: [as("presenting", "School avoidance since September: 9 days missed, leaves class most afternoons, conflicts with peers that ended in removal from class (mother and T.).", "high")] },
    { at: 48, speaker: "clinician", text: "How has his mood been at home?" },
    { at: 61, speaker: "caregiver", heardAs: "patient", text: "Quiet. He stays in his room, and he's on his phone until one or two in the morning. He used to draw all the time.",
      note: { hpi: "Mother describes him as quiet at home, in his room, up until 1 or 2 am, and drawing less than before." },
      fields: [as("symptoms", "Withdrawn at home; up until 1 or 2 am most nights; trouble falling asleep with racing thoughts; drawing less than before (mother and T.).")] },
    { at: 76, speaker: "clinician", text: "T., what is sleep like for you?" },
    { at: 89, speaker: "patient", text: "I can't fall asleep. My head just keeps going. Then I'm tired in class and I get in trouble.",
      note: { hpi: "T. describes trouble falling asleep with racing thoughts, and tiredness in class.", functional: "T. links tiredness in class to getting in trouble." } },
    { at: 104, speaker: "clinician", text: "Your counselor mentioned grades. How are classes going?" },
    { at: 116, speaker: "patient", text: "I'm failing three. Art is fine. Ms. Alvarez lets me eat lunch in her room.",
      note: { functional: "T. reports failing 3 of 5 classes.", strengths: "Doing well in art; a trusted art teacher." },
      fields: [as("functional", "Failing 3 of 5 classes; 9 school days missed; removed from class three times after peer conflicts.", "high"), as("strengths", "Does well in art and enjoys drawing; trusted relationship with his art teacher; a small group of friends; an engaged mother.")] },
    { at: 131, speaker: "clinician", text: "Has he seen anyone for counseling before?" },
    { at: 144, speaker: "caregiver", text: "He saw a counselor for a few months last year, before we moved. And he's had a 504 plan since 2024 for attention.",
      note: { history: "Outpatient counseling for a few months in 2025, before the family moved; 504 plan for attention since 2024 (mother)." },
      fields: [as("prior", "Outpatient counseling for a few months in 2025 (the 2025 EMR record shows 7 sessions); 504 plan for attention since 2024.", "high"), A("profile", "educationEmployment", "Education or employment", "Grade 8, Rivermont Middle School (fictional); 504 plan since 2024", "high")] },
    { at: 160, speaker: "clinician", text: "Any medications, now or in the past?" },
    { at: 171, speaker: "caregiver", text: "No, nothing.", fields: [A("profile", "medications", "Current medications", "None, per mother")], resolves: ["Medication history"] },
    { at: 186, speaker: "clinician", text: "T., your counselor said you told her you don't care what happens. I ask everyone this: have you had thoughts of hurting yourself, or of not wanting to be alive?" },
    { at: 203, speaker: "patient", text: "Sometimes I think it would be easier if I wasn't around. But I wouldn't do anything.",
      risk: { text: "T. said: \"Sometimes I think it would be easier if I wasn't around. But I wouldn't do anything.\"", alert: true } },
    { at: 219, speaker: "clinician", text: "Thank you for telling me. Have you ever made a plan, or done anything to hurt yourself?" },
    { at: 231, speaker: "patient", text: "No. Never.", risk: { text: "When asked, T. said he has never made a plan or hurt himself.", alert: false } },
    { at: 246, speaker: "caregiver", text: "I didn't know he felt that way.", note: { hpi: "Mother says she did not know he felt this way." } },
    { at: 261, speaker: "clinician", text: "We'll make a safety plan together before you leave today. What would you like to be different?", note: { plan: "Clinician says a safety plan will be made with T. and his mother before they leave." } },
    { at: 275, speaker: "patient", text: "Get back into art club. And not get kicked out of class.",
      fields: [as("goals", "T.: get back into art club and stop being removed from class. Mother: better sleep and going to school every day.", "high")] },
    { at: 288, speaker: "caregiver", text: "I want him sleeping and going to school every day. I work evenings, and we don't have a car, so it has to be something he can get to.",
      note: { functional: "Mother works evenings; no car." },
      fields: [as("sdoh", "Mother works evenings; no car, the family relies on the bus; services need to be easy to reach, ideally at school.", "high"), A("profile", "transportation", "Transportation barriers", "No car; relies on the bus", "high")] },
    { at: 304, speaker: "clinician", text: "Would support at school help, if that's possible?" },
    { at: 316, speaker: "caregiver", text: "Yes. The counselor said they might have something next year.",
      note: { plan: "Family asks about support at school; the school counselor mentioned an option next school year." },
      fields: [as("needs", "Family asks for support at school, and help with sleep and mood now. Service options are for the clinician to consider.")] },
    { at: 330, speaker: "clinician", text: "Before you go, I need your signature on the consent form, and on the school release." },
  ],
  closing: {
    summary: "T.W., 14, referred by his school for school avoidance, peer conflicts and falling grades since September. He and his mother describe withdrawal at home and trouble falling asleep. He said it would sometimes be easier if he were not around, and denied a plan when asked; a clinician reviews and documents risk. Strengths include art, a trusted teacher and an engaged mother. The scribe makes no diagnosis.",
    plan: "Clinician to document the safety screening and the safety plan. Collect guardian consent and the school release. Review service options with the family.",
  },
};

const SCRIBE_B: ScribeScript = {
  id: "scribe-b",
  labels: { clinician: "Clinician", patient: "R.H.", unknown: "Speaker not identified" },
  consenters: ["R.H. (patient)"],
  encounterType: "Transition review, in person",
  others: "None",
  initialMissing: ["Date of the last psychiatric visit"],
  turns: [
    { at: 4, speaker: "clinician", text: "Thanks for meeting with me, R. The skill-building program you're in ends next June, so I want to understand what helps you most.", note: { reason: "Planning for services after Mental Health Skill-Building retires on June 30, 2027." } },
    { at: 19, speaker: "patient", text: "I've been doing good. I still need the reminders for my meds though. And help with the bills.",
      note: { functional: "R. says he still needs reminders for medications and help with bills." },
      fields: [as("functional", "Keeps his apartment; relies on reminders for medications and help with budgeting (R.'s account).", "high")] },
    { at: 34, speaker: "clinician", text: "What does a typical week look like?" },
    { at: 48, speaker: "patient", text: "I work at the grocery store, twenty hours. My skill-building worker comes Monday, Wednesday, Friday. Sundays I see my sister.",
      note: { strengths: "Steady part-time job of 20 hours a week; sees his sister every Sunday." },
      fields: [as("strengths", "Works 20 hours a week at a grocery store; keeps his apartment; sees his sister every Sunday.", "high"), A("profile", "supports", "Family and social supports", "Sister, seen every Sunday; skill-building worker three times a week", "high")] },
    { at: 63, speaker: "clinician", heardAs: "unknown", text: "And the voices you used to hear, how have they been?" },
    { at: 76, speaker: "patient", text: "I haven't heard them in over a year. Sometimes I worry they'll come back if things change.",
      note: { hpi: "R. reports no voices for over a year and worries they could return if things change." },
      fields: [as("symptoms", "No voices for over a year (R.); worries symptoms could return if his services change.")] },
    { at: 92, speaker: "clinician", text: "That makes sense. Tell me about the hospital stays." },
    { at: 105, speaker: "patient", text: "Two times in 2023. I stopped my meds both times.",
      note: { history: "Two hospitalizations in 2023, both after stopping medications (R.)." },
      fields: [as("history", "Two hospitalizations in 2023, both after stopping medications (R.). The chart documents schizoaffective disorder, bipolar type; the scribe does not diagnose.")] },
    { at: 121, speaker: "clinician", text: "What medications are you on now?" },
    { at: 133, speaker: "patient", text: "Two. One for the voices and one for my mood. I don't remember the names. The pharmacy has them.",
      fields: [A("profile", "medications", "Current medications", "Two medications (for psychosis and for mood); names and doses not stated. Confirm with the pharmacy or prescriber.", "low")], missing: ["Current medication list and prescriber"] },
    { at: 148, speaker: "clinician", text: "Any thoughts of hurting yourself or anyone else lately?" },
    { at: 160, speaker: "patient", text: "No. Not since back then.", risk: { text: "When asked, R. denied current thoughts of harming himself or others (\"Not since back then\"). Past risk is not described in this conversation.", alert: false } },
    { at: 175, speaker: "clinician", text: "What would you like to be working on a year from now?" },
    { at: 188, speaker: "patient", text: "Full-time work. Maybe at the store. A friend goes to a clubhouse and they helped him get a job.",
      note: { plan: "R. is interested in a clubhouse; a friend found work through one." },
      fields: [as("needs", "Asks for support to continue after MHSS ends and help moving to full-time work; interested in a clubhouse. Service options are for the clinician to consider.")] },
    { at: 204, speaker: "clinician", text: "How are things with money and housing?" },
    { at: 216, speaker: "patient", text: "Rent is most of my check. I take the bus everywhere. It's okay as long as nothing changes.",
      fields: [as("sdoh", "Lives alone; rent takes most of his income; relies on the bus.", "high"), A("profile", "transportation", "Transportation barriers", "Relies on the bus", "high")] },
    { at: 232, speaker: "clinician", text: "Is it okay if I share information with a clubhouse, if we look into one?" },
    { at: 243, speaker: "patient", text: "Yeah, that's fine. I'd want to visit first.",
      fields: [A("referral", "preferences", "Patient and caregiver preferences", "Wants to visit a clubhouse before any referral", "high")], missing: ["Signed release of information before contacting a clubhouse"] },
    { at: 258, speaker: "clinician", text: "We'll also renew your current authorization so nothing stops before June.",
      note: { plan: "Clinician plans to renew the current MHSS authorization (ends 03/31/2027) so services can continue through June 30, 2027." }, missing: ["Renewal of VA-MHSS-2291 before 03/31/2027"] },
    { at: 270, speaker: "patient", text: "Good. I don't want a gap." },
  ],
  closing: {
    summary: "R.H., 41, receives Mental Health Skill-Building, which retires June 30, 2027. He reports no voices for over a year, works 20 hours a week and relies on reminders for medications and help with budgeting. He denied current thoughts of harm when asked. He wants full-time work and is interested in a clubhouse. The scribe does not decide which service fits.",
    plan: "Clinician to review service options for July 1, 2027 with R. Renew the current authorization through June 30, 2027. Get a release of information before contacting a clubhouse. Confirm medications with the pharmacy.",
  },
};

const SCRIBE_C: ScribeScript = {
  id: "scribe-c",
  labels: { clinician: "Clinician", patient: "A.K.", caregiver: "Mother", unknown: "Speaker not identified" },
  consenters: ["A.K. (patient)", "Mother"],
  encounterType: "Intake assessment after discharge, in person",
  others: "Mother",
  initialMissing: ["Pharmacy (not listed on the discharge referral)", "Primary care provider", "Release of information for the college (supported education)"],
  turns: [
    { at: 4, speaker: "clinician", text: "Thanks for coming in so soon after the hospital. How have the first few days at home been?", note: { reason: "Follow-up after a first psychiatric admission (10/12 to 10/19/2026); the hospital referred A. to a Coordinated Specialty Care team." } },
    { at: 17, speaker: "patient", text: "Okay. Tired. The medicine makes me sleep until noon.", note: { hpi: "A. reports tiredness and sleeping until noon, which he relates to the new medication." } },
    { at: 31, speaker: "clinician", text: "Are you still hearing the voices?" },
    { at: 44, speaker: "patient", text: "Less. Mostly at night. I still feel like people are watching me sometimes.",
      note: { hpi: "A. says the voices are less frequent, mostly at night, and he still sometimes feels watched." },
      fields: [as("symptoms", "Voices less frequent since the hospital, mostly at night; still sometimes feels watched; sleeping until about noon, which he relates to the medication (A.).")] },
    { at: 59, speaker: "caregiver", heardAs: "patient", text: "He's taking it every night. I make sure.", note: { strengths: "Mother supports the nightly medication." } },
    { at: 73, speaker: "clinician", text: "Good. Has anyone scheduled the psychiatry follow-up yet?" },
    { at: 86, speaker: "caregiver", text: "No. The hospital said within seven days, but nobody has called us.",
      note: { plan: "Psychiatry follow-up is due within 7 days of the 10/19 discharge; the family says it is not scheduled." }, missing: ["Psychiatry follow-up within 7 days of discharge (not scheduled)"] },
    { at: 101, speaker: "clinician", text: "We'll make sure that happens this week. What were things like before the hospital?" },
    { at: 115, speaker: "patient", text: "I stopped going to classes in September. I thought my roommates were talking about me.",
      note: { history: "Stopped community college classes in September; believed his roommates were talking about him (A.)." },
      fields: [as("functional", "Stopped community college classes in September; not working; living with his mother since discharge.", "high"), as("history", "First psychiatric admission 10/12 to 10/19/2026; symptoms began about six weeks earlier (discharge summary and A.)."), as("prior", "No outpatient mental health care before this admission (A. and mother).")] },
    { at: 130, speaker: "clinician", text: "Any thoughts of death or of hurting yourself since you left the hospital?" },
    { at: 143, speaker: "patient", text: "Not since the first week there. That was bad.", risk: { text: "A. said he has not had thoughts of death since the first week in the hospital (\"That was bad\").", alert: false } },
    { at: 157, speaker: "caregiver", text: "He still says 'what's the point' sometimes, when he's frustrated.", risk: { text: "Mother reports A. still sometimes says \"what's the point\" when frustrated.", alert: true } },
    { at: 172, speaker: "clinician", text: "Thank you for saying that. We'll go over the safety plan from the hospital together today.", note: { plan: "Clinician will review the hospital safety plan with A. and his mother today." } },
    { at: 186, speaker: "clinician", text: "What matters most to you right now, A.?" },
    { at: 198, speaker: "patient", text: "Going back to school in the spring. Feeling normal again.",
      note: { strengths: "Motivated to return to school in the spring." }, fields: [as("goals", "Return to community college classes in the spring; \"feel normal again\" (A.).", "high")] },
    { at: 212, speaker: "caregiver", text: "He's good with music. He makes beats on his laptop. And I'm here, whatever he needs.",
      fields: [as("strengths", "Motivated to return to school; makes music on his laptop; strong support from his mother.", "high")] },
    { at: 226, speaker: "clinician", text: "Would a team that helps with school and includes your family be useful?" },
    { at: 238, speaker: "patient", text: "If it helps me get back to class. But not too early in the day.",
      fields: [A("referral", "preferences", "Patient and caregiver preferences", "Appointments after 11 am because of morning sleepiness; wants help getting back to class", "high"), as("needs", "The hospital recommends Coordinated Specialty Care, psychiatry follow-up within 7 days, family psychoeducation and supported education; A. wants help getting back to class. Service options are for the clinician to consider.")] },
    { at: 252, speaker: "caregiver", text: "And we need help with the bus pass. He can't drive on this medicine yet.",
      fields: [as("sdoh", "Lives with his mother; not driving at present; asks for help with the cost of a bus pass."), A("profile", "transportation", "Transportation barriers", "Not driving at present; needs help with a bus pass", "high")] },
  ],
  closing: {
    summary: "A.K., 19, after a first psychiatric admission (10/12 to 10/19/2026) for psychosis. The voices are less frequent on medication; he sleeps until about noon. He reports no thoughts of death since the first week in the hospital; his mother reports he sometimes says \"what's the point\". A clinician reviews this with the open safety alert. Psychiatry follow-up within 7 days is not scheduled. The scribe makes no diagnosis or service decision.",
    plan: "Schedule psychiatry follow-up within 7 days of discharge. Review the hospital safety plan with A. and his mother. Consider the hospital's recommendations with the family. Help with transportation.",
  },
};

/** Any other record: a short, neutral intake conversation. A parent joins for a minor; otherwise a support person. */
function scribeGeneric(r: Pick<IntakeRecord, "initials" | "age">): ScribeScript {
  const who = r.initials || "The patient";
  const minor = r.age !== null && r.age < 18;
  const other = minor ? "Parent (guardian)" : "Support person";
  return {
    id: "scribe-generic",
    labels: { clinician: "Clinician", patient: r.initials || "Patient", caregiver: other, unknown: "Speaker not identified" },
    consenters: [r.initials ? `${r.initials} (patient)` : "The patient", other],
    encounterType: "Intake assessment, in person",
    others: other,
    initialMissing: ["Medication history", "Consent to intake and treatment (signature)", "Emergency contact"],
    turns: [
      { at: 4, speaker: "clinician", text: "Thanks for coming in today. Everyone agreed to the recording. What brings you in?" },
      { at: 17, speaker: "patient", text: "Things have been harder the last couple of months. I'm stressed all the time and I'm not sleeping well.",
        note: { reason: `${who} asks for help with stress and poor sleep over the last couple of months.`, hpi: `${who} describes feeling stressed most of the time and sleeping poorly for about two months.` },
        fields: [as("presenting", `More stress and poor sleep over about two months (${who}).`)] },
      { at: 31, speaker: "clinician", text: "What does a hard day look like?" },
      { at: 44, speaker: "patient", text: "I wake up tired, I can't focus, and I snap at people. Some days I just stay home.",
        note: { functional: "Some days stays home; trouble focusing." },
        fields: [as("symptoms", "Wakes up tired, trouble focusing, irritability (patient reported)."), as("functional", "Some days does not leave home; trouble focusing on daily tasks.")] },
      { at: 59, speaker: "caregiver", heardAs: "patient", text: "It's been more days than not, honestly.", note: { hpi: `${other} says hard days happen more days than not.` } },
      { at: 73, speaker: "clinician", text: "Have you had help for this before?" },
      { at: 86, speaker: "patient", text: "I saw a counselor once, a few years ago. Just a couple of times.", note: { history: "Saw a counselor briefly a few years ago." }, fields: [as("prior", "Saw a counselor a few years ago for a couple of sessions (patient reported).")] },
      { at: 101, speaker: "clinician", text: "Any medications right now?" },
      { at: 113, speaker: "patient", text: "No, nothing right now.", fields: [A("profile", "medications", "Current medications", "None currently (patient reported)")], resolves: ["Medication history"] },
      { at: 128, speaker: "clinician", text: "I ask everyone this. Any thoughts of hurting yourself, or of not wanting to be alive?" },
      { at: 141, speaker: "patient", text: "No. Nothing like that.", risk: { text: `When asked, ${who} denied thoughts of hurting themself or of not wanting to be alive.`, alert: false } },
      { at: 156, speaker: "clinician", text: "Who do you lean on when things are hard?" },
      { at: 169, speaker: "caregiver", text: minor ? "Me, mostly. And their grandmother." : "Me, mostly. We talk every day.",
        note: { strengths: `${other} is involved and came to the visit.` }, fields: [A("profile", "supports", "Family and social supports", `${other} who came to the visit; in contact every day`)] },
      { at: 182, speaker: "patient", text: "And I like being outside. Walking helps.", fields: [as("strengths", `Walking helps; close contact with a ${other.toLowerCase()} who came to the visit.`)] },
      { at: 196, speaker: "clinician", text: "What would you like to be different in a few months?" },
      { at: 208, speaker: "patient", text: "Sleep through the night, and feel like myself again.", fields: [as("goals", "Sleep through the night and \"feel like myself again\".", "high")] },
      { at: 223, speaker: "clinician", text: "Is anything making it hard to get to appointments?" },
      { at: 235, speaker: minor ? "caregiver" : "patient", text: minor ? "Getting time off work. After school, or video, would be easier." : "Getting time off. Evenings or video would be easier.",
        fields: [A("referral", "preferences", "Patient and caregiver preferences", minor ? "After-school or video appointments preferred" : "Evening or video appointments preferred", "high"), as("sdoh", minor ? "Parent has trouble getting time off work for daytime appointments." : "Hard to get time off for daytime appointments.")] },
      { at: 250, speaker: "clinician", text: "Let's set up a plan for next steps today.", note: { plan: "Clinician to discuss next steps and service options." } },
    ],
    closing: {
      summary: `${who} describes more stress, poor sleep, irritability and trouble focusing over about two months. Denied thoughts of harm when asked; a clinician documents the safety screening. Strengths include walking and a supportive person. The scribe makes no diagnosis or service decision.`,
      plan: "Clinician to complete the safety screening and discuss service options. Collect consent and an emergency contact.",
    },
  };
}

/* ------------------------------------------------------------------ Record Intake: the interview composed for a program */

/** Suggested follow-ups for what the conversation has not yet covered. The clinician accepts or dismisses each one. */
const FOLLOW_UP: Record<string, string> = {
  "Previous withdrawal complications": "Clarify the person's history of serious withdrawal complications, such as seizures or hospital care.",
  "Details of the first withdrawal: seizures, hospital care, medications given": "Ask what happened during the first withdrawal: any seizures, any hospital care, any medication given.",
  "Relevant treatment history": "Ask what treatment the person has had before, including medications for addiction, and what helped.",
  "Medication history": "Ask for every current and recent medication and who prescribes it.",
  "Current medication list, doses and prescriber": "Confirm the list with the pharmacy or the prescriber; the person did not remember the names or doses.",
  "Discharge summary from the inpatient stay": "Request the discharge summary from the hospital. A release of information is needed.",
  "Consent to treatment (signature)": "Collect the signed consent before the visit ends.",
  "Guardian consent to treatment (signature)": "Collect the guardian's signed consent before the visit ends.",
  "School release of records (signature)": "Collect the signed school release so the school counselor can be contacted.",
  "Signed releases for the hospital and the college": "Collect signed releases before contacting the hospital team or the college.",
  "Diagnostic evaluation report": "Ask the parent for the evaluation report; it is the source for the diagnosis on file.",
};
export const followUpFor = (missing: string): string => FOLLOW_UP[missing] ?? "Ask about it before the visit ends, or add it to the plan.";

/** The id a composed interview is stored under, so a session keeps playing the same conversation if the intake is reconfigured mid-way. */
export const composedId = (programId: ProgramId, modules: ModuleId[]): string => `c:${programId}:${modules.join(",")}`;
export function parseComposedId(id: string | undefined): { programId: ProgramId; modules: ModuleId[] } | null {
  if (!id?.startsWith("c:")) return null;
  const [, programId, rest] = id.split(":");
  return programId ? { programId: programId as ProgramId, modules: (rest ? rest.split(",") : []) as ModuleId[] } : null;
}

const SECONDS = [12, 15, 11, 16, 13, 14, 17];
const keepField = (f: ScribeField, active: Set<ModuleId>): boolean =>
  f.section === "module" ? active.has(f.module) && !isCoreModule(f.module) : f.section === "cans" ? active.has("cans") : true;

/** The Record Intake interview for a program and the modules its plan uses. Pure: the same program, modules and person give the same conversation.
    Blocks are chosen by module, so adding or removing an optional module changes what the scribe listens for and where its proposals go. */
export function scriptFor(programId: ProgramId, modules: ModuleId[], who: Pick<IntakeRecord, "id" | "initials" | "age"> = { id: "IN-0000", initials: "", age: null }): ScribeScript {
  const persona: Persona = personaFor(who, programId);
  const active = new Set(modules);
  const blocks: Block[] = [...CORE_BLOCKS, ...SUD_BLOCKS, ...PROGRAM_BLOCKS].filter((b) => !b.modules || b.modules.some((m) => active.has(m))).sort((a, b) => a.order - b.order);
  const turns: ScribeTurn[] = [];
  const categories: string[] = [];
  let at = 4;
  const speakerOf = (by: TurnSpec["by"]): Speaker => {
    const child = persona.cg !== null && persona.age !== null && persona.age < 13;
    if (by === "clin") return "clinician";
    if (by === "pt") return "patient";
    if (by === "cg") return persona.cg ? "caregiver" : "patient";
    if (by === "cgPref") return persona.cg ? "caregiver" : "patient";
    return child ? "caregiver" : "patient";
  };
  for (const b of blocks) {
    const specs = b.turns(persona);
    if (!specs.length) continue;
    categories.push(b.label);
    for (const t of specs) {
      const fields = t.fields?.filter((f) => keepField(f, active));
      turns.push({ at, speaker: speakerOf(t.by), heardAs: t.heardAs, text: t.text, note: t.note, fields: fields?.length ? fields : undefined, risk: t.risk, missing: t.missing, resolves: t.resolves, block: b.label });
      at += SECONDS[turns.length % SECONDS.length];
    }
  }
  const sud = active.has("sud-history") || active.has("asam") || active.has("withdrawal");
  const minor = persona.age !== null && persona.age < 18;
  const initialMissing = [minor ? "Guardian consent to treatment (signature)" : "Consent to treatment (signature)", "Medication history", ...(sud ? ["Previous withdrawal complications", "Relevant treatment history"] : [])];
  const cg = persona.cg;
  return {
    id: composedId(programId, modules), program: programId,
    labels: { clinician: "Clinician", patient: persona.who, ...(cg ? { caregiver: cg } : {}), unknown: "Speaker not identified" },
    consenters: [`${persona.who} (patient)`, ...(cg ? [cg] : [])],
    encounterType: "Intake assessment, in person",
    others: cg ?? "None",
    initialMissing, turns, categories,
    closing: { summary: persona.core.summary, plan: persona.core.plan },
  };
}

/** The fixed scripts of the round 9 scenarios, by id, for a session already in progress. */
const FIXED: Record<string, ScribeScript> = { [SCRIBE_A.id]: SCRIBE_A, [SCRIBE_B.id]: SCRIBE_B, [SCRIBE_C.id]: SCRIBE_C };
type ScriptSource = Pick<IntakeRecord, "id" | "initials" | "age"> & { config?: Pick<NonNullable<IntakeRecord["config"]>, "programId" | "modules">; scribe?: Pick<NonNullable<IntakeRecord["scribe"]>, "scriptId" | "status"> | null };
export const activeModuleIds = (c: NonNullable<ScriptSource["config"]>): ModuleId[] => c.modules.filter((m) => m.state === "active").map((m) => m.id);

/** The conversation the scribe plays for a record. A session in progress keeps its conversation; otherwise a configured intake gets the interview for its program and
    modules, and a record that has not been configured gets the fixed scenario script (T.W. and his mother, R.H., A.K.) or a short neutral one. */
export function scribeScriptFor(r: ScriptSource, fresh = false): ScribeScript {
  const id = !fresh && r.scribe && r.scribe.status !== "consent" ? r.scribe.scriptId : undefined;
  const composed = parseComposedId(id);
  if (composed) return scriptFor(composed.programId, composed.modules, r);
  if (id && FIXED[id]) return FIXED[id];
  if (id === "scribe-generic") return scribeGeneric(r);
  if (r.config) return scriptFor(r.config.programId, activeModuleIds(r.config), r);
  if (r.id === "IN-3101") return SCRIBE_A;
  if (r.id === "IN-3102") return SCRIBE_B;
  if (r.id === "IN-3103") return SCRIBE_C;
  return scribeGeneric(r);
}

/** What the scribe will listen for, in plain words: "Substance use history, Withdrawal concerns, ..." for the consent screen and the Record Intake button. */
export function interviewTopics(r: ScriptSource): string[] {
  const s = scribeScriptFor(r, true);
  return s.categories ?? [];
}
export const programLabelOf = (r: ScriptSource): string | null => (r.config ? programById(r.config.programId).label : null);

/* ------------------------------------------------------------------ Voice Intake Assistant */

export interface VoiceOption {
  label: string;
  text: string;
  extract?: Extract[];
  /** A safety concern: the assistant stops and hands off to a person. */
  escalate?: boolean;
  /** Hand the call to staff, with this reason (an interpreter, a person asked for). */
  transfer?: string;
}
export interface VoiceStep {
  id: string;
  kind: "identity" | "language" | "role" | "consent" | "question";
  /** Skipped when the record already has this field. */
  onFile?: { section: Exclude<FieldTarget, "assessment">; field: string; label: string };
  /** Asked only when the field is still missing after the other questions (a missing-data prompt). */
  missingOnly?: boolean;
  ask: string;
  /** The caller's scripted reply, played automatically. */
  reply: string;
  /** The scripted reply is vague: the assistant asks this, and the caller answers `reply`. */
  clarify?: { ask: string; reply: string };
  extract: Extract[];
  ack?: string;
  options?: VoiceOption[];
}
export interface VoiceScript {
  id: string;
  callerSpeaker: "patient" | "caregiver";
  callerLabel: string;
  steps: VoiceStep[];
  /** Required items the assistant does not collect on a call. Staff do. */
  staffCollects: { field: string; label: string }[];
  summaryReply: string;
  correction?: { field: string; value: string; ack: string };
  closing: string;
}

export const VOICE_ROLE = "I'm Psyflo's automated intake assistant. I'm not a clinician or a person. A staff member reviews everything I collect.";
export const VOICE_ESCALATION = "Thank you for telling me. I'm stopping the intake questions and connecting you with a person now. If you are in danger or might act on these thoughts, call 911. You can call or text 988, the Suicide and Crisis Lifeline, at any time. Please stay on the line.";
/** Words that mean the caller may not be safe. Matching stops the questions; it never decides anything about the caller's safety. */
export const UNSAFE = /not (feel(ing)? )?safe|hurt(ing)? (myself|me)|kill(ing)? (myself|me)|suicid|end (my life|it all)|don'?t want to (live|be here|be alive)|better off dead|harm(ing)? myself/i;

const P = (field: string, label: string, value: string, confidence: Extract["confidence"] = "high") => A("profile", field, label, value, confidence);
const R = (field: string, label: string, value: string, confidence: Extract["confidence"] = "high") => A("referral", field, label, value, confidence);
const C = (field: string, label: string, value: string, confidence: Extract["confidence"] = "high") => A("coverage", field, label, value, confidence);

const STAFF_COLLECTS = [
  { field: "legalName", label: "Legal name (staff confirm it with an ID)" },
  { field: "consentTreatment", label: "Signed consent to intake and treatment" },
];
const ROLE_STEP: VoiceStep = {
  id: "role", kind: "role", ask: `Before we start: ${VOICE_ROLE} I can't tell you what your insurance covers or make any medical decisions, and you can ask for a person at any time.`,
  reply: "Okay, that makes sense.", extract: [],
};
const CONSENT_STEP: VoiceStep = {
  id: "consent", kind: "consent", ask: "Is it okay if I ask you some questions and keep a transcript of this call for the intake team? Only the clinic's staff see it.",
  reply: "Yes, that's fine.", extract: [], ack: "Thank you.",
  options: [{ label: "Yes", text: "Yes, that's fine." }, { label: "Wants a person", text: "No, I'd rather talk to a person.", transfer: "The caller asked for a person" }],
};

const VOICE_D: VoiceScript = {
  id: "voice-d",
  callerSpeaker: "patient",
  callerLabel: "Caller (M.S.)",
  staffCollects: STAFF_COLLECTS,
  steps: [
    { id: "identity", kind: "identity", ask: "Hello, and thank you for calling. I'm an automated assistant for the clinic's intake line, and {coordinator} from the intake team is on the line too. To make sure I'm speaking with the right person, can you tell me your first name and date of birth?",
      reply: "Sure. It's Maya. June 3rd, 1993.", extract: [P("preferredName", "Preferred name", "Maya"), P("dob", "Date of birth", "1993-06-03")], ack: "Thank you, Maya." },
    { id: "language", kind: "language", ask: "What language would you like to use today? I can continue in English, or we can add an interpreter.",
      reply: "English is fine.", extract: [P("language", "Preferred language", "English"), P("interpreter", "Interpreter needed", "No")],
      options: [{ label: "English", text: "English is fine." }, { label: "Spanish, with an interpreter", text: "Spanish, please.", transfer: "Interpreter needed: Spanish (simulated)", extract: [P("language", "Preferred language", "Spanish"), P("interpreter", "Interpreter needed", "Yes")] }] },
    ROLE_STEP,
    CONSENT_STEP,
    { id: "q-reason", kind: "question", onFile: { section: "referral", field: "reason", label: "Reason for referral" }, ask: "What's leading you to reach out for help right now?",
      reply: "I've just been off lately.",
      clarify: { ask: "Thanks for telling me. Can you say a little more about what \"off\" looks like day to day, like sleep, mood or work?", reply: "I'm not sleeping well, maybe four hours a night, and I've been really anxious at work. I've called out sick three times this month." },
      extract: [R("reason", "Reason for referral", "Asks for therapy for anxiety and poor sleep that are affecting work (caller's words)."), R("concerns", "Presenting concerns", "Anxious at work; sleeping about four hours a night; called out sick three times this month.")],
      ack: "That sounds hard. Thank you for explaining." },
    { id: "q-duration", kind: "question", onFile: { section: "referral", field: "symptoms", label: "Current symptoms" }, ask: "How long has this been going on?",
      reply: "Since about August, after my mom got sick.", extract: [R("symptoms", "Current symptoms", "Anxiety and poor sleep since about August 2026, after her mother became ill (caller's words).")] },
    { id: "q-prior", kind: "question", onFile: { section: "referral", field: "previousServices", label: "Previous and current services" }, ask: "Have you talked with a counselor or therapist before?",
      reply: "A few sessions in college, years ago. Nothing since.", extract: [R("previousServices", "Previous and current services", "A few counseling sessions in college, years ago; nothing since.")] },
    { id: "q-providers", kind: "question", onFile: { section: "referral", field: "currentProviders", label: "Current treating providers" }, ask: "Do you see a primary care provider, or anyone else for your health right now?",
      reply: "Dr. Patel at the community health center. She's the one who said I should call.",
      extract: [R("currentProviders", "Current treating providers", "Primary care: Dr. Patel, community health center (fictional)"), R("referringClinician", "Referring clinician or staff", "Self-referral; primary care (Dr. Patel) suggested the call", "medium")] },
    { id: "q-meds", kind: "question", onFile: { section: "profile", field: "medications", label: "Current medications" }, ask: "Are you taking any medications right now, for sleep, mood or anything else?",
      reply: "Just something for allergies. Dr. Patel mentioned a sleep medicine, but we didn't start it.", extract: [P("medications", "Current medications", "An allergy medication (name not given); no medication for sleep or mood (caller's words).", "medium")] },
    { id: "q-insurance", kind: "question", onFile: { section: "coverage", field: "medicaidId", label: "Medicaid member ID" }, ask: "Do you have Medicaid or other insurance? If you have your card, you can read me the member ID.",
      reply: "I have Medicaid, the regular card, not one of the health plans. The ID ends in 0457. Is therapy covered?",
      extract: [C("medicaidId", "Medicaid member ID", "•••• 0457"), C("coverageType", "Coverage type", "Fee-for-service", "medium"), C("plan", "Medicaid managed care organization", "Virginia Medicaid fee-for-service (caller reported)", "medium")],
      ack: "Thank you. I can't tell you what's covered. Our staff check coverage and will let you know." },
    { id: "q-address", kind: "question", onFile: { section: "profile", field: "address", label: "Address" }, ask: "What city or county do you live in?", reply: "Roanoke.", extract: [P("address", "Address", "Roanoke, VA (city only; synthetic)", "medium")] },
    { id: "q-phone", kind: "question", onFile: { section: "profile", field: "phone", label: "Phone" }, ask: "What's the best phone number to reach you?", reply: "This number is fine.", extract: [] },
    { id: "q-contact", kind: "question", onFile: { section: "profile", field: "commPrefs", label: "Communication preferences" }, ask: "What's the best way and time to reach you?",
      reply: "Texting is best. Calls after 5 are okay.", extract: [P("commPrefs", "Communication preferences", "Text preferred; calls after 5 pm")] },
    { id: "q-prefs", kind: "question", onFile: { section: "referral", field: "preferences", label: "Patient and caregiver preferences" }, ask: "Would you prefer visits in person or by video, and what times work for you?",
      reply: "Video would be easier, evenings if possible. Can I start next week?", extract: [R("preferences", "Patient and caregiver preferences", "Video visits; evenings")],
      ack: "Thanks. I can't promise a start date or a place in a program. Staff will call you about next steps after they review your intake." },
    { id: "q-emergency", kind: "question", onFile: { section: "profile", field: "emergencyContact", label: "Emergency contact" }, ask: "Who should we contact in an emergency?",
      reply: "My sister, J.S. Her number is 276-555-0178.", extract: [P("emergencyContact", "Emergency contact", "Sister, J.S., (276) 555-0178")] },
    { id: "q-refcontact", kind: "question", missingOnly: true, onFile: { section: "referral", field: "referrerContact", label: "Referrer contact" }, ask: "One thing I'm missing: do you have a phone number for Dr. Patel's office?",
      reply: "Not on me. It's the community health center on Melrose Avenue.", extract: [R("referrerContact", "Referrer contact", "Community health center on Melrose Avenue (fictional); number not given", "low")], ack: "That's fine. Staff can look it up." },
  ],
  summaryReply: "One thing: calls after 6, not 5. I'm at work until 5:30.",
  correction: { field: "commPrefs", value: "Text preferred; calls after 6 pm", ack: "Thanks, I've changed that to calls after 6 pm." },
  closing: "Thank you, Maya. A staff member will review this and contact you about next steps. If things get worse before then, you can call or text 988 at any time.",
};

/** New voice intakes: a neutral script. A parent or guardian calls for a minor. One quick reply shows the safety escalation. */
function voiceGeneric(r: Pick<IntakeRecord, "age" | "initials">): VoiceScript {
  const minor = r.age !== null && r.age < 18;
  /* A record with initials is a known person; a new voice intake (no initials yet) is a new caller who gives a first name.
     Born on April 9: as of the demo date (October 2026) the age is 2026 minus the year. */
  const known = !!r.initials;
  const year = r.age !== null ? 2026 - r.age : 1990;
  const unsafe: VoiceOption = { label: "Says they are not safe", text: minor ? "Honestly, my child told me last night they don't feel safe with themselves." : "Honestly, I don't feel safe with myself right now.", escalate: true };
  return {
    id: "voice-generic",
    callerSpeaker: minor ? "caregiver" : "patient",
    callerLabel: minor ? "Caller (parent or guardian)" : "Caller",
    staffCollects: STAFF_COLLECTS,
    steps: [
      known
        ? { id: "identity", kind: "identity", ask: `Hello, and thank you for calling. I'm an automated assistant for the clinic's intake line, and {coordinator} from the intake team is on the line too. To make sure I have the right record, can you confirm ${minor ? "your child's" : "your"} date of birth?`,
          reply: minor ? `Yes. My child was born April 9th, ${year}.` : `Sure. April 9th, ${year}.`, extract: [P("dob", "Date of birth", `${year}-04-09`, "medium")], ack: "Thank you." }
        : { id: "identity", kind: "identity", ask: "Hello, and thank you for calling. I'm an automated assistant for the clinic's intake line, and {coordinator} from the intake team is on the line too. To start, can you tell me your first name and date of birth?",
          reply: `Sure. It's Sam. April 9th, ${year}.`, extract: [P("preferredName", "Preferred name", "Sam"), P("dob", "Date of birth", `${year}-04-09`, "medium")], ack: "Thank you, Sam." },
      { id: "language", kind: "language", ask: "What language would you like to use today? I can continue in English, or we can add an interpreter.",
        reply: "English is fine.", extract: [P("language", "Preferred language", "English"), P("interpreter", "Interpreter needed", "No")],
        options: [{ label: "English", text: "English is fine." }, { label: "Another language, with an interpreter", text: "Could we use Vietnamese?", transfer: "Interpreter needed: Vietnamese (simulated)", extract: [P("language", "Preferred language", "Vietnamese"), P("interpreter", "Interpreter needed", "Yes")] }] },
      ROLE_STEP,
      CONSENT_STEP,
      { id: "q-reason", kind: "question", onFile: { section: "referral", field: "reason", label: "Reason for referral" }, ask: minor ? "What's leading you to reach out for your child right now?" : "What's leading you to reach out for help right now?",
        reply: minor ? "Things have been hard lately." : "Things have just been a lot lately.",
        clarify: { ask: "Thank you. Can you tell me a bit more about what has been hard, day to day?", reply: minor ? "They're not sleeping, they're angry a lot, and school keeps calling me." : "I'm stressed all the time, I'm not sleeping, and I've been missing work." },
        extract: [R("reason", "Reason for referral", minor ? "Parent asks for help: poor sleep, anger and calls from school (caller's words)." : "Asks for help with stress, poor sleep and missed work (caller's words)."), R("concerns", "Presenting concerns", minor ? "Not sleeping; angry a lot; school calling the parent." : "Stressed all the time; not sleeping; missing work.")],
        ack: "Thank you for explaining.", options: [unsafe] },
      { id: "q-duration", kind: "question", onFile: { section: "referral", field: "symptoms", label: "Current symptoms" }, ask: "How long has this been going on?",
        reply: "A couple of months now.", extract: [R("symptoms", "Current symptoms", "For about two months (caller's words).", "medium")], options: [unsafe] },
      { id: "q-prior", kind: "question", onFile: { section: "referral", field: "previousServices", label: "Previous and current services" }, ask: minor ? "Has your child seen a counselor or therapist before?" : "Have you seen a counselor or therapist before?",
        reply: "No, never.", extract: [R("previousServices", "Previous and current services", "None before (caller's words)")] },
      { id: "q-meds", kind: "question", onFile: { section: "profile", field: "medications", label: "Current medications" }, ask: "Are there any medications right now?", reply: "No.", extract: [P("medications", "Current medications", "None (caller's words)", "medium")] },
      { id: "q-insurance", kind: "question", onFile: { section: "coverage", field: "medicaidId", label: "Medicaid member ID" }, ask: "Do you have a Medicaid card with you? You can read me the member ID.",
        reply: "Yes. It ends in 3318.", extract: [C("medicaidId", "Medicaid member ID", "•••• 3318")], ack: "Thank you. I can't tell you what's covered. Staff check coverage and will let you know." },
      { id: "q-phone", kind: "question", onFile: { section: "profile", field: "phone", label: "Phone" }, ask: "What's the best phone number to reach you?", reply: "You can use 434-555-0163.", extract: [P("phone", "Phone", "(434) 555-0163")] },
      { id: "q-prefs", kind: "question", onFile: { section: "referral", field: "preferences", label: "Patient and caregiver preferences" }, ask: "Would visits in person or by video work better, and at what times?",
        reply: minor ? "After school, in person." : "Video, in the evenings.", extract: [R("preferences", "Patient and caregiver preferences", minor ? "In person, after school" : "Video, evenings")],
        ack: "Thanks. I can't promise a start date. Staff will call you about next steps." },
      { id: "q-emergency", kind: "question", onFile: { section: "profile", field: "emergencyContact", label: "Emergency contact" }, ask: "Who should we contact in an emergency?",
        reply: minor ? "Me, or their grandmother at 434-555-0171." : "My partner, at 434-555-0171.", extract: [P("emergencyContact", "Emergency contact", minor ? "Parent (caller), or grandmother at (434) 555-0171" : "Partner, (434) 555-0171")] },
    ],
    summaryReply: "Yes, that's all right.",
    closing: "Thank you. A staff member will review this and contact you about next steps. If things get worse, you can call or text 988 at any time.",
  };
}

/* The questions a configured program adds to the call. The assistant asks what the program's intake needs to start from, in plain words, collects the caller's
   answers as proposals for the clinical assessment, and never says what a level of care or a service would be. Staff review everything. */
type VoiceFamily = "sud" | "mh-acute" | "community" | "csc" | "aba" | "youth";
const SUD_IDS: ProgramId[] = ["sud-op", "sud-iop", "sud-php", "sud-res", "sud-wm", "sud-inpt", "otp", "obot"];
const MH_ACUTE_IDS: ProgramId[] = ["mh-iop", "mh-php", "mh-res", "mh-inpt", "prtf", "youth-iop", "youth-php"];
const COMMUNITY_IDS: ProgramId[] = ["cpst-adult", "mhcm", "clubhouse", "cbbh", "act", "psr"];
const YOUTH_IDS: ProgramId[] = ["cpst-youth", "cpst-school", "school-bh", "children-intensive", "family-based"];
export const voiceFamilyOf = (programId: ProgramId): VoiceFamily | null =>
  SUD_IDS.includes(programId) ? "sud" : MH_ACUTE_IDS.includes(programId) ? "mh-acute" : COMMUNITY_IDS.includes(programId) ? "community" : programId === "csc" ? "csc" : programId === "aba" ? "aba" : YOUTH_IDS.includes(programId) ? "youth" : null;

function programSteps(family: VoiceFamily, minor: boolean): VoiceStep[] {
  const q = (id: string, ask: string, reply: string, extract: Extract[], ack?: string): VoiceStep => ({ id, kind: "question", ask, reply, extract, ack });
  switch (family) {
    case "sud":
      return [
        q("p-substance", "What substances have you been using, and how often? You can tell me in your own words.", "Mostly alcohol, most days. My last drink was about a week ago.", [as("history", "Alcohol most days; last drink about a week before the call (caller's words).")], "Thank you for telling me."),
        q("p-withdrawal", "When you stopped or cut down before, did you have withdrawal, like shaking or sweating? You don't need to give details.", "A little shaking the first day. Nothing serious that I remember.", [as("symptoms", "Some shaking on the first day of stopping before; no serious withdrawal remembered (caller's words). Staff and a clinician follow up.", "low")]),
      ];
    case "mh-acute":
      return [
        q("p-recent", `Have ${minor ? "they" : "you"} had hospital care or a crisis visit recently for ${minor ? "their" : "your"} mental health?`, "Yes, an emergency room visit three weeks ago.", [as("history", "An emergency room visit about three weeks before the call (caller's words).")]),
        q("p-daily", "How are the symptoms affecting daily life, like work, school or taking care of yourself?", minor ? "School is hard. They stay home most days this month." : "I can't work right now, and I'm not cooking or cleaning.", [as("functional", minor ? "Missing most school days this month (caller's words)." : "Not working; not cooking or cleaning (caller's words).", "high")]),
      ];
    case "community":
      return [
        q("p-needs", "What do you need help with day to day to stay well in the community?", "Reminders for my medicine and help with my budget.", [as("functional", "Needs reminders for medication and help with budgeting (caller's words).", "high")]),
        q("p-helpers", "Who helps you now, family, friends or a program?", "My sister, and a worker who visits three days a week.", [{ section: "profile", field: "supports", label: "Family and social supports", value: "A sister and a worker who visits three days a week (caller's words)", confidence: "high" }]),
      ];
    case "csc":
      return [
        q("p-onset", `When did ${minor ? "they" : "you"} first notice changes, and has there been hospital care?`, "About two months ago. There was one hospital stay last month.", [as("history", "Changes began about two months before the call; one hospital stay last month (caller's words).", "high")]),
        q("p-activity", "Are you in school or working right now?", "I stopped my classes in the fall. I'm not working.", [as("functional", "Stopped classes in the fall; not working (caller's words).", "high")]),
      ];
    case "aba":
      return [
        q("p-eval", "Has your child had an evaluation or a diagnosis? Who did it, and when?", "Yes, this spring. The pediatric clinic did it and I have the report.", [as("history", "An evaluation this spring at a pediatric clinic; the parent has the report (caller's words). Staff ask for a copy.", "medium")]),
        q("p-behaviors", "What behaviors are hardest at home or at school?", "Meltdowns when plans change, and he doesn't talk much yet.", [as("symptoms", "Meltdowns when plans change; limited spoken language (caller's words).", "high")]),
      ];
    case "youth":
      return [
        q("p-school", "How is school going, with attendance, grades and getting along with others?", "Missing a lot of days, and the grades are dropping.", [as("functional", "Many missed school days and dropping grades (caller's words).", "high")]),
        q("p-home", "Who is at home, and how is the family doing?", "Me and two siblings. It's been tense at home.", [{ section: "profile", field: "supports", label: "Family and social supports", value: "Lives with a parent and two siblings; tension at home (caller's words)", confidence: "medium" }]),
      ];
  }
}

/** The id a program-adapted call is stored under, so a call in progress keeps its questions if the intake is reconfigured. */
export const voiceComposedId = (programId: ProgramId): string => `voice-c:${programId}`;

type VoiceSource = Pick<IntakeRecord, "id" | "age" | "initials"> & { config?: Pick<NonNullable<IntakeRecord["config"]>, "programId"> };
/** The scripted call for a record: M.S. in Scenario D, a generic call with the questions a configured program adds, or the plain generic call. */
export function voiceScriptFor(r: VoiceSource, scriptId?: string): VoiceScript {
  if (scriptId === "voice-d" || (!scriptId && r.id === "IN-3104")) return VOICE_D;
  const base = voiceGeneric(r);
  const programId = scriptId?.startsWith("voice-c:") ? (scriptId.slice(8) as ProgramId) : scriptId ? undefined : r.config?.programId;
  const family = programId ? voiceFamilyOf(programId) : null;
  if (!programId || !family) return base;
  const minor = r.age !== null && r.age < 18;
  const at = base.steps.findIndex((st) => st.id === "q-insurance");
  const steps = [...base.steps.slice(0, at), ...programSteps(family, minor), ...base.steps.slice(at)];
  return { ...base, id: voiceComposedId(programId), steps };
}

/* ------------------------------------------------------------------ Voice guided assessment */

/** Approved questions for the Voice guided assessment mode. Safety screening is never asked by the guide: a clinician does it. */
export const GUIDED_QUESTIONS: { id: string; section: AssessmentSectionId; text: string }[] = [
  { id: "g-presenting", section: "presenting", text: "What brings you in today, in your own words?" },
  { id: "g-symptoms", section: "symptoms", text: "How have your mood, sleep and energy been over the last two weeks?" },
  { id: "g-history", section: "history", text: "Have you had times like this before? Any hospital stays for your mental health?" },
  { id: "g-functional", section: "functional", text: "How is this affecting school, work, home or relationships?" },
  { id: "g-strengths", section: "strengths", text: "What helps when things are hard? What are you good at?" },
  { id: "g-sdoh", section: "sdoh", text: "Is anything making it hard to get care, like transportation, housing, money or time off?" },
  { id: "g-prior", section: "prior", text: "Have you had counseling, therapy or other services before? What helped?" },
  { id: "g-goals", section: "goals", text: "What would you like to be different a few months from now?" },
  { id: "g-needs", section: "needs", text: "What kind of support are you hoping for?" },
];

/** Structured prompts for the safety and risk screening. The clinician records the response to each; nothing here scores or concludes. */
export const SAFETY_PROMPTS: { id: string; text: string; options: string[] }[] = [
  { id: "si", text: "Thoughts of suicide or of not wanting to be alive, now or recently", options: ["Asked: denies", "Asked: endorses", "Asked: unclear, follow up", "Not asked"] },
  { id: "plan", text: "A plan, intent or preparation", options: ["Asked: denies", "Asked: endorses", "Not applicable: no thoughts reported", "Not asked"] },
  { id: "means", text: "Access to firearms, medications or other means", options: ["Asked: no access reported", "Asked: access, safe storage discussed", "Asked: unclear, follow up", "Not asked"] },
  { id: "history", text: "Past attempts or self-harm", options: ["Asked: none reported", "Asked: reported", "Not asked"] },
  { id: "others", text: "Thoughts of harming others", options: ["Asked: denies", "Asked: endorses", "Not asked"] },
  { id: "protective", text: "Protective factors and supports", options: ["Discussed", "Not discussed"] },
  { id: "safety-plan", text: "Safety plan made or reviewed with the person", options: ["Made or reviewed today", "Not yet", "Not indicated, per clinician"] },
];
