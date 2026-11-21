import type { DocKind, FormSpec } from "../../types";

/* The Lauris forms Harvest Outreach uses (original TDT / school-based content). Labels follow what Lauris prints;
   Psyflo never rewrites an EHR label ("consumer" stays "consumer" in Lauris even though the extension says "patient"). */

/** The approved intervention picklist (Lauris ISP 2.0 drop-down). Notes and goals may only use these names. */
export const PICKLIST = [
  "Clinical 2.1 Movement",
  "Clinical 2.2 Mindfulness and grounding",
  "QMHP 1.1 Identify and name feelings",
  "QMHP 1.2 Coping skills practice",
  "QMHP 1.3 Psychoeducation",
  "QMHP 1.4 Structured problem solving",
  "QMHP 1.5 Make or maintain friendships",
  "QMHP 1.6 Recognize danger / healthy boundaries",
  "QMHP 1.7 Social skills coaching",
  "QMHP 1.8 Family skills coaching",
  "QMHP 1.9 Solving peer conflict",
];

export const SELF_HARM = "Thoughts of self-harm";
export const AGGRESSION = "Aggression to others";
export const ELOPE = "Leaving the building (elopement)";
export const NO_RISK = "None";
/** The risk screen, in the order Lauris shows it (admission screening and intake). */
export const RISK_OPTIONS = [SELF_HARM, AGGRESSION, ELOPE, NO_RISK];

/** CANS rating scale. The CANS item list below is SHORTENED and SIMULATED for this demo: it is not the real instrument and it carries no text from the CANS manual. */
export const CANS_SCALE = ["0 – No evidence", "1 – Watchful waiting", "2 – Action needed", "3 – Immediate or intensive action"];

export interface CansItem { key: string; label: string }
export interface CansDomain { id: "behavioral" | "life" | "risk"; title: string; narrative: string; items: CansItem[] }
export const CANS_DOMAINS: CansDomain[] = [
  { id: "behavioral", title: "Behavioral/Emotional Needs", narrative: "n_behavioral", items: [
    { key: "r_attention", label: "Attention/Impulse" },
    { key: "r_oppositional", label: "Oppositional Behavior" },
    { key: "r_conduct", label: "Conduct" },
    { key: "r_anger", label: "Anger Control" },
    { key: "r_anxiety", label: "Anxiety" },
    { key: "r_trauma", label: "Adjustment to Trauma" },
  ] },
  { id: "life", title: "Life Domain Functioning", narrative: "n_life", items: [
    { key: "r_family", label: "Family Functioning" },
    { key: "r_school_behavior", label: "School Behavior" },
    { key: "r_school_attendance", label: "School Attendance" },
    { key: "r_peers", label: "Peer Relations" },
  ] },
  { id: "risk", title: "Risk Behaviors", narrative: "n_risk", items: [
    { key: "r_danger", label: "Danger to Others" },
    { key: "r_runaway", label: "Runaway/Elopement" },
  ] },
];
export const CANS_RATING_KEYS = CANS_DOMAINS.flatMap((d) => d.items.map((i) => i.key));

export const REFERRAL_SOURCES = ["School counselor", "Parent or guardian", "Physician", "Court or DSS", "Other"];
export const DX_OPTIONS = [
  "F91.3 · Oppositional defiant disorder",
  "F91.1 · Conduct disorder, childhood-onset type",
  "F90.2 · Attention-deficit/hyperactivity disorder, combined type",
  "F43.24 · Adjustment disorder with disturbance of conduct",
];
export const LOC_OPTIONS = ["Therapeutic Day Treatment", "Outpatient Counseling", "Case Management", "Psychiatric Services"];
export const DLOC_OPTIONS = ["Outpatient counseling plus school supports", "Outpatient counseling", "School supports only"];
export const HOUSEHOLD_INCLUDE = "Include in this request";
export const HOUSEHOLD_LEAVE_OUT = "Leave out of this request";

const dpn: FormSpec = {
  kind: "dpn",
  title: "Daily Progress Note – TDT",
  short: "Daily progress note",
  laurisName: "Daily Progress Note – TDT",
  sections: [
    { id: "session", title: "Session", fields: [
      { key: "date", label: "Service date", kind: "date" },
      { key: "service", label: "Service", kind: "text" },
    ] },
    { id: "plan", title: "Goal and interventions", fields: [
      { key: "goal", label: "Treatment goal (from ISP 2.0)", kind: "textarea", rows: 2 },
      { key: "ints", label: "Interventions (ISP picklist)", kind: "checks", options: PICKLIST },
    ] },
    { id: "note", title: "Note", fields: [
      { key: "intervention", label: "Intervention performed", kind: "textarea", rows: 4 },
      { key: "duration", label: "Duration", kind: "text" },
      { key: "response", label: "Consumer response", kind: "textarea", rows: 4 },
      { key: "progress", label: "Progress or barriers", kind: "textarea", rows: 3 },
      { key: "needs", label: "Continuing clinical needs", kind: "textarea", rows: 3 },
    ] },
  ],
};

