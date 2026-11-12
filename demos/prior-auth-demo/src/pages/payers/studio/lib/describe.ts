import type { WfEdge, WfNode, Workflow } from "@/data/workflow/types";

/** A plain sentence for what changed between two saved states, used as the reason on a draft save. */
export function describeChange(before: Pick<Workflow, "nodes" | "edges" | "name">, after: Pick<Workflow, "nodes" | "edges" | "name">): string {
  const was = new Map(before.nodes.map((n) => [n.id, n]));
  const is = new Map(after.nodes.map((n) => [n.id, n]));
  const added = after.nodes.filter((n) => !was.has(n.id)).length;
  const removed = before.nodes.filter((n) => !is.has(n.id)).length;
  const edited = after.nodes.filter((n) => was.has(n.id) && contentOf(n) !== contentOf(was.get(n.id) as WfNode)).length;
  const moved = after.nodes.filter((n) => was.has(n.id) && (n.x !== (was.get(n.id) as WfNode).x || n.y !== (was.get(n.id) as WfNode).y)).length;
  const rewired = edgeSig(before.edges) !== edgeSig(after.edges);
  const parts: string[] = [];
  if (added) parts.push(`added ${count(added, "step")}`);
  if (removed) parts.push(`removed ${count(removed, "step")}`);
  if (edited) parts.push(`changed the settings of ${count(edited, "step")}`);
  if (rewired) parts.push("changed the lines between steps");
  if (moved && !parts.length) parts.push(`moved ${count(moved, "step")}`);
  if (before.name !== after.name) parts.push(`renamed it to "${after.name}"`);
  if (!parts.length) return "Saved the draft";
  const s = parts.join(", ");
  return s[0].toUpperCase() + s.slice(1);
}

const count = (n: number, w: string): string => `${n} ${w}${n === 1 ? "" : "s"}`;
const contentOf = (n: WfNode): string => JSON.stringify({ ...n, x: 0, y: 0 });
const edgeSig = (e: WfEdge[]): string => e.map((x) => `${x.from}:${x.handle}>${x.to}`).sort().join("|");

/** Two graphs are the same when nothing a person could see or save differs (the ids of lines do not matter). */
export const sameGraph = (a: { nodes: WfNode[]; edges: WfEdge[] }, b: { nodes: WfNode[]; edges: WfEdge[] }): boolean =>
  a.nodes.length === b.nodes.length && a.nodes.every((n, i) => contentOf(n) === contentOf(b.nodes[i]) && n.x === b.nodes[i].x && n.y === b.nodes[i].y) && edgeSig(a.edges) === edgeSig(b.edges);
