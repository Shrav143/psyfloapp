import type { Option } from "@/components/ui";
import type { LedgerCase } from "@/data/manager";
import { payerById } from "@/data/seed";
import { PROGRAM_LABEL, STAGES, type PsyRequest, type StageKey } from "@/data/types";
import { denialDeadlines, inSpan } from "@/lib/floFacts";
import { plural } from "@/lib/format";
import { isActiveAuth, isRenewalDue } from "@/lib/ledgerFacts";
import { DAY } from "@/lib/time";
import { paths } from "@/routes";
import type { DashFilters } from "@/store/core";
import { stageCounts } from "@/store/selectors";
import { STATUS_LABEL, type CaseRow } from "./caseRows";
import { SORT_LABEL, type RowSort } from "./sort-rows";

/* The Lifecycle: five states that filter the table (they are the stages, in the words the page uses for them), and two counts of approved
   authorizations from the Case Manager ledger that open Case Manager. Every count is worked out from the rows and the ledger, never typed. */

/** The states the Lifecycle shows as chips, in the order a request moves through them. "Decided today" is in the Status menu and in `?stage=decided`. */
export const CHIP_STAGES: StageKey[] = ["preparing", "received", "under_review", "info_requested", "appeal"];

export interface StateChip {
  stage: StageKey;
  label: string;
  count: number;
  /** The quiet second line. */
  note: string;
  /** Ochre when something is running late, terracotta when a deadline is inside a day. */
  flag?: "late" | "urgent";
}

/** Cases saved in New case that have no row yet: how many, and how many of those wait for a person to sign. They count under Awaiting sign-off. */
export interface SavedCases {
  total: number;
  ready: number;
}

export function stateChips(rows: CaseRow[], saved: SavedCases, clock: number): StateChip[] {
  const requests = rows.map((x) => x.r);
  const counts = stageCounts(requests);
  const inState = (s: StageKey) => rows.filter((x) => x.r.stage === s);

  const ready = inState("preparing").filter((x) => x.action.kind === "sign").length + saved.ready;
  const lateSent = inState("received").filter((x) => x.late !== "ok").length;
  const review = inState("under_review");
  const lateReview = review.filter((x) => x.late !== "ok").length;
  const pastCms = review.filter((x) => x.cms?.past).length;
  const askedYou = inState("info_requested").filter((x) => x.r.needsYou).length;
  const deadlines = denialDeadlines(requests, clock).soon;
  const withinDay = deadlines.some((r) => (r.deadlineAt ?? Infinity) - clock <= DAY);

  const chip = (stage: StageKey, count: number, note: string, flag?: StateChip["flag"]): StateChip => ({ stage, label: STATUS_LABEL[stage], count, note, flag });
  return [
    chip("preparing", counts.preparing + saved.total, ready ? `${ready} ready to sign` : "none ready to sign"),
    chip("received", counts.received, lateSent ? `${lateSent} running late` : "all on time", lateSent ? "late" : undefined),
    chip("under_review", counts.under_review, pastCms ? `${pastCms} past 7 days` : lateReview ? `${lateReview} running late` : "none running late", pastCms || lateReview ? "late" : undefined),
    chip("info_requested", counts.info_requested, askedYou ? `${askedYou} waiting on you` : "none waiting on you"),
    chip("appeal", counts.appeal, deadlines.length ? `${plural(deadlines.length, "deadline")} this week` : "no deadline this week", withinDay ? "urgent" : undefined),
  ];
}

export interface LedgerChip {
  id: "active" | "renewal";
  label: string;
  count: number;
  note: string;
  /** Case Manager, with the matching filter. */
  to: string;
}

/** Active (approved, units left) and Renewal due (review due, or ending within 7 days). They describe ledger cases, not rows of the table. */
export function ledgerChips(ledger: LedgerCase[], requests: PsyRequest[], clock: number): LedgerChip[] {
  const active = ledger.filter((c) => isActiveAuth(c, clock));
  const renewal = ledger.filter((c) => isRenewalDue(c, clock)).sort((a, b) => a.dueAt - b.dueAt);
  const approvedToday = requests.filter((r) => r.stage === "decided" && r.outcome === "approved").length;
  const next = renewal[0];
  return [
    { id: "active", label: "Active", count: active.length, note: approvedToday ? `${approvedToday} approved today` : "approved, units left", to: `${paths.manager("cases")}&show=active` },
    { id: "renewal", label: "Renewal due", count: renewal.length, note: next ? `next: ${next.id}, ${next.dueAt - clock <= 0 ? "now" : inSpan(next.dueAt - clock)}` : "none due", to: `${paths.manager("cases")}&show=renewal` },
  ];
}

/* ------------------------------------------------------------------ the Status menu, the headline and the table sentence */

/** The Status menu: no state, then the six stages in the Lifecycle's words, each with how many it holds. */
export function statusOptions(counts: Record<StageKey, number>): Option<StageKey | "all">[] {
  return [{ value: "all", label: "All statuses" }, ...STAGES.map((s) => ({ value: s, label: STATUS_LABEL[s], hint: String(counts[s]) }))];
}

/** How many requests sit in each stage, with the cases saved in New case that have no row yet added to Awaiting sign-off. */
export function stageTotals(requests: PsyRequest[], saved: SavedCases): Record<StageKey, number> {
  const c = stageCounts(requests);
  return { ...c, preparing: c.preparing + saved.total };
}

/** The page title: what waits on payers and what waits on you, counted over everything the viewer can see (the table's filters do not change it). */
export function headline(requests: PsyRequest[], waitingOnYou: number): { title: string; sub: string } {
  const c = stageCounts(requests);
  const waiting = c.received + c.under_review;
  const payers = waiting === 0 ? "Nothing is waiting on a payer." : waiting === 1 ? "1 request is waiting on a payer." : `${waiting} requests are waiting on payers.`;
  const you = waitingOnYou === 0 ? "Nothing is waiting on you." : waitingOnYou === 1 ? "1 is waiting on you." : `${waitingOnYou} are waiting on you.`;
  return { title: `${payers} ${you}`, sub: "What to do now, and where every authorization stands." };
}

const SCOPE = (f: DashFilters): string => [f.payer !== "all" ? payerById(f.payer).name : "", f.program !== "all" ? PROGRAM_LABEL[f.program] : "", f.type !== "all" ? f.type : "", f.stage !== "all" ? STATUS_LABEL[f.stage] : ""].filter(Boolean).join(" · ");

/** The one quiet sentence under the table's title: what is filtered, then how it is ordered. */
export function tableSentence(f: DashFilters, needsToday: boolean, sort: RowSort | null): string {
  const scope = SCOPE(f);
  const order = sort ? `Sorted by ${SORT_LABEL[sort.key].toLowerCase()}, ${sort.dir === "asc" ? "lowest first" : "highest first"}.` : "Longest in their state first, with what needs you today on top.";
  return `${needsToday ? "Only what needs you today. " : ""}${scope ? `${scope}. ` : ""}${order}`;
}
