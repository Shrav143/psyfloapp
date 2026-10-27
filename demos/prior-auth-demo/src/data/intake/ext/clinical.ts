import type { IntakeRecord } from "../types";

/** Seed content for the clinical assessment, AI Scribe and Voice Intake Assistant. seedIntakes() applies it after building the base records; edit the records in place or return new ones. */
export const extendClinical = (records: IntakeRecord[]): IntakeRecord[] => records;
