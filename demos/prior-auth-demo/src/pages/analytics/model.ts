import {
  ACCEPTED, ACTIONS, ALL, APPEALS, APPROVED, APPROVED_PREV, BASE, MIN_DECISIONS, OVERTURN_SHIFT, PAYER_ORDER, PERIODS, PROGRAM_WEIGHTS, REASONS, TURNAROUND_PREV, TURNAROUND_SCALE,
  type PayerFilter, type PeriodId, type PeriodInfo, type ProgramFilter, type Reason,
} from "@/data/analytics";
import { payerById } from "@/data/seed";
import type { PayerId, Program, PsyRequest } from "@/data/types";
import { PAYER_ROW_LABEL } from "@/pages/dashboard/helpers";
import { inStage } from "@/store/selectors";
import type { AppealDecision, DenialAccepted } from "@/store/ripples";

/* Pure model for the Analytics page. A figure based on fewer than 20 decisions (or denials) is null, never a number.
   Everything is summed from one table of cells (payer x period x program), so the four key figures, the charts and the
   report always agree. Every cell is Modeled from the quarter's decisions; turnaround and the program split are Demo values. */

export interface Tile {
  /** null = hidden: Not enough decisions yet. */
  value: number | null;
  /** The decisions (or denials, or drafts) behind it. */
  n: number;
  unit: string;
}
export interface BarRow {
  label: string;
  value: number | null;
  n: number;
}
export interface EditPart {
  label: string;
  share: number;
  approved: number;
  color: string;
}
export interface ReasonRow {
  reason: string;
  payerId: PayerId;
  payer: string;
  count: number;
  share: number;
}
export interface HelpRow {
  label: string;
  applied: number;
  approved: number;
}
export interface PreventableBar {
  label: string;
  count: number;
  /** The rolled-up "other" row, so the bars always add up to the figure. */
  other?: boolean;
}
/** What other screens have recorded since the demo opened: appeal rulings, accepted denials, dismissed recommendations (with the payer and program, when known). */
export interface Ripples {
  appeals: (AppealDecision & { program?: Program })[];
  accepted: (DenialAccepted & { program?: Program })[];
  dismissals: { reason: string; payerId?: string; program?: Program }[];
}
export const NO_RIPPLES: Ripples = { appeals: [], accepted: [], dismissals: [] };

export interface View {
  period: PeriodInfo;
  payer: PayerFilter;
  program: ProgramFilter;
  scope: string;
  programLabel: string;
  decisions: number;
  /** Approval rate: approved as asked. */
  approved: Tile & { delta: number };
  /** Denial rate: the rest. `denials` is the count behind it. */
  denial: Tile & { delta: number; denials: number };
  /** Average days from sent to decision, in days. Null under 20 decisions. `typical` is what the payers call normal. */
  turnaround: { days: number | null; typical: number; delta: number; n: number };
  /** Denials whose reason the team can fix before sending, as a count and a share of denials. `bars` add up to `count`. */
  preventable: { count: number | null; share: number | null; n: number; bars: PreventableBar[] };
  topCause: Tile & { label: string };
  advice: Tile;
  noEdits: Tile;
  bars: BarRow[];
  edits: { n: number; parts: EditPart[] } | null;
  reasons: { rows: ReasonRow[]; total: number } | null;
  helps: HelpRow[] | null;
  /** Appeals the payer ruled on. `overturned` counts partly restored ones too. Hidden under 20 rulings. */
  appeals: Tile & { overturned: number };
  /** Denials the clinic accepted, counted. Shown under the denial reasons. */
  accepted: { n: number };
  /** Reasons given when a recommendation was dismissed. Null when nobody dismissed one. */
  dismissed: { reason: string; count: number }[] | null;
}

const enough = (n: number): boolean => n >= MIN_DECISIONS;
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const round1 = (n: number): number => Math.round(n * 10) / 10;
export const periodInfo = (id: PeriodId): PeriodInfo => PERIODS.find((p) => p.id === id) ?? PERIODS[0];

const shareOf = (program: ProgramFilter): number => (program === "all" ? 1 : PROGRAM_WEIGHTS[program].share / 100);
const scaled = (n: number, p: PeriodInfo, program: ProgramFilter): number => Math.round(n * p.scale * shareOf(program));
export const programLabel = (program: ProgramFilter): string => (program === "all" ? "All programs" : PROGRAM_WEIGHTS[program].label);

