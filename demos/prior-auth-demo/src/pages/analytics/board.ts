import { PAYER_ORDER, PROGRAM_ORDER, type PeriodInfo } from "@/data/analytics";
import { DX_GROUPS, KINDS, KIND_LABEL, POPULATIONS, cmsApplies, type Decision, type DxId, type PopulationId } from "@/data/decisions";
import type { RequestKind } from "@/data/queue";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, type BuiltInPayerId, type Program } from "@/data/types";
import { inMonths, inPeriod, narrow, periodInfo, type Filters } from "./filters";
import type { CaseQuery } from "./query";
import { buildFlo, buildLos, buildProcess, buildReasons, type Flo, type LosRow, type Process, type Reasons } from "./boardParts";
import { avgDays, avgDaysShown, byMonth, daysDeltaText, daysText, enough, fmt, groupBy, monthPoints, pctOf, pctText, ptsText, shownPct, statsOf, type MonthPoint, type Stats } from "./stats";

export * from "./boardParts";
export { byMonth, monthPoints, type MonthPoint } from "./stats";

/* Everything the page shows, worked out from the records in one pass: the six headline figures, the monthly trend, the payer scorecard,
   the case-mix matrix, the denial reasons, length of stay, process health and the site comparison. */

export type FigureId = "approval" | "denial" | "firstPass" | "time" | "preventable" | "appeals";
export interface Figure {
  id: FigureId;
  label: string;
  /** The figure as shown: "71%", "2.4 days", "207", or "-" when it rests on too few. */
  value: string;
  raw: number | null;
  /** The change against the earlier period. `good` is null for a change that is neither better nor worse. */
  change: { dir: "up" | "down" | "flat"; text: string; good: boolean | null } | null;
  sub: string;
  /** Twelve monthly values. */
  spark: (number | null)[];
  info: string;
  query: CaseQuery;
}

const MONTH_PERIOD = (months: readonly Decision[][]): Stats[] => months.map((m) => statsOf(m));

const rollingStats = (months: Decision[][], i: number, width: number): Stats => statsOf(months.slice(Math.max(0, i - width + 1), i + 1).flat());

/** The headline figure values, from stats. Shared by the page and the payer panel. */
function figureValues(s: Stats): Record<FigureId, number | null> {
  return {
    approval: shownPct(s.approved, s.n),
    denial: shownPct(s.notApproved, s.n),
    firstPass: shownPct(s.firstPass, s.n),
    time: avgDaysShown(s),
    preventable: enough(s.notApproved) ? s.preventable : null,
    appeals: shownPct(s.overturned, s.rulings),
  };
}

const INFO: Record<FigureId, string> = {
  approval: "Share of decisions where the payer approved what was asked for, all of the days or units. Counted from the cases listed when you open the figure.",
  denial: "Share of decisions that were denied or cut back (approved in part). It is 100 minus the approval rate. Accepted denials are ones the clinic chose not to challenge.",
  firstPass: "Approved as requested on the first look, with no request for more information. A request that was approved after the payer asked for more does not count.",
  time: "Average time from sent to decision. The share past the CMS decision time covers the Medicaid managed care plans only: 72 hours for an expedited request and 7 calendar days for a standard one, from 2026. Check your state.",
  preventable: "Denials whose reason the team could have fixed before sending: thin or missing documentation, late notice, an incomplete certification, a duplicate request.",
  appeals: "Appeals the payer ruled on that were overturned or partly restored. A ruling is counted when Denial Intelligence records it.",
};

