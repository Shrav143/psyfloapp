import { HOUR } from "@/lib/time";
import type { AgentTask, AuditEvent, FieldValue, IntakeRecord, SourceRef } from "../types";

/* Seed content for documentation and review, the assistant panel and the transition view. Applied last, after every other section's seed:
   it fills only what is still empty (and marks IN-3110's extracted plan as verified), so it never overrides another section's data.
   - IN-3110 (ARTS residential) is the demo's ready-for-handoff record: one required field (phone) is left missing to show that a complete
     intake and a ready handoff are different things.
   - Tasks that wait for a person get a gate, so they close once the decision is made where it belongs. */

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
      needs: F("Clinician considers ARTS residential; documentation follows in New Case.", "verified", at + HOUR, "dr"),
    },
  };
  const pathways = r.pathways.some((p) => p.status === "selected") ? r.pathways : r.pathways.map((p, i) => (i === 0 ? { ...p, status: "selected" as const, decidedBy: "dr", decidedAt: at + 2 * HOUR + 10, note: "Selected after the clinical assessment." } : p));
  const eligibility = r.eligibility.status !== "not_checked" ? r.eligibility : { ...r.eligibility, status: "active" as const, checkedAt: at + 50, member: "yes" as const, benefit: "yes" as const, network: "yes" as const, authorization: "required" as const };
  return {
    ...r, referral, profile, coverage, assessment, pathways, eligibility,
    audit: [...r.audit, ev(at + 50, "verify", "Checked eligibility (simulated)", "Member active with Anthem HealthKeepers Plus", true, "coverage"), ev(at + 2 * HOUR, "dr", "Attested the clinical assessment", "PsyD, licensed clinical psychologist", false, "assessment"), ev(at + 2 * HOUR + 10, "dr", "Selected ARTS residential on the care pathway", undefined, false, "pathway")],
  };
}

const task = (t: Omit<AgentTask, "id">): AgentTask => ({ id: id("task"), ...t });

export const extendReview = (records: IntakeRecord[]): IntakeRecord[] =>
  records.map((r) => {
    if (r.id === "IN-3110") return readyRecord(r);
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
