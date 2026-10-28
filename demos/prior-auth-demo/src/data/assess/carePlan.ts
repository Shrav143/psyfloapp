import { staffOf } from "../intake/seed";
import { ASSESSMENT_SECTIONS, type IntakeRecord, type ServiceRecommendation, type SourceRef } from "../intake/types";
import { availableOn, requirementsFor, SOURCES, type PolicyRule } from "../va/policy";
import { serviceById, type VaServiceId } from "../va/services";
import { buildAssessmentPlan } from "./plan";
import { isCoreModule, moduleById, schemaOf } from "./modules";
import { PROGRAMS_V2, programById, programForService } from "./programs";
import type { BuiltInPayerId } from "../types";
import type { CarePlan, ModuleId, Population, ProgramId } from "./types";

/* Care planning, as data. The clinician selects the service; Psyflo assembles what a clinician reads (a summary built from signed work, the options with
   their evidence and what is missing) and never ranks, recommends or selects. Everything here is pure: the screens and the readiness engine read it. */

/** One version of an approved care plan, kept when the plan is revised. Nothing an approver signed is overwritten. */
export interface CarePlanVersion {
  version: number;
  approvedBy?: string;
  approvedAt?: number;
  rolePlay?: boolean;
  supersededAt: number;
  /** Why the plan was reopened. */
  reason: string;
  selectedServiceId: VaServiceId | "external" | null;
  goals: string[];
  interventions: string;
  frequency: string;
  duration: string;
}
export interface CareSelection {
  at: number;
  who: string;
  /** The service selected before (null for the first selection) and after. */
  from: VaServiceId | "external" | null;
  to: VaServiceId | "external";
  reason: string;
  rolePlay?: boolean;
}
export interface CareSummary {
  /** The text a person edits. It starts as an AI suggested draft built from the lines below and stays a draft until a clinician confirms it. */
  text: string;
  ai: boolean;
  draftedAt: number;
  confirmedBy?: string;
  confirmedAt?: number;
  rolePlay?: boolean;
}

/* The care plan form's fields beyond the foundation's CarePlan (types.ts is the lead's file; these merge into the same interface). */
declare module "./types" {
  interface CarePlan {
    /** The Virginia service the clinician selected, or "external" for a program outside the Medicaid service list. */
    selectedServiceId?: VaServiceId | "external" | null;
    /** What the referral asked for, as it stood when the plan was started. */
    requestedServiceId?: VaServiceId;
    /** Typed by the clinician. Psyflo suggests no amount. */
    duration?: string;
    responsibleStaff?: string;
    /** Transition or discharge plan. */
    transition?: string;
    caregiver?: string;
    summary?: CareSummary;
    version?: number;
    versions?: CarePlanVersion[];
    selections?: CareSelection[];
  }
}

/* ------------------------------------------------------------------ the requested and the selected service */
/** What the referral originally asked for: the configuration keeps it for the audit trail even after "Make this the requested service". */
export function requestedServiceOf(r: IntakeRecord): VaServiceId {
  if (r.carePlan?.requestedServiceId) return r.carePlan.requestedServiceId;
  if (r.config) return programById(r.config.requestedProgramId).serviceId;
  return r.serviceId;
}
/** The clinician's selection: the care plan's, or a pathway selected on the round 9 screen. */
export function selectedServiceOf(r: IntakeRecord): VaServiceId | "external" | null {
  if (r.carePlan?.selectedServiceId !== undefined) return r.carePlan.selectedServiceId;
  const sel = r.pathways.find((p) => p.status === "selected");
  return sel ? sel.serviceId : null;
}
export const serviceName = (id: VaServiceId | "external" | null, external?: string): string => (id === null ? "No service selected" : id === "external" ? external ?? "External program" : serviceById(id).label);
export const serviceShort = (id: VaServiceId | "external" | null, external?: string): string => (id === null ? "None" : id === "external" ? external ?? "External program" : serviceById(id).short);
export const externalLabelOf = (r: IntakeRecord): string | undefined => r.pathways.find((p) => p.serviceId === "external" && p.status === "selected")?.externalLabel;

/** The program an intake is evaluated for when a service is selected: the current one if it already stands for that service, else the first that fits the population. */
export function programForSelection(serviceId: VaServiceId, population: Population, current?: ProgramId): ProgramId | null {
  if (current && programById(current).serviceId === serviceId) return current;
  const matches = PROGRAMS_V2.filter((p) => p.serviceId === serviceId);
  return (matches.find((p) => p.populations.includes(population)) ?? matches[0])?.id ?? null;
}

