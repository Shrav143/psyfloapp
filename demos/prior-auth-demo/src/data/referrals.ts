import { buildReferral } from "./referralBuild";
import { SAMPLE_SPECS } from "./referralSamples";
import { HAND_SPECS } from "./referralSpecs";
import type { Referral } from "./referralTypes";

export * from "./referralLabels";
export * from "./referralTypes";
export { authRequired, buildFields, evaluateChecks, hasFail, issueCount, parseDiagnoses } from "./referralBuild";
export { buildCoverage, hash } from "./referralInsight";
export { buildDocs, locate, type Evidence, type ReferralDoc } from "./referralDoc";

/** The sixteen referrals RF-2038 to RF-2053, eight of them still open. Never mutate. */
export const SEED_REFERRALS: Referral[] = HAND_SPECS.map((s) => buildReferral(s));

export const SAMPLE_COUNT = SAMPLE_SPECS.length;

/** What Reader would extract from a dropped file. The sample is picked by `index`, so the same file always reads the same. */
export function sampleReferral(index: number, id: string, clock: number): Referral {
  return buildReferral({ ...SAMPLE_SPECS[index % SAMPLE_SPECS.length], id }, clock);
}
