import type { StateCreator } from "zustand";
import { AGENTS } from "@/data/agents";
import type { AgentKey } from "@/data/types";
import type { AppState } from "./index";

/* How much freedom each agent has, and which are paused. Settings writes it; New Case (Agents work), the Dashboard's
   "Check all now" and Case Manager's "Draft all due reviews" read it, so a pause is felt everywhere. */

export type Freedom = "ask" | "report" | "auto";
export const FREEDOM_LABEL: Record<Freedom, string> = { ask: "Ask before acting", report: "Act, then report", auto: "Act on its own" };

const KEYS = Object.keys(AGENTS) as AgentKey[];
const DEFAULT_FREEDOM: Partial<Record<AgentKey, Freedom>> = { navigator: "report", caller: "ask", reader: "auto", verify: "auto", cadence: "report" };

export interface AgentSettingsSlice {
  agentFreedom: Record<AgentKey, Freedom>;
  /** true = this agent is paused. */
  agentPaused: Record<AgentKey, boolean>;
  setAgentFreedom: (agent: AgentKey, freedom: Freedom) => void;
  setAgentPaused: (agent: AgentKey, paused: boolean) => void;
  pauseAllAgents: () => void;
  resumeAllAgents: () => void;
}

export const createAgentSettingsSlice: StateCreator<AppState, [], [], AgentSettingsSlice> = (set) => ({
  agentFreedom: Object.fromEntries(KEYS.map((k) => [k, DEFAULT_FREEDOM[k] ?? "ask"])) as Record<AgentKey, Freedom>,
  agentPaused: Object.fromEntries(KEYS.map((k) => [k, false])) as Record<AgentKey, boolean>,
  setAgentFreedom: (agent, freedom) => set((s) => ({ agentFreedom: { ...s.agentFreedom, [agent]: freedom } })),
  setAgentPaused: (agent, paused) => set((s) => ({ agentPaused: { ...s.agentPaused, [agent]: paused } })),
  pauseAllAgents: () => set({ agentPaused: Object.fromEntries(KEYS.map((k) => [k, true])) as Record<AgentKey, boolean> }),
  resumeAllAgents: () => set({ agentPaused: Object.fromEntries(KEYS.map((k) => [k, false])) as Record<AgentKey, boolean> }),
});

export const selectAllAgentsPaused = (s: AppState): boolean => KEYS.every((k) => s.agentPaused[k]);
export const selectAnyAgentPaused = (s: AppState): boolean => KEYS.some((k) => s.agentPaused[k]);
export const selectPausedAgents = (s: AppState): AgentKey[] => KEYS.filter((k) => s.agentPaused[k]);