/** Other periods drift a little from this quarter. */
const ADVICE_SHIFT: Record<PeriodId, number> = { quarter: 0, last_quarter: -3, year: -5 };
const HELP_SHIFT: Record<PeriodId, number> = { quarter: 0, last_quarter: -3, year: -4 };
const EDIT_SHIFT: Record<PeriodId, [number, number, number]> = { quarter: [0, 0, 0], last_quarter: [-3, 2, 1], year: [-5, 3, 2] };
const EDIT_COLORS = ["#2F6F5C", "#8F6620", "#B5553A"];
const EDIT_LABELS = ["Sent as written", "Light edits", "Rewritten"];
export const PREVENTABLE_COLOR = "#8F6620";
const TOP_PREVENTABLE = 5;

/** One payer in one period and program: its decisions, its approved-as-asked rate and the denials that leaves. */
interface Cell {
  id: PayerId;
  decisions: number;
  approved: number;
  denials: number;
}
function cellOf(id: PayerId, p: PeriodInfo, program: ProgramFilter, table: Record<PayerId, number>): Cell {
  const decisions = scaled(BASE[id].decisions, p, program);
  const approved = clamp(table[id] + (program === "all" ? 0 : PROGRAM_WEIGHTS[program].approvalShift), 1, 99);
  return { id, decisions, approved, denials: Math.round((decisions * (100 - approved)) / 100) };
}
/** The approved-as-asked rate of a set of cells: one payer shows its own rate, several are summed from decisions and denials. */
function approvalOf(cells: Cell[]): number {
  if (cells.length === 1) return cells[0].approved;
  const decisions = sum(cells.map((c) => c.decisions));
  return decisions ? Math.round((100 * (decisions - sum(cells.map((c) => c.denials)))) / decisions) : 0;
}

/** Spreads `total` over `weights` in whole numbers that add up to `total` (largest remainder, ties go to the earlier one). */
export function apportion(total: number, weights: number[]): number[] {
  const weight = sum(weights);
  if (!total || !weight) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / weight);
  const out = raw.map(Math.floor);
  const left = total - sum(out);
  raw
    .map((r, i) => ({ i, f: r - Math.floor(r) }))
    .sort((a, b) => b.f - a.f || a.i - b.i)
    .slice(0, left)
    .forEach(({ i }) => {
      out[i] += 1;
    });
  return out;
}

/** A payer's denials spread over its reasons. Reasons the team can fix lean the way the program leans (see PROGRAM_WEIGHTS). */
interface Cited {
  reason: Reason;
  count: number;
}
function cited(cell: Cell, program: ProgramFilter): Cited[] {
  const pool = REASONS.filter((r) => r.payerId === cell.id);
  const lean = (r: Reason): number => (program === "all" ? 1 : r.preventable ? PROGRAM_WEIGHTS[program].preventable : PROGRAM_WEIGHTS[program].other);
  const counts = apportion(cell.denials, pool.map((r) => r.count * lean(r)));
  return pool.map((reason, i) => ({ reason, count: counts[i] }));
}

function topReasons(scope: PayerFilter, cells: Cell[], program: ProgramFilter, denials: number): { rows: ReasonRow[]; total: number } | null {
  const rowOf = (c: Cited): ReasonRow => ({ reason: c.reason.label, payerId: c.reason.payerId, payer: PAYER_ROW_LABEL[c.reason.payerId], count: c.count, share: Math.round((c.count / denials) * 100) });
  const best = (list: Cited[]): Cited => list.reduce((a, b) => (b.count > a.count ? b : a));
  const rows =
    scope === "all"
      ? // one row per payer: its most common reason, for payers with enough denials
        cells.filter((c) => enough(c.denials)).map((c) => rowOf(best(cited(c, program))))
      : cited(cells[0], program).map(rowOf);
  if (!rows.length || !enough(denials)) return null;
  return { total: denials, rows: rows.sort((a, b) => b.count - a.count) };
}

/** Average days from sent to decision: each payer's average (data/seed.ts) weighted by its decisions, then the period and program drift. Demo values. */
function turnaroundOf(cells: Cell[], periodScale: number, program: ProgramFilter): number {
  const decisions = sum(cells.map((c) => c.decisions));
  if (!decisions) return 0;
  const weighted = sum(cells.map((c) => c.decisions * payerById(c.id).avgDecisionDays)) / decisions;
  return round1(weighted * periodScale * (program === "all" ? 1 : PROGRAM_WEIGHTS[program].turnaround));
}
function typicalOf(cells: Cell[]): number {
  const decisions = sum(cells.map((c) => c.decisions));
  return decisions ? round1(sum(cells.map((c) => c.decisions * payerById(c.id).typicalDecisionDays)) / decisions) : 0;
}

