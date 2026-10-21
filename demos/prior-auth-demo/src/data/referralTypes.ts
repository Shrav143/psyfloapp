import type { PayerId, Program, RequestEvent, Urgency } from "./types";

export type ReferralStatus = "new" | "in_review" | "awaiting_info" | "accepted" | "scheduled" | "admitted" | "declined";
export type Channel = "fax" | "eReferral" | "portal" | "phone" | "email";
export type SourceKind = "hospital" | "ed" | "court" | "primary" | "clinic" | "crisis" | "school" | "self";
export type StaffId = "jp" | "tb" | "ml";
export type CheckState = "pass" | "warn" | "fail";
export type CheckKey = "signature" | "expiry" | "credentials" | "components" | "diagnosis" | "service" | "urgent" | "age" | "contact";
export type FieldKey = "patient" | "age" | "clinician" | "credentials" | "npi" | "reason" | "diagnoses" | "service" | "urgency" | "orderDate" | "insurance" | "memberId" | "contact";
export type FieldKind = "text" | "long" | "urgency" | "program" | "payer";
export type DocId = "form" | "face";
export type DeclineReason = "age" | "area" | "higher_care" | "no_bed" | "coverage" | "criteria" | "withdrew";
export type CoverageKind = "cleared" | "auth_first" | "lapsed" | "unconfirmed";
export type ReplyVia = "fax" | "eReferral" | "email" | "phone";

export interface Clinician {
  name: string;
  credentials: string;
  npi: string;
}

export interface SourceDef {
  key: string;
  name: string;
  kind: SourceKind;
  org: string;
  orgSub: string;
  fax: string;
  clinician: Clinician;
}

/** Everything the source document says. The document pages are built from this and never change when a field is edited. */
export interface DocPlan {
  /** What the document says about the request itself, frozen as written. Editing an extracted field never changes these. */
  program: Program;
  urgency: Urgency;
  initials: string;
  age: number;
  payerId: PayerId | null;
  memberIdMasked: string;
  org: string;
  orgSub: string;
  sex: "F" | "M";
  dobCode: string;
  phone: string;
  altContact: string;
  reason: string;
  substances: string;
  meds: string[];
  risk: string;
  dx: { code: string; label: string }[];
  clinician: Clinician;
  asam: string;
  orderAt: number;
  expiresAt: number;
  signed: boolean;
  pages: 1 | 2;
}

export interface ReferralField {
  key: FieldKey;
  label: string;
  value: string;
  kind: FieldKind;
  confidence: number;
  edited?: boolean;
  original?: string;
}

export interface ReferralCheck {
  key: CheckKey;
  doc: DocId;
  label: string;
  state: CheckState;
  detail: string;
  resolved?: { how: "override" | "reply"; reason?: string; at: number };
}

export interface CoverageLine {
  label: string;
  detail: string;
  state: CheckState;
  chip: string;
}

export interface Coverage {
  at: number;
  kind: CoverageKind;
  headline: string;
  note: string;
  lines: CoverageLine[];
}

export interface Fit {
  suggested: Program;
  confidence: number;
  alt: Program;
  altConfidence: number;
  severity: number[];
  summary: string;
}

export interface ReferralNote {
  id: string;
  at: number;
  by: StaffId;
  text: string;
}

export interface Referral {
  id: string;
  receivedAt: number;
  channel: Channel;
  source: { name: string; kind: SourceKind; fax: string };
  patient: { initials: string; age: number };
  payerId: PayerId | null;
  memberIdMasked: string;
  program: Program;
  urgency: Urgency;
  status: ReferralStatus;
  owner: StaffId | null;
  opened: boolean;
  plan: DocPlan;
  fields: ReferralField[];
  checks: ReferralCheck[];
  coverage: Coverage | null;
  coverageOutcome: CoverageKind;
  fit: Fit;
  events: RequestEvent[];
  notes: ReferralNote[];
  decidedAt?: number;
  infoAskedAt?: number;
  infoRequest?: { via: ReplyVia; message: string };
  decline?: { reason: DeclineReason; note: string; courtesy: boolean };
  accepted?: { program: Program; admitBy: number; by: StaffId };
  intakeAt?: number;
  admittedAt?: number;
  requestId?: string;
}
