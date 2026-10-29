import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type Edge, type EdgeProps } from "@xyflow/react";
import { cn } from "@/lib/cn";

export interface WfEdgeData extends Record<string, unknown> {
  label?: string;
  /** "taken": the run followed this line. "dim": a run is shown and it did not. */
  run?: "taken" | "dim";
  /** Words that read as a good or a stopping answer get a tint; the word is always there too. */
  tone?: "good" | "risk" | "mid" | "neutral";
  direction?: "TB" | "LR";
  /** The exit's place among three or more, so labels alternate between two heights. */
  stagger?: boolean;
}
export type RfWfEdge = Edge<WfEdgeData, "wf">;

const TONE = { good: "bg-good-bg text-good-ink border-good-edge", risk: "bg-risk-bg text-risk-ink border-risk-edge", mid: "bg-mid-bg text-mid-ink border-mid-edge", neutral: "bg-white text-ink2 border-field" } as const;

/** Tint for a label by what it says: Yes and Approved are green, No and Denied are terracotta, More information is ochre. */
export function toneOfLabel(label: string | undefined): WfEdgeData["tone"] {
  const l = (label ?? "").toLowerCase();
  if (/^(yes|approved|met|passed|ok|within|available|complete|found)/.test(l)) return "good";
  if (/^(no\b|denied|not |failed|outside|missing|inactive|down)/.test(l)) return "risk";
  if (/(more info|information|partial|wait|unknown|manual|otherwise|review)/.test(l)) return "mid";
  return "neutral";
}

function WfEdgeViewBase({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected, markerEnd }: EdgeProps<RfWfEdge>) {
  const [path, , , , ] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 14, offset: 22 });
  const run = data?.run;
  const label = data?.label;
  // The label sits a short way below the exit it belongs to, so a Decision's labels line up with its handles.
  const lr = data?.direction === "LR";
  const lx = lr ? sourceX + 8 : sourceX;
  const ly = lr ? sourceY : sourceY + 26 + (data?.stagger ? 22 : 0);
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={22}
        style={{ stroke: selected ? "#217a78" : run === "taken" ? "#2e7d52" : "#b4b2ab", strokeWidth: selected || run === "taken" ? 2.4 : 1.7, opacity: run === "dim" ? 0.4 : 1 }}
      />
      {label ? (
        <EdgeLabelRenderer>
          <span
            style={{ transform: `${lr ? "translate(0, -50%)" : "translate(-50%, -50%)"} translate(${lx}px, ${ly}px)` }}
            className={cn("nodrag nopan pointer-events-none absolute rounded-full border px-2 py-px text-[11px] font-medium whitespace-nowrap", TONE[data?.tone ?? "neutral"], run === "dim" && "opacity-50")}
          >
            {label}
          </span>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const WfEdgeView = memo(WfEdgeViewBase);
