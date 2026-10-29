"use client";

import { Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/lib/core-ui/switch";
import { Panel } from "@/lib/demo-ui/primitives";

type Guardrail = {
  id: string;
  label: string;
  on: boolean;
  locked?: boolean;
  note?: string;
};

const GUARDRAILS: Guardrail[] = [
  {
    id: "unsigned",
    label: "Never send unsigned requests or appeals",
    on: true,
    locked: true,
    note: "locked",
  },
  {
    id: "auto-submit",
    label: "Submit signed requests automatically",
    on: true,
  },
  { id: "poll", label: "Poll every open request daily", on: true },
  { id: "call", label: "Call payers to confirm fax receipt", on: true },
  {
    id: "appeal",
    label: "Draft an appeal automatically when a denial lands",
    on: true,
  },
  { id: "policy", label: "Watch payer policies weekly", on: true },
  {
    id: "writeback",
    label: "Write reference numbers back to Sunwave",
    on: true,
  },
  {
    id: "predict",
    label: "Predict approval odds",
    on: false,
    locked: true,
    note: "not until calibrated on Harbor's data",
  },
];

export function GuardrailsPanel() {
  const [state, setState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GUARDRAILS.map((g) => [g.id, g.on])),
  );
  const toggle = (g: Guardrail, on: boolean) => {
    setState((s) => ({ ...s, [g.id]: on }));
    toast(`${on ? "On" : "Off"} · ${g.label}`, {
      description: "Change logged to the ledger · applies from the next run",
    });
  };
  return (
    <Panel
      title="Guardrails"
      description="What the agents may do on their own. The first line cannot be switched off."
      padded={false}
    >
      <ul className="divide-y divide-slate-100">
        {GUARDRAILS.map((g) => {
          const on = state[g.id] ?? g.on;
          return (
            <li
              key={g.id}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <div className="min-w-0">
                <div className="text-slate-800 text-sm">{g.label}</div>
                {g.note ? (
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500">
                    {g.locked ? <Lock className="size-3" /> : null}
                    {g.note}
                  </div>
                ) : null}
              </div>
              <Switch
                checked={on}
                disabled={g.locked}
                onCheckedChange={(v) => toggle(g, v)}
                aria-label={g.label}
                className="data-[state=checked]:bg-indigo-600"
              />
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
