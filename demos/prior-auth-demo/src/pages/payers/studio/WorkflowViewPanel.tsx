import { useMemo, useState } from "react";
import { ArrowUpRight, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { Button, Drawer, Pill } from "@/components/ui";
import { PROGRAM_LABEL } from "@/data/types";
import { DEFAULT_ID_PREFIX, DEFAULT_NOTE, DEFAULT_WORKFLOW_FOR, isDefaultWorkflowId } from "@/data/workflow/default";
import { REQUEST_TYPE_LABEL, VERIFICATION_LABEL, type PayerRule, type RequestType, type RunResult, type WfEdge, type WfNode, type WorkflowStatus } from "@/data/workflow/types";
import { paths } from "@/routes";
import { stamp } from "@/lib/time";
import { stateName } from "../lib/states";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { RUN_WORD, runStateOf } from "./lib/model";
import { useLiveWorkflow, usePayerRules, useVersions } from "./lib/store";
import { OUTCOME_TONE, OUTCOME_WORD, STATUS_TONE, STATUS_WORD, VERIFICATION_TONE, datesOf } from "./lib/ui";

/* The read-only view of a workflow: its canvas, its rules and, when a run is given, which steps were executed, skipped or are still pending.
   New case and Case Manager open it; so does Test Workflow. */

export interface WorkflowViewPanelProps {
  workflowId: string;
  /** Show this saved version instead of the current one. A case keeps the version it started with. */
  version?: number;
  /** The run to draw on the canvas. */
  trace?: RunResult;
  open: boolean;
  onClose: () => void;
}

export function WorkflowViewPanel({ workflowId, version, trace, open, onClose }: WorkflowViewPanelProps) {
  const saved = useLiveWorkflow(workflowId);
  // The labelled default lives in the app, not in a payer's saved workflows. It draws the same way and says what it is.
  const isDefault = !saved && isDefaultWorkflowId(workflowId);
  const live = saved ?? (isDefault ? DEFAULT_WORKFLOW_FOR(workflowId.slice(DEFAULT_ID_PREFIX.length) as RequestType) : undefined);
  const versions = useVersions(workflowId);
  const rules = usePayerRules(isDefault ? "" : live?.payerId ?? "");
  const [picked, setPicked] = useState<string | null>(null);

  const snap = version !== undefined ? versions.find((v) => v.version === version) : undefined;
  const nodes: WfNode[] = snap?.nodes ?? live?.nodes ?? [];
  const edges: WfEdge[] = snap?.edges ?? live?.edges ?? [];
  const meta = snap?.meta ?? live;
  const status: WorkflowStatus | undefined = snap?.status ?? live?.status;
  const shownVersion = snap?.version ?? live?.version;
  const run = useMemo(() => (trace ? runStateOf({ nodes, edges }, trace) : undefined), [trace, nodes, edges]);

  const refs = useMemo(() => {
    const ids = [...new Set(nodes.flatMap((n) => n.ruleRefs))];
    return ids.map((id) => ({ id, rule: rules.find((r) => r.id === id) as PayerRule | undefined }));
  }, [nodes, rules]);
  const step = trace && picked ? trace.steps.find((s) => s.nodeId === picked) : undefined;
  const pickedNode = nodes.find((n) => n.id === picked);

  const counts = trace
    ? { done: trace.steps.filter((s) => s.outcome === "done").length, skipped: new Set([...trace.skipped, ...trace.steps.filter((s) => s.outcome === "skipped").map((s) => s.nodeId)]).size, pending: (trace.pending ?? []).length, stopped: trace.steps.filter((s) => s.outcome !== "done" && s.outcome !== "skipped").length }
    : undefined;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={860}
      title={meta?.name ?? "Workflow"}
      subtitle={meta ? (isDefault ? <span className="flex flex-wrap items-center gap-2"><Pill tone="neutral">Illustrative default</Pill><span>{DEFAULT_NOTE}</span></span> : <span className="flex flex-wrap items-center gap-2">{status ? <Pill tone={STATUS_TONE[status]} dot>{STATUS_WORD[status]}</Pill> : null}<span>Version {shownVersion}</span><span>·</span><span>{datesOf(meta.effectiveFrom, meta.effectiveTo)}</span></span>) : "This workflow is not in the library."}
      footer={meta && live && !isDefault ? <div className="flex justify-end"><Link to={`${paths.payers(live.payerId, "builder")}&workflow=${live.id}`} onClick={onClose}><Button icon={ArrowUpRight}>Open in Workflow Builder</Button></Link></div> : undefined}
    >
      {!meta ? (
        <p className="m-0 text-sm text-muted">The workflow this case followed has been removed from the library. The case keeps what it recorded.</p>
      ) : (
        <div className="flex flex-col gap-5">
          <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <Fact label="Request type" value={meta.requestType === "any" ? "Any request type" : REQUEST_TYPE_LABEL[meta.requestType]} />
            <Fact label="Services" value={meta.services.length ? meta.services.map((s) => PROGRAM_LABEL[s]).join(", ") : "Every service"} />
            <Fact label="State and plan" value={[stateName(meta.state), meta.product].filter(Boolean).join(", ")} />
            <Fact label="Owner" value={meta.owner} />
          </dl>

          {trace && counts ? (
            <section aria-label="This run" className="rounded-2xl border border-edge bg-white p-4">
              <p className="m-0 font-semibold text-ink">{trace.outcomeText}</p>
              <p className="mt-1 mb-0 text-[13px] text-muted">
                {counts.done} done · {counts.skipped} skipped · {counts.pending} pending{counts.stopped ? ` · ${counts.stopped} stopped or waiting` : ""}. Other steps were not reached on this path.
              </p>
            </section>
          ) : null}

          <div style={{ height: 460 }}>
            <WorkflowCanvas key={`${workflowId}-${shownVersion}`} nodes={nodes} edges={edges} readOnly runState={run} selectedId={picked} onSelect={(id) => setPicked(id)} ariaLabel={`${meta.name}, version ${shownVersion}, read only`} />
          </div>

          {pickedNode ? (
            <div className="rounded-2xl border border-line bg-tile/60 px-4 py-3 text-[13.5px]" aria-live="polite">
              <div className="font-semibold">{pickedNode.title}{run ? <span className="ml-2 font-normal text-muted">{RUN_WORD[run.nodes[pickedNode.id] ?? "queued"] || ""}</span> : null}</div>
              <p className="mt-0.5 mb-0 text-ink2">{step ? step.message : pickedNode.purpose}</p>
            </div>
          ) : (
            <p className="m-0 text-[13px] text-muted">Select a step to read what it does{trace ? " and what happened there" : ""}.</p>
          )}

          {trace && trace.steps.length ? (
            <section aria-label="The path">
              <h3 className="m-0 mb-2 font-serif text-[19px] font-semibold">The path so far</h3>
              <ol className="m-0 flex list-none flex-col gap-1.5 p-0">
                {trace.steps.map((s) => (
                  <li key={`${s.seq}-${s.nodeId}`} className="flex items-start gap-2.5 rounded-xl border border-line bg-white px-3 py-2 text-[13.5px]">
                    <Pill tone={OUTCOME_TONE[s.outcome]} dot>{OUTCOME_WORD[s.outcome]}</Pill>
                    <span className="min-w-0 flex-1"><span className="font-semibold">{s.title}.</span> {s.message}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section aria-label="Payer rules">
            <h3 className="m-0 mb-2 font-serif text-[19px] font-semibold">Payer rules it points at</h3>
            {refs.length === 0 ? (
              <p className="m-0 text-sm text-muted">No step points at a payer rule.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {refs.map(({ id, rule }) => (
                  <li key={id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-[13.5px]">
                    <span className="min-w-0 flex-1 font-medium">{rule ? rule.title : "A rule that is no longer in the library"}</span>
                    {rule ? <Pill tone={VERIFICATION_TONE[rule.verification]} dot>{VERIFICATION_LABEL[rule.verification]}</Pill> : <Pill tone="risk" dot>Missing</Pill>}
                    {rule ? <span className="text-xs text-muted">{rule.source.label} · {datesOf(rule.effectiveFrom, rule.effectiveTo)} · v{rule.version}</span> : null}
                  </li>
                ))}
              </ul>
            )}
            {refs.some((r) => !r.rule || r.rule.verification !== "verified") ? (
              <p className="mt-2 mb-0 flex items-start gap-2 text-[13px] text-mid-ink"><ShieldAlert size={15} className="ico mt-0.5" aria-hidden="true" />Some of these rules are not verified. The workflow follows them and says so; it does not treat them as the payer's confirmed policy.</p>
            ) : null}
          </section>

          {snap ? <p className="m-0 text-xs text-muted">Saved by {snap.savedBy}, {stamp(snap.savedAt)}. {snap.reason}</p> : null}
        </div>
      )}
    </Drawer>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="m-0 font-medium">{value || "Not set"}</dd>
    </div>
  );
}
