import { conditionText, type Branch, type Condition as LegacyCondition, type PayerConfig, type StepKind, type WorkflowStep } from "../payerConfig";
import { payerProfileOf, type PayerProfile } from "../payerProfile";
import { PAYERS } from "../seed";
import { BASE } from "@/lib/time";
import { createNode, nodeDef } from "./catalog";
import { autoLayout } from "./layout";
import { RULES_OWNER } from "./rules";
import type { BranchDef, Condition, ConditionGroup, ConfigValue, Handle, NodeKind, Stage, WfEdge, WfNode, Workflow } from "./types";

/* Migration: the Process tab's step workflow, as a graph. Nothing is lost: every step becomes a node (title, text, agents and typical time kept), every branch becomes a
   Decision branch with a structured condition and a node holding the branch's text, and the lines run in the old order. The graph is published as
   "<short name> process (migrated)", for any request type and every service, so it matches only when no more specific workflow does. */

/** The demo minute of noon on a "10/12" style date (the year is the demo's). The Process tab only kept the day it was edited. */
export function minutesOfShortDate(md: string): number {
  const m = md.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!m) return 0;
  return Math.round((new Date(BASE.getFullYear(), Number(m[1]) - 1, Number(m[2]), 12, 0).getTime() - BASE.getTime()) / 60_000);
}

export const migratedId = (payerId: string): string => `wf-${payerId}-process`;
export const MIGRATED_FROM = (v: number, on: string): string => `Process tab, version ${v}, edited ${on}`;

const grp = (join: "and" | "or", ...items: ConditionGroup["items"]): ConditionGroup => ({ join, items });
const eq = (fact: Condition["fact"], value: string): Condition => ({ fact, op: "equals", value });
const PROGRAM_VALUE: Record<string, string> = { "Residential 3.5": "RES", IOP: "IOP", PHP: "PHP", Detox: "WM" };
const REQUEST_VALUE: Record<string, string> = { "an initial request": "initial", "a continued-stay request": "concurrent", "a retro-authorization": "retro", "a recertification": "reauth", "an appeal": "appeal" };
const WAIT_MORE_THAN: Record<string, number> = { "24 hours": 0, "2 business days": 1, "3 business days": 2 };

/** A branch's condition as the structured conditions the engine decides with. "Portal is slow" and "asking for a new sign-in" are kept as they were written; the test facts only know the portal as up or down, so those two never fire in a test. */
export function conditionFromLegacy(c: LegacyCondition): ConditionGroup {
  switch (c.kind) {
    case "program": return c.value === "IOP or PHP" ? grp("or", eq("service", "IOP"), eq("service", "PHP")) : grp("and", eq("service", PROGRAM_VALUE[c.value] ?? c.value));
    case "request": return grp("and", eq("request_type", REQUEST_VALUE[c.value] ?? c.value));
    case "portal": return grp("and", eq("portal_status", c.value === "asking for a new sign-in" ? "sign_in" : c.value));
    case "waiting": return grp("and", { fact: "waiting_days", op: "gt", value: WAIT_MORE_THAN[c.value] ?? 1 });
    case "answer": return c.value === "denies or partly approves" ? grp("or", eq("payer_response", "denied"), eq("payer_response", "partial")) : grp("and", eq("payer_response", c.value === "approves" ? "approved" : "more_info"));
  }
}

const sentence = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** The kind of node a step or a branch result becomes. */
function kindOf(kind: StepKind, text: string, title = ""): NodeKind {
  if (/^check coverage/i.test(title)) return "ver_eligibility";
  if (/^gather the documents/i.test(title)) return "doc_collect";
  if (/^follow up/i.test(title)) return "act_followup";
  if (kind === "phone") return "act_call_prep";
  if (kind === "portal") return "act_portal_prep";
  if (kind === "file") return /\b(faxes|faxed|by fax|fax it|fax the)\b/i.test(text) ? "act_fax_prep" : "act_document";
  if (/next review|ledger|write-back/i.test(text)) return "act_update_case_manager";
  if (/denial intelligence|appeal/i.test(text)) return "act_appeal";
  return "act_task";
}

const stageOf = (title: string): Stage => (/coverage/i.test(title) ? "eligibility" : /document/i.test(title) ? "documentation" : /send|notice|follow|decision/i.test(title) ? "review" : "preparation");

/** A step that only waits for the payer's answer: every branch tests it, and none asks for more information. The step itself becomes "Payer response". */
const isAnswerStep = (s: WorkflowStep): boolean => s.branches.length > 0 && s.branches.every((b) => b.cond.kind === "answer" && b.cond.value !== "asks for information");

