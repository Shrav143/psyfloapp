/**
 * Shared types for the Psyflo prior-authorization demo dataset.
 * Everything on the demo screens derives from these objects; nothing is fetched.
 */

export type PayerId =
  | "aetna"
  | "anthem"
  | "humana"
  | "passport"
  | "wellcare"
  | "medicare";

export type LocationId = "lex" | "hop";

export type ServiceCode = "H2020";

export type CriteriaSet =
  | "LOCUS"
  | "InterQual"
  | "MCG"
  | "ASAM"
  | "Proprietary"
  | "unconfirmed";

export type Payer = {
  id: PayerId;
  name: string;
  short: string;
  kind: "mco" | "medicare";
  color: string;
  authPortal: string;
  authChannel: "Availity" | "Payer portal" | "Fax" | "Phone";
  appealChannel: "fax" | "portal" | "email";
  appealFax?: string;
  appealDeadlineDays: number;
  decisionSlaDays: number;
  medianDecisionDays: number;
  unitCap?: number;
  typicalWindowDays: number;
  criteriaSet: CriteriaSet;
  publishedFirstPassApproval?: number;
  requiresMemberSignedAppealForm: boolean;
  packetSplit: "single" | "three-part";
  notes: string[];
};

export type Patient = {
  mrn: string;
  initials: string;
  location: LocationId;
  payerId: PayerId;
  dualEligible: boolean;
  hasGuardian: boolean;
  primaryCareHome: string;
  diagnosisCode: string;
  diagnosisLabel: string;
  plannedPerWeek: number;
  actualPerWeek: number;
  intakeDate: string;
  onScheduleToday: boolean;
};

export type Decision = "approved" | "partial" | "denied" | "pending";

export type VersionKind = "initial" | "renewal" | "p2p" | "appeal";

export type PacketDocStatus = "attached" | "missing" | "stale" | "updated";

export type PacketDoc = {
  name: string;
  kind:
    | "cover_sheet"
    | "assessment"
    | "treatment_plan"
    | "medical_record"
    | "form"
    | "letter";
  status: PacketDocStatus;
  updatedAt?: string;
};

export type AuthVersion = {
  id: string;
  number: number;
  kind: VersionKind;
  unitsAsked: number;
  unitsGranted: number;
  windowStart: string;
  windowEnd: string;
  submittedAt: string;
  decidedAt?: string;
  decision: Decision;
  reason?: string;
  reasonCategory?: DenialCategory;
  criteriaCited?: string;
  signedBy?: string;
  reference?: string;
  channel: string;
  packet: PacketDoc[];
};

export type DenialCategory =
  | "medical_necessity"
  | "documentation"
  | "missing_element"
  | "eligibility"
  | "policy_change"
  | "no_reason";

export type EventType =
  | "intake"
  | "packet_drafted"
  | "gap_flagged"
  | "signed"
  | "submitted"
  | "payer_ack"
  | "info_requested"
  | "decided"
  | "p2p_scheduled"
  | "p2p_held"
  | "appeal_drafted"
  | "appeal_filed"
  | "receipt_confirmed"
  | "appeal_decided"
  | "renewal_started"
  | "units_alert"
  | "agent_run"
  | "note";

export type Actor = "agent" | "clinician" | "staff" | "payer" | "system";

export type AuthEvent = {
  id: string;
  at: string;
  type: EventType;
  actor: Actor;
  title: string;
  detail?: string;
  versionNumber?: number;
};

export type AuthStatus =
  | "draft"
  | "awaiting_signoff"
  | "submitted"
  | "pending"
  | "info_requested"
  | "approved"
  | "partial"
  | "denied"
  | "p2p"
  | "appeal"
  | "active"
  | "renewal_due"
  | "exhausted"
  | "expired"
  | "closed";

export type Authorization = {
  id: string;
  mrn: string;
  payerId: PayerId;
  serviceCode: ServiceCode;
  status: AuthStatus;
  stateSince: string;
  owner: string;
  nextAction: string;
  story?: string;
  versions: AuthVersion[];
  events: AuthEvent[];
};

export type VisitReason =
  | "covered"
  | "intake_lag"
  | "awaiting_decision"
  | "units_exhausted"
  | "window_expired"
  | "denied_in_appeal"
  | "no_auth"
  | "eligibility_lapsed";

export type Visit = {
  date: string;
  mrn: string;
  reason: VisitReason;
  versionId?: string;
};

export type DemoDataset = {
  today: string;
  payers: Payer[];
  patients: Patient[];
  authorizations: Authorization[];
  visits: Visit[];
};
