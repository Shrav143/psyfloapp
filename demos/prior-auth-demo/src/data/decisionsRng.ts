import { apportion } from "./analytics";
import type { Decision } from "./decisionTypes";

/* Seeded random numbers and the small helpers the generator shares. */

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export class Rng {
  private next: () => number;
  constructor(seed: string) {
    this.next = mulberry32(hashSeed(`psyflo-analytics|${seed}`));
  }
  float(): number {
    return this.next();
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }
  normal(): number {
    const u = Math.max(1e-9, this.next());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * this.next());
  }
  /** Index chosen in proportion to the weights. */
  index(weights: readonly number[]): number {
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return Math.floor(this.next() * weights.length);
    let x = this.next() * total;
    for (let i = 0; i < weights.length; i++) {
      x -= weights[i];
      if (x < 0) return i;
    }
    return weights.length - 1;
  }
  pick<T>(items: readonly T[], weight: (t: T) => number): T {
    return items[this.index(items.map(weight))];
  }
  shuffle<T>(xs: T[]): T[] {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [xs[i], xs[j]] = [xs[j], xs[i]];
    }
    return xs;
  }
  /** `k` items without replacement, favoring higher weights (a keyed sample, so the result is stable for a seed). */
  take<T>(pool: readonly T[], k: number, weight: (t: T) => number = () => 1): T[] {
    if (k >= pool.length) return [...pool];
    if (k <= 0) return [];
    return pool
      .map((t) => ({ t, key: Math.pow(Math.max(1e-9, this.next()), 1 / Math.max(1e-6, weight(t))) }))
      .sort((a, b) => b.key - a.key)
      .slice(0, k)
      .map((x) => x.t);
  }
}

export const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
export const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/** Like `apportion`, with a floor and a ceiling for each share, for splitting a total across payers that cannot take more than they have. */
export function apportionBounded(total: number, weights: number[], lo: number[], hi: number[]): number[] {
  const out = lo.map((l, i) => Math.min(l, hi[i]));
  let left = total - sum(out);
  let active = out.map((_, i) => i).filter((i) => out[i] < hi[i]);
  while (left > 0 && active.length) {
    const alloc = apportion(left, active.map((i) => Math.max(weights[i], 1e-6)));
    let moved = 0;
    const next: number[] = [];
    active.forEach((i, j) => {
      const add = Math.min(alloc[j], hi[i] - out[i]);
      out[i] += add;
      moved += add;
      if (out[i] < hi[i]) next.push(i);
    });
    if (!moved) break;
    left -= moved;
    active = next;
  }
  return out;
}

/** A record while its payer's quarter is being built. */
export interface Draft extends Decision {
  /** Not part of the record: kept while the payer's quarter is built. */
  _real?: boolean;
}

