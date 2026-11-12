import type { Decision } from "./decisionTypes";
import { generateDecisions } from "./decisionsGen";

export * from "./decisionTypes";

/** Twelve months of payer decisions to the demo date (20 Oct 2026), newest first. Generated once, the same every time. */
export const DECISIONS: readonly Decision[] = generateDecisions();
export const DECISION_BY_ID: ReadonlyMap<string, Decision> = new Map(DECISIONS.map((d) => [d.id, d]));
