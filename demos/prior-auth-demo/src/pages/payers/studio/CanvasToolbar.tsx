import { ArrowDownUp, ArrowLeftRight, Copy, Grid3x3, Map as MapIcon, Maximize2, Redo2, Trash2, Undo2, Workflow, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/* Icon buttons above the canvas. Each has a name for screen readers and a tooltip; the shortcuts are in the tooltips. */

export interface CanvasToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  canDuplicate: boolean;
  snap: boolean;
  minimap: boolean;
  direction: "TB" | "LR";
  disabled?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onLayout: () => void;
  onDirection: () => void;
  onFit: () => void;
  onSnap: () => void;
  onMinimap: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? "⌘" : "Ctrl+";

function Tool({ icon: Icon, label, onClick, disabled, pressed, danger }: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; danger?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} aria-pressed={pressed} disabled={disabled} onClick={onClick} className={cn("grid h-8 w-8 place-items-center rounded-[10px] text-ink2 hover:bg-tile disabled:opacity-35", pressed && "bg-sage-bg text-forest", danger && "hover:bg-risk-bg hover:text-risk-ink")}>
      <Icon size={16} className="ico" aria-hidden="true" />
    </button>
  );
}
const Sep = () => <span aria-hidden="true" className="mx-1 h-5 w-px bg-edge" />;

export function CanvasToolbar(p: CanvasToolbarProps) {
  return (
    <div role="toolbar" aria-label="Canvas tools" className="flex flex-nowrap items-center gap-0.5 rounded-[14px] border border-edge bg-white px-1.5 py-1">
      <Tool icon={Undo2} label={`Undo (${MOD}Z)`} onClick={p.onUndo} disabled={p.disabled || !p.canUndo} />
      <Tool icon={Redo2} label={`Redo (${MOD}Shift+Z)`} onClick={p.onRedo} disabled={p.disabled || !p.canRedo} />
      <Sep />
      <Tool icon={Workflow} label="Tidy up: arrange the steps automatically" onClick={p.onLayout} disabled={p.disabled} />
      <Tool icon={p.direction === "TB" ? ArrowDownUp : ArrowLeftRight} label={p.direction === "TB" ? "Steps run down the page. Switch to across" : "Steps run across the page. Switch to down"} onClick={p.onDirection} disabled={p.disabled} />
      <Tool icon={Maximize2} label="Fit the workflow to the screen" onClick={p.onFit} />
      <Tool icon={Grid3x3} label={p.snap ? "Snap to grid is on" : "Snap to grid is off"} onClick={p.onSnap} pressed={p.snap} disabled={p.disabled} />
      <Tool icon={MapIcon} label={p.minimap ? "Hide the overview map" : "Show the overview map"} onClick={p.onMinimap} pressed={p.minimap} />
      <Sep />
      <Tool icon={Copy} label="Duplicate the selected steps" onClick={p.onDuplicate} disabled={p.disabled || !p.canDuplicate} />
      <Tool icon={Trash2} label="Delete the selected steps (Delete)" onClick={p.onDelete} disabled={p.disabled || !p.hasSelection} danger />
    </div>
  );
}
