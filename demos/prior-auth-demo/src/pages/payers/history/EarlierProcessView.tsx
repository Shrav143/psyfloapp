import { ArrowRight, GitBranch } from "lucide-react";
import { AgentChip, Label } from "@/components/ui";
import { InfoTip } from "@/components/ui/InfoTip";
import { conditionText, STEP_KINDS, type PayerConfig, type WorkflowStep } from "@/data/payerConfig";
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

/** The process as it was saved before the Workflow Builder, read only: numbered steps with the conditions drawn next to the step they lead to.
    The Workflow Builder holds the same process as a graph (the migrated workflow), and that is where it is edited now. */
export function EarlierProcessView({ name, cfg }: { name: string; cfg: PayerConfig }) {
  const wf = cfg.workflow;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-2 border-b border-line px-6 py-3 text-[13px] text-muted">
        Read only. How an authorization works with {name}, version {wf.version}, edited {wf.editedOn}.
        <InfoTip label="About the earlier process view">
          <span className="block">The steps the agents followed before the Workflow Builder, kept as saved. The builder has the same process as a graph; change it there.</span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-medium tracking-[0.1em] whitespace-nowrap text-muted uppercase">Step types</span>
            {STEP_KINDS.map((k) => <StepChip key={k} kind={k} />)}
            <ConditionChip />
          </span>
        </InfoTip>
      </div>
      <ol className="px-6 pt-1.5 pb-5">
        {wf.steps.map((s, i) => (
          <li key={s.id} className="border-b border-line py-4 last:border-b-0">
            <div className="flex items-start gap-4">
              <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-forest font-semibold text-white">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[14px] font-semibold">{s.title}</span>
                  <StepChip kind={s.kind} />
                  {s.agents.map((a) => <AgentChip key={a} agent={a} />)}
                </div>
                <p className="mt-1 text-[13px] text-muted">{s.text}</p>
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
    </div>
  );
}
