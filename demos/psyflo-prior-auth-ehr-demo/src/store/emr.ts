import type { StateCreator } from "zustand";
import { BASE_COUNTS, emrInView, SEED_ACTIVITY, SEED_MAPPINGS, SEED_SYSTEMS, SEED_UNMAPPED, SYNC_RESULTS, type EmrActivity, type EmrMapping, type EmrSystem, type SystemKind, type UnmappedField } from "@/data/emr";
import { SITE_IDS, touchesView, type SiteId } from "@/data/sites";
import type { AgentKey } from "@/data/types";
import { viewerById } from "@/data/viewers";
import { uid } from "@/lib/format";
import { sitesInView } from "@/lib/scope";
import { shortDate } from "@/lib/time";
import type { AppState } from "./index";

/* EMR Connect (owner: denials agent). Lives beside the payer slice because the foundation store has no slot for it.
   Every action adds a line to the activity log, so the page reads as an audit trail. The agent's freedom (Settings) decides
   whether a finished step also says so in a toast: "Act on its own" only logs it.
   Sites: a clinical record system belongs to one site and the billing system serves both. A viewer may act on a system only when it
   serves a site they may see, so a Site A viewer cannot sync, fix, reconnect, edit or disconnect Site B's record system. */

export interface NewSystemInput { kind: SystemKind; name: string; holds: string; contact: string; /** The sites it serves. Limited to the sites the viewer may see. */ sites: SiteId[] }

export type EmrCounts = Record<SiteId, { charts: number; files: number }>;

/** Split a whole number across the sites in proportion to `weights`, so the parts always add up to `n` (the larger remainder gets the spare one, Site A on a tie). */
function allocate(n: number, weights: Record<SiteId, number>): Record<SiteId, number> {
  const total = SITE_IDS.reduce((t, id) => t + weights[id], 0);
  const out = { A: 0, B: 0 } as Record<SiteId, number>;
  if (!total) return out;
  const exact = SITE_IDS.map((id) => ({ id, share: (n * weights[id]) / total }));
  for (const e of exact) out[e.id] = Math.floor(e.share);
  let spare = n - SITE_IDS.reduce((t, id) => t + out[id], 0);
  for (const e of [...exact].sort((a, b) => b.share - Math.floor(b.share) - (a.share - Math.floor(a.share)))) {
    if (spare <= 0) break;
    out[e.id] += 1;
    spare -= 1;
  }
  return out;
}

/** Each system counts once, shared between its sites: a clinical record is all Site A or all Site B, the billing system is half and half. */
function weightsOf(systems: EmrSystem[]): Record<SiteId, number> {
  const w = { A: 0, B: 0 } as Record<SiteId, number>;
  for (const x of systems) for (const id of x.sites) w[id] += 1 / x.sites.length;
  return w;
}

