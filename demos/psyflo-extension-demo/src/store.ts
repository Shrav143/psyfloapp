/* All behaviour of the demo, in one store: the mock EHR's pages and documents, the extension's tabs, Scribe, Scan & Enhance, Check before save, Ask, History.
   Screens only read this and call its actions. Nothing here knows which clinic is loaded except through ClinicConfig. */
import { create } from "zustand";
import { cccsn } from "./clinics/cccsn";
import { harvest } from "./clinics/harvest";
import { SEV_RANK, asText, boxState, fieldByKey, fieldsOf, findingSig, initialDocState, isEmpty, matchAsk, runChecks, speed, wait, writeInto } from "./engine";
import type { AskTopic, ClinicConfig, ClinicId, DocKind, DocState, Finding, FindingStatus, HistoryItem, Severity, Val } from "./types";

export const CLINICS: Record<ClinicId, ClinicConfig> = { harvest, cccsn };

/** The six icons, in order: Scribe (mic), History (list), Patients (people), Scan & Enhance, Help, Settings. */
export type PanelTab = "scribe" | "history" | "patients" | "scan" | "help" | "settings";
export interface Prefs { telehealth: boolean; language: string; mic: string }
export type LaurisPage = { kind: "consumers" } | { kind: "consumer"; consumerId: string } | { kind: "form"; docId: string };

export type ScribeStage = "start" | "consent" | "capturing" | "recover" | "generating" | "review" | "typed";
export interface DraftCard { include: boolean; value: Val; edited: boolean }
export interface ScribeState {
  docId: string | null;
  stage: ScribeStage;
  mode: "live" | "dictation";
  consent: "pending" | "yes" | "declined";
  telehealth: boolean;
  /** How many transcript lines have been heard so far. */
  shown: number;
  paused: boolean;
  /** 1 reading the chart, 2 writing. */
  gen: 1 | 2;
  draft: Record<string, DraftCard>;
  /** Keys typed into the EHR, and keys left out. */
  typedKeys: string[];
}

export interface ScanState {
  running: boolean;
  scannedAt: string | null;
  findings: Finding[];
  status: Record<string, FindingStatus>;
  /** What the clinician typed or picked for an "ask" or "choose" fix. */
  answers: Record<string, string>;
  /** The document changed after the scan. */
  stale: boolean;
}

export interface AskMsg {
  id: number;
  who: "you" | "psyflo";
  text: string;
  topic?: AskTopic;
  /** A fallback offers these instead of an answer. */
  suggest?: AskTopic[];
  docId?: string;
}

export interface CheckSettings { pauseAt: Severity | "never"; onSave: boolean }

interface State {
  clinicId: ClinicId;
  clinic: ClinicConfig;
  page: LaurisPage;
  panelOpen: boolean;
  tab: PanelTab;
  docs: Record<string, DocState>;
  scribe: ScribeState;
  scans: Record<string, ScanState>;
  /** The finding the clinician is looking at (clicked a chip in the EHR). */
  focus: string | null;
  checking: string | null;
  pause: { docId: string; ids: string[] } | null;
  flash: { docId: string; text: string; tone: "ok" | "warn" } | null;
  settings: CheckSettings;
  prefs: Prefs;
  pinned: boolean;
  history: HistoryItem[];
  asks: AskMsg[];
  asking: boolean;

  setClinic: (id: ClinicId) => void;
  togglePanel: (open?: boolean) => void;
  setTab: (t: PanelTab) => void;
  goConsumers: () => void;
  openConsumer: (id: string) => void;
  openDoc: (docId: string) => void;
  editField: (docId: string, key: string, v: Val) => void;
  requestSave: (docId: string) => void;
  setSettings: (p: Partial<CheckSettings>) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  setPinned: (v: boolean) => void;

  scribeOpen: (docId: string) => void;
  scribeMode: (m: "live" | "dictation") => void;
  scribeTelehealth: (v: boolean) => void;
  scribeContinue: () => void;
  scribeConsent: (v: "yes" | "declined") => void;
  scribePause: (v: boolean) => void;
  scribeComplete: () => void;
  scribeCancel: () => void;
  scribeResume: () => void;
  scribeDiscard: () => void;
  scribeToggle: (key: string) => void;
  scribeEdit: (key: string, v: Val) => void;
  scribeType: () => void;
  scribeRegenerate: () => void;

  scanRun: (docId: string) => void;
  fixAnswer: (id: string, answer: string) => void;
  fixApply: (id: string) => void;
  fixDismiss: (id: string) => void;
  fixRestore: (id: string) => void;
  fixAllReady: (docId: string) => void;
  focusFinding: (id: string | null) => void;

