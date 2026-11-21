import { DEMO_TODAY } from "./format";

export type AgentId =
  | "verify"
  | "navigator"
  | "packet"
  | "sentinel"
  | "caller"
  | "advocate"
  | "analyst";

export type Agent = {
  id: AgentId;
  name: string;
  role: string;
  does: string[];
  never: string;
  runsToday: number;
  lastRun: string;
  reliability: number;
  icon:
    | "shield"
    | "compass"
    | "file"
    | "radar"
    | "phone"
    | "scale"
    | "sparkles";
};

export const AGENTS: Agent[] = [
  {
    id: "verify",
    name: "Verify",
    role: "Eligibility & benefits",
    does: [
      "Runs 270/271 and portal checks on a rolling 7-day window",
      "Reads MH benefit detail: carve-outs, daily limits, COB",
      "Writes a one-line action for every exception",
    ],
    never: "Never changes coverage on the chart without a human confirming.",
    runsToday: 60,
    lastRun: `${DEMO_TODAY} 06:10`,
    reliability: 0.99,
    icon: "shield",
  },
  {
    id: "packet",
    name: "Packet",
    role: "Documentation assembly",
    does: [
      "Pulls assessments, treatment plan and records from Sunwave",
      "Checks each payer's required elements and dates",
      "Builds the criteria crosswalk cover sheet",
    ],
    never: "Never writes clinical content; it assembles what clinicians wrote.",
    runsToday: 11,
    lastRun: `${DEMO_TODAY} 08:42`,
    reliability: 0.97,
    icon: "file",
  },
  {
    id: "navigator",
    name: "Navigator",
    role: "Portal submission & status",
    does: [
      "Files signed requests in Availity or the payer portal",
      "Polls every open request daily and captures the decision letter",
      "Writes reference numbers and dates back to the ledger",
    ],
    never: "Never submits anything that has not been signed by a clinician.",
    runsToday: 23,
    lastRun: `${DEMO_TODAY} 09:15`,
    reliability: 0.98,
    icon: "compass",
  },
  {
    id: "sentinel",
    name: "Sentinel",
    role: "Payer policy watch",
    does: [
      "Monitors MCO bulletins, provider manuals and UM guidelines",
      "Diffs criteria and unit caps against the rules you file under",
      "Flags renewals affected by a change",
    ],
    never: "Never rewrites a rule without you acknowledging the change.",
    runsToday: 5,
    lastRun: `${DEMO_TODAY} 05:30`,
    reliability: 0.95,
    icon: "radar",
  },
  {
    id: "caller",
    name: "Caller",
    role: "Payer phone follow-up",
    does: [
      "Navigates IVR trees and holds so staff do not",
      "Confirms fax receipt, asks for the criteria behind a denial",
      "Records, transcribes and summarises every call",
    ],
    never: "Never negotiates clinical questions; escalates to a clinician.",
    runsToday: 4,
    lastRun: `${DEMO_TODAY} 10:05`,
    reliability: 0.93,
    icon: "phone",
  },
  {
    id: "advocate",
    name: "Advocate",
    role: "Denials & appeals drafting",
    does: [
      "Checks whether a denial is valid against the payer's own policy",
      "Drafts cover letter and appeal letter from the record",
      "Tracks deadlines for every level of appeal",
    ],
    never: "Never sends an appeal; the clinician signs first.",
    runsToday: 3,
    lastRun: `${DEMO_TODAY} 07:50`,
    reliability: 0.96,
    icon: "scale",
  },
  {
    id: "analyst",
    name: "Analyst",
    role: "Ask Psyflo",
    does: [
      "Answers questions over the authorization ledger",
      "Builds the leakage report continuously",
      "Explains every number back to its source rows",
    ],
    never: "Never predicts approval odds; it reports observed history.",
    runsToday: 17,
    lastRun: `${DEMO_TODAY} 10:30`,
    reliability: 1,
    icon: "sparkles",
  },
];

export type RunStep = {
  label: string;
  state: "done" | "active" | "pending" | "blocked";
  detail?: string;
  ms?: number;
};

export type AgentRun = {
  id: string;
  agentId: AgentId;
  title: string;
  subject: string;
  startedAt: string;
  status: "completed" | "running" | "needs_human";
  sourcesChecked: number;
  steps: RunStep[];
  question?: { text: string; options: string[] };
  outcome: string;
};

export const SUBMISSION_SCRIPT: RunStep[] = [
  {
    label: "Verify signature and packet completeness",
    state: "pending",
    detail: "Signed by clinician · 9 of 9 documents",
    ms: 900,
  },
  {
    label: "Open Availity with the Harbor service account",
    state: "pending",
    detail: "Session vault · MFA satisfied",
    ms: 1200,
  },
  {
    label: "Select payer and authorization request form",
    state: "pending",
    detail: "Payer-specific TRP form",
    ms: 1100,
  },
  {
    label: "Fill member, provider and service fields from Sunwave",
    state: "pending",
    detail: "Member ID, NPI, EIN, H2020, ICD-10, start/end dates, units",
    ms: 1600,
  },
  {
    label: "Upload packet in the payer's required split",
    state: "pending",
    detail: "Assessments · external records · cover sheet",
    ms: 1500,
  },
  {
    label: "Submit and capture the reference number",
    state: "pending",
    detail: "Screenshot saved to the ledger",
    ms: 1300,
  },
  {
    label: "Schedule status polling",
    state: "pending",
    detail: "Daily until decided · 7-day rule clock started",
    ms: 700,
  },
];
