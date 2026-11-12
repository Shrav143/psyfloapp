"use client";

import { useState } from "react";
import { Switch } from "@/lib/core-ui/switch";
import { fmtDate } from "@/lib/demo/format";
import { Panel } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";
import { ACTOR_META, ledgerEvents } from "./agents-model";

export function AuditTrail() {
  const [agentOnly, setAgentOnly] = useState(false);
  const events = ledgerEvents(agentOnly);
  return (
    <Panel
      title="Audit trail"
      description={
        agentOnly
          ? "Last 15 agent actions across every authorization. Appended, never edited."
          : "Last 15 ledger events across every authorization. Appended, never edited."
      }
      right={
        <div className="flex shrink-0 items-center gap-2">
          <label htmlFor="audit-agent-only" className="text-slate-600 text-xs">
            Filter: agent actions only
          </label>
          <Switch
            id="audit-agent-only"
            checked={agentOnly}
            onCheckedChange={setAgentOnly}
            className="data-[state=checked]:bg-indigo-600"
          />
        </div>
      }
      padded={false}
    >
      <ol className="divide-y divide-slate-100">
        {events.map((e) => {
          const actor = ACTOR_META[e.actor];
          return (
            <li key={e.id} className="flex gap-3 px-5 py-2.5">
              <div className="w-20 shrink-0 pt-0.5 text-slate-500 text-xs tabular-nums">
                {fmtDate(e.at.slice(0, 10), true)}
              </div>
              <div className="w-18 shrink-0 pt-0.5 font-mono text-[11px] text-slate-500">
                {e.mrn}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900 text-sm">
                    {e.title}
                  </span>
                  <Pill tone={actor.tone}>{actor.label}</Pill>
                </div>
                {e.detail ? (
                  <div className="mt-0.5 text-slate-600 text-xs">
                    {e.detail}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
