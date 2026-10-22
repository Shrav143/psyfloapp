import type { StateCreator } from "zustand";
import type { FocusId } from "@/data/caseDetail";
import { FOCUS } from "@/data/caseDetailFocus";
import { EMPTY_WORK, RUN_END, RUN_STEPS, type CaseWork, type DraftEdit } from "@/data/caseModel";
import { QUEUE_ITEMS, openItems, type Band, type QueueItem, type RequestKind, type StatusFilter } from "@/data/queue";
import type { AgentKey, PayerId } from "@/data/types";
import { AGENTS } from "@/data/agents";
import { uid } from "@/lib/format";
import { paths } from "@/routes";
import type { AppState } from "./index";

/* Authorizations queue and case page (owner: authorizations agent).
   The queue rows are seed data. What the user does on a case (answers, applied actions, dismissals, draft edits) is kept per case,
   so leaving the page and coming back keeps it, and "Reset demo data" clears it. */

export interface QueueFilters { q: string; payer: PayerId | "all"; status: StatusFilter; urgency: Band | "all"; type: RequestKind | "all"; signalOnly: boolean }
export const DEFAULT_QUEUE_FILTERS: QueueFilters = { q: "", payer: "all", status: "all", urgency: "all", type: "all", signalOnly: false };

export interface ApplyArgs {
  caseId: string;
  requestId: string; // the Dashboard request whose history records this, if it has one
  syncChance: boolean; // the request's chance is fixed seed data, so the new chance can be written back without counting twice
  recs: { id: string; title: string; agent: AgentKey }[];
  chance: number; // the approval chance once these are applied
  liftLeft: number;
  ready: boolean; // all four checks pass once these are applied
  versionN: number;
  snapshot: string;
}

export interface ContextArgs {
  caseId: string;
  requestId: string; // where the shared list of clinical context keeps it
  text: string;
  syncDashboard: boolean; // the Dashboard request's chance is fixed seed data, so the new chance can be written back without counting twice
  chance: number; // the approval chance with this note counted
  liftLeft: number;
}

export interface QueueSlice {
  queueItems: QueueItem[];
  queueFilters: QueueFilters;
  signalHidden: boolean;
  bandView: Record<Band, { collapsed: boolean; showAll: boolean }>;
  queueCases: Record<string, CaseWork>;

  setQueueFilter: <K extends keyof QueueFilters>(key: K, value: QueueFilters[K]) => void;
  /** Replace every filter at once (a deep link such as /authorizations?type=retro). */
  setQueueFilters: (filters: QueueFilters) => void;
  clearQueueFilters: () => void;
  hideSignal: () => void;
  toggleBand: (band: Band) => void;
  showAllInBand: (band: Band, on: boolean) => void;

  toggleRec: (caseId: string, recId: string) => void;
  setRecInput: (caseId: string, recId: string, text: string) => void;
  sendNote: (caseId: string, recId: string, text: string, agent: AgentKey) => void;
  dismissRecs: (caseId: string, requestId: string, recs: { id: string; title: string }[], reason: string) => void;
  restoreRec: (caseId: string, recId: string) => void;
  addContext: (a: ContextArgs) => void;
  setFocus: (caseId: string, focus: FocusId | null, liftLeft: number) => void;
  applyRecs: (a: ApplyArgs) => void;
  saveDraft: (caseId: string, edits: Record<string, DraftEdit>, version: { n: number; snapshot: string }) => void;
  markRechecked: (caseId: string) => void;
  logCase: (caseId: string, text: string, actor?: AgentKey | "you") => void;
}

const patchCase = (s: AppState, id: string, fn: (w: CaseWork) => Partial<CaseWork>): Pick<AppState, "queueCases"> => {
  const w = s.queueCases[id] ?? EMPTY_WORK;
  return { queueCases: { ...s.queueCases, [id]: { ...w, ...fn(w) } } };
};

