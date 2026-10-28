import type { FieldDef, ModuleId, ModuleSchema, SectionDef } from "../types";

/* Authored forms for the substance use modules. Every field is a documentation prompt a clinician answers in their own words; none reproduces a licensed
   instrument, a criterion, a placement algorithm or a score. Field keys are stable and namespaced by module (asam.d1.findings, sudhx.substances) so
   evidence, versions and the audit trail keep pointing at the same thing. Required fields are kept to a few so a scenario can be completed. */

const long = (key: string, label: string, o: Partial<FieldDef> = {}): FieldDef => ({ key, label, kind: "long", ...o });
const text = (key: string, label: string, o: Partial<FieldDef> = {}): FieldDef => ({ key, label, kind: "text", ...o });
const pick = (key: string, label: string, options: string[], o: Partial<FieldDef> = {}): FieldDef => ({ key, label, kind: "select", options, ...o });
const date = (key: string, label: string, o: Partial<FieldDef> = {}): FieldDef => ({ key, label, kind: "date", ...o });
const section = (id: string, label: string, fields: FieldDef[], hint?: string): SectionDef => ({ id, label, hint, fields });

/* ------------------------------------------------------------------ ASAM: the six dimensions as documentation headings */
interface Dimension { n: number; title: string; findingsLabel: string; words: string[]; supportWords: string[]; required?: boolean }

const DIMENSIONS: Dimension[] = [
  {
    n: 1, title: "Intoxication, Withdrawal and Addiction Medications", findingsLabel: "Findings: intoxication, withdrawal and medications", required: true,
    words: ["withdrawal", "intoxicat", "last drink", "last use", "tremor", "craving", "seizure", "buprenorphine", "methadone", "naltrexone", "detox", "sweating", "nausea"],
    supportWords: ["last use", "last drink", "withdrawal", "medication", "dose", "buprenorphine"],
  },
  {
    n: 2, title: "Biomedical Conditions", findingsLabel: "Findings: biomedical conditions", required: true,
    words: ["medical", "diabetes", "hypertension", "pregnan", "liver", "hepatitis", "infection", "injury", "fall", "surgery", "hospital", "allerg", "head ct"],
    supportWords: ["medical", "hospital", "physician", "labs", "evaluation"],
  },
  {
    n: 3, title: "Psychiatric and Cognitive Conditions", findingsLabel: "Findings: psychiatric and cognitive conditions",
    words: ["depress", "anxiety", "bipolar", "psychosis", "suicid", "trauma", "ptsd", "psychiatric", "mood", "panic", "hallucinat", "memory", "diagnos"],
    supportWords: ["psychiatric", "diagnos", "medication", "therapist", "hospital"],
  },
  {
    n: 4, title: "Substance Use-Related Risks", findingsLabel: "Findings: substance use-related risks",
    words: ["overdose", "relapse", "craving", "naloxone", "driving", "arrest", "unsafe", "injecting", "needle", "continued use", "risk"],
    supportWords: ["overdose", "relapse", "arrest", "risk", "safety"],
  },
  {
    n: 5, title: "Recovery Environment Interactions", findingsLabel: "Findings: recovery environment", required: true,
    words: ["housing", "homeless", "lives with", "living with", "family", "partner", "sister", "mother", "support", "sponsor", "peer", "friends", "transport", "employ", "job"],
    supportWords: ["housing", "family", "support", "sponsor", "employ"],
  },
  {
    n: 6, title: "Person-Centered Considerations", findingsLabel: "Findings: person-centered considerations",
    words: ["prefer", "goal", "motivat", "ready", "wants", "childcare", "language", "interpreter", "faith", "culture", "schedule", "barrier"],
    supportWords: ["prefer", "goal", "wants", "ready"],
  },
];

const ASAM_LEVEL_NAMES = ["Outpatient", "Intensive outpatient", "Partial hospitalization", "Residential", "Withdrawal management", "Inpatient", "A different level, described in the reason"];

