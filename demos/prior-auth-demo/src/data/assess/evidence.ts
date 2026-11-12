import type { AgentKey } from "../types";
import { specOf } from "../intake/fields";
import { ASSESSMENT_SECTIONS, type FieldMap, type IntakeRecord, type SourceRef } from "../intake/types";
import { moduleById, schemaOf } from "./modules";
import { isVisible } from "./visibility";
import type { FieldDef, InstrumentEvidence, InstrumentInstance, ModuleId, ModuleSchema } from "./types";

/* The simulated evidence reader. It looks through what the record already holds (documents, the referral and profile fields, the clinical assessment,
   the transcripts, and the signed content of other modules) for sentences that contain the words a field lists in its `evidence`, and proposes each
   sentence for that field with its source, a fixed explanation and a confidence. It reads text. It never rates, scores, diagnoses or fills a level of
   care, and nothing it proposes becomes a value until a person accepts or edits it. Deterministic: the same record gives the same proposals. */

export type EvidenceProposal = Omit<InstrumentEvidence, "id" | "status" | "at">;

interface Snippet {
  text: string;
  source: SourceRef;
  agent: AgentKey;
  /** Where it was read, in words, for the explanation: "the referral document", "the signed Substance use history". */
  origin: string;
}

const MAX_PER_FIELD = 2;
const MAX_LENGTH = 360;
const norm = (t: string): string => t.toLowerCase().replace(/\s+/g, " ").trim();

/** A short word matches as a whole word ("mg", "ct"); a longer one at the start of a word ("withdrawal" finds "withdrawals", "rent" does not find "current"). */
const patterns = new Map<string, RegExp>();
function hit(text: string, word: string): boolean {
  let re = patterns.get(word);
  if (!re) {
    const w = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(word.length <= 3 ? `(^|[^a-z])${w}([^a-z]|$)` : `(^|[^a-z])${w}`);
    patterns.set(word, re);
  }
  return re.test(text);
}

/** The referral and profile fields that carry clinical text. Who referred, contact details and consent are left out: an organization named "Withdrawal
    Center" is not evidence of withdrawal. */
const CLINICAL: Record<"Referral" | "Profile", string[]> = {
  Referral: ["reason", "concerns", "symptoms", "dxDocumented", "previousServices", "hospitalization", "preferences", "notes"],
  Profile: ["medications", "medical", "psychHistory", "substanceUse", "housing", "supports", "educationEmployment", "legal", "transportation"],
};

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z“"(])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12)
    .map((s) => (s.length > MAX_LENGTH ? `${s.slice(0, MAX_LENGTH).replace(/\s+\S*$/, "")}...` : s));
}

/** Everything the reader may quote, in a fixed order: documents, referral, profile, the assessment, transcripts, then other signed modules. */
function collect(record: IntakeRecord, exceptModule?: ModuleId): Snippet[] {
  const out: Snippet[] = [];
  const add = (text: string, source: SourceRef, agent: AgentKey, origin: string) => {
    for (const s of sentences(text)) out.push({ text: s, source: { ...source, quote: s }, agent, origin });
  };

  for (const doc of record.documents) {
    doc.pages.forEach((blocks, pageIdx) => {
      for (const b of blocks) {
        const ref = `${doc.name} p.${pageIdx + 1}`;
        const src: SourceRef = { kind: doc.kind === "emr_summary" ? "emr" : "document", ref, docId: doc.id, blockId: "id" in b ? b.id : undefined };
        if (b.kind === "p") add(b.text, src, "reader", `the document ${doc.name}`);
        else if (b.kind === "list") for (const item of b.items) add(item, src, "reader", `the document ${doc.name}`);
        else if (b.kind === "table") for (const row of b.rows) add(row.join(": "), src, "reader", `the document ${doc.name}`);
      }
    });
  }

  const fromMap = (map: FieldMap, label: (key: string) => string, kind: "Referral" | "Profile") => {
    for (const [key, fv] of Object.entries(map)) {
      if (!CLINICAL[kind].includes(key) || !fv.value.trim() || fv.state === "not_applicable" || fv.state === "not_collected") continue;
      const l = label(key);
      /* A value that was itself read from a document points back at that document, so the person can open it. */
      const source: SourceRef = fv.source?.docId ? fv.source : { kind: "form", ref: `${kind}: ${l}` };
      add(fv.value, source, "reader", `the ${kind.toLowerCase()} ${l.toLowerCase()}`);
    }
  };
  fromMap(record.referral, (k) => specOf(k)?.label ?? k, "Referral");
  fromMap(record.profile, (k) => specOf(k)?.label ?? k, "Profile");

  for (const [key, fv] of Object.entries(record.assessment.fields)) {
    if (!fv.value.trim()) continue;
    const l = ASSESSMENT_SECTIONS.find((s) => s.id === key)?.label ?? key;
    add(fv.value, { kind: "staff", ref: `Clinical assessment: ${l}` }, "scribe", `the clinical assessment, ${l.toLowerCase()}`);
  }

  for (const t of record.scribe?.turns ?? []) if (t.speaker === "patient" || t.speaker === "caregiver") add(t.text, { kind: "transcript", ref: "Scribe transcript (simulated)", at: t.at }, "scribe", "the scribe transcript");
  for (const t of record.voice?.turns ?? []) if (t.speaker === "patient" || t.speaker === "caregiver") add(t.text, { kind: "voice", ref: "Voice intake transcript (simulated)", at: t.at }, "scribe", "the voice intake transcript");

  for (const [id, inst] of Object.entries(record.instruments ?? {})) {
    if (id === exceptModule || inst.status !== "signed") continue;
    const def = moduleById(id as ModuleId);
    const fields = schemaOf(id as ModuleId).sections.flatMap((s) => s.fields);
    for (const [key, fv] of Object.entries(inst.fields)) {
      if (!fv.value.trim() || fv.state === "not_applicable") continue;
      const l = fields.find((f) => f.key === key)?.label ?? key;
      add(fv.value, { kind: "form", ref: `${def.label}, signed v${inst.version}: ${l}` }, "scribe", `the signed ${def.label.toLowerCase()}`);
    }
  }
  return out;
}

