import { buildReferral } from "./referralBuild";
import { historySpecs, SAMPLE_SPECS } from "./referralHistory";
import { HAND_SPECS } from "./referralSpecs";
import type { Referral } from "./referralTypes";

export * from "./referralLabels";
export * from "./referralTypes";
export { authRequired, buildFields, evaluateChecks, hasFail, issueCount, parseDiagnoses } from "./referralBuild";
export { buildCoverage, hash } from "./referralInsight";
export { buildDocs, locate, type Evidence, type ReferralDoc } from "./referralDoc";

/** 56 closed referrals from the last two months plus the sixteen on the dashboard (RF-2038 to RF-2053). Never mutate. */
export const SEED_REFERRALS: Referral[] = [...historySpecs(), ...HAND_SPECS].map((s) => buildReferral(s));

export const SAMPLE_COUNT = SAMPLE_SPECS.length;

/** What Reader would extract from a dropped file. The sample is picked by `index`, so the same file always reads the same. */
export function sampleReferral(index: number, id: string, clock: number): Referral {
  return buildReferral({ ...SAMPLE_SPECS[index % SAMPLE_SPECS.length], id }, clock);
}
