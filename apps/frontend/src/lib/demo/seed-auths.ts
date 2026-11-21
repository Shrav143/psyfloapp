import { addDays, DEMO_TODAY, daysBetween } from "./format";
import {
  FIRST_PASS_BY_QUARTER,
  PARTIAL_BY_QUARTER,
  PAYER_BY_ID,
} from "./payers";
import type { Rng, TodayBucket } from "./seed";
import { baseVersion, type Ctx, quarterIndex } from "./seed-base";
import { resolveDenial } from "./seed-denial";
import {
  criteriaFor,
  ev,
  eventsForVersion,
  OWNERS,
  pickDenial,
} from "./seed-packets";
import { shapeForBucket } from "./seed-shape";
import type { AuthEvent, Authorization, AuthVersion, Patient } from "./types";

/** Apply a payer decision drawn from the quarter's observed rates. */
function decide(ctx: Ctx, v: AuthVersion): AuthVersion {
  const payer = PAYER_BY_ID[ctx.patient.payerId];
  const qi = quarterIndex(v.submittedAt);
  const fp = FIRST_PASS_BY_QUARTER[payer.id][qi] as number;
  const partial = PARTIAL_BY_QUARTER[payer.id][qi] as number;
  const r = ctx.rng.next();
  const cap = payer.unitCap ?? 60;
  v.decidedAt = addDays(
    v.submittedAt,
    Math.max(1, payer.medianDecisionDays + ctx.rng.int(-2, 3)),
  );
  if (v.decidedAt > DEMO_TODAY) {
    v.decidedAt = undefined;
    v.decision = "pending";
    return v;
  }
  v.criteriaCited = criteriaFor(payer.id);
  if (r < fp) {
    v.decision = "approved";
    v.unitsGranted = cap;
  } else if (r < fp + partial) {
    v.decision = "partial";
    v.unitsGranted =
      cap === 40 ? ctx.rng.pick([20, 30]) : ctx.rng.pick([30, 45]);
    v.reason = "Approved for fewer units than requested. No reason supplied.";
  } else if (v.decidedAt > addDays(DEMO_TODAY, -40)) {
    // Recent adverse outcomes are placed deliberately by the buckets and stories.
    v.decision = "partial";
    v.unitsGranted = cap === 40 ? 20 : 30;
    v.reason = "Approved for fewer units than requested. No reason supplied.";
  } else {
    v.decision = "denied";
    const d = pickDenial(ctx.rng, payer.id);
    v.reason = d.reason;
    v.reasonCategory = d.category;
  }
  return v;
}

function nextRenewalDate(ctx: Ctx, v: AuthVersion): string {
  const perDay = Math.max(0.5, ctx.patient.actualPerWeek) / 7;
  const exhaustion = addDays(
    v.windowStart,
    Math.round(v.unitsGranted / perDay),
  );
  const binding = exhaustion < v.windowEnd ? exhaustion : v.windowEnd;
  const lead = ctx.rng.int(3, 14);
  const late = ctx.rng.next() < 0.25 ? ctx.rng.int(1, 9) : 0;
  return addDays(binding, -lead + late);
}

export function seedAuthorization(
  rng: Rng,
  patient: Patient,
  visits: string[],
  bucket: TodayBucket,
): Authorization {
  const ctx: Ctx = { rng, patient, visits };
  const events: AuthEvent[] = [
    ev(
      patient.intakeDate,
      "intake",
      "clinician",
      "Intake assessment completed",
      `${patient.plannedPerWeek} visits/week recommended`,
    ),
  ];
  const versions: AuthVersion[] = [];
  const auth: Authorization = {
    id: `auth-${patient.mrn}`,
    mrn: patient.mrn,
    payerId: patient.payerId,
    serviceCode: "H2020",
    status: "active",
    stateSince: DEMO_TODAY,
    owner: rng.pick(OWNERS),
    nextAction: "",
    versions,
    events,
  };
  if (bucket === "no_auth") {
    auth.status = "draft";
    auth.stateSince = patient.intakeDate;
    auth.nextAction = "Start initial request — no packet drafted since intake";
    return auth;
  }
  let n = 1;
  let submitAt = addDays(patient.intakeDate, rng.int(1, 2));
  if (bucket === "awaiting_decision") {
    const v = baseVersion(ctx, n, "initial", submitAt);
    versions.push(v);
    events.push(...eventsForVersion(v, patient.payerId));
    auth.status =
      daysBetween(submitAt, DEMO_TODAY) <= 1 ? "submitted" : "pending";
    auth.stateSince = submitAt;
    auth.nextAction = `Decision due by ${addDays(submitAt, 7)} (7-day rule)`;
    return auth;
  }
  let current: AuthVersion | undefined;
  let closed = false;
  while (!closed) {
    const kind =
      n === 1 ||
      auth.events.some(
        (e) => e.type === "note" && e.at > (current?.submittedAt ?? ""),
      )
        ? "initial"
        : "renewal";
    const v = decide(ctx, baseVersion(ctx, n, kind, submitAt));
    versions.push(v);
    events.push(...eventsForVersion(v, patient.payerId));
    n += 1;
    current = v;
    if (v.decision === "denied") {
      const r = resolveDenial(ctx, v, events, n);
      n = r.nextN;
      closed = r.closed;
      if (r.version) {
        versions.push(r.version);
        current = r.version;
      }
      if (closed && r.resumeAt) {
        closed = false;
        submitAt = r.resumeAt;
        continue;
      }
    }
    const renewal = nextRenewalDate(ctx, current);
    if (renewal >= addDays(DEMO_TODAY, -2)) {
      break;
    }
    submitAt = renewal;
  }
  return shapeForBucket(ctx, auth, bucket, closed);
}
