import type { DocBlock } from "@/components/ui/DocumentSheet";
import type { AgentKey, PayerId, Urgency } from "../types";
import type { SiteId } from "../sites";
import type { VaServiceId } from "../va/services";

/* The Intake workspace's data model. One IntakeRecord holds one person's intake, from the referral to the authorization handoff.
   Three things are always kept apart: what a source says (documents, transcripts), what an agent suggests (Suggestion), and what a person
   approved (a FieldValue with reviewedBy). An AI suggestion never becomes a value until a person accepts it. */

/** The record's sections, in workflow order. The queue (A) is the list itself. B to H: */
export type IntakeSectionId = "referral" | "profile" | "coverage" | "assessment" | "cans" | "pathway" | "review";
export const SECTION_ORDER: IntakeSectionId[] = ["referral", "profile", "coverage", "assessment", "cans", "pathway", "review"];
export const SECTION_LABEL: Record<IntakeSectionId, string> = {
  referral: "Referral",
  profile: "Patient profile",
  coverage: "Insurance & eligibility",
  assessment: "Clinical assessment",
  cans: "CANS & Level of Need",
  pathway: "Care pathway & referral",
  review: "Documentation & review",
};

export type TriageStatus = "new" | "needs_info" | "ready_screening" | "clinical_review" | "accepted" | "redirected" | "declined" | "closed";
export const TRIAGE_LABEL: Record<TriageStatus, string> = {
  new: "New", needs_info: "Needs information", ready_screening: "Ready for screening", clinical_review: "Clinical review needed",
  accepted: "Accepted", redirected: "Redirected", declined: "Declined", closed: "Closed",
};

export type ReferralMethod = "manual" | "upload" | "fax" | "email" | "emr" | "phone" | "voice" | "webform";
export const METHOD_LABEL: Record<ReferralMethod, string> = {
  manual: "Manual entry", upload: "Uploaded referral document", fax: "Fax or PDF import", email: "Referral email import", emr: "EMR-imported referral",
  phone: "Staff-assisted phone intake", voice: "Voice-agent-assisted intake", webform: "Patient or caregiver web form",
};

/** Every field carries where its value came from. */
export type FieldState = "verified" | "patient_reported" | "document_extracted" | "ai_suggested" | "not_collected" | "not_applicable" | "needs_confirmation";
export const FIELD_STATE_LABEL: Record<FieldState, string> = {
  verified: "Verified", patient_reported: "Patient reported", document_extracted: "Document extracted", ai_suggested: "AI suggested",
  not_collected: "Not collected", not_applicable: "Not applicable", needs_confirmation: "Needs confirmation",
};

export interface SourceRef {
  kind: "document" | "transcript" | "voice" | "emr" | "payer" | "staff" | "patient" | "form" | "policy";
  /** Human-readable: "Referral form p.1", "Scribe transcript 04:12", "Eligibility response (simulated)". */
  ref: string;
  quote?: string;
  docId?: string;
  blockId?: string;
  /** Seconds into a transcript. */
  at?: number;
}

export interface FieldValue {
  value: string;
  state: FieldState;
  source?: SourceRef;
  /** Demo minutes when the value was set or extracted. */
  at: number;
  /** A staff id or an agent key. */
  by: string;
  confidence?: "high" | "medium" | "low";
  reviewedBy?: string;
  reviewedAt?: number;
}
export type FieldMap = Record<string, FieldValue>;

export interface Suggestion {
  id: string;
  section: IntakeSectionId;
  /** The field key it would fill, or a CANS item id, or a note section. */
  field: string;
  value: string;
  source: SourceRef;
  confidence: "high" | "medium" | "low";
  agent: AgentKey;
  at: number;
  status: "pending" | "accepted" | "edited" | "rejected";
  decidedBy?: string;
  decidedAt?: number;
  editedValue?: string;
  /** Set when the suggestion contradicts what is already on file. */
  conflict?: string;
}

export interface IntakeDocument {
  id: string;
  name: string;
  kind: "referral" | "fax" | "email" | "emr_summary" | "school_report" | "discharge_summary" | "consent" | "insurance_card" | "other";
  receivedAt: number;
  /** Simulated imports say so. */
  simulated: boolean;
  pages: DocBlock[][];
}

