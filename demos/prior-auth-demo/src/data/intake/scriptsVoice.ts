import type { ProgramId } from "../assess/types";
import { A, as, type Extract, type FieldTarget } from "./scriptTypes";
import type { IntakeRecord } from "./types";

/* The Voice Intake Assistant: simulated calls. A program adds the questions its intake starts from; the guardrails never change. */

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
export const UNSAFE = /not (feel(ing)? )?safe|(don'?t|do not|doesn'?t|isn'?t|can'?t|cannot|never) (really )?(feel(ing)?|be|stay|feeling) safe|hurt(ing)? (myself|me)|kill(ing)? (myself|me)|suicid|end (my life|it all)|don'?t want to (live|be here|be alive)|better off dead|harm(ing)? myself/i;

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
