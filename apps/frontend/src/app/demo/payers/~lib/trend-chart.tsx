"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { firstPassTrend } from "@/lib/demo/analytics";
import { MCO_IDS, PAYER_BY_ID } from "@/lib/demo/payers";
import { Panel } from "@/lib/demo-ui/primitives";
import { MANDATE_QUARTER } from "./scorecard-model";

export function TrendChart() {
  const data = firstPassTrend();
  return (
    <Panel
      title="First-pass approval by plan, six quarters"
      description="Share of decided initial and renewal requests approved in full at first decision. Each point is computed from that quarter's versions in the ledger; nothing is smoothed or projected."
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 12, right: 16, left: -10, bottom: 0 }}
          >
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
            <YAxis
              domain={[50, 90]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(v: number) => `${v}%`}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <ReferenceLine
              x={MANDATE_QUARTER}
              stroke="#94a3b8"
              strokeDasharray="4 4"
              label={{
                value: "KY PA mandate",
                position: "insideTopLeft",
                fontSize: 11,
                fill: "#64748b",
              }}
            />
            {MCO_IDS.map((id) => (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                name={PAYER_BY_ID[id].short}
                stroke={PAYER_BY_ID[id].color}
                strokeWidth={id === "wellcare" ? 3 : 1.75}
                dot={{ r: 2.5 }}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 text-slate-500 text-xs">
        Reference line: the Kentucky prior-authorization mandate effective July
        2025 ({MANDATE_QUARTER}) — 7-day decision rule, PA metrics published
        annually from 2026. WellCare (thick line) starts falling two quarters
        later; every other plan moves within 2 pts.
      </div>
    </Panel>
  );
}
