import { Card, CardBody, CardHeader, Meter, Pill } from "@/components/ui";
import type { ModuleId } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { AssessmentField } from "./AssessmentField";
import { feedsOf, groupProgress, sectionLabel, type AssessmentGroup } from "./groups";
import { SafetyField } from "./SafetyField";

const HINTS: Record<string, string> = {
  mse: "Observed and written by the clinician. The AI Scribe does not draft mental status observations.",
  needs: "What the person and the records point to. Not a service decision: options are reviewed in Care planning.",
  narrative: "The clinician's own summary. Agents do not write it.",
};

/** One group of the shared interview, named for the shared module it belongs to, with its progress and the modules each answer feeds. */
export function GroupCard({ record, group, active, labelOf, readOnly }: { record: IntakeRecord; group: AssessmentGroup; active: ModuleId[]; labelOf: (id: ModuleId) => string; readOnly: boolean }) {
  const { done, total } = groupProgress(record, group);
  return (
    <Card data-group={group.id}>
      <CardHeader
        title={group.label}
        subtitle={`Part of ${labelOf(group.module)}`}
        right={
          <>
            <span className="w-[72px]" aria-hidden="true"><Meter value={Math.round((done / total) * 100)} color="var(--color-forest)" /></span>
            <Pill tone={done === total ? "good" : done ? "mid" : "neutral"}>{done} of {total} documented</Pill>
          </>
        }
      />
      <CardBody className="py-1">
        {group.sections.map((id) =>
          id === "safety" ? (
            <SafetyField key={id} record={record} readOnly={readOnly} feeds={feedsOf(id, active, labelOf)} />
          ) : (
            <AssessmentField key={id} record={record} id={id} label={sectionLabel(id)} feeds={feedsOf(id, active, labelOf)} hint={HINTS[id]} readOnly={readOnly} />
          ),
        )}
      </CardBody>
    </Card>
  );
}
