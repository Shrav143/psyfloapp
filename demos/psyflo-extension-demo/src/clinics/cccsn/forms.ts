import type { FieldSpec, FormSpec, SectionSpec } from "../../types";

/* CCCSN's Lauris forms. Labels follow the clinic's own Lauris forms (substance use treatment, ASAM criteria). */

export const SERVICES = [
  "H0015 · IOP (1 unit = 1 hour)",
  "H0005 · Group (Level 1)",
  "H0004 · Individual (Level 1, per 15 min)",
  "90837 · Individual therapy (mental health)",
];

/** The clinic's intervention list. The first word is the code the treatment plan uses. */
export const INTERVENTIONS = [
  "MI Motivational interviewing",
  "CBT-RP Relapse prevention (CBT)",
  "MAT-C MAT coordination",
  "SS Seeking Safety (trauma-informed)",
  "PS Peer recovery support",
  "RP-G Relapse prevention group",
  "FAM Family / support-person session",
];

export const SUBSTANCES = [
  "Opioids (fentanyl / heroin / pills)",
  "Alcohol",
  "Stimulants (methamphetamine / cocaine)",
  "Cannabis",
  "Benzodiazepines / sedatives",
];

export const REFERRAL_SOURCES = [
  "Self-referral",
  "Clark County drug court",
  "Nevada Parole & Probation (P&P)",
  "Hospital ED / UMC",
  "HIV clinic partner",
];

export const HIV_OPTIONS = ["Not asked", "Offered · client declined to share", "Shared · see chart"];

export const RISK = ["0", "1", "2", "3", "4"];

export const LEVELS = [
  "Level 1 · Outpatient",
  "Level 2.1 · Intensive outpatient (IOP)",
  "Level 2.5 · Partial hospitalization",
  "Level 3.1 · Clinically managed low-intensity residential",
  "Level 3.5 · Clinically managed high-intensity residential",
  "Withdrawal management first (refer out)",
];

/** The six ASAM dimensions, named the way the clinic's forms name them. */
export const DIMENSIONS: [string, string][] = [
  ["D1", "Acute intoxication / withdrawal potential"],
  ["D2", "Biomedical conditions"],
  ["D3", "Emotional, behavioral or cognitive conditions"],
  ["D4", "Readiness to change"],
  ["D5", "Relapse, continued use or continued problem potential"],
  ["D6", "Recovery / living environment"],
];

export const REQUESTS = [
  "Continued stay · 36 units (12 IOP days)",
  "Continued stay · 15 units (5 sessions)",
  "Step-down to Level 1 outpatient",
];

const field = (f: FieldSpec): FieldSpec => f;

const dpn: FormSpec = {
  kind: "dpn",
  title: "Group / Individual Progress Note",
  short: "Progress note",
  laurisName: "Group / Individual Progress Note",
  sections: [
    {
      id: "service", title: "Service",
      fields: [
        field({ key: "date", label: "Date of service", kind: "date" }),
        field({ key: "service", label: "Service", kind: "select", options: SERVICES }),
        field({ key: "time", label: "Time in session", kind: "text", hint: "For example 9:00 am – 12:00 pm" }),
        field({ key: "units", label: "Units", kind: "text", hint: "H0015: 1 unit = 1 hour" }),
      ],
    },
    {
      id: "plan", title: "Plan and intervention",
      fields: [
        field({ key: "goal", label: "Plan objective addressed", kind: "text", hint: "Name the goal from the treatment plan" }),
        field({ key: "ints", label: "Interventions used", kind: "checks", options: INTERVENTIONS }),
        field({ key: "intervention", label: "Intervention performed", kind: "textarea", rows: 3, hint: "What staff did, not what staff saw" }),
      ],
    },
    {
      id: "response", title: "Client response",
      fields: [
        field({ key: "checkin", label: "Check-in (mood · cravings)", kind: "text" }),
        field({ key: "response", label: "Client response", kind: "textarea", rows: 3, hint: "What the client said or did" }),
        field({ key: "uds", label: "UDS collected today", kind: "yesno" }),
      ],
    },
    {
      id: "next", title: "Plan",
      fields: [
        field({ key: "plan", label: "Plan / next steps", kind: "textarea", rows: 2 }),
        field({ key: "sig", label: "Clinician signature", kind: "text", lock: true }),
      ],
    },
  ],
};

