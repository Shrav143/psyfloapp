import { CircleAlert, CircleCheck, CircleDashed, CircleDot, Clock, MinusCircle, type LucideIcon } from "lucide-react";
import { Pill } from "@/components/ui";
import type { InstrumentStatus } from "@/data/assess/types";
import type { Tone } from "@/data/types";
import { cn } from "@/lib/cn";
import type { NavState } from "./nav";

/* Small shared pieces of the workspace: the state mark (a shape and a word, never a color alone) and the tags. */

const MARK: Record<NavState, { icon: LucideIcon; cls: string }> = {
  not_started: { icon: CircleDashed, cls: "text-faint" },
  in_progress: { icon: CircleDot, cls: "text-mid" },
  awaiting_review: { icon: Clock, cls: "text-forest" },
  complete: { icon: CircleCheck, cls: "text-good" },
  attention: { icon: CircleAlert, cls: "text-mid" },
  na: { icon: MinusCircle, cls: "text-faint" },
};

export function StateMark({ state, label, onDark }: { state: NavState; label: string; onDark?: boolean }) {
  const m = MARK[state];
  return (
    <span title={label} className="inline-flex shrink-0">
      <m.icon size={15} className={cn("ico", onDark ? "text-white" : m.cls)} role="img" aria-label={label} />
    </span>
  );
}

export const STATUS_TONE_WORD: Record<InstrumentStatus, { tone: Tone; word: string }> = {
  not_started: { tone: "neutral", word: "Not started" },
  in_progress: { tone: "mid", word: "In progress" },
  awaiting_review: { tone: "mid", word: "Awaiting review" },
  signed: { tone: "good", word: "Signed" },
  superseded: { tone: "neutral", word: "Superseded" },
};
export function StatusPill({ status }: { status: InstrumentStatus }) {
  const s = STATUS_TONE_WORD[status];
  return <Pill tone={s.tone}>{s.word}</Pill>;
}

/** "Preparation": the module starts after the policy date. It is shown, and it does not hold up readiness. */
export function PreparationTag({ onDark }: { onDark?: boolean }) {
  return <span className={cn("rounded-full border px-1.5 text-[11px] leading-[16px] font-medium", onDark ? "border-white/60 text-white" : "border-field text-muted")}>Preparation</span>;
}
