import { authByMrn, patientByMrn } from "@/lib/demo/dataset";
import {
  type EligibilityCheck,
  type EligStatus,
  eligibilityRun,
  type eligibilitySummary,
  isEligException,
  LAPSE_DATE,
} from "@/lib/demo/eligibility";
import type { LocationId } from "@/lib/demo/types";

/** One verification result joined to the member's site and authorization. */
export type EligRow = EligibilityCheck & {
  location: LocationId;
  authId?: string;
};

export type Summary = ReturnType<typeof eligibilitySummary>;

export const LOCATION_LABEL: Record<LocationId, string> = {
  lex: "Lexington",
  hop: "Hopkinsville",
};

/** Worst first: the order exceptions are listed in. */
export const STATUS_ORDER: EligStatus[] = [
  "inactive",
  "plan_changed",
  "cob",
  "carve_out",
  "action_required",
  "medicare_first",
  "collect_upfront",
  "verified",
];

/** The lapsed member's story, as written in this morning's run headline. */
export const LAPSE = {
  endedOn: LAPSE_DATE,
  visitsSince:
    eligibilityRun().find((c) => c.status === "inactive")
      ?.visitsSinceVerified ?? 0,
};

export function isException(status: EligStatus): boolean {
  return isEligException(status);
}

let cache: EligRow[] | undefined;

/** This morning's run, joined once per process. Nothing is fetched. */
export function eligRows(): EligRow[] {
  if (!cache) {
    cache = eligibilityRun().map((c) => ({
      ...c,
      location: patientByMrn(c.mrn)?.location ?? "lex",
      authId: authByMrn(c.mrn)?.id,
    }));
  }
  return cache;
}

export function rowsForLocation(location: LocationId | "both"): EligRow[] {
  return eligRows().filter(
    (r) => location === "both" || r.location === location,
  );
}

export function sortRows(
  rows: EligRow[],
  by: "severity" | "appointment",
): EligRow[] {
  return [...rows].sort((a, b) => {
    const severity =
      STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    const appointment = a.appointmentDate.localeCompare(b.appointmentDate);
    const primary =
      by === "severity" ? severity || appointment : appointment || severity;
    return primary || a.mrn.localeCompare(b.mrn);
  });
}
