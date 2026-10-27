import type { AgentTask, IntakeAgentRole, IntakeSectionId } from "@/data/intake/types";
import { ROLE_AGENT, ROLE_LABEL } from "@/data/intake/types";
import { useStore } from "@/store";

/* Runs an intake agent in the demo: a task appears as Queued, then Running, then Done or Needs you, in the assistant panel's activity.
   A paused agent (Settings) does not run: the task is Blocked and says why. Whatever the agent produces is applied by `work`,
   which should only ever add suggestions or drafts; a person approves anything that changes the record. */

export interface RunAgentOptions {
  role: IntakeAgentRole;
  action: string;
  section?: IntakeSectionId;
  source?: string;
  /** "required": the result waits for a person (task ends as Needs you). */
  approval?: AgentTask["approval"];
  /** Simulated run time in ms. */
  ms?: number;
  /** Applies the result (adds suggestions, drafts...). Returns the one-line result for the activity list. */
  work?: () => string | void;
  /** Make the run fail, to show error handling and Retry. */
  fail?: string;
}

/** Starts an agent task on a record. Returns the task id, or null when the agent is paused. */
export function runAgent(recordId: string, o: RunAgentOptions): string | null {
  const st = useStore.getState();
  const agent = ROLE_AGENT[o.role];
  const approval = o.approval ?? "none";
  if (st.agentPaused[agent]) {
    st.addIntakeTask(recordId, { role: o.role, action: o.action, section: o.section, source: o.source, status: "blocked", approval, result: `${ROLE_LABEL[o.role]} is paused in Settings. Nothing was done.` });
    st.toast({ title: `${ROLE_LABEL[o.role]} is paused`, body: "Resume it in Settings to run it. Nothing was changed.", tone: "mid" });
    return null;
  }
  const id = st.addIntakeTask(recordId, { role: o.role, action: o.action, section: o.section, source: o.source, status: "queued", approval });
  const ms = o.ms ?? 1200;
  window.setTimeout(() => useStore.getState().updateIntakeTask(recordId, id, { status: "running" }), Math.min(300, ms / 3));
  window.setTimeout(() => {
    const s = useStore.getState();
    const task = s.intakes.find((r) => r.id === recordId)?.tasks.find((t) => t.id === id);
    if (!task || task.status === "cancelled") return;
    if (o.fail) {
      s.updateIntakeTask(recordId, id, { status: "error", error: o.fail });
      return;
    }
    const result = o.work?.() ?? undefined;
    s.updateIntakeTask(recordId, id, { status: approval === "required" ? "needs_you" : "done", result: result || task.result });
    s.addIntakeAudit(recordId, { actor: agent, action: o.action, detail: result || undefined, section: o.section, ai: true });
  }, ms);
  return id;
}
