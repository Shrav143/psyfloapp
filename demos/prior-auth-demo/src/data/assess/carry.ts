import { staffOf } from "../intake/seed";
import type { FieldMap, IntakeRecord } from "../intake/types";
import { siteName } from "../sites";
import { shortDay } from "@/lib/dates";
import { isoOf } from "../patients";
import { moduleById } from "./modules";
import type { InstrumentInstance, ModuleId, PriorAssessment } from "./types";
import { snapshotOf } from "./versions";

/* Carrying an earlier intake's assessments forward. A continuing intake (continued stay, change in level of care, reassessment, discharge) starts from
   what was already signed: each signed instrument becomes a new version in the new record, its values marked "needs confirmation" with where they came
   from. The earlier version stays in the new record's history and in the old record untouched. A score or level-of-care result is never copied: the
   clinician enters the result of the instrument they administer now. */

export interface SignedVersion {
  version: number;
  signedBy?: string;
  signedAt: number;
  /** The version as it was signed: its fields, result, level-of-care review and notes. */
  snapshot: FieldMap;
}
export interface SignedAssessment {
  moduleId: ModuleId;
  signed: SignedVersion;
  /** Instrument versions this record holds in all (the signed one is the newest signed). */
  inst: InstrumentInstance;
}

/** The newest signed version of an instrument: the working one when it is signed, else the latest signed version kept in its history. */
export function latestSigned(inst: InstrumentInstance | undefined): SignedVersion | null {
  if (!inst) return null;
  if (inst.status === "signed" && inst.signedAt !== undefined) return { version: inst.version, signedBy: inst.signedBy, signedAt: inst.signedAt, snapshot: snapshotOf(inst) };
  for (let i = inst.history.length - 1; i >= 0; i--) {
    const h = inst.history[i];
    if (h.signedAt !== undefined && h.signedBy) return { version: h.version, signedBy: h.signedBy, signedAt: h.signedAt, snapshot: h.fields };
  }
  return null;
}

/** Every module of a record that has a signed version, oldest signature first. */
export function signedAssessmentsOf(r: IntakeRecord | undefined): SignedAssessment[] {
  if (!r?.instruments) return [];
  const out: SignedAssessment[] = [];
  for (const inst of Object.values(r.instruments)) {
    const signed = latestSigned(inst);
    if (signed) out.push({ moduleId: inst.moduleId, signed, inst });
  }
  return out.sort((a, b) => a.signed.signedAt - b.signed.signedAt);
}

export const hasInstrumentWork = (r: IntakeRecord, id: ModuleId): boolean => {
  const i = r.instruments?.[id];
  return !!i && (i.status !== "not_started" || Object.keys(i.fields).length > 0);
};

const dateText = (m: number): string => shortDay(isoOf(m), true);
const carriedLabel = (fromId: string, signed: SignedVersion): string => `Carried forward from ${dateText(signed.signedAt)} (${fromId}, version ${signed.version})`;

/** The values of a signed version as fields of a new one: each marked as needing confirmation, naming where it came from. Reserved result keys are left out. */
export function carriedFields(fromId: string, signed: SignedVersion, at: number, by: string): FieldMap {
  const out: FieldMap = {};
  for (const [key, fv] of Object.entries(signed.snapshot)) {
    if (key.startsWith("~") || !fv.value.trim()) continue;
    out[key] = { value: fv.value, state: "needs_confirmation", at, by, source: { kind: "form", ref: carriedLabel(fromId, signed) } };
  }
  return out;
}

export interface CarryResult {
  record: IntakeRecord;
  /** Assessments found for the person (all signed ones) and how many were put into modules in use. */
  found: number;
  prefilled: number;
}

/** `target` with `source`'s signed assessments carried forward. `inUse` are the modules the new configuration uses: only those are prefilled, and a
    module that already has work is left as it is. Calling it again changes nothing. */
export function carryForward(target: IntakeRecord, source: IntakeRecord, inUse: ModuleId[], at: number, by: string): CarryResult {
  const items = signedAssessmentsOf(source);
  const known = new Set((target.priorAssessments ?? []).map((p) => p.id));
  const prior: PriorAssessment[] = [];
  const instruments = { ...(target.instruments ?? {}) };
  let prefilled = 0;
  for (const { moduleId, signed } of items) {
    const id = `prior-${source.id}-${moduleId}-v${signed.version}`;
    if (!known.has(id)) {
      prior.push({
        id, moduleId, label: moduleById(moduleId).label, date: signed.signedAt, provider: `Psyflo demo clinic, ${siteName(source.site)}`, version: `v${signed.version}`,
        clinician: (signed.signedBy && staffOf(signed.signedBy)?.name) || signed.signedBy || "Not recorded", status: "current", reuse: "unverified",
        note: `Signed in ${source.id}. Carried forward into ${target.id} as a new version; a person confirms each value before it is used. No rule here says it may be reused as is.`,
      });
    }
    if (!inUse.includes(moduleId) || hasInstrumentWork(target, moduleId)) continue;
    instruments[moduleId] = {
      moduleId, version: signed.version + 1, status: "not_started", fields: carriedFields(source.id, signed, at, by), notes: "", evidence: [], updatedAt: at,
      history: [{ version: signed.version, status: "superseded", fields: signed.snapshot, signedBy: signed.signedBy, signedAt: signed.signedAt, supersededAt: at, note: `Carried forward from ${source.id} into ${target.id}` }],
    };
    prefilled++;
  }
  return { record: { ...target, priorAssessments: [...(target.priorAssessments ?? []), ...prior], instruments }, found: items.length, prefilled };
}
