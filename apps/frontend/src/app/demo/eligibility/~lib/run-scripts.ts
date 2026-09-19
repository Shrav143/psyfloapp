import type { RunStep } from "@/lib/demo/agents";
import type { Payer } from "@/lib/demo/types";

export const CADENCES = [
  { value: "weekly", label: "Weekly rolling 7-day" },
  { value: "visit", label: "Before every visit" },
  { value: "monthly", label: "Monthly" },
] as const;

export type Cadence = (typeof CADENCES)[number]["value"];

/** The full morning run, replayed on demand. Purely cosmetic timing. */
export const RUN_SCRIPT: RunStep[] = [
  {
    label: "Availity · 270 eligibility inquiry for 48 members",
    state: "pending",
    detail: "Service account · MFA satisfied · 271 responses captured",
    ms: 1100,
  },
  {
    label: "WellCare provider portal · 12 members",
    state: "pending",
    detail: "Own portal, not Availity · agent reads the benefit screen",
    ms: 1200,
  },
  {
    label: "Parse benefit detail",
    state: "pending",
    detail:
      "Carve-outs · coordination of benefits · daily limits · Medicare-first",
    ms: 1200,
  },
  {
    label: "Compare to this morning's 06:10 check",
    state: "pending",
    detail: "Only differences become new exceptions; history is appended",
    ms: 1000,
  },
  {
    label: "Write a one-line action for each exception",
    state: "pending",
    detail: "Nothing on the chart is edited",
    ms: 900,
  },
];

/** A single-member re-check from inside the detail sheet. */
export function rerunScript(source: string): RunStep[] {
  return [
    { label: `Re-check via ${source}`, state: "pending", ms: 900 },
    { label: "Parse benefit detail", state: "pending", ms: 900 },
    { label: "Compare to the 06:10 result", state: "pending", ms: 800 },
  ];
}

export function sourceFor(payer: Payer): string {
  if (payer.id === "wellcare") {
    return "Provider portal (agent)";
  }
  return "270/271 via Availity";
}
