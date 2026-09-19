import type { ReactNode } from "react";
import { cn } from "@/lib/tailwind-utils";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <div className="mb-1 font-medium text-indigo-600 text-xs uppercase tracking-wide">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-semibold text-2xl text-slate-900 tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-slate-600 text-sm">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  right,
  children,
  className,
  padded = true,
}: {
  title?: string;
  description?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      {title ? (
        <header className="flex items-start justify-between gap-4 border-slate-100 border-b px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-slate-500 text-xs">{description}</p>
            ) : null}
          </div>
          {right}
        </header>
      ) : null}
      <div className={cn(padded ? "p-5" : "")}>{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "slate",
  children,
  onClick,
  active,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "slate" | "red" | "amber" | "green" | "blue" | "violet";
  children?: ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  const toneText: Record<string, string> = {
    slate: "text-slate-900",
    red: "text-rose-600",
    amber: "text-amber-600",
    green: "text-emerald-600",
    blue: "text-blue-600",
    violet: "text-violet-600",
  };
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "rounded-xl border bg-white p-4 text-left shadow-sm transition-colors",
        onClick && "hover:border-indigo-300 hover:bg-indigo-50/40",
        active
          ? "border-indigo-400 ring-2 ring-indigo-100"
          : "border-slate-200",
      )}
    >
      <div className="text-slate-500 text-xs uppercase tracking-wide">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-semibold text-2xl tracking-tight",
          toneText[tone],
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-1 text-slate-500 text-xs">{hint}</div> : null}
      {children}
    </Comp>
  );
}

export function KV({
  items,
  className,
}: {
  items: { k: string; v: ReactNode }[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm",
        className,
      )}
    >
      {items.map((it) => (
        <div key={it.k} className="contents">
          <dt className="text-slate-500">{it.k}</dt>
          <dd className="font-medium text-slate-900">{it.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 border-dashed p-8 text-center">
      <div className="font-medium text-slate-700 text-sm">{title}</div>
      {body ? <div className="mt-1 text-slate-500 text-xs">{body}</div> : null}
    </div>
  );
}

export function PayerChip({ color, name }: { color: string; name: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-700 text-sm">
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}
