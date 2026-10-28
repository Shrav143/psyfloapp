import { useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { Button, InfoTip, TextArea, TextInput } from "@/components/ui";
import { moduleById } from "@/data/assess/modules";
import type { FieldDef, InstrumentInstance, ModuleId } from "@/data/assess/types";
import { FIELD_STATE_LABEL, type FieldState, type IntakeRecord } from "@/data/intake/types";
import { cn } from "@/lib/cn";
import { useStore } from "@/store";
import { actorName, ValueMeta } from "../shared/provenance";
import { EvidenceCard } from "./EvidenceCard";
import { FIELD_LINKS, MULTI_SEP, splitMulti, STAFF_SOURCES } from "./model";

const SELECT = "h-[38px] w-full rounded-xl border border-field bg-white px-3 text-sm text-ink focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15 disabled:bg-tile";

/** Where a value a person edits starts out: the source it already has when that is one a person can set, otherwise Verified (they typed or reviewed it). */
const sourceOf = (s: FieldState | undefined): FieldState => (s && STAFF_SOURCES.includes(s) ? s : "verified");

/** One field of a module. It saves when the person leaves it, and says where the value came from, who set it and when. Evidence the reader proposed for
    the field shows under it as a draft until a person decides. A signed module shows the values and nothing to edit. */
export function FieldRow({ record, moduleId, def, inst, locked }: { record: IntakeRecord; moduleId: ModuleId; def: FieldDef; inst: InstrumentInstance | undefined; locked: boolean }) {
  const setField = useStore((s) => s.setInstrumentField);
  const fv = inst?.fields[def.key];
  const stored = fv?.value ?? "";
  const [draft, setDraft] = useState(stored);
  const [src, setSrc] = useState<FieldState>(sourceOf(fv?.state));
  useEffect(() => setDraft(stored), [stored, fv?.at]);
  useEffect(() => setSrc(sourceOf(fv?.state)), [fv?.state]);

  const pending = (inst?.evidence ?? []).filter((e) => e.fieldKey === def.key && e.status === "pending");
  const empty = !stored && fv?.state !== "not_applicable";
  const inputId = `f-${moduleId}-${def.key}`;
  const save = (value: string, state: FieldState = src) => setField(record.id, moduleId, def.key, value, state);

  const link = FIELD_LINKS[def.key];
  const linked = link ? record.instruments?.[link.moduleId] : undefined;
  const linkedValue = !link || !linked ? "" : link.kind === "score" ? (linked.score?.value ?? "") : (linked.fields[link.key]?.value ?? "");
  const linkedBy = link?.kind === "score" && linked?.score ? actorName(linked.score.administeredBy) : "";

  const changeSource = (state: FieldState) => {
    setSrc(state);
    if (state === "not_applicable") {
      setDraft("");
      setField(record.id, moduleId, def.key, "", state);
    } else if (stored) setField(record.id, moduleId, def.key, stored, state, fv?.source);
  };

  let control: React.ReactNode;
  if (locked) {
    control = stored ? <p className="mt-1 text-[14px] whitespace-pre-line">{stored}</p> : <p className="mt-1 text-[14px] text-muted">{fv?.state === "not_applicable" ? "Not applicable" : "Not entered"}</p>;
  } else if (def.kind === "long") {
    control = <TextArea id={inputId} value={draft} rows={2} style={{ minHeight: 64 }} onChange={(e) => setDraft(e.target.value)} onBlur={() => draft.trim() !== stored && save(draft)} />;
  } else if (def.kind === "select") {
    control = (
      <select id={inputId} value={stored} onChange={(e) => save(e.target.value)} className={SELECT}>
        <option value="">Choose</option>
        {(def.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (def.kind === "multi") {
    const chosen = splitMulti(stored);
    control = (
      <div id={inputId} role="group" aria-label={def.label} className="flex flex-wrap gap-2">
        {(def.options ?? []).map((o) => {
          const on = chosen.includes(o);
          return (
            <button key={o} type="button" aria-pressed={on} onClick={() => save((on ? chosen.filter((c) => c !== o) : [...chosen, o]).join(MULTI_SEP))} className={cn("h-8 rounded-full border px-3 text-[13px] font-medium", on ? "border-forest bg-forest text-white" : "border-field bg-white text-ink2 hover:bg-tile")}>
              {o}
            </button>
          );
        })}
      </div>
    );
  } else if (def.kind === "check") {
    control = (
      <div id={inputId} role="group" aria-label={def.label} className="flex gap-2">
        {["Yes", "No"].map((o) => (
          <button key={o} type="button" aria-pressed={stored === o} onClick={() => save(stored === o ? "" : o)} className={cn("h-8 rounded-full border px-4 text-[13px] font-medium", stored === o ? "border-forest bg-forest text-white" : "border-field bg-white text-ink2 hover:bg-tile")}>
            {o}
          </button>
        ))}
      </div>
    );
  } else {
    control = (
      <TextInput
        id={inputId} type={def.kind === "date" ? "date" : def.kind === "number" ? "number" : "text"} inputMode={def.kind === "number" ? "decimal" : undefined} value={draft}
        className={def.kind === "date" || def.kind === "number" ? "max-w-[220px]" : undefined} onChange={(e) => setDraft(e.target.value)} onBlur={() => draft.trim() !== stored && save(draft)}
      />
    );
  }

  return (
    <div data-field={def.key} className="border-b border-line py-3.5 last:border-b-0">
      <label htmlFor={inputId} className="block text-[13px] font-semibold text-ink2">
        {def.label}
        {def.required ? <span className="ml-1 text-risk" aria-label="required">*</span> : null}
        {def.hint ? <InfoTip label={`About ${def.label}`}>{def.hint}</InfoTip> : null}
      </label>
      <div className="mt-1.5">{control}</div>
      {fv && (stored || fv.state === "not_applicable") ? (
        <div className="flex items-start justify-between gap-x-4">
          <div className="min-w-0 flex-1"><ValueMeta record={record} fv={fv} /></div>
          {!locked ? (
            <select aria-label={`Where ${def.label} came from`} value={src} onChange={(e) => changeSource(e.target.value as FieldState)} className="mt-1 h-7 shrink-0 rounded-lg border border-line bg-white px-2 text-[12px] text-ink2">
              {STAFF_SOURCES.map((s) => <option key={s} value={s}>{FIELD_STATE_LABEL[s]}</option>)}
            </select>
          ) : null}
        </div>
      ) : empty && def.required ? (
        <p className="mt-1 text-[12px] text-risk-ink">Missing, required</p>
      ) : null}
      {!locked && linkedValue && linkedValue !== stored && link ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-tile px-3 py-2 text-[13px]">
          <Link2 size={14} className="ico text-muted" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="text-muted">{moduleById(link.moduleId).label} module: </span>
            <span className="font-medium">{linkedValue}</span>
            {linkedBy ? <span className="text-muted"> · entered by {linkedBy}</span> : null}
          </span>
          <Button size="sm" onClick={() => setField(record.id, moduleId, def.key, linkedValue, "verified", { kind: "form", ref: `${moduleById(link.moduleId).label} module` })}>Use this</Button>
        </div>
      ) : null}
      {!locked && pending.length ? (
        <div className="mt-2.5 space-y-2">
          {pending.map((e) => <EvidenceCard key={e.id} record={record} moduleId={moduleId} evidence={e} fieldLabel={def.label} hasValue={!!stored} />)}
        </div>
      ) : null}
    </div>
  );
}
