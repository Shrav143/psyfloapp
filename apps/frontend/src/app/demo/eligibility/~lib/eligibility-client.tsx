"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/lib/core-ui/tabs";
import { eligibilitySummary } from "@/lib/demo/eligibility";
import { useDemoStore } from "@/lib/demo/store";
import { PageHeader } from "@/lib/demo-ui/primitives";
import { cn } from "@/lib/tailwind-utils";
import {
  type EligRow,
  isException,
  rowsForLocation,
  sortRows,
} from "./elig-model";
import { MemberSheet } from "./member-sheet";
import { MemberTable, StatusChips, type StatusFilter } from "./member-table";
import { LapsedCallout, SummaryTiles } from "./summary-tiles";
import { VerifyActions } from "./verify-actions";
import { VerifySettings } from "./verify-settings";
import { WhyPanel } from "./why-panel";

type Tab = "exceptions" | "all" | "settings";

const DESCRIPTION =
  "Every morning at 06:10 the Verify agent re-checks every member with an appointment in the next 7 days — no button pressing in the EHR. It reads the mental-health benefit detail behind the 271 (carve-outs, coordination of benefits, daily limits, Medicare-first for dual-eligibles) and writes a one-line action for each exception. It never edits coverage on the chart.";

const TRIGGER =
  "px-3 text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900";

function Count({ n, tone }: { n: number; tone: "red" | "slate" }) {
  return (
    <span
      className={cn(
        "ml-1 rounded-full px-1.5 font-medium text-[10px] tabular-nums",
        tone === "red"
          ? "bg-rose-100 text-rose-700"
          : "bg-slate-200 text-slate-700",
      )}
    >
      {n}
    </span>
  );
}

export function EligibilityClient() {
  const location = useDemoStore((s) => s.location);
  const [tab, setTab] = useState<Tab>("exceptions");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [resolved, setResolved] = useState<string[]>([]);
  const [selected, setSelected] = useState<EligRow | undefined>();
  const summary = eligibilitySummary();

  const siteRows = useMemo(() => rowsForLocation(location), [location]);
  const exceptionRows = useMemo(
    () =>
      sortRows(
        siteRows.filter(
          (r) => isException(r.status) && !resolved.includes(r.id),
        ),
        "severity",
      ),
    [siteRows, resolved],
  );
  const allRows = useMemo(() => sortRows(siteRows, "appointment"), [siteRows]);
  const lapsed = exceptionRows.find((r) => r.status === "inactive");
  const byStatus = (rows: EligRow[]) =>
    statusFilter === "all"
      ? rows
      : rows.filter((r) => r.status === statusFilter);

  const switchTab = (next: Tab) => {
    setTab(next);
    setStatusFilter("all");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rolling 7-day verification"
        description={DESCRIPTION}
        actions={<VerifyActions summary={summary} />}
      />
      <SummaryTiles
        summary={summary}
        onExceptions={() => switchTab("exceptions")}
        onLapsed={() => {
          if (lapsed) {
            setSelected(lapsed);
          } else {
            switchTab("exceptions");
          }
        }}
        onMedicare={() => {
          switchTab("exceptions");
          setStatusFilter("medicare_first");
        }}
      />
      {lapsed ? <LapsedCallout row={lapsed} /> : null}
      <Tabs value={tab} onValueChange={(v) => switchTab(v as Tab)}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="exceptions" className={TRIGGER}>
            Exceptions <Count n={exceptionRows.length} tone="red" />
          </TabsTrigger>
          <TabsTrigger value="all" className={TRIGGER}>
            All members <Count n={allRows.length} tone="slate" />
          </TabsTrigger>
          <TabsTrigger value="settings" className={TRIGGER}>
            What Verify checks
          </TabsTrigger>
        </TabsList>
        <TabsContent value="exceptions" className="space-y-3 pt-2">
          <StatusChips
            rows={exceptionRows}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <MemberTable
            title="Exceptions"
            description="Everything that is not a clean 'verified'. The action line is written by Verify from the benefit detail; a person decides what to do with it. Click a row for the full 271."
            rows={byStatus(exceptionRows)}
            resolved={resolved}
            onSelect={setSelected}
            emptyTitle="No exceptions"
            emptyBody="Every member with an appointment in the next 7 days is verified."
          />
        </TabsContent>
        <TabsContent value="all" className="space-y-3 pt-2">
          <StatusChips
            rows={allRows}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <MemberTable
            title="All members"
            description="Every member with an appointment in the next 7 days, including the clean results. Verified rows carry the same benefit detail."
            rows={byStatus(allRows)}
            resolved={resolved}
            onSelect={setSelected}
            emptyTitle="No members match"
            emptyBody="Clear the status filter or switch sites."
          />
        </TabsContent>
        <TabsContent value="settings" className="pt-2">
          <VerifySettings rows={siteRows} />
        </TabsContent>
      </Tabs>
      <WhyPanel />
      <MemberSheet
        row={selected}
        resolved={selected ? resolved.includes(selected.id) : false}
        onClose={() => setSelected(undefined)}
        onResolve={(id) =>
          setResolved((r) => (r.includes(id) ? r : [...r, id]))
        }
      />
    </div>
  );
}
