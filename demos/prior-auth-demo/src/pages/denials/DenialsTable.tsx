import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AgentChip, Chip, Pill, Table, Tr } from "@/components/ui";
import { band } from "@/lib/format";
import { cn } from "@/lib/cn";
import { shortDate } from "@/lib/time";
import { paths } from "@/routes";
import type { DenialRow, SortKey } from "./lib/dashboard";

interface Col { key: SortKey; label: string; className?: string }

const OPEN_COLS: Col[] = [
  { key: "id", label: "Denial" },
  { key: "patient", label: "Patient" },
  { key: "payer", label: "Payer" },
  { key: "program", label: "Level of care" },
  { key: "denied", label: "Denied" },
  { key: "chance", label: "Chance", className: "text-right" },
  { key: "next", label: "Next step" },
  { key: "deadline", label: "Deadline" },
  { key: "owner", label: "Owner" },
];
const CLOSED_COLS: Col[] = [...OPEN_COLS.slice(0, 6), { key: "next", label: "Outcome" }, { key: "deadline", label: "Closed" }, { key: "owner", label: "Owner" }];

/* Plain cells rather than the kit's Th and Td: the kit has no class merging, and these rows are tighter than its default padding. */
const TH = "whitespace-nowrap border-b border-line px-2.5 py-2.5 text-left text-[11px] font-medium uppercase tracking-[0.09em] text-muted first:pl-5 last:pr-5";
const TD = "whitespace-nowrap border-b border-line px-2.5 py-2.5 align-middle text-[13px] first:pl-5 last:pr-5";
/** What was denied and the next step may wrap, so the nine columns fit from 1280 px without sideways scrolling. */
const TD_WRAP = "border-b border-line px-2.5 py-2.5 align-middle text-[13px]";

function SortHead({ col, sort, dir, onSort }: { col: Col; sort: SortKey; dir: 1 | -1; onSort: (k: SortKey) => void }) {
  const on = sort === col.key;
  const Icon = !on ? ChevronsUpDown : dir === 1 ? ArrowUp : ArrowDown;
  return (
    <th scope="col" aria-sort={on ? (dir === 1 ? "ascending" : "descending") : "none"} className={cn(TH, col.className)}>
      <button type="button" onClick={() => onSort(col.key)} className={cn("inline-flex items-center gap-1 uppercase hover:text-ink", on && "text-ink")}>
        {col.label}
        <Icon size={12} className={cn("ico", !on && "opacity-40")} aria-hidden="true" />
      </button>
    </th>
  );
}

const NONE = <span className="text-faint" aria-label="none">—</span>;

/** Time left on our own clock, flagged when it is close. What the clock is for (call window, to file, to resubmit) is the next step's to say. */
function Deadline({ row }: { row: DenialRow }): ReactNode {
  if (row.closed) return <span className="text-muted">{shortDate(row.closed.at)}</span>;
  if (!row.deadline) return NONE;
  return <span title={row.deadline.what}><Pill tone={row.deadline.tone} dot={row.deadline.tone === "risk"}>{row.deadline.text}</Pill></span>;
}

/** The open (or closed) denials, one row each. A row opens the denial's page; the id is a link too, so the table works by keyboard. */
export function DenialsTable({ rows, closed, sort, dir, onSort, newId }: { rows: DenialRow[]; closed: boolean; sort: SortKey; dir: 1 | -1; onSort: (k: SortKey) => void; newId?: string | null }) {
  const nav = useNavigate();
  const cols = closed ? CLOSED_COLS : OPEN_COLS;
  return (
    <Table>
      <thead>
        <tr>{cols.map((c) => <SortHead key={c.label} col={c} sort={sort} dir={dir} onSort={onSort} />)}</tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const b = r.chance !== undefined ? band(r.chance) : null;
          return (
            <Tr key={r.id} data-denial={r.id} selected={r.id === newId} onClick={() => nav(paths.denials(r.id))}>
              <td className={TD}>
                <span className="inline-flex items-center gap-2">
                  <Link to={paths.denials(r.id)} onClick={(e) => e.stopPropagation()} className="font-semibold underline decoration-1 underline-offset-[3px] hover:text-forest">{r.id}</Link>
                  {r.fresh ? <Pill tone="good">New</Pill> : null}
                </span>
              </td>
              <td className={TD}>{r.who}</td>
              <td className={TD}>{r.payer}</td>
              <td className={TD}><Chip>{r.program}</Chip></td>
              <td className={cn(TD_WRAP, "min-w-[96px]")}>{r.denied}</td>
              <td className={cn(TD, "text-right font-semibold tabular-nums")}>{b && r.chance !== undefined ? <span style={{ color: b.color }}>{r.chance}%</span> : NONE}</td>
              <td className={cn(TD_WRAP, "min-w-[150px]")}>
                {r.closed ? (
                  <Pill tone={r.closed.tone}>{r.closed.text}</Pill>
                ) : (
                  <>
                    <div className="font-medium">{r.next.text}</div>
                    {r.next.when ? <div className="text-[12px] text-muted">{r.next.when}</div> : null}
                  </>
                )}
              </td>
              <td className={TD}><Deadline row={r} /></td>
              <td className={TD}><AgentChip agent={r.owner} /></td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}
