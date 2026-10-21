import type { Option } from "@/components/ui";
import { LEDGER_STATUS_LABEL, type LedgerStatus } from "@/data/manager";
import { reviewDate, type Review, type ReviewStatus } from "@/data/managerReviews";
import { PROGRAMS, PROGRAM_LABEL, type PayerId, type Program, type Tone } from "@/data/types";
import { shortDate, DAY, HOUR, toDate } from "@/lib/time";
import { dueText } from "@/pages/authorizations/queueLogic";
import { PAYER_OPTIONS } from "@/pages/dashboard/helpers";
import { paths } from "@/routes";
import type { PayerChangeUpdate } from "@/store/ripples";
import type { LedgerRow } from "./ledgerRows";

/* ------------------------------------------------------------------ filters shared by both tabs */
export interface ManagerFilters {
  q: string;
  program: Program | "all";
  payer: PayerId | "all";
  status: LedgerStatus | "all";
  reviewStatus: ReviewStatus | "all";
}
export const NO_FILTERS: ManagerFilters = { q: "", program: "all", payer: "all", status: "all", reviewStatus: "all" };

export const LEVEL_OPTIONS: Option<ManagerFilters["program"]>[] = [{ value: "all", label: "All levels of care" }, ...PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }))];
export const PAYER_FILTER_OPTIONS: Option<ManagerFilters["payer"]>[] = PAYER_OPTIONS;
export const STATUS_OPTIONS: Option<ManagerFilters["status"]>[] = [
  { value: "all", label: "Any status" },
  ...(["needs_action", "review_due", "awaiting", "on_track"] as const).map((s) => ({ value: s, label: LEDGER_STATUS_LABEL[s] })),
];
export const REVIEW_STATUS_OPTIONS: Option<ManagerFilters["reviewStatus"]>[] = [
  { value: "all", label: "Any review status" },
  { value: "needs_update", label: "Needs your update" },
  { value: "due", label: "Not drafted yet" },
  { value: "drafted", label: "Drafted" },
  { value: "signed", label: "Signed" },
];

export const STATUS_TONE: Record<LedgerStatus, Tone> = { needs_action: "risk", review_due: "mid", awaiting: "neutral", on_track: "good" };
export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = { due: "Not drafted yet", drafted: "Drafted", needs_update: "Needs your update", signed: "Signed" };
export const REVIEW_STATUS_TONE: Record<ReviewStatus, Tone> = { due: "neutral", drafted: "good", needs_update: "mid", signed: "neutral" };

/** The Reviews tab with a review's drawer open. The case page's "Open the review" uses it. */
export const reviewLink = (id: string): string => `${paths.manager("reviews")}&review=${encodeURIComponent(id)}`;

/** The latest payer change that updated this case's draft, if any. Matches the draft id, the case id or the ledger id. */
export function payerUpdateFor(ids: (string | null | undefined)[], updates: PayerChangeUpdate[]): PayerChangeUpdate | undefined {
  const keys = ids.filter((i): i is string => !!i).map((i) => i.toLowerCase());
  return updates.filter((u) => u.draftIds.some((d) => keys.includes(d.toLowerCase()))).sort((a, b) => b.at - a.at)[0];
}
/** "Updated for a payer change · 10/20" */
export const payerUpdateText = (u: PayerChangeUpdate): string => `Updated for a payer change · ${shortDate(u.at)}`;

/** Search by case id or initials; level of care and payer apply to both tabs. */
export function matchesBase(r: { id: string; initials: string; program: Program; payerId: PayerId }, f: ManagerFilters): boolean {
  if (f.program !== "all" && r.program !== f.program) return false;
  if (f.payer !== "all" && r.payerId !== f.payer) return false;
  const q = f.q.trim().toLowerCase().replace(/[.\s]/g, "");
  if (!q) return true;
  return r.id.toLowerCase().replace(/-/g, "").includes(q.replace(/-/g, "")) || r.initials.toLowerCase().replace(/\./g, "").includes(q);
}
export const hasAnyFilter = (f: ManagerFilters, tab: "cases" | "reviews"): boolean => !!f.q || f.program !== "all" || f.payer !== "all" || (tab === "cases" ? f.status !== "all" : f.reviewStatus !== "all");

