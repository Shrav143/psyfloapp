"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { REASON_LABEL, REASON_MEANING, visitValue } from "@/lib/demo/derive";
import { money } from "@/lib/demo/format";
import type { VisitReason } from "@/lib/demo/types";
import { cn } from "@/lib/tailwind-utils";
import type { TodayRow } from "./today-client";

const ORDER: VisitReason[] = [
  "awaiting_decision",
  "units_exhausted",
  "window_expired",
  "denied_in_appeal",
  "no_auth",
  "intake_lag",
  "eligibility_lapsed",
];
const OWNER: Record<string, string> = {
  awaiting_decision: "Payer clock",
  units_exhausted: "Our timing",
  window_expired: "Our timing",
  denied_in_appeal: "Payer behaviour",
  no_auth: "Process gap",
  intake_lag: "Intake",
  eligibility_lapsed: "Front desk",
};

export function CoverageHero({
  rows,
  coverage,
  series,
  monthValue,
  filter,
  onFilter,
}: {
  rows: TodayRow[];
  coverage: ReturnType<typeof import("@/lib/demo/leakage").coverageToday>;
  series: { date: string; value: number }[];
  monthValue: number;
  filter: VisitReason | "all";
  onFilter: (r: VisitReason | "all") => void;
}) {
  const scheduled = rows.length;
  const covered = rows.filter((r) => r.reason === "covered").length;
  const uncovered = scheduled - covered;
  const counts = ORDER.map((reason) => ({
    reason,
    n: rows.filter((r) => r.reason === reason).length,
  })).filter((c) => c.n > 0);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-6 p-6 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-semibold text-5xl text-slate-900 tracking-tight">
              {covered}
            </span>
            <span className="text-2xl text-slate-500">of {scheduled}</span>
            <span className="text-slate-700 text-xl">
              patients today are covered by an active authorization
            </span>
          </div>
          <div className="mt-2 text-slate-500 text-sm">
            {uncovered} are not. Value at risk today:{" "}
            <span className="font-semibold text-rose-600">
              {money(visitValue(uncovered))}
            </span>{" "}
            at $244.29 per visit day.{" "}
            {coverage.scheduled !== scheduled ? "Filtered by site." : ""}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onFilter("all")}
              className={cn(
                "rounded-full border px-3 py-1.5 font-medium text-xs",
                filter === "all"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              )}
            >
              All uncovered · {uncovered}
            </button>
            {counts.map((c) => (
              <button
                key={c.reason}
                type="button"
                onClick={() => onFilter(c.reason)}
                title={REASON_MEANING[c.reason]}
                className={cn(
                  "rounded-full border px-3 py-1.5 font-medium text-xs",
                  filter === c.reason
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                {REASON_LABEL[c.reason]} · {c.n} · {money(visitValue(c.n))}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-1 text-xs sm:grid-cols-2">
            {counts.map((c) => (
              <div
                key={c.reason}
                className="flex items-center gap-2 text-slate-500"
              >
                <span className="w-24 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-center text-[10px] text-slate-600 uppercase tracking-wide">
                  {OWNER[c.reason]}
                </span>
                <span>{REASON_MEANING[c.reason]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-baseline justify-between">
            <div className="text-slate-500 text-xs uppercase tracking-wide">
              Unbillable visits · last 30 days
            </div>
            <div className="font-semibold text-rose-600 text-sm">
              {money(series.reduce((n, s) => n + s.value, 0))}
            </div>
          </div>
          <div className="mt-2 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={series}
                margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="risk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  formatter={(v: number) => money(v)}
                  labelFormatter={(l) => String(l)}
                  contentStyle={{ fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fill="url(#risk)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-slate-500 text-xs">
            Preventable + recoverable leakage this month:{" "}
            <span className="font-medium text-slate-800">
              {money(monthValue)}
            </span>
            . Full breakdown on the Leakage screen.
          </div>
        </div>
      </div>
    </section>
  );
}
