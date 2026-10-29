import type { RequestKind } from "../queue";
import type { AgentKey, PayerId, Program } from "../types";

export type { AgentKey, PayerId, Program };

/* The Payer Workflow Studio contract. Everything the builder, the simulator, the rules library, New Authorization and the engine share is typed here.
   A workflow is a saved graph of nodes and edges. Branching is decided by structured conditions over case facts, never by a model, so the
   simulator and New Authorization run the same code (engine.ts). Payer policy text lives once in the rules library; nodes point at rules by id. */

/** The five workflow stages (New Authorization shows four; preparation happens between its third and fourth). Every node belongs to one, so New Authorization can show where a workflow is without forcing an order. */
export type Stage = "intake" | "eligibility" | "documentation" | "preparation" | "review";
export const STAGES_ORDER: Stage[] = ["intake", "eligibility", "documentation", "preparation", "review"];
export const STAGE_LABEL: Record<Stage, string> = { intake: "Patient & Service", eligibility: "Coverage & Requirements", documentation: "Clinical Documentation", preparation: "Authorization preparation", review: "Review & Submit" };

/** The five request types people choose in New Authorization and the queue filter ("initial", "concurrent", "reauth", "modify", "retro"). */
export type RequestType = RequestKind;
export const REQUEST_TYPE_LABEL: Record<RequestType, string> = { initial: "Initial authorization", concurrent: "Concurrent review", reauth: "Reauthorization", modify: "Modification or extension", retro: "Retroactive authorization" };

/* ------------------------------------------------------------------ nodes */
export type NodeCategory = "flow" | "trigger" | "verification" | "documents" | "condition" | "rule" | "action" | "agent" | "integration";
export const CATEGORY_LABEL: Record<NodeCategory, string> = { flow: "Start and end", trigger: "Triggers", verification: "Verification", documents: "Clinical documentation", condition: "Conditions", rule: "Payer rules", action: "Actions", agent: "Agents", integration: "Integrations" };

export type NodeKind =
  // flow
  | "start" | "end"
  // triggers
  | "trg_new_request" | "trg_review_due" | "trg_auth_expiring" | "trg_payer_response" | "trg_eligibility_changed" | "trg_manual"
  // verification
  | "ver_eligibility" | "ver_benefits" | "ver_auth_required" | "ver_provider_network" | "ver_existing_auth" | "ver_remaining_units" | "ver_coverage_change"
  // clinical documentation
  | "doc_collect" | "doc_validate" | "doc_extract" | "doc_medical_necessity" | "doc_summary" | "doc_request_missing" | "doc_packet"
  // conditions and branching
  | "if_else" | "cond_group" | "decision" | "wait_until" | "time_condition" | "auth_status" | "payer_response" | "missing_info"
  // payer-rule nodes (each references a rule in the library)
  | "rule_submission_window" | "rule_backdating" | "rule_no_auth" | "rule_continued_stay" | "rule_units_duration" | "rule_clinical_criteria" | "rule_submission_method" | "rule_appeal_deadline" | "rule_p2p"
  // actions
  | "act_task" | "act_notify" | "act_document" | "act_portal_prep" | "act_fax_prep" | "act_call_prep" | "act_human_approval" | "act_update_status" | "act_followup" | "act_escalate" | "act_appeal" | "act_update_case_manager"
  // agents (FLO's named agents; "ag_custom" is a prompt of the user's own)
  | "ag_document_review" | "ag_clinical_summary" | "ag_medical_necessity" | "ag_authorization_prep" | "ag_rule_interpretation" | "ag_call_prep" | "ag_missing_info" | "ag_custom"
  // integrations
  | "int_emr_sync" | "int_payer_portal" | "int_api" | "int_webhook" | "int_fax" | "int_email" | "int_task_system" | "int_custom";

/** Live: backed by a real part of this app (the eligibility check, documents, tasks, the Case Manager). Simulated: the demo pretends. Not configured: needs a connection that is not set up. Shown on every node and trigger. */
export type SupportStatus = "live" | "simulated" | "not_configured";
export const SUPPORT_LABEL: Record<SupportStatus, string> = { live: "Works in this demo", simulated: "Demo simulation", not_configured: "Not configured" };
export type ExecMode = "automatic" | "manual" | "agent";
export const EXEC_LABEL: Record<ExecMode, string> = { automatic: "Automatic", manual: "Manual", agent: "Agent-assisted" };
export type ErrorMode = "stop" | "manual_review" | "retry" | "skip";
export const ERROR_LABEL: Record<ErrorMode, string> = { stop: "Stop the workflow", manual_review: "Send to manual review", retry: "Retry, then manual review", skip: "Skip and go on" };

