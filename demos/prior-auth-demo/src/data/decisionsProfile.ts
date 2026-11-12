import type { DxId, PopulationId } from "./decisionTypes";
import type { RequestKind } from "./queue";
import type { BuiltInPayerId, CoreProgram } from "./types";

/* How each payer behaves. This is what makes the payer-by-case-mix analysis tell a story: each payer has its own mix of patients,
   its own reasons and its own habits. The generator (decisionsGen.ts) turns it into records; the counts the page shows come from the records. */

type Tilt<K extends string> = Partial<Record<K, number>>;

/** Decisions this quarter by payer and program. Rows add to each payer's decisions, columns to the 40 / 30 / 20 / 10 program shares of 1,070. */
export const QUARTER_PROGRAM: Record<BuiltInPayerId, Record<CoreProgram, number>> = {
  cardinal: { RES: 162, IOP: 114, PHP: 76, WM: 30 },
  summit: { RES: 98, IOP: 70, PHP: 52, WM: 30 },
  evergreen: { RES: 80, IOP: 36, PHP: 26, WM: 28 },
  beacon: { RES: 40, IOP: 37, PHP: 25, WM: 8 },
  harborview: { RES: 34, IOP: 30, PHP: 30, WM: 6 },
  lakeshore: { RES: 14, IOP: 34, PHP: 5, WM: 5 },
};

/** Share of a payer's requests by diagnosis group, before the program shifts it. */
export const DX_MIX: Record<BuiltInPayerId, Record<DxId, number>> = {
  cardinal: { aud: 26, oud: 24, stim: 15, mood: 17, trauma: 6, cooc: 12 },
  summit: { aud: 22, oud: 18, stim: 12, mood: 22, trauma: 10, cooc: 16 },
  evergreen: { aud: 32, oud: 22, stim: 20, mood: 12, trauma: 5, cooc: 9 },
  beacon: { aud: 28, oud: 14, stim: 20, mood: 18, trauma: 10, cooc: 10 },
  harborview: { aud: 34, oud: 12, stim: 8, mood: 26, trauma: 8, cooc: 12 },
  lakeshore: { aud: 18, oud: 16, stim: 12, mood: 26, trauma: 14, cooc: 14 },
};
export const DX_BY_PROGRAM: Record<CoreProgram, Record<DxId, number>> = {
  RES: { aud: 1.1, oud: 1.15, stim: 1.05, mood: 0.8, trauma: 0.9, cooc: 1.2 },
  IOP: { aud: 1, oud: 0.9, stim: 1.1, mood: 1.2, trauma: 1.1, cooc: 0.9 },
  PHP: { aud: 0.9, oud: 0.8, stim: 0.9, mood: 1.3, trauma: 1.2, cooc: 1.3 },
  WM: { aud: 1.6, oud: 2.4, stim: 0.9, mood: 0.1, trauma: 0.05, cooc: 0.35 },
};

/** What kind of request a program sees. */
export const KIND_BY_PROGRAM: Record<CoreProgram, Record<RequestKind, number>> = {
  RES: { initial: 30, concurrent: 46, reauth: 8, modify: 5, retro: 11 },
  PHP: { initial: 24, concurrent: 46, reauth: 14, modify: 7, retro: 9 },
  IOP: { initial: 22, concurrent: 20, reauth: 42, modify: 8, retro: 8 },
  WM: { initial: 56, concurrent: 8, reauth: 0.5, modify: 26, retro: 9.5 },
};
/** Denials are a little more likely at some levels of care. */
export const DENIAL_BY_PROGRAM: Record<CoreProgram, number> = { RES: 1.05, IOP: 0.98, PHP: 1, WM: 1.4 };

