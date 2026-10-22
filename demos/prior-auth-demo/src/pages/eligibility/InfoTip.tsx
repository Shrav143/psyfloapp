import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { useEscape } from "@/components/ui";
import { cn } from "@/lib/cn";

/** A small info icon that holds text a banner used to carry. The text opens on hover, on keyboard focus or on a click, and closes on Escape,
    on a click elsewhere or when the pointer and focus leave. The icon is a real button with aria-expanded, and the text is its description. */
export function InfoTip({ label, children, align = "left", className }: { label: string; children: ReactNode; align?: "left" | "right"; className?: string }) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
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
        hidden={!open}
        className={cn("absolute top-full z-30 mt-1.5 w-[min(340px,calc(100vw-72px))] rounded-xl border border-edge bg-white px-3.5 py-3 text-left font-sans text-[13px] font-normal normal-case leading-[1.45] tracking-normal text-ink2 shadow-[0_8px_28px_rgba(40,30,20,0.14)]", align === "left" ? "left-0" : "right-0")}
      >
        {children}
      </span>
    </span>
  );
}
