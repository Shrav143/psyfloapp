import type { AssessmentRule, Level, ModuleId, ProgramId, RuleModule } from "./types";

/* The assessment rules. Each row says which modules a program needs and why, and carries its source, version, status and reviewer.
   A change of policy is a change of a row here, not of a screen. Status is honest: only dated service availability comes from DMAS materials;
   every other row is an organization protocol, a draft, or a demo configuration. Nothing here is a payer's published rule. */

export const RULES_VERSION = "va-assess-2027.1";
const UPDATED = "2026-10-19";

const mod = (id: ModuleId, level: Level, reason: string, label?: string, when?: RuleModule["when"]): RuleModule => ({ id, level, reason, label, when });
const req = (id: ModuleId, reason: string, label?: string, when?: RuleModule["when"]) => mod(id, "required", reason, label, when);
const rec = (id: ModuleId, reason: string, label?: string, when?: RuleModule["when"]) => mod(id, "recommended", reason, label, when);
const opt = (id: ModuleId, reason: string, label?: string, when?: RuleModule["when"]) => mod(id, "optional", reason, label, when);

const SUD: ProgramId[] = ["sud-op", "sud-iop", "sud-php", "sud-res", "sud-wm", "sud-inpt", "otp", "obot"];
const MH_ACUTE: ProgramId[] = ["mh-iop", "mh-php", "youth-iop", "youth-php"];

const base = { states: ["VA"], version: RULES_VERSION, updated: UPDATED };
const ORG = { ...base, source: "org_protocol" as const, status: "demo" as const, reviewer: "Clinical director (demo)" };
const STATE_UNVERIFIED = { ...base, source: "state_policy" as const, status: "unverified" as const, reviewer: "Pending assignment" };
const STATE_DRAFT = { ...base, source: "state_policy" as const, status: "draft" as const, reviewer: "Pending assignment" };
const DEMO = { ...base, source: "demo" as const, status: "demo" as const, reviewer: "Not a payer policy" };

