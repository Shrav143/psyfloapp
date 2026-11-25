import { AGENT_RUNS } from "@/lib/demo/agent-runs";
import {
  AGENTS,
  type Agent,
  type AgentId,
  type AgentRun,
  type RunStep,
} from "@/lib/demo/agents";
import { getDataset } from "@/lib/demo/dataset";
import { DEMO_TODAY } from "@/lib/demo/format";
import type { Actor, AuthEvent } from "@/lib/demo/types";
import type { Tone } from "@/lib/demo-ui/status-badge";

/** Sum of every agent's runs so far today. */
export const RUNS_TODAY = AGENTS.reduce((n, a) => n + a.runsToday, 0);
/** Portals, 270/271 responses and bulletins read across this morning's runs. */
export const SOURCES_TODAY = AGENT_RUNS.reduce(
  (n, r) => n + r.sourcesChecked,
  0,
);
/** Static for the demo: payer phone holds the Caller sat through instead of staff. */
export const HOLD_HOURS_ABSORBED = "2.3 h";

export function agentById(id: AgentId): Agent | undefined {
  return AGENTS.find((a) => a.id === id);
}

export function runsForAgent(id: AgentId): AgentRun[] {
  return AGENT_RUNS.filter((r) => r.agentId === id);
}

/** Runs still blocked on a person, once session answers are taken into account. */
export function openQuestions(answered: Record<string, string>): number {
  return AGENT_RUNS.filter((r) => r.status === "needs_human" && !answered[r.id])
    .length;
}

/** A run whose question has been answered is back to running. */
export function runStatus(
  run: AgentRun,
  answered: boolean,
): AgentRun["status"] {
  return answered && run.status === "needs_human" ? "running" : run.status;
}

/** Once a human answers, the blocked step is done and the next pending step becomes active. */
export function stepsAfterAnswer(
  steps: RunStep[],
  answered: boolean,
): RunStep[] {
  if (!answered) {
    return steps;
  }
  let activated = false;
  return steps.map((s): RunStep => {
    if (s.state === "blocked") {
      return {
        ...s,
        state: "done",
        detail: s.detail
          ? `${s.detail} · resolved by clinician`
          : "Resolved by clinician",
      };
    }
    if (s.state === "pending" && !activated) {
      activated = true;
      return { ...s, state: "active" };
    }
    return s;
  });
}

export type LedgerEvent = AuthEvent & { mrn: string };

export const ACTOR_META: Record<Actor, { label: string; tone: Tone }> = {
  agent: { label: "Agent", tone: "blue" },
  clinician: { label: "Clinician", tone: "green" },
  staff: { label: "Staff", tone: "slate" },
  payer: { label: "Payer", tone: "amber" },
  system: { label: "System", tone: "violet" },
};

function seq(id: string): number {
  return Number(id.replace(/\D/g, "")) || 0;
}

/** Newest ledger events across every authorization, optionally agent actions only. */
export function ledgerEvents(agentOnly: boolean, limit = 15): LedgerEvent[] {
  const all = getDataset().authorizations.flatMap((a) =>
    a.events.map((e) => ({ ...e, mrn: a.mrn })),
  );
  const past = all.filter(
    (e) => e.at <= DEMO_TODAY && (!agentOnly || e.actor === "agent"),
  );
  past.sort((x, y) =>
    x.at === y.at ? seq(y.id) - seq(x.id) : x.at < y.at ? 1 : -1,
  );
  return past.slice(0, limit);
}
