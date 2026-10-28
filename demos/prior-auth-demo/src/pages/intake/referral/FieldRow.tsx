import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { Button, InfoTip, Pill, Segmented, TextArea, TextInput } from "@/components/ui";
import { specOf } from "@/data/intake/fields";
import type { FieldState, IntakeRecord, SourceRef } from "@/data/intake/types";
import type { Urgency } from "@/data/types";
import { cn } from "@/lib/cn";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import { ServiceSelect } from "../create/inputs";
import { normInitials } from "../create/initials";
import { SourceLink, SuggestionCard, actorName } from "../shared/provenance";
import { fieldOf, type Section } from "./attributes";
import { REFERRAL_STATE_LABEL, REFERRAL_STATE_TONE, URGENCY_LABEL } from "./labels";

export type DocSpot = { docId: string; blockId: string };

const BLOCKING = ["reason", "requestedService", "person"];

const ENTRY_STATES: FieldState[] = ["verified", "patient_reported", "needs_confirmation"];

/** One referral value: what it says, how it got here (its tag and its source), and what a person can do with it: confirm it as it stands or edit it.
    Missing values say so. A conflict between two sources is shown on the value until a person confirms one. */
export function FieldRow({ record, section, field, active, onSpot, always }: {
  record: IntakeRecord; section: Section; field: string; active?: DocSpot | null; onSpot?: (s: DocSpot | null, pin?: boolean) => void;
  /** Show it even when it has no value (a required field). */
  always?: boolean;
}) {
  const edit = useStore((s) => s.editIntakeReferralField);
  const confirm = useStore((s) => s.confirmIntakeReferralFields);
  const setService = useStore((s) => s.setIntakeReferralService);
  const setUrgency = useStore((s) => s.setIntakeReferralUrgency);
  const setPerson = useStore((s) => s.setIntakeReferralPerson);
  const spec = specOf(field);
  const fv = fieldOf(record, section, field);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(fv?.value ?? "");
  const [state, setState] = useState<FieldState>("verified");
  const [age, setAge] = useState("");
  if (!spec) return null;
  const empty = !fv || !fv.value.trim() || fv.state === "not_collected";
  if (empty && !always && !editing) return null;
  /* Only what accepting waits on is marked required. The rest of the intake's required fields are collected after acceptance. */
  const required = BLOCKING.includes(field);
  const src: SourceRef | undefined = fv?.source;
  const spot = src?.docId && src.blockId ? { docId: src.docId, blockId: src.blockId } : null;
  const pending = record.suggestions.filter((x) => x.field === field && x.section === section && x.status === "pending");
  const shownState: FieldState = empty ? "not_collected" : (fv?.state ?? "not_collected");
  const isActive = !!active && !!spot && active.docId === spot.docId && active.blockId === spot.blockId;
  const special = field === "requestedService" || field === "urgency" || field === "person";
  const start = () => {
    setValue(field === "person" ? record.initials : (fv?.value ?? ""));
    setAge(record.age !== null ? String(record.age) : "");
    setState("verified");
    setEditing(true);
  };
  const save = () => {
    edit(record.id, section, field, value.trim(), value.trim() ? state : "not_collected");
    setEditing(false);
  };

  return (
    <div
      data-field={`${section}.${field}`}
      data-state={shownState}
      data-src-doc={spot?.docId}
      data-src-block={spot?.blockId}
      onMouseEnter={() => spot && onSpot?.(spot)}
      onMouseLeave={() => onSpot?.(null)}
      onFocus={() => spot && onSpot?.(spot, true)}
      className={cn("-mx-2 rounded-xl border-b border-line px-2 py-3 transition-colors last:border-b-0", isActive && "bg-mid-bg/50 ring-1 ring-mid-edge")}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0 flex-1 basis-[220px]">
          <div className="text-[13px] font-semibold text-ink2">
            {spec.label}
            {required ? <span className="ml-1 text-risk" aria-label="required">*</span> : null}
            {spec.sensitive ? <span className="ml-2 text-[11px] font-normal text-muted">Sensitive · minimum necessary</span> : null}
            {spec.hint ? <InfoTip label={`About ${spec.label}`}>{spec.hint}</InfoTip> : null}
          </div>
          {editing ? (
            <div className="mt-2 flex flex-col gap-2">
              {field === "person" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <TextInput value={value} onChange={(e) => setValue(e.target.value)} aria-label="Initials" placeholder="T.W." className="w-[120px]" autoFocus />
                  <TextInput value={age} onChange={(e) => setAge(e.target.value)} aria-label="Age" inputMode="numeric" placeholder="Age" className="w-[90px]" />
                  <Button size="sm" variant="primary" onClick={() => { const n = age.trim() === "" ? null : Number(age); if (n === null || (Number.isInteger(n) && n >= 0 && n <= 110)) { setPerson(record.id, { initials: normInitials(value), age: n }); setEditing(false); } }}>Save</Button>
                  <Button size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              ) : field === "requestedService" ? (
                <ServiceSelect value={record.serviceId} onChange={(v) => { setService(record.id, v); setEditing(false); }} />
              ) : field === "urgency" ? (
                <Segmented<Urgency> items={(["routine", "urgent", "emergent"] as Urgency[]).map((u) => ({ id: u, label: URGENCY_LABEL[u] }))} value={record.urgency} onChange={(u) => { setUrgency(record.id, u); setEditing(false); }} />
              ) : spec.kind === "long" ? (
                <TextArea value={value} onChange={(e) => setValue(e.target.value)} rows={3} aria-label={`Edit ${spec.label}`} autoFocus />
              ) : spec.kind === "select" && spec.options ? (
                <select aria-label={`Edit ${spec.label}`} value={value} onChange={(e) => setValue(e.target.value)} className="h-10 w-full rounded-xl border border-line bg-white px-3 text-[14px]">
                  <option value="">Choose</option>
                  {spec.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <TextInput type={spec.kind === "date" ? "date" : "text"} value={value} onChange={(e) => setValue(e.target.value)} aria-label={`Edit ${spec.label}`} autoFocus />
              )}
              {!special ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-muted">Source</span>
                  <select aria-label={`Where ${spec.label} came from`} value={state} onChange={(e) => setState(e.target.value as FieldState)} className="h-8 rounded-lg border border-line bg-white px-2 text-[12px]">
                    {ENTRY_STATES.map((s) => <option key={s} value={s}>{REFERRAL_STATE_LABEL[s]}</option>)}
                  </select>
                  <Button size="sm" variant="primary" onClick={save}>Save</Button>
                  <Button size="sm" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              ) : field === "person" ? null : (
                <div><Button size="sm" onClick={() => setEditing(false)}>Cancel</Button></div>
              )}
            </div>
          ) : empty ? (
            <p className={cn("mt-1 text-[14px]", required ? "text-risk-ink" : "text-muted")}>{required ? "Missing, needed to accept" : "Not provided"}</p>
          ) : (
            <p className="mt-1 text-[14px] break-words whitespace-pre-line">{fv?.value}</p>
          )}
        </div>
        {!editing ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <Pill tone={REFERRAL_STATE_TONE[shownState]}>{REFERRAL_STATE_LABEL[shownState]}</Pill>
            {!empty && fv && fv.state !== "verified" ? (
              <Button size="sm" variant="ghost" icon={Check} onClick={() => (record[section][field] ? confirm(record.id, [{ section, key: field }]) : edit(record.id, section, field, fv.value, "verified", fv.source))} aria-label={`Confirm ${spec.label}`}>Confirm</Button>
            ) : null}
            <Button size="sm" variant="ghost" icon={Pencil} onClick={start} aria-label={`${empty ? "Add" : "Edit"} ${spec.label}`}>{empty ? "Add" : "Edit"}</Button>
          </div>
        ) : null}
      </div>
      {!empty && !editing && fv ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
          {src ? <SourceLink record={record} source={src} /> : null}
          {fv.confidence && fv.state !== "verified" ? <span>Confidence: {fv.confidence}</span> : null}
          {fv.by !== "reader" && fv.by !== "verify" && fv.by !== "system" ? <span>Set by {actorName(fv.by)} · {stamp(fv.at)}</span> : null}
          {fv.reviewedBy && fv.reviewedBy !== "system" ? <span className="text-good-ink">Reviewed by {actorName(fv.reviewedBy)}</span> : null}
        </div>
      ) : null}
      {fv?.conflict && !editing ? <p className="mt-2 rounded-lg bg-risk-bg px-2.5 py-1.5 text-[12px] text-risk-ink">Conflict: {fv.conflict}</p> : null}
      {pending.length ? (
        <div className="mt-2 space-y-2">
          {pending.map((sg) => <SuggestionCard key={sg.id} record={record} suggestion={sg} label={`Suggested ${spec.label.toLowerCase()}`} />)}
        </div>
      ) : null}
    </div>
  );
}
