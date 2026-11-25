import { branchesOf, nodeDef, outputsOf, promptOf, type IntegrationStatus } from "./catalog";
import { DEMO_TODAY } from "./facts";
import { bestRule, RULE_KIND_OF_NODE } from "./rules";
import { isGroup, type Condition, type ConditionGroup, type NodeKind, type PayerRule, type SupportStatus, type ValidationIssue, type WfNode, type Workflow } from "./types";

/* Validation before a workflow is published. Errors block publishing; warnings are shown and do not.
   Errors: no Start, more than one Start, no End, a step nothing leads to, an exit that needs a line and has none, a line to somewhere that is not there, a rule that was deleted or superseded,
   an integration that is not configured with no way for a person to do it by hand, a loop with nothing in it to wait for or count, a path that never reaches an End, and a step that reaches a
   payer with its approval switched off. Warnings: a rule that is unverified, a step with no instructions, a simulated integration, dates that are past, a published workflow that overlaps another. */

const WAITING_KINDS: NodeKind[] = ["wait_until", "time_condition", "act_human_approval"];
const NEEDS_VALUE = new Set(["equals", "not_equals", "contains", "gt", "lt", "before", "after"]);
const INSTRUCTED = new Set(["action", "agent", "integration", "documents"]);

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

/** Strongly connected components with more than one step (or a step that leads to itself): the loops of a graph. */
function loops(ids: string[], next: Map<string, string[]>): string[][] {
  let index = 0;
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const on = new Set<string>();
  const stack: string[] = [];
  const out: string[][] = [];
  const visit = (v: string) => {
    idx.set(v, index);
    low.set(v, index);
    index++;
    stack.push(v);
    on.add(v);
    for (const w of next.get(v) ?? []) {
      if (!idx.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v) as number, low.get(w) as number));
      } else if (on.has(w)) low.set(v, Math.min(low.get(v) as number, idx.get(w) as number));
    }
    if (low.get(v) === idx.get(v)) {
      const comp: string[] = [];
      let w: string;
      do {
        w = stack.pop() as string;
        on.delete(w);
        comp.push(w);
      } while (w !== v);
      if (comp.length > 1 || (next.get(v) ?? []).includes(v)) out.push(comp);
    }
  };
  for (const id of ids) if (!idx.has(id)) visit(id);
  return out;
}

const leaves = (g: ConditionGroup): Condition[] => g.items.flatMap((x) => (isGroup(x) ? leaves(x) : [x]));

