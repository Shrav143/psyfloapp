import { STAGES, type PsyRequest } from "@/data/types";
import { minutesInStage, minutesLeft } from "@/store/selectors";
import { PAYER_ROW_LABEL } from "./helpers";

export type SortKey = "case" | "payer" | "stage" | "clock";
export interface RowSort {
  key: SortKey;
  dir: "asc" | "desc";
}

/** The headings that sort, with the words the page uses for them. */
export const SORT_LABEL: Record<SortKey, string> = { case: "Case", payer: "Payer", stage: "Where it is", clock: "Clock" };

/** A first click sorts up, the next sorts down, the third goes back to the app's own order. */
export function nextSort(current: RowSort | null, key: SortKey): RowSort | null {
  if (current?.key !== key) return { key, dir: "asc" };
  return current.dir === "asc" ? { key, dir: "desc" } : null;
}

/** What the Clock column shows as a number: minutes left for a denial with a deadline, otherwise minutes in the stage. A fixed note such as "decision 11/02" has none. */
const clockMinutes = (r: PsyRequest, clock: number): number | undefined => (r.clockNote ? undefined : (minutesLeft(r, clock) ?? minutesInStage(r, clock)));

const words = new Intl.Collator("en", { numeric: true });

function valueOf(r: PsyRequest, key: SortKey, clock: number): string | number | undefined {
  switch (key) {
    case "case":
      return r.id;
    case "payer":
      return PAYER_ROW_LABEL[r.payerId];
    case "stage":
      return STAGES.indexOf(r.stage);
    case "clock":
      return clockMinutes(r, clock);
  }
}

/** Rows that tie keep the app's own order, and rows with no value for the column stay at the bottom either way. */
export function sortRows(rows: PsyRequest[], sort: RowSort | null, clock: number): PsyRequest[] {
  if (!sort) return rows;
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = valueOf(a, sort.key, clock);
    const y = valueOf(b, sort.key, clock);
    if (x === undefined || y === undefined) return x === y ? 0 : x === undefined ? 1 : -1;
    return sign * (typeof x === "number" && typeof y === "number" ? x - y : words.compare(String(x), String(y)));
  });
}
