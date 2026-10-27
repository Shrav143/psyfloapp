import type { IntakeRecord } from "../types";

/* Seed content for the clinical assessment, AI Scribe and Voice Intake Assistant.
   Scenario D: the intake line's phone system captured the caller's number, so the Voice Intake Assistant skips that question and says so. */
export const extendClinical = (records: IntakeRecord[]): IntakeRecord[] =>
  records.map((r) => {
    if (r.id !== "IN-3104" || r.profile.phone?.value) return r;
    return {
      ...r,
      profile: { ...r.profile, phone: { value: "(276) 555-0134", state: "needs_confirmation", at: r.createdAt, by: "system", source: { kind: "patient", ref: "Caller ID on the intake line (simulated)" } } },
    };
  });
