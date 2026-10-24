import { useId, useState, type ReactNode, type Ref } from "react";
import { Check, ChevronDown } from "lucide-react";
import { InfoTip, Switch } from "@/components/ui";
import { cn } from "@/lib/cn";

/* Small form controls for the side panels. Native selects, inputs and textareas keep keyboard use, labels and screen readers simple. */

export const FIELD = "w-full rounded-xl border border-field bg-white px-3 text-[14px] text-ink placeholder:text-faint focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15 disabled:bg-tile disabled:text-muted";

/** A label, the control and optional help. The help sits behind an info icon so the panel stays calm. */
export function Labeled({ label, help, htmlFor, children, className, hint }: { label: ReactNode; help?: ReactNode; htmlFor?: string; children: ReactNode; className?: string; hint?: ReactNode }) {
  return (
    <div className={cn("block", className)}>
      <div className="mb-1.5 flex items-center gap-1">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink2">{label}</label>
        {help ? <InfoTip label={`About ${typeof label === "string" ? label : "this field"}`}>{help}</InfoTip> : null}
      </div>
      {children}
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export function TextField({ label, value, onChange, placeholder, help, disabled, hint, maxLength }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; help?: ReactNode; disabled?: boolean; hint?: ReactNode; maxLength?: number }) {
  const id = useId();
  return (
    <Labeled label={label} help={help} htmlFor={id} hint={hint}>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} maxLength={maxLength} className={cn(FIELD, "h-[38px]")} />
    </Labeled>
  );
}

export function AreaField({ label, value, onChange, placeholder, rows = 3, help, disabled, hint, inputRef }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; help?: ReactNode; disabled?: boolean; hint?: ReactNode; inputRef?: Ref<HTMLTextAreaElement> }) {
  const id = useId();
  return (
    <Labeled label={label} help={help} htmlFor={id} hint={hint}>
      <textarea id={id} ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} disabled={disabled} className={cn(FIELD, "py-2.5 leading-[1.45]")} />
    </Labeled>
  );
}

export function NumberField({ label, value, onChange, min, max, unit, help, disabled }: { label: string; value: number | ""; onChange: (v: number | "") => void; min?: number; max?: number; unit?: string; help?: ReactNode; disabled?: boolean }) {
  const id = useId();
  return (
    <Labeled label={label} help={help} htmlFor={id}>
      <div className="flex items-center gap-2">
        <input id={id} type="number" inputMode="numeric" value={value} min={min} max={max} disabled={disabled} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} className={cn(FIELD, "h-[38px] w-28")} />
        {unit ? <span className="text-[13px] text-muted">{unit}</span> : null}
      </div>
    </Labeled>
  );
}

export function SelectField({ label, value, onChange, options, help, disabled, placeholder, className, hint }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; help?: ReactNode; disabled?: boolean; placeholder?: string; className?: string; hint?: ReactNode }) {
  const id = useId();
  return (
    <Labeled label={label} help={help} htmlFor={id} className={className} hint={hint}>
      <Select id={id} value={value} onChange={onChange} options={options} disabled={disabled} placeholder={placeholder} />
    </Labeled>
  );
}

export function Select({ id, value, onChange, options, disabled, placeholder, ariaLabel, className }: { id?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean; placeholder?: string; ariaLabel?: string; className?: string }) {
  const known = options.some((o) => o.value === value);
  return (
    <select id={id} aria-label={ariaLabel} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={cn(FIELD, "h-[38px] pr-8", className)}>
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {!known && value ? <option value={value}>{value}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function ToggleRow({ label, value, onChange, help, disabled, note }: { label: string; value: boolean; onChange: (v: boolean) => void; help?: ReactNode; disabled?: boolean; note?: ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1 text-[13px] font-medium text-ink2">
          {label}
          {help ? <InfoTip label={`About ${label}`}>{help}</InfoTip> : null}
        </span>
        <span className={cn(disabled && "pointer-events-none opacity-60")}>
          <Switch checked={value} onChange={(v) => !disabled && onChange(v)} label={<span className="sr-only">{label}</span>} />
        </span>
      </div>
      {note ? <div className="mt-1 text-xs text-muted">{note}</div> : null}
    </div>
  );
}

/** Pick several from a short list: chips that are real checkboxes. */
export function MultiChips({ label, values, onChange, options, help, empty }: { label: string; values: string[]; onChange: (v: string[]) => void; options: { value: string; label: string }[]; help?: ReactNode; empty?: ReactNode }) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-1.5 flex items-center gap-1 p-0 text-[13px] font-medium text-ink2">
        {label}
        {help ? <InfoTip label={`About ${label}`}>{help}</InfoTip> : null}
      </legend>
      {options.length === 0 ? <div className="text-[13px] text-muted">{empty ?? "Nothing to choose from."}</div> : null}
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = values.includes(o.value);
          return (
            <button key={o.value} type="button" role="checkbox" aria-checked={on} onClick={() => onChange(on ? values.filter((v) => v !== o.value) : [...values, o.value])} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium", on ? "border-forest bg-[#F3F7F4] text-forest" : "border-field bg-white text-ink2 hover:bg-tile")}>
              {on ? <Check size={12} className="ico" aria-hidden="true" /> : null}
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** A quiet heading inside a side panel. */
export function PanelHeading({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h4 className="m-0 text-[11px] font-medium tracking-[0.1em] text-muted uppercase">{children}</h4>
      {right}
    </div>
  );
}

/** A compact folding section for side panels: a real button with aria-expanded, a summary line when closed. */
export function Fold({ title, summary, defaultOpen = false, children, className }: { title: ReactNode; summary?: ReactNode; defaultOpen?: boolean; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className={cn("rounded-2xl border border-line bg-white", className)}>
      <h4 className="m-0">
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 rounded-2xl px-3.5 py-2.5 text-left hover:bg-tile">
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-semibold text-ink">{title}</span>
            {summary && !open ? <span className="block truncate text-xs font-normal text-muted">{summary}</span> : null}
          </span>
          <ChevronDown size={16} className={cn("ico text-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </h4>
      <div id={id} hidden={!open} className={cn(open && "border-t border-line px-3.5 py-3")}>
        {open ? children : null}
      </div>
    </section>
  );
}
