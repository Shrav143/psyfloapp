import type { StateCreator } from "zustand";
import { BASE_CHARTS, BASE_FILES, SEED_ACTIVITY, SEED_MAPPINGS, SEED_SYSTEMS, SEED_UNMAPPED, SYNC_RESULTS, type EmrActivity, type EmrMapping, type EmrSystem, type SystemKind, type UnmappedField } from "@/data/emr";
import type { AgentKey } from "@/data/types";
import { uid } from "@/lib/format";
import { shortDate } from "@/lib/time";
import type { AppState } from "./index";

/* EMR Connect (owner: denials agent). Lives beside the payer slice because the foundation store has no slot for it.
   Every action adds a line to the activity log, so the page reads as an audit trail. */

export interface NewSystemInput { kind: SystemKind; name: string; holds: string; contact: string }

export interface EmrSlice {
  emrSystems: EmrSystem[];
  emrActivity: EmrActivity[];
  emrUnmapped: UnmappedField[];
  emrMappings: EmrMapping[];
  /** Charts matched today and files pulled this week. Sync adds to both. */
  emrCharts: number;
  emrFiles: number;
  emrSyncs: number;
  /** Sync finished: marks the systems as just synced and adds what the agents pulled. Systems that need a look are skipped. */
  syncSystems: (ids: string[]) => void;
  mapField: (fieldId: string, value: string) => void;
  /** The guided fix for a system that needs a look finished. */
  fixSystem: (id: string) => void;
  connectSystem: (input: NewSystemInput) => string;
  disconnectSystem: (id: string) => void;
  reconnectSystem: (id: string) => void;
  setWriteBack: (id: string, on: boolean) => void;
}

export const createEmrSlice: StateCreator<AppState, [], [], EmrSlice> = (set, get) => {
  const log = (agent: AgentKey, text: string) => set((s) => ({ emrActivity: [{ id: uid("ea"), at: s.clock, agent, text }, ...s.emrActivity] }));
  const patchSystem = (id: string, patch: Partial<EmrSystem>) => set((s) => ({ emrSystems: s.emrSystems.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const nameOf = (id: string) => get().emrSystems.find((x) => x.id === id)?.name ?? "the system";

  return {
    emrSystems: SEED_SYSTEMS,
    emrActivity: SEED_ACTIVITY,
    emrUnmapped: SEED_UNMAPPED,
    emrMappings: SEED_MAPPINGS,
    emrCharts: BASE_CHARTS,
    emrFiles: BASE_FILES,
    emrSyncs: 0,

    syncSystems: (ids) => {
      const { clock, emrSystems, emrSyncs } = get();
      const live = ids.filter((id) => emrSystems.find((x) => x.id === id)?.status === "connected");
      if (!live.length) return;
      const r = SYNC_RESULTS[emrSyncs % SYNC_RESULTS.length];
      const share = live.length === emrSystems.filter((x) => x.status === "connected").length ? 1 : 0.5;
      set((s) => ({ emrSystems: s.emrSystems.map((x) => (live.includes(x.id) ? { ...x, lastSyncAt: clock } : x)), emrCharts: s.emrCharts + Math.max(1, Math.round(r.charts * share)), emrFiles: s.emrFiles + Math.max(1, Math.round(r.files * share)), emrSyncs: s.emrSyncs + 1 }));
      log(r.agent, live.length === 1 ? `${r.text} from ${nameOf(live[0]).toLowerCase()}` : r.text);
      const skipped = ids.length - live.length;
      get().toast({ title: "Sync finished", body: skipped ? `${live.length} synced. ${skipped} needs a quick look first.` : r.text, tone: skipped ? "mid" : "good" });
    },

    mapField: (fieldId, value) => {
      const f = get().emrUnmapped.find((x) => x.id === fieldId);
      if (!f) return;
      const opt = f.options.find((o) => o.value === value);
      set((s) => ({
        emrUnmapped: s.emrUnmapped.filter((x) => x.id !== fieldId),
        emrMappings: [...s.emrMappings, { id: uid("em"), systemId: f.systemId, source: f.field, target: opt?.label ?? value, by: `You, ${shortDate(s.clock)}` }],
      }));
      log("reader", `Mapped “${f.field}” to ${opt?.label ?? value}. It applies to every future pull`);
      get().toast({ title: "Field mapped", body: `“${f.field}” now fills ${opt?.label ?? value}.`, tone: "good" });
    },

    fixSystem: (id) => {
      const name = nameOf(id);
      patchSystem(id, { status: "connected", lastSyncAt: get().clock, issue: undefined });
      log("navigator", `Renewed the read-only sign-in for ${name.toLowerCase()} and pulled 12 remittances`);
      get().toast({ title: `${name} is connected`, body: "Remittances are arriving again.", tone: "good" });
    },

    connectSystem: (input) => {
      const id = uid("sys");
      const clock = get().clock;
      const system: EmrSystem = { id, name: input.name, kind: input.kind, holds: input.holds, status: "connected", lastSyncAt: clock, connectedSince: shortDate(clock), contact: input.contact, writeBack: false };
      set((s) => ({ emrSystems: [...s.emrSystems, system], emrFiles: s.emrFiles + 5 }));
      log("reader", `Tested the read-only connection to ${input.name.toLowerCase()} and found 5 files to pull`);
      get().toast({ title: `${input.name} is connected`, body: "Read-only. Nothing is written back.", tone: "good" });
      return id;
    },

    disconnectSystem: (id) => {
      const name = nameOf(id);
      patchSystem(id, { status: "disconnected", issue: "Charts from this system are not arriving." });
      log("navigator", `Disconnected ${name.toLowerCase()}. Charts from it stop arriving`);
      get().toast({ title: `${name} is disconnected`, body: "Reconnect it any time from this page.", tone: "mid" });
    },

    reconnectSystem: (id) => {
      const name = nameOf(id);
      patchSystem(id, { status: "connected", lastSyncAt: get().clock, issue: undefined });
      log("reader", `Reconnected ${name.toLowerCase()} and read-only access passed its test`);
      get().toast({ title: `${name} is connected`, tone: "good" });
    },

    setWriteBack: (id, on) => {
      patchSystem(id, { writeBack: on });
      log("navigator", on ? `Write-back is on for ${nameOf(id).toLowerCase()}, approval number and dates only, after a person approves` : `Write-back is off for ${nameOf(id).toLowerCase()}`);
      get().toast({ title: on ? "Write-back is on" : "Write-back is off", body: on ? "Only the approval number and dates, and only after a person approves." : "The agents only read from this system.", tone: on ? "good" : "neutral" });
    },
  };
};
