import type { IntakeRecord, IntakeSectionId } from "@/data/intake/types";

export type SectionState = "done" | "attention" | "todo" | "na";
/** The state of each section for the left navigation. Built out by the review engineer from the completeness checklist. */
export function sectionState(_r: IntakeRecord, _s: IntakeSectionId): SectionState {
  return "todo";
}
