import { ACTIONS, BASE, EDIT_APPROVAL, PAYER_ORDER, apportion, reasonsOf, type Reason } from "./analytics";
import { CMS_HOURS, MONTHS, cmsApplies, monthOfDay, type Decision, type DxId, type EditKind, type Outcome, type PopulationId } from "./decisionTypes";
import { DENIAL_BY_PROGRAM, DX_BY_PROGRAM, DX_MIX, KIND_BY_PROGRAM, MONTH_VOLUME, OUD_CUT_FRAC, PROFILE, QUARTER_PROGRAM, tiltOf, type PayerProfile } from "./decisionsProfile";
import { DEMO_CASE_IDS, REAL_DECISIONS, type RealDecision } from "./decisionsReal";
import { PAYERS } from "./seed";
import { siteOf, type SiteId } from "./sites";
import type { BuiltInPayerId, Program } from "./types";
import { PROGRAMS } from "./types";
import type { RequestKind } from "./queue";

/* A deterministic generator for twelve months of payer decisions. Nothing here is random in the browser: the same seed gives the same
   records every time. The counts that must come out exactly (this quarter, per payer) are placed, not sampled: the generator builds the
   list of denial reasons the quarter must hold, the list of programs, the months, and then deals them out to the records. */

/* ------------------------------------------------------------------ random numbers */
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
class Rng {
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

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));

