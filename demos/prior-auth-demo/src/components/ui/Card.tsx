import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[20px] border border-edge bg-white", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, right, className }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 border-b border-line px-6 pt-5 pb-[18px]", className)}>
      <div className="min-w-0">
        <h3 className="font-serif text-[21px] font-semibold leading-tight tracking-tight">{title}</h3>
        {subtitle ? <p className="mt-[3px] text-[13.5px] text-muted">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-6 py-[22px]", className)}>{children}</div>;
}

/** Small uppercase label used above values. */
export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("text-[11.5px] font-medium uppercase tracking-[0.1em] text-muted", className)}>{children}</div>;
}
