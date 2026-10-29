import type { ProgramId } from "../assess/types";

/* What a person decided about a referral, and the notices that go back to the referrer. A notice is always a draft first: it is sent (simulated)
   only after a person approves it. These types live apart from types.ts so the referral work can grow without touching the shared model. */

export type DecisionKind = "accepted" | "redirected" | "declined" | "closed";
export const DECISION_LABEL: Record<DecisionKind, string> = { accepted: "Accepted for assessment", redirected: "Redirected", declined: "Declined", closed: "Closed" };

/** A decline reason a person picks from the list. "other" needs the free text. */
export type DeclineReasonCode = "age" | "area" | "higher_care" | "no_capacity" | "coverage" | "not_appropriate" | "duplicate" | "unreachable" | "withdrew" | "other";
export const DECLINE_REASON: Record<DeclineReasonCode, string> = {
  age: "Outside the age range this program serves",
  area: "Outside the service area",
  higher_care: "Needs a higher level of care than this program offers",
  no_capacity: "No capacity and no waitlist",
  coverage: "Coverage cannot be confirmed",
  not_appropriate: "Not an appropriate referral for this program",
  duplicate: "Duplicate of another referral",
  unreachable: "The person could not be reached",
  withdrew: "The referrer or the person withdrew the referral",
  other: "Other reason",
};
export const DECLINE_REASON_ORDER: DeclineReasonCode[] = ["age", "area", "higher_care", "no_capacity", "coverage", "not_appropriate", "duplicate", "unreachable", "withdrew", "other"];

export type RedirectReasonCode = "other_service" | "other_provider" | "service_not_yet" | "service_retired" | "closer_to_home" | "other";
export const REDIRECT_REASON: Record<RedirectReasonCode, string> = {
  other_service: "A different service here fits the request",
  other_provider: "Another provider offers the requested service",
  service_not_yet: "The service is not available yet in this policy period",
  service_retired: "The service is not available in this policy period",
  closer_to_home: "A program closer to the person's home",
  other: "Other reason",
};
export const REDIRECT_REASON_ORDER: RedirectReasonCode[] = ["other_service", "other_provider", "service_not_yet", "service_retired", "closer_to_home", "other"];

export interface ReferralDecision {
  kind: DecisionKind;
  at: number;
  /** A staff id. */
  by: string;
  /** The reason in words: the list choice, then the person's own text. */
  reason?: string;
  reasonCode?: string;
  note?: string;
  /** For a redirect: where the person was sent. */
  destination?: { org: string; id?: string };
  /** The draft notice to the referrer this decision created. */
  noticeId?: string;
  /** For an accepted referral to a program with demo capacity: it took a place, or went on the waitlist. Open places are counted from these, so they follow the records. */
  capacity?: { programId: ProgramId; took: boolean };
}

export type NoticeKind = "missing_info" | "accepted" | "redirected" | "declined";
export const NOTICE_LABEL: Record<NoticeKind, string> = {
  missing_info: "Request for missing information", accepted: "Referral accepted", redirected: "Referral redirected", declined: "Referral declined",
};
export type NoticeChannel = "Secure message" | "Fax" | "Phone call";
export const NOTICE_CHANNELS: NoticeChannel[] = ["Secure message", "Fax", "Phone call"];

export interface ReferralNotice {
  id: string;
  kind: NoticeKind;
  to: string;
  channel: NoticeChannel;
  subject: string;
  body: string;
  /** A draft waits for a person. Sent means a person approved it and the (simulated) message went out. */
  status: "draft" | "sent" | "discarded";
  createdAt: number;
  createdBy: string;
  sentAt?: number;
  approvedBy?: string;
  /** What the person relied on to send it: a release on file, or an attestation under the organization's protocol. */
  basis?: "release_on_file" | "protocol_attested";
  /** Items the request asks for, for a missing-information request. */
  items?: string[];
}

export interface WaitlistEntry {
  programId: ProgramId;
  /** Words for the program as the referral named it. */
  label: string;
  since: number;
  by: string;
  position: number;
  note?: string;
}

/** Why a record was created although another looked the same. */
export interface DuplicateNote {
  ofId: string;
  reason: string;
  by: string;
  at: number;
}
