import { DAY, HOUR } from "@/lib/time";
import type { InstrumentInstance } from "@/data/assess/types";
import type { AuditEvent, IntakeRecord } from "../../types";
import { D_DETOX, D_ED } from "./docs";
import { audit, doc, fv, staffSrc, task, trailEvidence, withInstruments, type Trail } from "./kit";

/* Scenario D, IN-3110: an adult referred for ARTS residential treatment after withdrawal management. E7 seeds the far end: the required modules signed and
   the care plan approved, so Prepare Authorization is one click away. This adds what a reader of the demo should see behind it: an emergency department
   note and a withdrawal management summary, the evidence trail on the signed modules (what the reader proposed from those documents and what Dr. Rivera
   edited, accepted or rejected), the patient's phone number still missing, and coverage confirmed for the member but not for the provider. */

const T0 = -3 * DAY;
const TRAIL_AT = T0 + HOUR + 30;
const BY = "dr";

/** The signed modules' evidence trail: field by field, what the documents offered and what the clinician decided. */
const TRAILS: { moduleId: Parameters<typeof trailEvidence>[1]; specs: Trail[] }[] = [
  { moduleId: "asam", specs: [{ key: "asam.d1.findings", pick: 1 }, { key: "asam.d2.findings", pick: 1 }, { key: "asam.d2.support", pick: 1, reject: true }, { key: "asam.d4.findings", pick: 1 }, { key: "asam.d6.findings" }] },
  { moduleId: "sud-history", specs: [{ key: "sudhx.substances", pick: 1 }, { key: "sudhx.frequency" }] },
  { moduleId: "withdrawal", specs: [{ key: "wd.symptoms", pick: 1 }] },
  { moduleId: "medical-stability", specs: [{ key: "ms.conditions", pick: 1 }, { key: "ms.meds", pick: 1 }] },
  { moduleId: "recovery-env", specs: [{ key: "re.barriers" }] },
  { moduleId: "residential-admission", specs: [{ key: "ra.why", pick: 1 }] },
];

export function scenarioD(r: IntakeRecord): IntakeRecord {
  const detox = (b: string, q: string) => doc(D_DETOX.id, "Withdrawal management summary p.1", b, q);
  const ed = (b: string, q: string) => doc(D_ED.id, "Emergency department note p.1", b, q);
  let x: IntakeRecord = {
    ...r,
    documents: [...r.documents, D_ED, D_DETOX],
    referral: {
      ...r.referral,
      hospitalization: fv("Emergency department 10/14; withdrawal management 10/14 to 10/16 at Valley Withdrawal Center (fictional); no seizures or complications.", "verified", T0 + HOUR, "ml", detox("d3-course", "No seizures and no complications.")),
      previousServices: fv("Outpatient treatment in 2025 and in spring 2026; both ended in relapse within a month.", "verified", T0 + HOUR, "ml", ed("d2-hx", "He had two outpatient treatment episodes")),
    },
    profile: {
      ...r.profile,
      medications: fv("Lisinopril 10 mg daily; thiamine 100 mg daily; naltrexone 50 mg daily from 10/15", "verified", T0 + HOUR, "ml", detox("d3-meds", "Naltrexone")),
      medical: fv("Hypertension, controlled. Liver enzymes raised on admission labs, improving.", "verified", T0 + HOUR, "ml", ed("d2-med", "Liver enzymes were raised on the admission labs.")),
      housing: fv("Lives alone in Richmond, VA (synthetic)", "verified", T0 + HOUR, "ml", detox("d3-why", "He lives alone")),
      supports: fv("A sister checks in weekly; no sober peers at home", "verified", T0 + HOUR, "ml", detox("d3-why", "A sister checks in weekly.")),
    },
    /* Member eligibility was confirmed with the plan by phone. Provider participation was not: it is the open administrative item next to the phone number. */
    eligibility: { ...r.eligibility, verified: { member: { by: "ml", at: T0 + 2 * HOUR, method: "phone", ref: "Plan call reference 0042 (simulated)" } } },
  };

  const events: AuditEvent[] = [];
  const done: InstrumentInstance[] = [];
  for (const t of TRAILS) {
    const out = trailEvidence(x, t.moduleId, t.specs, { at: TRAIL_AT, by: BY, prefix: `ev-d-${t.moduleId}` });
    if (!out) continue;
    done.push(out.inst);
    events.push(...out.events);
  }
  x = withInstruments(x, done);

  x = {
    ...x,
    tasks: [
      ...x.tasks,
      task({ role: "completion", agent: "integrity", action: "Get the patient's phone number", status: "needs_you", section: "profile", at: T0 + 3 * HOUR, approval: "none", result: "Needed before the admission call. Record it in Patient & coverage.", gate: { kind: "check", ids: ["field:profile.phone"] } }),
      task({ role: "coordination", agent: "navigator", action: "Confirm the step-down provider named in the care plan", status: "needs_you", section: "pathway", at: T0 + 4 * HOUR, approval: "none", kind: "manual", result: "The plan names a step-down provider to be confirmed before the first continued-stay review." }),
    ],
    audit: [
      ...x.audit,
      audit(T0 + 30, "ml", "Received the emergency department note and the withdrawal management summary (simulated import)", undefined, { section: "referral" }),
      audit(T0 + 2 * HOUR, "ml", "Confirmed member eligibility with the plan by phone (simulated)", "Plan call reference 0042", { section: "coverage" }),
      ...events,
    ],
  };
  void staffSrc;
  return x;
}
