import { cx, mx, type Block, type TurnSpec } from "./scriptBlocks";

/* Interview blocks for mental health, community, children and coordinated specialty care programs. See scriptBlocks.ts. */

const T = (by: TurnSpec["by"], text: string, more: Partial<TurnSpec> = {}): TurnSpec => ({ by, text, ...more });
const needs = <V,>(v: V | undefined, make: (v: V) => TurnSpec[]): TurnSpec[] => (v ? make(v) : []);

/* ------------------------------------------------------------------ mental health */
export const MH_BLOCKS: Block[] = [
  {
    id: "mh-history", label: "Psychiatric history", modules: ["psychiatric", "psych-history"], order: 110,
    turns: (p) => needs(p.mh, (m) => [
      T("clin", "Tell me about your mental health history: diagnoses you've been told about, hospital stays, and who has treated you."),
      T("main", m.history, { note: { history: m.historyNote }, fields: [mx("psychiatric", ["history", "hospital", "diagnos", "provider"], "Psychiatric history", m.historyNote, "high"), mx("psych-history", ["hospital", "history", "diagnos"], "Hospital stays", m.historyNote, "high")] }),
    ]),
  },
  {
    id: "mh-severity", label: "Symptom severity", modules: ["symptom-severity"], order: 120,
    turns: (p) => needs(p.mh, (m) => [
      T("clin", "How often do these symptoms happen, how strong are they, and how does that compare with a few months ago?"),
      T("main", m.severity, { note: { hpi: m.severityNote }, fields: [mx("symptom-severity", ["frequency", "intensity", "duration", "change", "describe"], "How often and how strong", m.severityNote)] }),
    ]),
  },
  {
    id: "mh-recent", label: "Acute symptoms and recent crisis", modules: ["acute-symptoms"], order: 130,
    turns: (p) => needs(p.mh, (m) => [
      T("clin", "What has happened recently: emergency visits, a hospital stay, crisis calls?"),
      T("main", m.recent, {
        note: { hpi: m.recentNote },
        fields: [mx("acute-symptoms", ["recent", "crisis", "hospital", "onset", "course", "emergency"], "Recent acute symptoms", m.recentNote, "high")],
        missing: ["Discharge summary from the inpatient stay"],
      }),
    ]),
  },
  {
    id: "mh-tried", label: "Treatment history", modules: ["treatment-history"], order: 140,
    turns: (p) => needs(p.mh, (m) => [
      T("clin", "What have you tried before, at a lower level of care, and what happened?"),
      T("main", m.tried, { note: { history: m.triedNote }, fields: [mx("treatment-history", ["prior", "previous", "tried", "outcome", "helped", "lower"], "What was tried before", m.triedNote, "high")] }),
    ]),
  },
];

/* ------------------------------------------------------------------ community services (CPST and similar) */
export const COMMUNITY_BLOCKS: Block[] = [
  {
    id: "community-needs", label: "Functional needs", modules: ["functional-needs", "cpst-review"], order: 110,
    turns: (p) => needs(p.community, (c) => [
      T("clin", "What do you need help with day to day to stay well and take part in your community?"),
      T("main", c.needs, { note: { functional: c.needsNote }, fields: [mx("functional-needs", ["need", "help", "daily", "support"], "What the person needs help with", c.needsNote, "high"), cx("Functioning", c.needsNote, "high")] }),
    ]),
  },
  {
    id: "community-living", label: "Community supports", modules: ["community-living"], order: 120,
    turns: (p) => needs(p.community, (c) => [
      T("clin", "Tell me about where you live, what a usual week looks like, and who helps."),
      T("main", c.living, { note: { strengths: c.livingNote }, fields: [mx("community-living", ["housing", "living", "community", "natural", "support", "week"], "Living situation and supports", c.livingNote), cx("Supports and strengths", c.livingNote, "high")] }),
    ]),
  },
  {
    id: "community-services", label: "Services the person asks for", modules: ["cpst-review"], order: 130,
    turns: (p) => needs(p.community, (c) => [
      T("clin", "What kind of help are you hoping for? I'm only asking what you'd like; the clinician reviews the options with you."),
      T("main", c.services, { note: { plan: c.servicesNote }, fields: [mx("cpst-review", ["services", "goals", "requested", "frequency", "who"], "What the person asks for", c.servicesNote)] }),
    ]),
  },
];

