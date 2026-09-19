"use client";

import { useState } from "react";
import { AGENTS, type Agent } from "@/lib/demo/agents";
import { pct } from "@/lib/demo/format";
import { Panel } from "@/lib/demo-ui/primitives";
import { AgentIcon } from "./agent-icons";
import { AgentSheet } from "./agent-sheet";

export function AgentRoster() {
  const [selected, setSelected] = useState<Agent | null>(null);
  const [open, setOpen] = useState(false);
  const show = (agent: Agent) => {
    setSelected(agent);
    setOpen(true);
  };
  return (
    <>
      <Panel
        title="Roster"
        description="Seven narrow jobs. Each has a line it never crosses. Open one for its runs."
        className="mb-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {AGENTS.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onOpen={() => show(agent)}
            />
          ))}
        </div>
      </Panel>
      <AgentSheet agent={selected} open={open} onOpenChange={setOpen} />
    </>
  );
}

function AgentCard({ agent, onOpen }: { agent: Agent; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
    >
      <div className="flex items-center gap-3">
        <AgentIcon icon={agent.icon} />
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 text-sm">
            {agent.name}
          </div>
          <div className="truncate text-slate-500 text-xs">{agent.role}</div>
        </div>
      </div>
      <ul className="mt-3 space-y-1 text-slate-700 text-xs">
        {agent.does.map((d) => (
          <li key={d} className="flex gap-2">
            <span className="mt-[6px] size-1 shrink-0 rounded-full bg-slate-400" />
            <span>{d}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-md border border-rose-200 bg-rose-50/60 px-2.5 py-1.5 text-rose-900 text-xs">
        <span className="font-semibold">Never:</span>{" "}
        {agent.never.replace(/^Never /, "")}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-[11px] text-slate-500">
        <span>
          <span className="font-medium text-slate-800 tabular-nums">
            {agent.runsToday}
          </span>{" "}
          runs today
        </span>
        <span>
          <span className="font-medium text-emerald-700 tabular-nums">
            {pct(agent.reliability)}
          </span>{" "}
          reliable
        </span>
        <span>last {agent.lastRun.slice(11)}</span>
      </div>
    </button>
  );
}
