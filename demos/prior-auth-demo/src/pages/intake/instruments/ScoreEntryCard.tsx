import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { Card, CardBody, Field, InfoTip, Pill, TextArea, TextInput } from "@/components/ui";
import { moduleById } from "@/data/assess/modules";
import type { InstrumentInstance, ModuleId, ModuleSchema } from "@/data/assess/types";
import type { IntakeRecord } from "@/data/intake/types";
import { longDate } from "@/lib/time";
import { useStore } from "@/store";
import { meOf } from "@/store/intake";
import { actorName } from "../shared/provenance";
import { isoOfMinutes, minutesOfIso } from "./model";

type ScoreEntry = NonNullable<ModuleSchema["scoreEntry"]>;

/** The result of an instrument the clinician administered, typed as it is on the form. Psyflo shows no item text, computes no score, assigns no severity and
    applies no cut-off: it records what the clinician typed, who administered the instrument and when. */
export function ScoreEntryCard({ record, moduleId, entry, inst, locked }: { record: IntakeRecord; moduleId: ModuleId; entry: ScoreEntry; inst: InstrumentInstance | undefined; locked: boolean }) {
  const setScore = useStore((s) => s.setInstrumentScore);
  const me = useStore((s) => actorName(meOf(s)));
  const score = inst?.score;
  const [value, setValue] = useState(score?.value ?? "");
  const [when, setWhen] = useState(score ? isoOfMinutes(score.administeredAt) : "");
  const [by, setBy] = useState(score ? actorName(score.administeredBy) : me);
  const [note, setNote] = useState(score?.note ?? "");
  useEffect(() => {
    setValue(score?.value ?? "");
    setWhen(score ? isoOfMinutes(score.administeredAt) : "");
    setBy(score ? actorName(score.administeredBy) : me);
    setNote(score?.note ?? "");
  }, [score?.value, score?.administeredAt, score?.administeredBy, score?.note]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    const stored = score ? { v: score.value, w: isoOfMinutes(score.administeredAt), b: actorName(score.administeredBy), n: score.note ?? "" } : { v: "", w: "", b: me, n: "" };
    if (value.trim() === stored.v && when === stored.w && by.trim() === stored.b && note.trim() === stored.n) return;
    if (!value.trim() && !score) return;
    /* Left as it was, the name is kept as the staff id; a typed name is kept as typed. */
    setScore(record.id, moduleId, value, note, { by: by.trim() === stored.b && score ? score.administeredBy : by, at: when ? minutesOfIso(when) : undefined });
  };
  const def = moduleById(moduleId);

  return (
    <Card data-score-entry={moduleId}>
      <CardBody>
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardCheck size={18} className="ico text-forest" aria-hidden="true" />
          <h3 className="text-[16px] font-semibold">Record the result of the administered instrument</h3>
          {def.licensed ? <Pill tone="neutral">Integration-ready placeholder</Pill> : null}
          <InfoTip label="About this record">{entry.note} Psyflo adds no severity, cut-off or interpretation.</InfoTip>
        </div>
        <p className="mt-1 text-[13px] text-muted">Psyflo does not reproduce or score this instrument; enter the result from your licensed tool.</p>
        {def.licensed ? <p className="mt-0.5 text-[12px] text-muted">Would be supplied by the administering clinician, or by an integration with the licensed tool or the EMR. None is connected in this demo.</p> : null}
        {locked ? (
          <dl className="mt-3 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
            <div><dt className="text-[12px] text-muted">Instrument</dt><dd>{entry.name}</dd></div>
            <div><dt className="text-[12px] text-muted">Result as typed by the clinician</dt><dd className="font-semibold">{score?.value || "Not entered"}</dd></div>
            <div><dt className="text-[12px] text-muted">Date administered</dt><dd>{score ? longDate(score.administeredAt) : "Not entered"}</dd></div>
            <div><dt className="text-[12px] text-muted">Administered by</dt><dd>{score ? actorName(score.administeredBy) : "Not entered"}</dd></div>
            {score?.note ? <div className="sm:col-span-2"><dt className="text-[12px] text-muted">Note</dt><dd className="whitespace-pre-line">{score.note}</dd></div> : null}
          </dl>
        ) : (
          <div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2">
            <Field label="Instrument">
              <div className="flex h-[38px] items-center rounded-xl bg-tile px-3 text-sm text-ink2">{entry.name}</div>
            </Field>
            <Field label="Date administered">
              <TextInput type="date" value={when} onChange={(e) => setWhen(e.target.value)} onBlur={save} />
            </Field>
            <Field label="Administered by">
              <TextInput value={by} onChange={(e) => setBy(e.target.value)} onBlur={save} />
            </Field>
            <Field label="Result as typed by the clinician" required hint={entry.unit}>
              <TextInput value={value} maxLength={60} onChange={(e) => setValue(e.target.value)} onBlur={save} />
            </Field>
            <Field label="Note (optional)" className="sm:col-span-2">
              <TextArea value={note} rows={2} style={{ minHeight: 56 }} onChange={(e) => setNote(e.target.value)} onBlur={save} />
            </Field>
          </div>
        )}
        {score?.value && !locked ? (
          <p className="mt-3 text-[12px] text-muted">
            Result as typed: <span className="font-semibold text-ink2">{score.value}</span> · administered {longDate(score.administeredAt)} by {actorName(score.administeredBy)} · recorded as typed
          </p>
        ) : null}
        {!score?.value && !locked ? <p className="mt-3 text-[12px] text-risk-ink">Missing, required</p> : null}
      </CardBody>
    </Card>
  );
}
