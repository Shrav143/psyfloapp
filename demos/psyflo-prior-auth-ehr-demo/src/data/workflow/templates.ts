import { createNode, nodeDef, outputsOf } from "./catalog";
import { autoLayout } from "./layout";
import { bestRule, RULE_KIND_OF_NODE, SEED_RULES } from "./rules";
import type { ConfigValue, Handle, NodeKind, PayerRule, RequestType, WfEdge, WfNode, Workflow, WorkflowMeta } from "./types";

/* The five starter templates. Each is a graph of the catalog's nodes with conditional branches, document prerequisites, payer rules, an approval gate before anything
   reaches a payer, payer-response handling (approved, partly approved, denied to the denial workflow, more information back to documents) and a no-authorization exit.
   They are illustrative starting points, not any payer's policy. The rules a template uses are chosen when a workflow is made from it, and are always unverified until a person marks them. */

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  requestType: RequestType | "any";
  nodes: WfNode[];
  edges: WfEdge[];
}

const ILLUSTRATIVE = "Illustrative starting point, not any payer's policy: change it to match what the payer asks for, and check its rules before publishing.";

/** What each kind of step tells the person who runs it, unless the template says something more specific. */
export const DEFAULT_INSTRUCTIONS: Partial<Record<NodeKind, string>> = {
  doc_collect: "Ask for every document on the payer's list for this service. If one is missing, the process waits and says which.",
  doc_validate: "Check that each document is present, signed and dated as the payer asks.",
  doc_extract: "Reader pulls diagnoses, scores and dates from the chart and names the document each came from. It adds nothing the chart does not say.",
  doc_medical_necessity: "Criteria matches the chart to the payer's criteria and lists what the chart does not show. It recommends; a person decides.",
  doc_summary: "Scribe drafts the summary from the chart only, with a source for every sentence. Integrity checks it.",
  doc_request_missing: "List what is missing and why the payer asks for it. A person approves before anything is sent.",
  doc_packet: "Packet assembles the forms and attachments. Nothing is sent from this step.",
  act_task: "Create a task for the person named, with a due date.",
  act_notify: "Tell the person what needs them and which case it is.",
  act_document: "Draft the document for a person to review. Nothing is used until a person approves it.",
  act_portal_prep: "Navigator fills the payer's portal form. A person approves, then submits it. Nothing is sent by this step.",
  act_fax_prep: "Packet builds the fax packet with a cover sheet. A person approves, then faxes it. Nothing is sent by this step.",
  act_call_prep: "Caller prepares what to ask and which details to have ready. A person approves before the call, and Caller agrees to no change.",
  act_human_approval: "A person reviews the request. Nothing goes to the payer until they approve.",
  act_update_status: "Set the status the request shows.",
  act_followup: "Book a check-in so the request is not forgotten.",
  act_escalate: "Hand the case to someone senior and say why.",
  act_appeal: "Advocate drafts the appeal. A person reviews and signs before it goes anywhere.",
  act_update_case_manager: "Write a line to the case's history so Case Manager shows what happened.",
  ag_document_review: "Reader reviews the documents in the case. It adds nothing the documents do not say.",
  ag_clinical_summary: "Scribe writes the summary from the chart, with sources.",
  ag_medical_necessity: "Placement compares the chart with the payer's criteria. It never invents clinical evidence.",
  ag_authorization_prep: "Packet prepares the request for review. Nothing is sent.",
  ag_rule_interpretation: "Criteria explains what the payer's rules mean for this case and names any rule that is unverified.",
  ag_call_prep: "Caller prepares the call and the details to have ready.",
  ag_missing_info: "Scrubber lists what the payer will ask for that the case lacks.",
  ag_custom: "Describe what this agent should do. A person reviews its answer.",
  int_emr_sync: "Pull documents from the connected record system. Read only.",
  int_payer_portal: "Work the payer's portal. A person approves first.",
};

