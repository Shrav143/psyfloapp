import type { IntakeRecord } from "../types";

/** Seed content for the patient profile, coverage and eligibility. seedIntakes() applies it after building the base records; edit the records in place or return new ones. */
export const extendProfile = (records: IntakeRecord[]): IntakeRecord[] => records;