/* ------------------------------------------------------------------ ledger clock */
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** "5 h" under two days, then "3 days". */
const span = (min: number): string => (min < 2 * DAY ? `${Math.max(1, Math.round(min / HOUR))} h` : `${Math.round(min / DAY)} days`);

/** Clock text for the next event that binds. Terracotta when a hard deadline is under two days or anything is overdue.
    A case that is also a request says what its case page says ("Answer due in 9 h"), from the same due time. */
export function clockText(c: LedgerRow, clock: number): { text: string; urgent: boolean } {
  const left = c.dueAt - clock;
  if (c.verb) return { text: dueText(c.verb, c.dueAt, clock), urgent: c.verb.startsWith("Decision") ? left <= 0 : left < DAY };
  switch (c.clockKind) {
    case "notice":
      return { text: left <= 0 ? "Notice overdue" : `Notice due in ${span(left)}`, urgent: left < 2 * DAY };
    case "window":
      return { text: left <= 0 ? "Window closed" : `Window closes ${span(left)}`, urgent: left < 2 * DAY };
    case "p2p":
      return { text: left <= 0 ? "P2P window closed" : `P2P in ${span(left)}`, urgent: left < 2 * DAY };
    case "answer":
      return { text: left <= 0 ? "Answer overdue" : `Answer due in ${span(left)}`, urgent: left < DAY };
    case "expiry":
      return { text: left <= 0 ? "Approval ended" : `${span(left)} left`, urgent: left < DAY };
    case "review":
      return { text: left <= 0 ? "Review due" : left < DAY ? "Review today" : left < 2 * DAY ? "Review tomorrow" : `Review in ${span(left)}`, urgent: left <= 0 };
    case "decision":
      return { text: left <= 0 ? "Decision overdue" : left < DAY ? `Decision in ${span(left)}` : `Decision ${WD[toDate(c.dueAt).getDay()]}`, urgent: left <= 0 };
    case "units":
      return { text: `${(c.total ?? 0) - (c.used ?? 0)} ${c.unit} left`, urgent: false };
    case "next":
      return { text: left <= 0 ? "Review due" : `Next review ${reviewDate(c.dueAt)}`, urgent: left <= 0 };
  }
}

/** Share of the approval used; unknown until the case is approved. */
export const usedShare = (c: LedgerRow): number | null => (c.used === null || !c.total ? null : c.used / c.total);

/* ------------------------------------------------------------------ sorting */
export type SortKey = "case" | "payer" | "used" | "clock" | "chance" | "status";
const STATUS_RANK: Record<LedgerStatus, number> = { needs_action: 0, review_due: 1, awaiting: 2, on_track: 3 };

export function sortLedger(rows: LedgerRow[], key: SortKey, dir: 1 | -1): LedgerRow[] {
  const val = (c: LedgerRow): number | string => {
    switch (key) {
      case "case": return c.id;
      case "payer": return c.payerId;
      case "used": return usedShare(c) ?? -1;
      case "clock": return c.dueAt;
      case "chance": return c.chance;
      case "status": return STATUS_RANK[c.status];
    }
  };
  return [...rows].sort((a, b) => {
    const x = val(a);
    const y = val(b);
    const cmp = typeof x === "string" && typeof y === "string" ? x.localeCompare(y) : Number(x) - Number(y);
    return (cmp || a.dueAt - b.dueAt) * dir;
  });
}

/* ------------------------------------------------------------------ reviews by day */
export interface DayGroup {
  key: string;
  label: string;
  date: string;
  reviews: Review[];
}

const dayKey = (m: number): string => {
  const d = toDate(m);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};
const FULL_WD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function groupByDay(reviews: Review[], clock: number): DayGroup[] {
  const today = dayKey(clock);
  const out: DayGroup[] = [];
  for (const r of reviews) {
    const k = dayKey(r.dueAt);
    let g = out.find((x) => x.key === k);
    if (!g) {
      const d = toDate(r.dueAt);
      g = { key: k, label: k === today ? "Today" : FULL_WD[d.getDay()], date: `${WD[d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`, reviews: [] };
      out.push(g);
    }
    g.reviews.push(r);
  }
  return out;
}