class Builder {
  nodes: WfNode[] = [];
  edges: WfEdge[] = [];
  private n = 0;
  add(id: string, kind: NodeKind, over: { title?: string; purpose?: string; config?: Record<string, ConfigValue>; instructions?: string; mode?: WfNode["mode"]; approval?: boolean } = {}): string {
    const { config, instructions, ...rest } = over;
    const node = createNode(kind, id, { x: 0, y: 0 }, { ...rest, instructions: instructions ?? DEFAULT_INSTRUCTIONS[kind] });
    if (config) node.config = { ...node.config, ...JSON.parse(JSON.stringify(config)) };
    this.nodes.push(node);
    return id;
  }
  link(from: string, handle: Handle, to: string): void {
    const node = this.nodes.find((x) => x.id === from);
    const outs = node ? outputsOf(node) : [];
    const label = outs.length > 1 ? outs.find((o) => o.handle === handle)?.label : undefined;
    this.edges.push({ id: `e${++this.n}`, from, to, handle, ...(label ? { label } : {}) });
  }
  next(from: string, to: string): void {
    this.link(from, "next", to);
  }
}

/** The shared ending: approval, the way the request is sent, the status, and what the payer answers. `entry` is the node the approval gate follows; the more-information loop goes back to `collect`. */
function tail(b: Builder, entry: string, collect: string, o: { approvalTitle?: string; approvalWhat?: string; approver?: "clinician" | "manager" } = {}): void {
  b.add("approval", "act_human_approval", { title: o.approvalTitle ?? "Clinician approval", config: { approver: o.approver ?? "clinician", what: o.approvalWhat ?? "Review the request and the packet before anything goes to the payer" }, instructions: "Nothing goes to the payer until a person approves. If the request is declined, it goes back to the person preparing it." });
  b.add("method", "rule_submission_method", { title: "Choose how to send it", purpose: "Portal, fax or phone, and the fallback when the portal is down." });
  b.add("portal", "act_portal_prep", { title: "Prepare portal submission" });
  b.add("fax", "act_fax_prep", { title: "Prepare fax packet" });
  b.add("call", "act_call_prep", { title: "Prepare phone request", config: { script: "Ask for the provider line. Give the member ID and the dates of service. Ask whether the request was received, what its status is, and who you are speaking with. Do not agree to any change. Log the call.", transmit: false } });
  b.add("submitted", "act_update_status", { title: "Mark as submitted", config: { status: "submitted" }, instructions: "Set the status once a person has sent the request." });
  b.add("response", "payer_response", { title: "What did the payer answer?", purpose: "Approved, approved in part, denied, or asking for more information." });
  b.add("record", "act_update_case_manager", { title: "Record the approval", config: { note: "Approved. The next review is booked.", scheduleNextReview: true } });
  b.add("ask", "doc_request_missing", { title: "Answer the payer's question", config: { message: "Send what the payer asked for." }, instructions: "Packet drafts the answer from the chart. A person approves before it is sent. Then the documents are checked again." });
  b.add("end_done", "end", { title: "Completed", config: { result: "completed" } });
  b.add("end_denial", "end", { title: "Denial workflow", purpose: "A partial approval or a denial goes to Denial Intelligence.", config: { result: "denial" } });
  b.next(entry, "approval");
  b.next("approval", "method");
  b.link("approval", "rejected", "end_mr");
  b.link("method", "portal", "portal");
  b.link("method", "fax", "fax");
  b.link("method", "phone", "call");
  for (const s of ["portal", "fax", "call"]) b.next(s, "submitted");
  b.next("submitted", "response");
  b.link("response", "approved", "record");
  b.link("response", "partial", "end_denial");
  b.link("response", "denied", "end_denial");
  b.link("response", "more_info", "ask");
  b.next("record", "end_done");
  b.next("ask", collect);
}

/** The endings every template shares: manual review, and no authorization needed. */
function ends(b: Builder, noAuth = true): void {
  b.add("end_mr", "end", { title: "Manual review", purpose: "A person needs to look at this case.", config: { result: "manual_review" } });
  if (noAuth) b.add("end_noauth", "end", { title: "No authorization needed", purpose: "Save the determination and stop.", config: { result: "no_authorization" } });
}