export type AssessmentMode = "manual" | "scribe" | "voice";
export type AssessmentSectionId = "presenting" | "symptoms" | "history" | "mse" | "functional" | "safety" | "strengths" | "sdoh" | "prior" | "goals" | "needs" | "narrative";
export const ASSESSMENT_SECTIONS: { id: AssessmentSectionId; label: string }[] = [
  { id: "presenting", label: "Presenting problem" },
  { id: "symptoms", label: "Current symptoms" },
  { id: "history", label: "Clinical history" },
  { id: "mse", label: "Mental status observations" },
  { id: "functional", label: "Functional limitations" },
  { id: "safety", label: "Safety and risk screening" },
  { id: "strengths", label: "Strengths" },
  { id: "sdoh", label: "Social determinants and barriers" },
  { id: "prior", label: "Prior treatment" },
  { id: "goals", label: "Patient goals" },
  { id: "needs", label: "Preliminary service needs" },
  { id: "narrative", label: "Clinician narrative" },
];
export interface ClinicalAssessment {
  mode: AssessmentMode;
  status: "not_started" | "in_progress" | "awaiting_review" | "signed";
  /** Keyed by AssessmentSectionId. */
  fields: FieldMap;
  attestation?: { by: string; credentials: string; at: number; rolePlay?: boolean };
  /** Voice guided mode: the clinician's answer to each guided question (ids from data/intake/scripts.ts). */
  guided?: Record<string, { answer: string; state: "open" | "asked" | "skipped"; drafted?: boolean }>;
  /** The structured safety and risk screening prompts, as a clinician recorded them. Never filled by an agent. */
  safetyPrompts?: Record<string, { response: string; by: string; at: number }>;
  /** Each time a signed assessment was reopened: who, when, why, and whose signature it replaced. */
  amendments?: { by: string; at: number; reason: string; priorSigner?: string; priorSignedAt?: number }[];
}

export interface EvidenceRef {
  id: string;
  text: string;
  source: SourceRef;
  /** A Psyflo evidence theme used to organize notes, never a CANS domain. */
  theme?: string;
}
export interface CansItem {
  id: string;
  domainId: string;
  name: string;
  /** null until the official scoring options are mapped. */
  options: string[] | null;
  response: string | null;
  state: "unrated" | "ai_suggested" | "rated" | "needs_review";
  evidence: EvidenceRef[];
  reviewer?: string;
  reviewedAt?: number;
}
export interface CansAssessment {
  status: "not_started" | "in_progress" | "ready_for_review" | "signed";
  /** "awaiting-dmas-mapping" until the official template is configured. */
  templateVersion: string;
  date?: number;
  assessor?: string;
  assessorCredential?: string;
  credentialStatus: "not_checked" | "verified" | "unverified";
  domains: { id: string; label: string; itemIds: string[] }[];
  items: CansItem[];
  /** Evidence gathered before it is tied to an item. */
  evidence: EvidenceRef[];
  narrative: string;
  signedBy?: string;
  signedAt?: number;
  /** null: no reassessment interval is established by policy in the demo. */
  reassessDue: number | null;
  /** Who added or kept each piece of evidence, by evidence id. */
  evidenceMeta?: Record<string, { by: string; at: number; from: "agent" | "staff"; agent?: AgentKey }>;
  startedBy?: string;
  startedAt?: number;
  /** A person's record that they checked the assessor's credential. Not a DMAS qualification decision. */
  credentialCheck?: { by: string; at: number; note?: string };
}
export interface LevelOfNeedReview {
  status: "pending_policy" | "in_review" | "dispositioned";
  /** null: no validated model configured. */
  modelVersion: string | null;
  functionalNeeds: string;
  serviceNeeds: string;
  recommendations: string;
  missing: string[];
  reviewer?: string;
  disposition?: string;
  decidedAt?: number;
  /** The clinician who signed the disposition, and whether it was demo role-play. */
  decidedBy?: string;
  rolePlay?: boolean;
  startedBy?: string;
  startedAt?: number;
  updatedBy?: string;
  updatedAt?: number;
}

