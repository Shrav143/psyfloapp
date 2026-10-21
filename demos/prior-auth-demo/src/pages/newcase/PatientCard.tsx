import { useEffect, useRef, useState } from "react";
import { CloudDownload, Tag } from "lucide-react";
import { Button, Card, CardBody, CardHeader, Dropdown, Field, TextInput } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { useStore } from "@/store";
import { emrLabel, pullFromEmr } from "./intake";
import { EMR_CHARTS } from "./lookups";

const PULL_MS = 1000;

/** Patient: pull a chart from EMR Connect, or type initials and age. Names never enter the app. */
export function PatientCard({ draft }: { draft: CaseDraft }) {
  const edit = useStore((s) => s.patchCaseDraft);
  const [chartId, setChartId] = useState(EMR_CHARTS[0].id);
  const [pulling, setPulling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const pulled = EMR_CHARTS.find((c) => c.id === draft.emrChart);

  const pull = () => {
    const chart = EMR_CHARTS.find((c) => c.id === chartId);
    if (!chart) return;
    setPulling(true);
    timer.current = setTimeout(() => {
      pullFromEmr(draft.id, chart);
      setPulling(false);
    }, PULL_MS);
  };

  return (
    <Card>
      <CardHeader title="The patient" subtitle="Initials and age only. A name never enters the app." />
      <CardBody className="flex flex-col gap-4">
        <div className="flex items-end gap-3">
          <Field label="Pull from EMR Connect" hint="23 charts matched today" className="flex-1">
            <Dropdown<string> variant="field" value={chartId} onChange={setChartId} options={EMR_CHARTS.map((c) => ({ value: c.id, label: emrLabel(c), hint: c.note }))} menuWidth={420} disabled={pulling} ariaLabel="Pull from EMR Connect" />
          </Field>
          <Button icon={CloudDownload} loading={pulling} onClick={pull} className="mb-[22px]">
            {pulling ? "Pulling" : "Pull"}
          </Button>
        </div>
        {pulled ? <div className="-mt-2 text-[13px] text-good-ink">Pulled from EMR Connect: {pulled.initials}, {pulled.age}. Everything below is editable.</div> : null}
        <div className="grid grid-cols-[1fr_120px] gap-3.5">
          <Field label="Patient initials" required>
            <TextInput aria-label="Patient initials" value={draft.patient.initials} maxLength={8} placeholder="J.M." onChange={(e) => edit(draft.id, { patient: { ...draft.patient, initials: e.target.value.toUpperCase() } })} />
          </Field>
          <Field label="Age" required>
            <TextInput aria-label="Age" type="number" min={1} max={110} value={draft.patient.age ?? ""} placeholder="34" onChange={(e) => edit(draft.id, { patient: { ...draft.patient, age: e.target.value ? Number(e.target.value) : null } })} />
          </Field>
        </div>
        <Field label="Internal reference (do not enter a patient name)" hint="Optional. A code is made if you leave it empty.">
          <TextInput aria-label="Internal reference" icon={Tag} value={draft.reference} placeholder="e.g. R-1042 or Cottage 2 intake" onChange={(e) => edit(draft.id, { reference: e.target.value })} />
        </Field>
      </CardBody>
    </Card>
  );
}