function initial(): Builder {
  const b = new Builder();
  b.add("start", "start");
  b.add("trigger", "trg_new_request", { title: "New authorization request" });
  b.add("eligibility", "ver_eligibility", { title: "Verify eligibility" });
  b.add("benefits", "ver_benefits", { title: "Verify benefits for this service" });
  b.add("authreq", "ver_auth_required", { title: "Is authorization required?" });
  b.add("window", "rule_submission_window", { title: "Inside the submission window?" });
  b.add("collect", "doc_collect", { title: "Collect the payer's documents" });
  b.add("criteria", "rule_clinical_criteria", { title: "Does the chart show the criteria?" });
  b.add("missing", "doc_request_missing", { title: "Ask for what is missing", config: { message: "The clinical evidence the payer's criteria ask for." } });
  b.add("necessity", "ag_medical_necessity", { title: "Review medical necessity" });
  b.add("prep", "ag_authorization_prep", { title: "Prepare the request" });
  b.add("packet", "doc_packet", { title: "Build the packet" });
  ends(b);
  b.next("start", "eligibility");
  b.next("trigger", "eligibility");
  b.link("eligibility", "ok", "benefits");
  b.link("eligibility", "issue", "end_mr");
  b.link("eligibility", "unknown", "end_mr");
  b.link("benefits", "ok", "authreq");
  b.link("benefits", "issue", "end_mr");
  b.link("benefits", "unknown", "end_mr");
  b.link("authreq", "required", "window");
  b.link("authreq", "not_required", "end_noauth");
  b.link("authreq", "unknown", "end_mr");
  b.link("window", "ok", "collect");
  b.link("window", "late", "end_mr");
  b.next("collect", "criteria");
  b.link("criteria", "met", "necessity");
  b.link("criteria", "gap", "missing");
  b.next("missing", "necessity");
  b.next("necessity", "prep");
  b.next("prep", "packet");
  tail(b, "packet", "collect");
  return b;
}

function concurrent(): Builder {
  const b = new Builder();
  b.add("start", "start");
  b.add("trigger", "trg_review_due", { title: "Concurrent review due" });
  b.add("existing", "ver_existing_auth", { title: "Find the current authorization" });
  b.add("eligibility", "ver_eligibility", { title: "Recheck coverage" });
  b.add("units", "ver_remaining_units", { title: "How many units or days are left?" });
  b.add("low", "act_notify", { title: "Tell the case manager units are low", config: { to: "case_manager", message: "Units or days are running low on this authorization." } });
  b.add("cadence", "rule_continued_stay", { title: "Is the review on schedule?" });
  b.add("collect", "doc_collect", { title: "Collect progress notes and updates", purpose: "The documents the payer asks for at a continued-stay review." });
  b.add("criteria", "rule_clinical_criteria", { title: "Do the notes meet continued-stay criteria?" });
  b.add("missing", "doc_request_missing", { title: "Ask for what is missing", config: { message: "The progress evidence the payer's continued-stay criteria ask for." } });
  b.add("summary", "ag_clinical_summary", { title: "Summarize progress since the last review" });
  b.add("prep", "ag_authorization_prep", { title: "Prepare the continued-stay request" });
  ends(b, false);
  b.next("start", "existing");
  b.next("trigger", "existing");
  b.link("existing", "found", "eligibility");
  b.link("existing", "none", "end_mr");
  b.link("eligibility", "ok", "units");
  b.link("eligibility", "issue", "end_mr");
  b.link("eligibility", "unknown", "end_mr");
  b.link("units", "ok", "cadence");
  b.link("units", "issue", "low");
  b.link("units", "unknown", "end_mr");
  b.next("low", "cadence");
  b.link("cadence", "ok", "collect");
  b.next("collect", "criteria");
  b.link("criteria", "met", "summary");
  b.link("criteria", "gap", "missing");
  b.next("missing", "summary");
  b.next("summary", "prep");
  tail(b, "prep", "collect");
  return b;
}