export function blankCarePlan(r: IntakeRecord): CarePlan {
  const requested = requestedServiceOf(r);
  return {
    status: "draft", requestedProgramId: r.config?.requestedProgramId ?? programForService(r.serviceId)?.id ?? "general", selectedProgramId: null, rationale: "", goals: [],
    interventions: "", frequency: "", coordination: "", history: [], selectedServiceId: null, requestedServiceId: requested, duration: "",
    transition: "", caregiver: "", version: 1, versions: [], selections: [],
  };
}

/** What stops a care plan from being approved. Approval itself is a clinician's signature; this lists what the plan still lacks. */
export function planGaps(r: IntakeRecord): string[] {
  const c = r.carePlan;
  const out: string[] = [];
  if (r.assessment.status !== "signed") out.push("The clinical assessment is signed (care planning follows it)");
  if (!selectedServiceOf(r)) out.push("A clinician selects the service");
  if (!c || !c.goals.some((g) => g.text.trim())) out.push("At least one treatment goal");
  if (!c?.interventions.trim()) out.push("Planned interventions");
  if (!c?.frequency.trim()) out.push("Frequency requested");
  return out;
}

/* ------------------------------------------------------------------ the clinical summary */
export interface SummaryLine {
  id: string;
  label: string;
  text: string;
  /** Where it came from, as a link into the workspace. */
  from: { label: string; section: string; module?: ModuleId; source?: SourceRef };
  /** signed: a clinician signed the work it comes from. referral: it comes from the referral and is not yet reviewed. draft: from work not yet signed. */
  state: "signed" | "referral" | "draft";
  by?: string;
}
export interface ClinicalSummary {
  lines: SummaryLine[];
  /** Modules in use that are not signed, so not in the summary. */
  unsigned: string[];
}
const clip = (s: string, n = 140): string => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const nameOf = (id?: string): string => (id ? staffOf(id)?.name ?? id : "a clinician");

/** The summary a clinician reads before choosing a service. Only signed work counts as clinician-confirmed; the referral's reason is shown as the referral's. */
export function clinicalSummary(r: IntakeRecord): ClinicalSummary {
  const lines: SummaryLine[] = [];
  const reason = r.referral.reason ?? r.referral.concerns;
  lines.push({
    id: "referral", label: "Reason for referral", text: clip(reason?.value || r.title), state: "referral",
    from: { label: "Referral", section: "referral", source: reason?.source },
  });
  const a = r.assessment;
  for (const s of ASSESSMENT_SECTIONS) {
    if (!["presenting", "symptoms", "functional", "safety"].includes(s.id)) continue;
    const fv = a.fields[s.id];
    if (!fv?.value) continue;
    lines.push({ id: `assessment:${s.id}`, label: s.label, text: clip(fv.value), state: a.status === "signed" ? "signed" : "draft", by: a.attestation?.by, from: { label: "Clinical assessment", section: "clinical" } });
  }
  const unsigned: string[] = [];
  const instruments = r.instruments ?? {};
  for (const [id, inst] of Object.entries(instruments)) {
    const moduleId = id as ModuleId;
    const def = moduleById(moduleId);
    if (!def) continue;
    const off = r.config?.modules.find((m) => m.id === moduleId)?.state === "off";
    if (off) continue;
    if (inst.status !== "signed") {
      if (inst.status !== "not_started" && !isCoreModule(moduleId)) unsigned.push(def.label);
      continue;
    }
    const labels = new Map(schemaOf(moduleId).sections.flatMap((s) => s.fields).map((f) => [f.key, f.label] as const));
    const parts = Object.entries(inst.fields)
      .filter(([, v]) => v.value.trim() && v.state !== "not_applicable")
      .slice(0, 2)
      .map(([k, v]) => `${labels.get(k) ?? k}: ${clip(v.value, 90)}`);
    if (inst.score?.value) parts.push(`Result entered by the clinician: ${clip(inst.score.value, 60)}`);
    if (inst.loc?.confirmed) parts.push(`Level of care confirmed by the clinician: ${inst.loc.confirmed}`);
    lines.push({ id: `module:${moduleId}`, label: def.label, text: parts.join(" · ") || "Signed. No free-text findings entered.", state: "signed", by: inst.signedBy, from: { label: `${def.label}, signed`, section: "instrument", module: moduleId } });
  }
  if (r.cans?.status === "signed" && !instruments.cans) lines.push({ id: "cans", label: "CANS Lifetime", text: "Signed by a clinician. Ratings stay in the CANS section; Psyflo shows none here.", state: "signed", by: r.cans.signedBy, from: { label: "CANS, signed", section: "instrument", module: "cans" } });
  if (r.lon?.status === "dispositioned" && !instruments.lon) lines.push({ id: "lon", label: "Level of Need", text: clip(r.lon.disposition ?? "The clinician recorded a disposition."), state: "signed", by: r.lon.decidedBy, from: { label: "Level of Need, signed", section: "instrument", module: "lon" } });
  if (r.safety) {
    lines.push({
      id: "safety", label: "Safety", state: r.safety.status === "open" ? "draft" : "signed", by: r.safety.acknowledgedBy,
      text: r.safety.status === "open" ? "A safety alert is open. A clinician reviews it first; Psyflo does not decide that a person is safe." : `Alert reviewed by ${nameOf(r.safety.acknowledgedBy)}${r.safety.action ? `: ${r.safety.action.replace(/_/g, " ")}` : ""}.`,
      from: { label: "Safety alert", section: "clinical" },
    });
  }
  return { lines, unsigned };
}

