import { moduleById } from "@/data/assess/modules";
import type { ModuleId } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { CansModule } from "../cans/CansModule";
import { LonModule } from "../cans/LonModule";
import { SchemaModule } from "./SchemaModule";

/** One assessment module of the plan. The CANS and Level of Need modules have their own renderers (the mental health team's); every other module is drawn
    from its schema (data/assess/schemas) by the schema renderer: fields with provenance, evidence suggestions, score entry or level-of-care review, versions. */
export function InstrumentSection({ record, moduleId }: { record: IntakeRecord; moduleId: ModuleId }) {
  const special = moduleById(moduleId)?.special;
  if (special === "cans") return <CansModule record={record} />;
  if (special === "lon") return <LonModule record={record} />;
  return <SchemaModule key={`${record.id}-${moduleId}`} record={record} moduleId={moduleId} />;
}
