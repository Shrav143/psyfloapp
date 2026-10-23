import { useState } from "react";
import { Card, CardBody, Heatmap, Segmented, type HeatCell } from "@/components/ui";
import type { Board, MatrixKey } from "./board";
import { cellQuery } from "./board";
import type { CaseQuery } from "./query";
import type { BuiltInPayerId } from "@/data/types";
import { AXES } from "./board";

const TABS: { id: MatrixKey; label: string }[] = [
  { id: "dx", label: "Diagnosis group" },
  { id: "program", label: "Program" },
  { id: "kind", label: "Request type" },
  { id: "population", label: "Population" },
];

/** Payers down, case types across: each cell is how often the payer approves that kind of case as requested, and how many decisions that rests on. */
export function MatrixCard({ board, onCases, onPayer }: { board: Board; onCases: (q: CaseQuery) => void; onPayer: (p: BuiltInPayerId) => void }) {
  const [key, setKey] = useState<MatrixKey>("dx");
  const m = board.matrices[key];
  const cols = [...m.cols.map((c) => ({ key: c.id, label: c.label })), { key: "all", label: "All cases" }];
  const cells: HeatCell[][] = m.rows.map((r) => [...r.cells, r.total].map((c) => ({ n: c.n, rate: c.rate, detail: `${c.approved} approved as requested, ${c.n - c.approved} not` })));
  const rows = m.rows.map((r) => ({ key: r.payer, label: r.label, emphasis: r.payer === "all" }));
  const low = m.rows.filter((r) => r.payer !== "all").flatMap((r) => r.cells.map((c, i) => ({ payer: r.label, col: m.cols[i].label, ...c }))).filter((c) => c.n >= 10 && c.rate !== null).sort((a, b) => (a.rate as number) - (b.rate as number))[0];
  const summary = `Approval rate by payer and ${m.title.toLowerCase()}. ${low ? `The lowest cell with 10 or more decisions is ${low.payer} for ${low.col}: ${low.rate}% of ${low.n}.` : ""}`;
  const title = (ri: number, ci: number): string => `${m.rows[ri].label}: ${ci === m.cols.length ? "all cases" : m.cols[ci].label}`;
  return (
    <Card data-testid="matrix-card">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line px-6 pt-5 pb-[18px]">
        <div className="min-w-[240px] flex-1">
          <h3 className="font-serif text-[18px] font-semibold leading-tight tracking-tight">Payer by case mix</h3>
          <p className="mt-[3px] text-[13px] text-muted">How often each payer approves each kind of case as requested. Click a cell to see its cases, a payer to see its analysis.</p>
        </div>
        <Segmented items={TABS} value={key} onChange={setKey} className="max-w-full flex-wrap" />
      </div>
      <CardBody>
        <Heatmap
          ariaLabel={`Approval rate by payer and ${m.title.toLowerCase()}`}
          rows={rows}
          cols={cols}
          cells={cells}
          minN={10}
          cellName={(r, c) => title(r, c)}
          onCell={(ri, ci) => {
            const row = m.rows[ri];
            const q = cellQuery(key, row.payer, ci === m.cols.length ? null : m.cols[ci].id);
            onCases({ ...q, title: title(ri, ci), note: `Approved as requested and not, ${row.payer === "all" ? "across the payers in view" : `at ${row.label}`}.` });
          }}
          onRow={(ri) => {
            const p = m.rows[ri].payer;
            if (p !== "all") onPayer(p);
          }}
          onCol={(ci) => {
            if (ci === m.cols.length) return;
            const q = cellQuery(key, "all", m.cols[ci].id);
            onCases({ ...q, title: `All payers: ${m.cols[ci].label}`, note: `Every payer's decisions for this ${m.title.toLowerCase()}.` });
          }}
          summary={summary}
          table={{
            caption: `Approved as requested, by payer and ${m.title.toLowerCase()} (rate and decisions)`,
            head: ["Payer", ...cols.map((c) => c.label)],
            rows: m.rows.map((r) => [r.label, ...[...r.cells, r.total].map((c) => (c.n === 0 ? "none" : `${c.rate}% of ${c.n}`))]),
          }}
          hint={AXES[key].title === "Population" ? "Population is the group a case belongs to, such as first-time treatment or prior admissions." : undefined}
        />
      </CardBody>
    </Card>
  );
}
