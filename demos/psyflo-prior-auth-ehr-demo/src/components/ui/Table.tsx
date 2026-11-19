import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Styled table primitives. Uppercase muted headers, hairline dividers. Use `nowrap` for tables with IDs and dates. */
export function Table({ className, nowrap, children }: { className?: string; nowrap?: boolean; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-left", nowrap && "[&_td]:whitespace-nowrap [&_th]:whitespace-nowrap", className)}>{children}</table>
    </div>
  );
}
export function Th({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("border-b border-line px-[18px] py-3.5 text-[11px] font-medium uppercase tracking-[0.09em] text-muted first:pl-6 last:pr-6", className)} {...rest} />;
}
export function Td({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-line px-[18px] py-4 align-middle first:pl-6 last:pr-6", className)} {...rest} />;
}
/** A clickable row gets a hover tint; `selected` gives the green tint. */
export function Tr({ className, selected, onClick, ...rest }: HTMLAttributes<HTMLTableRowElement> & { selected?: boolean }) {
  return (
    <tr
      onClick={onClick}
      className={cn("[&:last-child>td]:border-b-0", onClick && "cursor-pointer hover:bg-[#FBF8F3]", selected && "bg-[#F3F7F4] hover:bg-[#F3F7F4]", className)}
      {...rest}
    />
  );
}
/** Underlined ID link style used for case IDs. */
export function IdLink({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="font-semibold underline decoration-1 underline-offset-[3px] hover:text-forest">
      {children}
    </button>
  );
}
