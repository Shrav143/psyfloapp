import { useState } from "react";
import { History } from "lucide-react";
import { AgentChip, Banner, Button, Spinner } from "@/components/ui";
import { conditionText, STEP_KIND_LABEL, type PayerConfig, type Proposal } from "@/data/payerConfig";
import { sleep } from "@/lib/format";
import { useStore } from "@/store";
import { useAlive } from "../lib/useAlive";

function ProposalCard({ id, p }: { id: string; p: Proposal }) {
  const accept = useStore((s) => s.acceptProposal);
  const dismiss = useStore((s) => s.dismissProposal);
  return (
    <Banner tone="neutral" title={<span className="flex items-center gap-2"><AgentChip agent="historian" />Suggestion: {p.title}</span>}>
      <p>{p.text}</p>
      <p className="mt-1.5 rounded-xl bg-white/70 px-3 py-2">Under “{p.stepTitle}”: <b>If</b> {conditionText(p.cond)} → {STEP_KIND_LABEL[p.kind]}. {p.result}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        <Button variant="primary" size="sm" onClick={() => accept(id, p.id)}>Accept proposal</Button>
        <Button size="sm" onClick={() => dismiss(id, p.id)}>Dismiss</Button>
        <span className="text-xs">Applies to the earlier process view and to a draft of the migrated workflow in the Workflow Builder. Historian never changes a workflow on its own.</span>
      </div>
    </Banner>
  );
}

/** Historian's suggestions for this payer's process. "Re-learn from decisions" looks at the last 90 days for about three seconds, then proposes one change. It never edits a workflow itself:
    a person accepts or dismisses each suggestion. Accepting adds the branch to the earlier process view and to a DRAFT of the migrated workflow; the published workflow changes only when a person publishes the draft. */
export function Suggestions({ id, name, cfg }: { id: string; name: string; cfg: PayerConfig }) {
  const alive = useAlive();
  const [relearning, setRelearning] = useState(false);
  const relearn = async () => {
    setRelearning(true);
    await sleep(3000);
    if (!alive.current) return;
    const found = useStore.getState().addProposal(id);
    setRelearning(false);
    useStore.getState().toast(found ? { title: "Historian has a suggestion", body: "Review it here. The workflow has not changed.", tone: "mid" } : { title: "Nothing new to propose", body: `The workflow already matches how ${name} ruled in the last 90 days.`, tone: "good" });
  };
  return (
    <div className="flex flex-col gap-3 px-6 py-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" icon={History} loading={relearning} onClick={relearn}>Re-learn from decisions</Button>
        <span className="text-[13px] text-muted">Historian reads how {name} ruled over the last 90 days and suggests a change to the process.</span>
      </div>
      {relearning ? <div role="status" className="flex items-center gap-2.5 rounded-xl bg-sage-bg px-4 py-2.5 text-sm"><Spinner />Historian is reviewing how {name} ruled over the last 90 days.</div> : null}
      {cfg.proposals.length ? cfg.proposals.map((p) => <ProposalCard key={p.id} id={id} p={p} />) : <p className="text-sm text-muted">No suggestions waiting. Nothing changes unless you accept one.</p>}
    </div>
  );
}