const dimension = (d: Dimension): SectionDef => {
  const k = (f: string) => `asam.d${d.n}.${f}`;
  return section(`d${d.n}`, `${d.n}. ${d.title}`, [
    long(k("findings"), d.findingsLabel, { required: d.required, evidence: d.words, hint: "The clinician's findings in their own words. Not a rating and not a criterion." }),
    long(k("support"), "Supporting evidence and sources", { evidence: d.supportWords }),
    long(k("sb"), "Strengths and barriers"),
    long(k("needed"), "Information still needed"),
    long(k("risks"), "Risks noted for clinician review", { hint: "Anything that needs a clinician's attention. Psyflo does not rate or finalize risk." }),
  ]);
};

const ASAM: ModuleSchema = {
  sections: [
    ...DIMENSIONS.map(dimension),
    {
      id: "loc", label: "Level-of-care review", type: "loc-review", locOptions: ASAM_LEVEL_NAMES,
      hint: "ASAM criteria are not reproduced; the licensed criteria and algorithm are not loaded.",
      fields: [long("asam.loc.reason", "Reason for the confirmed level", { required: true })],
    },
  ],
};

/* ------------------------------------------------------------------ substance use history */
const SUD_HISTORY: ModuleSchema = {
  sections: [
    section("use", "Substances and use pattern", [
      long("sudhx.substances", "Primary substances", { required: true, evidence: ["alcohol", "opioid", "heroin", "fentanyl", "methamphetamine", "stimulant", "cocaine", "cannabis", "marijuana", "benzodiazepine", "liquor", "drinks", "substance"] }),
      { key: "sudhx.route", label: "Route of administration", kind: "multi", options: ["Oral", "Smoked", "Snorted", "Injected", "Other route"] },
      text("sudhx.frequency", "Frequency and amount", { required: true, evidence: ["daily", "every day", "weekly", "times a", "per day", "a day", "a fifth", "drinks"] }),
      text("sudhx.duration", "Duration of use", { evidence: ["years", "since", "months", "for three", "for two"] }),
      date("sudhx.lastuse", "Date of last reported use", { required: true }),
      text("sudhx.firstuse", "Age of first use", { evidence: ["since age", "first used", "started using", "began using", "at age"] }),
      long("sudhx.overdose", "History of overdose", { evidence: ["overdose", "naloxone", "narcan", "revived"] }),
    ], "Documentation prompts for the clinician. Nothing here is scored."),
    section("treatment", "Treatment and recovery history", [
      long("sudhx.treatment", "Prior treatment episodes", { evidence: ["residential", "detox", "withdrawal management", "intensive outpatient", "outpatient", "treatment program", "28-day"] }),
      long("sudhx.mat", "Medication for addiction treatment history", { evidence: ["buprenorphine", "methadone", "naltrexone", "suboxone", "vivitrol", "acamprosate", "mat", "moud"] }),
      long("sudhx.withdrawalhx", "Previous withdrawal experiences", { evidence: ["withdrawal", "seizure", "delirium", "tremens", "detox"] }),
      text("sudhx.abstinence", "Periods of abstinence and what helped", { evidence: ["sober", "abstinen", "clean", "remission", "months without"] }),
    ]),
    section("context", "Legal and employment context", [
      long("sudhx.legal", "Legal and employment context", { evidence: ["court", "probation", "dui", "arrest", "charge", "employ", "job", "work"] }),
    ]),
  ],
};

