"use client";

import { payerScorecard } from "@/lib/demo/analytics";
import { pct } from "@/lib/demo/format";
import { QUARTERS } from "@/lib/demo/payers";
import type { Payer } from "@/lib/demo/types";
import { Panel, StatTile } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";
import { DOC_TONE, type PacketGap } from "./packet-model";

export function ReadinessPanel({
  payer,
  gaps,
}: {
  payer: Payer;
  gaps: PacketGap[];
}) {
  const row = payerScorecard().find((r) => r.payerId === payer.id);
  const quarter = QUARTERS[QUARTERS.length - 1] ?? "";
  return (
    <Panel
      title="Approval readiness"
      description={`What ${payer.short} actually did with Harbor's requests, and what is still missing from this one.`}
      right={<Pill tone="slate">Observed, not predicted</Pill>}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="First-pass approval"
          value={row ? pct(row.firstPass) : "—"}
          hint={
            row
              ? `${payer.short} · ${quarter}`
              : "No MCO scorecard for this payer"
          }
          tone={row && row.firstPass < 0.7 ? "amber" : "slate"}
        />
        <StatTile
          label="Partial rate"
          value={row ? pct(row.partial) : "—"}
          hint="granted fewer units than asked"
          tone={row && row.partial >= 0.2 ? "amber" : "slate"}
        />
        <StatTile
          label="Median decision"
          value={`${payer.medianDecisionDays} days`}
          hint={`${payer.decisionSlaDays}-day rule`}
          tone={
            payer.medianDecisionDays > payer.decisionSlaDays ? "red" : "slate"
          }
        />
      </div>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="font-medium text-slate-900 text-sm">
          Gaps: {gaps.length}
        </div>
        {gaps.length ? (
          <ul className="mt-1.5 space-y-1">
            {gaps.map((g) => (
              <li
                key={g.name}
                className="flex items-center gap-2 text-slate-700 text-sm"
              >
                <Pill tone={DOC_TONE[g.status]}>{g.status}</Pill>
                {g.name}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-1 text-slate-600 text-xs">
            No gaps. Every required document is attached and in date.
          </div>
        )}
      </div>
      <p className="mt-3 text-slate-500 text-xs">
        We do not score approval odds until it is calibrated on your data. The
        three numbers above are {payer.short}'s observed decisions on Harbor's
        own requests.
      </p>
    </Panel>
  );
}
