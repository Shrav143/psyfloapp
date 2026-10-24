import type { Program, Tone, Urgency } from "./types";
import type { Channel, CheckKey, DeclineReason, DocId, ReferralStatus, ReplyVia, StaffId } from "./referralTypes";

export const STAFF: { id: StaffId; name: string; initials: string; color: string }[] = [
  { id: "jp", name: "Jordan Perez", initials: "JP", color: "#1D4F43" },
  { id: "tb", name: "Taylor Brooks", initials: "TB", color: "#6B4E3A" },
  { id: "ml", name: "Morgan Lee", initials: "ML", color: "#5E8A7B" },
];
export const staffById = (id: StaffId): (typeof STAFF)[number] => STAFF.find((s) => s.id === id) as (typeof STAFF)[number];

export const CHANNEL_LABEL: Record<Channel, string> = { fax: "Fax", eReferral: "E-referral", portal: "Portal", phone: "Phone", email: "Email" };
export const REPLY_VIA_LABEL: Record<ReplyVia, string> = { fax: "Fax", eReferral: "E-referral", email: "Email", phone: "Phone call" };

export const STATUS_LABEL: Record<ReferralStatus, string> = {
  new: "New",
  in_review: "In review",
  awaiting_info: "Awaiting info",
  accepted: "Accepted",
  scheduled: "Scheduled",
  admitted: "Admitted",
  declined: "Declined",
};
export const STATUS_TONE: Record<ReferralStatus, Tone> = {
  new: "neutral",
  in_review: "neutral",
  awaiting_info: "mid",
  accepted: "good",
  scheduled: "good",
  admitted: "good",
  declined: "risk",
};
const OPEN_STATUSES: ReferralStatus[] = ["new", "in_review", "awaiting_info"];
export const isOpen = (s: ReferralStatus): boolean => OPEN_STATUSES.includes(s);

export const URGENCY_LABEL: Record<Urgency, string> = { routine: "Routine", urgent: "Urgent", emergent: "Emergent" };
export const URGENCY_TONE: Record<Urgency, Tone> = { routine: "neutral", urgent: "mid", emergent: "risk" };
export const URGENCY_RANK: Record<Urgency, number> = { emergent: 0, urgent: 1, routine: 2 };
/** Response targets in minutes: how long a referral may wait for a first decision. */
export const SLA_MIN: Record<Urgency, number> = { emergent: 60, urgent: 4 * 60, routine: 24 * 60 };

export const DECLINE_REASONS: DeclineReason[] = ["age", "area", "higher_care", "no_bed", "coverage", "criteria", "withdrew"];
export const DECLINE_LABEL: Record<DeclineReason, string> = {
  age: "Outside age range",
  area: "Outside service area",
  higher_care: "Needs a higher level of care",
  no_bed: "No bed available",
  coverage: "Coverage cannot be confirmed",
  criteria: "Clinical criteria not met",
  withdrew: "Referrer withdrew",
};

export const PROGRAM_LONG: Record<Program, string> = {
  RES: "Residential treatment",
  IOP: "Intensive outpatient program (IOP)",
  PHP: "Partial hospitalization program (PHP)",
  WM: "Withdrawal management (detox)",
};
/** The ASAM level each program delivers. A referral asking for another level is flagged. */
export const PROGRAM_ASAM: Record<Program, string> = { RES: "3.5", IOP: "2.1", PHP: "2.5", WM: "3.2" };
export const AGE_MIN = 18;
export const ACCEPTED_CREDENTIALS = /\b(MD|DO|NP|PA|PhD|PsyD|LCSW|LISW|LPCC|APRN|PMHNP)\b/;

/** Beds or slots. `open` is what is free this week; accepting a referral takes one. */
export const CAPACITY_SEED: Record<Program, { total: number; open: number; unit: "bed" | "slot" }> = {
  RES: { total: 16, open: 2, unit: "bed" },
  WM: { total: 8, open: 1, unit: "bed" },
  PHP: { total: 24, open: 5, unit: "slot" },
  IOP: { total: 40, open: 11, unit: "slot" },
};