export function buildView(periodId: PeriodId, scope: PayerFilter, program: ProgramFilter = "all", ripples: Ripples = NO_RIPPLES): View {
  const period = periodInfo(periodId);
  const all = ALL[periodId];
  const ids = scope === "all" ? PAYER_ORDER : [scope];
  const cellsFor = (list: PayerId[], table: Record<PayerId, number>): Cell[] => list.map((id) => cellOf(id, period, program, table));
  const cells = cellsFor(ids, APPROVED[periodId]);
  const everyone = cellsFor(PAYER_ORDER, APPROVED[periodId]);
  const decisions = sum(cells.map((c) => c.decisions));
  const denials = sum(cells.map((c) => c.denials));
  const progNudge = program === "all" ? 0 : Math.round(PROGRAM_WEIGHTS[program].approvalShift / 3);

  // key figure: approval rate, and its mirror, the denial rate
  const approvedValue = approvalOf(cells);
  const approvedPrev = approvalOf(cellsFor(ids, APPROVED_PREV[periodId]));
  const approved = { value: enough(decisions) ? approvedValue : null, n: decisions, unit: "decisions", delta: approvedValue - approvedPrev };
  const denial = { value: enough(decisions) ? 100 - approvedValue : null, n: decisions, unit: "decisions", delta: approvedPrev - approvedValue, denials };

  // key figure: turnaround, in days
  const daysNow = turnaroundOf(cells, TURNAROUND_SCALE[periodId], program);
  const turnaround = { days: enough(decisions) ? daysNow : null, typical: typicalOf(cells), delta: round1(daysNow - turnaroundOf(cells, TURNAROUND_PREV[periodId], program)), n: decisions };

  // key figure: preventable denials. Each payer's denials are spread over its reasons; the ones flagged preventable are summed.
  const spread = cells.flatMap((c) => cited(c, program));
  const byLabel = new Map<string, number>();
  for (const c of spread) if (c.reason.preventable) byLabel.set(c.reason.label, (byLabel.get(c.reason.label) ?? 0) + c.count);
  const ranked = [...byLabel].map(([label, count]) => ({ label, count })).filter((b) => b.count > 0).sort((a, b) => b.count - a.count);
  const preventableCount = sum(ranked.map((b) => b.count));
  const rest = sum(ranked.slice(TOP_PREVENTABLE).map((b) => b.count));
  const preventableBars: PreventableBar[] = [...ranked.slice(0, TOP_PREVENTABLE), ...(rest ? [{ label: `${ranked.length - TOP_PREVENTABLE} other fixable reasons`, count: rest, other: true }] : [])];
  const known = enough(denials);
  const preventable = { count: known ? preventableCount : null, share: known ? Math.round((preventableCount / denials) * 100) : null, n: denials, bars: known ? preventableBars : [] };

  // top denial cause, as a share of all denials in view
  const reasons = topReasons(scope, cells, program, denials);
  const topRow = reasons?.rows[0];
  const topCause = { value: topRow ? topRow.share : null, n: reasons?.total ?? 0, unit: "denials", label: topRow ? (REASONS.find((r) => r.label === topRow.reason && r.payerId === topRow.payerId)?.short ?? topRow.reason) : "" };

  // advice taken works
  const adviceN = sum(ids.map((id) => scaled(BASE[id].adviceN, period, program)));
  const adviceValue = (scope === "all" ? all.advice : BASE[scope].advice + ADVICE_SHIFT[periodId]) + (program === "all" ? 0 : PROGRAM_WEIGHTS[program].adviceShift);
  const advice = { value: enough(adviceN) ? adviceValue : null, n: adviceN, unit: "requests" };

  // edits: three parts, and the figure that adds typo-level fixes to "as written"
  const draftsN = sum(ids.map((id) => scaled(BASE[id].draftsN, period, program)));
  const shift = EDIT_SHIFT[periodId];
  const written = program === "all" ? 0 : PROGRAM_WEIGHTS[program].writtenShift;
  const base: [number, number, number] = scope === "all" ? [all.written, all.light, all.rewritten] : [BASE[scope].written + shift[0], BASE[scope].light + shift[1], BASE[scope].rewritten + shift[2]];
  const shares: [number, number, number] = [base[0] + written, base[1] - written, base[2]];
  const everyoneApproved = approvalOf(everyone);
  const approvalNudge = (scope === "all" ? 0 : Math.round((approvedValue - everyoneApproved) / 3)) + progNudge;
  const rates = all.editApproval.map((r) => clamp(r + approvalNudge, 0, 99));
  const noEdits = { value: enough(draftsN) ? (scope === "all" ? all.noEdits + written : shares[0] + 7) : null, n: draftsN, unit: "drafts" };
  const edits = enough(draftsN) ? { n: draftsN, parts: shares.map((share, i) => ({ label: EDIT_LABELS[i], share, approved: rates[i], color: EDIT_COLORS[i] })) } : null;

  // approval by payer. One payer is shown against the whole practice.
  const barOf = (c: Cell): BarRow => ({ label: PAYER_ROW_LABEL[c.id], value: enough(c.decisions) ? c.approved : null, n: c.decisions });
  const bars =
    scope === "all"
      ? everyone.map(barOf).sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
      : [barOf(cells[0]), { label: "All payers", value: everyoneApproved, n: sum(everyone.map((c) => c.decisions)) }];

  // what helps most: counts follow the payer's share of decisions and how much each step matters there
  const totalAll = sum(PAYER_ORDER.map((id) => BASE[id].decisions));
  const share = scope === "all" ? 1 : BASE[scope].decisions / totalAll;
  const helpRows = ACTIONS.map((a) => {
    const applied = scaled(scope === "all" ? a.base : a.base * share * a.affinity[scope], period, program);
    return { label: a.label, applied, approved: clamp(a.approved + HELP_SHIFT[periodId] + approvalNudge, 40, 97) };
  })
    .filter((r) => enough(r.applied))
    .sort((a, b) => b.applied - a.applied)
    .slice(0, 4);

  // denial outcomes: the seeded quarter, plus what Denial Intelligence and Authorizations have recorded. Everything recorded happened this quarter.
  const recorded = periodId !== "last_quarter";
  const mine = <T extends { payerId?: string; program?: Program }>(xs: T[]): T[] => (recorded ? xs.filter((x) => (scope === "all" || x.payerId === scope) && (program === "all" || x.program === program)) : []);
  const rulings = mine(ripples.appeals);
  const decided = sum(ids.map((id) => scaled(APPEALS[id].decided, period, program))) + rulings.length;
  const overturned = sum(ids.map((id) => Math.round((scaled(APPEALS[id].decided, period, program) * (APPEALS[id].rate + OVERTURN_SHIFT[periodId])) / 100))) + rulings.filter((r) => r.result !== "upheld").length;
  const appeals = { value: enough(decided) ? Math.round((overturned / decided) * 100) : null, n: decided, unit: "rulings", overturned };
  const accepted = { n: sum(ids.map((id) => scaled(ACCEPTED[id], period, program))) + mine(ripples.accepted).length };
  const reasonCounts = new Map<string, number>();
  for (const d of mine(ripples.dismissals)) reasonCounts.set(d.reason, (reasonCounts.get(d.reason) ?? 0) + 1);
  const dismissed = reasonCounts.size ? [...reasonCounts].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)) : null;

  return {
    period,
    payer: scope,
    program,
    scope: scope === "all" ? "All payers" : payerById(scope).name,
    programLabel: programLabel(program),
    decisions,
    approved,
    denial,
    turnaround,
    preventable,
    topCause,
    advice,
    noEdits,
    bars,
    edits,
    reasons,
    helps: helpRows.length ? helpRows : null,
    appeals,
    accepted,
    dismissed,
  };
}

