import { PROGRAM_LABEL, PROGRAMS } from "../types";
import {
  REQUEST_TYPE_LABEL,
  type BranchDef,
  type ConditionGroup,
  type ConfigValue,
  type ExecMode,
  type FieldSpec,
  type Handle,
  type NodeCategory,
  type NodeDef,
  type NodeKind,
  type PromptConfig,
  type RuleGroup,
  type Stage,
  type SupportStatus,
  type WfNode,
} from "./types";

/* The node catalog: one NodeDef for every NodeKind. The palette, the contextual editor, the validator and the engine all read it.
   Support is honest. "live" means the demo really does it (the eligibility and benefit checks and the authorization requirement use the app's verification
   logic, documents readiness uses the case's document list, Update Case Manager writes a real history line, the sign-off gate is real). "simulated" means the
   demo pretends and says so. "not_configured" means it needs a connection nobody has set up. No credentials are ever entered in this app. */

type Out = { handle: Handle; label: string; optional?: boolean };
const next: Out[] = [{ handle: "next", label: "Next" }];
const opt = (handle: Handle, label: string): Out => ({ handle, label, optional: true });
const out = (handle: Handle, label: string): Out => ({ handle, label });

/* ---------------------------------------------------------------- field builders */
const text = (key: string, label: string, o: { placeholder?: string; help?: string; advanced?: boolean } = {}): FieldSpec => ({ key, label, type: "text", ...o });
const area = (key: string, label: string, o: { placeholder?: string; help?: string; rows?: number; advanced?: boolean } = {}): FieldSpec => ({ key, label, type: "textarea", ...o });
const num = (key: string, label: string, o: { min?: number; max?: number; unit?: string; help?: string; advanced?: boolean } = {}): FieldSpec => ({ key, label, type: "number", ...o });
const sel = (key: string, label: string, options: [string, string][], o: { help?: string; advanced?: boolean } = {}): FieldSpec => ({ key, label, type: "select", options: options.map(([value, l]) => ({ value, label: l })), ...o });
const multi = (key: string, label: string, options: [string, string][], o: { help?: string; advanced?: boolean } = {}): FieldSpec => ({ key, label, type: "multiselect", options: options.map(([value, l]) => ({ value, label: l })), ...o });
const tog = (key: string, label: string, o: { help?: string; advanced?: boolean } = {}): FieldSpec => ({ key, label, type: "toggle", ...o });
const cond = (key: string, label: string, o: { help?: string; advanced?: boolean } = {}): FieldSpec => ({ key, label, type: "condition", ...o });
const checklist = (key: string, label: string, o: { help?: string; advanced?: boolean } = {}): FieldSpec => ({ key, label, type: "checklist", ...o });
const prompt = (label = "Instructions for the agent", o: { help?: string; advanced?: boolean } = {}): FieldSpec => ({ key: "prompt", label, type: "prompt", ...o });
const rule = (group: RuleGroup, label: string, o: { help?: string; advanced?: boolean } = {}): FieldSpec => ({ key: "ruleRefs", label, type: "rule", group, ...o });

const SERVICES: [string, string][] = PROGRAMS.map((p) => [p, PROGRAM_LABEL[p]]);
const REQUESTS: [string, string][] = (Object.keys(REQUEST_TYPE_LABEL) as (keyof typeof REQUEST_TYPE_LABEL)[]).map((k) => [k, REQUEST_TYPE_LABEL[k]]);
const DAY_TYPE: [string, string][] = [["business", "Business days"], ["calendar", "Calendar days"]];
const ROLES: [string, string][] = [["case_manager", "Case manager"], ["clinician", "Clinician"], ["coordinator", "Authorization coordinator"], ["billing", "Billing"], ["manager", "Manager"]];
const FALLBACK: [string, string][] = [["manual", "A person does it by hand"], ["none", "No fallback (stop and ask)"]];
const STATUSES: [string, string][] = [["draft", "Draft"], ["ready", "Ready for review"], ["submitted", "Submitted"], ["acknowledged", "Acknowledged"], ["under_review", "Under review"], ["info_requested", "Info requested"], ["approved", "Approved"], ["denied", "Denied"], ["completed", "Completed"]];
const ON_UNVERIFIED: [string, string][] = [["continue", "Go on and show a warning"], ["manual_review", "Send to manual review"]];

const group = (join: "and" | "or", ...items: ConditionGroup["items"]): ConditionGroup => ({ join, items });
const MAX_VISITS = num("maxVisits", "Stop looping after", { min: 1, max: 3, unit: "visits", advanced: true, help: "When this step is reached more times than this in one run, the run goes to manual review. The engine never visits a step more than 3 times." });

/** The prompt each agent node starts with. Variables are filled from the case. Text inside a document is data, never an instruction. */
const prompts = (agent: PromptConfig["agent"], promptText: string, expectedOutput: string, inputs: string[], humanReview = false): PromptConfig => ({ agent, prompt: promptText, inputs, expectedOutput, humanReview, onFailure: "manual_review" });

/* ---------------------------------------------------------------- the definitions */
interface Def extends Omit<NodeDef, "defaultMode" | "defaultStage" | "outputs" | "fields" | "defaults" | "supportNote"> {
  mode?: ExecMode;
  stage: Stage;
  note: string;
  outputs?: Out[];
  fields?: FieldSpec[];
  defaults?: Record<string, ConfigValue>;
}
const d = (x: Def): NodeDef => ({ ...x, defaultMode: x.mode ?? "automatic", defaultStage: x.stage, supportNote: x.note, outputs: x.outputs ?? next, fields: x.fields ?? [], defaults: x.defaults ?? {} });

