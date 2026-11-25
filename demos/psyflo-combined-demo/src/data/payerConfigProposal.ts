import { conditionText, type Proposal, type StepKind } from "@/data/payerConfig";
import { createNode } from "@/data/workflow/catalog";
import { autoLayout } from "@/data/workflow/layout";
import { conditionFromLegacy } from "@/data/workflow/migrate";
import type { BranchDef, NodeKind, WfEdge, WfNode, Workflow } from "@/data/workflow/types";

/** The kind of step a suggestion's result becomes in the graph: the same mapping the migration used for a branch result. */
const kindOfResult = (kind: StepKind, text: string): NodeKind => {
  if (kind === "phone") return "act_call_prep";
  if (kind === "portal") return "act_portal_prep";
  if (kind === "file") return /fax/i.test(text) ? "act_fax_prep" : "act_document";
  return "act_task";
};

const sentence = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** A suggestion as one more branch in the migrated workflow: under the step of that title, one more condition in its "What applies after ..." decision and one more step it leads to, which goes on
    to where the step's other branches go. Returns the nodes and connections of the workflow with the branch added, or null when the graph has no such branch point (the step has no decision, or the step is gone).
    The workflow itself is not changed: the caller saves the result as a draft of the next version. */
export function proposalToBranch(wf: Workflow, p: Proposal, branchId: string): { nodes: WfNode[]; edges: WfEdge[] } | null {
  const step = wf.nodes.find((n) => n.title === p.stepTitle && /^s\d+$/.test(n.id));
  if (!step) return null;
  const decision = wf.nodes.find((n) => n.id === `d${step.id.slice(1)}` && n.kind === "decision");
  const branches = decision?.config.branches;
  const otherwise = decision ? wf.edges.find((e) => e.from === decision.id && e.handle === "else") : undefined;
  if (!decision || !Array.isArray(branches) || !otherwise) return null;

  let n = branches.length;
  while (wf.nodes.some((x) => x.id === `${step.id}b${n}`)) n += 1;
  const resultId = `${step.id}b${n}`;
  const result = createNode(kindOfResult(p.kind, p.result), resultId, { x: 0, y: 0 }, { title: `If ${conditionText(p.cond)}`, purpose: p.result, instructions: p.result, stage: step.stage });
  result.config = { ...result.config, migratedFrom: `${branchId} (${p.kind})` };
  const added: BranchDef = { id: branchId, label: sentence(conditionText(p.cond)), when: conditionFromLegacy(p.cond) };
  const nodes = wf.nodes.map((x) => (x.id === decision.id ? { ...x, config: { ...x.config, branches: [...(branches as BranchDef[]), added] } } : x));
  const taken = new Set(wf.edges.map((e) => e.id));
  let e = wf.edges.length + 1;
  const edgeId = (): string => {
    while (taken.has(`e${e}`)) e += 1;
    taken.add(`e${e}`);
    return `e${e}`;
  };
  const edges: WfEdge[] = [...wf.edges, { id: edgeId(), from: decision.id, to: resultId, handle: branchId, label: added.label }, { id: edgeId(), from: resultId, to: otherwise.to, handle: "next" }];
  return { nodes: autoLayout([...nodes, result], edges), edges };
}
