/* The fields an intake collects, by section and group. Required-ness is conditional: nothing sensitive is required for every intake, and the
   completeness checklist reads `required` from here, so a change of rule is a change of this list. */

export type FieldSection = "referral" | "profile" | "coverage";
export type FieldKind = "text" | "long" | "date" | "phone" | "select";
/** When a field is required: always, only for a minor (a guardian), only when the service needs it, or never (collect as appropriate). */
export type RequiredWhen = "always" | "minor" | "school" | "never";

export interface FieldSpec {
  key: string;
  label: string;
  section: FieldSection;
  group: string;
  kind: FieldKind;
  required: RequiredWhen;
  sensitive?: boolean;
  options?: string[];
  hint?: string;
}

export const FIELD_SPECS: FieldSpec[] = [
  /* referral */
  { key: "sourceOrg", label: "Referral source organization", section: "referral", group: "Referral source", kind: "text", required: "always" },
  { key: "referringClinician", label: "Referring clinician or staff", section: "referral", group: "Referral source", kind: "text", required: "always" },
  { key: "referrerContact", label: "Referrer contact", section: "referral", group: "Referral source", kind: "phone", required: "always" },
  { key: "reason", label: "Reason for referral", section: "referral", group: "Request", kind: "long", required: "always" },
  { key: "concerns", label: "Presenting concerns", section: "referral", group: "Request", kind: "long", required: "always" },
  { key: "symptoms", label: "Current symptoms", section: "referral", group: "Request", kind: "long", required: "never" },
  { key: "dxDocumented", label: "Existing diagnosis, if documented", section: "referral", group: "Clinical context", kind: "text", required: "never", sensitive: true },
  { key: "previousServices", label: "Previous and current services", section: "referral", group: "Clinical context", kind: "long", required: "never" },
  { key: "currentProviders", label: "Current treating providers", section: "referral", group: "Clinical context", kind: "text", required: "never" },
  { key: "hospitalization", label: "Hospitalization or discharge context", section: "referral", group: "Clinical context", kind: "long", required: "never", sensitive: true },
  { key: "preferences", label: "Patient and caregiver preferences", section: "referral", group: "Preferences", kind: "long", required: "never" },
  { key: "notes", label: "Referral notes", section: "referral", group: "Preferences", kind: "long", required: "never" },

  /* profile: demographics */
  { key: "legalName", label: "Legal name", section: "profile", group: "Demographics", kind: "text", required: "always", hint: "Synthetic demo names only" },
  { key: "preferredName", label: "Preferred name", section: "profile", group: "Demographics", kind: "text", required: "never" },
  { key: "dob", label: "Date of birth", section: "profile", group: "Demographics", kind: "date", required: "always" },
  { key: "phone", label: "Phone", section: "profile", group: "Contact", kind: "phone", required: "always" },
  { key: "address", label: "Address", section: "profile", group: "Contact", kind: "text", required: "always" },
  { key: "language", label: "Preferred language", section: "profile", group: "Contact", kind: "select", required: "always", options: ["English", "Spanish", "Arabic", "Vietnamese", "Korean", "Amharic", "Other"] },
  { key: "interpreter", label: "Interpreter needed", section: "profile", group: "Contact", kind: "select", required: "never", options: ["No", "Yes"] },
  { key: "commPrefs", label: "Communication preferences", section: "profile", group: "Contact", kind: "text", required: "never" },
  { key: "emergencyContact", label: "Emergency contact", section: "profile", group: "Contact", kind: "text", required: "never" },
  { key: "guardianName", label: "Guardian or legal representative", section: "profile", group: "Guardian and consent", kind: "text", required: "minor" },
  { key: "guardianPhone", label: "Guardian phone", section: "profile", group: "Guardian and consent", kind: "phone", required: "minor" },
  { key: "consentTreatment", label: "Consent to intake and treatment", section: "profile", group: "Guardian and consent", kind: "select", required: "always", options: ["Signed", "Verbal, to be signed", "Not obtained"] },
  { key: "roi", label: "Release of information", section: "profile", group: "Guardian and consent", kind: "select", required: "never", options: ["On file", "Needed for referral source", "Not needed", "Declined"] },
  { key: "schoolConsent", label: "School release (school-based services)", section: "profile", group: "Guardian and consent", kind: "select", required: "school", options: ["On file", "Needed", "Not applicable"] },
  /* profile: clinical and psychosocial history (collect as appropriate) */
  { key: "medications", label: "Current medications", section: "profile", group: "Clinical and psychosocial history", kind: "long", required: "never", sensitive: true },
  { key: "medical", label: "Medical conditions relevant to care", section: "profile", group: "Clinical and psychosocial history", kind: "long", required: "never", sensitive: true },
  { key: "psychHistory", label: "Psychiatric treatment and hospitalizations", section: "profile", group: "Clinical and psychosocial history", kind: "long", required: "never", sensitive: true },
  { key: "substanceUse", label: "Substance use history", section: "profile", group: "Clinical and psychosocial history", kind: "long", required: "never", sensitive: true },
  { key: "housing", label: "Housing stability", section: "profile", group: "Clinical and psychosocial history", kind: "text", required: "never", sensitive: true },
  { key: "supports", label: "Family and social supports", section: "profile", group: "Clinical and psychosocial history", kind: "long", required: "never" },
  { key: "educationEmployment", label: "Education or employment", section: "profile", group: "Clinical and psychosocial history", kind: "text", required: "never" },
  { key: "legal", label: "Legal-system involvement (when clinically relevant)", section: "profile", group: "Clinical and psychosocial history", kind: "text", required: "never", sensitive: true },
  { key: "transportation", label: "Transportation barriers", section: "profile", group: "Clinical and psychosocial history", kind: "text", required: "never" },
  { key: "accessibility", label: "Accessibility needs", section: "profile", group: "Clinical and psychosocial history", kind: "text", required: "never" },

  /* coverage */
  { key: "medicaidId", label: "Medicaid member ID", section: "coverage", group: "Medicaid", kind: "text", required: "always", hint: "Masked in the demo" },
  { key: "coverageType", label: "Coverage type", section: "coverage", group: "Medicaid", kind: "select", required: "always", options: ["Cardinal Care managed care (MCO)", "Fee-for-service"] },
  { key: "plan", label: "Medicaid managed care organization", section: "coverage", group: "Medicaid", kind: "text", required: "always" },
  { key: "effective", label: "Coverage effective dates", section: "coverage", group: "Medicaid", kind: "text", required: "never" },
  { key: "secondary", label: "Secondary insurance", section: "coverage", group: "Other coverage", kind: "text", required: "never" },
  { key: "otherCoverage", label: "Other coverage", section: "coverage", group: "Other coverage", kind: "text", required: "never" },
  { key: "existingAuths", label: "Existing authorizations, if known", section: "coverage", group: "Authorizations", kind: "long", required: "never" },
];

export const specsFor = (section: FieldSection): FieldSpec[] => FIELD_SPECS.filter((f) => f.section === section);
export const specOf = (key: string): FieldSpec | undefined => FIELD_SPECS.find((f) => f.key === key);
/** Whether a field is required for this person and service. */
export function isRequired(spec: FieldSpec, ctx: { age: number | null; schoolBased: boolean }): boolean {
  if (spec.required === "always") return true;
  if (spec.required === "minor") return ctx.age !== null && ctx.age < 18;
  if (spec.required === "school") return ctx.schoolBased;
  return false;
}
