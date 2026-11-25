import { Fragment, useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { useEscape } from "./escape";

export interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
  /** A heading shown above the first option of each group, in the order the options come. */
  group?: string;
}

interface Props<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  /** The value that means "no filter"; the control looks active when value differs from it. */
  defaultValue?: T;
  /** "filter" is the compact pill used in filter bars. "field" is a full-width form select. */
  variant?: "filter" | "field";
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  menuWidth?: number;
  disabled?: boolean;
}

/** A small custom menu. Click outside or press Esc to close. Arrow keys move, Enter picks. */
export function Dropdown<T extends string>({ value, options, onChange, defaultValue, variant = "filter", ariaLabel, placeholder, className, menuWidth, disabled }: Props<T>) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value);
  const active = defaultValue !== undefined && value !== defaultValue;

  useEscape(open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", down);
    return () => document.removeEventListener("mousedown", down);
  }, [open]);

  const pick = (v: T) => {
    onChange(v);
    setOpen(false);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setCursor((c) => Math.min(options.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      pick(options[cursor].value);
    }
  };

  return (
    <div ref={ref} className={cn("relative", variant === "field" && "w-full", className)} onKeyDown={onKey}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={ariaLabel}
        onClick={() => {
          setCursor(Math.max(0, options.findIndex((o) => o.value === value)));
          setOpen((o) => !o);
        }}
        className={cn(
          "flex h-[38px] items-center gap-2 rounded-xl border bg-white px-3 text-left text-sm text-ink transition-colors hover:bg-tile disabled:opacity-50",
          variant === "field" ? "w-full" : "min-w-0",
          active ? "border-forest bg-[#EEF7F6] font-semibold" : "border-field",
        )}
      >
        <span className="truncate">{current?.label ?? placeholder ?? "Select"}</span>
        <ChevronDown size={16} className={cn("ico ml-auto text-faint transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          id={id}
          role="listbox"
          style={{ minWidth: menuWidth ?? 220 }}
          className="psy-fade-up absolute top-[44px] left-0 z-40 max-h-[320px] overflow-auto rounded-[14px] border border-field bg-white p-1.5 shadow-[0_12px_32px_rgba(21,27,36,0.12)]"
        >
          {options.map((o, i) => (
            <Fragment key={o.value}>
              {o.group && o.group !== options[i - 1]?.group ? (
                <div role="presentation" className="px-3 pt-2.5 pb-1 text-[11px] font-semibold tracking-wide text-faint uppercase">
                  {o.group}
                </div>
              ) : null}
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setCursor(i)}
                onClick={() => pick(o.value)}
                className={cn("flex w-full items-center gap-2.5 rounded-[10px] px-3 py-[9px] text-left text-sm", o.value === value ? "bg-[#EEF7F6] font-semibold" : "", i === cursor && o.value !== value ? "bg-tile" : "")}
              >
                <span className="grid w-4 place-items-center text-forest">{o.value === value ? <Check size={16} className="ico" /> : null}</span>
                <span className="flex-1">{o.label}</span>
                {o.hint ? <span className="text-xs text-muted">{o.hint}</span> : null}
              </button>
            </Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
}
