import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useStore } from "@/store";
import { filterKey, paramsToFilters, withFilterParams } from "./helpers";

const NO_NARROWING = { payer: "all", program: "all", type: "all", stage: "all" } as const;

/**
 * Keeps the five core filters and the address in step.
 * An address that carries filters wins (deep links and links from other modules);
 * an address without any leaves the remembered filters alone and writes them back to the address.
 */
export function useFilterSync(): void {
  const [params, setParams] = useSearchParams();
  const filters = useStore((s) => s.filters);
  const urlKey = filterKey(paramsToFilters(params));
  const storeKey = filterKey(filters);
  const seenUrlKey = useRef<string | null>(null);

  useEffect(() => {
    const urlChanged = seenUrlKey.current === null || seenUrlKey.current !== urlKey;
    seenUrlKey.current = urlKey;
    if (urlKey === storeKey) return;
    if (urlChanged && urlKey !== "") {
      useStore.getState().setFilters({ ...NO_NARROWING, ...paramsToFilters(params) });
    } else {
      setParams((p) => withFilterParams(p, filters), { replace: true });
    }
  }, [urlKey, storeKey, params, filters, setParams]);
}

/** The request whose history is open lives in the address as ?request=ID. */
export function useRequestParam(): { requestId: string | null; open: (id: string) => void; close: () => void; swap: (id: string) => void } {
  const [params, setParams] = useSearchParams();
  const requestId = params.get("request");
  const open = useCallback(
    (id: string) =>
      setParams((p) => {
        const n = new URLSearchParams(p);
        n.set("request", id);
        return n;
      }),
    [setParams],
  );
  const swap = useCallback(
    (id: string) =>
      setParams(
        (p) => {
          const n = new URLSearchParams(p);
          n.set("request", id);
          return n;
        },
        { replace: true },
      ),
    [setParams],
  );
  const close = useCallback(
    () =>
      setParams(
        (p) => {
          const n = new URLSearchParams(p);
          n.delete("request");
          return n;
        },
        { replace: true },
      ),
    [setParams],
  );
  return { requestId, open, close, swap };
}
