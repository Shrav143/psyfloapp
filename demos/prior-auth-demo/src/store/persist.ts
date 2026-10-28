import { useSyncExternalStore } from "react";
import type { IntakeRecord } from "@/data/intake/types";
import { clockTime, toDate } from "@/lib/time";
import { resetCoreCounters } from "./core";
import type { AppState } from "./index";

/* Save and resume. What a person changed in the Intake workspace is kept in this browser (localStorage) and merged over the seed data when the
   demo opens again. Storage can be missing, denied (a sandboxed frame, a private window) or full: every read and write is guarded, the demo keeps
   working in memory, and the indicator says "Not saved: storage unavailable" instead of failing.

   Only what differs from the seed is written: the records a person changed or created (the whole record, with its configuration, instruments,
   care plan, consents, audit trail and where they left off), the ones they removed, the legacy roster and plan readiness when changed, the counter
   that numbers new intakes, and the New Authorization drafts when the cases store has them. A change back to the seed writes nothing, so
   "Reset demo data" needs no special case: the key is removed when nothing differs. */

/** The version is part of the key: a new build that changes the saved shape uses a new key, and an older save is left alone. */
export const PERSIST_KEY = "psyflo-demo-v10";
export const PERSIST_VERSION = 10;
export const DEBOUNCE_MS = 400;

/** The parts of the app state that are saved. */
export type Persisted = Pick<AppState, "intakes" | "intakeCounter" | "legacyRoster" | "planReadiness"> & { caseDrafts?: { id: string }[]; referralDrafts?: { id: string }[]; referralDraftCounter?: number };
type Keyed = { id: string };

export interface Payload {
  v: number;
  savedAt: number;
  intakes?: { order: string[]; changed: IntakeRecord[]; removed: string[] };
  caseDrafts?: { order: string[]; changed: Keyed[]; removed: string[] };
  referralDrafts?: { order: string[]; changed: Keyed[]; removed: string[] };
  referralDraftCounter?: number;
  intakeCounter?: number;
  legacyRoster?: unknown[];
  planReadiness?: unknown[];
}

