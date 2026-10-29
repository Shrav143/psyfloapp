import type { IntakeRecord } from "@/data/intake/types";
import { LevelOfNeed } from "./LevelOfNeed";

/** The Level of Need module, its own section next to the CANS module. The level is always "pending validated policy configuration"; a person may record a
    review note, a service recommendation and a disposition in words. It is not LOCUS, CALOCUS-CASII or ASAM, and nothing is computed. */
export function LonModule({ record }: { record: IntakeRecord }) {
  return (
    <div data-module="lon">
      <LevelOfNeed record={record} instead />
    </div>
  );
}
