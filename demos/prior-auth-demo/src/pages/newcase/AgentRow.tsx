import { CircleCheck, Clock, PauseCircle } from "lucide-react";
import { AgentBadge, Button, Pill, Spinner } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import type { AgentKey } from "@/data/types";
import { cn } from "@/lib/cn";
import { clockText } from "@/pages/eligibility/verifySteps";
import type { RowText } from "./runText";

/** "paused" is an agent paused in Settings. "failed" could not finish its step and waits for Retry or Skip. */
export type RowState = "done" | "working" | "paused" | "asking" | "waiting" | "failed";

/** One agent: icon, name, what it is doing or found, and its state on the right. */
export function AgentRow({ agent, state, text, elapsed, skipped, onAnswer, onRetry, onSkip }: { agent: AgentKey; state: RowState; text: RowText; elapsed?: number; skipped?: boolean; onAnswer: () => void; onRetry: () => void; onSkip: () => void }) {
  const line = state === "done" ? text.done : state === "waiting" ? text.wait : state === "failed" ? text.failed ?? text.doing : text.doing;
  return (
    <li className={cn("flex items-center gap-3.5 border-b border-line px-6 py-3.5 last:border-b-0", state === "waiting" && "opacity-55")} aria-label={`${AGENTS[agent].name}: ${state}`}>
      <AgentBadge agent={agent} size={36} />
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{AGENTS[agent].name}</div>
        <div className="text-[13px] text-muted">{line}</div>
      </div>
      {state === "done" && skipped ? (
        <Pill tone="mid" dot>
          Skipped and noted
        </Pill>
      ) : state === "done" ? (
        <span className="flex shrink-0 items-center gap-1.5 text-good">
          <CircleCheck size={18} className="ico" aria-label="Done" />
          <span className="text-xs text-muted">{clockText(elapsed ?? 1)}</span>
        </span>
      ) : state === "working" ? (
        <span className="flex shrink-0 items-center gap-2 font-medium text-forest">
          <Spinner />
          Working
        </span>
      ) : state === "paused" ? (
        <Pill tone="mid">
          <PauseCircle size={13} className="ico" />
          Paused in Settings
        </Pill>
      ) : state === "failed" ? (
        <span className="flex shrink-0 items-center gap-2.5">
          <Pill tone="risk" dot>
            Could not finish
          </Pill>
          <Button size="sm" variant="primary" onClick={onRetry}>
            Retry
          </Button>
          <Button size="sm" onClick={onSkip}>
            Skip and note
          </Button>
        </span>
      ) : state === "asking" ? (
        <span className="flex shrink-0 items-center gap-2.5">
          <Pill tone="mid" dot>
            Needs your answer
          </Pill>
          <Button size="sm" variant="primary" onClick={onAnswer}>
            Answer
          </Button>
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-1.5 text-muted">
          <Clock size={16} className="ico" />
          Waiting
        </span>
      )}
    </li>
  );
}
