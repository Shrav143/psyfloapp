import { staffOf } from "../intake/seed";
import { FIELD_STATE_LABEL, type FieldMap, type FieldValue } from "../intake/types";
import { longDate } from "@/lib/time";
import { schemaOf } from "./modules";
import type { InstrumentInstance, InstrumentStatus, ModuleId } from "./types";

/* An assessment instance keeps every version: a signed one is never overwritten, an amendment starts the next version and the earlier one stays in
   `history`. A version is stored as a snapshot of its fields; the typed instrument result, the level-of-care review and the notes are not fields, so
   a snapshot also carries them under reserved "~" keys, which lets one field-level diff cover everything a clinician could have changed. */

export const SCORE_KEY = "~score";
export const LOC_KEY = "~loc";
export const LOC_REC_KEY = "~loc.rec";
export const NOTES_KEY = "~notes";
const RESERVED_LABEL: Record<string, string> = {
  [SCORE_KEY]: "Result of the administered instrument", [LOC_KEY]: "Level of care confirmed by a clinician", [LOC_REC_KEY]: "Clinician recommendation", [NOTES_KEY]: "Notes",
};

const entry = (value: string, at: number, by: string): FieldValue => ({ value, state: "verified", at, by });

/** The fields of an instance plus its result, level-of-care review and notes, as one map to store or compare. */
export function snapshotOf(inst: InstrumentInstance): FieldMap {
  const out: FieldMap = { ...inst.fields };
  const at = inst.updatedAt;
  if (inst.score?.value) {
    const who = staffOf(inst.score.administeredBy)?.name ?? inst.score.administeredBy;
    out[SCORE_KEY] = entry(`${inst.score.value} (administered ${longDate(inst.score.administeredAt)} by ${who}${inst.score.note ? `; ${inst.score.note}` : ""})`, at, inst.score.administeredBy);
  }
  if (inst.loc?.confirmed) out[LOC_KEY] = entry(inst.loc.confirmed, inst.loc.confirmedAt ?? at, inst.loc.confirmedBy ?? "");
  if (inst.loc?.recommendation) out[LOC_REC_KEY] = entry(inst.loc.recommendation, at, "");
  if (inst.notes.trim()) out[NOTES_KEY] = entry(inst.notes.trim(), at, "");
  return out;
}

export interface FieldChange {
  key: string;
  label: string;
  kind: "added" | "changed" | "removed" | "source";
  before: string;
  after: string;
}

/** What differs between two snapshots, in the module's own field order. A change of source alone (the value is the same) is listed as "source". */
export function diffSnapshots(moduleId: ModuleId, before: FieldMap, after: FieldMap): FieldChange[] {
  const fields = schemaOf(moduleId).sections.flatMap((s) => s.fields);
  const known = fields.map((f) => f.key);
  const keys = [...known, ...Object.keys({ ...before, ...after }).filter((k) => !known.includes(k)).sort()];
  const out: FieldChange[] = [];
  for (const key of keys) {
    const b = before[key];
    const a = after[key];
    const bv = b?.value ?? "";
    const av = a?.value ?? "";
    const label = fields.find((f) => f.key === key)?.label ?? RESERVED_LABEL[key] ?? key;
    if (bv !== av) out.push({ key, label, kind: !bv ? "added" : !av ? "removed" : "changed", before: bv, after: av });
    else if (b && a && av && b.state !== a.state) out.push({ key, label, kind: "source", before: FIELD_STATE_LABEL[b.state], after: FIELD_STATE_LABEL[a.state] });
  }
  return out;
}

export interface VersionRow {
  version: number;
  status: InstrumentStatus;
  signedBy?: string;
  signedAt?: number;
  /** Why this version was started (an amendment), when it was. */
  startedBecause?: string;
  snapshot: FieldMap;
  current: boolean;
}

/** Every version, oldest first, the working one last. */
export function versionRows(inst: InstrumentInstance): VersionRow[] {
  const rows: VersionRow[] = inst.history.map((h, i) => ({
    version: h.version, status: h.status, signedBy: h.signedBy, signedAt: h.signedAt, snapshot: h.fields, current: false,
    /* The note on an entry says why the NEXT version was made. */
    startedBecause: i > 0 ? inst.history[i - 1].note : undefined,
  }));
  rows.push({
    version: inst.version, status: inst.status, signedBy: inst.signedBy, signedAt: inst.signedAt, snapshot: snapshotOf(inst), current: true,
    startedBecause: inst.history.length ? inst.history[inst.history.length - 1].note : undefined,
  });
  return rows;
}
