import type { AgentRun } from "./agents";
import { addDays, DEMO_TODAY } from "./format";

/** Recorded agent runs shown on Today and the Agents screen, plus the integration roster. */
export const AGENT_RUNS: AgentRun[] = [
  {
    id: "run-1",
    agentId: "navigator",
    title: "Status poll · 14 open requests",
    subject: "All payers",
    startedAt: `${DEMO_TODAY} 09:15`,
    status: "completed",
    sourcesChecked: 19,
    steps: [
      {
        label: "Availity: 9 requests checked",
        state: "done",
        detail: "2 decided since yesterday · letters captured",
      },
      {
        label: "WellCare portal: 4 requests checked",
        state: "done",
        detail: "1 pended for information",
      },
      {
        label: "Novitas: 1 Medicare rejection still pending",
        state: "done",
        detail: "Day 14 · dual-eligible HBH-1049",
      },
      {
        label: "Ledger updated",
        state: "done",
        detail: "3 events appended, nothing overwritten",
      },
    ],
    outcome:
      "2 decisions captured, 1 info request routed to Heather M., 1 past the 7-day rule flagged on the board.",
  },
  {
    id: "run-2",
    agentId: "caller",
    title: "Receipt confirmation · WellCare appeal",
    subject: "HBH-1077",
    startedAt: `${DEMO_TODAY} 10:05`,
    status: "completed",
    sourcesChecked: 3,
    steps: [
      { label: "Dial provider services line", state: "done" },
      {
        label: "Navigate IVR (4 menus)",
        state: "done",
        detail: "Appeals status",
      },
      { label: "Hold", state: "done", detail: "34 minutes" },
      {
        label: "Confirm receipt with representative",
        state: "done",
        detail: "Logged 14 Jul · due 13 Aug",
      },
      {
        label: "Transcript, summary and next step written to the appeal",
        state: "done",
      },
    ],
    outcome:
      "Packet confirmed on file. Decision due date captured. No additional form required.",
  },
  {
    id: "run-3",
    agentId: "packet",
    title: "Renewal packet · HBH-1408",
    subject: "Humana",
    startedAt: `${DEMO_TODAY} 08:42`,
    status: "needs_human",
    sourcesChecked: 11,
    steps: [
      {
        label: "Pull current assessments from Sunwave",
        state: "done",
        detail: "LOCUS 04 Sep · treatment plan 02 Sep",
      },
      {
        label: "Check Humana required elements",
        state: "done",
        detail: "8 of 9 present",
      },
      {
        label: "Psychiatric evaluation older than 12 months",
        state: "blocked",
        detail: "Dated 2025-08-02 · payer rule: within 12 months",
      },
      { label: "Draft cover sheet", state: "pending" },
    ],
    question: {
      text: "The psychiatric evaluation on file is 13 months old. How should the packet proceed?",
      options: [
        "Request an updated evaluation from Dr. Okafor",
        "Submit with the existing evaluation and a note",
        "Hold the renewal",
      ],
    },
    outcome: "Waiting on clinician decision.",
  },
  {
    id: "run-4",
    agentId: "sentinel",
    title: "Policy watch · 5 MCOs",
    subject: "Weekly diff",
    startedAt: `${DEMO_TODAY} 05:30`,
    status: "completed",
    sourcesChecked: 27,
    steps: [
      {
        label: "Fetch bulletins and UM guidelines",
        state: "done",
        detail: "27 documents · 2 changed",
      },
      {
        label: "Diff against filed rules",
        state: "done",
        detail: "WellCare CP-BH-114 LOCUS recency; Passport appeal window",
      },
      {
        label: "Map to open work",
        state: "done",
        detail: "9 renewals · 2 appeals affected",
      },
    ],
    outcome: "2 policy changes awaiting acknowledgment on the Payers screen.",
  },
  {
    id: "run-5",
    agentId: "verify",
    title: "Rolling 7-day verification · 60 patients",
    subject: "All locations",
    startedAt: `${DEMO_TODAY} 06:10`,
    status: "completed",
    sourcesChecked: 60,
    steps: [
      { label: "270/271 via Availity (48 members)", state: "done" },
      { label: "WellCare portal (12 members)", state: "done" },
      {
        label: "Benefit detail parsed: carve-outs, COB, daily limits",
        state: "done",
      },
      {
        label: "Exceptions written with an action line",
        state: "done",
        detail: "6 exceptions",
      },
    ],
    outcome:
      "54 verified, 6 exceptions including one lapsed member with 14 unbilled visits.",
  },
];

export const INTEGRATIONS = [
  {
    name: "Sunwave (EHR · CRM · RCM)",
    status: "connected",
    mode: "Read via export + agent write-back",
    last: `${DEMO_TODAY} 09:15`,
  },
  {
    name: "Availity",
    status: "connected",
    mode: "Service account · 4 of 5 MCOs",
    last: `${DEMO_TODAY} 09:15`,
  },
  {
    name: "WellCare provider portal",
    status: "connected",
    mode: "Service account",
    last: `${DEMO_TODAY} 09:12`,
  },
  {
    name: "Novitas (Medicare MAC)",
    status: "connected",
    mode: "Fax + portal",
    last: addDays(DEMO_TODAY, -1),
  },
  {
    name: "Fax (eFax)",
    status: "connected",
    mode: "Send + transmission reports",
    last: addDays(DEMO_TODAY, -3),
  },
  {
    name: "Phone (voice agent)",
    status: "connected",
    mode: "Recorded, transcribed",
    last: `${DEMO_TODAY} 10:05`,
  },
  {
    name: "Carelon Behavioral Health portal",
    status: "credentials needed",
    mode: "Carve-out payer",
    last: "—",
  },
] as const;
