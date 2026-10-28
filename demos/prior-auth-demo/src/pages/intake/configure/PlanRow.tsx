import { useId, useState } from "react";
import { ChevronDown, Lock, RotateCcw } from "lucide-react";
import { Button, Chip, Pill, Switch } from "@/components/ui";
import { moduleById } from "@/data/assess/modules";
import { reviewLine } from "@/data/assess/reviewLine";
import { LEVEL_LABEL, SOURCE_LABEL, VERIFICATION_LABEL, type ModuleKind, type RequirementSource } from "@/data/assess/types";
import { staffOf } from "@/data/intake/seed";
import { cn } from "@/lib/cn";
import { isOverridden, type Row } from "./model";
import { VERIFICATION_TONE } from "./PlanHeader";

export const KIND_LABEL: Record<ModuleKind, string> = { section: "Section", framework: "Framework", instrument: "Instrument", review: "Review" };
const nameOf = (id?: string): string => (id ? staffOf(id)?.name ?? id : "a team member");

/** One module of the plan: what it is, how strongly the configuration asks for it, where that comes from and how sure the source is. A required module shows
    a lock and can only be removed by an authorized override; the reason it is in the plan is one click away. */
export function PlanRow({ row, onToggle, onRemove, onRestore }: { row: Row; onToggle: (on: boolean) => void; onRemove: () => void; onRestore: () => void }) {
  const [why, setWhy] = useState(false);
  const id = useId();
  const overridden = isOverridden(row);
  const sources = [...new Set(row.sources.map((s) => s.source))] as RequirementSource[];
  const chips = row.added ? (["clinician"] as RequirementSource[]) : sources;
  const noPayer = !row.sources.some((s) => s.source === "payer_policy");
  const off = row.state === "off";
  return (
    <li className={cn("rounded-2xl border border-edge bg-white px-4 py-3.5", off && "bg-tile")}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 pt-0.5">
          {row.level === "required" ? (
            <span className="grid h-6 w-6 place-items-center text-muted" title="Required: cannot be removed without an authorized override">
              <Lock size={16} className="ico" aria-label={overridden ? "Required, removed by override" : "Required, locked"} />
            </span>
          ) : (
            <Switch checked={!off} onChange={onToggle} label={<span className="sr-only">Use {row.label}</span>} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className={cn("text-[14px] font-semibold", off && "text-muted")}>{row.label}</span>
            <Chip>{KIND_LABEL[row.kind]}</Chip>
            <Chip className={row.level === "required" ? "bg-sage-bg text-forest" : undefined}>{LEVEL_LABEL[row.level]}</Chip>
            {row.status ? <Pill tone={VERIFICATION_TONE[row.status]}>{VERIFICATION_LABEL[row.status]}</Pill> : null}
            {row.preparation ? <Pill tone="neutral">Preparation only</Pill> : null}
            {moduleById(row.id).licensed ? <Chip>Licensed content not loaded</Chip> : null}
            <span className="sr-only">Sources:</span>
            {chips.map((s) => (
              <span key={s} className="rounded-full border border-edge bg-white px-2.5 py-[2px] text-xs font-medium text-ink2">{SOURCE_LABEL[s]}</span>
            ))}
          </div>
          {overridden ? (
            <p className="mt-2 text-[13px] font-medium text-mid-ink">Removed by override: {nameOf(row.who)}, {row.reason}</p>
          ) : off && row.by === "clinician" ? <p className="mt-1.5 text-xs text-muted">Turned off by {nameOf(row.who)}.</p> : null}
          <button type="button" aria-expanded={why} aria-controls={id} onClick={() => setWhy((w) => !w)} className="mt-2 inline-flex items-center gap-1 rounded text-[13px] font-semibold text-forest hover:underline">
            Why this module
            <ChevronDown size={14} className={cn("ico transition-transform", why && "rotate-180")} aria-hidden="true" />
          </button>
          <div id={id} hidden={!why}>
            {why ? (
              <ul className="mt-2 flex flex-col gap-2.5 rounded-xl bg-tile px-3.5 py-3 text-[13px]">
                {row.added ? <li>Added by {nameOf(row.who)}. No rule asks for it; it is clinician selected.</li> : null}
                {row.sources.map((s) => (
                  <li key={`${s.ruleId}-${s.level}-${s.reason}`}>
                    <div><span className="font-semibold">{s.ruleLabel}</span> <span className="text-muted">· {SOURCE_LABEL[s.source]} · {VERIFICATION_LABEL[s.status]} · {s.version === "purpose" ? "intake purpose rule" : `version ${s.version}`} · {LEVEL_LABEL[s.level].toLowerCase()}</span></div>
                    <div className="text-ink2">{s.reason}</div>
                    <div className="text-muted" data-review-line>{reviewLine(s)}</div>
                    {s.preparation ? <div className="text-muted">Takes effect after the policy date, so it is preparation only and does not hold up readiness.</div> : null}
                  </li>
                ))}
                {!row.added && noPayer ? <li className="text-muted">Payer requirement not yet verified.</li> : null}
              </ul>
            ) : null}
          </div>
        </div>
        <div className="shrink-0">
          {overridden ? <Button size="sm" icon={RotateCcw} onClick={onRestore} aria-label={`Restore ${row.label}`}>Restore</Button> : null}
          {row.level === "required" && !overridden ? <Button size="sm" onClick={onRemove} aria-label={`Remove ${row.label}`}>Remove</Button> : null}
        </div>
      </div>
    </li>
  );
}
