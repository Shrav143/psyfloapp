import type { FieldSpec, FormSpec } from "../../types";

/* The Lauris forms of the sample treatment center. Labels follow what Lauris prints. The dimension scale is SHORTENED and SIMULATED for this demo: it is not the ASAM text. */

export const PLAN_GOALS = [
  "Goal 1 – Stabilize withdrawal and cravings",
  "Goal 2 – Build a relapse-prevention plan",
  "Goal 3 – Treat depression and anxiety",
  "Goal 4 – Housing, supports and aftercare",
];
export const SAFETY_DPN = ["Thoughts of self-harm", "Thoughts of harming others", "Intoxicated or withdrawing on arrival", "None reported"];
export const SAFETY_ADM = ["Thoughts of self-harm", "Thoughts of harming others", "None"];
export const REFERRALS = ["Self", "Emergency department", "Hospital detox", "Court or probation", "Another provider", "Other"];
export const SUBSTANCES = ["Alcohol", "Opioids", "Stimulants", "Cannabis", "Benzodiazepines", "Other"];
export const HOUSING = ["Stable", "Unstable", "No housing"];
export const LEVELS = ["Detox", "Residential 3.5", "PHP", "IOP"];
export const SCALE = ["0 – No risk", "1 – Low risk", "2 – Moderate risk", "3 – High risk", "4 – Severe risk"];
export const DIMENSIONS: { n: 1 | 2 | 3 | 4 | 5 | 6; label: string }[] = [
  { n: 1, label: "Dimension 1 · Withdrawal potential" },
  { n: 2, label: "Dimension 2 · Medical conditions" },
  { n: 3, label: "Dimension 3 · Mood and thinking" },
  { n: 4, label: "Dimension 4 · Readiness to change" },
  { n: 5, label: "Dimension 5 · Relapse potential" },
  { n: 6, label: "Dimension 6 · Recovery environment" },
];
/** Wording that describes the person by the condition, or judges them. Person-first wording is the clinic's standard. */
export const STIGMA_RE = /\b(addict|junkie|drunk|alcoholic|abuser|dirty|non-?compliant|drug[- ]seeking|manipulative)\b/i;

const sig: FieldSpec = { key: "sig", label: "Signature", kind: "text", lock: true, hint: "Only the clinician signs." };

const dpn: FormSpec = {
  kind: "dpn", title: "Daily Progress Note", short: "Daily progress note", laurisName: "Daily Progress Note",
  sections: [
    { id: "session", title: "Session", fields: [
      { key: "date", label: "Service date", kind: "date" },
      { key: "service", label: "Service", kind: "select", options: ["Individual session", "Group session", "Family session"] },
      { key: "duration", label: "Duration", kind: "text", hint: "Minutes of direct time." },
    ] },
    { id: "note", title: "Note", fields: [
      { key: "goal", label: "Treatment plan goal", kind: "select", options: PLAN_GOALS },
      { key: "intervention", label: "Intervention performed", kind: "textarea", rows: 4 },
      { key: "response", label: "Patient response", kind: "textarea", rows: 4 },
      { key: "sx", label: "Craving, withdrawal and mood today", kind: "textarea", rows: 3, hint: "Scores, or what the patient reported." },
      { key: "risk", label: "Safety screen today", kind: "checks", options: SAFETY_DPN },
      { key: "plan", label: "Plan for the next session", kind: "textarea", rows: 3 },
      sig,
    ] },
  ],
};

const admission: FormSpec = {
  kind: "admission", title: "Admission Screening", short: "Admission screening", laurisName: "Admission Screening",
  sections: [
    { id: "ref", title: "Referral", fields: [
      { key: "date", label: "Screening date", kind: "date" },
      { key: "referral", label: "Referred by", kind: "select", options: REFERRALS },
    ] },
    { id: "use", title: "Use and withdrawal", fields: [
      { key: "substances", label: "Substances used in the last 30 days", kind: "checks", options: SUBSTANCES },
      { key: "lastuse", label: "Last use", kind: "text" },
      { key: "withdrawal", label: "Withdrawal symptoms now", kind: "textarea", rows: 3 },
    ] },
    { id: "safe", title: "Safety and home", fields: [
      { key: "safety", label: "Safety screen", kind: "checks", options: SAFETY_ADM },
      { key: "housing", label: "Housing", kind: "select", options: HOUSING },
      { key: "support", label: "Home and supports", kind: "textarea", rows: 3 },
    ] },
    { id: "req", title: "Request", fields: [
      { key: "loc", label: "Level of care requested", kind: "select", options: LEVELS },
      { key: "why", label: "Why this level of care", kind: "textarea", rows: 4 },
      sig,
    ] },
  ],
};

const intake: FormSpec = {
  kind: "intake", title: "Biopsychosocial Intake", short: "Intake", laurisName: "Biopsychosocial Intake",
  sections: [
    { id: "hx", title: "History", fields: [
      { key: "usehx", label: "Substance use history", kind: "textarea", rows: 4 },
      { key: "prior", label: "Prior treatment", kind: "textarea", rows: 3 },
      { key: "medical", label: "Medical history and medications", kind: "textarea", rows: 3 },
      { key: "mh", label: "Mental health history", kind: "textarea", rows: 3 },
    ] },
    { id: "life", title: "Home, work and supports", fields: [
      { key: "social", label: "Home, work and supports", kind: "textarea", rows: 3 },
      { key: "legal", label: "Legal involvement", kind: "yesno" },
      { key: "strengths", label: "Strengths", kind: "textarea", rows: 3 },
      { key: "goals", label: "What the patient wants from treatment", kind: "textarea", rows: 3 },
      sig,
    ] },
  ],
};

const assessment: FormSpec = {
  kind: "assessment", title: "ASAM Assessment Summary", short: "Assessment summary", laurisName: "ASAM Assessment Summary",
  sections: [
    ...DIMENSIONS.map((d) => ({
      id: `d${d.n}`, title: d.label,
      fields: [
        { key: `d${d.n}`, label: "Rating", kind: "select" as const, options: SCALE, hint: "Simulated scale for this demo; not the ASAM text." },
        { key: `n${d.n}`, label: "What supports the rating", kind: "textarea" as const, rows: 2 },
      ],
    })),
    { id: "rec", title: "Recommendation", fields: [
      { key: "loc", label: "Recommended level of care", kind: "select", options: LEVELS },
      { key: "rationale", label: "Rationale", kind: "textarea", rows: 4 },
      sig,
    ] },
  ],
};

export const forms: Partial<Record<"dpn" | "admission" | "intake" | "assessment", FormSpec>> = { dpn, admission, intake, assessment };
