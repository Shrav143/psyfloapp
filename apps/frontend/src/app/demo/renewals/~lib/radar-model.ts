import { getDataset, visitDatesFor } from "@/lib/demo/dataset";
import {
  type Clocks,
  clocksFor,
  type RenewalLane,
  renewalInFlight,
  renewalLane,
} from "@/lib/demo/derive";
import {
  addDays,
  CLINICIAN_RATE,
  DEMO_TODAY,
  daysBetween,
  VISIT_RATE,
} from "@/lib/demo/format";
import { PAYER_BY_ID } from "@/lib/demo/payers";
import type {
  Authorization,
  AuthStatus,
  LocationId,
  Patient,
} from "@/lib/demo/types";

export const HOURS_PER_PACKET = 3.5;
export const PACKET_COST = HOURS_PER_PACKET * CLINICIAN_RATE;
export const LANES: RenewalLane[] = ["overdue", "this_week", "next_30"];
export const LANE_LABEL: Record<RenewalLane, string> = {
  overdue: "Overdue",
  this_week: "This week",
  next_30: "Next 30 days",
};
export const LANE_HINT: Record<RenewalLane, string> = {
  overdue:
    "File-by date has passed. Every attended day is unbilled once coverage ends.",
  this_week: "File-by date inside 7 days. Packets need a signature this week.",
  next_30:
    "File-by date inside 30 days. Draft early; nothing sends without sign-off.",
};

/** Owned by the Denials and Appeals screens: a renewal cannot be filed against a contested version. */
const NOT_RENEWABLE: AuthStatus[] = ["appeal", "p2p", "denied", "closed"];

export type RadarRow = {
  auth: Authorization;
  patient: Patient;
  clocks: Clocks;
  lane: RenewalLane;
  leadDays: number;
  fileBy: string;
  /** The day coverage ends (or ended): units run out or the window closes. */
  bindingDate: string;
  /** Set once coverage has already ended, by which clock. */
  ended?: "units" | "days";
  gapDays: number;
  gapVisits: number;
  gapValue: number;
  signer: string;
};

export type Location = LocationId | "both";

/** When coverage actually ended, read from the visit ledger instead of clamped to today. */
function coverageEndedOn(
  clocks: Clocks,
  visits: string[],
): { on: string; by: "units" | "days" } | undefined {
  const v = clocks.version;
  if (DEMO_TODAY > v.windowEnd) {
    return { on: addDays(v.windowEnd, 1), by: "days" };
  }
  if (clocks.unitsRemaining > 0) {
    return undefined;
  }
  const inWindow = visits
    .filter((d) => d >= v.windowStart && d <= v.windowEnd)
    .sort();
  const lastUnitDay = inWindow[v.unitsGranted - 1];
  return {
    on: lastUnitDay ? addDays(lastUnitDay, 1) : v.windowStart,
    by: "units",
  };
}

function toRow(
  auth: Authorization,
  patient: Patient,
  buffer: number,
): RadarRow | undefined {
  if (NOT_RENEWABLE.includes(auth.status) || renewalInFlight(auth)) {
    return undefined;
  }
  const visits = visitDatesFor(patient.mrn);
  const clocks = clocksFor(patient, auth, visits);
  if (!clocks) {
    return undefined;
  }
  const ended = coverageEndedOn(clocks, visits);
  const bindingDate = ended ? ended.on : clocks.bindingDate;
  const leadDays = PAYER_BY_ID[auth.payerId].medianDecisionDays + buffer;
  const fileBy = addDays(bindingDate, -leadDays);
  const lane = ended ? "overdue" : renewalLane(fileBy);
  if (!lane) {
    return undefined;
  }
  const gapDays = ended ? daysBetween(ended.on, DEMO_TODAY) : 0;
  const gapVisits = ended
    ? visits.filter((d) => d >= ended.on && d <= DEMO_TODAY).length
    : 0;
  return {
    auth,
    patient,
    clocks,
    lane,
    leadDays,
    fileBy,
    bindingDate,
    ended: ended?.by,
    gapDays,
    gapVisits,
    gapValue: Math.round(gapVisits * VISIT_RATE),
    signer: clocks.version.signedBy ?? "Unassigned",
  };
}

/** Every renewal that must be filed inside 30 days, sorted by file-by date, for the chosen site(s). */
export function buildRadar(location: Location, buffer: number): RadarRow[] {
  const ds = getDataset();
  const seen = new Set<string>();
  const rows: RadarRow[] = [];
  for (const auth of ds.authorizations) {
    if (seen.has(auth.id)) {
      continue;
    }
    seen.add(auth.id);
    const patient = ds.patients.find((p) => p.mrn === auth.mrn);
    if (!patient || (location !== "both" && patient.location !== location)) {
      continue;
    }
    const row = toRow(auth, patient, buffer);
    if (row) {
      rows.push(row);
    }
  }
  return rows.sort((a, b) =>
    a.fileBy < b.fileBy ? -1 : a.fileBy > b.fileBy ? 1 : 0,
  );
}

/** Renewals already filed and awaiting a decision: off the radar by design. */
export function countInFlight(location: Location): number {
  const ds = getDataset();
  return ds.authorizations.filter((a) => {
    const p = ds.patients.find((x) => x.mrn === a.mrn);
    return Boolean(
      p &&
        (location === "both" || p.location === location) &&
        renewalInFlight(a),
    );
  }).length;
}

export type LaneTotals = {
  count: number;
  hours: number;
  cost: number;
  gapDays: number;
  gapValue: number;
};

export function laneTotals(rows: RadarRow[]): LaneTotals {
  const hours = rows.length * HOURS_PER_PACKET;
  return {
    count: rows.length,
    hours,
    cost: Math.round(hours * CLINICIAN_RATE),
    gapDays: rows.reduce((n, r) => n + r.gapDays, 0),
    gapValue: rows.reduce((n, r) => n + r.gapValue, 0),
  };
}

export type SignerPlan = {
  signer: string;
  packets: RadarRow[];
  hours: number;
  cost: number;
};

/** This week's packets grouped by the clinician who signed the current version. */
export function weekPlan(rows: RadarRow[]): SignerPlan[] {
  const groups = new Map<string, RadarRow[]>();
  for (const r of rows) {
    groups.set(r.signer, [...(groups.get(r.signer) ?? []), r]);
  }
  return [...groups.entries()]
    .map(([signer, packets]) => ({
      signer,
      packets,
      hours: packets.length * HOURS_PER_PACKET,
      cost: Math.round(packets.length * PACKET_COST),
    }))
    .sort((a, b) => b.packets.length - a.packets.length);
}

/** "Heather M., LCSW" → "Heather M." for toasts and chips. */
export function shortName(signer: string): string {
  return signer.split(",")[0] ?? signer;
}
