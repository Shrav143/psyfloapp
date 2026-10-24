import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { useEscape } from "@/components/ui";
import { cn } from "@/lib/cn";

/** A button that opens a short menu of actions. Esc and a click outside close it; arrow keys move; Enter picks. */
export interface MenuItem {
  id: string;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  danger?: boolean;
  onPick: () => void;
}

export function MenuButton({ label, icon: Icon, items, variant = "outline", align = "right", ariaLabel, compact }: { label: ReactNode; icon?: LucideIcon; items: MenuItem[]; variant?: "outline" | "primary" | "ghost"; align?: "left" | "right"; ariaLabel?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEscape(open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [open]);

  const pick = (it: MenuItem) => {
    if (it.disabled) return;
    setOpen(false);
    it.onPick();
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (!open) return;
    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const at = enabled.indexOf(cursor);
      const next = enabled[(at + (e.key === "ArrowDown" ? 1 : -1) + enabled.length) % enabled.length];
      setCursor(next);
      ref.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')[next]?.focus();
    }
  };

  return (
    <div ref={ref} className="relative" onKeyDown={onKey}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={ariaLabel}
        onClick={() => {
          setCursor(Math.max(0, items.findIndex((i) => !i.disabled)));
          setOpen((o) => !o);
        }}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-colors",
          compact ? "h-8 rounded-[10px] px-2.5 text-[13px]" : "h-[38px] px-4 text-sm",
          variant === "primary" ? "border border-transparent bg-forest text-white hover:bg-forest-dark" : variant === "ghost" ? "border border-transparent px-2 font-semibold text-forest hover:bg-sage-bg" : "border border-field bg-white text-ink hover:bg-tile",
        )}
      >
        {Icon ? <Icon size={16} className="ico" aria-hidden="true" /> : null}
        {label}
        <ChevronDown size={15} className={cn("ico transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open ? (
        <div id={id} role="menu" className={cn("psy-fade-up absolute top-[calc(100%+6px)] z-40 min-w-[240px] rounded-[14px] border border-field bg-white p-1.5 shadow-[0_12px_32px_rgba(40,30,15,0.12)]", align === "right" ? "right-0" : "left-0")}>
          {items.map((it, i) => (
            <button key={it.id} type="button" role="menuitem" disabled={it.disabled} onMouseEnter={() => setCursor(i)} onClick={() => pick(it)} className={cn("flex w-full items-start gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm disabled:opacity-45", it.danger ? "text-risk-ink hover:bg-risk-bg" : "hover:bg-tile")}>
              {it.icon ? <it.icon size={16} className="ico mt-0.5 shrink-0" aria-hidden="true" /> : null}
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{it.label}</span>
                {it.hint ? <span className="block text-xs text-muted">{it.hint}</span> : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