/* ------------------------------------------------------------------ children and families */
export const YOUTH_BLOCKS: Block[] = [
  {
    id: "youth-school", label: "School functioning", modules: ["school-functioning", "school-family"], order: 140,
    turns: (p) => needs(p.youth, (y) => [
      T("clin", "How is school going: attendance, grades, behavior, and any supports in place?"),
      T("main", y.school, { note: { functional: y.schoolNote }, fields: [mx("school-functioning", ["attendance", "grades", "behavior", "school", "support", "504", "iep"], "School functioning", y.schoolNote, "high"), cx("School", y.schoolNote, "high")] }),
    ]),
  },
  {
    id: "youth-family", label: "Family and caregiver", modules: ["family-community", "caregiver-coordination"], order: 150,
    turns: (p) => needs(p.youth, (y) => [
      T("clin", "Who is at home, how is the family doing, and how do you want to take part in care?"),
      T("cg", y.family, { note: { strengths: y.familyNote }, fields: [mx("family-community", ["family", "live", "home", "stress", "strength", "community"], "Family and home", y.familyNote), mx("caregiver-coordination", ["caregiver", "participation", "contact", "consent"], "Caregiver", y.familyNote), cx("Family", y.familyNote)] }),
    ]),
  },
  {
    id: "youth-coordination", label: "School and family coordination", modules: ["school-family", "caregiver-coordination"], order: 160,
    turns: (p) => needs(p.youth, (y) => [
      T("clin", "Is it all right with you if we talk with the school counselor? I'd need a signed release."),
      T("cg", y.coordination, { note: { plan: y.coordinationNote }, fields: [mx("school-family", ["contact", "release", "coordination", "school", "family"], "Contact with the school", y.coordinationNote)], missing: ["School release of records (signature)"] }),
    ]),
  },
];

/* ------------------------------------------------------------------ coordinated specialty care */
export const CSC_BLOCKS: Block[] = [
  {
    id: "csc-course", label: "Psychosis onset and course", modules: ["psychosis-course"], order: 110,
    turns: (p) => needs(p.csc, (c) => [
      T("clin", "When did you first notice changes, and how have things developed since? Any treatment before the hospital?"),
      T("main", c.course, { note: { hpi: c.courseNote }, fields: [mx("psychosis-course", ["onset", "course", "began", "duration", "untreated", "hospital", "treatment"], "Onset and course", c.courseNote, "high")] }),
    ]),
  },
  {
    id: "csc-changes", label: "Functional changes", modules: ["functional-changes"], order: 120,
    turns: (p) => needs(p.csc, (c) => [
      T("clin", "What has changed in school, work, friendships and taking care of yourself since this began?"),
      T("main", c.changes, { note: { functional: c.changesNote }, fields: [mx("functional-changes", ["change", "school", "work", "relationship", "self-care", "since"], "What changed since onset", c.changesNote, "high"), cx("Functioning", c.changesNote)] }),
    ]),
  },
  {
    id: "csc-family", label: "Family and social supports", modules: ["family-supports"], order: 130,
    turns: (p) => needs(p.csc, (c) => [
      T("clin", "Who is involved in your life right now, and who would like to take part in your care?"),
      T("cg", c.family, { note: { strengths: c.familyNote }, fields: [mx("family-supports", ["family", "involved", "role", "willing", "support"], "Who is involved", c.familyNote, "high"), cx("Supports and strengths", c.familyNote, "high")] }),
    ]),
  },
  {
    id: "csc-coordination", label: "Referral coordination", modules: ["referral-coordination", "multidisciplinary-plan"], order: 140,
    turns: (p) => needs(p.csc, (c) => [
      T("clin", "May we share information with the hospital team and the college so everyone works from one plan? I'd need releases."),
      T("cg", c.coordination, { note: { plan: c.coordinationNote }, fields: [mx("referral-coordination", ["consent", "partner", "referral", "release", "coordinat"], "Consent to coordinate", c.coordinationNote)], missing: ["Signed releases for the hospital and the college"] }),
    ]),
  },
];

