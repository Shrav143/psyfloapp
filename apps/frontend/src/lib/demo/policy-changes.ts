import type { PayerId } from "./types";

/** Payer rule changes the Sentinel agent detected, with their impact on Harbor's packets. */
export type PolicyChange = {
  id: string;
  payerId: PayerId;
  effectiveDate: string;
  detectedAt: string;
  title: string;
  summary: string;
  impact: string;
  source: string;
  acknowledged: boolean;
};

export const POLICY_CHANGES: PolicyChange[] = [
  {
    id: "pc-1",
    payerId: "wellcare",
    effectiveDate: "2026-09-01",
    detectedAt: "2026-09-04",
    title: "TRP renewal now requires updated LOCUS score within 30 days",
    summary:
      "Clinical policy CP-BH-114 revised: renewals must include a LOCUS administered in the last 30 days, not 90.",
    impact:
      "Affects 9 renewals due in the next 30 days. Packet checklist updated.",
    source: "WellCare provider bulletin, Sep 2026",
    acknowledged: false,
  },
  {
    id: "pc-2",
    payerId: "humana",
    effectiveDate: "2026-01-15",
    detectedAt: "2026-01-22",
    title: "Unit cap reduced from 60 to 40 per authorization",
    summary:
      "Behavioral health UM guideline now caps H2020 at 40 units per 90-day window.",
    impact:
      "Renewals for Humana members now fall due every ~13 weeks at 3 visits/week.",
    source: "Humana Healthy Horizons UM guideline update",
    acknowledged: true,
  },
  {
    id: "pc-3",
    payerId: "anthem",
    effectiveDate: "2026-07-01",
    detectedAt: "2026-07-03",
    title: "Appeal packets must be submitted as three separate documents",
    summary:
      "Assessments, external medical records and cover sheet must be uploaded separately; merged PDFs are rejected as incomplete.",
    impact: "Packet builder splits exports automatically for Anthem.",
    source: "Anthem Medicaid provider manual, Jul 2026",
    acknowledged: true,
  },
  {
    id: "pc-4",
    payerId: "passport",
    effectiveDate: "2026-10-01",
    detectedAt: "2026-09-15",
    title: "Appeal window shortens from 60 to 30 days",
    summary:
      "Written appeals must be received within 30 calendar days of the adverse determination.",
    impact: "Two open Passport denials now have less than 12 days left.",
    source: "Passport provider notice, Sep 2026",
    acknowledged: false,
  },
];
