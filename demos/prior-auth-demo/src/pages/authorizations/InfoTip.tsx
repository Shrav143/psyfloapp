import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { useEscape } from "@/components/ui";
import { cn } from "@/lib/cn";

/** A small info icon that explains something in a few words. It opens on hover and on keyboard focus, stays open after a click
    (for touch), and Esc or a click elsewhere closes it. The icon is a real button, so it can be reached with Tab. */
export function InfoTip({ label, children, align = "start", className }: { label: string; children: ReactNode; align?: "start" | "end"; className?: string }) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hover || focus || pinned;

  useEscape(open, () => {
    setHover(false);
    setFocus(false);
    setPinned(false);
  });
  useEffect(() => {
    if (!pinned) return;
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setPinned(false);
    };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [pinned]);

  return (
    <span ref={ref} className={cn("relative inline-flex align-middle", className)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={id}
        onClick={() => setPinned((p) => !p)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        className="grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-tile hover:text-ink"
      >
        <Info size={16} className="ico" aria-hidden="true" />
      </button>
      <span
        id={id}
        role="tooltip"
        className={cn(
          "absolute top-full z-40 mt-1.5 w-[min(340px,calc(100vw-64px))] rounded-xl border border-edge bg-white px-4 py-3 text-left text-[13px] font-normal normal-case leading-snug tracking-normal text-ink2 shadow-[0_12px_32px_rgba(40,30,15,0.14)]",
          align === "end" ? "right-0" : "left-0",
          !open && "hidden",
        )}
      >
        {children}
      </span>
    </span>
  );
}
