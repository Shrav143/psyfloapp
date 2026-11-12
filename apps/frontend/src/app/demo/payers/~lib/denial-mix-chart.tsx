"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DENIAL_CATEGORY_LABEL, denialMix } from "@/lib/demo/analytics";
import type { DenialCategory } from "@/lib/demo/types";
import { Panel } from "@/lib/demo-ui/primitives";

const CATEGORY_COLOR: Record<DenialCategory, string> = {
  medical_necessity: "#f43f5e",
  documentation: "#f59e0b",
  missing_element: "#8b5cf6",
  eligibility: "#0891b2",
  policy_change: "#6366f1",
  no_reason: "#94a3b8",
};

const CATEGORIES = Object.keys(DENIAL_CATEGORY_LABEL) as DenialCategory[];

export function DenialMixChart() {
  const data = denialMix();
  const total = data.reduce(
    (n, row) => n + CATEGORIES.reduce((m, c) => m + Number(row[c] ?? 0), 0),
    0,
  );
  const noReason = data.reduce(
    (n, row) => n + Number(row["no_reason"] ?? 0),
    0,
  );
  return (
    <Panel
      title="Denial reasons by plan"
      description={`${total} denied versions across all history, stacked by the payer's stated category. "No reason given" is itself a finding: ${noReason} denials arrived without one.`}
    >
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 16, left: -20, bottom: 0 }}
          >
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="payer" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              cursor={{ fill: "#f1f5f9" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {CATEGORIES.map((c) => (
              <Bar
                key={c}
                dataKey={c}
                stackId="denials"
                name={DENIAL_CATEGORY_LABEL[c]}
                fill={CATEGORY_COLOR[c]}
                maxBarSize={48}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 text-slate-500 text-xs">
        Medical necessity denials are the peer-to-peer candidates; missing
        element and documentation denials are packet defects the checklist
        should have caught before sign-off.
      </div>
    </Panel>
  );
}
