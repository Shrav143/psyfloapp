/* What a pull from a connected clinical record system brings for each import target. A field whose EMR column still waits for a mapping in EMR Connect is left out
   and said so, the same rule New Case has always used: Site B's "Level of care" and "Referral source" leave the level of care and the payer blank. */
import { planTypeOf } from "@/data/cases";
import type { UnmappedField } from "@/data/emr";
import { displayOf, fieldDef, mdy } from "./fields";
import type { EmrChart } from "./emrCharts";
import type { ImportTarget, ImportedDocument, ImportedField } from "./types";

/** The EMR fields that fill a Psyflo field. */
const MAPPED_FIELD: Record<string, string> = { "Level of care": "program", "Referral source": "payerId" };

export interface Unread {
  key: string;
  label: string;
  /** Why it was not filled. */
  problem: string;
  /** The EMR field to map in EMR Connect. */
  mapping?: string;
}

export interface EmrRead {
  fields: ImportedField[];
  documents: ImportedDocument[];
  unread: Unread[];
}

export function readChart(c: EmrChart, target: ImportTarget, unmapped: UnmappedField[]): EmrRead {
  const gaps = unmapped.filter((u) => u.systemId === c.systemId && u.field in MAPPED_FIELD);
  const blank = new Map(gaps.map((u) => [MAPPED_FIELD[u.field], u]));
  /* The plan type follows the payer: with the payer left blank there is no plan to name. */
  const plan = blank.has("payerId") ? "" : planTypeOf(c.payerId);
  const all: Record<ImportTarget, [string, string][]> = {
    patient: [["initials", c.initials], ["dob", c.dob], ["sex", c.sex], ["payerId", c.payerId], ["planType", plan], ["memberId", c.memberId], ["program", c.program], ["diagnosis", c.diagnoses[0] ?? ""]],
    insurance: [["payerId", c.payerId], ["planType", plan], ["memberId", c.memberId], ["groupNumber", c.groupNumber], ["effectiveFrom", c.effectiveFrom], ["effectiveTo", c.effectiveTo], ["subscriber", c.subscriber]],
    documents: [],
    denial_letter: [],
  };
  const fields: ImportedField[] = [];
  const unread: Unread[] = [];
  for (const [key, value] of all[target]) {
    if (!value) continue;
    const label = fieldDef(target, key)?.label ?? key;
    const gap = blank.get(key);
    if (gap) unread.push({ key, label, problem: `“${gap.field}” in ${gap.where} needs a mapping`, mapping: gap.field });
    else fields.push({ key, label, value, display: displayOf(key, value), confidence: "high" });
  }
  const documents = target === "patient" || target === "documents" ? c.documents : [];
  return { fields, documents, unread };
}

/** "J.M., 34 · Sentara · Residential 3.5", for the chart picker. */
export const chartLabel = (c: EmrChart): string => `${c.initials}, ${c.age} · ${displayOf("payerId", c.payerId)} · ${displayOf("program", c.program)}`;
export const docLine = (d: ImportedDocument): string => (d.date ? `${d.title} · ${mdy(d.date)}` : d.title);