const RULE_NODE = {
  fields: (g: RuleGroup, label: string): FieldSpec[] => [rule(g, label), sel("onUnverified", "If the rule is unverified", ON_UNVERIFIED, { advanced: true, help: "Sample rules are unverified. By default the workflow goes on and shows a warning." })],
  defaults: { onUnverified: "continue" } as Record<string, ConfigValue>,
  note: "Evaluates the saved rule against the case. The seeded rules are demo samples, never verified against a payer.",
};

const DEFS: NodeDef[] = [
  /* ---- flow */
  d({ kind: "start", category: "flow", title: "Start", purpose: "Where the process begins.", icon: "Play", stage: "intake", support: "live", note: "Every run begins here.", noInputs: true }),
  d({
    kind: "end", category: "flow", title: "End", purpose: "Where this path of the process stops.", icon: "CircleStop", stage: "review", support: "live", note: "The run stops here and reports the result you choose.", outputs: [],
    fields: [sel("result", "How this path ends", [["completed", "Completed"], ["no_authorization", "No authorization needed"], ["manual_review", "Needs a person (manual review)"], ["denial", "Hand over to the denial workflow"]]), text("note", "Note for the person", { placeholder: "What the person should know", advanced: true })],
    defaults: { result: "completed" },
  }),

  /* ---- triggers */
  d({
    kind: "trg_new_request", category: "trigger", title: "New authorization request", purpose: "Starts when a request is created in New case.", icon: "FilePlus", stage: "intake", support: "live", noInputs: true,
    note: "New case starts the workflow as soon as a case is created.",
    fields: [multi("requestTypes", "Request types", REQUESTS, { help: "Leave empty for every request type." }), multi("services", "Services", SERVICES, { help: "Leave empty for every service." })],
    defaults: { requestTypes: [], services: [] },
  }),
  d({
    kind: "trg_review_due", category: "trigger", title: "Concurrent review due", purpose: "Starts when a review of an existing authorization is due.", icon: "CalendarClock", stage: "intake", support: "simulated", noInputs: true,
    note: "Case Manager shows review dates, but this demo does not start a workflow by itself when one comes due. A concurrent review started in New case counts as due.",
    fields: [num("daysBefore", "Days before the review", { min: 0, max: 60, unit: "days" }), multi("services", "Services", SERVICES, { help: "Leave empty for every service." })],
    defaults: { daysBefore: 3, services: [] },
  }),
  d({
    kind: "trg_auth_expiring", category: "trigger", title: "Authorization expiring", purpose: "Starts when an authorization is close to its end.", icon: "CalendarX", stage: "intake", support: "simulated", noInputs: true,
    note: "The demo does not watch expiry dates on its own. A reauthorization started in New case counts as expiring.",
    fields: [num("daysBefore", "Days before it ends", { min: 0, max: 90, unit: "days" }), multi("services", "Services", SERVICES, { help: "Leave empty for every service." })],
    defaults: { daysBefore: 7, services: [] },
  }),
  d({
    kind: "trg_payer_response", category: "trigger", title: "Payer response received", purpose: "Starts when the payer answers.", icon: "Inbox", stage: "review", support: "simulated", noInputs: true,
    note: "In the demo the payer answers when you use the simulate-reply controls or Test Workflow. No payer feed is connected.",
    fields: [multi("responses", "Which answers", [["approved", "Approved"], ["partial", "Approved in part"], ["denied", "Denied"], ["more_info", "Asked for more information"]], { help: "Leave empty for any answer." })],
    defaults: { responses: [] },
  }),
  d({
    kind: "trg_eligibility_changed", category: "trigger", title: "Eligibility changed", purpose: "Starts when a re-check finds coverage changed.", icon: "RefreshCw", stage: "eligibility", support: "simulated", noInputs: true,
    note: "Verify re-checks on the demo clock. This trigger fires in Test Workflow when coverage or benefits are not active and covered.",
  }),
  d({ kind: "trg_manual", category: "trigger", title: "Manual trigger", purpose: "A person starts the process by hand.", icon: "MousePointerClick", stage: "intake", support: "live", noInputs: true, note: "A person starts it, so it always fires." }),

  /* ---- verification */
  d({
    kind: "ver_eligibility", category: "verification", title: "Verify eligibility", purpose: "Checks that coverage is active for the dates of service.", icon: "ShieldCheck", stage: "eligibility", support: "live",
    note: "Uses the app's eligibility check (the same record Eligibility & Benefits shows). The source is simulated, not a real payer feed.",
    outputs: [out("ok", "Active"), opt("issue", "Not active"), opt("unknown", "Could not confirm")],
    fields: [sel("dateBasis", "Check coverage for", [["today", "Today"], ["dates_of_service", "The dates of service (historical)"]])],
    defaults: { dateBasis: "today" },
  }),
  d({
    kind: "ver_benefits", category: "verification", title: "Verify benefits", purpose: "Checks that the plan covers this service. Active coverage does not mean a covered service.", icon: "HeartPulse", stage: "eligibility", support: "live",
    note: "Uses the benefit result of the app's eligibility check.",
    outputs: [out("ok", "Covered"), opt("issue", "Not covered"), opt("unknown", "Not confirmed")],
    fields: [sel("limitedIs", "Treat limited benefits as", [["ok", "Covered"], ["issue", "A problem"]], { advanced: true })],
    defaults: { limitedIs: "ok" },
  }),
  d({
    kind: "ver_auth_required", category: "verification", title: "Check authorization requirement", purpose: "Finds out whether this service needs an authorization from this payer.", icon: "ClipboardCheck", stage: "eligibility", support: "live",
    note: "Uses the authorization requirement from the app's eligibility check, which reads the payer's saved rules.",
    outputs: [out("required", "Required"), opt("not_required", "Not required"), opt("concurrent", "Concurrent review"), opt("unknown", "Unknown")],
    fallbacks: { concurrent: "required" },
  }),
  d({
    kind: "ver_provider_network", category: "verification", title: "Check provider network", purpose: "Checks that the clinic is in network or enrolled with this plan.", icon: "Network", stage: "eligibility", support: "live",
    note: "Uses the provider result of the app's eligibility check.",
    outputs: [out("ok", "In network"), opt("issue", "Out of network"), opt("unknown", "Not confirmed")],
  }),
  d({
    kind: "ver_existing_auth", category: "verification", title: "Check existing authorization", purpose: "Looks for an authorization already on file for this patient and service.", icon: "FileSearch", stage: "eligibility", support: "live",
    note: "Reads the authorization the case or the Case Manager ledger holds.",
    outputs: [out("found", "On file"), out("none", "None on file")],
  }),
  d({
    kind: "ver_remaining_units", category: "verification", title: "Check remaining units or days", purpose: "Checks how many units or days are left on the authorization.", icon: "Gauge", stage: "eligibility", support: "live",
    note: "Reads the units or days left on the authorization the case holds.",
    outputs: [out("ok", "Enough left"), out("issue", "Running low or none"), opt("unknown", "No authorization")],
    fields: [num("minimumLeft", "Running low at or below", { min: 0, max: 100, unit: "units or days" })],
    defaults: { minimumLeft: 2 },
  }),
  d({
    kind: "ver_coverage_change", category: "verification", title: "Check coverage change", purpose: "Looks for a change in coverage or plan since the last authorization.", icon: "ArrowRightLeft", stage: "eligibility", support: "live",
    note: "Uses the coverage result of the app's eligibility check. A plan change shows up there as inactive coverage.",
    outputs: [out("ok", "No change"), opt("issue", "Changed"), opt("unknown", "Could not confirm")],
  }),

  /* ---- clinical documentation */
  d({
    kind: "doc_collect", category: "documents", title: "Collect documents", purpose: "Gathers the documents the payer asks for. Waits when one is missing and says which.", icon: "FolderOpen", stage: "documentation", support: "live",
    note: "Uses the payer's saved document list for the service and the documents in the case.",
    fields: [checklist("required", "Required documents", { help: "Leave empty to require every document on the payer's list for this service." })],
    defaults: { required: [] },
  }),
  d({
    kind: "doc_validate", category: "documents", title: "Validate documents", purpose: "Checks that each required document is in the case and usable.", icon: "FileCheck", stage: "documentation", support: "simulated",
    note: "Reader's content checks are scripted for the sample charts. Here a document that is in the case counts as valid.", mode: "agent",
    outputs: [out("ok", "All valid"), opt("issue", "Problem found")],
    fields: [checklist("required", "Documents to check", { help: "Leave empty to check every document on the payer's list for this service." })],
    defaults: { required: [] },
  }),
  d({
    kind: "doc_extract", category: "documents", title: "Extract clinical information", purpose: "Reader pulls diagnoses, scores and dates from the chart. Nothing is invented.", icon: "ScanText", stage: "documentation", support: "simulated", mode: "agent",
    note: "Reader reads the sample charts in this demo. No live model runs.",
    fields: [multi("items", "What to pull", [["diagnoses", "Diagnoses"], ["scores", "Severity scores"], ["medications", "Medications"], ["dates", "Key dates"], ["asam", "ASAM dimensions"]])],
    defaults: { items: ["diagnoses", "scores", "dates"] },
  }),
  d({
    kind: "doc_medical_necessity", category: "documents", title: "Check medical necessity", purpose: "Matches the chart to the payer's criteria and lists what is missing.", icon: "Stethoscope", stage: "documentation", support: "simulated", mode: "agent",
    note: "Criteria and Placement work from the sample charts in this demo. The result is a recommendation for a person to review, never a payer decision.",
    fields: [rule("clinical_documentation", "Criteria to match", { advanced: true })],
  }),
  d({
    kind: "doc_summary", category: "documents", title: "Generate clinical summary", purpose: "Scribe drafts a summary from the chart, with a source for every sentence.", icon: "FileText", stage: "documentation", support: "simulated", mode: "agent",
    note: "Scribe drafts from the sample charts in this demo. Integrity checks every sentence against the chart.",
    fields: [sel("length", "Length", [["short", "Short"], ["standard", "Standard"], ["detailed", "Detailed"]])],
    defaults: { length: "standard" },
  }),
  d({
    kind: "doc_request_missing", category: "documents", title: "Request missing information", purpose: "Asks for anything that is missing and waits for it.", icon: "FileWarning", stage: "documentation", support: "simulated", mode: "manual",
    note: "Drafts the request and lists what is missing. Nothing is sent to anyone without a person.",
    fields: [area("message", "What to ask for", { rows: 3, placeholder: "For example: the signed treatment plan, dated this week" })],
    defaults: { message: "" },
  }),
  d({
    kind: "doc_packet", category: "documents", title: "Generate authorization packet", purpose: "Packet assembles the forms and attachments. Nothing is sent.", icon: "PackageCheck", stage: "preparation", support: "simulated", mode: "agent",
    note: "Packet assembles the demo packet. Waits when a required document is missing.",
    fields: [tog("coverSheet", "Add a cover sheet")],
    defaults: { coverSheet: true },
  }),

  /* ---- conditions and branching */
  d({
    kind: "if_else", category: "condition", title: "If / Else", purpose: "Follows one path when a fact is true and another when it is not.", icon: "GitBranch", stage: "intake", support: "live",
    note: "Structured conditions over the case's facts. No model decides a branch.",
    outputs: [out("yes", "Yes"), out("no", "No")],
    fields: [cond("when", "Condition"), MAX_VISITS],
    defaults: { when: group("and", { fact: "service", op: "equals", value: "RES" }) },
  }),
  d({
    kind: "cond_group", category: "condition", title: "AND / OR group", purpose: "Combines several conditions with AND or OR.", icon: "GitMerge", stage: "intake", support: "live",
    note: "Structured conditions over the case's facts. No model decides a branch.",
    outputs: [out("yes", "Yes"), out("no", "No")],
    fields: [cond("when", "Conditions"), MAX_VISITS],
    defaults: { when: group("and", { fact: "service", op: "equals", value: "RES" }, { fact: "request_type", op: "equals", value: "initial" }) },
  }),
  d({
    kind: "decision", category: "condition", title: "Decision", purpose: "Takes the first branch whose conditions hold, otherwise the Otherwise path.", icon: "Split", stage: "intake", support: "live",
    note: "Structured conditions over the case's facts, checked in order. No model decides a branch.",
    outputs: [out("else", "Otherwise")],
    fields: [{ key: "branches", label: "Branches", type: "branches" }, MAX_VISITS],
    defaults: { branches: [{ id: "branch-1", label: "Residential", when: group("and", { fact: "service", op: "equals", value: "RES" }) }] as BranchDef[] },
  }),
  d({
    kind: "wait_until", category: "condition", title: "Wait until", purpose: "Pauses the process until a condition is true.", icon: "Hourglass", stage: "review", support: "live",
    note: "The run pauses here and resumes when the facts change. Nothing in the demo runs on a timer.",
    outputs: [out("ready", "Ready"), opt("waiting", "Still waiting")],
    fields: [cond("until", "Wait until"), num("maxWaitDays", "Give up after", { min: 1, max: 90, unit: "days", advanced: true })],
    defaults: { until: group("and", { fact: "documents_complete", op: "equals", value: "true" }) },
  }),
  d({
    kind: "time_condition", category: "condition", title: "Time-based condition", purpose: "Checks how much time has passed or is left.", icon: "Clock", stage: "review", support: "live",
    note: "Counts days from the case's dates. Business days skip weekends but not holidays.",
    outputs: [out("ready", "Time is up"), opt("waiting", "Not yet")],
    fields: [sel("since", "Measure", [["waiting", "Business days waiting for the payer"], ["service", "Days since the service started"], ["expiry", "Days until the authorization ends"]]), num("days", "Days", { min: 0, max: 365, unit: "days" })],
    defaults: { since: "waiting", days: 2 },
  }),
  d({
    kind: "auth_status", category: "condition", title: "Authorization status", purpose: "Branches on the state of the existing authorization.", icon: "BadgeCheck", stage: "eligibility", support: "live",
    note: "Reads the authorization the case holds.",
    outputs: [out("active", "Active"), opt("expiring", "Expiring soon"), opt("exhausted", "Used up"), out("none", "None on file")],
    fallbacks: { exhausted: "expiring", expiring: "active" },
    fields: [num("expiringWithinDays", "Expiring means within", { min: 1, max: 60, unit: "days" })],
    defaults: { expiringWithinDays: 7 },
  }),
  d({
    kind: "payer_response", category: "condition", title: "Payer response", purpose: "Follows what the payer answered: approved, approved in part, denied, or asking for more.", icon: "Inbox", stage: "review", support: "simulated",
    note: "In the demo the payer's answer comes from the simulate-reply controls and from Test Workflow. No payer feed is connected.",
    outputs: [out("approved", "Approved"), opt("partial", "Approved in part"), out("denied", "Denied"), opt("more_info", "More information"), opt("none", "No answer yet")],
  }),
  d({
    kind: "missing_info", category: "condition", title: "Missing information", purpose: "Branches on whether any required document is missing.", icon: "ClipboardList", stage: "documentation", support: "live",
    note: "Uses the payer's saved document list and the documents in the case.",
    outputs: [out("complete", "Nothing missing"), opt("missing", "Something is missing")],
    fields: [checklist("required", "Required documents", { help: "Leave empty to require every document on the payer's list for this service." })],
    defaults: { required: [] },
  }),

  /* ---- payer rules */
  d({
    kind: "rule_submission_window", category: "rule", title: "Submission window", purpose: "Checks that the request is filed inside the payer's window.", icon: "CalendarClock", stage: "intake", support: "live", ruleGroup: "submission_windows",
    note: RULE_NODE.note, outputs: [out("ok", "Inside the window"), opt("late", "Window has passed")], fields: RULE_NODE.fields("submission_windows", "Submission window rule"), defaults: RULE_NODE.defaults,
  }),
  d({
    kind: "rule_backdating", category: "rule", title: "Backdating / retroactive", purpose: "Checks whether the payer allows a start date this far back.", icon: "CalendarX", stage: "eligibility", support: "live", ruleGroup: "backdating",
    note: RULE_NODE.note, outputs: [out("ok", "Allowed"), opt("not_allowed", "Not allowed")], fields: RULE_NODE.fields("backdating", "Backdating rule"), defaults: RULE_NODE.defaults,
  }),
  d({
    kind: "rule_no_auth", category: "rule", title: "No-authorization exemption", purpose: "Checks whether the payer says this service needs no authorization.", icon: "Ban", stage: "eligibility", support: "live", ruleGroup: "auth_requirements",
    note: RULE_NODE.note, outputs: [out("required", "Authorization needed"), opt("exempt", "Exempt")], fields: RULE_NODE.fields("auth_requirements", "Authorization requirement rule"), defaults: RULE_NODE.defaults,
  }),
  d({
    kind: "rule_continued_stay", category: "rule", title: "Continued-stay review", purpose: "Checks the review cadence and the filing lead time for an ongoing stay.", icon: "Repeat", stage: "preparation", support: "live", ruleGroup: "concurrent_reauth",
    note: RULE_NODE.note, outputs: [out("ok", "On schedule"), opt("late", "Late or too close")], fallbacks: { late: "ok" }, fields: RULE_NODE.fields("concurrent_reauth", "Review cadence rule"), defaults: RULE_NODE.defaults,
  }),
  d({
    kind: "rule_units_duration", category: "rule", title: "Units & duration", purpose: "Checks the units or days asked for against the payer's limit.", icon: "Gauge", stage: "preparation", support: "live", ruleGroup: "concurrent_reauth",
    note: RULE_NODE.note, outputs: [out("ok", "Within the limit"), opt("over", "Over the limit")], fields: RULE_NODE.fields("concurrent_reauth", "Units and duration rule"), defaults: RULE_NODE.defaults,
  }),
  d({
    kind: "rule_clinical_criteria", category: "rule", title: "Clinical criteria", purpose: "Checks that the chart holds the evidence the payer's criteria ask for.", icon: "ListChecks", stage: "documentation", support: "simulated", ruleGroup: "clinical_documentation",
    note: "Criteria matches the chart to the criteria in this demo. This step checks that the documents are in the case and states the criteria; it is a recommendation, not a payer decision.",
    outputs: [out("met", "Evidence present"), opt("gap", "Gap")], fields: RULE_NODE.fields("clinical_documentation", "Clinical criteria rule"), defaults: RULE_NODE.defaults,
  }),
  d({
    kind: "rule_submission_method", category: "rule", title: "Submission method", purpose: "Picks portal, fax or phone, and falls back when the portal is down.", icon: "Route", stage: "review", support: "live", ruleGroup: "submission_methods",
    note: RULE_NODE.note, outputs: [opt("portal", "Portal"), opt("fax", "Fax"), opt("phone", "Phone")], fields: RULE_NODE.fields("submission_methods", "Submission method rule"), defaults: RULE_NODE.defaults,
  }),
  d({
    kind: "rule_appeal_deadline", category: "rule", title: "Appeal deadline", purpose: "Checks that a written appeal can still be filed.", icon: "Gavel", stage: "review", support: "live", ruleGroup: "appeals_p2p",
    note: RULE_NODE.note, outputs: [out("ok", "Inside the deadline"), opt("expired", "Deadline passed")], fields: RULE_NODE.fields("appeals_p2p", "Appeal rule"), defaults: RULE_NODE.defaults,
  }),
  d({
    kind: "rule_p2p", category: "rule", title: "Peer-to-peer", purpose: "Checks that a peer-to-peer call can still be asked for.", icon: "Handshake", stage: "review", support: "live", ruleGroup: "appeals_p2p",
    note: RULE_NODE.note, outputs: [out("ok", "Window open"), opt("closed", "Window closed")], fields: RULE_NODE.fields("appeals_p2p", "Peer-to-peer rule"), defaults: RULE_NODE.defaults,
  }),

  /* ---- actions */
  d({
    kind: "act_task", category: "action", title: "Create task", purpose: "Adds a task for a person.", icon: "ListTodo", stage: "preparation", support: "simulated", mode: "manual",
    note: "Recorded in the trace. This demo has no task list behind it.",
    fields: [text("taskTitle", "Task"), sel("assignTo", "For", ROLES), num("dueInDays", "Due in", { min: 0, max: 60, unit: "days" })],
    defaults: { taskTitle: "", assignTo: "coordinator", dueInDays: 1 },
  }),
  d({
    kind: "act_notify", category: "action", title: "Send notification", purpose: "Tells a person something needs them.", icon: "Bell", stage: "preparation", support: "simulated",
    note: "Recorded in the trace. No message leaves the app.",
    fields: [sel("to", "Tell", ROLES), area("message", "Message", { rows: 2 })],
    defaults: { to: "case_manager", message: "" },
  }),
  d({
    kind: "act_document", category: "action", title: "Generate document", purpose: "Drafts a letter or form for a person to review.", icon: "FilePen", stage: "preparation", support: "simulated", mode: "agent",
    note: "Packet and Scribe draft from templates in this demo. A person reviews before anything is used.",
    fields: [sel("document", "Document", [["cover_sheet", "Cover sheet"], ["notice_of_admission", "Notice of admission"], ["medical_necessity", "Letter of medical necessity"], ["appeal_letter", "Appeal letter"], ["other", "Other"]])],
    defaults: { document: "cover_sheet" },
  }),
  d({
    kind: "act_portal_prep", category: "action", title: "Prepare portal submission", purpose: "Fills in the payer's portal form. A person approves before anything is sent.", icon: "Globe", stage: "review", support: "simulated", mode: "agent", payerFacing: true,
    note: "Navigator fills a demo form. Nothing leaves this app. Needs a person's approval, always.",
    fields: [tog("transmit", "Send it once approved", { help: "Off means the packet is prepared and a person submits it." }), area("notes", "Notes for the person who submits", { rows: 2, advanced: true })],
    defaults: { transmit: false, notes: "" },
  }),
  d({
    kind: "act_fax_prep", category: "action", title: "Prepare fax packet", purpose: "Builds the fax packet with a cover sheet. A person approves before anything is sent.", icon: "Printer", stage: "review", support: "simulated", mode: "agent", payerFacing: true,
    note: "Packet builds a demo fax packet. Nothing is faxed. Needs a person's approval, always.",
    fields: [tog("transmit", "Send it once approved", { help: "Off means the packet is prepared and a person faxes it." }), tog("coverSheet", "Add a cover sheet")],
    defaults: { transmit: false, coverSheet: true },
  }),
  d({
    kind: "act_call_prep", category: "action", title: "Prepare phone call", purpose: "Writes what Caller says and logs. A person approves before the call.", icon: "PhoneCall", stage: "review", support: "simulated", mode: "agent", payerFacing: true,
    note: "Caller prepares the script. No call is placed in this demo. Needs a person's approval, always.",
    fields: [area("script", "What Caller says", { rows: 4, placeholder: "Ask for the provider line. Give the member ID. Ask whether the request was received and who you are speaking with." }), tog("transmit", "Place the call once approved", { help: "Off means the script is prepared and a person calls." })],
    defaults: { script: "", transmit: false },
  }),
  d({
    kind: "act_human_approval", category: "action", title: "Request human approval", purpose: "Stops until a person approves. Nothing goes to a payer before this.", icon: "UserCheck", stage: "review", support: "live", mode: "manual",
    note: "The sign-off gate in New case is real: only a clinician signs, and nothing is sent until they do.",
    outputs: [out("next", "Approved"), opt("rejected", "Declined")],
    fields: [sel("approver", "Who approves", [["clinician", "A clinician"], ["coordinator", "An authorization coordinator"], ["manager", "A manager"]]), text("what", "What they approve", { placeholder: "Review the packet before it goes to the payer" })],
    defaults: { approver: "clinician", what: "Review the request before anything is sent" },
  }),
  d({
    kind: "act_update_status", category: "action", title: "Update authorization status", purpose: "Sets the status the request shows.", icon: "Flag", stage: "review", support: "simulated",
    note: "Recorded in the trace. Statuses on the Dashboard follow the app's own events.",
    fields: [sel("status", "Status", STATUSES)],
    defaults: { status: "submitted" },
  }),
  d({
    kind: "act_followup", category: "action", title: "Schedule follow-up", purpose: "Books a check-in after a number of days.", icon: "CalendarCheck", stage: "review", support: "simulated",
    note: "Recorded in the trace. Cadence books real reviews in Case Manager; this step does not.",
    fields: [num("afterDays", "After", { min: 0, max: 60, unit: "days" }), sel("dayType", "Counted in", DAY_TYPE), sel("how", "How", [["task", "Task for a person"], ["phone", "Phone call"], ["portal", "Portal check"]])],
    defaults: { afterDays: 2, dayType: "business", how: "task" },
  }),
  d({
    kind: "act_escalate", category: "action", title: "Escalate case", purpose: "Hands the case to someone senior.", icon: "Siren", stage: "review", support: "simulated", mode: "manual",
    note: "Recorded in the trace. No one is notified outside the app.",
    fields: [sel("to", "Escalate to", ROLES), text("reason", "Reason")],
    defaults: { to: "manager", reason: "" },
  }),
  d({
    kind: "act_appeal", category: "action", title: "Create appeal", purpose: "Opens an appeal or reconsideration for a person to review.", icon: "Gavel", stage: "review", support: "simulated", mode: "agent", payerFacing: true,
    note: "Advocate drafts the appeal in this demo. Nothing is filed without a person. Needs a person's approval, always.",
    fields: [sel("kind", "Kind", [["reconsideration", "Reconsideration"], ["p2p", "Peer-to-peer call"], ["written", "Written appeal"]])],
    defaults: { kind: "reconsideration" },
  }),
  d({
    kind: "act_update_case_manager", category: "action", title: "Update Case Manager", purpose: "Writes a line to the case's history and sets its next review.", icon: "ClipboardPen", stage: "review", support: "live",
    note: "Writes a real line to the case's history.",
    fields: [text("note", "History line", { placeholder: "Approved. Next review booked." }), tog("scheduleNextReview", "Book the next review", { advanced: true })],
    defaults: { note: "", scheduleNextReview: false },
  }),

  /* ---- agents (FLO's named agents; the prompt is the whole configuration) */
  agentDef("ag_document_review", "reader", "Document review", "Reader reviews each document and lists what is missing.", "ScanSearch", "documentation",
    prompts("reader", "Review the documents in {{clinical_documents}} for {{patient_name}}'s {{authorization_type}} request to {{payer_name}} for {{service_type}}. For each document say what it shows and what is missing. Use only what the documents say. Do not guess.", "A checklist of documents with what each shows and what is missing", ["clinical_documents", "payer_rules"])),
  agentDef("ag_clinical_summary", "scribe", "Clinical summary", "Scribe drafts a summary of the chart with a source for every sentence.", "FileText", "documentation",
    prompts("scribe", "Write a short clinical summary for {{patient_name}}'s {{service_type}} request from {{clinical_documents}}. Cite the document each sentence comes from. Leave a gap and say so when the chart does not say.", "A summary with a source for each sentence", ["clinical_documents", "service_type"])),
  agentDef("ag_medical_necessity", "placement", "Medical necessity review", "Placement matches the chart to the level of care the payer asks for.", "Stethoscope", "documentation",
    prompts("placement", "Compare {{clinical_documents}} with {{payer_rules}} for {{service_type}} at {{payer_name}}. List each criterion, whether the chart supports it, and the document that shows it. Say what the chart does not show. Do not invent clinical evidence.", "Each criterion with supported or not supported and its source", ["clinical_documents", "payer_rules"], true)),
  agentDef("ag_authorization_prep", "packet", "Authorization preparation", "Packet prepares the request for review. Nothing is sent.", "PackageCheck", "preparation",
    prompts("packet", "Prepare the {{authorization_type}} request for {{patient_name}}: {{service_type}} starting {{requested_start_date}}, {{requested_units}} requested, with {{existing_authorization}} in mind. Follow {{payer_rules}}. List anything still missing. Do not send anything.", "A draft request and a list of anything missing", ["clinical_documents", "payer_rules", "requested_units", "requested_start_date"])),
  agentDef("ag_rule_interpretation", "criteria", "Payer rule interpretation", "Criteria explains what a payer rule means for this case in plain words.", "BookOpen", "eligibility",
    prompts("criteria", "Read {{payer_rules}} for {{payer_name}} and explain in plain words what they mean for a {{authorization_type}} request for {{service_type}}. Say which rules are unverified. Do not state a rule that is not in {{payer_rules}}.", "A short plain-language explanation that names unverified rules", ["payer_rules"])),
  agentDef("ag_call_prep", "caller", "Call preparation", "Caller prepares what to ask and which details to have ready.", "PhoneCall", "preparation",
    prompts("caller", "Prepare a call to {{payer_name}} about {{patient_name}}'s {{authorization_type}} request. List what to ask, the details to have ready, and the documents to say will be sent. Do not agree to any change.", "A short call script and a list of details to have ready", ["payer_rules", "requested_start_date"])),
  agentDef("ag_missing_info", "scrubber", "Missing information detection", "Scrubber looks for anything the payer will ask for that the case lacks.", "FileWarning", "documentation",
    prompts("scrubber", "Compare {{clinical_documents}} with what {{payer_name}} asks for in {{payer_rules}} for {{service_type}}. List every missing or unclear item and why the payer will ask for it. Do not fill gaps from memory.", "A list of missing or unclear items with the reason for each", ["clinical_documents", "payer_rules"])),
  agentDef("ag_custom", "custom", "Custom agent", "An agent with instructions you write. A person reviews its answer.", "Wand2", "preparation",
    prompts("custom", "Describe what the agent should do with {{clinical_documents}} for {{patient_name}}. Say what it must not do.", "Say what the answer should look like", ["clinical_documents"], true)),

  /* ---- integrations (credentials are never entered here: "Managed outside this app") */
  d({
    kind: "int_emr_sync", category: "integration", title: "EMR sync", purpose: "Pulls the latest chart documents from a connected record system. Read only.", icon: "Database", stage: "intake", support: "not_configured",
    note: "Connected only when EMR Connect really has a connected system. Credentials are managed outside this app.",
    fields: [sel("action", "What to do", [["pull_documents", "Pull chart documents (read only)"], ["pull_demographics", "Pull patient details (read only)"]]), sel("fallback", "If it is not connected", FALLBACK)],
    defaults: { action: "pull_documents", fallback: "manual" },
  }),
  integrationDef("int_payer_portal", "Payer portal", "Checks status or submits through the payer's portal. A person approves first.", "Globe", "simulated", "Navigator works a demo portal. Nothing leaves this app. Credentials are managed outside this app.", [["check_status", "Check the status"], ["submit", "Submit the request"], ["upload", "Upload documents"]], "review"),
  integrationDef("int_api", "API request", "Calls another system's API. A person approves first.", "Code", "not_configured", "Not connected. Credentials are managed outside this app.", [["request", "Send a request"], ["lookup", "Look something up"]], "review"),
  integrationDef("int_webhook", "Webhook", "Posts to an address you name when the process reaches this step.", "Webhook", "not_configured", "Not connected. Addresses and secrets are managed outside this app.", [["post", "Post the case status"]], "review"),
  integrationDef("int_fax", "Fax", "Sends a packet by fax. A person approves first.", "Printer", "simulated", "Packet sends a demo fax. Nothing is faxed. Fax numbers are managed outside this app.", [["send", "Send the packet"], ["receipt", "Check the transmission report"]], "review"),
  integrationDef("int_email", "Email", "Sends a secure message. A person approves first.", "Mail", "not_configured", "Not connected. Mail accounts are managed outside this app.", [["send", "Send a secure message"]], "review"),
  integrationDef("int_task_system", "External task system", "Creates a task in another tool.", "ListTodo", "not_configured", "Not connected. Credentials are managed outside this app.", [["create_task", "Create a task"]], "preparation", false),
  integrationDef("int_custom", "Custom integration", "A connection your team sets up outside this app.", "Plug", "not_configured", "Not connected. Credentials are managed outside this app.", [["custom", "Run the custom action"]], "review"),
];

