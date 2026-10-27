import { useSearchParams } from "react-router-dom";
import { Card, CardBody, CardHeader } from "@/components/ui";
import { ASSESSMENT_SECTIONS, type AssessmentSectionId, type IntakeRecord } from "@/data/intake/types";
import { AssessmentHeader } from "../assessment/AssessmentHeader";
import { GuidedQuestions } from "../assessment/GuidedQuestions";
import { documented } from "../assessment/model";
import { SafetyField } from "../assessment/SafetyField";
import { ScribeModeCard } from "../assessment/ScribeModeCard";
import { IntakeField, ValueMeta } from "../shared/provenance";

const HINTS: Partial<Record<AssessmentSectionId, string>> = {
  mse: "Observed and written by the clinician. The AI Scribe does not draft mental status observations.",
  needs: "What the person and the records point to. Not a service decision: options are reviewed in Care pathway.",
  narrative: "The clinician's own summary. Agents do not write it.",
};

function ReadOnlyField({ record, id, label }: { record: IntakeRecord; id: AssessmentSectionId; label: string }) {
  const fv = record.assessment.fields[id];
  return (
    <div data-field={`assessment.${id}`} className="border-b border-line py-3 last:border-b-0">
      <p className="text-[13px] font-semibold text-ink2">{label}</p>
      {fv?.value ? <p className="mt-1 text-[14px] whitespace-pre-line">{fv.value}</p> : <p className="mt-1 text-[14px] text-muted">Not documented</p>}
      {fv ? <ValueMeta record={record} fv={fv} /> : null}
    </div>
  );
}

/** E. Clinical assessment: the twelve sections with their provenance, in one of three modes, signed by a clinician. */
export function AssessmentSection({ record }: { record: IntakeRecord }) {
  const [, setParams] = useSearchParams();
  const a = record.assessment;
  const signed = a.status === "signed";
  const open = (panel: "scribe" | "voice") =>
    setParams((p) => {
      const nx = new URLSearchParams(p);
      nx.set("panel", panel);
      return nx;
    });
  return (
    <div className="space-y-4">
      <AssessmentHeader record={record} />
      {a.mode === "scribe" ? <ScribeModeCard record={record} openScribe={() => open("scribe")} /> : null}
      {a.mode === "voice" ? <GuidedQuestions record={record} readOnly={signed} openVoice={() => open("voice")} /> : null}
      <Card>
        <CardHeader title="Assessment sections" right={<span className="text-[12px] text-muted">{documented(record)} of {ASSESSMENT_SECTIONS.length} documented</span>} />
        <CardBody className="py-1">
          {ASSESSMENT_SECTIONS.map((s) =>
            s.id === "safety" ? (
              <SafetyField key={s.id} record={record} readOnly={signed} />
            ) : signed ? (
              <ReadOnlyField key={s.id} record={record} id={s.id} label={s.label} />
            ) : (
              <IntakeField key={s.id} record={record} section="assessment" field={s.id} label={s.label} kind="long" hint={HINTS[s.id]} />
            ),
          )}
        </CardBody>
      </Card>
    </div>
  );
}
