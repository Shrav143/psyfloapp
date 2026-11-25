import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

/** The width of an element, kept current. The studio lays itself out by the room it has, not by the window, because the sidebar takes a fixed share. */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [w, setW] = useState(1200);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/** A line for screen readers. Saying the same thing twice still announces twice. */
export function useAnnouncer(): { message: string; say: (t: string) => void } {
  const [message, setMessage] = useState("");
  const flip = useRef(false);
  const say = useCallback((t: string) => {
    flip.current = !flip.current;
    setMessage(flip.current ? t : `${t} `);
  }, []);
  return { message, say };
}

export const prefersReducedMotion = (): boolean => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Warn before a link, a tab or the window leaves the page while something is unsaved. `ask` receives a function that carries on with what the person was doing. */
export function useLeaveGuard(active: boolean, ask: (proceed: () => void) => void, inside: RefObject<HTMLElement | null>): void {
  const bypass = useRef(false);
  const askRef = useRef(ask);
  askRef.current = ask;
  useEffect(() => {
    if (!active) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (bypass.current || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (!t || inside.current?.contains(t)) return;
      const link = t.closest<HTMLAnchorElement>("a[href]");
      const tab = t.closest<HTMLElement>('[role="tab"]');
      const here = window.location.hash.split("?")[0];
      const goes = link ? (link.getAttribute("href") ?? "").startsWith("#") && (link.getAttribute("href") ?? "").split("?")[0] !== here : false;
      const switchesTab = !!tab && tab.getAttribute("aria-selected") !== "true";
      if (!goes && !switchesTab) return;
      e.preventDefault();
      e.stopPropagation();
      const target = link ?? tab;
      askRef.current(() => {
        bypass.current = true;
        target?.click();
        bypass.current = false;
      });
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active, inside]);
}