function reauth(): Builder {
  const b = new Builder();
  b.add("start", "start");
  b.add("trigger", "trg_auth_expiring", { title: "Authorization expiring" });
  b.add("existing", "ver_existing_auth", { title: "Find the current authorization" });
  b.add("coverage", "ver_coverage_change", { title: "Has coverage or the plan changed?" });
  b.add("authstate", "auth_status", { title: "Where does the authorization stand?" });
  b.add("collect", "doc_collect", { title: "Collect updated documentation", purpose: "Current documents for the renewal." });
  b.add("units", "rule_units_duration", { title: "Are the units asked for within the limit?" });
  b.add("summary", "ag_clinical_summary", { title: "Summarize the course of treatment" });
  b.add("packet", "doc_packet", { title: "Build the renewal packet" });
  ends(b, false);
  b.next("start", "existing");
  b.next("trigger", "existing");
  b.link("existing", "found", "coverage");
  b.link("existing", "none", "end_mr");
  b.link("coverage", "ok", "authstate");
  b.link("coverage", "issue", "end_mr");
  b.link("coverage", "unknown", "end_mr");
  b.link("authstate", "active", "collect");
  b.link("authstate", "expiring", "collect");
  b.link("authstate", "exhausted", "collect");
  b.link("authstate", "none", "end_mr");
  b.next("collect", "units");
  b.link("units", "ok", "summary");
  b.link("units", "over", "end_mr");
  b.next("summary", "packet");
  tail(b, "packet", "collect");
  return b;
}

function retro(): Builder {
  const b = new Builder();
  b.add("start", "start");
  b.add("trigger", "trg_new_request", { title: "Retroactive request started" });
  b.add("eligibility", "ver_eligibility", { title: "Verify eligibility for the dates of service", config: { dateBasis: "dates_of_service" } });
  b.add("authreq", "ver_auth_required", { title: "Was authorization required?" });
  b.add("backdating", "rule_backdating", { title: "Does the payer allow this start date?", purpose: "No rule on file, or a rule that needs review, goes to manual review." });
  b.add("collect", "doc_collect", { title: "Collect the historical documents", purpose: "What shows the service was needed and delivered on the dates asked for." });
  b.add("review", "ag_document_review", { title: "Review the historical documents" });
  b.add("packet", "doc_packet", { title: "Build the retroactive packet" });
  ends(b);
  b.next("start", "eligibility");
  b.next("trigger", "eligibility");
  b.link("eligibility", "ok", "authreq");
  b.link("eligibility", "issue", "end_mr");
  b.link("eligibility", "unknown", "end_mr");
  b.link("authreq", "required", "backdating");
  b.link("authreq", "not_required", "end_noauth");
  b.link("authreq", "unknown", "end_mr");
  b.link("backdating", "ok", "collect");
  b.link("backdating", "not_allowed", "end_mr");
  b.next("collect", "review");
  b.next("review", "packet");
  tail(b, "packet", "collect", { approvalTitle: "Manual review of the retroactive request", approvalWhat: "A retroactive request is reviewed by a person before it goes to the payer", approver: "manager" });
  return b;
}

function modification(): Builder {
  const b = new Builder();
  b.add("start", "start");
  b.add("trigger", "trg_new_request", { title: "Modification requested" });
  b.add("existing", "ver_existing_auth", { title: "Find the authorization to change" });
  b.add("eligibility", "ver_eligibility", { title: "Recheck coverage" });
  b.add("authreq", "ver_auth_required", { title: "Does the change alter the requirement?" });
  b.add("units", "rule_units_duration", { title: "Is the change within the payer's limits?", purpose: "The rule check on the units or days asked for." });
  b.add("collect", "doc_collect", { title: "Collect supporting documents" });
  b.add("prep", "ag_authorization_prep", { title: "Prepare the modification request" });
  b.add("packet", "doc_packet", { title: "Build the packet" });
  ends(b);
  b.next("start", "existing");
  b.next("trigger", "existing");
  b.link("existing", "found", "eligibility");
  b.link("existing", "none", "end_mr");
  b.link("eligibility", "ok", "authreq");
  b.link("eligibility", "issue", "end_mr");
  b.link("eligibility", "unknown", "end_mr");
  b.link("authreq", "required", "units");
  b.link("authreq", "not_required", "end_noauth");
  b.link("authreq", "unknown", "end_mr");
  b.link("units", "ok", "collect");
  b.link("units", "over", "end_mr");
  b.next("collect", "prep");
  b.next("prep", "packet");
  tail(b, "packet", "collect", { approvalTitle: "Clinician review of the change", approvalWhat: "Review the proposed change and the packet before anything goes to the payer" });
  return b;
}

