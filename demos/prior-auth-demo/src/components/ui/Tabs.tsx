import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Count } from "./Pill";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  badge?: ReactNode;
}

/** Pill-style switch (white track, forest active segment). */
export function Segmented<T extends string>({ items, value, onChange, className }: { items: TabItem<T>[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn("inline-flex rounded-xl border border-field bg-white p-0.5", className)}>
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === value}
          onClick={() => onChange(t.id)}
          className={cn("flex h-[30px] items-center justify-center gap-1.5 rounded-[10px] px-3.5 text-sm font-medium", t.id === value ? "bg-forest text-white" : "text-ink2 hover:bg-tile")}
        >
          {t.label}
          {t.badge !== undefined ? <span className={cn("inline-grid h-[17px] min-w-[17px] place-items-center rounded-full px-1.5 text-[11px] font-semibold", t.id === value ? "bg-white/25 text-white" : "bg-mid-bg text-mid-ink")}>{t.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

/** Underlined tabs for page sections (case page, referral detail). */
export function UnderlineTabs<T extends string>({ items, value, onChange, className }: { items: TabItem<T>[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cn("flex gap-7 border-b border-[#EADFD2]", className)}>
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === value}
          onClick={() => onChange(t.id)}
          className={cn("-mb-px flex items-center gap-2 border-b-2 py-2.5 font-medium", t.id === value ? "border-forest text-forest" : "border-transparent text-muted hover:text-ink")}
        >
          {t.label}
          {t.badge !== undefined ? <Count className="h-5 min-w-5">{t.badge}</Count> : null}
        </button>
      ))}
    </div>
  );
}
