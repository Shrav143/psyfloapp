import type { AgentKey, PayerSummary, Program } from "./types";

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

/** A payer change waiting for a person: acknowledge first, then update the drafts it affects. */
export interface PendingChange {
  id: string;
  title: string;
  text: string;
  effective: string;
  /** Request ids of the drafts it affects. */
  affects: string[];
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

export const PAYER_GROUPS: PayerSummary["group"][] = ["Ohio Medicaid", "Commercial", "Medicare Advantage", "Behavioral carve-out"];
export const USER_NAME = "Jordan Perez";

export interface AddPayerFields { name: string; type: string; group: PayerSummary["group"]; reach: string[]; programs: Program[] }
