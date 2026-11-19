import { cloneElement, forwardRef, isValidElement, useId, type InputHTMLAttributes, type ReactElement, type ReactNode, type TextareaHTMLAttributes } from "react";
import { Check, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const FIELD = "w-full rounded-xl border border-field bg-white px-3 text-sm text-ink placeholder:text-faint focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15 disabled:bg-tile disabled:text-muted";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon?: LucideIcon }>(function TextInput({ className, icon: Icon, ...rest }, ref) {
  if (!Icon) return <input ref={ref} className={cn(FIELD, "h-[38px]", className)} {...rest} />;
  return (
    <div className={cn("relative", className)}>
      <Icon size={16} className="ico pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
      <input ref={ref} className={cn(FIELD, "h-[38px] pl-9")} {...rest} />
    </div>
  );
});

export function SearchInput({ value, onChange, placeholder = "Search", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <Search size={16} className="ico pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={cn(FIELD, "h-[38px] pl-9")} />
    </div>
  );
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(FIELD, "min-h-[88px] py-2.5", className)} {...rest} />;
});

/** Label + control + optional hint or error.
    A text input or textarea gets a real <label for>. Anything else (a Dropdown, a group of buttons) gets a plain caption,
    because a <label> wrapped around a menu re-dispatches clicks and re-opens it. */
export function Field({ label, required, hint, error, children, className }: { label: string; required?: boolean; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string }) {
  const id = useId();
  const only = isValidElement(children) ? (children as ReactElement<{ id?: string }>) : null;
  const labelable = !!only && (only.type === TextInput || only.type === TextArea || only.type === "input" || only.type === "textarea");
  const text = (
    <>
      {label}
      {required ? <span className="text-risk"> *</span> : null}
    </>
  );
  return (
    <div className={cn("block", className)}>
      {labelable ? (
        <label htmlFor={only.props.id ?? id} className="mb-1.5 block text-[13px] font-medium text-ink2">{text}</label>
      ) : (
        <span className="mb-1.5 block text-[13px] font-medium text-ink2">{text}</span>
      )}
      {labelable && only ? cloneElement(only, { id: only.props.id ?? id }) : children}
      {error ? <span className="mt-1 block text-xs text-risk">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

export function Checkbox({ checked, onChange, label, className, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode; className?: string; disabled?: boolean }) {
  // One click target: the whole row toggles. (A <label> around a <button> fires the click twice and cancels itself.)
  const labelId = useId();
  return (
    <div className={cn("inline-flex items-center gap-2.5", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer", className)} onClick={() => !disabled && onChange(!checked)}>
      <button type="button" role="checkbox" aria-checked={checked} aria-labelledby={label ? labelId : undefined} disabled={disabled} onClick={(e) => { e.stopPropagation(); onChange(!checked); }} className={cn("grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px]", checked ? "border-forest bg-forest text-white" : "border-[#D9D0C3] bg-white")}>
        {checked ? <Check size={12} className="ico pointer-events-none" /> : null}
      </button>
      {label ? <span id={labelId} className="text-sm">{label}</span> : null}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  const labelId = useId();
  return (
    <div className="inline-flex cursor-pointer items-center gap-2.5" onClick={() => onChange(!checked)}>
      <button type="button" role="switch" aria-checked={checked} aria-labelledby={label ? labelId : undefined} aria-label={label ? undefined : "Toggle"} onClick={(e) => { e.stopPropagation(); onChange(!checked); }} className={cn("relative h-[22px] w-[40px] rounded-full transition-colors", checked ? "bg-forest" : "bg-[#D9D0C3]")}>
        <span className={cn("absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all", checked ? "left-[21px]" : "left-[3px]")} />
      </button>
      {label ? <span id={labelId} className="text-sm">{label}</span> : null}
    </div>
  );
}

/** A selectable card used for choices ("Peer-to-peer call", "Written appeal"). */
export function ChoiceCard({ selected, onClick, title, children, right, className }: { selected: boolean; onClick: () => void; title: ReactNode; children?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick} className={cn("w-full rounded-2xl border p-4 text-left transition-colors", selected ? "border-forest bg-[#F3F7F4]" : "border-edge bg-white hover:bg-tile", className)}>
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px]", selected ? "border-forest" : "border-[#D9D0C3]")}>{selected ? <span className="h-2 w-2 rounded-full bg-forest" /> : null}</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{title}</div>
          {children ? <div className="mt-1 text-[13px] text-muted">{children}</div> : null}
        </div>
        {right}
      </div>
    </button>
  );
}
