import { Lock } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { asText, boxState } from "@/ext/engine";
import { useStore } from "@/ext/store";
import type { DocState, FieldSpec, Val } from "@/ext/types";
import Chips, { type ChipGroup } from "./Chips";

/** The text with each sentence the extension typed (and nobody has saved yet) marked yellow. A text a person rewrote may not contain them any more; then nothing is marked. */
function marked(text: string, unsaved: string[]): ReactNode {
  const parts: ReactNode[] = [];
  let rest = text;
  let i = 0;
  for (const u of unsaved) {
    const at = u ? rest.indexOf(u) : -1;
    if (at < 0) continue;
    if (at > 0) parts.push(<Fragment key={`t${i}`}>{rest.slice(0, at)}</Fragment>);
    parts.push(<mark key={`m${i}`}>{u}</mark>);
    rest = rest.slice(at + u.length);
    i++;
  }
  parts.push(<Fragment key="end">{rest}</Fragment>);
  return parts;
}

/** A text box that reads as rendered text (the extension's yellow sentences marked) until a person clicks it or presses Enter, then is a real text area. Escape or leaving it goes back to reading. */
function TextBox({ id, label, field, value, tone, unsaved, describedBy, onChange }: {
  id: string; label: string; field: FieldSpec; value: string; tone: string; unsaved: string[]; describedBy?: string; onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const rows = field.rows ?? 4;
  useEffect(() => {
    const el = area.current;
    if (editing && el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);
  return editing ? (
    <textarea
      id={id} ref={area} className={`in ${tone}`} rows={Math.max(rows, Math.ceil(value.length / 90) + 1)} value={value} aria-describedby={describedBy}
      onChange={(e) => onChange(e.target.value)} onBlur={() => setEditing(false)}
      onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
    />
  ) : (
    <div
      id={id} role="textbox" aria-multiline="true" aria-readonly="true" aria-label={`${label}. Press Enter to edit.`} aria-describedby={describedBy} tabIndex={0}
      className={`in box ${tone}${value ? "" : " empty"}`} style={{ minHeight: `${rows * 1.45 + 1.2}em` }} onClick={() => setEditing(true)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditing(true); } }}
    >
      {value ? marked(value, unsaved) : "Nothing entered yet"}
    </div>
  );
}

/** One field of a Lauris form. The wrapper carries `data-state` (typed, lauris or empty): yellow when the Psyflo extension typed into it and nobody has saved, green when it is already in Lauris. */
export default function FieldBox({ docId, field, doc, chips, stale }: { docId: string; field: FieldSpec; doc: DocState; chips: ChipGroup[]; stale: boolean }) {
  const editField = useStore((s) => s.editField);
  const state = boxState(doc, field.key);
  const tone = state === "typed" ? "y" : state === "lauris" ? "g" : "";
  const raw: Val | undefined = doc.values[field.key];
  const text = asText(raw);
  const base = `lf-${docId}-${field.key}`;
  const labelId = `${base}-l`;
  const hintId = field.hint ? `${base}-h` : undefined;
  const set = (v: Val) => editField(docId, field.key, v);
  const grouped = field.kind === "checks" || field.kind === "yesno";
  const wide = field.kind === "textarea" || field.kind === "checks";

  let control: ReactNode;
  if (field.kind === "text" || field.kind === "date") {
    control = (
      <input
        id={base} type="text" className={`in ${tone}`} value={text} aria-describedby={hintId} autoComplete="off" spellCheck={field.kind === "text"}
        placeholder={field.kind === "date" ? "MM/DD/YYYY" : undefined} inputMode={field.kind === "date" ? "numeric" : undefined}
        onChange={(e) => set(e.target.value)}
      />
    );
  } else if (field.kind === "textarea") {
    control = <TextBox id={base} label={field.label} field={field} value={text} tone={tone} unsaved={doc.appended[field.key] ?? []} describedBy={hintId} onChange={set} />;
  } else if (field.kind === "select") {
    const options = field.options ?? [];
    control = (
      <select id={base} className={`in ${tone}`} value={text} aria-describedby={hintId} onChange={(e) => set(e.target.value)}>
        <option value="" />
        {text && !options.includes(text) ? <option value={text}>{text}</option> : null}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (field.kind === "checks") {
    const ticked = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
    const options = [...(field.options ?? []), ...ticked.filter((t) => !(field.options ?? []).includes(t))];
    control = (
      <div role="group" aria-labelledby={labelId} aria-describedby={hintId} className={`grp ${tone}`}>
        {options.map((o, i) => (
          <label key={o} className="opt" htmlFor={`${base}-${i}`}>
            <input
              id={`${base}-${i}`} type="checkbox" value={o} checked={ticked.includes(o)}
              onChange={(e) => set(options.filter((x) => (x === o ? e.target.checked : ticked.includes(x))))}
            />
            <span>{o}</span>
          </label>
        ))}
      </div>
    );
  } else {
    control = (
      <div role="radiogroup" aria-labelledby={labelId} aria-describedby={hintId} className={`grp ${tone}`}>
        {["Yes", "No"].map((o) => (
          <label key={o} className="opt" htmlFor={`${base}-${o}`}>
            <input id={`${base}-${o}`} type="radio" name={base} value={o} checked={text.trim().toLowerCase() === o.toLowerCase()} onChange={() => set(o)} />
            <span>{o}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className={`fld${wide ? " wide" : ""}`} data-field={field.key} data-state={state}>
      <div className="fld-h">
        {grouped ? <span className="lbl" id={labelId}>{field.label}</span> : <label className="lbl" id={labelId} htmlFor={base}>{field.label}</label>}
        {field.lock ? <span className="lock" title="Clinician only: Psyflo reads this field and never types into it"><Lock size={11} aria-hidden="true" /><span className="sr-only">Clinician only</span></span> : null}
        {state === "typed" ? <span className="tag y">Psyflo typed here · check it</span> : state === "lauris" ? <span className="tag g">In Lauris</span> : null}
        <Chips groups={chips} label={field.label} stale={stale} />
      </div>
      {field.hint ? <div className="hint" id={hintId}>{field.hint}</div> : null}
      {control}
      {state === "typed" ? <div className="note">Typed by the Psyflo extension</div> : null}
    </div>
  );
}
