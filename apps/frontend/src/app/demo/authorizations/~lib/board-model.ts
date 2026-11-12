import { clocksFor, renewalInFlight } from "@/lib/demo/derive";
import { DEMO_TODAY, daysBetween } from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import type { Authorization, AuthStatus, Patient } from "@/lib/demo/types";

export const LIFECYCLE: { status: AuthStatus; label: string; tone: string }[] =
  [
    { status: "draft", label: "Draft", tone: "slate" },
    { status: "awaiting_signoff", label: "Awaiting sign-off", tone: "violet" },
    { status: "submitted", label: "Submitted", tone: "blue" },
    { status: "pending", label: "Decision pending", tone: "blue" },
    { status: "info_requested", label: "Info requested", tone: "amber" },
    { status: "partial", label: "Partial", tone: "amber" },
    { status: "p2p", label: "Peer-to-peer", tone: "amber" },
    { status: "appeal", label: "Written appeal", tone: "red" },
    { status: "active", label: "Active", tone: "green" },
    { status: "renewal_due", label: "Renewal due", tone: "amber" },
    { status: "exhausted", label: "Units exhausted", tone: "red" },
  ];

export type BoardRow = {
  auth: Authorization;
  patient: Patient;
  payerShort: string;
  payerColor: string;
  daysInState: number;
  unitsAsked: number;
  unitsGranted: number;
  unitsUsed: number;
  window: string;
  fileBy?: string;
  aging: "ok" | "slow" | "rule";
  needsMe: boolean;
  value: number;
};

/** Aging: past the payer's own median is slow; past the 7-day CMS rule is a breach. */
export function agingFor(auth: Authorization): "ok" | "slow" | "rule" {
  if (
    auth.status !== "pending" &&
    auth.status !== "submitted" &&
    auth.status !== "info_requested"
  ) {
    return "ok";
  }
  const days = daysBetween(auth.stateSince, DEMO_TODAY);
  const payer = PAYER_BY_ID[auth.payerId];
  if (days > payer.decisionSlaDays) {
    return "rule";
  }
  return days > payer.medianDecisionDays ? "slow" : "ok";
}

export function toRow(
  auth: Authorization,
  patient: Patient,
  visits: string[],
): BoardRow {
  const clocks = clocksFor(patient, auth, visits);
  const last = auth.versions[auth.versions.length - 1];
  const payer = PAYER_BY_ID[auth.payerId];
  const inFlight = renewalInFlight(auth);
  const needsMe =
    [
      "awaiting_signoff",
      "appeal",
      "p2p",
      "info_requested",
      "exhausted",
      "draft",
      "partial",
    ].includes(auth.status) || agingFor(auth) === "rule";
  return {
    auth,
    patient,
    payerShort: payer.short,
    payerColor: payer.color,
    daysInState: daysBetween(auth.stateSince, DEMO_TODAY),
    unitsAsked: last?.unitsAsked ?? 0,
    unitsGranted: clocks?.version.unitsGranted ?? last?.unitsGranted ?? 0,
    unitsUsed: clocks?.unitsUsed ?? 0,
    window: clocks
      ? `${clocks.version.windowStart.slice(5)} → ${clocks.version.windowEnd.slice(5)}`
      : "—",
    fileBy: clocks && !inFlight ? clocks.fileBy : undefined,
    aging: agingFor(auth),
    needsMe,
    value: Math.round(((clocks?.unitsRemaining ?? 0) as number) * 244.29),
  };
}
