import type { FieldValue, IntakeRecord } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";
import { longDate } from "@/lib/time";
import { URGENCY_LABEL } from "./labels";
import type { FieldSectionRef } from "@/store/intakeReferral";

/* The requested program, the urgency and the referral date live on the record itself. Records made before the referral screens existed carry no
   field for them, so the value is read from the record and its provenance is inferred from how the record began. */

export type Section = FieldSectionRef;

export const ATTRIBUTE_KEYS = ["person", "requestedService", "urgency", "referralDate"];

/** The field a row shows: the stored one, or one built from the record. */
export function fieldOf(r: IntakeRecord, section: Section, key: string): FieldValue | undefined {
  const stored = r[section][key];
  if (stored || section !== "referral") return stored;
  const typed = r.method === "manual" || r.method === "phone" || r.method === "voice";
  const state = typed ? "verified" : r.documents.length ? "document_extracted" : "patient_reported";
  const base = { state, at: r.createdAt, by: typed ? r.assignedTo : "reader" } as const;
  if (key === "person") return r.initials.trim() ? { ...base, value: `${r.initials}${r.age !== null ? `, ${r.age}` : ""}` } : undefined;
  if (key === "requestedService") return { ...base, value: serviceById(r.serviceId).label };
  if (key === "urgency") return { ...base, value: URGENCY_LABEL[r.urgency] };
  if (key === "referralDate") return { ...base, value: longDate(r.createdAt) };
  return undefined;
}
