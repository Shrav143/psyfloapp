import { addDays, DEMO_TODAY, daysBetween, VISIT_RATE } from "./format";
import { PAYER_BY_ID } from "./payers";
import type {
  Authorization,
  AuthVersion,
  Patient,
  Visit,
  VisitReason,
} from "./types";

/** Lead time before the binding clock: payer median turnaround plus a safety buffer. */
export function leadDaysFor(payerId: Authorization["payerId"]): number {
  return PAYER_BY_ID[payerId].medianDecisionDays + 5;
}

export function latestVersionOn(
  auth: Authorization,
  date: string,
): AuthVersion | undefined {
  let found: AuthVersion | undefined;
  for (const v of auth.versions) {
    if (v.submittedAt <= date) {
      found = v;
    }
  }
  return found;
}

function priorDecidedVersion(
  auth: Authorization,
  v: AuthVersion,
): AuthVersion | undefined {
  let prior: AuthVersion | undefined;
  for (const x of auth.versions) {
    if (x.number < v.number && x.decision !== "pending") {
      prior = x;
    }
  }
  return prior;
}

/** Classify why a visit on a given date is or is not billable under this authorization. */
export function coverageOn(
  patient: Patient,
  auth: Authorization | undefined,
  visitDates: string[],
  date: string,
): { reason: VisitReason; version?: AuthVersion } {
  if (!auth || auth.versions.length === 0) {
    return { reason: date >= patient.intakeDate ? "no_auth" : "no_auth" };
  }
  const v = latestVersionOn(auth, date);
  if (!v) {
    return { reason: "intake_lag" };
  }
  if (v.decision === "pending" || (v.decidedAt && v.decidedAt > date)) {
    if (v.kind === "appeal" || v.kind === "p2p") {
      return { reason: "denied_in_appeal", version: v };
    }
    if (v.kind === "renewal") {
      const prior = priorDecidedVersion(auth, v);
      if (prior && prior.windowEnd < date) {
        return { reason: "window_expired", version: prior };
      }
      if (prior) {
        const used = visitDates.filter(
          (d) => d >= prior.windowStart && d < date,
        ).length;
        return used >= prior.unitsGranted
          ? { reason: "units_exhausted", version: prior }
          : { reason: "covered", version: prior };
      }
    }
    return { reason: "awaiting_decision", version: v };
  }
  if (v.decision === "denied") {
    const prior = priorDecidedVersion(auth, v);
    if (prior && prior.decision !== "denied" && date <= prior.windowEnd) {
      const used = visitDates.filter(
        (d) => d >= prior.windowStart && d < date,
      ).length;
      if (used < prior.unitsGranted) {
        return { reason: "covered", version: prior };
      }
    }
    return { reason: "denied_in_appeal", version: v };
  }

  if (date > v.windowEnd) {
    return { reason: "window_expired", version: v };
  }
  const used = visitDates.filter((d) => d >= v.windowStart && d < date).length;
  if (used >= v.unitsGranted) {
    return { reason: "units_exhausted", version: v };
  }
  return { reason: "covered", version: v };
}

export function classifyVisits(
  patient: Patient,
  auth: Authorization | undefined,
  dates: string[],
): Visit[] {
  return dates.map((date) => {
    const c = coverageOn(patient, auth, dates, date);
    return {
      date,
      mrn: patient.mrn,
      reason: c.reason,
      versionId: c.version?.id,
    };
  });
}

export type Clocks = {
  version: AuthVersion;
  unitsUsed: number;
  unitsRemaining: number;
  daysElapsed: number;
  daysRemaining: number;
  perWeek: number;
  exhaustionDate: string;
  windowEnd: string;
  binding: "units" | "days";
  bindingDate: string;
  fileBy: string;
  strandedUnits: number;
  utilization: number;
};

/** The two countdowns that end an authorization, plus the derived file-by date. */
export function clocksFor(
  patient: Patient,
  auth: Authorization,
  visitDates: string[],
  today = DEMO_TODAY,
): Clocks | undefined {
  const v = [...auth.versions]
    .reverse()
    .find((x) => x.decision === "approved" || x.decision === "partial");
  if (!v) {
    return undefined;
  }
  const unitsUsed = Math.min(
    v.unitsGranted,
    visitDates.filter(
      (d) => d >= v.windowStart && d <= today && d <= v.windowEnd,
    ).length,
  );
  const unitsRemaining = Math.max(0, v.unitsGranted - unitsUsed);
  const perWeek = Math.max(0.5, patient.actualPerWeek);
  const exhaustionDate =
    unitsRemaining === 0
      ? today
      : addDays(today, Math.ceil(unitsRemaining / (perWeek / 7)));
  const binding = exhaustionDate <= v.windowEnd ? "units" : "days";
  const bindingDate = binding === "units" ? exhaustionDate : v.windowEnd;
  const daysRemaining = Math.max(0, daysBetween(today, v.windowEnd));
  const projectedUse = Math.min(
    v.unitsGranted,
    unitsUsed + Math.floor((daysRemaining * perWeek) / 7),
  );
  return {
    version: v,
    unitsUsed,
    unitsRemaining,
    daysElapsed: Math.max(0, daysBetween(v.windowStart, today)),
    daysRemaining,
    perWeek,
    exhaustionDate,
    windowEnd: v.windowEnd,
    binding,
    bindingDate,
    fileBy: addDays(bindingDate, -leadDaysFor(auth.payerId)),
    strandedUnits: Math.max(0, v.unitsGranted - projectedUse),
    utilization: v.unitsGranted ? projectedUse / v.unitsGranted : 0,
  };
}

export type RenewalLane = "overdue" | "this_week" | "next_30";

export function renewalLane(
  fileBy: string,
  today = DEMO_TODAY,
): RenewalLane | undefined {
  const d = daysBetween(today, fileBy);
  if (d < 0) {
    return "overdue";
  }
  if (d <= 7) {
    return "this_week";
  }
  if (d <= 30) {
    return "next_30";
  }
  return undefined;
}

export const REASON_LABEL: Record<VisitReason, string> = {
  covered: "Covered by active authorization",
  intake_lag: "Intake-to-submission lag",
  awaiting_decision: "Awaiting first decision",
  units_exhausted: "Units exhausted",
  window_expired: "Window expired",
  denied_in_appeal: "Denied, in appeal",
  no_auth: "No auth on file",
  eligibility_lapsed: "Coverage lapsed",
};

export const REASON_MEANING: Record<VisitReason, string> = {
  covered: "Billable.",
  intake_lag: "Before the backdate reaches. Not recoverable.",
  awaiting_decision: "Care on credit; recoverable if approved.",
  units_exhausted: "Renewal filed too late. Preventable.",
  window_expired: "Renewal filed too late. Preventable.",
  denied_in_appeal: "Free care or pause. Recoverable only via appeal.",
  no_auth: "Process failure — nobody filed.",
  eligibility_lapsed: "Payer coverage ended. Structural.",
};

export function visitValue(visitCount: number): number {
  return Math.round(visitCount * VISIT_RATE);
}

/** True when the latest version is an undecided renewal, i.e. the renewal is already filed. */
export function renewalInFlight(auth: Authorization): boolean {
  const last = auth.versions[auth.versions.length - 1];
  return Boolean(
    last && last.decision === "pending" && last.kind === "renewal",
  );
}
