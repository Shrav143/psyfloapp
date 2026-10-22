import type { DenialType } from "./denials";
import type { DimLongByTone, Elaborated } from "./denialsElaborated";

/* The long text for the six kinds of denial that are generated from templates (denialsTemplates.ts), and for the six ASAM dimension names
   (GENERIC_DIMS in denials.ts). Read denialsElaborated.ts for what each field holds and the rules for the wording. */

const EMPTY: Elaborated = { synthesis: "", findings: [], recommendations: [], criteria: [], evidence: [], outlook: "" };

/** The default for each kind of denial. */
export const ELABORATED: Record<DenialType, Elaborated> = {
  "Partial approval": EMPTY,
  "Level-of-care downgrade": EMPTY,
  "Units cut": EMPTY,
  "Late notice": EMPTY,
  "Retro-authorization denied": EMPTY,
  "Full denial": EMPTY,
};

/** The long text for one ASAM dimension, by the dimension's name as it appears in the analysis ("D1 Withdrawal") and its tone
    (good, mid, risk, neutral): what the chart shows, why it matters for the level of care, and what to cite. */
export const DIMS_LONG: Record<string, DimLongByTone> = {};
