import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/** A small fold for rows inside a card: one line that is the button, the detail under it. Lighter than the kit's Disclosure, which is a section of its own. */
export function Fold({ head, right, children, defaultOpen = false, open: forced, className, testId }: { head: ReactNode; right?: ReactNode; children: ReactNode; defaultOpen?: boolean; open?: boolean; className?: string; testId?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  // A deep link (an old ?tab= address) can ask for a fold to be open.
  useEffect(() => {
    if (forced) setOpen(true);
  }, [forced]);
  return (
    <div className={className} data-testid={testId}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 rounded-lg py-2 text-left hover:bg-tile/70 focus-visible:outline-2">
        <span className="min-w-0 flex-1">{head}</span>
        {right}
        <ChevronDown size={15} className={cn("ico shrink-0 text-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      <div id={id} hidden={!open}>{open ? children : null}</div>
    </div>
  );
}

/** True while the window is at least `px` wide. */
export function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`;
  const [wide, setWide] = useState(() => typeof window === "undefined" || !window.matchMedia || window.matchMedia(query).matches);
  useEffect(() => {
    if (!window.matchMedia) return;
    const m = window.matchMedia(query);
    const on = () => setWide(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return wide;
}
