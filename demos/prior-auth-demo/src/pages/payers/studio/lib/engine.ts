/* The one place the studio reaches into the workflow engine (src/data/workflow). If the engine's names or shapes move, only this file changes. */
import type { DocItem } from "@/data/payerConfig";
import type { CaseFacts, MatchResult, PayerRule, Program, RequestType, RunResult, ValidationIssue, WfEdge, WfNode, Workflow } from "@/data/workflow/types";
import { integrationStatus, NODE_CATALOG, nodeDef, outputsOf, branchesOf, createNode, supportOf, type SupportState } from "@/data/workflow/catalog";
import { runWorkflow } from "@/data/workflow/engine";
import { defaultFactsFor } from "@/data/workflow/facts";
import { autoLayout, NODE_H, NODE_W } from "@/data/workflow/layout";
import { matchWorkflow } from "@/data/workflow/match";
import { TEMPLATES } from "@/data/workflow/templates";
import { validateWorkflow } from "@/data/workflow/validate";

export { NODE_CATALOG as NODE_DEFS, nodeDef, outputsOf, branchesOf, createNode, supportOf, NODE_H, NODE_W };
export type { SupportState };

export interface TemplateInfo { id: string; name: string; description: string; requestType: RequestType | "any" }
export const TEMPLATE_LIST: TemplateInfo[] = TEMPLATES.map((t) => ({ id: t.id, name: t.name, description: t.description, requestType: t.requestType }));

export const run = (workflow: Workflow, facts: CaseFacts, rules: PayerRule[]): RunResult => runWorkflow(workflow, facts, rules);
export const validate = (workflow: Workflow, rules: PayerRule[], state?: SupportState): ValidationIssue[] => validateWorkflow(workflow, rules, integrationStatus(state));
export const match = (facts: CaseFacts, workflows: Workflow[], rules?: PayerRule[]): MatchResult => matchWorkflow(facts, workflows, rules);
export type Direction = "TB" | "LR";
export const layout = (nodes: WfNode[], edges: WfEdge[], direction: Direction = "TB"): WfNode[] => autoLayout(nodes, edges, { direction, gapX: direction === "TB" ? 56 : 88, gapY: direction === "TB" ? 84 : 48 });
export const baseFacts = (payerId: string, service: Program, requestType: RequestType, docs?: DocItem[]): CaseFacts => defaultFactsFor(payerId, service, requestType, docs);

/** Which way a workflow runs on the canvas: down the page, or across it. Read from where its lines go. */
export function directionOf(nodes: WfNode[], edges: WfEdge[]): Direction {
  const at = new Map(nodes.map((n) => [n.id, n]));
  let dx = 0;
  let dy = 0;
  for (const e of edges) {
    const a = at.get(e.from);
    const b = at.get(e.to);
    if (!a || !b) continue;
    dx += Math.abs(b.x - a.x);
    dy += Math.abs(b.y - a.y);
  }
  return dx > dy * 1.4 ? "LR" : "TB";
}
