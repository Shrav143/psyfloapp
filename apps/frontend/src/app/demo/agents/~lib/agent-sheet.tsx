"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/lib/core-ui/sheet";
import type { Agent } from "@/lib/demo/agents";
import { fmtDate, pct } from "@/lib/demo/format";
import { useDemoStore } from "@/lib/demo/store";
import { RunSteps } from "@/lib/demo-ui/agent-run";
import { EmptyState, KV } from "@/lib/demo-ui/primitives";
import { StatusBadge } from "@/lib/demo-ui/status-badge";
import { AgentIcon } from "./agent-icons";
import { runStatus, runsForAgent, stepsAfterAnswer } from "./agents-model";
import { SubmissionReplay } from "./submission-replay";

export function AgentSheet({
  agent,
  open,
  onOpenChange,
}: {
  agent: Agent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open && agent !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        {agent ? <SheetBody agent={agent} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({ agent }: { agent: Agent }) {
  const answered = useDemoStore((s) => s.answeredQuestions);
  const runs = runsForAgent(agent.id);
  const lastRun = `${fmtDate(agent.lastRun.slice(0, 10))} · ${agent.lastRun.slice(11)}`;
  return (
    <>
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle className="flex items-center gap-2.5 text-base">
          <AgentIcon icon={agent.icon} className="size-8" />
          {agent.name}
        </SheetTitle>
        <SheetDescription>{agent.role}</SheetDescription>
      </SheetHeader>
      <div className="space-y-5 px-5 py-4">
        <KV
          items={[
            { k: "Runs today", v: agent.runsToday },
            {
              k: "Reliability",
              v: `${pct(agent.reliability)} · runs completed without a retry`,
            },
            { k: "Last run", v: lastRun },
          ]}
        />
        <section>
          <h3 className="mb-1.5 font-medium text-[11px] text-slate-500 uppercase tracking-wide">
            Does
          </h3>
          <ul className="space-y-1 text-slate-700 text-sm">
            {agent.does.map((d) => (
              <li key={d} className="flex gap-2">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-slate-400" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </section>
        <div className="rounded-md border border-rose-200 bg-rose-50/60 px-3 py-2 text-rose-900 text-sm">
          {agent.never}
        </div>
        {agent.id === "navigator" ? <SubmissionReplay /> : null}
        <section>
          <h3 className="mb-2 font-medium text-[11px] text-slate-500 uppercase tracking-wide">
            Runs today
          </h3>
          {runs.length === 0 ? (
            <EmptyState
              title="No runs logged yet today"
              body="Runs appear here the moment they start, with every step and every source checked."
            />
          ) : (
            <div className="space-y-3">
              {runs.map((run) => {
                const done = Boolean(answered[run.id]);
                return (
                  <div
                    key={run.id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-slate-900 text-sm">
                        {run.title}
                      </div>
                      <StatusBadge status={runStatus(run, done)} />
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {run.subject} · {run.startedAt.slice(11)} ·{" "}
                      {run.sourcesChecked} sources checked
                    </div>
                    <div className="mt-2.5">
                      <RunSteps
                        steps={stepsAfterAnswer(run.steps, done)}
                        compact
                      />
                    </div>
                    <div className="mt-2 text-slate-600 text-xs">
                      {run.outcome}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
