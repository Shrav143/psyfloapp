import { AGENTS } from "../agents";
import { PAYERS } from "../seed";
import { PROGRAM_LABEL, type Program } from "../types";
import { branchesOf, nodeDef, promptOf, supportOf, type IntegrationStatus } from "./catalog";
import { countDays, daysSinceService, daysToExpiry, docTitleOf, factLabel, factValue, isIso, missingDocuments, readFact, resolveDate, serviceStart, titleList } from "./facts";
import { bestRule, ruleScopeScore, type RuleKind } from "./rules";
import {
  isGroup, OPERATOR_LABEL,
  type ApprovalState, type CaseFacts, type Condition, type ConditionGroup, type EndResult, type Handle, type PayerRule, type RunResult, type RunStatus, type StepOutcome, type SupportStatus,
  type TraceStep, type WfEdge, type WfNode, type Workflow,
} from "./types";

export { DEFAULT_WORKFLOW_FOR, defaultWorkflowFor } from "./default";
export { defaultFactsFor } from "./facts";

/* The deterministic engine. One pure function runs a workflow over a fact sheet: Test Workflow and New case call this same code. Branching is decided by structured conditions and by the
   saved rules, never by a model. The engine does not send anything and does not write anything: it returns what ran, what was skipped, what it is waiting for and why.
   - A verification step reads the facts; a rule step reads its rule's values and the facts; a document step waits when a required document is missing and names it.
   - A step that needs a person (an approval step, anything marked "approval", and every step that reaches a payer) waits until facts.approvals says approved.
   - A node is visited at most 3 times and a run at most `maxSteps` steps; going past either fails the run with a clear reason.
   - A rule that is not in the library, superseded, needing review or not in force sends the run to manual review. An unverified demo rule goes on with a warning, unless the step says otherwise. */

export interface RunOptions {
  /** How real each integration is right now (see integrationStatus). Left out, the catalog's own support is used. */
  integrations?: IntegrationStatus;
  /** Titles of documents by id, for messages. Left out, the demo's own lists are used. */
  docTitles?: Record<string, string>;
  /** The most steps one run may take. */
  maxSteps?: number;
}

export const MAX_VISITS = 3;
export const MAX_STEPS = 80;

/* ---------------------------------------------------------------- conditions */
const norm = (v: unknown): string => String(v).trim().toLowerCase();
const numeric = (v: unknown): number => (typeof v === "number" ? v : typeof v === "boolean" ? NaN : v === "" || v === undefined || v === null ? NaN : Number(v));

/** The ways a fact can be written in a condition: a service as RES or Residential 3.5, a request type as retro or Retroactive authorization, a payer as its id or its name. */
function aliases(fact: string, actual: string | number | boolean | undefined): string[] {
  if (actual === undefined) return [];
  const base = [String(actual)];
  if (fact === "service") base.push(PROGRAM_LABEL[actual as Program] ?? "");
  if (fact === "request_type") base.push(readFact("request_type", actual));
  if (fact === "payer") {
    const p = PAYERS.find((x) => x.id === actual);
    if (p) base.push(p.name, p.shortName);
  }
  if (typeof actual === "boolean") base.push(actual ? "yes" : "no");
  return base.filter(Boolean).map(norm);
}

/** Equal as written, as a label, or (for a date) as "today" and "today-2". */
function sameValue(fact: string, actual: string | number | boolean | undefined, want: string | number, today: string): boolean {
  if (typeof actual === "string" && isIso(actual)) {
    const d = resolveDate(want, today);
    if (d) return actual === d;
  }
  return aliases(fact, actual).includes(norm(want));
}

/** One condition over the facts. A condition with no value (and an operator that needs one) is false. */
export function evalCondition(c: Condition, f: CaseFacts): boolean {
  const actual = factValue(c.fact, f);
  const want = c.value;
  const has = (): boolean => actual !== undefined && actual !== null && actual !== "" && actual !== false;
  switch (c.op) {
    case "exists": return has();
    case "not_exists": return !has();
    case "equals": return want !== undefined && sameValue(c.fact, actual, want, f.today);
    case "not_equals": return want === undefined || !sameValue(c.fact, actual, want, f.today);
    case "contains": return want !== undefined && actual !== undefined && norm(actual).includes(norm(want));
    case "gt": { const a = numeric(actual); const b = numeric(want); return !Number.isNaN(a) && !Number.isNaN(b) && a > b; }
    case "lt": { const a = numeric(actual); const b = numeric(want); return !Number.isNaN(a) && !Number.isNaN(b) && a < b; }
    case "before":
    case "after": {
      const a = typeof actual === "string" && isIso(actual) ? actual : null;
      const b = resolveDate(want, f.today);
      if (!a || !b) return false;
      return c.op === "before" ? a < b : a > b;
    }
    default: return false;
  }
}

/** A group of conditions joined by AND or OR, which may nest. An empty AND is true and an empty OR is false. */
export function evalGroup(g: ConditionGroup, f: CaseFacts): boolean {
  const test = (x: Condition | ConditionGroup): boolean => (isGroup(x) ? evalGroup(x, f) : evalCondition(x, f));
  return g.join === "or" ? g.items.some(test) : g.items.every(test);
}

/** One condition as a sentence with what the case holds: "Service is Residential 3.5 (the case: Residential 3.5)". */
export function describeCondition(c: Condition, f: CaseFacts): string {
  const actual = factValue(c.fact, f);
  const val = c.value === undefined ? "" : ` ${readFact(c.fact, c.value)}`;
  return `${factLabel(c.fact)} ${OPERATOR_LABEL[c.op]}${val} (the case: ${readFact(c.fact, actual)})`;
}
export function describeGroup(g: ConditionGroup, f: CaseFacts): string {
  const parts = g.items.map((x) => (isGroup(x) ? `(${describeGroup(x, f)})` : describeCondition(x, f)));
  return parts.join(g.join === "or" ? " or " : " and ") || "no conditions";
}
const isConditionGroup = (v: unknown): v is ConditionGroup => typeof v === "object" && v !== null && !Array.isArray(v) && "join" in v && Array.isArray((v as ConditionGroup).items);

/* ---------------------------------------------------------------- a step's result */
interface Exec {
  outcome: StepOutcome;
  handle?: Handle;
  message: string;
  warnings?: string[];
  rules?: PayerRule[];
  /** The sentence for the person when the run stops here. */
  stop?: string;
  /** The node is an End: how this path ends. */
  end?: EndResult;
  /** An approval was given at this node: later steps that reach a payer are covered. */
  gate?: boolean;
}

