import type { CaseWork } from "@/data/caseModel";
import type { Band, Phase, QueueItem, StatusFilter } from "@/data/queue";
import { BANDS, REQUEST_KINDS, STATUS_LABEL, isWaitingOnYou, requestKindOf, type RequestKind } from "@/data/queue";
import { PAYERS } from "@/data/seed";
import { HOUR, toDate } from "@/lib/time";
import { DEFAULT_QUEUE_FILTERS, type QueueFilters } from "@/store/queue";

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
/** Where a request is for filtering and for its chip: once every check passes after the user applied actions, it is ready to sign. */
export const phaseOf = (i: QueueItem, cases: Record<string, CaseWork>): Phase => (i.phase === "preparing" && cases[i.id]?.ready ? "ready" : i.phase);

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function filterItems(items: QueueItem[], f: QueueFilters, cases: Record<string, CaseWork>): QueueItem[] {
  const q = norm(f.q);
  return items.filter((i) => {
    if (q && !norm(i.id).includes(q) && !norm(i.initials).includes(q)) return false;
    if (f.payer !== "all" && i.payerId !== f.payer) return false;
    if (f.urgency !== "all" && i.band !== f.urgency) return false;
    if (f.type !== "all" && requestKindOf(i.type) !== f.type) return false;
    if (f.signalOnly && !i.signal) return false;
    if (f.status === "you") return isWaitingOnYou(i);
    if (f.status === "input") return i.needsInput;
    if (f.status !== "all") return phaseOf(i, cases) === f.status;
    return true;
  });
}
/** Every filter except Urgency. */
export const otherFiltersActive = (f: QueueFilters): boolean => !!f.q.trim() || f.payer !== "all" || f.status !== "all" || f.type !== "all" || f.signalOnly;
export const filtersActive = (f: QueueFilters): boolean => otherFiltersActive(f) || f.urgency !== "all";

export interface Stats { count: number; avg: number; firstDue: number | null }
export function statsOf(items: QueueItem[], cases: Record<string, CaseWork>, clock: number): Stats {
  const n = items.length;
  return {
    count: n,
    avg: n ? Math.round(items.reduce((a, i) => a + chanceOf(i, cases), 0) / n) : 0,
    firstDue: n ? Math.min(...items.map((i) => i.dueAt)) - clock : null,
  };
}

export const byBand = (items: QueueItem[]): Record<Band, QueueItem[]> => {
  const out: Record<Band, QueueItem[]> = { now: [], day: [], week: [] };
  for (const b of BANDS) out[b] = items.filter((i) => i.band === b);
  return out;
};

/* ------------------------------------------------------------------ deep links: /authorizations?payer=cardinal&type=retro */
const PARAM = { q: "q", payer: "payer", status: "status", urgency: "urgency", type: "type", signalOnly: "signal" } as const;

/** The filters as address parameters. Only filters that are set appear, so the plain queue has a plain address. */
export function paramsOf(f: QueueFilters, base: URLSearchParams): URLSearchParams {
  const out = new URLSearchParams(base);
  for (const p of Object.values(PARAM)) out.delete(p);
  if (f.q) out.set(PARAM.q, f.q);
  if (f.payer !== "all") out.set(PARAM.payer, f.payer);
  if (f.status !== "all") out.set(PARAM.status, f.status);
  if (f.urgency !== "all") out.set(PARAM.urgency, f.urgency);
  if (f.type !== "all") out.set(PARAM.type, f.type);
  if (f.signalOnly) out.set(PARAM.signalOnly, "1");
  return out;
}

/** The filters an address asks for, or null when it names none. A value that is not one of the options is ignored. */
export function filtersFromParams(sp: URLSearchParams): QueueFilters | null {
  if (!Object.values(PARAM).some((p) => sp.has(p))) return null;
  const pick = <T extends string>(key: string, allowed: readonly T[]): T | null => {
    const v = sp.get(key);
    return v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : null;
  };
  return {
    q: sp.get(PARAM.q) ?? "",
    payer: pick(PARAM.payer, PAYERS.map((p) => p.id)) ?? "all",
    status: pick<StatusFilter>(PARAM.status, Object.keys(STATUS_LABEL) as StatusFilter[]) ?? "all",
    urgency: pick<Band>(PARAM.urgency, BANDS) ?? "all",
    type: pick<RequestKind>(PARAM.type, REQUEST_KINDS) ?? "all",
    signalOnly: sp.get(PARAM.signalOnly) === "1",
  };
}
export const sameFilters = (a: QueueFilters, b: QueueFilters): boolean => (Object.keys(DEFAULT_QUEUE_FILTERS) as (keyof QueueFilters)[]).every((k) => a[k] === b[k]);
