import { HOUR } from "@/lib/time";
import type { CarePlan } from "../../assess/types";
import type { AgentTask, AuditEvent, FieldValue, IntakeRecord, SourceRef } from "../types";
import { withAssessment, withConfig, withConsents, withDiagnosis, withOptions, withSignedModules, type CareSeed } from "./reviewCare";

/* Seed content for documentation and review, the assistant panel and the transition view. Applied last, after every other section's seed:
   it fills only what is still empty (and marks IN-3110's extracted plan as verified), so it never overrides another section's data.
   - IN-3110 (ARTS residential) is the demo's ready-for-authorization record: every required assessment module is signed and the care plan is approved, so Prepare Authorization is one click away.
     One required field (phone) is left missing to show that a complete intake and a ready handoff are different things.
   - IN-3115 (mental health PHP) arrives with the assessment signed and a draft care plan with no service selected: a clinician chooses live.
   - Tasks that wait for a person get a gate, so they close once the decision is made where it belongs. */

const WHO = "dr";
let k = 0;
const id = (p: string) => `${p}-rv-${++k}`;
const ev = (at: number, actor: string, action: string, detail?: string, ai = false, section?: AuditEvent["section"]): AuditEvent => ({ id: id("ev"), at, actor, action, detail, ai, section });
const F = (value: string, state: FieldValue["state"], at: number, by: string, source?: SourceRef): FieldValue => ({ value, state, at, by, source, ...(state === "verified" ? { reviewedBy: by, reviewedAt: at } : {}) });

function readyRecord(r: IntakeRecord): IntakeRecord {
  const at = r.createdAt;
  const docRef = r.documents[0] ? { kind: "document" as const, ref: "Referral p.1", docId: r.documents[0].id, blockId: `${r.id}-r` } : undefined;
  const put = <T extends Record<string, FieldValue>>(m: T, key: string, v: FieldValue) => (m[key] ? m : { ...m, [key]: v });
  let referral = r.referral;
  referral = put(referral, "referringClinician", F("Dr. L. Okoye, addiction medicine (fictional)", "verified", at + 30, "ml", docRef));
  referral = put(referral, "referrerContact", F("(804) 555-0131", "verified", at + 30, "ml", docRef));
  referral = put(referral, "concerns", F("Alcohol use disorder; completed withdrawal management on 10/16 without complications; two prior relapses within a month of outpatient care.", "verified", at + 30, "ml", docRef));
  let profile = r.profile;
  profile = put(profile, "legalName", F("Jalen Brooks", "verified", at + 40, "ml"));
  profile = put(profile, "dob", F("1990-02-11", "verified", at + 40, "ml"));
  profile = put(profile, "address", F("Richmond, VA (synthetic)", "verified", at + 40, "ml"));
  profile = put(profile, "language", F("English", "patient_reported", at + 40, "ml"));
  profile = put(profile, "consentTreatment", F("Signed", "verified", at + 45, "ml"));
  profile = put(profile, "roi", F("On file", "verified", at + 45, "ml"));
  let coverage = r.coverage;
  coverage = put(coverage, "medicaidId", F("•••• 6630", "verified", at + 50, "verify", { kind: "payer", ref: "Eligibility response (simulated)" }));
  coverage = { ...coverage, plan: F(coverage.plan?.value ?? "Anthem HealthKeepers Plus", "verified", at + 50, "ml"), coverageType: F("Cardinal Care managed care (MCO)", "verified", at + 50, "ml") };
  const assessment = r.assessment.status !== "not_started" ? r.assessment : {
    mode: "manual" as const, status: "signed" as const,
    attestation: { by: "dr", credentials: "PsyD, licensed clinical psychologist", at: at + 2 * HOUR },
    fields: {
      presenting: F("Requests residential treatment after withdrawal management for alcohol use disorder.", "verified", at + HOUR, "dr"),
      symptoms: F("Cravings daily; sleep improving; no withdrawal signs since 10/16.", "verified", at + HOUR, "dr"),
      history: F("Alcohol use since age 19; two outpatient episodes with relapse within a month.", "verified", at + HOUR, "dr"),
      functional: F("Lost job in August; not able to keep appointments while drinking.", "verified", at + HOUR, "dr"),
      safety: F("Screened at intake: no current thoughts of harming self or others. Plan to rescreen at admission.", "verified", at + HOUR, "dr"),
      needs: F("Clinician considers ARTS residential; documentation follows in New Authorization.", "verified", at + HOUR, "dr"),
    },
  };
  const pathways = r.pathways.some((p) => p.status === "selected") ? r.pathways : r.pathways.map((p, i) => (i === 0 ? { ...p, status: "selected" as const, decidedBy: "dr", decidedAt: at + 2 * HOUR + 10, note: "Selected after the clinical assessment." } : p));
  const eligibility = r.eligibility.status !== "not_checked" ? r.eligibility : { ...r.eligibility, status: "active" as const, checkedAt: at + 50, member: "yes" as const, benefit: "yes" as const, network: "yes" as const, authorization: "required" as const };
  return {
    ...r, referral, profile, coverage, assessment, pathways, eligibility,
    audit: [...r.audit, ev(at + 50, "verify", "Checked eligibility (simulated)", "Member active with Anthem HealthKeepers Plus", true, "coverage"), ev(at + 2 * HOUR, "dr", "Attested the clinical assessment", "PsyD, licensed clinical psychologist", false, "assessment"), ev(at + 2 * HOUR + 10, "dr", "Selected ARTS residential on the care pathway", undefined, false, "pathway")],
  };
}

