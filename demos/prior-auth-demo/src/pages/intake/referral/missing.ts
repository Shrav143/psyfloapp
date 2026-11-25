import { specOf } from "@/data/intake/fields";
import type { FieldValue, IntakeRecord } from "@/data/intake/types";
import { serviceById } from "@/data/va/services";

/* What a referral is still missing, and what must be settled before a person can accept it. The referral stage asks for less than the whole
   intake: address, legal name and consents are collected in Patient & coverage after acceptance. */

/** Values that mean the item is still outstanding, even though the field holds a word. */
const OUTSTANDING_VALUES = ["Needed", "Not obtained"];
export const isMissingValue = (fv: FieldValue | undefined): boolean =>
  !fv || fv.state === "not_collected" || (!fv.value.trim() && fv.state !== "not_applicable") || OUTSTANDING_VALUES.includes(fv.value);

export interface Gap {
  key: string;
  section: "referral" | "profile" | "coverage";
  /** What to ask the referrer for. */
  ask: string;
  /** Accepting for assessment waits on it. */
  blocking: boolean;
}

const labelOf = (key: string) => specOf(key)?.label ?? key;

/** The gaps in a referral, in the order a coordinator would ask. */
export function referralGaps(r: IntakeRecord): Gap[] {
  const gaps: Gap[] = [];
  const has = (section: Gap["section"], key: string) => !isMissingValue(r[section][key]);
  const add = (section: Gap["section"], key: string, ask: string, blocking = false) => {
    if (!has(section, key)) gaps.push({ key, section, ask, blocking });
  };
  add("referral", "reason", labelOf("reason"), true);
  if (!r.initials.trim()) gaps.push({ key: "initials", section: "profile", ask: "The person's name or initials", blocking: true });
  if (isMissingValue(r.referral.requestedService)) gaps.push({ key: "requestedService", section: "referral", ask: "The service or program requested", blocking: true });
  add("referral", "referrerContact", "A callback number for the referrer");
  add("profile", "dob", labelOf("dob"));
  const minor = r.age !== null && r.age < 18;
  if (minor) {
    add("profile", "guardianName", labelOf("guardianName"));
    add("profile", "guardianPhone", labelOf("guardianPhone"));
  } else if (!has("profile", "phone")) {
    gaps.push({ key: "phone", section: "profile", ask: "A phone number for the person", blocking: false });
  }
  if (serviceById(r.serviceId).setting === "school") add("profile", "schoolConsent", "Signed release of school records");
  add("coverage", "plan", "The Medicaid plan");
  add("coverage", "medicaidId", labelOf("medicaidId"));
  return gaps;
}

/** Values a person must confirm before accepting: two sources disagree. */
export const conflictsOf = (r: IntakeRecord): { section: "referral" | "profile" | "coverage"; key: string; text: string }[] =>
  (["referral", "profile", "coverage"] as const).flatMap((section) =>
    Object.entries(r[section]).flatMap(([key, fv]) => (fv.conflict && fv.state === "needs_confirmation" ? [{ section, key, text: fv.conflict }] : [])),
  );

/** Values a person has not confirmed yet: anything with a value that is not Verified. */
export const unconfirmed = (r: IntakeRecord): { section: "referral" | "profile" | "coverage"; key: string }[] =>
  (["referral", "profile", "coverage"] as const).flatMap((section) =>
    Object.entries(r[section]).flatMap(([key, fv]) => (fv.value.trim() && fv.state !== "verified" && fv.state !== "not_applicable" ? [{ section, key }] : [])),
  );
