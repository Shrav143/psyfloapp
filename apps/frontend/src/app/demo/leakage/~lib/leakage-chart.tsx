"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money } from "@/lib/demo/format";
import type { LeakRow, LeakTag } from "@/lib/demo/leakage";
import { Panel } from "@/lib/demo-ui/primitives";

export const TAG_COLOR: Record<LeakTag, string> = {
  preventable: "#f43f5e",
  recoverable: "#f59e0b",
  structural: "#94a3b8",
};

const SHORT: Record<string, string> = {
  intake_lag: "Intake lag",
  awaiting_decision: "Awaiting decision",
  units_exhausted: "Units exhausted",
  window_expired: "Window expired",
  denied_in_appeal: "Denied, in appeal",
  no_auth: "No auth on file",
  eligibility_lapsed: "Coverage lapsed",
  partial_shortfall: "Partial shortfall",
  discharged: "Discharged after denial",
};

export function LeakageChart({ rows }: { rows: LeakRow[] }) {
  const data = [...rows]
    .sort((a, b) => b.value - a.value)
    .map((r) => ({ ...r, short: SHORT[r.key] ?? r.label }));
  return (
    <Panel
      title="Value by cause"
      description="Same rows, sorted by value. Colour is the tag."
    >
      <div style={{ height: Math.max(220, data.length * 38 + 24) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => money(Number(v))}
            />
            <YAxis
              type="category"
              dataKey="short"
              width={150}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(v: number) => money(v)}
              contentStyle={{ fontSize: 12 }}
              cursor={{ fill: "#f1f5f9" }}
            />
            <Bar
              dataKey="value"
              name="Value"
              radius={[0, 4, 4, 0]}
              maxBarSize={22}
            >
              {data.map((r) => (
                <Cell key={r.key} fill={TAG_COLOR[r.tag]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-slate-600 text-xs">
        {(Object.keys(TAG_COLOR) as LeakTag[]).map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: TAG_COLOR[tag] }}
            />
            {tag}
          </span>
        ))}
      </div>
    </Panel>
  );
}
