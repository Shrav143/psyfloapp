import { useEffect, useRef, useState, type MouseEvent, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/** The Modal has no focus handling of its own. This puts focus in the dialog when it opens, keeps Tab inside it, and hands focus back to the button that opened it. */
export function useDialogFocus(returnTo: RefObject<HTMLElement | null>): RefObject<HTMLDivElement | null> {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const body = root.current;
    const dialog = body?.closest<HTMLElement>('[role="dialog"]');
    if (!body || !dialog) return;
    body.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const here = document.activeElement;
      if (e.shiftKey && (here === first || here === body)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && here === last) {
        e.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener("keydown", onKey);
    const back = returnTo.current;
    return () => {
      dialog.removeEventListener("keydown", onKey);
      back?.focus();
    };
  }, [returnTo]);
  return root;
}

/** Open and close state for a pop-up, and the button to give focus back to. */
export function useDialogState(): { open: boolean; from: RefObject<HTMLElement | null>; show: (e: MouseEvent<HTMLElement>) => void; hide: () => void } {
  const [open, setOpen] = useState(false);
  const from = useRef<HTMLElement | null>(null);
  return {
    open,
    from,
    show: (e) => {
      from.current = e.currentTarget;
      setOpen(true);
    },
    hide: () => setOpen(false),
  };
}