  askSend: (text: string) => void;
  askTopic: (topic: AskTopic) => void;
  askClear: () => void;
}

const blankScribe = (mode: "live" | "dictation" = "live"): ScribeState => ({
  docId: null, stage: "start", mode, consent: "pending", telehealth: false, shown: 0, paused: false, gen: 1, draft: {}, typedKeys: [],
});
const blankScan = (): ScanState => ({ running: false, scannedAt: null, findings: [], status: {}, answers: {}, stale: false });

function fresh(id: ClinicId) {
  const clinic = CLINICS[id];
  const docs: Record<string, DocState> = {};
  for (const d of clinic.docs) docs[d.id] = initialDocState(d);
  return {
    clinicId: id, clinic, page: { kind: "consumers" } as LaurisPage, panelOpen: true, tab: "scribe" as PanelTab, docs,
    scribe: blankScribe(), scans: {} as Record<string, ScanState>, focus: null, checking: null, pause: null, flash: null,
    settings: { pauseAt: clinic.profile.checks.pauseAt, onSave: clinic.profile.checks.onSave },
    prefs: { telehealth: false, language: "English", mic: "Built-in microphone (simulated)" } as Prefs, pinned: true,
    history: [...clinic.history], asks: [] as AskMsg[], asking: false,
  };
}

let tick: ReturnType<typeof setInterval> | null = null;
const stopTick = () => { if (tick) clearInterval(tick); tick = null; };
let msgId = 0;
let histId = 0;

