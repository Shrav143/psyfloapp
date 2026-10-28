import type { StateCreator } from "zustand";
import { readinessBlockers } from "@/data/assess/completion";
import { moduleById, schemaOf } from "@/data/assess/modules";
import { canSign } from "@/data/assess/roles";
import { snapshotOf } from "@/data/assess/versions";
import type { InstrumentEvidence, InstrumentInstance, ModuleId } from "@/data/assess/types";
import { staffOf } from "@/data/intake/seed";
import { FIELD_STATE_LABEL, type FieldState, type FieldValue, type IntakeRecord, type SourceRef } from "@/data/intake/types";
import type { AppState } from "./index";
import { meOf } from "./intake";

/* Assessment instances: one per module in use, with its fields (each carrying where it came from), evidence the reader proposes, notes, a typed
   instrument result or a level-of-care review, and a signature. A signed instance is never overwritten: an amendment starts a new version and keeps the
   signed one in its history. Every change writes an audit event under the person who made it; the evidence reader's proposals are audited as an agent's.
   Editing an instance that was marked ready sends it back to In progress, because what was reviewed has changed. */

export interface IntakeInstrumentSlice {
  /** Creates the instance (version 1) when a person opens a module to work on it. */
  startInstrument: (id: string, moduleId: ModuleId) => void;
  /** A person sets a field. `state` says where the value came from; an empty value is Not collected unless it is marked Not applicable. */
  setInstrumentField: (id: string, moduleId: ModuleId, key: string, value: string, state?: FieldState, source?: SourceRef) => void;
  setInstrumentNotes: (id: string, moduleId: ModuleId, text: string) => void;
  /** The result a clinician typed from the administered instrument, and who administered it and when (demo minutes). Psyflo computes nothing. */
  setInstrumentScore: (id: string, moduleId: ModuleId, value: string, note?: string, administered?: { by?: string; at?: number }) => void;
  /** The level-of-care review: what the clinician recommended and confirmed. A confirmed level must be one of the module's named levels and comes from a
      qualified clinician (`by`, defaulting to the viewer). Returns false when it was refused. An empty `confirmed` clears it. */
  setInstrumentLoc: (id: string, moduleId: ModuleId, patch: Partial<NonNullable<InstrumentInstance["loc"]>>, by?: string, rolePlay?: boolean) => boolean;
  /** Evidence the reader proposes, without repeating one already proposed for the field. Never fills a field until a person accepts it. Returns how many were added. */
  addInstrumentEvidence: (id: string, moduleId: ModuleId, evidence: Omit<InstrumentEvidence, "id" | "status" | "at">[]) => number;
  decideInstrumentEvidence: (id: string, moduleId: ModuleId, evidenceId: string, decision: "accepted" | "edited" | "rejected", edited?: string) => void;
  /** Ready for the clinician's review. Returns false while required fields are empty or evidence waits for a decision. */
  markInstrumentReady: (id: string, moduleId: ModuleId) => boolean;
  /** Takes an instance that was marked ready back to In progress. */
  reopenInstrument: (id: string, moduleId: ModuleId) => void;
  /** A qualified clinician signs. Returns false when the signer may not sign, a required field is empty, or evidence waits for a decision. */
  signInstrument: (id: string, moduleId: ModuleId, signerId: string, rolePlay?: boolean) => boolean;
  /** Starts a new version of a signed instance, with a reason, and keeps the signed one in its history. */
  amendInstrument: (id: string, moduleId: ModuleId, reason: string) => void;
}

