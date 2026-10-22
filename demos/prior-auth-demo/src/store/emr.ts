import type { StateCreator } from "zustand";
import { BASE_CHARTS, BASE_FILES, SEED_ACTIVITY, SEED_MAPPINGS, SEED_SYSTEMS, SEED_UNMAPPED, SYNC_RESULTS, type EmrActivity, type EmrMapping, type EmrSystem, type SystemKind, type UnmappedField } from "@/data/emr";
import type { AgentKey } from "@/data/types";
import { uid } from "@/lib/format";
import { shortDate } from "@/lib/time";
import type { AppState } from "./index";

/* EMR Connect (owner: denials agent). Lives beside the payer slice because the foundation store has no slot for it.
   Every action adds a line to the activity log, so the page reads as an audit trail. The agent's freedom (Settings) decides
   whether a finished step also says so in a toast: "Act on its own" only logs it. */

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
  /** Sync finished: marks the systems as just synced and adds what the agents pulled. Systems that need attention are skipped. */
  syncSystems: (ids: string[]) => void;
  mapField: (fieldId: string, value: string) => void;
  /** The guided fix for a system that needs a look finished. */
  fixSystem: (id: string) => void;
  /** The fix inside Reconnect finished: the sign-in is renewed, but the system is not connected until the test passes. */
  renewSignIn: (id: string) => void;
  connectSystem: (input: NewSystemInput) => string;
  disconnectSystem: (id: string) => void;
  /** The connection test passed. A system that still has a problem to fix is not reconnected. */
  reconnectSystem: (id: string) => void;
  setWriteBack: (id: string, on: boolean) => void;
}

export const createEmrSlice: StateCreator<AppState, [], [], EmrSlice> = (set, get) => {
  const log = (agent: AgentKey, text: string) => set((s) => ({ emrActivity: [{ id: uid("ea"), at: s.clock, agent, text }, ...s.emrActivity] }));
  /** The log line is always written. A toast follows unless the agent is set to "Act on its own". */
  const report = (agent: AgentKey, t: Parameters<AppState["toast"]>[0]) => {
    if (get().agentFreedom[agent] !== "auto") get().toast(t);
  };
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
      report("reader", { title: "Sync finished", body: skipped ? `${live.length} synced. ${skipped} needs attention first.` : r.text, tone: skipped ? "mid" : "good" });
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
      patchSystem(id, { status: "connected", lastSyncAt: get().clock, issue: undefined, fixIssue: undefined });
      set((s) => ({ emrFiles: s.emrFiles + 12 }));
      log("navigator", `Renewed the read-only sign-in for ${name.toLowerCase()} and pulled 12 remittances`);
      report("navigator", { title: `${name} is connected`, body: "Remittances are arriving again.", tone: "good" });
    },

    renewSignIn: (id) => {
      const name = nameOf(id);
      patchSystem(id, { fixIssue: undefined });
      log("navigator", `Renewed the read-only sign-in for ${name.toLowerCase()}`);
      report("navigator", { title: "Sign-in renewed", body: `One more test, then ${name} is connected.`, tone: "good" });
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
      const was = get().emrSystems.find((x) => x.id === id);
      // Remember what needed a look, so Reconnect starts with Fix instead of skipping it.
      patchSystem(id, { status: "disconnected", issue: "Charts from this system are not arriving.", fixIssue: was?.status === "attention" ? was.issue : was?.fixIssue });
      log("navigator", `Disconnected ${name.toLowerCase()}. Charts from it stop arriving`);
      get().toast({ title: `${name} is disconnected`, body: "Reconnect it any time from this page.", tone: "mid" });
    },

    reconnectSystem: (id) => {
      const sys = get().emrSystems.find((x) => x.id === id);
      if (!sys || sys.status !== "disconnected" || sys.fixIssue) return;
      patchSystem(id, { status: "connected", lastSyncAt: get().clock, issue: undefined });
      log("navigator", `Reconnected ${sys.name.toLowerCase()} and read-only access passed its test`);
      report("navigator", { title: `${sys.name} is connected`, tone: "good" });
    },

    setWriteBack: (id, on) => {
      patchSystem(id, { writeBack: on });
      log("navigator", on ? `Write-back is on for ${nameOf(id).toLowerCase()}, approval number and dates only, after a person approves` : `Write-back is off for ${nameOf(id).toLowerCase()}`);
      const counts = selectWriteBackOn(get());
      const connected = get().emrSystems.find((x) => x.id === id)?.status === "connected";
      get().toast(on
        ? { title: "Write-back is on", body: connected ? "The Dashboard offers the approval write-back box. Only the approval number and dates, and only after a person approves." : "The Dashboard offers the box once this system is connected.", tone: "good" }
        : { title: "Write-back is off", body: counts ? "The Dashboard still offers the box, because another connected system has write-back on." : "The Dashboard no longer offers the approval write-back box.", tone: "neutral" });
    },
  };
};

/** Systems the agents can read from right now. "Pull from EMR" in New case needs at least one. */
export const selectConnectedEmr = (s: AppState): EmrSystem[] => s.emrSystems.filter((x) => x.status === "connected");
/** True when at least one connected system has write-back on. The Dashboard's write-back box only shows then. */
export const selectWriteBackOn = (s: AppState): boolean => s.emrSystems.some((x) => x.status === "connected" && x.writeBack);
/** Fields still waiting for a mapping on a system that is connected. A pull leaves these blank. */
export const selectUnmappedForConnected = (s: AppState): UnmappedField[] => s.emrUnmapped.filter((u) => s.emrSystems.find((x) => x.id === u.systemId)?.status === "connected");
