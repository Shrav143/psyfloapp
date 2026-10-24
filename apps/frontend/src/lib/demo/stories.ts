import { addDays } from "./format";
import { ev } from "./seed-packets";
import type { Authorization, AuthVersion, Patient } from "./types";

/**
 * Hand-placed stories the demo script depends on. Applied after generation so
 * the rest of the dataset stays statistically calibrated.
 */
export const STORY_MRNS = {
  hero: "HBH-1042",
  fourRenewals: "HBH-1077",
  stranded: "HBH-1112",
  dual: "HBH-1049",
  fast: "HBH-1233",
  typo: "HBH-1360",
  overdue: "HBH-1401",
  missingDoc: "HBH-1408",
} as const;

function v(
  id: string,
  number: number,
  kind: AuthVersion["kind"],
  asked: number,
  granted: number,
  start: string,
  decision: AuthVersion["decision"],
  reason?: string,
): AuthVersion {
  return {
    id,
    number,
    kind,
    unitsAsked: asked,
    unitsGranted: granted,
    windowStart: start,
    windowEnd: addDays(start, 90),
    submittedAt: start,
    decidedAt: addDays(start, 6),
    decision,
    reason,
    criteriaSet: undefined,
    channel: "WellCare provider portal",
    signedBy: "Heather M., LCSW",
    reference: `WEL-${7000 + number * 13}Q`,
    packet: [],
  } as AuthVersion;
}

/** Four renewals, cut every time, then denied, then won on appeal. Sunwave keeps only the last box. */
export function applyFourRenewals(auth: Authorization, patient: Patient): void {
  patient.payerId = "wellcare";
  patient.actualPerWeek = 2.8;
  patient.plannedPerWeek = 3;
  patient.intakeDate = "2025-10-06";
  auth.payerId = "wellcare";
  auth.story = "four-renewals";
  const s1 = "2025-10-07";
  const s2 = "2026-01-02";
  const s3 = "2026-03-30";
  const s4 = "2026-06-22";
  const s5 = "2026-07-13";
  auth.versions = [
    v(`${patient.mrn}-v1`, 1, "initial", 60, 60, s1, "approved"),
    v(
      `${patient.mrn}-v2`,
      2,
      "renewal",
      60,
      45,
      s2,
      "partial",
      "Approved for fewer units than requested. No reason supplied.",
    ),
    v(
      `${patient.mrn}-v3`,
      3,
      "renewal",
      60,
      30,
      s3,
      "partial",
      "Approved for fewer units than requested. No reason supplied.",
    ),
    v(
      `${patient.mrn}-v4`,
      4,
      "renewal",
      60,
      0,
      s4,
      "denied",
      "Does not meet criteria for continued TRP level of care; symptoms stable per submitted LOCUS.",
    ),
    {
      ...v(
        `${patient.mrn}-v5`,
        5,
        "appeal",
        60,
        30,
        s4,
        "approved",
        "Appeal upheld in provider's favour.",
      ),
      submittedAt: s5,
      decidedAt: "2026-08-14",
      windowStart: "2026-08-14",
      windowEnd: "2026-11-12",
    },
  ];
  auth.events = [
    ev(
      "2025-10-06",
      "intake",
      "clinician",
      "Intake assessment completed",
      "3 visits/week recommended",
    ),
    ev(
      s1,
      "submitted",
      "agent",
      "Initial request submitted via WellCare portal",
      "60 units asked",
      1,
    ),
    ev(
      "2025-10-13",
      "decided",
      "payer",
      "Approved 60 of 60 units · WellCare",
      "Criteria: payer policy",
      1,
    ),
    ev(s2, "submitted", "agent", "Renewal 2 submitted", "60 units asked", 2),
    ev(
      "2026-01-09",
      "decided",
      "payer",
      "Partial: 45 of 60 units · WellCare",
      "No reason supplied",
      2,
    ),
    ev(s3, "submitted", "agent", "Renewal 3 submitted", "60 units asked", 3),
    ev(
      "2026-04-06",
      "decided",
      "payer",
      "Partial: 30 of 60 units · WellCare",
      "No reason supplied",
      3,
    ),
    ev(s4, "submitted", "agent", "Renewal 4 submitted", "60 units asked", 4),
    ev(
      "2026-06-29",
      "decided",
      "payer",
      "Denied · WellCare",
      "Symptoms stable per LOCUS",
      4,
    ),
    ev(
      "2026-07-02",
      "p2p_held",
      "clinician",
      "Peer-to-peer held · upheld",
      "Heather M. · 50 min",
      4,
    ),
    ev(
      s5,
      "appeal_filed",
      "staff",
      "Written appeal faxed (3-part packet)",
      "70 pages",
      5,
    ),
    ev(
      "2026-07-16",
      "receipt_confirmed",
      "agent",
      "Receipt confirmed by phone",
      "Ref WEL-7065Q on file",
      5,
    ),
    ev(
      "2026-08-14",
      "appeal_decided",
      "payer",
      "Appeal won · 30 units",
      "Backdated to 2026-07-13",
      5,
    ),
  ];
  auth.status = "active";
  auth.stateSince = "2026-08-14";
  auth.nextAction = "Renewal due — this payer has cut every request";
}
