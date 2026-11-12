import { addDays, DEMO_TODAY, quarterOf } from "./format";
import { PAYER_BY_ID, QUARTERS } from "./payers";
import type { Rng } from "./seed";
import { CLINICIANS, standardPacket } from "./seed-packets";
import type { AuthVersion, Patient } from "./types";

export function quarterIndex(iso: string): number {
  const i = QUARTERS.indexOf(quarterOf(iso));
  if (i >= 0) {
    return i;
  }
  return iso < "2025-07-01" ? 0 : QUARTERS.length - 1;
}

let refSeq = 4000;
function reference(payerId: string): string {
  refSeq += 17;
  return `${payerId.slice(0, 3).toUpperCase()}-${refSeq}${String.fromCharCode(65 + (refSeq % 26))}`;
}

export type Ctx = { rng: Rng; patient: Patient; visits: string[] };

export function unitsUsedIn(
  visits: string[],
  start: string,
  end: string,
): number {
  return visits.filter((d) => d >= start && d <= end && d < DEMO_TODAY).length;
}

export function baseVersion(
  ctx: Ctx,
  n: number,
  kind: AuthVersion["kind"],
  submittedAt: string,
  opts: { missing?: boolean } = {},
): AuthVersion {
  const payer = PAYER_BY_ID[ctx.patient.payerId];
  const cap = payer.unitCap ?? 60;
  return {
    id: `${ctx.patient.mrn}-v${n}`,
    number: n,
    kind,
    unitsAsked: cap,
    unitsGranted: 0,
    windowStart: submittedAt,
    windowEnd: addDays(submittedAt, payer.typicalWindowDays),
    submittedAt,
    decision: "pending",
    signedBy: ctx.rng.pick(CLINICIANS),
    reference: reference(ctx.patient.payerId),
    channel: payer.authChannel,
    packet: standardPacket(ctx.rng, submittedAt, opts),
  };
}
