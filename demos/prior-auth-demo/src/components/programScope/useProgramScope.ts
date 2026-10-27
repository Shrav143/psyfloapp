import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Program } from "@/data/types";
import { FOCUS_OFF, focusScope, noDataNote, type FocusScope } from "@/lib/programFocus";
import { useStore } from "@/store";

export interface ProgramScopeState {
  /** What the Program menu chose, or null for "All programs". */
  scope: FocusScope | null;
  /** The scope this page narrows by now: set when the service has a level of care here, the person has not removed it and the page's own filter does not override it. */
  active: FocusScope | null;
  /** "No CPST: Youth, Community data here yet. Showing all programs." when the service has no data here. */
  note: string | null;
  /** The person removed the preset on this page (kept in the address, so Back keeps it). */
  removed: boolean;
  remove: () => void;
  restore: () => void;
  /** The same address with the preset removed, for a page's own Clear filters, so one update clears both. */
  lift: (p: URLSearchParams) => URLSearchParams;
}

/** The Program menu's preset for one page. `overridden` is true while the page's own program filter is set: the person's own choice wins.
    `present` lists the programs of the page's records: a Virginia service with no level of care of its own (CPST, ACT and the rest) narrows the
    page to its own requests once there are some. */
export function useProgramScope(overridden = false, present?: readonly (Program | null | undefined)[]): ProgramScopeState {
  const focus = useStore((s) => s.programFocus);
  const [params, setParams] = useSearchParams();
  const base = useMemo(() => focusScope(focus), [focus]);
  const held = !!base && !base.program && !!present?.includes(base.own);
  const scope = useMemo(() => (base && held ? { ...base, program: base.own } : base), [base, held]);
  const removed = !!scope && params.get(FOCUS_OFF) === scope.id;
  const active = scope?.program && !removed && !overridden ? scope : null;
  const note = scope && !scope.program ? noDataNote(scope) : null;
  const lift = useCallback(
    (p: URLSearchParams) => {
      const n = new URLSearchParams(p);
      if (scope?.program) n.set(FOCUS_OFF, scope.id);
      return n;
    },
    [scope],
  );
  const remove = useCallback(() => setParams((p) => lift(p), { replace: true }), [setParams, lift]);
  const restore = useCallback(
    () =>
      setParams(
        (p) => {
          const n = new URLSearchParams(p);
          n.delete(FOCUS_OFF);
          return n;
        },
        { replace: true },
      ),
    [setParams],
  );
  return { scope, active, note, removed, remove, restore, lift };
}
