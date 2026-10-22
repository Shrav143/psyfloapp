import { Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Drawer } from "@/components/ui";
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
  const reasons = new Map<string, number>();
  for (const d of rows) if (d.reason) reasons.set(d.reason, (reasons.get(d.reason) ?? 0) + 1);
  const top = [...reasons].sort((a, b) => b[1] - a[1]).slice(0, 3);
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
          <p className="text-[13px] text-ink2">
            <b>Most common reasons:</b> {top.map(([r, n]) => `${r} (${n})`).join(" · ")}
          </p>
        ) : null}
        <CaseTable rows={rows} onOpen={onOpenCase} showPayer={!query.payer} label={query.title} startSort={query.slowest ? "days" : "date"} startDesc />
      </div>
    </Drawer>
  );
}