export function buildFigures(cur: readonly Decision[], now: readonly Decision[], before: readonly Decision[], months: Decision[][], period: PeriodInfo, base: Partial<CaseQuery> = {}): Figure[] {
  const s = statsOf(cur);
  const a = statsOf(now);
  const b = statsOf(before);
  const v = figureValues(s);
  const words = period.compare.words;
  const pts = (x: number | null, y: number | null, higherIsBetter: boolean | null): Figure["change"] => {
    if (x === null || y === null) return null;
    const d = x - y;
    return { dir: d > 0 ? "up" : d < 0 ? "down" : "flat", text: `${ptsText(d)} ${words}`, good: d === 0 || higherIsBetter === null ? null : d > 0 === higherIsBetter };
  };
  const monthStats = MONTH_PERIOD(months);
  const rate = (pick: (m: Stats) => number, denom: (m: Stats) => number): (number | null)[] => monthStats.map((m) => (denom(m) > 0 ? Math.round((100 * pick(m)) / denom(m)) : null));
  const spark: Record<FigureId, (number | null)[]> = {
    approval: rate((m) => m.approved, (m) => m.n),
    denial: rate((m) => m.notApproved, (m) => m.n),
    firstPass: rate((m) => m.firstPass, (m) => m.n),
    time: monthStats.map((m) => avgDays(m)),
    preventable: monthStats.map((m) => m.preventable),
    // a month holds too few rulings to draw a line, so each point is the three months up to it
    appeals: months.map((_, i) => pctOf(rollingStats(months, i, 3).overturned, rollingStats(months, i, 3).rulings)),
  };
  const timeDelta = enough(a.n) && enough(b.n) ? Math.round(((a.hours / a.n - b.hours / b.n) / 24) * 10) / 10 : null;
  const share = (x: Stats): number | null => (enough(x.notApproved) ? pctOf(x.preventable, x.notApproved) : null);
  const cmsLine = s.cmsN > 0 ? `${pctOf(s.pastCms, s.cmsN)}% past the CMS time at Medicaid plans (${fmt(s.pastCms)} of ${fmt(s.cmsN)})` : "The CMS decision time applies to Medicaid plans only";
  return [
    { id: "approval", label: "Approval rate", value: pctText(v.approval), raw: v.approval, change: pts(shownPct(a.approved, a.n), shownPct(b.approved, b.n), true), sub: `${fmt(s.approved)} of ${fmt(s.n)} approved as requested`, spark: spark.approval, info: INFO.approval, query: { ...base, title: "Approved as requested", outcome: "approved" } },
    { id: "denial", label: "Denial rate", value: pctText(v.denial), raw: v.denial, change: pts(shownPct(a.notApproved, a.n), shownPct(b.notApproved, b.n), false), sub: `${fmt(s.notApproved)} denials · ${fmt(s.accepted)} accepted`, spark: spark.denial, info: INFO.denial, query: { ...base, title: "Denied or approved in part", outcome: "notApproved" } },
    { id: "firstPass", label: "First-pass approval", value: pctText(v.firstPass), raw: v.firstPass, change: pts(shownPct(a.firstPass, a.n), shownPct(b.firstPass, b.n), true), sub: `${fmt(s.firstPass)} approved with no information request`, spark: spark.firstPass, info: INFO.firstPass, query: { ...base, title: "First-pass approvals", flag: "firstPass" } },
    {
      id: "time",
      label: "Average decision time",
      value: v.time === null ? "-" : daysText(v.time),
      raw: v.time,
      change: timeDelta === null ? null : { dir: timeDelta > 0 ? "up" : timeDelta < 0 ? "down" : "flat", text: `${daysDeltaText(timeDelta)} ${words}`, good: Math.abs(timeDelta) < 0.05 ? null : timeDelta < 0 },
      sub: cmsLine,
      spark: spark.time,
      info: INFO.time,
      query: { ...base, title: "All decisions, slowest first", slowest: true },
    },
    { id: "preventable", label: "Preventable denials", value: v.preventable === null ? "-" : fmt(v.preventable), raw: v.preventable, change: pts(share(a), share(b), false), sub: v.preventable === null ? "Not enough denials yet" : `${pctOf(s.preventable, s.notApproved)}% of ${fmt(s.notApproved)} denials`, spark: spark.preventable, info: INFO.preventable, query: { ...base, title: "Preventable denials", flag: "preventable" } },
    { id: "appeals", label: "Appeals overturned", value: pctText(v.appeals), raw: v.appeals, change: pts(shownPct(a.overturned, a.rulings), shownPct(b.overturned, b.rulings), true), sub: s.rulings === 0 ? "No rulings yet" : `${fmt(s.overturned)} of ${fmt(s.rulings)} rulings · ${fmt(s.accepted)} denials accepted`, spark: spark.appeals, info: INFO.appeals, query: { ...base, title: "Appeals the payer ruled on", flag: "ruled" } },
  ];
}

