import { PROGRAM_LABEL, type Program } from "@/data/types";
import { REQUEST_TYPE_LABEL, RULE_GROUP_LABEL, type PayerRule, type RequestType, type RuleGroup, type WfNode } from "@/data/workflow/types";
import { createNode, layout, nodeDef } from "./engine";
import { connect, outputsOf, type Graph } from "./model";

/* "Generate with FLO". There is no model behind this demo. The draft is built from a small library of sample workflows, chosen by the words in the description,
   and every part of it says so. Anything the person typed as policy is kept as an unverified note on the Start step, never as a rule. */

export interface FloContext {
  payerId: string;
  payerName: string;
  state: string;
  product: string;
  rules: PayerRule[];
  docs: Record<Program, { id: string; title: string }[]> | undefined;
  /** How the payer is reached: "Portal", "Phone and fax" ... */
  reachedBy: string;
  today: string;
  owner: string;
}

export interface FloDraft {
  name: string;
  description: string;
  services: Program[];
  requestType: RequestType;
  graph: Graph;
  /** Sentences for "What FLO proposed". */
  proposed: string[];
  /** For "Rules it needs that are not on file". */
  missingRules: string[];
  /** For "Things to set up". */
  setup: string[];
  /** Policy-like sentences the person typed, kept as unverified notes. */
  notes: string[];
  /** The words in the description that chose the sample. */
  matched: string[];
}

const SERVICE_WORDS: [Program, RegExp, string][] = [
  ["RES", /\b(residential|res\b|3\.5|inpatient rehab)/i, "residential"],
  ["IOP", /\b(iop|intensive outpatient)/i, "IOP"],
  ["PHP", /\b(php|partial hospital)/i, "PHP"],
  ["WM", /\b(detox|withdrawal management|withdrawal)/i, "detox"],
];
const TYPE_WORDS: [RequestType, RegExp, string][] = [
  ["retro", /\b(retro|retroactive|backdat)/i, "retroactive"],
  ["modify", /\b(modif|extension|extend|change of units|add days|more days)/i, "modification or extension"],
  ["reauth", /\b(reauth|re-auth|renewal|renew|recert)/i, "reauthorization or renewal"],
  ["concurrent", /\b(concurrent|continued stay|continued-stay|ongoing review|review of an existing)/i, "concurrent review"],
];
const POLICY_LINE = /(\d+\s*(?:hours?|hrs?|days?|business days?|calendar days?|units?|visits?)|within|no later than|must|required|never|always|only if|not allowed|deadline)/i;
const DOC_WORDS = ["treatment plan", "assessment", "asam", "progress note", "discharge", "physician", "certification", "drug screen", "insurance card", "history and physical", "medication"];

const GROUP_FOR: Partial<Record<string, RuleGroup>> = { rule_submission_window: "submission_windows", rule_backdating: "backdating", rule_continued_stay: "concurrent_reauth", rule_units_duration: "concurrent_reauth", rule_submission_method: "submission_methods", rule_clinical_criteria: "clinical_documentation" };

/** What a node follows when all is well, and where its other exits go. */
const MAIN: Record<string, string> = { ver_eligibility: "ok", ver_benefits: "ok", ver_auth_required: "required", ver_existing_auth: "found", ver_remaining_units: "ok", auth_status: "active", rule_submission_window: "ok", rule_backdating: "ok", rule_continued_stay: "ok", rule_units_duration: "ok", rule_clinical_criteria: "met" };

