import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { TextInput } from "@/components/ui";
import type { Diagnosis } from "@/data/cases";
import { ICD_CODES } from "./lookups";

/** ICD-10 chips with add and remove. The search list is a short, fixed set for the demo. */
export function DiagnosisPicker({ value, onChange }: { value: Diagnosis[]; onChange: (next: Diagnosis[]) => void }) {
  const [q, setQ] = useState("");
  const [focus, setFocus] = useState(false);
  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ICD_CODES.filter((c) => !value.some((v) => v.code === c.code) && (!needle || c.code.toLowerCase().includes(needle) || c.label.toLowerCase().includes(needle))).slice(0, 6);
  }, [q, value]);
  const add = (d: Diagnosis) => {
    onChange([...value, d]);
    setQ("");
  };
  return (
    <div role="group" aria-label="Diagnoses (ICD-10)">
      <span className="mb-1.5 block text-[13px] font-medium text-ink2">Diagnoses (ICD-10)</span>
      <div>
        {value.length ? (
          <ul className="mb-2.5 flex flex-wrap gap-2" aria-label="Diagnoses on this request">
            {value.map((d) => (
              <li key={d.code} className="flex items-center gap-1.5 rounded-full bg-neutral-bg py-1 pr-1.5 pl-3 text-[13px]">
                <b>{d.code}</b>
                <span className="max-w-[190px] truncate text-ink2">{d.label}</span>
                <button type="button" aria-label={`Remove ${d.code}`} onClick={() => onChange(value.filter((x) => x.code !== d.code))} className="grid h-5 w-5 place-items-center rounded-full hover:bg-white">
                  <X size={13} className="ico" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="relative">
          <TextInput aria-label="Add a diagnosis" icon={Plus} value={q} placeholder="Add a diagnosis, e.g. F10 or alcohol" onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} />
          {focus && matches.length ? (
            <ul onMouseDown={(e) => e.preventDefault()} className="psy-fade-up absolute top-[42px] right-0 left-0 z-30 max-h-[260px] overflow-auto rounded-[14px] border border-field bg-white p-1.5 shadow-[0_12px_32px_rgba(40,30,15,0.12)]">
              {matches.map((c) => (
                <li key={c.code}>
                  <button type="button" onClick={() => add(c)} className="flex w-full items-baseline gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm hover:bg-tile">
                    <b className="w-[60px] shrink-0">{c.code}</b>
                    <span className="text-ink2">{c.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <span className="mt-1 block text-xs text-muted">Search by code or name, then pick one to add it</span>
      </div>
    </div>
  );
}
