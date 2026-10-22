import { useEffect } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** The panel on top: dialogs and drawers are added to the page newest last. */
const topDialog = (): HTMLElement | null => {
  const all = document.querySelectorAll<HTMLElement>('[role="dialog"]');
  return all.length ? all[all.length - 1] : null;
};
const focusableIn = (root: HTMLElement): HTMLElement[] => [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null);

/** Keyboard focus for a right-hand panel, which the shared Drawer does not manage. Use it in the component that is mounted while the panel is open:
    focus moves into the panel, Tab and Shift+Tab stay inside the panel on top, and when the component goes away `returnTo` says what takes focus
    (nothing, if that element is gone, as when the person followed a link out of the panel). */
export function useDialogFocus(returnTo: () => HTMLElement | null): void {
  useEffect(() => {
    const start = requestAnimationFrame(() => {
      const dlg = topDialog();
      if (dlg && !dlg.contains(document.activeElement)) (dlg.querySelector<HTMLElement>('button[aria-label="Close"]') ?? focusableIn(dlg)[0])?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const dlg = topDialog();
      const items = dlg ? focusableIn(dlg) : [];
      if (!dlg || items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const at = document.activeElement as HTMLElement | null;
      if (!at || !dlg.contains(at) || (e.shiftKey && at === first) || (!e.shiftKey && at === last)) {
        e.preventDefault();
        (e.shiftKey && at && dlg.contains(at) ? last : first).focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(start);
      document.removeEventListener("keydown", onKey);
      requestAnimationFrame(() => returnTo()?.focus());
    };
  }, []);
}