export type PathwayFit = "possible" | "less_likely" | "not_assessed";
export interface ServiceRecommendation {
  id: string;
  serviceId: VaServiceId | "external";
  externalLabel?: string;
  fit: PathwayFit;
  rationale: string;
  evidence: SourceRef[];
  outstanding: string[];
  availability: "available" | "waitlist" | "external" | "not_yet" | "unknown";
  referralReqs: string[];
  status: "suggested" | "under_review" | "selected" | "not_selected";
  suggestedBy: string;
  decidedBy?: string;
  decidedAt?: number;
  note?: string;
  /** When a person added it by hand, or the Care Pathway Agent last refreshed it. */
  addedAt?: number;
  refreshedAt?: number;
  /** The selection was signed by playing the site's clinician (demo control). */
  rolePlay?: boolean;
}

export type ReferralOutStatus = "draft" | "ready" | "sent" | "received" | "under_review" | "accepted" | "needs_info" | "declined" | "scheduled" | "completed";
export const REFERRAL_OUT_LABEL: Record<ReferralOutStatus, string> = {
  draft: "Draft", ready: "Ready to send", sent: "Sent", received: "Received", under_review: "Under review", accepted: "Accepted",
  needs_info: "Needs information", declined: "Declined", scheduled: "Scheduled", completed: "Completed",
};
export interface ReferralOut {
  id: string;
  serviceId: VaServiceId | "external";
  destination: { org: string; contact: string; phone?: string; channel: "secure_message" | "fax" | "portal" | "phone" | "internal" };
  createdAt: number;
  referringClinician: string;
  /** docId: the record document attached to this slot. generated: Psyflo builds it when the packet is prepared (a referral form). */
  docs: { name: string; attached: boolean; required: boolean; docId?: string; generated?: boolean }[];
  consent: "on_file" | "needed" | "declined";
  priority: "routine" | "urgent";
  status: ReferralOutStatus;
  followUpAt?: number;
  appointmentAt?: number;
  reason?: string;
  disposition?: string;
  approvedBy?: string;
  timeline: AuditEvent[];
  /** The care pathway it came from, and the directory entry it goes to (data/intake/destinations.ts). */
  pathwayId?: string;
  destinationId?: string;
  /** The Referral Coordination Agent's packet: a draft cover message and what is still missing. A person approves before sending. */
  packet?: { preparedAt: number; message: string; missing: string[] };
  /** A follow-up message the agent drafted. Sending it needs a person. */
  followUpDraft?: { text: string; at: number };
  /** What the receiving organization asked for (Needs information). */
  infoRequest?: string;
}

