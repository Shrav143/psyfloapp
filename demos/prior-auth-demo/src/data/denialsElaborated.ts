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

export type DimLongByTone = Record<Tone, string>;

export { ELABORATED, DIMS_LONG } from "./denialsElaboratedTemplates";
export { ELABORATED_AUTHORED, DIMS_LONG_AUTHORED } from "./denialsElaboratedAuthored";
