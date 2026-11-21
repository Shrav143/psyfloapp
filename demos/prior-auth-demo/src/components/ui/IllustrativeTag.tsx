import { cn } from "@/lib/cn";

/** The marker beside a plan-level figure or behavior. The six payers carry real Virginia plan names, but every rate, pattern, turnaround and rule
    the demo shows about one of them is invented. The word is visible; hovering, or a screen reader, gets the reason. */
export function IllustrativeTag({ className }: { className?: string }) {
  const why = "Invented demo figures and behaviors, not the plan's own";
  return (
    <span title={why} className={cn("inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-field bg-white px-2 py-[1px] text-[12px] font-semibold text-muted", className)}>
      Illustrative<span className="sr-only">: {why}</span>
    </span>
  );
}