/* ------------------------------------------------------------------ applied behavior analysis */
export const ABA_BLOCKS: Block[] = [
  {
    id: "aba-development", label: "Developmental history", modules: ["developmental-history"], order: 110,
    turns: (p) => needs(p.aba, (a) => [
      T("clin", "Tell me about his development: when he first talked, walked, and anything that worried you early on."),
      T("main", a.development, { note: { history: a.developmentNote }, fields: [mx("developmental-history", ["milestone", "early", "development", "speech", "walk", "concern"], "Milestones and early concerns", a.developmentNote, "high")] }),
    ]),
  },
  {
    id: "aba-diagnosis", label: "Diagnostic information", modules: ["diagnostic-info"], order: 120,
    turns: (p) => needs(p.aba, (a) => [
      T("clin", "Has he had an evaluation? Who did it, when, and do you have the report?"),
      T("main", a.diagnosis, { note: { history: a.diagnosisNote }, fields: [mx("diagnostic-info", ["evaluation", "who", "when", "report", "diagnos", "source"], "Evaluation on file", a.diagnosisNote)], missing: ["Diagnostic evaluation report"] }),
    ]),
  },
  {
    id: "aba-adaptive", label: "Adaptive functioning", modules: ["adaptive-functioning"], order: 130,
    turns: (p) => needs(p.aba, (a) => [
      T("clin", "How does he communicate, play, and take care of himself day to day?"),
      T("main", a.adaptive, { note: { functional: a.adaptiveNote }, fields: [mx("adaptive-functioning", ["communication", "daily", "social", "skills", "adaptive", "play"], "Daily skills as the caregiver describes them", a.adaptiveNote)] }),
    ]),
  },
  {
    id: "aba-behaviors", label: "Target behaviors", modules: ["behavioral-assessment", "fba"], order: 140,
    turns: (p) => needs(p.aba, (a) => [
      T("clin", "What behaviors are hardest, how often do they happen, and what usually comes right before and after?"),
      T("main", a.behaviors, { note: { hpi: a.behaviorsNote }, fields: [mx("behavioral-assessment", ["behavior", "frequency", "target", "how often", "duration"], "Behaviors the caregiver reports", a.behaviorsNote, "high"), mx("fba", ["antecedent", "consequence", "before", "after", "setting"], "What comes before and after", a.behaviorsNote)] }),
    ]),
  },
  {
    id: "aba-caregiver", label: "Caregiver participation", modules: ["caregiver-participation"], order: 150,
    turns: (p) => needs(p.aba, (a) => [
      T("clin", "How would you like to take part in sessions, and when can you come?"),
      T("main", a.caregiver, { note: { plan: a.caregiverNote }, fields: [mx("caregiver-participation", ["caregiver", "participation", "training", "schedule", "attend"], "Caregiver participation", a.caregiverNote, "high")] }),
    ]),
  },
  {
    id: "aba-goals", label: "Goals for treatment", modules: ["aba-goals", "aba-intensity"], order: 160,
    turns: (p) => needs(p.aba, (a) => [
      T("clin", "What would you most like him to be able to do in the next six months? Hours and goals are written by the clinician; I'm only noting what you'd like."),
      T("main", a.goals, { note: { plan: a.goalsNote }, fields: [mx("aba-goals", ["goal", "skill", "build", "reduce", "progress"], "What the caregiver hopes for", a.goalsNote)] }),
    ]),
  },
];

export const PROGRAM_BLOCKS: Block[] = [...MH_BLOCKS, ...COMMUNITY_BLOCKS, ...YOUTH_BLOCKS, ...CSC_BLOCKS, ...ABA_BLOCKS];
