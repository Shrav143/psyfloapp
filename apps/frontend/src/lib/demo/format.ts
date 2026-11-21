/** Formatting helpers used across the demo screens (money, dates, day math). */

export const DEMO_TODAY = "2026-09-21";
export const VISIT_RATE = 244.29;
export const CLINICIAN_RATE = 90;

const DAY_MS = 86_400_000;

export function toDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  return new Date(toDate(iso).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round(
    (toDate(toIso).getTime() - toDate(fromIso).getTime()) / DAY_MS,
  );
}

export function isWeekday(iso: string): boolean {
  const d = toDate(iso).getUTCDay();
  return d !== 0 && d !== 6;
}

export function money(value: number, opts: { cents?: boolean } = {}): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts.cents ? 2 : 0,
    minimumFractionDigits: opts.cents ? 2 : 0,
  });
}

export function pct(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function fmtDate(iso: string, withYear = false): string {
  const d = toDate(iso);
  const base = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return withYear ? `${base} ${d.getUTCFullYear()}` : base;
}

export function fmtLongDate(iso: string): string {
  const d = toDate(iso);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function quarterOf(iso: string): string {
  const d = toDate(iso);
  return `Q${Math.floor(d.getUTCMonth() / 3) + 1} ${String(d.getUTCFullYear()).slice(2)}`;
}

export function relativeDays(iso: string, today = DEMO_TODAY): string {
  const n = daysBetween(today, iso);
  if (n === 0) {
    return "today";
  }
  if (n === 1) {
    return "tomorrow";
  }
  if (n === -1) {
    return "yesterday";
  }
  return n > 0 ? `in ${n} days` : `${Math.abs(n)} days ago`;
}