/** The AI suggested draft: the lines above, joined. A person edits and confirms it; it is never the clinician's conclusion. */
export const draftSummaryText = (s: ClinicalSummary): string =>
  s.lines.map((l) => `${l.label}: ${l.text}${l.state === "signed" ? "" : l.state === "referral" ? " (from the referral)" : " (not signed yet)"}`).join("\n");

/* ------------------------------------------------------------------ service options */
export interface RequirementState {
  /** on_file: a final policy row says what the service needs. draft: a draft or unresolved row exists. not_verified: no row. */
  status: "on_file" | "draft" | "not_verified";
  text: string;
  rules: PolicyRule[];
  source?: { title: string; url?: string };
}
const REQ_KINDS: PolicyRule["kind"][] = ["authorization", "registration", "none", "pending"];

/** The authorization requirement for a service, payer and date, from the policy layer. Where there is none the answer says so. */
export function requirementFor(serviceId: VaServiceId | "external", r: Pick<IntakeRecord, "payerId" | "age">, date: number): RequirementState {
  if (serviceId === "external") return { status: "not_verified", text: "Ask the program and the member's plan. Payer requirement not yet verified.", rules: [] };
  const rules = requirementsFor({ serviceId, payerId: r.payerId, age: r.age, setting: serviceById(serviceId).setting, serviceDate: date }).filter((x) => REQ_KINDS.includes(x.kind));
  const firm = rules.find((x) => x.status === "final" && x.kind !== "pending");
  if (firm) return { status: "on_file", text: `${firm.label}. ${firm.detail}`, rules, source: { title: SOURCES[firm.source].title, url: SOURCES[firm.source].url } };
  const soft = rules.find((x) => x.status !== "final");
  if (soft) return { status: "draft", text: `${soft.label}. Payer requirement not yet verified.`, rules, source: { title: SOURCES[soft.source].title, url: SOURCES[soft.source].url } };
  return { status: "not_verified", text: "Payer requirement not yet verified.", rules };
}

/** The date a service's availability is judged on: the planned start, or the policy date when that is later (the post-transition environment is July 1, 2027). */
export const availabilityDate = (r: IntakeRecord, now: number): number => Math.max(r.serviceDate, now);

export interface Availability {
  ok: boolean | null;
  text: string;
  /** Why it is not available: "retired" (it ended before the date, so it cannot be selected) or "starts_later" (it starts after the date: selectable as preparation only). */
  reason?: "retired" | "starts_later";
}
export function availabilityOf(serviceId: VaServiceId | "external", date: number): Availability {
  if (serviceId === "external") return { ok: null, text: "An external program confirms its own start date" };
  const s = serviceById(serviceId);
  if (availableOn(serviceId, date)) return { ok: true, text: s.status === "redesign" ? "Available in this policy period (starts July 1, 2027)" : s.status === "retiring" ? "Available until June 30, 2027" : "Available in this policy period" };
  return s.status === "redesign"
    ? { ok: false, text: "Not available before July 1, 2027", reason: "starts_later" }
    : { ok: false, text: "Not available in this policy period: ended June 30, 2027", reason: "retired" };
}
/** A retired service is never an option a clinician can select: it is listed for the record, with the reason. */
export const NOT_AVAILABLE_REASON = "Not available in this policy period";

/** What the demo can say about the criteria that apply to a service. The licensed criteria are never loaded; a clinician confirms the level from names only. */
export function criteriaNote(serviceId: VaServiceId | "external"): string {
  if (serviceId === "external") return "Set by the receiving program. No criteria are loaded here.";
  const s = serviceById(serviceId);
  if (s.track === "sud") return "ASAM criteria: the licensed criteria are not loaded. A clinician confirms the level from names only.";
  if (serviceId === "mh-iop" || serviceId === "mh-php" || serviceId === "mh-res" || serviceId === "mh-inpt" || serviceId === "prtf") return "Level-of-care criteria (LOCUS or CALOCUS-CASII): the licensed criteria are not loaded. A clinician confirms the level from names only.";
  if (s.group === "redesign" || serviceId === "iih" || serviceId === "tdt" || serviceId === "mhss" || serviceId === "psr") return "CANS Lifetime and Level of Need: the official items and the model are not configured. A clinician records the result.";
  return "No criteria are configured for this service. Psyflo applies none.";
}

