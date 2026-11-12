"use client";

import Link from "next/link";
import { AGENT_RUNS } from "@/lib/demo/agent-runs";
import { AGENTS } from "@/lib/demo/agents";
import { Panel } from "@/lib/demo-ui/primitives";
import { StatusBadge } from "@/lib/demo-ui/status-badge";

export function AgentFeed() {
  return (
    <Panel
      title="What ran this morning"
      description="Agents check, draft and poll. They never send anything a clinician has not signed."
      right={
        <Link
          href="/demo/agents"
          className="text-indigo-600 text-xs hover:underline"
        >
          All runs
        </Link>
      }
      padded={false}
    >
      <ul className="divide-y divide-slate-100">
        {AGENT_RUNS.map((run) => {
          const agent = AGENTS.find((a) => a.id === run.agentId);
          return (
            <li key={run.id} className="px-5 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-slate-900 text-sm">
                  <span className="text-indigo-600">{agent?.name}</span> ·{" "}
                  {run.title}
                </div>
                <StatusBadge status={run.status} />
              </div>
              <div className="mt-1 text-slate-600 text-xs">{run.outcome}</div>
              <div className="mt-1 text-[11px] text-slate-400">
                {run.startedAt.slice(11)} · {run.sourcesChecked} sources checked
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
