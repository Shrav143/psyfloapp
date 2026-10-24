import type { AppState } from "@/store";
import { viewerById } from "../viewers";
import { siteOf } from "../sites";
import { PAYERS } from "../seed";
import { payerProfileOf } from "../payerProfile";
import { nodeDef } from "./catalog";
import { derivedKeyOf, isDerivedRuleId, payerRulesFrom, RULE_KIND_OF_NODE, ruleServes } from "./rules";
import type { AppliedWorkflow, NodeKind, PayerRule, RuleGroup, WfNode, Workflow } from "./types";

/* What a rule change reaches: the workflows that use the rule, and the open cases that follow one of those workflows. Read only. A change never rewrites a submitted packet or moves a case to a
   new version by itself: a person reviews the list and applies it ("Review & apply changes"). Cases are counted only inside the sites the viewer can see. */

export interface ImpactedWorkflow {
  id: string;
  name: string;
  version: number;
  status: Workflow["status"];
  owner: string;
  /** The steps in it that use the rule. */
  nodeIds: string[];
  /** "reference": a step names the rule. "kind": a rule step or a document step reads the payer's rule of its kind without naming one. */
  via: "reference" | "kind";
  /** This is a draft of a next version that sits beside a published workflow. */
  draftOfNext: boolean;
}
export interface ImpactedCase {
  /** The case id (R-1042) for a request, or the draft's case id or draft id. */
  id: string;
  kind: "draft" | "request";
  patient: string;
  workflowId: string;
  workflowName: string;
  /** The version the case follows. It stays that version until a person reviews and applies a later one. */
  version: number;
}
export interface RuleImpact {
  ruleId: string;
  ruleTitle: string;
  payerId: string;
  workflows: ImpactedWorkflow[];
  cases: ImpactedCase[];
  owners: string[];
  /** One line for a banner or a notification. */
  summary: string;
}

type ImpactState = Pick<AppState, "workflows" | "workflowDrafts" | "payerConfig" | "payerRulesExtra" | "ruleMeta" | "ruleHistory" | "customPayers" | "caseDrafts" | "requests" | "viewerId" | "siteScope">;

/** The sites the current view shows (the same rule as lib/scope.ts, repeated here so this data module never imports the store at run time). */
const sitesInView = (s: { viewerId: Parameters<typeof viewerById>[0]; siteScope: string }): string[] => {
  const sites: string[] = viewerById(s.viewerId).sites;
  return s.siteScope === "both" ? sites : sites.includes(s.siteScope) ? [s.siteScope] : sites;
};

const DOC_NODES: NodeKind[] = ["doc_collect", "doc_validate", "missing_info", "doc_packet", "doc_request_missing"];
const CALL_NODES: NodeKind[] = ["act_call_prep", "ag_call_prep"];
const AGENT_NODES: NodeKind[] = ["ag_document_review", "ag_clinical_summary", "ag_medical_necessity", "ag_authorization_prep", "ag_rule_interpretation", "ag_call_prep", "ag_missing_info", "ag_custom"];

/** Node kinds that read a rule of this group without naming it. */
function kindsReading(rule: PayerRule): NodeKind[] {
  const out = (Object.entries(RULE_KIND_OF_NODE) as [NodeKind, NonNullable<(typeof RULE_KIND_OF_NODE)[NodeKind]>][]).filter(([, k]) => ruleServes(rule, k)).map(([n]) => n);
  if (rule.group === "clinical_documentation" && derivedKeyOf(rule.id).startsWith("docs:")) out.push(...DOC_NODES);
  if (rule.group === "agent_instructions") out.push(...(rule.id.endsWith(":caller") ? CALL_NODES : AGENT_NODES));
  return out;
}

const overlaps = (a: readonly string[], b: readonly string[]): boolean => !a.length || !b.length || a.some((x) => b.includes(x));

/** Find a rule by id in the state: read through from a payer's saved rules, or the library's own. */
export function ruleInState(state: Pick<ImpactState, "payerConfig" | "payerRulesExtra" | "ruleMeta" | "ruleHistory" | "customPayers">, ruleId: string): PayerRule | undefined {
  const payerId = isDerivedRuleId(ruleId) ? ruleId.split(":")[1] : state.payerRulesExtra.find((r) => r.id === ruleId)?.payerId;
  if (!payerId) return undefined;
  const short = PAYERS.find((p) => p.id === payerId)?.shortName ?? state.customPayers.find((p) => p.id === payerId)?.shortName;
  return payerRulesFrom(payerId, state.payerConfig[payerId], state.payerRulesExtra, state.ruleMeta, state.ruleHistory, payerProfileOf(payerId, state.customPayers), short).find((r) => r.id === ruleId);
}