export interface TranscriptTurn {
  id: string;
  /** Seconds since the session started. */
  at: number;
  speaker: "clinician" | "patient" | "caregiver" | "assistant" | "coordinator" | "unknown";
  text: string;
}
export type NoteSectionId = "reason" | "hpi" | "history" | "functional" | "risk" | "strengths" | "summary" | "questions" | "plan";
export const NOTE_SECTIONS: { id: NoteSectionId; label: string }[] = [
  { id: "reason", label: "Reason for referral" },
  { id: "hpi", label: "Presenting concerns" },
  { id: "history", label: "Relevant history" },
  { id: "functional", label: "Functional needs" },
  { id: "risk", label: "Risk information requiring review" },
  { id: "strengths", label: "Patient strengths" },
  { id: "summary", label: "Assessment summary" },
  { id: "questions", label: "Outstanding questions" },
  { id: "plan", label: "Plan and follow-up" },
];
export interface ScribeSession {
  id: string;
  status: "consent" | "ready" | "recording" | "paused" | "stopped" | "reviewing" | "saved";
  consent?: { by: string; at: number; method: "verbal" | "written" };
  /** Seconds recorded. */
  elapsed: number;
  turns: TranscriptTurn[];
  /** Which scripted conversation the simulation plays, and how far it has played. */
  scriptId: string;
  cursor: number;
  noteDraft: Partial<Record<NoteSectionId, string>>;
  /** Simulated audio: no recording leaves the browser. */
  simulated: true;
  /** Who is in the encounter, checked before recording starts. */
  encounter?: { patient: string; identityChecked: boolean; type: string; clinician: string; others: string };
  /** A person's decision on each drafted note section. Undecided sections are pending. */
  noteStatus?: Partial<Record<NoteSectionId, "pending" | "accepted" | "edited" | "rejected">>;
  /** Fields the Clinical Documentation Agent extracted, kept in the session until a person saves them to the intake. */
  extracted?: Suggestion[];
  /** Information the conversation did not cover. */
  missing?: string[];
  /** Demo minutes when recording started and when the session was saved. */
  startedAt?: number;
  savedAt?: number;
  /** The transcript and note documents written to the record on save. */
  docIds?: string[];
}
export interface VoiceSession {
  id: string;
  status: "idle" | "identity" | "language" | "role" | "consent" | "questions" | "summary" | "confirm" | "saved" | "escalated" | "transferred";
  participant?: string;
  language: string;
  consent?: boolean;
  turns: TranscriptTurn[];
  /** Question ids already asked or already answered on file. */
  asked: string[];
  scriptId: string;
  cursor: number;
  simulated: true;
  /** Whose turn it is in the simulated call. */
  phase?: "assistant" | "caller" | "done";
  /** The step in progress: "identity", "language", "role", "consent", a question id, "summary" or "closing". */
  step?: string;
  /** The assistant asked a clarifying question for the current step. */
  clarifying?: boolean;
  /** What the assistant says before its next prompt. */
  ack?: string;
  /** Question ids not asked because the record already had the answer. */
  skipped?: string[];
  /** What the assistant collected, as suggestions for staff review. Nothing reaches the record until Save draft. */
  collected?: Suggestion[];
  /** Collected ids the caller confirmed or corrected during the read-back. */
  confirmed?: string[];
  corrected?: string[];
  /** Seconds since the call started. */
  elapsed?: number;
  escalation?: { at: number; text: string };
  transfer?: { at: number; reason: string; by: string };
  /** The staff member running the call. */
  coordinator?: string;
  savedAt?: number;
  docIds?: string[];
}

/** The seven intake agents are roles played by Psyflo's named agents, so Settings (freedom, Pause all) governs them too. */
export type IntakeAgentRole = "referral" | "eligibility" | "documentation" | "cans" | "pathway" | "coordination" | "completion";
export const ROLE_LABEL: Record<IntakeAgentRole, string> = {
  referral: "Referral Agent", eligibility: "Identity & Eligibility Agent", documentation: "Clinical Documentation Agent", cans: "CANS Evidence Agent",
  pathway: "Care Pathway Agent", coordination: "Referral Coordination Agent", completion: "Intake Completion Agent",
};
export const ROLE_AGENT: Record<IntakeAgentRole, AgentKey> = {
  referral: "reader", eligibility: "verify", documentation: "scribe", cans: "criteria", pathway: "placement", coordination: "navigator", completion: "integrity",
};
export interface AgentTask {
  id: string;
  role: IntakeAgentRole;
  agent: AgentKey;
  action: string;
  status: "queued" | "running" | "done" | "needs_you" | "blocked" | "error" | "cancelled";
  section?: IntakeSectionId;
  source?: string;
  at: number;
  /** Whether a person must approve the result before it takes effect. */
  approval: "none" | "required" | "approved" | "rejected";
  result?: string;
  error?: string;
  undoable?: boolean;
  /** Which assistant action made the task (pages/intake/assistant/actions.ts), so Retry and Undo know what to do. */
  kind?: string;
  /** What a person must decide where it belongs (a section) before a "needs you" task closes. */
  gate?: TaskGate;
  /** The approval is the decision itself (approving sends a simulated message). Never set on safety items or on anything that writes a field. */
  approveHere?: boolean;
  /** Tasks this one created (follow-ups), so Undo can withdraw them. */
  created?: string[];
  /** Set once Retry started a new run. */
  retriedAs?: string;
}
/** A "needs you" task waits on: pending suggestions in these sections (or these suggestion ids), a pathway decision, the handoff approval,
    the assessment attestation, the CANS signature, the safety review, or checklist items (data/intake/checklist.ts) becoming complete. */
export interface TaskGate {
  kind: "suggestions" | "pathway" | "handoff" | "assessment" | "cans" | "safety" | "check";
  sections?: IntakeSectionId[];
  ids?: string[];
}
export interface AuditEvent {
  id: string;
  at: number;
  /** A staff id, an agent key, "system" or "payer". */
  actor: string;
  action: string;
  detail?: string;
  section?: IntakeSectionId;
  /** True for an agent's action. */
  ai?: boolean;
}

