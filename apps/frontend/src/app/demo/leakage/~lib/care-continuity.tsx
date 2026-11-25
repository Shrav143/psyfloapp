"use client";

import { Panel } from "@/lib/demo-ui/primitives";
import { Pill } from "@/lib/demo-ui/status-badge";

/** Static demo figures; the product derives these from pause and discharge events. */
const FIGURES = [
  {
    label: "Patients paused during appeal",
    value: 4,
    note: "Care stopped while a written appeal ran",
  },
  {
    label: "Days paused, total",
    value: 61,
    note: "Across the four patients",
  },
  {
    label: "Discharged after final denial",
    value: 3,
    note: "No further TRP; referred out",
  },
  {
    label: "Returned after a pause",
    value: 2,
    note: "Resumed TRP once the appeal was won",
  },
];

export function CareContinuity() {
  return (
    <Panel
      title="Care continuity"
      description="Not a revenue metric; the one a nonprofit board asks about. Every pause and discharge is an event in the ledger, so the count is exact rather than remembered."
      right={<Pill tone="amber">Demo figures</Pill>}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {FIGURES.map((f) => (
          <div key={f.label} className="rounded-lg bg-slate-50 p-3">
            <div className="text-slate-500 text-xs">{f.label}</div>
            <div className="mt-0.5 font-semibold text-2xl text-slate-900 tabular-nums">
              {f.value}
            </div>
            <div className="text-slate-500 text-xs">{f.note}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-slate-500 text-xs">
        Static demo numbers, labelled as such. In production each figure links
        to the patients behind it, by MRN only.
      </p>
    </Panel>
  );
}
