import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronsUpDown, SearchX } from "lucide-react";
import { Button, EmptyState, IdLink, InfoTip, Table, Td, Th, Tr } from "@/components/ui";
import { PROGRAM_LABEL } from "@/data/types";
import { CMS_DAYS, CMS_NOTE, URGENT } from "@/lib/doNext";
import { dueText } from "@/lib/floFacts";
import { windowText } from "@/lib/ledgerFacts";
import { cn } from "@/lib/cn";
import { DAY, HOUR, typical } from "@/lib/time";
import { paths } from "@/routes";
import type { CaseRow } from "./caseRows";
import { payerRowLabel } from "./helpers";
import { SORT_LABEL, type RowSort, type SortKey } from "./sort-rows";

export const PAGE_SIZE = 8;

const DASH = (
  <span className="text-faint" aria-label="none">
    —
  </span>
);

/** "35 m", "14 h", "3.2 d": how long a request has been in its state. */
export function stateTime(min: number): string {
  if (min < HOUR) return `${Math.max(1, Math.round(min))} m`;
  if (min < DAY) return `${Math.round(min / HOUR)} h`;
  const d = min / DAY;
  return `${d < 10 ? +d.toFixed(1) : Math.round(d)} d`;
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

const QUIET = "text-[12px] text-muted";
/** Under 1400 px the text columns that can break (payer, status, next action) wrap, so all nine columns fit at 1280 without sideways scrolling. */
const WRAP = "max-[1399px]:whitespace-normal!";

/** Days in the state with the payer's median under it. A Medicaid managed care payer that holds the decision also gets the CMS clock: "Day 5 of 7" from day 5, "Past 7 days" after. */
function Days({ row }: { row: CaseRow }) {
  const tone = row.late === "very" ? "text-risk-ink" : row.late === "late" ? "text-mid-ink" : "";
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className={cn("tabular-nums", tone)}>{stateTime(row.minutes)}</span>
        {row.cms?.past ? (
          <span className="rounded-full bg-mid-bg px-2 py-0.5 text-xs font-semibold text-mid-ink">Past {CMS_DAYS} days</span>
        ) : row.cms?.hint ? (
          <span className="text-xs font-medium text-mid-ink">
            Day {row.cms.day} of {CMS_DAYS}
          </span>
        ) : null}
        {row.cms && (row.cms.past || row.cms.hint) ? (
          <InfoTip label="About the CMS decision time" align="end" className="-my-1 -ml-1">
            <span className="block whitespace-normal">{CMS_NOTE}</span>
          </InfoTip>
        ) : null}
      </div>
      {row.median ? <div className={QUIET}>median {typical(row.median)}</div> : null}
    </div>
  );
}

function Row({ row, clock, onOpen }: { row: CaseRow; clock: number; onOpen: (id: string) => void }) {
  const r = row.r;
  const left = row.due ? row.due.dueAt - clock : undefined;
  const mine = row.action.owner.kind === "you";
  return (
    // The case ID is a button that opens the request itself; a click on it must not open it a second time.
    <Tr onClick={(e) => !(e.target as Element).closest("button, a") && onOpen(r.id)} data-request={r.id}>
      <Td>
        <IdLink onClick={() => onOpen(r.id)}>{r.id}</IdLink>
        <div className={QUIET}>
          {r.patient.initials}, {r.patient.age}
        </div>
      </Td>
      <Td className={WRAP}>{payerRowLabel(r.payerId)}</Td>
      <Td>
        {PROGRAM_LABEL[r.program]}
        <div className={QUIET}>{r.type}</div>
      </Td>
      <Td className={WRAP}>{row.status}</Td>
      <Td>
        <Days row={row} />
      </Td>
      <Td>
        {row.units ? (
          <>
            <span className="tabular-nums">
              {row.units.total} → {row.units.left}
            </span>
            <div className={QUIET}>{row.units.unit}</div>
          </>
        ) : (
          DASH
        )}
      </Td>
      <Td className="text-ink2">{row.window ? windowText(row.window) : DASH}</Td>
      <Td className={WRAP}>
        {row.action.verb}
        {row.due && left !== undefined && left <= 2 * DAY && row.action.kind !== "wait" && row.action.kind !== "none" ? <div className={cn(QUIET, left <= URGENT && "text-risk-ink")}>{dueText(row.due.verb, row.due.dueAt, clock)}</div> : null}
      </Td>
      <Td className={cn(mine && "font-medium text-forest")}>{row.action.owner.name}</Td>
    </Tr>
  );
}

interface Props {
  title: string;
  controls: ReactNode;
  rows: CaseRow[];
  visible: number;
  clock: number;
  onOpen: (id: string) => void;
  onMore: () => void;
  onClear: () => void;
  /** A menu or a state chip narrows the table. */
  narrowed: boolean;
  needsToday: boolean;
  sort: RowSort | null;
  onSort: (key: SortKey) => void;
  /** Cases saved in New Case that have no row here, and what to say about them. */
  more: number;
}

/** One card: the controls on top, then one line per authorization. Nine columns, the same on every row. The title is for screen readers only; the rows speak for themselves.
    The menus sit in the header, so only the table body is clipped to the card's rounded corners. */
export function CasesTable({ title, controls, rows, visible, clock, onOpen, onMore, onClear, narrowed, needsToday, sort, onSort, more }: Props) {
  const shown = rows.slice(0, visible);
  return (
    <section id="authorizations-table" aria-label="Authorizations" className="scroll-mt-4 rounded-[20px] border border-edge bg-white">
      <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-3 border-b border-line px-5 py-3">
        <h2 className="sr-only">{title}</h2>
        {controls}
      </div>
      {rows.length === 0 ? (
        more === 0 ? (
          <EmptyState icon={SearchX} title={needsToday && !narrowed ? "Nothing needs you today" : "No authorizations match"} action={narrowed || needsToday ? <Button onClick={onClear}>Clear filters</Button> : undefined}>
            {needsToday && !narrowed ? "Every authorization is with a payer or with the agents." : "The filters hide everything. Clear them to see every authorization again."}
          </EmptyState>
        ) : null
      ) : (
        <div className="overflow-hidden rounded-b-[20px]">
          <Table nowrap className="relative max-[1399px]:[&_td]:px-2.5 max-[1399px]:[&_th]:px-2.5 [&_td]:px-3 [&_th]:px-3 [&_td:first-child]:pl-6 [&_th:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:last-child]:pr-6">
            <thead>
              <tr>
                {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                  <SortTh key={k} column={k} sort={sort} onSort={onSort} />
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <Row key={row.r.id} row={row} clock={clock} onOpen={onOpen} />
              ))}
            </tbody>
          </Table>
          {rows.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-3.5">
              <span className="text-[13px] text-muted" aria-live="polite">
                Showing {shown.length} of {rows.length}
              </span>
              {rows.length > shown.length ? (
                <div className="flex items-center gap-3">
                  <span className="text-[13px] text-muted">{rows.length - shown.length} not shown</span>
                  <Button onClick={onMore}>Show {Math.min(PAGE_SIZE, rows.length - shown.length)} more</Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
      {more > 0 ? (
        <p className={cn("px-6 py-3.5 text-[13px] text-ink2", rows.length > 0 && "border-t border-line")}>
          {more} {rows.length > 0 ? "more " : ""}
          {more === 1 ? "is" : "are"} being prepared in New Case.{" "}
          <Link to={paths.manager("cases")} className="font-semibold text-forest hover:underline">
            Open Active cases
          </Link>
        </p>
      ) : null}
    </section>
  );
}
