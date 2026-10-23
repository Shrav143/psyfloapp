import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { PAYERS } from "@/data/seed";
import { OPERATOR_LABEL, isGroup, type Condition, type ConditionGroup, type FactKey, type Operator } from "@/data/workflow/types";
import { cn } from "@/lib/cn";
import { FACTS, factMeta, isDocFact, needsValue, operatorsFor, type FactMeta } from "../lib/facts";
import { useStudio } from "../StudioContext";
import { FIELD, Select } from "./controls";

/* A condition group: "all of" or "any of" a list of rules about the case, one level of groups inside it. The engine reads these, never a model. */

export const emptyGroup = (): ConditionGroup => ({ join: "and", items: [] });
const firstValue = (m: FactMeta): string | number | undefined => (m.options?.[0]?.value ?? (m.kind === "yesno" ? "true" : m.kind === "number" ? 0 : undefined));

export function newCondition(fact: FactKey = "coverage"): Condition {
  const m = factMeta(fact);
  return { fact, op: operatorsFor(m)[0], value: needsValue(operatorsFor(m)[0]) ? firstValue(m) : undefined };
}

interface Props {
  group: ConditionGroup;
  onChange: (g: ConditionGroup) => void;
  /** Used in aria-labels, so two builders on one screen are told apart. */
  name?: string;
  depth?: 0 | 1;
  disabled?: boolean;
  onRemove?: () => void;
}

