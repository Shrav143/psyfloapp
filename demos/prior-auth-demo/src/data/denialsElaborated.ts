import type { DenialType } from "./denials";
import type { Tone } from "./types";

/* The long version of every denial analysis. The short lines stay where they are on the Denial Intelligence screen; these are what the
   "full summary" pop-ups show and what the appeal analysis report is built from. Placeholders are the same as in denialsTemplates.ts
   ({payer} {payerName} {program} {age} {who} {approved} {requested} {from} {gap} {unitsRequested} {unitsApproved} {unitsDiff}
   {noteDate} {rangeDates} {similar}) and are filled in pages/denials/lib. Wording follows the product rules: "the chart supports",
   never "the patient needs"; FLO is the assistant; never "AI" or "bot". */

/** One numbered line under "What we would do": a short title and the elaborated paragraph. */
export interface LongRecommendation { title: string; text: string }

export interface Elaborated {
  /** "Core clinical synthesis": what the chart shows as a whole, two short paragraphs separated by a blank line. */
  synthesis: string;
  /** One long paragraph per finding, in the same order and count as that denial's findings (AnalysisText.findings). */
  findings: string[];
  /** "What we would do": six or seven numbered recommendations, in the order to act on them. */
  recommendations: LongRecommendation[];
  /** The criteria and policy to cite, one line each (three to five). */
  criteria: string[];
  /** The documents to attach, one line each (four to seven). */
  evidence: string[];
  /** What to expect if the payer pushes back, and how firm the position is: two or three sentences. */
  outlook: string;
}

/** The default for each kind of denial. */
export const ELABORATED: Record<DenialType, Elaborated> = {
  "Partial approval": { synthesis: "", findings: [], recommendations: [], criteria: [], evidence: [], outlook: "" },
  "Level-of-care downgrade": { synthesis: "", findings: [], recommendations: [], criteria: [], evidence: [], outlook: "" },
  "Units cut": { synthesis: "", findings: [], recommendations: [], criteria: [], evidence: [], outlook: "" },
  "Late notice": { synthesis: "", findings: [], recommendations: [], criteria: [], evidence: [], outlook: "" },
  "Retro-authorization denied": { synthesis: "", findings: [], recommendations: [], criteria: [], evidence: [], outlook: "" },
  "Full denial": { synthesis: "", findings: [], recommendations: [], criteria: [], evidence: [], outlook: "" },
};

/** Denials whose analysis is written out by hand (they win over the default for their kind). Keyed by denial id. */
export const ELABORATED_AUTHORED: Record<string, Elaborated> = {};

/** The long text for one ASAM dimension, by the dimension's name as it appears in the analysis ("D1 Withdrawal") and its tone
    (good, mid, risk, neutral): what the chart shows, why it matters for the level of care, and what to cite. */
export const DIMS_LONG: Record<string, Record<Tone, string>> = {};

/** Hand-written long text for the dimensions of one denial, keyed by denial id, then by dimension name. Wins over DIMS_LONG. */
export const DIMS_LONG_AUTHORED: Record<string, Record<string, string>> = {};
