import type { CallSlot } from "@/data/denials";
import { BASE } from "@/lib/time";

const WINDOWS: [number, number][] = [[9, 11], [13, 15], [16, 17]];
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const h12 = (h: number): number => ((h + 11) % 12) + 1;
const ampm = (h: number): string => (h < 12 ? "am" : "pm");
const atLocal = (dayOffset: number, hour: number): Date => new Date(BASE.getFullYear(), BASE.getMonth(), BASE.getDate() + dayOffset, hour, 0, 0);
const minutesOf = (d: Date): number => Math.round((d.getTime() - BASE.getTime()) / 60_000);

/** Three call windows on the next working days that fall before the payer's window closes. */
export function slotsFor(windowClosesAt: number | undefined): CallSlot[] {
  const out: CallSlot[] = [];
  for (let day = 1; day <= 14 && out.length < 3; day += 1) {
    for (const [from, to] of WINDOWS) {
      const start = atLocal(day, from);
      if (start.getDay() === 0 || start.getDay() === 6) continue;
      const startAt = minutesOf(start);
      if (windowClosesAt !== undefined && startAt >= windowClosesAt) continue;
      const date = `${WD[start.getDay()]} ${start.getMonth() + 1}/${start.getDate()}`;
      out.push({ id: `slot-${startAt}`, label: `${date}, ${h12(from)}–${h12(to)} ${ampm(to)}`, short: `${date} ${h12(from)} ${ampm(from)}`, startAt });
      if (out.length === 3) break;
    }
  }
  return out;
}
