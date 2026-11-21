import { SLA_MIN, URGENCY_RANK, isOpen, type Referral } from "@/data/referrals";

/** Waiting for a first decision and already past the response target for its urgency. */
export const pastTarget = (r: Referral, clock: number): boolean => (r.status === "new" || r.status === "in_review") && clock - r.receivedAt > SLA_MIN[r.urgency];

/** Open referrals. The ones that need a look come first (emergent before urgent before routine, then the longest wait), then the ones waiting on a referrer. */
export function arrivedReferrals(referrals: Referral[]): Referral[] {
  const waiting = (r: Referral): number => (r.status === "awaiting_info" ? 1 : 0);
  return referrals.filter((r) => isOpen(r.status)).sort((a, b) => waiting(a) - waiting(b) || URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency] || a.receivedAt - b.receivedAt);
}
