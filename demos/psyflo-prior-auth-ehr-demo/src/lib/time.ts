/* The demo clock. All timestamps are "demo minutes" relative to BASE, so data stays consistent
   whenever someone opens the demo. Fast-forward moves the clock; real time does not. */
export const BASE = new Date(2026, 9, 20, 10, 42, 0); // Tue 20 Oct 2026, 10:42 am
export const MIN = 1;
export const HOUR = 60;
export const DAY = 24 * 60;

export const toDate = (m: number): Date => new Date(BASE.getTime() + m * 60_000);

/** "1 d 4 h", "35 m", "2 h" — compact elapsed time. */
export function duration(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 1) return "just now";
  if (m < HOUR) return `${m} m`;
  if (m < DAY) {
    const h = Math.floor(m / HOUR);
    const r = m % HOUR;
    return r ? `${h} h ${r} m` : `${h} h`;
  }
  const d = Math.floor(m / DAY);
  const h = Math.floor((m % DAY) / HOUR);
  return h ? `${d} d ${h} h` : `${d} d`;
}

/** Typical times read better as "1.5 d" / "25 min" / "2 h". */
export function typical(min: number): string {
  if (min < HOUR) return `${Math.round(min)} min`;
  if (min < DAY) return `${+(min / HOUR).toFixed(1)} h`;
  return `${+(min / DAY).toFixed(1)} d`;
}

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function clockTime(d: Date): string {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${((h + 11) % 12) + 1}:${m} ${h < 12 ? "am" : "pm"}`;
}
/** "Mon 2:10 pm" */
export const stamp = (m: number): string => {
  const d = toDate(m);
  return `${WD[d.getDay()]} ${clockTime(d)}`;
};
/** "10/20" */
export const shortDate = (m: number): string => {
  const d = toDate(m);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};
/** "10/20/2026" */
export const longDate = (m: number): string => {
  const d = toDate(m);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
};
/** "5 min ago", "2 h ago", "3 d ago" relative to the demo clock `now`. */
export function ago(at: number, now: number): string {
  const diff = now - at;
  if (diff < 1) return "just now";
  if (diff < HOUR) return `${Math.round(diff)} min ago`;
  if (diff < DAY) return `${Math.round(diff / HOUR)} h ago`;
  return `${Math.round(diff / DAY)} d ago`;
}