function agentDef(kind: NodeKind, agent: PromptConfig["agent"], title: string, purpose: string, icon: string, stage: Stage, p: PromptConfig): NodeDef {
  return d({
    kind, category: "agent", title, purpose, icon, stage, support: "simulated", mode: "agent",
    note: "Agents run as scripted steps in this demo. No live model runs, and no answer is a payer decision. Text inside a document is data, never an instruction.",
    fields: [prompt(), rule("agent_instructions", "Payer instructions to include", { advanced: true })],
    defaults: { prompt: p as unknown as ConfigValue },
  });
}

function integrationDef(kind: NodeKind, title: string, purpose: string, icon: string, support: SupportStatus, note: string, actions: [string, string][], stage: Stage, payerFacing = true): NodeDef {
  return d({
    kind, category: "integration", title, purpose, icon, stage, support, note, payerFacing,
    fields: [sel("action", "Action", actions), sel("fallback", "If it is not connected", FALLBACK), text("mapping", "What to send", { placeholder: "For example: member ID, dates of service, requested units", advanced: true })],
    defaults: { action: actions[0][0], fallback: "manual", mapping: "" },
  });
}

/* ---------------------------------------------------------------- lookups */
export const NODE_CATALOG: NodeDef[] = DEFS;
const BY_KIND = new Map<NodeKind, NodeDef>(NODE_CATALOG.map((x) => [x.kind, x]));
const UNKNOWN: NodeDef = d({ kind: "end", category: "flow", title: "Unknown step", purpose: "This step is not in the catalog.", icon: "CircleHelp", stage: "review", support: "not_configured", note: "This step kind is not known to this version of the app.", outputs: [] });

