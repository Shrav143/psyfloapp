import { AlertTriangle, ArrowUpRight, CheckCircle2, Crosshair, OctagonX } from "lucide-react";
import { Pill } from "@/components/ui";
import { VERIFICATION_LABEL, type PayerRule, type ValidationIssue, type Workflow } from "@/data/workflow/types";
import { cn } from "@/lib/cn";
import { Fold, PanelHeading } from "./fields/controls";
import { nodeDef } from "./lib/engine";
import { VERIFICATION_TONE } from "./lib/ui";

/* What the right panel shows when no step is selected: the checks that block or warn about publishing, and what the workflow leans on. */

export function WorkflowSummary({ workflow, issues, rules, attempted, onGoTo, onOpenRule }: { workflow: Pick<Workflow, "nodes" | "edges" | "startsFrom" | "status" | "version">; issues: ValidationIssue[]; rules: PayerRule[]; /** Publish was tried and blocked: say so first. */ attempted: boolean; onGoTo: (nodeId: string) => void; onOpenRule: (rule: PayerRule) => void }) {
  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");
  const refs = [...new Set(workflow.nodes.flatMap((n) => n.ruleRefs))];
  const used = refs.map((id) => ({ id, rule: rules.find((r) => r.id === id) }));
  const approvals = workflow.nodes.filter((n) => n.approval || n.kind === "act_human_approval");
  const notLive = workflow.nodes.filter((n) => {
    const s = nodeDef(n.kind)?.support;
    return s === "simulated" || s === "not_configured";
  });
  const simulated = notLive.filter((n) => nodeDef(n.kind).support === "simulated").length;
  const unset = notLive.length - simulated;
  const title = (id?: string) => workflow.nodes.find((n) => n.id === id)?.title;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-line px-4 pt-4 pb-3.5">
        <h3 className="m-0 font-serif text-[19px] leading-tight font-semibold">This workflow</h3>
        <p className="mt-1 mb-0 text-[13px] text-muted">
          {workflow.nodes.length} steps and {workflow.edges.length} lines. Select a step to change it.
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-5">
          <section aria-label="Checks">
            <PanelHeading>Checks</PanelHeading>
            {attempted && errors.length ? (
              <p role="alert" className="mt-2 mb-0 flex items-start gap-2 rounded-xl bg-risk-bg px-3 py-2.5 text-[13.5px] font-semibold text-risk-ink">
                <OctagonX size={16} className="ico mt-0.5" aria-hidden="true" />
                Cannot publish yet: {errors.length} {errors.length === 1 ? "thing needs" : "things need"} fixing.
              </p>
            ) : null}
            {issues.length === 0 ? (
              <p className="mt-2 mb-0 flex items-start gap-2 text-[13.5px] text-good-ink">
                <CheckCircle2 size={16} className="ico mt-0.5 text-good" aria-hidden="true" />
                No problems found. It can be published.
              </p>
            ) : (
              <div className="mt-2 flex flex-col gap-2">
                {errors.length ? (
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {errors.map((i, k) => (
                      <IssueRow key={k} issue={i} title={title(i.nodeId)} onGoTo={onGoTo} />
                    ))}
                  </ul>
                ) : (
                  <p className="m-0 flex items-start gap-2 text-[13.5px] text-good-ink">
                    <CheckCircle2 size={16} className="ico mt-0.5 text-good" aria-hidden="true" />
                    Nothing blocks publishing.
                  </p>
                )}
                {warnings.length ? (
                  <Fold title={`${warnings.length} ${warnings.length === 1 ? "thing" : "things"} to check`} summary="Not blocking. Open to read them.">
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                      {warnings.map((i, k) => (
                        <IssueRow key={k} issue={i} title={title(i.nodeId)} onGoTo={onGoTo} />
                      ))}
                    </ul>
                  </Fold>
                ) : null}
              </div>
            )}
          </section>

          <section aria-label="Rules it uses">
            <PanelHeading>Payer rules it uses</PanelHeading>
            {used.length === 0 ? (
              <p className="mt-2 mb-0 text-[13px] text-muted">No step points at a payer rule yet.</p>
            ) : (
              <ul className="mt-2 mb-0 flex list-none flex-col gap-1.5 p-0">
                {used.map(({ id, rule }) => (
                  <li key={id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2">
                    <span className="min-w-0 flex-1 text-[13px] font-medium">{rule ? rule.title : "A rule that is no longer in the library"}</span>
                    {rule ? <Pill tone={VERIFICATION_TONE[rule.verification]} dot>{VERIFICATION_LABEL[rule.verification]}</Pill> : <Pill tone="risk" dot>Missing</Pill>}
                    {rule ? (
                      <button type="button" aria-label={`Open ${rule.title} in Rules & Instructions`} onClick={() => onOpenRule(rule)} className="grid h-7 w-7 place-items-center rounded-lg text-forest hover:bg-sage-bg">
                        <ArrowUpRight size={15} className="ico" aria-hidden="true" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Safeguards and demo parts">
            <PanelHeading>Safeguards</PanelHeading>
            <p className="mt-2 mb-0 text-[13px] text-ink2">
              {approvals.length ? `${approvals.length} ${approvals.length === 1 ? "step waits" : "steps wait"} for a person's approval.` : "No step waits for a person's approval."}
            </p>
            {notLive.length ? (
              <p className="mt-1.5 mb-0 text-[13px] text-muted">
                {[
                  simulated ? `${simulated} ${simulated === 1 ? "step is a" : "steps are a"} demo simulation` : "",
                  unset ? `${unset} ${unset === 1 ? "step is" : "steps are"} not configured` : "",
                ].filter(Boolean).join(", ")}
                . They do not reach a real system.
              </p>
            ) : null}
          </section>

          {workflow.startsFrom ? <p className="m-0 text-xs text-muted">Started from {workflow.startsFrom}. It keeps the link, not the policy.</p> : null}
        </div>
      </div>
    </div>
  );
}

function IssueRow({ issue: i, title, onGoTo }: { issue: ValidationIssue; title?: string; onGoTo: (nodeId: string) => void }) {
  return (
    <li className={cn("rounded-xl px-3 py-2 text-[13px]", i.severity === "error" ? "bg-risk-bg text-risk-ink" : "bg-mid-bg text-mid-ink")}>
      <div className="flex items-start gap-2">
        {i.severity === "error" ? <OctagonX size={14} className="ico mt-0.5" aria-hidden="true" /> : <AlertTriangle size={14} className="ico mt-0.5" aria-hidden="true" />}
        <span className="min-w-0 flex-1">
          <span className="font-semibold">{i.severity === "error" ? "Needs fixing" : "Check"}</span>
          {title ? <span className="opacity-80"> · {title}</span> : null}
          <span className="mt-0.5 block">{i.text}</span>
        </span>
      </div>
      {i.nodeId ? (
        <button type="button" onClick={() => onGoTo(i.nodeId as string)} className="mt-1.5 ml-[22px] inline-flex items-center gap-1 text-[12.5px] font-semibold underline-offset-2 hover:underline">
          <Crosshair size={13} className="ico" aria-hidden="true" /> Go to node
        </button>
      ) : null}
    </li>
  );
}
