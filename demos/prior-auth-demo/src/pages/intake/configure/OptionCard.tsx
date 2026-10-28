import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A group of choice cards that behaves as one radio group: Tab enters it, the arrow keys move between the cards and choose, Space or Enter chooses. */
export function OptionGroup({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!next || !ref.current) return;
    const radios = [...ref.current.querySelectorAll<HTMLButtonElement>('[role="radio"]:not([aria-disabled="true"])')];
    const at = radios.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    e.preventDefault();
    const to = radios[(at + next + radios.length) % radios.length];
    to.focus();
    to.click();
  };
  return (
    <div ref={ref} role="radiogroup" aria-label={label} onKeyDown={onKeyDown} className={className}>
      {children}
    </div>
  );
}

/** One choice. A card that cannot be chosen stays focusable (aria-disabled) so its reason can be read with the keyboard. */
export function OptionCard({ selected, onSelect, disabled, title, badge, children, className }: { selected: boolean; onSelect: () => void; disabled?: boolean; title: ReactNode; badge?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && onSelect()}
      className={cn(
        "w-full rounded-2xl border p-4 text-left transition-colors",
        selected ? "border-forest bg-[#EEF7F6]" : "border-edge bg-white",
        disabled ? "cursor-not-allowed bg-tile text-muted" : !selected && "hover:bg-tile",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px]", selected ? "border-forest" : "border-[#D9D6CF]")}>{selected ? <span className="h-2 w-2 rounded-full bg-forest" /> : null}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[14px] font-semibold">{title}</span>
            {badge}
          </div>
          {children ? <div className="mt-1 text-[13px] text-muted">{children}</div> : null}
        </div>
      </div>
    </button>
  );
}