/** A value stored in a node's `config`. Which keys exist is decided by the node's definition in the catalog. */
export type ConfigValue = string | number | boolean | string[] | ConditionGroup | BranchDef[] | PromptConfig | null;

export interface WfNode {
  id: string;
  kind: NodeKind;
  /** Short, plain title. Defaults to the catalog title; the user may rename it. */
  title: string;
  /** One line shown under the title on the canvas. */
  purpose: string;
  x: number;
  y: number;
  mode: ExecMode;
  stage: Stage;
  config: Record<string, ConfigValue>;
  /** Ids of rules in the library this node applies. A deleted rule makes the workflow invalid. */
  ruleRefs: string[];
  /** A person must approve before this node completes (external payer-facing actions always need it). */
  approval: boolean;
  onError: ErrorMode;
  retries?: number;
  /** Free text for the people who run this step. */
  instructions?: string;
}

/** Which output a connection leaves from. "next" for a plain node; "yes" and "no" for If/Else; a branch id for Decision; named results for payer response and similar. */
export type Handle = string;
export interface WfEdge {
  id: string;
  from: string;
  to: string;
  handle: Handle;
  /** Shown on the line, for example "Yes", "Approved", "More information". */
  label?: string;
}

/* ------------------------------------------------------------------ conditions (deterministic) */
export type Operator = "equals" | "not_equals" | "contains" | "gt" | "lt" | "before" | "after" | "exists" | "not_exists";
export const OPERATOR_LABEL: Record<Operator, string> = { equals: "is", not_equals: "is not", contains: "contains", gt: "is greater than", lt: "is less than", before: "is before", after: "is after", exists: "exists", not_exists: "does not exist" };

/** The facts a condition can read. `doc:<documentId>` reads one required document (true when present). */
export type FactKey =
  | "payer" | "product" | "state" | "service" | "request_type"
  | "coverage" | "benefit" | "auth_requirement" | "in_network" | "has_existing_auth"
  | "units_remaining" | "days_to_expiry" | "requested_units"
  | "requested_start" | "days_since_service" | "documents_complete" | "payer_response" | "portal_status" | "waiting_days"
  | `doc:${string}`;

export interface Condition { fact: FactKey; op: Operator; value?: string | number }
export interface ConditionGroup { join: "and" | "or"; items: (Condition | ConditionGroup)[] }
export const isGroup = (c: Condition | ConditionGroup): c is ConditionGroup => "join" in c;

/** One exit of a Decision node: if `when` holds, follow the edge whose handle is `id`. The first branch that holds wins; `else` is the "Otherwise" exit. */
export interface BranchDef { id: string; label: string; when: ConditionGroup }

/** The prompt of an agent node. Variables such as {{patient_name}} are filled from the case; document text is data and never an instruction. */
export interface PromptConfig {
  agent: AgentKey | "custom";
  prompt: string;
  inputs: string[];
  expectedOutput: string;
  humanReview: boolean;
  onFailure: ErrorMode;
}
export const PROMPT_VARIABLES = ["patient_name", "payer_name", "service_type", "authorization_type", "requested_start_date", "existing_authorization", "clinical_documents", "payer_rules", "requested_units"] as const;

/* ------------------------------------------------------------------ the field spec the contextual editor renders */
export type FieldSpec =
  | { key: string; label: string; type: "text"; placeholder?: string; help?: string; advanced?: boolean }
  | { key: string; label: string; type: "textarea"; placeholder?: string; help?: string; rows?: number; advanced?: boolean }
  | { key: string; label: string; type: "number"; min?: number; max?: number; unit?: string; help?: string; advanced?: boolean }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[]; help?: string; advanced?: boolean }
  | { key: string; label: string; type: "multiselect"; options: { value: string; label: string }[]; help?: string; advanced?: boolean }
  | { key: string; label: string; type: "toggle"; help?: string; advanced?: boolean }
  | { key: string; label: string; type: "condition"; help?: string; advanced?: boolean }
  | { key: string; label: string; type: "branches"; help?: string; advanced?: boolean }
  | { key: string; label: string; type: "checklist"; help?: string; advanced?: boolean }
  | { key: string; label: string; type: "prompt"; help?: string; advanced?: boolean }
  | { key: string; label: string; type: "rule"; group: RuleGroup; help?: string; advanced?: boolean };

