import type { Program } from "./types";

/* Which level-of-care framework a case is assessed against. ASAM Criteria covers substance use and co-occurring conditions (it is the framework the
   demo's Residential 3.5 and withdrawal management levels come from). For a primary mental health condition with no substance use disorder the
   common frameworks are LOCUS for adults and CALOCUS-CASII for children and adolescents. Payers may also apply their own licensed criteria
   (InterQual, MCG); those are shown as the payer's criteria, never as one of these. */

export type FrameworkId = "asam" | "locus" | "casii";

export interface FrameworkDim {
  /** 1 to 6. */
  n: number;
  name: string;
  /** Two or three words for chips and tight rows. */
  short: string;
}

export interface FrameworkDef {
  id: FrameworkId;
  name: string;
  /** "ASAM", "LOCUS", "CASII". */
  short: string;
  /** Who it is for, one line. */
  scope: string;
  /** How a dimension is rated. */
  scale: { min: number; max: number; label: string };
  dims: FrameworkDim[];
}

export const FRAMEWORKS: Record<FrameworkId, FrameworkDef> = {
  asam: {
    id: "asam",
    name: "ASAM Criteria",
    short: "ASAM",
    scope: "Substance use and co-occurring conditions",
    scale: { min: 0, max: 4, label: "Risk rating 0 to 4" },
    dims: [
      { n: 1, name: "Acute intoxication and withdrawal potential", short: "Withdrawal" },
      { n: 2, name: "Biomedical conditions and complications", short: "Medical" },
      { n: 3, name: "Emotional, behavioral or cognitive conditions", short: "Mood and thinking" },
      { n: 4, name: "Readiness to change", short: "Readiness" },
      { n: 5, name: "Relapse, continued use or continued problem potential", short: "Relapse risk" },
      { n: 6, name: "Recovery and living environment", short: "Environment" },
    ],
  },
  locus: {
    id: "locus",
    name: "LOCUS",
    short: "LOCUS",
    scope: "Adults with a primary mental health condition",
    scale: { min: 1, max: 5, label: "Rating 1 to 5" },
    dims: [
      { n: 1, name: "Risk of harm", short: "Risk of harm" },
      { n: 2, name: "Functional status", short: "Function" },
      { n: 3, name: "Medical, addictive and psychiatric co-morbidity", short: "Co-morbidity" },
      { n: 4, name: "Recovery environment (stress and support)", short: "Environment" },
      { n: 5, name: "Treatment and recovery history", short: "History" },
      { n: 6, name: "Engagement and recovery status", short: "Engagement" },
    ],
  },
  casii: {
    id: "casii",
    name: "CALOCUS-CASII",
    short: "CASII",
    scope: "Children and adolescents with a mental health condition",
    scale: { min: 1, max: 5, label: "Rating 1 to 5" },
    dims: [
      { n: 1, name: "Risk of harm", short: "Risk of harm" },
      { n: 2, name: "Functional status", short: "Function" },
      { n: 3, name: "Co-occurrence of conditions", short: "Co-occurrence" },
      { n: 4, name: "Recovery environment (stress and support)", short: "Environment" },
      { n: 5, name: "Resiliency and treatment history", short: "History" },
      { n: 6, name: "Acceptance and engagement", short: "Engagement" },
    ],
  },
};

/** The diagnosis groups the demo uses, by whether a substance use disorder is part of the picture. */
export type DxTrack = "sud" | "cooccurring" | "mental_health";

/** The framework for a case. Residential 3.5 and withdrawal management are substance use levels of care, so they are always ASAM.
    IOP and PHP follow the diagnosis: any substance use disorder (alone or co-occurring) is ASAM; a mental health condition alone is LOCUS for
    adults and CASII under 18. */
export function frameworkFor({ program, track, age }: { program: Program; track: DxTrack; age: number }): FrameworkId {
  if (program === "RES" || program === "WM") return "asam";
  if (track !== "mental_health") return "asam";
  return age < 18 ? "casii" : "locus";
}