/* ------------------------------------------------------------------ withdrawal and medical risk */
const WITHDRAWAL: ModuleSchema = {
  sections: [
    section("current", "Current withdrawal concerns", [
      long("wd.symptoms", "Current symptoms and concerns", { required: true, evidence: ["withdrawal", "tremor", "sweat", "nausea", "anxious", "insomnia", "craving", "ciwa", "cows", "monitor"] }),
      long("wd.lastuse", "Last use of each substance", { required: true, evidence: ["last drink", "last use", "used on", "hours ago", "yesterday"] }),
      long("wd.priorhx", "Prior withdrawal, including seizures", { evidence: ["seizure", "withdrawal", "delirium", "tremens", "complication"] }),
      long("wd.meds", "Medications given or prescribed", { evidence: ["mg", "medication", "prescribed", "protocol", "taper", "buprenorphine", "lorazepam"] }),
    ]),
    section("plan", "Medical evaluation and monitoring", [
      pick("wd.medeval", "Need for medical evaluation", ["Needed now", "Needed, not urgent", "Not needed", "Not yet determined"], { required: true, hint: "The clinician's judgment. Psyflo does not decide it." }),
      long("wd.monitoring", "Monitoring plan"),
    ]),
    section("scales", "Withdrawal scales administered", [
      text("wd.ciwa.result", "CIWA-Ar result, as recorded by the clinician", { hint: "The result of the scale the clinician administered. Psyflo does not reproduce or score it." }),
      date("wd.ciwa.when", "CIWA-Ar date administered"),
      text("wd.cows.result", "COWS result, as recorded by the clinician", { hint: "The result of the scale the clinician administered. Psyflo does not reproduce or score it." }),
      date("wd.cows.when", "COWS date administered"),
    ], "Type the result from the administered form. The CIWA-Ar and COWS modules hold the full record."),
  ],
};

/* ------------------------------------------------------------------ medical stability */
const MEDICAL_STABILITY: ModuleSchema = {
  sections: [
    section("medical", "Medical conditions", [
      long("ms.conditions", "Medical conditions that affect care", { required: true, evidence: ["medical", "diabetes", "hypertension", "pregnan", "liver", "hepatitis", "seizure", "injury", "fall", "head ct", "hospital"] }),
      long("ms.meds", "Current medications", { required: true, evidence: ["mg", "medication", "prescribed", "taking", "buprenorphine", "naltrexone"] }),
      long("ms.evaluation", "Most recent medical evaluation", { evidence: ["evaluated", "emergency department", "physician", "exam", "labs", "ct"] }),
      long("ms.concerns", "Conditions that affect the safe level of care"),
    ]),
    section("clearance", "Medical clearance", [
      pick("ms.clearance", "Medical clearance status", ["Documented by a clinician", "Pending", "Not cleared", "Not required at this level"], { required: true, hint: "A clinician documents clearance. Psyflo only organizes the evidence." }),
      text("ms.clearedby", "Cleared by (name and credential)"),
      date("ms.cleareddate", "Date of clearance"),
      long("ms.needed", "Information still needed"),
    ]),
  ],
};

/* ------------------------------------------------------------------ recovery environment */
const RECOVERY_ENV: ModuleSchema = {
  sections: [
    section("home", "Home and supports", [
      text("re.housing", "Housing", { required: true, evidence: ["housing", "homeless", "apartment", "lives with", "living with", "shelter", "rent", "evict"] }),
      long("re.supports", "Family and recovery supports", { required: true, evidence: ["family", "sister", "mother", "partner", "spouse", "support", "sponsor", "peer", "friends"] }),
      long("re.resources", "Recovery resources", { evidence: ["sponsor", "meeting", "peer recovery", "support group", "recovery coach", "church"] }),
    ]),
    section("risks", "Risks and barriers", [
      long("re.triggers", "Triggers and environmental risks", { evidence: ["trigger", "around", "neighborhood", "friends who", "stress", "using at home"] }),
      long("re.barriers", "Barriers to treatment", { required: true, evidence: ["barrier", "childcare", "transport", "cost", "schedule", "no ride"] }),
      text("re.transport", "Transportation", { evidence: ["transport", "ride", "bus", "car", "license"] }),
    ]),
    section("work", "Employment and legal", [
      text("re.employment", "Employment or school", { evidence: ["employ", "job", "work", "school"] }),
      text("re.legal", "Legal involvement", { evidence: ["court", "probation", "dui", "charge", "arrest"] }),
    ]),
  ],
};

