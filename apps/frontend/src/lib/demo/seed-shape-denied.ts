import { addDays, DEMO_TODAY } from "./format";
import { PAYER_BY_ID } from "./payers";
import type { Ctx } from "./seed-base";
import { unitsUsedIn } from "./seed-base";
import { ev, eventsForVersion, pickDenial } from "./seed-packets";
import type { Authorization, AuthVersion } from "./types";

/**
 * Denied bucket: the chain's last request becomes a recent denial. Odd MRNs
 * have a written appeal under review; even MRNs have the appeal packet waiting
 * for clinician sign-off.
 */
export function shapeDenied(
  ctx: Ctx,
  auth: Authorization,
  last: AuthVersion,
): Authorization {
  const { rng, patient, visits } = ctx;
  const payer = PAYER_BY_ID[patient.payerId];
  last.decision = "denied";
  last.unitsGranted = 0;
  last.decidedAt = addDays(DEMO_TODAY, -rng.int(9, 30));
  if (last.submittedAt > addDays(last.decidedAt, -2)) {
    last.submittedAt = addDays(last.decidedAt, -payer.medianDecisionDays);
    last.windowStart = last.submittedAt;
    last.windowEnd = addDays(last.submittedAt, payer.typicalWindowDays);
  }
  const d = pickDenial(rng, patient.payerId);
  last.reason = d.reason;
  last.reasonCategory = d.category;
  // The previous approval must have run out, or today would still be covered.
  const prior = [...auth.versions]
    .reverse()
    .find((x) => x.number < last.number && x.unitsGranted > 0);
  if (prior && prior.windowEnd >= addDays(last.decidedAt, -1)) {
    const end = addDays(last.decidedAt, -rng.int(1, 6));
    if (end > prior.windowStart) {
      prior.windowEnd = end;
    } else {
      const used = unitsUsedIn(visits, prior.windowStart, last.decidedAt);
      prior.unitsGranted = Math.max(1, used);
    }
  }
  auth.events = auth.events.filter((e) => e.versionNumber !== last.number);
  auth.events.push(...eventsForVersion(last, patient.payerId));
  if (Number.parseInt(patient.mrn.slice(4), 10) % 2 === 1) {
    const filedAt = addDays(DEMO_TODAY, -6);
    const appeal: AuthVersion = {
      ...last,
      id: `${last.id}-ap`,
      number: last.number + 1,
      kind: "appeal",
      decision: "pending",
      submittedAt: filedAt,
      decidedAt: undefined,
      reason: undefined,
      reasonCategory: undefined,
      packet: [],
    };
    auth.versions.push(appeal);
    auth.events.push(
      ev(
        addDays(filedAt, -2),
        "appeal_drafted",
        "agent",
        "Appeal packet drafted",
        "Cover letter, appeal letter, 3-part packet",
        appeal.number,
      ),
      ev(
        addDays(filedAt, -1),
        "signed",
        "clinician",
        "Appeal signed by Heather M., LCSW",
        undefined,
        appeal.number,
      ),
      ev(
        filedAt,
        "appeal_filed",
        "staff",
        `Written appeal sent by ${PAYER_BY_ID[patient.payerId].appealChannel}`,
        "68 pages · transmission report saved",
        appeal.number,
      ),
      ev(
        addDays(filedAt, 3),
        "receipt_confirmed",
        "agent",
        "Receipt confirmed by phone",
        `Logged by payer · decision due ${addDays(filedAt, 30)}`,
        appeal.number,
      ),
    );
    auth.status = "appeal";
    auth.stateSince = filedAt;
    auth.nextAction = `Appeal under review · decision due ${addDays(filedAt, 30)}`;
  } else {
    auth.status = "appeal";
    auth.stateSince = addDays(last.decidedAt, 6);
    auth.nextAction = "Appeal packet in clinician sign-off queue";
    auth.events.push(
      ev(
        auth.stateSince,
        "appeal_drafted",
        "agent",
        "Appeal packet drafted",
        "Cover letter, appeal letter, 3-part packet · awaiting signature",
        last.number,
      ),
    );
  }
  return auth;
}
