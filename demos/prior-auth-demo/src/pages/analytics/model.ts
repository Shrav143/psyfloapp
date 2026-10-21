import { ACTIONS, ALL, APPEALS, APPROVED, APPROVED_PREV, BASE, MIN_DECISIONS, OVERTURN_SHIFT, PAYER_ORDER, PERIODS, REASONS, WRITTEN_OFF, type PayerFilter, type PeriodId, type PeriodInfo } from "@/data/analytics";
import { payerById } from "@/data/seed";
import type { PayerId } from "@/data/types";
import { PAYER_ROW_LABEL } from "@/pages/dashboard/helpers";
import type { AppealDecision, DenialAccepted } from "@/store/ripples";

/* Pure model for the Performance page. A figure based on fewer than 20 decisions is null, never a number. */

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
/** What other screens have recorded since the demo opened: appeal rulings, accepted denials, dismissed recommendations (with the payer, when known). */
export interface Ripples {
  appeals: AppealDecision[];
  accepted: DenialAccepted[];
  dismissals: { reason: string; payerId?: string }[];
}
export const NO_RIPPLES: Ripples = { appeals: [], accepted: [], dismissals: [] };

export interface View {
  period: PeriodInfo;
  payer: PayerFilter;
  scope: string;
  decisions: number;
  approved: Tile & { delta: number };
  topCause: Tile & { label: string };
  advice: Tile;
  noEdits: Tile;
  bars: BarRow[];
  edits: { n: number; parts: EditPart[] } | null;
  reasons: { rows: ReasonRow[]; total: number } | null;
  helps: HelpRow[] | null;
  /** Appeals the payer ruled on. `overturned` counts partly restored ones too. Hidden under 20 rulings. */
  appeals: Tile & { overturned: number };
  writtenOff: { amount: number; n: number };
  /** Reasons given when a recommendation was dismissed. Null when nobody dismissed one. */
  dismissed: { reason: string; count: number }[] | null;
}

const enough = (n: number): boolean => n >= MIN_DECISIONS;
const scaled = (n: number, p: PeriodInfo): number => Math.round(n * p.scale);
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
export const periodInfo = (id: PeriodId): PeriodInfo => PERIODS.find((p) => p.id === id) ?? PERIODS[0];

/** Other periods drift a little from this quarter. */
const ADVICE_SHIFT: Record<PeriodId, number> = { quarter: 0, last_quarter: -3, year: -5 };
const HELP_SHIFT: Record<PeriodId, number> = { quarter: 0, last_quarter: -3, year: -4 };
const EDIT_SHIFT: Record<PeriodId, [number, number, number]> = { quarter: [0, 0, 0], last_quarter: [-3, 2, 1], year: [-5, 3, 2] };
const EDIT_COLORS = ["#2F6F5C", "#8F6620", "#B5553A"];
const EDIT_LABELS = ["Sent as written", "Light edits", "Rewritten"];

function topReasons(scope: PayerFilter, p: PeriodInfo): { rows: ReasonRow[]; total: number } | null {
  const pool = (id: PayerId) => REASONS.filter((r) => r.payerId === id).map((r) => ({ ...r, count: scaled(r.count, p) }));
  const rows =
    scope === "all"
      ? // one row per payer: its most common reason, for payers with enough denials
        PAYER_ORDER.flatMap((id) => {
          const own = pool(id);
          return enough(sum(own.map((r) => r.count))) ? [own[0]] : [];
        })
      : pool(scope);
  const total = sum(rows.map((r) => r.count));
  if (!rows.length || !enough(total)) return null;
  return {
    total,
    rows: rows
      .sort((a, b) => b.count - a.count)
      .map((r) => ({ reason: r.label, payerId: r.payerId, payer: PAYER_ROW_LABEL[r.payerId], count: r.count, share: Math.round((r.count / total) * 100) })),
  };
}

