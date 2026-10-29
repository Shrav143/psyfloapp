import { ACTIONS, PROGRAM_ORDER, REASON_CATEGORIES, REASON_CATEGORY, type ReasonCategory } from "@/data/analytics";
import { DX_GROUPS, type Decision, type DxId } from "@/data/decisions";
import type { BuiltInPayerId, CoreProgram } from "@/data/types";
import { byMonth, enough, monthPoints, pctOf, shownPct, statsOf, sum, type MonthPoint, type Stats } from "./stats";

/* The detail behind the page: denial reasons, length of stay, process health and how FLO's advice and drafts perform. Each is worked out from the same rows as the headline figures. */

/* ------------------------------------------------------------------ denial reasons */
export interface ReasonRow {
  label: string;
  count: number;
  share: number;
  cum: number;
  preventable: boolean;
  payers: BuiltInPayerId[];
  /** True for the row that rolls up the reasons beyond the top ones. */
  other?: boolean;
  labels: string[];
}
export interface DxReasons {
  dx: DxId;
  total: number;
  segments: { id: ReasonCategory; label: string; count: number }[];
}
export interface Reasons {
  total: number;
  rows: ReasonRow[];
  preventable: number;
  other: number;
  byDx: DxReasons[];
}
const TOP_REASONS = 10;

/** Denial reasons across the payers in view, one row per reason as worded (a reason two payers give is one row). */
export function buildReasons(rows: readonly Decision[]): Reasons {
  const denials = rows.filter((d) => d.outcome !== "approved" && d.reason);
  const map = new Map<string, { count: number; preventable: boolean; payers: Set<BuiltInPayerId> }>();
  for (const d of denials) {
    const hit = map.get(d.reason as string) ?? { count: 0, preventable: !!d.preventable, payers: new Set<BuiltInPayerId>() };
    hit.count += 1;
    hit.payers.add(d.payerId);
    map.set(d.reason as string, hit);
  }
  const total = denials.length;
  const sorted = [...map].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  let cum = 0;
  const all: ReasonRow[] = sorted.map((r) => {
    cum += r.count;
    return { label: r.label, count: r.count, share: pctOf(r.count, total) ?? 0, cum: pctOf(cum, total) ?? 0, preventable: r.preventable, payers: [...r.payers], labels: [r.label] };
  });
  const top = all.slice(0, TOP_REASONS);
  const rest = all.slice(TOP_REASONS);
  const otherCount = sum(rest.map((r) => r.count));
  const rows2: ReasonRow[] = [...top, ...(rest.length ? [{ label: `${rest.length} other ${rest.length === 1 ? "reason" : "reasons"}`, count: otherCount, share: pctOf(otherCount, total) ?? 0, cum: 100, preventable: rest.every((r) => r.preventable), payers: [...new Set(rest.flatMap((r) => r.payers))], other: true as const, labels: rest.map((r) => r.label) }] : [])];
  const byDx: DxReasons[] = DX_GROUPS.map((dx) => {
    const mine = denials.filter((d) => d.dx === dx.id);
    return { dx: dx.id, total: mine.length, segments: REASON_CATEGORIES.map((c) => ({ id: c.id, label: c.label, count: mine.filter((d) => REASON_CATEGORY[d.reason as string] === c.id).length })) };
  });
  return { total, rows: rows2, preventable: denials.filter((d) => d.preventable).length, other: otherCount, byDx };
}

