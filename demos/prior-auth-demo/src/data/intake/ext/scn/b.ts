import { DAY, HOUR } from "@/lib/time";
import { REPLY_TASK_ACTION } from "../referral";
import type { IntakeRecord } from "../../types";
import { accepted, audit, configure, consent, instance, proposed, task, withInstruments } from "./kit";

/* Scenario B, IN-3101: a school referral for a 14-year-old, for CPST: Youth, School Setting. The referral needs information: the guardian's consent and
   the school release are not signed, and the school left no callback number. The coordinator already set up the assessment plan, so the left navigation
   shows the youth modules (caregiver, school, family, CANS, Level of Need) while the intake waits. A CANS from another provider, seven months old, is found
   for review. Coverage is the one with a conflict: the school says Sentara and an older record says Aetna. */

const T0 = -2 * DAY - 3 * HOUR;
const CONFIG_AT = T0 + 3 * HOUR;

export function scenarioB(r: IntakeRecord): IntakeRecord {
  let x: IntakeRecord = {
    ...r,
    triage: "needs_info",
    triageNote: "Waiting on the school: the signed release of school records and a callback number.",
    consents: [
      consent(r, "treatment", "needed", { recipient: "This clinic", purpose: "Consent to treatment, signed by the guardian", at: T0, by: "tb" }),
      consent(r, "release", "needed", { recipient: "Rivermont Middle School (fictional)", purpose: "Receive school records and share treatment updates", at: T0, by: "tb" }),
    ],
  };
  x = configure(x, { programId: "cpst-school", population: "adolescent", setting: "school", by: "tb", at: CONFIG_AT });

  /* The reader's first run on three modules. A few values are typed by the coordinator; the rest waits for a decision. */
  let caregiver = instance("caregiver-coordination", {
    status: "in_progress", at: CONFIG_AT + 2 * HOUR, by: "tb",
    fields: { "caregiverCoordination.relationship": "Parent", "caregiverCoordination.consent": "Requested", "caregiverCoordination.release": "Requested" },
  });
  caregiver = accepted(x, "caregiver-coordination", caregiver, "caregiverCoordination.name", CONFIG_AT + 2 * HOUR + 5, "tb", "ev-b-cg");
  caregiver = { ...caregiver, evidence: [...caregiver.evidence, ...proposed(x, "caregiver-coordination", caregiver, ["caregiverCoordination.role", "caregiverCoordination.contact"], CONFIG_AT + 2 * HOUR + 10, "ev-b-cgp")] };
  let schoolFn = instance("school-functioning", { status: "in_progress", at: CONFIG_AT + 3 * HOUR, by: "tb", fields: { "schoolFunctioning.school": "Rivermont Middle School, grade 8" } });
  schoolFn = {
    ...schoolFn,
    evidence: proposed(x, "school-functioning", schoolFn, ["schoolFunctioning.absences", "schoolFunctioning.academics", "schoolFunctioning.behavior", "schoolFunctioning.strengths", "schoolFunctioning.planDetail"], CONFIG_AT + 3 * HOUR + 5, "ev-b-sf"),
  };
  let schoolFamily = instance("school-family", { status: "in_progress", at: CONFIG_AT + 4 * HOUR, by: "tb", fields: { "schoolFamily.release": "Requested" } });
  schoolFamily = accepted(x, "school-family", schoolFamily, "schoolFamily.contact", CONFIG_AT + 4 * HOUR + 5, "tb", "ev-b-sfm");
  x = withInstruments(x, [caregiver, schoolFn, schoolFamily]);

  x = {
    ...x,
    tasks: [
      ...x.tasks,
      task({ role: "coordination", agent: "navigator", action: REPLY_TASK_ACTION, status: "running", section: "referral", source: "Message to Rivermont Middle School (fictional)", at: T0 + 5 * HOUR, approval: "approved", result: "Asked for the signed release of school records and a callback number for the school counselor (simulated secure message). Follow up in 2 business days." }),
      task({ role: "completion", agent: "integrity", action: "Get the guardian's signed consent to treatment", status: "needs_you", section: "profile", at: T0 + 5 * HOUR, approval: "none", result: "A parent or legal guardian signs for a young person. Record it in Patient & coverage when it is signed.", gate: { kind: "check", ids: ["field:profile.consentTreatment"] } }),
      task({ role: "completion", agent: "integrity", action: "Get the signed release of school records", status: "needs_you", section: "profile", at: T0 + 5 * HOUR + 1, approval: "none", result: "The school counselor is sending it home this week. Record it when it is signed.", gate: { kind: "check", ids: ["field:profile.schoolConsent"] } }),
    ],
    audit: [
      ...x.audit,
      audit(CONFIG_AT, "tb", "Configured the intake", "Initial assessment · CPST: Youth, School Setting · adolescent · school", { section: "assessment" }),
      audit(CONFIG_AT + 2 * HOUR + 10, "reader", "Caregiver coordination: Proposed 2 pieces of evidence", "Draft from the simulated evidence reader: each one waits for a person to accept, edit or reject it", { ai: true, section: "assessment" }),
      audit(T0 + 5 * HOUR, "tb", "Asked the school for the signed release and a callback number (simulated)", undefined, { section: "referral" }),
    ],
  };
  return x;
}
