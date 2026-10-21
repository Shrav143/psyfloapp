import { BAR_STEPS } from "@/data/cases";
import { cn } from "@/lib/cn";

/** The eight steps of a case. Done steps are green, the current one is sage with a bold label, the rest are grey. */
export function StepBar({ current }: { current: number }) {
  return (
    <ol className="my-2.5 grid grid-cols-8 gap-1" aria-label="Progress">
      {BAR_STEPS.map((s, i) => (
        <li key={s} aria-current={i === current ? "step" : undefined}>
          <div className={cn("h-1.5 rounded-full", i < current ? "bg-good" : i === current ? "bg-sage" : "bg-[#E9DFD2]")} />
          <div className={cn("mt-1 text-xs", i === current ? "font-semibold text-ink" : "text-muted")}>{s}</div>
        </li>
      ))}
    </ol>
  );
}
