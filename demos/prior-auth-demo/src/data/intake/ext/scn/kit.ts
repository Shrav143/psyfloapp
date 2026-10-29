import { readEvidence } from "@/data/assess/evidence";
import { moduleById, schemaOf } from "@/data/assess/modules";
import { buildAssessmentPlan, initialChoices } from "@/data/assess/plan";
import { programById } from "@/data/assess/programs";
import { purposeById } from "@/data/assess/purposes";
import type { CareSetting, ConsentEntry, ConsentType, InstrumentEvidence, InstrumentInstance, InstrumentStatus, IntakeConfig, ModuleId, Population, ProgramId } from "@/data/assess/types";
import { REDESIGN_START } from "@/data/va/policy";
import type { BuiltInPayerId } from "@/data/types";
import type { AgentTask, AuditEvent, FieldMap, FieldState, FieldValue, IntakeRecord, SourceRef, Suggestion } from "../../types";

/* Small builders for the five demo scenarios (A to E). They write the same shapes the store writes when a person works, so a seeded record and a record
   a person worked on look alike: field values with where they came from, evidence the simulated reader proposed, and an audit trail. */

export const doc = (docId: string, ref: string, blockId: string, quote?: string): SourceRef => ({ kind: "document", ref, docId, blockId, quote });
export const staffSrc = (ref: string): SourceRef => ({ kind: "staff", ref });

/** A field value. A verified value carries who reviewed it. */
export function fv(value: string, state: FieldState, at: number, by: string, source?: SourceRef, confidence?: FieldValue["confidence"]): FieldValue {
  return { value, state, at, by, source, confidence, ...(state === "verified" ? { reviewedBy: by, reviewedAt: at } : {}) };
}

/** A value for a module field: plain text is typed by the person; an object says where it came from. */
export type Seed = string | { v: string; s?: FieldState; by?: string; src?: SourceRef; at?: number; c?: FieldValue["confidence"] };
export function fieldMap(at: number, by: string, seeds: Record<string, Seed>): FieldMap {
  const out: FieldMap = {};
  for (const [key, s] of Object.entries(seeds)) {
    const o = typeof s === "string" ? { v: s } : s;
    const who = o.by ?? by;
    const state = o.s ?? "verified";
    out[key] = fv(o.v, state, o.at ?? at, who, o.src ?? (state === "verified" ? staffSrc("Entered by staff") : undefined), o.c);
  }
  return out;
}

export interface InstanceSeed {
  status: InstrumentStatus;
  /** When work started and when it last changed. */
  at: number;
  by: string;
  fields?: Record<string, Seed>;
  notes?: string;
  score?: InstrumentInstance["score"];
  loc?: InstrumentInstance["loc"];
  evidence?: InstrumentEvidence[];
  signedBy?: string;
  rolePlay?: boolean;
}
export function instance(moduleId: ModuleId, o: InstanceSeed): InstrumentInstance {
  const signed = o.status === "signed";
  return {
    moduleId, version: 1, status: o.status, fields: fieldMap(o.at, o.by, o.fields ?? {}), notes: o.notes ?? "", evidence: o.evidence ?? [], history: [],
    ...(o.score ? { score: o.score } : {}), ...(o.loc ? { loc: o.loc } : {}),
    startedAt: o.status === "not_started" ? undefined : o.at, updatedAt: o.at,
    ...(signed ? { reviewedBy: o.signedBy ?? o.by, signedBy: o.signedBy ?? o.by, signedAt: o.at, ...(o.rolePlay ? { rolePlay: true } : {}) } : {}),
  };
}

/** Evidence the simulated reader would propose for these fields, kept as a first run: pending, each waiting for a person. The reader reads the record as it
    is, so a document's words and the field's keywords decide what it finds; nothing here is written by hand. */
export function proposed(r: IntakeRecord, moduleId: ModuleId, inst: InstrumentInstance, fieldKeys: string[], at: number, idPrefix: string, max = 1): InstrumentEvidence[] {
  const { proposals } = readEvidence(r, schemaOf(moduleId), { moduleId, instance: inst });
  const out: InstrumentEvidence[] = [];
  let n = 0;
  for (const key of fieldKeys) {
    for (const p of proposals.filter((x) => x.fieldKey === key).slice(0, max)) out.push({ ...p, id: `${idPrefix}-${++n}`, status: "pending", at });
  }
  return out;
}

/** The reader skips a field that already has a value, so a decision made on a field a clinician later wrote in their own words is read as if the field were empty. */
const withoutField = (inst: InstrumentInstance, key: string): InstrumentInstance => ({ ...inst, fields: Object.fromEntries(Object.entries(inst.fields).filter(([k]) => k !== key)) });

