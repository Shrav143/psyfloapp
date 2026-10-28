import { FIELD_SPECS, isRequired, type FieldSpec } from "@/data/intake/fields";
import type { FieldValue, IntakeRecord } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";

/* What is missing from a record. The Referral section, the phone checklist and the next action share these. */

/** Values that mean the item is still outstanding, even though the field holds a word. */
const OUTSTANDING_VALUES = ["Needed", "Not obtained"];

const fieldOf = (r: IntakeRecord, spec: FieldSpec): FieldValue | undefined => r[spec.section][spec.key];
export const isMissingValue = (fv: FieldValue | undefined): boolean =>
  !fv || fv.state === "not_collected" || (!fv.value.trim() && fv.state !== "not_applicable") || OUTSTANDING_VALUES.includes(fv.value);

/** The required fields (for this person and service) that are missing or still outstanding. */
export function missingRequired(r: IntakeRecord, section?: FieldSpec["section"]): FieldSpec[] {
  const ctx = { age: r.age, schoolBased: serviceById(r.serviceId).setting === "school" };
  return FIELD_SPECS.filter((s) => (!section || s.section === section) && isRequired(s, ctx) && isMissingValue(fieldOf(r, s)));
}

/** Required documents not attached to a referral this intake is sending out. */
export const missingReferralDocs = (r: IntakeRecord): string[] => r.referralsOut.flatMap((o) => o.docs.filter((d) => d.required && !d.attached).map((d) => d.name));
