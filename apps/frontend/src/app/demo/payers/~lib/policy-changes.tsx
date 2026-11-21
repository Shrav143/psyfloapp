"use client";

import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import { fmtDate } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import { POLICY_CHANGES, type PolicyChange } from "@/lib/demo/policy-changes";
import { useDemoStore } from "@/lib/demo/store";
import { Panel, PayerChip } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";
import { cn } from "@/lib/tailwind-utils";

export function PolicyChangeCard({
  change,
  compact,
}: {
  change: PolicyChange;
  compact?: boolean;
}) {
  const inStore = useDemoStore((s) =>
    s.acknowledgedPolicies.includes(change.id),
  );
  const acknowledge = useDemoStore((s) => s.acknowledgePolicy);
  const acknowledged = inStore || change.acknowledged;
  const payer = PAYER_BY_ID[change.payerId];
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        acknowledged
          ? "border-slate-200 bg-white"
          : "border-amber-200 bg-amber-50/40",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-slate-900 text-sm">
            {change.title}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500 text-xs">
            {compact ? null : (
              <PayerChip color={payer.color} name={payer.short} />
            )}
            <span>Effective {fmtDate(change.effectiveDate, true)}</span>
            <span>Detected {fmtDate(change.detectedAt, true)}</span>
          </div>
        </div>
        {acknowledged ? (
          <Pill tone="green">
            <CheckCircle2 className="size-3" /> Acknowledged
          </Pill>
        ) : (
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              acknowledge(change.id);
              toast.success("Policy change acknowledged", {
                description: `${payer.short} · ${change.title} · recorded for Tracy C., nothing is overwritten`,
              });
            }}
          >
            Acknowledge
          </Button>
        )}
      </div>
      <p className="mt-2 text-slate-700 text-sm">{change.summary}</p>
      <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[auto_1fr]">
        <dt className="text-slate-500">Impact</dt>
        <dd className="text-slate-800">{change.impact}</dd>
        <dt className="text-slate-500">Source</dt>
        <dd className="text-slate-800">{change.source}</dd>
      </dl>
    </div>
  );
}

export function PolicyChangesPanel() {
  const acknowledgedIds = useDemoStore((s) => s.acknowledgedPolicies);
  const changes = [...POLICY_CHANGES].sort((a, b) =>
    a.detectedAt < b.detectedAt ? 1 : -1,
  );
  const open = changes.filter(
    (c) => !c.acknowledged && !acknowledgedIds.includes(c.id),
  ).length;
  return (
    <Panel
      title="Policy changes detected"
      description="Provider bulletins, manuals and UM guidelines are read on a schedule; a change becomes a dated event with its source. Acknowledging records who saw it and when."
      right={
        open ? (
          <Pill tone="amber">{open} unacknowledged</Pill>
        ) : (
          <Pill tone="green">All acknowledged</Pill>
        )
      }
    >
      <div className="space-y-3">
        {changes.map((c) => (
          <PolicyChangeCard key={c.id} change={c} />
        ))}
      </div>
    </Panel>
  );
}