interface Spec { id: string; name: string; requestType: RequestType; what: string; build: () => Builder }
const SPECS: Spec[] = [
  { id: "starter-initial", name: "Initial Authorization", requestType: "initial", what: "Intake, verify coverage and benefits, check whether authorization is required, collect documents, review clinical evidence, prepare, approve, send and track the payer's answer.", build: initial },
  { id: "starter-concurrent", name: "Concurrent Review", requestType: "concurrent", what: "Find the current authorization, recheck coverage, watch units and the review date, collect progress notes, check continued-stay criteria, prepare, approve and send.", build: concurrent },
  { id: "starter-reauth", name: "Reauthorization", requestType: "reauth", what: "Find the current authorization, check for a coverage change and the expiry, collect updated documentation, then prepare, approve and send the renewal.", build: reauth },
  { id: "starter-retro", name: "Retroactive Authorization", requestType: "retro", what: "Verify eligibility for the past dates of service, check the payer's backdating rule, collect historical documents and send everything to a person for manual review before it goes to the payer.", build: retro },
  { id: "starter-modification", name: "Modification", requestType: "modify", what: "Find the authorization to change, recheck coverage, check whether the change alters the requirement and stays within limits, collect supporting documents, then prepare, review and send.", build: modification },
];

export const TEMPLATES: WorkflowTemplate[] = SPECS.map((s) => {
  const b = s.build();
  return { id: s.id, name: s.name, description: `${s.what} ${ILLUSTRATIVE}`, requestType: s.requestType, nodes: autoLayout(b.nodes, b.edges), edges: b.edges };
});

export const templateById = (id: string): WorkflowTemplate | undefined => TEMPLATES.find((t) => t.id === id);

/** The demo date, for choosing which rules are in force when a workflow is made. */
const TODAY = "2026-10-20";

/** Pin the rule a rule step uses when exactly one rule of the payer fits the workflow. A rule that differs by level of care is left to be found when the case runs. */
export function resolveRuleRefs(nodes: WfNode[], meta: Pick<WorkflowMeta, "payerId" | "state" | "product" | "services" | "requestType">, rules: PayerRule[]): WfNode[] {
  const mine = rules.filter((r) => r.payerId === meta.payerId);
  const service = meta.services.length === 1 ? meta.services[0] : undefined;
  const requestType = meta.requestType === "any" ? undefined : meta.requestType;
  return nodes.map((n) => {
    const kind = RULE_KIND_OF_NODE[n.kind];
    if (!kind || n.ruleRefs.length) return n;
    const pool = service ? mine : mine.filter((r) => r.services.length === 0);
    const hit = bestRule(pool, kind, { payerId: meta.payerId, state: meta.state, product: meta.product, service, requestType, today: TODAY });
    return hit ? { ...n, ruleRefs: [hit.id] } : n;
  });
}

/** A new draft workflow from a template. `meta` says whose it is and what it is for; `rules` (the payer's rules from the library) decides which rule each rule step starts with. */
export function workflowFromTemplate(templateId: string, meta: WorkflowMeta, rules: PayerRule[] = SEED_RULES): Workflow {
  const t = templateById(templateId);
  const nodes = (t?.nodes ?? []).map((n) => JSON.parse(JSON.stringify(n)) as WfNode);
  const edges = (t?.edges ?? []).map((e) => ({ ...e }));
  return {
    ...meta,
    description: meta.description ?? t?.description,
    version: 1,
    status: "draft",
    nodes: resolveRuleRefs(nodes, meta, rules),
    edges,
    updatedAt: 0,
    updatedBy: meta.owner,
    startsFrom: templateId,
  };
}

/** A blank workflow: Start and End, not connected, so the validator says what is missing. */
export function blankWorkflow(meta: WorkflowMeta): Workflow {
  const nodes = [createNode("start", "start", { x: 40, y: 40 }), createNode("end", "end", { x: 380, y: 40 }, { title: "Completed" })];
  return { ...meta, version: 1, status: "draft", nodes, edges: [], updatedAt: 0, updatedBy: meta.owner };
}

export const templateNodeKinds = (t: WorkflowTemplate): NodeKind[] => [...new Set(t.nodes.map((n) => n.kind))];
export const templateSupport = (t: WorkflowTemplate) => t.nodes.map((n) => nodeDef(n.kind).support);