const admission: FormSpec = {
  kind: "admission",
  title: "Admission Screening",
  short: "Admission screening",
  laurisName: "Admission Screening",
  sections: [
    { id: "applicant", title: "Applicant and referral", fields: [
      { key: "referral", label: "Referral source", kind: "select", options: REFERRAL_SOURCES },
      { key: "initial", label: "Date of Initial Contact", kind: "date" },
      { key: "guardian", label: "Name of guardian and relationship", kind: "text" },
      { key: "completed", label: "Screening completed by", kind: "text" },
      { key: "school", label: "School and setting", kind: "text" },
    ] },
    { id: "screening", title: "Screening", fields: [
      { key: "concerns", label: "Presenting Needs or Situation, as gathered from a full review of all information gathered", kind: "textarea", rows: 8 },
      { key: "iep", label: "IEP in place", kind: "yesno" },
      { key: "risk", label: "Risk screen", kind: "checks", options: RISK_OPTIONS },
      { key: "meds", label: "Current Medications", kind: "text" },
      { key: "trauma", label: "Trauma-informed care: evidence of trauma and the plan", kind: "textarea", rows: 3,
        hint: "Abuse, neglect, sexual or domestic violence, natural disasters, systemic discrimination, racism, medical trauma, accidents, death of loved one, etc." },
      { key: "safety", label: "Safety plan needed", kind: "yesno" },
    ] },
    { id: "signature", title: "Signature", fields: [
      { key: "sig", label: "Clinical Screening Staff · signature", kind: "text", lock: true },
    ] },
  ],
};

const intake: FormSpec = {
  kind: "intake",
  title: "Comprehensive Needs Assessment",
  short: "Intake (CNA)",
  laurisName: "Comprehensive Needs Assessment",
  sections: [
    { id: "problem", title: "Presenting problem", fields: [
      { key: "reason", label: "Presenting Issue/Reason for Referral:", kind: "textarea", rows: 4 },
    ] },
    { id: "history", title: "History", fields: [
      { key: "mhhx", label: "Mental Health History (Include Hospitalizations, Diagnoses Given, Etc.):", kind: "textarea", rows: 3 },
      { key: "mhfam", label: "Mental Health History of Family Members:", kind: "textarea", rows: 2 },
      { key: "medh", label: "Significant past and present medical problems, illnesses, injuries, and any current physical complaints:", kind: "textarea", rows: 3 },
    ] },
    { id: "family", title: "Family and social", fields: [
      { key: "housing", label: "Housing arrangements:", kind: "textarea", rows: 2 },
      { key: "routine", label: "Daily routine, structure, and sleeping patterns:", kind: "textarea", rows: 2 },
    ] },
    { id: "school", title: "School functioning", fields: [
      { key: "school", label: "Current school and grade:", kind: "text" },
      { key: "iep", label: "Special education/IEP status/504 plan:", kind: "text" },
      { key: "abs", label: "Unexcused absences this school year:", kind: "text" },
      { key: "susp", label: "Suspensions and days out of school:", kind: "text" },
      { key: "classes", label: "Classes taking and classes passing:", kind: "text" },
    ] },
    { id: "prior", title: "Prior services", fields: [
      { key: "prior", label: "Previous Interventions · Outpatient Counseling (provider, dates of service, response to treatment):", kind: "textarea", rows: 3 },
    ] },
    { id: "strengths", title: "Strengths", fields: [
      { key: "strengths", label: "Strengths, needs, abilities, and preferences:", kind: "textarea", rows: 3 },
    ] },
    { id: "risk", title: "Risk", fields: [
      { key: "risk", label: "Risk (check all that apply):", kind: "checks", options: RISK_OPTIONS },
    ] },
    { id: "summary", title: "Clinical summary", fields: [
      { key: "summary", label: "Overall summary addressing the causes of the presenting treatment issues, treatment options, and outcomes:", kind: "textarea", rows: 6, lock: true },
    ] },
    { id: "diagnosis", title: "Diagnosis", fields: [
      { key: "dx", label: "Diagnosis", kind: "select", options: DX_OPTIONS, lock: true },
    ] },
    { id: "loc", title: "Recommended level of care", fields: [
      { key: "loc", label: "Service Recommendations:", kind: "select", options: LOC_OPTIONS, lock: true },
    ] },
    { id: "signature", title: "Signature", fields: [
      { key: "sig", label: "Harvest Staff · signature", kind: "text", lock: true },
    ] },
  ],
};

