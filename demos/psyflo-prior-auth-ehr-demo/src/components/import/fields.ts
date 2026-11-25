/* The Psyflo fields each import target offers, the header names that map to them, and how a raw value from a file or a screenshot becomes a stored one.
   Pure, so the same file always maps the same way. */
import { PAYERS } from "@/data/seed";
import { PROGRAM_LABEL, type Program } from "@/data/types";
import type { ImportTarget, ImportedDocument, ImportedField } from "./types";

export interface FieldDef {
  key: string;
  label: string;
  /** Lower-case header words that pick this field when a column is named with them. */
  aliases: string[];
  /** The column becomes a document on the case rather than a field ("Last note", "Prior diagnoses"). */
  document?: "note" | "diagnoses";
}

export const IMPORT_FIELDS: Record<ImportTarget, FieldDef[]> = {
  patient: [
    { key: "initials", label: "Initials", aliases: ["initials", "patient", "name", "pt"] },
    { key: "dob", label: "Date of birth", aliases: ["dob", "date of birth", "birth", "birthdate", "born"] },
    { key: "age", label: "Age", aliases: ["age"] },
    { key: "sex", label: "Sex", aliases: ["sex", "gender"] },
    { key: "payerId", label: "Payer", aliases: ["payer", "insurance", "carrier", "insurer", "primary payer", "plan name"] },
    { key: "planType", label: "Plan type", aliases: ["plan type", "product", "coverage type", "plan"] },
    { key: "memberId", label: "Member ID", aliases: ["member", "member id", "subscriber id", "policy", "insurance id", "id number"] },
    { key: "program", label: "Level of care", aliases: ["level of care", "loc", "program", "service", "level"] },
    { key: "diagnosis", label: "Primary diagnosis", aliases: ["primary dx", "diagnosis", "dx", "icd", "icd-10", "icd10"] },
    { key: "startDate", label: "Start date", aliases: ["start", "admit", "admission", "admit date", "start date", "requested start"] },
    { key: "note", label: "Previous note", aliases: ["last note", "note", "progress note", "last visit"], document: "note" },
    { key: "priorDx", label: "Previous diagnoses", aliases: ["prior dx", "previous diagnoses", "prior diagnoses", "history", "dx history"], document: "diagnoses" },
  ],
  insurance: [
    { key: "payerId", label: "Payer", aliases: ["payer", "insurance", "carrier", "insurer", "plan name"] },
    { key: "planType", label: "Plan type", aliases: ["plan type", "product", "coverage type", "plan"] },
    { key: "memberId", label: "Member ID", aliases: ["member", "member id", "subscriber id", "policy", "insurance id"] },
    { key: "groupNumber", label: "Group number", aliases: ["group", "group number", "group no", "grp"] },
    { key: "effectiveFrom", label: "Effective from", aliases: ["effective", "effective from", "start", "eff date", "coverage start"] },
    { key: "effectiveTo", label: "Effective to", aliases: ["effective to", "end", "term", "termination", "coverage end", "through"] },
    { key: "subscriber", label: "Subscriber", aliases: ["subscriber", "policy holder", "policyholder", "insured", "relationship"] },
  ],
  documents: [
    { key: "docTitle", label: "Document title", aliases: ["title", "document", "name", "description", "type"] },
    { key: "docDate", label: "Document date", aliases: ["date", "signed", "service date", "created"] },
  ],
  denial_letter: [
    { key: "payerId", label: "Payer", aliases: ["payer", "insurance", "carrier", "plan"] },
    { key: "decisionDate", label: "Decision date", aliases: ["decision", "decision date", "letter date", "date"] },
    { key: "dateFrom", label: "Dates from", aliases: ["from", "start", "service from", "dates from"] },
    { key: "dateTo", label: "Dates to", aliases: ["to", "end", "service to", "dates to", "through"] },
    { key: "unitsRequested", label: "Units requested", aliases: ["requested", "units requested", "days requested"] },
    { key: "unitsApproved", label: "Units approved", aliases: ["approved", "units approved", "days approved"] },
    { key: "reason", label: "Reason", aliases: ["reason", "rationale", "denial reason", "basis"] },
  ],
};

export const fieldDef = (target: ImportTarget, key: string): FieldDef | undefined => IMPORT_FIELDS[target].find((f) => f.key === key);

/* ------------------------------------------------------------------ values */
const pad = (n: number): string => String(n).padStart(2, "0");
/** "03/14/1992", "3/14/92", "1992-03-14", "14 Mar 1992" as yyyy-mm-dd, or null. Two-digit years above the current one belong to the last century. */
export function isoDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const y = m[3].length === 2 ? (+m[3] > 26 ? 1900 + +m[3] : 2000 + +m[3]) : +m[3];
    if (+m[1] < 1 || +m[1] > 12 || +m[2] < 1 || +m[2] > 31) return null;
    return `${y}-${pad(+m[1])}-${pad(+m[2])}`;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t) && /[a-z]/i.test(s)) {
    const d = new Date(t);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return null;
}
export const mdy = (iso: string): string => `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}`;