export interface OptionEvidence { label: string; module?: ModuleId; source?: SourceRef; signed: boolean }
export interface OptionView {
  pw: ServiceRecommendation;
  name: string;
  availability: Availability;
  evidence: OptionEvidence[];
  missing: string[];
  requirement: RequirementState;
  /** What is known about the criteria that apply (the licensed ones are not loaded). */
  criteria: string;
  /** The clinician has the option under review (or selected it). */
  considered: boolean;
  /** The referral asked for this service. */
  requested: boolean;
  selected: boolean;
}

/** The modules a service's assessment plan requires that are not core forms: what a reader looks for before choosing it. */
function requiredModules(r: IntakeRecord, serviceId: VaServiceId, now: number): ModuleId[] {
  const own = r.config && programById(r.config.programId).serviceId === serviceId;
  if (own && r.config) return r.config.modules.filter((m) => m.state === "active" && m.level === "required" && !isCoreModule(m.id)).map((m) => m.id);
  const pop: Population = r.config?.population ?? (r.age !== null && r.age < 12 ? "child" : r.age !== null && r.age < 18 ? "adolescent" : "adult");
  const pid = programForSelection(serviceId, pop, undefined);
  if (!pid) return [];
  const def = programById(pid);
  const plan = buildAssessmentPlan({ programId: pid, purposeId: r.config?.purposeId ?? "initial", population: def.populations.includes(pop) ? pop : def.defaultPopulation, setting: def.defaultSetting, state: "VA", payerId: (r.payerId as BuiltInPayerId | null) ?? null, policyDate: now });
  return plan.modules.filter((m) => m.level === "required" && !isCoreModule(m.id) && !m.preparation).map((m) => m.id);
}
export const isModuleSigned = (r: IntakeRecord, id: ModuleId): boolean => r.instruments?.[id]?.status === "signed" || (id === "cans" && r.cans?.status === "signed") || (id === "lon" && r.lon?.status === "dispositioned");

export function optionViews(r: IntakeRecord, now: number): OptionView[] {
  const date = availabilityDate(r, now);
  const requestedId = requestedServiceOf(r);
  const selectedId = selectedServiceOf(r);
  return r.pathways.map((pw) => {
    const sid = pw.serviceId;
    const mods = sid === "external" ? [] : requiredModules(r, sid, now);
    const evidence: OptionEvidence[] = [
      ...mods.filter((m) => isModuleSigned(r, m)).map((m) => ({ label: `${moduleById(m).label}, signed${r.instruments?.[m]?.signedBy ? ` by ${nameOf(r.instruments[m].signedBy)}` : ""}`, module: m, signed: true })),
      ...pw.evidence.map((e) => ({ label: e.ref, source: e, signed: false })),
    ];
    const missing = [
      ...mods.filter((m) => !isModuleSigned(r, m)).map((m) => `${moduleById(m).label} is not signed`),
      ...pw.outstanding.filter((o) => !/^clinical review$/i.test(o)),
    ];
    const availability = availabilityOf(sid, date);
    if (availability.ok === false) missing.push(availability.text);
    return {
      pw, name: sid === "external" ? pw.externalLabel ?? "External program" : serviceById(sid).label, availability, evidence, missing: [...new Set(missing)],
      requirement: requirementFor(sid, r, date), criteria: criteriaNote(sid), considered: pw.status === "under_review" || pw.status === "selected", requested: sid === requestedId, selected: sid === selectedId && pw.status === "selected",
    };
  });
}

/** What choosing a service does to the intake's program: the program it moves to and the required modules that program would still need. The completed work is kept; null when the program stays. */
export function programChange(r: IntakeRecord, serviceId: VaServiceId | "external", now: number): { to: ProgramId; label: string; added: string[] } | null {
  const c = r.config;
  if (!c || serviceId === "external") return null;
  const to = programForSelection(serviceId, c.population, c.programId);
  if (!to || to === c.programId) return null;
  const def = programById(to);
  const plan = buildAssessmentPlan({ programId: to, purposeId: c.purposeId, population: c.population, setting: def.settings.includes(c.setting) ? c.setting : def.defaultSetting, state: c.state, payerId: (r.payerId as BuiltInPayerId | null) ?? null, policyDate: now });
  return { to, label: def.label, added: plan.modules.filter((m) => m.level === "required" && !m.preparation && !isCoreModule(m.id) && !isModuleSigned(r, m.id)).map((m) => m.label) };
}