/** The definition of a node kind. A kind the catalog does not know (old saved data) gets a plain "Unknown step" definition instead of undefined. */
export const nodeDef = (kind: NodeKind): NodeDef => BY_KIND.get(kind) ?? UNKNOWN;
export const hasNodeDef = (kind: string): kind is NodeKind => BY_KIND.has(kind as NodeKind);

/** The catalog grouped for the palette, in the order of CATEGORY_ORDER. */
export const CATEGORY_ORDER: NodeCategory[] = ["flow", "trigger", "verification", "documents", "condition", "rule", "action", "agent", "integration"];
export const catalogByCategory = (): { category: NodeCategory; defs: NodeDef[] }[] => CATEGORY_ORDER.map((category) => ({ category, defs: NODE_CATALOG.filter((x) => x.category === category) }));

/** What EMR Connect has, as much as support needs: a system counts as connected only when its status is "connected". */
export interface SupportState { emrSystems?: readonly { status: string }[] }

/** How real a node is right now. The catalog's `support` is fixed except for EMR Sync, which is live only when EMR Connect really has a connected system and not configured otherwise. */
export function supportOf(kind: NodeKind, state?: SupportState): SupportStatus {
  if (kind === "int_emr_sync") return state?.emrSystems?.some((s) => s.status === "connected") ? "live" : "not_configured";
  return nodeDef(kind).support;
}

