import { useState } from "react";
import { Plus } from "lucide-react";
import { Banner, Button, Drawer } from "@/components/ui";
import type { PayerConfig, WorkflowStep } from "@/data/payerConfig";
import { uid } from "@/lib/format";
import { useStore } from "@/store";
import { workflowChanges } from "./lib/diffs";
import { ReasonModal } from "./ReasonModal";
import { StepEditor } from "./StepEditor";

const clone = (steps: WorkflowStep[]): WorkflowStep[] => steps.map((s) => ({ ...s, agents: [...s.agents], branches: s.branches.map((b) => ({ ...b, cond: { ...b.cond } })) }));

/** Guided editor: change a step's text and type, add or remove a condition, reorder steps. Save asks for a reason and logs every change. Mounted only while open. */
export function WorkflowEditor({ id, name, cfg, onClose }: { id: string; name: string; cfg: PayerConfig; onClose: () => void }) {
  const [steps, setSteps] = useState<WorkflowStep[]>(() => clone(cfg.workflow.steps));
  const [saving, setSaving] = useState(false);
  const changes = workflowChanges(cfg.workflow.steps, steps);
  const patch = (i: number, s: WorkflowStep) => setSteps((all) => all.map((x, j) => (j === i ? s : x)));
  const move = (i: number, dir: -1 | 1) => setSteps((all) => {
    const next = [...all];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    return next;
  });
  const addStep = () => setSteps((all) => [...all, { id: uid("st"), title: "New step", kind: "check", agents: [], text: "", typical: "1 minute", branches: [] }]);

  return (
    <>
      <Drawer open onClose={onClose} width={860} title="Edit workflow" subtitle={`How an authorization works with ${name}. Version ${cfg.workflow.version} now, ${cfg.workflow.version + 1} when you save.`}
        footer={<div className="flex items-center justify-between"><span className="text-sm text-muted">{changes.length ? `${changes.length} ${changes.length === 1 ? "change" : "changes"} not saved yet` : "No changes yet"}</span><div className="flex gap-2.5"><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => (changes.length ? setSaving(true) : useStore.getState().toast({ title: "Nothing to save", body: "Change a step or a condition first.", tone: "neutral" }))}>Save workflow</Button></div></div>}>
        <div className="flex flex-col gap-4">
          <Banner tone="neutral">Steps run in order. A condition sends the case down another path when it is true. Save asks for a reason and logs the old and new text.</Banner>
          {steps.map((s, i) => <StepEditor key={s.id} step={s} index={i} count={steps.length} onChange={(x) => patch(i, x)} onMove={(d) => move(i, d)} onRemove={() => setSteps((all) => all.filter((_, j) => j !== i))} />)}
          <div><Button icon={Plus} onClick={addStep}>Add a step</Button></div>
        </div>
      </Drawer>
      {saving ? (
        <ReasonModal title="Save the workflow?" subtitle={`This becomes version ${cfg.workflow.version + 1}. New drafts use it at once. Sent requests keep what they were sent with. Click Update drafts to redraft open ones.`} onClose={() => setSaving(false)} onSave={(reason) => {
          useStore.getState().saveWorkflow(id, steps, reason, changes);
          setSaving(false);
          onClose();
        }}>
          <ul className="max-h-[200px] list-disc overflow-auto rounded-xl bg-tile py-3 pr-4 pl-8 text-[13px] text-ink2">
            {changes.map((c) => <li key={c.what + c.after}>{c.what}</li>)}
          </ul>
        </ReasonModal>
      ) : null}
    </>
  );
}
