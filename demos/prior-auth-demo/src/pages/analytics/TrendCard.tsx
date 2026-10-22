import { useState } from "react";
import { Card, CardBody, CardHeader, CHART, Segmented, TrendChart } from "@/components/ui";
import { MONTHS } from "@/data/decisions";
import type { Board } from "./board";
import type { CaseQuery } from "./query";
import { filterWords } from "./filters";
import { fmt, pctOf } from "./stats";

type Mode = "rate" | "count";

/** Approvals and denials by month for the last twelve months, as rates or as counts. A month is a button: it opens that month's cases. */
export function TrendCard({ board, onOpen }: { board: Board; onOpen: (q: CaseQuery) => void }) {
  const [mode, setMode] = useState<Mode>("rate");
  const { months, clinicMonths, period, filters } = board;
  const rate = (pick: (s: (typeof months)[number]["s"]) => number, list = months): (number | null)[] => list.map((m) => pctOf(pick(m.s), m.s.n));
  const approval = rate((s) => s.approved);
  const denial = rate((s) => s.notApproved);
  const clinic = clinicMonths ? rate((s) => s.approved, clinicMonths) : null;
  const words = filterWords(filters);
  const known = [...approval, ...denial, ...(clinic ?? [])].filter((v): v is number => v !== null);
  const yMin = known.length ? Math.max(0, Math.floor((Math.min(...known) - 8) / 10) * 10) : 0;
  const yMax = known.length ? Math.min(100, Math.ceil((Math.max(...known) + 8) / 10) * 10) : 100;
  const first = approval.findIndex((v) => v !== null);
  const last = approval.length - 1 - [...approval].reverse().findIndex((v) => v !== null);
  const summary =
    first >= 0
      ? `Approved as requested: ${approval[first]}% in ${MONTHS[first].label}, ${approval[last]}% in ${MONTHS[last].label}. Denial rate: ${denial[first]}% then ${denial[last]}%.${clinic ? ` The clinic's approval rate across all payers went from ${clinic[first] ?? "-"}% to ${clinic[last] ?? "-"}%.` : ""}`
      : "No decisions in this view.";
  const details = MONTHS.map((m) => m.range);
  const openMonth = (i: number) => onOpen({ month: i, title: `Decisions in ${MONTHS[i].long}`, note: `Every decision from ${MONTHS[i].range}${words ? `, for ${words}` : ""}. A month runs from the 21st to the 20th, so the last one ends on the demo date.` });
  return (
    <Card data-testid="trend-card">
      <CardHeader
        title="Approvals and denials by month"
        subtitle={`${words ? `${words}. ` : ""}Twelve months to 20 Oct 2026. Click a month to see its cases.`}
        right={
          <Segmented
            items={[
              { id: "rate", label: "Rate" },
              { id: "count", label: "Count" },
            ]}
            value={mode}
            onChange={setMode}
          />
        }
      />
      <CardBody>
        {mode === "rate" ? (
          <TrendChart
            ariaLabel="Approval and denial rate by month"
            labels={MONTHS.map((m) => m.label)}
            details={details}
            height={280}
            format={(v) => `${Math.round(v)}%`}
            yMin={yMin}
            yMax={yMax}
            highlight={{ from: period.months[0], to: period.months[1], label: period.label }}
            onPoint={openMonth}
            extra={(i) => `${fmt(months[i].s.n)} decisions in the month`}
            series={[
              { key: "approval", name: "Approved as requested", color: CHART.good, values: approval, area: true },
              { key: "denial", name: "Denied or cut back", color: CHART.risk, values: denial },
              ...(clinic ? [{ key: "clinic", name: "Clinic approval rate, all payers", color: CHART.neutral, values: clinic, dashed: true }] : []),
            ]}
            summary={summary}
            table={{ caption: "Decisions by month", head: ["Month", "Decisions", "Approved as requested", "Approved in part", "Denied", "Approval rate", "Denial rate"], rows: months.map((m, i) => [m.month.range, m.s.n, m.s.approved, m.s.partial, m.s.denied, approval[i] === null ? "-" : `${approval[i]}%`, denial[i] === null ? "-" : `${denial[i]}%`]) }}
          />
        ) : (
          <TrendChart
            ariaLabel="Decisions by month and outcome"
            labels={MONTHS.map((m) => m.label)}
            details={details}
            height={280}
            stacked
            format={(v) => fmt(Math.round(v))}
            highlight={{ from: period.months[0], to: period.months[1], label: period.label }}
            onPoint={openMonth}
            series={[
              { key: "approved", name: "Approved as requested", color: CHART.good, values: months.map((m) => m.s.approved) },
              { key: "partial", name: "Approved in part", color: CHART.mid, values: months.map((m) => m.s.partial) },
              { key: "denied", name: "Denied", color: CHART.risk, values: months.map((m) => m.s.denied) },
            ]}
            summary={`Decisions by month, stacked by outcome. ${MONTHS[first]?.label ?? ""} ${fmt(months[first]?.s.n ?? 0)}, ${MONTHS[last]?.label ?? ""} ${fmt(months[last]?.s.n ?? 0)}.`}
            table={{ caption: "Decisions by month", head: ["Month", "Decisions", "Approved as requested", "Approved in part", "Denied"], rows: months.map((m) => [m.month.range, m.s.n, m.s.approved, m.s.partial, m.s.denied]) }}
          />
        )}
      </CardBody>
    </Card>
  );
}
