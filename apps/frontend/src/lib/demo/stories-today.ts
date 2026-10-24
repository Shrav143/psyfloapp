import { addDays, DEMO_TODAY } from "./format";
import { ev } from "./seed-packets";
import type { Authorization, AuthVersion, Patient } from "./types";

/** Hand-placed single-patient stories that shape what Today shows. Applied after generation. */
export function applyTypo(auth: Authorization): void {
  auth.events.push(
    ev(
      addDays(DEMO_TODAY, -40),
      "note",
      "staff",
      "MRN corrected in history trail",
      "Reference number entered as HBH-1306; corrected to HBH-1360. Original entry retained.",
    ),
  );
}

export function applyOverdue(
  auth: Authorization,
  patient: Patient,
  visits: string[],
): void {
  auth.story = "overdue";
  const last = auth.versions[auth.versions.length - 1] as AuthVersion;
  const exhaustedOn = addDays(DEMO_TODAY, -11);
  last.unitsGranted = visits.filter(
    (d) => d >= last.windowStart && d < exhaustedOn,
  ).length;
  if (last.unitsGranted < last.unitsAsked) {
    last.decision = "partial";
  }
  patient.actualPerWeek = 5;
  auth.status = "exhausted";
  auth.stateSince = exhaustedOn;
  auth.nextAction =
    "Units exhausted 11 days ago — patient still attending daily";
  auth.events.push(
    ev(
      exhaustedOn,
      "units_alert",
      "system",
      "Units exhausted",
      "Renewal not yet started",
    ),
  );
}

export function applyMissingDoc(auth: Authorization): void {
  auth.story = "missing-doc";
  auth.status = "awaiting_signoff";
  auth.nextAction =
    "Renewal packet missing psychiatric evaluation (older than 12 months)";
  auth.events.push(
    ev(
      addDays(DEMO_TODAY, -2),
      "gap_flagged",
      "agent",
      "Packet gap flagged",
      "Psychiatric evaluation dated 2025-08-02 is older than the payer's 12-month rule",
    ),
  );
}

export function applyDual(auth: Authorization, patient: Patient): void {
  patient.dualEligible = true;
  auth.story = "dual";
  auth.events.push(
    ev(
      addDays(DEMO_TODAY, -14),
      "note",
      "staff",
      "Medicare claim submitted for denial",
      "Medicaid billing blocked until Medicare rejects · 14 days pending",
    ),
  );
}

export function applyFast(auth: Authorization): void {
  auth.story = "fast";
  const first = auth.versions[0];
  if (first) {
    first.decidedAt = addDays(first.submittedAt, 3);
  }
}

/** The patient-detail hero: 34 of 45 units used, 61 of 90 days elapsed, units bind first. */
export function applyHero(auth: Authorization, patient: Patient): void {
  auth.story = "hero";
  patient.payerId = "anthem";
  auth.payerId = "anthem";
  const last = auth.versions[auth.versions.length - 1] as AuthVersion;
  last.kind = "renewal";
  last.unitsAsked = 60;
  last.unitsGranted = 45;
  last.decision = "partial";
  last.reason = "Approved for fewer units than requested. No reason supplied.";
  last.windowStart = addDays(DEMO_TODAY, -61);
  last.windowEnd = addDays(DEMO_TODAY, 29);
  last.submittedAt = last.windowStart;
  last.decidedAt = addDays(last.windowStart, 5);
  last.channel = "Availity";
  auth.status = "renewal_due";
  auth.stateSince = last.decidedAt;
  auth.nextAction = "Units bind first — file renewal before units run out";
}

/** Renewal denied while the current window still has units: peer-to-peer scheduled, billing continues. */
export function applyRenewalDeniedP2P(auth: Authorization): void {
  auth.story = "p2p";
  const last = auth.versions[auth.versions.length - 1] as AuthVersion;
  const submittedAt = addDays(DEMO_TODAY, -9);
  const denied: AuthVersion = {
    ...last,
    id: `${last.id}-rn`,
    number: last.number + 1,
    kind: "renewal",
    unitsGranted: 0,
    submittedAt,
    windowStart: last.windowEnd,
    windowEnd: addDays(last.windowEnd, 90),
    decidedAt: addDays(DEMO_TODAY, -4),
    decision: "denied",
    reason:
      "Does not meet criteria for continued TRP level of care; symptoms stable per submitted LOCUS.",
    reasonCategory: "medical_necessity",
    packet: last.packet,
  };
  auth.versions.push(denied);
  auth.events.push(
    ev(
      submittedAt,
      "submitted",
      "agent",
      "Renewal submitted before the window closed",
      `${denied.unitsAsked} units asked`,
      denied.number,
    ),
    ev(
      denied.decidedAt as string,
      "decided",
      "payer",
      "Denied · renewal",
      denied.reason,
      denied.number,
    ),
    ev(
      addDays(DEMO_TODAY, -2),
      "p2p_scheduled",
      "staff",
      "Peer-to-peer scheduled",
      "23 Sep 2:30pm · Heather M., LCSW",
      denied.number,
    ),
  );
  auth.status = "p2p";
  auth.stateSince = addDays(DEMO_TODAY, -2);
  auth.nextAction =
    "Peer-to-peer Wed 23 Sep 2:30pm · current window still active";
}