let n = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${++n}`;
const blank = (moduleId: ModuleId, at: number): InstrumentInstance => ({ moduleId, version: 1, status: "not_started", fields: {}, notes: "", evidence: [], history: [], updatedAt: at });
const fieldLabel = (moduleId: ModuleId, key: string): string => schemaOf(moduleId).sections.flatMap((s) => s.fields).find((f) => f.key === key)?.label ?? key;
const locOptions = (moduleId: ModuleId): string[] => schemaOf(moduleId).sections.find((s) => s.type === "loc-review")?.locOptions ?? [];
const sourceState = (src: SourceRef): FieldState => (src.kind === "document" || src.kind === "emr" ? "document_extracted" : src.kind === "transcript" || src.kind === "voice" || src.kind === "patient" ? "patient_reported" : "verified");

export const createIntakeInstrumentSlice: StateCreator<AppState, [], [], IntakeInstrumentSlice> = (_set, get) => {
  const instOf = (id: string, moduleId: ModuleId): InstrumentInstance | undefined => get().intakes.find((x) => x.id === id)?.instruments?.[moduleId];
  const edit = (id: string, moduleId: ModuleId, fn: (i: InstrumentInstance) => InstrumentInstance) =>
    get().patchIntake(id, (r: IntakeRecord) => {
      const cur = r.instruments?.[moduleId] ?? blank(moduleId, get().clock);
      return { ...r, instruments: { ...(r.instruments ?? {}), [moduleId]: { ...fn(cur), updatedAt: get().clock } } };
    });
  const audit = (id: string, moduleId: ModuleId, action: string, detail?: string, ai = false) =>
    get().addIntakeAudit(id, { actor: ai ? "scribe" : meOf(get()), action: `${moduleById(moduleId).label}: ${action}`, detail, section: "assessment", ai });
  /** A change of content: a new instance starts, one marked ready goes back to In progress. */
  const touch = (i: InstrumentInstance, at: number): InstrumentInstance =>
    i.status === "not_started" ? { ...i, status: "in_progress", startedAt: at } : i.status === "awaiting_review" ? { ...i, status: "in_progress", reviewedBy: undefined } : i;
  const locked = (id: string, moduleId: ModuleId) => instOf(id, moduleId)?.status === "signed";

  return {
    startInstrument: (id, moduleId) => {
      if (instOf(id, moduleId)) return;
      edit(id, moduleId, (i) => i);
    },

    setInstrumentField: (id, moduleId, key, value, state = "verified", source) => {
      if (locked(id, moduleId)) return;
      const s = get();
      const me = meOf(s);
      const v = value.trim();
      const st: FieldState = !v && state !== "not_applicable" ? "not_collected" : state;
      const prev = instOf(id, moduleId)?.fields[key];
      if (prev && prev.value === v && prev.state === st) return;
      if (!prev && !v && st === "not_collected") return;
      const reviewed = st === "verified";
      const fv: FieldValue = { value: v, state: st, source: source ?? { kind: "staff", ref: "Entered by staff" }, at: s.clock, by: me, reviewedBy: reviewed ? me : undefined, reviewedAt: reviewed ? s.clock : undefined };
      edit(id, moduleId, (i) => ({ ...touch(i, s.clock), fields: { ...i.fields, [key]: fv } }));
      /* The value itself stays out of the audit trail: it can be sensitive, and the version history holds it. */
      audit(id, moduleId, `${v ? "Updated" : st === "not_applicable" ? "Marked not applicable" : "Cleared"} ${fieldLabel(moduleId, key)}`, v ? FIELD_STATE_LABEL[st] : undefined);
    },

    setInstrumentNotes: (id, moduleId, text) => {
      if (locked(id, moduleId) || (instOf(id, moduleId)?.notes ?? "") === text) return;
      edit(id, moduleId, (i) => ({ ...touch(i, get().clock), notes: text }));
      audit(id, moduleId, "Updated the notes");
    },

    setInstrumentScore: (id, moduleId, value, note, administered) => {
      if (locked(id, moduleId)) return;
      const s = get();
      const v = value.trim();
      const prev = instOf(id, moduleId)?.score;
      const by = administered?.by?.trim() || prev?.administeredBy || meOf(s);
      const at = administered?.at ?? prev?.administeredAt ?? s.clock;
      const n2 = note?.trim() || undefined;
      if (prev && prev.value === v && prev.administeredBy === by && prev.administeredAt === at && prev.note === n2) return;
      edit(id, moduleId, (i) => ({ ...touch(i, s.clock), score: v || n2 || administered ? { value: v, administeredBy: by, administeredAt: at, note: n2 } : undefined }));
      audit(id, moduleId, v ? "Entered the result of the administered instrument" : "Updated the administration details", v ? `Result as typed: ${v}` : undefined);
    },

    setInstrumentLoc: (id, moduleId, patchLoc, by, rolePlay = false) => {
      if (locked(id, moduleId)) return false;
      const s = get();
      const me = meOf(s);
      const prev = instOf(id, moduleId)?.loc;
      if (patchLoc.confirmed) {
        const signer = by ?? me;
        if (!canSign(signer) || !locOptions(moduleId).includes(patchLoc.confirmed)) return false;
        edit(id, moduleId, (i) => ({ ...touch(i, s.clock), loc: { ...i.loc, ...patchLoc, confirmedBy: signer, confirmedAt: s.clock } }));
        s.addIntakeAudit(id, { actor: signer, action: `${moduleById(moduleId).label}: Confirmed the level of care${rolePlay ? " (demo role-play)" : ""}`, detail: patchLoc.confirmed, section: "assessment" });
        return true;
      }
      if (patchLoc.confirmed === "") {
        if (!prev?.confirmed) return true;
        edit(id, moduleId, (i) => ({ ...touch(i, s.clock), loc: { ...i.loc, ...patchLoc, confirmed: undefined, confirmedBy: undefined, confirmedAt: undefined } }));
        audit(id, moduleId, "Cleared the confirmed level of care", prev.confirmed);
        return true;
      }
      if (patchLoc.recommendation !== undefined && patchLoc.recommendation === (prev?.recommendation ?? "") && patchLoc.requested === undefined) return true;
      edit(id, moduleId, (i) => ({ ...touch(i, s.clock), loc: { ...i.loc, ...patchLoc } }));
      if (patchLoc.recommendation !== undefined && patchLoc.recommendation !== (prev?.recommendation ?? "")) audit(id, moduleId, "Updated the clinician recommendation");
      return true;
    },

    addInstrumentEvidence: (id, moduleId, evidence) => {
      const s = get();
      if (locked(id, moduleId)) return 0;
      const have = new Set((instOf(id, moduleId)?.evidence ?? []).map((e) => `${e.fieldKey}|${e.text}`));
      const add = evidence.filter((e) => !have.has(`${e.fieldKey}|${e.text}`)).map((e): InstrumentEvidence => ({ ...e, id: uid("ev"), status: "pending", at: s.clock }));
      if (!add.length) return 0;
      edit(id, moduleId, (i) => ({ ...touch(i, s.clock), evidence: [...i.evidence, ...add] }));
      audit(id, moduleId, `Proposed ${add.length} piece${add.length === 1 ? "" : "s"} of evidence`, "Draft from the simulated evidence reader: each one waits for a person to accept, edit or reject it", true);
      return add.length;
    },

    decideInstrumentEvidence: (id, moduleId, evidenceId, decision, edited) => {
      const s = get();
      const me = meOf(s);
      const ev = instOf(id, moduleId)?.evidence.find((e) => e.id === evidenceId);
      if (!ev || ev.status !== "pending" || locked(id, moduleId)) return;
      const text = decision === "edited" ? (edited?.trim() || ev.text) : ev.text;
      edit(id, moduleId, (i) => {
        /* Accepting writes the text with its source and who reviewed it. Editing makes it the reviewer's own words, with the source kept. A field that already
           holds text keeps it: a second accepted suggestion is added after it, so nothing a person already accepted or typed is lost. */
        const had = i.fields[ev.fieldKey];
        const add = !!had?.value.trim() && had.value.trim() !== text;
        const fv: FieldValue = {
          value: add ? `${had.value.trim()}\n${text}` : text,
          state: decision === "edited" || (add && had.state === "verified") ? "verified" : sourceState(ev.source), source: ev.source, at: ev.at,
          by: decision === "edited" ? me : ev.agent, confidence: decision === "edited" || add ? undefined : ev.confidence, reviewedBy: me, reviewedAt: s.clock,
        };
        return {
          ...touch(i, s.clock),
          fields: decision === "rejected" ? i.fields : { ...i.fields, [ev.fieldKey]: fv },
          evidence: i.evidence.map((e) => (e.id === evidenceId ? { ...e, status: decision, decidedBy: me, decidedAt: s.clock, editedText: decision === "edited" ? text : undefined } : e)),
        };
      });
      audit(id, moduleId, `${decision === "rejected" ? "Rejected" : decision === "edited" ? "Edited and accepted" : "Accepted"} evidence for ${fieldLabel(moduleId, ev.fieldKey)}`, ev.source.ref);
    },

    markInstrumentReady: (id, moduleId) => {
      const inst = instOf(id, moduleId);
      if (!inst || inst.status === "signed" || inst.status === "superseded" || readinessBlockers(moduleId, inst).length) return false;
      edit(id, moduleId, (i) => ({ ...i, status: "awaiting_review" }));
      audit(id, moduleId, "Marked ready for the clinician's review");
      return true;
    },

    reopenInstrument: (id, moduleId) => {
      if (instOf(id, moduleId)?.status !== "awaiting_review") return;
      edit(id, moduleId, (i) => ({ ...i, status: "in_progress", reviewedBy: undefined }));
      audit(id, moduleId, "Took it back to In progress");
    },

    signInstrument: (id, moduleId, signerId, rolePlay = false) => {
      const s = get();
      const inst = instOf(id, moduleId);
      if (!inst || inst.status === "signed" || inst.status === "superseded" || inst.status === "not_started" || !canSign(signerId) || readinessBlockers(moduleId, inst).length) return false;
      edit(id, moduleId, (i) => ({ ...i, status: "signed", signedBy: signerId, signedAt: s.clock, reviewedBy: signerId, rolePlay }));
      s.addIntakeAudit(id, { actor: signerId, action: `${moduleById(moduleId).label}: Signed version ${inst.version}${rolePlay ? " (demo role-play)" : ""}`, detail: staffOf(signerId)?.credentials, section: "assessment" });
      return true;
    },

    amendInstrument: (id, moduleId, reason) => {
      const s = get();
      const inst = instOf(id, moduleId);
      if (!inst || inst.status !== "signed" || !reason.trim()) return;
      edit(id, moduleId, (i) => ({
        ...i, version: i.version + 1, status: "in_progress", signedBy: undefined, signedAt: undefined, reviewedBy: undefined, rolePlay: undefined,
        history: [...i.history, { version: i.version, status: "superseded", fields: snapshotOf(i), signedBy: i.signedBy, signedAt: i.signedAt, supersededAt: s.clock, note: reason.trim() }],
      }));
      audit(id, moduleId, `Started version ${inst.version + 1}`, reason.trim());
    },
  };
};