export function generateDraft(description: string, ctx: FloContext): FloDraft {
  const text = description.trim();
  const matched: string[] = [];
  const type: RequestType = TYPE_WORDS.find(([, re, word]) => re.test(text) && matched.push(word))?.[0] ?? "initial";
  if (type === "initial") matched.push("initial request (the default)");
  const services = SERVICE_WORDS.filter(([, re, word]) => re.test(text) && matched.push(word)).map(([p]) => p);
  const service: Program | undefined = services[0];
  const reach = ctx.reachedBy.toLowerCase();
  const byFax = /\bfax\b/i.test(text) || reach.includes("fax");
  const byPhone = /\b(phone|call)\b/i.test(text) || reach.includes("phone");
  const portalOnly = /\bportal\b/i.test(text) && !byFax && !byPhone;
  const wantsAppeal = /\b(appeal|denial|denied|peer)/i.test(text);

  const g: Graph = { nodes: [], edges: [] };
  const add = (key: string, kind: Parameters<typeof createNode>[0], over: Partial<Omit<WfNode, "id" | "kind">> = {}): string => {
    g.nodes.push(createNode(kind, key, { x: 0, y: 0 }, over));
    return key;
  };
  const link = (from: string, handle: string, to: string) => {
    const n = g.nodes.find((x) => x.id === from);
    if (!n || !outputsOf(n).some((o) => o.handle === handle) || g.edges.some((e) => e.from === from && e.handle === handle)) return;
    g.edges = connect(g, { from, handle, to }).edges;
  };

  const rulesFor = (kind: string): PayerRule[] => {
    const grp = GROUP_FOR[kind];
    return grp ? ctx.rules.filter((r) => r.group === grp && (!r.services.length || !service || r.services.includes(service)) && (!r.requestTypes.length || r.requestTypes.includes(type))).slice(0, 1) : [];
  };
  const missingRules: string[] = [];
  const proposed: string[] = [];
  const ruleNode = (key: string, kind: Parameters<typeof createNode>[0]): string => {
    const found = rulesFor(kind);
    const id = add(key, kind, { ruleRefs: found.map((r) => r.id) });
    const group = GROUP_FOR[kind];
    if (!found.length && group) missingRules.push(`${RULE_GROUP_LABEL[group]}: ${ctx.payerName} has no rule on file for ${service ? PROGRAM_LABEL[service] : "these services"}, so ${nodeDef(kind).title.toLowerCase()} sends the case to manual review until one is added.`);
    return id;
  };

  /* shared ends */
  const endReview = add("end-review", "end", { title: "Manual review", config: { result: "manual_review", note: "A person looks at this case." } });
  const endDone = add("end-done", "end", { title: "Completed", config: { result: "completed" } });
  const startId = add("start", "start");

  /* the way in */
  const trig = type === "concurrent" ? "trg_review_due" : type === "reauth" ? "trg_auth_expiring" : "trg_new_request";
  const spine: string[] = [add("trigger", trig)];
  const push = (id: string) => spine.push(id);
  const needsAuthCheck = type === "initial" || type === "retro";
  const noAuth = needsAuthCheck ? add("end-noauth", "end", { title: "No authorization needed", config: { result: "no_authorization" } }) : "";

  if (type === "concurrent" || type === "reauth" || type === "modify") push(add("existing", "ver_existing_auth"));
  if (type === "reauth") push(add("status", "auth_status"));
  push(add("eligibility", "ver_eligibility", type === "retro" ? { config: { dateBasis: "dates_of_service" } } : {}));
  push(add("benefits", "ver_benefits"));
  if (needsAuthCheck) push(add("authreq", "ver_auth_required"));
  if (type === "concurrent") push(add("units", "ver_remaining_units"));
  if (type === "concurrent") push(ruleNode("cadence", "rule_continued_stay"));
  if (type === "reauth" || type === "modify") push(ruleNode("limit", "rule_units_duration"));
  if (type === "initial") push(ruleNode("window", "rule_submission_window"));
  if (type === "retro") push(ruleNode("backdating", "rule_backdating"));

  const docs = (service ? ctx.docs?.[service] : Object.values(ctx.docs ?? {}).flat()) ?? [];
  const lower = text.toLowerCase();
  const asked = docs.filter((d) => DOC_WORDS.some((w) => lower.includes(w) && d.title.toLowerCase().includes(w)));
  push(add("documents", "doc_collect", asked.length ? { config: { required: asked.map((d) => d.id) } } : {}));
  push(add("review", "ag_medical_necessity"));
  push(ruleNode("criteria", "rule_clinical_criteria"));
  push(add("packet", "doc_packet"));
  push(add("approval", "act_human_approval", { title: "A person approves the packet", approval: true }));
  push(ruleNode("method", "rule_submission_method"));

  /* the lines of the spine: each step goes on through its main exit, and its other exits go to manual review */
  // Start and the trigger both lead into the first real step, as in the templates: nothing may lead into a trigger.
  link(startId, "next", spine[1]);
  spine.forEach((id, i) => {
    const node = g.nodes.find((n) => n.id === id);
    if (!node) return;
    const nextId = spine[i + 1];
    const main = MAIN[node.kind] ?? (node.kind === "rule_submission_method" ? undefined : "next");
    if (main && nextId) link(id, main, nextId);
    if (node.kind === "ver_auth_required") {
      if (noAuth) link(id, "not_required", noAuth);
      link(id, "concurrent", nextId);
    }
    if (node.kind === "ver_existing_auth") link(id, "none", type === "concurrent" ? endReview : nextId);
    if (node.kind === "auth_status") for (const h of ["expiring", "exhausted", "none"]) link(id, h, h === "none" ? endReview : nextId);
    for (const o of outputsOf(node)) if (o.handle !== main && node.kind !== "rule_submission_method" && node.kind !== "act_human_approval") link(id, o.handle, endReview);
    if (node.kind === "act_human_approval") link(id, "rejected", endReview);
  });

  /* submission and the payer's answer */
  const answer = add("answer", "payer_response");
  const method = spine[spine.length - 1];
  const channels: string[] = [];
  const portal = add("portal", "act_portal_prep");
  link(method, "portal", portal);
  channels.push(portal);
  if (byFax && !portalOnly) {
    const fax = add("fax", "act_fax_prep");
    link(method, "fax", fax);
    channels.push(fax);
  }
  if (byPhone && !portalOnly) {
    const call = add("call", "act_call_prep");
    link(method, "phone", call);
    channels.push(call);
  }
  for (const c of channels) link(c, "next", answer);
  const upd = add("update", "act_update_case_manager", { config: { note: "Approved. Next review is booked.", scheduleNextReview: type !== "retro" } });
  link(answer, "approved", upd);
  link(answer, "partial", upd);
  link(upd, "next", endDone);
  if (wantsAppeal) {
    const appeal = add("appeal", "act_appeal");
    link(answer, "denied", appeal);
    link(appeal, "next", endReview);
  } else link(answer, "denied", add("end-denial", "end", { title: "Hand over to the denial workflow", config: { result: "denial" } }));
  const more = add("more", "doc_request_missing");
  link(answer, "more_info", more);
  link(more, "next", endReview);

  /* unverified notes: whatever the person wrote that reads like a payer rule */
  const notes = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12 && POLICY_LINE.test(s));
  const start = g.nodes.find((n) => n.id === startId);
  if (start && notes.length) start.instructions = `Typed in the description. Not payer policy and not verified: ${notes.join(" ")}`;

  g.nodes = layout(g.nodes, g.edges, "TB");

  const typeWord = type === "initial" ? "Initial authorization" : REQUEST_TYPE_LABEL[type];
  const where = services.length ? services.map((p) => PROGRAM_LABEL[p]).join(" and ") : "any service";
  proposed.push(`A ${typeWord.toLowerCase()} workflow for ${where}: ${g.nodes.length} steps, starting from ${nodeDef(trig).title.toLowerCase()}.`);
  proposed.push("Eligibility and benefits are checked first. Anything not confirmed goes to manual review instead of guessing.");
  if (type === "initial" || type === "retro") proposed.push("The authorization requirement is checked next. If none is needed, the workflow ends there and says so.");
  proposed.push(asked.length ? `Documents asked for: ${asked.map((d) => d.title.toLowerCase()).join(", ")} (from your description).` : "Documents come from the payer's own list for the service.");
  proposed.push("A person approves the packet before anything is sent, and the payer's answer decides the next path: approved, approved in part, denied, or more information.");
  proposed.push(`Submission by ${channels.length > 1 ? "portal, " + (byFax ? "fax" : "") + (byFax && byPhone ? " or " : "") + (byPhone ? "phone" : "") : "portal"}, as the rule on file says. Preparing a submission is separate from sending it.`);

  const setup: string[] = ["Look over every step and every line. This is a sample, not a reading of your description's meaning.", "Choose who approves the packet, and who owns the workflow."];
  if (!ctx.docs || !docs.length) setup.push(`Add ${ctx.payerName}'s document list for ${service ? PROGRAM_LABEL[service] : "the service"} in Rules & Instructions.`);
  if (nodeDef("act_portal_prep").support !== "live") setup.push("The portal, fax and phone steps are demo simulations. Nothing reaches a real payer.");
  if (notes.length) setup.push("Check the unverified notes kept on the Start step. They are not rules and nothing enforces them.");
  setup.push("Run it in Test Workflow before publishing.");

  return {
    name: `${typeWord}${services.length ? `, ${where}` : ""} (FLO draft)`,
    description: "Demo draft from a description. Not a live model, not payer policy. A person must review and publish it.",
    services,
    requestType: type,
    graph: g,
    proposed,
    missingRules,
    setup,
    notes,
    matched,
  };
}
