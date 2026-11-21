import { BASE } from "@/lib/time";
import type { Score, Trend } from "./queue";
import type { Program } from "./types";

/* The screeners a case has on file, for the case page's screener chart. Every series is built from what the case already states:
   a screener named in the case's scores ends at that score and moves the way its arrow says; a screener of the old trend chart keeps
   those dated values and gains earlier ones. Nothing is random: the same case always gets the same points. */

export type ScreenerId = "phq9" | "gad7" | "pcl5" | "auditc" | "ciwa" | "cows" | "dast10" | "craving" | "bam" | "cssrs" | "whodas";
/** How often a screener is taken. "shift" scales are taken twice a day in residential care and withdrawal management, weekly elsewhere. */
type Cadence = "shift" | "week" | "month";

export interface ScreenerDef { name: string; measures: string; min: number; max: number; cadence: Cadence }
export const SCREENERS: Record<ScreenerId, ScreenerDef> = {
  phq9: { name: "PHQ-9", measures: "Depression", min: 0, max: 27, cadence: "week" },
  gad7: { name: "GAD-7", measures: "Anxiety", min: 0, max: 21, cadence: "week" },
  pcl5: { name: "PCL-5", measures: "Trauma", min: 0, max: 80, cadence: "week" },
  auditc: { name: "AUDIT-C", measures: "Alcohol", min: 0, max: 12, cadence: "month" },
  ciwa: { name: "CIWA-Ar", measures: "Withdrawal", min: 0, max: 67, cadence: "shift" },
  cows: { name: "COWS", measures: "Opioid withdrawal", min: 0, max: 48, cadence: "shift" },
  dast10: { name: "DAST-10", measures: "Drug use", min: 0, max: 10, cadence: "week" },
  craving: { name: "Craving", measures: "Self-rated, 0 to 10", min: 0, max: 10, cadence: "shift" },
  bam: { name: "BAM", measures: "Recovery", min: 0, max: 24, cadence: "week" },
  cssrs: { name: "C-SSRS", measures: "Suicide risk", min: 0, max: 5, cadence: "week" },
  whodas: { name: "WHODAS", measures: "Function", min: 0, max: 48, cadence: "week" },
};

export interface ScreenerPoint { at: number; value: number }
export interface CaseScreener extends ScreenerDef { id: ScreenerId; points: ScreenerPoint[]; shown: boolean }

/** The screener a score or trend label names: "CIWA" and "CIWA-Ar", "Craving (0 to 10)" and "Craving". */
export function screenerIdOf(label: string): ScreenerId | null {
  const k = label.toLowerCase().replace(/\(.*\)/, "").replace(/[^a-z0-9]/g, "");
  const map: Record<string, ScreenerId> = { phq9: "phq9", gad7: "gad7", pcl5: "pcl5", auditc: "auditc", ciwa: "ciwa", ciwaar: "ciwa", cows: "cows", dast10: "dast10", craving: "craving", bam: "bam", cssrs: "cssrs", whodas: "whodas" };
  return map[k] ?? null;
}

/** Demo minutes for a "10/17" date at a time of day. */
export const atOf = (md: string, hour = 9, minute = 0): number => {
  const [m, d] = md.split("/").map(Number);
  return Math.round((new Date(BASE.getFullYear(), m - 1, d, hour, minute).getTime() - BASE.getTime()) / 60_000);
};

const hash = (s: string): number => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const STEP: Record<"shift" | "week" | "month", number> = { shift: 12 * 60, week: 7 * 24 * 60, month: 28 * 24 * 60 };
const clamp = (v: number, d: ScreenerDef): number => Math.max(d.min, Math.min(d.max, Math.round(v)));
/** "14 → 4" is [14, 4]; "4/10" is [4] (out of ten); "17" is [17]. */
const numberOf = (value: string): number[] => {
  const nums = (value.match(/\d+/g) ?? []).map(Number);
  return value.includes("→") ? nums : nums.slice(0, 1);
};

export interface ScreenerInput {
  /** The case id: it seeds the number of points and the small wobble. */
  id: string;
  program: Program;
  /** The series the old trend chart drew, with the dates it drew them on. They are the defaults. */
  trend: { name: string; data: number[] }[];
  trendLabels: string[];
  /** The case's scores ("PHQ-9 17 ↑"). A screener named here ends at this value. */
  scores: Score[];
  /** More screeners on file, beyond the trend and the scores. */
  extra: ScreenerId[];
  /** Shown by default when the case has no trend. */
  defaults?: ScreenerId[];
  /** The case is doing well, so screeners with nothing else to go on are falling. */
  improving: boolean;
}

/** One series: `n` points at the screener's cadence, the last one on `endAt`. With `keep` (the old trend's dated values), those values stay as they are,
    the points between them are read off the straight line that joins them, and the points before them hold near the first one, so no new peak appears.
    Without it, the series ends on `end`, its last step goes the way `dir` says, and it never turns back on itself. */