export interface ReasonTilt {
  dx?: Tilt<DxId>;
  kind?: Tilt<RequestKind>;
  program?: Tilt<CoreProgram>;
  pop?: Tilt<PopulationId>;
  /** Chance the case is at Site B (about half of denials; 42% of approvals). */
  siteB?: number;
  /** Share of this reason's denials that are approvals in part (days or units cut), and how much of the request is approved then. */
  partial: number;
  frac?: [number, number];
  /** Positive: the reason was more common earlier in the year. Negative: it is growing. */
  trend?: number;
}
/** Keyed "payer|reason label". */
export const REASON_TILT: Record<string, ReasonTilt> = {
  "cardinal|Continued-stay evidence incomplete": { kind: { concurrent: 3, reauth: 1.5, initial: 0.25, modify: 0.5, retro: 0.05 }, dx: { cooc: 2.4, oud: 1.8, aud: 0.9, mood: 0.7, stim: 0.8, trauma: 1.1 }, program: { RES: 1.6, PHP: 1.1, IOP: 0.8, WM: 0.1 }, siteB: 0.46, partial: 0.3, frac: [0.4, 0.7], trend: 0.3 },
  "cardinal|Units requested above criteria": { kind: { concurrent: 2.2, reauth: 1.8, initial: 0.4, modify: 0.8, retro: 0.05 }, dx: { oud: 5, trauma: 1.2, cooc: 1, aud: 0.5, mood: 0.3, stim: 0.5 }, program: { RES: 2, IOP: 1.2, PHP: 0.8, WM: 0.3 }, pop: { adolescent: 2 }, siteB: 0.5, partial: 1, frac: [0.45, 0.75], trend: -0.1 },
  "cardinal|Missing recent therapy notes": { kind: { concurrent: 2.2, reauth: 1.6, initial: 0.4 }, dx: { mood: 1.5, aud: 1.2, stim: 1.1 }, program: { PHP: 1.6, IOP: 1.4, RES: 0.7, WM: 0.1 }, siteB: 0.5, partial: 0.1, frac: [0.5, 0.8], trend: 0.2 },
  "cardinal|Peer-to-peer window missed": { kind: { initial: 1.6, concurrent: 1.4 }, siteB: 0.5, partial: 0, trend: 0.1 },
  "summit|Level of care does not match mood severity": { kind: { initial: 2.2, concurrent: 1.2, reauth: 0.4, modify: 1.5, retro: 0.1 }, dx: { mood: 3.2, trauma: 3, cooc: 2.2, aud: 0.4, oud: 0.3, stim: 0.5 }, program: { RES: 2.2, PHP: 1.4, IOP: 0.3, WM: 0.05 }, siteB: 0.46, partial: 0.1, frac: [0.5, 0.8], trend: -0.25 },
  "summit|Retro-authorization window missed": { kind: { retro: 40, initial: 0.03, concurrent: 0.03, reauth: 0.03, modify: 0.03 }, siteB: 0.66, partial: 0, trend: 0.15 },
  "summit|Missing ASAM dimension ratings": { kind: { initial: 3, modify: 1.2, concurrent: 0.7, reauth: 0.5 }, dx: { cooc: 3.5, mood: 1.6, trauma: 1.5, aud: 0.6, oud: 0.5, stim: 0.8 }, program: { RES: 1.8, PHP: 1.2, IOP: 0.6 }, siteB: 0.45, partial: 0.15, frac: [0.5, 0.8], trend: 0.1 },
  "summit|Duplicate request": { kind: { concurrent: 2, modify: 2.2, initial: 0.5, retro: 0.2 }, siteB: 0.5, partial: 0 },
  "evergreen|Partial approval without a stated reason": { kind: { concurrent: 2.6, reauth: 1, initial: 0.5, modify: 0.8, retro: 0.1 }, dx: { aud: 1.5, stim: 1.5, oud: 1, mood: 0.7, trauma: 0.4, cooc: 0.8 }, program: { RES: 2, WM: 1.5, PHP: 0.8, IOP: 0.5 }, siteB: 0.45, partial: 1, frac: [0.45, 0.75], trend: -0.15 },
  "evergreen|Phone confirmation not on file": { kind: { initial: 1.8, retro: 3, concurrent: 0.8 }, program: { WM: 2, RES: 1 }, siteB: 0.5, partial: 0.15, frac: [0.5, 0.8] },
  "evergreen|Recertification filed too late": { kind: { reauth: 12, initial: 0.1, concurrent: 0.1, modify: 0.1, retro: 0.1 }, program: { IOP: 1.5, PHP: 1.4, RES: 0.5 }, siteB: 0.66, partial: 0.3, frac: [0.5, 0.8], trend: -0.2 },
  "beacon|Step-down plan not named": { kind: { concurrent: 3, reauth: 1.5, initial: 0.6 }, dx: { stim: 2.2, aud: 1.3, oud: 0.8, mood: 0.8 }, program: { RES: 2.2, PHP: 1.3, IOP: 0.5, WM: 0.05 }, siteB: 0.44, partial: 0.5, frac: [0.5, 0.8], trend: 0.2 },
  "beacon|Out-of-network flag in error": { kind: { initial: 2.2 }, siteB: 0.5, partial: 0 },
  "beacon|Missing level-of-care form": { kind: { initial: 2.5, modify: 1.4 }, siteB: 0.5, partial: 0 },
  "harborview|Recertification filed too late": { kind: { reauth: 14, initial: 0.1, concurrent: 0.1, modify: 0.1, retro: 0.1 }, program: { IOP: 1.6, PHP: 1.5, RES: 0.6 }, pop: { dual: 2, prior: 1.3 }, dx: { aud: 1.2, mood: 1.2 }, siteB: 0.66, partial: 0.4, frac: [0.4, 0.7], trend: -0.25 },
  "harborview|Missing physician certification": { kind: { initial: 2.8, reauth: 1.3 }, siteB: 0.5, partial: 0.15, frac: [0.5, 0.8] },
  "harborview|Fax pages unreadable": { siteB: 0.5, partial: 0 },
  "lakeshore|Authorization number missing on the claim": { siteB: 0.5, partial: 0 },
  "lakeshore|Units above the plan limit": { kind: { reauth: 2, concurrent: 1.4 }, program: { IOP: 3, RES: 0.8, PHP: 0.5 }, siteB: 0.5, partial: 1, frac: [0.6, 0.85] },
  "lakeshore|Late notice": { kind: { initial: 2, retro: 2 }, siteB: 0.5, partial: 0 },
};
export const tiltOf = (payerId: string, label: string): ReasonTilt => REASON_TILT[`${payerId}|${label}`] ?? { partial: 0 };

