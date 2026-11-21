import type { EligibilityCheck } from "@/lib/demo/eligibility";

export type CheckItem = {
  id: string;
  label: string;
  detail: string;
  defaultOn: boolean;
  /** Which of this morning's results this check is responsible for. */
  matches: (r: EligibilityCheck) => boolean;
};

export const CHECK_ITEMS: CheckItem[] = [
  {
    id: "active",
    label: "Active coverage (270/271)",
    detail:
      "Subscriber found and the policy active on every date of service in the window.",
    defaultOn: true,
    matches: (r) => r.status === "inactive",
  },
  {
    id: "network",
    label: "In-network status",
    detail: "Harbor's tax ID against the plan's network for H2020.",
    defaultOn: true,
    matches: (r) => !r.inNetwork && r.status !== "carve_out",
  },
  {
    id: "carveout",
    label: "Behavioral health carve-out (Carelon, Magellan)",
    detail:
      "Service type MH routed to a vendor means a different authorization and a different claim address.",
    defaultOn: true,
    matches: (r) => r.status === "carve_out",
  },
  {
    id: "cob",
    label: "Coordination of benefits",
    detail:
      "Another payer listed as primary. Medicaid pays last; billing it first denies CO-22.",
    defaultOn: true,
    matches: (r) => r.status === "cob",
  },
  {
    id: "limits",
    label: "Daily/session limits across providers",
    detail:
      "Units-per-day caps and what other providers have already billed on the same day.",
    defaultOn: true,
    matches: (r) => r.headline.includes("/day cap"),
  },
  {
    id: "medicare",
    label: "Medicare-first for dual-eligibles",
    detail:
      "Medicare must reject H2020 before Kentucky Medicaid pays. Tracks the pending rejection.",
    defaultOn: true,
    matches: (r) => r.status === "medicare_first",
  },
  {
    id: "plan",
    label: "MCO plan change (open enrollment)",
    detail:
      "The 271 payer ID differs from the chart. The old authorization does not transfer.",
    defaultOn: true,
    matches: (r) => r.status === "plan_changed",
  },
  {
    id: "recert",
    label: "Recertification window approaching",
    detail: "Warns 60 days before a member's Medicaid recertification date.",
    defaultOn: false,
    matches: (r) => r.detail.includes("Recertification"),
  },
];
