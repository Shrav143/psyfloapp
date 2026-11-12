import { partialDetail } from "./analytics";
import { getDataset, visitDatesFor } from "./dataset";
import { coverageOn, REASON_LABEL, visitValue } from "./derive";
import { addDays, CLINICIAN_RATE, DEMO_TODAY, VISIT_RATE } from "./format";
import type { VisitReason } from "./types";

export type LeakTag = "preventable" | "recoverable" | "structural";

export type LeakRow = {
  key: string;
  label: string;
  visits: number;
  value: number;
  tag: LeakTag;
  recoverable: string;
};

const LEAK_META: Record<
  Exclude<VisitReason, "covered">,
  { tag: LeakTag; recoverable: string }
> = {
  intake_lag: { tag: "structural", recoverable: "No — before the backdate" },
  awaiting_decision: {
    tag: "recoverable",
    recoverable: "Yes if approved (backdated)",
  },
  units_exhausted: { tag: "preventable", recoverable: "No" },
  window_expired: {
    tag: "preventable",
    recoverable: "Unknown — depends on renewal backdating",
  },
  denied_in_appeal: { tag: "recoverable", recoverable: "Only via appeal" },
  no_auth: { tag: "preventable", recoverable: "No" },
  eligibility_lapsed: { tag: "structural", recoverable: "No" },
};

export function leakageReport(days = 90): {
  rows: LeakRow[];
  totals: Record<LeakTag, number>;
  total: number;
} {
  const ds = getDataset();
  const since = addDays(DEMO_TODAY, -days);
  const counts: Partial<Record<VisitReason, number>> = {};
  for (const v of ds.visits) {
    if (v.date >= since && v.reason !== "covered") {
      counts[v.reason] = (counts[v.reason] ?? 0) + 1;
    }
  }
  counts.eligibility_lapsed = 9;
  const rows: LeakRow[] = (
    Object.keys(LEAK_META) as Exclude<VisitReason, "covered">[]
  ).map((key) => ({
    key,
    label: REASON_LABEL[key],
    visits: counts[key] ?? 0,
    value: visitValue(counts[key] ?? 0),
    tag: LEAK_META[key].tag,
    recoverable: LEAK_META[key].recoverable,
  }));
  const partials = partialDetail().filter((p) => p.decidedAt >= since);
  const shortfall = partials.reduce((n, p) => n + p.shortfall, 0);
  rows.push({
    key: "partial_shortfall",
    label: "Partial approval shortfall",
    visits: shortfall,
    value: visitValue(shortfall),
    tag: "recoverable",
    recoverable: "Via appeal, rarely pursued",
  });
  rows.push({
    key: "discharged",
    label: "Discharged after final denial (forward, per month)",
    visits: 3,
    value: Math.round(3 * 13 * VISIT_RATE),
    tag: "structural",
    recoverable: "No",
  });
  const totals: Record<LeakTag, number> = {
    preventable: 0,
    recoverable: 0,
    structural: 0,
  };
  for (const r of rows) {
    totals[r.tag] += r.value;
  }
  return {
    rows,
    totals,
    total: totals.preventable + totals.recoverable + totals.structural,
  };
}

export function clinicianTime(days = 90) {
  const ds = getDataset();
  const since = addDays(DEMO_TODAY, -days);
  const packets = ds.authorizations
    .flatMap((a) => a.versions)
    .filter(
      (v) =>
        (v.kind === "initial" || v.kind === "renewal") &&
        v.submittedAt >= since,
    ).length;
  const p2ps = ds.authorizations
    .flatMap((a) => a.events)
    .filter((e) => e.type === "p2p_held" && e.at >= since).length;
  const appeals = ds.authorizations
    .flatMap((a) => a.events)
    .filter((e) => e.type === "appeal_filed" && e.at >= since).length;
  const hours = packets * 3.5 + p2ps * 0.75 + appeals * 4;
  return {
    packets,
    p2ps,
    appeals,
    hours,
    cost: Math.round(hours * CLINICIAN_RATE),
    perPacketHours: 3.5,
  };
}

/** Value at risk per day for the last 30 days, for the sparkline. */
export function atRiskSeries(days = 30) {
  const ds = getDataset();
  const out: { date: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(DEMO_TODAY, -i);
    const n = ds.visits.filter(
      (v) => v.date === date && v.reason !== "covered",
    ).length;
    out.push({ date, value: visitValue(n) });
  }
  return out;
}

export function coverageToday() {
  const ds = getDataset();
  const buckets: Partial<Record<VisitReason, string[]>> = {};
  for (const p of ds.patients.filter((x) => x.onScheduleToday)) {
    const auth = ds.authorizations.find((a) => a.mrn === p.mrn);
    const c = coverageOn(p, auth, visitDatesFor(p.mrn), DEMO_TODAY);
    const list = buckets[c.reason] ?? [];
    list.push(p.mrn);
    buckets[c.reason] = list;
  }
  const scheduled = ds.patients.filter((x) => x.onScheduleToday).length;
  const covered = buckets.covered?.length ?? 0;
  return {
    scheduled,
    covered,
    buckets,
    atRisk: visitValue(scheduled - covered),
  };
}
