import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { useEscape } from "@/components/ui";
import { cn } from "@/lib/cn";

export interface MenuItem { id: string; label: string; icon: LucideIcon; onSelect: () => void; disabled?: boolean; hint?: string; danger?: boolean; group?: string }

/** A button that opens a short list of actions. Arrow keys move, Enter picks, Esc closes and gives the focus back. */
export function ActionMenu({ label, items, icon: Icon, children }: { label: string; items: MenuItem[]; icon?: LucideIcon; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEscape(open, () => {
    setOpen(false);
    trigger.current?.focus();
  });
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", down);
    root.current?.querySelector<HTMLButtonElement>("[role=menuitem]:not(:disabled)")?.focus();
    return () => document.removeEventListener("mousedown", down);
  }, [open]);
  const move = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const els = [...(root.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)") ?? [])];
    const at = els.indexOf(document.activeElement as HTMLButtonElement);
    els[(at + (e.key === "ArrowDown" ? 1 : -1) + els.length) % els.length]?.focus();
  };
  return (
    <div ref={root} className="relative" onKeyDown={move}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 items-center gap-2 rounded-[10px] border border-field bg-white px-3 text-[13px] font-medium whitespace-nowrap text-ink hover:bg-tile"
      >
        {Icon ? <Icon size={16} className="ico" /> : null}
        <span className="hidden @4xl:inline">{children ?? label}</span>
        <ChevronDown size={14} className={cn("ico text-faint transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div role="menu" aria-label={label} className="psy-fade-up absolute top-[36px] right-0 z-40 w-[260px] rounded-[14px] border border-field bg-white p-1.5 shadow-[0_12px_32px_rgba(21,27,36,0.12)]">
          {items.map((it, i) => (
            <div key={it.id}>
              {it.group && it.group !== items[i - 1]?.group ? <div role="presentation" className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">{it.group}</div> : null}
              <button
                type="button"
                role="menuitem"
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
                className={cn("flex w-full items-start gap-2.5 rounded-[10px] px-3 py-2 text-left text-[13px] hover:bg-tile disabled:opacity-50", it.danger && "text-risk-ink")}
              >
                <it.icon size={15} className="ico mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{it.label}</span>
                  {it.hint ? <span className="block text-[12px] font-normal text-muted">{it.hint}</span> : null}
                </span>
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
