import { SCHEMAS } from "./schemas";
import type { ModuleDef, ModuleGroup, ModuleId, ModuleSchema, Population } from "./types";

/* Every module the engine can put in a plan. This is metadata: what the module is called and what kind it is. The fields of each live in
   schemas/ (authored per domain), so a module with no schema yet still renders a short documentation form. Licensed instruments are placeholders. */

const m = (id: ModuleId, group: ModuleGroup, kind: ModuleDef["kind"], label: string, description: string, extra: Partial<ModuleDef> = {}): ModuleDef => ({ id, group, kind, label, description, ...extra });
const YOUTH: Population[] = ["adolescent", "child"];

export const MODULES: ModuleDef[] = [
  /* core: one per workspace area */
  m("patient-referral", "core", "section", "Patient & referral", "Patient information, referral source and reason for referral."),
  m("insurance", "core", "section", "Insurance & eligibility", "Coverage, payer, member information and verification."),
  m("clinical-history", "core", "section", "Clinical history", "Diagnoses, psychiatric and medical history, medications and previous treatment."),
  m("safety", "core", "section", "Safety assessment", "Relevant safety and risk information, documented by a clinician."),
  m("social-functional", "core", "section", "Social & functional history", "Housing, employment, school, family, functioning and support systems."),
  m("clinical-notes", "core", "section", "Clinical documentation", "Assessment notes, uploaded records and clinician observations."),
  m("review-signoff", "core", "review", "Review & sign-off", "Completeness, unresolved issues and clinician approval."),

  /* substance use */
  m("sud-history", "sud", "section", "Substance use history", "Substances, frequency, duration, last use, route, prior treatment, overdose and recovery history."),
  m("asam", "sud", "framework", "ASAM multidimensional assessment", "Documentation organized by the six ASAM dimensions for the configured edition. Licensed criteria and placement logic are not reproduced.", { licensed: true }),
  m("withdrawal", "sud", "section", "Withdrawal & medical risk", "Current withdrawal concerns, previous complications, medical conditions, medications and need for medical evaluation."),
  m("medical-stability", "sud", "section", "Medical stability", "Medical clearance and conditions that affect the safe level of care."),
  m("psych-history", "mh", "section", "Psychiatric history", "Co-occurring symptoms, diagnoses, hospitalizations, safety concerns and current psychiatric treatment."),
  m("recovery-env", "sud", "section", "Recovery environment", "Housing, family support, environmental risks, recovery resources and barriers."),
  m("treatment-history", "mh", "section", "Treatment history", "Prior and current services, outcomes and what helped."),
  m("functional-assessment", "mh", "section", "Functional assessment", "How symptoms or substance use affect daily functioning, work, school and relationships."),
  m("loc-review", "mh", "review", "Level-of-care review", "Requested level of care, clinical findings, applicable criteria, missing evidence, clinician recommendation and the level the clinician confirms."),
  m("residential-admission", "sud", "review", "Residential admission review", "Proposed admission, facility, bed status, medical clearance, safety considerations, rationale and discharge planning needs."),
  m("discharge-planning", "mh", "section", "Discharge planning", "Anticipated next level of care, supports, appointments and risks at transition."),
  m("continued-stay", "mh", "review", "Continued-stay clinical review", "Progress, remaining needs, barriers and why this level of care still fits."),

  /* mental health */
  m("psychiatric", "mh", "section", "Psychiatric assessment", "Presenting symptoms, history, diagnoses, medications and mental status observations."),
  m("symptom-severity", "mh", "section", "Symptom severity", "Current symptoms, their frequency and intensity, and how they have changed."),
  m("acute-symptoms", "mh", "section", "Acute symptom review", "Recent acute symptoms, recent crisis or hospital use and why a lower level of care is not enough."),
  m("biopsychosocial", "mh", "section", "Biopsychosocial assessment", "Biological, psychological and social factors in one narrative."),

  /* screening and criteria instruments: the clinician enters the result of the administered instrument */
  m("phq9", "screening", "instrument", "PHQ-9", "Depression screening result entered by the clinician. Item text is not reproduced.", { licensed: true }),
  m("gad7", "screening", "instrument", "GAD-7", "Anxiety screening result entered by the clinician. Item text is not reproduced.", { licensed: true }),
  m("cssrs", "screening", "instrument", "C-SSRS", "Suicide-risk screening result entered by the clinician who administered it. Psyflo never decides risk.", { licensed: true }),
  m("audit", "screening", "instrument", "AUDIT / AUDIT-C", "Alcohol use screening result entered by the clinician.", { licensed: true }),
  m("dast10", "screening", "instrument", "DAST-10", "Drug use screening result entered by the clinician.", { licensed: true }),
  m("cows", "screening", "instrument", "COWS", "Opioid withdrawal assessment result entered by the clinician.", { licensed: true }),
  m("ciwa", "screening", "instrument", "CIWA-Ar", "Alcohol withdrawal assessment result entered by the clinician.", { licensed: true }),
  m("locus", "screening", "instrument", "LOCUS", "Adult level-of-care utilization system. A licensed instrument: a placeholder for the clinician's result and the payer's criteria.", { licensed: true, populations: ["adult"] }),
  m("calocus", "screening", "instrument", "CALOCUS-CASII", "Child and adolescent level-of-care instrument. A licensed instrument: a placeholder for the clinician's result and the payer's criteria.", { licensed: true, populations: YOUTH }),

  /* community services */
  m("functional-needs", "community", "section", "Functional needs", "What the person needs help with to live and participate in the community."),
  m("community-living", "community", "section", "Community living", "Housing, daily living skills, community participation and natural supports."),
  m("school-functioning", "children", "section", "School functioning", "Attendance, grades, behavior at school, supports in place and school contacts.", { populations: YOUTH }),
  m("family-community", "children", "section", "Family & community", "Who the young person lives with, family strengths and stressors, and community connections.", { populations: YOUTH }),
  m("caregiver-coordination", "children", "section", "Caregiver coordination", "Caregiver contact, consent, participation and what the caregiver needs.", { populations: YOUTH }),
  m("cans", "community", "framework", "CANS Lifetime (Virginia)", "The Virginia Comprehensive Assessment of Needs and Strengths. Official items and scoring are configured, never invented.", { licensed: true, special: "cans" }),
  m("lon", "community", "framework", "Level of Need", "A review connected to the CANS. No level is calculated without a validated methodology and a clinician's review.", { special: "lon" }),
  m("cpst-review", "community", "review", "CPST service review", "Whether and why CPST fits, what services the person needs and what is outstanding."),
  m("school-family", "children", "section", "School & family coordination", "Contacts, releases and a plan for coordinating with the school and family.", { populations: YOUTH }),

  /* coordinated specialty care */
  m("psychosis-course", "community", "section", "Psychosis onset & course", "When symptoms began, how they have progressed, treatment so far and duration of untreated psychosis."),
  m("functional-changes", "community", "section", "Functional changes", "Changes in school, work, relationships and self-care since symptoms began."),
  m("family-supports", "community", "section", "Family & social supports", "Who is involved, their role and their willingness to take part in care."),
  m("csc-criteria", "community", "section", "Additional CSC clinical criteria", "A placeholder for the program's own clinical criteria. None are loaded.", { licensed: true }),
  m("multidisciplinary-plan", "community", "section", "Multidisciplinary care planning", "Team members, their roles and the coordinated plan."),
  m("referral-coordination", "community", "section", "Referral coordination", "Referrals out or in, consents, destinations and follow-up."),

  /* applied behavior analysis */
  m("developmental-history", "children", "section", "Developmental history", "Milestones, early concerns, evaluations and relevant medical history.", { populations: YOUTH }),
  m("diagnostic-info", "children", "section", "Diagnostic information", "The diagnosis, who made it, when and the supporting evaluation.", { populations: YOUTH }),
  m("adaptive-functioning", "children", "section", "Adaptive functioning", "Communication, daily living and social skills, documented from an administered measure the clinician enters.", { populations: YOUTH }),
  m("behavioral-assessment", "children", "section", "Behavioral assessment", "Target behaviors, how often they occur and what surrounds them.", { populations: YOUTH }),
  m("fba", "children", "section", "Functional behavioral assessment", "What the behaviors accomplish for the child, where an FBA is applicable.", { populations: YOUTH }),
  m("aba-goals", "children", "section", "Treatment goals", "Skills to build and behaviors to reduce, with how progress will be measured.", { populations: YOUTH }),
  m("caregiver-participation", "children", "section", "Caregiver participation", "How caregivers take part, training and schedule.", { populations: YOUTH }),
  m("aba-intensity", "children", "section", "Requested treatment intensity", "Hours and settings requested, with the clinical reasoning.", { populations: YOUTH }),
];

export const MODULE_IDS = MODULES.map((x) => x.id);
export const moduleById = (id: ModuleId): ModuleDef => MODULES.find((x) => x.id === id) as ModuleDef;
export const CORE_MODULES: ModuleId[] = MODULES.filter((x) => x.group === "core").map((x) => x.id);
export const isCoreModule = (id: ModuleId): boolean => CORE_MODULES.includes(id);
/** Position in the catalog: the plan lists modules in this order within each group. */
export const moduleOrder = (id: ModuleId): number => MODULES.findIndex((x) => x.id === id);

/** A module's fields. A module with no authored schema gets a short documentation form, so every module in a plan renders. */
export function schemaOf(id: ModuleId): ModuleSchema {
  const authored = SCHEMAS[id];
  if (authored) return authored;
  const def = moduleById(id);
  return {
    sections: [{
      id: "documentation", label: def.label, hint: "Demo default fields. The authored form for this module is not loaded.",
      fields: [
        { key: "findings", label: "Clinical findings", kind: "long", required: true },
        { key: "evidence", label: "Supporting evidence and sources", kind: "long" },
        { key: "gaps", label: "Information still needed", kind: "long" },
      ],
    }],
  };
}