/** What the palette and the engine know about one kind of node. */
export interface NodeDef {
  kind: NodeKind;
  category: NodeCategory;
  title: string;
  purpose: string;
  /** A lucide icon name (the builder maps it). */
  icon: string;
  defaultMode: ExecMode;
  defaultStage: Stage;
  support: SupportStatus;
  /** One sentence on what is real and what is simulated, shown in the editor. */
  supportNote: string;
  /** The exits the node can have, in order. "next" for one exit; named results for branching nodes; Decision and Start/End are special-cased.
      `optional` exits need no connection to publish: the engine has a fixed fallback (see `fallbacks` and engine.ts) when the path is not wired. */
  outputs: { handle: Handle; label: string; optional?: boolean }[];
  /** True when more than one incoming connection makes no sense (a trigger). */
  noInputs?: boolean;
  /** The fields the contextual editor shows, and their defaults. */
  fields: FieldSpec[];
  defaults: Record<string, ConfigValue>;
  /** The rule group this node references, if it is a payer-rule node. */
  ruleGroup?: RuleGroup;
  /** Reaches outside this app (a payer, a fax line, an API). Such a node always needs a person's approval, and its toggle cannot be turned off. */
  payerFacing?: boolean;
  /** When an exit has no connection, the engine follows this exit instead, if it is connected ("expiring" falls back to "active"). */
  fallbacks?: Record<Handle, Handle>;
}

/* ------------------------------------------------------------------ the payer rules library */
export type RuleGroup = "auth_requirements" | "submission_windows" | "backdating" | "clinical_documentation" | "concurrent_reauth" | "submission_methods" | "appeals_p2p" | "agent_instructions";
export const RULE_GROUP_LABEL: Record<RuleGroup, string> = {
  auth_requirements: "Authorization requirements",
  submission_windows: "Submission windows",
  backdating: "Backdating & retroactive requests",
  clinical_documentation: "Clinical documentation",
  concurrent_reauth: "Concurrent review & reauthorization",
  submission_methods: "Submission methods",
  appeals_p2p: "Appeals & peer-to-peer",
  agent_instructions: "Agent instructions",
};
export type Verification = "verified" | "needs_review" | "unverified" | "superseded";
export const VERIFICATION_LABEL: Record<Verification, string> = { verified: "Verified", needs_review: "Needs review", unverified: "Unverified", superseded: "Superseded" };
export type SourceKind = "demo_sample" | "user_entered" | "url" | "document";

export interface RuleSource { kind: SourceKind; label: string; url?: string; publishedOn?: string }
export interface RuleChange { at: number; by: string; what: string; reason?: string }
export interface PayerRule {
  id: string;
  payerId: PayerId;
  group: RuleGroup;
  title: string;
  description: string;
  /** The structured part: for example { windowDays: 2, dayType: "business", required: true }. Keys are free per group; the editor lists them. */
  values: Record<string, string | number | boolean>;
  /** Optional free text for people and agents. */
  instructions?: string;
  state: string;
  product?: string;
  /** Empty means every service. */
  services: Program[];
  providerType?: string;
  /** Empty means every request type. */
  requestTypes: RequestType[];
  effectiveFrom: string;
  effectiveTo?: string;
  source: RuleSource;
  /** ISO date a person last checked it against the source. Absent until someone does. */
  lastVerified?: string;
  verification: Verification;
  owner: string;
  version: number;
  history: RuleChange[];
  /** "payer_config" for a rule read through from the payer's saved rules, documents, caller script or reach lines (edits go to those); "library" for one the rules library owns. */
  origin?: "payer_config" | "library";
}

/* ------------------------------------------------------------------ workflows */
export type WorkflowStatus = "draft" | "published" | "archived";
export interface WorkflowMeta {
  id: string;
  payerId: PayerId;
  name: string;
  /** One or two sentences on what the workflow is for. Templates say they are illustrative, not payer policy. */
  description?: string;
  state: string;
  product?: string;
  /** Empty means every service. */
  services: Program[];
  providerType?: string;
  /** "any" matches every request type (a payer default). */
  requestType: RequestType | "any";
  effectiveFrom: string;
  effectiveTo?: string;
  owner: string;
}
export interface Workflow extends WorkflowMeta {
  version: number;
  status: WorkflowStatus;
  nodes: WfNode[];
  edges: WfEdge[];
  /** Demo minutes of the last save. */
  updatedAt: number;
  updatedBy: string;
  /** The template or workflow this one was started from. */
  startsFrom?: string;
  /** Set on the workflow made from a payer's earlier Process tab, so nothing is lost. */
  migrated?: boolean;
  /** On a draft that sits on top of a published workflow: the version that is in force while the draft is edited. Absent when nothing is published yet. */
  publishedVersion?: number;
}
export interface WorkflowVersion {
  workflowId: string;
  version: number;
  savedAt: number;
  savedBy: string;
  reason: string;
  status: WorkflowStatus;
  meta: WorkflowMeta;
  nodes: WfNode[];
  edges: WfEdge[];
}

