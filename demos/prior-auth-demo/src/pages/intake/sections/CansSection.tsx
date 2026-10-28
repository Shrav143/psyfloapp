import type { IntakeRecord } from "@/data/intake/types";
import { CansModule } from "../cans/CansModule";
import { LonModule } from "../cans/LonModule";

/** CANS Lifetime and Level of Need together, for a view that wants both on one screen (the older workspace section). The new workspace draws them as two
    modules of the plan: CansModule and LonModule, each its own section of Assessment instruments. */
export function CansSection({ record }: { record: IntakeRecord }) {
  return (
    <div className="space-y-5">
      <CansModule record={record} />
      <LonModule record={record} />
    </div>
  );
}