const appliedOf = (x: unknown): AppliedWorkflow | undefined => (x as { appliedWorkflow?: AppliedWorkflow }).appliedWorkflow;

/** The workflows that use a rule, the open cases that follow them, and a sentence that says so. */
export function impactOfRuleChange(state: ImpactState, ruleId: string): RuleImpact {
  const rule = ruleInState(state, ruleId);
  const none: RuleImpact = { ruleId, ruleTitle: rule?.title ?? "A rule", payerId: rule?.payerId ?? "", workflows: [], cases: [], owners: [], summary: "No workflow uses this rule yet." };
  if (!rule) return { ...none, summary: "That rule is not in the library." };
  const reading = new Set(kindsReading(rule));
  const next = new Set(Object.keys(state.workflowDrafts));
  const records: Workflow[] = [...state.workflows.filter((w) => w.status !== "archived"), ...Object.values(state.workflowDrafts)];

  const workflows: ImpactedWorkflow[] = [];
  for (const w of records) {
    if (w.payerId !== rule.payerId) continue;
    const named: string[] = [];
    const implied: string[] = [];
    for (const n of w.nodes) {
      if (n.ruleRefs.includes(rule.id)) named.push(n.id);
      else if (!n.ruleRefs.length && reading.has(n.kind) && overlaps(rule.services, w.services) && (!rule.requestTypes.length || w.requestType === "any" || rule.requestTypes.includes(w.requestType))) implied.push(n.id);
    }
    const ids = named.length ? named : implied;
    if (!ids.length) continue;
    workflows.push({ id: w.id, name: w.name, version: w.version, status: w.status, owner: w.owner, nodeIds: ids, via: named.length ? "reference" : "kind", draftOfNext: w.status === "draft" && next.has(w.id) && state.workflowDrafts[w.id] === w });
  }

  /* Open cases: drafts not yet sent, and requests the payer has not decided, that follow one of these workflows. Only sites in view. */
  const view = sitesInView(state);
  const ids = new Set(workflows.map((w) => w.id));
  const name = new Map(workflows.map((w) => [w.id, w.name]));
  const cases: ImpactedCase[] = [];
  for (const d of state.caseDrafts) {
    const a = appliedOf(d);
    if (!a || !ids.has(a.workflowId) || d.sent) continue;
    const id = d.caseId ?? d.id;
    if (!view.includes(siteOf(id))) continue;
    cases.push({ id, kind: "draft", patient: d.patient.age ? `${d.patient.initials}, ${d.patient.age}` : d.patient.initials, workflowId: a.workflowId, workflowName: name.get(a.workflowId) ?? a.name, version: a.version });
  }
  for (const r of state.requests) {
    const a = appliedOf(r);
    if (!a || !ids.has(a.workflowId) || r.stage === "decided") continue;
    if (!view.includes(siteOf(r.caseId))) continue;
    if (cases.some((c) => c.id === r.caseId)) continue;
    cases.push({ id: r.caseId, kind: "request", patient: `${r.patient.initials}, ${r.patient.age}`, workflowId: a.workflowId, workflowName: name.get(a.workflowId) ?? a.name, version: a.version });
  }

  const owners = [...new Set(workflows.map((w) => w.owner))];
  const published = workflows.filter((w) => w.status === "published").length;
  const wText = workflows.length ? `${workflows.length} ${workflows.length === 1 ? "workflow uses" : "workflows use"} it${published && published !== workflows.length ? ` (${published} published)` : ""}` : "No workflow uses this rule yet";
  const cText = cases.length ? `${cases.length} open ${cases.length === 1 ? "case follows" : "cases follow"} ${cases.length === 1 ? "it" : "them"}` : "";
  return { ruleId: rule.id, ruleTitle: rule.title, payerId: rule.payerId, workflows, cases, owners, summary: `${wText}${cText ? `. ${cText}` : ""}.` };
}

/** The rule group a node of this kind reads, for showing "used by" lists. */
export const groupOfNode = (n: Pick<WfNode, "kind">): RuleGroup | undefined => nodeDef(n.kind).ruleGroup;
