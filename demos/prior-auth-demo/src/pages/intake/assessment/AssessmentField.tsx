import { useState } from "react";
import { InfoTip, Button, TextArea } from "@/components/ui";
import { FIELD_STATE_LABEL, type AssessmentSectionId, type FieldState, type IntakeRecord } from "@/data/intake/types";
import { useStore } from "@/store";
import { SuggestionCard, ValueMeta } from "../shared/provenance";

const STAFF_STATES: FieldState[] = ["verified", "patient_reported", "needs_confirmation", "not_collected", "not_applicable"];

/** One answer of the shared clinical interview: its provenance, editable in place, with the modules it feeds named under the label so nothing is asked twice.
    Pending AI suggestions for the answer show under it; nothing replaces the answer until a person decides. */
export function AssessmentField({ record, id, label, feeds, hint, readOnly }: { record: IntakeRecord; id: AssessmentSectionId; label: string; feeds: string[]; hint?: string; readOnly: boolean }) {
  const setField = useStore((s) => s.setIntakeField);
  const fv = record.assessment.fields[id];
  const pending = record.suggestions.filter((x) => x.section === "assessment" && x.field === id && x.status === "pending");
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(fv?.value ?? "");
  const [state, setState] = useState<FieldState>("verified");
  const empty = !fv || (!fv.value && fv.state !== "not_applicable");
  const inputId = `f-assessment-${id}`;
  const save = () => {
    setField(record.id, "assessment", id, state === "not_applicable" || state === "not_collected" ? "" : value.trim(), state);
    setEditing(false);
  };
  return (
    <div data-field={`assessment.${id}`} className="border-b border-line py-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <label htmlFor={inputId} className="text-[13px] font-semibold text-ink2">
            {label}
            {hint ? <InfoTip label={`About ${label}`}>{hint}</InfoTip> : null}
          </label>
          <p data-feeds={id} className="mt-0.5 text-[12px] text-muted">Feeds: {feeds.join(", ")}</p>
        </div>
        {!editing && !readOnly ? (
          <button type="button" onClick={() => { setValue(fv?.value ?? ""); setState(fv?.state === "patient_reported" ? "patient_reported" : "verified"); setEditing(true); }} className="text-[12px] font-semibold text-forest hover:underline">
            {empty ? "Add" : fv?.state === "verified" ? "Edit" : "Review"}
          </button>
        ) : null}
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <TextArea id={inputId} value={value} onChange={(e) => setValue(e.target.value)} rows={3} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-muted">Source</span>
            <select aria-label={`Where ${label} came from`} value={state} onChange={(e) => setState(e.target.value as FieldState)} className="h-8 rounded-lg border border-line bg-white px-2 text-[12px]">
              {STAFF_STATES.map((s) => <option key={s} value={s}>{FIELD_STATE_LABEL[s]}</option>)}
            </select>
            <Button size="sm" variant="primary" onClick={save}>Save</Button>
            <Button size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : fv ? (
        <>
          {fv.value ? <p className="mt-1 text-[14px] whitespace-pre-line">{fv.value}</p> : <p className="mt-1 text-[14px] text-muted">{fv.state === "not_applicable" ? "Not applicable" : "Not collected"}</p>}
          <ValueMeta record={record} fv={fv} />
        </>
      ) : (
        <p className="mt-1 text-[14px] text-muted">Not documented</p>
      )}
      {pending.length && !readOnly ? (
        <div className="mt-2 space-y-2">
          {pending.map((sg) => <SuggestionCard key={sg.id} record={record} suggestion={sg} label={`Suggested ${label.toLowerCase()}`} />)}
        </div>
      ) : null}
    </div>
  );
}
