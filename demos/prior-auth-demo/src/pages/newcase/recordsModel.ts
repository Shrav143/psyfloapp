/* The checklist rows of Clinical documentation as plain data: every row, its state and what to say under it. The screen only draws this. */
import type { CheckState } from "@/components/ui";
import type { CaseDraft, DocSlotId, DraftDocument } from "@/data/cases";
import { payerById } from "@/data/seed";
import type { IntakeRecord } from "@/data/intake/types";
import { PROGRAM_LABEL } from "@/data/types";
import { plural } from "@/lib/format";
import { authType } from "./authType";
import { docEntries, findingText, isOpen, isReferralDoc, requiredFirst, slotLabel, trackOfDraft, type DocEntry } from "./documents";
import { typicalEntries } from "./typicalDocs";
import { EMR_CHARTS } from "./lookups";
import type { PayerContext } from "./payerContext";
import { sourceNote, type FieldKey } from "./provenance";

export type FieldId = "diagnoses" | "reason";
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
}
export interface Group {
  id: "clinical" | "documents";
  title: string;
  note?: string;
  rows: Row[];
}

const REC = "Recommended";
/** Parts of one line, with the full stop dropped from every part that is followed by another. */
const join = (...parts: (string | undefined | false)[]): string => parts.filter((p): p is string => !!p).map((p, i, all) => (i < all.length - 1 ? p.replace(/\.$/, "") : p)).join(" · ");

/** Nothing has been dropped, typed or attached yet. */
const isBlank = (d: CaseDraft): boolean => !d.patient.initials && !d.patient.age && !d.payerId && !d.program && !d.type && !d.memberId && !d.diagnoses.length && !d.reason && !d.documents.length && !Object.keys(d.unavailable).length && !d.referralId && !d.intakeId;

/* ------------------------------------------------------------------ one row at a time */
function documentRow(d: CaseDraft, entry: DocEntry, need: "required" | "recommended" | "typical" | "extra", doc: DraftDocument | undefined, quiet: boolean): Row {
  const { slot } = entry;
  const id = `doc:${slot}` as const;
  const tag = need === "recommended" ? REC : need === "typical" ? `Typical for ${authType(d.kind).typical}` : need === "extra" ? "Not on the list" : undefined;
  const label = entry.label;
  const reason = d.unavailable[slot];
  if (!doc && reason !== undefined) {
    return { id, label, state: need === "required" ? "warn" : "done", detail: `Not available: ${reason}`, tag, handled: true };
  }
  /* A document somebody was asked for (a task on the intake): still missing, and the row says nothing was sent. */
  if (!doc && d.requested?.[slot]) return { id, label, state: need === "required" ? "warn" : "optional", detail: `Requested: a task on ${d.intakeId}. Nothing was sent. Not attached yet`, tag };
  /* An empty row says nothing: its box and its buttons already say it is missing and how to add it. */
  if (!doc) return { id, label, state: need === "required" ? "missing" : "optional", detail: "", tag, quiet: quiet && need === "required" };
  const name = doc.file.name;
  if (doc.status === "validating") return { id, label, state: "working", detail: join(name, "Reader is reading"), tag };
  /* A file added to a request from an intake is kept by name and type only: no check ran, so none is claimed. */
  if (doc.unread) return { id, label, state: "done", detail: join(name, "Added by name and type. The file was not read"), tag };
  const guessed = d.read?.[`doc:${slot}`]?.value === doc.file.id ? "Reader guessed the slot. Check it" : undefined;
  /* A document read from the intake record was signed there: it shows where it came from and is never flagged again. */
  if (doc.from) return { id, label, state: "done", detail: join(name, doc.from), tag };
  if (isReferralDoc(d.referralId, doc)) return { id, label, state: "done", detail: join(name, `from referral ${d.referralId}`), tag };
  const open = doc.findings.filter((f) => isOpen(f, d.answers));
  if (open.length) {
    return { id, label, state: "warn", detail: join(name, open.map((f) => findingText(f, d.answers)).join(". "), guessed), tag };
  }
  return { id, label, state: "done", detail: join(name, `${plural(doc.findings.length, "check")} passed`, guessed), tag };
}

function documentGroup(d: CaseDraft, quiet: boolean, ctx: PayerContext): Group {
  const list = docEntries(d.payerId, d.program, ctx.items, trackOfDraft(d));
  const typical = typicalEntries(d.kind, list);
  const listed = new Set([...list, ...typical].map((r) => r.slot));
  const rows = [
    ...requiredFirst(list).map((r) => ({ entry: r, need: r.required ? ("required" as const) : ("recommended" as const) })),
    /* What a request of this type usually carries, labelled "typical for a continued stay" and so on. It is the demo's advice, not a payer's rule. */
    ...typical.map((r) => ({ entry: r as DocEntry, need: "typical" as const })),
    /* A file Reader placed that the payer does not ask for still shows, so nothing dropped ever disappears. */
    ...d.documents.filter((x) => !listed.has(x.slot)).map((x) => ({ entry: { slot: x.slot, label: slotLabel(x.slot), hint: "", required: false }, need: "extra" as const })),
  ].map(({ entry, need }) => documentRow(d, entry, need, d.documents.find((x) => x.slot === entry.slot), quiet));
  /* The group's own count says how many are in; only a payer with no list at all needs a word. */
  const mh = trackOfDraft(d) === "mh" && (d.program === "IOP" || d.program === "PHP");
  const note = d.payerId && d.program && !list.length ? `${payerById(d.payerId).shortName} has no documents on its list for ${PROGRAM_LABEL[d.program]}` : mh ? "A mental health service lists no ASAM assessment. Demo configuration: payer requirement not yet verified." : undefined;
  return { id: "documents", title: d.payerId ? `Documents · ${payerById(d.payerId).shortName}` : "Documents", note, rows };
}

/** The rows of Clinical documentation, in two groups: the clinical summary (diagnoses and the reason) and the documents. `intake` is the record the draft was read from, for the "from the intake record" notes. */
export function buildChecklist(d: CaseDraft, intake: IntakeRecord | undefined, ctx: PayerContext): Group[] {
  const quiet = isBlank(d);
  const chart = EMR_CHARTS.find((c) => c.id === d.emrChart);
  const note = (key: FieldKey): string => sourceNote(d, key, intake, chart);
  const maybe = (id: FieldId, label: string): Row => ({ id, label, state: "optional", detail: "", tag: REC });
  const diagnoses: Row = d.diagnoses.length
    ? { id: "diagnoses", label: "Diagnoses (ICD-10)", state: "done", detail: join(d.diagnoses.map((x) => `${x.code} ${x.label.split(",")[0]}`).join(" · "), note("diagnoses")), tag: REC }
    : maybe("diagnoses", "Diagnoses (ICD-10)");
  const reason: Row = d.reason.trim()
    ? { id: "reason", label: "Reason for the request", state: "done", detail: join(d.reason.length > 130 ? `${d.reason.slice(0, 127)}…` : d.reason, note("reason")), tag: REC }
    : maybe("reason", "Reason for the request");
  return [{ id: "clinical", title: "Clinical summary", rows: [diagnoses, reason] }, documentGroup(d, quiet, ctx)];
}

export const tally = (groups: Group[]): { done: number; total: number } => {
  const rows = groups.flatMap((g) => g.rows);
  return { done: rows.filter((r) => r.state === "done" || r.handled).length, total: rows.length };
};