/* ------------------------------------------------------------------ care planning seeds (scenarios D and E) */
const D_SEED: CareSeed = {
  programId: "sud-res", population: "adult", setting: "residential", levels: ["Residential", "Residential/Inpatient"],
  texts: {
    "sudhx.substances": "Alcohol. No other substances in the last 12 months.", "sudhx.frequency": "Daily, about eight to ten drinks", "sudhx.lastuse": "2026-10-14",
    "asam.d1.findings": "Last drink 10/14. Completed withdrawal management on 10/16 without complications; no withdrawal signs since.",
    "asam.d2.findings": "Hypertension, controlled. Liver enzymes were raised at admission and are improving.",
    "asam.d3.findings": "Low mood while drinking. No psychiatric admission.",
    "asam.d4.findings": "Wants treatment. Two outpatient episodes ended in relapse within a month.",
    "asam.d5.findings": "Lives alone with no sober support at home. Lost his job in August.",
    "asam.d6.findings": "No legal involvement. Transportation to outpatient visits is a barrier.",
    "asam.loc.reason": "The clinician reviewed the dimensions and considered residential, partial hospitalization and intensive outpatient. Two outpatient episodes did not hold.",
    "wd.symptoms": "Tremor and sweating on days one to three; resolved by 10/16. No seizures.", "wd.lastuse": "Last drink 10/14, about six days before the interview.",
    "ms.conditions": "Hypertension, controlled. Raised liver enzymes, improving.", "ms.meds": "Lisinopril 10 mg daily; thiamine 100 mg daily; naltrexone 50 mg daily from 10/15.",
    "re.housing": "Lives alone in Richmond, VA (synthetic).", "re.supports": "A sister checks in weekly. No sober peers.", "re.barriers": "Job loss in August; no transportation to outpatient visits.",
    "ra.date": "2026-10-22", "ra.facility": "Residential program (fictional)", "ra.why": "Needs a structured, substance-free setting after withdrawal management; outpatient care did not hold twice.",
    "psych-history.summary": "Low mood during heavy drinking. No psychiatric admission.", "psych-history.current": "No current psychiatric treatment.",
    "treatment-history.services": "Outpatient counseling in 2025 and again in spring 2026.", "treatment-history.outcomes": "Both episodes ended in relapse within a month.",
    "loc-review.rationale": "The clinician reviewed the assessment and considered residential, partial hospitalization and intensive outpatient.",
    "discharge-planning.nextLevel": "Partial hospitalization or intensive outpatient", "discharge-planning.supports": "Sister, peer recovery support and an outpatient prescriber.",
  },
};
const E_SEED: CareSeed = {
  programId: "mh-php", population: "adult", setting: "outpatient", levels: ["Partial hospitalization", "PHP"],
  texts: {
    "treatment-history.services": "Inpatient psychiatric stay at Shenandoah Health (fictional), 10/02 to 10/14. Outpatient prescriber for two years.", "treatment-history.outcomes": "Mood improved after medication changes in hospital. Follow-up is needed.",
    "functional-assessment.daily": "Sleeping four to five hours. Has not been able to cook or manage bills since the hospital stay.", "functional-assessment.impact": "Off work since September. Family helps with transportation.",
    "loc-review.rationale": "The clinician reviewed the discharge summary and the assessment and considered partial hospitalization and intensive outpatient.",
    "psychiatric.presenting": "Major depressive episode with a recent inpatient stay. Low mood, poor sleep and low energy.", "psychiatric.symptoms": "Low mood most days and poor concentration. Safety screening is documented in the clinical assessment.",
    "psychiatric.medications": "Sertraline 150 mg daily and mirtazapine 15 mg at night (synthetic).", "acute-symptoms.onset": "September 2026", "acute-symptoms.course": "Worsened over three weeks before the admission and improved in hospital.",
  },
};
const E_ASSESSMENT = {
  presenting: "Step-down after an inpatient stay for major depression.", symptoms: "Low mood most days, poor sleep, low energy.", functional: "Off work since September; needs help with daily tasks.",
  safety: "Screened by the clinician at the interview. Documented in the clinical assessment; Psyflo does not decide safety.", needs: "The clinician is considering partial hospitalization and intensive outpatient.",
};

