/* What the Case Manager ledger says about an approved authorization: is it active, is it due for renewal, how many units are left, and between which dates it runs.
   The Dashboard (Lifecycle chips, the Units and Window columns, Do next), Ask FLO and Case Manager all read these, so a count on one screen is the count on the other. */
import type { LedgerCase } from "@/data/manager";
import { DAY, toDate } from "./time";

/** An authorization is approved once the ledger holds units for it. A case still waiting on its first decision has none. */
export const isApproved = (c: LedgerCase): boolean => c.used !== null && c.total !== null;

/** Approved days or units still to use. Undefined while there is no approval. */
export const unitsLeft = (c: LedgerCase): number | undefined => (isApproved(c) ? Math.max(0, (c.total ?? 0) - (c.used ?? 0)) : undefined);

/** The approval has an end date and it has passed. A case measured in units to the end of the stay (clock "units") has no date to pass. */
export const hasEnded = (c: LedgerCase, clock: number): boolean => c.clockKind === "expiry" && c.dueAt - clock <= 0;

/** Active: approved, units left, and not ended. */
export const isActiveAuth = (c: LedgerCase, clock: number): boolean => isApproved(c) && (unitsLeft(c) ?? 0) > 0 && !hasEnded(c, clock);

/** The approval ends within this many days (or has ended). */
export const RENEWAL_DAYS = 7;
export const endsSoon = (c: LedgerCase, clock: number, days = RENEWAL_DAYS): boolean => c.clockKind === "expiry" && c.dueAt - clock <= days * DAY;

/** Renewal due: approved, and the clinical review is due or the approval ends within a week. */
export const isRenewalDue = (c: LedgerCase, clock: number): boolean => isApproved(c) && (c.status === "review_due" || endsSoon(c, clock));

/** The ledger case that belongs to a request or denial row, by its own id first, then by its case id. */
export function ledgerFor<T extends Pick<LedgerCase, "id" | "caseId">>(rows: readonly T[], r: { id: string; caseId: string }): T | undefined {
  return rows.find((c) => c.id === r.id) ?? rows.find((c) => c.id === r.caseId || c.caseId === r.caseId || c.caseId === r.id);
}

/** 24 IOP units cover 14 days in the demo's own approvals (see approvalFacts on the Dashboard), so an IOP unit is a little over half a day. */
const IOP_UNITS_PER_DAY = 24 / 14;

/**
 * The dates an approval runs. The end is the expiry clock when the ledger has one, otherwise today plus what is left;
 * the start is the end minus the approved length. Days count one a day; IOP units count at the demo's rate. Undefined while there is no approval.
 */
export function windowOf(c: LedgerCase, clock: number): { from: number; to: number } | undefined {
  if (!isApproved(c)) return undefined;
  const perDay = c.unit === "units" ? IOP_UNITS_PER_DAY : 1;
  const length = Math.round((c.total ?? 0) / perDay) * DAY;
  const to = c.clockKind === "expiry" ? c.dueAt : clock + Math.round((unitsLeft(c) ?? 0) / perDay) * DAY;
  return { from: to - length, to };
}

const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Oct 6" */
export const dayLabel = (m: number): string => {
  const d = toDate(m);
  return `${MONTH[d.getMonth()]} ${d.getDate()}`;
};
/** "Oct 6 – Oct 20" */
export const windowText = (w: { from: number; to: number }): string => `${dayLabel(w.from)} – ${dayLabel(w.to)}`;
