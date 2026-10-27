import { Check, Minus, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { NEW_CASE_STEPS } from "./steps";
import { STEP_STATE_LABEL, type StepInfo, type StepState } from "./stepState";

/** The indicator at the left of a step: a check when it is complete, forest green when it is the step on screen, a tint for the others by state. */
const DOT: Record<StepState, string> = {
  complete: "bg-good-bg text-forest",
  attention: "bg-mid-bg text-mid-ink",
  pending: "bg-neutral-bg text-ink2",
  na: "border border-dashed border-faint bg-white text-faint",
  blocked: "bg-risk-bg text-risk-ink",
};
const LABEL: Record<StepState, string> = { complete: "text-good-ink", attention: "text-mid-ink", pending: "text-muted", na: "text-muted", blocked: "text-risk-ink" };

function Dot({ index, state, current }: { index: number; state: StepState; current: boolean }) {
  return (
    <span className={cn("grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-xs font-semibold", current ? "bg-forest text-white" : DOT[state])}>
      {state === "complete" ? <Check size={14} className="ico" /> : state === "attention" ? <TriangleAlert size={13} className="ico" /> : state === "blocked" ? <X size={14} className="ico" /> : state === "na" ? <Minus size={13} className="ico" /> : index + 1}
    </span>
  );
}

/** The four steps. Every step can be opened at any time, forward or back; the draft holds the progress, so nothing typed is lost. Each shows its state in a small label under its name. */
export function NewCaseStepper({ steps, current, onGo, className }: { steps: StepInfo[]; current: number; onGo: (i: number) => void; className?: string }) {
  return (
    <ol aria-label="Steps" className={cn("flex flex-wrap items-start gap-x-2 gap-y-3 text-muted", className)}>
      {steps.map((s, i) => {
        const cur = i === current;
        return (
          <li key={s.id} className="flex items-start gap-2">
            <button type="button" onClick={() => onGo(i)} aria-current={cur ? "step" : undefined} title={s.note} className={cn("flex items-start gap-2.5 rounded-xl px-1.5 py-1 text-left hover:bg-white/70", cur ? "text-ink" : "")}>
              <Dot index={i} state={s.state} current={cur} />
              <span className="flex flex-col leading-tight">
                <span className={cn("text-sm font-medium", cur ? "text-ink" : "text-ink2")}>{NEW_CASE_STEPS[i]}</span>
                <span className={cn("mt-0.5 text-xs", LABEL[s.state])}>{STEP_STATE_LABEL[s.state]}</span>
              </span>
            </button>
            {i < steps.length - 1 ? <span aria-hidden="true" className="mt-[17px] hidden h-0.5 w-6 bg-[#E8E5DF] min-[1180px]:block" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
