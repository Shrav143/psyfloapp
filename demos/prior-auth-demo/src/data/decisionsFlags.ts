import { ACTIONS, BASE, EDIT_APPROVAL, PAYER_ORDER } from "./analytics";
import type { Decision, EditKind } from "./decisionTypes";
import { PROFILE } from "./decisionsProfile";
import { Rng, apportionBounded, clamp, sum, type Draft } from "./decisionsRng";
import type { BuiltInPayerId } from "./types";

/* What happened after the decision: peer-to-peer calls, appeals, accepted denials, whether FLO's advice was applied, how the agent's draft
   was edited and which steps were taken. Each is dealt out with exact counts for this quarter, so the figures on the page come out as designed. */

/** Peer-to-peer calls, appeals and accepted denials. The quarter holds exactly the quarter's rulings and accepted denials; the open ones from Denial Intelligence stay open. */
export function dealOutcomes(rows: Draft[], p: BuiltInPayerId, b: number, rng: Rng): void {
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

const anyApproved = (r: Decision): boolean => r.outcome !== "denied";

export function dealAdvice(rows: Draft[], b: number, rng: Rng): void {
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

export function dealEdits(rows: Draft[], b: number, rng: Rng): void {
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

export function dealHelps(rows: Draft[], b: number, rng: Rng): void {
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
