/* The checklist rows of Intake and Clinical documentation as plain data: every row, its state and what to say under it.
   The screens only draw this. Intake shows the patient, insurance and request groups; Clinical documentation shows the clinical and documents groups. */
import type { CheckState } from "@/components/ui";
import { maskMember, type CaseDraft, type DocSlotId, type DraftDocument } from "@/data/cases";
import type { UnmappedField } from "@/data/emr";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type NewCasePrefill } from "@/data/types";
import { plural } from "@/lib/format";
import { toDate } from "@/lib/time";
import { authType } from "./authType";
import { docEntries, findingText, isOpen, isReferralDoc, requiredFirst, slotLabel, type DocEntry } from "./documents";
import { patientReady } from "./intakeRules";
import { typicalEntries } from "./typicalDocs";
import { EMR_CHARTS } from "./lookups";
import type { PayerContext } from "./payerContext";
import { sourceNote, type FieldKey } from "./provenance";

export type FieldId = FieldKey | "start";
export type RowId = FieldId | `doc:${DocSlotId}`;
export const isDocRow = (id: RowId): id is `doc:${DocSlotId}` => id.startsWith("doc:");
export const slotOf = (id: `doc:${DocSlotId}`): DocSlotId => id.slice(4) as DocSlotId;
export interface Row {
  id: RowId;
  label: string;
  state: CheckState;
  detail: string;
  tag?: string;
  /** A brand-new case: the detail says what the row is for, in muted text, instead of "Not found yet". */
  quiet?: boolean;
  /** A document marked not available: the person dealt with it, so it counts as ready even though the payer may still want it. */
  handled?: boolean;
  /** The EMR field that would have filled this row but still needs a mapping. The row links to EMR Connect. */
  mapping?: string;
}
export interface Group {
  id: "patient" | "insurance" | "request" | "clinical" | "documents";
  title: string;
  note?: string;
  rows: Row[];
}

const REC = "Recommended";
const NOTICE: Record<string, string> = { Admission: "notice due in about 5 hours", "Retro-authorization": "window closes in about 18 hours" };
/** The rows each Intake shows: a retro-authorization has its dates and reason on cards of their own, and only an initial request chooses between Admission and an initial request. */
const INITIAL_ROWS: readonly string[] = ["patient", "payer", "member", "program", "type", "start"];
const OTHER_ROWS: readonly string[] = ["patient", "payer", "member", "program"];
export const intakeRowIds = (kind: CaseDraft["kind"]): readonly string[] => (kind === "initial" ? INITIAL_ROWS : OTHER_ROWS);
/** Parts of one line, with the full stop dropped from every part that is followed by another. */
const join = (...parts: (string | undefined | false)[]): string => parts.filter((p): p is string => !!p).map((p, i, all) => (i < all.length - 1 ? p.replace(/\.$/, "") : p)).join(" · ");

const fmtDate = (iso: string, today: string): string => {
  const [y, m, d] = iso.split("-").map(Number);
  const text = new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  return iso === today ? `${text} (today)` : text;
};
const isoOf = (date: Date): string => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Nothing has been dropped, typed or attached yet. */
const isBlank = (d: CaseDraft): boolean => !d.patient.initials && !d.patient.age && !d.payerId && !d.program && !d.type && !d.memberId && !d.diagnoses.length && !d.reason && !d.documents.length && !Object.keys(d.unavailable).length && !d.referralId;