/* ------------------------------------------------------------------ storage */
export type Kv = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** The browser's localStorage, or null when it is missing or denied. Reading `window.localStorage` itself can throw, so the probe is inside the guard. */
export function browserStorage(): Kv | null {
  try {
    const s = window.localStorage;
    const probe = `${PERSIST_KEY}:probe`;
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

const jsonCache = new WeakMap<object, string>();
/** JSON of an immutable value, remembered by identity: an update gives a changed record a new identity, an untouched one keeps its own. */
const jsonOf = (v: object): string => {
  const hit = jsonCache.get(v);
  if (hit !== undefined) return hit;
  const s = JSON.stringify(v);
  jsonCache.set(v, s);
  return s;
};

/* ------------------------------------------------------------------ diff and merge (pure) */
function diffById<T extends Keyed>(current: T[], base: T[]): { order: string[]; changed: T[]; removed: string[] } {
  const baseJson = new Map(base.map((b) => [b.id, jsonOf(b)] as const));
  const have = new Set(current.map((c) => c.id));
  return {
    order: current.map((c) => c.id),
    changed: current.filter((c) => baseJson.get(c.id) !== jsonOf(c)),
    removed: base.filter((b) => !have.has(b.id)).map((b) => b.id),
  };
}
const sameOrder = (a: string[], b: string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);

/** What differs between the current state and the baseline (the seeds). Null when nothing does. */
export function buildPayload(current: Persisted, base: Persisted, savedAt: number): Payload | null {
  const out: Payload = { v: PERSIST_VERSION, savedAt };
  let any = false;
  const intakes = diffById(current.intakes, base.intakes);
  if (intakes.changed.length || intakes.removed.length || !sameOrder(intakes.order, base.intakes.map((r) => r.id))) {
    out.intakes = intakes;
    any = true;
  }
  if (Array.isArray(current.caseDrafts) && Array.isArray(base.caseDrafts)) {
    const drafts = diffById(current.caseDrafts, base.caseDrafts);
    if (drafts.changed.length || drafts.removed.length || !sameOrder(drafts.order, base.caseDrafts.map((d) => d.id))) {
      out.caseDrafts = drafts;
      any = true;
    }
  }
  if (Array.isArray(current.referralDrafts) && Array.isArray(base.referralDrafts)) {
    const drafts = diffById(current.referralDrafts, base.referralDrafts);
    if (drafts.changed.length || drafts.removed.length || !sameOrder(drafts.order, base.referralDrafts.map((d) => d.id))) {
      out.referralDrafts = drafts;
      any = true;
    }
  }
  if (current.referralDraftCounter !== undefined && current.referralDraftCounter !== base.referralDraftCounter) {
    out.referralDraftCounter = current.referralDraftCounter;
    any = true;
  }
  if (current.intakeCounter !== base.intakeCounter) {
    out.intakeCounter = current.intakeCounter;
    any = true;
  }
  for (const k of ["legacyRoster", "planReadiness"] as const) {
    if (JSON.stringify(current[k]) !== JSON.stringify(base[k])) {
      out[k] = current[k] as unknown[];
      any = true;
    }
  }
  return any ? out : null;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
/** A saved record is used only when it has the shape every screen reads. A damaged one is skipped and its seed stays. */
const usableRecord = (v: unknown): v is IntakeRecord =>
  isObj(v) && typeof v.id === "string" && ["documents", "suggestions", "tasks", "audit"].every((k) => Array.isArray(v[k])) && isObj(v.referral) && isObj(v.profile) && isObj(v.assessment);
const usableKeyed = (v: unknown): v is Keyed => isObj(v) && typeof v.id === "string";

function mergeById<T extends Keyed>(seed: T[], saved: { order?: unknown; changed?: unknown; removed?: unknown } | undefined, usable: (v: unknown) => v is T): T[] {
  if (!saved) return seed;
  const removed = new Set(Array.isArray(saved.removed) ? saved.removed.filter((x): x is string => typeof x === "string") : []);
  const changed = new Map((Array.isArray(saved.changed) ? saved.changed : []).filter(usable).map((c) => [c.id, c] as const));
  const all = new Map<string, T>();
  for (const s of seed) if (!removed.has(s.id)) all.set(s.id, changed.get(s.id) ?? s);
  for (const [id, c] of changed) if (!all.has(id) && !removed.has(id)) all.set(id, c);
  const order = Array.isArray(saved.order) ? saved.order.filter((x): x is string => typeof x === "string") : [];
  const placed = order.filter((id) => all.has(id));
  /* A seed added by a later build (not in the saved order) comes after what the person already had. */
  return [...placed, ...[...all.keys()].filter((id) => !placed.includes(id))].map((id) => all.get(id) as T);
}

/** The seed state with what was saved merged over it. Anything that is missing or damaged leaves the seed as it was. */
export function applyPayload(seed: Persisted, raw: unknown): Persisted {
  if (!isObj(raw) || raw.v !== PERSIST_VERSION) return seed;
  const p = raw as unknown as Payload;
  const next: Persisted = { ...seed };
  if (isObj(p.intakes)) next.intakes = mergeById(seed.intakes, p.intakes, usableRecord);
  if (Array.isArray(seed.caseDrafts) && isObj(p.caseDrafts)) next.caseDrafts = mergeById(seed.caseDrafts, p.caseDrafts, usableKeyed);
  if (Array.isArray(seed.referralDrafts) && isObj(p.referralDrafts)) next.referralDrafts = mergeById(seed.referralDrafts, p.referralDrafts, usableKeyed);
  if (typeof p.referralDraftCounter === "number" && p.referralDraftCounter > (seed.referralDraftCounter ?? 0)) next.referralDraftCounter = p.referralDraftCounter;
  if (typeof p.intakeCounter === "number" && p.intakeCounter > seed.intakeCounter) next.intakeCounter = p.intakeCounter;
  if (Array.isArray(p.legacyRoster)) next.legacyRoster = p.legacyRoster as Persisted["legacyRoster"];
  if (Array.isArray(p.planReadiness)) next.planReadiness = p.planReadiness as Persisted["planReadiness"];
  return next;
}

/** Reads the saved payload. Null when there is none, when it is not JSON, or when it was written by another version. */
export function readPayload(kv: Kv): unknown {
  try {
    const text = kv.getItem(PERSIST_KEY);
    if (!text) return null;
    const v: unknown = JSON.parse(text);
    return isObj(v) && v.v === PERSIST_VERSION ? v : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ status */
export type SaveState = "idle" | "pending" | "saved" | "unavailable";
export interface PersistStatus {
  state: SaveState;
  /** Demo clock minutes at the last save. */
  at?: number;
  /** Why nothing is saved: the browser refused (denied) or the storage is full (quota). */
  reason?: "denied" | "quota";
}
let status: PersistStatus = { state: "idle" };
const listeners = new Set<() => void>();
const setStatus = (s: PersistStatus) => {
  status = s;
  listeners.forEach((l) => l());
};
/** The save state for the indicator. Works before `initPersist` has run (it reads "idle"). */
export function usePersistStatus(): PersistStatus {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => status, () => status);
}
/** "Saved locally, 10:42 am", "Not saved: storage unavailable", "Saving…" or "Autosave on". */
export function describeStatus(s: PersistStatus): string {
  if (s.state === "unavailable") return "Not saved: storage unavailable";
  if (s.state === "pending") return "Saving…";
  if (s.state === "saved") return `Saved locally${s.at !== undefined ? `, ${clockTime(toDate(s.at))}` : ""}`;
  return "Autosave on";
}

/* ------------------------------------------------------------------ the saver */
export interface StoreLike {
  getState: () => AppState;
  setState: (partial: Partial<AppState>) => void;
  subscribe: (listener: (s: AppState, prev: AppState) => void) => () => void;
}
export interface PersistHandle {
  /** Writes now, without waiting for the debounce. */
  flush: () => PersistStatus;
  dispose: () => void;
}

/** The cases store keeps New Authorization drafts as `caseDrafts`; when it does not, nothing of the kind is saved. */
const draftsOf = (s: AppState): { id: string }[] | undefined => {
  const d = (s as unknown as Record<string, unknown>).caseDrafts;
  return Array.isArray(d) ? (d as { id: string }[]) : undefined;
};
const pick = (s: AppState): Persisted => ({ intakes: s.intakes, intakeCounter: s.intakeCounter, legacyRoster: s.legacyRoster, planReadiness: s.planReadiness, caseDrafts: draftsOf(s), referralDrafts: s.referralDrafts, referralDraftCounter: s.referralDraftCounter });
const KEYS: (keyof Persisted)[] = ["intakes", "intakeCounter", "legacyRoster", "planReadiness", "caseDrafts", "referralDrafts", "referralDraftCounter"];
const changedKeys = (a: Persisted, b: Persisted): (keyof Persisted)[] => KEYS.filter((k) => a[k] !== b[k]);

let active: { handle: PersistHandle; store: StoreLike; storage: Kv | null; baseline: Persisted; initial: AppState } | null = null;

/** Merges what was saved over the store's seed state, then writes every later change (debounced). Call it once, right after the store is created. */
export function initPersist(store: StoreLike, o: { storage?: Kv | null; debounceMs?: number } = {}): PersistHandle {
  active?.handle.dispose();
  const storage = o.storage === undefined ? browserStorage() : o.storage;
  const initial = store.getState();
  const baseline = pick(initial);
  let timer: ReturnType<typeof setTimeout> | null = null;

  if (!storage) setStatus({ state: "unavailable", reason: "denied" });
  else {
    setStatus({ state: "idle" });
    const raw = readPayload(storage);
    if (raw) {
      const merged = applyPayload(baseline, raw);
      const patch: Record<string, unknown> = {};
      for (const k of changedKeys(merged, baseline)) patch[k] = merged[k];
      if (Object.keys(patch).length) store.setState(patch as Partial<AppState>);
    }
  }

  const write = (): PersistStatus => {
    timer = null;
    if (!storage) return status;
    const s = store.getState();
    try {
      const payload = buildPayload(pick(s), baseline, s.clock);
      if (!payload) storage.removeItem(PERSIST_KEY);
      else storage.setItem(PERSIST_KEY, JSON.stringify(payload));
      setStatus({ state: "saved", at: s.clock });
    } catch (e) {
      const quota = e instanceof DOMException && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED");
      setStatus({ state: "unavailable", reason: quota ? "quota" : "denied" });
    }
    return status;
  };
  const flush = (): PersistStatus => {
    if (timer) clearTimeout(timer);
    return write();
  };
  const unsub = store.subscribe((s, prev) => {
    if (!storage || !changedKeys(pick(s), pick(prev)).length) return;
    if (status.state !== "unavailable") setStatus({ ...status, state: "pending" });
    if (timer) clearTimeout(timer);
    timer = setTimeout(write, o.debounceMs ?? DEBOUNCE_MS);
  });
  /* A reload or a closed tab inside the debounce window must not lose the last edit. */
  const onHide = () => { if (timer) flush(); };
  const onVisibility = () => { if (typeof document !== "undefined" && document.visibilityState === "hidden") onHide(); };
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
  }
  const handle: PersistHandle = {
    flush,
    dispose: () => {
      unsub();
      if (timer) clearTimeout(timer);
      if (typeof window !== "undefined") {
        window.removeEventListener("pagehide", onHide);
        document.removeEventListener("visibilitychange", onVisibility);
      }
    },
  };
  active = { handle, store, storage, baseline, initial };
  return handle;
}

/** The explicit Save draft: writes now. */
export function saveDraftNow(): PersistStatus {
  return active ? active.handle.flush() : status;
}

/** Reset demo data: clears what was saved and puts the store back to its seed state. The caller confirms first. */
export function resetDemoData(): void {
  if (!active) return;
  const { store, storage, initial, handle } = active;
  try {
    storage?.removeItem(PERSIST_KEY);
  } catch {
    /* nothing was saved there that could matter */
  }
  resetCoreCounters();
  store.setState(initial);
  handle.flush();
}

/** Whether anything is saved, for the Reset confirmation ("Nothing is saved yet" or "Your saved changes will be removed"). */
export function hasSavedChanges(): boolean {
  if (!active?.storage) return false;
  return readPayload(active.storage) !== null;
}
