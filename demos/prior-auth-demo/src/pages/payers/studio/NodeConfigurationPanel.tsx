import { useMemo, type ReactNode, type Ref } from "react";
import { AlertTriangle, Copy, Link2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { ERROR_LABEL, EXEC_LABEL, STAGES_ORDER, STAGE_LABEL, SUPPORT_LABEL, type BranchDef, type ConditionGroup, type ConfigValue, type ErrorMode, type ExecMode, type FieldSpec, type PromptConfig, type Stage, type ValidationIssue, type WfNode } from "@/data/workflow/types";
import { BranchesEditor } from "./fields/BranchesEditor";
import { ChecklistEditor } from "./fields/ChecklistEditor";
import { ConditionBuilder, emptyGroup } from "./fields/ConditionBuilder";
import { AreaField, Fold, Labeled, MultiChips, NumberField, PanelHeading, Select, SelectField, TextField, ToggleRow } from "./fields/controls";
import { emptyPrompt, PromptEditor } from "./fields/PromptEditor";
import { RulePicker } from "./fields/RulePicker";
import { connect, canConnect, outputsOf, type Graph } from "./lib/model";
import { nodeDef } from "./lib/engine";
import { iconFor } from "./lib/icons";
import { categoryClass, SUPPORT_WORD, SupportDot } from "./WfNodeView";
import { useIntegrationStatus, type IntegrationStatus } from "./lib/integrations";

/* The right-hand panel. With a step selected it shows only the controls that step needs; with none it shows the workflow summary and the checks. */

export interface NodeConfigurationPanelProps {
  node: WfNode | null;
  graph: Graph;
  issues: ValidationIssue[];
  readOnly?: boolean;
  /** Shown when no step is selected: the workflow summary and its checks. */
  summary?: ReactNode;
  onChangeNode: (next: WfNode, merge?: string) => void;
  onGraph: (g: Graph, note: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
  headingRef?: Ref<HTMLHeadingElement>;
  className?: string;
}

export function NodeConfigurationPanel({ node, summary, className, ...rest }: NodeConfigurationPanelProps) {
  return (
    <aside aria-label={node ? `Settings for ${node.title}` : "Workflow summary"} className={cn("flex min-h-0 flex-col rounded-[20px] border border-edge bg-white", className)}>
      {node ? <NodeEditor node={node} {...rest} /> : summary}
    </aside>
  );
}

function NodeEditor({ node, graph, issues, readOnly, onChangeNode, onGraph, onDuplicate, onDelete, onClose, headingRef }: Omit<NodeConfigurationPanelProps, "summary" | "className" | "node"> & { node: WfNode }) {
  const def = nodeDef(node.kind);
  const mine = issues.filter((i) => i.nodeId === node.id);
  const Icon = iconFor(def?.icon);
  const patch = (p: Partial<WfNode>, merge?: string) => onChangeNode({ ...node, ...p }, merge);
  const setCfg = (key: string, value: ConfigValue) => onChangeNode({ ...node, config: { ...node.config, [key]: value } }, `cfg:${node.id}:${key}`);
  const val = (key: string): ConfigValue | undefined => node.config[key] ?? def?.defaults[key];
  const isFlow = node.kind === "start" || node.kind === "end";
  const fields = (def?.fields ?? []).filter((f) => !f.advanced);
  const advanced = (def?.fields ?? []).filter((f) => f.advanced);
  const has = (key: string) => (def?.fields ?? []).some((f) => f.key === key);
  const approvalLocked = !!def?.payerFacing;
  const connection = useIntegrationStatus(node.kind, def);

  return (
    <>
      <header className="flex items-start gap-3 border-b border-line px-4 pt-4 pb-3.5">
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-[11px]", categoryClass(def?.category))}>
          <Icon size={18} className="ico" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 ref={headingRef} tabIndex={-1} className="m-0 font-serif text-[18px] leading-tight font-semibold outline-none">{def?.title ?? node.title}</h3>
          {def && !isFlow ? (
            <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
              <SupportDot status={def.support} />
              <span className="font-medium text-ink2">{SUPPORT_WORD[def.support]}</span>
            </div>
          ) : null}
        </div>
        <button type="button" onClick={onClose} aria-label="Close the step settings" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink2 hover:bg-tile">
          <X size={17} className="ico" aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          {def && !isFlow ? <p className="m-0 text-[13px] text-muted">{def.supportNote || SUPPORT_LABEL[def.support]}</p> : null}

          {mine.length ? (
            <div className="flex flex-col gap-2">
              {mine.some((i) => i.severity === "error") ? (
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {mine.filter((i) => i.severity === "error").map((i, k) => (
                    <li key={k} className="flex items-start gap-2 rounded-xl bg-risk-bg px-3 py-2 text-[13px] text-risk-ink">
                      <AlertTriangle size={14} className="ico mt-0.5" aria-hidden="true" />
                      <span><span className="font-semibold">Needs fixing: </span>{i.text}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {mine.some((i) => i.severity === "warning") ? (
                <Fold title={`${mine.filter((i) => i.severity === "warning").length} to check`} summary="Not blocking. Open to read them.">
                  <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                    {mine.filter((i) => i.severity === "warning").map((i, k) => (
                      <li key={k} className="flex items-start gap-2 rounded-xl bg-mid-bg px-3 py-2 text-[13px] text-mid-ink">
                        <AlertTriangle size={14} className="ico mt-0.5" aria-hidden="true" />
                        <span><span className="font-semibold">Check: </span>{i.text}</span>
                      </li>
                    ))}
                  </ul>
                </Fold>
              ) : null}
            </div>
          ) : null}

          <TextField label="Title" value={node.title} onChange={(title) => patch({ title }, `title:${node.id}`)} disabled={readOnly} maxLength={60} />
          {isFlow ? null : <ModePicker value={node.mode} onChange={(mode) => patch({ mode })} disabled={readOnly} />}
          {isFlow ? null : (
            <Fold title="Description and instructions" summary={node.purpose || "Add a short description"}>
              <div className="flex flex-col gap-3.5">
                <AreaField label="Short description" rows={2} value={node.purpose} onChange={(purpose) => patch({ purpose }, `purpose:${node.id}`)} disabled={readOnly} help="A line or two shown under the title on the canvas." />
                <AreaField label="Instructions" rows={3} value={node.instructions ?? ""} onChange={(instructions) => patch({ instructions }, `instr:${node.id}`)} disabled={readOnly} placeholder="Notes for the people who run this step." help="Free text for the people who run this step. It does not change how the workflow decides." />
              </div>
            </Fold>
          )}

          {connection ? <ConnectionStatus status={connection} /> : null}

          {fields.length ? <hr className="m-0 border-0 border-t border-line" /> : null}
          {fields.map((f) => (
            <FieldView key={f.key} spec={f} node={node} value={val(f.key)} onCfg={setCfg} onRefs={(ruleRefs) => patch({ ruleRefs })} graph={graph} onBranches={(b) => setCfg(f.key, b)} disabled={readOnly} />
          ))}

          {outputsOf(node).length ? (
            <>
              <hr className="m-0 border-0 border-t border-line" />
              <NextSteps node={node} graph={graph} onGraph={onGraph} disabled={readOnly} />
            </>
          ) : null}

          {isFlow ? null : (
            <>
              <hr className="m-0 border-0 border-t border-line" />
              <div className="flex flex-col gap-3.5">
                <PanelHeading>Completion and safeguards</PanelHeading>
                {has("completion") ? null : <AreaField label="Completion criteria" rows={2} value={typeof node.config.completion === "string" ? node.config.completion : ""} onChange={(v) => setCfg("completion", v)} disabled={readOnly} placeholder="When is this step done?" help="Words for people. The engine moves on when the step's own work is finished." />}
                <ToggleRow label="A person approves first" value={node.approval || approvalLocked} onChange={(approval) => patch({ approval })} disabled={readOnly || approvalLocked} help="The workflow waits at this step until a person approves." note={approvalLocked ? "Steps that reach the payer always need a person's approval." : undefined} />
                <SelectField label="If the step fails" value={node.onError} disabled={readOnly} onChange={(v) => patch({ onError: v as ErrorMode })} options={(Object.keys(ERROR_LABEL) as ErrorMode[]).map((k) => ({ value: k, label: ERROR_LABEL[k] }))} />
                {node.onError === "retry" ? <NumberField label="Retries before manual review" value={node.retries ?? 2} min={1} max={5} disabled={readOnly} onChange={(v) => patch({ retries: v === "" ? undefined : v })} /> : null}
              </div>

              <Fold title="Advanced" summary={`Stage in New Case: ${STAGE_LABEL[node.stage]}`}>
                <div className="flex flex-col gap-3.5">
                  <SelectField label="Stage in New Case" value={node.stage} disabled={readOnly} onChange={(v) => patch({ stage: v as Stage })} options={STAGES_ORDER.map((s) => ({ value: s, label: STAGE_LABEL[s] }))} help="Which of the five stages this step is shown under. It does not force an order." />
                  {advanced.map((f) => (
                    <FieldView key={f.key} spec={f} node={node} value={val(f.key)} onCfg={setCfg} onRefs={(ruleRefs) => patch({ ruleRefs })} graph={graph} onBranches={(b) => setCfg(f.key, b)} disabled={readOnly} />
                  ))}
                  <p className="m-0 text-xs text-muted">Step id: <span className="font-mono">{node.id}</span></p>
                </div>
              </Fold>
            </>
          )}
        </div>
      </div>

      {readOnly ? null : (
        <footer className="flex items-center gap-2 border-t border-line px-4 py-3">
          {node.kind === "start" ? null : <Button size="sm" icon={Copy} onClick={onDuplicate}>Duplicate</Button>}
          {node.kind === "start" ? <span className="text-xs text-muted">Every workflow has one Start.</span> : <Button size="sm" variant="danger" icon={Trash2} onClick={onDelete}>Delete</Button>}
        </footer>
      )}
    </>
  );
}

function ModePicker({ value, onChange, disabled }: { value: ExecMode; onChange: (m: ExecMode) => void; disabled?: boolean }) {
  return (
    <Labeled label="How it runs" help="Automatic: the app does it. Manual: a person does it. Agent-assisted: a named agent prepares it and a person can review it.">
      <div role="radiogroup" aria-label="How it runs" className="flex gap-1 rounded-xl border border-field bg-white p-0.5">
        {(Object.keys(EXEC_LABEL) as ExecMode[]).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={value === m} disabled={disabled} onClick={() => onChange(m)} className={cn("h-8 flex-auto whitespace-nowrap rounded-[9px] px-2 text-[12px] font-medium", value === m ? "bg-forest text-white" : "text-ink2 hover:bg-tile")}>
            {EXEC_LABEL[m]}
          </button>
        ))}
      </div>
    </Labeled>
  );
}

function ConnectionStatus({ status }: { status: IntegrationStatus }) {
  return (
    <div className={cn("rounded-2xl border px-3.5 py-3", status.tone === "good" ? "border-good-edge bg-good-bg/60" : status.tone === "mid" ? "border-mid-edge bg-mid-bg/60" : "border-field bg-tile")}>
      <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
        <Link2 size={15} className="ico" aria-hidden="true" />
        Connection: {status.word}
      </div>
      <p className="mt-1 mb-0 text-[13px] text-ink2">{status.detail}</p>
      <p className="mt-1.5 mb-0 text-xs text-muted">Credentials are managed outside this app. Nothing secret is entered or stored here.</p>
    </div>
  );
}

/** One row per exit: where it leads, chosen from a list. The keyboard way to connect two steps. */
function NextSteps({ node, graph, onGraph, disabled }: { node: WfNode; graph: Graph; onGraph: (g: Graph, note: string) => void; disabled?: boolean }) {
  const outs = outputsOf(node);
  const titles = useMemo(() => {
    const count = new Map<string, number>();
    for (const n of graph.nodes) count.set(n.title, (count.get(n.title) ?? 0) + 1);
    const seen = new Map<string, number>();
    return new Map(graph.nodes.map((n) => { const k = (seen.get(n.title) ?? 0) + 1; seen.set(n.title, k); return [n.id, (count.get(n.title) ?? 0) > 1 ? `${n.title} (${k})` : n.title] as const; }));
  }, [graph.nodes]);

  const lead = (handle: string, to: string) => {
    const without: Graph = { ...graph, edges: graph.edges.filter((e) => !(e.from === node.id && e.handle === handle)) };
    if (!to) return onGraph(without, `Removed the line from ${node.title}`);
    const link = { from: node.id, handle, to };
    const v = canConnect(without, link);
    if (!v.ok) return;
    onGraph(connect(without, link), `Connected ${node.title} to ${titles.get(to) ?? "step"}`);
  };

  return (
    <div className="flex flex-col gap-3">
      <PanelHeading>Next steps</PanelHeading>
      {outs.map((o) => {
        const edge = graph.edges.find((e) => e.from === node.id && e.handle === o.handle);
        const without: Graph = { ...graph, edges: graph.edges.filter((e) => e !== edge) };
        const options = graph.nodes
          .filter((n) => n.id === edge?.to || canConnect(without, { from: node.id, handle: o.handle, to: n.id }).ok)
          .map((n) => ({ value: n.id, label: titles.get(n.id) ?? n.title }));
        return (
          <div key={o.handle}>
            <label className="mb-1 block text-[13px] font-medium text-ink2" htmlFor={`next-${node.id}-${o.handle}`}>
              {outs.length > 1 ? `When: ${o.label}` : "Then"}
            </label>
            <Select id={`next-${node.id}-${o.handle}`} value={edge?.to ?? ""} onChange={(v) => lead(o.handle, v)} options={options} placeholder="Not connected" disabled={disabled} ariaLabel={`Where ${o.label || "the next step"} leads`} />
          </div>
        );
      })}
    </div>
  );
}

interface FieldViewProps {
  spec: FieldSpec;
  node: WfNode;
  value: ConfigValue | undefined;
  graph: Graph;
  disabled?: boolean;
  onCfg: (key: string, v: ConfigValue) => void;
  onRefs: (ids: string[]) => void;
  onBranches: (b: BranchDef[]) => void;
}

function FieldView({ spec, node, value, graph, disabled, onCfg, onRefs, onBranches }: FieldViewProps) {
  const set = (v: ConfigValue) => onCfg(spec.key, v);
  switch (spec.type) {
    case "text":
      return <TextField label={spec.label} value={typeof value === "string" ? value : ""} onChange={set} placeholder={spec.placeholder} help={spec.help} disabled={disabled} />;
    case "textarea":
      return <AreaField label={spec.label} rows={spec.rows ?? 4} value={typeof value === "string" ? value : ""} onChange={set} placeholder={spec.placeholder} help={spec.help} disabled={disabled} />;
    case "number":
      return <NumberField label={spec.label} value={typeof value === "number" ? value : ""} onChange={(v) => set(v === "" ? null : v)} min={spec.min} max={spec.max} unit={spec.unit} help={spec.help} disabled={disabled} />;
    case "select":
      return <SelectField label={spec.label} value={typeof value === "string" ? value : ""} onChange={set} options={spec.options} help={spec.help} disabled={disabled} />;
    case "multiselect":
      return <MultiChips label={spec.label} values={Array.isArray(value) ? (value as string[]).filter((v) => typeof v === "string") : []} onChange={set} options={spec.options} help={spec.help} />;
    case "toggle":
      return <ToggleRow label={spec.label} value={value === true} onChange={set} help={spec.help} disabled={disabled} />;
    case "condition":
      return (
        <Block label={spec.label} help={spec.help}>
          <ConditionBuilder group={isGroupValue(value) ? value : emptyGroup()} onChange={set} name={spec.label} disabled={disabled} />
        </Block>
      );
    case "branches": {
      return (
        <Block label={spec.label} help={spec.help}>
          <BranchesEditor branches={Array.isArray(value) ? (value as BranchDef[]) : []} onChange={onBranches} disabled={disabled} connected={(id) => graph.edges.some((e) => e.from === node.id && e.handle === id)} />
        </Block>
      );
    }
    case "checklist":
      return (
        <Block label={spec.label} help={spec.help}>
          <ChecklistEditor value={Array.isArray(value) ? (value as string[]).filter((v) => typeof v === "string") : []} onChange={set} disabled={disabled} />
        </Block>
      );
    case "prompt":
      return (
        <Block label={spec.label} help={spec.help}>
          <PromptEditor value={isPrompt(value) ? value : emptyPrompt()} onChange={set} disabled={disabled} />
        </Block>
      );
    case "rule":
      return (
        <Block label={spec.label} help={spec.help}>
          <RulePicker group={spec.group} value={node.ruleRefs} onChange={onRefs} disabled={disabled} />
        </Block>
      );
  }
}

function Block({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return (
    <div>
      <PanelHeading>{label}</PanelHeading>
      {help ? <p className="mt-1 mb-2 text-[13px] text-muted">{help}</p> : <div className="h-2" />}
      {children}
    </div>
  );
}

const isGroupValue = (v: ConfigValue | undefined): v is ConditionGroup => !!v && typeof v === "object" && !Array.isArray(v) && "join" in v && "items" in v;
const isPrompt = (v: ConfigValue | undefined): v is PromptConfig => !!v && typeof v === "object" && !Array.isArray(v) && "prompt" in v && "agent" in v;

