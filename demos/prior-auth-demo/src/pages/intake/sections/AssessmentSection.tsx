import { useSearchParams } from "react-router-dom";
import { moduleById } from "@/data/assess/modules";
import type { ModuleId } from "@/data/assess/types";
import { activeModuleIds } from "@/data/intake/scripts";
import type { IntakeRecord } from "@/data/intake/types";
import { AssessmentHeader } from "../assessment/AssessmentHeader";
import { GroupCard } from "../assessment/GroupCard";
import { GROUPS } from "../assessment/groups";
import { GuidedQuestions } from "../assessment/GuidedQuestions";
import { ProgramModulesCard, ReuseBanner } from "../assessment/ModulesCards";
import { RecordIntakeCard } from "../assessment/RecordIntakeCard";
import { usePlan } from "../lib/usePlan";

/** Clinical assessment: the interview every program shares, grouped by the plan's shared modules, with Record Intake, the three modes and the clinician's attestation.
    Each answer says which modules it feeds, so a question is asked once; the program's own questions are in its modules. */
export function AssessmentSection({ record }: { record: IntakeRecord }) {
  const [, setParams] = useSearchParams();
  const plan = usePlan(record);
  const a = record.assessment;
  const signed = a.status === "signed";
  const active: ModuleId[] = record.config ? activeModuleIds(record.config) : [];
  const labelOf = (id: ModuleId): string => plan?.modules.find((m) => m.id === id)?.label ?? moduleById(id).label;
  const open = (panel: "scribe" | "voice") =>
    setParams((p) => {
      const nx = new URLSearchParams(p);
      nx.set("panel", panel);
      return nx;
    });
  return (
    <div className="space-y-4">
      <AssessmentHeader record={record} openScribe={() => open("scribe")} />
      <ReuseBanner record={record} />
      {a.mode === "scribe" || record.scribe ? <RecordIntakeCard record={record} openScribe={() => open("scribe")} /> : null}
      {a.mode === "voice" ? <GuidedQuestions record={record} readOnly={signed} openVoice={() => open("voice")} /> : null}
      {GROUPS.map((g) => <GroupCard key={g.id} record={record} group={g} active={active} labelOf={labelOf} readOnly={signed} />)}
      <ProgramModulesCard record={record} plan={plan} />
    </div>
  );
}
