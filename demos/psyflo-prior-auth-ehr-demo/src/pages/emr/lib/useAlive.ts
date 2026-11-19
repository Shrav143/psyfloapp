import { useEffect, useRef } from "react";

/** True while the component is mounted. Simulated agent work checks it before it touches state.
    The effect sets it back to true so React's StrictMode double-run does not leave it false. */
export function useAlive(): { current: boolean } {
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  return alive;
}
