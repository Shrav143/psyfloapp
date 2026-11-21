"use client";

import type { Appeal } from "@/lib/demo/appeals";
import { money } from "@/lib/demo/format";
import { Panel } from "@/lib/demo-ui/primitives";
import { freeCareValue } from "../../~lib/appeal-helpers";

export function FreeCarePanel({ appeal }: { appeal: Appeal }) {
  const value = freeCareValue(appeal.freeCareDays);
  return (
    <Panel title="Free care during this appeal">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold text-2xl text-rose-600 tabular-nums">
          {appeal.freeCareDays} days
        </span>
        <span className="text-slate-500 text-sm">· {money(value)}</span>
      </div>
      <p className="mt-1 text-slate-500 text-xs">
        Days since the denial at $244.29 per visit day. Recovered if the appeal
        is won: the payer backdates to the request date.
      </p>
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700 text-xs">
        <span className="font-medium text-slate-900">Harbor's policy:</span>{" "}
        keep the patient attending during appeal when a pause would be harmful.
      </div>
    </Panel>
  );
}