/** Where a run goes when an exit has no line: a person looks, it waits, there is nothing to authorize, or it cannot go on. */
const IMPLICIT: Record<string, "manual_review" | "paused" | "no_authorization"> = {
  issue: "manual_review", unknown: "manual_review", late: "manual_review", not_allowed: "manual_review", over: "manual_review", expired: "manual_review", closed: "manual_review", rejected: "manual_review",
  partial: "manual_review", more_info: "manual_review", portal: "manual_review", fax: "manual_review", phone: "manual_review",
  none: "paused", waiting: "paused", missing: "paused", gap: "paused",
  not_required: "no_authorization", exempt: "no_authorization",
};
/** Handles where seeing the same step again means waiting for something new, not going round again, and the kinds of step they belong to. */
const WAITS = new Set(["waiting", "none", "missing", "more_info"]);
const WAIT_KINDS = new Set(["payer_response", "wait_until", "time_condition", "missing_info"]);
/** What a handle that has no line means for one kind of step. "none" is waiting only on the payer's answer; on "no authorization on file" it is a missing line. */
const implicitFor = (kind: string, handle: string): "manual_review" | "paused" | "no_authorization" | undefined => (handle === "none" && kind !== "payer_response" ? undefined : IMPLICIT[handle]);

const SUPPORT_SUFFIX: Record<SupportStatus, string> = { live: "", simulated: " (Demo simulation)", not_configured: " (Not configured)" };
const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
const sentence = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const num = (v: unknown, d: number): number => (typeof v === "number" && Number.isFinite(v) ? v : d);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/* ---------------------------------------------------------------- the run */
export function runWorkflow(workflow: Workflow, facts: CaseFacts, rules: PayerRule[], options: RunOptions = {}): RunResult {
  const maxSteps = options.maxSteps ?? MAX_STEPS;
  const byId = new Map(workflow.nodes.map((n) => [n.id, n]));
  const outEdges = new Map<string, WfEdge[]>();
  for (const e of workflow.edges) {
    if (!byId.has(e.from) || !byId.has(e.to)) continue;
    outEdges.set(e.from, [...(outEdges.get(e.from) ?? []), e]);
  }
  const edgeFor = (id: string, handle: Handle): WfEdge | undefined => (outEdges.get(id) ?? []).find((e) => e.handle === handle);
  const titleOf = (id: string): string => docTitleOf(id, options.docTitles);
  const support = (n: WfNode): SupportStatus => (n.kind === "int_emr_sync" || nodeDef(n.kind).category === "integration" ? options.integrations?.[n.kind] ?? supportOf(n.kind) : nodeDef(n.kind).support);

  const steps: TraceStep[] = [];
  const visited: string[] = [];
  const visits = new Map<string, number>();
  const warnings: string[] = [];
  const used = new Map<string, { id: string; title: string; verification: PayerRule["verification"] }>();
  let gate = false;

  const note = (w: string) => {
    if (!warnings.includes(w)) warnings.push(w);
  };
  const record = (n: WfNode, x: Exec): TraceStep => {
    const step: TraceStep = { nodeId: n.id, kind: n.kind, title: n.title, outcome: x.outcome, ...(x.handle ? { handle: x.handle } : {}), message: x.message, ruleRefs: (x.rules ?? []).map((r) => r.id), warnings: x.warnings ?? [], seq: steps.length, support: support(n) };
    steps.push(step);
    if (!visited.includes(n.id)) visited.push(n.id);
    for (const r of x.rules ?? []) used.set(r.id, { id: r.id, title: r.title, verification: r.verification });
    for (const w of step.warnings) note(`${n.title}: ${w}`);
    return step;
  };

  const finish = (status: RunStatus, text: string, extra: { stoppedAt?: string; reason?: string; end?: EndResult } = {}): RunResult => {
    const unvisited = workflow.nodes.map((n) => n.id).filter((id) => !visited.includes(id));
    const closed = extra.end !== undefined;
    let pending: string[] = [];
    if (!closed && extra.stoppedAt) {
      const reach = new Set<string>();
      const walk = (id: string) => {
        for (const e of outEdges.get(id) ?? []) if (!reach.has(e.to)) { reach.add(e.to); walk(e.to); }
      };
      walk(extra.stoppedAt);
      pending = unvisited.filter((id) => reach.has(id));
    }
    return {
      status,
      steps,
      visited,
      skipped: unvisited.filter((id) => !pending.includes(id)),
      pending,
      ...(extra.stoppedAt ? { stoppedAt: extra.stoppedAt } : {}),
      ...(extra.reason ? { reason: extra.reason } : {}),
      ...(extra.end ? { endResult: extra.end } : {}),
      outcomeText: text,
      warnings,
      rulesUsed: [...used.values()],
    };
  };

  /* ----- rules */
  /** The rule a rule step reads, or why it cannot be used. */
  const ruleFor = (n: WfNode, kind: RuleKind): { rule?: PayerRule; problem?: string; warn?: string } => {
    const scope = { payerId: facts.payerId, state: facts.state, product: facts.product, service: facts.service, requestType: facts.requestType, today: facts.today };
    let rule: PayerRule | undefined;
    let extra: string | undefined;
    if (n.ruleRefs.length) {
      const named = n.ruleRefs.map((id) => rules.find((r) => r.id === id)).filter((r): r is PayerRule => !!r);
      if (!named.length) return { problem: "The rule this step names is not in the library any more, so a person has to decide." };
      const first = named[0];
      if (first.verification === "superseded") return { rule: first, problem: `The rule "${first.title}" was superseded${first.effectiveTo ? ` on ${first.effectiveTo}` : ""}, so a person has to decide.` };
      if (ruleScopeScore(first, scope) >= 0) rule = first;
      else {
        rule = bestRule(rules, kind, scope);
        if (!rule) return { rule: first, problem: `The rule "${first.title}" is not in force for this case${first.effectiveTo && first.effectiveTo < facts.today ? ` (it ended on ${first.effectiveTo})` : ""}, and no other rule on file fits.` };
        extra = `The rule named here does not apply to this case, so "${rule.title}" was used.`;
      }
    } else {
      rule = bestRule(rules, kind, scope);
      if (!rule) return { problem: `No rule on file fits this payer, service and request type, so a person has to decide.` };
    }
    if (rule.verification === "needs_review") return { rule, problem: `The rule "${rule.title}" needs review, so a person has to decide.` };
    if (rule.verification === "unverified") {
      if (n.config.onUnverified === "manual_review") return { rule, problem: `The rule "${rule.title}" is unverified, and this step sends unverified rules to manual review.` };
      return { rule, warn: `Rule is unverified: ${rule.title} (${rule.source.label})${extra ? `. ${extra}` : ""}` };
    }
    return { rule, ...(extra ? { warn: extra } : {}) };
  };
  const review = (message: string, rule?: PayerRule): Exec => ({ outcome: "manual_review", message, stop: `Needs a person: ${message}`, ...(rule ? { rules: [rule] } : {}) });
  const withRule = (x: Exec, rule: PayerRule, warn?: string): Exec => ({ ...x, rules: [rule], warnings: [...(x.warnings ?? []), ...(warn ? [warn] : [])] });

  /* ----- one step */
  /** A step made from the earlier Process tab keeps that tab's own words as its message. */
  const PURPOSE_ONLY = new Set<string>(["act_document", "act_task", "act_followup", "act_update_case_manager", "act_notify", "act_update_status"]);
  const run = (n: WfNode, visit: number): Exec => {
    const x = runStep(n, visit);
    if (typeof n.config.migratedFrom !== "string" || x.outcome === "waiting" || x.end || !n.purpose) return x;
    if (PURPOSE_ONLY.has(n.kind)) return { ...x, message: `${n.purpose}${SUPPORT_SUFFIX[support(n)]}` };
    if (nodeDef(n.kind).payerFacing) return { ...x, message: `${n.purpose} ${x.message}` };
    return x;
  };
  const runStep = (n: WfNode, visit: number): Exec => {
    const def = nodeDef(n.kind);
    const sup = support(n);
    const suffix = SUPPORT_SUFFIX[sup];
    const cfg = n.config;
    const required = strs(cfg.required);
    const docs = (list?: string[]) => missingDocuments(facts, list?.length ? list : undefined);
    const approval = facts.approvals?.[n.id];

    /* A step that needs a person waits for them. Steps that reach a payer always do, unless an approval step earlier on this path has been approved. */
    if (n.kind !== "act_human_approval" && (n.approval || def.payerFacing)) {
      const covered = def.payerFacing && gate;
      if (approval === "denied") return review(`${n.title} was not approved, so a person has to decide.`);
      if (approval !== "approved" && !covered) return { outcome: "waiting", message: `Waiting for a person to approve before ${n.title.toLowerCase()}.`, stop: `Waiting for approval: ${n.title}.` };
    }

    switch (n.kind) {
      case "start": return { outcome: "done", message: "The process starts." };
      case "end": {
        const result = (typeof cfg.result === "string" ? cfg.result : "completed") as EndResult;
        const text = typeof cfg.note === "string" && cfg.note.trim() ? ` ${cfg.note.trim()}` : "";
        return { outcome: "done", end: result, message: `${n.title}.${text}` };
      }

      /* triggers */
      case "trg_new_request":
      case "trg_review_due":
      case "trg_auth_expiring":
      case "trg_payer_response":
      case "trg_eligibility_changed":
      case "trg_manual": return { outcome: "done", message: `${n.title}${suffix}.` };

      /* verification */
      case "ver_eligibility": {
        const basis = cfg.dateBasis === "dates_of_service" ? "for the dates of service" : "for today";
        if (facts.coverage === "active") return { outcome: "done", handle: "ok", message: `Coverage is active ${basis}. The check is simulated, not a payer feed.` };
        if (facts.coverage === "inactive") return { outcome: "done", handle: "issue", message: `Coverage is not active ${basis}.` };
        return { outcome: "done", handle: "unknown", message: `Coverage could not be confirmed ${basis}.` };
      }
      case "ver_benefits": {
        if (facts.benefit === "covered") return { outcome: "done", handle: "ok", message: "The plan covers this service. Active coverage and a covered service are checked separately." };
        if (facts.benefit === "limited") return { outcome: "done", handle: cfg.limitedIs === "issue" ? "issue" : "ok", message: "The benefit for this service is limited.", warnings: ["Limited benefit: check the limit before the request goes out"] };
        if (facts.benefit === "not_covered") return { outcome: "done", handle: "issue", message: "The plan does not cover this service." };
        return { outcome: "done", handle: "unknown", message: "The benefit for this service is not confirmed." };
      }
      case "ver_auth_required": {
        const r = facts.authRequirement;
        const text = { required: "An authorization is required.", concurrent: "A concurrent review is required for the stay.", not_required: "No authorization is required for this service.", unknown: "Whether an authorization is required is not known." }[r];
        return { outcome: "done", handle: r, message: `${text} From the eligibility check.` };
      }
      case "ver_provider_network": {
        if (facts.inNetwork === "yes") return { outcome: "done", handle: "ok", message: "The provider is in network for this plan." };
        if (facts.inNetwork === "no") return { outcome: "done", handle: "issue", message: "The provider is not in network for this plan." };
        return { outcome: "done", handle: "unknown", message: "The provider's network status could not be confirmed." };
      }
      case "ver_existing_auth": {
        const a = facts.existingAuth;
        return a ? { outcome: "done", handle: "found", message: `Authorization ${a.ref} is on file: ${a.unitsRemaining} left, ending ${a.expiresOn}.` } : { outcome: "done", handle: "none", message: "No authorization is on file for this patient and service." };
      }
      case "ver_remaining_units": {
        const a = facts.existingAuth;
        if (!a) return { outcome: "done", handle: "unknown", message: "There is no authorization to count units on." };
        const low = num(cfg.minimumLeft, 2);
        return a.unitsRemaining <= low ? { outcome: "done", handle: "issue", message: a.unitsRemaining <= 0 ? "No units or days are left on the authorization." : `Only ${a.unitsRemaining} left, at or below ${low}.` } : { outcome: "done", handle: "ok", message: `${a.unitsRemaining} left, above ${low}.` };
      }
      case "ver_coverage_change": {
        if (facts.coverage === "active") return { outcome: "done", handle: "ok", message: "Coverage is unchanged and active." };
        if (facts.coverage === "inactive") return { outcome: "done", handle: "issue", message: "Coverage is no longer active, or the plan changed." };
        return { outcome: "done", handle: "unknown", message: "A change in coverage could not be ruled out." };
      }

      /* documents */
      case "doc_collect": {
        const miss = docs(required);
        const total = required.length || Object.keys(facts.documents).length;
        if (miss.length) return { outcome: "waiting", message: `${plural(miss.length, "document")} missing: ${titleList(miss, options.docTitles)}.`, stop: `Paused for documentation: ${titleList(miss, options.docTitles)} ${miss.length === 1 ? "is" : "are"} missing.` };
        return { outcome: "done", message: total ? `All ${plural(total, "required document")} are in the case.` : "The payer's list asks for no documents for this service." };
      }
      case "doc_validate": {
        const miss = docs(required);
        if (!miss.length) return { outcome: "done", handle: "ok", message: `Every required document is in the case and counts as valid${suffix}.` };
        if (edgeFor(n.id, "issue")) return { outcome: "done", handle: "issue", message: `${titleList(miss, options.docTitles)} ${miss.length === 1 ? "is" : "are"} missing, so it cannot be validated.` };
        return { outcome: "waiting", message: `${titleList(miss, options.docTitles)} ${miss.length === 1 ? "is" : "are"} missing, so the documents cannot be validated.`, stop: `Paused for documentation: ${titleList(miss, options.docTitles)} ${miss.length === 1 ? "is" : "are"} missing.` };
      }
      case "doc_extract":
      case "doc_medical_necessity":
      case "doc_summary": {
        const miss = docs();
        const verb = { doc_extract: "Reader would pull the clinical information from the chart", doc_medical_necessity: "Criteria would match the chart to the payer's criteria", doc_summary: "Scribe would draft the summary from the chart, with sources" }[n.kind];
        return { outcome: "done", message: `${verb}${suffix}. It recommends and never decides.`, warnings: miss.length ? [`${titleList(miss, options.docTitles)} ${miss.length === 1 ? "is" : "are"} missing, so the result may be incomplete`] : [] };
      }
      case "doc_request_missing": {
        const miss = docs();
        if (miss.length) return { outcome: "waiting", message: `Request drafted for ${titleList(miss, options.docTitles)}${suffix}. Waiting for ${miss.length === 1 ? "it" : "them"}.`, stop: `Paused for documentation: waiting for ${titleList(miss, options.docTitles)}.` };
        return facts.payerResponse === "more_info"
          ? { outcome: "done", message: `The payer asked for more information. Packet drafts the answer from the chart for a person to approve${suffix}.` }
          : { outcome: "skipped", message: "Nothing is missing, so no request is needed." };
      }
      case "doc_packet": {
        const miss = docs();
        if (miss.length) return { outcome: "waiting", message: `The packet cannot be built: ${titleList(miss, options.docTitles)} ${miss.length === 1 ? "is" : "are"} missing.`, stop: `Paused for documentation: ${titleList(miss, options.docTitles)} ${miss.length === 1 ? "is" : "are"} missing.` };
        return { outcome: "done", message: `Packet assembled ${plural(Object.keys(facts.documents).length, "document")}${suffix}. Nothing was sent.` };
      }

      /* conditions and branching */
      case "if_else":
      case "cond_group": {
        const g = cfg.when;
        if (!isConditionGroup(g)) return review(`${n.title} has no condition set, so a person has to decide.`);
        const yes = evalGroup(g, facts);
        return { outcome: "done", handle: yes ? "yes" : "no", message: `${yes ? "Yes" : "No"}: ${describeGroup(g, facts)}.` };
      }
      case "decision": {
        for (const b of branchesOf(n)) if (evalGroup(b.when, facts)) return { outcome: "done", handle: b.id, message: `Branch "${b.label}" applies: ${describeGroup(b.when, facts)}.` };
        return { outcome: "done", handle: "else", message: "No branch applies, so the process takes the Otherwise path." };
      }
      case "wait_until": {
        const g = cfg.until;
        if (!isConditionGroup(g)) return review(`${n.title} has no condition set, so a person has to decide.`);
        return evalGroup(g, facts) ? { outcome: "done", handle: "ready", message: `Ready: ${describeGroup(g, facts)}.` } : { outcome: "done", handle: "waiting", message: `Still waiting until ${describeGroup(g, facts)}.` };
      }
      case "time_condition": {
        const days = num(cfg.days, 2);
        const since = cfg.since === "service" || cfg.since === "expiry" ? cfg.since : "waiting";
        if (since === "waiting") return facts.waitingDays >= days ? { outcome: "done", handle: "ready", message: `${plural(facts.waitingDays, "business day")} waiting, at least ${days}. Time is up.` } : { outcome: "done", handle: "waiting", message: `${plural(facts.waitingDays, "business day")} waiting, fewer than ${days}.` };
        if (since === "service") {
          const d = daysSinceService(facts);
          return d !== null && d >= days ? { outcome: "done", handle: "ready", message: `${plural(d, "day")} since the service started, at least ${days}.` } : { outcome: "done", handle: "waiting", message: `${d === null ? "No start date" : plural(d, "day")} since the service started, fewer than ${days}.` };
        }
        const e = daysToExpiry(facts);
        return e !== null && e <= days ? { outcome: "done", handle: "ready", message: `The authorization ends in ${plural(e, "day")}, within ${days}.` } : { outcome: "done", handle: "waiting", message: e === null ? "There is no authorization to run out." : `The authorization ends in ${plural(e, "day")}, more than ${days}.` };
      }
      case "auth_status": {
        const a = facts.existingAuth;
        if (!a) return { outcome: "done", handle: "none", message: "No authorization is on file." };
        const e = daysToExpiry(facts) ?? 0;
        if (a.unitsRemaining <= 0) return { outcome: "done", handle: "exhausted", message: "Every unit or day is used." };
        if (e < 0) return { outcome: "done", handle: "exhausted", message: `The authorization ended ${plural(-e, "day")} ago.` };
        const within = num(cfg.expiringWithinDays, 7);
        if (e <= within || a.unitsRemaining <= 2) return { outcome: "done", handle: "expiring", message: `Active, but ${e <= within ? `it ends in ${plural(e, "day")}` : `only ${a.unitsRemaining} left`}.` };
        return { outcome: "done", handle: "active", message: `Active: ${a.unitsRemaining} left, ending ${a.expiresOn}.` };
      }
      case "payer_response": {
        const r = facts.payerResponse;
        if (visit >= 2 && r !== "approved" && r !== "denied" && r !== "partial") return { outcome: "waiting", message: "Still waiting for the payer to answer again.", stop: "Waiting for the payer's answer." };
        const text = { none: "The payer has not answered yet.", approved: "The payer approved the request.", partial: "The payer approved only part of the request.", denied: "The payer denied the request.", more_info: "The payer asked for more information." }[r];
        return { outcome: "done", handle: r, message: `${text} In this demo the answer comes from the simulate-reply controls or the test form.` };
      }
      case "missing_info": {
        const miss = docs(required);
        if (!miss.length) return { outcome: "done", handle: "complete", message: "Nothing is missing." };
        if (edgeFor(n.id, "missing")) return { outcome: "done", handle: "missing", message: `${titleList(miss, options.docTitles)} ${miss.length === 1 ? "is" : "are"} missing.` };
        return { outcome: "waiting", message: `${titleList(miss, options.docTitles)} ${miss.length === 1 ? "is" : "are"} missing.`, stop: `Paused for documentation: ${titleList(miss, options.docTitles)} ${miss.length === 1 ? "is" : "are"} missing.` };
      }

      /* payer rules */
      case "rule_submission_window": {
        const r = ruleFor(n, "submission_window");
        if (!r.rule || r.problem) return review(r.problem ?? "No rule", r.rule);
        const v = r.rule.values;
        if (v.required === false) return withRule({ outcome: "done", handle: "ok", message: "This payer has no submission window." }, r.rule, r.warn);
        const limit = num(v.windowDays, NaN);
        if (Number.isNaN(limit)) return review(`The rule "${r.rule.title}" has no window length, so a person has to decide.`, r.rule);
        const type = v.dayType === "business" ? "business" : "calendar";
        const from = serviceStart(facts);
        const spent = countDays(from, facts.today, type);
        if (spent === null) return review("The start date is missing, so the window cannot be counted.", r.rule);
        const unit = type === "business" ? "business day" : "calendar day";
        const inside = spent <= limit;
        return withRule({ outcome: "done", handle: inside ? "ok" : "late", message: `${plural(Math.max(0, spent), unit)} since ${from}; the window is ${plural(limit, unit)}. ${inside ? "Inside the window." : "The window has passed."}` }, r.rule, r.warn);
      }
      case "rule_backdating": {
        const retro = facts.requestType === "retro";
        const back = daysSinceService(facts);
        if (!retro && (back === null || back <= 0)) return { outcome: "skipped", handle: "ok", message: "The start date is not in the past, so no backdating is needed." };
        const r = ruleFor(n, "backdating");
        if (!r.rule || r.problem) return review(retro ? `${r.problem ?? "No backdating rule is on file"} A retroactive request needs the payer's backdating rule.` : r.problem ?? "No rule", r.rule);
        const v = r.rule.values;
        const type = v.dayType === "business" ? "business" : "calendar";
        const from = serviceStart(facts);
        const days = countDays(from, facts.today, type) ?? back ?? 0;
        const retroLimit = typeof v.retroWindowDays === "number" ? v.retroWindowDays : null;
        const limit = retro && retroLimit !== null ? retroLimit : v.allowed === true ? num(v.maxDaysBack, 0) : 0;
        const unit = type === "business" && !(retro && retroLimit !== null) ? "business day" : "calendar day";
        const proof = typeof v.proof === "string" && v.proof ? ` Rule note: ${v.proof}.` : "";
        if (days <= limit) return withRule({ outcome: "done", handle: "ok", message: `The start date is ${plural(days, unit)} back; the payer allows ${plural(limit, unit)}.${days > 0 ? proof : ""}` }, r.rule, r.warn);
        return withRule({ outcome: "done", handle: "not_allowed", message: `The start date is ${plural(days, unit)} back; ${limit > 0 ? `the payer allows ${plural(limit, unit)}` : "the payer does not backdate"}.${proof}` }, r.rule, r.warn);
      }
      case "rule_no_auth": {
        const r = ruleFor(n, "no_auth");
        const verifies = facts.authRequirement === "not_required";
        if (!r.rule || r.problem) {
          if (verifies) return { outcome: "done", handle: "exempt", message: "The eligibility check says no authorization is required. No rule on file confirms it.", warnings: ["No saved rule backs this exemption"], ...(r.rule ? { rules: [r.rule] } : {}) };
          return review(r.problem ?? "No rule", r.rule);
        }
        const v = r.rule.values;
        const words: Record<Program, string[]> = { RES: ["residential"], IOP: ["iop", "intensive outpatient"], PHP: ["php", "partial hosp"], WM: ["detox", "withdrawal management"] };
        const text = String(v.exceptions ?? "").toLowerCase();
        const named = words[facts.service].some((w) => text.includes(w));
        const exempt = v.required === false || named || verifies;
        const why = v.required === false ? "The rule says this payer needs no authorization." : named ? `The rule lists ${PROGRAM_LABEL[facts.service]} as needing none.` : verifies ? "The eligibility check says no authorization is required." : "The rule does not list this service as exempt.";
        return withRule({ outcome: "done", handle: exempt ? "exempt" : "required", message: `${why} ${exempt ? "No authorization is needed." : "An authorization is needed."}` }, r.rule, r.warn);
      }
      case "rule_continued_stay": {
        const a = facts.existingAuth;
        if (!a) return { outcome: "skipped", handle: "ok", message: "There is no authorization to review yet, so the cadence does not apply." };
        const r = ruleFor(n, "continued_stay");
        if (!r.rule || r.problem) return review(r.problem ?? "No rule", r.rule);
        const lead = num(r.rule.values.fileBeforeDays, 3);
        const every = num(r.rule.values.cadenceDays, 7);
        const e = daysToExpiry(facts) ?? 0;
        const late = e < lead || a.unitsRemaining <= 0;
        return withRule({ outcome: "done", handle: late ? "late" : "ok", message: late ? `The authorization ends in ${plural(Math.max(0, e), "day")}; the payer wants a request ${plural(lead, "day")} ahead. Reviews are every ${plural(every, "day")}.` : `The authorization ends in ${plural(e, "day")}, enough for a request ${plural(lead, "day")} ahead. Reviews are every ${plural(every, "day")}.` }, r.rule, r.warn ?? (late ? "A late review can leave a gap in the authorization" : undefined));
      }
      case "rule_units_duration": {
        const r = ruleFor(n, "units_duration");
        if (!r.rule || r.problem) return review(r.problem ?? "No rule", r.rule);
        const max = num(r.rule.values.units, NaN);
        const unit = typeof r.rule.values.unit === "string" ? r.rule.values.unit : "units";
        if (facts.requestedUnits === undefined) return withRule({ outcome: "skipped", handle: "ok", message: "No units or days were requested, so there is nothing to compare." }, r.rule, r.warn);
        if (Number.isNaN(max)) return review(`The rule "${r.rule.title}" has no limit set, so a person has to decide.`, r.rule);
        const over = facts.requestedUnits > max;
        return withRule({ outcome: "done", handle: over ? "over" : "ok", message: `${facts.requestedUnits} ${unit} requested; this sample limit is ${max} per request. ${over ? "It is over the limit." : "Within the limit."}` }, r.rule, r.warn);
      }
      case "rule_clinical_criteria": {
        const r = ruleFor(n, "clinical_criteria");
        if (!r.rule || r.problem) return review(r.problem ?? "No rule", r.rule);
        const miss = docs();
        const criteria = typeof r.rule.values.prerequisites === "string" && r.rule.values.prerequisites ? ` Criteria: ${r.rule.values.prerequisites.split("\n").filter(Boolean).join("; ")}.` : "";
        if (!miss.length) return withRule({ outcome: "done", handle: "met", message: `The documents the criteria rest on are in the case${suffix}.${criteria} Criteria recommends; a person decides.` }, r.rule, r.warn);
        if (edgeFor(n.id, "gap")) return withRule({ outcome: "done", handle: "gap", message: `${titleList(miss, options.docTitles)} ${miss.length === 1 ? "is" : "are"} missing from the evidence.${criteria}` }, r.rule, r.warn);
        return { ...withRule({ outcome: "waiting", message: `${titleList(miss, options.docTitles)} ${miss.length === 1 ? "is" : "are"} missing from the evidence.${criteria}`, stop: `Paused for documentation: ${titleList(miss, options.docTitles)} ${miss.length === 1 ? "is" : "are"} missing.` }, r.rule, r.warn) };
      }
      case "rule_submission_method": {
        const r = ruleFor(n, "submission_method");
        if (!r.rule || r.problem) return review(r.problem ?? "No rule", r.rule);
        const v = r.rule.values;
        const usable = (m: string): boolean => !!m && m !== "none" && !/^not used/i.test(String(v[m] ?? ""));
        const first = ["portal", "phone", "fax"].find((m) => usable(m) && v[m] !== undefined);
        const preferred = typeof v.preferred === "string" && v.preferred ? v.preferred : first ?? "portal";
        const fallback = typeof v.fallback === "string" ? v.fallback : "";
        let method = preferred;
        let why = `${sentence(preferred)} is the payer's usual route.`;
        if ((preferred === "portal" && facts.portalStatus === "down") || !usable(preferred)) {
          if (!usable(fallback)) return review(`${sentence(preferred)} is not available and no fallback is on file, so a person has to choose how to send it.`, r.rule);
          method = fallback;
          why = `${sentence(preferred)} ${facts.portalStatus === "down" && preferred === "portal" ? "is down" : "is not used"}, so it goes by ${fallback}.`;
        }
        if (!["portal", "fax", "phone"].includes(method)) return review(`"${method}" is not a way this step can send a request, so a person has to choose how to send it.`, r.rule);
        return withRule({ outcome: "done", handle: method, message: `Send by ${method}. ${why}` }, r.rule, r.warn);
      }
      case "rule_appeal_deadline":
      case "rule_p2p": {
        const r = ruleFor(n, "appeals");
        if (!r.rule || r.problem) return review(r.problem ?? "No rule", r.rule);
        const p2p = n.kind === "rule_p2p";
        const limit = num(r.rule.values[p2p ? "p2pWindowDays" : "appealWindowDays"], NaN);
        if (Number.isNaN(limit)) return review(`The rule "${r.rule.title}" has no ${p2p ? "peer-to-peer" : "appeal"} window set, so a person has to decide.`, r.rule);
        if (!facts.decisionDate) return withRule({ outcome: "done", handle: "ok", message: `No decision date was given, so the ${p2p ? "peer-to-peer" : "appeal"} window of ${plural(limit, "day")} was not counted.` }, r.rule, r.warn ? [r.warn, "No decision date: the window was not counted"].join(" | ") : "No decision date: the window was not counted");
        const type = r.rule.values.dayType === "calendar" ? "calendar" : r.rule.values.dayType === "business" ? "business" : p2p ? "business" : "calendar";
        const spent = countDays(facts.decisionDate, facts.today, type) ?? 0;
        const open = spent <= limit;
        const unit = type === "business" ? "business day" : "day";
        return withRule({ outcome: "done", handle: open ? "ok" : p2p ? "closed" : "expired", message: `${plural(spent, unit)} since the decision on ${facts.decisionDate}; the window is ${plural(limit, unit)}. ${open ? "Still open." : "It has closed."}` }, r.rule, r.warn);
      }

      /* actions */
      case "act_human_approval": {
        const who = ({ clinician: "a clinician", coordinator: "an authorization coordinator", manager: "a manager" } as Record<string, string>)[String(cfg.approver)] ?? "a person";
        const what = typeof cfg.what === "string" && cfg.what ? cfg.what : "the request";
        if (approval === "approved") return { outcome: "done", gate: true, message: `Approved by ${who}: ${what}.` };
        if (approval === "denied") return { outcome: "done", handle: "rejected", message: `${sentence(who)} declined: ${what}.` };
        return { outcome: "waiting", message: `Waiting for ${who} to approve: ${what}.`, stop: `Waiting for approval from ${who}: ${what}.` };
      }
      case "act_portal_prep":
      case "act_fax_prep":
      case "act_call_prep": {
        const channel = { act_portal_prep: "portal", act_fax_prep: "fax", act_call_prep: "phone" }[n.kind];
        const noun = { act_portal_prep: "portal submission", act_fax_prep: "fax packet", act_call_prep: "phone request" }[n.kind];
        return cfg.transmit === true
          ? { outcome: "done", message: `Approved. The ${noun} was sent by ${channel}${suffix}: nothing left this app.` }
          : { outcome: "done", message: `Prepared the ${noun} for review${suffix}. Nothing was sent: a person ${channel === "phone" ? "makes the call" : "submits it"}.` };
      }
      case "act_appeal": return { outcome: "done", message: `Advocate prepared the ${String(cfg.kind ?? "appeal").replace("p2p", "peer-to-peer")} for review${suffix}. Nothing was filed.` };
      case "act_update_case_manager": return { outcome: "done", message: typeof cfg.note === "string" && cfg.note ? `Wrote to the case history: "${cfg.note}"${cfg.scheduleNextReview === true ? " and booked the next review" : ""}.` : "Wrote a line to the case history." };
      case "act_update_status": return { outcome: "done", message: `Status set to ${String(cfg.status ?? "").replace(/_/g, " ")}${suffix}.` };
      case "act_task": return { outcome: "done", message: `Task for ${String(cfg.assignTo ?? "a person").replace(/_/g, " ")}${typeof cfg.taskTitle === "string" && cfg.taskTitle ? `: ${cfg.taskTitle}` : ""}${suffix}.` };
      case "act_notify": return { outcome: "done", message: `Told ${String(cfg.to ?? "a person").replace(/_/g, " ")}${typeof cfg.message === "string" && cfg.message ? `: "${cfg.message}"` : ""}${suffix}. No message left the app.` };
      case "act_document": return { outcome: "done", message: `Drafted ${String(cfg.document ?? "a document").replace(/_/g, " ")} for review${suffix}.` };
      case "act_followup": return { outcome: "done", message: `Follow-up booked in ${plural(num(cfg.afterDays, 0), cfg.dayType === "calendar" ? "calendar day" : "business day")} by ${String(cfg.how ?? "task")}${suffix}.` };
      case "act_escalate": return { outcome: "done", message: `Escalated to ${String(cfg.to ?? "a manager").replace(/_/g, " ")}${typeof cfg.reason === "string" && cfg.reason ? `: ${cfg.reason}` : ""}${suffix}.` };

      /* agents and integrations */
      case "ag_document_review":
      case "ag_clinical_summary":
      case "ag_medical_necessity":
      case "ag_authorization_prep":
      case "ag_rule_interpretation":
      case "ag_call_prep":
      case "ag_missing_info":
      case "ag_custom": {
        const p = promptOf(n);
        const agent = p?.agent && p.agent !== "custom" ? AGENTS[p.agent].name : "A custom agent";
        if (!p?.prompt?.trim()) return { outcome: "done", message: `${agent} has no instructions yet${suffix}.`, warnings: ["No prompt is written for this agent"] };
        return { outcome: "done", message: `${agent} would run its instructions${suffix}: no live model runs, and what it writes is a recommendation, never a payer decision.${p.humanReview ? " A person reviews its answer at the approval step." : ""}` };
      }
      case "int_emr_sync":
      case "int_payer_portal":
      case "int_api":
      case "int_webhook":
      case "int_fax":
      case "int_email":
      case "int_task_system":
      case "int_custom": {
        const action = String(cfg.action ?? "").replace(/_/g, " ");
        if (sup === "live") return { outcome: "done", message: `${n.title}: ${action || "done"} through the connected system.` };
        if (sup === "simulated") return { outcome: "done", message: `${n.title}: ${action || "done"}${suffix}. Nothing left this app.` };
        if (cfg.fallback === "manual") {
          if (approval === "approved") return { outcome: "done", message: `${n.title} is not configured. A person did it by hand and confirmed.` };
          return { outcome: "waiting", message: `${n.title} is not configured. A person has to do this by hand${action ? `: ${action}` : ""}, then confirm.`, stop: `Waiting for a person: ${n.title} is not configured.` };
        }
        return review(`${n.title} is not configured and has no manual fallback, so a person has to decide.`);
      }
      default: return { outcome: "done", message: n.purpose };
    }
  };

  /* ----- trigger: the workflow runs when at least one of its triggers fires */
  const fires = (t: WfNode): { fired: boolean; text: string } => {
    const c = t.config;
    const types = strs(c.requestTypes);
    const services = strs(c.services);
    const days = num(c.daysBefore, 0);
    const e = daysToExpiry(facts);
    const scope = (!types.length || types.includes(facts.requestType)) && (!services.length || services.includes(facts.service));
    switch (t.kind) {
      case "trg_new_request": return scope ? { fired: true, text: "A new request started this process." } : { fired: false, text: `a new ${types.map((x) => x).join(" or ") || "request"} for ${services.map((s) => PROGRAM_LABEL[s as Program] ?? s).join(" or ") || "any service"}` };
      case "trg_review_due": return facts.existingAuth && (facts.requestType === "concurrent" || (e !== null && e <= days)) && (!services.length || services.includes(facts.service)) ? { fired: true, text: "A review is due." } : { fired: false, text: `a review due${e !== null ? ` (the authorization ends in ${plural(e, "day")})` : ""}` };
      case "trg_auth_expiring": return facts.existingAuth && (facts.requestType === "reauth" || (e !== null && e <= days)) && (!services.length || services.includes(facts.service)) ? { fired: true, text: "The authorization is close to its end." } : { fired: false, text: `an authorization that ends within ${plural(days, "day")}` };
      case "trg_payer_response": return facts.payerResponse !== "none" && (!strs(c.responses).length || strs(c.responses).includes(facts.payerResponse)) ? { fired: true, text: "The payer answered." } : { fired: false, text: "the payer's answer" };
      case "trg_eligibility_changed": return facts.coverage !== "active" || (facts.benefit !== "covered" && facts.benefit !== "limited") ? { fired: true, text: "A coverage check found a change." } : { fired: false, text: "a change in eligibility" };
      default: return { fired: true, text: "A person started this process." };
    }
  };

  /* ----- walk */
  const start = workflow.nodes.find((n) => n.kind === "start");
  if (!start) return finish("failed", "Stopped: the workflow has no Start step.", { reason: "The workflow has no Start step." });
  const triggers = workflow.nodes.filter((n) => nodeDef(n.kind).category === "trigger");

  const startExec = run(start, 1);
  record(start, startExec);
  visits.set(start.id, 1);
  if (triggers.length) {
    const checks = triggers.map((t) => ({ t, ...fires(t) }));
    const hit = checks.filter((c) => c.fired);
    if (!hit.length) {
      const first = checks[0];
      record(first.t, { outcome: "waiting", message: `Waiting for ${first.text}${SUPPORT_SUFFIX[support(first.t)]}.` });
      return finish("paused", `Waiting for the trigger: ${first.text}.`, { stoppedAt: first.t.id, reason: `Waiting for ${first.text}` });
    }
    for (const c of hit) {
      visits.set(c.t.id, 1);
      record(c.t, { outcome: "done", message: `${c.text}${SUPPORT_SUFFIX[support(c.t)]}` });
    }
  }

  let current: WfNode = start;
  let handle: Handle = "next";
  /* the node and handle just left; follow the line, its fallback, or end the run where nothing is drawn */
  for (;;) {
    const followed = (() => {
      const chain: Handle[] = [handle];
      const fb = nodeDef(current.kind).fallbacks ?? {};
      for (let h = fb[handle]; h && !chain.includes(h); h = fb[h]) chain.push(h);
      for (const h of chain) {
        const e = edgeFor(current.id, h);
        if (e) return { edge: e, handle: h };
      }
      return null;
    })();
    const waiting = WAITS.has(handle) && WAIT_KINDS.has(current.kind) && (visits.get(current.id) ?? 0) >= 2;
    if (!followed || waiting) {
      const last = [...steps].reverse().find((st) => st.nodeId === current.id) ?? steps[steps.length - 1];
      const implicit = implicitFor(current.kind, handle);
      const label = nodeDef(current.kind).outputs.find((o) => o.handle === handle)?.label ?? handle;
      if (waiting) {
        last.outcome = "waiting";
        last.message = `${last.message} Seen again with the same answer, so the process waits for something new.`;
        const text = handle === "none" ? "Waiting for the payer's answer." : handle === "more_info" ? "Waiting for the payer's decision after the information was sent." : `Waiting: ${current.title}.`;
        return finish("paused", text, { stoppedAt: current.id, reason: text });
      }
      if (implicit === "no_authorization") {
        last.message = `${last.message} Nothing is drawn after this, so the process ends here: no authorization is needed.`;
        return finish("no_authorization", `No authorization needed: ${last.message.split(".")[0]}.`, { stoppedAt: current.id, reason: "No authorization is needed.", end: "no_authorization" });
      }
      if (implicit === "paused") {
        last.outcome = "waiting";
        const text = handle === "none" ? "Waiting for the payer's answer." : handle === "waiting" ? `Waiting: ${last.message}` : `Paused for documentation: ${last.message}`;
        return finish("paused", text, { stoppedAt: current.id, reason: text });
      }
      if (implicit === "manual_review") {
        last.outcome = "manual_review";
        const text = `Needs a person: ${last.message} Nothing is drawn for "${label}", so it goes to manual review.`;
        return finish("manual_review", text, { stoppedAt: current.id, reason: text });
      }
      last.outcome = "failed";
      const reason = `${current.title} has no line for "${label}", so the process cannot go on.`;
      return finish("failed", `Stopped: ${reason}`, { stoppedAt: current.id, reason });
    }

    const next = byId.get(followed.edge.to) as WfNode;
    const count = (visits.get(next.id) ?? 0) + 1;
    if (count > MAX_VISITS) {
      const reason = `${next.title} was reached ${count} times in one run. The process loops without waiting for anything.`;
      return finish("failed", `Stopped: ${reason}`, { stoppedAt: next.id, reason });
    }
    if (steps.length >= maxSteps) {
      const reason = `The run went past ${maxSteps} steps and was stopped.`;
      return finish("failed", `Stopped: ${reason}`, { stoppedAt: next.id, reason });
    }
    visits.set(next.id, count);
    const cap = typeof next.config.maxVisits === "number" ? next.config.maxVisits : null;
    if (cap !== null && count > cap) {
      const text = `${next.title} was reached more than ${cap} ${cap === 1 ? "time" : "times"}, so a person has to decide.`;
      record(next, { outcome: "manual_review", message: text });
      return finish("manual_review", `Needs a person: ${text}`, { stoppedAt: next.id, reason: text });
    }
    const x = run(next, count);
    record(next, x);
    if (x.gate) gate = true;
    current = next;
    handle = x.handle ?? "next";

    if (x.end) {
      const label = x.end === "manual_review" ? "Needs a person" : x.end === "denial" ? "Handed to the denial workflow" : x.end === "no_authorization" ? "No authorization needed" : "Completed";
      const status: RunStatus = x.end === "denial" ? "completed" : x.end;
      const before = steps.length > 1 ? steps[steps.length - 2] : undefined;
      const note = typeof next.config.note === "string" ? next.config.note.trim() : "";
      const why = note || (before ? before.message : x.message);
      const text = x.end === "completed" ? `Completed: ${plural(steps.length, "step")} ran and the process ended at "${next.title}".` : `${label}: ${why}`;
      return finish(status, text, { stoppedAt: next.id, end: x.end, reason: x.end === "completed" ? undefined : why });
    }
    if (x.outcome === "waiting") return finish("paused", x.stop ?? x.message, { stoppedAt: next.id, reason: x.stop ?? x.message });
    if (x.outcome === "manual_review") return finish("manual_review", x.stop ?? x.message, { stoppedAt: next.id, reason: x.stop ?? x.message });
    if (x.outcome === "failed") return finish("failed", `Stopped: ${x.message}`, { stoppedAt: next.id, reason: x.message });
  }
}

/** Every step that asks for a person, marked approved: a quick way to see a whole path in Test Workflow or a test. */
export function approveAll(workflow: Pick<Workflow, "nodes">): Record<string, ApprovalState> {
  const out: Record<string, ApprovalState> = {};
  for (const n of workflow.nodes) if (n.approval || n.kind === "act_human_approval" || nodeDef(n.kind).payerFacing) out[n.id] = "approved";
  return out;
}

/** The facts with every approval given. */
export const withApprovals = (workflow: Pick<Workflow, "nodes">, facts: CaseFacts): CaseFacts => ({ ...facts, approvals: { ...approveAll(workflow), ...facts.approvals } });

/** The nodes a stopped run was waiting behind, in the order the graph reaches them: for drawing "pending" nodes. */
export const pendingOf = (r: Pick<RunResult, "pending">): string[] => r.pending ?? [];
