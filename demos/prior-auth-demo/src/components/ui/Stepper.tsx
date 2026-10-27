import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

/** Step indicator: done = green tint with a check, current = forest, later = neutral. */
export function Stepper({ steps, current, onGo, className }: { steps: string[]; current: number; onGo?: (i: number) => void; className?: string }) {
  return (
    <ol className={cn("flex items-center gap-3 text-muted", className)}>
      {steps.map((s, i) => {
        const done = i < current;
        const cur = i === current;
        const clickable = onGo && done;
        return (
          <li key={s} className="flex items-center gap-3">
            <button type="button" disabled={!clickable} onClick={() => clickable && onGo?.(i)} aria-current={cur ? "step" : undefined} className={cn("flex items-center gap-2 font-medium", cur && "text-ink", clickable && "hover:text-ink")}>
              <span className={cn("grid h-[26px] w-[26px] place-items-center rounded-full text-xs font-semibold", done ? "bg-good-bg text-forest" : cur ? "bg-forest text-white" : "bg-neutral-bg text-ink2")}>{done ? <Check size={14} className="ico" /> : i + 1}</span>
              {s}
            </button>
            {i < steps.length - 1 ? <span className="h-0.5 w-10 bg-[#E8E5DF]" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
