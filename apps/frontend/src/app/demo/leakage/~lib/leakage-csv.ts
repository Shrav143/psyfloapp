import { DEMO_TODAY, VISIT_RATE } from "@/lib/demo/format";
import type { LeakRow } from "@/lib/demo/leakage";

function cell(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

/** The waterfall as CSV, one row per cause plus a totals row. Demo output. */
export function waterfallCsv(rows: LeakRow[], days: number): string {
  const header = [
    "cause",
    "visits_or_units",
    "value_usd",
    "tag",
    "recoverable",
    "period_days",
    "as_of",
    "rate_usd",
  ];
  const lines = rows.map((r) =>
    [
      r.label,
      r.visits,
      r.value,
      r.tag,
      r.recoverable,
      days,
      DEMO_TODAY,
      VISIT_RATE,
    ]
      .map(cell)
      .join(","),
  );
  const total = rows.reduce((n, r) => n + r.value, 0);
  lines.push(
    ["Total", "", total, "", "", days, DEMO_TODAY, VISIT_RATE]
      .map(cell)
      .join(","),
  );
  return [header.map(cell).join(","), ...lines].join("\n");
}

/** Trigger a browser download of the CSV. No-op during server rendering. */
export function downloadWaterfallCsv(rows: LeakRow[], days: number): void {
  if (typeof window === "undefined") {
    return;
  }
  const blob = new Blob([waterfallCsv(rows, days)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `psyflo-leakage-${days}d-demo.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}
