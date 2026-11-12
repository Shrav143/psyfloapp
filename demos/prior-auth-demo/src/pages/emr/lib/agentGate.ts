import type { AgentKey } from "@/data/types";
import { useStore } from "@/store";

export type Gate = "go" | "ask" | "paused";

/** What Settings says about an agent starting a step: paused waits, "Ask before acting" asks first, the other levels go ahead. */
export function agentGate(agent: AgentKey): Gate {
  const { agentPaused, agentFreedom } = useStore.getState();
  if (agentPaused[agent]) return "paused";
  return agentFreedom[agent] === "ask" ? "ask" : "go";
}
