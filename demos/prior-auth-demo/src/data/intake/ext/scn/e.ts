import { DAY, HOUR } from "@/lib/time";
import type { InstrumentInstance } from "@/data/assess/types";
import type { AuditEvent, IntakeRecord } from "../../types";
import { E_STEPDOWN } from "./docs";
import { audit, consent, doc, fv, instance, staffSrc, task, trailEvidence, withInstruments, type Trail } from "./kit";

/* Scenario E, IN-3115: an adult stepping down from an inpatient psychiatric stay to a partial hospitalization program. E7 seeds the signed assessment and
   the draft care plan with three options and no selection, so a clinician chooses live. This adds the hospital's step-down summary, the evidence trail behind
   the signed modules, a PHQ-9 result waiting for review (the clinician typed what the form gave; Psyflo scores nothing), coverage confirmed with the plan,
   and one open request to the hospital for the discharge medication list. */

const T0 = -DAY;
const TRAIL_AT = T0 + HOUR + 30;
const SCREEN_AT = T0 + 3 * HOUR;
const BY = "dr";

const TRAILS: { moduleId: Parameters<typeof trailEvidence>[1]; specs: Trail[] }[] = [
  { moduleId: "psychiatric", specs: [{ key: "psychiatric.presenting" }, { key: "psychiatric.medications" }] },
  { moduleId: "acute-symptoms", specs: [{ key: "acute-symptoms.course" }] },
  { moduleId: "treatment-history", specs: [{ key: "treatment-history.services" }] },
];

export function scenarioE(r: IntakeRecord): IntakeRecord {
  const sd = (b: string, q: string) => doc(E_STEPDOWN.id, "Step-down summary p.1", b, q);
  let x: IntakeRecord = {
    ...r,
    documents: [...r.documents, E_STEPDOWN],
    referral: {
      ...r.referral,
      reason: r.referral.reason ? { ...r.referral.reason, state: "verified", reviewedBy: "jp", reviewedAt: T0 + 30 } : r.referral.reason,
      referringClinician: fv("Dr. A. Lindqvist, attending psychiatrist (fictional)", "verified", T0 + 30, "jp", staffSrc("Confirmed by phone")),
      referrerContact: fv("(540) 555-0124", "verified", T0 + 30, "jp", staffSrc("Confirmed by phone")),
      hospitalization: fv("Inpatient psychiatry at Shenandoah Health (fictional), 10/02 to 10/14/2026; first inpatient stay.", "verified", T0 + 30, "jp", sd("e2-reason", "Admitted after three weeks of worsening low mood")),
    },
    profile: {
      ...r.profile,
      consentTreatment: fv("Signed", "verified", T0 + HOUR, "jp", staffSrc("Signed at intake")),
      phone: fv("(540) 555-0188", "verified", T0 + HOUR, "jp", staffSrc("Confirmed with the patient")),
      address: fv("Harrisonburg, VA (synthetic)", "verified", T0 + HOUR, "jp", staffSrc("Confirmed with the patient")),
      language: fv("English", "verified", T0 + HOUR, "jp", staffSrc("Confirmed with the patient")),
      medications: fv("Sertraline 150 mg daily and mirtazapine 15 mg at night (synthetic)", "verified", T0 + HOUR, "jp", sd("e2-course", "Sertraline was increased to 150 mg daily")),
      psychHistory: fv("First inpatient stay, 10/02 to 10/14/2026; outpatient prescriber for two years; outpatient therapist in 2025", "verified", T0 + HOUR, "jp", sd("e2-prior", "This was her first inpatient stay.")),
    },
    /* Confirmed with the plan by phone: member, benefit and network. The authorization requirement is still the policy row. */
    eligibility: {
      ...r.eligibility,
      verified: {
        member: { by: "jp", at: T0 + 2 * HOUR, method: "phone", ref: "Provider line reference 7731 (simulated)" },
        benefit: { by: "jp", at: T0 + 2 * HOUR, method: "phone", ref: "Provider line reference 7731 (simulated)" },
        network: { by: "jp", at: T0 + 2 * HOUR, method: "phone", ref: "Provider line reference 7731 (simulated)" },
      },
    },
    consents: [...(r.consents ?? []), consent(r, "release", "on_file", { recipient: "Shenandoah Health (fictional)", purpose: "Receive the discharge summary and medication list", at: T0 + HOUR, by: "jp" })],
  };

  const events: AuditEvent[] = [];
  const done: InstrumentInstance[] = [];
  for (const t of TRAILS) {
    const out = trailEvidence(x, t.moduleId, t.specs, { at: TRAIL_AT, by: BY, prefix: `ev-e-${t.moduleId}` });
    if (!out) continue;
    done.push(out.inst);
    events.push(...out.events);
  }
  /* The PHQ-9 was given at the visit; its result is typed from the form and waits for the clinician's sign-off. The GAD-7 and the C-SSRS are not started. */
  done.push(instance("phq9", {
    status: "awaiting_review", at: SCREEN_AT, by: BY,
    score: { value: "19", administeredBy: BY, administeredAt: SCREEN_AT - HOUR, note: "Typed from the form the clinician administered at the visit (synthetic)" },
    fields: { "phq9.followUp": "Repeat in the second week of the program." },
  }));
  x = withInstruments(x, done);

  x = {
    ...x,
    tasks: [
      ...x.tasks,
      task({ role: "coordination", agent: "navigator", action: "Ask Shenandoah Health for the discharge medication list", status: "needs_you", source: "Draft message to Shenandoah Health (fictional)", at: T0 + 4 * HOUR, approval: "required", kind: "request", approveHere: true, result: "Draft: please send the discharge medication list and the nursing notes for H.T., 45, admitted 10/02/2026. Nothing is sent until a person approves it (simulated secure message)." }),
    ],
    audit: [
      ...x.audit,
      audit(T0 + 40, "jp", "Received the step-down summary (simulated import)", E_STEPDOWN.name, { section: "referral" }),
      audit(T0 + 2 * HOUR, "jp", "Confirmed member, benefit and network with the plan by phone (simulated)", "Provider line reference 7731", { section: "coverage" }),
      audit(SCREEN_AT, BY, "PHQ-9: Entered the result of the administered instrument", "Result as typed by the clinician", { section: "assessment" }),
      ...events,
    ],
  };
  return x;
}
