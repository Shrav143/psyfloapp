import { useState } from "react";
import { CHART, HBarChart, Segmented, type BarRow } from "@/components/ui";
import { PROGRAM_ORDER } from "@/data/analytics";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type BuiltInPayerId, type Program } from "@/data/types";
import type { Board, LosRow } from "./board";
import type { CaseQuery } from "./query";
import { enough, fmt } from "./stats";

type Tab = Program | "all";

/** Days or units asked for against days or units approved, by payer, for one level of care or all of them. A cut is an approval for less than was requested. */
export function LosSection({ board, onOpen }: { board: Board; onOpen: (q: CaseQuery) => void }) {
  const [tab, setTab] = useState<Tab>("all");
  const rows = board.los.filter((r) => r.program === tab && r.n > 0);
  const unit = tab === "all" ? "mixed" : tab === "IOP" ? "units" : "days";
  const max = tab === "all" ? 100 : Math.max(1, ...rows.map((r) => r.requested ?? 0));
  const bars: BarRow[] = rows
    .slice()
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))
    .map((r) => ({
      key: r.payer,
      label: payerById(r.payer).name,
      sub: `${fmt(r.n)} approvals · ${fmt(r.cuts)} cut`,
      value: tab === "all" ? r.pct : r.requested,
      value2: tab === "all" ? undefined : r.approved,
      display: tab === "all" ? (r.pct === null ? "-" : `${r.pct}%`) : `${r.requested}`,
      display2: tab === "all" ? undefined : `${r.approved} approved`,
      color: tab === "all" ? (r.pct !== null && r.pct < 80 ? CHART.risk : CHART.good) : CHART.neutral,
      color2: CHART.good,
      quiet: !enough(r.n) && r.n < 10,
    }));
  const open = (payer: string) => {
    const q: CaseQuery = { payer: payer as BuiltInPayerId, outcome: "approvedAny", title: `${payerById(payer as BuiltInPayerId).name}: days and units requested and approved${tab === "all" ? "" : `, ${PROGRAM_LABEL[tab]}`}`, note: "Decisions that approved something, as requested or in part. Denied requests are not in the averages.", ...(tab === "all" ? {} : { program: tab }) };
    onOpen(q);
  };
  const table = {
    caption: `Requested and approved ${unit === "mixed" ? "days or units" : unit} per approval`,
    head: ["Payer", "Approvals", "Cut", "Requested (average)", "Approved (average)", "Share of requested approved"],
    rows: rows.map((r: LosRow) => [payerById(r.payer).name, r.n, r.cuts, r.requested ?? "-", r.approved ?? "-", r.pct === null ? "-" : `${r.pct}%`]),
  };
  return (
    <div className="flex flex-col gap-4 px-6 py-5" data-testid="los">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">{tab === "all" ? "Share of the requested days or units that were approved, by payer." : `Average ${unit} requested (grey) and approved (green) per approval, ${PROGRAM_LABEL[tab]}.`} Click a payer for its cases.</p>
        <Segmented items={[{ id: "all", label: "All" }, ...PROGRAM_ORDER.map((p) => ({ id: p, label: PROGRAM_LABEL[p] }))]} value={tab} onChange={setTab} className="max-w-full flex-wrap" />
      </div>
      {bars.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No approvals in this view.</p>
      ) : (
        <HBarChart
          ariaLabel="Days or units requested and approved, by payer"
          rows={bars}
          max={max}
          labelWidth={190}
          valueWidth={tab === "all" ? 56 : 92}
          onRow={open}
          legend={tab === "all" ? [{ name: "Approved share of requested", color: CHART.good }, { name: "Below 80%", color: CHART.risk }] : [{ name: `Requested ${unit}`, color: CHART.neutral }, { name: `Approved ${unit}`, color: CHART.good }]}
          summary={`Requested against approved ${unit === "mixed" ? "days or units" : unit}: ${rows.map((r) => `${payerById(r.payer).shortName} ${r.pct ?? "-"}% approved`).join(", ")}.`}
          table={table}
        />
      )}
    </div>
  );
}

/** One line for the closed section: the payer that approves the least of what it is asked for. */
export function losSummary(board: Board): string {
  const rows = board.los.filter((r) => r.program === "all" && enough(r.n) && r.pct !== null).sort((a, b) => (a.pct as number) - (b.pct as number));
  if (!rows.length) return "Not enough approvals in this view.";
  const r = rows[0];
  return `${payerById(r.payer).shortName} approves ${r.pct}% of the days or units it is asked for${rows.length > 1 ? ", the lowest of the payers in view" : ""}. ${fmt(r.cuts)} of its approvals were cut.`;
}
