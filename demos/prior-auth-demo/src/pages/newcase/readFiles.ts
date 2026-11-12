/* Reader sorts a pile of dropped files: an insurance card fills the insurance, any other file fills what is still blank from the sample chart
   and goes into the document slot its name says, or the next missing required one, so any file name works in the demo.
   Nothing the person typed, and nothing a referral or EMR Connect supplied, is ever overwritten. */
import type { DemoFile } from "@/components/ui";
import { planTypeOf, type CaseDraft, type DocSlotId, type DraftDocument, type ReadKey, type ReadNote } from "@/data/cases";
import type { DocItem } from "@/data/payerConfig";
import { PAYERS } from "@/data/seed";
import { plural } from "@/lib/format";
import { useStore } from "@/store";
import { docEntries, makeDocument, openFindings, slotForFile, trackOfDraft, unreadDocument } from "./documents";
import { dx, SAMPLE_CHART } from "./intake";
import { payerContextOf } from "./payerContext";
import { fieldSnap, type FieldKey } from "./provenance";

const CARD_WORDS = /\b(insurance|card|member|id)\b/;
/** "insurance card.png", "member_id.pdf", "ID.jpg": the words are matched whole, so "cardiology" is not a card. */
const isCardFile = (name: string): boolean => CARD_WORDS.test(name.toLowerCase().replace(/[^a-z0-9]+/g, " "));

interface SortPlan {
  patch: Partial<CaseDraft>;
  docs: DraftDocument[];
  /** Files placed by name without a finding, and the file names that need a look. */
  matched: number;
  guessed: string[];
  flagged: string[];
  unplaced: string[];
}

function planSort(d: CaseDraft, files: DemoFile[], items: (payerId: CaseDraft["payerId"], program: CaseDraft["program"]) => DocItem[] | null): SortPlan {
  let next = d;
  let patch: Partial<CaseDraft> = {};
  const fills: { key: FieldKey; file: string }[] = [];
  const apply = (p: Partial<CaseDraft>, key?: FieldKey, file?: string) => {
    next = { ...next, ...p };
    patch = { ...patch, ...p };
    if (key && file) fills.push({ key, file });
  };
  const cards = files.filter((f) => isCardFile(f.name));
  const charts = files.filter((f) => !isCardFile(f.name));

  const card = cards[0];
  if (card) {
    if (!next.payerId) {
      const id = PAYERS.find((p) => card.name.toLowerCase().includes(p.shortName.toLowerCase()))?.id ?? SAMPLE_CHART.payerId;
      apply({ payerId: id, planType: next.planType || planTypeOf(id) }, "payer", card.name);
    } else if (!next.planType) apply({ planType: planTypeOf(next.payerId) });
    if (!next.memberId) apply({ memberId: SAMPLE_CHART.memberId }, "member", card.name);
    apply({ cardRead: true });
  }
  const first = charts[0];
  if (first) {
    const s = SAMPLE_CHART;
    if (!next.patient.initials.trim() && !next.patient.age) apply({ patient: { ...s.patient } }, "patient", first.name);
    if (!next.program) apply({ program: s.program }, "program", first.name);
    if (!next.type) apply({ type: s.type }, "type", first.name);
    if (!next.diagnoses.length) apply({ diagnoses: dx(...s.diagnoses) }, "diagnoses", first.name);
    if (!next.reason.trim()) apply({ reason: s.reason }, "reason", first.name);
  }

  /* The list depends on the payer and level of care, which the files above may just have filled in. */
  const list = docEntries(next.payerId, next.program, items(next.payerId, next.program), trackOfDraft(next));
  const have = new Set(d.documents.map((x) => x.slot));
  const claimed = new Map<DocSlotId, DraftDocument>();
  const guessed: string[] = [];
  const flagged: string[] = [];
  const unplaced: string[] = [];
  const later: DemoFile[] = [];
  let matched = cards.length;

  for (const f of charts) {
    const slot = slotForFile(f.name);
    if (!slot) later.push(f);
    else if (claimed.has(slot)) unplaced.push(f.name);
    else {
      const doc = makeDocument(slot, f);
      claimed.set(slot, doc);
      if (openFindings(doc, d.answers)) flagged.push(f.name);
      else matched += 1;
    }
  }
  const reads: Partial<Record<ReadKey, ReadNote>> = {};
  for (const f of later) {
    /* A file with no telling name is a clinical document more often than an order, so the referral slot is the last resort. */
    const open = list.filter((r) => r.required && !have.has(r.slot) && !claimed.has(r.slot) && !(r.slot in d.unavailable));
    const free = open.find((r) => r.slot !== "referral") ?? open[0];
    if (!free) {
      unplaced.push(f.name);
      continue;
    }
    claimed.set(free.slot, makeDocument(free.slot, f));
    guessed.push(f.name);
    reads[`doc:${free.slot}`] = { file: f.name, value: f.id };
  }

  const snap = fieldSnap(next);
  for (const { key, file } of fills) reads[key] = { file, value: snap[key] ?? "" };
  if (Object.keys(reads).length) patch = { ...patch, read: { ...d.read, ...reads } };
  return { patch, docs: [...claimed.values()], matched, guessed, flagged, unplaced };
}

