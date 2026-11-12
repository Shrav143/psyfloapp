import { useLayoutEffect, useState, type RefObject } from "react";

/** The height that takes an element from where it starts to the bottom of the window, less the page's bottom padding, so the page itself never scrolls and
    only the panels inside do. The top bar can be one row or two (it wraps on narrow windows), so the height is measured, not assumed. */
export function useFillViewport(ref: RefObject<HTMLElement | null>, bottom = 56, min = 560): number | null {
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const fit = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setHeight(Math.max(min, Math.round(window.innerHeight - top - bottom)));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [ref, bottom, min]);
  return height;
}