/** Like `apportion`, with a floor and a ceiling for each share, for splitting a total across payers that cannot take more than they have. */
function apportionBounded(total: number, weights: number[], lo: number[], hi: number[]): number[] {
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

/* ------------------------------------------------------------------ small tables */
const LETTERS = "ABCDEFGHJKLMNPRSTVWY";
const REQUESTED: Record<Program, Record<"first" | "other", [number, number][]>> = {
  RES: { first: [[14, 45], [21, 30], [28, 25]], other: [[7, 20], [10, 20], [14, 60]] },
  PHP: { first: [[10, 50], [12, 20], [15, 30]], other: [[10, 50], [12, 20], [15, 30]] },
  IOP: { first: [[24, 35], [36, 30], [48, 35]], other: [[24, 35], [36, 30], [48, 35]] },
  WM: { first: [[3, 20], [5, 50], [7, 30]], other: [[3, 20], [5, 50], [7, 30]] },
};
const EXPEDITED: Record<RequestKind, number> = { initial: 0.25, concurrent: 0.55, reauth: 0.15, modify: 0.5, retro: 0 };
const KIND_ORDER: RequestKind[] = ["initial", "concurrent", "reauth", "modify", "retro"];
const POP_ORDER: PopulationId[] = ["adolescent", "adult", "dual", "perinatal", "first", "prior"];
const DX_ORDER: DxId[] = ["aud", "oud", "stim", "mood", "trauma", "cooc"];
const PREFIX: Record<Program, string> = { RES: "R", IOP: "I", PHP: "P", WM: "R" };

/** Rate at the middle of a month, interpolated between the quarter averages (which sit on the second month of each quarter). */
function rateAtMonth(prof: PayerProfile, m: number): number {
  const centers = [1, 4, 7, 10];
  const r = prof.rate;
  if (m <= 1) return r[0] - ((r[1] - r[0]) / 3) * (1 - m);
  if (m >= 10) return r[3] + ((r[3] - r[2]) / 3) * (m - 10);
  const i = centers.findIndex((c, k) => m >= c && m < centers[k + 1]);
  return r[i] + ((r[i + 1] - r[i]) * (m - centers[i])) / 3;
}

interface Draft extends Decision {
  /** Not part of the record: kept while the payer's quarter is built. */
  _real?: boolean;
}

/* ------------------------------------------------------------------ one payer, one quarter */
const taken = new Set<string>([...DEMO_CASE_IDS, ...REAL_DECISIONS.map((r) => r.id)]);

function freshId(program: Program, site: SiteId, rng: Rng): string {
  for (let tries = 0; tries < 400; tries++) {
    const id = `${PREFIX[program]}-${rng.int(1200, 4499)}`;
    if (taken.has(id)) continue;
    if (tries < 300 && siteOf(id) !== site) continue;
    taken.add(id);
    return id;
  }
  throw new Error("No free id");
}

function ageOf(pop: PopulationId, payerId: BuiltInPayerId, prof: PayerProfile, rng: Rng): number {
  if (pop === "adolescent") return rng.int(14, 17);
  if (pop === "perinatal") return clamp(Math.round(29 + rng.normal() * 5), 19, 41);
  if (pop === "dual") return payerId === "harborview" ? clamp(Math.round(65 + rng.normal() * 7), 52, 80) : clamp(Math.round(52 + rng.normal() * 8), 38, 68);
  if (pop === "first") return clamp(Math.round(prof.age[0] - 3 + rng.normal() * prof.age[1]), 18, 66);
  return clamp(Math.round(prof.age[0] + 1 + rng.normal() * prof.age[1]), 19, 72);
}

function requestedFor(program: Program, kind: RequestKind, rng: Rng): number {
  const rows = REQUESTED[program][kind === "initial" ? "first" : "other"];
  return rows[rng.index(rows.map((r) => r[1]))][0];
}

interface Slot {
  reason: Reason;
  partial: boolean;
}
/** What a record is before it gets an id, a person, a site and its process facts. */
type Core = Pick<Decision, "payerId" | "program" | "kind" | "dx" | "population" | "month" | "day" | "outcome" | "unit" | "requested" | "approvedAmt" | "reason" | "preventable">;

function buildPayerBlock(b: number, p: BuiltInPayerId): Draft[] {
  const rng = new Rng(`${p}|${b}`);
  const prof = PROFILE[p];
  const base = BASE[p];
  const real: RealDecision[] = b === 3 ? REAL_DECISIONS.filter((r) => r.payerId === p) : [];
  const N = b === 3 ? base.decisions : Math.round(base.decisions * prof.volume[b]);
  const Dn = b === 3 ? base.denials : Math.round(N * (1 - prof.rate[b] / 100));
  const months = [3 * b, 3 * b + 1, 3 * b + 2];

  /* decisions and denials by month */
  const monthN = apportion(N, months.map((m) => MONTH_VOLUME[m] * (0.97 + 0.06 * rng.float())));
  const monthD = apportion(Dn, months.map((m, i) => monthN[i] * (1 - rateAtMonth(prof, m) / 100) * (0.9 + 0.2 * rng.float())));
  const realIn = (m: number, denial: boolean): number => real.filter((r) => monthOfDay(r.day) === m && (r.outcome !== "approved") === denial).length;

  /* denial slots: the reasons the block must hold, with how many are cuts */
  const reasons = reasonsOf(p);
  const counts = apportion(Dn, reasons.map((r) => r.count * (1 + (tiltOf(p, r.label).trend ?? 0) * ((3 - b) / 3))));
  const slots: Slot[] = [];
  reasons.forEach((r, i) => {
    const t = tiltOf(p, r.label);
    const here = real.filter((x) => x.reason === r.label);
    const realPartial = here.filter((x) => x.outcome === "partial").length;
    const free = Math.max(0, counts[i] - here.length);
    const partialTotal = clamp(Math.max(Math.round(counts[i] * t.partial), realPartial), 0, counts[i] - (here.length - realPartial));
    for (let k = 0; k < free; k++) slots.push({ reason: r, partial: k < partialTotal - realPartial });
  });
  rng.shuffle(slots);

  /* months for the free slots, so each month holds exactly its share */
  const monthPool = (counts4: number[], realDen: boolean): number[] => {
    const list: number[] = [];
    months.forEach((m, i) => {
      for (let k = 0; k < Math.max(0, counts4[i] - realIn(m, realDen)); k++) list.push(m);
    });
    return rng.shuffle(list);
  };
  const denialMonths = monthPool(monthD, true);
  const approvedMonths = monthPool(monthN.map((n, i) => n - monthD[i]), false);
  const realApproved = real.filter((r) => r.outcome === "approved").length;
  const freeApproved = N - Dn - realApproved;
  const fit = (list: number[], size: number): number[] => {
    while (list.length < size) list.push(months[rng.int(0, 2)]);
    return list.slice(0, size);
  };
  const dMonths = fit(denialMonths, slots.length);
  const aMonths = fit(approvedMonths, freeApproved);

  /* programs: the block's exact mix, dealt first to the denials the programs favor, then to everything else */
  const programRow = PROGRAMS.map((pr) => QUARTER_PROGRAM[p][pr]);
  const pool = Object.fromEntries(PROGRAMS.map((pr, i) => [pr, b === 3 ? programRow[i] : apportion(N, programRow)[i]])) as Record<Program, number>;
  for (const r of real) pool[r.program] = Math.max(0, pool[r.program] - 1);

  const out: Draft[] = [];

  const finish = (d: Core): Draft => ({
    ...d,
    id: "",
    caseId: "",
    inDemo: false,
    initials: `${LETTERS[rng.int(0, LETTERS.length - 1)]}.${LETTERS[rng.int(0, LETTERS.length - 1)]}.`,
    age: ageOf(d.population, p, prof, rng),
    site: "A",
    hours: 0,
    expedited: false,
    pastCms: null,
    infoRequest: false,
    p2p: "none",
    appeal: "none",
    accepted: false,
    referralDays: null,
    advice: false,
    helps: [],
    edit: null,
  });

  const popFor = (kind: RequestKind, tilt: ReturnType<typeof tiltOf> | undefined): PopulationId => {
    const w = POP_ORDER.map((id) => {
      let x = prof.pop[id];
      if (id === "first") x *= kind === "initial" ? 2.6 : 0.2;
      if (id === "prior") x *= kind === "initial" ? 1.1 : 1.5;
      if (id === "perinatal" && kind === "retro") x *= 1.5;
      return x * (tilt?.pop?.[id] ?? 1);
    });
    return POP_ORDER[rng.index(w)];
  };
  const kindFor = (program: Program, m: number, tilt: ReturnType<typeof tiltOf> | undefined): RequestKind => {
    const w = KIND_ORDER.map((k) => KIND_BY_PROGRAM[program][k] * (tilt?.kind?.[k] ?? 1) * (k === "retro" ? prof.retro * (1.35 - (0.5 * m) / 11) : 1));
    return KIND_ORDER[rng.index(w)];
  };
  const dxFor = (program: Program, tilt: ReturnType<typeof tiltOf> | undefined): DxId => {
    const w = DX_ORDER.map((d) => DX_MIX[p][d] * DX_BY_PROGRAM[program][d] * (tilt?.dx?.[d] ?? 1));
    return DX_ORDER[rng.index(w)];
  };
  const dayIn = (m: number): number => rng.int(MONTHS[m].to, MONTHS[m].from);

  /* the real cases first: they sit in the same slots as everything else */
  for (const r of real) {
    const record = finish({ payerId: p, program: r.program, kind: r.kind, dx: r.dx, population: r.population, month: monthOfDay(r.day), day: r.day, outcome: r.outcome, unit: r.unit, requested: r.requested, approvedAmt: r.approvedAmt, reason: r.reason, preventable: r.reason ? reasons.find((x) => x.label === r.reason)?.preventable : undefined });
    Object.assign(record, { id: r.id, caseId: r.caseId, denialId: r.denialId, inDemo: true, initials: r.initials, age: r.age, site: siteOf(r.caseId), p2p: r.p2p, appeal: r.appeal, _real: true });
    out.push(record);
  }

  /* denials: each slot picks a program the quarter still has room for, then the rest of its attributes */
  slots.forEach((slot, i) => {
    const t = tiltOf(p, slot.reason.label);
    const program = PROGRAMS[rng.index(PROGRAMS.map((pr) => (pool[pr] > 0 ? pool[pr] * Math.sqrt(t.program?.[pr] ?? 1) * DENIAL_BY_PROGRAM[pr] : 0)))];
    pool[program] -= 1;
    const month = dMonths[i];
    const kind = kindFor(program, month, t);
    const dx = dxFor(program, t);
    const requested = requestedFor(program, kind, rng);
    let approvedAmt = 0;
    if (slot.partial) {
      const [lo, hi] = p === "cardinal" && slot.reason.label === "Units requested above criteria" && dx === "oud" ? OUD_CUT_FRAC : (t.frac ?? [0.45, 0.75]);
      approvedAmt = clamp(Math.round(requested * (lo + (hi - lo) * rng.float())), 1, requested - 1);
    }
    out.push(
      finish({ payerId: p, program, kind, dx, population: popFor(kind, t), month, day: dayIn(month), outcome: (slot.partial ? "partial" : "denied") as Outcome, unit: program === "IOP" ? "units" : "days", requested, approvedAmt, reason: slot.reason.label, preventable: slot.reason.preventable }),
    );
  });

  /* approvals take the programs that are left */
  const left: Program[] = [];
  for (const pr of PROGRAMS) for (let k = 0; k < pool[pr]; k++) left.push(pr);
  rng.shuffle(left);
  for (let i = 0; i < freeApproved; i++) {
    const program = left[i] ?? PROGRAMS[rng.index(programRow)];
    const month = aMonths[i];
    const kind = kindFor(program, month, undefined);
    const requested = requestedFor(program, kind, rng);
    out.push(finish({ payerId: p, program, kind, dx: dxFor(program, undefined), population: popFor(kind, undefined), month, day: dayIn(month), outcome: "approved", unit: program === "IOP" ? "units" : "days", requested, approvedAmt: requested }));
  }

  /* sites: a fixed share of each payer's denials and of its approvals are at Site B, so the two sites differ in a way that does not depend on luck */
  const free = out.filter((r) => !r._real);
  const siteB = new Set<Draft>();
  for (const group of [free.filter((r) => r.outcome !== "approved"), free.filter((r) => r.outcome === "approved")]) {
    const chance = (r: Draft): number => (r.outcome === "approved" ? 0.42 : (tiltOf(p, r.reason ?? "").siteB ?? 0.5));
    for (const r of rng.take(group, Math.round(sum(group.map(chance))), (r) => chance(r) / (1 - chance(r)))) siteB.add(r);
  }
  for (const r of free) {
    r.site = siteB.has(r) ? "B" : "A";
    r.id = freshId(r.program, r.site, rng);
    r.caseId = r.id;
  }
  for (const r of out) if (r._real) taken.add(r.id);

  /* how long it took, and whether the payer asked for more */
  for (const r of out) {
    const denial = r.outcome !== "approved";
    r.infoRequest = rng.chance(prof.info * (denial ? 1.5 : 0.85));
    r.expedited = rng.chance(Math.min(0.85, EXPEDITED[r.kind] * (r.program === "WM" ? 1.4 : 1)));
    if (r.kind === "initial") r.referralDays = Math.max(0.5, Math.round(prof.referral * (1.3 - (0.3 * r.month) / 11) * Math.exp(0.35 * rng.normal()) * 10) / 10);
  }
  calibrateHours(out, p, b, prof, rng);
  dealOutcomes(out, p, b, rng);
  return out;
}

/** Hours to decision: expedited requests and ones with no information request are faster, denials slower, and the block's average is pinned to the payer's average. */
function calibrateHours(rows: Draft[], p: BuiltInPayerId, b: number, prof: PayerProfile, rng: Rng): void {
  const avgDays = PAYERS.find((x) => x.id === p)?.avgDecisionDays ?? 2.5;
  const raw = rows.map((r) => {
    const median = (r.expedited ? 0.45 : 1) * (r.infoRequest ? 1.7 : 1) * (r.outcome === "denied" ? 1.2 : r.outcome === "partial" ? 1.1 : 1) * (r.site === "B" ? 1.06 : 1);
    /* a few requests sit in review far longer than the rest */
    const stuck = rng.chance(0.035) ? 3.2 : 1;
    return clamp(median * stuck * Math.exp(prof.sigma * rng.normal()), 0.2, 9);
  });
  const target = Math.round(avgDays * 24 * prof.speed[b] * rows.length);
  const scale = target / sum(raw);
  const hours = raw.map((x) => Math.max(1, Math.round(x * scale)));
  let diff = target - sum(hours);
  for (let guard = 0; diff !== 0 && guard < 20000; guard++) {
    const i = rng.int(0, hours.length - 1);
    if (diff > 0) {
      hours[i] += 1;
      diff -= 1;
    } else if (hours[i] > 1) {
      hours[i] -= 1;
      diff += 1;
    }
  }
  rows.forEach((r, i) => {
    r.hours = hours[i];
    r.pastCms = cmsApplies(p) ? r.hours > (r.expedited ? CMS_HOURS.expedited : CMS_HOURS.standard) : null;
  });
}

/** Peer-to-peer calls, appeals and accepted denials. The quarter holds exactly the quarter's rulings and accepted denials; the open ones from Denial Intelligence stay open. */
function dealOutcomes(rows: Draft[], p: BuiltInPayerId, b: number, rng: Rng): void {
  const base = BASE[p];
  const denials = rows.filter((r) => r.outcome !== "approved" && !r._real);
  const ratio = base.appeals / base.denials;
  const decided = b === 3 ? base.appeals : Math.round(denials.length * ratio * (0.9 + 0.2 * rng.float()));
  const overRate = base.overturned / base.appeals;
  const over = b === 3 ? base.overturned : Math.round(decided * clamp(overRate - 0.03 * (3 - b) + (rng.float() - 0.5) * 0.06, 0.3, 0.8));
  const acceptedN = b === 3 ? base.accepted : Math.round(denials.length * (base.accepted / base.denials));

  const appealW = (r: Draft): number => (r.preventable ? 1.5 : 1) * (r.outcome === "partial" ? 1.3 : 1) * (r.reason === "Partial approval without a stated reason" ? 1.6 : 1) * (r.kind === "retro" ? 0.6 : 1);
  const appealed = rng.take(denials, Math.min(decided, denials.length), appealW);
  const overW = (r: Draft): number => (r.preventable ? 1.6 : 1) * (r.reason === "Units requested above criteria" ? 0.5 : 1) * (r.reason === "Level of care does not match mood severity" ? 0.6 : 1);
  const overturned = rng.take(appealed, Math.min(over, appealed.length), overW);
  const partly = new Set(rng.take(overturned, Math.round(overturned.length * 0.35)));
  const overSet = new Set(overturned);
  for (const r of appealed) r.appeal = overSet.has(r) ? (partly.has(r) ? "partly" : "overturned") : "upheld";

  const rest = denials.filter((r) => r.appeal === "none");
  const accepted = rng.take(rest, Math.min(acceptedN, rest.length), (r) => (r.preventable ? 1 : 2) * (r.reason === "Duplicate request" || r.reason === "Out-of-network flag in error" ? 2 : 1));
  for (const r of accepted) r.accepted = true;

  /* appeals filed in the last two weeks have no ruling yet (this quarter only) */
  if (b === 3) for (const r of rest) if (!r.accepted && r.day <= 14 && rng.chance(0.12)) r.appeal = "pending";

  /* peer-to-peer: a call before the appeal for about half of the appealed, and for some denials that were neither appealed nor accepted */
  for (const r of appealed) if (rng.chance(0.5)) r.p2p = "stood";
  for (const r of denials) {
    if (r.appeal !== "none" || r.accepted || !rng.chance(0.42)) continue;
    r.p2p = rng.chance(0.4) ? "changed" : "stood";
  }
}

/* ------------------------------------------------------------------ advice, drafts and the steps FLO suggests */
const anyApproved = (r: Decision): boolean => r.outcome !== "denied";

function dealAdvice(rows: Draft[], b: number, rng: Rng): void {
  const groups = new Map<BuiltInPayerId, Draft[]>();
  for (const r of rows) groups.set(r.payerId, [...(groups.get(r.payerId) ?? []), r]);
  const payers = PAYER_ORDER.filter((p) => groups.has(p));
  const adviceN = payers.map((p) => (b === 3 ? BASE[p].adviceN : Math.min(groups.get(p)?.length ?? 0, Math.round(BASE[p].adviceN * PROFILE[p].volume[b] * [0.5, 0.68, 0.84, 1][b]))));
  const ap = payers.map((p) => (groups.get(p) ?? []).filter(anyApproved).length);
  const den = payers.map((p, i) => (groups.get(p)?.length ?? 0) - ap[i]);
  const n = payers.map((p) => groups.get(p)?.length ?? 0);
  const anyRate = payers.map((_, i) => ap[i] / Math.max(1, n[i]));
  /* 692 of 828 is 83.6%, which reads as 84% */
  const total = b === 3 ? Math.round(0.836 * sum(adviceN)) : Math.round(sum(adviceN.map((a, i) => a * clamp(anyRate[i] + 0.055, 0.5, 0.96))));
  const lo = adviceN.map((a, i) => Math.max(0, a - den[i]));
  const hi = adviceN.map((a, i) => Math.min(a, ap[i]));
  const applied = apportionBounded(total, adviceN.map((a, i) => a * Math.min(0.97, anyRate[i] + 0.05)), lo, hi);
  payers.forEach((p, i) => {
    const list = groups.get(p) ?? [];
    const yes = rng.take(list.filter(anyApproved), applied[i], (r) => (r.outcome === "approved" ? 1 : 0.8));
    const no = rng.take(list.filter((r) => !anyApproved(r)), adviceN[i] - applied[i]);
    for (const r of [...yes, ...no]) r.advice = true;
  });
}

function dealEdits(rows: Draft[], b: number, rng: Rng): void {
  const groups = new Map<BuiltInPayerId, Draft[]>();
  for (const r of rows) groups.set(r.payerId, [...(groups.get(r.payerId) ?? []), r]);
  const payers = PAYER_ORDER.filter((p) => groups.has(p));
  const n = payers.map((p) => groups.get(p)?.length ?? 0);
  const draftsN = payers.map((p, i) => (b === 3 ? BASE[p].draftsN : Math.min(n[i], Math.round(BASE[p].draftsN * PROFILE[p].volume[b] * (0.92 + 0.08 * (b / 3))))));
  const ap = payers.map((p) => (groups.get(p) ?? []).filter(anyApproved).length);
  const approvedAll = sum(ap);
  const drafts = sum(draftsN);

  /* class sizes: written, light edits (a typo fix is one), rewritten. 67.8% / 26.9% / 5.3% reads as 68 / 27 / 5. */
  const shift = [-5, -3, -1, 0][b] / 100;
  const nW = Math.round((0.678 + shift) * drafts);
  const nR = Math.round((0.0525 - shift / 2) * drafts);
  const nL = drafts - nW - nR;
  const rate = EDIT_APPROVAL.map((r) => r / 100 + [-0.04, -0.025, -0.01, 0][b]);
  const kW = Math.round(rate[0] * nW);
  const kL = Math.round(rate[1] * nL);
  const kR = Math.round(rate[2] * nR);
  const draftApproved = kW + kL + kR;

  /* which records have a draft: the ones without are mostly approvals sent by hand, so the approvals left over after the drafts take theirs */
  const noDraftApproved = clamp(approvedAll - draftApproved, 0, n.reduce((a, c, i) => a + Math.min(c - draftsN[i], ap[i]), 0));
  const ndN = payers.map((_, i) => n[i] - draftsN[i]);
  const ndAp = apportionBounded(noDraftApproved, ndN.map((x, i) => x * (ap[i] / Math.max(1, n[i]))), ndN.map((x, i) => Math.max(0, x - (n[i] - ap[i]))), ndN.map((x, i) => Math.min(x, ap[i])));
  const draftRows: Draft[] = [];
  payers.forEach((p, i) => {
    const list = groups.get(p) ?? [];
    const yes = list.filter(anyApproved);
    const no = list.filter((r) => !anyApproved(r));
    const skipYes = new Set(rng.take(yes, ndAp[i]));
    const skipNo = new Set(rng.take(no, ndN[i] - ndAp[i]));
    for (const r of list) if (!skipYes.has(r) && !skipNo.has(r)) draftRows.push(r);
  });

  const weight = (key: "light" | "rewritten") => (r: Draft): number => (BASE[r.payerId][key] ?? 1) / 10;
  const split = (pool: Draft[], light: number, rewritten: number): void => {
    const rew = rng.take(pool, rewritten, weight("rewritten"));
    const rewSet = new Set(rew);
    const lig = rng.take(pool.filter((r) => !rewSet.has(r)), light, weight("light"));
    const ligSet = new Set(lig);
    for (const r of pool) r.edit = rewSet.has(r) ? "rewritten" : ligSet.has(r) ? "light" : "written";
  };
  const yesRows = draftRows.filter(anyApproved);
  const noRows = draftRows.filter((r) => !anyApproved(r));
  split(yesRows, kL, kR);
  split(noRows, nL - kL, nR - kR);
  /* some light edits only fixed a typo, so 75% went out without edits */
  const light = draftRows.filter((r) => r.edit === "light");
  for (const r of rng.take(light, Math.round((0.07 + shift / 2) * drafts))) r.edit = "typo" as EditKind;
}

function dealHelps(rows: Draft[], b: number, rng: Rng): void {
  const advice = rows.filter((r) => r.advice);
  const yes = advice.filter(anyApproved);
  const no = advice.filter((r) => !anyApproved(r));
  const scale = b === 3 ? 1 : (rows.length / 1070) * [0.5, 0.68, 0.84, 1][b];
  ACTIONS.forEach((a, idx) => {
    const applied = b === 3 ? a.base : Math.round(a.base * scale);
    const approved = Math.round((applied * (a.approved + [-4, -3, -1, 0][b])) / 100);
    const w = (r: Draft): number => a.affinity[r.payerId];
    for (const r of rng.take(yes, Math.min(approved, yes.length), w)) r.helps.push(idx);
    for (const r of rng.take(no, Math.min(applied - approved, no.length), w)) r.helps.push(idx);
  });
}

/* ------------------------------------------------------------------ the dataset */
export function generateDecisions(): Decision[] {
  const all: Draft[] = [];
  for (let b = 0; b < 4; b++) {
    const block: Draft[] = [];
    for (const p of PAYER_ORDER) block.push(...buildPayerBlock(b, p));
    const rng = new Rng(`flags|${b}`);
    dealAdvice(block, b, rng);
    dealEdits(block, b, rng);
    dealHelps(block, b, rng);
    all.push(...block);
  }
  all.sort((a, c) => a.day - c.day || a.id.localeCompare(c.id));
  for (const r of all) delete r._real;
  return all;
}
