import { ArrowRight, GitBranch, History, PenLine } from "lucide-react";
import { AgentChip, Button, Card, Label, Spinner } from "@/components/ui";
import { conditionText, STEP_KINDS, type PayerConfig, type WorkflowStep } from "@/data/payerConfig";
import { InfoTip } from "@/pages/eligibility/InfoTip";
import { ConditionChip, StepChip } from "./StepChip";

function Branches({ step }: { step: WorkflowStep }) {
  if (!step.branches.length) return null;
  return (
    <div className="mt-3 ml-[17px] flex flex-col gap-2 border-l-2 border-[#E5DCD0] pl-4 min-[560px]:pl-6">
      {step.branches.map((b) => (
        <div key={b.id} className="flex flex-wrap items-stretch gap-2.5">
          <div className="flex w-[250px] max-w-full shrink-0 items-center gap-2 rounded-xl border border-tile-edge bg-tile px-3 py-2">
            <GitBranch size={16} className="ico text-sage" />
            <span className="text-sm"><b>If</b> {conditionText(b.cond)}</span>
          </div>
          <ArrowRight size={16} className="ico self-center text-muted" aria-label="leads to" />
          <div className="min-w-[200px] flex-1 rounded-xl border border-tile-edge bg-white px-3 py-2">
            <div className="mb-1"><StepChip kind={b.kind} /></div>
            <div className="text-sm">{b.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** The payer's workflow as numbered steps, with conditions drawn next to the step they lead to. */
export function WorkflowCard({ name, cfg, relearning, onEdit, onRelearn }: { name: string; cfg: PayerConfig; relearning: boolean; onEdit: () => void; onRelearn: () => void }) {
  const wf = cfg.workflow;
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-line px-6 pt-5 pb-[18px]">
        <div className="min-w-0 flex-1 basis-[260px]">
          <h3 className="font-serif text-[21px] leading-tight font-semibold tracking-tight">
            How an authorization works with {name}{" "}
            <InfoTip label="About this workflow">
              <span className="block">The workflow the agents follow, in order. Where the path splits, the condition is shown.</span>
              <span className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[11.5px] font-medium tracking-[0.1em] whitespace-nowrap text-muted uppercase">Step types</span>
                {STEP_KINDS.map((k) => <StepChip key={k} kind={k} />)}
                <ConditionChip />
              </span>
              <span className="mt-2 block">Admins can edit; every edit is logged. New drafts use a saved edit at once. Sent requests keep what they were sent with. Click Update drafts to redraft open ones.</span>
            </InfoTip>
          </h3>
          <p className="mt-[3px] text-[13.5px] text-muted">Version {wf.version}, edited {wf.editedOn}.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button size="sm" variant="primary" icon={PenLine} onClick={onEdit}>Edit workflow</Button>
          <Button size="sm" icon={History} loading={relearning} onClick={onRelearn}>Re-learn from decisions</Button>
        </div>
      </div>
      {relearning ? (
        <div role="status" className="flex items-center gap-2.5 border-b border-line bg-sage-bg px-6 py-2.5 text-sm"><Spinner />Historian is reviewing how {name} ruled over the last 90 days.</div>
      ) : null}
      <ol className="px-6 pt-1.5 pb-5">
        {wf.steps.map((s, i) => (
          <li key={s.id} className="border-b border-line py-4 last:border-b-0">
            <div className="flex items-start gap-4">
              <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-forest font-semibold text-white">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[15px] font-semibold">{s.title}</span>
                  <StepChip kind={s.kind} />
                  {s.agents.map((a) => <AgentChip key={a} agent={a} />)}
                </div>
                <p className="mt-1 text-[13.5px] text-muted">{s.text}</p>
              </div>
              <div className="min-w-[90px] text-right">
                <Label>Typical</Label>
                <div className="text-sm font-semibold">{s.typical}</div>
              </div>
            </div>
            <Branches step={s} />
          </li>
        ))}
      </ol>
    </Card>
  );
}
