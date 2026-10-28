import type { StateCreator } from "zustand";
import { canSign } from "@/data/assess/roles";
import type { FieldState, FieldValue, SourceRef } from "@/data/intake/types";
import type { InstrumentEvidence, InstrumentInstance, ModuleId } from "@/data/assess/types";
import { moduleById } from "@/data/assess/modules";
import type { IntakeRecord } from "@/data/intake/types";
import type { AppState } from "./index";
import { meOf } from "./intake";

/* Assessment instances: one per module in use, with its fields (each carrying where it came from), evidence the reader proposes, notes, a score or a
   level-of-care recommendation, and a signature. A signed instance is never overwritten: an amendment makes a new version and keeps the old one. */

export interface IntakeInstrumentSlice {
  /** Creates the instance (version 1) when a person opens a module to work on it. */
  startInstrument: (id: string, moduleId: ModuleId) => void;
  setInstrumentField: (id: string, moduleId: ModuleId, key: string, value: string, state?: FieldState, source?: SourceRef) => void;
  setInstrumentNotes: (id: string, moduleId: ModuleId, text: string) => void;
  /** The result a clinician entered from the administered instrument. Psyflo computes nothing. */
  setInstrumentScore: (id: string, moduleId: ModuleId, value: string, note?: string) => void;
  /** The level-of-care review: what the clinician recommended and confirmed. */
  setInstrumentLoc: (id: string, moduleId: ModuleId, patch: Partial<NonNullable<InstrumentInstance["loc"]>>) => void;
  /** Evidence the reader proposes. Never fills a field until a person accepts it. */
  addInstrumentEvidence: (id: string, moduleId: ModuleId, evidence: Omit<InstrumentEvidence, "id" | "status" | "at">[]) => number;
  decideInstrumentEvidence: (id: string, moduleId: ModuleId, evidenceId: string, decision: "accepted" | "edited" | "rejected", edited?: string) => void;
  /** The instance is ready for the clinician's review. */
  markInstrumentReady: (id: string, moduleId: ModuleId) => void;
  /** A qualified clinician signs. Returns false while evidence waits for a decision or when the signer may not sign. */
  signInstrument: (id: string, moduleId: ModuleId, signerId: string, rolePlay?: boolean) => boolean;
  /** Starts a new version of a signed instance and keeps the signed one in its history. */
  amendInstrument: (id: string, moduleId: ModuleId, reason: string) => void;
}

