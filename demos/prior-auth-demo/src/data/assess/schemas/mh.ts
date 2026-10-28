import type { FieldDef, FieldKind, ModuleId, ModuleSchema, SectionDef } from "../types";

/* Authored forms for the mental health modules, the generic modules both mental health and substance use programs share (psychiatric history,
   treatment history, functional assessment, level-of-care review, discharge planning, continued stay), the CANS and Level of Need completion
   shells, and the score-entry shells for the screening instruments.

   Documentation fields only. No criteria, no item text and no scoring of any licensed instrument is reproduced here: for an instrument the clinician
   types the result they obtained from the administered tool, the date and who administered it. Psyflo proposes nothing diagnostic and decides nothing
   about safety. Field ids are stable ("psychiatric.presenting"): the evidence reader, the readiness cards and the saved records refer to them. */

const f = (key: string, label: string, kind: FieldKind, extra: Partial<FieldDef> = {}): FieldDef => ({ key, label, kind, ...extra });
const sec = (id: string, label: string, fields: FieldDef[], hint?: string): SectionDef => ({ id, label, fields, ...(hint ? { hint } : {}) });

/** The levels a clinician can confirm in a level-of-care review: names only. */
export const LOC_LEVELS = ["Outpatient", "IOP", "PHP", "Residential/Inpatient"];
export const LOC_CRITERIA_NOTE = "The organization's criteria and payer criteria are not loaded; a clinician confirms the level and the medical necessity statement.";
/** What a licensed level-of-care instrument module says until the organization connects its licensed tool. */
export const LICENSED_NOT_LOADED = "Not loaded; enter the result and the recommended level from your licensed tool.";
/** The C-SSRS result label that sends the person to a clinician. */
export const CSSRS_POSITIVE = "Positive screen: clinician review required";

const RISK_WORDS = /\b(suicid\w*|self[- ]?harm\w*|thoughts? of (death|dying|killing)|wish(es)? (to be dead|to die)|intent to (die|harm|kill)|plan to (end|harm|kill)|attempt\w*)\b/i;
const NEGATED = /\b(denies|denied|denying|no (current |recent |known )?(thoughts?|plan|intent|ideation|history|attempts?)|negative|without|not (present|endorsed|reported))\b/i;

/** Every reason a C-SSRS record goes to a clinician. A result label that says positive, a typed result that says positive, or risk wording in what the
    clinician wrote (a sentence that denies it does not count). It only routes: Psyflo never decides whether a person is safe. */
export function cssrsReviewReasons(fields: Record<string, { value: string }>, score?: { value: string }): string[] {
  const out: string[] = [];
  if (fields["cssrs.result"]?.value === CSSRS_POSITIVE) out.push("The clinician recorded a positive C-SSRS screen.");
  const typed = score?.value ?? "";
  if (/\bpositive\b/i.test(typed) && !/\bnegative\b/i.test(typed)) out.push("The clinician recorded a positive C-SSRS result.");
  for (const key of ["cssrs.concerns", "cssrs.actions"]) {
    const sentence = (fields[key]?.value ?? "").split(/(?<=[.!?])\s+|\n+/).find((x) => RISK_WORDS.test(x) && !NEGATED.test(x));
    if (sentence) out.push(`The C-SSRS record describes risk: “${sentence.trim().slice(0, 140)}”.`);
  }
  return out;
}
/** The first reason, or null. */
export const cssrsReviewReason = (fields: Record<string, { value: string }>, score?: { value: string }): string | null => cssrsReviewReasons(fields, score)[0] ?? null;

/** Words a person uses to record a result of an instrument. A short, plain set of fields for each screening module. */
function screening(id: string, name: string, extra: FieldDef[], scoreUnit: string, note: string): ModuleSchema {
  return {
    sections: [
      sec("result", `${name} result`, [
        f(`${id}.administeredOn`, "Date administered", "date", { required: true }),
        f(`${id}.administeredBy`, "Administered by", "text", { required: true, hint: "The person who gave the instrument, with their credentials." }),
        ...extra,
      ], `Record the result you obtained from the administered ${name}. Psyflo does not reproduce the items, calculate a score or assign a severity.`),
    ],
    scoreEntry: { name, unit: scoreUnit, note },
  };
}

