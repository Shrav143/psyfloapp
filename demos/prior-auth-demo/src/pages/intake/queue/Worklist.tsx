import { useMemo, useState, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";

/* The one table every Referrals & Intake worklist is built from: sortable headers (the address holds the sort), a first column that stays in place when the
   card is narrower than the table, rows that are links (the first cell holds the real link, so the keyboard reaches it; a click anywhere else on the
   row follows it), and "Show more" past 25 rows. */

export interface Column<R> {
  id: string;
  label: string;
  /** Pixels at 1440. The columns are fixed, so a long name wraps inside its own column. */
  width: number;
  /** Makes the header a sort button. Strings sort in natural order, numbers by value. */
  sort?: (row: R) => string | number;
  render: (row: R, href: string) => ReactNode;
  /** Visually hidden header (an actions column). */
  hideLabel?: boolean;
}

const TH = "border-b border-line bg-white px-2.5 py-3 text-left align-bottom text-[11px] font-medium tracking-[0.09em] text-muted uppercase";
const TD = "border-b border-line px-2.5 py-3 align-top text-[13px] group-last:border-b-0";
const STICKY = "sticky left-0 z-[1] bg-white group-hover:bg-[#FAF9F6] pl-5";

export function Worklist<R>({ rows, columns, rowKey, rowHref, linkState, defaultOrder, label, empty, pageSize = 25 }: {
  rows: readonly R[];
  columns: readonly Column<R>[];
  rowKey: (row: R) => string;
  /** Where the row goes. */
  rowHref: (row: R) => string;
  /** Router state sent with the row's link, so the sidebar knows which page the person came from. */
  linkState?: unknown;
  /** The order when no header is chosen. */
  defaultOrder: (a: R, b: R) => number;
  /** Names the table for assistive technology. */
  label: string;
  empty: ReactNode;
  pageSize?: number;
}) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const [limit, setLimit] = useState(pageSize);
  const sortId = params.get("sort");
  const desc = params.get("dir") === "desc";
  const col = columns.find((c) => c.id === sortId && c.sort);

  const ordered = useMemo(() => {
    if (!col?.sort) return [...rows].sort(defaultOrder);
    const get = col.sort;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: "base" });
      return (desc ? -c : c) || defaultOrder(a, b);
    });
  }, [rows, col, desc, defaultOrder]);

  /* First click sorts ascending, the second descending, the third returns to the default order. */
  const sortBy = (id: string) =>
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (n.get("sort") !== id) { n.set("sort", id); n.delete("dir"); }
      else if (n.get("dir") !== "desc") n.set("dir", "desc");
      else { n.delete("sort"); n.delete("dir"); }
      return n;
    }, { replace: true });

  if (!rows.length) return <>{empty}</>;
  const shown = ordered.slice(0, limit);
  const minWidth = columns.reduce((w, c) => w + c.width, 0);

  return (
    <>
      <div className="relative overflow-x-auto rounded-b-[20px]">
        <table aria-label={label} className="w-full table-fixed border-separate border-spacing-0 text-left" style={{ minWidth }}>
          <colgroup>
            {columns.map((c) => <col key={c.id} style={{ width: c.width }} />)}
          </colgroup>
          <thead>
            <tr>
              {columns.map((c, i) => {
                const on = col?.id === c.id;
                const Icon = !on ? ChevronsUpDown : desc ? ArrowDown : ArrowUp;
                return (
                  <th key={c.id} scope="col" aria-sort={on ? (desc ? "descending" : "ascending") : c.sort ? "none" : undefined} className={cn(TH, i === 0 && "sticky left-0 z-[2] pl-5")}>
                    {c.hideLabel ? <span className="sr-only">{c.label}</span> : c.sort ? (
                      <button type="button" data-sort={c.id} aria-label={`Sort by ${c.label}`} onClick={() => sortBy(c.id)} className={cn("inline-flex items-center gap-1 text-left uppercase hover:text-ink", on && "text-ink")}>
                        {c.label}
                        <Icon size={12} className={cn("ico shrink-0", !on && "opacity-50")} aria-hidden="true" />
                      </button>
                    ) : c.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const key = rowKey(r);
              const href = rowHref(r);
              return (
                <tr
                  key={key}
                  data-row={key}
                  onClick={(e) => {
                    /* A link or button inside the row does its own thing; selecting text does not open the row. */
                    if ((e.target as HTMLElement).closest("a,button,input,select,textarea,[role=menuitem]") || window.getSelection()?.toString()) return;
                    nav(href, { state: linkState });
                  }}
                  className="group cursor-pointer hover:bg-[#FAF9F6]"
                >
                  {columns.map((c, i) => <td key={c.id} className={cn(TD, i === 0 && STICKY)}>{c.render(r, href)}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {ordered.length > pageSize ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-[13px]">
          <span className="text-muted" aria-live="polite">Showing {shown.length} of {ordered.length}</span>
          {shown.length < ordered.length ? <Button size="sm" onClick={() => setLimit((l) => l + pageSize)}>Show {Math.min(pageSize, ordered.length - shown.length)} more</Button> : null}
        </div>
      ) : null}
    </>
  );
}