let n = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${++n}`;
const blank = (moduleId: ModuleId, at: number): InstrumentInstance => ({ moduleId, version: 1, status: "not_started", fields: {}, notes: "", evidence: [], history: [], updatedAt: at });

export const createIntakeInstrumentSlice: StateCreator<AppState, [], [], IntakeInstrumentSlice> = (_set, get) => {
  const edit = (id: string, moduleId: ModuleId, fn: (i: InstrumentInstance) => InstrumentInstance) =>
    get().patchIntake(id, (r: IntakeRecord) => {
      const cur = r.instruments?.[moduleId] ?? blank(moduleId, get().clock);
      return { ...r, instruments: { ...(r.instruments ?? {}), [moduleId]: { ...fn(cur), updatedAt: get().clock } } };
    });
  const audit = (id: string, moduleId: ModuleId, action: string, detail?: string, ai = false) =>
    get().addIntakeAudit(id, { actor: ai ? "scribe" : meOf(get()), action: `${moduleById(moduleId).label}: ${action}`, detail, section: "assessment", ai });
  const open = (i: InstrumentInstance, at: number): InstrumentInstance => (i.status === "not_started" ? { ...i, status: "in_progress", startedAt: at } : i);
  const locked = (id: string, moduleId: ModuleId) => get().intakes.find((x) => x.id === id)?.instruments?.[moduleId]?.status === "signed";

  return {
    startInstrument: (id, moduleId) => {
      if (get().intakes.find((x) => x.id === id)?.instruments?.[moduleId]) return;
      edit(id, moduleId, (i) => i);
    },

    setInstrumentField: (id, moduleId, key, value, state = "verified", source) => {
      if (locked(id, moduleId)) return;
      const s = get();
      const me = meOf(s);
      const fv: FieldValue = { value, state, source: source ?? { kind: "staff", ref: "Entered by staff" }, at: s.clock, by: me, reviewedBy: state === "verified" ? me : undefined, reviewedAt: state === "verified" ? s.clock : undefined };
      edit(id, moduleId, (i) => ({ ...open(i, s.clock), fields: { ...i.fields, [key]: fv } }));
      audit(id, moduleId, `Updated ${key}`, value ? undefined : "Cleared");
    },

    setInstrumentNotes: (id, moduleId, text) => {
      if (locked(id, moduleId)) return;
      edit(id, moduleId, (i) => ({ ...open(i, get().clock), notes: text }));
    },

    setInstrumentScore: (id, moduleId, value, note) => {
      if (locked(id, moduleId)) return;
      const s = get();
      edit(id, moduleId, (i) => ({ ...open(i, s.clock), score: { value, administeredBy: meOf(s), administeredAt: s.clock, note } }));
      audit(id, moduleId, "Entered the result of the administered instrument", value);
    },

    setInstrumentLoc: (id, moduleId, patchLoc) => {
      if (locked(id, moduleId)) return;
      const s = get();
      edit(id, moduleId, (i) => ({ ...open(i, s.clock), loc: { ...i.loc, ...patchLoc, ...(patchLoc.confirmed ? { confirmedBy: meOf(s), confirmedAt: s.clock } : {}) } }));
      if (patchLoc.confirmed) audit(id, moduleId, "Confirmed the level of care", patchLoc.confirmed);
    },

    addInstrumentEvidence: (id, moduleId, evidence) => {
      const s = get();
      const add = evidence.map((e): InstrumentEvidence => ({ ...e, id: uid("ev"), status: "pending", at: s.clock }));
      if (!add.length || locked(id, moduleId)) return 0;
      edit(id, moduleId, (i) => ({ ...open(i, s.clock), evidence: [...i.evidence, ...add] }));
      audit(id, moduleId, `Proposed ${add.length} piece${add.length === 1 ? "" : "s"} of evidence`, "Draft: waits for a person to accept, edit or reject each one", true);
      return add.length;
    },

    decideInstrumentEvidence: (id, moduleId, evidenceId, decision, edited) => {
      const s = get();
      const me = meOf(s);
      const ev = s.intakes.find((x) => x.id === id)?.instruments?.[moduleId]?.evidence.find((e) => e.id === evidenceId);
      if (!ev || ev.status !== "pending" || locked(id, moduleId)) return;
      edit(id, moduleId, (i) => {
        const text = decision === "edited" ? (edited ?? ev.text) : ev.text;
        const fields = decision === "rejected" ? i.fields : { ...i.fields, [ev.fieldKey]: { value: text, state: decision === "edited" ? ("verified" as const) : ev.source.kind === "document" || ev.source.kind === "emr" ? ("document_extracted" as const) : ("patient_reported" as const), source: ev.source, at: ev.at, by: ev.agent, confidence: ev.confidence, reviewedBy: me, reviewedAt: s.clock } };
        return { ...i, fields, evidence: i.evidence.map((e) => (e.id === evidenceId ? { ...e, status: decision, decidedBy: me, decidedAt: s.clock, editedText: decision === "edited" ? text : undefined } : e)) };
      });
      audit(id, moduleId, `${decision === "rejected" ? "Rejected" : decision === "edited" ? "Edited and accepted" : "Accepted"} evidence for ${ev.fieldKey}`, ev.source.ref);
    },

    markInstrumentReady: (id, moduleId) => {
      if (locked(id, moduleId)) return;
      edit(id, moduleId, (i) => ({ ...i, status: "awaiting_review" }));
      audit(id, moduleId, "Marked ready for the clinician's review");
    },

    signInstrument: (id, moduleId, signerId, rolePlay = false) => {
      const s = get();
      const inst = s.intakes.find((x) => x.id === id)?.instruments?.[moduleId];
      if (!inst || inst.status === "signed" || !canSign(signerId) || inst.evidence.some((e) => e.status === "pending")) return false;
      edit(id, moduleId, (i) => ({ ...i, status: "signed", signedBy: signerId, signedAt: s.clock, reviewedBy: signerId, rolePlay }));
      get().addIntakeAudit(id, { actor: signerId, action: `${moduleById(moduleId).label}: Signed${rolePlay ? " (demo role-play)" : ""}`, section: "assessment" });
      return true;
    },

    amendInstrument: (id, moduleId, reason) => {
      const s = get();
      const inst = s.intakes.find((x) => x.id === id)?.instruments?.[moduleId];
      if (!inst || inst.status !== "signed" || !reason.trim()) return;
      edit(id, moduleId, (i) => ({
        ...i, version: i.version + 1, status: "in_progress", signedBy: undefined, signedAt: undefined, reviewedBy: undefined, rolePlay: undefined,
        history: [...i.history, { version: i.version, status: "superseded", fields: i.fields, signedBy: i.signedBy, signedAt: i.signedAt, supersededAt: s.clock, note: reason.trim() }],
      }));
      audit(id, moduleId, `Started version ${inst.version + 1}`, reason.trim());
    },
  };
};