/** The support of every integration node kind, for the validator and the engine. */
export type IntegrationStatus = Partial<Record<NodeKind, SupportStatus>>;
export const INTEGRATION_KINDS: NodeKind[] = NODE_CATALOG.filter((x) => x.category === "integration").map((x) => x.kind);
export function integrationStatus(state?: SupportState): IntegrationStatus {
  return Object.fromEntries(INTEGRATION_KINDS.map((k) => [k, supportOf(k, state)])) as IntegrationStatus;
}

/** True when the step reaches outside this app. Such a step always needs a person's approval. */
export const isPayerFacing = (kind: NodeKind): boolean => !!nodeDef(kind).payerFacing;

/* ---------------------------------------------------------------- exits */
export interface Exit { handle: Handle; label: string; optional?: boolean }

/** The branches a Decision holds (the field of type "branches" is stored under `branches`). */
export function branchesOf(node: Pick<WfNode, "config">): BranchDef[] {
  const v = node.config.branches;
  return Array.isArray(v) && v.every((b) => typeof b === "object" && b !== null && "when" in b) ? (v as BranchDef[]) : [];
}

/** The exits a node shows: a Decision has one per branch plus Otherwise; End has none; every other node follows the catalog. */
export function outputsOf(node: Pick<WfNode, "kind" | "config">): Exit[] {
  if (node.kind === "end") return [];
  if (node.kind === "decision") return [...branchesOf(node).map((b) => ({ handle: b.id, label: b.label || "Branch" })), { handle: "else", label: "Otherwise" }];
  return nodeDef(node.kind).outputs;
}

