import type { IntakeRecord } from "@/data/intake/types";
import { CansSection } from "../sections/CansSection";

/** The CANS Lifetime module: Assessment Items, Evidence Review and Assessment Summary tabs. The mental health engineer builds it; until then it shows the round 9 section. */
export function CansModule({ record }: { record: IntakeRecord }) {
  return <CansSection record={record} />;
}
