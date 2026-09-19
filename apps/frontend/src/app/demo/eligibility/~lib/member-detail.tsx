"use client";

import { useMemo } from "react";
import { fmtDate, money, relativeDays } from "@/lib/demo/format";
import { LiveRun } from "@/lib/demo-ui/agent-run";
import { KV } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";
import type { EligRow } from "./elig-model";
import { rerunScript } from "./run-scripts";

export type RerunPhase = "idle" | "running" | "done";

function YesNo({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return ok ? <Pill tone="green">{yes}</Pill> : <Pill tone="red">{no}</Pill>;
}

/** Everything the 271 (or the portal) said about this member's benefit. */
export function MemberFacts({ row }: { row: EligRow }) {
  return (
    <KV
      items={[
        { k: "Plan", v: row.planName },
        {
          k: "Member ID",
          v: <span className="font-mono">{row.memberId}</span>,
        },
        {
          k: "Coverage active",
          v: <YesNo ok={row.coverageActive} yes="Active" no="Inactive" />,
        },
        {
          k: "In-network",
          v: <YesNo ok={row.inNetwork} yes="In network" no="Out of network" />,
        },
        { k: "MH benefit", v: row.mhBenefit },
        { k: "Daily limit", v: row.dailyLimit },
        {
          k: "Copay",
          v: row.copay
            ? `${money(row.copay, { cents: true })} · collect at check-in`
            : "None",
        },
        { k: "Deductible remaining", v: money(row.deductibleRemaining) },
        { k: "Visits since last verified", v: row.visitsSinceVerified },
        { k: "Source", v: row.source },
        { k: "Checked at", v: row.checkedAt },
        {
          k: "Next recheck",
          v: `${fmtDate(row.nextRecheck)} · ${relativeDays(row.nextRecheck)}`,
        },
      ]}
    />
  );
}

/** A three-step single-member re-check, played inside the sheet. */
export function RerunBlock({
  row,
  phase,
  onDone,
}: {
  row: EligRow;
  phase: RerunPhase;
  onDone: () => void;
}) {
  const script = useMemo(() => rerunScript(row.source), [row.source]);
  if (phase === "idle") {
    return null;
  }
  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
      <div className="mb-2 font-medium text-[11px] text-indigo-900 uppercase tracking-wide">
        Rerun eligibility · {row.source}
      </div>
      <LiveRun script={script} running onDone={onDone} />
      {phase === "done" ? (
        <div className="mt-2 text-emerald-700 text-xs">
          No change since 06:10. The re-check is appended to the ledger; nothing
          on the chart was edited.
        </div>
      ) : null}
    </div>
  );
}
