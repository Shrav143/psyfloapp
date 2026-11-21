import { getDataset, visitDatesFor } from "./dataset";
import { addDays, DEMO_TODAY, isWeekday } from "./format";
import { PAYER_BY_ID } from "./payers";
import { createRng } from "./seed";
import type { Patient, PayerId } from "./types";

export type EligStatus =
  | "verified"
  | "collect_upfront"
  | "action_required"
  | "inactive"
  | "carve_out"
  | "cob"
  | "medicare_first"
  | "plan_changed";

export type EligibilityCheck = {
  id: string;
  mrn: string;
  initials: string;
  appointmentDate: string;
  payerId: PayerId;
  status: EligStatus;
  headline: string;
  detail: string;
  planName: string;
  memberId: string;
  coverageActive: boolean;
  inNetwork: boolean;
  mhBenefit: string;
  dailyLimit: string;
  copay: number;
  deductibleRemaining: number;
  visitsSinceVerified: number;
  lastVerifiedAt: string;
  checkedAt: string;
  source: string;
  nextRecheck: string;
};

export const ELIG_STATUS_LABEL: Record<EligStatus, string> = {
  verified: "Verified",
  collect_upfront: "Verified · collect upfront",
  action_required: "Action required",
  inactive: "Inactive",
  carve_out: "Carve-out",
  cob: "COB conflict",
  medicare_first: "Medicare-first",
  plan_changed: "Plan changed",
};

export const LAPSE_DATE = "2026-08-31";

const SPECIAL: Partial<
  Record<number, { status: EligStatus; headline: string; detail: string }>
> = {
  6: {
    status: "inactive",
    headline:
      "Medicaid coverage ended 31 Aug. {n} visits delivered since. Re-verify with the guardian and pause billing.",
    detail:
      "271 returned 'subscriber not found' for DOS after 31 Aug. Last successful check 22 Aug. Recertification window open until 30 Nov.",
  },
  13: {
    status: "plan_changed",
    headline:
      "Member moved from WellCare to Passport on 1 Sep. The WellCare authorization does not transfer — file a new initial request.",
    detail:
      "Kentucky open-enrollment change detected via 271 payer ID. Existing auth WEL-7182 is void for Passport dates of service.",
  },
  19: {
    status: "cob",
    headline:
      "271 lists an Anthem commercial plan as primary. Medicaid pays last — obtain COB form before billing.",
    detail:
      "Member has employer coverage through a guardian. Claims billed to Medicaid first will deny CO-22.",
  },
  22: {
    status: "carve_out",
    headline:
      "Behavioral health is carved out to Carelon for this plan. Authorize and bill Carelon, not the MCO.",
    detail:
      "Plan-level carve-out identified from 271 service type 'MH'. Carelon portal credentials on file.",
  },
  28: {
    status: "action_required",
    headline:
      "Member ID on file does not match payer records. Confirm ID from the card and rerun eligibility.",
    detail:
      "Payer returned AAA error 72 (invalid member ID). Likely transposed digits: on file ...4471, card may read ...4417.",
  },
  35: {
    status: "action_required",
    headline:
      "Plan shows 3 units/day cap on H2020 across providers. Another provider billed 1 unit on 12 Sep — confirm no overlap.",
    detail:
      "Daily-limit benefit detail returned by payer. Overlapping days would deny CO-119.",
  },
};

function baseCheck(
  p: Patient,
  appt: string,
  rng: ReturnType<typeof createRng>,
): EligibilityCheck {
  const payer = PAYER_BY_ID[p.payerId];
  const dual = p.dualEligible;
  const status: EligStatus = dual
    ? "medicare_first"
    : rng.next() < 0.08
      ? "collect_upfront"
      : "verified";
  const headline = dual
    ? "Dual-eligible. Medicare must reject H2020 before Kentucky Medicaid pays — Medicare claim pending 14 days."
    : status === "collect_upfront"
      ? "Coverage active and in-network. Sliding-scale share of $5 applies; collect at check-in."
      : "Coverage active, in-network, H2020 TRP benefit covered. No action needed.";
  return {
    id: `elig-${p.mrn}`,
    mrn: p.mrn,
    initials: p.initials,
    appointmentDate: appt,
    payerId: p.payerId,
    status,
    headline,
    detail: dual
      ? "Medicare primary (traditional). Kentucky Medicaid secondary via MCO. Crossover claim must show Medicare denial."
      : `Plan ${payer.short} · TRP daily-limit 1 unit/day · no deductible on Medicaid.`,
    planName: payer.name,
    memberId: `${rng.int(10, 99)}${rng.int(100000, 999999)}${rng.int(10, 99)}`,
    coverageActive: true,
    inNetwork: true,
    mhBenefit: "Covered — H2020 TRP, prior authorization required",
    dailyLimit: "1 unit per day",
    copay: status === "collect_upfront" ? 5 : 0,
    deductibleRemaining: 0,
    visitsSinceVerified: visitDatesFor(p.mrn).filter(
      (d) => d > addDays(DEMO_TODAY, -7),
    ).length,
    lastVerifiedAt: addDays(DEMO_TODAY, -rng.int(0, 6)),
    checkedAt: `${DEMO_TODAY} 06:10`,
    source:
      p.payerId === "wellcare"
        ? "Payer portal (agent)"
        : "270/271 via Availity",
    nextRecheck: addDays(DEMO_TODAY, 7),
  };
}

let cache: EligibilityCheck[] | undefined;

/** True for rows a human must act on. Medicare-first rows are a billing-order note, not a problem. */
export function isEligException(status: EligStatus): boolean {
  return (
    status !== "verified" &&
    status !== "collect_upfront" &&
    status !== "medicare_first"
  );
}

/** The rolling 7-day verification run that ran this morning. */
export function eligibilityRun(): EligibilityCheck[] {
  if (cache) {
    return cache;
  }
  const rng = createRng(77);
  const ds = getDataset();
  cache = ds.patients.map((p, i) => {
    let appt = addDays(DEMO_TODAY, i % 5);
    while (!isWeekday(appt)) {
      appt = addDays(appt, 1);
    }
    const c = baseCheck(p, appt, rng);
    const special = SPECIAL[i];
    if (special) {
      c.status = special.status;
      const since = visitDatesFor(p.mrn).filter(
        (d) => d > LAPSE_DATE && d < DEMO_TODAY,
      ).length;
      c.headline = special.headline.replace("{n}", String(since));
      c.visitsSinceVerified =
        special.status === "inactive" ? since : c.visitsSinceVerified;
      c.detail = special.detail;
      c.coverageActive = special.status !== "inactive";
      c.inNetwork = special.status !== "carve_out";
      if (special.status === "carve_out") {
        c.mhBenefit = "Carved out — Carelon Behavioral Health";
      }
      if (special.status === "inactive") {
        c.mhBenefit = "No active coverage";
      }
    }
    return c;
  });
  return cache;
}

export function eligibilitySummary() {
  const run = eligibilityRun();
  const count = (s: EligStatus) => run.filter((r) => r.status === s).length;
  return {
    total: run.length,
    verified:
      count("verified") + count("collect_upfront") + count("medicare_first"),
    exceptions:
      run.length -
      count("verified") -
      count("collect_upfront") -
      count("medicare_first"),
    inactive: count("inactive"),
    medicareFirst: count("medicare_first"),
    checkedAt: `${DEMO_TODAY} 06:10`,
  };
}