export const RULES: AssessmentRule[] = [
  /* ------------------------------------------------------------ every program */
  {
    ...ORG, id: "core", label: "Core intake modules", programs: "all",
    modules: [
      req("patient-referral", "Every intake records who the person is and why they were referred."),
      req("insurance", "Coverage is verified before services are requested."),
      req("clinical-history", "Every intake records diagnoses, history and medications."),
      req("safety", "Safety and risk are documented by a clinician in every intake."),
      req("social-functional", "Housing, school or work, family and functioning shape every care plan."),
      req("clinical-notes", "Clinician notes and uploaded records are kept with the assessment."),
      req("review-signoff", "A qualified clinician reviews and signs the assessment."),
    ],
    credentials: "A licensed clinician completes and signs the assessment. Required credentials follow the program's policy and are not verified in the demo.",
    signoff: "Clinician attestation is required before care planning.",
  },

  /* ------------------------------------------------------------ substance use disorder */
  {
    ...STATE_UNVERIFIED, id: "sud-asam", label: "ASAM level-of-care framework for ARTS", programs: SUD, sourceRef: "bhServices",
    modules: [rec("asam", "ARTS level-of-care decisions use the ASAM Criteria. The edition each plan requires is not verified here.")],
    framework: { id: "asam", label: "ASAM Criteria", edition: "Fourth edition (demo configuration)" },
    credentials: "Clinician qualified to complete an ASAM multidimensional assessment (per policy; not verified).",
    note: "The ASAM Criteria are licensed. Psyflo organizes documentation by dimension and never assigns a placement.",
  },
  {
    ...STATE_UNVERIFIED, id: "sud-asam-required", label: "ASAM required for ARTS treatment levels", programs: ["sud-iop", "sud-php", "sud-res", "sud-wm", "sud-inpt", "sud-op"], sourceRef: "bhServices",
    modules: [req("asam", "ARTS level-of-care decisions use the ASAM Criteria. The edition each plan requires is not verified here.")],
  },
  {
    ...ORG, id: "sud-core", label: "SUD core documentation", programs: SUD,
    modules: [
      req("sud-history", "Substances, frequency, last use and prior treatment support the level of care."),
      req("recovery-env", "Housing, supports and risks in the recovery environment decide how much structure is needed."),
      req("treatment-history", "Prior treatment and what helped informs the plan."),
      rec("psych-history", "Co-occurring psychiatric conditions are common and change the level of care.", "Psychiatric comorbidities"),
      opt("phq9", "Depression screen for co-occurring symptoms."),
      opt("gad7", "Anxiety screen for co-occurring symptoms."),
      opt("cssrs", "Suicide-risk screen, administered by a clinician."),
      opt("audit", "Alcohol use screen."),
      opt("dast10", "Drug use screen."),
      opt("biopsychosocial", "A narrative biopsychosocial assessment, if the program uses one."),
    ],
  },
  { ...ORG, id: "sud-op", label: "SUD outpatient", programs: ["sud-op"], modules: [rec("functional-assessment", "Functioning shows whether outpatient care is enough."), rec("loc-review", "A level-of-care review documents why outpatient fits.", "Level-of-care review")] },
  {
    ...ORG, id: "sud-iop", label: "SUD intensive outpatient", programs: ["sud-iop"],
    modules: [
      req("functional-assessment", "Functioning explains why more than weekly outpatient care is needed."),
      req("loc-review", "Documents why intensive outpatient is clinically appropriate, at what frequency and intensity.", "IOP level-of-care review"),
      opt("discharge-planning", "Plan the step-down early."),
    ],
  },
  {
    ...ORG, id: "sud-php", label: "SUD partial hospitalization", programs: ["sud-php"],
    modules: [
      req("functional-assessment", "Functioning shows why day-long structure is needed."),
      req("loc-review", "Documents why partial hospitalization is clinically appropriate.", "PHP level-of-care review"),
      rec("withdrawal", "Recent heavy use can need withdrawal and medical review."),
      opt("discharge-planning", "Plan the step-down early."),
    ],
  },
  {
    ...ORG, id: "sud-res", label: "SUD residential", programs: ["sud-res"],
    modules: [
      req("withdrawal", "Withdrawal risk and medical complications decide whether residential care is safe."),
      req("medical-stability", "A clinician documents medical stability or clearance before a residential admission."),
      req("psych-history", "Co-occurring psychiatric conditions affect residential placement.", "Psychiatric comorbidities"),
      req("residential-admission", "A residential admission needs the proposed admission, facility, bed status, clearance and rationale in one review."),
      req("loc-review", "Documents why residential care is clinically appropriate.", "Residential level-of-care review"),
      req("discharge-planning", "Residential care plans the discharge from the start."),
      rec("biopsychosocial", "A narrative assessment supports a residential admission."),
      opt("cows", "Opioid withdrawal assessment, if opioids are involved."),
      opt("ciwa", "Alcohol withdrawal assessment, if alcohol is involved."),
    ],
  },
  {
    ...ORG, id: "sud-wm", label: "Withdrawal management", programs: ["sud-wm", "sud-inpt"],
    modules: [
      req("withdrawal", "Withdrawal risk is the reason for this level of care."),
      req("medical-stability", "A clinician documents medical stability and the need for medical evaluation."),
      req("loc-review", "Documents why withdrawal management at this level is clinically appropriate.", "Withdrawal management level-of-care review"),
      rec("cows", "Opioid withdrawal assessment. Use it when opioids are involved."),
      rec("ciwa", "Alcohol withdrawal assessment. Use it when alcohol is involved."),
      rec("psych-history", "Co-occurring conditions affect the safe level of care.", "Psychiatric comorbidities"),
      opt("residential-admission", "If the person will step down into residential care."),
    ],
  },
  {
    ...ORG, id: "sud-mat", label: "Medication for opioid use disorder", programs: ["otp", "obot"],
    modules: [
      req("withdrawal", "Opioid use history, withdrawal and medical review precede starting medication.", "Medical review and withdrawal risk"),
      rec("cows", "Opioid withdrawal assessment before starting medication."),
      rec("loc-review", "A level-of-care review documents the setting that fits.", "Level-of-care review"),
    ],
  },

  /* ------------------------------------------------------------ mental health */
  {
    ...ORG, id: "mh-op", label: "Outpatient mental health", programs: ["mh-op"],
    modules: [
      rec("psychiatric", "A psychiatric assessment starts outpatient care."),
      rec("symptom-severity", "Baseline symptom severity measures progress."),
      rec("phq9", "Baseline depression screen."), rec("gad7", "Baseline anxiety screen."), rec("cssrs", "Suicide-risk screen, administered by a clinician."),
      opt("functional-assessment", "Functioning shows what to work on."),
      opt("biopsychosocial", "A narrative assessment, if the program uses one."),
    ],
  },
  {
    ...ORG, id: "mh-iop", label: "Mental health IOP", programs: ["mh-iop", "youth-iop"],
    modules: [
      req("psychiatric", "A psychiatric assessment starts IOP care.", "Psychiatric assessment"),
      req("symptom-severity", "Symptom severity is the baseline for IOP and for later reviews."),
      req("functional-assessment", "Functional impairment shows why IOP is needed.", "Functional impairment"),
      req("treatment-history", "Previous treatment shows what was tried at a lower level.", "Previous treatment"),
      req("loc-review", "Documents why intensive outpatient is clinically appropriate, at what frequency and intensity.", "Level-of-care review"),
      rec("phq9", "Baseline depression screen for progress measurement."), rec("gad7", "Baseline anxiety screen for progress measurement."), rec("cssrs", "Suicide-risk screen, administered by a clinician."),
      opt("audit", "Alcohol use screen for co-occurring use."), opt("dast10", "Drug use screen for co-occurring use."),
    ],
    note: "ASAM does not apply to a mental-health-only IOP. The CANS Lifetime is not associated with IOP in the published redesign materials.",
  },
  {
    ...ORG, id: "mh-php", label: "Mental health PHP", programs: ["mh-php", "youth-php"],
    modules: [
      req("psychiatric", "A comprehensive psychiatric assessment starts PHP care.", "Comprehensive psychiatric assessment"),
      req("acute-symptoms", "Acute symptoms and recent crisis use explain why a day program is needed."),
      req("functional-assessment", "Functional impairment shows why day-long structure is needed.", "Functional impairment"),
      req("treatment-history", "Treatment history shows what was tried at lower levels.", "Treatment history"),
      req("loc-review", "Documents why partial hospitalization is medically necessary in the clinician's judgment.", "PHP medical necessity documentation"),
      rec("phq9", "Baseline depression screen."), rec("gad7", "Baseline anxiety screen."), rec("cssrs", "Suicide-risk screen, administered by a clinician."),
    ],
  },
  {
    ...ORG, id: "mh-facility", label: "Psychiatric residential and inpatient", programs: ["mh-res", "mh-inpt", "prtf"],
    modules: [
      req("psychiatric", "A psychiatric assessment is the basis of a facility admission."),
      req("acute-symptoms", "Acute symptoms and safety explain why a facility level is needed."),
      req("functional-assessment", "Functional impairment shows the level of structure needed."),
      req("treatment-history", "Treatment history shows what was tried at lower levels."),
      req("loc-review", "Documents why a facility level of care is clinically appropriate."),
      req("discharge-planning", "Facility care plans the discharge from the start."),
      req("residential-admission", "An admission review documents the proposed admission, bed status and rationale. For a person under 21 it includes a placeholder for the certification-of-need documentation the federal rule requires (not verified).", undefined, { settings: ["residential"] }),
      rec("cssrs", "Suicide-risk screen, administered by a clinician."),
    ],
  },
  {
    ...ORG, id: "mh-community-team", label: "Assertive Community Treatment", programs: ["act"],
    modules: [
      req("psych-history", "ACT serves people with serious mental illness; history and hospital use show the need."),
      req("functional-needs", "Functional needs shape what the team provides."),
      req("community-living", "Housing and community living decide how much support is needed."),
      req("treatment-history", "Treatment history and hospital use show the need for a team."),
      rec("loc-review", "A review documents why a team-based service fits."),
      rec("cssrs", "Suicide-risk screen, administered by a clinician."),
    ],
  },

  /* ------------------------------------------------------------ community behavioral health */
  {
    ...STATE_DRAFT, id: "cpst-adult", label: "CPST: Adult, Community", programs: ["cpst-adult"], from: "2027-07-01", sourceRef: "cpstDraft",
    modules: [
      req("psych-history", "CPST documents the psychiatric history behind the request."),
      req("functional-needs", "CPST addresses functional needs in the community."),
      req("community-living", "CPST supports community living."),
      req("cans", "Published redesign materials associate the CANS Lifetime with CPST. Official items and scoring are not loaded."),
      req("lon", "The Level of Need Model is part of the redesign. No validated methodology is configured."),
      req("cpst-review", "A service review documents why CPST fits and what is outstanding."),
      rec("cssrs", "Suicide-risk screen, administered by a clinician."), opt("phq9", "Depression screen."), opt("gad7", "Anxiety screen."),
    ],
    framework: { id: "cans", label: "CANS Lifetime (Virginia)", edition: "Awaiting official item mapping" },
    credentials: "Assessor qualifications are pending DMAS policy.",
    note: "The CPST service description is a draft posted for comment.",
  },
  {
    ...STATE_DRAFT, id: "cpst-youth", label: "CPST: Youth", programs: ["cpst-youth", "cpst-school"], from: "2027-07-01", sourceRef: "schoolDraft",
    modules: [
      req("psych-history", "CPST documents the psychiatric history behind the request."),
      req("family-community", "Family and community context is central to youth CPST."),
      req("caregiver-coordination", "A caregiver takes part in youth CPST."),
      req("cans", "Published redesign materials associate the CANS Lifetime with CPST. Official items and scoring are not loaded."),
      req("lon", "The Level of Need Model is part of the redesign. No validated methodology is configured."),
      req("cpst-review", "A service review documents why CPST fits and what is outstanding."),
      mod("school-functioning", "recommended", "School functioning shows where the young person needs support."),
      rec("cssrs", "Suicide-risk screen, administered by a clinician."),
    ],
    framework: { id: "cans", label: "CANS Lifetime (Virginia)", edition: "Awaiting official item mapping" },
    credentials: "Assessor qualifications are pending DMAS policy.",
    note: "The youth CPST service descriptions are drafts posted for comment.",
  },
  {
    ...STATE_DRAFT, id: "cpst-school", label: "CPST: Youth, School Setting", programs: ["cpst-school"], from: "2027-07-01", sourceRef: "schoolDraft",
    modules: [
      req("school-functioning", "School Setting CPST is delivered at school; school functioning is the starting point."),
      req("school-family", "School Setting CPST coordinates with the school and the family."),
    ],
  },
  {
    ...STATE_UNVERIFIED, id: "clubhouse", label: "Mental health clubhouse", programs: ["clubhouse"], from: "2027-07-01", sourceRef: "qa2025",
    modules: [
      req("functional-needs", "Clubhouse supports daily functioning and work."), req("community-living", "Clubhouse supports community participation."),
      opt("cans", "Whether the Clubhouse requires the CANS Lifetime is unresolved in the published materials."),
    ],
  },
  { ...ORG, id: "mhcm", label: "Mental health case management", programs: ["mhcm"], modules: [req("functional-needs", "Case management follows functional needs."), req("community-living", "Housing and supports are the core of case management."), rec("treatment-history", "Existing services show what to coordinate.")] },
  { ...ORG, id: "cbbh", label: "Community-based behavioral health", programs: ["cbbh"], modules: [rec("functional-needs", "Functional needs shape community services."), rec("community-living", "Community living shapes community services.")] },

  /* ------------------------------------------------------------ coordinated specialty care */
  {
    ...STATE_DRAFT, id: "csc", label: "Coordinated Specialty Care", programs: ["csc"], from: "2027-07-01", sourceRef: "cscDraft",
    modules: [
      req("psych-history", "CSC documents the psychiatric history behind the referral."),
      req("psychosis-course", "CSC is for a first episode of psychosis; onset and course define eligibility to be reviewed."),
      req("functional-changes", "Functional change since onset shapes the plan."),
      req("family-supports", "Family and social supports take part in CSC."),
      req("cans", "Published redesign materials associate the CANS Lifetime with CSC. Official items and scoring are not loaded."),
      req("csc-criteria", "The program's own clinical criteria. None are loaded; this is a documentation placeholder."),
      req("multidisciplinary-plan", "CSC is delivered by a team with one plan."),
      req("referral-coordination", "CSC takes referrals from hospitals and clinics and coordinates with them."),
      opt("lon", "The Level of Need Model's applicability to CSC is not confirmed."),
      rec("cssrs", "Suicide-risk screen, administered by a clinician."),
    ],
    framework: { id: "cans", label: "CANS Lifetime (Virginia)", edition: "Awaiting official item mapping" },
    credentials: "Assessor qualifications are pending DMAS policy.",
  },

  /* ------------------------------------------------------------ children */
  {
    ...ORG, id: "aba", label: "Applied behavior analysis", programs: ["aba"],
    modules: [
      req("developmental-history", "ABA starts from the developmental history."),
      req("diagnostic-info", "ABA needs the diagnosis, who made it and the supporting evaluation."),
      req("adaptive-functioning", "Adaptive functioning documents what skills to build."),
      req("behavioral-assessment", "Target behaviors define the treatment."),
      rec("fba", "A functional behavioral assessment applies where behaviors need to be understood before treatment.", "Functional behavioral assessment (where applicable)"),
      req("aba-goals", "Goals say what treatment is for and how progress is measured."),
      req("caregiver-participation", "Caregivers take part in ABA."),
      req("aba-intensity", "Requested hours and settings need clinical reasoning."),
      opt("school-family", "Coordination with school and family."),
    ],
    credentials: "A qualified behavior analyst or licensed clinician completes the assessment (per policy; not verified).",
  },
  { ...ORG, id: "school-bh", label: "School-based behavioral health", programs: ["school-bh"], modules: [req("school-functioning", "School functioning is the starting point."), req("school-family", "School and family coordination is core."), req("family-community", "Family context shapes school support."), rec("functional-assessment", "Functional impact at school.")] },
  { ...ORG, id: "children-intensive", label: "Children's intensive services", programs: ["children-intensive"], modules: [req("family-community", "Family and community context."), req("caregiver-coordination", "Caregiver participation."), req("school-functioning", "School functioning."), req("functional-assessment", "Functional impairment.")] },
  { ...ORG, id: "family-based", label: "Family-based behavioral health", programs: ["family-based"], modules: [req("family-community", "Family context."), req("caregiver-coordination", "Caregiver participation."), rec("school-functioning", "School functioning.")] },

  /* ------------------------------------------------------------ other */
  { ...ORG, id: "general", label: "General behavioral health intake", programs: ["general"], modules: [rec("psych-history", "Psychiatric history."), rec("functional-assessment", "Functioning."), rec("biopsychosocial", "A narrative assessment helps choose a program."), opt("phq9", "Depression screen."), opt("gad7", "Anxiety screen."), opt("cssrs", "Suicide-risk screen.")] },
  { ...ORG, id: "custom", label: "Custom program", programs: ["custom"], modules: [opt("functional-assessment", "Add the modules this program uses.")], note: "A custom program starts with the core modules only. Add what the program needs." },

  /* ------------------------------------------------------------ population and setting */
  {
    ...ORG, id: "pop-youth", label: "Young people: family, school and developmental context", programs: "all", populations: ["adolescent", "child"],
    modules: [
      rec("caregiver-coordination", "A guardian takes part in care and consent for a young person."),
      rec("school-functioning", "School is where a young person's functioning shows."),
      rec("family-community", "Family and community context matters most for a young person."),
      rec("calocus", "Child and adolescent level-of-care instrument, if the payer's criteria use it. A licensed instrument; a placeholder.", undefined, undefined),
    ],
    note: "Medicaid medical necessity for people under 21 (EPSDT) is broader than for adults. Configured and not verified; do not apply adult criteria rigidly.",
  },
  {
    ...ORG, id: "pop-adult-criteria", label: "Adults: level-of-care instrument placeholder", programs: MH_ACUTE, populations: ["adult"],
    modules: [opt("locus", "Adult level-of-care instrument, if the payer's criteria use it. A licensed instrument; a placeholder.")],
  },
  { ...ORG, id: "set-school", label: "School setting", programs: "all", settings: ["school"], modules: [rec("school-family", "A school-based service coordinates with the school and family."), rec("school-functioning", "School functioning.")] },
  { ...ORG, id: "set-residential", label: "Residential setting", programs: "all", settings: ["residential"], modules: [rec("residential-admission", "A residential setting needs an admission review."), rec("discharge-planning", "Residential care plans discharge from the start.")] },

  /* ------------------------------------------------------------ demo payer rows: labeled as demonstrations, not payer policy */
  {
    ...DEMO, id: "demo-payer-sentara", label: "Demo payer row: Sentara Community Plan", programs: MH_ACUTE, payers: ["summit"], populations: ["adult"],
    modules: [rec("locus", "Demo row showing how a plan's criteria set becomes a module. It is not Sentara's policy.")],
    note: "A demonstration of payer-specific configuration. Replace it with the plan's verified rule.",
  },
  {
    ...DEMO, id: "demo-payer-ffs", label: "Demo payer row: Virginia Medicaid fee-for-service", programs: SUD, payers: ["beacon"],
    modules: [rec("audit", "Demo row showing a fee-for-service documentation preference. It is not DMAS's or Acentra's policy.")],
    note: "A demonstration of payer-specific configuration. Replace it with the verified rule.",
  },
];

export const ruleById = (id: string): AssessmentRule | undefined => RULES.find((r) => r.id === id);