export function payerOf(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  const hit = PAYERS.find((p) => s === p.id || s.includes(p.shortName.toLowerCase()) || s.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(s));
  return hit?.id ?? null;
}
export function programOf(raw: string): Program | null {
  const s = raw.trim().toLowerCase();
  if (/detox|withdrawal|\bwm\b/.test(s)) return "WM";
  if (/residential|\bres\b|3\.5|3\.7/.test(s)) return "RES";
  if (/partial|\bphp\b|day program/.test(s)) return "PHP";
  if (/intensive|\biop\b/.test(s)) return "IOP";
  return null;
}
export function sexOf(raw: string): "F" | "M" | "X" | null {
  const s = raw.trim().toLowerCase();
  if (/^(f|female|woman)$/.test(s)) return "F";
  if (/^(m|male|man)$/.test(s)) return "M";
  if (/^(x|other|non-?binary|u|unknown)$/.test(s)) return "X";
  return null;
}
const SEX_WORD = { F: "Female", M: "Male", X: "Other or not stated" } as const;
/** "J.M.", from "JM", "j.m", "J. M." */
export function initialsOf(raw: string): string | null {
  const letters = raw.replace(/[^a-z]/gi, "").toUpperCase();
  if (letters.length < 1 || letters.length > 3) return null;
  return `${letters.split("").join(".")}.`;
}
const ICD = /^[A-TV-Z]\d{2}(\.\d{1,4}|\d{0,4})?$/i;
/** "F10.20" from "F10.20 Alcohol dependence" or "f1020". */
export function icdOf(raw: string): string | null {
  const first = raw.trim().split(/[\s,;]+/)[0] ?? "";
  if (!ICD.test(first)) return null;
  const c = first.toUpperCase();
  return c.includes(".") || c.length <= 3 ? c : `${c.slice(0, 3)}.${c.slice(3)}`;
}

/** A readable form of a stored value, for the review list and the "replaces …" note. */
export function displayOf(key: string, value: string): string {
  if (!value) return "";
  if (key === "payerId") return PAYERS.find((p) => p.id === value)?.name ?? value;
  if (key === "program") return PROGRAM_LABEL[value as Program] ?? value;
  if (key === "sex") return SEX_WORD[value as keyof typeof SEX_WORD] ?? value;
  if (key === "memberId") return value.length > 4 && !value.startsWith("…") ? `…${value.replace(/\W/g, "").slice(-4)}` : value;
  if (/date|dob|Date|From|To$/.test(key) && /^\d{4}-\d{2}-\d{2}$/.test(value)) return mdy(value);
  return value;
}

/** A raw cell or reading as a field, or the reason it was not used. `check` marks a reading a person should look at. */
export function toField(target: ImportTarget, key: string, raw: string, check = false): ImportedField | { key: string; label: string; raw: string; problem: string } {
  const def = fieldDef(target, key);
  const label = def?.label ?? key;
  const text = raw.trim();
  const bad = (problem: string) => ({ key, label, raw: text, problem });
  let value: string | null = text;
  if (key === "payerId") value = payerOf(text);
  else if (key === "program") value = programOf(text);
  else if (key === "sex") value = sexOf(text);
  else if (key === "initials") value = initialsOf(text);
  else if (key === "diagnosis") value = icdOf(text);
  else if (key === "age") value = /^\d{1,3}$/.test(text) && +text > 0 && +text < 111 ? String(+text) : null;
  else if (/^(dob|startDate|effectiveFrom|effectiveTo|decisionDate|dateFrom|dateTo)$/.test(key)) value = isoDate(text);
  else if (key === "unitsRequested" || key === "unitsApproved") value = text.match(/\d+/)?.[0] ?? null;
  if (!text) return bad("Empty");
  if (value === null) return bad(key === "payerId" ? "Not a payer in Psyflo" : key === "initials" ? "Initials only. A name never enters Psyflo" : "Not recognized");
  return { key, label, value, display: displayOf(key, value), confidence: check ? "check" : "high" };
}
export const isField = (x: ReturnType<typeof toField>): x is ImportedField => "value" in x;

/* ------------------------------------------------------------------ documents */
/** The payer document ids a title can match, by the words people use for them. */
const DOC_WORDS: [string, RegExp][] = [
  ["psych_eval", /psychiatric|psych eval|evaluation|h&p|diagnos/i],
  ["asam", /asam|multidimensional/i],
  ["therapy_note", /therapy|progress note|session note|group note|\bnote\b/i],
  ["meds", /medication|med list|\bmar\b/i],
  ["treatment_plan", /treatment plan|plan of care/i],
  ["nursing", /nursing|withdrawal scale|ciwa|cows/i],
  ["uds", /urine|drug screen|\buds\b|tox/i],
  ["psychosocial", /psychosocial/i],
  ["attendance", /attendance/i],
  ["referral", /referral|admission order|admit order/i],
];
export const docIdOf = (title: string): string | undefined => DOC_WORDS.find(([, re]) => re.test(title))?.[0];
export const makeDoc = (title: string, date?: string): ImportedDocument => ({ title, ...(date ? { date } : {}), ...(docIdOf(title) ? { docId: docIdOf(title) } : {}) });
