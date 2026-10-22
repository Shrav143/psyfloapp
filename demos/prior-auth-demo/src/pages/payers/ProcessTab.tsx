import { useState } from "react";
import { Banner, Disclosure } from "@/components/ui";
import type { PayerConfig } from "@/data/payerConfig";
import { sleep } from "@/lib/format";
import { useStore } from "@/store";
import { useAlive } from "./lib/useAlive";
import { CallerSection, ReachSection } from "./ReachCards";
import { Unapplied } from "./Unapplied";
import { WorkflowCard } from "./WorkflowCard";
import { WorkflowEditor } from "./WorkflowEditor";

export function ProcessTab({ id, name, cfg, onReview }: { id: string; name: string; cfg: PayerConfig; onReview: () => void }) {
  const alive = useAlive();
  const [editing, setEditing] = useState(false);
  const [relearning, setRelearning] = useState(false);

  /** Historian looks at the last 90 days for about three seconds, then proposes a change. It never edits the workflow itself. */
  const relearn = async () => {
    setRelearning(true);
    await sleep(3000);
    if (!alive.current) return;
    const found = useStore.getState().addProposal(id);
    setRelearning(false);
    useStore.getState().toast(found ? { title: "Historian has a proposal", body: "Review it on the Changes tab. The workflow has not changed.", tone: "mid" } : { title: "Nothing new to propose", body: `The workflow already matches how ${name} ruled in the last 90 days.`, tone: "good" });
  };

  return (
    <div className="flex flex-col gap-4">
      <Unapplied id={id} name={name} cfg={cfg} />
      {cfg.proposals.length ? (
        <Banner tone="neutral" title={`Historian proposed ${cfg.proposals.length} ${cfg.proposals.length === 1 ? "change" : "changes"}`} action={<button type="button" onClick={onReview} className="font-semibold text-forest hover:underline">Review in Changes</button>}>It never edits the workflow on its own.</Banner>
      ) : null}
      <WorkflowCard name={name} cfg={cfg} relearning={relearning} onEdit={() => setEditing(true)} onRelearn={relearn} />
      <Disclosure title={`How to reach ${name} and what Caller says`} summary={`Reached by ${cfg.reachedBy.toLowerCase()}, ${cfg.facts.backup}. Caller script saved ${cfg.caller.confirmed}.`}>
        <div className="grid grid-cols-1 divide-line min-[760px]:grid-cols-2 min-[760px]:divide-x">
          <ReachSection name={name} cfg={cfg} />
          <CallerSection id={id} cfg={cfg} />
        </div>
      </Disclosure>
      {editing ? <WorkflowEditor id={id} name={name} cfg={cfg} onClose={() => setEditing(false)} /> : null}
    </div>
  );
}
