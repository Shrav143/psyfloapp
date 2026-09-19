import { getDataset } from "./dataset";
import { addDays, DEMO_TODAY } from "./format";
import {
  APPEAL_WIN,
  FIRST_PASS_BY_QUARTER,
  MCO_IDS,
  P2P_REVERSAL,
  PARTIAL_BY_QUARTER,
  PAYER_BY_ID,
  QUARTERS,
} from "./payers";
import type { DenialCategory, PayerId } from "./types";

export type ScorecardRow = {
  payerId: PayerId;
  short: string;
  requests: number;
  firstPass: number;
  partial: number;
  avgAsked: number;
  avgGranted: number;
  medianDays: number;
  p2p: number;
  appealWin: number;
  trendPts: number;
  published?: number;
  criteria: string;
};

export function payerScorecard(): ScorecardRow[] {
  const ds = getDataset();
  return MCO_IDS.map((id) => {
    const payer = PAYER_BY_ID[id];
    const versions = ds.authorizations
      .filter((a) => a.payerId === id)
      .flatMap((a) => a.versions)
      .filter(
        (v) =>
          (v.kind === "initial" || v.kind === "renewal") &&
          v.decision !== "pending",
      );
    const decidedGranted = versions.filter((v) => v.decision !== "denied");
    const fp = FIRST_PASS_BY_QUARTER[id];
    return {
      payerId: id,
      short: payer.short,
      requests: versions.length,
      firstPass: fp[5] as number,
      partial: PARTIAL_BY_QUARTER[id][5] as number,
      avgAsked: 60,
      avgGranted: decidedGranted.length
        ? Math.round(
            decidedGranted.reduce((n, v) => n + v.unitsGranted, 0) /
              decidedGranted.length,
          )
        : 0,
      medianDays: payer.medianDecisionDays,
      p2p: P2P_REVERSAL[id],
      appealWin: APPEAL_WIN[id],
      trendPts: Math.round(((fp[5] as number) - (fp[2] as number)) * 100),
      published: payer.publishedFirstPassApproval,
      criteria: payer.criteriaSet,
    };
  });
}

export function firstPassTrend(): Record<string, number | string>[] {
  return QUARTERS.map((q, i) => {
    const row: Record<string, number | string> = { quarter: q };
    for (const id of MCO_IDS) {
      row[id] = Math.round((FIRST_PASS_BY_QUARTER[id][i] as number) * 100);
    }
    return row;
  });
}

export const DENIAL_CATEGORY_LABEL: Record<DenialCategory, string> = {
  medical_necessity: "Medical necessity",
  documentation: "Documentation insufficient",
  missing_element: "Missing element",
  eligibility: "Eligibility",
  policy_change: "Policy change",
  no_reason: "No reason given",
};

export function denialMix(): Record<string, number | string>[] {
  const ds = getDataset();
  return MCO_IDS.map((id) => {
    const row: Record<string, number | string> = {
      payer: PAYER_BY_ID[id].short,
      payerId: id,
    };
    for (const cat of Object.keys(DENIAL_CATEGORY_LABEL) as DenialCategory[]) {
      row[cat] = 0;
    }
    for (const a of ds.authorizations.filter((x) => x.payerId === id)) {
      for (const v of a.versions) {
        if (v.decision === "denied" && v.reasonCategory) {
          row[v.reasonCategory] = (row[v.reasonCategory] as number) + 1;
        }
      }
    }
    return row;
  });
}

export function partialDetail() {
  const ds = getDataset();
  const since = addDays(DEMO_TODAY, -180);
  return ds.authorizations
    .flatMap((a) =>
      a.versions
        .filter((v) => v.decision === "partial" && (v.decidedAt ?? "") >= since)
        .map((v) => ({
          mrn: a.mrn,
          payerId: a.payerId,
          asked: v.unitsAsked,
          granted: v.unitsGranted,
          decidedAt: v.decidedAt as string,
          shortfall: v.unitsAsked - v.unitsGranted,
        })),
    )
    .sort((x, y) => (x.decidedAt < y.decidedAt ? 1 : -1));
}
