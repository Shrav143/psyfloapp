import { PathwaySection } from "../sections/PathwaySection";
import type { IntakeRecord } from "@/data/intake/types";

/** Care planning: the clinical summary, potential pathways, the care plan and the way into an authorization. The care planning engineer builds it; until then it shows the pathways. */
export function CarePlanningSection({ record }: { record: IntakeRecord }) {
  return <PathwaySection record={record} />;
}
