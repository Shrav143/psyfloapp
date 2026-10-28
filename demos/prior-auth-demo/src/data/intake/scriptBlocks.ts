import type { ModuleId } from "../assess/types";
import type { AssessmentSectionId, NoteSectionId } from "./types";
import type { Persona } from "./scriptPersonas";

/* The reusable pieces of the simulated Record Intake interview. A block is one topic of the conversation (a question and the person's answer),
   with what the scribe proposes from it: a value for a shared assessment, profile or referral field, evidence for one assessment module, or a
   CANS evidence theme. scripts.ts composes the blocks the configured program and its modules call for, so a substance use intake and a CPST
   intake do not sound alike and nothing is asked twice. Nothing here is a diagnosis, a rating or a decision: the scribe only quotes. */

export type Confidence = "high" | "medium" | "low";
/** A value for a field of the clinical assessment, the patient profile, the referral or the coverage. */
export interface FieldExtract { section: "referral" | "profile" | "coverage" | "assessment"; field: string; label: string; value: string; confidence: Confidence }
/** Evidence for one assessment module. The words find its field in the module's form when the interview runs; the person can move it. */
export interface ModuleExtract { section: "module"; module: ModuleId; words: string[]; keys?: string[]; label: string; value: string; confidence: Confidence }
/** A statement filed under a Psyflo evidence theme for the CANS. A theme is never a CANS domain or item. */
export interface CansExtract { section: "cans"; theme: string; label: string; value: string; confidence: Confidence }
export type ScribeField = FieldExtract | ModuleExtract | CansExtract;

export type Who = "clin" | "main" | "pt" | "cg" | "cgPref";
export interface TurnSpec {
  by: Who;
  text: string;
  /** The speaker the simulated speaker identification got wrong. */
  heardAs?: "patient" | "caregiver" | "unknown";
  note?: Partial<Record<NoteSectionId, string>>;
  fields?: ScribeField[];
  risk?: { text: string; alert: boolean };
  missing?: string[];
  resolves?: string[];
}
export interface Block {
  id: string;
  /** What the scribe says it detected ("Withdrawal concerns"). */
  label: string;
  /** Played when any of these modules is in use. Left out: played in every interview. */
  modules?: ModuleId[];
  /** Where it falls in the conversation. */
  order: number;
  turns: (p: Persona) => TurnSpec[];
}

/* ------------------------------------------------------------------ field helpers */
const ASSESSMENT_LABEL: Record<Exclude<AssessmentSectionId, "mse" | "narrative">, string> = {
  presenting: "Presenting problem", symptoms: "Current symptoms", history: "Clinical history", functional: "Functional limitations", safety: "Safety and risk screening",
  strengths: "Strengths", sdoh: "Social determinants and barriers", prior: "Prior treatment", goals: "Patient goals", needs: "Preliminary service needs",
};
export const as = (id: keyof typeof ASSESSMENT_LABEL, value: string, confidence: Confidence = "medium"): FieldExtract => ({ section: "assessment", field: id, label: ASSESSMENT_LABEL[id], value, confidence });
export const pf = (field: string, label: string, value: string, confidence: Confidence = "medium"): FieldExtract => ({ section: "profile", field, label, value, confidence });
export const mx = (module: ModuleId, words: string[], label: string, value: string, confidence: Confidence = "medium", keys?: string[]): ModuleExtract => ({ section: "module", module, words, keys, label, value, confidence });
export const cx = (theme: string, value: string, confidence: Confidence = "medium"): CansExtract => ({ section: "cans", theme, label: theme, value, confidence });
const T = (by: Who, text: string, more: Partial<TurnSpec> = {}): TurnSpec => ({ by, text, ...more });

const ASAM = (n: 1 | 2 | 3 | 4 | 5 | 6, words: string[], value: string, confidence: Confidence = "medium"): ModuleExtract =>
  mx("asam", words, `ASAM dimension ${n}`, value, confidence, [`asam.d${n}.findings`]);

/* ------------------------------------------------------------------ the shared interview: asked in every program */
const KIND_HISTORY = (p: Persona): ScribeField[] =>
  p.historyKind === "psychiatric"
    ? [mx("psychiatric", ["history", "hospital", "diagnos", "prior"], "Psychiatric history", p.core.historyNote), mx("psych-history", ["history", "hospital", "diagnos", "prior"], "Psychiatric history", p.core.historyNote), mx("treatment-history", ["prior", "previous", "services", "helped", "outcome"], "Previous treatment", p.core.prior)]
    : p.historyKind === "substance"
      ? [mx("sud-history", ["onset", "first use", "history", "substances", "age"], "How use began", p.core.historyNote)]
      : [mx("developmental-history", ["milestone", "early", "history", "speech"], "Developmental history", p.core.historyNote)];

