import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import type { BranchDef } from "@/data/workflow/types";
import { newId } from "../lib/model";
import { ConditionBuilder, emptyGroup, newCondition } from "./ConditionBuilder";
import { TextField } from "./controls";

/* A Decision's exits. The first branch whose condition holds wins; Otherwise catches the rest. Removing a branch removes the line that left through it. */

export function BranchesEditor({ branches, onChange, disabled, connected }: { branches: BranchDef[]; onChange: (b: BranchDef[]) => void; disabled?: boolean; connected: (branchId: string) => boolean }) {
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= branches.length) return;
    const next = [...branches];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = () => {
    const id = newId("b", branches.map((b) => b.id));
    onChange([...branches, { id, label: `Branch ${branches.length + 1}`, when: { join: "and", items: [newCondition()] } }]);
  };
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-[13px] text-muted">Branches are checked from the top. The first one that holds is followed; if none do, the case follows Otherwise.</p>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {branches.map((b, i) => (
          <li key={b.id} className="rounded-2xl border border-field bg-white p-3">
            <div className="flex items-end gap-1.5">
              <div className="min-w-0 flex-1">
                <TextField label={`Branch ${i + 1} name`} value={b.label} onChange={(label) => onChange(branches.map((x, j) => (j === i ? { ...x, label } : x)))} disabled={disabled} />
              </div>
              <div className="flex shrink-0 gap-0.5 pb-0.5">
                <button type="button" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`Move ${b.label} up`} className="grid h-8 w-8 place-items-center rounded-lg text-ink2 hover:bg-tile disabled:opacity-30">
                  <ArrowUp size={15} className="ico" aria-hidden="true" />
                </button>
                <button type="button" disabled={disabled || i === branches.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${b.label} down`} className="grid h-8 w-8 place-items-center rounded-lg text-ink2 hover:bg-tile disabled:opacity-30">
                  <ArrowDown size={15} className="ico" aria-hidden="true" />
                </button>
                <button type="button" disabled={disabled} onClick={() => onChange(branches.filter((_, j) => j !== i))} aria-label={`Remove ${b.label}`} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-risk-bg hover:text-risk-ink">
                  <Trash2 size={15} className="ico" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="mt-2.5">
              <ConditionBuilder group={b.when ?? emptyGroup()} onChange={(when) => onChange(branches.map((x, j) => (j === i ? { ...x, when } : x)))} name={b.label} disabled={disabled} />
            </div>
            {connected(b.id) ? null : <p className="mt-2 mb-0 text-xs text-mid-ink">This branch does not lead anywhere yet. Connect it below, under Next steps.</p>}
          </li>
        ))}
      </ol>
      <div className="rounded-2xl border border-dashed border-field bg-tile/60 px-3 py-2.5 text-[13px] text-ink2">
        <span className="font-semibold">Otherwise</span>: when no branch above holds.
        {connected("else") ? null : <span className="text-mid-ink"> It does not lead anywhere yet.</span>}
      </div>
      {disabled ? null : <Button icon={Plus} onClick={add} className="self-start">Add a branch</Button>}
    </div>
  );
}
