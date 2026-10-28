import type { IntakeRecord } from "@/data/intake/types";
import { LevelOfNeed } from "./LevelOfNeed";

/** The Level of Need module, connected to the CANS. The mental health engineer builds it; until then it shows the round 9 review. */
export function LonModule({ record }: { record: IntakeRecord }) {
  return <LevelOfNeed record={record} instead={false} />;
}
