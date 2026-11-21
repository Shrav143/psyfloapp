import type { Payer, PayerId } from "./types";

/**
 * Kentucky Medicaid MCOs plus traditional Medicare, as Harbor bills them.
 * Turnaround, caps and criteria are demo values calibrated to Tracy's descriptions.
 */
export const PAYERS: Payer[] = [
  {
    id: "aetna",
    name: "Aetna Better Health of Kentucky",
    short: "Aetna BH",
    kind: "mco",
    color: "#7c3aed",
    authPortal: "Availity",
    authChannel: "Availity",
    appealChannel: "fax",
    appealFax: "+1 (859) 555-0142",
    appealDeadlineDays: 60,
    decisionSlaDays: 7,
    medianDecisionDays: 4,
    unitCap: 60,
    typicalWindowDays: 90,
    criteriaSet: "LOCUS",
    publishedFirstPassApproval: 0.84,
    requiresMemberSignedAppealForm: false,
    packetSplit: "single",
    notes: ["Fastest decisions. Backdates to request date."],
  },
  {
    id: "anthem",
    name: "Anthem Blue Cross Blue Shield Medicaid",
    short: "Anthem",
    kind: "mco",
    color: "#2563eb",
    authPortal: "Availity",
    authChannel: "Availity",
    appealChannel: "fax",
    appealFax: "+1 (502) 555-0177",
    appealDeadlineDays: 60,
    decisionSlaDays: 7,
    medianDecisionDays: 5,
    unitCap: 60,
    typicalWindowDays: 90,
    criteriaSet: "InterQual",
    publishedFirstPassApproval: 0.81,
    requiresMemberSignedAppealForm: true,
    packetSplit: "three-part",
    notes: [
      "Wants assessments, medical records and cover sheet as three separate uploads.",
      "Requires member-signed appeal authorization form.",
    ],
  },
  {
    id: "humana",
    name: "Humana Healthy Horizons in Kentucky",
    short: "Humana",
    kind: "mco",
    color: "#0891b2",
    authPortal: "Availity",
    authChannel: "Availity",
    appealChannel: "portal",
    appealDeadlineDays: 60,
    decisionSlaDays: 7,
    medianDecisionDays: 6,
    unitCap: 40,
    typicalWindowDays: 90,
    criteriaSet: "MCG",
    publishedFirstPassApproval: 0.79,
    requiresMemberSignedAppealForm: false,
    packetSplit: "single",
    notes: ["Caps TRP at 40 units per authorization since Q1 2026."],
  },
  {
    id: "passport",
    name: "Passport Health Plan by Molina",
    short: "Passport",
    kind: "mco",
    color: "#059669",
    authPortal: "Availity",
    authChannel: "Availity",
    appealChannel: "email",
    appealDeadlineDays: 30,
    decisionSlaDays: 7,
    medianDecisionDays: 7,
    unitCap: 60,
    typicalWindowDays: 90,
    criteriaSet: "unconfirmed",
    publishedFirstPassApproval: 0.77,
    requiresMemberSignedAppealForm: true,
    packetSplit: "single",
    notes: ["30-day appeal window. Appeals by email with signed member form."],
  },
  {
    id: "wellcare",
    name: "WellCare of Kentucky",
    short: "WellCare",
    kind: "mco",
    color: "#d97706",
    authPortal: "WellCare provider portal",
    authChannel: "Payer portal",
    appealChannel: "fax",
    appealFax: "+1 (866) 555-0199",
    appealDeadlineDays: 60,
    decisionSlaDays: 7,
    medianDecisionDays: 9,
    unitCap: 60,
    typicalWindowDays: 90,
    criteriaSet: "unconfirmed",
    publishedFirstPassApproval: 0.85,
    requiresMemberSignedAppealForm: false,
    packetSplit: "three-part",
    notes: [
      "Own portal, not Availity. Slowest decisions.",
      "Partial approvals rising sharply since Q1 2026.",
    ],
  },
  {
    id: "medicare",
    name: "Medicare (traditional)",
    short: "Medicare",
    kind: "medicare",
    color: "#64748b",
    authPortal: "Novitas / MAC",
    authChannel: "Fax",
    appealChannel: "fax",
    appealFax: "+1 (877) 555-0123",
    appealDeadlineDays: 120,
    decisionSlaDays: 14,
    medianDecisionDays: 12,
    typicalWindowDays: 90,
    criteriaSet: "Proprietary",
    requiresMemberSignedAppealForm: false,
    packetSplit: "single",
    notes: [
      "Dual-eligibles: Medicare must deny before Kentucky Medicaid pays.",
    ],
  },
];

export const PAYER_BY_ID: Record<PayerId, Payer> = Object.fromEntries(
  PAYERS.map((p) => [p.id, p]),
) as Record<PayerId, Payer>;

export const MCO_IDS: PayerId[] = [
  "aetna",
  "anthem",
  "humana",
  "passport",
  "wellcare",
];

/** Six quarters of first-pass approval and partial rates, per MCO. WellCare degrades. */
export const QUARTERS = ["Q2 25", "Q3 25", "Q4 25", "Q1 26", "Q2 26", "Q3 26"];

export const FIRST_PASS_BY_QUARTER: Record<PayerId, number[]> = {
  aetna: [0.8, 0.79, 0.78, 0.78, 0.77, 0.78],
  anthem: [0.76, 0.75, 0.74, 0.73, 0.74, 0.74],
  humana: [0.75, 0.74, 0.73, 0.72, 0.71, 0.71],
  passport: [0.7, 0.71, 0.7, 0.69, 0.69, 0.69],
  wellcare: [0.78, 0.78, 0.76, 0.7, 0.65, 0.62],
  medicare: [0.6, 0.6, 0.6, 0.6, 0.6, 0.6],
};

export const PARTIAL_BY_QUARTER: Record<PayerId, number[]> = {
  aetna: [0.05, 0.06, 0.06, 0.06, 0.06, 0.06],
  anthem: [0.08, 0.08, 0.09, 0.09, 0.09, 0.09],
  humana: [0.1, 0.1, 0.11, 0.12, 0.12, 0.12],
  passport: [0.12, 0.13, 0.13, 0.14, 0.14, 0.14],
  wellcare: [0.08, 0.09, 0.12, 0.2, 0.27, 0.31],
  medicare: [0, 0, 0, 0, 0, 0],
};

export const P2P_REVERSAL: Record<PayerId, number> = {
  aetna: 0.52,
  anthem: 0.55,
  humana: 0.5,
  passport: 0.44,
  wellcare: 0.48,
  medicare: 0.3,
};

export const APPEAL_WIN: Record<PayerId, number> = {
  aetna: 0.6,
  anthem: 0.5,
  humana: 0.4,
  passport: 0.45,
  wellcare: 0.33,
  medicare: 0.25,
};
