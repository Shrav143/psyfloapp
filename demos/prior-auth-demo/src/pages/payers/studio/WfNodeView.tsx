import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { AlertTriangle, Check, CircleSlash, Clock, Loader2, MinusCircle, UserCheck, UserRound, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { EXEC_LABEL, SUPPORT_LABEL, type NodeCategory, type NodeDef, type SupportStatus, type WfNode } from "@/data/workflow/types";
import { iconFor } from "./lib/icons";
import { NODE_W, RUN_WORD, type NodeRun, type Output } from "./lib/model";

/* One step on the canvas: icon, short title, one line of purpose, how it runs, whether it is real or simulated, and its exits. Quiet by default. */

export interface WfNodeData extends Record<string, unknown> {
  node: WfNode;
  def?: NodeDef;
  outputs: Output[];
  /** Exits that already have a line, so the others can be labelled under the card. */
  connected: string[];
  noInput: boolean;
  issue?: { severity: "error" | "warning"; text: string };
  run?: NodeRun;
  readOnly: boolean;
  /** Which way the workflow runs on the canvas: exits at the bottom (TB) or at the right (LR). */
  direction: "TB" | "LR";
  onOpen?: (id: string) => void;
}
export type RfWfNode = Node<WfNodeData, "wf">;

/** Restrained color by category: forest and sage for what works, ochre for checks and rules, umber for the rest. */
const CATEGORY: Record<NodeCategory, string> = {
  flow: "bg-forest text-white",
  trigger: "bg-good-bg text-good-ink",
  verification: "bg-sage-bg text-good",
  documents: "bg-neutral-bg text-umber",
  condition: "bg-mid-bg text-mid-ink",
  rule: "bg-mid-bg text-mid-ink",
  action: "bg-good-bg text-good-ink",
  agent: "bg-sage-bg text-forest",
  integration: "bg-neutral-bg text-neutral-ink",
};
export const categoryClass = (c: NodeCategory | undefined): string => CATEGORY[c ?? "action"];

export const SUPPORT_WORD: Record<SupportStatus, string> = { live: "Live", simulated: "Demo simulation", not_configured: "Not configured" };

/** The dot: filled for live, ringed for a simulation, hollow when not configured, so the shape says it as well as the color. */
export function SupportDot({ status, className }: { status: SupportStatus; className?: string }) {
  const word = SUPPORT_WORD[status];
  return (
    <span role="img" aria-label={word} title={`${word}: ${SUPPORT_LABEL[status]}`} className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", status === "live" && "bg-good", status === "simulated" && "border-2 border-mid bg-mid-bg", status === "not_configured" && "border-[1.5px] border-dashed border-muted bg-white", className)} />
  );
}

const RUN_STYLE: Record<NodeRun, { box: string; icon?: LucideIcon; tone: string }> = {
  done: { box: "border-good bg-good-bg/50", icon: Check, tone: "text-good-ink" },
  skipped: { box: "border-dashed border-field bg-tile opacity-80", icon: MinusCircle, tone: "text-muted" },
  failed: { box: "border-risk bg-risk-bg", icon: XCircle, tone: "text-risk-ink" },
  waiting: { box: "border-mid bg-mid-bg/60", icon: Clock, tone: "text-mid-ink" },
  manual_review: { box: "border-mid bg-mid-bg/60", icon: UserRound, tone: "text-mid-ink" },
  active: { box: "border-forest bg-white ring-4 ring-forest/20", icon: Loader2, tone: "text-forest" },
  queued: { box: "", tone: "" },
  pending: { box: "border-dashed border-sage bg-sage-bg/40", icon: Clock, tone: "text-good-ink" },
  notreached: { box: "border-field bg-white opacity-55", icon: CircleSlash, tone: "text-muted" },
};

function WfNodeViewBase({ data, selected }: NodeProps<RfWfNode>) {
  const { node, def, outputs, connected, noInput, issue, run, readOnly, direction, onOpen } = data;
  const lr = direction === "LR";
  const Icon = iconFor(def?.icon);
  const rs = run ? RUN_STYLE[run] : undefined;
  const RunIcon = rs?.icon;
  const word = run ? RUN_WORD[run] : "";
  const isFlow = node.kind === "start" || node.kind === "end";
  const lone = outputs.length === 1;

  return (
    <div
      onDoubleClick={() => onOpen?.(node.id)}
      style={{ width: NODE_W }}
      className={cn(
        "wf-node group relative rounded-[16px] border bg-white px-3.5 py-3 text-left transition-[border-color,box-shadow,background-color,opacity]",
        rs?.box || "border-field",
        selected && "border-forest ring-2 ring-forest/25",
        !selected && !rs?.box && "hover:border-sage",
      )}
    >
      {noInput ? null : <Handle type="target" position={lr ? Position.Left : Position.Top} id="in" isConnectable={!readOnly} aria-label={`Connect into ${node.title}`} className={cn("wf-handle wf-handle-in", lr ? "wf-lr" : "wf-tb")} />}

      <div className="flex items-start gap-2.5">
        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-[10px]", categoryClass(def?.category))}>
          <Icon size={17} className="ico" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <div className="min-w-0 flex-1 text-[14px] leading-[1.25] font-semibold text-ink [overflow-wrap:anywhere]">{node.title}</div>
            {issue ? (
              <span role="img" aria-label={issue.severity === "error" ? `Needs fixing: ${issue.text}` : `Check: ${issue.text}`} title={issue.text} className={cn("mt-px grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full", issue.severity === "error" ? "bg-risk text-white" : "bg-mid-bg text-mid-ink ring-1 ring-mid-edge")}>
                <AlertTriangle size={11} className="ico" aria-hidden="true" />
              </span>
            ) : null}
          </div>
          {node.purpose ? <div className="mt-0.5 line-clamp-2 text-[12px] leading-[1.35] text-muted">{node.purpose}</div> : null}
        </div>
      </div>

      {isFlow && !word ? null : (
        <div className="mt-2.5 flex items-center gap-2">
          {word && RunIcon ? (
            <span className={cn("inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold ring-1 ring-current/15", rs?.tone)}>
              <RunIcon size={12} className={cn("ico", run === "active" && "psy-spin")} aria-hidden="true" />
              {word}
            </span>
          ) : null}
          {isFlow ? null : <span className="rounded-full bg-neutral-bg px-2 py-0.5 text-[11px] font-medium text-neutral-ink">{EXEC_LABEL[node.mode]}</span>}
          {node.approval ? (
            <span role="img" aria-label="A person approves before this step completes" title="A person approves before this step completes" className="text-muted">
              <UserCheck size={14} className="ico" aria-hidden="true" />
            </span>
          ) : null}
          <span className="flex-1" />
          {def && !isFlow ? <SupportDot status={def.support} /> : null}
        </div>
      )}

      {outputs.map((o, i) => {
        const at = `${((i + 1) / (outputs.length + 1)) * 100}%`;
        return (
          <span key={o.handle}>
            <Handle type="source" position={lr ? Position.Right : Position.Bottom} id={o.handle} style={lr ? { top: at } : { left: at }} isConnectable={!readOnly} aria-label={`Exit ${o.label || "next"} of ${node.title}`} title={lone ? "Drag to connect the next step" : `Exit: ${o.label}`} className={cn("wf-handle wf-handle-out", lr ? "wf-lr" : "wf-tb")} />
            {!lone && !connected.includes(o.handle) ? (
              <span style={lr ? { top: at } : { left: at }} className={cn("pointer-events-none absolute whitespace-nowrap rounded-full bg-neutral-bg px-2 py-px text-[11px] font-medium text-neutral-ink", lr ? "left-full ml-2.5 -translate-y-1/2" : cn("top-full -translate-x-1/2", outputs.length > 2 && i % 2 ? "mt-[30px]" : "mt-2.5"))}>
                {o.label}
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

export const WfNodeView = memo(WfNodeViewBase);
