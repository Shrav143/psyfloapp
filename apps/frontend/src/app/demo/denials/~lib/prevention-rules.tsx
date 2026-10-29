"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/lib/core-ui/switch";
import { Panel } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";
import { cn } from "@/lib/tailwind-utils";
import { PREVENTION_RULES } from "./denial-helpers";

export function PreventionRules() {
  const [active, setActive] = useState<Record<string, boolean>>(
    Object.fromEntries(PREVENTION_RULES.map((r) => [r.id, r.active])),
  );
  const toggle = (id: string, title: string, on: boolean) => {
    setActive((a) => ({ ...a, [id]: on }));
    toast(on ? "Rule active" : "Rule paused", {
      description: on
        ? `${title} · checked on every packet before sign-off`
        : `${title} · packets will no longer be held for this check`,
    });
  };
  return (
    <Panel
      title="Root causes and prevention rules"
      description="Each rule comes from a denial pattern and is applied by the Packet agent before sign-off. Pause one and the next packet is not held for it."
      padded={false}
    >
      <ul className="divide-y divide-slate-100">
        {PREVENTION_RULES.map((r) => {
          const on = active[r.id] ?? false;
          return (
            <li key={r.id} className="flex items-start gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "font-medium text-sm",
                    on ? "text-slate-900" : "text-slate-400 line-through",
                  )}
                >
                  {r.title}
                </div>
                <div className="mt-0.5 text-slate-500 text-xs">
                  Prevents: {r.prevents}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Pill tone="slate">{r.owner}</Pill>
                  <Pill tone={on ? r.tone : "slate"}>
                    {on ? r.status : "paused"}
                  </Pill>
                </div>
              </div>
              <Switch
                checked={on}
                onCheckedChange={(v) => toggle(r.id, r.title, v)}
                className="mt-1 data-[state=checked]:bg-indigo-600"
                aria-label={`Toggle rule: ${r.title}`}
              />
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
