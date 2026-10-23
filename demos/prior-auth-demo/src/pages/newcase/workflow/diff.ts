/* What changed between two versions of one payer workflow, in a few plain lines, for "Review newer version". Pure. */
import { REQUEST_TYPE_LABEL, STAGE_LABEL, type WfNode, type Workflow } from "@/data/workflow/types";

const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const where = (n: WfNode): string => `${n.title} (${STAGE_LABEL[n.stage]})`;
const edgeKey = (e: Workflow["edges"][number]): string => `${e.from}>${e.handle}>${e.to}`;

/** The node content that matters to a case. Where a node sits on the canvas does not. */
const contentOf = (n: WfNode) => ({ kind: n.kind, title: n.title, stage: n.stage, mode: n.mode, config: n.config, ruleRefs: n.ruleRefs, approval: n.approval, onError: n.onError, instructions: n.instructions });

export interface WorkflowDiff {
  added: string[];
  removed: string[];
  changed: string[];
  /** Name, request type, services, dates: what decides which cases the workflow applies to. */
  scope: string[];
  /** True when the connections between steps differ. */
  routes: boolean;
  /** No visible difference: a save with no change to the steps. */
  empty: boolean;
}

export function diffWorkflows(before: Workflow, after: Workflow): WorkflowDiff {
  const was = new Map(before.nodes.map((n) => [n.id, n]));
  const now = new Map(after.nodes.map((n) => [n.id, n]));
  const added = after.nodes.filter((n) => !was.has(n.id)).map(where);
  const removed = before.nodes.filter((n) => !now.has(n.id)).map(where);
  const changed = after.nodes.filter((n) => was.has(n.id) && !sameJson(contentOf(n), contentOf(was.get(n.id) as WfNode))).map(where);
  const scope: string[] = [];
  if (before.name !== after.name) scope.push(`Renamed from ${before.name}`);
  if (before.requestType !== after.requestType) scope.push(`Request type is now ${after.requestType === "any" ? "any" : REQUEST_TYPE_LABEL[after.requestType]}`);
  if (!sameJson([...before.services].sort(), [...after.services].sort())) scope.push("The services it covers changed");
  if (before.effectiveFrom !== after.effectiveFrom || before.effectiveTo !== after.effectiveTo) scope.push("The effective dates changed");
  const routes = !sameJson(before.edges.map(edgeKey).sort(), after.edges.map(edgeKey).sort());
  return { added, removed, changed, scope, routes, empty: !added.length && !removed.length && !changed.length && !scope.length && !routes };
}
