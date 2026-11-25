import { schemaOf } from "./modules";
import type { FieldDef, InstrumentInstance, ModuleId, ModuleSchema } from "./types";

/* How much of a module is filled in, and what stands between it and review. Pure: the header, the left navigation, the readiness cards and the store's
   gates (mark ready, sign) all read the same numbers. A required field counts when it has a value or is marked not applicable; a score-entry
   module counts the clinician's typed result; a level-of-care review counts the level a clinician confirmed. Nothing here rates or scores anything. */

export interface Completion {
  done: number;
  total: number;
  /** Required fields still empty. */
  missing: FieldDef[];
  percent: number;
  /** Evidence the reader proposed that no person has decided yet. */
  pending: number;
  /** A score-entry module with no result typed yet. */
  scoreMissing: boolean;
  /** A level-of-care review with no clinician-confirmed level yet. */
  locMissing: boolean;
}

export interface Blocker {
  kind: "field" | "evidence" | "score" | "loc";
  label: string;
  /** The field to take the person to. */
  fieldKey?: string;
}

const hasLoc = (schema: ModuleSchema): boolean => schema.sections.some((s) => s.type === "loc-review");
const isFilled = (f: FieldDef, inst: InstrumentInstance | undefined): boolean => {
  const v = inst?.fields[f.key];
  return !!v && (v.state === "not_applicable" || v.value.trim().length > 0);
};

export function moduleCompletion(moduleId: ModuleId, inst: InstrumentInstance | undefined): Completion {
  const schema = schemaOf(moduleId);
  const required = schema.sections.flatMap((s) => s.fields).filter((f) => f.required);
  const missing = required.filter((f) => !isFilled(f, inst));
  const scoreMissing = !!schema.scoreEntry && !inst?.score?.value?.trim();
  const locMissing = hasLoc(schema) && !inst?.loc?.confirmed;
  const total = required.length + (schema.scoreEntry ? 1 : 0) + (hasLoc(schema) ? 1 : 0);
  const done = total - missing.length - (scoreMissing ? 1 : 0) - (locMissing ? 1 : 0);
  return {
    done, total, missing, scoreMissing, locMissing,
    pending: inst?.evidence.filter((e) => e.status === "pending").length ?? 0,
    percent: total === 0 ? (inst ? 100 : 0) : Math.round((done / total) * 100),
  };
}

/** Why a module cannot be marked ready or signed yet. Empty means it can. */
export function readinessBlockers(moduleId: ModuleId, inst: InstrumentInstance | undefined): Blocker[] {
  const c = moduleCompletion(moduleId, inst);
  const out: Blocker[] = c.missing.map((f) => ({ kind: "field", label: `${f.label} is required`, fieldKey: f.key }));
  if (c.scoreMissing) out.push({ kind: "score", label: "The result of the administered instrument is not entered" });
  if (c.locMissing) out.push({ kind: "loc", label: "A clinician has not confirmed the level of care" });
  if (!out.length && (!inst || inst.status === "not_started")) out.push({ kind: "field", label: "Nothing is entered yet" });
  if (c.pending) out.push({ kind: "evidence", label: `${c.pending} piece${c.pending === 1 ? "" : "s"} of evidence wait${c.pending === 1 ? "s" : ""} for a decision`, fieldKey: inst?.evidence.find((e) => e.status === "pending")?.fieldKey });
  return out;
}

/** Evidence decisions at a glance: for the header line and the audit trail. */
export function evidenceCounts(inst: InstrumentInstance | undefined): { pending: number; accepted: number; rejected: number } {
  const ev = inst?.evidence ?? [];
  return { pending: ev.filter((e) => e.status === "pending").length, accepted: ev.filter((e) => e.status === "accepted" || e.status === "edited").length, rejected: ev.filter((e) => e.status === "rejected").length };
}