export function validateWorkflow(workflow: Workflow, rules: PayerRule[], integrations?: IntegrationStatus, others: Workflow[] = []): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const error = (text: string, where: { nodeId?: string; edgeId?: string } = {}) => issues.push({ severity: "error", text, ...where });
  const warn = (text: string, where: { nodeId?: string; edgeId?: string } = {}) => issues.push({ severity: "warning", text, ...where });
  const nodes = workflow.nodes;
  const byId = new Map<string, WfNode>();
  for (const n of nodes) {
    if (byId.has(n.id)) error(`Two steps share the id "${n.id}". Remove one of them.`, { nodeId: n.id });
    byId.set(n.id, n);
  }
  const title = (n: WfNode): string => `"${n.title}"`;

  /* Start and End */
  const starts = nodes.filter((n) => n.kind === "start");
  if (!starts.length) error("This workflow has no Start step. Add one so the process knows where to begin.");
  if (starts.length > 1) error("A workflow can have only one Start step.", { nodeId: starts[1].id });
  if (!nodes.some((n) => n.kind === "end")) error("This workflow has no End step. Every path has to finish somewhere.");

  /* Lines */
  const next = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  const outs = new Map<string, Map<string, number>>(nodes.map((n) => [n.id, new Map()]));
  for (const e of workflow.edges) {
    const from = byId.get(e.from);
    const to = byId.get(e.to);
    if (!from || !to) {
      error("A line leads to or from a step that is not on the canvas. Remove it.", { edgeId: e.id });
      continue;
    }
    const exits = outputsOf(from);
    if (!exits.some((o) => o.handle === e.handle)) error(`${title(from)} has a line from an exit that does not exist.`, { nodeId: from.id, edgeId: e.id });
    if (to.kind === "start" || nodeDef(to.kind).noInputs) error(`Nothing can lead into ${to.kind === "start" ? "Start" : "a trigger"}: ${title(to)}.`, { nodeId: to.id, edgeId: e.id });
    next.get(from.id)?.push(to.id);
    const m = outs.get(from.id) as Map<string, number>;
    m.set(e.handle, (m.get(e.handle) ?? 0) + 1);
  }
  for (const [id, m] of outs) for (const [h, c] of m) if (c > 1) warn(`${title(byId.get(id) as WfNode)} has ${c} lines from the same exit. Only the first is followed.`, { nodeId: id });

  /* Exits: every required exit needs a line, and a step with exits needs at least one */
  for (const n of nodes) {
    if (n.kind === "end") continue;
    const exits = outputsOf(n);
    if (n.kind === "decision" && !branchesOf(n).length) error(`${title(n)} has no branches. Add one, or use a plain step.`, { nodeId: n.id });
    const m = outs.get(n.id) as Map<string, number>;
    if (exits.length && ![...m.values()].some((c) => c > 0)) error(`Nothing follows ${title(n)}. Draw a line from it to the next step or to an End.`, { nodeId: n.id });
    for (const o of exits) if (!o.optional && !m.get(o.handle) && [...m.values()].some((c) => c > 0)) error(`${title(n)} has no line for "${o.label}". Draw one, or end that path.`, { nodeId: n.id });
  }

  /* Reachability, from Start and from triggers */
  const roots = nodes.filter((n) => n.kind === "start" || nodeDef(n.kind).category === "trigger").map((n) => n.id);
  const reached = new Set<string>(roots);
  const queue = [...roots];
  while (queue.length) {
    const id = queue.shift() as string;
    for (const to of next.get(id) ?? []) if (!reached.has(to)) { reached.add(to); queue.push(to); }
  }
  for (const n of nodes) if (!reached.has(n.id)) error(`${title(n)} cannot be reached from Start. Connect it or delete it.`, { nodeId: n.id });

  /* Every path ends: a step that leads on but can never reach an End */
  const back = new Map<string, string[]>(nodes.map((n) => [n.id, []]));
  for (const [from, tos] of next) for (const to of tos) back.get(to)?.push(from);
  const toEnd = new Set<string>(nodes.filter((n) => n.kind === "end").map((n) => n.id));
  const rq = [...toEnd];
  while (rq.length) {
    const id = rq.shift() as string;
    for (const from of back.get(id) ?? []) if (!toEnd.has(from)) { toEnd.add(from); rq.push(from); }
  }
  for (const n of nodes) if (reached.has(n.id) && !toEnd.has(n.id) && (next.get(n.id) ?? []).length) error(`The path after ${title(n)} never reaches an End.`, { nodeId: n.id });

  /* Loops need something in them to wait for, approve or count */
  for (const comp of loops(nodes.map((n) => n.id), next)) {
    const members = comp.map((id) => byId.get(id) as WfNode);
    if (!members.some((n) => WAITING_KINDS.includes(n.kind) || typeof n.config.maxVisits === "number")) {
      error(`${members.slice(0, 3).map(title).join(", ")}${members.length > 3 ? " and more" : ""} loop back on each other with nothing in the loop to wait for, approve or count. Add a wait, an approval, or a limit on how often it may repeat.`, { nodeId: members[0].id });
    }
  }

  /* Rules */
  const ruleById = new Map(rules.map((r) => [r.id, r]));
  const flagged = new Set<string>();
  for (const n of nodes) {
    for (const id of n.ruleRefs) {
      const r = ruleById.get(id);
      if (!r) error(`${title(n)} uses a rule that was deleted. Choose another rule.`, { nodeId: n.id });
      else if (r.verification === "superseded") error(`${title(n)} uses "${r.title}", which was superseded. Choose the rule that replaced it.`, { nodeId: n.id });
      else {
        if (r.effectiveTo && r.effectiveTo < DEMO_TODAY) warn(`${title(n)} uses "${r.title}", which ended on ${r.effectiveTo}.`, { nodeId: n.id });
        if (r.verification !== "verified" && !flagged.has(`${n.id}|${r.id}`)) {
          flagged.add(`${n.id}|${r.id}`);
          warn(`${title(n)} uses "${r.title}", which is ${r.verification === "needs_review" ? "marked for review" : "unverified"} (${r.source.label}). Cases go to manual review when a step is set to, otherwise they go on with a warning.`, { nodeId: n.id });
        }
      }
    }
    const kind = RULE_KIND_OF_NODE[n.kind];
    if (kind && !n.ruleRefs.length) {
      const service = workflow.services.length === 1 ? workflow.services[0] : undefined;
      const hit = bestRule(rules.filter((r) => r.payerId === workflow.payerId), kind, { payerId: workflow.payerId, state: workflow.state, product: workflow.product, service, requestType: workflow.requestType === "any" ? undefined : workflow.requestType, today: DEMO_TODAY });
      if (!hit) warn(`${title(n)} names no rule and the payer has none that fits, so cases will go to manual review at this step.`, { nodeId: n.id });
      else if (hit.verification !== "verified") warn(`${title(n)} will use "${hit.title}", which is ${hit.verification === "needs_review" ? "marked for review" : "unverified"} (${hit.source.label}).`, { nodeId: n.id });
    }
  }

  /* Integrations, and approvals before the payer */
  for (const n of nodes) {
    const def = nodeDef(n.kind);
    if (def.category === "integration") {
      const status: SupportStatus = integrations?.[n.kind] ?? def.support;
      if (status === "not_configured") {
        if (n.config.fallback === "manual") warn(`${title(n)} is not configured. A person will do this step by hand.`, { nodeId: n.id });
        else error(`${title(n)} is not configured and has no manual fallback. Set "If it is not connected" to a person doing it by hand, or remove the step.`, { nodeId: n.id });
      } else if (status === "simulated") warn(`${title(n)} is a demo simulation. Nothing leaves this app.`, { nodeId: n.id });
    }
    if (def.payerFacing && n.approval === false) error(`${title(n)} reaches the payer, so it must require a person's approval.`, { nodeId: n.id });
  }
  /* A path that gets to a payer-facing step without passing an approval step is allowed, and every such step still waits for its own approval. Say so. */
  const open = new Set<string>(roots);
  const bq = roots.filter((id) => byId.get(id)?.kind !== "act_human_approval");
  while (bq.length) {
    const id = bq.shift() as string;
    for (const to of next.get(id) ?? []) {
      if (open.has(to)) continue;
      open.add(to);
      if (byId.get(to)?.kind !== "act_human_approval") bq.push(to);
    }
  }
  /* An agent step that asks for a person's review is reviewed at an approval step: one has to follow it. */
  const hasApprovalAfter = (from: string): boolean => {
    const seen = new Set<string>([from]);
    const q = [from];
    while (q.length) {
      const id = q.shift() as string;
      for (const to of next.get(id) ?? []) {
        if (seen.has(to)) continue;
        seen.add(to);
        if (byId.get(to)?.kind === "act_human_approval") return true;
        q.push(to);
      }
    }
    return false;
  };
  for (const n of nodes) if (promptOf(n)?.humanReview && reached.has(n.id) && !hasApprovalAfter(n.id)) warn(`${title(n)} asks for a person to review its answer, but no approval step follows it.`, { nodeId: n.id });
  for (const n of nodes) if (nodeDef(n.kind).payerFacing && open.has(n.id)) warn(`${title(n)} can be reached without an approval step before it. It will still wait for its own approval.`, { nodeId: n.id });

  /* Content */
  for (const n of nodes) {
    const def = nodeDef(n.kind);
    if (!nodeDef(n.kind) || def.title === "Unknown step") error(`${title(n)} is a kind of step this version does not know.`, { nodeId: n.id });
    const p = promptOf(n);
    if (INSTRUCTED.has(def.category) && !(n.instructions ?? "").trim() && !(p && p.prompt.trim())) warn(`${title(n)} has no instructions for the people who run it.`, { nodeId: n.id });
    if (def.category === "agent" && p && !p.prompt.trim()) warn(`${title(n)} has no instructions written for the agent.`, { nodeId: n.id });
    for (const key of ["when", "until"] as const) {
      const g = n.config[key];
      if (def.fields.some((f) => f.key === key)) {
        if (!g || typeof g !== "object" || Array.isArray(g) || !("items" in g) || !(g as ConditionGroup).items.length) warn(`${title(n)} has no condition yet, so it cannot decide anything.`, { nodeId: n.id });
        else if (leaves(g as ConditionGroup).some((c) => NEEDS_VALUE.has(c.op) && (c.value === undefined || c.value === ""))) warn(`${title(n)} has a condition with no value to compare against.`, { nodeId: n.id });
      }
    }
    if (n.kind === "decision") for (const b of branchesOf(n)) if (!b.when.items.length) warn(`The branch "${b.label}" of ${title(n)} has no conditions, so it never applies.`, { nodeId: n.id });
  }

  /* Dates and overlap */
  if (workflow.effectiveTo && workflow.effectiveTo < DEMO_TODAY) warn(`This workflow's end date (${workflow.effectiveTo}) has passed, so it will not match new cases.`);
  if (workflow.effectiveFrom > DEMO_TODAY) warn(`This workflow starts on ${workflow.effectiveFrom}, so it will not match new cases until then.`);
  for (const o of others) {
    if (o.id === workflow.id || o.status !== "published" || o.payerId !== workflow.payerId) continue;
    const dates = (!o.effectiveTo || o.effectiveTo >= workflow.effectiveFrom) && (!workflow.effectiveTo || workflow.effectiveTo >= o.effectiveFrom);
    if (dates && o.requestType === workflow.requestType && sameSet(o.services, workflow.services) && (o.product ?? "") === (workflow.product ?? "") && (o.state ?? "") === (workflow.state ?? "") && (o.providerType ?? "") === (workflow.providerType ?? "")) {
      warn(`"${o.name}" is already published for the same payer, service and request type. Cases that fit both are flagged as a conflict until one is archived or narrowed.`);
    }
  }

  return [...issues.filter((i) => i.severity === "error"), ...issues.filter((i) => i.severity === "warning")];
}

/** The errors only: what blocks publishing. */
export const blockingIssues = (issues: ValidationIssue[]): ValidationIssue[] => issues.filter((i) => i.severity === "error");
export const plainCounts = (issues: ValidationIssue[]): string => {
  const e = issues.filter((i) => i.severity === "error").length;
  const w = issues.length - e;
  return [e ? plural(e, "problem") : "", w ? plural(w, "warning") : ""].filter(Boolean).join(" and ") || "No problems";
};