export const CORE_BLOCKS: Block[] = [
  {
    id: "open", label: "Presenting problem", order: 10,
    turns: (p) => [
      T("clin", "Thanks for coming in. Everyone here agreed to the recording, so the scribe will take notes while we talk. What brings you in today?", { note: { plan: "Everyone present agreed to the recording before it started." } }),
      T("main", p.core.reason, {
        note: { reason: p.core.presenting },
        fields: [as("presenting", p.core.presenting, "high"), mx("psychiatric", ["presenting", "reason", "concern", "chief"], "Presenting problem", p.core.presenting, "medium", ["psychiatric.presenting"]), mx("cpst-review", ["reason", "why", "request"], "Why services are requested", p.core.presenting)],
      }),
    ],
  },
  {
    id: "symptoms", label: "Current symptoms", order: 20,
    turns: (p) => [
      T("clin", p.historyKind === "developmental" ? "How are sleep, eating and daily routines going?" : "How have mood, sleep and energy been over the last few weeks?"),
      T("main", p.core.symptoms, {
        note: { hpi: p.core.symptomsNote },
        fields: [as("symptoms", p.core.symptomsNote), ...(p.historyKind === "psychiatric" ? [mx("symptom-severity", ["symptom", "frequency", "intensity", "describe", "current"], "Current symptoms", p.core.symptomsNote), cx("Symptoms", p.core.symptomsNote)] : [])],
      }),
    ],
  },
  {
    id: "history", label: "History", order: 30,
    turns: (p) => [
      T("clin", p.historyKind === "substance" ? "When did your use start, and how did it change over time?" : p.historyKind === "developmental" ? "Tell me about his early development and any evaluations." : "Have you had times like this before? What was going on then?"),
      T("main", p.core.history, { note: { history: p.core.historyNote }, fields: [as("history", p.core.historyNote), as("prior", p.core.prior), ...KIND_HISTORY(p)] }),
    ],
  },
  {
    id: "meds", label: "Medications", order: 200,
    turns: (p) => [
      T("clin", "Any medications right now, prescribed or not?"),
      T("cgPref", p.core.meds, {
        heardAs: p.cg ? "patient" : undefined,
        fields: [pf("medications", "Current medications", p.core.medsNote), mx("psychiatric", ["medication", "adherence"], "Medications", p.core.medsNote), mx("medical-stability", ["medication", "condition"], "Medications", p.core.medsNote)],
        resolves: ["Medication history"],
        missing: /confirm|not stated|names and doses/i.test(p.core.medsNote) ? ["Current medication list, doses and prescriber"] : undefined,
      }),
    ],
  },
  {
    id: "functioning", label: "Functioning", order: 210,
    turns: (p) => [
      T("clin", "How is all of this affecting daily life: work, school, home, relationships?"),
      T("main", p.core.functioning, {
        note: { functional: p.core.functioningNote },
        fields: [as("functional", p.core.functioningNote, "high"), mx("functional-assessment", ["daily", "functioning", "work", "school", "relationship", "impairment", "living"], "Functioning", p.core.functioningNote), cx("Functioning", p.core.functioningNote, "high")],
      }),
    ],
  },
  {
    id: "supports", label: "Supports and strengths", order: 220,
    turns: (p) => [
      T("clin", "Who do you lean on when things are hard? What helps, and what are you good at?"),
      T("main", p.core.supports, {
        note: { strengths: p.core.strengthsNote },
        fields: [pf("supports", "Family and social supports", p.core.supportsNote), as("strengths", p.core.strengthsNote, "high"), cx("Supports and strengths", p.core.strengthsNote, "high")],
      }),
    ],
  },
  {
    id: "barriers", label: "Barriers to care", order: 230,
    turns: (p) => [
      T("clin", "Is anything making it hard to get to appointments, like transportation, housing, money or time off?"),
      T("cgPref", p.core.barriers, { fields: [as("sdoh", p.core.sdohNote, "high"), pf("transportation", "Transportation barriers", p.core.transport, "high")] }),
    ],
  },
  {
    id: "safety", label: "Safety information for a clinician", order: 600,
    turns: (p) => [
      T("clin", "I ask everyone this. Have you had thoughts of hurting yourself, or of not wanting to be alive?"),
      ...p.core.risk.flatMap((r) => [T("pt", r.say, { risk: { text: r.text, alert: r.alert } })]),
      T("clin", "Thank you for telling me. A clinician will go over this with you before you leave today.", { note: { plan: "A clinician will review the safety information with the person today." } }),
    ],
  },
  {
    id: "goals", label: "Goals and needs", order: 700,
    turns: (p) => [
      T("clin", "What would you like to be different a few months from now? What kind of support are you hoping for?"),
      T("main", p.core.goals, {
        note: { plan: p.core.needsNote },
        fields: [as("goals", p.core.goalsNote, "high"), as("needs", p.core.needsNote), mx("cpst-review", ["goals", "services", "needs", "requested"], "Goals", p.core.goalsNote)],
      }),
    ],
  },
  {
    id: "close", label: "Next steps", order: 800,
    turns: () => [T("clin", "Before you go, I'll need your signature on the consent form. We'll go over next steps together.", { note: { plan: "Consent form to be signed before the visit ends." } })],
  },
];

/* ------------------------------------------------------------------ substance use disorder */
const needs = <T,>(v: T | undefined, make: (v: T) => TurnSpec[]): TurnSpec[] => (v ? make(v) : []);

