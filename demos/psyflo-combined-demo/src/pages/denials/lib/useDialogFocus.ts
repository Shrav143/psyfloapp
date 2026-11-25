import { useEffect, useRef, useState, type MouseEvent, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/** The Modal and the Drawer have no focus handling of their own. This puts focus in the dialog when it opens (on the first of the `initial` selectors that matches anywhere in the dialog,
    its footer included, else on the body), keeps Tab inside it, and hands focus back to the button that opened it when it closes.
    The button is read when the dialog closes, so a panel opened by the page itself can name it late. */
export function useDialogFocus(returnTo: RefObject<HTMLElement | null>, initial: string[] = []): RefObject<HTMLDivElement | null> {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const body = root.current;
    const dialog = body?.closest<HTMLElement>('[role="dialog"]');
    if (!body || !dialog) return;
    const first = initial.map((sel) => dialog.querySelector<HTMLElement>(sel)).find((el) => !!el);
    (first ?? body).focus({ preventScroll: true });
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
    return () => {
      dialog.removeEventListener("keydown", onKey);
      returnTo.current?.focus();
    };
  }, [returnTo, initial.join("|")]);
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