/* CANS: SHORTENED AND SIMULATED for the demo. Twelve rated items in three domains, a narrative box per domain and a strengths box.
   Every rating is clinical judgement (lock: Psyflo reads it, may flag a mismatch, and never drafts or types it). */
const assessment: FormSpec = {
  kind: "assessment",
  title: "CANS – Child and Adolescent Needs and Strengths",
  short: "CANS (shortened)",
  laurisName: "CANS – Child and Adolescent Needs and Strengths",
  sections: [
    ...CANS_DOMAINS.map((d, di) => ({
      id: d.id,
      title: d.title,
      fields: [
        ...d.items.map((i, ii) => ({
          key: i.key, label: i.label, kind: "select" as const, options: CANS_SCALE, lock: true,
          ...(di === 0 && ii === 0 ? { hint: "Shortened list, simulated for this demo." } : {}),
        })),
        { key: d.narrative, label: `${d.title} · narrative`, kind: "textarea" as const, rows: 4 },
      ],
    })),
    { id: "strengths", title: "Strengths", fields: [
      { key: "n_strengths", label: "Strengths · narrative", kind: "textarea", rows: 3 },
    ] },
  ],
};

const sra: FormSpec = {
  kind: "sra",
  title: "CMHRS Continued Stay Service Authorization Request",
  short: "Continued stay request (SRA)",
  laurisName: "Continued Stay Service Authorization Request",
  sections: [
    { id: "request", title: "Request for approval of services", fields: [
      { key: "from", label: "Request from (date)", kind: "date" },
      { key: "to", label: "Request to (date)", kind: "date" },
      { key: "units", label: "Total units of service", kind: "text" },
      { key: "hours", label: "Hours of service per week", kind: "text" },
      { key: "proc", label: "Procedure code", kind: "text" },
      { key: "admit", label: "Initial admission date to services", kind: "date" },
      { key: "avg", label: "Average units per week", kind: "text" },
    ] },
    { id: "diagnosis", title: "Diagnosis", fields: [
      { key: "dx", label: "Primary ICD-10 diagnosis", kind: "text", lock: true },
    ] },
    { id: "s1", title: "Section I: Care coordination", fields: [
      { key: "coord", label: "Describe Care Coordination activities with other services and providers since the last authorization:", kind: "textarea", rows: 4 },
    ] },
    { id: "s2", title: "Section II: Treatment progress", fields: [
      { key: "g1_obj", label: "Goal 1 of 3 · Goal/Objective", kind: "textarea", rows: 2 },
      { key: "g1_progress", label: "Goal 1 · Progress toward Goal/Objective:", kind: "textarea", rows: 4 },
      { key: "g1_lack", label: "Goal 1 · Lack of Progress and Changes made to ISP to address this:", kind: "textarea", rows: 4 },
      { key: "g2_obj", label: "Goal 2 of 3 · Goal/Objective", kind: "textarea", rows: 2 },
      { key: "g2_progress", label: "Goal 2 · Progress toward Goal/Objective:", kind: "textarea", rows: 3 },
      { key: "g2_lack", label: "Goal 2 · Lack of Progress and Changes made to ISP to address this:", kind: "textarea", rows: 3 },
      { key: "g3_obj", label: "Goal 3 of 3 · Goal/Objective", kind: "textarea", rows: 2 },
      { key: "g3_progress", label: "Goal 3 · Progress toward Goal/Objective:", kind: "textarea", rows: 3 },
      { key: "g3_lack", label: "Goal 3 · Lack of Progress and Changes made to ISP to address this:", kind: "textarea", rows: 3 },
      { key: "family", label: "For IIH and TDT: Overview of family involvement during service period with regards to the individual’s ISP:", kind: "textarea", rows: 4 },
    ] },
    { id: "s3", title: "Section III: Discharge planning", fields: [
      { key: "discharge", label: "DISCHARGE PLAN (Identify lower levels of care, natural supports, warm-hand off, care coordination needs)", kind: "textarea", rows: 4 },
      { key: "ddate", label: "Estimated Date of Discharge", kind: "text" },
      { key: "dloc", label: "Recommended level of care at discharge", kind: "select", options: DLOC_OPTIONS },
    ] },
    { id: "notes", title: "Notes section", fields: [
      { key: "notes", label: "Notes section", kind: "textarea", rows: 3 },
      { key: "household", label: "Oct 16 guardian contact · household detail", kind: "select", options: [HOUSEHOLD_INCLUDE, HOUSEHOLD_LEAVE_OUT],
        hint: "Held out of the request until the clinician decides." },
    ] },
  ],
};

export const forms: Partial<Record<DocKind, FormSpec>> = { dpn, admission, intake, assessment, sra };