function series(id: ScreenerId, key: string, n: number, endAt: number, program: Program, end: number, dir: Trend, swing: number, keep: { at: number; value: number }[] = []): ScreenerPoint[] {
  const def = SCREENERS[id];
  const cadence = def.cadence === "shift" && program !== "RES" && program !== "WM" ? "week" : def.cadence;
  const step = STEP[cadence];
  const h = hash(key + id);
  const sign = dir === "down" ? 1 : dir === "up" ? -1 : 0; // going back in time, a falling score was higher
  const per = n > 1 ? swing / (n - 1) : 0;
  const values: number[] = []; // values[k] is k steps before the last point
  for (let k = 0; k < n; k++) {
    const at = endAt - k * step;
    const wobble = ((h >>> (k % 16)) % 3) - 1; // -1, 0 or 1
    if (keep.length) {
      const exact = keep.find((p) => p.at === at);
      const after = keep.findIndex((p) => p.at > at);
      let v: number;
      if (exact) v = exact.value;
      else if (after <= 0) v = keep[0].value - Math.abs(wobble); // before the first kept value
      else {
        const a = keep[after - 1];
        const b = keep[after];
        v = a.value + ((b.value - a.value) * (at - a.at)) / (b.at - a.at);
      }
      values.push(clamp(v, def));
    } else if (sign === 0) {
      values.push(clamp(k < 3 ? end : end + wobble, def));
    } else if (k === 0) {
      values.push(clamp(end, def));
    } else {
      const target = clamp(k === 1 ? end + sign * Math.max(1, Math.round(per)) : end + sign * per * k + (k > 2 ? wobble * 0.6 : 0), def);
      const prev = values[k - 1];
      values.push(sign > 0 ? Math.max(prev, target) : Math.min(prev, target));
    }
  }
  return values.map((value, k) => ({ at: endAt - k * step, value })).reverse();
}

const DIR_OF = (data: number[]): Trend => (data[data.length - 1] < data[0] ? "down" : data[data.length - 1] > data[0] ? "up" : "flat");

/** Three to five screeners with six to ten points each. The trend's two series (or `defaults`) are shown; the rest wait under "Add screener". */
export function screenersFor(input: ScreenerInput): CaseScreener[] {
  const { id, program, trend, trendLabels, scores, extra, improving } = input;
  const n = 6 + (hash(id) % 5);
  const shifty = program === "RES" || program === "WM";
  const lastLabel = trendLabels[trendLabels.length - 1] ?? "10/20";
  // Withdrawal and craving scores are taken on the early shift; questionnaires in the morning session.
  const endOf = (sid: ScreenerId): number => atOf(lastLabel, shifty && SCREENERS[sid].cadence === "shift" ? 6 : 10);
  const out: CaseScreener[] = [];
  const add = (sid: ScreenerId, points: ScreenerPoint[], shown: boolean) => {
    if (!out.some((s) => s.id === sid)) out.push({ id: sid, ...SCREENERS[sid], points, shown });
  };
  const scoreOf = (sid: ScreenerId) => scores.find((s) => screenerIdOf(s.label) === sid);
  const range = (sid: ScreenerId) => SCREENERS[sid].max - SCREENERS[sid].min;

  for (const t of trend) {
    const sid = screenerIdOf(t.name);
    if (!sid) continue;
    const score = scoreOf(sid);
    const def = SCREENERS[sid];
    const cadence = def.cadence === "shift" && !shifty ? "week" : def.cadence;
    // The trend's dates: daily in residential care (every other twelve-hour point), weekly elsewhere.
    const dayStep = shifty ? 24 * 60 : 7 * 24 * 60;
    if (score) {
      // The score is what the page says now, so it wins: the series ends on it and keeps the trend's size of change.
      const nums = numberOf(score.value);
      const end = nums.length > 1 ? nums[nums.length - 1] : nums[0] ?? t.data[t.data.length - 1];
      const dir = score.trend ?? DIR_OF(t.data);
      const swing = Math.max(2, Math.abs(t.data[0] - t.data[t.data.length - 1]), nums.length > 1 ? Math.abs(nums[0] - end) : 0);
      add(sid, series(sid, id, n, endOf(sid), program, end, dir, dir === "flat" ? 0 : swing), true);
    } else {
      const keep = t.data.map((value, i) => ({ at: endOf(sid) - (t.data.length - 1 - i) * (cadence === "shift" ? dayStep : STEP[cadence]), value }));
      add(sid, series(sid, id, n, endOf(sid), program, t.data[t.data.length - 1], DIR_OF(t.data), 0, keep), true);
    }
  }
  for (const s of scores) {
    const sid = screenerIdOf(s.label);
    if (!sid) continue;
    const nums = numberOf(s.value);
    const end = nums[nums.length - 1] ?? 0;
    const dir = s.trend ?? (nums.length > 1 ? (nums[0] > end ? "down" : "up") : "flat");
    // C-SSRS moves one step at a time: a swing of more would put an outpatient case at active intent weeks ago.
    const swing = sid === "cssrs" ? 1 : nums.length > 1 ? Math.abs(nums[0] - end) : Math.max(2, Math.round(range(sid) * 0.2));
    add(sid, series(sid, id, sid === "auditc" ? 6 : n, endOf(sid), program, end, dir, dir === "flat" ? 0 : swing), (input.defaults ?? []).includes(sid) || (trend.length === 0 && !input.defaults && out.length < 2));
  }
  for (const sid of extra) {
    const h = hash(id + sid);
    const end = SCREENERS[sid].min + Math.round(range(sid) * (0.18 + (h % 25) / 100));
    const dir: Trend = improving ? "down" : h % 3 === 0 ? "flat" : "down";
    add(sid, series(sid, id, sid === "auditc" ? 6 : n, endOf(sid), program, end, dir, dir === "flat" ? 0 : Math.max(1, Math.round(range(sid) * 0.15))), false);
  }
  return out.slice(0, 5);
}

/** "fell from 14 to 4", "rose from 12 to 17", "held at 9": what a series did over its last three points (the review period). */
export function movedText(s: CaseScreener): string {
  const last = s.points.slice(-3);
  const a = last[0].value;
  const b = last[last.length - 1].value;
  return a === b ? `held at ${b}` : `${b < a ? "fell" : "rose"} from ${a} to ${b}`;
}
