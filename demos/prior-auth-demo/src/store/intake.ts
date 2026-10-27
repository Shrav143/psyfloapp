import type { StateCreator } from "zustand";
import { seedIntakes, seedReadiness, seedRoster, VIEWER_STAFF, type LegacyClient, type PlanReadiness, type ReadinessState } from "@/data/intake/seed";
import type { AgentTask, AuditEvent, FieldState, FieldValue, IntakeRecord, IntakeSectionId, SafetyAlert, SourceRef, Suggestion, TriageStatus } from "@/data/intake/types";
import { ROLE_AGENT } from "@/data/intake/types";
import type { ProgramFocus } from "@/data/va/services";
import type { AppState } from "./index";

/* The Intake workspace's slice. Generic actions live here (fields with provenance, suggestions, tasks, audit, triage, safety); each section's
   own actions live in its own slice file (intakeReferral, intakeProfile, intakeClinical, intakeCans, intakeReview), all on the same records.
   Every change by a person writes an audit event; every agent action is a task the assistant panel shows. */

export type FieldSectionKey = "referral" | "profile" | "coverage" | "assessment";

export interface IntakeSlice {
  intakes: IntakeRecord[];
  legacyRoster: LegacyClient[];
  planReadiness: PlanReadiness[];
  /** The program the demo is personalized to (top bar). "all" means every service. */
  programFocus: ProgramFocus;
  /** "redesign" previews the workspace as of July 1, 2027 without moving the demo clock. */
  policyPreview: "today" | "redesign";
  intakeCounter: number;

  setProgramFocus: (f: ProgramFocus) => void;
  setPolicyPreview: (p: "today" | "redesign") => void;
  /** Immutable update of one record. Every section's action goes through here. */
  patchIntake: (id: string, fn: (r: IntakeRecord) => IntakeRecord) => void;
  createIntake: (init: Pick<IntakeRecord, "serviceId" | "method" | "site"> & Partial<IntakeRecord>) => string;
  /** A person sets a field. `state` says where the value came from (verified, patient reported...). */
  setIntakeField: (id: string, section: FieldSectionKey, key: string, value: string, state: FieldState, source?: SourceRef) => void;
  /** Accept, edit or reject an agent's suggestion. Accepting writes the value with the reviewer; rejecting leaves the field as it was. */
  decideSuggestion: (id: string, suggestionId: string, decision: "accepted" | "edited" | "rejected", edited?: string) => void;
  addIntakeAudit: (id: string, e: Omit<AuditEvent, "id" | "at"> & { at?: number }) => void;
  addIntakeTask: (id: string, t: Omit<AgentTask, "id" | "at" | "agent"> & { at?: number }) => string;
  updateIntakeTask: (id: string, taskId: string, patch: Partial<AgentTask>) => void;
  setTriage: (id: string, status: TriageStatus, note?: string) => void;
  assignIntake: (id: string, staffId: string) => void;
  raiseSafety: (id: string, alert: Omit<SafetyAlert, "raisedAt" | "status">) => void;
  /** A person reviews a safety alert and records what they did. */
  resolveSafety: (id: string, action: NonNullable<SafetyAlert["action"]>, note?: string) => void;
  setLegacyStatus: (clientId: string, status: LegacyClient["status"], intakeId?: string) => void;
  setReadiness: (payerId: string, itemId: string, state: ReadinessState, note?: string) => void;
}

let n = 0;
const uidI = (p: string) => `${p}-${Date.now().toString(36)}-${++n}`;
/** The intake staff id of the person viewing. */
export const meOf = (s: Pick<AppState, "viewerId">): string => VIEWER_STAFF[s.viewerId] ?? "jp";

const stateFromSource = (src: SourceRef): FieldState => (src.kind === "document" || src.kind === "emr" ? "document_extracted" : src.kind === "transcript" || src.kind === "voice" || src.kind === "patient" ? "patient_reported" : src.kind === "payer" ? "verified" : "ai_suggested");

