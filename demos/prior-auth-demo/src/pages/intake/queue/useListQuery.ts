import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { queryParams, readQuery, type FacetDef, type Query } from "./facets";

/** A list's search and filters, read from and written to the address. Typing in the search replaces the history entry; a filter adds one, so Back undoes it. */
export function useListQuery<R>(defs: readonly FacetDef<R>[]) {
  const [params, setParams] = useSearchParams();
  const query: Query = useMemo(() => readQuery(params, defs), [params, defs]);
  const set = useCallback(
    (key: string, value: string | null, replace = false) =>
      setParams((p) => {
        const n = new URLSearchParams(p);
        if (value) n.set(key, value);
        else n.delete(key);
        return n;
      }, { replace }),
    [setParams],
  );
  const clear = useCallback(
    () =>
      setParams((p) => {
        const n = new URLSearchParams(p);
        for (const k of queryParams(defs)) n.delete(k);
        return n;
      }),
    [setParams, defs],
  );
  return { query, set, clear, params };
}
