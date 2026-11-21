import type { PayerId } from "@/lib/demo/types";

export type RuleDoc = {
  name: string;
  base: string;
  variants?: Partial<Record<PayerId, string>>;
};

/**
 * Payer × TRP (H2020) × Kentucky Medicaid: the packet every MCO expects,
 * with the deviations observed per payer. Demo values.
 */
export const RULE_DOCS: RuleDoc[] = [
  {
    name: "Cover sheet crosswalk",
    base: "Maps each criterion to the page that evidences it.",
    variants: {
      anthem: "Uploaded as its own document, never merged.",
      wellcare: "Uploaded as its own document, never merged.",
      humana: "Cites the MCG behavioral health guideline by section.",
    },
  },
  {
    name: "LOCUS score",
    base: "Administered within 90 days of submission.",
    variants: {
      wellcare: "Within 30 days for renewals since 1 Sep 2026 (CP-BH-114).",
    },
  },
  {
    name: "SMI checklist",
    base: "Serious mental illness eligibility checklist, signed.",
  },
  {
    name: "Intake assessment",
    base: "Biopsychosocial from admission, dated and signed.",
  },
  {
    name: "Signed treatment plan",
    base: "Current plan with measurable goals and visits per week.",
  },
  {
    name: "PHQ-9 / GAD-7",
    base: "Most recent administration; renewals show the trend.",
  },
  {
    name: "Psychiatric evaluation",
    base: "Within 12 months, medication list attached.",
  },
  {
    name: "PCH monthly note",
    base: "Primary care home note from the current month.",
  },
  {
    name: "Attendance summary",
    base: "Visits attended in the current window versus planned.",
    variants: {
      humana: "Must justify the 40-unit cap over a 13-week horizon.",
      aetna: "May include visits since the request date (Aetna backdates).",
    },
  },
];

/** Standing observations about each payer's handling of the packet. */
export const RULE_NOTES: Record<PayerId, string[]> = {
  aetna: [
    "Approval backdates to the request date, so care between request and decision is billable once approved.",
  ],
  anthem: [
    "Three separate uploads: assessments, external medical records, cover sheet. Merged PDFs are rejected as incomplete.",
    "Appeals need the member-signed authorization form.",
  ],
  humana: [
    "40-unit cap per authorization since Q1 2026; renewals fall due every ~13 weeks at 3 visits a week.",
  ],
  passport: [
    "Criteria set unconfirmed: the cover sheet cites LOCUS by default. Ask provider relations.",
    "Appeals by email with the member-signed form, 30-day window.",
  ],
  wellcare: [
    "Own portal, not Availity. Criteria set unconfirmed.",
    "Three-part packet. Partial approvals rising since Q1 2026.",
  ],
  medicare: [
    "Dual-eligibles: Medicare must deny before Kentucky Medicaid pays.",
  ],
};
