import { useEffect, useRef, useState } from "react";
import { copyText } from "./clipboard";

export type CopyState = "idle" | "copied" | "failed";

/** Copy with an answer the person can see: "copied" for two seconds, or "failed" so the page can say how to copy by hand. */
export function useCopy(): { state: CopyState; copy: (text: string) => Promise<void> } {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async (text: string) => {
    const ok = await copyText(text);
    setState(ok ? "copied" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), ok ? 2000 : 8000);
  };
  return { state, copy };
}
