import { URGENT } from "@/lib/doNext";
import { DAY } from "@/lib/time";
import type { CaseRow } from "./caseRows";

/* How the dashboard sorts a request into a colour: red needs a person now, yellow is coming up, grey is with the payer or the agents, green is done.
   Worked out from the same facts the old Do next list used (a person is waiting, a clock is close, a decision is late), so nothing that used to be listed is lost. */
export type Tier = "attention" | "upcoming" | "waiting" | "done";
export const TIER_ORDER: Tier[] = ["attention", "upcoming", "waiting", "done"];

/** Minutes until the request's own deadline (a notice due, a review due, a denial window), or undefined when it has none. */
export const leftOf = (row: CaseRow, clock: number): number | undefined => (row.due ? row.due.dueAt - clock : undefined);

export function tierOf(row: CaseRow, clock: number): Tier {
  if (row.r.stage === "decided") return "done";
  const left = leftOf(row, clock);
  if (row.action.today || row.late === "very" || row.cms?.past || (left !== undefined && left <= URGENT)) return "attention";
  if (row.action.kind === "renewal" || row.late === "late" || row.cms?.hint || (left !== undefined && left <= 2 * DAY)) return "upcoming";
  return "waiting";
}

/** Most urgent first inside a colour: the nearest deadline, then the longest in its state. */
export function byUrgency(clock: number) {
  return (a: CaseRow, b: CaseRow): number => (leftOf(a, clock) ?? Infinity) - (leftOf(b, clock) ?? Infinity) || b.minutes - a.minutes || a.r.id.localeCompare(b.r.id);
}

export type UpdatedRange = "all" | "today" | "week" | "month";
export type DueRange = "any" | "today" | "three" | "week";
export const UPDATED: { value: UpdatedRange; label: string; days: number }[] = [
  { value: "all", label: "Any date", days: Infinity },
  { value: "today", label: "Today", days: 1 },
  { value: "week", label: "Last 7 days", days: 7 },
  { value: "month", label: "Last 30 days", days: 30 },
];
export const DUE: { value: DueRange; label: string; days: number }[] = [
  { value: "any", label: "Any deadline", days: Infinity },
  { value: "today", label: "Due today", days: 1 },
  { value: "three", label: "Due in 3 days", days: 3 },
  { value: "week", label: "Due in 7 days", days: 7 },
];

/** The two date menus: when the request last changed, and when its deadline falls. */
export function inDates(row: CaseRow, clock: number, updated: UpdatedRange, due: DueRange): boolean {
  const u = UPDATED.find((x) => x.value === updated)!.days;
  if (u !== Infinity && row.minutes > u * DAY) return false;
  const d = DUE.find((x) => x.value === due)!.days;
  if (d === Infinity) return true;
  const left = leftOf(row, clock);
  return left !== undefined && left <= d * DAY;
}