export function buildView(periodId: PeriodId, scope: PayerFilter, ripples: Ripples = NO_RIPPLES): View {
  const period = periodInfo(periodId);
  const all = ALL[periodId];
  const ids = scope === "all" ? PAYER_ORDER : [scope];
  const decisions = sum(ids.map((id) => scaled(BASE[id].decisions, period)));
  const totalAll = sum(PAYER_ORDER.map((id) => BASE[id].decisions));

  // tile: approved as asked
  const approvedValue = scope === "all" ? all.approved : APPROVED[periodId][scope];
  const approvedPrev = scope === "all" ? all.approvedPrev : APPROVED_PREV[periodId][scope];
  const approved = { value: enough(decisions) ? approvedValue : null, n: decisions, unit: "decisions", delta: approvedValue - approvedPrev };

  // tile: top denial cause
  const reasons = topReasons(scope, period);
  const topRow = reasons?.rows[0];
  const topCause = { value: topRow ? topRow.share : null, n: reasons?.total ?? 0, unit: "denials", label: topRow ? (REASONS.find((r) => r.label === topRow.reason && r.payerId === topRow.payerId)?.short ?? topRow.reason) : "" };

  // tile: advice taken works
  const adviceN = sum(ids.map((id) => scaled(BASE[id].adviceN, period)));
  const adviceValue = scope === "all" ? all.advice : BASE[scope].advice + ADVICE_SHIFT[periodId];
  const advice = { value: enough(adviceN) ? adviceValue : null, n: adviceN, unit: "requests" };

  // edits: three parts, and the tile that adds typo-level fixes to "as written"
  const draftsN = sum(ids.map((id) => scaled(BASE[id].draftsN, period)));
  const shift = EDIT_SHIFT[periodId];
  const shares: [number, number, number] =
    scope === "all" ? [all.written, all.light, all.rewritten] : [BASE[scope].written + shift[0], BASE[scope].light + shift[1], BASE[scope].rewritten + shift[2]];
  const approvalNudge = scope === "all" ? 0 : Math.round((APPROVED[periodId][scope] - all.approved) / 3);
  const rates = all.editApproval.map((r) => clamp(r + approvalNudge, 0, 99));
  const noEdits = { value: enough(draftsN) ? (scope === "all" ? all.noEdits : shares[0] + 7) : null, n: draftsN, unit: "drafts" };
  const edits = enough(draftsN) ? { n: draftsN, parts: shares.map((share, i) => ({ label: EDIT_LABELS[i], share, approved: rates[i], color: EDIT_COLORS[i] })) } : null;

  // approval by payer. One payer is shown against the whole practice.
  const barOf = (id: PayerId): BarRow => {
    const n = scaled(BASE[id].decisions, period);
    return { label: PAYER_ROW_LABEL[id], value: enough(n) ? APPROVED[periodId][id] : null, n };
  };
  const bars =
    scope === "all"
      ? PAYER_ORDER.map(barOf).sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
      : [barOf(scope), { label: "All payers", value: all.approved, n: sum(PAYER_ORDER.map((id) => scaled(BASE[id].decisions, period))) }];

  // what helps most: counts follow the payer's share of decisions and how much each step matters there
  const share = scope === "all" ? 1 : BASE[scope].decisions / totalAll;
  const helpRows = ACTIONS.map((a) => {
    const applied = scaled(scope === "all" ? a.base : a.base * share * a.affinity[scope], period);
    const nudge = scope === "all" ? 0 : Math.round((APPROVED[periodId][scope] - all.approved) / 3);
    return { label: a.label, applied, approved: clamp(a.approved + HELP_SHIFT[periodId] + nudge, 40, 97) };
  })
    .filter((r) => enough(r.applied))
    .sort((a, b) => b.applied - a.applied)
    .slice(0, 4);

  // denial outcomes: the seeded quarter, plus what Denial Intelligence and Authorizations have recorded. Everything recorded happened this quarter.
  const recorded = periodId !== "last_quarter";
  const mine = <T extends { payerId?: string }>(xs: T[]): T[] => (recorded ? xs.filter((x) => scope === "all" || x.payerId === scope) : []);
  const rulings = mine(ripples.appeals);
  const decided = sum(ids.map((id) => scaled(APPEALS[id].decided, period))) + rulings.length;
  const overturned = sum(ids.map((id) => Math.round((scaled(APPEALS[id].decided, period) * (APPEALS[id].rate + OVERTURN_SHIFT[periodId])) / 100))) + rulings.filter((r) => r.result !== "upheld").length;
  const appeals = { value: enough(decided) ? Math.round((overturned / decided) * 100) : null, n: decided, unit: "rulings", overturned };
  const accepted = mine(ripples.accepted);
  const writtenOff = { n: sum(ids.map((id) => scaled(WRITTEN_OFF[id].n, period))) + accepted.length, amount: sum(ids.map((id) => scaled(WRITTEN_OFF[id].amount, period))) + sum(accepted.map((a) => a.amount ?? 0)) };
  const reasonCounts = new Map<string, number>();
  for (const d of mine(ripples.dismissals)) reasonCounts.set(d.reason, (reasonCounts.get(d.reason) ?? 0) + 1);
  const dismissed = reasonCounts.size ? [...reasonCounts].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason)) : null;

  return {
    period,
    payer: scope,
    scope: scope === "all" ? "All payers" : payerById(scope).name,
    decisions,
    approved,
    topCause,
    advice,
    noEdits,
    bars,
    edits,
    reasons,
    helps: helpRows.length ? helpRows : null,
    appeals,
    writtenOff,
    dismissed,
  };
}

export const fmt = (n: number): string => n.toLocaleString("en-US");

/** "▲ 6 pts vs last quarter" */
export function trendLine(delta: number, prev: string): string {
  if (delta === 0) return `No change vs ${prev}`;
  return `${delta > 0 ? "▲" : "▼"} ${Math.abs(delta)} ${Math.abs(delta) === 1 ? "pt" : "pts"} vs ${prev}`;
}
