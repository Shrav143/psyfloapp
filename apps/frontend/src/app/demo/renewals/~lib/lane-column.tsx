"use client";

import type { RenewalLane } from "@/lib/demo/derive";
import { money } from "@/lib/demo/format";
import { EmptyState } from "@/lib/demo-ui/primitives";
import { cn } from "@/lib/tailwind-utils";
import {
  LANE_HINT,
  LANE_LABEL,
  laneTotals,
  type RadarRow,
} from "./radar-model";
import { RenewalCard } from "./renewal-card";

const DOT: Record<RenewalLane, string> = {
  overdue: "bg-rose-500",
  this_week: "bg-amber-500",
  next_30: "bg-slate-400",
};
const EMPTY: Record<RenewalLane, string> = {
  overdue: "Nothing overdue for this site. Keep it that way.",
  this_week: "No file-by dates inside 7 days.",
  next_30: "No file-by dates between 8 and 30 days out.",
};

export function LaneColumn({
  lane,
  rows,
  assumeBackdated,
}: {
  lane: RenewalLane;
  rows: RadarRow[];
  assumeBackdated: boolean;
}) {
  const t = laneTotals(rows);
  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-slate-100/70">
      <header className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", DOT[lane])} />
            <h2 className="font-semibold text-slate-900 text-sm">
              {LANE_LABEL[lane]}
            </h2>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700 text-xs tabular-nums">
              {t.count}
            </span>
          </div>
          <div className="text-slate-600 text-xs tabular-nums">
            {t.hours} h · {money(t.cost)}
          </div>
        </div>
        {lane === "overdue" && t.gapValue > 0 ? (
          <div className="mt-1 font-medium text-rose-600 text-xs">
            {money(t.gapValue)} unbilled across {t.gapDays} gap days ·{" "}
            {assumeBackdated ? "recoverable if backdated" : "lost"}
          </div>
        ) : null}
        <div className="mt-1 text-[11px] text-slate-500">{LANE_HINT[lane]}</div>
      </header>
      <div className="space-y-2 px-2 pb-2">
        {rows.length === 0 ? (
          <EmptyState title="Clear" body={EMPTY[lane]} />
        ) : (
          rows.map((r) => (
            <RenewalCard
              key={r.auth.id}
              row={r}
              assumeBackdated={assumeBackdated}
            />
          ))
        )}
      </div>
    </section>
  );
}
