import { CarePlanningSection } from "../care/CarePlanningSection";
import type { IntakeRecord } from "@/data/intake/types";

/** The round 9 name of the care pathway section, kept for the records page that still maps `pathway` to it. Care planning draws it. */
export function PathwaySection({ record }: { record: IntakeRecord }) {
  return <CarePlanningSection record={record} />;
}
