import { REFERRAL_SAMPLES, SUPPORTING_SAMPLES, type SampleExtract } from "@/data/intake/samples";
import type { IntakeDocument, IntakeRecord, SourceRef, Suggestion } from "@/data/intake/types";
import { useStore } from "@/store";
import { runAgent } from "../lib/agents";
import { isMissingValue } from "./missing";
import { missingRequired } from "./requiredFields";
import { conflictWith } from "./logic";

let n = 0;
const sid = () => `sg-rd-${Date.now().toString(36)}-${++n}`;
const refOf = (doc: IntakeDocument) => `${doc.name.replace(/\.(pdf|txt|eml)$/i, "")} p.1`;

/** The Referral Agent (Reader) reads one attached document: every value it finds becomes a pending suggestion with its source block and quote.
    It skips what is already on file, marks contradictions, raises safety language for a clinician (never resolves it) and says what is missing.
    It writes no field. Returns the task id, or null when the agent is paused in Settings. */
export function readReferralDocument(recordId: string, doc: IntakeDocument, extract: SampleExtract[], safety?: { block: string; quote: string; text: string }): string | null {
  const ref = refOf(doc);
  const src = (block: string, quote?: string): SourceRef => ({ kind: "document", ref, docId: doc.id, blockId: block, quote });
  return runAgent(recordId, {
    role: "referral",
    action: `Read ${doc.name}`,
    section: "referral",
    source: doc.name,
    approval: "required",
    ms: 1500,
    work: () => {
      const s = useStore.getState();
      const r = s.intakes.find((x) => x.id === recordId);
      if (!r) return;
      const found: Suggestion[] = [];
      let skipped = 0;
      for (const e of extract) {
        const already = r.suggestions.some((x) => x.status === "pending" && x.section === e.section && x.field === e.field && x.value.toLowerCase() === e.value.toLowerCase());
        const conflict = e.conflict ?? conflictWith(r, e.section, e.field, e.value);
        if (already || (!isMissingValue(r[e.section][e.field]) && !conflict)) {
          skipped++;
          continue;
        }
        found.push({ id: sid(), section: e.section, field: e.field, value: e.value, source: src(e.block, e.quote), confidence: e.confidence, agent: "reader", at: s.clock, status: "pending", conflict });
      }
      s.addIntakeSuggestions(recordId, found);
      let safetyNote: string | null = null;
      if (safety) {
        if (r.safety?.status === "open") safetyNote = "more safety language found; the open alert already waits for a clinician";
        else {
          s.raiseSafety(recordId, { raisedBy: "reader", text: safety.text, source: src(safety.block, safety.quote) });
          safetyNote = "safety language raised for a clinician";
        }
      }
      const after = useStore.getState().intakes.find((x) => x.id === recordId) ?? r;
      const missing = missingRequired(after, "referral").filter((spec) => !after.suggestions.some((x) => x.field === spec.key && x.status === "pending")).map((m) => m.label.toLowerCase());
      const conflicts = found.filter((x) => x.conflict).length;
      return [
        `${found.length} field${found.length === 1 ? "" : "s"} suggested for review`,
        skipped ? `${skipped} already on file` : null,
        conflicts ? `${conflicts} conflict${conflicts === 1 ? "" : "s"} to confirm` : null,
        safetyNote,
        missing.length ? `not in the document: ${missing.join(", ")}` : null,
      ].filter(Boolean).join("; ");
    },
  });
}

/** What Reader can read again in an attached sample document (after a pause or an error). Seeded documents have no sample behind them. */
export function readAgainFor(r: IntakeRecord, docName: string): { doc: IntakeDocument; extract: SampleExtract[]; safety?: { block: string; quote: string; text: string } } | null {
  const doc = r.documents.find((d) => d.name === docName);
  if (!doc) return null;
  const ref = REFERRAL_SAMPLES.find((s) => s.docName === docName);
  if (ref) return { doc, extract: ref.extract, safety: ref.safety };
  const sup = SUPPORTING_SAMPLES.map((s) => s.build(r)).find((b) => b.docName === docName);
  return sup ? { doc, extract: sup.extract } : null;
}