/* ------------------------------------------------------------------ running (simulator and New Authorization share this) */
export type ApprovalState = "approved" | "pending" | "denied";
export type PayerResponse = "none" | "approved" | "partial" | "denied" | "more_info";

/** Everything the engine needs to decide a path. The simulator fills it from a form; New Authorization fills it from the case. */
export interface CaseFacts {
  payerId: PayerId;
  product?: string;
  state: string;
  service: Program;
  requestType: RequestType;
  /** ISO dates. `today` is the demo date. */
  today: string;
  requestedStart: string;
  serviceDates?: { from: string; to: string };
  coverage: "active" | "inactive" | "unknown";
  benefit: "covered" | "limited" | "not_covered" | "unknown";
  authRequirement: "required" | "concurrent" | "not_required" | "unknown";
  inNetwork: "yes" | "no" | "unknown";
  existingAuth?: { ref: string; unitsRemaining: number; expiresOn: string };
  requestedUnits?: number;
  /** Required documents by id (from the payer's document list): present or not. */
  documents: Record<string, boolean>;
  payerResponse: PayerResponse;
  portalStatus: "up" | "down";
  /** Business days the request has waited for a payer answer. */
  waitingDays: number;
  /** The provider type the request is for, when the case knows it. A workflow set for one provider type matches only that type. */
  providerType?: string;
  /** ISO date of the payer's decision, for the appeal deadline and peer-to-peer window. Without it those rules cannot be counted and say so. */
  decisionDate?: string;
  /** Human approvals already given, by node id (New Authorization fills it from the sign-off). */
  approvals?: Record<string, ApprovalState>;
}

export type StepOutcome = "done" | "skipped" | "failed" | "waiting" | "manual_review";
export interface TraceStep {
  nodeId: string;
  kind: NodeKind;
  title: string;
  outcome: StepOutcome;
  /** The handle followed out of this node, when it branched or finished. */
  handle?: Handle;
  /** Plain sentence of what happened, with the numbers. */
  message: string;
  /** How real the step is in this demo (live, a simulation, or not configured), so a trace never reads as more than it was. */
  support?: SupportStatus;
  ruleRefs: string[];
  warnings: string[];
  /** Order of execution, from 0. */
  seq: number;
}
export type RunStatus = "completed" | "no_authorization" | "paused" | "manual_review" | "failed";
/** What an End node says about how its path finished. "denial" reads as a completed run that hands the case to the denial workflow. */
export type EndResult = "completed" | "no_authorization" | "manual_review" | "denial";
export const END_RESULT_LABEL: Record<EndResult, string> = { completed: "Completed", no_authorization: "No authorization needed", manual_review: "Needs a person (manual review)", denial: "Hand over to the denial workflow" };
export interface RunResult {
  status: RunStatus;
  steps: TraceStep[];
  /** Ids of nodes executed, in order. Ids of nodes never reached are the rest of the graph. */
  visited: string[];
  skipped: string[];
  /** The node a run stopped at, and why. */
  stoppedAt?: string;
  reason?: string;
  /** One sentence for the person: "Paused for documentation: the treatment plan is missing." */
  outcomeText: string;
  /** How the run ended when it reached an End node: completed, no authorization needed, manual review, or handed to the denial workflow. */
  endResult?: EndResult;
  /** Ids of nodes not reached yet that the stopped run could still reach (waiting nodes behind a pause). `skipped` holds the nodes on other paths. */
  pending?: string[];
  warnings: string[];
  /** Rule ids read, with their verification state, so unverified rules are never silent. */
  rulesUsed: { id: string; title: string; verification: Verification }[];
}

/* ------------------------------------------------------------------ validation and matching */
export interface ValidationIssue { severity: "error" | "warning"; nodeId?: string; edgeId?: string; text: string }
export interface MatchCandidate { workflow: Workflow; score: number; why: string[] }
export interface MatchResult {
  workflow?: Workflow;
  candidates: MatchCandidate[];
  /** Two or more equally specific workflows: flagged, none chosen. */
  conflict?: Workflow[];
  /** True when nothing matched and the labelled default is used. */
  usedDefault: boolean;
  /** One or two sentences: which workflow, why, and what it overrides. */
  explanation: string;
}

/** What New Authorization stores on a draft or request once a workflow is applied. */
export interface AppliedWorkflow {
  workflowId: string;
  version: number;
  name: string;
  appliedAt: number;
  usedDefault: boolean;
  explanation: string;
}
