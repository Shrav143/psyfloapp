import { FIELD_SPECS, isRequired, type FieldSpec } from "@/data/intake/fields";
import type { IntakeRecord } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";
import { isMissingValue } from "./missing";

/** The required fields of the whole intake (for this person and service) that are missing or still outstanding. The referral stage asks for less: see referralGaps. */
export function missingRequired(r: IntakeRecord, section?: FieldSpec["section"]): FieldSpec[] {
  const ctx = { age: r.age, schoolBased: serviceById(r.serviceId).setting === "school" };
  return FIELD_SPECS.filter((s) => (!section || s.section === section) && isRequired(s, ctx) && isMissingValue(r[s.section][s.key]));
}