const confidenceOf = (matched: number): InstrumentEvidence["confidence"] => (matched >= 3 ? "high" : matched === 2 ? "medium" : "low");

/** The reader's proposals for the text fields of one module, and a line saying what it read. Fields that already hold a value, and sentences already
    proposed for a field (decided or not), are left out, so running it again only adds what is new. */
export function readEvidence(record: IntakeRecord, schema: ModuleSchema, opts: { moduleId?: ModuleId; instance?: InstrumentInstance } = {}): { proposals: EvidenceProposal[]; read: string } {
  const snippets = collect(record, opts.moduleId);
  const fields = opts.instance?.fields ?? {};
  const proposals: EvidenceProposal[] = [];
  const candidates = schema.sections.flatMap((s) => s.fields).filter((f): f is FieldDef => (f.kind === "text" || f.kind === "long") && !!f.evidence?.length && isVisible(f, record));

  for (const f of candidates) {
    if (fields[f.key]?.value.trim()) continue;
    const seen = new Set((opts.instance?.evidence ?? []).filter((e) => e.fieldKey === f.key).map((e) => norm(e.text)));
    const words = (f.evidence ?? []).map((w) => w.toLowerCase());
    const scored = snippets
      .map((s, order) => {
        const t = norm(s.text);
        return { s, order, matched: words.filter((w) => hit(t, w)) };
      })
      .filter((x) => x.matched.length > 0 && !seen.has(norm(x.s.text)))
      .sort((a, b) => b.matched.length - a.matched.length || a.order - b.order);
    /* A value that was read from a document block and that block itself are one piece of evidence, not two. */
    const blocks = new Set<string>();
    for (const x of scored) {
      if (proposals.filter((p) => p.fieldKey === f.key).length >= MAX_PER_FIELD) break;
      const block = x.s.source.docId && x.s.source.blockId ? `${x.s.source.docId}#${x.s.source.blockId}` : "";
      if (block && blocks.has(block)) continue;
      if (block) blocks.add(block);
      if (proposals.some((p) => p.fieldKey === f.key && norm(p.text) === norm(x.s.text))) continue;
      const shown = x.matched.slice(0, 3).map((w) => `“${w.trim()}”`).join(", ");
      proposals.push({
        fieldKey: f.key, text: x.s.text, source: x.s.source, agent: x.s.agent, confidence: confidenceOf(x.matched.length),
        explanation: `Contains ${shown} in ${x.s.origin}. A suggestion from the simulated evidence reader; a person decides.`,
      });
    }
  }

  const docs = record.documents.length;
  const signed = Object.entries(record.instruments ?? {}).filter(([id, i]) => id !== opts.moduleId && i.status === "signed").length;
  const read = `${docs} document${docs === 1 ? "" : "s"}, the referral, the profile${record.assessment.status !== "not_started" ? ", the clinical assessment" : ""}${signed ? ` and ${signed} signed module${signed === 1 ? "" : "s"}` : ""}`;
  return { proposals, read };
}

export const proposeEvidence = (record: IntakeRecord, schema: ModuleSchema, opts: { moduleId?: ModuleId; instance?: InstrumentInstance } = {}): EvidenceProposal[] => readEvidence(record, schema, opts).proposals;