/** Puts an accepted piece of evidence into its field the way the store does: the text with its source, who accepted it and when. */
export function accepted(r: IntakeRecord, moduleId: ModuleId, inst: InstrumentInstance, fieldKey: string, at: number, by: string, idPrefix: string, o: { pick?: number; edited?: string } = {}): InstrumentInstance {
  const { proposals } = readEvidence(r, schemaOf(moduleId), { moduleId, instance: withoutField(inst, fieldKey) });
  const p = proposals.filter((x) => x.fieldKey === fieldKey)[o.pick ?? 0];
  if (!p) return inst;
  const text = o.edited ?? p.text;
  const state: FieldState = o.edited ? "verified" : p.source.kind === "document" || p.source.kind === "emr" ? "document_extracted" : "verified";
  const ev: InstrumentEvidence = { ...p, id: `${idPrefix}-${inst.evidence.length + 1}`, status: o.edited ? "edited" : "accepted", at, decidedBy: by, decidedAt: at, ...(o.edited ? { editedText: o.edited } : {}) };
  return {
    ...inst,
    fields: { ...inst.fields, [fieldKey]: { value: text, state, source: p.source, at, by: o.edited ? by : p.agent, confidence: o.edited ? undefined : p.confidence, reviewedBy: by, reviewedAt: at } },
    evidence: [...inst.evidence, ev],
  };
}
/** The same for a piece of evidence a person rejected: it stays in the trail and fills nothing. */
export function rejected(r: IntakeRecord, moduleId: ModuleId, inst: InstrumentInstance, fieldKey: string, at: number, by: string, idPrefix: string, pick = 0): InstrumentInstance {
  const { proposals } = readEvidence(r, schemaOf(moduleId), { moduleId, instance: withoutField(inst, fieldKey) });
  const p = proposals.filter((x) => x.fieldKey === fieldKey)[pick];
  if (!p) return inst;
  return { ...inst, evidence: [...inst.evidence, { ...p, id: `${idPrefix}-${inst.evidence.length + 1}`, status: "rejected", at, decidedBy: by, decidedAt: at }] };
}

/** The configuration a coordinator saved when the intake started: the plan's defaults for the program, population and setting, on the post-transition policy date. */
export function configure(r: IntakeRecord, o: { programId: ProgramId; population: Population; setting: CareSetting; by: string; at: number }): IntakeRecord {
  const purposeId = "initial" as const;
  const plan = buildAssessmentPlan({ programId: o.programId, purposeId, population: o.population, setting: o.setting, state: "VA", payerId: (r.payerId as BuiltInPayerId | null) ?? null, policyDate: REDESIGN_START });
  const config: IntakeConfig = {
    purposeId, programId: o.programId, requestedProgramId: o.programId, population: o.population, setting: o.setting, state: "VA", modules: initialChoices(plan, o.by, o.at),
    planVersion: plan.version, configuredBy: o.by, configuredAt: o.at,
    history: [{ at: o.at, who: o.by, what: "Configured the intake", detail: `${purposeById(purposeId).label} · ${programById(o.programId).label} · ${o.population} · ${o.setting}` }],
  };
  return { ...r, config };
}

/** One consent on the ledger. */
export function consent(r: IntakeRecord, type: ConsentType, status: ConsentEntry["status"], o: { recipient: string; purpose: string; at: number; by: string }): ConsentEntry {
  return { id: `con-${r.id}-${type}`, type, recipient: o.recipient, purpose: o.purpose, status, ...(status === "on_file" ? { at: o.at, by: o.by } : {}) };
}

let seq = 0;
export const resetKit = (): void => {
  seq = 0;
};
export const task = (t: Omit<AgentTask, "id">): AgentTask => ({ id: `task-scn-${++seq}`, ...t });
export const audit = (at: number, actor: string, action: string, detail?: string, o: { ai?: boolean; section?: AuditEvent["section"] } = {}): AuditEvent => ({ id: `ev-scn-${++seq}`, at, actor, action, detail, ai: !!o.ai, section: o.section });
export const suggest = (s: Omit<Suggestion, "id" | "status">): Suggestion => ({ id: `sg-scn-${++seq}`, status: "pending", ...s });

/** The modules of a record, as it holds them, with one instance replaced or added. */
export const withInstruments = (r: IntakeRecord, list: InstrumentInstance[]): IntakeRecord => ({ ...r, instruments: { ...(r.instruments ?? {}), ...Object.fromEntries(list.map((i) => [i.moduleId, i])) } });

export interface Trail {
  key: string;
  /** Which of the reader's proposals for the field (0 is the first). */
  pick?: number;
  /** A person rejected it: it stays in the trail and fills nothing. */
  reject?: boolean;
}
/** The evidence trail of a module a clinician already wrote in their own words: for each field, the document sentence the reader proposed and what the
    clinician decided (edited and accepted, so the field keeps their words and cites the document, or rejected), each with its audit event. */
export function trailEvidence(r: IntakeRecord, moduleId: ModuleId, specs: Trail[], o: { at: number; by: string; prefix: string }): { inst: InstrumentInstance; events: AuditEvent[] } | null {
  let inst = r.instruments?.[moduleId];
  if (!inst) return null;
  const fields = schemaOf(moduleId).sections.flatMap((s) => s.fields);
  const events: AuditEvent[] = [];
  specs.forEach((t, i) => {
    if (!inst) return;
    const at = o.at + i;
    const before = inst.evidence.length;
    inst = t.reject ? rejected(r, moduleId, inst, t.key, at, o.by, o.prefix, t.pick ?? 0) : accepted(r, moduleId, inst, t.key, at, o.by, o.prefix, { pick: t.pick, edited: inst.fields[t.key]?.value });
    const ev = inst.evidence[before];
    if (!ev) return;
    const label = fields.find((f) => f.key === t.key)?.label ?? t.key;
    events.push(audit(at, o.by, `${moduleById(moduleId).label}: ${t.reject ? "Rejected" : ev.status === "edited" ? "Edited and accepted" : "Accepted"} evidence for ${label}`, ev.source.ref, { section: "assessment" }));
  });
  return { inst, events };
}