/* ------------------------------------------------------------------ one row at a time */
function documentRow(d: CaseDraft, entry: DocEntry, need: "required" | "recommended" | "typical" | "extra", doc: DraftDocument | undefined, quiet: boolean): Row {
  const { slot } = entry;
  const id = `doc:${slot}` as const;
  const tag = need === "recommended" ? REC : need === "typical" ? `Typical for ${authType(d.kind).typical}` : need === "extra" ? "Not on the list" : undefined;
  const label = entry.label;
  const reason = d.unavailable[slot];
  if (!doc && reason !== undefined) {
    const payer = d.payerId ? payerById(d.payerId).shortName : "The payer";
    const note = need === "required" ? `${payer} asks for it, so the review will warn.` : "You can sign without it.";
    return { id, label, state: need === "required" ? "warn" : "done", detail: join(`Marked not available: ${reason}`, note), tag, handled: true };
  }
  if (!doc) {
    const detail = quiet ? entry.hint : need === "required" ? (slot === "referral" ? (d.kind === "initial" ? "No referral attached. Drop a referral or an admission order, or add a referral." : "No referral or admission order attached. Drop one above or add it here.") : "Not found yet. Drop it above or add it here.") : `${entry.hint}. You can continue without it.`;
    return { id, label, state: need === "required" ? "missing" : "optional", detail: need === "typical" ? `${entry.hint}. You can continue without it.` : detail, tag, quiet: quiet && need === "required" };
  }
  const name = doc.file.name;
  if (doc.status === "validating") return { id, label, state: "working", detail: join(name, "Reader is reading"), tag };
  const guessed = d.read?.[`doc:${slot}`]?.value === doc.file.id ? "Reader guessed this one. Check it." : undefined;
  if (isReferralDoc(d.referralId, doc)) return { id, label, state: "done", detail: join(name, `from referral ${d.referralId}`), tag };
  const open = doc.findings.filter((f) => isOpen(f, d.answers));
  if (open.length) {
    const ask = open.some((f) => f.resolvedBy) ? "Scribe will ask you to confirm it." : undefined;
    return { id, label, state: "warn", detail: join(name, open.map((f) => findingText(f, d.answers)).join(". "), ask, guessed), tag };
  }
  return { id, label, state: "done", detail: join(name, `${plural(doc.findings.length, "check")} passed`, guessed), tag };
}

function documentGroup(d: CaseDraft, quiet: boolean, ctx: PayerContext): Group {
  const list = docEntries(d.payerId, d.program, ctx.items);
  const typical = typicalEntries(d.kind, list);
  const listed = new Set([...list, ...typical].map((r) => r.slot));
  const rows = [
    ...requiredFirst(list).map((r) => ({ entry: r, need: r.required ? ("required" as const) : ("recommended" as const) })),
    /* What a request of this type usually carries, labelled "typical for a continued stay" and so on. It is the demo's advice, not a payer's rule. */
    ...typical.map((r) => ({ entry: r as DocEntry, need: "typical" as const })),
    /* A file Reader placed that the payer does not ask for still shows, so nothing dropped ever disappears. */
    ...d.documents.filter((x) => !listed.has(x.slot)).map((x) => ({ entry: { slot: x.slot, label: slotLabel(x.slot), hint: "", required: false }, need: "extra" as const })),
  ].map(({ entry, need }) => documentRow(d, entry, need, d.documents.find((x) => x.slot === entry.slot), quiet));
  const required = list.filter((r) => r.required).length;
  const note = !d.payerId || !d.program
    ? "These are the documents every payer asks for. The list grows once the payer and level of care are known."
    : list.length
      ? `${payerById(d.payerId).shortName} asks for ${plural(list.length, "document")} for ${PROGRAM_LABEL[d.program]}. ${required} ${required === 1 ? "is" : "are"} required.`
      : `${payerById(d.payerId).shortName} has no documents on its list for ${PROGRAM_LABEL[d.program]}.`;
  return { id: "documents", title: "Documents", note, rows };
}

/** What an EMR field that still needs a mapping would have filled on the checklist. */
const MAPS_TO: Record<string, "payer" | "program"> = { "Level of care": "program", "Referral source": "payer" };

/** Every row of the two checklists, in five groups. `referral` is what the attached referral supplied, for the "from referral" notes.
    `unmapped` are the fields of the system the chart was pulled from that still need a mapping: the rows they would have filled say so. */