/* ------------------------------------------------------------------ length of stay */
export interface LosRow {
  payer: BuiltInPayerId;
  program: CoreProgram | "all";
  /** Decisions that approved something (as requested or in part). */
  n: number;
  cuts: number;
  requested: number | null;
  approved: number | null;
  /** Share of the requested days or units that were approved. */
  pct: number | null;
  unit: "days" | "units" | "mixed";
}
export function buildLos(rows: readonly Decision[], payers: readonly BuiltInPayerId[]): LosRow[] {
  const out: LosRow[] = [];
  for (const payer of payers) {
    for (const program of [...PROGRAM_ORDER, "all" as const]) {
      const mine = rows.filter((d) => d.payerId === payer && d.outcome !== "denied" && (program === "all" || d.program === program));
      const requested = sum(mine.map((d) => d.requested));
      const approved = sum(mine.map((d) => d.approvedAmt));
      out.push({
        payer,
        program,
        n: mine.length,
        cuts: mine.filter((d) => d.outcome === "partial").length,
        requested: mine.length ? Math.round((requested / mine.length) * 10) / 10 : null,
        approved: mine.length ? Math.round((approved / mine.length) * 10) / 10 : null,
        pct: pctOf(approved, requested),
        unit: program === "all" ? "mixed" : program === "IOP" ? "units" : "days",
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ process health */
export interface Process {
  months: MonthPoint[];
  retroShare: (number | null)[];
  retroCount: number[];
  referral: { avg: number | null; n: number }[];
  calls: { changed: number; stood: number; scheduled: number };
  appeals: { overturned: number; partly: number; upheld: number; pending: number };
  denials: number;
  retro: Stats;
}
export function buildProcess(narrowed: readonly Decision[], cur: readonly Decision[]): Process {
  const months = monthPoints(narrowed);
  const byM = byMonth(narrowed);
  const denials = cur.filter((d) => d.outcome !== "approved");
  return {
    months,
    retroShare: byM.map((m) => pctOf(m.filter((d) => d.kind === "retro").length, m.length)),
    retroCount: byM.map((m) => m.filter((d) => d.kind === "retro").length),
    referral: byM.map((m) => {
      const first = m.filter((d) => d.referralDays !== null);
      return { avg: first.length ? Math.round((sum(first.map((d) => d.referralDays ?? 0)) / first.length) * 10) / 10 : null, n: first.length };
    }),
    calls: { changed: denials.filter((d) => d.p2p === "changed").length, stood: denials.filter((d) => d.p2p === "stood").length, scheduled: denials.filter((d) => d.p2p === "scheduled").length },
    appeals: { overturned: denials.filter((d) => d.appeal === "overturned").length, partly: denials.filter((d) => d.appeal === "partly").length, upheld: denials.filter((d) => d.appeal === "upheld").length, pending: denials.filter((d) => d.appeal === "pending").length },
    denials: denials.length,
    retro: statsOf(cur.filter((d) => d.kind === "retro")),
  };
}

/* ------------------------------------------------------------------ FLO's advice, drafts and the steps */
export interface Flo {
  advice: { n: number; works: number; pct: number | null };
  drafts: { n: number; written: number; light: number; rewritten: number; typo: number; approvedBy: [number | null, number | null, number | null] };
  noEdits: number | null;
  helps: { label: string; applied: number; approved: number; pct: number | null }[];
}
export function buildFlo(cur: readonly Decision[]): Flo {
  const adv = cur.filter((d) => d.advice);
  const works = adv.filter((d) => d.outcome !== "denied").length;
  const drafts = cur.filter((d) => d.edit !== null);
  const of = (kinds: string[]): Decision[] => drafts.filter((d) => kinds.includes(d.edit as string));
  const ok = (xs: Decision[]): number | null => (xs.length ? pctOf(xs.filter((d) => d.outcome !== "denied").length, xs.length) : null);
  const helps = ACTIONS.map((a, i) => {
    const applied = cur.filter((d) => d.helps.includes(i));
    const approved = applied.filter((d) => d.outcome !== "denied").length;
    return { label: a.label, applied: applied.length, approved, pct: pctOf(approved, applied.length) };
  })
    .filter((h) => enough(h.applied))
    .sort((a, b) => b.applied - a.applied);
  return {
    advice: { n: adv.length, works, pct: shownPct(works, adv.length) },
    drafts: { n: drafts.length, written: of(["written"]).length, light: of(["light", "typo"]).length, rewritten: of(["rewritten"]).length, typo: of(["typo"]).length, approvedBy: [ok(of(["written"])), ok(of(["light", "typo"])), ok(of(["rewritten"]))] },
    noEdits: shownPct(of(["written", "typo"]).length, drafts.length),
    helps,
  };
}