const admission: FormSpec = {
  kind: "admission",
  title: "Admission (ASAM screening)",
  short: "Admission screening",
  laurisName: "Admission (ASAM screening)",
  sections: [
    {
      id: "referral", title: "Referral",
      fields: [
        field({ key: "date", label: "Date of screening", kind: "date" }),
        field({ key: "source", label: "Referral source", kind: "select", options: REFERRAL_SOURCES }),
        field({ key: "partner", label: "Referral partner", kind: "text" }),
        field({ key: "payer", label: "Medicaid", kind: "text" }),
        field({ key: "release", label: "Release on file (42 CFR Part 2)", kind: "yesno" }),
      ],
    },
    {
      id: "use", title: "Substance use and withdrawal (D1)",
      fields: [
        field({ key: "subs", label: "Substances used", kind: "checks", options: SUBSTANCES }),
        field({ key: "use", label: "Substance use (substance · last use · route · frequency · amount)", kind: "textarea", rows: 4 }),
        field({ key: "withdrawal", label: "Withdrawal risk (D1)", kind: "textarea", rows: 3 }),
      ],
    },
    {
      id: "health", title: "Medical and mental health (D2, D3)",
      fields: [
        field({ key: "meds", label: "MAT / medications · prescriber", kind: "textarea", rows: 3 }),
        field({ key: "overdose", label: "Overdose history · naloxone", kind: "text" }),
        field({ key: "mh", label: "Mental health · safety (D3)", kind: "textarea", rows: 3 }),
      ],
    },
    {
      id: "history", title: "Readiness, history and living situation (D4 to D6)",
      fields: [
        field({ key: "reason", label: "Reason for seeking treatment (own words)", kind: "text" }),
        field({ key: "prior", label: "Prior treatment (provider · level · dates · outcome)", kind: "textarea", rows: 4 }),
        field({ key: "legal", label: "Legal involvement / drug court", kind: "textarea", rows: 2 }),
        field({ key: "housing", label: "Housing / living situation", kind: "textarea", rows: 2 }),
        field({ key: "strengths", label: "Strengths / recovery supports", kind: "text" }),
        field({ key: "hiv", label: "HIV / HCV status (optional)", kind: "select", options: HIV_OPTIONS, hint: "Offer it; the client may skip it" }),
      ],
    },
    {
      id: "summary", title: "Summary and decision",
      fields: [
        field({ key: "summary", label: "Narrative summary", kind: "textarea", rows: 5 }),
        field({ key: "meets", label: "Meets admission criteria?", kind: "yesno", lock: true }),
        field({ key: "dx", label: "Preliminary diagnosis", kind: "text", lock: true }),
        field({ key: "sig", label: "Screener signature", kind: "text", lock: true }),
      ],
    },
  ],
};

const dimensionSections: SectionSpec[] = DIMENSIONS.map(([d, name], i) => ({
  id: `dim${i + 1}`,
  title: `${d} · ${name}`,
  fields: [
    field({ key: `d${i + 1}r`, label: `${d} risk rating (0–4)`, kind: "select", options: RISK, hint: "0 none · 1 low · 2 moderate · 3 high · 4 severe", lock: true }),
    field({ key: `d${i + 1}n`, label: `${d} rationale`, kind: "textarea", rows: 3, hint: "Why this rating, in words" }),
  ],
}));

const assessment: FormSpec = {
  kind: "assessment",
  title: "ASAM Assessment",
  short: "ASAM assessment",
  laurisName: "ASAM Assessment",
  sections: [
    {
      id: "assessment", title: "Assessment",
      fields: [
        field({ key: "date", label: "Date of assessment", kind: "date" }),
        field({ key: "uds", label: "UDS at assessment (date · result)", kind: "text" }),
      ],
    },
    ...dimensionSections,
    {
      id: "recommendation", title: "Recommendation",
      fields: [
        field({ key: "loc", label: "Level-of-care recommendation", kind: "select", options: LEVELS, lock: true }),
        field({ key: "sig", label: "Clinician signature", kind: "text", lock: true }),
      ],
    },
  ],
};

const sra: FormSpec = {
  kind: "sra",
  title: "Continued Stay / Prior Authorization Request",
  short: "Continued stay request",
  laurisName: "Continued Stay / Prior Authorization Request",
  sections: [
    {
      id: "request", title: "Request · Level 2.1 IOP (H0015)",
      fields: [
        field({ key: "date", label: "Date of request", kind: "date" }),
        field({ key: "member", label: "Member", kind: "text" }),
        field({ key: "auth", label: "Current authorization", kind: "text" }),
        field({ key: "used", label: "Units used", kind: "text" }),
        field({ key: "request", label: "Request", kind: "select", options: REQUESTS }),
      ],
    },
    {
      id: "evidence", title: "Evidence since admission",
      fields: [
        field({ key: "attendance", label: "IOP attendance", kind: "textarea", rows: 2 }),
        field({ key: "uds", label: "UDS results in treatment", kind: "textarea", rows: 2 }),
        field({ key: "dims", label: "Dimension changes since admission (D1–D6)", kind: "textarea", rows: 4 }),
      ],
    },
    {
      id: "necessity", title: "Medical necessity",
      fields: [
        field({ key: "d5", label: "D5 · why Level 2.1 is still needed", kind: "textarea", rows: 4 }),
        field({ key: "stepdown", label: "Step-down readiness (continued-service criteria)", kind: "textarea", rows: 3 }),
        field({ key: "coord", label: "Care coordination", kind: "textarea", rows: 2 }),
        field({ key: "barriers", label: "Barriers", kind: "textarea", rows: 2 }),
      ],
    },
    {
      id: "attest", title: "Attestation",
      fields: [field({ key: "attest", label: "Clinician attestation and signature", kind: "text", lock: true })],
    },
  ],
};

export const forms: Record<"dpn" | "admission" | "assessment" | "sra", FormSpec> = { dpn, admission, assessment, sra };
