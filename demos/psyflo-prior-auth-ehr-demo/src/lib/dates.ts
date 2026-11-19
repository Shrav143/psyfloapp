/* Calendar dates as "yyyy-mm-dd" text, in local time. The demo clock lives in lib/time.ts; this is for pickers and ranges. */
export interface DateRange {
  from: string;
  to: string;
}

const pad = (n: number): string => String(n).padStart(2, "0");
export const toISO = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Noon, so a daylight-saving change never moves the day. */
export const fromISO = (s: string): Date => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12);
};
export const isISO = (s: string | null | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(fromISO(s).getTime());

export const addDays = (s: string, n: number): string => {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
/** Days from a to b, counting both ends: Oct 1 to Oct 7 is 7. */
export const daysIn = (r: DateRange): number => Math.round((fromISO(r.to).getTime() - fromISO(r.from).getTime()) / 86_400_000) + 1;
export const firstOfMonth = (s: string): string => `${s.slice(0, 7)}-01`;
export const addMonths = (s: string, n: number): string => {
  const d = fromISO(firstOfMonth(s));
  d.setMonth(d.getMonth() + n);
  return toISO(d);
};
export const daysInMonth = (s: string): number => {
  const d = fromISO(firstOfMonth(s));
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
};
/** 0 = Monday, so calendars start the week on Monday. */
export const weekdayOf = (s: string): number => (fromISO(s).getDay() + 6) % 7;

const fmt = (s: string, o: Intl.DateTimeFormatOptions): string => fromISO(s).toLocaleDateString("en-US", o);
export const monthTitle = (s: string): string => fmt(s, { month: "long", year: "numeric" });
export const fullDate = (s: string): string => fmt(s, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
export const shortDay = (s: string, withYear = false): string => fmt(s, withYear ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" });

/** "Sep 21 to Oct 20, 2026", or one date when the range is a single day. */
export function rangeLabel(r: DateRange): string {
  if (r.from === r.to) return shortDay(r.from, true);
  const sameYear = r.from.slice(0, 4) === r.to.slice(0, 4);
  return `${shortDay(r.from, !sameYear)} – ${shortDay(r.to, true)}`;
}
