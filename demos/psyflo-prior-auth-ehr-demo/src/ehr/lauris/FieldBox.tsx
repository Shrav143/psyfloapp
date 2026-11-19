import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import type { FieldView } from "@/ehr/model";

/** The text with each sentence the extension typed (and nobody has saved yet) marked yellow. A text a person rewrote may not contain them any more, then nothing is marked. */
function marked(text: string, unsaved: string[]): ReactNode {
  const parts: ReactNode[] = [];
  let rest = text;
  let i = 0;
  for (const u of unsaved) {
    const at = rest.indexOf(u);
    if (at < 0 || !u) continue;
    if (at > 0) parts.push(<Fragment key={`t${i}`}>{rest.slice(0, at)}</Fragment>);
    parts.push(<mark key={`m${i}`}>{u}</mark>);
    rest = rest.slice(at + u.length);
    i++;
  }
  parts.push(<Fragment key="end">{rest}</Fragment>);
  return parts;
}

/** One text box of the Lauris form. Read as rendered text (the extension's yellow sentences marked) until a person clicks it, then a real text area. */
export default function FieldBox({ field, onChange }: { field: FieldView; onChange: (text: string) => void }) {
  const [editing, setEditing] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const idBase = `lf-${field.id}`;
  useEffect(() => { if (editing) area.current?.focus(); }, [editing]);

  const tone = field.state === "typed" ? "y" : field.state === "lauris" ? "g" : "";
  const unsaved = field.additions.filter((a) => a.unsaved).map((a) => a.text);
  return (
    <div className="fld" data-field={field.id} data-state={field.state}>
      <div className="fld-h">
        <label className="lbl" htmlFor={`${idBase}-box`}>{field.label}</label>
        {field.state === "typed" ? <span className="tag y">Psyflo typed here · check it</span> : field.state === "lauris" ? <span className="tag g">In Lauris</span> : null}
      </div>
      {editing ? (
        <textarea
          id={`${idBase}-box`} ref={area} rows={Math.max(4, Math.ceil(field.text.length / 90) + 1)} className={`in ${tone}`} value={field.text}
          onChange={(e) => onChange(e.target.value)} onBlur={() => setEditing(false)}
        />
      ) : (
        <div
          id={`${idBase}-box`} role="textbox" aria-readonly="true" aria-label={`${field.label}. Press Enter to edit.`} tabIndex={0}
          className={`in box ${tone} ${field.text ? "" : "empty"}`} onClick={() => setEditing(true)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditing(true); } }}
        >
          {field.text ? marked(field.text, unsaved) : "Nothing entered yet"}
        </div>
      )}
      {field.state === "typed" ? <div className="note">Typed by the Psyflo extension</div> : null}
    </div>
  );
}
