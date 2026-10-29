import { moduleById, schemaOf } from "@/data/assess/modules";
import type { FieldDef, ModuleId } from "@/data/assess/types";

/* Where a proposal from the scribe goes inside an assessment module. The forms of the modules are written by other people and change, so a
   proposal names the module and the words that describe its field, and the field is found in the module's form when the interview runs. The
   person can still move a proposal to another field of the module before deciding on it. */

export interface FieldChoice { key: string; label: string; section: string; kind: FieldDef["kind"] }

/** The free-text fields of a module, in form order. Level-of-care sections and score entry hold what a clinician selects or types, so the scribe never proposes into them. */
export function textFields(moduleId: ModuleId): FieldChoice[] {
  return schemaOf(moduleId).sections
    .filter((s) => s.type !== "loc-review")
    .flatMap((s) => s.fields.filter((f) => f.kind === "text" || f.kind === "long").map((f) => ({ key: f.key, label: f.label, section: s.label, kind: f.kind })));
}

const PREFER = /finding|narrative|summary|description|history|current/i;

/** The field of a module a proposal belongs in: an exact key when the form has it, otherwise the field whose key, label, hint and section best match the words,
    otherwise the first long field. Null when the module has no free-text field. */
export function resolveField(moduleId: ModuleId, words: string[], keys: string[] = []): FieldChoice | null {
  const schema = schemaOf(moduleId);
  const defs = schema.sections.filter((s) => s.type !== "loc-review").flatMap((s) => s.fields.filter((f) => f.kind === "text" || f.kind === "long").map((f) => ({ f, s })));
  if (!defs.length) return null;
  const exact = defs.find(({ f }) => keys.includes(f.key));
  const wanted = words.map((w) => w.toLowerCase());
  const scored = defs.map(({ f, s }, i) => {
    const label = f.label.toLowerCase();
    const hay = `${s.label} ${f.key} ${f.label} ${f.hint ?? ""} ${(f.evidence ?? []).join(" ")}`.toLowerCase();
    const score = wanted.reduce((n, w) => n + (hay.includes(w) ? 1 : 0) + (label.includes(w) ? 1 : 0), 0);
    const tie = (f.kind === "long" ? 4 : 0) + (f.required ? 2 : 0) + (PREFER.test(f.label) ? 1 : 0);
    return { f, s, score, tie, i };
  });
  /* With no word matching, the tie-break alone decides: a long field, a required one, one named like a findings field, then form order. */
  const top = [...scored].sort((a, b) => b.score - a.score || b.tie - a.tie || a.i - b.i)[0];
  const pick = exact ?? top;
  return { key: pick.f.key, label: pick.f.label, section: pick.s.label, kind: pick.f.kind };
}

/** The label of one field of a module, or the key when the form no longer has it. */
export function fieldLabelOf(moduleId: ModuleId, key: string): string {
  return textFields(moduleId).find((f) => f.key === key)?.label ?? schemaOf(moduleId).sections.flatMap((s) => s.fields).find((f) => f.key === key)?.label ?? key;
}
export const moduleLabelOf = (moduleId: ModuleId): string => moduleById(moduleId).label;
