import { PROGRAM_ORDER } from "@/data/analytics";
import { DX_GROUPS, KINDS, KIND_LABEL, POPULATIONS, type Decision } from "@/data/decisions";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type BuiltInPayerId } from "@/data/types";
import { buildFigures, buildReasons, byMonth, monthPoints, planOf, type Figure, type MonthPoint, type ReasonRow } from "./board";
import { inMonths, inPeriod, narrow, periodInfo, type Filters } from "./filters";
import { insightsFor } from "./insights";
import { pctOf, statsOf, type Stats } from "./stats";

/* One payer, in the period and filters the page is showing: the same functions as the page, run on that payer's decisions. */

export interface GroupBar {
  key: string;
  label: string;
  n: number;
  rate: number | null;
  /** The clinic's rate for the same group, across all payers in view. */
  clinic: number | null;
}
export interface PayerView {
  payer: BuiltInPayerId;
  name: string;
  plan: string;
  s: Stats;
  clinic: Stats;
  figures: Figure[];
  months: MonthPoint[];
  clinicMonths: MonthPoint[];
  groups: { dx: GroupBar[]; program: GroupBar[]; kind: GroupBar[]; population: GroupBar[] };
  reasons: ReasonRow[];
  insights: string[];
  rows: Decision[];
}

function bars(keys: { id: string; label: string }[], keyOf: (d: Decision) => string, mine: readonly Decision[], clinic: readonly Decision[]): GroupBar[] {
  return keys.map((k) => {
    const a = mine.filter((d) => keyOf(d) === k.id);
    const c = clinic.filter((d) => keyOf(d) === k.id);
    return { key: k.id, label: k.label, n: a.length, rate: pctOf(a.filter((d) => d.outcome === "approved").length, a.length), clinic: pctOf(c.filter((d) => d.outcome === "approved").length, c.length) };
  });
}

export function buildPayerView(scoped: readonly Decision[], f: Filters, payer: BuiltInPayerId): PayerView {
  const period = periodInfo(f.period);
  const everyone = narrow(scoped, { ...f, payer: "all" });
  const mineAll = everyone.filter((d) => d.payerId === payer);
  const cur = inPeriod(mineAll, f);
  const clinicCur = inPeriod(everyone, f);
  const nowRows = mineAll.filter((d) => inMonths(d, period.compare.now));
  const beforeRows = mineAll.filter((d) => inMonths(d, period.compare.before));
  const p = payerById(payer);
  return {
    payer,
    name: p.name,
    plan: planOf(payer),
    s: statsOf(cur),
    clinic: statsOf(clinicCur),
    figures: buildFigures(cur, nowRows, beforeRows, byMonth(mineAll), period),
    months: monthPoints(mineAll),
    clinicMonths: monthPoints(everyone),
    groups: {
      dx: bars(DX_GROUPS, (d) => d.dx, cur, clinicCur),
      program: bars(PROGRAM_ORDER.map((id) => ({ id, label: PROGRAM_LABEL[id] })), (d) => d.program, cur, clinicCur),
      kind: bars(KINDS.map((id) => ({ id, label: KIND_LABEL[id] })), (d) => d.kind, cur, clinicCur),
      population: bars(POPULATIONS, (d) => d.population, cur, clinicCur),
    },
    reasons: buildReasons(cur).rows,
    insights: insightsFor(payer, cur, clinicCur),
    rows: cur,
  };
}
