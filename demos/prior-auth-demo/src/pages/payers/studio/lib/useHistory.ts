import { useCallback, useRef, useState } from "react";

/** Undo and redo for one value. Two commits with the same `merge` key in a row (typing in one field, nudging one node) are one step. */
export interface History<T> {
  present: T;
  canUndo: boolean;
  canRedo: boolean;
  /** Make `next` the present value and remember the one it replaces. */
  commit: (next: T, merge?: string) => void;
  /** Step back or forward. Returns the value now present, or undefined when there was nothing to do. */
  undo: () => T | undefined;
  redo: () => T | undefined;
  /** Replace everything (another workflow was opened). */
  reset: (value: T) => void;
}

const LIMIT = 80;

export function useHistory<T>(initial: T): History<T> {
  const [state, setState] = useState<{ past: T[]; present: T; future: T[]; key?: string }>({ past: [], present: initial, future: [] });
  // The latest state, read by undo and redo so they can return the value they landed on.
  const live = useRef(state);
  live.current = state;

  const commit = useCallback((next: T, merge?: string) => {
    setState((s) => {
      if (next === s.present) return s;
      if (merge && s.key === merge && s.past.length) return { past: s.past, present: next, future: [], key: merge };
      return { past: [...s.past.slice(-(LIMIT - 1)), s.present], present: next, future: [], key: merge };
    });
  }, []);

  const undo = useCallback((): T | undefined => {
    const s = live.current;
    if (!s.past.length) return undefined;
    const previous = s.past[s.past.length - 1];
    setState({ past: s.past.slice(0, -1), present: previous, future: [s.present, ...s.future], key: undefined });
    return previous;
  }, []);

  const redo = useCallback((): T | undefined => {
    const s = live.current;
    if (!s.future.length) return undefined;
    const [next, ...rest] = s.future;
    setState({ past: [...s.past, s.present], present: next, future: rest, key: undefined });
    return next;
  }, []);

  const reset = useCallback((value: T) => setState({ past: [], present: value, future: [], key: undefined }), []);

  return { present: state.present, canUndo: state.past.length > 0, canRedo: state.future.length > 0, commit, undo, redo, reset };
}