/** The approved share when a cut is for opioid use disorder at the payer that cuts those days the hardest (about 5 of 14). */
export const OUD_CUT_FRAC: [number, number] = [0.25, 0.42];

export interface PayerProfile {
  /** Approved-as-asked rate (percent) in each quarter, oldest first. The last is exact, from the counts in data/analytics.ts. */
  rate: [number, number, number, number];
  /** Volume in each quarter relative to this one. */
  volume: [number, number, number, number];
  /** Spread of the time to decision (log scale) and the factor on it in each quarter, oldest first. */
  sigma: number;
  speed: [number, number, number, number];
  /** Share of requests where the payer asked for more information. */
  info: number;
  /** Mean age and spread of adults. */
  age: [number, number];
  /** Share of patients in each population before the request type shifts it. */
  pop: Record<PopulationId, number>;
  /** Mean days from referral to authorization on first requests. */
  referral: number;
  /** A burst of retro-authorizations at this payer (multiplier on the base share of retrospective requests). */
  retro: number;
}
export const PROFILE: Record<BuiltInPayerId, PayerProfile> = {
  cardinal: { rate: [51, 54, 57, 62.7], volume: [0.88, 0.94, 0.97, 1], sigma: 0.75, speed: [1.1, 1.06, 1.03, 1], info: 0.09, age: [38, 10], pop: { adolescent: 6, adult: 42, dual: 9, perinatal: 6, first: 17, prior: 20 }, referral: 4.6, retro: 1 },
  summit: { rate: [64, 67, 70, 74], volume: [0.86, 0.93, 0.97, 1], sigma: 0.7, speed: [1.1, 1.06, 1.03, 1], info: 0.07, age: [36, 10], pop: { adolescent: 6, adult: 42, dual: 9, perinatal: 6, first: 17, prior: 20 }, referral: 3.2, retro: 1.5 },
  evergreen: { rate: [56, 60, 63, 69], volume: [0.9, 0.94, 0.97, 1], sigma: 0.85, speed: [0.82, 0.88, 0.94, 1], info: 0.07, age: [41, 11], pop: { adolescent: 4, adult: 40, dual: 11, perinatal: 5, first: 18, prior: 22 }, referral: 5.4, retro: 1.2 },
  beacon: { rate: [71, 75, 78, 81], volume: [0.9, 0.94, 0.97, 1], sigma: 0.5, speed: [1.08, 1.05, 1.02, 1], info: 0.08, age: [37, 10], pop: { adolescent: 8, adult: 52, dual: 0, perinatal: 2, first: 19, prior: 19 }, referral: 2.6, retro: 0.8 },
  harborview: { rate: [75, 76, 79, 77], volume: [0.92, 0.96, 0.98, 1], sigma: 0.7, speed: [1.05, 1.03, 1.02, 1], info: 0.21, age: [58, 9], pop: { adolescent: 0, adult: 26, dual: 38, perinatal: 0, first: 14, prior: 22 }, referral: 4.2, retro: 0.9 },
  lakeshore: { rate: [77, 80, 83, 86.2], volume: [0.7, 0.8, 0.92, 1], sigma: 0.6, speed: [1.1, 1.06, 1.03, 1], info: 0.1, age: [34, 9], pop: { adolescent: 6, adult: 50, dual: 3, perinatal: 3, first: 20, prior: 18 }, referral: 3.4, retro: 0.8 },
};

/** Volume of each month inside a quarter (the first, second, third month), and across the year (a winter dip). */
export const MONTH_VOLUME = [0.95, 0.88, 0.82, 0.84, 0.9, 0.94, 0.95, 0.97, 0.99, 0.98, 1, 1.03];

/** Block volumes: this quarter (block 3) is exact; the others scale from it. */
export const BLOCK_ADVICE: [number, number, number, number] = [0.5, 0.68, 0.84, 1];
export const BLOCK_EDIT_WRITTEN: [number, number, number, number] = [-5, -3, -1, 0];
