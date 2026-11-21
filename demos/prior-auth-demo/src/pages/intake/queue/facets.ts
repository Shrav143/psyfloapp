/* The search and filters of a worklist, as data. Each filter says which values a row has; the address holds the choices (?q=, ?program=...), so a
   filtered list can be linked and Back undoes a filter. Option counts are faceted: each choice counts the rows that match every other active filter. */

export interface FacetOption {
  value: string;
  label: string;
  /** A heading shown above the first option of each group. */
  group?: string;
}
export interface FacetDef<R> {
  id: string;
  /** The filter's name: the chip reads "Program: ARTS IOP". */
  label: string;
  /** The choice that means no filter. */
  allLabel: string;
  /** Shown in the bar; the rest are in More filters. */
  primary?: boolean;
  /** Keep choices with no rows (for short, fixed lists). */
  always?: boolean;
  /** The values a row has for this filter. */
  values: (row: R) => string[];
  /** Every choice, in order. Choices with no rows are left out unless `always` or selected. */
  options: (rows: R[]) => FacetOption[];
  menuWidth?: number;
}
export interface Query {
  q: string;
  facets: Record<string, string>;
}

export const readQuery = <R,>(p: URLSearchParams, defs: readonly FacetDef<R>[]): Query => {
  const facets: Record<string, string> = {};
  for (const d of defs) {
    const v = p.get(d.id);
    if (v) facets[d.id] = v;
  }
  return { q: p.get("q") ?? "", facets };
};
/** Every address parameter a list owns; Clear filters removes exactly these. */
export const queryParams = <R,>(defs: readonly FacetDef<R>[]): string[] => ["q", ...defs.map((d) => d.id)];
export const activeFilterCount = (q: Query): number => Object.keys(q.facets).length + (q.q.trim() ? 1 : 0);

/** The rows that pass the search and every filter. `except` leaves one filter out (for that filter's own counts). */
export function filterRows<R>(rows: readonly R[], defs: readonly FacetDef<R>[], q: Query, searchOf: (r: R) => string, except?: string): R[] {
  const t = q.q.trim().toLowerCase();
  const norm = t.replace(/[.\s,]/g, "");
  return rows.filter((r) => {
    if (t) {
      const hay = searchOf(r).toLowerCase();
      if (!hay.includes(t) && !(norm.length >= 2 && hay.replace(/[.\s,]/g, "").includes(norm))) return false;
    }
    return defs.every((d) => {
      const want = q.facets[d.id];
      return !want || d.id === except || d.values(r).includes(want);
    });
  });
}

export interface CountedOption extends FacetOption {
  count: number;
}
/** One filter's choices, each with the number of rows it would leave. */
export function countedOptions<R>(def: FacetDef<R>, rows: readonly R[], defs: readonly FacetDef<R>[], q: Query, searchOf: (r: R) => string): CountedOption[] {
  const base = filterRows(rows, defs, q, searchOf, def.id);
  return def.options([...rows])
    .map((o) => ({ ...o, count: base.filter((r) => def.values(r).includes(o.value)).length }))
    .filter((o) => def.always || o.count > 0 || q.facets[def.id] === o.value);
}