/** The exits that must be connected before a workflow can be published. */
export const requiredOutputs = (node: Pick<WfNode, "kind" | "config">): Exit[] => outputsOf(node).filter((o) => !o.optional);

/* ---------------------------------------------------------------- new nodes */
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
export const defaultsFor = (kind: NodeKind): Record<string, ConfigValue> => clone(nodeDef(kind).defaults);

/** A node of this kind with the catalog's title, purpose, mode, stage and settings. Steps that reach out to the payer start with approval on, and the engine will not run them without it. */
export function createNode(kind: NodeKind, id: string, at: { x: number; y: number } = { x: 0, y: 0 }, over: Partial<Omit<WfNode, "id" | "kind">> = {}): WfNode {
  const def = nodeDef(kind);
  return {
    id,
    kind,
    title: def.title,
    purpose: def.purpose,
    x: Math.round(at.x),
    y: Math.round(at.y),
    mode: def.defaultMode,
    stage: def.defaultStage,
    config: clone(def.defaults),
    ruleRefs: [],
    approval: !!def.payerFacing || kind === "act_human_approval",
    onError: "manual_review",
    ...over,
  };
}

/** The prompt of an agent node, or undefined for any other node. */
export function promptOf(node: Pick<WfNode, "config">): PromptConfig | undefined {
  const p = node.config.prompt;
  return p && typeof p === "object" && !Array.isArray(p) && "agent" in p ? (p as PromptConfig) : undefined;
}
