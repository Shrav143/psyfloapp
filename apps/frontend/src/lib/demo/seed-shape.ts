import { clocksFor, coverageOn } from "./derive";
import { addDays, DEMO_TODAY, daysBetween } from "./format";
import { PAYER_BY_ID } from "./payers";
import type { TodayBucket } from "./seed";
import { baseVersion, type Ctx, unitsUsedIn } from "./seed-base";
import {
  criteriaFor,
  ev,
  eventsForVersion,
  resyncVersionEvents,
} from "./seed-packets";
import { shapeDenied } from "./seed-shape-denied";
import type { Authorization, AuthVersion } from "./types";

/** Force the final state of the chain to match the bucket the patient must land in today. */
export function shapeForBucket(
  ctx: Ctx,
  auth: Authorization,
  bucket: TodayBucket,
  closed: boolean,
): Authorization {
  const { rng, patient, visits } = ctx;
  const payer = PAYER_BY_ID[patient.payerId];
  const last = auth.versions[auth.versions.length - 1] as AuthVersion;
  const idx = auth.versions.length;
  if (bucket === "denied_in_appeal") {
    return shapeDenied(ctx, auth, last);
  }
  if (closed) {
    auth.status = "closed";
    auth.nextAction = "Discharged after final denial";
    return auth;
  }
  if (last.decision === "pending" || last.decision === "denied") {
    last.decision = "approved";
    last.unitsGranted = last.unitsAsked;
    last.decidedAt = last.decidedAt ?? addDays(last.submittedAt, 4);
  }
  let used = unitsUsedIn(visits, last.windowStart, last.windowEnd);
  if (bucket === "units_exhausted") {
    if (used < 8) {
      last.windowStart = addDays(last.windowStart, -45);
      last.submittedAt = last.windowStart;
      last.decidedAt = addDays(last.submittedAt, payer.medianDecisionDays);
      used = unitsUsedIn(visits, last.windowStart, last.windowEnd);
    }
    last.unitsGranted = Math.max(2, used - rng.int(1, 4));
    if (last.unitsGranted < last.unitsAsked) {
      last.decision = "partial";
    }
    if (last.windowEnd <= DEMO_TODAY) {
      last.windowEnd = addDays(DEMO_TODAY, rng.int(8, 30));
    }
    resyncVersionEvents(auth, last, patient.payerId);
    auth.status = idx % 2 === 0 ? "awaiting_signoff" : "exhausted";
    auth.stateSince = addDays(DEMO_TODAY, -rng.int(1, 6));
    auth.nextAction =
      auth.status === "awaiting_signoff"
        ? "Renewal packet drafted — needs clinician signature"
        : "Units exhausted — start renewal now";
    return auth;
  }
  if (bucket === "window_expired") {
    last.windowEnd = addDays(DEMO_TODAY, -rng.int(3, 12));
    last.unitsGranted = Math.max(last.unitsGranted, used + 5);
    const late = baseVersion(
      ctx,
      last.number + 1,
      "renewal",
      addDays(DEMO_TODAY, -rng.int(1, 3)),
    );
    auth.versions.push(late);
    auth.events.push(...eventsForVersion(late, patient.payerId));
    auth.status = "pending";
    auth.stateSince = late.submittedAt;
    auth.nextAction = `Renewal filed ${daysBetween(last.windowEnd, late.submittedAt)} days after window closed — decision pending`;
    return auth;
  }
  while (
    unitsUsedIn(visits, last.windowStart, last.windowEnd) >=
      last.unitsGranted - 2 &&
    last.windowStart < addDays(DEMO_TODAY, -14)
  ) {
    last.windowStart = addDays(last.windowStart, 7);
    last.windowEnd = addDays(last.windowEnd, 7);
    last.submittedAt = last.windowStart;
    last.decidedAt = addDays(last.submittedAt, payer.medianDecisionDays);
    resyncVersionEvents(auth, last, patient.payerId);
  }
  if (last.windowEnd <= addDays(DEMO_TODAY, 2)) {
    last.windowEnd = addDays(DEMO_TODAY, rng.int(5, 40));
  }
  if (coverageOn(patient, auth, visits, DEMO_TODAY).reason !== "covered") {
    const fresh = baseVersion(
      ctx,
      last.number + 1,
      "renewal",
      addDays(DEMO_TODAY, -rng.int(15, 40)),
    );
    fresh.decision = "approved";
    fresh.unitsGranted = fresh.unitsAsked;
    fresh.decidedAt = addDays(fresh.submittedAt, payer.medianDecisionDays);
    fresh.criteriaCited = criteriaFor(patient.payerId);
    auth.versions.push(fresh);
    auth.events.push(...eventsForVersion(fresh, patient.payerId));
  }
  const cur = auth.versions[auth.versions.length - 1] as AuthVersion;
  const clocks = clocksFor(patient, auth, visits);
  const fileByDays = clocks ? daysBetween(DEMO_TODAY, clocks.fileBy) : 99;
  auth.stateSince = cur.decidedAt as string;
  if (
    cur.decision === "partial" &&
    daysBetween(cur.decidedAt as string, DEMO_TODAY) < 10
  ) {
    auth.status = "partial";
    auth.nextAction = "Partial approval — accept or appeal shortfall";
  } else if (fileByDays < 0 && rng.next() < 0.7) {
    const inflight = baseVersion(
      ctx,
      cur.number + 1,
      "renewal",
      addDays(DEMO_TODAY, -rng.int(1, 6)),
    );
    auth.versions.push(inflight);
    auth.events.push(...eventsForVersion(inflight, patient.payerId));
    auth.status = rng.next() < 0.15 ? "info_requested" : "pending";
    auth.stateSince = inflight.submittedAt;
    auth.nextAction =
      auth.status === "info_requested"
        ? "Payer requested updated LOCUS — clinician to attach"
        : `Renewal decision due ${addDays(inflight.submittedAt, 7)}`;
    if (auth.status === "info_requested") {
      auth.events.push(
        ev(
          addDays(inflight.submittedAt, 2),
          "info_requested",
          "payer",
          "Payer pended request for more information",
          "Updated LOCUS within 30 days required",
        ),
      );
    }
  } else if (fileByDays <= 7 && rng.next() < 0.5) {
    auth.status = "awaiting_signoff";
    auth.stateSince = addDays(DEMO_TODAY, -rng.int(0, 3));
    auth.nextAction = "Renewal packet drafted — needs clinician signature";
    auth.events.push(
      ev(
        auth.stateSince,
        "packet_drafted",
        "agent",
        "Renewal packet drafted",
        "9 documents assembled from Sunwave; cover sheet regenerated",
      ),
    );
  } else {
    auth.status = fileByDays <= 14 ? "renewal_due" : "active";
    auth.nextAction =
      fileByDays <= 14
        ? `File renewal by ${clocks?.fileBy}`
        : "Monitoring units and window";
  }
  return auth;
}
