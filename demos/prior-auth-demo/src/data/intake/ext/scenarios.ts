import type { IntakeRecord } from "../types";
import { scenarioA } from "./scn/a";
import { scenarioB } from "./scn/b";
import { scenarioC } from "./scn/c";
import { scenarioD } from "./scn/d";
import { scenarioE } from "./scn/e";
import { resetKit } from "./scn/kit";

/* The five demo scenarios, applied last by seedIntakes() so it builds on every other section's seed and never replaces what a person wrote. Each scenario sits at a
   different stage with different documents, missing items, consents and coverage, so switching between them shows five different intakes:
   A IN-3102 adult CPST      assessment under way; CANS template not loaded; a psychiatric assessment found for reuse; coverage unverified; no payment consent
   B IN-3101 youth CPST      needs information; guardian consent, school release and a callback number missing; a seven-month-old CANS found; coverage conflict
   C IN-3112 SUD IOP         ASAM partly drafted from the documents with evidence waiting; level of care not confirmed; coverage ended; no Part 2 consent
   D IN-3110 SUD residential every required module signed and the care plan approved: Prepare Authorization; phone number and provider participation open
   E IN-3115 PHP             assessment signed, draft care plan with three options and no selection; coverage confirmed; PHQ-9 waits for review */
const BUILDERS: Record<string, (r: IntakeRecord) => IntakeRecord> = {
  "IN-3102": scenarioA,
  "IN-3101": scenarioB,
  "IN-3112": scenarioC,
  "IN-3110": scenarioD,
  "IN-3115": scenarioE,
};

export const extendScenarios = (records: IntakeRecord[]): IntakeRecord[] => {
  resetKit();
  return records.map((r) => (BUILDERS[r.id] ? BUILDERS[r.id](r) : r));
};