export interface EligibilityCheck {
  status: "not_checked" | "checking" | "active" | "inactive" | "uncertain" | "conflict";
  /** Every eligibility result in the demo is simulated; the screens say so. */
  simulated: true;
  checkedAt?: number;
  /** Member eligibility, benefit coverage, network participation, medical necessity and authorization are separate determinations. */
  member: "yes" | "no" | "unknown";
  benefit: "yes" | "no" | "unknown" | "pending_policy";
  network: "yes" | "no" | "unknown";
  necessity: "not_determined";
  authorization: "required" | "registration" | "not_required" | "pending_policy" | "existing" | "unknown";
  existingAuth?: string;
  conflicts: string[];
  exceptions: string[];
  /** The plan the response lists for the member, and the service the benefit was checked for. A plan or service on file that differs makes it stale. */
  payerId?: PayerId | null;
  serviceId?: VaServiceId;
  /** The coverage period in the response, demo minutes. No `coverageTo`: the response lists no end date. */
  coverageFrom?: number;
  coverageTo?: number;
  /** One line per determination, as the response or the policy rules give it. */
  notes?: Partial<Record<EligibilityDetermination, string>>;
  /** Determinations a person confirmed with the plan after the check. Anything not listed is still the simulated response. */
  verified?: Partial<Record<EligibilityDetermination, StaffVerification>>;
}
/** The four determinations a person can confirm with the plan. Medical necessity is never confirmed here: clinical review and the payer decide it. */
export type EligibilityDetermination = "member" | "benefit" | "network" | "authorization";
export interface StaffVerification {
  by: string;
  at: number;
  method: "phone" | "portal";
  /** The call or portal reference the plan gave. */
  ref?: string;
}

export interface SafetyAlert {
  raisedAt: number;
  raisedBy: string;
  text: string;
  source?: SourceRef;
  status: "open" | "acknowledged" | "escalated";
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  action?: "clinician_now" | "mobile_crisis" | "crisis_line_988" | "emergency_911" | "documented";
  note?: string;
}

export interface HandoffPacket {
  status: "not_started" | "draft" | "ready" | "in_new_case";
  createdAt?: number;
  /** The New Case draft the packet opened, when it did. */
  draftId?: string;
  approvedBy?: string;
  approvedAt?: number;
  /** Who prepared the draft (an agent key or a staff id), and who opened it in New Case. */
  preparedBy?: string;
  openedBy?: string;
  openedAt?: number;
}

export interface IntakeStaff {
  id: string;
  name: string;
  initials: string;
  role: string;
  /** Licensed and allowed to attest assessments and rate the CANS Lifetime in the demo. Real qualifications come from DMAS policy. */
  qualified: boolean;
  credentials?: string;
}

export interface IntakeRecord {
  id: string;
  site: SiteId;
  createdAt: number;
  scenario?: "A" | "B" | "C" | "D";
  /** One line for the queue: why this person is here. */
  title: string;
  serviceId: VaServiceId;
  /** Planned service start, demo minutes. Drives the policy period. */
  serviceDate: number;
  /** A person on a retiring service. */
  legacy?: { serviceId: VaServiceId; authorizationId: string; authEnds: number };
  method: ReferralMethod;
  sourceOrg: string;
  triage: TriageStatus;
  triageNote?: string;
  urgency: Urgency;
  priority: boolean;
  assignedTo: string;
  payerId: PayerId | null;
  initials: string;
  age: number | null;
  referral: FieldMap;
  profile: FieldMap;
  coverage: FieldMap;
  eligibility: EligibilityCheck;
  assessment: ClinicalAssessment;
  cans: CansAssessment | null;
  lon: LevelOfNeedReview | null;
  pathways: ServiceRecommendation[];
  referralsOut: ReferralOut[];
  documents: IntakeDocument[];
  suggestions: Suggestion[];
  tasks: AgentTask[];
  audit: AuditEvent[];
  scribe: ScribeSession | null;
  voice: VoiceSession | null;
  safety: SafetyAlert | null;
  handoff: HandoffPacket;
}
