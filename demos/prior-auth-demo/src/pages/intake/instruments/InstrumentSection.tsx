import { Card, CardBody } from "@/components/ui";
import { moduleById } from "@/data/assess/modules";
import type { ModuleId } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";

/** One assessment module of the plan, drawn from its schema (data/assess/schemas). The instruments engineer builds the renderer; the CANS and Level of Need modules have their own. */
export function InstrumentSection({ record, moduleId }: { record: IntakeRecord; moduleId: ModuleId }) {
  return (
    <Card>
      <CardBody>
        <h2 className="text-[18px] font-semibold">{moduleById(moduleId).label}</h2>
        <p className="mt-1 text-[14px] text-ink2">{moduleById(moduleId).description}</p>
        <p className="mt-3 text-[13px] text-muted">{record.id}: this module is not built yet.</p>
      </CardBody>
    </Card>
  );
}
