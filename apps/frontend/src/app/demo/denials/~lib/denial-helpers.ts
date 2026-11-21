import { DENIAL_CATEGORY_LABEL } from "@/lib/demo/analytics";
import {
  type Denial,
  type DenialRoute,
  type DenialStatus,
  denialSummary,
} from "@/lib/demo/denials";
import { DEMO_TODAY, daysBetween } from "@/lib/demo/format";
import type { Tone } from "@/lib/demo-ui/status-badge";

/** Session-only status changes made from the sheet (P2P booked, accepted, appeal started). */
export type StatusOverrides = Record<string, DenialStatus>;

export type DenialTab = "open" | "resolved" | "claim";

const RESOLVED: DenialStatus[] = ["won", "lost", "accepted"];

export function isResolved(status: DenialStatus): boolean {
  return RESOLVED.includes(status);
}

export function withOverrides(
  rows: Denial[],
  overrides: StatusOverrides,
): Denial[] {
  return rows.map((d) => {
    const status = overrides[d.id];
    return status ? { ...d, status } : d;
  });
}

export function rowsForTab(rows: Denial[], tab: DenialTab): Denial[] {
  if (tab === "claim") {
    return rows.filter((d) => d.kind === "claim");
  }
  if (tab === "resolved") {
    return rows.filter((d) => isResolved(d.status));
  }
  return rows.filter((d) => !isResolved(d.status));
}

export function categoryLabel(category: Denial["category"]): string {
  if (category === "auth_missing") {
    return "Auth missing";
  }
  if (category === "units_exceeded") {
    return "Units exceeded";
  }
  return DENIAL_CATEGORY_LABEL[category];
}

export function daysLeft(deadline: string): number {
  return daysBetween(DEMO_TODAY, deadline);
}

export const ROUTE_META: Record<
  DenialRoute,
  { label: string; tone: Tone; action: string; why: string }
> = {
  p2p: {
    label: "P2P",
    tone: "amber",
    action: "Schedule peer-to-peer",
    why: "Fastest reversal path: this payer overturns about half of TRP denials on a peer-to-peer call.",
  },
  appeal: {
    label: "Appeal",
    tone: "red",
    action: "Open appeal",
    why: "Written appeal drafted from the record; the clinician signs before anything leaves.",
  },
  resubmit: {
    label: "Resubmit",
    tone: "blue",
    action: "Resubmit corrected claim",
    why: "An authorization existed for the date of service. Correct the claim, do not appeal.",
  },
  accept: {
    label: "Accept",
    tone: "slate",
    action: "Accept and write off",
    why: "Units were genuinely exhausted. Recoverable only if the renewal is backdated.",
  },
};

/** Live tiles: open counts follow session changes; history shares stay on the dataset. */
export function summarize(rows: Denial[]) {
  const base = denialSummary();
  const open = rows.filter((d) => !isResolved(d.status));
  return {
    open: open.length,
    valueAtRisk: open.reduce((n, d) => n + d.valueAtRisk, 0),
    deadlineSoon: open.filter((d) => daysLeft(d.deadline) <= 14).length,
    invalidShare: base.invalidShare,
    won: base.won,
    lost: base.lost,
  };
}

export const VALIDITY_CALLOUT: Record<
  Denial["validity"],
  { headline: string; className: string }
> = {
  invalid: {
    headline: "Denial looks invalid against the payer's own policy",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  valid: {
    headline: "Denial looks valid: the packet was missing something",
    className: "border-rose-200 bg-rose-50 text-rose-900",
  },
  unclear: {
    headline: "No reason supplied: validity cannot be judged yet",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
};

export const P2P_CLINICIANS = [
  "Heather M., LCSW",
  "Dr. Okafor, MD",
  "Marcus T., LPCC",
];

export const P2P_SLOTS = [
  "Tue 22 Sep · 11:00",
  "Wed 23 Sep · 14:30",
  "Thu 24 Sep · 09:15",
];

export type PreventionRule = {
  id: string;
  title: string;
  prevents: string;
  owner: string;
  status: string;
  tone: Tone;
  active: boolean;
};

export const PREVENTION_RULES: PreventionRule[] = [
  {
    id: "split",
    title: "Split packets into three documents for Anthem and WellCare",
    prevents: "Documentation insufficient · merged PDFs read only to page 12",
    owner: "Packet agent",
    status: "active",
    tone: "green",
    active: true,
  },
  {
    id: "locus",
    title: "LOCUS within 30 days on WellCare renewals",
    prevents: "Policy change CP-BH-114 · 9 renewals affected",
    owner: "Sentinel → Packet agent",
    status: "new since 1 Sep",
    tone: "amber",
    active: true,
  },
  {
    id: "crosswalk",
    title: "Attach criteria crosswalk cover sheet on page 1",
    prevents: "Medical necessity · reviewer sees the SMI evidence first",
    owner: "Packet agent",
    status: "active",
    tone: "green",
    active: true,
  },
  {
    id: "psych",
    title: "Psychiatric evaluation within 12 months for Humana",
    prevents: "Missing element · stale evaluation flagged before sign-off",
    owner: "Packet agent",
    status: "active",
    tone: "green",
    active: true,
  },
  {
    id: "ref",
    title: "Auth reference in loop 2300 REF on every H2020 claim",
    prevents: "CO-197 auth missing · claim denials when an auth existed",
    owner: "Offshore billing",
    status: "active",
    tone: "green",
    active: true,
  },
];
