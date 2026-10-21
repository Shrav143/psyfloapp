import { ArrowDown, ArrowUp, GitBranch, Plus, Trash2 } from "lucide-react";
import { AgentChip, Button, Dropdown, Field, TextArea, TextInput } from "@/components/ui";
import { COND_KINDS, STEP_KINDS, STEP_KIND_LABEL, type Branch, type CondKind, type StepKind, type WorkflowStep } from "@/data/payerConfig";
import { uid } from "@/lib/format";

const KIND_OPTIONS = STEP_KINDS.map((k) => ({ value: k, label: STEP_KIND_LABEL[k] }));
const COND_OPTIONS = COND_KINDS.map((c) => ({ value: c.value, label: c.label }));

const iconBtn = "grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-field bg-white text-ink2 hover:bg-tile disabled:opacity-40";

function BranchEditor({ branch, onChange, onRemove }: { branch: Branch; onChange: (b: Branch) => void; onRemove: () => void }) {
  const values = COND_KINDS.find((c) => c.value === branch.cond.kind)?.values ?? [];
  return (
    <div className="flex items-start gap-2 rounded-xl border border-tile-edge bg-tile p-2.5">
      <GitBranch size={16} className="ico mt-2.5 text-sage" />
      <div className="grid min-w-0 flex-1 grid-cols-[130px_1fr_150px] gap-2">
        <Dropdown variant="field" ariaLabel="Condition on" value={branch.cond.kind} options={COND_OPTIONS} onChange={(k: CondKind) => onChange({ ...branch, cond: { kind: k, value: COND_KINDS.find((c) => c.value === k)?.values[0] ?? "" } })} menuWidth={160} />
        <Dropdown variant="field" ariaLabel="Condition value" value={branch.cond.value} options={values.map((v) => ({ value: v, label: v }))} onChange={(v) => onChange({ ...branch, cond: { ...branch.cond, value: v } })} menuWidth={260} />
        <Dropdown variant="field" ariaLabel="Leads to" value={branch.kind} options={KIND_OPTIONS} onChange={(k: StepKind) => onChange({ ...branch, kind: k })} menuWidth={180} />
        <TextInput className="col-span-3" aria-label="What happens" value={branch.text} onChange={(e) => onChange({ ...branch, text: e.target.value })} placeholder="What happens on this path" />
      </div>
      <button type="button" aria-label="Remove this condition" onClick={onRemove} className={iconBtn}><Trash2 size={15} className="ico" /></button>
    </div>
  );
}

interface Props {
  step: WorkflowStep;
  index: number;
  count: number;
  onChange: (s: WorkflowStep) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

/** One step in the workflow editor: text, type, typical time, and its conditions. */
export function StepEditor({ step, index, count, onChange, onMove, onRemove }: Props) {
  const setBranch = (b: Branch) => onChange({ ...step, branches: step.branches.map((x) => (x.id === b.id ? b : x)) });
  const addBranch = () => onChange({ ...step, branches: [...step.branches, { id: uid("br"), cond: { kind: "program", value: "Residential 3.5" }, kind: "file", text: "" }] });
  return (
    <section aria-label={`Step ${index + 1}`} className="rounded-2xl border border-edge bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-sm font-semibold text-white">{index + 1}</span>
        <TextInput aria-label={`Step ${index + 1} title`} value={step.title} onChange={(e) => onChange({ ...step, title: e.target.value })} className="flex-1 font-semibold" />
        <Dropdown variant="field" ariaLabel={`Step ${index + 1} type`} value={step.kind} options={KIND_OPTIONS} onChange={(k: StepKind) => onChange({ ...step, kind: k })} className="!w-[170px]" menuWidth={180} />
        <button type="button" aria-label={`Move step ${index + 1} up`} disabled={index === 0} onClick={() => onMove(-1)} className={iconBtn}><ArrowUp size={15} className="ico" /></button>
        <button type="button" aria-label={`Move step ${index + 1} down`} disabled={index === count - 1} onClick={() => onMove(1)} className={iconBtn}><ArrowDown size={15} className="ico" /></button>
        <button type="button" aria-label={`Remove step ${index + 1}`} onClick={onRemove} className={iconBtn}><Trash2 size={15} className="ico" /></button>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_170px] gap-3">
        <Field label="What happens"><TextArea aria-label={`Step ${index + 1} text`} value={step.text} onChange={(e) => onChange({ ...step, text: e.target.value })} className="min-h-[64px]" /></Field>
        <Field label="Typical time"><TextInput aria-label={`Step ${index + 1} typical time`} value={step.typical} onChange={(e) => onChange({ ...step, typical: e.target.value })} /></Field>
      </div>
      {step.agents.length ? <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted">Done by {step.agents.map((a) => <AgentChip key={a} agent={a} />)}</div> : null}
      <div className="mt-3.5 flex flex-col gap-2">
        {step.branches.map((b) => <BranchEditor key={b.id} branch={b} onChange={setBranch} onRemove={() => onChange({ ...step, branches: step.branches.filter((x) => x.id !== b.id) })} />)}
        <div><Button size="sm" variant="ghost" icon={Plus} onClick={addBranch}>Add a condition</Button></div>
      </div>
    </section>
  );
}
