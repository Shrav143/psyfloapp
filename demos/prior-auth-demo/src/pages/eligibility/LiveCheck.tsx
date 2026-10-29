import { useEffect, useRef, useState } from "react";
import { CircleCheck, Clock } from "lucide-react";
import { AgentBadge, Button, Card, CardHeader, Pill, Spinner } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { cn } from "@/lib/cn";
import { clockText, type VerifyStep } from "./verifySteps";

/** Runs the steps one by one. `onDone` fires half a second after the last one so the final tick is seen. */
export function useLiveCheck(steps: VerifyStep[], onDone: () => void) {
  const [idx, setIdx] = useState(-1); // -1 = not started, steps.length = finished
  const [fast, setFast] = useState(false);
  const [secs, setSecs] = useState(0);
  const ref = useRef({ steps, onDone });
  ref.current = { steps, onDone };
  const running = idx >= 0 && idx < steps.length;
  const finished = idx >= 0 && idx >= steps.length;

  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setIdx((i) => i + 1), fast ? 150 : ref.current.steps[idx].ms);
    return () => clearTimeout(t);
  }, [idx, running, fast]);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  useEffect(() => {
    if (!finished) return;
    const t = setTimeout(() => ref.current.onDone(), 500);
    return () => clearTimeout(t);
  }, [finished]);

  return {
    idx,
    secs,
    running,
    finished,
    started: idx >= 0,
    start: () => {
      setSecs(0);
      setFast(false);
      setIdx(0);
    },
    skip: () => setFast(true),
  };
}

/** The right-hand card: one row per agent, its question while it waits and works, its answer when done. */
export function LiveCheck({ steps, idx, secs, running, finished, onSkip }: { steps: VerifyStep[]; idx: number; secs: number; running: boolean; finished: boolean; onSkip: () => void }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Live check"
        right={
          <>
            {running ? (
              <Button size="sm" variant="ghost" onClick={onSkip}>
                Skip ahead
              </Button>
            ) : null}
            {finished ? <Pill tone="good">Opening the result</Pill> : idx >= 0 ? <Pill tone="neutral">{clockText(secs)}</Pill> : null}
          </>
        }
      />
      <ul aria-label="Live check steps" className="[&>li:last-child]:border-b-0">
        {steps.map((s, i) => {
          const state = i < idx ? "done" : i === idx ? "work" : "wait";
          return (
            <li key={s.id} className={cn("flex items-center gap-3 border-b border-line px-5 py-2.5", state === "wait" && "opacity-55")}>
              <AgentBadge agent={s.agent} size={28} />
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">{AGENTS[s.agent].name}</div>
                <div className="text-[13px] text-muted">{state === "done" ? s.done : s.label}</div>
              </div>
              {state === "done" ? (
                <span className="flex items-center gap-1.5 text-good" aria-label="Done">
                  <CircleCheck size={16} className="ico" />
                  <span className="text-xs text-muted">{clockText(Math.max(1, Math.round(s.ms / 1000)))}</span>
                </span>
              ) : state === "work" ? (
                <span className="flex items-center gap-2 text-[13px] font-medium text-forest">
                  <Spinner />
                  Checking
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[13px] text-muted">
                  <Clock size={14} className="ico" />
                  Waiting
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