/* ------------------------------------------------------------------ scorecard */
export interface ScoreRow {
  payer: BuiltInPayerId | "all";
  name: string;
  plan: string;
  s: Stats;
  approval: number | null;
  denial: number | null;
  partial: number;
  days: number | null;
  pastCms: number | null;
  cms: boolean;
  info: number;
  overturn: number | null;
  trend: number | null;
  spark: (number | null)[];
}
/** The plan type in a few words: "Medicaid managed care", "Commercial PPO", "Medicare Advantage", "Behavioral carve-out". */
const PLAN_BY_GROUP: Record<string, string> = { "Ohio Medicaid": "Medicaid managed care", Commercial: "Commercial PPO", "Medicare Advantage": "Medicare Advantage", "Behavioral carve-out": "Behavioral carve-out" };
export const planOf = (payer: BuiltInPayerId): string => {
  const p = payerById(payer);
  return PLAN_BY_GROUP[p.group] ?? `${p.type} · ${p.group}`;
};
function scoreRow(payer: BuiltInPayerId | "all", rows: readonly Decision[], period: PeriodInfo): ScoreRow {
  const cur = rows.filter((d) => inMonths(d, period.months));
  const s = statsOf(cur);
  const a = statsOf(rows.filter((d) => inMonths(d, period.compare.now)));
  const b = statsOf(rows.filter((d) => inMonths(d, period.compare.before)));
  const ra = shownPct(a.approved, a.n);
  const rb = shownPct(b.approved, b.n);
  const cmsAll = payer === "all" ? true : cmsApplies(payer);
  return {
    payer,
    name: payer === "all" ? "All payers" : payerById(payer).name,
    plan: payer === "all" ? "Every payer in view" : planOf(payer),
    s,
    approval: shownPct(s.approved, s.n),
    denial: shownPct(s.notApproved, s.n),
    partial: s.partial,
    days: avgDaysShown(s),
    pastCms: s.cmsN > 0 && enough(s.cmsN) ? pctOf(s.pastCms, s.cmsN) : null,
    cms: cmsAll && s.cmsN > 0,
    info: s.infoRequests,
    overturn: shownPct(s.overturned, s.rulings),
    trend: ra === null || rb === null ? null : ra - rb,
    spark: byMonth(rows).map((m) => (m.length ? pctOf(m.filter((d) => d.outcome === "approved").length, m.length) : null)),
  };
}

/* ------------------------------------------------------------------ matrix */
export type MatrixKey = "dx" | "program" | "kind" | "population";
export interface Cell {
  n: number;
  approved: number;
  rate: number | null;
}
export interface MatrixRow {
  payer: BuiltInPayerId | "all";
  label: string;
  cells: Cell[];
  total: Cell;
}
export interface Matrix {
  key: MatrixKey;
  title: string;
  cols: { id: string; label: string }[];
  rows: MatrixRow[];
}
const cellOf = (rows: readonly Decision[]): Cell => {
  const approved = rows.filter((d) => d.outcome === "approved").length;
  return { n: rows.length, approved, rate: pctOf(approved, rows.length) };
};

interface Axis {
  title: string;
  cols: { id: string; label: string }[];
  keyOf: (d: Decision) => string;
}
export const AXES: Record<MatrixKey, Axis> = {
  dx: { title: "Diagnosis group", cols: DX_GROUPS.map((d) => ({ id: d.id, label: d.label })), keyOf: (d) => d.dx },
  program: { title: "Program", cols: PROGRAM_ORDER.map((p) => ({ id: p, label: PROGRAM_LABEL[p] })), keyOf: (d) => d.program },
  kind: { title: "Request type", cols: KINDS.map((k) => ({ id: k, label: KIND_LABEL[k] })), keyOf: (d) => d.kind },
  population: { title: "Population", cols: POPULATIONS.map((p) => ({ id: p.id, label: p.label })), keyOf: (d) => d.population },
};

