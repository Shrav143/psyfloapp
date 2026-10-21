import type { CaseWork } from "@/data/caseModel";
import type { Band, QueueItem } from "@/data/queue";
import { BANDS } from "@/data/queue";
import { plural } from "@/lib/format";
import { HOUR, toDate } from "@/lib/time";
import type { QueueFilters } from "@/store/queue";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "40 min", "5 h", "2 d": how long until something is due. */
export function shortSpan(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < HOUR) return `${m} min`;
  if (m < 48 * HOUR) return `${Math.round(m / HOUR)} h`;
  return `${Math.floor(m / (24 * HOUR))} d`;
}

/** "Notice due in 5 h" for the next two days, then "Decision Thu". */
export function dueText(verb: string, dueAt: number, clock: number): string {
  const left = dueAt - clock;
  if (left <= 0) return `${verb} now`;
  if (left < 48 * HOUR) return `${verb} in ${shortSpan(left)}`;
  return `${verb} ${WEEKDAY[toDate(dueAt).getDay()]}`;
}

/** What the queue shows for a request's chance: the value after the user applied actions, if any. */
export const chanceOf = (i: QueueItem, cases: Record<string, CaseWork>): number => cases[i.id]?.chance ?? i.chance;
export function liftOf(i: QueueItem, cases: Record<string, CaseWork>): string {
  const w = cases[i.id];
  if (w?.chance === undefined) return i.liftLabel;
  return (w.liftLeft ?? 0) > 0 ? `+${plural(w.liftLeft ?? 0, "pt")} possible` : "on track";
}

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function filterItems(items: QueueItem[], f: QueueFilters): QueueItem[] {
  const q = norm(f.q);
  return items.filter((i) => {
    if (q && !norm(i.id).includes(q) && !norm(i.initials).includes(q)) return false;
    if (f.payer !== "all" && i.payerId !== f.payer) return false;
    if (f.urgency !== "all" && i.band !== f.urgency) return false;
    if (f.signalOnly && !i.signal) return false;
    if (f.status === "input") return i.needsInput;
    if (f.status !== "all") return i.phase === f.status;
    return true;
  });
}
/** Every filter except Urgency. */
export const otherFiltersActive = (f: QueueFilters): boolean => !!f.q.trim() || f.payer !== "all" || f.status !== "all" || f.signalOnly;
export const filtersActive = (f: QueueFilters): boolean => otherFiltersActive(f) || f.urgency !== "all";

export interface Stats { count: number; dollars: number; avg: number; firstDue: number | null }
export function statsOf(items: QueueItem[], cases: Record<string, CaseWork>, clock: number): Stats {
  const n = items.length;
  return {
    count: n,
    dollars: items.reduce((a, i) => a + i.atStake, 0),
    avg: n ? Math.round(items.reduce((a, i) => a + chanceOf(i, cases), 0) / n) : 0,
    firstDue: n ? Math.min(...items.map((i) => i.dueAt)) - clock : null,
  };
}

export const byBand = (items: QueueItem[]): Record<Band, QueueItem[]> => {
  const out: Record<Band, QueueItem[]> = { now: [], day: [], week: [] };
  for (const b of BANDS) out[b] = items.filter((i) => i.band === b);
  return out;
};
