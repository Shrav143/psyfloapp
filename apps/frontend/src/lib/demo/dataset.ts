import {
  classifyVisits,
  clocksFor,
  coverageOn,
  renewalInFlight,
  renewalLane,
} from "./derive";
import { addDays, DEMO_TODAY, daysBetween } from "./format";
import { PAYERS } from "./payers";
import {
  bucketForIndex,
  createRng,
  seedPatients,
  seedVisitDates,
} from "./seed";
import { seedAuthorization } from "./seed-auths";
import { applyFourRenewals, STORY_MRNS } from "./stories";
import {
  applyDual,
  applyFast,
  applyHero,
  applyMissingDoc,
  applyOverdue,
  applyRenewalDeniedP2P,
  applyTypo,
} from "./stories-today";
import type { Authorization, DemoDataset, Patient, Visit } from "./types";

/** Build the whole demo dataset once per process; every screen reads from this. */
function build(): DemoDataset & { visitDatesByMrn: Record<string, string[]> } {
  const rng = createRng(20260921);
  const patients = seedPatients(rng);
  const storyIndex: Record<number, string> = {
    0: STORY_MRNS.hero,
    1: STORY_MRNS.fourRenewals,
    2: STORY_MRNS.stranded,
    3: STORY_MRNS.dual,
    4: STORY_MRNS.fast,
    5: STORY_MRNS.typo,
    51: STORY_MRNS.overdue,
    52: STORY_MRNS.missingDoc,
  };
  for (const [i, mrn] of Object.entries(storyIndex)) {
    (patients[Number(i)] as Patient).mrn = mrn;
  }
  const hero = patients[0] as Patient;
  hero.payerId = "anthem";
  hero.plannedPerWeek = 3;
  hero.actualPerWeek = 4;
  const stranded = patients[2] as Patient;
  stranded.payerId = "aetna";
  stranded.plannedPerWeek = 3;
  stranded.actualPerWeek = 1.8;
  const fast = patients[4] as Patient;
  fast.payerId = "aetna";

  const visitDatesByMrn: Record<string, string[]> = {};
  const authorizations: Authorization[] = [];
  patients.forEach((p, i) => {
    const dates = seedVisitDates(rng, p);
    visitDatesByMrn[p.mrn] = dates;
    const auth = seedAuthorization(rng, p, dates, bucketForIndex(i));
    if (i === 0) {
      applyHero(auth, p);
    }
    if (i === 1) {
      applyFourRenewals(auth, p);
    }
    if (i === 3) {
      applyDual(auth, p);
    }
    if (i === 4) {
      applyFast(auth);
    }
    if (i === 5) {
      applyTypo(auth);
    }
    if (i === 8) {
      applyRenewalDeniedP2P(auth);
    }
    if (i === 51) {
      applyOverdue(auth, p, dates);
    }
    if (i === 52) {
      applyMissingDoc(auth);
    }
    auth.events.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
    authorizations.push(auth);
  });
  tuneRenewalLanes(patients, authorizations, visitDatesByMrn);
  const visits: Visit[] = [];
  for (const p of patients) {
    const auth = authorizations.find((a) => a.mrn === p.mrn);
    visits.push(...classifyVisits(p, auth, visitDatesByMrn[p.mrn] ?? []));
  }
  return {
    today: DEMO_TODAY,
    payers: PAYERS,
    patients,
    authorizations,
    visits,
    visitDatesByMrn,
  };
}

/** Pull a few far-out renewals into the next fortnight so the radar has a realistic week. */
function tuneRenewalLanes(
  patients: Patient[],
  auths: Authorization[],
  dates: Record<string, string[]>,
): void {
  let moved = 0;
  patients.forEach((p, i) => {
    const auth = auths[i] as Authorization;
    if (moved >= 6 || auth.status !== "active" || renewalInFlight(auth)) {
      return;
    }
    const clocks = clocksFor(p, auth, dates[p.mrn] ?? []);
    if (!clocks || renewalLane(clocks.fileBy) !== undefined) {
      return;
    }
    const shift = daysBetween(DEMO_TODAY, clocks.fileBy) - (2 + (moved % 6));
    const v = clocks.version;
    const before = {
      start: v.windowStart,
      end: v.windowEnd,
      sub: v.submittedAt,
    };
    v.windowStart = addDays(v.windowStart, -shift);
    v.windowEnd = addDays(v.windowEnd, -shift);
    v.submittedAt = addDays(v.submittedAt, -shift);
    if (
      coverageOn(p, auth, dates[p.mrn] ?? [], DEMO_TODAY).reason !== "covered"
    ) {
      v.windowStart = before.start;
      v.windowEnd = before.end;
      v.submittedAt = before.sub;
      return;
    }
    auth.status = "renewal_due";
    auth.nextAction = `File renewal by ${addDays(clocks.fileBy, -shift)}`;
    moved += 1;
  });
}

let cache: ReturnType<typeof build> | undefined;

export function getDataset(): ReturnType<typeof build> {
  if (!cache) {
    cache = build();
  }
  return cache;
}

export function patientByMrn(mrn: string): Patient | undefined {
  return getDataset().patients.find((p) => p.mrn === mrn);
}

export function authByMrn(mrn: string): Authorization | undefined {
  return getDataset().authorizations.find((a) => a.mrn === mrn);
}

export function authById(id: string): Authorization | undefined {
  return getDataset().authorizations.find((a) => a.id === id);
}

export function visitDatesFor(mrn: string): string[] {
  return getDataset().visitDatesByMrn[mrn] ?? [];
}
