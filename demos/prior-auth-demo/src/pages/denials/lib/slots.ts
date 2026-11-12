import type { CallSlot } from "@/data/denials";
import { BASE, DAY, HOUR } from "@/lib/time";

const WINDOWS: [number, number][] = [[9, 11], [13, 15], [16, 17]];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const h12 = (h: number): number => ((h + 11) % 12) + 1;
const ampm = (h: number): string => (h < 12 ? "am" : "pm");
const atLocal = (dayOffset: number, hour: number): Date => new Date(BASE.getFullYear(), BASE.getMonth(), BASE.getDate() + dayOffset, hour, 0, 0);
const minutesOf = (d: Date): number => Math.round((d.getTime() - BASE.getTime()) / 60_000);

/** Up to three call windows on working days that start after the demo clock and before the payer's window closes. Fast-forwarding uses them up. */
export function slotsFor(windowClosesAt: number | undefined, clock: number): CallSlot[] {
  const out: CallSlot[] = [];
  const today = Math.floor((clock + BASE.getHours() * HOUR + BASE.getMinutes()) / DAY);
  for (let day = today; day <= today + 14 && out.length < 3; day += 1) {
    for (const [from, to] of WINDOWS) {
      const start = atLocal(day, from);
      if (start.getDay() === 0 || start.getDay() === 6) continue;
      const startAt = minutesOf(start);
      if (startAt <= clock) continue;
      if (windowClosesAt !== undefined && startAt >= windowClosesAt) continue;
      const date = `${WD[start.getDay()]} ${start.getMonth() + 1}/${start.getDate()}`;
      out.push({ id: `slot-${startAt}`, label: `${date}, ${h12(from)}–${h12(to)} ${ampm(to)}`, short: `${date} ${h12(from)} ${ampm(from)}`, startAt });
      if (out.length === 3) break;
    }
  }
  return out;
}
