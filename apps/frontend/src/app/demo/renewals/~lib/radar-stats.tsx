"use client";

import type { RenewalLane } from "@/lib/demo/derive";
import { CLINICIAN_RATE, money } from "@/lib/demo/format";
import { StatTile } from "@/lib/demo-ui/primitives";
import { HOURS_PER_PACKET, laneTotals, type RadarRow } from "./radar-model";

export function RadarStats({
  byLane,
  inFlight,
  assumeBackdated,
}: {
  byLane: Record<RenewalLane, RadarRow[]>;
  inFlight: number;
  assumeBackdated: boolean;
}) {
  const overdue = laneTotals(byLane.overdue);
  const week = laneTotals(byLane.this_week);
  const month = laneTotals(byLane.next_30);
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Overdue"
        value={overdue.count}
        tone="red"
        hint={
          overdue.gapValue > 0
            ? `${money(overdue.gapValue)} unbilled across ${overdue.gapDays} gap days · ${assumeBackdated ? "recoverable if backdated" : "lost"}`
            : "No gap days yet · file today"
        }
      />
      <StatTile
        label="This week"
        value={week.count}
        tone="amber"
        hint={`${week.hours} clinician hours · ${money(week.cost)} at $${CLINICIAN_RATE}/h`}
      />
      <StatTile
        label="Next 30 days"
        value={month.count}
        hint={`${month.hours} h · ${money(month.cost)} · ${HOURS_PER_PACKET} h per packet`}
      />
      <StatTile
        label="Renewals already in flight"
        value={inFlight}
        tone="green"
        hint="Filed and awaiting a decision. Off the radar by design."
      />
    </div>
  );
}
