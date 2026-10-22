import { Pill } from "@/components/ui";
import { NEW_CASE_STEPS } from "./steps";
import { STEP_STATE_LABEL, STEP_STATE_TONE, type StepInfo } from "./stepState";

/** One line above the step: which step this is, its state and the one reason for it. The same state shows under the step in the stepper. */
export function StepHeader({ index, info }: { index: number; info: StepInfo }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
      <span className="text-[11.5px] font-medium tracking-[0.1em] text-muted uppercase">Step {index + 1} of {NEW_CASE_STEPS.length}</span>
      <h2 className="font-serif text-[22px] font-semibold tracking-tight">{NEW_CASE_STEPS[index]}</h2>
      <Pill tone={STEP_STATE_TONE[info.state]} dot>{STEP_STATE_LABEL[info.state]}</Pill>
      <span className="text-[13px] text-muted">{info.note}</span>
    </div>
  );
}