export function buildChecklist(d: CaseDraft, clock: number, referral: NewCasePrefill | null, ctx: PayerContext, unmapped: UnmappedField[]): Group[] {
  const quiet = isBlank(d);
  const chart = EMR_CHARTS.find((c) => c.id === d.emrChart);
  const note = (key: FieldKey): string => sourceNote(d, key, referral, chart);
  const gap = (hint: string, found: string): string => (quiet ? hint : found);
  /** Left blank on purpose when the chart's system has not mapped the field that would fill it. */
  const pending = (id: FieldId): UnmappedField | undefined => (d.emrChart ? unmapped.find((u) => MAPS_TO[u.field] === id) : undefined);
  const unmappedRow = (id: FieldId, label: string, u: UnmappedField): Row => ({ id, label, state: "missing", detail: `Left blank. “${u.field}” in ${u.where} needs a mapping. Map it, then pull the chart again.`, mapping: u.field });
  const missing = (id: FieldId, label: string, hint: string, found: string): Row => {
    const u = pending(id);
    return u ? unmappedRow(id, label, u) : { id, label, state: "missing", detail: gap(hint, found), quiet };
  };
  const maybe = (id: FieldId, label: string, hint: string, found: string): Row => ({ id, label, state: "optional", detail: gap(hint, found), tag: REC });

  const patient: Row = patientReady(d)
    ? { id: "patient", label: "Patient initials and age", state: "done", detail: join(`${d.patient.initials}, ${d.patient.age}`, note("patient")) }
    : d.patient.initials.trim() || d.patient.age
      ? { id: "patient", label: "Patient initials and age", state: "missing", detail: `Found ${d.patient.initials.trim() ? `initials ${d.patient.initials.trim().replace(/\.$/, "")}` : `age ${d.patient.age}`}. The ${d.patient.initials.trim() ? "age" : "initials"} is still needed.` }
      : missing("patient", "Patient initials and age", "Initials and age only. A name never enters the app.", "Not found yet. Add it here, or Reader fills it from the chart.");

  const payer: Row = d.payerId
    ? { id: "payer", label: "Payer and plan", state: "done", detail: join(payerById(d.payerId).name, d.planType, note("payer")) }
    : missing("payer", "Payer and plan", "The carrier and plan type, from the insurance card", "Not found yet. Add it here, or Reader fills it from the insurance card.");
  const member: Row = d.memberId
    ? { id: "member", label: "Member ID", state: "done", detail: join(maskMember(d.memberId), "agents see only the last four", note("member")), tag: REC }
    : maybe("member", "Member ID", "From the insurance card. Agents see only the last four.", "Not found yet. Verify needs it to check coverage.");

  const program: Row = d.program
    ? { id: "program", label: "Level of care", state: "done", detail: join(PROGRAM_LABEL[d.program], note("program")) }
    : missing("program", "Level of care", "Residential 3.5, IOP, PHP or Detox", "Not found yet. Add it here, or Reader fills it from the chart.");
  const type: Row = d.type
    ? { id: "type", label: "Request type", state: "done", detail: join(d.type, NOTICE[d.type], note("type")) }
    : missing("type", "Request type", "Admission or an initial request", "Not found yet. Add it here.");
  const retro = d.kind === "retro";
  const start: Row = d.startDate
    ? { id: "start", label: retro ? "Dates of service" : "Start date", state: "done", detail: `${fmtDate(d.startDate, isoOf(toDate(clock)))}${d.endDate ? ` to ${fmtDate(d.endDate, "")}` : ""}`, tag: REC }
    : maybe("start", retro ? "Dates of service" : "Start date", retro ? "The first and the last day care was given" : "The day the stay would start", retro ? "Not set. Add the dates of service." : "Not set. Add the day the stay would start.");
  const diagnoses: Row = d.diagnoses.length
    ? { id: "diagnoses", label: "Diagnoses (ICD-10)", state: "done", detail: join(d.diagnoses.map((x) => `${x.code} ${x.label.split(",")[0]}`).join(" · "), note("diagnoses")), tag: REC }
    : maybe("diagnoses", "Diagnoses (ICD-10)", "ICD-10 codes, from the evaluation", "Not found yet. The psychiatric evaluation lists them.");
  const reason: Row = d.reason.trim()
    ? { id: "reason", label: "Reason for the request", state: "done", detail: join(d.reason.length > 130 ? `${d.reason.slice(0, 127)}…` : d.reason, note("reason")), tag: REC }
    : maybe("reason", "Reason for the request", "Why this level of care, in a sentence or two", "Not found yet. Scribe uses it in the summary.");

  const by = d.referrer ? `Referred by ${d.referrer.org}${d.referrer.clinician ? `, ${d.referrer.clinician}` : ""}.` : undefined;
  return [
    { id: "patient", title: "Patient", note: by, rows: [patient] },
    { id: "insurance", title: "Insurance", rows: [payer, member] },
    { id: "request", title: "Request", rows: [program, type, start] },
    { id: "clinical", title: "Clinical summary", rows: [diagnoses, reason] },
    documentGroup(d, quiet, ctx),
  ];
}

export const tally = (groups: Group[]): { done: number; total: number } => {
  const rows = groups.flatMap((g) => g.rows);
  return { done: rows.filter((r) => r.state === "done" || r.handled).length, total: rows.length };
};
