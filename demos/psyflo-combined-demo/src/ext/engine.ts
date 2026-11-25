/* Pure helpers: no state, no timers. The store calls these. */
import type { Check, ClinicConfig, DocKind, DocState, FieldSpec, Finding, FormSpec, RawFinding, Severity, Val } from "./types";

export const SEV_RANK: Record<Severity, number> = { low: 1, medium: 2, severe: 3 };
export const SEV_LABEL: Record<Severity, string> = { low: "Low", medium: "Medium", severe: "Severe" };

export const isEmpty = (v: Val | undefined): boolean => (Array.isArray(v) ? v.length === 0 : !v || !String(v).trim());
export const asText = (v: Val | undefined): string => (Array.isArray(v) ? v.join(", ") : v ?? "");
export const sameVal = (a: Val | undefined, b: Val | undefined): boolean => asText(a).trim() === asText(b).trim();

/** Every field of a form, flat. */
export const fieldsOf = (spec: FormSpec): FieldSpec[] => spec.sections.flatMap((s) => s.fields);
export const fieldByKey = (spec: FormSpec, key: string): FieldSpec | undefined => fieldsOf(spec).find((f) => f.key === key);

export const KIND_LABEL: Record<FieldSpec["kind"], string> = {
  text: "Text line", textarea: "Text box", date: "Date", select: "Dropdown", checks: "Checkboxes", yesno: "Yes / No",
};

/** "2026-10-29" → "10/29/2026" (the way Lauris prints dates). */
export const usDate = (iso: string): string => {
  const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
};
export const shortDate = (iso: string): string => {
  const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(iso);
  if (!m) return iso;
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+m[2] - 1]} ${+m[3]}`;
};

/**
 * Write a proposal into a field. Returns the new value and, for text, the sentence now marked as Psyflo's.
 * Text boxes that already have words get the proposal appended; empty ones get it as is. Other kinds are replaced (checkboxes: added to the ticked ones).
 */
export function writeInto(field: FieldSpec, current: Val | undefined, proposal: Val, mode: "replace" | "append" = "replace"): { value: Val; mark?: string } {
  if (field.kind === "checks") {
    const cur = Array.isArray(current) ? current : [];
    const add = Array.isArray(proposal) ? proposal : [proposal];
    return { value: [...cur, ...add.filter((x) => !cur.includes(x))] };
  }
  if (field.kind === "text" || field.kind === "textarea") {
    const text = asText(proposal).trim();
    const cur = asText(current).trim();
    if (!cur || mode === "replace") return { value: text, mark: text };
    return { value: `${cur} ${text}`, mark: text };
  }
  return { value: asText(proposal) };
}

/** The state of a field box in the EHR: yellow (Psyflo typed, unsaved), green (already in the EHR), or plain. */
export function boxState(doc: DocState, key: string): "typed" | "lauris" | "" {
  if (doc.typed[key]) return "typed";
  if (doc.green[key] && !isEmpty(doc.values[key])) return "lauris";
  return "";
}

export function initialDocState(seed: { values: Record<string, Val>; prefilled?: string[]; status: "draft" | "saved" }): DocState {
  const green: Record<string, true> = {};
  const keys = Object.keys(seed.values);
  for (const k of keys) if (!isEmpty(seed.values[k]) && (seed.status === "saved" || seed.prefilled?.includes(k))) green[k] = true;
  return { values: { ...seed.values }, typed: {}, appended: {}, green, status: seed.status };
}

/** Run every check that applies to the document. Finding ids are stable between runs: `${doc}:${check}:${field}:${n}`. */
export function runChecks(clinic: ClinicConfig, docId: string, kind: DocKind, values: Record<string, Val>, consumerId: string): Finding[] {
  const spec = clinic.forms[kind];
  const consumer = clinic.consumers.find((c) => c.id === consumerId);
  if (!spec || !consumer) return [];
  const chart = (id: string) => consumer.chart.find((r) => r.id === id);
  const ctx = { consumer, clinic, spec, doc: { id: docId, kind, values }, chart };
  const out: Finding[] = [];
  for (const check of clinic.checks as Check[]) {
    if (!check.docs.includes(kind)) continue;
    const seen: Record<string, number> = {};
    let raws: RawFinding[] = [];
    try { raws = check.run(ctx); } catch { raws = []; }
    for (const raw of raws) {
      const n = (seen[raw.fieldKey] = (seen[raw.fieldKey] ?? 0) + 1);
      out.push({ ...raw, docId, checkId: check.id, id: `${docId}:${check.id}:${raw.fieldKey}:${n}` });
    }
  }
  return out.sort((a, b) => SEV_RANK[b.severity] - SEV_RANK[a.severity]);
}

/** Which checks passed and which found something, for the "Checks run" list. */
export function checksFor(clinic: ClinicConfig, kind: DocKind): Check[] {
  return clinic.checks.filter((c) => c.docs.includes(kind));
}

/** A finding's identity across re-scans (so a dismissal survives). */
export const findingSig = (f: Pick<Finding, "checkId" | "fieldKey" | "title">): string => `${f.checkId}|${f.fieldKey}|${f.title}`;

/** Simulated timing: tests run the demo faster by setting window.__PSYFLO_SPEED__ (e.g. 40). */
export const speed = (): number => {
  const s = (globalThis as { __PSYFLO_SPEED__?: number }).__PSYFLO_SPEED__;
  return typeof s === "number" && s > 0 ? s : 1;
};
export const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, Math.max(1, ms / speed())));
