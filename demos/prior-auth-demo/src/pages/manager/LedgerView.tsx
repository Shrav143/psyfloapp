import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown, SearchX } from "lucide-react";
import { Button, Card, Chance, Chip, EmptyState, IdLink, Meter, Pill, Stat, Table, Td, Th, Tr } from "@/components/ui";
import { LEDGER_STATUS_LABEL, type LedgerStatus } from "@/data/manager";
import { PROGRAM_LABEL } from "@/data/types";
import { cn } from "@/lib/cn";
import { PAYER_ROW_LABEL } from "@/pages/dashboard/helpers";
import { paths } from "@/routes";
import { useStore } from "@/store";
import type { LedgerRow } from "./ledgerRows";
import { STATUS_TONE, matchesBase, clockText, payerUpdateFor, payerUpdateText, sortLedger, usedShare, type ManagerFilters, type SortKey } from "./helpers";

const PAGE = 10;
const TILES: { status: LedgerStatus; sub: string }[] = [
  { status: "needs_action", sub: "act today" },
  { status: "review_due", sub: "review or recertify soon" },
  { status: "awaiting", sub: "the payer has it" },
  { status: "on_track", sub: "nothing needed" },
];

function SortTh({ label, k, sort, onSort, className, wrap }: { wrap?: boolean; label: string; k: SortKey; sort: { key: SortKey; dir: 1 | -1 }; onSort: (k: SortKey) => void; className?: string }) {
  const on = sort.key === k;
  const Icon = !on ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
  return (
    <Th className={className} aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => onSort(k)} className={cn("inline-flex items-center gap-1.5 uppercase tracking-[0.09em] hover:text-ink", wrap && "max-w-[100px] whitespace-normal text-left", on && "text-ink")} aria-label={`Sort by ${label}`}>
        {label}
        <Icon size={13} className="ico" />
      </button>
    </Th>
  );
}

function Pager({ page, pages, from, to, total, onPage }: { page: number; pages: number; from: number; to: number; total: number; onPage: (p: number) => void }): ReactNode {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-3.5">
      <span className="text-sm text-muted" aria-live="polite">
        Showing {from} to {to} of {total}
      </span>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span className="text-sm text-muted">
          Page {page + 1} of {pages}
        </span>
        <Button size="sm" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

/** Every case on one page, with the two things that matter most: how much is left and how much time. */
export function LedgerView({ ledger, filters, onStatus, onClear }: { ledger: LedgerRow[]; filters: ManagerFilters; onStatus: (s: LedgerStatus | "all") => void; onClear: () => void }) {
  const navigate = useNavigate();
  const clock = useStore((s) => s.clock);
  const updates = useStore((s) => s.payerChangeUpdates);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "clock", dir: 1 });
  const [paging, setPaging] = useState({ key: "", page: 0 });

  const base = useMemo(() => ledger.filter((c) => matchesBase(c, filters)), [ledger, filters]);
  const rows = useMemo(() => sortLedger(filters.status === "all" ? base : base.filter((c) => c.status === filters.status), sort.key, sort.dir), [base, filters.status, sort]);

  const key = JSON.stringify([filters, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const page = Math.min(paging.key === key ? paging.page : 0, pages - 1);
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const onSort = (k: SortKey) => setSort((s) => (s.key === k ? { key: k, dir: (s.dir * -1) as 1 | -1 } : { key: k, dir: k === "chance" ? -1 : 1 }));

  return (
    <>
      <div className="grid grid-cols-4 gap-4" role="group" aria-label="Status">
        {TILES.map((t) => (
          <Stat key={t.status} tone={STATUS_TONE[t.status]} value={base.filter((c) => c.status === t.status).length} label={LEDGER_STATUS_LABEL[t.status]} sub={t.sub} selected={filters.status === t.status} onClick={() => onStatus(filters.status === t.status ? "all" : t.status)} />
        ))}
      </div>
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={SearchX} title="No cases match" action={<Button onClick={onClear}>Clear filters</Button>}>
            The filters hide every case. Clear them to see {ledger.length === 1 ? "it" : `all ${ledger.length}`}.
          </EmptyState>
        ) : (
          <Table nowrap className="[&_td]:px-3 [&_th]:px-3">
            <thead>
              <tr>
                <SortTh label="Case" k="case" sort={sort} onSort={onSort} />
                <Th>Level of care</Th>
                <SortTh label="Payer" k="payer" sort={sort} onSort={onSort} />
                <SortTh label="Units used" k="used" sort={sort} onSort={onSort} />
                <SortTh label="Clock" k="clock" sort={sort} onSort={onSort} />
                <SortTh label="Approval chance" k="chance" sort={sort} onSort={onSort} wrap />
                <SortTh label="Status" k="status" sort={sort} onSort={onSort} />
                <Th>
                  <span className="sr-only">Open</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => {
                const share = usedShare(c);
                const clk = clockText(c, clock);
                const update = payerUpdateFor([c.id, c.caseId], updates);
                const open = () => navigate(paths.case(c.caseId));
                return (
                  <Tr key={c.id} onClick={(e) => { if (!(e.target as HTMLElement).closest("button")) open(); }} data-case={c.id}>
                    <Td>
                      <IdLink onClick={open}>{c.id}</IdLink>
                      <div className="text-xs text-muted">{c.initials} · {c.age}</div>
                      {c.isNew || update ? (
                        <div className="mt-1 flex flex-col items-start gap-1">
                          {c.isNew ? <Pill tone="good">New today</Pill> : null}
                          {update ? <span className="max-w-[128px] text-xs leading-snug font-medium whitespace-normal text-ink2">{payerUpdateText(update)}</span> : null}
                        </div>
                      ) : null}
                    </Td>
                    <Td>
                      <Chip>{PROGRAM_LABEL[c.program]}</Chip>
                      <div className="mt-0.5 text-xs text-muted">{c.note}</div>
                    </Td>
                    <Td>{PAYER_ROW_LABEL[c.payerId]}</Td>
                    <Td>
                      {share === null ? (
                        <span className="text-sm text-muted">not yet approved</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Meter value={share * 100} color={share >= 0.75 ? "#B5553A" : "#1D4F43"} height={6} className="w-[60px]" />
                          <span className="text-sm text-muted">
                            {c.used} of {c.total} {c.unit}
                          </span>
                        </div>
                      )}
                    </Td>
                    <Td className={cn("max-w-[150px] font-semibold whitespace-normal", clk.urgent && "text-risk-ink")}>{clk.text}</Td>
                    <Td>
                      <Chance value={c.chance} />
                    </Td>
                    <Td>
                      <Pill tone={STATUS_TONE[c.status]}>{LEDGER_STATUS_LABEL[c.status]}</Pill>
                    </Td>
                    <Td>
                      <Button size="sm" aria-label={`Open ${c.id}`} onClick={open}>
                        Open
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {rows.length > 0 ? <Pager page={page} pages={pages} from={page * PAGE + 1} to={Math.min(rows.length, page * PAGE + PAGE)} total={rows.length} onPage={(p) => setPaging({ key, page: p })} /> : null}
        <p className="border-t border-line px-6 py-3 text-[12.5px] text-muted">
          Approval chance estimates how well the paperwork fits the payer's past decisions. It is a range of about 6 points either way, drawn from similar decisions in your own cases, the network and benchmarks. Strong is 80 and above, Moderate 55 to 79, At risk below 55. It never blocks a request.
        </p>
      </Card>
    </>
  );
}
