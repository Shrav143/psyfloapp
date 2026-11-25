import { useMemo } from "react";
import { resolveCase } from "@/data/caseDetail";
import type { LedgerCase, LedgerStatus } from "@/data/manager";
import type { Review } from "@/data/managerReviews";
import { payerById, SEED_REQUESTS } from "@/data/seed";
import type { Program, PsyRequest } from "@/data/types";
import { useScope } from "@/lib/scope";
import { DAY } from "@/lib/time";
import { useStore } from "@/store";
import type { DenialAccepted } from "@/store/ripples";

/** A tracker row: the ledger record with the clock, status and new-today rows the screen needs. */
export interface LedgerRow extends LedgerCase {
  /** Set when the case page has its own due time for this case ("Answer due"): the tracker reads the same one. */
  verb?: string;
}

/** Days and units an approval usually covers, for a case approved after the demo opened. */
const APPROVED: Record<Program, number> = { RES: 14, PHP: 10, IOP: 24, WM: 5 };
const SEED_IDS = new Set(SEED_REQUESTS.map((r) => r.id));

/** A request signed and sent in New Case, as a tracker row. It follows the request: with the payer, asked for more, approved or denied. */
function fromRequest(id: string, r: PsyRequest): LedgerCase {
  const denial = r.track === "denial";
  const approved = r.stage === "decided" && !denial;
  const asked = r.stage === "info_requested";
  const days = APPROVED[r.program];
  const units = r.program === "IOP";
  const status: LedgerStatus = denial || asked ? "needs_action" : approved ? "on_track" : "awaiting";
  return {
    id,
    caseId: id,
    initials: r.patient.initials,
    age: r.patient.age,
    program: r.program,
    payerId: r.payerId,
    note: r.type,
    used: approved ? 0 : null,
    total: approved ? days : null,
    unit: units ? "units" : "days",
    clockKind: denial ? "p2p" : asked ? "answer" : approved ? (units ? "units" : "expiry") : "decision",
    dueAt: denial ? (r.deadlineAt ?? r.stageSince + 3 * DAY) : approved ? r.stageSince + days * DAY : r.stageSince + (asked ? DAY : (r.typicalMin ?? payerById(r.payerId).typicalDecisionDays * DAY)),
    chance: r.chance ?? 70,
    status,
    isNew: true,
  };
}

/**
 * The tracker's rows, in one place so the header count, the tiles and the table agree:
 * the seed ledger, then every case signed and sent in New Case today (they became requests in the core store).
 * A denial the clinic accepted reads "Step-down plan open" (the plan is on Active cases). A case with a next review
 * booked reads that date. Any other case that is also a request reads the case page's own due time, so the two
 * screens show the same hours and tick together with the demo clock.
 */
export function buildLedgerRows(ledger: LedgerCase[], requests: PsyRequest[], sentToday: string[], reviews: Review[], accepted: DenialAccepted[], clock: number): LedgerRow[] {
  const known = new Set(ledger.flatMap((c) => [c.id, c.caseId]));
  const fresh: LedgerCase[] = [];
  for (const id of sentToday) {
    if (known.has(id) || SEED_IDS.has(id) || fresh.some((f) => f.id === id)) continue;
    const r = requests.find((x) => x.id === id) ?? requests.find((x) => x.caseId === id);
    if (r) fresh.push(fromRequest(id, r));
  }
  const next = new Map<string, Review>();
  for (const r of reviews) if (r.scheduled && r.status !== "signed" && (next.get(r.ledgerId)?.dueAt ?? 0) < r.dueAt) next.set(r.ledgerId, r);

  return [...ledger, ...fresh].map((c): LedgerRow => {
    const closed = accepted.find((a) => a.denialId === c.id || a.requestId === c.caseId);
    if (closed) return { ...c, clockKind: "stepdown", dueAt: closed.at };
    const booked = next.get(c.id);
    if (booked) return { ...c, clockKind: "next", dueAt: booked.dueAt, status: booked.dueAt <= clock ? "review_due" : c.status === "awaiting" ? "awaiting" : "on_track" };
    const page = resolveCase(c.caseId, requests);
    return page?.dueAt === undefined ? c : { ...c, dueAt: page.dueAt, verb: page.dueVerb };
  });
}

/** The tracker's rows at the sites in view. Pass `false` for every row (the case route needs to know a case exists even when it is at the other site). */
export function useLedgerRows(inViewOnly = true): LedgerRow[] {
  const scope = useScope();
  const ledger = useStore((s) => s.ledger);
  const requests = useStore((s) => s.requests);
  const sentToday = useStore((s) => s.caseSentToday);
  const reviews = useStore((s) => s.reviews);
  const accepted = useStore((s) => s.deniesAccepted);
  const clock = useStore((s) => s.clock);
  return useMemo(() => {
    const rows = buildLedgerRows(ledger, requests, sentToday, reviews, accepted, clock);
    return inViewOnly ? scope.filter(rows, (r) => r.caseId) : rows;
  }, [ledger, requests, sentToday, reviews, accepted, clock, inViewOnly, scope]);
}
