import type { LedgerCase } from "@/data/manager";
import type { PsyRequest, StageKey } from "@/data/types";
import { cmsClock, requestAction, type CmsClock, type FactsContext, type RequestAction } from "@/lib/doNext";
import type { DueItem } from "@/lib/floFacts";
import { isApproved, ledgerFor, unitsLeft, windowOf } from "@/lib/ledgerFacts";
import { lateness, minutesInStage } from "@/store/selectors";

/* One table row: a request or denial with everything the nine columns show, worked out once from the live data.
   The Dashboard words for the states are the Lifecycle words, so a chip, the Status menu and the Status column always agree. */

/** The six stages in the words of the Lifecycle. The stage keys (and `?stage=` in the address) are unchanged. */
export const STATUS_LABEL: Record<StageKey, string> = {
  preparing: "Awaiting sign-off",
  received: "Submitted",
  under_review: "Decision pending",
  info_requested: "Info requested",
  decided: "Decided today",
  appeal: "Denied / appeal",
};

export interface CaseRow {
  r: PsyRequest;
  /** What the Status column says: a Lifecycle word, or the request's own state once it is decided or on a denial route ("Approved", "Call booked"). */
  status: string;
  /** Minutes in the current state. */
  minutes: number;
  /** The payer's usual time in this state, in minutes, when the data has one. */
  median?: number;
  late: "ok" | "late" | "very";
  cms?: CmsClock;
  /** Approved days or units and what is left, from the Case Manager ledger. */
  units?: { total: number; left: number; unit: LedgerCase["unit"] };
  /** The approved dates, from the ledger. */
  window?: { from: number; to: number };
  action: RequestAction;
  due?: DueItem;
}

function statusOf(r: PsyRequest): string {
  switch (r.stage) {
    case "preparing":
    case "received":
    case "under_review":
      return STATUS_LABEL[r.stage];
    default:
      return r.chip;
  }
}

export function buildRows(requests: PsyRequest[], ctx: FactsContext): CaseRow[] {
  return requests.map((r) => {
    const c = ledgerFor(ctx.ledger, r);
    const approved = c && isApproved(c);
    return {
      r,
      status: statusOf(r),
      minutes: minutesInStage(r, ctx.clock),
      median: r.typicalMin,
      late: lateness(r, ctx.clock),
      cms: cmsClock(r, ctx.clock),
      units: c && approved ? { total: c.total ?? 0, left: unitsLeft(c) ?? 0, unit: c.unit } : undefined,
      window: c ? windowOf(c, ctx.clock) : undefined,
      action: requestAction(r, ctx),
      due: ctx.dues.get(r.id),
    };
  });
}

/** The ones that need a person today first, then the longest in their state. A sort the person picks replaces this. */
export function defaultOrder(rows: CaseRow[]): CaseRow[] {
  return [...rows].sort((a, b) => Number(b.action.today) - Number(a.action.today) || b.minutes - a.minutes || a.r.id.localeCompare(b.r.id));
}