export interface EmrSlice {
  emrSystems: EmrSystem[];
  emrActivity: EmrActivity[];
  emrUnmapped: UnmappedField[];
  emrMappings: EmrMapping[];
  /** Charts matched today and files pulled this week, by site. Both sites shows the sum. Sync adds to the sites it pulled from. */
  emrCounts: EmrCounts;
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
  const log = (agent: AgentKey, text: string, sites: SiteId[]) => set((s) => ({ emrActivity: [{ id: uid("ea"), at: s.clock, agent, text, sites }, ...s.emrActivity] }));
  /** The log line is always written. A toast follows unless the agent is set to "Act on its own". */
  const report = (agent: AgentKey, t: Parameters<AppState["toast"]>[0]) => {
    if (get().agentFreedom[agent] !== "auto") get().toast(t);
  };
  const patchSystem = (id: string, patch: Partial<EmrSystem>) => set((s) => ({ emrSystems: s.emrSystems.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const nameOf = (id: string) => get().emrSystems.find((x) => x.id === id)?.name ?? "the system";
  const sitesOf = (id: string): SiteId[] => get().emrSystems.find((x) => x.id === id)?.sites ?? [];
  /** The signed-in person may act on a system only when it serves a site they may see. */
  const mayAct = (id: string): boolean => touchesView(sitesOf(id), viewerById(get().viewerId).sites);
  const addCounts = (sys: EmrSystem[], charts: number, files: number) => {
    const w = weightsOf(sys);
    const c = allocate(charts, w);
    const f = allocate(files, w);
    set((s) => ({ emrCounts: { A: { charts: s.emrCounts.A.charts + c.A, files: s.emrCounts.A.files + f.A }, B: { charts: s.emrCounts.B.charts + c.B, files: s.emrCounts.B.files + f.B } } }));
  };

  return {
    emrSystems: SEED_SYSTEMS,
    emrActivity: SEED_ACTIVITY,
    emrUnmapped: SEED_UNMAPPED,
    emrMappings: SEED_MAPPINGS,
    emrCounts: { A: { ...BASE_COUNTS.A }, B: { ...BASE_COUNTS.B } },
    emrSyncs: 0,

    syncSystems: (all) => {
      const { clock, emrSystems, emrSyncs } = get();
      const ids = all.filter(mayAct);
      const live = ids.filter((id) => emrSystems.find((x) => x.id === id)?.status === "connected");
      if (!live.length) return;
      const r = SYNC_RESULTS[emrSyncs % SYNC_RESULTS.length];
      const share = live.length === emrSystems.filter((x) => x.status === "connected").length ? 1 : 0.5;
      set((s) => ({ emrSystems: s.emrSystems.map((x) => (live.includes(x.id) ? { ...x, lastSyncAt: clock } : x)), emrSyncs: s.emrSyncs + 1 }));
      const pulled = emrSystems.filter((x) => live.includes(x.id));
      addCounts(pulled, Math.max(1, Math.round(r.charts * share)), Math.max(1, Math.round(r.files * share)));
      log(r.agent, live.length === 1 ? `${r.text} from ${nameOf(live[0]).toLowerCase()}` : r.text, [...new Set(pulled.flatMap((x) => x.sites))]);
      const skipped = ids.length - live.length;
      report("reader", { title: "Sync finished", body: skipped ? `${live.length} synced. ${skipped} needs attention first.` : r.text, tone: skipped ? "mid" : "good" });
    },

    mapField: (fieldId, value) => {
      const f = get().emrUnmapped.find((x) => x.id === fieldId);
      if (!f || !mayAct(f.systemId)) return;
      const opt = f.options.find((o) => o.value === value);
      set((s) => ({
        emrUnmapped: s.emrUnmapped.filter((x) => x.id !== fieldId),
        emrMappings: [...s.emrMappings, { id: uid("em"), systemId: f.systemId, source: f.field, target: opt?.label ?? value, by: `You, ${shortDate(s.clock)}` }],
      }));
      log("reader", `Mapped “${f.field}” to ${opt?.label ?? value}. It applies to every future pull`, sitesOf(f.systemId));
      get().toast({ title: "Field mapped", body: `“${f.field}” now fills ${opt?.label ?? value}.`, tone: "good" });
    },

    fixSystem: (id) => {
      if (!mayAct(id)) return;
      const name = nameOf(id);
      patchSystem(id, { status: "connected", lastSyncAt: get().clock, issue: undefined, fixIssue: undefined });
      addCounts(get().emrSystems.filter((x) => x.id === id), 0, 12);
      log("navigator", `Renewed the read-only sign-in for ${name.toLowerCase()} and pulled 12 remittances`, sitesOf(id));
      report("navigator", { title: `${name} is connected`, body: "Remittances are arriving again.", tone: "good" });
    },

    renewSignIn: (id) => {
      if (!mayAct(id)) return;
      const name = nameOf(id);
      patchSystem(id, { fixIssue: undefined });
      log("navigator", `Renewed the read-only sign-in for ${name.toLowerCase()}`, sitesOf(id));
      report("navigator", { title: "Sign-in renewed", body: `One more test, then ${name} is connected.`, tone: "good" });
    },

    connectSystem: (input) => {
      const id = uid("sys");
      const clock = get().clock;
      // A viewer can connect a system only for a site they may see.
      const allowed = viewerById(get().viewerId).sites;
      const picked = input.sites.filter((x) => allowed.includes(x));
      const sites = picked.length ? picked : allowed;
      const system: EmrSystem = { id, name: input.name, kind: input.kind, holds: input.holds, sites, status: "connected", lastSyncAt: clock, connectedSince: shortDate(clock), contact: input.contact, writeBack: false };
      set((s) => ({ emrSystems: [...s.emrSystems, system] }));
      addCounts([system], 0, 5);
      log("reader", `Tested the read-only connection to ${input.name.toLowerCase()} and found 5 files to pull`, sites);
      get().toast({ title: `${input.name} is connected`, body: "Read-only. Nothing is written back.", tone: "good" });
      return id;
    },

    disconnectSystem: (id) => {
      if (!mayAct(id)) return;
      const name = nameOf(id);
      const was = get().emrSystems.find((x) => x.id === id);
      // Remember what needed a look, so Reconnect starts with Fix instead of skipping it.
      patchSystem(id, { status: "disconnected", issue: "Charts from this system are not arriving.", fixIssue: was?.status === "attention" ? was.issue : was?.fixIssue });
      log("navigator", `Disconnected ${name.toLowerCase()}. Charts from it stop arriving`, sitesOf(id));
      get().toast({ title: `${name} is disconnected`, body: "Reconnect it any time from this page.", tone: "mid" });
    },

    reconnectSystem: (id) => {
      const sys = get().emrSystems.find((x) => x.id === id);
      if (!sys || !mayAct(id) || sys.status !== "disconnected" || sys.fixIssue) return;
      patchSystem(id, { status: "connected", lastSyncAt: get().clock, issue: undefined });
      log("navigator", `Reconnected ${sys.name.toLowerCase()} and read-only access passed its test`, sys.sites);
      report("navigator", { title: `${sys.name} is connected`, tone: "good" });
    },

    setWriteBack: (id, on) => {
      if (!mayAct(id)) return;
      patchSystem(id, { writeBack: on });
      log("navigator", on ? `Write-back is on for ${nameOf(id).toLowerCase()}, approval number and dates only, after a person approves` : `Write-back is off for ${nameOf(id).toLowerCase()}`, sitesOf(id));
      const counts = selectWriteBackOn(get());
      const connected = get().emrSystems.find((x) => x.id === id)?.status === "connected";
      get().toast(on
        ? { title: "Write-back is on", body: connected ? "The Dashboard offers the approval write-back box. Only the approval number and dates, and only after a person approves." : "The Dashboard offers the box once this system is connected.", tone: "good" }
        : { title: "Write-back is off", body: counts ? "The Dashboard still offers the box, because another connected system has write-back on." : "The Dashboard no longer offers the approval write-back box.", tone: "neutral" });
    },
  };
};

/** Systems the agents can read from right now, at the sites in view. "Pull from EMR" in New Case needs at least one, so a Site A viewer is offered Site A's record system and never Site B's. */
export const selectConnectedEmr = (s: AppState): EmrSystem[] => emrInView(s.emrSystems, sitesInView(s)).filter((x) => x.status === "connected");
/** True when at least one connected system at the sites in view has write-back on. The Dashboard's write-back box only shows then. */
export const selectWriteBackOn = (s: AppState): boolean => emrInView(s.emrSystems, sitesInView(s)).some((x) => x.status === "connected" && x.writeBack);
/** Fields still waiting for a mapping on a system that is connected and in view. A pull leaves these blank. */
export const selectUnmappedForConnected = (s: AppState): UnmappedField[] => {
  const live = selectConnectedEmr(s);
  return s.emrUnmapped.filter((u) => live.some((x) => x.id === u.systemId));
};
