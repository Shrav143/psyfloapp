import "@xyflow/react/dist/style.css";
import "./studio.css";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider, applyNodeChanges, useReactFlow, type Connection, type Edge, type EdgeChange, type Node, type NodeChange } from "@xyflow/react";
import type { NodeKind, ValidationIssue, WfEdge, WfNode } from "@/data/workflow/types";
import { cn } from "@/lib/cn";
import { directionOf, nodeDef, type Direction } from "./lib/engine";
import { canConnect, connect, makeNode, NODE_H, NODE_W, outputsOf, removeNodes, takesNoInput, type Graph, type RunState } from "./lib/model";
import { WfEdgeView, toneOfLabel, type RfWfEdge } from "./WfEdgeView";
import { WfNodeView, type RfWfNode } from "./WfNodeView";

/** The drag type the library puts on a dragged item. */
export const DND_KIND = "application/x-psyflo-node-kind";

const NODE_TYPES = { wf: WfNodeView };
const EDGE_TYPES = { wf: WfEdgeView };
const GRID = 20;
const reduced = (): boolean => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export interface WorkflowCanvasProps {
  nodes: WfNode[];
  edges: WfEdge[];
  /** Pan, zoom and select only. Used by the view panel, the simulator and New case. */
  readOnly?: boolean;
  /** Draws a run: done, skipped, failed, waiting and not reached. */
  runState?: RunState;
  selectedId?: string | null;
  issues?: ValidationIssue[];
  snap?: boolean;
  minimap?: boolean;
  /** Which way the flow runs. Left out, it is read from where the steps are. */
  direction?: Direction;
  /** Called with the whole graph after each change, and a short phrase for the screen-reader announcement. */
  onChange?: (next: Graph, note?: string) => void;
  onSelect?: (id: string | null, ids: string[]) => void;
  /** Enter or a double click on a step: open its editor. */
  onOpen?: (id: string) => void;
  onAnnounce?: (text: string) => void;
  className?: string;
  ariaLabel?: string;
}

export interface CanvasHandle {
  /** Add a step of this kind in the middle of what is in view. Returns its id. */
  addNode: (kind: NodeKind) => string | undefined;
  fit: () => void;
  focusNode: (id: string) => void;
}

const firstIssues = (issues: ValidationIssue[] | undefined): Map<string, ValidationIssue> => {
  const m = new Map<string, ValidationIssue>();
  for (const i of issues ?? []) {
    if (!i.nodeId) continue;
    const had = m.get(i.nodeId);
    if (!had || (had.severity === "warning" && i.severity === "error")) m.set(i.nodeId, i);
  }
  return m;
};

/** The steps near the start that fit on one screen at a readable size: what the canvas opens on. */
function firstScreen(nodes: WfNode[], edges: WfEdge[], direction: Direction, box?: DOMRect): string[] {
  if (!nodes.length) return [];
  const start = nodes.find((n) => n.kind === "start") ?? nodes.reduce((a, b) => (b.x + b.y < a.x + a.y ? b : a));
  const room = (direction === "TB" ? (box?.height ?? 560) : (box?.width ?? 520)) / 0.78;
  const along = (n: WfNode) => (direction === "TB" ? n.y : n.x) - (direction === "TB" ? start.y : start.x);
  const extent = (direction === "TB" ? NODE_H : NODE_W);
  const near = nodes.filter((n) => along(n) + extent <= room);
  void edges;
  return near.length ? near.map((n) => n.id) : [start.id];
}

/** Every other exit of a step with three or more exits is drawn a little lower. */
function staggerOf(e: WfEdge, nodes: WfNode[]): boolean {
  const from = nodes.find((n) => n.id === e.from);
  if (!from) return false;
  const outs = outputsOf(from);
  return outs.length > 2 && outs.findIndex((o) => o.handle === e.handle) % 2 === 1;
}

