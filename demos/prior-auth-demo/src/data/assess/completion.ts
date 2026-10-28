import { schemaOf } from "./modules";
import type { FieldDef, InstrumentInstance, ModuleId } from "./types";

/** How much of a module is filled in: required fields with a value (or marked not applicable), out of the required fields. Pure. */
export interface Completion { done: number; total: number; missing: FieldDef[]; percent: number }
export function moduleCompletion(moduleId: ModuleId, inst: InstrumentInstance | undefined): Completion {
  const schema = schemaOf(moduleId);
  const required = schema.sections.flatMap((s) => s.fields).filter((f) => f.required);
  const filled = (f: FieldDef): boolean => {
    const v = inst?.fields[f.key];
    return !!v && (v.state === "not_applicable" || v.value.trim().length > 0);
  };
  const missing = required.filter((f) => !filled(f));
  const scoreEntry = schema.scoreEntry ? (inst?.score?.value ? 1 : 0) : 0;
  const total = required.length + (schema.scoreEntry ? 1 : 0);
  const done = required.length - missing.length + scoreEntry;
  return { done, total, missing, percent: total === 0 ? (inst ? 100 : 0) : Math.round((done / total) * 100) };
}
