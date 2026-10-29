"use client";

import { Download, MessageSquareText } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/lib/core-ui/select";
import {
  addDays,
  CLINICIAN_RATE,
  DEMO_TODAY,
  fmtDate,
  money,
  VISIT_RATE,
} from "@/lib/demo/format";
import { type LeakTag, leakageReport } from "@/lib/demo/leakage";
import { useDemoStore } from "@/lib/demo/store";
import { PageHeader, StatTile } from "@/lib/demo-ui/primitives";
import { CareContinuity } from "./care-continuity";
import { ClinicianTime } from "./clinician-time";
import { LeakageChart } from "./leakage-chart";
import { downloadWaterfallCsv } from "./leakage-csv";
import { LeakageTable } from "./leakage-table";

const PERIODS = [30, 90, 180] as const;
type Period = (typeof PERIODS)[number];

const TILES: {
  tag: LeakTag;
  label: string;
  hint: string;
  tone: "red" | "amber" | "slate";
}[] = [
  {
    tag: "preventable",
    label: "Preventable",
    hint: "What the product sells against",
    tone: "red",
  },
  {
    tag: "recoverable",
    label: "Recoverable",
    hint: "An appeal could still win it",
    tone: "amber",
  },
  {
    tag: "structural",
    label: "Structural",
    hint: "Medicaid patients cannot be billed",
    tone: "slate",
  },
];

export function LeakageClient() {
  const [days, setDays] = useState<Period>(90);
  const [tag, setTag] = useState<LeakTag | "all">("all");
  const setAskOpen = useDemoStore((s) => s.setAskOpen);
  const report = useMemo(() => leakageReport(days), [days]);
  const rows =
    tag === "all" ? report.rows : report.rows.filter((r) => r.tag === tag);
  const since = addDays(DEMO_TODAY, -days);
  const rate = money(VISIT_RATE, { cents: true });

  const exportCsv = () => {
    downloadWaterfallCsv(report.rows, days);
    toast.success("Exported · demo", {
      description: `Waterfall, last ${days} days · ${report.rows.length} causes · ${money(report.total)}`,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="The waterfall, continuously"
        title="Leakage report"
        description="Tracy builds this once a month by pulling charges, payments and the approval spreadsheet into Claude. This produces it continuously from the ledger."
        actions={
          <>
            <Select
              value={String(days)}
              onValueChange={(v) => setDays(Number(v) as Period)}
            >
              <SelectTrigger size="sm" className="w-[150px] bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    Last {p} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="size-4" /> Export waterfall (CSV)
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setAskOpen(true)}
            >
              <MessageSquareText className="size-4" /> Ask Psyflo about this
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TILES.map((t) => (
          <StatTile
            key={t.tag}
            label={t.label}
            value={money(report.totals[t.tag])}
            hint={t.hint}
            tone={t.tone}
            active={tag === t.tag}
            onClick={() => setTag(tag === t.tag ? "all" : t.tag)}
          />
        ))}
        <StatTile
          label="Total"
          value={money(report.total)}
          hint={`${fmtDate(since, true)} – ${fmtDate(DEMO_TODAY, true)} · at ${rate} per visit day`}
          active={tag === "all"}
          onClick={() => setTag("all")}
        />
      </div>
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs">
        <span className="font-medium text-indigo-900">
          Say this before she does:{" "}
        </span>
        <span className="text-indigo-900/80">
          figures are modelled at the Kentucky H2020 rate of {rate} per visit
          day and clinician time at {money(CLINICIAN_RATE)} per hour; contracted
          rates may differ, and every row re-prices the day a contracted rate is
          entered. Nothing here is a prediction — each row is a count of visits
          in the ledger times a rate you can see.
        </span>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <LeakageTable
          rows={rows}
          filtered={tag !== "all"}
          onClear={() => setTag("all")}
        />
        <LeakageChart rows={rows} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <ClinicianTime days={days} />
        <CareContinuity />
      </div>
    </div>
  );
}
