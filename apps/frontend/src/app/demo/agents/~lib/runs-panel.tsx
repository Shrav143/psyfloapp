"use client";

import { AGENT_RUNS } from "@/lib/demo/agent-runs";
import { useDemoStore } from "@/lib/demo/store";
import { RunSteps } from "@/lib/demo-ui/agent-run";
import { Panel } from "@/lib/demo-ui/primitives";
import { StatusBadge } from "@/lib/demo-ui/status-badge";
import { AgentIcon } from "./agent-icons";
import { agentById, runStatus, stepsAfterAnswer } from "./agents-model";
import { RunQuestion } from "./run-question";

export function RunsPanel() {
  const answered = useDemoStore((s) => s.answeredQuestions);
  return (
    <div id="agent-runs" className="scroll-mt-20">
      <Panel
        title="Runs"
        description="Every run this morning, step by step: what was checked, what came back, what needs a person."
        padded={false}
      >
        <ul className="divide-y divide-slate-100">
          {AGENT_RUNS.map((run) => {
            const agent = agentById(run.agentId);
            const done = Boolean(answered[run.id]);
            return (
              <li key={run.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {agent ? (
                      <AgentIcon icon={agent.icon} className="size-7" />
                    ) : null}
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 text-sm">
                        <span className="text-indigo-600">{agent?.name}</span> ·{" "}
                        {run.title}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {run.subject} · started {run.startedAt.slice(11)} ·{" "}
                        {run.sourcesChecked} sources checked
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={runStatus(run, done)} />
                </div>
                <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                  <RunSteps steps={stepsAfterAnswer(run.steps, done)} />
                  <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-slate-700 text-xs">
                    <div className="mb-0.5 font-medium text-[11px] text-slate-500 uppercase tracking-wide">
                      Outcome
                    </div>
                    {done
                      ? "Answer recorded. Cover sheet drafting; the packet lands in the sign-off queue next."
                      : run.outcome}
                  </div>
                </div>
                {run.question ? <RunQuestion run={run} /> : null}
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}
