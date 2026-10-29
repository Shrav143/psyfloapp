"use client";

import { Play, RotateCcw } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/lib/core-ui/button";
import { SUBMISSION_SCRIPT } from "@/lib/demo/agents";
import { LiveRun } from "@/lib/demo-ui/agent-run";

type Phase = "idle" | "running" | "done";

/** Replays the Navigator's submission script so the room can watch what a filing looks like. */
export function SubmissionReplay() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [take, setTake] = useState(0);
  const onDone = useCallback(() => {
    setPhase("done");
    toast.success("Replay finished · reference number captured to the ledger");
  }, []);
  const start = () => {
    setTake((t) => t + 1);
    setPhase("running");
  };
  return (
    <section className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-slate-900 text-sm">
            What a filing looks like
          </div>
          <div className="text-slate-500 text-xs">
            Signed packet in, reference number out. Seven steps, each logged.
          </div>
        </div>
        <Button
          size="sm"
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700"
          disabled={phase === "running"}
          onClick={start}
        >
          {phase === "done" ? <RotateCcw /> : <Play />}
          {phase === "idle"
            ? "Replay"
            : phase === "running"
              ? "Replaying"
              : "Replay again"}
        </Button>
      </div>
      {phase !== "idle" ? (
        <div className="mt-3">
          <LiveRun
            key={take}
            script={SUBMISSION_SCRIPT}
            running
            onDone={onDone}
          />
        </div>
      ) : null}
    </section>
  );
}
