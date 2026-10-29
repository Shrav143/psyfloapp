"use client";

import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Clocks } from "@/lib/demo/derive";
import { addDays, DEMO_TODAY, daysBetween, fmtDate } from "@/lib/demo/format";
import { Panel } from "@/lib/demo-ui/primitives";

export function AttendanceChart({
  clocks,
  visits,
  perWeekPlanned,
}: {
  clocks: Clocks;
  visits: string[];
  perWeekPlanned: number;
}) {
  const v = clocks.version;
  const total = daysBetween(v.windowStart, v.windowEnd);
  const data: {
    day: string;
    actual?: number;
    projected?: number;
    planned: number;
  }[] = [];
  let count = 0;
  for (let d = 0; d <= total; d += 3) {
    const date = addDays(v.windowStart, d);
    const planned = Math.round((d / 7) * perWeekPlanned * 10) / 10;
    if (date <= DEMO_TODAY) {
      count = visits.filter((x) => x >= v.windowStart && x <= date).length;
      data.push({
        day: date,
        actual: Math.min(count, v.unitsGranted),
        planned,
        projected:
          date === DEMO_TODAY || d + 3 > daysBetween(v.windowStart, DEMO_TODAY)
            ? count
            : undefined,
      });
    } else {
      const ahead = daysBetween(DEMO_TODAY, date);
      data.push({
        day: date,
        planned,
        projected: Math.min(
          v.unitsGranted,
          Math.round(clocks.unitsUsed + (ahead / 7) * clocks.perWeek),
        ),
      });
    }
  }
  return (
    <Panel
      title="Attendance against allocation"
      description="Cumulative visits climbing toward the approved ceiling. Too steep means renew early; too shallow means units will be stranded when the window closes."
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
          >
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="day"
              tickFormatter={(d) => fmtDate(String(d))}
              tick={{ fontSize: 11 }}
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              domain={[0, Math.max(v.unitsGranted, v.unitsAsked) + 5]}
            />
            <Tooltip
              labelFormatter={(l) => fmtDate(String(l))}
              contentStyle={{ fontSize: 12 }}
            />
            <ReferenceLine
              y={v.unitsGranted}
              stroke="#f43f5e"
              strokeDasharray="4 4"
              label={{
                value: `Approved ${v.unitsGranted}`,
                position: "insideTopRight",
                fontSize: 11,
                fill: "#e11d48",
              }}
            />
            <ReferenceLine
              x={DEMO_TODAY}
              stroke="#94a3b8"
              label={{
                value: "Today",
                position: "insideTop",
                fontSize: 11,
                fill: "#64748b",
              }}
            />
            <Line
              type="monotone"
              dataKey="planned"
              stroke="#cbd5e1"
              strokeWidth={1.5}
              dot={false}
              name="Planned"
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#4f46e5"
              strokeWidth={2.5}
              dot={false}
              name="Attended"
            />
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#4f46e5"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Projected"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-slate-500">Utilisation at window close</div>
          <div className="font-semibold text-slate-900">
            {Math.round(clocks.utilization * 100)}%
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-slate-500">Planned vs actual</div>
          <div className="font-semibold text-slate-900">
            {perWeekPlanned}/wk planned · {clocks.perWeek}/wk actual
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-slate-500">Units at risk of stranding</div>
          <div className="font-semibold text-slate-900">
            {clocks.strandedUnits}
          </div>
        </div>
      </div>
    </Panel>
  );
}
