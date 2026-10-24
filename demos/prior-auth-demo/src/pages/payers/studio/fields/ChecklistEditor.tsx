import { Check } from "lucide-react";
import { Button } from "@/components/ui";
import { PROGRAM_LABEL } from "@/data/types";
import { cn } from "@/lib/cn";
import { useStudio } from "../StudioContext";

/* Which of the payer's documents this step needs. The options are the payer's own list for the workflow's services (Rules & Instructions edits that list). */

export function ChecklistEditor({ value, onChange, disabled }: { value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  const { docs, services, payerName, openRules } = useStudio();
  const scope = services.length ? services.map((s) => PROGRAM_LABEL[s]).join(", ") : "every service";
  const all = docs.map((d) => d.id);
  const stale = value.filter((v) => !all.includes(v));
  return (
    <div className="flex flex-col gap-2.5">
      <p className="m-0 text-[13px] text-muted">
        {payerName}'s document list for {scope} has {docs.length} {docs.length === 1 ? "item" : "items"}. {value.length === 0 ? "With none chosen, the step asks for every item on the list." : `${value.length} chosen.`}
      </p>
      {docs.length === 0 ? <p className="m-0 text-[13px] text-mid-ink">This payer has no document list for these services yet.</p> : null}
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {docs.map((d) => {
          const on = value.includes(d.id);
          return (
            <li key={d.id}>
              <button type="button" role="checkbox" aria-checked={on} disabled={disabled} onClick={() => onChange(on ? value.filter((v) => v !== d.id) : [...value, d.id])} className={cn("flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left", on ? "border-forest bg-[#F3F7F4]" : "border-field bg-white hover:bg-tile")}>
                <span className={cn("mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px]", on ? "border-forest bg-forest text-white" : "border-[#D9D0C3] bg-white")}>{on ? <Check size={12} className="ico" aria-hidden="true" /> : null}</span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-ink">{d.title}</span>
                  <span className="block text-xs text-muted">{d.requirement}{d.services.length > 1 ? "" : d.services[0] ? ` · ${PROGRAM_LABEL[d.services[0]]}` : ""}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {stale.length ? <p className="m-0 text-xs text-mid-ink">{stale.length} chosen {stale.length === 1 ? "item is" : "items are"} no longer on the payer's list. Choose again, or clear them.</p> : null}
      {disabled ? null : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onChange(all)}>Choose all</Button>
          <Button size="sm" onClick={() => onChange([])} disabled={value.length === 0}>Clear</Button>
          <Button size="sm" variant="ghost" onClick={() => openRules("clinical_documentation")}>Edit the list in Rules & Instructions</Button>
        </div>
      )}
    </div>
  );
}
