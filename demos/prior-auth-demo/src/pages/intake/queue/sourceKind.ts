/* Where a referral came from, in the words a coordinator filters by. The record holds the organization's name, so the kind is read from it. */

export type SourceKind = "hospital" | "school" | "csb" | "clinician" | "court" | "crisis" | "family" | "other";
export const SOURCE_LABEL: Record<SourceKind, string> = {
  hospital: "Hospital or ED", school: "School", csb: "Community services board", clinician: "Clinician or clinic", court: "Court", crisis: "Crisis line", family: "Self or family", other: "Other",
};
export const SOURCE_KINDS = Object.keys(SOURCE_LABEL) as SourceKind[];

const RULES: [SourceKind, RegExp][] = [
  ["family", /self-referral|walk-in|\bparent\b|family|caregiver|guardian|web form/i],
  ["csb", /community services board|\bcsb\b/i],
  ["school", /school|student|college/i],
  ["court", /court|probation|juvenile|justice/i],
  ["crisis", /988|crisis/i],
  ["hospital", /hospital|medical center|emergency|\bED\b|inpatient|health system/i],
  ["clinician", /primary care|family medicine|clinic|counseling|treatment program|center|peer|clinician|psyflo|\bdr\./i],
];

export function sourceKindOf(sourceOrg: string): SourceKind {
  return RULES.find(([, re]) => re.test(sourceOrg))?.[0] ?? "other";
}
