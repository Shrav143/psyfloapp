import { useState } from "react";
import { GitBranch, History, Triangle } from "lucide-react";
import { Button, InfoTip, Pill } from "@/components/ui";
import type { CaseDraft } from "@/data/cases";
import { payerById } from "@/data/seed";
import { STAGE_LABEL } from "@/data/workflow/types";
import { stamp } from "@/lib/time";
import { WorkflowViewPanel } from "@/pages/payers/studio";
import { DefaultWorkflowPanel } from "./DefaultWorkflowPanel";
import { defaultLabel, type CaseWorkflow } from "./model";
import { ReviewWorkflowDrawer, type ReviewKind } from "./ReviewWorkflowDrawer";
import { WorkflowTraceDrawer } from "./WorkflowTraceDrawer";

const namesOf = (list: { name: string }[]): string => (list.length < 3 ? list.map((w) => w.name).join(" and ") : `${list.slice(0, -1).map((w) => w.name).join(", ")} and ${list[list.length - 1].name}`);

/** The one line under the stepper that says which payer workflow this case follows. It is calm: the name, the version and the payer, a note on why this one, View workflow,
    and where the workflow is. A conflict, a newer version or a changed match is said in the same line, with the one button that reviews it. */
export function WorkflowRow({ draft, view }: { draft: CaseDraft; view: CaseWorkflow }) {
  const [viewing, setViewing] = useState(false);
  const [tracing, setTracing] = useState(false);
  const [review, setReview] = useState<ReviewKind | null>(null);
  const { applied } = view;
  /* The payer of the workflow the case follows, which is not the case's payer once the payer was changed after the workflow was pinned. */
  const payer = applied.usedDefault ? "" : payerById(view.workflow.payerId)?.shortName ?? "";
  const log = draft.workflowLog ?? [];
  /* A request that was sent keeps the workflow it was sent with: nothing is offered to change it. */
  const reviewable = !draft.sent;
  const reviewKind: ReviewKind | null = !reviewable ? null : view.conflict ? "choose" : view.differs ? "changed" : view.newer ? "newer" : null;

  return (
    <div data-testid="workflow-row" className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-line bg-white/70 px-4 py-2 text-[13.5px]">
      <GitBranch size={16} className="ico shrink-0 text-forest" aria-hidden="true" />
      <span className="min-w-0 text-ink2">
        <span className="text-muted">Workflow: </span>
        <b className="font-semibold text-ink" data-testid="workflow-name">{applied.name}</b>
        {applied.usedDefault ? null : <span data-testid="workflow-version" className="text-muted"> · v{applied.version} · {payer}</span>}
      </span>
      {applied.usedDefault ? <Pill tone="neutral">Illustrative default</Pill> : null}
      <InfoTip label="Why this workflow" align="start">
        <p className="font-medium text-ink">{applied.usedDefault ? defaultLabel(view.facts.requestType) : applied.explanation}</p>
        {applied.usedDefault && view.conflict ? <p className="mt-1.5">{applied.explanation}</p> : null}
        {view.run.rulesUsed.length ? (
          <p className="mt-1.5">
            Rules read: {view.run.rulesUsed.map((r) => `${r.title} (${r.verification === "verified" ? "Verified" : r.verification === "needs_review" ? "Needs review" : r.verification === "superseded" ? "Superseded" : "Unverified"})`).join(", ")}.
          </p>
        ) : null}
        <p className="mt-1.5">{view.pinned ? `This version is pinned to the case since ${stamp(applied.appliedAt)}. Only a person can switch it.` : "The workflow can still change until it runs past Intake."}</p>
      </InfoTip>
      <Button size="sm" variant="ghost" onClick={() => setViewing(true)}>
        View workflow
      </Button>
      {log.length ? (
        <Button size="sm" variant="ghost" icon={History} onClick={() => setTracing(true)} aria-label={`Workflow trace, ${log.length} ${log.length === 1 ? "line" : "lines"}`}>
          Trace
        </Button>
      ) : null}

      <span className="ml-auto flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        {reviewable && view.conflict ? (
          <span className="flex items-center gap-1.5 text-mid-ink" role="status">
            <Triangle size={13} className="ico shrink-0" aria-hidden="true" />
            {namesOf(view.conflict)} match equally. The default is used until you choose.
          </span>
        ) : reviewable && view.differs ? (
          <span className="text-mid-ink" role="status">The case details changed since this workflow was applied.</span>
        ) : reviewable && view.newer ? (
          <span className="text-muted" role="status">A newer version exists (v{view.newer.version}).</span>
        ) : (
          <span className="text-muted">At {STAGE_LABEL[view.stage]}</span>
        )}
        {reviewKind ? (
          <Button size="sm" variant={view.conflict ? "outline" : "ghost"} onClick={() => setReview(reviewKind)}>
            {reviewKind === "choose" ? "Choose a workflow" : reviewKind === "changed" ? "Review the match" : "Review newer version"}
          </Button>
        ) : null}
      </span>

      {applied.usedDefault ? (
        <DefaultWorkflowPanel view={view} open={viewing} onClose={() => setViewing(false)} />
      ) : (
        <WorkflowViewPanel workflowId={applied.workflowId} version={applied.version} trace={view.run} open={viewing} onClose={() => setViewing(false)} />
      )}
      <WorkflowTraceDrawer draft={draft} open={tracing} onClose={() => setTracing(false)} />
      <ReviewWorkflowDrawer draft={draft} view={view} kind={review} onClose={() => setReview(null)} />
    </div>
  );
}
