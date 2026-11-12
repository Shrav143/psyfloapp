"use client";

import { useMemo, useState } from "react";
import { getDataset, visitDatesFor } from "@/lib/demo/dataset";
import {
  clocksFor,
  coverageOn,
  renewalInFlight,
  renewalLane,
} from "@/lib/demo/derive";
import { DEMO_TODAY, fmtLongDate } from "@/lib/demo/format";
import { atRiskSeries, coverageToday, leakageReport } from "@/lib/demo/leakage";
import { useDemoStore } from "@/lib/demo/store";
import type { VisitReason } from "@/lib/demo/types";
import { PageHeader } from "@/lib/demo-ui/primitives";
import { AgentFeed } from "./agent-feed";
import { CoverageHero } from "./coverage-hero";
import { PatientList } from "./patient-list";
import { WorkQueue } from "./work-queue";

export type TodayRow = {
  mrn: string;
  initials: string;
  location: string;
  payerId: string;
  reason: VisitReason;
  short: string;
  authId: string;
  unitsRemaining?: number;
  daysRemaining?: number;
  fileBy?: string;
  status: string;
};

export function TodayClient() {
  const location = useDemoStore((s) => s.location);
  const [filter, setFilter] = useState<VisitReason | "all">("all");
  const ds = getDataset();

  const rows = useMemo<TodayRow[]>(() => {
    return ds.patients
      .filter(
        (p) =>
          p.onScheduleToday && (location === "both" || p.location === location),
      )
      .map((p) => {
        const auth = ds.authorizations.find((a) => a.mrn === p.mrn);
        const c = coverageOn(p, auth, visitDatesFor(p.mrn), DEMO_TODAY);
        const clocks = auth
          ? clocksFor(p, auth, visitDatesFor(p.mrn))
          : undefined;
        const short =
          c.reason === "units_exhausted" && clocks
            ? `${clocks.unitsUsed - clocks.version.unitsGranted + 1} over`
            : c.reason === "window_expired" && clocks
              ? `${Math.abs(clocks.daysRemaining)}d past`
              : "";
        return {
          mrn: p.mrn,
          initials: p.initials,
          location: p.location === "lex" ? "Lexington" : "Hopkinsville",
          payerId: p.payerId,
          reason: c.reason,
          short,
          authId: auth?.id ?? "",
          unitsRemaining: clocks?.unitsRemaining,
          daysRemaining: clocks?.daysRemaining,
          fileBy:
            clocks &&
            auth &&
            !renewalInFlight(auth) &&
            renewalLane(clocks.fileBy)
              ? clocks.fileBy
              : undefined,
          status: auth?.status ?? "draft",
        };
      });
  }, [ds, location]);

  const coverage = coverageToday();
  const series = atRiskSeries(30);
  const leak = leakageReport(30);
  const visible =
    filter === "all"
      ? rows.filter((r) => r.reason !== "covered")
      : rows.filter((r) => r.reason === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={fmtLongDate(DEMO_TODAY)}
        title="Of the patients on today's schedule, how many can we actually bill for?"
        description="Coverage is computed from the authorization ledger and this morning's attendance, not from a status flag. Click a cause to see who is behind it — each cause has a different fix and a different owner."
      />
      <CoverageHero
        rows={rows}
        coverage={coverage}
        series={series}
        monthValue={leak.totals.preventable + leak.totals.recoverable}
        filter={filter}
        onFilter={setFilter}
      />
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <PatientList
          rows={visible}
          filter={filter}
          onClear={() => setFilter("all")}
        />
        <div className="space-y-6">
          <WorkQueue />
          <AgentFeed />
        </div>
      </div>
    </div>
  );
}