export const CHECK_LABEL: Record<CheckKey, string> = {
  signature: "Clinician signature is present",
  expiry: "The order has not expired",
  credentials: "Clinician credentials are accepted",
  components: "Required clinical components are present",
  diagnosis: "A valid diagnosis code is present",
  service: "Requested service matches what the program offers",
  urgent: "Urgent criteria are documented",
  age: "Patient age is within the program's range",
  contact: "Patient contact information is present",
};
/** The same checks worded as the problem, for banners and logs. */
export const CHECK_PROBLEM: Record<CheckKey, string> = {
  signature: "The clinician signature is missing",
  expiry: "The order has expired",
  credentials: "The clinician credentials are not on the accepted list",
  components: "Required clinical components are missing",
  diagnosis: "There is no valid diagnosis code",
  service: "The requested level of care does not match the program",
  urgent: "Urgent criteria are not documented",
  age: "The patient is outside the program's age range",
  contact: "There is no way to reach the patient",
};
export const CHECK_ORDER: CheckKey[] = ["signature", "expiry", "credentials", "components", "diagnosis", "service", "urgent", "age", "contact"];
export const CHECK_DOC: Record<CheckKey, DocId> = { signature: "form", expiry: "form", credentials: "form", components: "form", diagnosis: "form", service: "form", urgent: "form", age: "face", contact: "face" };
/** The block id in the document that shows the evidence for each check. */
export const CHECK_EVIDENCE: Record<CheckKey, string> = { signature: "signature", expiry: "orderDate", credentials: "credentials", components: "risk", diagnosis: "diagnoses", service: "service", urgent: "risk", age: "age", contact: "contact" };
export const DOC_TITLE: Record<DocId, string> = { form: "Referral form", face: "Face sheet" };

export const ASAM_DIMS: { name: string; notes: string[] }[] = [
  { name: "Intoxication and withdrawal", notes: ["No withdrawal risk", "Mild symptoms, low risk", "Moderate risk, needs monitoring", "Significant withdrawal risk", "Severe risk, needs medical management"] },
  { name: "Medical conditions", notes: ["None reported", "Stable and managed", "Needs regular follow-up", "Needs daily nursing", "Unstable, needs a hospital"] },
  { name: "Mood, behavior and thinking", notes: ["None reported", "Mild symptoms", "Moderate symptoms, stable", "Significant symptoms, needs structure", "Severe and unstable"] },
  { name: "Readiness to change", notes: ["Engaged", "Willing", "Ambivalent", "Reluctant", "Not willing"] },
  { name: "Relapse and continued use", notes: ["Low risk", "Some coping skills", "Limited coping skills", "Little control over use", "No control over use"] },
  { name: "Recovery environment", notes: ["Supportive", "Mostly supportive", "Some barriers", "Unstable or unsafe", "Unsafe and no supports"] },
];

/** Plain ICD-10-CM codes the demo treats as valid. */
export const KNOWN_ICD: Record<string, string> = {
  "F10.20": "Alcohol use disorder, moderate to severe",
  "F10.239": "Alcohol dependence with withdrawal",
  "F11.20": "Opioid use disorder, moderate to severe",
  "F11.23": "Opioid dependence with withdrawal",
  "F12.20": "Cannabis use disorder, moderate to severe",
  "F13.20": "Sedative or anxiolytic use disorder, moderate to severe",
  "F14.20": "Cocaine use disorder, moderate to severe",
  "F15.20": "Stimulant use disorder, moderate to severe",
  "F32.1": "Major depressive disorder, single episode, moderate",
  "F33.1": "Major depressive disorder, recurrent, moderate",
  "F41.1": "Generalized anxiety disorder",
  "F43.10": "Post-traumatic stress disorder",
};
