import { ArrowUpRight, Check } from "lucide-react";
import { Pill } from "@/components/ui";
import { PROGRAM_LABEL } from "@/data/types";
import { REQUEST_TYPE_LABEL, VERIFICATION_LABEL, type RuleGroup } from "@/data/workflow/types";
import { cn } from "@/lib/cn";
import { datesOf, VERIFICATION_TONE } from "../lib/ui";
import { useStudio } from "../StudioContext";

/* A step points at the payer's central rules; it never carries policy text of its own. The rule's wording is kept and edited in Rules & Instructions. */

export function RulePicker({ group, value, onChange, disabled }: { group: RuleGroup; value: string[]; onChange: (ids: string[]) => void; disabled?: boolean }) {
  const { rules, openRules, payerName } = useStudio();
  const mine = rules.filter((r) => r.group === group);
  const gone = value.filter((id) => !rules.some((r) => r.id === id));
  return (
    <div className="flex flex-col gap-2.5">
      {mine.length === 0 ? (
        <p className="m-0 rounded-xl bg-mid-bg px-3 py-2.5 text-[13px] text-mid-ink">{payerName} has no rule of this kind on file. With none chosen, the step cannot say what the payer requires and sends the case to manual review.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {mine.map((r) => {
            const on = value.includes(r.id);
            return (
              <li key={r.id}>
                <button type="button" role="checkbox" aria-checked={on} disabled={disabled} onClick={() => onChange(on ? value.filter((v) => v !== r.id) : [...value, r.id])} className={cn("flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left", on ? "border-forest bg-[#F3F7F4]" : "border-field bg-white hover:bg-tile")}>
                  <span className={cn("mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px]", on ? "border-forest bg-forest text-white" : "border-[#D9D0C3] bg-white")}>{on ? <Check size={12} className="ico" aria-hidden="true" /> : null}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold text-ink">{r.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Pill tone={VERIFICATION_TONE[r.verification]} dot>{VERIFICATION_LABEL[r.verification]}</Pill>
                      <span className="text-xs text-muted">{r.source.label}</span>
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {datesOf(r.effectiveFrom, r.effectiveTo)} · version {r.version}
                    </span>
                    <span className="block text-xs text-muted">
                      {r.services.length ? r.services.map((s) => PROGRAM_LABEL[s]).join(", ") : "Every service"} · {r.requestTypes.length ? r.requestTypes.map((t) => REQUEST_TYPE_LABEL[t]).join(", ") : "every request type"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {gone.length ? <p className="m-0 rounded-xl bg-risk-bg px-3 py-2 text-[13px] text-risk-ink">{gone.length === 1 ? "A rule this step points at" : `${gone.length} rules this step points at`} no longer exist in the library. Choose again, or the workflow cannot be published.</p> : null}
      <button type="button" onClick={() => openRules(group, value.find((id) => mine.some((r) => r.id === id)))} className="inline-flex items-center gap-1 self-start text-[13px] font-semibold text-forest hover:underline">
        Open in Rules & Instructions <ArrowUpRight size={14} className="ico" aria-hidden="true" />
      </button>
    </div>
  );
}
