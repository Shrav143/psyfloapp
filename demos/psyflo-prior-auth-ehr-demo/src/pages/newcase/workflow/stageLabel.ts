import { STAGE_LABEL, type Stage } from "@/data/workflow/types";

/** The engine keeps five stages; New Case shows four steps, with the agents' preparation inside Clinical documentation. A stage is named by the step it shows in. */
export const caseStageLabel = (stage: Stage): string => (stage === "preparation" ? STAGE_LABEL.documentation : STAGE_LABEL[stage]);
