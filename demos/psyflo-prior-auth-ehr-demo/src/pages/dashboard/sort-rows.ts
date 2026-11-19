import { PROGRAM_LABEL } from "@/data/types";
import { payerRowLabel } from "./helpers";
import type { CaseRow } from "./caseRows";

export type SortKey = "case" | "payer" | "service" | "status" | "days" | "units" | "window" | "action" | "owner";
export interface RowSort {
  key: SortKey;
  dir: "asc" | "desc";
}

/** The headings, in the words the page uses for them. Every one sorts. */
export const SORT_LABEL: Record<SortKey, string> = { case: "Case", payer: "Payer", service: "Service", status: "Status", days: "Days in state", units: "Units", window: "Window", action: "Next action", owner: "Owner" };

/** A first click sorts up, the next sorts down, the third goes back to the page's own order (the ones that need you, then the longest in state). */
export function nextSort(current: RowSort | null, key: SortKey): RowSort | null {
  if (current?.key !== key) return { key, dir: "asc" };
  return current.dir === "asc" ? { key, dir: "desc" } : null;
}

const words = new Intl.Collator("en", { numeric: true });

/** What a column sorts by. Units sort by what is left and Window by the end date; a case with no approval has no value and stays at the bottom either way. */
function valueOf(row: CaseRow, key: SortKey): string | number | undefined {
  switch (key) {
    case "case":
      return row.r.id;
    case "payer":
      return payerRowLabel(row.r.payerId);
    case "service":
      return PROGRAM_LABEL[row.r.program];
    case "status":
      return row.status;
    case "days":
      return row.minutes;
    case "units":
      return row.units?.left;
    case "window":
      return row.window?.to;
    case "action":
      return row.action.verb;
    case "owner":
      return row.action.owner.name;
  }
}

/** Rows that tie keep the page's own order. */
export function sortRows(rows: CaseRow[], sort: RowSort | null): CaseRow[] {
  if (!sort) return rows;
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = valueOf(a, sort.key);
    const y = valueOf(b, sort.key);
    if (x === undefined || y === undefined) return x === y ? 0 : x === undefined ? 1 : -1;
    return sign * (typeof x === "number" && typeof y === "number" ? x - y : words.compare(String(x), String(y)));
  });
}
