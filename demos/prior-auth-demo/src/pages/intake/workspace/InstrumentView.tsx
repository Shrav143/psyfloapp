import { ClipboardList } from "lucide-react";
import { Button, Card, CardHeader, EmptyState } from "@/components/ui";
import { MODULE_IDS, moduleById } from "@/data/assess/modules";
import type { ModuleId } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { CansModule } from "../cans/CansModule";
import { LonModule } from "../cans/LonModule";
import { InstrumentSection } from "../instruments/InstrumentSection";
import { ModuleTable } from "./overview/ModuleTable";
import type { NavItem } from "./nav";

/** One assessment module, drawn by the section that owns it: the CANS and Level of Need modules have their own, every other module is drawn from its schema.
    A module that is not in this intake's plan says so and offers to add it. */
export function InstrumentView({ record, moduleId, inPlan, go }: { record: IntakeRecord; moduleId: ModuleId; inPlan: boolean; go: () => void }) {
  const add = useStore((s) => s.setModuleActive);
  if (!MODULE_IDS.includes(moduleId)) {
    return (
      <Card><EmptyState icon={ClipboardList} title="That module does not exist" action={<Button onClick={go}>Back to the overview</Button>}>The address names a module this demo does not have.</EmptyState></Card>
    );
  }
  if (!inPlan) {
    return (
      <Card data-section-view="module-missing">
        <EmptyState
          icon={ClipboardList}
          title={`${moduleById(moduleId).label} is not in this intake's plan`}
          action={<div className="flex flex-wrap justify-center gap-2">{record.config ? <Button variant="primary" onClick={() => add(record.id, moduleId, true)}>Add it to this intake</Button> : null}<Button onClick={go}>Back to the overview</Button></div>}
        >
          {record.config ? "A person can add a module the plan does not list. It is recorded as clinician selected." : "Configure the intake first to load its assessments."}
        </EmptyState>
      </Card>
    );
  }
  return (
    <div data-section-view="module" data-module={moduleId}>
      {moduleId === "cans" ? <CansModule record={record} /> : moduleId === "lon" ? <LonModule record={record} /> : <InstrumentSection record={record} moduleId={moduleId} />}
    </div>
  );
}

/** Assessment instruments, all of them: this intake's modules and where each stands. */
export function InstrumentsIndex({ record, items }: { record: IntakeRecord; items: NavItem[] }) {
  const modules = items.filter((i) => i.child);
  return (
    <Card data-section-view="instruments">
      <CardHeader title="Assessment instruments" subtitle={record.config ? `${modules.length} in this plan` : "Not configured"} />
      {modules.length ? (
        <ModuleTable record={record} items={modules} />
      ) : (
        <EmptyState icon={ClipboardList} title={record.config ? "No assessment instruments in this plan" : "No plan yet"}>{record.config ? "A person can add modules in the configuration." : "Configure the intake to load the assessments this person needs."}</EmptyState>
      )}
    </Card>
  );
}