export const SUD_BLOCKS: Block[] = [
  {
    id: "sud-use", label: "Substance use history", modules: ["sud-history", "asam"], order: 110,
    turns: (p) => needs(p.sud, (s) => [
      T("clin", "Tell me about your use: what you used, how often, how much, and how you took it."),
      T("main", s.use, {
        note: { hpi: s.useNote },
        fields: [mx("sud-history", ["substances", "frequency", "route", "amount", "pattern"], "Substances and pattern of use", s.useNote, "high"), ASAM(1, ["intoxication", "withdrawal", "addiction"], s.useNote)],
      }),
      T("clin", "When was the last time you used?"),
      T("main", s.lastUse, { fields: [mx("sud-history", ["last use", "last", "most recent"], "Last use", s.lastUseNote, "high"), ASAM(1, ["intoxication", "last use"], s.lastUseNote)] }),
    ]),
  },
  {
    id: "withdrawal", label: "Withdrawal concerns", modules: ["withdrawal", "asam", "medical-stability"], order: 120,
    turns: (p) => needs(p.sud, (s) => [
      T("clin", "Have you been through withdrawal? How bad was it, and did you ever have seizures or need a hospital because of it?"),
      T("main", s.withdrawal, {
        note: { history: s.withdrawalNote },
        fields: [mx("withdrawal", ["prior", "history", "complication", "seizure", "previous"], "Withdrawal history", s.withdrawalNote, s.withdrawalClear ? "high" : "low"), ASAM(1, ["withdrawal", "intoxication"], s.withdrawalNote, s.withdrawalClear ? "high" : "low")],
        resolves: s.withdrawalClear ? ["Previous withdrawal complications"] : undefined,
        missing: s.withdrawalClear ? undefined : ["Details of the first withdrawal: seizures, hospital care, medications given"],
      }),
    ]),
  },
  {
    id: "sud-treatment", label: "Treatment history", modules: ["treatment-history", "sud-history"], order: 130,
    turns: (p) => needs(p.sud, (s) => [
      T("clin", "What treatment have you had before, including medications for addiction? What helped?"),
      T("main", s.treatment, {
        note: { history: s.treatmentNote },
        fields: [mx("treatment-history", ["prior", "previous", "services", "helped", "outcome", "treatment"], "Previous treatment", s.treatmentNote, "high"), mx("sud-history", ["treatment history", "treatment", "medication", "mat", "abstinence"], "Treatment history", s.treatmentNote, "high")],
        resolves: ["Relevant treatment history"],
      }),
    ]),
  },
  {
    id: "medical", label: "Medical conditions", modules: ["medical-stability", "withdrawal", "asam"], order: 140,
    turns: (p) => needs(p.sud, (s) => [
      T("clin", "Any medical conditions, or recent medical care, that we should know about?"),
      T("main", s.medical, { note: { history: s.medicalNote }, fields: [mx("medical-stability", ["condition", "medical", "clearance", "health"], "Medical conditions", s.medicalNote), ASAM(2, ["biomedical", "medical", "condition"], s.medicalNote)] }),
    ]),
  },
  {
    id: "sud-psych", label: "Psychiatric history", modules: ["psych-history", "asam"], order: 150,
    turns: (p) => needs(p.sud, (s) => [
      T("clin", "Any mental health history alongside this: anxiety, depression, trauma, hospital stays?"),
      T("main", s.psych, { note: { history: s.psychNote }, fields: [mx("psych-history", ["history", "symptom", "hospital", "diagnos", "co-occurring"], "Psychiatric history", s.psychNote), ASAM(3, ["psychiatric", "cognitive"], s.psychNote)] }),
    ]),
  },
  {
    id: "recovery-env", label: "Recovery environment", modules: ["recovery-env", "asam"], order: 160,
    turns: (p) => needs(p.sud, (s) => [
      T("clin", "Where do you live, who is around you, and what are the situations that make it hard to stay in recovery?"),
      T("main", s.env, { note: { strengths: s.envNote }, fields: [mx("recovery-env", ["housing", "support", "trigger", "environment", "risk"], "Recovery environment", s.envNote, "high"), ASAM(5, ["recovery environment", "environment"], s.envNote, "high"), ASAM(4, ["substance use-related risks", "risk"], s.envNote)] }),
    ]),
  },
  {
    id: "why-level", label: "What makes a lower level of care hard", modules: ["residential-admission"], order: 170,
    turns: (p) => needs(p.sud, (s) => [
      T("clin", "What has made it hard to stay well with less support than you're asking for?"),
      T("main", s.whyRes, { note: { plan: s.whyResNote }, fields: [mx("residential-admission", ["why", "barrier", "lower", "rationale", "home"], "In the person's words", s.whyResNote)] }),
    ]),
  },
  {
    id: "asam-person", label: "Person-centered considerations", modules: ["asam"], order: 180,
    turns: (p) => needs(p.sud, (s) => [
      T("clin", "What matters most to you in your care, and what do you want to keep in place?"),
      T("main", s.person, { fields: [ASAM(6, ["person-centered", "preference", "goal"], s.personNote, "high")] }),
    ]),
  },
];
