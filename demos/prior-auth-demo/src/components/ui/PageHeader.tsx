import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

/** The white headline card at the top of a page: a serif sentence, one muted line, actions on the right. */
export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-[20px] border border-edge bg-white px-7 py-6">
      <div className="min-w-0">
        <h1 className="font-serif text-[32px] font-semibold leading-[1.15] tracking-tight">{title}</h1>
        {sub ? <div className="mt-2 text-[15px] text-muted">{sub}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </div>
  );
}

export function Crumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="-mb-1.5 flex items-center gap-1.5 text-muted">
      {items.map((c, i) => (
        <span key={c.label} className="flex items-center gap-1.5">
          {c.to ? (
            <Link to={c.to} className="hover:text-ink hover:underline">
              {c.label}
            </Link>
          ) : (
            <span className="text-ink2">{c.label}</span>
          )}
          {i < items.length - 1 ? <ChevronRight size={14} className="ico" /> : null}
        </span>
      ))}
    </nav>
  );
}

/** Wrapper that gives a page its vertical rhythm. */
export function Page({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-[22px]">{children}</div>;
}
