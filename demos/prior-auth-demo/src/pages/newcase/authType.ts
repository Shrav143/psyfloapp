/* The Authorization type chosen under the New Case heading, and everything that follows from it:
   which request type the demo records, what Intake asks, which documents are typical, what the justification says.
   The ids are the request kinds the Dashboard and the queue already filter by. */
import type { AuthKind, ChangeKind } from "@/data/cases";
import type { RequestType } from "@/data/types";

export interface AuthTypeDef {
  kind: AuthKind;
  /** The dropdown's label. */
  label: string;
  /** Mid-sentence: "a continued stay", "a retroactive authorization". */
  noun: string;
  /** The request types the demo records for this kind. The first is the default. */
  types: RequestType[];
  /** The request starts from an existing patient, episode and authorization. */
  existing: boolean;
  /** "continued stay": the words after "Typical for" on a document the payer's list does not name. */
  typical: string;
  /** The heading of the prepared justification. */
  justification: string;
  /** One line under the page title on Intake. */
  intake: string;
}

export const AUTH_TYPES: AuthTypeDef[] = [
  { kind: "initial", label: "Initial authorization", noun: "an initial authorization", types: ["Initial request", "Admission"], existing: false, typical: "an initial request", justification: "Initial request justification", intake: "Start with a referral or a patient. Everything is editable." },
  { kind: "concurrent", label: "Concurrent review", noun: "a continued stay", types: ["Continued stay"], existing: true, typical: "a continued stay", justification: "Continued-stay justification", intake: "Find the patient, then the authorization this review is for." },
  { kind: "reauth", label: "Reauthorization / renewal", noun: "a renewal", types: ["Recertification"], existing: true, typical: "a renewal", justification: "Renewal justification", intake: "Find the patient, then the authorization that is ending." },
  { kind: "modify", label: "Modification / extension", noun: "a modification", types: ["Modification"], existing: true, typical: "a modification", justification: "Modification justification", intake: "Find the patient, then the authorization to change, and say what should change." },
  { kind: "retro", label: "Retroactive authorization", noun: "a retroactive authorization", types: ["Retro-authorization"], existing: false, typical: "a retroactive authorization", justification: "Retroactive justification", intake: "Care was delivered before an authorization was in place. Say what, when and why." },
];

export const authType = (kind: AuthKind): AuthTypeDef => AUTH_TYPES.find((t) => t.kind === kind) ?? AUTH_TYPES[0];
export const isAuthKind = (v: string | null | undefined): v is AuthKind => AUTH_TYPES.some((t) => t.kind === v);

/** The request type to record when a kind is chosen. Initial keeps Admission or Initial request when the draft already has one of them. */
export function defaultTypeFor(kind: AuthKind, current: RequestType | null): RequestType {
  const def = authType(kind);
  return current && def.types.includes(current) ? current : def.types[0];
}

/** What the request kind of a recorded type is. Types the demo uses for denial work (peer-to-peer, appeal, resubmission) have none and read as an initial request. */
export function kindOfType(type: RequestType | null): AuthKind {
  return AUTH_TYPES.find((t) => type !== null && t.types.includes(type))?.kind ?? "initial";
}

export const CHANGE_LABEL: Record<ChangeKind, string> = {
  more_units: "More units",
  more_days: "More days",
  revised_dates: "Revised dates",
  service: "Different service or level of care",
  correction: "A correction",
};
export const CHANGE_KINDS = Object.keys(CHANGE_LABEL) as ChangeKind[];

/** Why a retroactive request came after the care. Each is a sentence a person can edit. */
export const RETRO_REASONS = [
  "Coverage was pending when the patient was admitted.",
  "The patient was admitted after hours or on a weekend, and the notice window passed.",
  "The payer was not known on the day of admission.",
  "The notice was sent but the payer has no record of it.",
];