function toastFor(total: number, p: SortPlan) {
  const look = p.guessed.length + p.flagged.length + p.unplaced.length;
  const parts = [p.matched ? `${p.matched} matched` : "", look ? `${look} ${look === 1 ? "needs" : "need"} a look` : ""].filter(Boolean);
  const body = [
    p.unplaced.length ? `Could not place: ${p.unplaced.join(", ")}.` : "",
    p.guessed.length ? `Check where Reader put: ${p.guessed.join(", ")}.` : "",
    p.flagged.length ? `Findings in: ${p.flagged.join(", ")}.` : "",
  ].filter(Boolean);
  return { title: `Reader sorted ${plural(total, "file")}: ${parts.join(", ")}`, body: body.length ? body.join(" ") : "Each one is being read now.", tone: look ? ("mid" as const) : ("good" as const) };
}

/** A request prepared from an intake record: a dropped file goes into the item its name says, or the next required item still empty. Only the name and type are kept; nothing is read, filled in or checked. */
function sortRecordFiles(id: string, draft: CaseDraft, files: DemoFile[]): void {
  const st = useStore.getState();
  const items = payerContextOf(st, draft).items;
  const list = docEntries(draft.payerId, draft.program, items, trackOfDraft(draft));
  const taken = new Set<DocSlotId>(draft.documents.map((x) => x.slot));
  const docs: DraftDocument[] = [];
  const unplaced: string[] = [];
  for (const f of files) {
    const named = slotForFile(f.name);
    const free = named && !taken.has(named) ? named : list.find((r) => r.required && !taken.has(r.slot) && !(r.slot in draft.unavailable) && r.slot !== "referral")?.slot;
    if (!free) {
      unplaced.push(f.name);
      continue;
    }
    taken.add(free);
    docs.push(unreadDocument(free, f));
  }
  if (docs.length) st.putCaseDocs(id, docs);
  st.toast({
    title: `${plural(docs.length, "file")} added by name and type`,
    body: [`Placed by file name. Files are not read in the demo, so no check ran.`, unplaced.length ? `Could not place: ${unplaced.join(", ")}.` : ""].filter(Boolean).join(" "),
    tone: unplaced.length ? "mid" : "neutral",
  });
}

/** The drop panel's handler: update the draft once and say what happened in one toast. */
export function sortFiles(id: string, files: DemoFile[]): void {
  const st = useStore.getState();
  const draft = st.caseDrafts.find((x) => x.id === id);
  if (!draft || !files.length) return;
  if (draft.intakeId) return sortRecordFiles(id, draft, files);
  const plan = planSort(draft, files, (payerId, program) => payerContextOf(st, { payerId, program }).items);
  if (Object.keys(plan.patch).length) st.patchCaseDraft(id, plan.patch);
  if (plan.docs.length) st.putCaseDocs(id, plan.docs);
  st.toast(toastFor(files.length, plan));
}
