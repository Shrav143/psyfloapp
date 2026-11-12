import { addDays, DEMO_TODAY, daysBetween, isWeekday } from "./format";
import type { LocationId, Patient, PayerId } from "./types";

/** Deterministic PRNG so every demo load produces identical numbers. */
export function createRng(seed: number) {
  let s = seed >>> 0;
  return {
    next(): number {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    },
    int(min: number, max: number): number {
      return min + Math.floor(this.next() * (max - min + 1));
    },
    pick<T>(items: T[]): T {
      return items[Math.floor(this.next() * items.length)] as T;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;

/** Which coverage bucket a patient lands in on the demo "today". Indexes are fixed. */
export type TodayBucket =
  | "covered"
  | "awaiting_decision"
  | "units_exhausted"
  | "window_expired"
  | "denied_in_appeal"
  | "no_auth";

export function bucketForIndex(i: number): TodayBucket {
  if (i < 45) {
    return "covered";
  }
  if (i < 51) {
    return "awaiting_decision";
  }
  if (i < 55) {
    return "units_exhausted";
  }
  if (i < 57) {
    return "window_expired";
  }
  if (i < 59) {
    return "denied_in_appeal";
  }
  return "no_auth";
}

const INITIALS = [
  "J.M.",
  "A.R.",
  "T.W.",
  "D.K.",
  "M.S.",
  "R.B.",
  "L.H.",
  "K.P.",
  "S.T.",
  "C.G.",
  "B.N.",
  "E.F.",
  "P.L.",
  "N.C.",
  "G.A.",
  "W.D.",
  "H.J.",
  "V.O.",
  "O.M.",
  "Q.R.",
];

const HOMES = [
  "Bluegrass Care Home",
  "Cedar Ridge PCH",
  "Maplewood Residence",
  "Riverbend Personal Care",
  "Willow Creek Home",
  "Harmony House",
  "Oak Hollow PCH",
  "Pennyrile Care Home",
  "Lakeside Residence",
  "Sunrise Personal Care",
];

const DIAGNOSES: [string, string][] = [
  ["F20.9", "Schizophrenia, unspecified"],
  ["F25.0", "Schizoaffective disorder, bipolar type"],
  ["F31.9", "Bipolar disorder, unspecified"],
  ["F33.2", "Major depressive disorder, recurrent, severe"],
  ["F20.0", "Paranoid schizophrenia"],
  [
    "F31.5",
    "Bipolar disorder, current episode depressed, severe with psychotic features",
  ],
];

const PAYER_MIX: PayerId[] = [
  "aetna",
  "aetna",
  "anthem",
  "anthem",
  "anthem",
  "humana",
  "humana",
  "passport",
  "passport",
  "wellcare",
  "wellcare",
  "wellcare",
];

export function seedPatients(rng: Rng): Patient[] {
  const patients: Patient[] = [];
  for (let i = 0; i < 60; i++) {
    const bucket = bucketForIndex(i);
    const location: LocationId = i % 3 === 0 ? "hop" : "lex";
    const planned = rng.pick([2, 3, 3, 3, 4, 5]);
    const actual = Math.max(
      1,
      Math.round((planned - rng.next() * 1.2) * 10) / 10,
    );
    let intakeOffset = -rng.int(30, 440);
    if (bucket === "awaiting_decision") {
      intakeOffset = -rng.int(2, 8);
    }
    if (bucket === "no_auth") {
      intakeOffset = -6;
    }
    const dx = DIAGNOSES[i % DIAGNOSES.length] as [string, string];
    patients.push({
      mrn: `HBH-${2000 + i * 7 + rng.int(0, 5)}`,
      initials: INITIALS[i % INITIALS.length] as string,
      location,
      payerId:
        i % 8 === 7 ? "medicare" : (PAYER_MIX[i % PAYER_MIX.length] as PayerId),
      dualEligible: i % 8 === 7,
      hasGuardian: rng.next() < 0.6,
      primaryCareHome: HOMES[i % HOMES.length] as string,
      diagnosisCode: dx[0],
      diagnosisLabel: dx[1],
      plannedPerWeek: planned,
      actualPerWeek: actual,
      intakeDate: addDays(DEMO_TODAY, intakeOffset),
      onScheduleToday: true,
    });
  }
  return patients;
}

/** Weekday attendance from intake to today at roughly the patient's actual cadence. */
export function seedVisitDates(rng: Rng, patient: Patient): string[] {
  const dates: string[] = [];
  const total = daysBetween(patient.intakeDate, DEMO_TODAY);
  const p = patient.actualPerWeek / 5;
  for (let d = 1; d <= total; d++) {
    const iso = addDays(patient.intakeDate, d);
    if (isWeekday(iso) && rng.next() < p) {
      dates.push(iso);
    }
  }
  if (patient.onScheduleToday && !dates.includes(DEMO_TODAY)) {
    dates.push(DEMO_TODAY);
  }
  return dates;
}
