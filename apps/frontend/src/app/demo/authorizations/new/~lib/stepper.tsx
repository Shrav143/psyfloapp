"use client";

import { Check, Lock } from "lucide-react";
import { Progress } from "@/lib/core-ui/progress";
import { cn } from "@/lib/tailwind-utils";
import { STEPS, SUBMIT_STEP } from "./wizard-model";

export function Stepper({
  step,
  signed,
  onSelect,
}: {
  step: number;
  signed: boolean;
  onSelect: (i: number) => void;
}) {
  const done = Math.round(((step + 1) / STEPS.length) * 100);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <ol className="grid gap-2 md:grid-cols-5">
        {STEPS.map((s, i) => {
          const complete = i < step;
          const active = i === step;
          const locked = i === SUBMIT_STEP && !signed;
          return (
            <li key={s.key}>
              <button
                type="button"
                disabled={locked}
                onClick={() => onSelect(i)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                  active ? "bg-indigo-50" : "hover:bg-slate-50",
                  locked && "cursor-not-allowed opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full font-semibold text-xs",
                    complete
                      ? "bg-emerald-500 text-white"
                      : active
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-300 text-slate-500",
                  )}
                >
                  {complete ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-slate-500 uppercase tracking-wide">
                    Step {i + 1}
                  </span>
                  <span
                    className={cn(
                      "block truncate text-sm",
                      active
                        ? "font-semibold text-indigo-700"
                        : "font-medium text-slate-800",
                    )}
                  >
                    {s.title}
                  </span>
                </span>
                {locked ? (
                  <Lock className="size-3.5 shrink-0 text-slate-400" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex items-center gap-3">
        <Progress
          value={done}
          className="h-1.5 bg-slate-100 [&>div]:bg-indigo-600"
        />
        <span className="shrink-0 text-slate-500 text-xs tabular-nums">
          Step {step + 1} of {STEPS.length}
        </span>
      </div>
    </div>
  );
}
