"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/core-ui/select";
import type { RenewalLane } from "@/lib/demo/derive";
import { useDemoStore } from "@/lib/demo/store";
import { PageHeader } from "@/lib/demo-ui/primitives";
import { LaneColumn } from "./lane-column";
import { LeadTimePanel } from "./lead-time-panel";
import { OpenQuestionPanel } from "./open-question-panel";
import {
  buildRadar,
  countInFlight,
  LANES,
  laneTotals,
  type RadarRow,
} from "./radar-model";
import { RadarStats } from "./radar-stats";
import { WeekPlanPanel } from "./week-plan-panel";

const BUFFERS = [0, 3, 5, 7, 10];

function LeadBufferSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-500 text-xs">Lead-time buffer</span>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger size="sm" className="w-32 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BUFFERS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n === 0 ? "No buffer" : `+${n} days`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function RenewalsClient() {
  const location = useDemoStore((s) => s.location);
  const leadBufferDays = useDemoStore((s) => s.leadBufferDays);
  const setLeadBufferDays = useDemoStore((s) => s.setLeadBufferDays);
  const [assumeBackdated, setAssumeBackdated] = useState(false);
  const rows = useMemo(
    () => buildRadar(location, leadBufferDays),
    [location, leadBufferDays],
  );
  const inFlight = useMemo(() => countInFlight(location), [location]);
  const byLane = useMemo(() => {
    const out = { overdue: [], this_week: [], next_30: [] } as Record<
      RenewalLane,
      RadarRow[]
    >;
    for (const r of rows) {
      out[r.lane].push(r);
    }
    return out;
  }, [rows]);
  const overdue = laneTotals(byLane.overdue);

  const changeBuffer = (n: number) => {
    setLeadBufferDays(n);
    toast(`Lead-time buffer set to ${n} days`, {
      description:
        "File-by dates recomputed per payer: median turnaround plus buffer. Nothing is sent.",
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Renewal radar"
        description="Everything that must be filed in the next 30 days, ordered by which clock binds first. Lead time is each payer's median turnaround plus the buffer — set per payer, never one global number. The renewal date is derived from the ledger, never typed in."
        actions={
          <LeadBufferSelect value={leadBufferDays} onChange={changeBuffer} />
        }
      />
      <RadarStats
        byLane={byLane}
        inFlight={inFlight}
        assumeBackdated={assumeBackdated}
      />
      <div className="grid items-start gap-4 lg:grid-cols-3">
        {LANES.map((lane) => (
          <LaneColumn
            key={lane}
            lane={lane}
            rows={byLane[lane]}
            assumeBackdated={assumeBackdated}
          />
        ))}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <WeekPlanPanel rows={byLane.this_week} />
        <LeadTimePanel rows={rows} buffer={leadBufferDays} />
        <OpenQuestionPanel
          assumeBackdated={assumeBackdated}
          onChange={setAssumeBackdated}
          gapDays={overdue.gapDays}
          gapValue={overdue.gapValue}
        />
      </div>
    </div>
  );
}
