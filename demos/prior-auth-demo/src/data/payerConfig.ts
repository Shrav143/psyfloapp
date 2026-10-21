import type { CaseDraft } from "./cases";
import { PAYERS } from "./seed";
import type { AgentKey, PayerSummary, Program, PsyRequest } from "./types";

/* Payers: the shapes behind the Process, Rules, Documents and Changes tabs. Seed content is in payerConfigSeed.ts. */

export type StepKind = "check" | "file" | "portal" | "phone";
export const STEP_KINDS: StepKind[] = ["check", "file", "portal", "phone"];
export const STEP_KIND_LABEL: Record<StepKind, string> = { check: "Checklist step", file: "File step", portal: "Portal step", phone: "Phone step" };

/** What a branch can test: the program, the request type, the portal, how long a request has waited, or the payer's answer. */
export type CondKind = "program" | "request" | "portal" | "waiting" | "answer";
export interface Condition { kind: CondKind; value: string }
export const COND_KINDS: { value: CondKind; label: string; values: string[] }[] = [
  { value: "program", label: "Program", values: ["Residential 3.5", "IOP", "PHP", "Detox", "IOP or PHP"] },
  { value: "request", label: "Request type", values: ["an initial request", "a continued-stay request", "a retro-authorization", "a recertification", "an appeal"] },
  { value: "portal", label: "Portal status", values: ["down", "slow", "asking for a new sign-in"] },
  { value: "waiting", label: "Time waiting", values: ["24 hours", "2 business days", "3 business days"] },
  { value: "answer", label: "Payer answer", values: ["approves", "denies or partly approves", "asks for information"] },
];

/** "program is Residential 3.5", "no status after 2 business days". Shown after a bold "If". */
export function conditionText(c: Condition): string {
  switch (c.kind) {
    case "program": return `program is ${c.value}`;
    case "request": return `request is ${c.value}`;
    case "portal": return `portal is ${c.value}`;
    case "waiting": return `no status after ${c.value}`;
    case "answer": return `payer ${c.value}`;
  }
}

export interface Branch { id: string; cond: Condition; kind: StepKind; text: string }
export interface WorkflowStep {
  id: string;
  title: string;
  kind: StepKind;
  agents: AgentKey[];
  text: string;
  typical: string;
  branches: Branch[];
}
export interface Workflow { version: number; editedOn: string; steps: WorkflowStep[] }

export interface ReachLine { id: "portal" | "phone" | "fax"; title: string; text: string }

export type RuleId = "windows" | "backdating" | "noauth" | "p2p";
export const RULE_TITLE: Record<RuleId, string> = { windows: "Submission windows", backdating: "Backdating", noauth: "No authorization needed", p2p: "Peer-to-peer and appeals" };
export interface Rule { id: RuleId; lines: string[]; used: AgentKey[]; confirmed: string }

export interface DocItem { id: string; title: string; requirement: string }
export type DocLists = Record<Program, DocItem[]>;

export interface ChangeEntry { id: string; date: string; title: string; text: string }

/** A payer change waiting for a person: acknowledge first, then update the payer's open drafts (read live, see openDrafts). */
export interface PendingChange {
  id: string;
  title: string;
  text: string;
  effective: string;
  /** The agents that redraft. */
  agents: AgentKey[];
  /** Documents the change adds to the payer's list once drafts are updated. */
  docAdds: { program: Program; item: DocItem }[];
  acknowledged?: { by: string; at: number };
}

/** What Historian suggests after "Re-learn from decisions": one more branch under a step. Never applied on its own. */
export interface Proposal { id: string; title: string; text: string; stepTitle: string; cond: Condition; kind: StepKind; result: string }

export interface PayerFacts { approvedNote: string; typicalNote: string; noticeDue: string; noticeNote: string; backup: string }

export interface PayerConfig {
  planLine: string;
  rulesVersion: string;
  checkedOn: string;
  reachedBy: string;
  facts: PayerFacts;
  reach: ReachLine[];
  caller: { text: string; confirmed: string };
  workflow: Workflow;
  rules: Rule[];
  docs: DocLists;
  changes: ChangeEntry[];
  pending: PendingChange | null;
  proposals: Proposal[];
  /** Titles of proposals the user dismissed, so Historian does not offer them again. */
  dismissed: string[];
  /** Edits saved since open drafts were last updated. */
  unapplied: number;
}

