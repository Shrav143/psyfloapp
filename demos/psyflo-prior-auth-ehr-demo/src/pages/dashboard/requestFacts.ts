import type { PsyRequest } from "@/data/types";
import { sentAt } from "@/lib/floFacts";
import { DAY } from "@/lib/time";

export { sentAt };

/** "22 minutes" read from the request's own next line; stage fallbacks otherwise. */
export function nextCheckIn(r: PsyRequest): string | undefined {
  const m = /in (\d+) (minute|hour)s?/.exec(r.next);
  if (m) return `${m[1]} ${m[2]}${m[1] === "1" ? "" : "s"}`;
  return r.stage === "received" || r.stage === "under_review" ? "30 minutes" : undefined;
}

const hash = (s: string): number => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 100003, 7);

/** Approval chance with a range and the number of similar cases. R-1042 and D-3318 carry the canonical figures. */
export function chanceFacts(r: PsyRequest): { chance: number; low: number; high: number; similar: number } | undefined {
  if (r.chance === undefined) return undefined;
  if (r.id === "R-1042") return { chance: 62, low: 56, high: 68, similar: 1248 };
  if (r.id === "D-3318") return { chance: 64, low: 55, high: 72, similar: 312 };
  const spread = 5 + (hash(r.id) % 4);
  return { chance: r.chance, low: Math.max(0, r.chance - spread), high: Math.min(100, r.chance + spread), similar: 180 + (hash(r.id) % 760) };
}

/** Days (or units) a new approval covers, and a stable approval number for the write-back. */
export function approvalFacts(r: PsyRequest): { number: string; amount: string; from: number; to: number } {
  const n = r.program === "RES" ? 14 : r.program === "PHP" ? 10 : r.program === "WM" ? 5 : 24;
  const unit = r.program === "IOP" ? "units" : "days";
  const spanDays = r.program === "IOP" ? 14 : n;
  return { number: `PA-26-${String(100000 + (hash(r.id) % 900000))}`, amount: `${n} ${unit}`, from: r.stageSince, to: r.stageSince + spanDays * DAY };
}
