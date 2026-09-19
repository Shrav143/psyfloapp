"use client";

import {
  CheckCircle2,
  CircleDashed,
  Loader2,
  OctagonAlert,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { RunStep } from "@/lib/demo/agents";
import { cn } from "@/lib/tailwind-utils";

function Icon({ state }: { state: RunStep["state"] }) {
  if (state === "done") {
    return <CheckCircle2 className="size-4 text-emerald-500" />;
  }
  if (state === "active") {
    return <Loader2 className="size-4 animate-spin text-indigo-500" />;
  }
  if (state === "blocked") {
    return <OctagonAlert className="size-4 text-amber-500" />;
  }
  return <CircleDashed className="size-4 text-slate-300" />;
}

export function RunSteps({
  steps,
  compact,
}: {
  steps: RunStep[];
  compact?: boolean;
}) {
  return (
    <ol className={cn("space-y-2", compact && "space-y-1")}>
      {steps.map((s) => (
        <li key={s.label} className="flex items-start gap-2.5">
          <div className="mt-0.5 shrink-0">
            <Icon state={s.state} />
          </div>
          <div className="min-w-0">
            <div
              className={cn(
                "text-sm",
                s.state === "pending" ? "text-slate-400" : "text-slate-800",
              )}
            >
              {s.label}
            </div>
            {s.detail && !compact ? (
              <div className="text-slate-500 text-xs">{s.detail}</div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Plays a scripted agent run step by step, then calls onDone. Purely cosmetic timing. */
export function LiveRun({
  script,
  onDone,
  running,
}: {
  script: RunStep[];
  onDone?: () => void;
  running: boolean;
}) {
  const [index, setIndex] = useState(-1);
  useEffect(() => {
    if (!running) {
      setIndex(-1);
      return;
    }
    let i = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      setIndex(i);
      const ms = script[i]?.ms ?? 900;
      timer = setTimeout(() => {
        i += 1;
        if (i < script.length) {
          tick();
        } else {
          setIndex(script.length);
          onDone?.();
        }
      }, ms);
    };
    tick();
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [running, script, onDone]);
  const steps: RunStep[] = script.map((s, i) => ({
    ...s,
    state: i < index ? "done" : i === index ? "active" : "pending",
  }));
  return <RunSteps steps={steps} />;
}