export function ConditionBuilder({ group, onChange, name = "condition", depth = 0, disabled, onRemove }: Props) {
  const set = (items: ConditionGroup["items"]) => onChange({ ...group, items });
  const update = (i: number, next: Condition | ConditionGroup) => set(group.items.map((x, j) => (j === i ? next : x)));
  const remove = (i: number) => set(group.items.filter((_, j) => j !== i));
  return (
    <div className={cn("rounded-2xl border border-line bg-tile/60 p-3", depth === 1 && "border-field bg-white")}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[13px] text-ink2">Match</span>
        <div role="radiogroup" aria-label={`${name}: all or any`} className="inline-flex rounded-lg border border-field bg-white p-0.5">
          {(["and", "or"] as const).map((j) => (
            <button key={j} type="button" role="radio" aria-checked={group.join === j} disabled={disabled} onClick={() => onChange({ ...group, join: j })} className={cn("h-7 rounded-md px-2.5 text-[13px] font-medium", group.join === j ? "bg-forest text-white" : "text-ink2 hover:bg-tile")}>
              {j === "and" ? "All" : "Any"}
            </button>
          ))}
        </div>
        <span className="text-[13px] text-ink2">of these</span>
        {onRemove ? (
          <button type="button" onClick={onRemove} disabled={disabled} aria-label={`Remove this group from ${name}`} className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-risk-bg hover:text-risk-ink">
            <Trash2 size={14} className="ico" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {group.items.length === 0 ? <p className="mb-2 text-[13px] text-muted">No condition yet. With none, this always holds.</p> : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {group.items.map((item, i) => (
          <li key={i} className="flex flex-col gap-1.5">
            {i > 0 ? <span className="pl-1 text-[11.5px] font-semibold tracking-wide text-muted uppercase">{group.join === "and" ? "and" : "or"}</span> : null}
            {isGroup(item) ? (
              <ConditionBuilder group={item} onChange={(g) => update(i, g)} name={`${name}, group ${i + 1}`} depth={1} disabled={disabled} onRemove={() => remove(i)} />
            ) : (
              <ConditionRow cond={item} onChange={(c) => update(i, c)} onRemove={() => remove(i)} label={`${name}, condition ${i + 1}`} disabled={disabled} />
            )}
          </li>
        ))}
      </ul>

      {disabled ? null : (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Button size="sm" icon={Plus} onClick={() => set([...group.items, newCondition()])}>Add condition</Button>
          {depth === 0 ? (
            <Button size="sm" icon={Plus} onClick={() => set([...group.items, { join: group.join === "and" ? "or" : "and", items: [newCondition()] }])}>Add group</Button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ConditionRow({ cond, onChange, onRemove, label, disabled }: { cond: Condition; onChange: (c: Condition) => void; onRemove: () => void; label: string; disabled?: boolean }) {
  const { docs } = useStudio();
  const docTitle = (id: string) => docs.find((d) => d.id === id)?.title;
  const meta = factMeta(cond.fact, docTitle);
  const ops = operatorsFor(meta);
  const pickFact = (key: string) => {
    const m = factMeta(key as FactKey, docTitle);
    const op = operatorsFor(m)[0];
    onChange({ fact: key as FactKey, op, value: needsValue(op) ? firstValue(m) : undefined });
  };
  const pickOp = (op: Operator) => onChange({ ...cond, op, value: needsValue(op) ? (cond.value ?? firstValue(meta)) : undefined });
  const factOptions = [
    ...FACTS.map((f) => ({ value: f.key as string, label: f.label })),
    ...docs.map((d) => ({ value: `doc:${d.id}`, label: `Document: ${d.title}` })),
  ];
  if (isDocFact(cond.fact) && !factOptions.some((o) => o.value === cond.fact)) factOptions.push({ value: cond.fact, label: meta.label });

  return (
    <div className="rounded-xl border border-line bg-white p-2">
      <div className="flex items-center gap-1.5">
        <Select ariaLabel={`${label}: what to check`} value={cond.fact} onChange={pickFact} options={factOptions} disabled={disabled} className="h-9 text-[13.5px]" />
        <button type="button" onClick={onRemove} disabled={disabled} aria-label={`Remove ${label}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-risk-bg hover:text-risk-ink">
          <Trash2 size={14} className="ico" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-1.5 grid grid-cols-2 items-center gap-1.5">
        <Select ariaLabel={`${label}: operator`} value={cond.op} onChange={(v) => pickOp(v as Operator)} options={ops.map((o) => ({ value: o, label: OPERATOR_LABEL[o] }))} disabled={disabled} className="h-9 min-w-0 text-[13.5px]" />
        {needsValue(cond.op) ? <ValueInput meta={meta} cond={cond} onChange={(value) => onChange({ ...cond, value })} label={label} disabled={disabled} /> : <span className="text-[13px] text-muted">no value needed</span>}
      </div>
    </div>
  );
}

function ValueInput({ meta, cond, onChange, label, disabled }: { meta: FactMeta; cond: Condition; onChange: (v: string | number) => void; label: string; disabled?: boolean }) {
  const aria = `${label}: value`;
  if (meta.key === "payer") return <Select ariaLabel={aria} value={String(cond.value ?? "")} onChange={onChange} options={PAYERS.map((p) => ({ value: p.id, label: p.name }))} placeholder="Choose a payer" disabled={disabled} className="h-9 min-w-0 text-[13.5px]" />;
  if (meta.options) return <Select ariaLabel={aria} value={String(cond.value ?? "")} onChange={onChange} options={meta.options} disabled={disabled} className="h-9 min-w-0 text-[13.5px]" />;
  if (meta.kind === "yesno") return <Select ariaLabel={aria} value={String(cond.value ?? "true")} onChange={onChange} options={[{ value: "true", label: "Yes" }, { value: "false", label: "No" }]} disabled={disabled} className="h-9 min-w-0 text-[13.5px]" />;
  if (meta.kind === "number")
    return (
      <span className="flex min-w-0 items-center gap-1.5">
        <input aria-label={aria} type="number" inputMode="numeric" value={cond.value === undefined ? "" : cond.value} disabled={disabled} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} className={cn(FIELD, "h-9 w-[72px] text-[13.5px]")} />
        {meta.unit ? <span className="text-[12.5px] text-muted">{meta.unit}</span> : null}
      </span>
    );
  if (meta.kind === "date") return <DateValue value={String(cond.value ?? "today")} onChange={onChange} label={aria} disabled={disabled} />;
  return <input aria-label={aria} value={String(cond.value ?? "")} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={cn(FIELD, "h-9 min-w-0 text-[13.5px]")} />;
}

/** A date in a condition: today, a number of days from today, or one fixed date. The engine reads "today", "today+3" and "today-2". */
function DateValue({ value, onChange, label, disabled }: { value: string; onChange: (v: string) => void; label: string; disabled?: boolean }) {
  const rel = value.trim().toLowerCase().match(/^today(?:\s*([+-])\s*(\d+))?$/);
  const mode = rel ? (rel[1] === "+" ? "plus" : rel[1] === "-" ? "minus" : "today") : "date";
  const days = rel?.[2] ?? "1";
  const set = (m: string, d: string) => onChange(m === "today" ? "today" : m === "plus" ? `today+${d || 1}` : m === "minus" ? `today-${d || 1}` : /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "2026-10-20");
  return (
    <span className="col-span-2 flex min-w-0 items-center gap-1.5">
      <Select ariaLabel={`${label}: which date`} value={mode} onChange={(m) => set(m, days)} disabled={disabled} className="h-9 min-w-0 text-[13.5px]" options={[{ value: "today", label: "Today" }, { value: "plus", label: "Days after today" }, { value: "minus", label: "Days before today" }, { value: "date", label: "A fixed date" }]} />
      {mode === "plus" || mode === "minus" ? <input aria-label={`${label}: number of days`} type="number" min={0} value={days} disabled={disabled} onChange={(e) => set(mode, e.target.value)} className={cn(FIELD, "h-9 w-[64px] shrink-0 text-[13.5px]")} /> : null}
      {mode === "date" ? <input aria-label={`${label}: date`} type="date" value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={cn(FIELD, "h-9 min-w-0 text-[13.5px]")} /> : null}
    </span>
  );
}
