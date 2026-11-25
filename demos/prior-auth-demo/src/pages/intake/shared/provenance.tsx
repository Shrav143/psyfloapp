import { useState } from "react";
import { Check, FileText, Pencil, X } from "lucide-react";
import { AgentChip, Button, Chip, DocumentSheet, Drawer, InfoTip, Pill, TextArea, TextInput } from "@/components/ui";
import { AGENTS } from "@/data/agents";
import { staffOf } from "@/data/intake/seed";
import { FIELD_STATE_LABEL, type FieldState, type FieldValue, type IntakeRecord, type SourceRef, type Suggestion } from "@/data/intake/types";
import type { AgentKey, Tone } from "@/data/types";
import { cn } from "@/lib/cn";
import { stamp } from "@/lib/time";
import { useStore } from "@/store";
import type { FieldSectionKey } from "@/store/intake";

/* Shared by every Intake section: where a value came from, and the accept / edit / reject card for an agent's suggestion.
   A value an agent extracted is never treated as verified until a person reviews it. */

export const FIELD_STATE_TONE: Record<FieldState, Tone> = {
  verified: "good", patient_reported: "neutral", document_extracted: "neutral", ai_suggested: "mid", not_collected: "neutral", not_applicable: "neutral", needs_confirmation: "mid",
};

export function FieldStateBadge({ state }: { state: FieldState }) {
  return <Pill tone={FIELD_STATE_TONE[state]}>{FIELD_STATE_LABEL[state]}</Pill>;
}

/** Marks anything the demo simulates (an import, an eligibility response, audio). Never omit it from a simulated integration. */
export function SimulatedTag({ what = "Simulated" }: { what?: string }) {
  return <Chip className="border-dashed">{what}</Chip>;
}

/** A staff member's or an agent's display name. */
export function actorName(id: string): string {
  if (id === "system") return "Psyflo";
  if (id === "payer") return "Payer";
  const staff = staffOf(id);
  if (staff) return staff.name;
  return (AGENTS as Record<string, { name: string } | undefined>)[id]?.name ?? id;
}
const isAgent = (id: string): id is AgentKey => id in AGENTS;

/** "Referral form p.1" as a link that opens the document with the evidence highlighted. Non-document sources show as text. */
export function SourceLink({ record, source, className }: { record: IntakeRecord; source: SourceRef; className?: string }) {
  const [open, setOpen] = useState(false);
  const docu = source.docId ? record.documents.find((d) => d.id === source.docId) : undefined;
  const label = source.ref + (source.at !== undefined ? ` ${Math.floor(source.at / 60)}:${String(Math.floor(source.at % 60)).padStart(2, "0")}` : "");
  if (!docu) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-[12px] text-muted", className)} title={source.quote}>
        {label}
      </span>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn("inline-flex items-center gap-1 text-[12px] font-medium text-forest hover:underline", className)} title={source.quote}>
        <FileText size={13} className="ico" />
        {label}
      </button>
      {open ? (
        <Drawer open onClose={() => setOpen(false)} title={docu.name} subtitle={docu.simulated ? "Synthetic document, simulated import" : undefined} width={720}>
          {source.quote ? <p className="mb-3 text-[13px] text-ink2">Highlighted: “{source.quote}”</p> : null}
          {docu.pages.map((p, i) => (
            <DocumentSheet key={i} blocks={p} highlightId={source.blockId} page={i + 1} pages={docu.pages.length} className="mb-4" />
          ))}
        </Drawer>
      ) : null}
    </>
  );
}

/** Who set a value and when, and who reviewed it. */
export function ValueMeta({ record, fv }: { record: IntakeRecord; fv: FieldValue }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
      <FieldStateBadge state={fv.state} />
      {fv.source ? <SourceLink record={record} source={fv.source} /> : null}
      <span>
        {isAgent(fv.by) ? "Extracted by " : "Set by "}
        {actorName(fv.by)} · {stamp(fv.at)}
      </span>
      {fv.confidence && fv.state !== "verified" ? <span>Confidence: {fv.confidence}</span> : null}
      {fv.reviewedBy ? <span className="text-good-ink">Reviewed by {actorName(fv.reviewedBy)}</span> : null}
    </div>
  );
}

