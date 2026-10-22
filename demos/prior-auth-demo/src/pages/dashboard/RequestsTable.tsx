import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronsUpDown, SearchX } from "lucide-react";
import { AgentBadge, Button, Card, CardHeader, EmptyState, IdLink, Pill, ProgressBars, Table, Td, Th, Tr } from "@/components/ui";
import { PROGRAM_LABEL, type PsyRequest } from "@/data/types";
import { cn } from "@/lib/cn";
import { paths } from "@/routes";
import { AUTH_TRACK, DENIAL_ROUTE, PAYER_ROW_LABEL, clockView, isDenial, nextLine } from "./helpers";
import { SORT_LABEL, type RowSort, type SortKey } from "./sort-rows";

export const PAGE_SIZE = 8;

const CLOCK_TONE = { ink: "text-ink", mid: "text-mid", risk: "text-risk-ink" } as const;

function Where({ r }: { r: PsyRequest }) {
  const steps = isDenial(r) ? DENIAL_ROUTE : AUTH_TRACK;
  const label = `${isDenial(r) ? "Route" : "Progress"}: ${steps.join(", ")}. Now at ${steps[r.progress]}.`;
  return (
    <div title={label}>
      <Pill tone={r.tone} dot>
        {r.chip}
      </Pill>
      <ProgressBars pos={r.progress} tone={r.tone} />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** A sortable heading is a button, so the keyboard reaches it; aria-sort tells a screen reader which way the column runs. */
function SortTh({ column, sort, onSort }: { column: SortKey; sort: RowSort | null; onSort: (key: SortKey) => void }) {
  const on = sort?.key === column;
  const Icon = !on ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <Th aria-sort={!on ? "none" : sort.dir === "asc" ? "ascending" : "descending"}>
      <button type="button" onClick={() => onSort(column)} className={cn("inline-flex items-center gap-1 uppercase hover:text-ink", on && "text-ink")}>
        {SORT_LABEL[column]}
        <Icon size={13} className={cn("ico", !on && "opacity-40")} />
      </button>
    </Th>
  );
}

function Row({ r, clock, writeBackOn, onOpen }: { r: PsyRequest; clock: number; writeBackOn: boolean; onOpen: (id: string) => void }) {
  const c = clockView(r, clock);
  return (
    // The case ID and Open are buttons that open the request themselves; a click on them must not open it a second time.
    <Tr onClick={(e) => !(e.target as Element).closest("button, a") && onOpen(r.id)} data-request={r.id}>
      <Td>
        <IdLink onClick={() => onOpen(r.id)}>{r.id}</IdLink>
        <div className="text-xs text-muted">{r.type}</div>
      </Td>
      <Td>
        {PAYER_ROW_LABEL[r.payerId]}
        <div className="text-xs text-muted">{PROGRAM_LABEL[r.program]}</div>
      </Td>
      <Td>
        <Where r={r} />
      </Td>
      <Td>
        <div className={cn("font-semibold", CLOCK_TONE[c.tone])}>
          {c.main}
          {c.word ? <span className="ml-1 text-xs font-medium">{c.word}</span> : null}
        </div>
        {c.sub ? <div className="text-xs text-muted">{c.sub}</div> : null}
      </Td>
      <Td>
        <div className="flex items-center gap-2">
          <AgentBadge agent={r.agent} size={24} />
          <span className="max-w-[380px] whitespace-normal text-[13.5px]">{nextLine(r, writeBackOn)}</span>
        </div>
      </Td>
      <Td>
        <Button size="sm" aria-label={`Open ${r.id}`} onClick={() => onOpen(r.id)}>
          Open
        </Button>
      </Td>
    </Tr>
  );
}

interface Props {
  rows: PsyRequest[];
  total: number;
  visible: number;
  clock: number;
  onOpen: (id: string) => void;
  onMore: () => void;
  onClear: () => void;
  canClear: boolean;
  sort: RowSort | null;
  onSort: (key: SortKey) => void;
  writeBackOn: boolean;
  /** Cases being prepared in New case with no row here. Only passed while Stage is Preparing. */
  more: number;
}

/** Exactly six columns, always the same. Needs-you first, then the latest, until a heading is clicked. */
export function RequestsTable({ rows, total, visible, clock, onOpen, onMore, onClear, canClear, sort, onSort, writeBackOn, more }: Props) {
  const shown = rows.slice(0, visible);
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Requests"
        subtitle="Bars show progress: Prepared, Received, In review, Decided. A denial shows Call, Appeal 1, Appeal 2, External. Over 1.5 × typical is late; over 2 × is very late."
        right={
          <span className="max-w-[260px] text-right text-sm text-muted" aria-live="polite">
            Showing {shown.length} of {total}
          </span>
        }
      />
      {rows.length === 0 ? (
        more === 0 ? (
          <EmptyState icon={SearchX} title="No requests match" action={canClear ? <Button onClick={onClear}>Clear filters</Button> : undefined}>
            The filters hide everything. Clear them to see every request again.
          </EmptyState>
        ) : null
      ) : (
        <Table nowrap>
          <thead>
            <tr>
              <SortTh column="case" sort={sort} onSort={onSort} />
              <SortTh column="payer" sort={sort} onSort={onSort} />
              <SortTh column="stage" sort={sort} onSort={onSort} />
              <SortTh column="clock" sort={sort} onSort={onSort} />
              <Th>What happens next</Th>
              <Th>
                <span className="sr-only">Open</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <Row key={r.id} r={r} clock={clock} writeBackOn={writeBackOn} onOpen={onOpen} />
            ))}
          </tbody>
        </Table>
      )}
      {rows.length > shown.length ? (
        <div className="flex items-center justify-center gap-3 border-t border-line px-6 py-3.5">
          <Button onClick={onMore}>Show {Math.min(PAGE_SIZE, rows.length - shown.length)} more</Button>
          <span className="text-sm text-muted">{rows.length - shown.length} not shown</span>
        </div>
      ) : null}
      {more > 0 ? (
        <p className={cn("px-6 py-3.5 text-sm text-ink2", rows.length > 0 && "border-t border-line")}>
          {more} {rows.length > 0 ? "more " : ""}{more === 1 ? "is" : "are"} being prepared in New case.{" "}
          <Link to={paths.manager("cases")} className="font-semibold text-forest hover:underline">
            Open Active cases
          </Link>
        </p>
      ) : null}
    </Card>
  );
}