const Inner = forwardRef<CanvasHandle, WorkflowCanvasProps>(function Inner({ nodes, edges, readOnly = false, runState, selectedId, issues, snap = true, minimap = false, direction: given, onChange, onSelect, onOpen, onAnnounce, className, ariaLabel }, ref) {
  const rf = useReactFlow();
  const wrap = useRef<HTMLDivElement>(null);
  const [rfNodes, setRfNodes] = useState<RfWfNode[]>([]);
  const [selNodes, setSelNodes] = useState<string[]>(selectedId ? [selectedId] : []);
  const [selEdge, setSelEdge] = useState<string | null>(null);
  const dragging = useRef(false);
  const graph = useRef<Graph>({ nodes, edges });
  graph.current = { nodes, edges };
  const say = useCallback((t: string) => onAnnounce?.(t), [onAnnounce]);
  const issueBy = useMemo(() => firstIssues(issues), [issues]);
  const [guess] = useState<Direction>(() => directionOf(nodes, edges));
  const direction = given ?? guess;

  /* The graph the parent holds is the truth. The canvas keeps the size the library measured and any step being dragged. */
  useEffect(() => {
    const links = new Set(edges.map((e) => `${e.from}:${e.handle}`));
    setRfNodes((prev) => {
      const old = new Map(prev.map((n) => [n.id, n]));
      return nodes.map((n): RfWfNode => {
        const def = nodeDef(n.kind);
        const outs = outputsOf(n);
        const was = old.get(n.id);
        const issue = issueBy.get(n.id);
        const run = runState?.nodes[n.id];
        return {
          id: n.id,
          type: "wf",
          position: was?.dragging ? was.position : { x: n.x, y: n.y },
          measured: was?.measured,
          selected: selNodes.includes(n.id),
          draggable: !readOnly,
          deletable: !readOnly && n.kind !== "start",
          connectable: !readOnly,
          ariaLabel: `${n.title}. ${n.purpose}${issue ? ` ${issue.severity === "error" ? "Needs fixing" : "Check"}: ${issue.text}.` : ""}${run ? ` ${run}.` : ""}`,
          data: { node: n, def, outputs: outs, connected: outs.filter((o) => links.has(`${n.id}:${o.handle}`)).map((o) => o.handle), noInput: takesNoInput(n), issue: issue ? { severity: issue.severity, text: issue.text } : undefined, run, readOnly, direction, onOpen },
        };
      });
    });
  }, [nodes, edges, selNodes, readOnly, runState, issueBy, onOpen, direction]);

  /* A parent that selects a step (Go to node, Fix in builder) brings it into view. */
  const lastSel = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (selectedId === lastSel.current) return;
    lastSel.current = selectedId;
    if (selectedId && !selNodes.includes(selectedId)) {
      setSelNodes([selectedId]);
      const n = nodes.find((x) => x.id === selectedId);
      if (n) void rf.setCenter(n.x + NODE_W / 2, n.y + NODE_H / 2, { zoom: Math.max(rf.getZoom(), 0.8), duration: reduced() ? 0 : 250 });
    } else if (!selectedId && selNodes.length === 1) setSelNodes([]);
  }, [selectedId, selNodes, nodes, rf]);

  /* A run is followed: the view moves to the step that is running, and when the run is over it fits the steps the run touched. */
  useEffect(() => {
    if (!runState) return;
    const entries = Object.entries(runState.nodes);
    const active = entries.find(([, v]) => v === "active")?.[0];
    const duration = reduced() ? 0 : 280;
    if (active) {
      const n = graph.current.nodes.find((x) => x.id === active);
      if (n) void rf.setCenter(n.x + NODE_W / 2, n.y + NODE_H / 2, { zoom: Math.min(1, Math.max(rf.getZoom(), 0.75)), duration });
      return;
    }
    const touched = entries.filter(([, v]) => v !== "queued" && v !== "notreached").map(([id]) => ({ id }));
    if (touched.length) void rf.fitView({ nodes: touched, padding: 0.18, maxZoom: 1, minZoom: 0.5, duration });
  }, [runState, rf]);

  const rfEdges = useMemo<RfWfEdge[]>(() => {
    const taken = new Set(runState?.taken ?? []);
    return edges.map((e) => ({
      id: e.id,
      type: "wf",
      source: e.from,
      target: e.to,
      sourceHandle: e.handle,
      targetHandle: "in",
      selected: selEdge === e.id,
      deletable: !readOnly,
      focusable: true,
      ariaLabel: `Line from ${nodes.find((n) => n.id === e.from)?.title ?? "step"} to ${nodes.find((n) => n.id === e.to)?.title ?? "step"}${e.label ? `, ${e.label}` : ""}`,
      markerEnd: { type: "arrowclosed" as const, width: 16, height: 16, color: taken.has(e.id) ? "#2f6f5c" : selEdge === e.id ? "#1d4f43" : "#b8ad9d" },
      data: { label: e.label, tone: toneOfLabel(e.label), direction, stagger: staggerOf(e, nodes), run: runState ? (taken.has(e.id) ? "taken" : "dim") : undefined },
    }));
  }, [edges, nodes, selEdge, runState, readOnly, direction]);

  const commit = useCallback((g: Graph, note?: string) => onChange?.(g, note), [onChange]);

  const onNodesChange = useCallback(
    (changes: NodeChange<RfWfNode>[]) => {
      const keep: NodeChange<RfWfNode>[] = [];
      const picks: { id: string; selected: boolean }[] = [];
      const nudged: { id: string; x: number; y: number }[] = [];
      for (const c of changes) {
        if (c.type === "select") picks.push({ id: c.id, selected: c.selected });
        else if (c.type === "position") {
          keep.push(c);
          if (c.dragging === false && c.position && !dragging.current) nudged.push({ id: c.id, x: c.position.x, y: c.position.y });
        } else if (c.type === "dimensions") keep.push(c);
      }
      if (keep.length) setRfNodes((prev) => applyNodeChanges(keep, prev));
      if (picks.length) {
        const next = new Set(selNodes);
        for (const p of picks) (p.selected ? next.add(p.id) : next.delete(p.id));
        const ids = [...next];
        setSelNodes(ids);
        if (ids.length) setSelEdge(null);
        onSelect?.(ids.length === 1 ? ids[0] : null, ids);
      }
      if (nudged.length && !readOnly) {
        const g = graph.current;
        commit({ ...g, nodes: g.nodes.map((n) => { const m = nudged.find((x) => x.id === n.id); return m ? { ...n, x: Math.round(m.x), y: Math.round(m.y) } : n; }) }, `nudge:${nudged.map((n) => n.id).join(",")}`);
      }
    },
    [selNodes, onSelect, readOnly, commit],
  );

  const onEdgesChange = useCallback((changes: EdgeChange<RfWfEdge>[]) => {
    for (const c of changes) if (c.type === "select") setSelEdge((cur) => (c.selected ? c.id : cur === c.id ? null : cur));
  }, []);

  const onConnect = useCallback(
    (c: Connection) => {
      if (readOnly || !c.source || !c.target) return;
      const link = { from: c.source, handle: c.sourceHandle ?? "next", to: c.target };
      const g = graph.current;
      const v = canConnect(g, link);
      if (!v.ok) return say(v.why);
      const from = g.nodes.find((n) => n.id === link.from);
      const to = g.nodes.find((n) => n.id === link.to);
      commit(connect(g, link), `Connected ${from?.title ?? "step"} to ${to?.title ?? "step"}`);
    },
    [readOnly, commit, say],
  );

  const valid = useCallback((c: Connection | Edge) => !!c.source && !!c.target && canConnect(graph.current, { from: c.source, handle: c.sourceHandle ?? "next", to: c.target }).ok, []);

  const addAt = useCallback(
    (kind: NodeKind, at: { x: number; y: number }, avoid = false): string | undefined => {
      if (readOnly) return undefined;
      const g = graph.current;
      let { x, y } = at;
      if (snap) {
        x = Math.round(x / GRID) * GRID;
        y = Math.round(y / GRID) * GRID;
      }
      // A step added by click goes to the free place nearest the middle of the view. A step dropped by hand goes where it was dropped.
      if (avoid) {
        const clash = (px: number, py: number) => g.nodes.some((n) => Math.abs(n.x - px) < NODE_W + 16 && Math.abs(n.y - py) < NODE_H + 16);
        const spots: { x: number; y: number }[] = [];
        for (let row = -4; row <= 8; row++) for (const col of [0, 1, -1, 2, -2]) spots.push({ x: at.x + col * (NODE_W + 40), y: at.y + row * (NODE_H + 24) });
        spots.sort((a, b) => Math.hypot(a.x - at.x, (a.y - at.y) * 1.4) - Math.hypot(b.x - at.x, (b.y - at.y) * 1.4));
        const free = spots.find((p) => !clash(snap ? Math.round(p.x / GRID) * GRID : p.x, snap ? Math.round(p.y / GRID) * GRID : p.y));
        if (free) {
          x = snap ? Math.round(free.x / GRID) * GRID : free.x;
          y = snap ? Math.round(free.y / GRID) * GRID : free.y;
        }
      }
      const node = makeNode(kind, { x, y }, g.nodes.map((n) => n.id));
      setSelNodes([node.id]);
      setSelEdge(null);
      onSelect?.(node.id, [node.id]);
      commit({ ...g, nodes: [...g.nodes, node] }, `Added ${node.title}`);
      return node.id;
    },
    [readOnly, snap, commit, onSelect],
  );

  useImperativeHandle(
    ref,
    () => ({
      addNode: (kind) => {
        const box = wrap.current?.getBoundingClientRect();
        const c = box ? rf.screenToFlowPosition({ x: box.left + box.width / 2, y: box.top + box.height / 2 }) : { x: 120, y: 120 };
        return addAt(kind, { x: c.x - NODE_W / 2, y: c.y - NODE_H / 2 }, true);
      },
      fit: () => void rf.fitView({ padding: 0.16, maxZoom: 1, duration: reduced() ? 0 : 250 }),
      focusNode: (id) => {
        const n = graph.current.nodes.find((x) => x.id === id);
        if (n) void rf.setCenter(n.x + NODE_W / 2, n.y + NODE_H / 2, { zoom: Math.max(rf.getZoom(), 0.8), duration: reduced() ? 0 : 250 });
      },
    }),
    [rf, addAt],
  );

  const onDrop = (e: DragEvent) => {
    const kind = e.dataTransfer.getData(DND_KIND) as NodeKind;
    if (!kind || readOnly) return;
    e.preventDefault();
    const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addAt(kind, { x: p.x - NODE_W / 2, y: p.y - 24 });
  };

  /* Enter on a focused step opens its editor (the library already selects it). */
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Enter" || !onOpen) return;
    const el = (e.target as HTMLElement).closest?.(".react-flow__node") as HTMLElement | null;
    if (el && e.target === el) onOpen(el.dataset.id ?? "");
  };

  return (
    <div
      ref={wrap}
      data-readonly={readOnly}
      onDragOver={(e) => {
        if (readOnly) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={onDrop}
      onKeyDown={onKeyDown}
      role="application"
      aria-label={ariaLabel ?? "Workflow canvas. Tab to a step, press Enter to open it, arrow keys to move it, Delete to remove it."}
      className={cn("wf-canvas relative h-full w-full overflow-hidden rounded-[18px] border border-edge bg-[#FBF8F3]", className)}
    >
      <ReactFlow<RfWfNode, RfWfEdge>
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={(_, st) => {
          if (st.isValid || !st.toNode || !st.fromNode) return;
          const v = canConnect(graph.current, { from: st.fromNode.id, handle: st.fromHandle?.id ?? "next", to: st.toNode.id });
          if (!v.ok) say(v.why);
        }}
        isValidConnection={valid}
        onNodeDragStart={() => {
          dragging.current = true;
        }}
        onNodeDragStop={(_, __, moved) => {
          dragging.current = false;
          const g = graph.current;
          const at = new Map(moved.map((n) => [n.id, n.position]));
          commit({ ...g, nodes: g.nodes.map((n) => { const p = at.get(n.id); return p ? { ...n, x: Math.round(p.x), y: Math.round(p.y) } : n; }) }, "Moved");
        }}
        onDelete={({ nodes: gone, edges: lines }) => {
          if (readOnly) return;
          const g = graph.current;
          const r = removeNodes(g, gone.map((n) => n.id));
          const dead = new Set(lines.map((l) => l.id));
          commit({ nodes: r.graph.nodes, edges: r.graph.edges.filter((e) => !dead.has(e.id)) }, r.removed.length ? "Deleted" : "Deleted the line");
          setSelNodes([]);
          setSelEdge(null);
          onSelect?.(null, []);
        }}
        onPaneClick={() => {
          setSelNodes([]);
          setSelEdge(null);
          onSelect?.(null, []);
        }}
        deleteKeyCode={readOnly ? null : ["Delete", "Backspace"]}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable
        snapToGrid={snap}
        snapGrid={[GRID, GRID]}
        panOnScroll
        zoomOnDoubleClick={false}
        selectionOnDrag={false}
        multiSelectionKeyCode={["Shift", "Meta", "Control"]}
        minZoom={0.25}
        maxZoom={1.6}
        nodeDragThreshold={3}
        onInit={() => {
          // Open on the beginning at a size that can be read. "Fit" in the toolbar still shows the whole workflow.
          const g = graph.current;
          const first = firstScreen(g.nodes, g.edges, direction, wrap.current?.getBoundingClientRect());
          void rf.fitView({ nodes: first.map((id) => ({ id })), padding: 0.1, maxZoom: 1, minZoom: 0.8 });
        }}
        ariaLabelConfig={{
          "node.a11yDescription.default": "Press Enter to select this step and open its editor. Use the arrow keys to move it, Delete to remove it.",
          "node.a11yDescription.keyboardDisabled": "Press Enter to select this step.",
          "edge.a11yDescription.default": "Press Enter to select this line. Press Delete to remove it.",
          "controls.ariaLabel": "Canvas controls",
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={GRID} size={1.4} color="#e3dacd" />
        <Controls showInteractive={false} position="bottom-left" fitViewOptions={{ padding: 0.16, maxZoom: 1 }} />
        {minimap ? <MiniMap pannable zoomable position="top-right" nodeStrokeWidth={2} nodeColor="#cfe3db" maskColor="rgba(250,246,241,0.7)" ariaLabel="Overview of the workflow" /> : null}
      </ReactFlow>
    </div>
  );
});

/** The graph on a canvas: pan, zoom, drag, connect, select. With `readOnly` it only shows (and, with `runState`, shows a run). */
export const WorkflowCanvas = forwardRef<CanvasHandle, WorkflowCanvasProps>(function WorkflowCanvas(props, ref) {
  return (
    <ReactFlowProvider>
      <Inner ref={ref} {...props} />
    </ReactFlowProvider>
  );
});


