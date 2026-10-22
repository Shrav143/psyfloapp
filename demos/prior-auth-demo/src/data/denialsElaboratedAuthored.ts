import type { Elaborated } from "./denialsElaborated";

/* The long text for the denials whose analysis is written by hand (AUTHORED_TEXT in denials.ts): D-3318, D-3306 and D-3297.
   Read denialsElaborated.ts for what each field holds and the rules for the wording. */

/** Keyed by denial id. A denial listed here uses this instead of the default for its kind. */
export const ELABORATED_AUTHORED: Record<string, Elaborated> = {};

/** The long text for the dimensions of one denial, keyed by denial id, then by dimension name. Wins over DIMS_LONG. */
export const DIMS_LONG_AUTHORED: Record<string, Record<string, string>> = {};
