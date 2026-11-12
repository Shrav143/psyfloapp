import type { BranchDef, Handle, NodeKind, RunResult, StepOutcome, WfEdge, WfNode } from "@/data/workflow/types";
import { branchesOf, createNode, nodeDef, outputsOf, NODE_H, NODE_W } from "./engine";

/* Pure helpers for the canvas: which exits a node has, which connections are allowed, adding, copying and removing nodes,
   and what a run looks like on the graph. Nothing here touches React or the store. */

export { NODE_H, NODE_W, outputsOf, branchesOf };
export type { BranchDef };
export interface Output { handle: Handle; label: string; optional?: boolean }
export interface Graph { nodes: WfNode[]; edges: WfEdge[] }

/** True when nothing may connect into the node (a trigger or Start). */
export const takesNoInput = (node: WfNode): boolean => node.kind === "start" || !!nodeDef(node.kind).noInputs;

export type Verdict = { ok: true } | { ok: false; why: string };

export function canConnect(g: Graph, c: { from: string; handle: Handle; to: string }): Verdict {
  const from = g.nodes.find((n) => n.id === c.from);
  const to = g.nodes.find((n) => n.id === c.to);
  if (!from || !to) return { ok: false, why: "That step is not on the canvas." };
  if (from.id === to.id) return { ok: false, why: "A step cannot lead back to itself." };
  if (takesNoInput(to)) return { ok: false, why: `Nothing connects into ${to.kind === "start" ? "Start" : "a trigger"}.` };
  if (!outputsOf(from).some((o) => o.handle === c.handle)) return { ok: false, why: "That exit does not exist on this step." };
  if (g.edges.some((e) => e.from === c.from && e.handle === c.handle)) return { ok: false, why: "Each exit leads to one step. Remove its line first." };
  return { ok: true };
}

/** Add a connection. The line is labelled with the exit's name when the step has more than one exit. */
export function connect(g: Graph, c: { from: string; handle: Handle; to: string }): Graph {
  const from = g.nodes.find((n) => n.id === c.from);
  const outs = from ? outputsOf(from) : [];
  const label = outs.length > 1 ? outs.find((o) => o.handle === c.handle)?.label : undefined;
  return { ...g, edges: [...g.edges, { id: newId("e", g.edges.map((e) => e.id)), from: c.from, to: c.to, handle: c.handle, ...(label ? { label } : {}) }] };
}

/** Drop lines whose exit no longer exists (a branch was removed) and keep the labels in step with the exits' names. */
export function reconcileEdges(g: Graph): WfEdge[] {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const out: WfEdge[] = [];
  for (const e of g.edges) {
    const from = byId.get(e.from);
    if (!from || !byId.has(e.to)) continue;
    const outs = outputsOf(from);
    const o = outs.find((x) => x.handle === e.handle);
    if (!o) continue;
    const label = outs.length > 1 ? o.label : undefined;
    out.push(label === e.label ? e : { ...e, label });
  }
  return out;
}

export function newId(prefix: string, taken: string[]): string {
  const set = new Set(taken);
  let n = taken.length + 1;
  let id = `${prefix}${n}`;
  while (set.has(id)) id = `${prefix}${++n}`;
  return id;
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** A node of this kind with the catalog's defaults, a fresh id, and approval on for steps that reach the payer. */
export const makeNode = (kind: NodeKind, at: { x: number; y: number }, taken: string[]): WfNode => createNode(kind, newId("n", taken), at);

/** Copies of the given nodes, shifted a little, with the lines that ran between them. Start is never copied: a workflow has one. */
export function duplicateNodes(g: Graph, ids: string[]): { graph: Graph; added: string[] } {
  const picked = g.nodes.filter((n) => ids.includes(n.id) && n.kind !== "start");
  const taken = g.nodes.map((n) => n.id);
  const map = new Map<string, string>();
  const copies: WfNode[] = picked.map((n) => {
    const id = newId("n", [...taken, ...map.values()]);
    map.set(n.id, id);
    return { ...clone(n), id, x: n.x + 48, y: n.y + 48 };
  });
  const takenE = g.edges.map((e) => e.id);
  const edges: WfEdge[] = g.edges
    .filter((e) => map.has(e.from) && map.has(e.to))
    .map((e) => {
      const id = newId("e", takenE);
      takenE.push(id);
      return { ...e, id, from: map.get(e.from) as string, to: map.get(e.to) as string };
    });
  return { graph: { nodes: [...g.nodes, ...copies], edges: [...g.edges, ...edges] }, added: copies.map((c) => c.id) };
}

/** Remove nodes (never Start) and every line that touched them. */
export function removeNodes(g: Graph, ids: string[]): { graph: Graph; removed: string[] } {
  const gone = new Set(g.nodes.filter((n) => ids.includes(n.id) && n.kind !== "start").map((n) => n.id));
  return { graph: { nodes: g.nodes.filter((n) => !gone.has(n.id)), edges: g.edges.filter((e) => !gone.has(e.from) && !gone.has(e.to)) }, removed: [...gone] };
}

/** Where to put the n-th node added by click: below the lowest node, lined up with the first column. */
export function nextFreeSpot(nodes: WfNode[]): { x: number; y: number } {
  if (!nodes.length) return { x: 120, y: 40 };
  const lowest = nodes.reduce((a, b) => (b.y > a.y ? b : a));
  return { x: lowest.x, y: lowest.y + NODE_H + 72 };
}

/* ------------------------------------------------------------------ what a run looks like on the graph */

/** How a node is drawn during or after a run. "queued" is a step the animation has not reached yet; "notreached" is one the finished run never got to. */
export type NodeRun = "done" | "skipped" | "failed" | "waiting" | "manual_review" | "active" | "queued" | "pending" | "notreached";
export interface RunState {
  nodes: Record<string, NodeRun>;
  /** Ids of lines the run followed. */
  taken: string[];
}

const OUTCOME_RUN: Record<StepOutcome, NodeRun> = { done: "done", skipped: "skipped", failed: "failed", waiting: "waiting", manual_review: "manual_review" };

/** The run as the canvas draws it. `upTo` reveals the first n steps (the animation); left out, the whole run is shown. */
export function runStateOf(g: Graph, result: RunResult, upTo?: number): RunState {
  const total = result.steps.length;
  const shown = upTo === undefined ? total : Math.max(0, Math.min(total, upTo));
  const finished = shown >= total;
  const nodes: Record<string, NodeRun> = {};
  for (const n of g.nodes) nodes[n.id] = finished ? "notreached" : "queued";
  const taken: string[] = [];
  result.steps.slice(0, shown).forEach((s, i) => {
    nodes[s.nodeId] = !finished && i === shown - 1 ? "active" : OUTCOME_RUN[s.outcome];
    const next = result.steps[i + 1];
    if (next && i + 1 < shown) {
      const edge = g.edges.find((e) => e.from === s.nodeId && e.to === next.nodeId && (!s.handle || e.handle === s.handle)) ?? g.edges.find((e) => e.from === s.nodeId && e.to === next.nodeId);
      if (edge) taken.push(edge.id);
    }
  });
  if (finished) {
    for (const id of result.pending ?? []) if (nodes[id] === "notreached") nodes[id] = "pending";
    for (const id of result.skipped) if (nodes[id] === "notreached") nodes[id] = "skipped";
  }
  return { nodes, taken };
}

export const RUN_WORD: Record<NodeRun, string> = { done: "Done", skipped: "Skipped", failed: "Failed", waiting: "Waiting", manual_review: "Manual review", active: "Running", queued: "", pending: "Pending", notreached: "Not reached" };