/* ------------------------------------------------------------------ residential admission review */
const RESIDENTIAL_ADMISSION: ModuleSchema = {
  sections: [
    section("admission", "Proposed admission", [
      date("ra.date", "Proposed admission date", { required: true }),
      text("ra.facility", "Facility", { required: true, hint: "Use the name of the program, marked (fictional) in the demo." }),
      pick("ra.bed", "Bed or placement status", ["Bed available", "On the waitlist", "Not yet requested", "Placement unknown"], { required: true }),
      pick("ra.clearance", "Medical clearance status", ["Documented by a clinician", "Pending", "Not cleared", "Not required at this level"]),
      long("ra.logistics", "Admission logistics", { hint: "Transport to the facility, arrival time and who will meet the person." }),
      long("ra.belongings", "Belongings and medication plan"),
    ]),
    section("rationale", "Rationale and safety", [
      long("ra.why", "Why residential care", { required: true, evidence: ["residential", "unsafe", "relapse", "withdrawal", "daily", "structure", "24-hour", "step-down"] }),
      long("ra.lower", "Barriers to a lower level of care", { evidence: ["tried", "outpatient", "relapse", "no stable", "homeless", "unsafe", "missed"] }),
      long("ra.safety", "Safety considerations", { evidence: ["safety", "unsafe", "suicid", "violence", "fall", "seizure", "overdose"] }),
      long("ra.home", "Safety of the home environment", { evidence: ["home", "lives with", "using in the home", "alcohol in the home", "unsafe"] }),
    ]),
    section("discharge", "Discharge planning needs", [
      long("ra.discharge", "Anticipated discharge planning needs", { evidence: ["discharge", "step-down", "housing after", "aftercare", "follow-up"] }),
      text("ra.con", "Certification-of-need documentation (under 21)", { hint: "A placeholder for the documentation the federal rule asks for when a person under 21 enters a psychiatric facility. Not verified here." }),
    ]),
  ],
};

/* ------------------------------------------------------------------ score-entry instruments: the clinician types the result; Psyflo computes nothing */
const context = (p: string, what: string): SectionDef =>
  section("context", "Context", [
    long(`${p}.context`, `Why ${what} was administered`),
    long(`${p}.interp`, "Clinician's interpretation, in their own words", { hint: "Written by the clinician. Psyflo does not interpret the result or assign a severity." }),
    long(`${p}.action`, "Follow-up the clinician decided on"),
  ]);

const AUDIT: ModuleSchema = {
  scoreEntry: { name: "AUDIT / AUDIT-C", unit: "A number or label, as recorded on the administered form", note: "Enter the result from the version the clinician administered." },
  sections: [
    section("administration", "Version administered", [{ key: "audit.version", label: "Version", kind: "select", options: ["AUDIT", "AUDIT-C", "Another version"] }]),
    context("audit", "the alcohol screen"),
  ],
};
const DAST10: ModuleSchema = {
  scoreEntry: { name: "DAST-10", unit: "A number or label, as recorded on the administered form", note: "Enter the result from the form the clinician administered." },
  sections: [context("dast10", "the drug screen")],
};
const COWS: ModuleSchema = {
  scoreEntry: { name: "COWS", unit: "A number or label, as recorded on the administered form", note: "Enter the result of the assessment the clinician administered." },
  sections: [context("cows", "the opioid withdrawal assessment")],
};
const CIWA: ModuleSchema = {
  scoreEntry: { name: "CIWA-Ar", unit: "A number or label, as recorded on the administered form", note: "Enter the result of the assessment the clinician administered." },
  sections: [context("ciwa", "the alcohol withdrawal assessment")],
};

/** Authored forms for the sud modules. Each section lists documentation fields; none reproduces a licensed instrument. */
export const SUD_SCHEMAS: Partial<Record<ModuleId, ModuleSchema>> = {
  asam: ASAM,
  "sud-history": SUD_HISTORY,
  withdrawal: WITHDRAWAL,
  "medical-stability": MEDICAL_STABILITY,
  "recovery-env": RECOVERY_ENV,
  "residential-admission": RESIDENTIAL_ADMISSION,
  audit: AUDIT,
  dast10: DAST10,
  cows: COWS,
  ciwa: CIWA,
};