export function buildMatrix(key: MatrixKey, rows: readonly Decision[], payers: readonly BuiltInPayerId[]): Matrix {
  const axis = AXES[key];
  const ids = axis.cols.map((c) => c.id);
  const line = (payer: BuiltInPayerId | "all", set: readonly Decision[]): MatrixRow => {
    const g = groupBy(set, ids, axis.keyOf);
    return { payer, label: payer === "all" ? "All payers" : payerById(payer).shortName, cells: ids.map((id) => cellOf(g.get(id) ?? [])), total: cellOf(set) };
  };
  return { key, title: axis.title, cols: axis.cols, rows: [...payers.map((p) => line(p, rows.filter((d) => d.payerId === p))), ...(payers.length > 1 ? [line("all", rows)] : [])] };
}
/** The query behind a matrix cell. `payer` and `colId` are null for a total. */
export function cellQuery(key: MatrixKey, payer: BuiltInPayerId | "all", colId: string | null): CaseQuery {
  const q: CaseQuery = { title: "" };
  if (payer !== "all") q.payer = payer;
  if (colId !== null) {
    if (key === "dx") q.dx = colId as DxId;
    else if (key === "program") q.program = colId as Program;
    else if (key === "kind") q.kind = colId as RequestKind;
    else q.population = colId as PopulationId;
  }
  return q;
}

/* ------------------------------------------------------------------ the board */
export interface SiteSplit {
  A: Stats;
  B: Stats;
  all: Stats;
}
export interface Board {
  filters: Filters;
  period: PeriodInfo;
  /** Rows in the period, after the payer, program and diagnosis filters. */
  cur: Decision[];
  s: Stats;
  figures: Figure[];
  /** Twelve months, after the payer, program and diagnosis filters. */
  months: MonthPoint[];
  /** The same twelve months for every payer (the clinic's own average), when a payer is picked. */
  clinicMonths: MonthPoint[] | null;
  score: ScoreRow[];
  matrices: Record<MatrixKey, Matrix>;
  reasons: Reasons;
  topCause: { label: string; payer: BuiltInPayerId; count: number; share: number } | null;
  los: LosRow[];
  process: Process;
  flo: Flo;
  sites: SiteSplit | null;
}

/** `scoped` is every record the viewer may see. `both` is true when the viewer sees both sites, so the comparison has something to compare. */
export function buildBoard(scoped: readonly Decision[], f: Filters, both: boolean): Board {
  const period = periodInfo(f.period);
  const narrowed = narrow(scoped, f);
  const cur = inPeriod(narrowed, f);
  const months = byMonth(narrowed);
  const nowRows = narrowed.filter((d) => inMonths(d, period.compare.now));
  const beforeRows = narrowed.filter((d) => inMonths(d, period.compare.before));
  const noPayer = narrow(scoped, { ...f, payer: "all" });
  const payers = f.payer === "all" ? PAYER_ORDER : [f.payer];
  const byPayer = (p: BuiltInPayerId) => narrowed.filter((d) => d.payerId === p);
  const curByCause = new Map<string, { payer: BuiltInPayerId; label: string; count: number }>();
  for (const d of cur) if (d.outcome !== "approved" && d.reason) curByCause.set(`${d.payerId}|${d.reason}`, { payer: d.payerId, label: d.reason, count: (curByCause.get(`${d.payerId}|${d.reason}`)?.count ?? 0) + 1 });
  const top = [...curByCause.values()].sort((a, b) => b.count - a.count)[0];
  const denials = cur.filter((d) => d.outcome !== "approved").length;
  const siteRows = (site: "A" | "B"): Decision[] => cur.filter((d) => d.site === site);
  return {
    filters: f,
    period,
    cur,
    s: statsOf(cur),
    figures: buildFigures(cur, nowRows, beforeRows, months, period),
    months: monthPoints(narrowed),
    clinicMonths: f.payer === "all" ? null : monthPoints(noPayer),
    score: [...payers.map((p) => scoreRow(p, byPayer(p), period)), scoreRow("all", noPayer, period)],
    matrices: { dx: buildMatrix("dx", cur, payers), program: buildMatrix("program", cur, payers), kind: buildMatrix("kind", cur, payers), population: buildMatrix("population", cur, payers) },
    reasons: buildReasons(cur),
    topCause: top && enough(denials) ? { ...top, share: pctOf(top.count, denials) ?? 0 } : null,
    los: buildLos(cur, payers),
    process: buildProcess(narrowed, cur),
    flo: buildFlo(cur),
    sites: both ? { A: statsOf(siteRows("A")), B: statsOf(siteRows("B")), all: statsOf(cur) } : null,
  };
}
