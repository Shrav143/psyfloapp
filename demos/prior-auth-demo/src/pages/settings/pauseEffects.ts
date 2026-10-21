import type { AgentKey } from "@/data/types";

/** The ten agents that take a turn in a New case run. */
const RUNS_IN_NEW_CASE: AgentKey[] = ["reader", "verify", "criteria", "historian", "placement", "forecaster", "scribe", "integrity", "packet", "scrubber"];

const join = (items: string[], last: string) => (items.length < 3 ? items.join(` ${last} `) : `${items.slice(0, -1).join(", ")} ${last} ${items[items.length - 1]}`);

/** Names in a plain sentence: "Reader", "Reader and Verify", "Reader, Verify and Caller". */
export const nameList = (names: string[]) => join(names, "and");

/** Exactly what pausing these agents holds back, screen by screen. Every sentence matches a screen that reads the pause. */
export function pauseEffects(paused: AgentKey[], all: boolean, nameOf: (a: AgentKey) => string): string[] {
  const has = (a: AgentKey) => paused.includes(a);
  const inRun = RUNS_IN_NEW_CASE.filter(has);
  const emr = [...(has("reader") ? ["sync", "connect"] : []), ...(has("navigator") ? ["fix", "reconnect"] : [])];
  return [
    inRun.length ? (all ? "New case stops running agents." : `A New case run holds when it reaches ${join(inRun.map(nameOf), "or")}.`) : "",
    has("navigator") ? "Check all now on the Dashboard waits." : "",
    has("cadence") ? "Draft all due reviews in Case Manager waits." : "",
    has("verify") ? "Eligibility & Benefits stops its automatic re-checks." : "",
    emr.length ? `EMR Connect will not ${join(emr, "or")} a system.` : "",
  ].filter(Boolean);
}
