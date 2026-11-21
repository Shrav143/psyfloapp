import { partialDetail, type ScorecardRow } from "@/lib/demo/analytics";
import {
  FIRST_PASS_BY_QUARTER,
  PARTIAL_BY_QUARTER,
  PAYER_BY_ID,
  PAYERS,
  QUARTERS,
} from "@/lib/demo/payers";
import type { PayerId } from "@/lib/demo/types";

/** Quarter in which the Kentucky PA mandate took effect (July 2025). */
export const MANDATE_QUARTER = "Q3 25";

/** Requests-weighted first-pass approval across the MCO rows this quarter. */
export function clinicAggregate(rows: ScorecardRow[]): {
  rate: number;
  requests: number;
} {
  const requests = rows.reduce((n, r) => n + r.requests, 0);
  const weighted = rows.reduce((n, r) => n + r.firstPass * r.requests, 0);
  return { rate: requests ? weighted / requests : 0, requests };
}

/** The planted WellCare story, read straight from the quarterly series. */
export function wellcareStory() {
  const fp = FIRST_PASS_BY_QUARTER.wellcare;
  const last = QUARTERS.length - 1;
  return {
    from: fp[1] ?? 0,
    fromQuarter: QUARTERS[1] ?? "",
    to: fp[last] ?? 0,
    toQuarter: QUARTERS[last] ?? "",
    partial: PARTIAL_BY_QUARTER.wellcare[last] ?? 0,
  };
}

/** How many MCOs have a confirmed criteria set, and how many do not. */
export function criteriaCounts(): { known: number; unconfirmed: number } {
  const mcos = PAYERS.filter((p) => p.kind === "mco");
  const unconfirmed = mcos.filter(
    (p) => p.criteriaSet === "unconfirmed",
  ).length;
  return { known: mcos.length - unconfirmed, unconfirmed };
}

export type ShortfallSummary = {
  payerId: PayerId;
  short: string;
  units: number;
  count: number;
};

/** Partial-approval shortfall units per payer, last 180 days, largest first. */
export function shortfallByPayer(): {
  ranked: ShortfallSummary[];
  totalUnits: number;
} {
  const byPayer = new Map<PayerId, ShortfallSummary>();
  let totalUnits = 0;
  for (const p of partialDetail()) {
    const entry = byPayer.get(p.payerId) ?? {
      payerId: p.payerId,
      short: PAYER_BY_ID[p.payerId].short,
      units: 0,
      count: 0,
    };
    entry.units += p.shortfall;
    entry.count += 1;
    totalUnits += p.shortfall;
    byPayer.set(p.payerId, entry);
  }
  const ranked = [...byPayer.values()].sort((a, b) => b.units - a.units);
  return { ranked, totalUnits };
}