function carePlanD(r: IntakeRecord): CarePlan {
  const at = r.createdAt + 3 * HOUR;
  return {
    status: "approved", requestedProgramId: "sud-res", selectedProgramId: "sud-res", selectedBy: WHO, selectedAt: at, rationale: "As requested after clinical review of the assessment.",
    goals: [{ id: `goal-${r.id}-1`, text: "Stay in treatment for the planned residential stay." }, { id: `goal-${r.id}-2`, text: "Build a relapse prevention plan with a named step-down provider." }, { id: `goal-${r.id}-3`, text: "Reconnect with an outpatient prescriber for naltrexone." }],
    interventions: "Individual and group sessions, medication management, and case management for housing and work.", frequency: "Daily structured programming", coordination: "A named step-down provider is to be confirmed before the first continued-stay review.",
    approvedBy: WHO, approvedAt: at + 20, history: [{ at, who: WHO, what: "Selected ARTS residential (ASAM 3.1 to 3.7)" }, { at: at + 20, who: WHO, what: "Approved care plan version 1" }],
    selectedServiceId: "arts-res", requestedServiceId: "arts-res", duration: "14 days, then a continued-stay review", responsibleStaff: WHO, transition: "Step down to partial hospitalization or intensive outpatient with a named provider.",
    caregiver: "A sister is the support person. A release of information is on file.", version: 1, versions: [], selections: [{ at, who: WHO, from: null, to: "arts-res", reason: "As requested after clinical review of the assessment." }],
    summary: { text: "Reason for referral: alcohol use disorder after withdrawal management on 10/16; two outpatient episodes ended in relapse within a month.\nSigned assessment: the clinician documented all six ASAM dimensions and confirmed the level by name.\nThe clinician considered residential, partial hospitalization and intensive outpatient.", ai: true, draftedAt: at - 30, confirmedBy: WHO, confirmedAt: at - 10 },
  };
}
function carePlanE(r: IntakeRecord): CarePlan {
  const at = r.createdAt + 3 * HOUR;
  return {
    status: "draft", requestedProgramId: "mh-php", selectedProgramId: null, rationale: "", goals: [{ id: `goal-${r.id}-1`, text: "Return to a regular sleep routine." }], interventions: "", frequency: "", coordination: "",
    history: [{ at, who: WHO, what: "Started the care plan" }], selectedServiceId: null, requestedServiceId: "mh-php", duration: "", transition: "", caregiver: "", version: 1, versions: [], selections: [],
  };
}

