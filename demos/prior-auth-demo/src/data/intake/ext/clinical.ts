import { HOUR } from "@/lib/time";
import type { FieldValue, IntakeRecord, SourceRef } from "../types";

/* Seed content for the clinical assessment, AI Scribe and Voice Intake Assistant. Applied with the other sections' seeds and merge-friendly: it fills only
   what is still empty and never replaces a value another section's seed or a person wrote.
   - Scenario D: the intake line's phone system captured the caller's number, so the Voice Intake Assistant skips that question and says so.
   - Three assessments with answers on file (a transition review, a step-down referral and a clinician's first visit), each with some answers documented
     and the safety screening left for a clinician, so the Clinical assessment section shows progress per group and what remains. */

type Answers = Partial<Record<keyof IntakeRecord["assessment"]["fields"] & string, { value: string; state: FieldValue["state"]; by: string; source: SourceRef }>>;

const staff = (ref: string): SourceRef => ({ kind: "staff", ref });
const doc = (r: IntakeRecord, ref: string): SourceRef => ({ kind: "document", ref, docId: r.documents[0]?.id });

/** Answers for a record's clinical assessment, each added only when its section is empty. The assessment starts if it had not (unless the answers only came from a referral document). */
function withAnswers(r: IntakeRecord, at: number, answers: Answers, startsAssessment = true): IntakeRecord {
  const fields = { ...r.assessment.fields };
  for (const [id, a] of Object.entries(answers)) {
    if (!a || fields[id]?.value) continue;
    fields[id] = { value: a.value, state: a.state, at, by: a.by, source: a.source, ...(a.state === "verified" ? { reviewedBy: a.by, reviewedAt: at } : {}) };
  }
  return { ...r, assessment: { ...r.assessment, fields, status: startsAssessment && r.assessment.status === "not_started" ? "in_progress" : r.assessment.status } };
}

const SEEDS: Record<string, (r: IntakeRecord) => IntakeRecord> = {
  /* A transition review by phone and at the visit: what R.H. said is documented as patient reported, what the chart says as extracted from it. */
  "IN-3102": (r) => withAnswers(r, r.createdAt + 3 * HOUR, {
    symptoms: { value: "No voices for over a year (R.H.); worries symptoms could return if his services change.", state: "patient_reported", by: "jp", source: staff("Transition review call") },
    history: { value: "Two hospitalizations in 2023, both after stopping medications. The EMR summary documents the diagnosis; Psyflo does not diagnose.", state: "document_extracted", by: "reader", source: { kind: "emr", ref: "EMR summary (simulated)" } },
    functional: { value: "Keeps his apartment; relies on reminders for medications and help with budgeting (R.H.).", state: "patient_reported", by: "jp", source: staff("Transition review call") },
    strengths: { value: "Works 20 hours a week at a grocery store; sees his sister every Sunday; regular contact with a skill-building worker (R.H.).", state: "patient_reported", by: "jp", source: staff("Transition review call") },
  }),
  /* A step-down referral: the program's referral supplies the first answers, which a person still has to confirm. The clinician has not started the assessment. */
  "IN-3112": (r) => withAnswers(r, r.createdAt + HOUR, {
    presenting: { value: "Stable on buprenorphine after residential treatment; the program asks for a step-down to intensive outpatient care.", state: "document_extracted", by: "reader", source: doc(r, "Referral p.1") },
    prior: { value: "Residential treatment completed this year; buprenorphine-naloxone since residential.", state: "document_extracted", by: "reader", source: doc(r, "Referral p.1") },
  }, false),
  /* A community-service client whose retiring service ends June 30, 2027: a clinician began the assessment at the last visit. */
  "IN-3122": (r) => withAnswers(r, r.createdAt + 2 * HOUR, {
    presenting: { value: "Receives psychosocial rehabilitation, which retires on June 30, 2027; asks what comes next (G.N.).", state: "verified", by: "dr", source: staff("Visit with the clinician") },
    functional: { value: "Attends the program four days a week; needs support with scheduling appointments and with the bus (G.N.).", state: "verified", by: "dr", source: staff("Visit with the clinician") },
    strengths: { value: "Regular attendance, a friend group at the program and a stable apartment (G.N.).", state: "verified", by: "dr", source: staff("Visit with the clinician") },
  }),
};

export const extendClinical = (records: IntakeRecord[]): IntakeRecord[] =>
  records.map((r0) => {
    let r = r0;
    if (r.id === "IN-3104" && !r.profile.phone?.value) {
      r = { ...r, profile: { ...r.profile, phone: { value: "(276) 555-0134", state: "needs_confirmation", at: r.createdAt, by: "system", source: { kind: "patient", ref: "Caller ID on the intake line (simulated)" } } } };
    }
    return SEEDS[r.id] ? SEEDS[r.id](r) : r;
  });
