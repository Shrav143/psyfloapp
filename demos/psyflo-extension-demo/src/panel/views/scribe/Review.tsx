import { BookOpen, ChevronDown, ChevronRight, Clock, Lock, Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { KIND_LABEL, fieldsOf, isEmpty, usDate } from "@/engine";
import { useStore, type DraftCard } from "@/store";
import type { DraftField, FieldSpec } from "@/types";
import FieldEditor from "./FieldEditor";
import { StageHeading, Transcript, count, timesOf, type ScribeCtx } from "./shared";

/** Per-field review: one card for every field Psyflo may draft, in form order. Nothing is typed into the EHR until the person has read it all. */
export default function Review({ ctx }: { ctx: ScribeCtx }) {
  const { spec, scenario } = ctx;
  const draft = useStore((s) => s.scribe.draft);
  const scribeType = useStore((s) => s.scribeType);
  const scribeRegenerate = useStore((s) => s.scribeRegenerate);
  const scribeDiscard = useStore((s) => s.scribeDiscard);
  const [reviewed, setReviewed] = useState(false);
  const endBox = useRef<HTMLInputElement>(null);

  const locked = fieldsOf(spec).filter((f) => f.lock);
  const sections = spec.sections.map((s) => ({ ...s, fields: s.fields.filter((f) => !f.lock) })).filter((s) => s.fields.length > 0);
  const n = sections.flatMap((s) => s.fields).filter((f) => { const c = draft[f.key]; return !!c && c.include && !isEmpty(c.value); }).length;
  const why = !reviewed ? "Read every card, then tick “I have read the whole draft” at the end of the list." : n === 0 ? "No card is ticked, so there is nothing to type." : "";

  return (
    <div className="scr-root">
      <div className="psy-body">
        <StageHeading className="p-big">Review the draft</StageHeading>
        <p className="p-sub">Psyflo wrote only what was said or what the chart already says. Check every card.</p>

        {sections.map((s) => (
          <section key={s.id} aria-label={s.title}>
            {sections.length > 1 ? <h3 className="p-h">{s.title}</h3> : null}
            {s.fields.map((f) => <DraftCardView key={f.key} field={f} card={draft[f.key]} scen={scenario.draft[f.key]} ctx={ctx} />)}
          </section>
        ))}

        {locked.length ? (
          <section className="p-card scr-locks" aria-labelledby="scr-locks-h">
            <h3 className="p-title" id="scr-locks-h"><Lock size={14} aria-hidden="true" /> Clinician only (Psyflo does not draft these)</h3>
            <ul>{locked.map((f) => <li key={f.key}>{f.label}</li>)}</ul>
          </section>
        ) : null}

        <label className="p-card p-check scr-reviewed">
          <input ref={endBox} type="checkbox" data-testid="scribe-reviewed" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
          <span><b>I have read the whole draft</b><span className="p-note" style={{ display: "block" }}>Typing stays off until you tick this.</span></span>
        </label>
      </div>

      <div className="psy-foot">
        <button type="button" className="p-btn pri block" data-testid="scribe-type" disabled={!reviewed || n === 0} onClick={scribeType}>
          Type {count(n, "field")} into Lauris
        </button>
        {why ? (
          <p className="p-note" style={{ margin: 0 }} data-testid="scribe-type-why">
            {why}{!reviewed ? <> <button type="button" className="p-link" onClick={() => { endBox.current?.scrollIntoView({ block: "center" }); endBox.current?.focus(); }}>Go to the end</button></> : null}
          </p>
        ) : null}
        <div className="p-row">
          <button type="button" className="p-btn sm p-grow" data-testid="scribe-regenerate" onClick={scribeRegenerate}>Regenerate</button>
          <button type="button" className="p-btn sm p-grow" data-testid="scribe-discard" onClick={scribeDiscard}>Discard</button>
        </div>
      </div>
    </div>
  );
}

/** One field: include box, label, kind, where it came from, the value in an editor, and an "edited" mark once the person changed it. */
function DraftCardView({ field, card, scen, ctx }: { field: FieldSpec; card: DraftCard | undefined; scen: DraftField | undefined; ctx: ScribeCtx }) {
  const scribeToggle = useStore((s) => s.scribeToggle);
  const scribeEdit = useStore((s) => s.scribeEdit);
  const [open, setOpen] = useState(false);
  const from = scen?.from ?? "none";
  const lid = `scr-l-${field.key}`;
  const panel = `scr-p-${field.key}`;
  const record = from === "chart" ? ctx.consumer?.chart.find((r) => r.id === scen?.chart) : undefined;
  const lines = scen?.lines ?? [];
  const value = card?.value ?? (field.kind === "checks" ? [] : "");
  const written = from === "none" && !!card && !isEmpty(card.value);

  return (
    <div
      className={`p-card scr-card${card && !card.include ? " off" : ""}${!card ? " empty" : ""}`}
      role="group"
      aria-labelledby={lid}
      data-draft={field.key}
      data-source={from}
      data-included={card?.include ? "yes" : "no"}
    >
      <div className="scr-chead">
        <label className="p-check scr-inc">
          <input type="checkbox" checked={!!card?.include} disabled={!card} onChange={() => scribeToggle(field.key)} />
          <span><span id={lid} className="scr-fname">{field.label}</span><span className="sr-only"> (include when typing)</span></span>
        </label>
        <span className="p-kind">{KIND_LABEL[field.kind]}</span>
      </div>

      <div className="scr-chips">
        {from === "session" ? (
          <button type="button" className="p-chip teal scr-src" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((v) => !v)}>
            <Clock size={12} aria-hidden="true" /><b>From the session</b>{lines.length ? <span>· {timesOf(ctx.scenario.lines, lines)}</span> : null}
            {open ? <ChevronDown size={12} aria-hidden="true" /> : <ChevronRight size={12} aria-hidden="true" />}
          </button>
        ) : from === "chart" ? (
          <button type="button" className="p-chip info scr-src" aria-expanded={open} aria-controls={panel} onClick={() => setOpen((v) => !v)}>
            <BookOpen size={12} aria-hidden="true" /><b>From the chart · {record?.label ?? "stored record"}</b>
            {open ? <ChevronDown size={12} aria-hidden="true" /> : <ChevronRight size={12} aria-hidden="true" />}
          </button>
        ) : (
          <span className="p-chip">Not stated</span>
        )}
        {written ? <span className="p-chip teal">Written by you</span> : null}
        {card?.edited && !written ? <span className="p-chip" data-testid="draft-edited"><Pencil size={11} aria-hidden="true" />edited</span> : null}
      </div>

      {open && from === "session" ? (
        <div id={panel}>
          <Transcript lines={ctx.scenario.lines} speakers={ctx.scenario.mode === "live"} highlight={lines} label={`Transcript with the lines behind ${field.label} marked`} className="small" />
        </div>
      ) : null}
      {open && from === "chart" ? (
        <div id={panel} className="scr-rec">
          {record ? (<><div className="p-note">{record.label} · {usDate(record.date)}</div><p>{record.text}</p></>) : <p className="p-note">The stored record is not available.</p>}
        </div>
      ) : null}

      {from === "none" ? (
        <p className="p-note scr-none">{scen?.note ?? "Nothing was said about this."} Psyflo does not guess. Type your own words, or leave it for later.</p>
      ) : null}

      <FieldEditor field={field} value={value} labelId={lid} onChange={(v) => scribeEdit(field.key, v)} placeholder={from === "none" ? "Type your own words" : undefined} />
      {from !== "none" && scen?.note ? <p className="p-note scr-none">{scen.note}</p> : null}
    </div>
  );
}
