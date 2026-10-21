import { BASE, toDate } from "@/lib/time";

const pad = (n: number): string => String(n).padStart(2, "0");

/** Demo minutes to the value an <input type="date"> wants. */
export const toInputDate = (min: number): string => {
  const d = toDate(min);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** "2026-10-22" and "09:00" back to demo minutes. Null when the date is empty or invalid. */
export function fromInput(date: string, time = "09:00"): number | null {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  if (!y || !mo || !d) return null;
  return Math.round((new Date(y, mo - 1, d, h || 0, mi || 0).getTime() - BASE.getTime()) / 60000);
}
