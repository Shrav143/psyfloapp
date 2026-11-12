import type { EbPatient } from "@/data/eligibility";
import { clockTime, stamp, toDate } from "@/lib/time";

/** Where one row stands with Verify's automatic re-check. The row, the demo clock and the Verify pause decide it, so the list and the result agree. */
export type AutoState = { kind: "done"; at: number } | { kind: "paused"; at: number } | { kind: "scheduled"; at: number };

export function autoState(p: EbPatient, clock: number, verifyPaused: boolean): AutoState | null {
  if (p.recheckDue && p.recheckAt !== undefined) return p.recheckAt <= clock && verifyPaused ? { kind: "paused", at: p.recheckAt } : { kind: "scheduled", at: p.recheckAt };
  return p.autoAt !== undefined && p.autoAt === p.checkedAt ? { kind: "done", at: p.autoAt } : null;
}

export const RE_CHECKED = (at: number): string => `Re-checked automatically at ${clockTime(toDate(at))}`;
export const NOT_RECHECKED = "Not re-checked: Verify is paused in Settings";
export const DUE_AT = (at: number): string => `Re-check due ${stamp(at)}`;
