/* What an import (EMR pull, export file or screenshot) does to a case once the person chooses Apply: the fields fill the intake, the earlier notes and diagnoses
   become documents, and each filled field remembers where it came from until the person changes it. Event handlers only. */
import type { ImportResult, ImportedDocument } from "@/components/import";
import type { DemoFile } from "@/components/ui";
import { ageOn, plansOf, planTypeOf, type CaseDraft, type DocSlotId, type DraftDocument, type ImportedKey, type PatientSex } from "@/data/cases";
import { PROGRAM_LABEL, type Program } from "@/data/types";
import { plural, uid } from "@/lib/format";
import { useStore } from "@/store";
import { isFixedSlot, makeDocument, slotForFile } from "./documents";
import { ICD_CODES } from "./lookups";

const mdy = (iso: string): string => `${iso.slice(5, 7)}/${iso.slice(8, 10)}`;
const SOURCE_WORD = { emr: "From EMR", file: "From file", screenshot: "From screenshot" } as const;
/** The identity of a patient the case already follows: an import never changes who the case is for. */
const IDENTITY: ImportedKey[] = ["initials", "dob", "age", "sex", "payerId", "planType", "memberId"];

/** The value of an intake field in the form an import gives it, for "replaces …" and for the "From EMR" note. */
export function currentOf(d: CaseDraft): Partial<Record<ImportedKey, string>> {
  return {
    initials: d.patient.initials,
    dob: d.patient.dob ?? "",
    age: d.patient.age === null ? "" : String(d.patient.age),
    sex: d.patient.sex ?? "",
    payerId: d.payerId ?? "",
    planType: d.planType,
    memberId: d.memberId,
    program: d.program ?? "",
    diagnosis: d.diagnoses[0]?.code ?? "",
    startDate: d.startDate,
  };
}

/** "From EMR" while the field still holds what the import gave it, otherwise nothing. */
export function importNote(d: CaseDraft, key: ImportedKey): string | undefined {
  const mark = d.imported?.[key];
  if (!mark) return undefined;
  return currentOf(d)[key] === mark.value ? SOURCE_WORD[mark.source] : undefined;
}

function documentsOf(d: CaseDraft, list: ImportedDocument[]): { docs: DraftDocument[]; kept: string[] } {
  const taken = new Set<DocSlotId>(d.documents.map((x) => x.slot));
  const docs: DraftDocument[] = [];
  const kept: string[] = [];
  for (const x of list) {
    const slot = (x.docId && isFixedSlot(x.docId as DocSlotId) ? (x.docId as DocSlotId) : slotForFile(x.title)) ?? (`item:${x.title}` as DocSlotId);
    /* A document already in the case is never replaced by an import. */
    if (taken.has(slot)) {
      kept.push(x.title);
      continue;
    }
    taken.add(slot);
    const file: DemoFile = { id: uid("imp"), name: `${x.title}${x.date ? ` (${mdy(x.date)})` : ""}.pdf`, sizeKb: 96 + ((x.title.length * 37) % 220) };
    docs.push(makeDocument(slot, file));
  }
  return { docs, kept };
}

/** Applies what the person ticked. Returns nothing; says what happened in one toast. */
export function applyImport(draftId: string, r: ImportResult): void {
  const st = useStore.getState();
  const d = st.caseDrafts.find((x) => x.id === draftId);
  if (!d) return;
  const known = !!d.patientId;
  const fields = r.fields.filter((f) => !(known && IDENTITY.includes(f.key as ImportedKey)));
  const held = r.fields.length - fields.length;
  const patch: Partial<CaseDraft> = { started: true };
  const patient = { ...d.patient };
  const marks = { ...(d.imported ?? {}) };
  const set = (key: ImportedKey, value: string) => {
    marks[key] = { source: r.source, value };
  };
  for (const f of fields) {
    const key = f.key as ImportedKey;
    if (key === "initials") patient.initials = f.value;
    else if (key === "dob") {
      patient.dob = f.value;
      patient.age = ageOn(f.value, st.clock) ?? patient.age;
    } else if (key === "age" && !patient.dob) patient.age = Number(f.value);
    else if (key === "sex") patient.sex = f.value as PatientSex;
    else if (key === "payerId") {
      patch.payerId = f.value;
      if (!fields.some((x) => x.key === "planType")) patch.planType = planTypeOf(f.value);
    } else if (key === "planType") patch.planType = f.value;
    else if (key === "memberId") patch.memberId = f.value;
    else if (key === "program" && f.value in PROGRAM_LABEL) patch.program = f.value as Program;
    else if (key === "diagnosis") {
      const known = ICD_CODES.find((c) => c.code === f.value) ?? { code: f.value, label: "" };
      patch.diagnoses = [known, ...d.diagnoses.filter((x) => x.code !== f.value)];
    } else if (key === "startDate") patch.startDate = f.value;
    else continue;
    set(key, f.value);
  }
  if (fields.some((f) => ["initials", "dob", "age", "sex"].includes(f.key))) patch.patient = patient;
  /* A plan type the payer does not offer is kept only when nothing better is known; otherwise the payer's own first plan is used. */
  const payer = patch.payerId ?? d.payerId;
  if (patch.planType && payer && plansOf(payer).length && !plansOf(payer).includes(patch.planType)) patch.planType = plansOf(payer)[0];
  if (patch.planType !== undefined) set("planType", patch.planType);
  patch.imported = marks;
  st.patchCaseDraft(draftId, patch);
  const { docs, kept } = documentsOf(d, r.documents ?? []);
  if (docs.length) st.putCaseDocs(draftId, docs);
  const parts = [fields.length ? plural(fields.length, "field") : "", docs.length ? plural(docs.length, "document") : ""].filter(Boolean).join(" and ");
  const notes = [held ? `This case follows ${d.patient.initials}, ${d.patient.age ?? ""}: the patient and the plan stay as they are.` : "", kept.length ? `Already in the case: ${kept.join(", ")}.` : ""].filter(Boolean).join(" ");
  st.toast({ title: parts ? `Applied ${parts}` : "Nothing new to apply", body: [r.sourceLabel, notes].filter(Boolean).join(". "), tone: parts ? "good" : "neutral" });
}