export const MH_SCHEMAS: Partial<Record<ModuleId, ModuleSchema>> = {
  psychiatric: {
    sections: [
      sec("presenting", "Presenting problem and symptoms", [
        f("psychiatric.presenting", "Presenting problem", "long", { required: true, evidence: ["presenting", "reason for referral", "asking for", "since", "concern"] }),
        f("psychiatric.symptoms", "Current symptoms (clinician's narrative)", "long", { required: true, evidence: ["mood", "tearful", "anxious", "panic", "sleep", "voices", "hallucinat", "depress", "withdrawn"] }),
        f("psychiatric.mse", "Mental status observations", "long", { hint: "What the clinician observed in the session, in their own words." }),
      ]),
      sec("history", "History and treatment", [
        f("psychiatric.history", "Psychiatric history", "long", { evidence: ["history of", "first episode", "hospitali", "admitted", "previous episode", "diagnosed"] }),
        f("psychiatric.providers", "Current providers", "long", { evidence: ["psychiatrist", "therapist", "counselor", "case manager", "provider"] }),
        f("psychiatric.medications", "Medication list and adherence", "long", { required: true, evidence: ["mg", "medication", "sertraline", "fluoxetine", "risperidone", "aripiprazole", "adherence", "taking"] }),
        f("psychiatric.response", "Response to prior treatment", "long", { evidence: ["helped", "response", "did not help", "stopped working", "side effects"] }),
      ]),
      sec("impressions", "Diagnostic impressions", [
        f("psychiatric.impressions", "Diagnostic impressions as documented by the clinician", "long", { hint: "Written by the clinician. Psyflo proposes no diagnosis, and a diagnosis found in a document is shown as that document's statement." }),
      ]),
    ],
  },

  "symptom-severity": {
    sections: [
      sec("severity", "Current symptoms", [
        f("symptom-severity.description", "Clinician's description of current symptoms", "long", { required: true, evidence: ["symptom", "mood", "anxiety", "panic", "sleep", "appetite", "energy"] }),
        f("symptom-severity.frequency", "How often", "text", { evidence: ["daily", "weekly", "times a week", "most days", "nightly"] }),
        f("symptom-severity.duration", "How long", "text", { evidence: ["weeks", "months", "since", "for the past"] }),
        f("symptom-severity.impact", "Impact on daily life", "long", { required: true, evidence: ["missed", "unable", "stopped", "difficulty", "affects", "work", "school"] }),
        f("symptom-severity.change", "Change since the last contact", "long"),
      ], "Describe severity in words. Psyflo does not rate or score it. A result from a measure you administered goes in the PHQ-9 or GAD-7 module."),
    ],
  },

  "acute-symptoms": {
    sections: [
      sec("acute", "Acute symptom review", [
        f("acute-symptoms.onset", "When the acute symptoms began", "text", { required: true, evidence: ["began", "onset", "started", "since", "last week"] }),
        f("acute-symptoms.triggers", "What set them off", "long", { evidence: ["after", "trigger", "loss", "stress", "stopped taking", "change"] }),
        f("acute-symptoms.course", "How they have changed since", "long", { required: true, evidence: ["worse", "better", "improved", "escalat", "course", "since admission"] }),
        f("acute-symptoms.crisis", "Recent crisis contacts, emergency or hospital use", "long", { evidence: ["emergency", "crisis", "988", "mobile crisis", "admitted", "discharged", "inpatient"] }),
      ], "A clinician reviews any safety concern directly. Safety information is recorded in the safety assessment and the C-SSRS module."),
    ],
  },

  biopsychosocial: {
    sections: [
      sec("factors", "Biological, psychological and social factors", [
        f("biopsychosocial.biological", "Biological: medical conditions, medications, sleep, appetite", "long", { evidence: ["medical", "medication", "sleep", "appetite", "chronic", "pain"] }),
        f("biopsychosocial.psychological", "Psychological: mood, coping, thinking, past experiences", "long", { evidence: ["coping", "mood", "trauma", "stress", "worry"] }),
        f("biopsychosocial.social", "Social: housing, relationships, work or school, money", "long", { evidence: ["lives with", "housing", "family", "friends", "work", "school", "income"] }),
        f("biopsychosocial.strengths", "Strengths and supports", "long", { evidence: ["strength", "supportive", "enjoys", "good at", "motivated"] }),
      ]),
      sec("formulation", "Narrative", [
        f("biopsychosocial.formulation", "Clinician's narrative: how these factors fit together", "long", { required: true }),
      ]),
    ],
  },

  "psych-history": {
    sections: [
      sec("history", "Psychiatric history", [
        f("psych-history.summary", "Psychiatric history summary", "long", { required: true, evidence: ["history of", "diagnos", "first episode", "hospitali", "admitted", "previous episode", "since age"] }),
        f("psych-history.diagnoses", "Diagnoses documented in the record, with who made them and when", "long", { hint: "As the source documents state them. Psyflo proposes no diagnosis." }),
        f("psych-history.hospitalizations", "Psychiatric hospitalizations and crisis use", "long", { evidence: ["hospital", "admitted", "inpatient", "crisis", "emergency"] }),
        f("psych-history.current", "Current psychiatric treatment and providers", "long", { required: true, evidence: ["psychiatrist", "therapist", "medication", "clinic", "case manager"] }),
        f("psych-history.safety", "Safety concerns in the history, as a clinician documented them", "long", { hint: "A clinician reviews any risk statement. Psyflo never decides whether a person is safe." }),
      ]),
    ],
  },

  "treatment-history": {
    sections: [
      sec("prior", "Prior and current services", [
        f("treatment-history.services", "Prior and current services", "long", { required: true, evidence: ["therapy", "counseling", "program", "treatment", "services", "sessions", "episode"] }),
        f("treatment-history.dates", "Dates and length of each", "long"),
        f("treatment-history.outcomes", "What helped and what did not", "long", { required: true, evidence: ["helped", "did not help", "improved", "no change", "dropped out", "completed"] }),
        f("treatment-history.lower", "Lower levels of care tried, and why they were not enough", "long"),
        f("treatment-history.ended", "Why earlier treatment ended", "long", { evidence: ["discharged", "moved", "ended", "lost coverage", "stopped"] }),
      ]),
    ],
  },

  "functional-assessment": {
    sections: [
      sec("areas", "Functioning by area", [
        f("functional-assessment.daily", "Daily living: self-care, routines, medications, home", "long", { required: true, evidence: ["daily living", "self-care", "routine", "hygiene", "meals", "budget"] }),
        f("functional-assessment.workSchool", "Work or school", "long", { evidence: ["work", "job", "school", "grades", "attendance", "missed"] }),
        f("functional-assessment.relationships", "Relationships and family", "long", { evidence: ["family", "friends", "conflict", "isolated", "relationship"] }),
        f("functional-assessment.community", "Community participation", "long", { evidence: ["community", "activities", "leaves the house", "transportation"] }),
      ]),
      sec("overall", "Overall", [
        f("functional-assessment.impact", "How symptoms or substance use affect functioning, in the clinician's words", "long", { required: true }),
      ]),
    ],
  },

  "loc-review": {
    sections: [
      sec("rationale", "Clinical rationale", [
        f("loc-review.rationale", "Clinical rationale for this level of care", "long", { required: true, hint: "In the clinician's words: why this level fits now, and what a lower level would not provide." }),
        f("loc-review.frequency", "Proposed frequency and intensity", "text", { hint: "For example, days per week and hours per day, as the program offers them." }),
        f("loc-review.engagement", "Engagement and supports", "long", { evidence: ["motivated", "engaged", "attends", "supportive", "family", "transportation"] }),
        f("loc-review.lower", "What was tried at a lower level of care", "long"),
        f("loc-review.necessity", "Medical necessity statement, as the clinician wrote it", "long", { hint: "Written and confirmed by the clinician. Psyflo does not draft a conclusion." }),
      ]),
      {
        id: "level", label: "Level of care", type: "loc-review", locOptions: LOC_LEVELS, hint: LOC_CRITERIA_NOTE,
        fields: [],
      },
    ],
  },

  "discharge-planning": {
    sections: [
      sec("plan", "Transition plan", [
        f("discharge-planning.nextLevel", "Anticipated next level of care or service", "text", { required: true, hint: "The clinician's plan in words. It is not a decision to discharge." }),
        f("discharge-planning.targetDate", "Target transition date", "date"),
        f("discharge-planning.supports", "Supports in place after the transition", "long", { required: true, evidence: ["family", "supports", "sponsor", "sober living", "case manager", "follow-up"] }),
        f("discharge-planning.appointments", "Follow-up appointments arranged", "long"),
        f("discharge-planning.medications", "Medication plan at the transition", "long"),
        f("discharge-planning.housing", "Where the person will live", "text", { evidence: ["housing", "lives with", "shelter", "sober living", "apartment"] }),
        f("discharge-planning.risks", "Risks at the transition and how they will be handled", "long"),
      ]),
    ],
  },

  "continued-stay": {
    sections: [
      sec("review", "Continued-stay review", [
        f("continued-stay.progress", "Progress since admission", "long", { required: true, evidence: ["progress", "improved", "attending", "since admission", "goals"] }),
        f("continued-stay.barriers", "Barriers to progress", "long", { evidence: ["barrier", "missed", "transportation", "housing", "refused", "relapse"] }),
        f("continued-stay.justification", "Why this level of care is still needed (the clinician's justification)", "long", { required: true, hint: "Written by the clinician. Psyflo does not draft a conclusion." }),
        f("continued-stay.plan", "Plan for the next review period", "long", { required: true }),
        f("continued-stay.reviewDate", "Review date", "date"),
      ]),
    ],
  },

  /* The CANS and Level of Need modules draw their own screens (pages/intake/cans). These shells give the readiness cards and the left navigation one
     number to read: a required field the store fills only when the work behind it is complete. */
  cans: {
    sections: [
      sec("completion", "Assessment items", [
        f("cans.items", "Every assessment item addressed", "text", { required: true, hint: "Filled by the CANS screen when every item has a rating label or a note." }),
      ]),
    ],
  },
  lon: {
    sections: [
      sec("review", "Level of Need review", [
        f("lon.review", "A clinician recorded the review disposition", "text", { required: true, hint: "Filled when a qualified clinician records the disposition. It is never a level." }),
      ]),
    ],
  },

  /* Screening and criteria instruments: a result typed from the administered tool. */
  phq9: screening("phq9", "PHQ-9", [
    f("phq9.label", "Result label as you recorded it", "text", { hint: "Your own words or the label your administration guide uses. Psyflo assigns none." }),
    f("phq9.followUp", "Follow-up you planned", "long"),
  ], "Total the clinician recorded", "Enter the result you obtained. The items are not reproduced and nothing is calculated."),
  gad7: screening("gad7", "GAD-7", [
    f("gad7.label", "Result label as you recorded it", "text", { hint: "Your own words or the label your administration guide uses. Psyflo assigns none." }),
    f("gad7.followUp", "Follow-up you planned", "long"),
  ], "Total the clinician recorded", "Enter the result you obtained. The items are not reproduced and nothing is calculated."),
  cssrs: screening("cssrs", "C-SSRS", [
    f("cssrs.result", "Screener result label", "select", {
      required: true, options: ["Screen result documented", "Negative screen documented", CSSRS_POSITIVE, "Not administered: reason in notes"],
      hint: "Choose the label that matches the result you obtained. A positive screen goes to a clinician; Psyflo never decides safety.",
    }),
    f("cssrs.concerns", "Concerns the clinician noted", "long", { hint: "A clinician reviews anything written here that describes risk." }),
    f("cssrs.actions", "What the clinician did next", "long", { hint: "For example a safety plan, a consult, a crisis referral or a follow-up date." }),
  ], "Result recorded by the clinician", "Enter the result you obtained from the screener you administered. Psyflo does not ask its questions or decide risk."),
  locus: screening("locus", "LOCUS", [
    f("locus.recommendedLevel", "Recommended level from your licensed tool", "text", { required: true }),
    f("locus.edition", "Tool version or edition used", "text"),
    f("locus.reasoning", "Your reasoning if you chose a different level", "long"),
  ], "Result from your licensed tool", LICENSED_NOT_LOADED),
  calocus: screening("calocus", "CALOCUS-CASII", [
    f("calocus.recommendedLevel", "Recommended level from your licensed tool", "text", { required: true }),
    f("calocus.edition", "Tool version or edition used", "text"),
    f("calocus.reasoning", "Your reasoning if you chose a different level", "long"),
  ], "Result from your licensed tool", LICENSED_NOT_LOADED),
};