export const useStore = create<State>()((set, get) => {
  const kindOf = (docId: string): DocKind | undefined => get().clinic.docs.find((d) => d.id === docId)?.kind;
  const seedOf = (docId: string) => get().clinic.docs.find((d) => d.id === docId);
  const patchDoc = (docId: string, fn: (d: DocState) => DocState) => set((s) => ({ docs: { ...s.docs, [docId]: fn(s.docs[docId]) } }));
  const patchScan = (docId: string, fn: (x: ScanState) => ScanState) => set((s) => ({ scans: { ...s.scans, [docId]: fn(s.scans[docId] ?? blankScan()) } }));
  const pushHistory = (h: Omit<HistoryItem, "id" | "by" | "date"> & { by?: string }) =>
    set((s) => ({ history: [{ id: `h-live-${++histId}`, by: s.clinic.user.short, date: s.clinic.today, ...h }, ...s.history] }));

  /** Write one proposal into a document field and mark it as Psyflo's (yellow). */
  const writeField = (docId: string, key: string, proposal: Val, mode: "replace" | "append") => {
    const kind = kindOf(docId);
    const spec = kind ? get().clinic.forms[kind] : undefined;
    const f = spec ? fieldByKey(spec, key) : undefined;
    if (!f) return false;
    patchDoc(docId, (d) => {
      const w = writeInto(f, d.values[key], proposal, mode);
      const appended = { ...d.appended };
      if (w.mark) appended[key] = [...(appended[key] ?? []), w.mark];
      return { ...d, values: { ...d.values, [key]: w.value }, typed: { ...d.typed, [key]: true }, appended };
    });
    return true;
  };

  /** Re-run the checks on the document's current values and keep what the clinician already decided. */
  const rescan = (docId: string, stamp: boolean) => {
    const s = get();
    const seed = seedOf(docId);
    if (!seed) return [] as Finding[];
    const next = runChecks(s.clinic, docId, seed.kind, s.docs[docId].values, seed.consumerId);
    patchScan(docId, (x) => {
      const status: Record<string, FindingStatus> = {};
      const sigStatus = new Map<string, FindingStatus>();
      for (const f of x.findings) { const st = x.status[f.id]; if (st && st !== "open") sigStatus.set(findingSig(f), st); }
      const open = next.map((f) => { const st = sigStatus.get(findingSig(f)); status[f.id] = st ?? "open"; return f; });
      // what was added or dismissed and no longer fails stays in the list, marked, so the clinician sees it was handled
      const resolved = x.findings.filter((f) => x.status[f.id] === "added" && !next.some((n) => findingSig(n) === findingSig(f)));
      for (const f of resolved) status[f.id] = "added";
      return { ...x, running: false, findings: [...open, ...resolved], status, stale: false, scannedAt: stamp ? s.clinic.today : x.scannedAt };
    });
    return next;
  };

  const doSave = (docId: string, anyway: number) => {
    const d = get().docs[docId];
    if (!d) return;
    const green: Record<string, true> = { ...d.green };
    for (const k of Object.keys(d.values)) if (!isEmpty(d.values[k])) green[k] = true;
    const seed = seedOf(docId);
    patchDoc(docId, (x) => ({ ...x, green, typed: {}, appended: {}, status: "saved", savedAt: get().clinic.today }));
    set({ pause: null, checking: null, flash: { docId, text: anyway ? `Saved in Lauris. ${anyway} alert${anyway === 1 ? " from Psyflo was" : "s from Psyflo were"} still open.` : "Saved in Lauris.", tone: anyway ? "warn" : "ok" } });
    if (seed) pushHistory({ type: "document", doc: seed.kind, consumerId: seed.consumerId, status: anyway ? `Saved in Lauris with ${anyway} open alert${anyway === 1 ? "" : "s"}` : "Saved in Lauris", docId });
  };

  /* ---- helpers that need `get`/`set` and are used by several actions (function declarations are hoisted) ---- */

  function leave(page: LaurisPage, keepScribe = false) {
    const s = get();
    const sameDoc = page.kind === "form" && s.scribe.docId === page.docId;
    // leaving the document while recording interrupts the session; it can be recovered
    if (!keepScribe && s.scribe.stage === "capturing" && !sameDoc) {
      stopTick();
      set({ page, scribe: { ...s.scribe, stage: "recover", paused: true } });
      return;
    }
    set({ page });
  }

  function begin() {
    set((s) => ({ scribe: { ...s.scribe, stage: "capturing", shown: 0, paused: false } }));
    run();
  }

  function run() {
    stopTick();
    tick = setInterval(() => {
      const s = get();
      const sc = s.clinic.scribe.find((x) => x.docId === s.scribe.docId);
      if (!sc || s.scribe.stage !== "capturing") { stopTick(); return; }
      if (s.scribe.paused) return;
      if (s.scribe.shown >= sc.lines.length) { stopTick(); return; }
      set({ scribe: { ...s.scribe, shown: s.scribe.shown + 1 } });
    }, Math.max(20, 1300 / speed()));
  }

  async function generate() {
    const docId = get().scribe.docId;
    await wait(1200);
    if (get().scribe.stage !== "generating") return;
    set((s) => ({ scribe: { ...s.scribe, gen: 2 } }));
    await wait(1500);
    if (get().scribe.stage !== "generating") return;
    const s = get();
    const seed = docId ? seedOf(docId) : undefined;
    const spec = seed ? s.clinic.forms[seed.kind] : undefined;
    const sc = s.clinic.scribe.find((x) => x.docId === docId);
    if (!seed || !spec) return;
    const draft: Record<string, DraftCard> = {};
    for (const f of fieldsOf(spec)) {
      const d = sc?.draft[f.key];
      if (f.lock || !d || d.from === "none") continue;
      draft[f.key] = { include: !isEmpty(d.value), value: d.value, edited: false };
    }
    set({ scribe: { ...s.scribe, stage: "review", draft } });
  }

  function answer(q: string, topic: AskTopic | null, docId: string | undefined, kind: DocKind | undefined) {
    const s = get();
    const sugg = s.clinic.ask.filter((t) => !t.docs || !kind || t.docs.includes(kind)).slice(0, 3);
    set({ asks: [...s.asks, { id: ++msgId, who: "you", text: q }], asking: true });
    void wait(900).then(() => {
      const msg: AskMsg = topic
        ? { id: ++msgId, who: "psyflo", text: "", topic, docId }
        : { id: ++msgId, who: "psyflo", text: "I do not have a source for that in this chart, in your clinic's documents or in the reference list, so I will not guess.", suggest: sugg };
      set((x) => ({ asks: [...x.asks, msg], asking: false }));
    });
  }

  return {
    ...fresh("harvest"),

    setClinic: (id) => { stopTick(); set(fresh(id)); },
    togglePanel: (open) => set((s) => ({ panelOpen: open ?? !s.panelOpen })),
    setTab: (tab) => set({ tab }),

    goConsumers: () => leave({ kind: "consumers" }),
    openConsumer: (consumerId) => leave({ kind: "consumer", consumerId }),
    openDoc: (docId) => leave({ kind: "form", docId }),

    editField: (docId, key, v) => {
      patchDoc(docId, (d) => ({ ...d, values: { ...d.values, [key]: v } }));
      patchScan(docId, (x) => (x.scannedAt ? { ...x, stale: true } : x));
      set((s) => (s.pause?.docId === docId ? { pause: null } : {}));
    },

    requestSave: (docId) => {
      const s = get();
      if (s.checking) return;
      if (s.pause?.docId === docId) {
        // count what is still open at the pause level now, not what was open when the save was paused
        const x = s.scans[docId];
        const level = SEV_RANK[s.settings.pauseAt === "never" ? "severe" : s.settings.pauseAt];
        const n = x ? x.findings.filter((f) => x.status[f.id] === "open" && SEV_RANK[f.severity] >= level).length : s.pause.ids.length;
        doSave(docId, n);
        return;
      }
      const { onSave, pauseAt } = s.settings;
      if (!onSave || pauseAt === "never") { doSave(docId, 0); return; }
      set({ checking: docId, flash: null });
      void wait(1100).then(() => {
        const found = rescan(docId, true).filter((f) => get().scans[docId]?.status[f.id] === "open" && SEV_RANK[f.severity] >= SEV_RANK[pauseAt]);
        if (found.length) set({ checking: null, pause: { docId, ids: found.map((f) => f.id) }, tab: "scan" });
        else doSave(docId, 0);
      });
    },

    setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
    setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
    setPinned: (pinned) => set({ pinned }),

    /* ---------------------------------- Scribe ---------------------------------- */
    scribeOpen: (docId) => {
      const s = get();
      set({ tab: "scribe" });
      if (s.scribe.docId === docId && ["capturing", "recover", "review", "generating"].includes(s.scribe.stage)) return;
      const sc = s.clinic.scribe.find((x) => x.docId === docId);
      stopTick();
      set({ scribe: { ...blankScribe(sc?.mode ?? "live"), docId, telehealth: s.prefs.telehealth } });
    },
    scribeMode: (mode) => set((s) => (s.scribe.stage === "start" ? { scribe: { ...s.scribe, mode } } : {})),
    scribeTelehealth: (telehealth) => set((s) => ({ scribe: { ...s.scribe, telehealth } })),
    scribeContinue: () => {
      const { scribe } = get();
      if (scribe.mode === "live") set({ scribe: { ...scribe, stage: "consent", consent: "pending" } });
      else begin();
    },
    scribeConsent: (consent) => {
      if (consent === "yes") { set((s) => ({ scribe: { ...s.scribe, consent } })); begin(); }
      else set((s) => ({ scribe: { ...s.scribe, consent } }));
    },
    scribePause: (paused) => set((s) => ({ scribe: { ...s.scribe, paused } })),
    scribeComplete: () => {
      stopTick();
      set((s) => ({ scribe: { ...s.scribe, stage: "generating", gen: 1, paused: false } }));
      void generate();
    },
    scribeCancel: () => { stopTick(); set((s) => ({ scribe: { ...blankScribe(s.scribe.mode), docId: s.scribe.docId } })); },
    scribeResume: () => {
      const { scribe } = get();
      if (scribe.docId) leave({ kind: "form", docId: scribe.docId }, true);
      set((s) => ({ tab: "scribe", scribe: { ...s.scribe, stage: "capturing", paused: false } }));
      run();
    },
    scribeDiscard: () => { stopTick(); set((s) => ({ scribe: { ...blankScribe(s.scribe.mode), docId: s.scribe.docId } })); },
    scribeToggle: (key) => set((s) => ({ scribe: { ...s.scribe, draft: { ...s.scribe.draft, [key]: { value: s.scribe.draft[key]?.value ?? "", edited: s.scribe.draft[key]?.edited ?? false, include: !s.scribe.draft[key]?.include } } } })),
    /* typing into a card that has no draft (nothing was said about it) creates the card, included */
    scribeEdit: (key, value) => set((s) => ({ scribe: { ...s.scribe, draft: { ...s.scribe.draft, [key]: { include: s.scribe.draft[key]?.include ?? true, value, edited: true } } } })),
    scribeType: () => {
      const { scribe, clinic } = get();
      const docId = scribe.docId;
      const seed = docId ? seedOf(docId) : undefined;
      const spec = seed ? clinic.forms[seed.kind] : undefined;
      if (!docId || !seed || !spec) return;
      leave({ kind: "form", docId }, true);
      const typed: string[] = [];
      for (const f of fieldsOf(spec)) {
        const card = scribe.draft[f.key];
        if (!card || !card.include || f.lock || isEmpty(card.value)) continue;
        const cur = get().docs[docId].values[f.key];
        if (!isEmpty(cur) && asText(cur).trim() === asText(card.value).trim()) continue;
        if (writeField(docId, f.key, card.value, "append")) typed.push(f.key);
      }
      patchScan(docId, (x) => (x.scannedAt ? { ...x, stale: true } : x));
      set((s) => ({ scribe: { ...s.scribe, stage: "typed", typedKeys: typed } }));
      const sc = clinic.scribe.find((x) => x.docId === docId);
      const heard = sc?.lines[Math.max(0, Math.min(scribe.shown, sc.lines.length) - 1)]?.t ?? sc?.length ?? "1:00";
      const mins = Math.max(1, parseInt(heard.split(":")[0], 10) || 1);
      const now = new Date();
      const clock = `${((now.getHours() + 11) % 12) + 1}:${String(now.getMinutes()).padStart(2, "0")} ${now.getHours() < 12 ? "AM" : "PM"}`;
      pushHistory({ type: "session", doc: seed.kind, consumerId: seed.consumerId, status: `Scribed: ${typed.length} field${typed.length === 1 ? "" : "s"} typed into Lauris, not saved yet`, docId, time: clock, length: `${mins}m`, mode: scribe.mode });
    },
    scribeRegenerate: () => { set((s) => ({ scribe: { ...s.scribe, stage: "generating", gen: 1 } })); void generate(); },

    /* ------------------------------- Scan & Enhance ------------------------------- */
    scanRun: (docId) => {
      patchScan(docId, (x) => ({ ...x, running: true }));
      void wait(1400).then(() => {
        const found = rescan(docId, true);
        const seed = seedOf(docId);
        const open = found.filter((f) => get().scans[docId]?.status[f.id] === "open").length;
        if (seed) pushHistory({ type: "document", doc: seed.kind, consumerId: seed.consumerId, status: open ? `Scanned: ${open} to review` : "Scanned: nothing to fix", docId });
      });
    },
    fixAnswer: (id, answer) => {
      const docId = id.split(":")[0];
      patchScan(docId, (x) => ({ ...x, answers: { ...x.answers, [id]: answer } }));
    },
    fixApply: (id) => {
      const docId = id.split(":")[0];
      const x = get().scans[docId];
      const f = x?.findings.find((y) => y.id === id);
      if (!x || !f || !f.fix) return;
      const fix = f.fix;
      let ok = false;
      if (fix.kind === "text") ok = writeField(docId, f.fieldKey, fix.text, fix.mode);
      else if (fix.kind === "ask") {
        const a = (x.answers[id] ?? "").trim();
        if (a) ok = writeField(docId, f.fieldKey, fix.frame(a), fix.mode);
      } else {
        const a = x.answers[id];
        if (a && fix.options.includes(a)) ok = writeField(docId, f.fieldKey, a, "replace");
      }
      if (!ok) return;
      patchScan(docId, (y) => ({ ...y, status: { ...y.status, [id]: "added" } }));
      rescan(docId, false);
      set((s) => (s.pause?.docId === docId ? { pause: null } : {}));
    },
    fixDismiss: (id) => { const docId = id.split(":")[0]; patchScan(docId, (y) => ({ ...y, status: { ...y.status, [id]: "dismissed" } })); },
    fixRestore: (id) => { const docId = id.split(":")[0]; patchScan(docId, (y) => ({ ...y, status: { ...y.status, [id]: "open" } })); },
    fixAllReady: (docId) => {
      const x = get().scans[docId];
      if (!x) return;
      for (const f of x.findings) {
        if (get().scans[docId].status[f.id] !== "open" || !f.fix) continue;
        const ready = f.fix.kind === "text" || (f.fix.kind === "ask" && (get().scans[docId].answers[f.id] ?? "").trim()) || (f.fix.kind === "choose" && get().scans[docId].answers[f.id]);
        if (ready) get().fixApply(f.id);
      }
    },
    focusFinding: (focus) => set(focus ? { focus, tab: "scan" } : { focus }),

    /* ----------------------------------- Ask ----------------------------------- */
    askSend: (text) => {
      const q = text.trim();
      if (!q || get().asking) return;
      const s = get();
      const docId = s.page.kind === "form" ? s.page.docId : undefined;
      const kind = docId ? kindOf(docId) : undefined;
      const topic = matchAsk(s.clinic.ask, q, kind);
      answer(q, topic, docId, kind);
    },
    askTopic: (topic) => {
      const s = get();
      if (s.asking) return;
      const docId = s.page.kind === "form" ? s.page.docId : undefined;
      answer(topic.q, topic, docId, docId ? kindOf(docId) : undefined);
    },
    askClear: () => set({ asks: [] }),
  };
});

/** Convenience selectors. */
export const docIdOf = (p: LaurisPage): string | null => (p.kind === "form" ? p.docId : null);
export { boxState };
