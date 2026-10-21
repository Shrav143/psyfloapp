import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
}

/** Right-hand slide-over. Closes on Esc or a click on the dimmed area. */
export function Drawer({ open, onClose, title, subtitle, right, width = 640, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; right?: ReactNode; width?: number; children: ReactNode; footer?: ReactNode }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#1b1b19]/30" onClick={onClose} />
      <aside style={{ width }} className="psy-slide-in absolute top-0 right-0 flex h-full max-w-full flex-col border-l border-edge bg-canvas shadow-[-12px_0_40px_rgba(40,30,15,0.12)]">
        <header className="flex items-start gap-4 border-b border-edge bg-white px-7 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-[26px] font-semibold leading-tight">{title}</h2>
            {subtitle ? <div className="mt-1.5 text-sm text-muted">{subtitle}</div> : null}
          </div>
          {right}
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-xl border border-field bg-white text-ink2 hover:bg-tile">
            <X size={18} className="ico" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-7 py-6">{children}</div>
        {footer ? <footer className="border-t border-edge bg-white px-7 py-4">{footer}</footer> : null}
      </aside>
    </div>
  );
}

/** Centered dialog for short confirmations and forms. */
export function Modal({ open, onClose, title, subtitle, children, footer, size = "md" }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" }) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[#1b1b19]/35" onClick={onClose} />
      <div className={cn("psy-fade-up relative flex max-h-[88vh] w-full flex-col rounded-[20px] border border-edge bg-white shadow-[0_24px_64px_rgba(40,30,15,0.2)]", size === "sm" ? "max-w-[440px]" : size === "lg" ? "max-w-[860px]" : "max-w-[600px]")}>
        <header className="flex items-start gap-4 border-b border-line px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-[22px] font-semibold leading-tight">{title}</h2>
            {subtitle ? <div className="mt-1 text-sm text-muted">{subtitle}</div> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-ink2 hover:bg-tile">
            <X size={18} className="ico" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <footer className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</footer> : null}
      </div>
    </div>
  );
}
