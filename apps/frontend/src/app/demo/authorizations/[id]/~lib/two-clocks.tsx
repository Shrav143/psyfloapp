"use client";

import type { Clocks } from "@/lib/demo/derive";
import { fmtDate } from "@/lib/demo/format";
import type { Payer } from "@/lib/demo/types";
import { Panel } from "@/lib/demo-ui/primitives";
import { cn } from "@/lib/tailwind-utils";

function Gauge({
  label,
  used,
  total,
  unit,
  tone,
  sub,
}: {
  label: string;
  used: number;
  total: number;
  unit: string;
  tone: "indigo" | "slate" | "rose";
  sub: string;
}) {
  const pctUsed = total ? Math.min(100, (used / total) * 100) : 0;
  const bar =
    tone === "rose"
      ? "bg-rose-500"
      : tone === "indigo"
        ? "bg-indigo-500"
        : "bg-slate-500";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="font-medium text-slate-700 text-sm">{label}</div>
        <div className="text-slate-500 text-xs">{sub}</div>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-semibold text-3xl text-slate-900 tabular-nums tracking-tight">
          {used}
        </span>
        <span className="text-slate-500">
          of {total} {unit}
        </span>
        <span className="ml-auto font-medium text-slate-700 text-sm tabular-nums">
          {Math.max(0, total - used)} remaining
        </span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn("h-full rounded-full transition-all", bar)}
          style={{ width: `${pctUsed}%` }}
        />
      </div>
    </div>
  );
}

export function TwoClocks({ clocks, payer }: { clocks: Clocks; payer: Payer }) {
  const v = clocks.version;
  const unitsBind = clocks.binding === "units";
  const overdue = clocks.fileBy < "2026-09-21";
  return (
    <Panel
      title="Two clocks"
      description="An authorization is not a yes/no flag. Units are drawn down by attendance; the window runs regardless. Whichever hits first ends it."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Gauge
          label="Units"
          used={clocks.unitsUsed}
          total={v.unitsGranted}
          unit="units"
          tone={unitsBind ? "indigo" : "slate"}
          sub={`${v.unitsGranted} of ${v.unitsAsked} asked · granted ${v.decidedAt ? fmtDate(v.decidedAt) : ""}`}
        />
        <Gauge
          label="Days"
          used={clocks.daysElapsed}
          total={clocks.daysElapsed + clocks.daysRemaining}
          unit="days"
          tone={unitsBind ? "slate" : "indigo"}
          sub={`${fmtDate(v.windowStart)} → ${fmtDate(v.windowEnd)}`}
        />
      </div>
      <div className="mt-5 rounded-lg border border-indigo-100 bg-indigo-50/60 p-4 text-slate-800 text-sm leading-relaxed">
        At the current <strong>{clocks.perWeek} visits a week</strong>, units
        run out <strong>{fmtDate(clocks.exhaustionDate)}</strong>. The window
        closes <strong>{fmtDate(clocks.windowEnd)}</strong>.{" "}
        <strong>
          {unitsBind ? "Units bind first." : "The window binds first."}
        </strong>{" "}
        <span
          className={
            overdue
              ? "font-semibold text-rose-700"
              : "font-semibold text-indigo-700"
          }
        >
          {overdue
            ? `Renewal should have been filed by ${fmtDate(clocks.fileBy)}.`
            : `File the renewal by ${fmtDate(clocks.fileBy)} to avoid a gap.`}
        </span>{" "}
        <span className="text-slate-600">
          Lead time is {payer.medianDecisionDays} days median turnaround for{" "}
          {payer.short} plus a 5-day buffer.
        </span>
        {clocks.strandedUnits > 3 ? (
          <span className="mt-2 block text-amber-800">
            {clocks.strandedUnits} units will be stranded when the window closes
            at this attendance. Next renewal should ask for fewer, or attendance
            needs attention.
          </span>
        ) : null}
      </div>
    </Panel>
  );
}
