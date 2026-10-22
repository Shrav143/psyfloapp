import { useMemo, useState } from "react";
import { Copy, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, CHART, Drawer, HBarChart } from "@/components/ui";
import type { Decision } from "@/data/decisions";
import { paths } from "@/routes";
import { CaseTable } from "./CaseTable";
import { filterWords, periodInfo, type Filters } from "./filters";
import { MONTHS } from "@/data/decisions";
import { describeQuery, denialsFilterOf, type CaseQuery } from "./query";
import { caseListSummary } from "./summary";
import { fmt, statsOf } from "./stats";
import { useCopy } from "./useCopy";

/* The cases behind one number: a matrix cell, a reason, a month, a headline figure. The list is the same rows the number was counted from. */

export function CaseListPanel({ query, rows, filters, siteLabel, width, onOpenCase, onClose }: { query: CaseQuery; rows: Decision[]; filters: Filters; siteLabel: string; width: number; onOpenCase: (d: Decision) => void; onClose: () => void }) {
  const copy = useCopy();
  const s = statsOf(rows);
  const drill = denialsFilterOf(query);
  const when = query.month !== undefined ? `${MONTHS[query.month].long} (${MONTHS[query.month].range})` : periodInfo(filters.period).label;
  const words = filterWords(filters);
  const extra = describeQuery(query);
  const [reason, setReason] = useState<string | null>(null);
  const reasons = useMemo(() => {
    const m = new Map<string, { n: number; preventable: boolean }>();
    for (const d of rows) if (d.reason) m.set(d.reason, { n: (m.get(d.reason)?.n ?? 0) + 1, preventable: !!d.preventable });
    return [...m].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.n - a.n || a.label.localeCompare(b.label));
  }, [rows]);
  const shown = reason ? rows.filter((d) => d.reason === reason) : rows;
  const top = reasons.slice(0, 6);
  const topN = Math.max(1, ...top.map((r) => r.n));
  return (
    <Drawer
      open
      onClose={onClose}
      width={width}
      title={query.title}
      subtitle={
        <span data-testid="caselist-sub">
          {fmt(rows.length)} {rows.length === 1 ? "case" : "cases"} · {when} · {siteLabel}
          {extra ? ` · ${extra}` : ""}
          {words ? ` · filters: ${words}` : ""}
        </span>
      }
      right={
        <Button size="sm" icon={Copy} onClick={() => copy(caseListSummary(query.title, rows, filters, siteLabel), "List summary copied")}>
          Copy summary
        </Button>
      }
      footer={
        drill ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[12.5px] text-muted">The open denials with this reason are in Denial Intelligence.</span>
            <Link to={paths.denials(undefined, drill)} className="inline-flex h-[38px] items-center rounded-xl border border-field bg-white px-4 text-sm font-medium hover:bg-tile">
              Open in Denial Intelligence
            </Link>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4" data-testid="caselist">
        {query.note ? <p className="text-[13.5px] text-muted">{query.note}</p> : null}
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Approved as requested", s.approved],
            ["Approved in part", s.partial],
            ["Denied", s.denied],
          ].map(([label, n]) => (
            <div key={label} className="rounded-2xl border border-tile-edge bg-tile px-4 py-3">
              <div className="text-[11.5px] font-medium tracking-[0.08em] text-muted uppercase">{label}</div>
              <div className="mt-0.5 text-[22px] font-semibold tabular-nums">{fmt(n as number)}</div>
            </div>
          ))}
        </div>
        {top.length ? (
          <div data-testid="caselist-reasons">
            <h4 className="text-[14px] font-semibold">Why these were not approved as requested</h4>
            <p className="mb-1 text-[12.5px] text-muted">{reasons.length > top.length ? `The ${top.length} most common of ${reasons.length} reasons. ` : ""}Click a reason to show only its cases in the table.</p>
            <HBarChart
              ariaLabel="Denial reasons for these cases"
              rows={top.map((r) => ({ key: r.label, label: r.label, value: r.n, display: String(r.n), color: reason === r.label ? CHART.forest : r.preventable ? CHART.mid : CHART.umber, tag: r.preventable ? "Preventable" : undefined, quiet: reason !== null && reason !== r.label }))}
              max={topN}
              labelWidth={250}
              valueWidth={32}
              onRow={(k) => setReason((cur) => (cur === k ? null : k))}
              summary={`Denial reasons for ${rows.length} cases: ${top.map((r) => `${r.label} ${r.n}`).join(", ")}.`}
              table={{ caption: "Denial reasons for these cases", head: ["Reason", "Cases", "Preventable"], rows: reasons.map((r) => [r.label, r.n, r.preventable ? "Yes" : "No"]) }}
            />
          </div>
        ) : null}
        {reason ? (
          <p className="flex items-center gap-2 text-[13px]">
            <span className="rounded-full bg-sage-bg px-3 py-1 font-medium text-forest">Showing {shown.length} with reason: {reason}</span>
            <button type="button" onClick={() => setReason(null)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-forest hover:bg-sage-bg">
              <X size={13} className="ico" aria-hidden="true" />
              Show all {rows.length}
            </button>
          </p>
        ) : null}
        <CaseTable key={reason ?? "all"} rows={shown} onOpen={onOpenCase} showPayer={!query.payer} label={query.title} startSort={query.slowest ? "days" : "date"} startDesc />
      </div>
    </Drawer>
  );
}
