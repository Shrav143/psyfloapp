import type { IntakeRecord } from "../types";

/** Seed content for the referral section, triage and the queue. seedIntakes() applies it after building the base records; edit the records in place or return new ones. */
export const extendReferral = (records: IntakeRecord[]): IntakeRecord[] => records;