function scenarioD(r: IntakeRecord): IntakeRecord {
  const at = r.createdAt + 3 * HOUR;
  let x = readyRecord(r);
  x = withDiagnosis(x, "F10.20 Alcohol dependence, uncomplicated (documented by the referrer)");
  x = withConfig(x, D_SEED);
  x = withSignedModules(x, D_SEED);
  x = withConsents(x, ["treatment", "payment", "part2_disclosure"], "Anthem HealthKeepers Plus");
  x = withOptions(x, ["arts-php", "arts-iop"], { "arts-php": { status: "under_review", decidedBy: WHO, decidedAt: at }, "arts-iop": { status: "not_selected", decidedBy: WHO, decidedAt: at, note: "Two outpatient episodes did not hold." } });
  return {
    ...x, triage: x.triage === "accepted" ? "ready_screening" : x.triage, carePlan: x.carePlan ?? carePlanD(x),
    audit: [...x.audit, ev(at - HOUR, "ml", "Configured the intake", "Initial assessment · SUD residential treatment", false, "assessment"), ev(at, WHO, "Signed the required assessment modules", undefined, false, "assessment"), ev(at + 20, WHO, "Approved the care plan, version 1", "ARTS residential. Approval is not a payer decision.", false, "pathway")],
  };
}
function scenarioE(r: IntakeRecord): IntakeRecord {
  const at = r.createdAt + 3 * HOUR;
  let x = withDiagnosis(r, "F33.2 Major depressive disorder, recurrent, severe (documented by the discharging clinician)");
  x = withConfig(x, E_SEED);
  x = withAssessment(x, E_ASSESSMENT);
  x = withSignedModules(x, E_SEED);
  x = withConsents(x, ["treatment", "payment"], "Virginia Medicaid fee-for-service");
  x = withOptions(x, ["mh-iop", "opt"]);
  return { ...x, carePlan: x.carePlan ?? carePlanE(x), audit: [...x.audit, ev(at - HOUR, "jp", "Configured the intake", "Initial assessment · Mental health PHP", false, "assessment"), ev(at, WHO, "Signed the required assessment modules", undefined, false, "assessment")] };
}

const task = (t: Omit<AgentTask, "id">): AgentTask => ({ id: id("task"), ...t });

export const extendReview = (records: IntakeRecord[]): IntakeRecord[] =>
  records.map((r) => {
    if (r.id === "IN-3110") return scenarioD(r);
    if (r.id === "IN-3115") return scenarioE(r);
    if (r.id === "IN-3101") {
      return {
        ...r,
        tasks: [
          ...r.tasks.map((t) => (t.status === "needs_you" && t.role === "referral" && !t.gate ? { ...t, gate: { kind: "suggestions" as const, sections: ["referral" as const, "profile" as const, "coverage" as const] } } : t)),
        ],
      };
    }
    if (r.id === "IN-3102") {
      return {
        ...r,
        tasks: [
          ...r.tasks.map((t) => (t.status === "needs_you" && t.role === "pathway" && !t.gate ? { ...t, gate: { kind: "pathway" as const } } : t)),
          task({ role: "eligibility", agent: "verify", action: "Look up the current MHSS authorization in the plan portal (simulated)", status: "error", section: "coverage", source: "Anthem HealthKeepers Plus provider portal (simulated)", at: -2 * HOUR, approval: "none", kind: "auth-lookup", error: "The plan portal did not answer (simulated). Nothing was changed." }),
        ],
        audit: [...r.audit, ev(-2 * HOUR, "verify", "Could not reach the plan portal (simulated)", "Look up the current MHSS authorization", true, "coverage")],
      };
    }
    if (r.id === "IN-3103") {
      const safety = r.suggestions.find((s) => s.section === "assessment" && s.field === "safety");
      return { ...r, tasks: r.tasks.map((t) => (t.status === "needs_you" && t.role === "documentation" && !t.gate && safety ? { ...t, gate: { kind: "suggestions" as const, ids: [safety.id] } } : t)) };
    }
    if (r.id === "IN-3119") return { ...r, tasks: r.tasks.map((t) => (t.status === "needs_you" && /registration/i.test(t.action) ? { ...t, kind: "registration" } : t)) };
    return r;
  });
