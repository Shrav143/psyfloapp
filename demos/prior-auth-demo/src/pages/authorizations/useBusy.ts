import { useCallback, useEffect, useRef, useState } from "react";

/** A short simulated wait (a spinner, then a result). Cleans up if the page is left first. */
export function useBusy(): [boolean, (ms: number, done: () => void) => void] {
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const run = useCallback((ms: number, done: () => void) => {
    setBusy(true);
    timer.current = setTimeout(() => {
      setBusy(false);
      done();
    }, ms);
  }, []);
  return [busy, run];
}
