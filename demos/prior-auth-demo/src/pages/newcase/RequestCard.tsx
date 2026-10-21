import { Clock } from "lucide-react";
import { Banner, Card, CardBody, CardHeader, Dropdown, Field, TextArea, TextInput } from "@/components/ui";
import { NEW_REQUEST_TYPES, type CaseDraft } from "@/data/cases";
import { PROGRAM_LABEL, PROGRAMS, type Program, type RequestType } from "@/data/types";
import { useStore } from "@/store";
import { CoverageLine } from "./CoverageLine";
import { DiagnosisPicker } from "./DiagnosisPicker";

const NOTICE: Partial<Record<RequestType, string>> = {
  Admission: "The admission notice is due about 5 hours from now. Most payers want it within 24 hours of admission.",
  "Retro-authorization": "The retro window closes in about 18 hours. Days delivered before it can still be covered.",
};

/** The request itself: level of care, request type, start date, diagnoses and the reason. Ends with the coverage line. */
export function RequestCard({ draft }: { draft: CaseDraft }) {
  const edit = useStore((s) => s.patchCaseDraft);
  const notice = draft.type ? NOTICE[draft.type] : undefined;
  return (
    <Card>
      <CardHeader title="The request" subtitle="Level of care, type and dates" />
      <CardBody className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="Level of care" required>
            <Dropdown<Program | ""> variant="field" value={draft.program ?? ""} placeholder="Choose a level of care" onChange={(v) => v && edit(draft.id, { program: v, levelLabel: undefined })} options={PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }))} ariaLabel="Level of care" />
          </Field>
          <Field label="Request type" required>
            <Dropdown<RequestType | ""> variant="field" value={draft.type ?? ""} placeholder="Choose a type" onChange={(v) => v && edit(draft.id, { type: v, what: undefined })} options={NEW_REQUEST_TYPES.map((t) => ({ value: t, label: t }))} ariaLabel="Request type" />
          </Field>
        </div>
        <Field label="Requested start date" required>
          <TextInput aria-label="Requested start date" type="date" value={draft.startDate} onChange={(e) => edit(draft.id, { startDate: e.target.value })} />
        </Field>
        <DiagnosisPicker value={draft.diagnoses} onChange={(diagnoses) => edit(draft.id, { diagnoses })} />
        <Field label="Reason for the request" hint="One or two plain sentences. Scribe uses it in the summary.">
          <TextArea aria-label="Reason for the request" value={draft.reason} placeholder="What changed, and why this level of care" onChange={(e) => edit(draft.id, { reason: e.target.value })} />
        </Field>
        <CoverageLine draft={draft} />
        {notice ? (
          <Banner tone="mid" icon={Clock}>
            {notice}
          </Banner>
        ) : null}
      </CardBody>
    </Card>
  );
}