/** One line of an edit log: what was edited, the old text and the new text. */
export interface LogChange { what: string; before: string; after: string }

export type EditArea = "Workflow" | "Rules" | "Documents" | "Caller instructions" | "Payer details";
export interface EditLogEntry {
  id: string;
  payerId: string;
  at: number;
  user: string;
  area: EditArea;
  what: string;
  before: string;
  after: string;
  reason: string;
}

/** A payer added with "Add a payer". It has no history yet, so its figures are benchmark estimates. */
export interface CustomPayer {
  id: string;
  name: string;
  shortName: string;
  type: string;
  group: PayerSummary["group"];
  reachedBy: string;
  programs: Program[];
}

/** What the rest of the app shows for an added payer: it has no history yet, so the figures are benchmark estimates. */
export const customToSummary = (c: CustomPayer): PayerSummary => ({ id: c.id, name: c.name, shortName: c.shortName, type: c.type, group: c.group, reachedBy: c.reachedBy, approvedAsAsked: 70, avgDecisionDays: 2.5, typicalDecisionDays: 2.5, denied30d: 0, infoAsks30d: 0 });

export const PAYER_GROUPS: PayerSummary["group"][] = ["Ohio Medicaid", "Commercial", "Medicare Advantage", "Behavioral carve-out"];
export const USER_NAME = "Jordan Perez";

export interface AddPayerFields { name: string; type: string; group: PayerSummary["group"]; reach: string[]; programs: Program[] }

/** The ways a payer is reached, in the order they are written. */
export const REACH_ROUTES = ["Portal", "Phone", "Fax"];
/** Every value "Reached by" can hold: each combination of the three routes. The edit form and Add a payer both stay inside this list. */
export const REACHED_BY: string[] = ["Portal", "Phone", "Fax", "Portal and phone", "Portal and fax", "Phone and fax", "Portal, phone and fax"];
/** "Portal and fax" from ["Fax", "Portal"]: always in REACH_ROUTES order, so the result is always one of REACHED_BY. */
export function reachedByOf(reach: string[]): string {
  const list = REACH_ROUTES.filter((r) => reach.includes(r)).map((r, i) => (i ? r.toLowerCase() : r));
  if (list.length <= 1) return list[0] ?? "Phone";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

const squash = (s: string): string => s.trim().replace(/\s+/g, " ").toLowerCase();
/** The payer a new name would duplicate, ignoring capitals and extra spaces. Short names count too, because the Dashboard shows them. */
export function payerWithName(name: string, custom: CustomPayer[]): { id: string; name: string } | undefined {
  const n = squash(name);
  return [...PAYERS, ...custom].find((p) => squash(p.name) === n || squash(p.shortName) === n);
}

/** A draft for one payer that has not been sent yet: what an edit or a payer change can redraft. */
export interface OpenDraft {
  /** The case id, such as R-1042. */
  id: string;
  /** "J.M., 34" */
  patient: string;
  program: Program | null;
  /** False for a case saved in New case that has no Dashboard row yet. */
  onDashboard: boolean;
}
export const OPEN_DRAFT_STATUS = "Draft, not yet sent";

/** Read from the live Dashboard requests and New case drafts, never from a fixed list.
    A draft is a request still in Preparing, or a New case draft that is saved and not sent. A request the payer already has (Received and later, and an answer to the payer's
    question on an Info requested one) is left out: sent requests keep what they were sent with. */
export function openDrafts(requests: PsyRequest[], caseDrafts: CaseDraft[], payerId: string): OpenDraft[] {
  const out: OpenDraft[] = requests
    .filter((r) => r.payerId === payerId && r.stage === "preparing")
    .map((r) => ({ id: r.id, patient: `${r.patient.initials}, ${r.patient.age}`, program: r.program, onDashboard: true }));
  for (const d of caseDrafts) {
    if (d.payerId !== payerId || !d.saved || d.sent || !d.caseId) continue;
    if (requests.some((r) => r.id === d.caseId)) continue;
    out.push({ id: d.caseId, patient: d.patient.age ? `${d.patient.initials}, ${d.patient.age}` : d.patient.initials, program: d.program, onDashboard: false });
  }
  return out;
}
