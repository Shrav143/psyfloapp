import type { Stage } from "@/data/workflow/types";
import { NEW_AUTH_STEPS } from "../steps";

const NAME: Record<Stage, string> = { intake: NEW_AUTH_STEPS[0], eligibility: NEW_AUTH_STEPS[1], documentation: NEW_AUTH_STEPS[2], preparation: NEW_AUTH_STEPS[2], review: NEW_AUTH_STEPS[3] };

/** The engine keeps five stages; New Authorization shows four, with the agents' preparation inside Clinical Documentation. A stage is named by the stage it shows in. */
export const caseStageLabel = (stage: Stage): string => NAME[stage];
