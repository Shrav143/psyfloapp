import { DAY, HOUR } from "@/lib/time";
import { REPLY_TASK_ACTION } from "../referral";
import type { IntakeRecord } from "../../types";
import { C_DISCHARGE, C_UDS } from "./docs";
import { accepted, audit, configure, consent, doc, fv, instance, proposed, staffSrc, task, withInstruments } from "./kit";

/* Scenario C, IN-3112: an adult stepping down from residential treatment to a substance use IOP. The referrer's reply arrived (a residential discharge
   summary and a urine screen note), the referral was accepted and the clinician started the assessment: the ASAM dimensions and the substance use history are
   partly drafted from the documents with evidence still waiting, the level-of-care review has no confirmed level, and an ASAM from the residential
   program is found for review. Coverage is the problem here: the simulated response shows it ended, and no Part 2 or payment consent is on file. */

const T0 = -4 * DAY;
const REPLY_AT = -DAY - HOUR;
const ACCEPT_AT = -DAY + HOUR;
const CONFIG_AT = ACCEPT_AT + HOUR;
const WORK_AT = CONFIG_AT + 2 * HOUR;

export function scenarioC(r: IntakeRecord): IntakeRecord {
  const dc = (b: string, q: string) => doc(C_DISCHARGE.id, "Discharge summary p.1", b, q);
  let x: IntakeRecord = {
    ...r,
    triage: "accepted",
    triageNote: undefined,
    documents: [...r.documents, C_DISCHARGE, C_UDS],
    referral: {
      ...r.referral,
      referringClinician: fv("Intake nurse, Richmond treatment program (fictional)", "verified", T0 + HOUR, "tb", staffSrc("Confirmed by phone")),
      referrerContact: fv("(804) 555-0150", "verified", T0 + HOUR, "tb", staffSrc("Confirmed by phone")),
      concerns: fv("Daily opioid use for eight months and one overdose in June; residential treatment completed 10/09; buprenorphine daily since.", "document_extracted", REPLY_AT, "reader", dc("c2-reason", "one overdose in June 2026"), "high"),
      hospitalization: fv("Residential treatment 08/05/2026 to 10/09/2026 at Riverside Recovery Center (fictional).", "document_extracted", REPLY_AT, "reader", dc("c2-reason", "Admitted after eight months"), "high"),
    },
    profile: {
      ...r.profile,
      consentTreatment: fv("Signed", "verified", ACCEPT_AT, "tb", staffSrc("Signed at the intake call")),
      phone: fv("(804) 555-0166", "patient_reported", T0 + 2 * HOUR, "tb", staffSrc("Phone call with the patient")),
      address: fv("Richmond, VA (synthetic)", "patient_reported", T0 + 2 * HOUR, "tb", staffSrc("Phone call with the patient")),
      language: fv("English", "patient_reported", T0 + 2 * HOUR, "tb", staffSrc("Phone call with the patient")),
      emergencyContact: fv("Her mother, (804) 555-0171", "patient_reported", T0 + 2 * HOUR, "tb", staffSrc("Phone call with the patient")),
      medications: fv("Buprenorphine-naloxone, daily. The dose is not stated in the discharge summary.", "document_extracted", REPLY_AT, "reader", dc("c2-meds", "Buprenorphine-naloxone"), "medium"),
      housing: fv("Will live with her mother and younger brother in Richmond", "document_extracted", REPLY_AT, "reader", dc("c2-env", "She will be living with her mother"), "high"),
    },
    referralDecision: { kind: "accepted", at: ACCEPT_AT, by: "tb", note: "Discharge summary and urine screen note received" },
    consents: [
      consent(r, "treatment", "on_file", { recipient: "This clinic", purpose: "Treatment", at: ACCEPT_AT, by: "tb" }),
      consent(r, "part2_disclosure", "needed", { recipient: "Sentara Community Plan", purpose: "Substance use treatment records for payment (organization protocol, not legal advice)", at: ACCEPT_AT, by: "tb" }),
      consent(r, "payment", "needed", { recipient: "Sentara Community Plan", purpose: "Authorization requests and payment", at: ACCEPT_AT, by: "tb" }),
    ],
  };
  x = configure(x, { programId: "sud-iop", population: "adult", setting: "outpatient", by: "tb", at: CONFIG_AT });

  /* The clinical interview: three sections from the documents, one from the visit. Safety is the clinician's to document. */
  x = {
    ...x,
    assessment: {
      ...x.assessment, mode: "manual", status: "in_progress",
      fields: {
        ...x.assessment.fields,
        history: fv("Daily opioid use for eight months, one overdose in June 2026 reversed with naloxone; two outpatient attempts ended in relapse within weeks.", "document_extracted", REPLY_AT, "reader", dc("c2-reason", "one overdose in June 2026"), "high"),
        symptoms: fv("Cravings were strong in the first month of residential care and mild since September; anxiety and low mood early on, improved (patient, at the visit).", "patient_reported", WORK_AT, "dr", staffSrc("Visit with the clinician")),
        sdoh: fv("Living with her mother and younger brother; no car, transportation is a barrier; part-time warehouse work with shifts.", "document_extracted", REPLY_AT, "reader", dc("c2-env", "transportation to treatment is a barrier"), "high"),
      },
    },
  };

  /* Modules. The first run of the evidence reader is waiting in the history, the ASAM dimensions and the recovery environment. */
  let hx = instance("sud-history", { status: "in_progress", at: WORK_AT, by: "dr", fields: { "sudhx.lastuse": "2026-08-04" } });
  hx = accepted(x, "sud-history", hx, "sudhx.substances", WORK_AT + 5, "dr", "ev-c-hx");
  hx = accepted(x, "sud-history", hx, "sudhx.frequency", WORK_AT + 10, "dr", "ev-c-hx");
  hx = accepted(x, "sud-history", hx, "sudhx.mat", WORK_AT + 15, "dr", "ev-c-hx");
  hx = { ...hx, evidence: [...hx.evidence, ...proposed(x, "sud-history", hx, ["sudhx.overdose", "sudhx.treatment", "sudhx.duration"], WORK_AT + 20, "ev-c-hxp")] };
  let asam = instance("asam", { status: "in_progress", at: WORK_AT + HOUR, by: "dr" });
  asam = accepted(x, "asam", asam, "asam.d1.findings", WORK_AT + HOUR + 5, "dr", "ev-c-asam");
  asam = accepted(x, "asam", asam, "asam.d5.findings", WORK_AT + HOUR + 10, "dr", "ev-c-asam");
  asam = { ...asam, evidence: [...asam.evidence, ...proposed(x, "asam", asam, ["asam.d2.findings", "asam.d3.findings", "asam.d4.findings", "asam.d6.findings"], WORK_AT + HOUR + 15, "ev-c-asamp")] };
  let env = instance("recovery-env", { status: "in_progress", at: WORK_AT + 2 * HOUR, by: "dr", fields: { "re.employment": "Part time at a warehouse" } });
  env = accepted(x, "recovery-env", env, "re.housing", WORK_AT + 2 * HOUR + 5, "dr", "ev-c-env");
  env = { ...env, evidence: [...env.evidence, ...proposed(x, "recovery-env", env, ["re.supports", "re.barriers", "re.transport"], WORK_AT + 2 * HOUR + 10, "ev-c-envp")] };
  const tx = instance("treatment-history", {
    status: "awaiting_review", at: WORK_AT + 3 * HOUR, by: "dr",
    fields: {
      "treatment-history.services": "Two outpatient attempts in 2025 and 2026; residential treatment 08/05/2026 to 10/09/2026, with buprenorphine-naloxone and a weekly therapist.",
      "treatment-history.outcomes": "Outpatient: relapse within weeks each time. Residential: completed, abstinent from opioids since admission, relapse prevention plan done.",
      "treatment-history.lower": "Outpatient care alone did not hold twice, before residential treatment.",
    },
  });
  const fn = instance("functional-assessment", { status: "in_progress", at: WORK_AT + 3 * HOUR + 30, by: "dr", fields: { "functional-assessment.workSchool": "Works part time at a warehouse; needs a treatment schedule that fits her shifts." } });
  const loc = instance("loc-review", { status: "in_progress", at: WORK_AT + 4 * HOUR, by: "dr", loc: { requested: "IOP" } });
  x = withInstruments(x, [hx, asam, env, tx, fn, loc]);

  const pending = [hx, asam, env].reduce((n, i) => n + i.evidence.filter((e) => e.status === "pending").length, 0);
  x = {
    ...x,
    tasks: [
      ...x.tasks.map((t) => (t.action === REPLY_TASK_ACTION ? { ...t, status: "done" as const, result: "Reply received (simulated): a residential discharge summary and a urine screen note. The current buprenorphine dose was not in either." } : t)),
      task({ role: "documentation", agent: "reader", action: "Read the discharge summary and the urine screen note", status: "done", section: "assessment", source: `${C_DISCHARGE.name}; ${C_UDS.name}`, at: REPLY_AT + 10, approval: "none", result: `${pending} pieces of evidence wait in the ASAM, substance use history and recovery environment modules` }),
      task({ role: "completion", agent: "integrity", action: "Confirm the current buprenorphine dose with the prescriber", status: "needs_you", section: "assessment", at: REPLY_AT + 20, approval: "none", kind: "manual", result: "The discharge summary does not state the dose. Ask the outpatient prescriber and record it in the ASAM medication findings." }),
      task({ role: "completion", agent: "integrity", action: "Ask the plan whether the Medicaid renewal was processed", status: "needs_you", section: "coverage", at: T0 + 3 * DAY, approval: "none", kind: "manual", result: "The simulated response shows Sentara Community Plan coverage ended 09/30/2026. Confirm with the plan before an authorization is prepared." }),
      task({ role: "completion", agent: "integrity", action: "Get the Part 2 disclosure and payment consents", status: "needs_you", section: "profile", at: ACCEPT_AT, approval: "none", kind: "manual", result: "Substance use records need her consent before they are disclosed to the plan. Organization protocol, not legal advice." }),
    ],
    audit: [
      ...x.audit,
      audit(REPLY_AT, "tb", "Received the residential discharge summary and the urine screen note (simulated import)", undefined, { section: "referral" }),
      audit(ACCEPT_AT, "tb", "Accepted for assessment", "Discharge summary and urine screen note received", { section: "referral" }),
      audit(CONFIG_AT, "tb", "Configured the intake", "Initial assessment · SUD intensive outpatient program · adult · outpatient", { section: "assessment" }),
      audit(WORK_AT + HOUR + 15, "reader", "ASAM multidimensional assessment: Proposed 4 pieces of evidence", "Draft from the simulated evidence reader: each one waits for a person to accept, edit or reject it", { ai: true, section: "assessment" }),
    ],
  };
  return x;
}