/** One agent suggestion: the value, its source and confidence, and Accept, Edit or Reject. Nothing is written until a person decides. */
export function SuggestionCard({ record, suggestion: sg, label, compact }: { record: IntakeRecord; suggestion: Suggestion; label?: string; compact?: boolean }) {
  const decide = useStore((s) => s.decideSuggestion);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sg.value);
  const decided = sg.status !== "pending";
  return (
    <div data-suggestion={sg.id} className={cn("rounded-xl border px-3.5 py-3", decided ? "border-line bg-tile/40" : "border-mid-edge bg-mid-bg/50")}>
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <AgentChip agent={sg.agent} />
        <span className="font-semibold text-ink2">{label ?? sg.field}</span>
        <Pill tone={sg.confidence === "high" ? "good" : sg.confidence === "medium" ? "mid" : "risk"}>Confidence: {sg.confidence}</Pill>
        {decided ? <Pill tone={sg.status === "rejected" ? "neutral" : "good"}>{sg.status === "rejected" ? "Rejected" : sg.status === "edited" ? "Edited and accepted" : "Accepted"}{sg.decidedBy ? ` by ${actorName(sg.decidedBy)}` : ""}</Pill> : <Pill tone="mid">{sg.source.kind === "patient" ? "From the patient · needs review" : "AI suggested · needs review"}</Pill>}
      </div>
      {editing ? (
        <div className="mt-2">
          {draft.length > 60 ? <TextArea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} aria-label={`Edit ${label ?? sg.field}`} /> : <TextInput value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={`Edit ${label ?? sg.field}`} />}
        </div>
      ) : (
        <p className={cn("mt-1.5 text-[14px]", sg.status === "rejected" && "text-muted line-through")}>{sg.status === "edited" ? sg.editedValue : sg.value}</p>
      )}
      {!compact ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <SourceLink record={record} source={sg.source} />
          {sg.source.quote ? <span className="text-[12px] text-muted italic">“{sg.source.quote}”</span> : null}
        </div>
      ) : null}
      {sg.conflict ? <p className="mt-2 rounded-lg bg-risk-bg px-2.5 py-1.5 text-[12px] text-risk-ink">Conflict: {sg.conflict}</p> : null}
      {!decided ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button size="sm" variant="primary" icon={Check} onClick={() => { decide(record.id, sg.id, "edited", draft.trim() || sg.value); setEditing(false); }}>Save edit</Button>
              <Button size="sm" onClick={() => { setEditing(false); setDraft(sg.value); }}>Cancel</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="primary" icon={Check} onClick={() => decide(record.id, sg.id, "accepted")}>Accept</Button>
              <Button size="sm" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>
              <Button size="sm" icon={X} onClick={() => decide(record.id, sg.id, "rejected")}>Reject</Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

const STAFF_STATES: FieldState[] = ["verified", "patient_reported", "needs_confirmation", "not_collected", "not_applicable"];

/** One field with its provenance, editable in place. Pending suggestions for the field show under it.
    `kind` "long" uses a text area, "select" uses `options`. Saving asks where the value came from (verified, patient reported...). */
export function IntakeField({ record, section, field, label, kind = "text", options, required, hint, sensitive }: {
  record: IntakeRecord; section: FieldSectionKey; field: string; label: string; kind?: "text" | "long" | "date" | "phone" | "select"; options?: string[]; required?: boolean; hint?: string; sensitive?: boolean;
}) {
  const setField = useStore((s) => s.setIntakeField);
  const fv = section === "assessment" ? record.assessment.fields[field] : record[section][field];
  const pending = record.suggestions.filter((x) => x.field === field && x.section === section && x.status === "pending");
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(fv?.value ?? "");
  const [state, setState] = useState<FieldState>(fv?.state === "verified" || !fv ? "verified" : fv.state === "patient_reported" ? "patient_reported" : "verified");
  const empty = !fv || (!fv.value && fv.state !== "not_applicable");
  const missing = required && (empty || fv?.state === "not_collected");
  const inputId = `f-${section}-${field}`;
  const save = () => {
    setField(record.id, section, field, state === "not_applicable" || state === "not_collected" ? "" : value.trim(), state);
    setEditing(false);
  };
  return (
    <div data-field={`${section}.${field}`} className="border-b border-line py-3 last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <label htmlFor={inputId} className="text-[13px] font-semibold text-ink2">
          {label}
          {required ? <span className="ml-1 text-risk" aria-label="required">*</span> : null}
          {sensitive ? <span className="ml-2 text-[11px] font-normal text-muted">Sensitive · minimum necessary</span> : null}
          {hint ? <InfoTip label={`About ${label}`}>{hint}</InfoTip> : null}
        </label>
        {!editing ? (
          <button type="button" onClick={() => { setValue(fv?.value ?? ""); setEditing(true); }} className="text-[12px] font-semibold text-forest hover:underline">
            {empty ? "Add" : fv?.state === "verified" ? "Edit" : "Review"}
          </button>
        ) : null}
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          {kind === "long" ? (
            <TextArea id={inputId} value={value} onChange={(e) => setValue(e.target.value)} rows={3} />
          ) : kind === "select" && options ? (
            <select id={inputId} value={value} onChange={(e) => setValue(e.target.value)} className="h-10 w-full rounded-xl border border-line bg-white px-3 text-[14px]">
              <option value="">Choose</option>
              {options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <TextInput id={inputId} type={kind === "date" ? "date" : "text"} value={value} onChange={(e) => setValue(e.target.value)} />
          )}
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
        <p className={cn("mt-1 text-[14px]", missing ? "text-risk-ink" : "text-muted")}>{missing ? "Missing, required" : "Not collected"}</p>
      )}
      {pending.length ? (
        <div className="mt-2 space-y-2">
          {pending.map((sg) => <SuggestionCard key={sg.id} record={record} suggestion={sg} label={`Suggested ${label.toLowerCase()}`} />)}
        </div>
      ) : null}
    </div>
  );
}

/** The value of a field, or "" when absent. */
export const valueOf = (r: IntakeRecord, section: FieldSectionKey, key: string): string => (section === "assessment" ? r.assessment.fields[key]?.value : r[section][key]?.value) ?? "";
/** Shows a person's or agent's name with a badge-free label, used in timelines. */
export const byLabel = (id: string) => actorName(id);