/** Requests on the Dashboard right now, for the payer and program in view. Handled = decided (the Dashboard's "Decided today"); open = everything else. Live: answering a payer or accepting a denial moves it. */
export function workloadOf(requests: PsyRequest[], scope: PayerFilter, program: ProgramFilter): { handled: number; open: number; needsYou: number } {
  const mine = requests.filter((r) => (scope === "all" || r.payerId === scope) && (program === "all" || r.program === program));
  const handled = mine.filter((r) => inStage(r, "decided")).length;
  return { handled, open: mine.length - handled, needsYou: mine.filter((r) => r.needsYou && !inStage(r, "decided")).length };
}

export const fmt = (n: number): string => n.toLocaleString("en-US");

/** "▲ 6 pts vs last quarter" */
export function trendLine(delta: number, prev: string): string {
  if (delta === 0) return `No change vs ${prev}`;
  return `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)} ${Math.abs(delta) === 1 ? "pt" : "pts"} vs ${prev}`;
}
/** "▼ 0.1 days vs last quarter" for turnaround (lower is faster). */
export function daysTrend(delta: number, prev: string): string {
  if (delta === 0) return `No change vs ${prev}`;
  return `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(1)} ${Math.abs(delta) === 1 ? "day" : "days"} vs ${prev}`;
}