/** One payer's saved Process tab, as a workflow graph (published, any request type, every service, `migrated: true`). */
export function migratePayerWorkflow(payerId: string, cfg: PayerConfig, profile: PayerProfile = payerProfileOf(payerId)): Workflow {
  const short = PAYERS.find((p) => p.id === payerId)?.shortName ?? payerId;
  const steps = cfg.workflow.steps;
  const nodes: WfNode[] = [];
  const edges: WfEdge[] = [];
  let e = 0;
  const link = (from: string, handle: Handle, to: string) => {
    edges.push({ id: `e${++e}`, from, to, handle });
  };
  const add = (id: string, kind: NodeKind, over: { title: string; purpose: string; instructions?: string; config?: Record<string, ConfigValue>; stage?: Stage }) => {
    const { config, ...rest } = over;
    const n = createNode(kind, id, { x: 0, y: 0 }, rest);
    if (config) n.config = { ...n.config, ...config };
    nodes.push(n);
    return n;
  };

  add("start", "start", { title: "Start", purpose: `Where the ${short} process begins.` });
  add("end", "end", { title: "Completed", purpose: "The process is finished for this request.", config: { result: "completed" } });
  add("end_denial", "end", { title: "Denial workflow", purpose: "A denial or a partial approval goes to Denial Intelligence.", config: { result: "denial" } });

  /* Nothing reaches a payer without a person's approval. The earlier Process tab left that to the sign-off in New Authorization, so the graph says it out loud: one approval step goes in front of the
     first step that sends something (or has a branch that does). */
  const reaches = (kind: NodeKind): boolean => !!nodeDef(kind).payerFacing;
  const firstOut = steps.findIndex((st) => reaches(kindOf(st.kind, st.text, st.title)) || st.branches.some((b) => reaches(kindOf(b.kind, b.text))));
  /** The id of the node the flow should enter for step i (or the end). */
  const entry = (i: number): string => (i >= steps.length ? "end" : i === firstOut ? "gate" : `s${i}`);
  let usedDenialEnd = false;

  if (firstOut >= 0) {
    add("gate", "act_human_approval", { title: "A person signs before anything is sent", purpose: "Nothing goes to the payer until a person approves.", instructions: "A clinician reviews the request and signs. Nothing is sent before this. The earlier Process tab left this to the sign-off in New Authorization; here it is a step.", config: { approver: "clinician", what: "Review the request and sign before it goes to the payer" }, stage: "review" });
    link("gate", "next", `s${firstOut}`);
  }
  steps.forEach((step, i) => {
    const sid = `s${i}`;
    const answer = isAnswerStep(step);
    const kind: NodeKind = answer ? "payer_response" : kindOf(step.kind, step.text, step.title);
    const agents = step.agents.join(", ");
    add(sid, kind, {
      title: step.title,
      purpose: step.text,
      instructions: `${step.text}${step.typical ? ` Usually takes ${step.typical}.` : ""}${agents ? ` Agents: ${agents}.` : ""}`,
      stage: stageOf(step.title),
      config: { migratedFrom: `${step.id} (${step.kind})`, agents: step.agents, typical: step.typical, ...(kind === "act_followup" ? { how: step.kind === "phone" ? "phone" : "portal", afterDays: 0 } : {}) },
    });
    const node = nodes.find((n) => n.id === sid)!;
    node.mode = step.agents.length ? "agent" : "automatic";
    const next = entry(i + 1);

    if (!step.branches.length) {
      link(sid, kind === "ver_eligibility" ? "ok" : "next", next);
      return;
    }
    const result = (b: Branch, j: number): string => {
      const id = `s${i}b${j}`;
      add(id, kindOf(b.kind, b.text), { title: `If ${conditionText(b.cond)}`, purpose: b.text, instructions: b.text, config: { migratedFrom: `${b.id} (${b.kind})` } });
      nodes.find((n) => n.id === id)!.stage = stageOf(step.title);
      return id;
    };
    if (answer) {
      /* The payer's answer is the node's own exit: approved, denied and approved in part. */
      step.branches.forEach((b, j) => {
        const id = result(b, j);
        if (b.cond.value === "approves") {
          link(sid, "approved", id);
          link(id, "next", next);
        } else {
          link(sid, "denied", id);
          link(sid, "partial", id);
          link(id, "next", "end_denial");
          usedDenialEnd = true;
        }
      });
      return;
    }
    const did = `d${i}`;
    const branches: BranchDef[] = step.branches.map((b) => ({ id: b.id, label: sentence(conditionText(b.cond)), when: conditionFromLegacy(b.cond) }));
    add(did, "decision", { title: `What applies after "${step.title}"?`, purpose: "Follows the branches this step had on the Process tab, in order.", instructions: "Each branch is a condition from the earlier Process tab. The first one that holds is followed; otherwise the process goes on.", config: { branches } });
    nodes.find((n) => n.id === did)!.stage = stageOf(step.title);
    link(sid, kind === "ver_eligibility" ? "ok" : "next", did);
    step.branches.forEach((b, j) => {
      const id = result(b, j);
      link(did, b.id, id);
      link(id, "next", next);
    });
    link(did, "else", next);
  });

  link("start", "next", entry(0));
  if (!usedDenialEnd) nodes.splice(nodes.findIndex((n) => n.id === "end_denial"), 1);

  return {
    id: migratedId(payerId),
    payerId,
    name: `${short} process (migrated)`,
    description: `Made from ${short}'s earlier Process tab (${MIGRATED_FROM(cfg.workflow.version, cfg.workflow.editedOn)}). Every step and branch is kept, in the same order. It applies to any request type and every service until a more specific workflow is published.`,
    state: profile.state,
    product: profile.product,
    services: [],
    requestType: "any",
    effectiveFrom: "2026-01-01",
    owner: RULES_OWNER,
    version: 1,
    status: "published",
    nodes: autoLayout(nodes, edges),
    edges,
    updatedAt: minutesOfShortDate(cfg.workflow.editedOn),
    updatedBy: "Migrated from the Process tab",
    startsFrom: MIGRATED_FROM(cfg.workflow.version, cfg.workflow.editedOn),
    migrated: true,
  };
}

/** Every old step and branch of a payer, as the lines a person would look for in the graph: used by tests to prove nothing was lost. */
export function legacyItems(cfg: PayerConfig): { steps: string[]; branches: { id: string; text: string; cond: string }[] } {
  return { steps: cfg.workflow.steps.map((s) => s.title), branches: cfg.workflow.steps.flatMap((s) => s.branches.map((b) => ({ id: b.id, text: b.text, cond: conditionText(b.cond) }))) };
}
