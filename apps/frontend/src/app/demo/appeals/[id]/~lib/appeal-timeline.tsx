"use client";

import {
  CircleCheck,
  CircleDashed,
  LoaderCircle,
  Signature,
} from "lucide-react";
import type { AppealStep, StepState } from "@/lib/demo/appeals";
import { fmtDate } from "@/lib/demo/format";
import { Panel } from "@/lib/demo-ui/primitives";
import { cn } from "@/lib/tailwind-utils";

function StepIcon({ state }: { state: StepState }) {
  if (state === "completed") {
    return <CircleCheck className="size-5 text-emerald-500" />;
  }
  if (state === "in_progress") {
    return <LoaderCircle className="size-5 animate-spin text-indigo-500" />;
  }
  if (state === "gate") {
    return (
      <span className="flex size-6 items-center justify-center rounded-full bg-violet-100 ring-2 ring-violet-300">
        <Signature className="size-3.5 text-violet-700" />
      </span>
    );
  }
  return <CircleDashed className="size-5 text-slate-300" />;
}

export function AppealTimeline({ steps }: { steps: AppealStep[] }) {
  const done = steps.filter((s) => s.state === "completed").length;
  return (
    <Panel
      title="Case timeline"
      description={`${done} of ${steps.length} steps · appended, never overwritten`}
      padded={false}
    >
      <ol className="relative px-5 py-4">
        <div
          className="absolute top-6 bottom-6 left-[29px] w-px bg-slate-200"
          aria-hidden
        />
        {steps.map((s) => {
          const gate = s.state === "gate";
          const pending = s.state === "pending";
          return (
            <li key={s.key} className="relative flex gap-3 pb-5 last:pb-0">
              <div className="relative z-10 flex size-6 shrink-0 items-center justify-center bg-white">
                <StepIcon state={s.state} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div
                  className={cn(
                    "font-medium text-sm",
                    pending
                      ? "text-slate-400"
                      : gate
                        ? "text-violet-800"
                        : "text-slate-900",
                  )}
                >
                  {s.title}
                </div>
                {s.at ? (
                  <div className="text-slate-500 text-xs tabular-nums">
                    {fmtDate(s.at, true)}
                  </div>
                ) : null}
                {gate ? (
                  <div className="mt-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] text-violet-800">
                    clinician signs here — nothing leaves without it
                  </div>
                ) : s.note ? (
                  <div
                    className={cn(
                      "mt-0.5 text-xs",
                      pending ? "text-slate-400" : "text-slate-600",
                    )}
                  >
                    {s.note}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