export const createIntakeSlice: StateCreator<AppState, [], [], IntakeSlice> = (set, get) => {
  const patch = (id: string, fn: (r: IntakeRecord) => IntakeRecord) => set((s) => ({ intakes: s.intakes.map((r) => (r.id === id ? fn(r) : r)) }));
  const audit = (id: string, e: Omit<AuditEvent, "id" | "at"> & { at?: number }) =>
    patch(id, (r) => ({ ...r, audit: [...r.audit, { id: uidI("ev"), at: e.at ?? get().clock, ...e }] }));
  const writeField = (r: IntakeRecord, section: FieldSectionKey, key: string, fv: FieldValue): IntakeRecord =>
    section === "assessment" ? { ...r, assessment: { ...r.assessment, fields: { ...r.assessment.fields, [key]: fv }, status: r.assessment.status === "not_started" ? "in_progress" : r.assessment.status } } : { ...r, [section]: { ...r[section], [key]: fv } };

  return {
    intakes: seedIntakes(),
    legacyRoster: seedRoster(),
    planReadiness: seedReadiness(),
    programFocus: "all",
    policyPreview: "today",
    intakeCounter: 3130,

    setProgramFocus: (f) => set({ programFocus: f }),
    setPolicyPreview: (p) => set({ policyPreview: p }),
    patchIntake: patch,

    createIntake: (init) => {
      const s = get();
      const id = init.id ?? `IN-${s.intakeCounter + 1}`;
      const me = meOf(s);
      const rec: IntakeRecord = {
        createdAt: s.clock, title: "New intake", serviceDate: s.clock, sourceOrg: "Not entered", triage: "new", urgency: "routine", priority: false, assignedTo: me, payerId: null, initials: "", age: null,
        referral: {}, profile: {}, coverage: {}, eligibility: { status: "not_checked", simulated: true, member: "unknown", benefit: "unknown", network: "unknown", necessity: "not_determined", authorization: "unknown", conflicts: [], exceptions: [] },
        assessment: { mode: "manual", status: "not_started", fields: {} }, cans: null, lon: null, pathways: [], referralsOut: [], documents: [], suggestions: [], tasks: [], audit: [],
        scribe: null, voice: null, safety: null, handoff: { status: "not_started" },
        ...init,
        id,
      };
      rec.audit = [...rec.audit, { id: uidI("ev"), at: s.clock, actor: me, action: "Intake created", detail: rec.method }];
      set((st) => ({ intakes: [rec, ...st.intakes], intakeCounter: init.id ? st.intakeCounter : st.intakeCounter + 1 }));
      return id;
    },

    setIntakeField: (id, section, key, value, state, source) => {
      const s = get();
      const me = meOf(s);
      patch(id, (r) => writeField(r, section, key, { value, state, source: source ?? { kind: "staff", ref: "Entered by staff" }, at: s.clock, by: me, reviewedBy: state === "verified" ? me : undefined, reviewedAt: state === "verified" ? s.clock : undefined }));
      audit(id, { actor: me, action: `Updated ${key}`, detail: value ? undefined : "Cleared", section: section === "assessment" ? "assessment" : section });
    },

    decideSuggestion: (id, suggestionId, decision, edited) => {
      const s = get();
      const me = meOf(s);
      const r = s.intakes.find((x) => x.id === id);
      const sg = r?.suggestions.find((x) => x.id === suggestionId);
      if (!r || !sg || sg.status !== "pending") return;
      patch(id, (rec) => {
        let next: IntakeRecord = { ...rec, suggestions: rec.suggestions.map((x) => (x.id === suggestionId ? { ...x, status: decision, decidedBy: me, decidedAt: s.clock, editedValue: decision === "edited" ? edited : undefined } : x)) };
        if (decision !== "rejected" && (sg.section === "referral" || sg.section === "profile" || sg.section === "coverage" || sg.section === "assessment")) {
          const value = decision === "edited" ? (edited ?? sg.value) : sg.value;
          next = writeField(next, sg.section, sg.field, { value, state: decision === "edited" ? "verified" : stateFromSource(sg.source), source: sg.source, at: sg.at, by: sg.agent, confidence: sg.confidence, reviewedBy: me, reviewedAt: s.clock });
        }
        return next;
      });
      audit(id, { actor: me, action: `${decision === "rejected" ? "Rejected" : decision === "edited" ? "Edited and accepted" : "Accepted"} a suggestion for ${sg.field}`, detail: sg.source.ref, section: sg.section });
    },

    addIntakeAudit: audit,
    addIntakeTask: (id, t) => {
      const taskId = uidI("task");
      patch(id, (r) => ({ ...r, tasks: [...r.tasks, { id: taskId, at: t.at ?? get().clock, agent: ROLE_AGENT[t.role], ...t }] }));
      return taskId;
    },
    updateIntakeTask: (id, taskId, p) => patch(id, (r) => ({ ...r, tasks: r.tasks.map((t) => (t.id === taskId ? { ...t, ...p } : t)) })),

    setTriage: (id, status, note) => {
      const me = meOf(get());
      patch(id, (r) => ({ ...r, triage: status, triageNote: note ?? r.triageNote }));
      audit(id, { actor: me, action: `Triage: ${status.replace("_", " ")}`, detail: note, section: "referral" });
    },
    assignIntake: (id, staffId) => {
      patch(id, (r) => ({ ...r, assignedTo: staffId }));
      audit(id, { actor: meOf(get()), action: "Assigned", detail: staffId });
    },
    raiseSafety: (id, alert) => {
      patch(id, (r) => ({ ...r, safety: { ...alert, raisedAt: get().clock, status: "open" }, priority: true }));
      audit(id, { actor: alert.raisedBy, action: "Raised a safety alert for human review", detail: alert.text, ai: alert.raisedBy !== meOf(get()) });
      get().notify({ agent: "sentinel", title: "Safety alert needs a clinician", body: `${id}: ${alert.text.slice(0, 120)}`, to: `/authorizations/intake/${id}`, tone: "risk" });
    },
    resolveSafety: (id, action, note) => {
      const s = get();
      const me = meOf(s);
      patch(id, (r) => (r.safety ? { ...r, safety: { ...r.safety, status: action === "documented" ? "acknowledged" : "escalated", action, note, acknowledgedBy: me, acknowledgedAt: s.clock } } : r));
      audit(id, { actor: me, action: "Reviewed the safety alert", detail: [action, note].filter(Boolean).join(" · ") });
    },
    setLegacyStatus: (clientId, status, intakeId) => set((s) => ({ legacyRoster: s.legacyRoster.map((c) => (c.id === clientId ? { ...c, status, intakeId: intakeId ?? c.intakeId } : c)) })),
    setReadiness: (payerId, itemId, state, note) => {
      const s = get();
      set({ planReadiness: s.planReadiness.map((p) => (p.payerId === payerId ? { ...p, items: { ...p.items, [itemId]: { state, note, by: meOf(s), at: s.clock } } } : p)) });
    },
  };
};

/** Pending suggestions for one section, in the order the agent made them. */
export const pendingFor = (r: IntakeRecord, section: IntakeSectionId): Suggestion[] => r.suggestions.filter((x) => x.section === section && x.status === "pending");
