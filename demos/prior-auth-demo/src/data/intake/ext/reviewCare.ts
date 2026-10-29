import { initialChoices, buildAssessmentPlan } from "../../assess/plan";
import { isCoreModule, schemaOf } from "../../assess/modules";
import { programById } from "../../assess/programs";
import type { CareSetting, ConsentEntry, ConsentType, FieldDef, InstrumentInstance, IntakeConfig, ModuleId, Population, ProgramId } from "../../assess/types";
import { HOUR } from "@/lib/time";
import { REDESIGN_START } from "../../va/policy";
import type { BuiltInPayerId } from "../../types";
import type { VaServiceId } from "../../va/services";
import type { FieldMap, FieldValue, IntakeRecord, ServiceRecommendation } from "../types";

/* The care planning seeds for two scenarios: D (ARTS residential) arrives with every required assessment module signed and an approved care plan, so Prepare Authorization is one click away;
   E (mental health PHP) arrives with the assessment signed and a draft care plan with no service selected, so a clinician can choose live. Everything is synthetic and typed as the clinician's own words.
   Nothing here overrides another section's seed: a record that already has a configuration, instruments or a care plan keeps them. */

const WHO = "dr";
const F = (value: string, at: number): FieldValue => ({ value, state: "verified", at, by: WHO, reviewedBy: WHO, reviewedAt: at, source: { kind: "staff", ref: "Entered by Dr. Rivera" } });
const GENERIC = "Documented by Dr. Rivera from the interview and the referral records (synthetic).";

function fallback(f: FieldDef): string {
  switch (f.kind) {
    case "select": case "multi": return f.options?.[0] ?? "Yes";
    case "number": return "2";
    case "date": return "2026-10-19";
    case "check": return "Yes";
    default: return GENERIC;
  }
}

export interface CareSeed {
  programId: ProgramId;
  population: Population;
  setting: CareSetting;
  /** Field text by key, for what a reader of the demo should see in the clinician's words. */
  texts: Record<string, string>;
  /** The level the clinician confirms in level-of-care reviews, by name: the first of these a review offers. */
  levels: string[];
}

export function withConfig(r: IntakeRecord, s: CareSeed): IntakeRecord {
  if (r.config) return r;
  const at = r.createdAt + HOUR;
  const plan = buildAssessmentPlan({ programId: s.programId, purposeId: "initial", population: s.population, setting: s.setting, state: "VA", payerId: (r.payerId as BuiltInPayerId | null) ?? null, policyDate: REDESIGN_START });
  const config: IntakeConfig = {
    purposeId: "initial", programId: s.programId, requestedProgramId: s.programId, population: s.population, setting: s.setting, state: "VA", modules: initialChoices(plan, "ml", at),
    planVersion: plan.version, configuredBy: "ml", configuredAt: at,
    history: [{ at, who: "ml", what: "Configured the intake", detail: `Initial assessment · ${programById(s.programId).label} · ${s.population} · ${s.setting}` }],
  };
  return { ...r, config };
}

/** One signed instance per required module (the clinician typed the findings; nothing here is scored by Psyflo). */
export function withSignedModules(r: IntakeRecord, s: CareSeed): IntakeRecord {
  if (!r.config || r.instruments) return r;
  const at = r.createdAt + 2 * HOUR;
  const instruments: Record<string, InstrumentInstance> = {};
  for (const c of r.config.modules) {
    if (c.state !== "active" || c.level !== "required" || isCoreModule(c.id)) continue;
    const schema = schemaOf(c.id);
    const fields: FieldMap = {};
    for (const sec of schema.sections) for (const f of sec.fields) if (f.required || s.texts[f.key]) fields[f.key] = F(s.texts[f.key] ?? fallback(f), at);
    const locSection = schema.sections.find((x) => x.type === "loc-review");
    const level = s.levels.find((l) => locSection?.locOptions?.includes(l)) ?? locSection?.locOptions?.[0];
    instruments[c.id] = {
      moduleId: c.id as ModuleId, version: 1, status: "signed", fields, notes: "", evidence: [], history: [], startedAt: at - HOUR, updatedAt: at, reviewedBy: WHO, signedBy: WHO, signedAt: at,
      ...(schema.scoreEntry ? { score: { value: "Result entered by the clinician from the administered instrument (synthetic)", administeredBy: WHO, administeredAt: at } } : {}),
      ...(locSection && level ? { loc: { requested: level, recommendation: level, confirmed: level, confirmedBy: WHO, confirmedAt: at } } : {}),
    };
  }
  return { ...r, instruments };
}

export function withAssessment(r: IntakeRecord, fields: Record<string, string>): IntakeRecord {
  if (r.assessment.status === "signed") return r;
  const at = r.createdAt + 2 * HOUR;
  const merged: FieldMap = { ...r.assessment.fields };
  for (const [k, v] of Object.entries(fields)) if (!merged[k]?.value) merged[k] = F(v, at);
  return { ...r, assessment: { ...r.assessment, mode: "manual", status: "signed", fields: merged, attestation: { by: WHO, credentials: "PsyD, licensed clinical psychologist", at } } };
}

export function withConsents(r: IntakeRecord, types: ConsentType[], recipient: string): IntakeRecord {
  const have = new Set((r.consents ?? []).map((c) => c.type));
  const add: ConsentEntry[] = types.filter((t) => !have.has(t)).map((type, i) => ({
    id: `con-${r.id}-${type}-${i}`, type, recipient: type === "payment" || type === "part2_disclosure" ? recipient : "This clinic", purpose: type === "payment" ? "Authorization requests and payment" : type === "part2_disclosure" ? "Substance use treatment records for payment (organization protocol, not legal advice)" : "Treatment",
    status: "on_file", at: r.createdAt + HOUR, by: "ml",
  }));
  return add.length ? { ...r, consents: [...(r.consents ?? []), ...add] } : r;
}

const option = (id: string, serviceId: VaServiceId, rationale: string, status: ServiceRecommendation["status"], extra: Partial<ServiceRecommendation> = {}): ServiceRecommendation => ({
  id, serviceId, fit: "not_assessed", rationale, evidence: [], outstanding: ["Clinical review"], availability: "available", referralReqs: [], status, suggestedBy: "placement", ...extra,
});
const NEIGHBOR = "A neighboring level of care, listed for the clinician to consider. It is not a recommendation.";

/** Adds the missing neighbors of the evaluated level as options. An option already on the record keeps its status. */
export function withOptions(r: IntakeRecord, serviceIds: VaServiceId[], marks: Partial<Record<VaServiceId, Partial<ServiceRecommendation>>> = {}): IntakeRecord {
  const have = new Set(r.pathways.map((p) => p.serviceId));
  const add = serviceIds.filter((s) => !have.has(s)).map((s) => option(`pw-${r.id}-${s}`, s, NEIGHBOR, "suggested", { addedAt: r.createdAt + 3 * HOUR, ...marks[s] }));
  return add.length ? { ...r, pathways: [...r.pathways, ...add] } : r;
}

/** The diagnosis the referrer documented, in their words, when the record has none. */
export function withDiagnosis(r: IntakeRecord, text: string): IntakeRecord {
  if (r.referral.dxDocumented?.value) return r;
  return { ...r, referral: { ...r.referral, dxDocumented: { value: text, state: "document_extracted", at: r.createdAt, by: "reader", source: { kind: "document", ref: "Referral p.1" } } } };
}