export const createQueueSlice: StateCreator<AppState, [], [], QueueSlice> = (set, get) => ({
  queueItems: QUEUE_ITEMS,
  queueFilters: DEFAULT_QUEUE_FILTERS,
  signalHidden: false,
  bandView: { now: { collapsed: false, showAll: false }, day: { collapsed: false, showAll: false }, week: { collapsed: false, showAll: false } },
  queueCases: {},

  setQueueFilter: (key, value) => set((s) => ({ queueFilters: { ...s.queueFilters, [key]: value } })),
  setQueueFilters: (filters) => set({ queueFilters: filters }),
  clearQueueFilters: () => set({ queueFilters: DEFAULT_QUEUE_FILTERS }),
  hideSignal: () => set({ signalHidden: true }),
  toggleBand: (band) => set((s) => ({ bandView: { ...s.bandView, [band]: { ...s.bandView[band], collapsed: !s.bandView[band].collapsed } } })),
  showAllInBand: (band, on) => set((s) => ({ bandView: { ...s.bandView, [band]: { ...s.bandView[band], showAll: on } } })),

  toggleRec: (id, recId) => set((s) => patchCase(s, id, (w) => ({ excluded: w.excluded.includes(recId) ? w.excluded.filter((x) => x !== recId) : [...w.excluded, recId] }))),
  setRecInput: (id, recId, text) => set((s) => patchCase(s, id, (w) => ({ inputs: { ...w.inputs, [recId]: text } }))),

  sendNote: (id, recId, text, agent) => {
    const clock = get().clock;
    set((s) => patchCase(s, id, (w) => ({ notes: { ...w.notes, [recId]: text }, log: [...w.log, { at: clock, actor: "you", text: `You sent ${AGENTS[agent].name} a note: "${text}"` }] })));
    get().toast({ title: `Note sent to ${AGENTS[agent].name}`, body: "It will be used the next time the draft is updated.", tone: "good" });
  },

  dismissRecs: (id, requestId, recs, reason) => {
    const clock = get().clock;
    set((s) => patchCase(s, id, (w) => ({
      dismissed: [...w.dismissed, ...recs.map((r) => ({ id: r.id, reason, at: clock }))],
      log: [...w.log, ...recs.map((r) => ({ at: clock, actor: "you" as const, text: `You dismissed "${r.title}". Reason: ${reason}` }))],
    })));
    if (get().requests.some((r) => r.id === requestId)) for (const r of recs) get().addEvent(requestId, { actor: "you", text: `You dismissed "${r.title}". Reason: ${reason}` });
    get().recordDismissal({ requestId, reason });
    get().toast({ title: recs.length === 1 ? "Recommendation dismissed" : `${recs.length} recommendations dismissed`, body: "The reason is logged and feeds Analytics.", tone: "neutral" });
  },

  restoreRec: (id, recId) => set((s) => patchCase(s, id, (w) => ({ dismissed: w.dismissed.filter((x) => x.id !== recId), log: [...w.log, { at: s.clock, actor: "you", text: "You brought back a dismissed recommendation" }] }))),

  addContext: (a) => {
    get().addClinicalContext(a.requestId, a.text);
    set((s) => patchCase(s, a.caseId, (w) => ({ context: [...w.context, a.text], chance: a.chance, liftLeft: a.liftLeft, log: [...w.log, { at: s.clock, actor: "you", text: `You added clinical context: "${a.text}"` }] })));
    if (get().requests.some((r) => r.id === a.requestId)) {
      if (a.syncDashboard) get().updateRequest(a.requestId, { chance: a.chance });
      get().addEvent(a.requestId, { actor: "you", text: a.syncDashboard ? `You added clinical context. Approval chance is now ${a.chance}%` : "You added clinical context" });
    }
    get().toast({ title: "Clinical context added", body: "Scribe will fold it into the draft. Nothing is sent to the payer.", tone: "good" });
  },

  setFocus: (id, focus, liftLeft) => {
    // Once the queue shows a saved chance for this request, its "points possible" line has to follow the cards too.
    set((s) => patchCase(s, id, (w) => ({ focus, liftLeft: w.chance === undefined ? w.liftLeft : liftLeft, log: [...w.log, { at: s.clock, actor: "you", text: focus ? `You refined the recommendations: ${FOCUS[focus].label}` : "You cleared the focus on the recommendations" }] })));
  },

  applyRecs: (a) => {
    const token = uid("run");
    const alive = () => get().queueCases[a.caseId]?.run?.token === token;
    set((s) => patchCase(s, a.caseId, () => ({ run: { token, recIds: a.recs.map((r) => r.id), stage: 0, sub: 0 } })));
    for (const [ms, stage, sub] of RUN_STEPS) {
      setTimeout(() => alive() && set((s) => patchCase(s, a.caseId, (w) => ({ run: w.run && { ...w.run, stage, sub } }))), ms);
    }
    setTimeout(() => {
      if (!alive()) return;
      const k = a.recs.length;
      set((s) => patchCase(s, a.caseId, (w) => ({
        run: null, applied: [...w.applied, ...a.recs.map((r) => r.id)], chance: a.chance, liftLeft: a.liftLeft, ready: a.ready, dirty: false,
        versions: [...w.versions, { n: a.versionN, at: s.clock, by: "Scribe", note: `Added ${k} ${k === 1 ? "recommendation" : "recommendations"}`, text: a.snapshot }],
        log: [...w.log, ...a.recs.map((r) => ({ at: s.clock, actor: r.agent, text: `${AGENTS[r.agent].name} applied "${r.title}"` }))],
      })));
      if (a.requestId && get().requests.some((r) => r.id === a.requestId)) {
        if (a.syncChance) get().updateRequest(a.requestId, { chance: a.chance });
        get().addEvent(a.requestId, { actor: "scribe", text: `Scribe added ${k} ${k === 1 ? "item" : "items"} to the draft${a.syncChance ? `. Approval chance is now ${a.chance}%` : ""}` });
      }
      get().notify({ agent: "forecaster", title: "Approval chance updated", body: `${a.caseId} is now ${a.chance}% after ${k} ${k === 1 ? "action" : "actions"}.`, to: paths.case(a.caseId), tone: "good" });
      get().toast({ title: "Draft updated", body: `${k} ${k === 1 ? "action" : "actions"} applied. Approval chance is now ${a.chance}%.`, tone: "good" });
    }, RUN_END);
  },

  saveDraft: (id, edits, version) => set((s) => patchCase(s, id, (w) => ({
    edits: { ...w.edits, ...edits }, dirty: true,
    versions: [...w.versions, { n: version.n, at: s.clock, by: "You", note: "Edited by you", text: version.snapshot }],
    log: [...w.log, { at: s.clock, actor: "you", text: "You edited the draft. Integrity will read it again before it can be signed" }],
  }))),
  markRechecked: (id) => set((s) => patchCase(s, id, (w) => ({ dirty: false, log: [...w.log, { at: s.clock, actor: "integrity", text: "Integrity read the draft again" }] }))),
  logCase: (id, text, actor = "you") => set((s) => patchCase(s, id, (w) => ({ log: [...w.log, { at: s.clock, actor, text }] }))),
});

/** Sidebar badge: open requests that need action today (the Act now and Due within 24 hours bands). */
export const selectQueueBadge = (s: AppState): number => openItems(s.queueItems, s.requests).filter((i) => i.band !== "week").length;
