import type { ReactNode } from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Label } from "./Card";

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn("ico psy-spin text-forest", className)} aria-label="Working" />;
}

export function EmptyState({ icon: Icon, title, children, action }: { icon?: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      {Icon ? (
        <span className="grid h-12 w-12 place-items-center rounded-full bg-neutral-bg text-ink2">
          <Icon size={22} className="ico" />
        </span>
      ) : null}
      <div className="font-serif text-[18px] font-semibold">{title}</div>
      {children ? <div className="max-w-sm text-sm text-muted">{children}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/** Two-column facts list: muted label, value. */
export function KeyValue({ items, className }: { items: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-[140px_1fr] gap-x-3 gap-y-2.5", className)}>
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A small tinted fact tile (label, value, note) used in payer and patient headers. */
export function Fact({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-tile-edge bg-tile px-4 py-3.5">
      <Label>{label}</Label>
      <div className="mt-1 text-[18px] font-semibold">{value}</div>
      {note ? <div className="text-xs text-muted">{note}</div> : null}
    </div>
  );
}

/** Row inside a card list (hairline between rows). */
export function ListRow({ children, onClick, selected, className }: { children: ReactNode; onClick?: () => void; selected?: boolean; className?: string }) {
  const base = cn("flex items-center gap-3 border-b border-line px-6 py-3.5 last:border-b-0", selected && "bg-[#EEF7F6]", className);
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(base, "w-full text-left hover:bg-[#FAF9F6]")}>
      {children}
    </button>
  ) : (
    <div className={base}>{children}</div>
  );
}

/** Round icon bubble used beside list rows and recommendations. */
export function IconBubble({ icon: Icon, size = 36, className }: { icon: LucideIcon; size?: number; className?: string }) {
  return (
    <span className={cn("inline-grid shrink-0 place-items-center rounded-full bg-neutral-bg text-neutral-ink", className)} style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.5)} className="ico" />
    </span>
  );
}
