"use client";

import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import { Input } from "@/lib/core-ui/input";
import { payerScorecard } from "@/lib/demo/analytics";
import { DEMO_TODAY, fmtDate, pct } from "@/lib/demo/format";
import { POLICY_CHANGES } from "@/lib/demo/policy-changes";
import { useDemoStore } from "@/lib/demo/store";
import { Panel } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";
import { DocChecklist } from "./doc-checklist";
import { RuleTupleCard } from "./rule-tuple-card";
import type { StepProps } from "./wizard-model";

export function StepRequirements({ state, ctx, patch }: StepProps) {
  const { payer, docs, windowEnd } = ctx;
  const acknowledged = useDemoStore((s) => s.acknowledgedPolicies);
  const acknowledgePolicy = useDemoStore((s) => s.acknowledgePolicy);
  const changes = POLICY_CHANGES.filter(
    (c) =>
      c.payerId === payer.id && !c.acknowledged && !acknowledged.includes(c.id),
  );
  const row = payerScorecard().find((r) => r.payerId === payer.id);
  const overCap = payer.unitCap !== undefined && state.units > payer.unitCap;
  const request = (name: string) => {
    patch({ requested: [...state.requested, name] });
    toast.success(`Requested from ${state.signer}`, {
      description: `${name} · task added to the clinician queue. The packet stays in draft until it lands.`,
    });
  };
  return (
    <div className="space-y-6">
      {changes.map((c) => (
        <div
          key={c.id}
          className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{c.title}</span>
              <Pill tone="amber">Checklist updated</Pill>
            </div>
            <div className="mt-0.5 text-amber-800 text-xs">
              {c.summary} Effective {fmtDate(c.effectiveDate, true)} ·{" "}
              {c.source}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              acknowledgePolicy(c.id);
              toast.success("Policy change acknowledged", {
                description: c.title,
              });
            }}
          >
            Acknowledge
          </Button>
        </div>
      ))}
      <RuleTupleCard payer={payer} />
      <DocChecklist
        docs={docs}
        requested={state.requested}
        onRequest={request}
      />
      <Panel
        title="Units and window"
        description="Ask for what the payer has actually granted, not what the form allows."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="units"
              className="mb-1 block font-medium text-slate-700 text-xs"
            >
              Units to request
            </label>
            <Input
              id="units"
              type="number"
              min={1}
              max={120}
              value={state.units}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                patch({ units: Number.isFinite(n) ? Math.max(0, n) : 0 });
              }}
              className="bg-white"
            />
            <p className="mt-1.5 text-slate-500 text-xs">
              {row
                ? `Observed: ${payer.short} granted an average of ${row.avgGranted} of ${row.avgAsked} asked over the last two quarters; first-pass approval ${pct(row.firstPass)}.`
                : `No observed MCO history for ${payer.short}. Decision SLA ${payer.decisionSlaDays} days.`}
            </p>
            {overCap ? (
              <p className="mt-1 text-amber-700 text-xs">
                Above {payer.short}'s cap of {payer.unitCap}. Expect a partial;
                the ledger will record asked against granted.
              </p>
            ) : null}
          </div>
          <div>
            <label
              htmlFor="window-start"
              className="mb-1 block font-medium text-slate-700 text-xs"
            >
              Window start
            </label>
            <Input
              id="window-start"
              type="date"
              value={state.windowStart}
              onChange={(e) =>
                patch({ windowStart: e.target.value || DEMO_TODAY })
              }
              className="bg-white"
            />
            <p className="mt-1.5 text-slate-500 text-xs">
              Ends {fmtDate(windowEnd, true)} · {payer.typicalWindowDays}-day
              window computed from the start date.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
