import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp, ArrowUpDown, PanelRightOpen, SearchX } from "lucide-react";
import { Button, Card, EmptyState, IdLink, Meter, Pill, Stat, Table, Td, Th, Tr } from "@/components/ui";
import { LEDGER_STATUS_LABEL, type LedgerStatus } from "@/data/manager";
import { PROGRAM_LABEL } from "@/data/types";
import { cn } from "@/lib/cn";
import { PAYER_ROW_LABEL } from "@/pages/dashboard/helpers";
import { paths } from "@/routes";
import { useStore } from "@/store";
import type { LedgerRow } from "./ledgerRows";
import { STATUS_TONE, matchesBase, matchesShow, clockText, payerUpdateFor, payerUpdateText, runsOutBeforeReview, sortLedger, usedShare, usedText, type ManagerFilters, type SortKey } from "./helpers";

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
export function LedgerView({ ledger, filters, onStatus, onClear, onQuick }: { ledger: LedgerRow[]; filters: ManagerFilters; onStatus: (s: LedgerStatus | "all") => void; onClear: () => void; /** Opens the quick view of a case. `from` is the control to give focus back to when it closes. */ onQuick: (id: string, from: HTMLElement | null) => void }) {
  const navigate = useNavigate();
  const clock = useStore((s) => s.clock);
  const updates = useStore((s) => s.payerChangeUpdates);
  const reviews = useStore((s) => s.reviews);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "clock", dir: 1 });
  const [paging, setPaging] = useState({ key: "", page: 0 });

  const base = useMemo(() => ledger.filter((c) => matchesBase(c, filters) && matchesShow(c, filters.show, clock)), [ledger, filters, clock]);
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
                <SortTh label="Status" k="status" sort={sort} onSort={onSort} />
                <SortTh label="Next due" k="clock" sort={sort} onSort={onSort} />
                <SortTh label="Units or days" k="used" sort={sort} onSort={onSort} />
                <Th>Level of care</Th>
                <SortTh label="Payer" k="payer" sort={sort} onSort={onSort} />
                <SortTh label="Approval chance" k="chance" sort={sort} onSort={onSort} wrap />
                <Th className="relative">
                  <span className="sr-only">Open</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => {
                const share = usedShare(c);
                const clk = clockText(c, clock);
                const update = payerUpdateFor([c.id, c.caseId], updates);
                const runsOut = runsOutBeforeReview(c, reviews, clock);
                const open = () => navigate(paths.case(c.caseId));
                return (
                  // A click on the row itself opens the quick view; the case ID, the quick view button and Open are buttons and act on their own.
                  <Tr key={c.id} onClick={(e) => { if (!(e.target as HTMLElement).closest("button, a")) onQuick(c.id, e.currentTarget.querySelector<HTMLElement>("[data-quick]")); }} data-case={c.id}>
                    <Td>
                      <IdLink onClick={open}>{c.id}</IdLink>
                      <div className="text-xs text-muted">{c.initials} · {c.age}</div>
                      {c.isNew ? <div className="text-xs font-medium text-good-ink">New today</div> : null}
                      {update ? <div className="max-w-[128px] text-xs leading-snug font-medium whitespace-normal text-ink2">{payerUpdateText(update)}</div> : null}
                    </Td>
                    <Td>
                      <Pill tone={STATUS_TONE[c.status]}>{LEDGER_STATUS_LABEL[c.status]}</Pill>
                    </Td>
                    <Td className={cn("min-w-[170px] font-semibold", clk.urgent && "text-risk-ink")}>{clk.text}</Td>
                    <Td>
                      {share === null ? (
                        <span className="text-sm text-muted">not yet approved</span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{usedText(c)}</span>
                          <Meter value={share * 100} color={share >= 0.75 ? "#B5553A" : "#1D4F43"} height={5} className="w-[120px]" />
                          {runsOut ? <span className="text-xs font-semibold text-risk-ink">Runs out before review</span> : null}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <div>{PROGRAM_LABEL[c.program]}</div>
                      <div className="text-xs text-muted">{c.note}</div>
                    </Td>
                    <Td>{PAYER_ROW_LABEL[c.payerId]}</Td>
                    <Td>
                      <span className="text-sm tabular-nums text-ink2" aria-label={`Approval chance ${Math.round(c.chance)} percent`}>{Math.round(c.chance)}%</span>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" data-quick aria-label={`Quick view of ${c.id}`} title="Quick view" onClick={(e) => onQuick(c.id, e.currentTarget)} className="grid h-8 w-8 place-items-center rounded-[10px] text-ink2 hover:bg-tile">
                          <PanelRightOpen size={16} className="ico" />
                        </button>
                        <Button size="sm" aria-label={`Open ${c.id}`} onClick={open}>
                          Open
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
        {rows.length > 0 ? <Pager page={page} pages={pages} from={page * PAGE + 1} to={Math.min(rows.length, page * PAGE + PAGE)} total={rows.length} onPage={(p) => setPaging({ key, page: p })} /> : null}
        <p className="border-t border-line px-6 py-3 text-[12px] text-muted">
          Click a row for a quick view, or Open for the full case. Units or days left are worked out at the usual pace: a day of care a day, about three units a week for IOP. "Runs out before review" appears only when that pace uses the approval up before the next review. Approval chance estimates how well the paperwork fits the payer's past decisions. It is a range of about 6 points either way, drawn from similar decisions in your own cases, the network and benchmarks. Strong is 80 and above, Moderate 55 to 79, At risk below 55. It never blocks a request.
        </p>
      </Card>
    </>
  );
}
