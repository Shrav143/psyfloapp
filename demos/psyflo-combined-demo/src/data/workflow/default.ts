import { createNode, outputsOf } from "./catalog";
import { autoLayout } from "./layout";
import type { ConfigValue, Handle, NodeKind, RequestType, WfEdge, WfNode, Workflow } from "./types";

/* The labelled default: what runs when no published workflow matches. It follows the usual order of work, is the same for every payer, and uses no payer rules, so it never
   claims to know a payer's policy. It stops at a person's approval and does not choose how a request is sent. A retroactive request goes to manual review, because a backdating
   rule is something only the payer's own rule can answer. */

export const DEFAULT_ID_PREFIX = "default-";
export const isDefaultWorkflowId = (id: string): boolean => id.startsWith(DEFAULT_ID_PREFIX);

const NOUN: Record<RequestType, string> = { initial: "an initial authorization", concurrent: "a concurrent review", reauth: "a reauthorization", modify: "a modification", retro: "a retroactive authorization" };
export const DEFAULT_NOTE = "No payer workflow matches. Illustrative, not payer policy.";

const cache = new Map<RequestType, Workflow>();

/** The default workflow for a request type. The same object every time, so it is safe to use as a selector result. */
export function DEFAULT_WORKFLOW_FOR(type: RequestType): Workflow {
  const hit = cache.get(type);
  if (hit) return hit;
  const nodes: WfNode[] = [];
  const edges: WfEdge[] = [];
  const add = (id: string, kind: NodeKind, over: { title?: string; purpose?: string; config?: Record<string, ConfigValue>; instructions?: string } = {}) => {
    const { config, ...rest } = over;
    const n = createNode(kind, id, { x: 0, y: 0 }, rest);
    if (config) n.config = { ...n.config, ...config };
    nodes.push(n);
  };
  const link = (from: string, handle: Handle, to: string) => {
    const f = nodes.find((n) => n.id === from);
    const outs = f ? outputsOf(f) : [];
    const label = outs.length > 1 ? outs.find((o) => o.handle === handle)?.label : undefined;
    edges.push({ id: `e${edges.length + 1}`, from, to, handle, ...(label ? { label } : {}) });
  };
  add("start", "start");
  add("eligibility", "ver_eligibility", { title: "Verify eligibility", config: type === "retro" ? { dateBasis: "dates_of_service" } : {} });
  add("authreq", "ver_auth_required", { title: "Is authorization required?" });
  add("collect", "doc_collect", { title: "Collect the documents", instructions: "Ask for every document on the payer's list for this service. If one is missing, the process waits and says which." });
  add("prep", "ag_authorization_prep", { title: "Prepare the request", instructions: "Packet prepares the request for review. Nothing is sent." });
  add("approval", "act_human_approval", { title: "Approval before anything is sent", instructions: "A person reviews the request. Nothing goes to the payer until they approve." });
  add("record", "act_update_case_manager", { title: "Record that it is ready to send", config: { note: "Prepared and approved. A person sends it the way the payer asks.", scheduleNextReview: false } });
  add("end_done", "end", { title: "Ready for a person to send", config: { result: "completed" } });
  add("end_mr", "end", { title: "Manual review", purpose: "A person needs to look at this case.", config: { result: "manual_review" } });
  add("end_noauth", "end", { title: "No authorization needed", config: { result: "no_authorization" } });
  const needsExisting = type === "concurrent" || type === "reauth" || type === "modify";
  if (needsExisting) {
    add("existing", "ver_existing_auth", { title: "Find the current authorization" });
    link("start", "next", "existing");
    link("existing", "found", "eligibility");
    link("existing", "none", "end_mr");
  } else link("start", "next", "eligibility");
  link("eligibility", "ok", "authreq");
  link("eligibility", "issue", "end_mr");
  link("eligibility", "unknown", "end_mr");
  link("authreq", "not_required", "end_noauth");
  link("authreq", "unknown", "end_mr");
  if (type === "retro") {
    add("rule", "end", { title: "Manual review: no payer rule on file", purpose: "A retroactive request needs the payer's backdating rule. This default has none.", config: { result: "manual_review", note: "No backdating rule is on file for this payer, so a person decides." } });
    link("authreq", "required", "rule");
  } else {
    link("authreq", "required", "collect");
    link("collect", "next", "prep");
    link("prep", "next", "approval");
    link("approval", "next", "record");
    link("approval", "rejected", "end_mr");
    link("record", "next", "end_done");
  }
  const used = new Set(edges.flatMap((e) => [e.from, e.to]));
  const kept = nodes.filter((n) => used.has(n.id));
  const wf: Workflow = {
    id: `${DEFAULT_ID_PREFIX}${type}`,
    payerId: "default",
    name: `Default process for ${NOUN[type]}`,
    description: `${DEFAULT_NOTE} It follows the usual order of work and uses no payer rules.`,
    state: "",
    services: [],
    requestType: type,
    effectiveFrom: "2026-01-01",
    owner: "Psyflo (demo)",
    version: 1,
    status: "published",
    nodes: autoLayout(kept, edges),
    edges,
    updatedAt: 0,
    updatedBy: "Psyflo (demo)",
  };
  cache.set(type, wf);
  return wf;
}

/** The same function under the name New Case uses. */
export const defaultWorkflowFor = DEFAULT_WORKFLOW_FOR;
