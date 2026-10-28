import { DAY, HOUR } from "@/lib/time";
import type { IntakeRecord } from "../../types";
import { A_CSB, A_PSYCH } from "./docs";
import { accepted, audit, configure, consent, doc, fv, instance, proposed, staffSrc, suggest, task, withInstruments } from "./kit";

/* Scenario A, IN-3102: an adult on Mental Health Skill-Building (retires June 30, 2027) is evaluated for CPST: Adult, Community. R.H. is an existing
   client of Site B, so the referral is internal and the records come from the people who treated him. The assessment is under way: the clinical interview
   is half done, two community modules are in progress with evidence waiting, a psychiatric assessment from an earlier episode is found for reuse, and the
   CANS Lifetime has no template loaded, so the administrator step is the next thing to show. Coverage is active in the simulated response and nobody has
   confirmed it with the plan, and no payment consent is on file yet. */

const T0 = -6 * DAY;
const CONFIG_AT = T0 + DAY + HOUR;
const WORK_AT = T0 + 2 * DAY;

export function scenarioA(r: IntakeRecord): IntakeRecord {
  const psych = (b: string, q: string) => doc("doc-b3", "Psychiatric evaluation p.1", b, q);
  const csb = (b: string, q: string) => doc("doc-b2", "Community services board summary p.1", b, q);
  let x: IntakeRecord = {
    ...r,
    triage: "accepted",
    documents: [...r.documents, A_CSB, A_PSYCH],
    referral: {
      ...r.referral,
      currentProviders: fv("Bayview Psychiatry (Dr. M. Osei, fictional); a skill-building worker at this clinic", "document_extracted", T0 + 2 * HOUR, "reader", psych("b3-plan", "Continue the current medications."), "high"),
      existingAssessments: fv("Psychiatric evaluation 02/17/2026 (Bayview Psychiatry); case management discharge summary 06/2024 (Tidewater Community Services Board)", "verified", T0 + 3 * HOUR, "jp", staffSrc("Records received for the transition review")),
    },
    profile: { ...r.profile, roi: fv("On file", "verified", T0 + 3 * HOUR, "jp", staffSrc("Release signed at the transition review")) },
    referralDecision: { kind: "accepted", at: T0 + HOUR, by: "jp", note: "Existing client on a service that retires June 30, 2027" },
    consents: [
      consent(r, "treatment", "on_file", { recipient: "This clinic", purpose: "Treatment", at: T0, by: "jp" }),
      consent(r, "release", "on_file", { recipient: "Bayview Psychiatry and Tidewater Community Services Board (fictional)", purpose: "Receive earlier records for the transition review", at: T0 + 3 * HOUR, by: "jp" }),
      consent(r, "payment", "needed", { recipient: "Anthem HealthKeepers Plus", purpose: "Authorization requests for the new service", at: T0, by: "jp" }),
    ],
  };
  x = configure(x, { programId: "cpst-adult", population: "adult", setting: "community", by: "jp", at: CONFIG_AT });

  /* Values the reader found in the new records wait in the profile for a person to confirm. */
  const meds = suggest({ section: "profile", field: "medications", value: "Aripiprazole 15 mg daily; lamotrigine 150 mg daily", source: psych("b3-meds", "Aripiprazole 15 mg daily"), confidence: "high", agent: "reader", at: T0 + 3 * HOUR });
  const hist = suggest({ section: "profile", field: "psychHistory", value: "Two psychiatric hospitalizations in 2023, both after stopping medications; none since", source: psych("b3-hist", "Two psychiatric hospitalizations in 2023"), confidence: "high", agent: "reader", at: T0 + 3 * HOUR });
  const supports = suggest({ section: "profile", field: "supports", value: "His sister, every Sunday; a skill-building worker", source: csb("b2-func", "Sees his sister every Sunday"), confidence: "medium", agent: "reader", at: T0 + 3 * HOUR });
  x = { ...x, suggestions: [...x.suggestions, meds, hist, supports] };

  /* Two community modules in progress. Some fields are typed, one is accepted from the evaluation, and the reader's first run waits for a decision. */
  let needs = instance("functional-needs", {
    status: "in_progress", at: WORK_AT, by: "hk",
    fields: { "functionalNeeds.currentSupport": "Mental Health Skill-Building three times a week since 2024; medication management through this clinic.", "functionalNeeds.selfCare": "Needs reminders" },
  });
  needs = accepted(x, "functional-needs", needs, "functionalNeeds.summary", WORK_AT + HOUR, "hk", "ev-a-fn");
  needs = { ...needs, evidence: [...needs.evidence, ...proposed(x, "functional-needs", needs, ["functionalNeeds.impact", "functionalNeeds.goals", "functionalNeeds.strengths"], WORK_AT + HOUR + 5, "ev-a-fnp")] };
  let living = instance("community-living", {
    status: "in_progress", at: WORK_AT + 2 * HOUR, by: "hk",
    fields: { "communityLiving.housing": "Rental", "communityLiving.stability": "Stable", "communityLiving.livesWith": "Alone", "communityLiving.work": "Employed", "communityLiving.skills": "Budgeting; Keeping appointments" },
  });
  living = { ...living, evidence: proposed(x, "community-living", living, ["communityLiving.participation", "communityLiving.supports"], WORK_AT + 2 * HOUR + 5, "ev-a-cl") };
  x = withInstruments(x, [needs, living]);

  /* The old CANS and Level of Need work waits: no CANS record, no template. The prior psychiatric assessment (psych-history) is for a person to review or reuse. */
  x = {
    ...x,
    tasks: [
      ...x.tasks,
      task({ role: "documentation", agent: "reader", action: "Read the psychiatric evaluation and the case management summary", status: "needs_you", section: "profile", source: A_PSYCH.name, at: T0 + 3 * HOUR, approval: "required", result: "3 values wait for review in Patient & coverage", gate: { kind: "suggestions", ids: [meds.id, hist.id, supports.id] } }),
      task({ role: "completion", agent: "integrity", action: "Record the consent for payment", status: "needs_you", section: "profile", at: T0 + 4 * HOUR, approval: "none", kind: "manual", result: "No payment consent is on file for the new service. Record it when the person signs. Organization protocol, not legal advice." }),
    ],
    audit: [
      ...x.audit,
      audit(T0 + 2 * HOUR, "jp", "Uploaded the case management discharge summary", A_CSB.name, { section: "referral" }),
      audit(T0 + 3 * HOUR - 20, "jp", "Uploaded the psychiatric evaluation", A_PSYCH.name, { section: "referral" }),
      audit(T0 + 3 * HOUR, "reader", "Read the new records and suggested 3 values", undefined, { ai: true, section: "profile" }),
      audit(CONFIG_AT, "jp", "Configured the intake", "Initial assessment · CPST: Adult, Community · adult · community", { section: "assessment" }),
      audit(WORK_AT + HOUR + 5, "reader", "Functional needs: Proposed 3 pieces of evidence", "Draft from the simulated evidence reader: each one waits for a person to accept, edit or reject it", { ai: true, section: "assessment" }),
    ],
    progress: { section: "m:functional-needs", at: WORK_AT + 2 * HOUR },
  };
  return x;
}
