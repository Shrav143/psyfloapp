import { asText } from "@/ext/engine";
import type { FieldSpec, Val } from "@/ext/types";

/** The editor for one draft card, chosen by the field's kind in the EHR. Values keep the shape the EHR uses (a string; ticked options for checkboxes). */
export default function FieldEditor({ field, value, onChange, labelId, placeholder }: {
  field: FieldSpec;
  value: Val;
  onChange: (v: Val) => void;
  /** id of the element that shows the field's label (every editor is named by it) */
  labelId: string;
  placeholder?: string;
}) {
  const text = asText(value);
  const name = `scr-${labelId}`;

  if (field.kind === "textarea") {
    // tall enough to read what Psyflo wrote without scrolling inside the box; an empty box gets room to type
    const rows = Math.min(8, Math.max(text ? 2 : 3, Math.ceil(text.length / 40)));
    return <textarea className="p-input" rows={rows} value={text} placeholder={placeholder} aria-labelledby={labelId} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.kind === "text") {
    return <input className="p-input" type="text" value={text} placeholder={placeholder} aria-labelledby={labelId} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.kind === "date") {
    // Lauris prints dates as MM/DD/YYYY; keep whatever string the draft has instead of forcing the browser's date control onto it
    return <input className="p-input" type="text" inputMode="numeric" value={text} placeholder={placeholder ?? "MM/DD/YYYY"} aria-labelledby={labelId} onChange={(e) => onChange(e.target.value)} />;
  }
  if (field.kind === "select") {
    const options = field.options ?? [];
    const extra = text && !options.includes(text) ? [text] : [];
    return (
      <select className="p-input" value={text} aria-labelledby={labelId} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        {[...options, ...extra].map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field.kind === "yesno") {
    return (
      <div className="scr-radios" role="radiogroup" aria-labelledby={labelId}>
        {["Yes", "No"].map((o) => (
          <label key={o} className="p-check"><input type="radio" name={name} value={o} checked={text === o} onChange={() => onChange(o)} /><span>{o}</span></label>
        ))}
      </div>
    );
  }
  // checks
  const ticked = Array.isArray(value) ? value : value ? [value] : [];
  const options = [...(field.options ?? []), ...ticked.filter((t) => !(field.options ?? []).includes(t))];
  return (
    <div className="scr-checks" role="group" aria-labelledby={labelId}>
      {options.map((o) => (
        <label key={o} className="p-check">
          <input type="checkbox" checked={ticked.includes(o)} onChange={() => onChange(options.filter((x) => (x === o ? !ticked.includes(o) : ticked.includes(x))))} />
          <span>{o}</span>
        </label>
      ))}
    </div>
  );
}
