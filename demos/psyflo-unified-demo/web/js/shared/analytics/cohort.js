// The illustrative cohort (provenance 'illustrative'): 120 generated patients with a fixed seed, ported from the v3 demo's cohort
// generator. It is a separate demonstration dataset: it is NOT stored in the state (it would be re-sent on every update), it is NOT
// reconciled with the cases in Authorizations or Denial Intelligence, and it is never added to a case-backed figure. Patients are
// COH-001 to COH-120; no initials exist anywhere in it, and no screen offers patient-level rows for it. Pure ESM.
import { addDays, daysBetween } from '../dates.js';
import { PROV, result, minN, periodOf, normPeriod, inRange, day, weekStart, monthKey, median, r1, sum } from './common.js';
import { populationPanels, outcomePanels, ageBand, direction } from './panels.js';
import { payerPanels, payerStrip } from './payer.js';

// The dataset's own date range (an attribute of the generated data, not of the story clock): enrolment through Oct 15, records through two weeks later.
export const COHORT_RANGE = { start: '2025-08-18', lastEnrol: '2026-10-15' };
export const COHORT_AS_OF = addDays(COHORT_RANGE.lastEnrol, 14);
export const COHORT_SOURCE = 'Generated demonstration cohort (120 patients, fixed seed)';

export const PROGRAMS = [['tdt', 'Therapeutic Day Treatment (school day)'], ['iop', 'Intensive Outpatient Program'], ['php', 'Partial Hospitalization'], ['ind', 'Individual outpatient therapy']];
export const SITES = [['Lynchburg City · ES-3', 'Lynchburg City'], ['Lynchburg City · MS-2', 'Lynchburg City'], ['Campbell County · ES-1', 'Campbell County'], ['Campbell County · HS-1', 'Campbell County'], ['Campbell County · MS-1', 'Campbell County'], ['Clinic office · Lynchburg', 'Lynchburg City'], ['Clinic office · Campbell', 'Campbell County']];
const PAYERS = { aetna: 'Aetna Better Health', anthem: 'Anthem HealthKeepers', humana: 'Humana Healthy Horizons', sentara: 'Sentara Health Plans', uhc: 'UnitedHealthcare' };
const DXS = [
  { k: 'adhd', label: 'ADHD', inst: 'vand', goals: ['sch', 'beh'] }, { k: 'anx', label: 'Anxiety disorders', inst: 'anx', goals: ['emo', 'soc'] }, { k: 'dep', label: 'Depressive disorders', inst: 'phq', goals: ['emo', 'fam'] },
  { k: 'trm', label: 'Trauma-related disorders', inst: 'cafas', goals: ['emo', 'beh'] }, { k: 'beh', label: 'Behavioral disorders', inst: 'sdq', goals: ['beh', 'sch', 'fam'] }, { k: 'sud', label: 'Substance use disorders', inst: 'cafas', goals: ['sub', 'fam'] }];
const INSTS = { vand: { name: 'Vanderbilt ADHD count', max: 18, base: [10, 16] }, phq: { name: 'PHQ-9', max: 27, base: [10, 17] }, gad: { name: 'GAD-7', max: 21, base: [9, 15] }, scared: { name: 'SCARED', max: 82, base: [30, 45] }, sdq: { name: 'SDQ total difficulties', max: 40, base: [15, 24] }, cafas: { name: 'CAFAS functioning total', max: 240, base: [90, 150] } };
const GOALS = [['emo', 'Emotional regulation'], ['beh', 'Behavioral stabilization'], ['soc', 'Social functioning'], ['sch', 'School participation'], ['fam', 'Family functioning'], ['sub', 'Substance use recovery']];
// the approved ISP 2.0 picklist
const IVS = [
  { k: 'coping', name: 'Coping skills practice', goals: ['emo', 'beh'] }, { k: 'move', name: 'Movement', goals: ['emo'] }, { k: 'mind', name: 'Mindfulness and grounding', goals: ['emo'] }, { k: 'feel', name: 'Identify and name feelings', goals: ['emo'] },
  { k: 'psy', name: 'Psychoeducation', goals: ['fam', 'sub', 'beh'] }, { k: 'prob', name: 'Structured problem solving', goals: ['beh', 'sch'] }, { k: 'friend', name: 'Make or maintain friendships', goals: ['soc'] },
  { k: 'bound', name: 'Recognize danger and healthy boundaries', goals: ['soc', 'sub'] }, { k: 'social', name: 'Social skills coaching', goals: ['soc'] }, { k: 'famc', name: 'Family skills coaching', goals: ['fam'] }, { k: 'peer', name: 'Solving peer conflict', goals: ['soc', 'beh'] }];
const SERVICES = [{ k: 'tdt', label: 'Therapeutic Day Treatment', min: 300 }, { k: 'php', label: 'Partial Hospitalization', min: 300 }, { k: 'iop', label: 'Intensive Outpatient', min: 180 }, { k: 'ind', label: 'Individual therapy', min: 50 }, { k: 'grp', label: 'Group therapy', min: 60 }, { k: 'fam', label: 'Family services', min: 50 }, { k: 'cc', label: 'Care coordination', min: 30 }];
const REASONS = [
  { k: 'doc', label: 'Insufficient documentation of continued medical necessity', w: 26 }, { k: 'goal', label: 'Treatment plan does not show measurable goals', w: 14 }, { k: 'sig', label: 'Missing signature or date on a required form', w: 10 },
  { k: 'units', label: 'Requested units exceed what the documentation supports', w: 22 }, { k: 'int', label: 'Service intensity not supported by the current assessment', w: 16 }, { k: 'rec', label: 'Records not received in time for review', w: 12 }];
const REFERRALS = [['School counselor', 34], ['Family self-referral', 20], ['Pediatrician', 14], ['Community provider', 14], ['Juvenile justice liaison', 6], ['Hospital discharge', 6], ['Other', 6]];
const LET = 'ABCDEFGHIJKLMNOPRSTUVWY';

// ---------- deterministic generator ----------
let s32 = 0;
const R = () => { s32 |= 0; s32 = (s32 + 0x6D2B79F5) | 0; let t = Math.imul(s32 ^ (s32 >>> 15), 1 | s32); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
const wp = items => { const tot = items.reduce((a, x) => a + x.w, 0); let r = R() * tot; for (const x of items) { r -= x.w; if (r <= 0) return x; } return items[items.length - 1]; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mkey = d => d.slice(0, 7);
const mondayOf = d => weekStart(d);
const dleq = (a, b) => a <= b;

function build() {
  s32 = 0x2026 ^ 0x9E3779B9;
  const start = COHORT_RANGE.start; const span = daysBetween(start, COHORT_RANGE.lastEnrol); const TODAY = COHORT_AS_OF;
  const used = {}; const out = []; let aid = 0;
  const PAY = [{ w: 24, v: 'aetna' }, { w: 22, v: 'anthem' }, { w: 17, v: 'humana' }, { w: 19, v: 'sentara' }, { w: 18, v: 'uhc' }];
  for (let i = 0; i < 120; i++) {
    let ini; do { ini = LET[ri(0, LET.length - 1)] + '.' + LET[ri(0, LET.length - 1)] + '.'; } while (used[ini]); used[ini] = 1;   // consumed to keep the sequence; initials are never kept
    const ag = wp([{ w: 12, a: 5, b: 7 }, { w: 25, a: 8, b: 10 }, { w: 33, a: 11, b: 13 }, { w: 30, a: 14, b: 17 }]); const age = ri(ag.a, ag.b);
    const program = wp([{ w: 60, v: 'tdt' }, { w: 20, v: 'iop' }, { w: 5, v: 'php' }, { w: 15, v: 'ind' }]).v;
    const site = program === 'tdt' ? wp(SITES.slice(0, 5).map((s, j) => ({ w: [24, 22, 20, 18, 16][j], v: s[0] }))).v : (R() < 0.6 ? 'Clinic office · Lynchburg' : 'Clinic office · Campbell');
    const county = (SITES.find(s => s[0] === site) || [0, 'Lynchburg City'])[1];
    wp([{ w: 40 }, { w: 30 }, { w: 18 }, { w: 12 }]);   // the clinician draw (not kept: the cohort has no staff names)
    const dx = wp(DXS.map(d => ({ w: { adhd: 22, anx: 18, dep: 12, trm: 8, beh: 25, sud: 8 }[d.k], v: d.k }))).v; const dxo = DXS.find(d => d.k === dx);
    const dx2 = []; if (R() < 0.35) { const o = DXS.filter(d => d.k !== dx); dx2.push(o[ri(0, o.length - 1)].k); if (R() < 0.12) { const o2 = DXS.filter(d => d.k !== dx && d.k !== dx2[0]); dx2.push(o2[ri(0, o2.length - 1)].k); } }
    const referral = wp(REFERRALS.map(r => ({ w: r[1], v: r[0] }))).v; const payer = wp(PAY).v;
    const enroll = addDays(start, Math.floor(R() * span));
    const discharge = enroll <= '2026-06-30' && R() < 0.38;
    let end = null; let endReason = null;
    if (discharge) { const e = addDays(enroll, ri(120, 300)); if (e <= TODAY) { end = e; endReason = wp([{ w: 30, v: 'Goals met' }, { w: 25, v: 'Step-down to outpatient' }, { w: 15, v: 'Family moved out of the district' }, { w: 15, v: 'Transportation ended' }, { w: 15, v: 'Discharged by request' }]).v; } }
    const trend = wp([{ w: 36, v: 'improving' }, { w: 30, v: 'stable' }, { w: 12, v: 'worsening' }, { w: 12, v: 'insufficient' }, { w: 10, v: 'overdue' }]).v;
    const family = R() < 0.7;
    const inst = dxo.inst === 'gad' ? 'gad' : dx === 'anx' ? (age < 11 ? 'scared' : 'gad') : dxo.inst;
    const p = { id: 'COH-' + String(i + 1).padStart(3, '0'), age, program, site, county, dx, dx2, referral, payer, enroll, end, endReason, family, inst, trend, readings: [], goals: [], ivs: [], weeks: [], auths: [], fb: [], inc: {} };
    const stop = end || TODAY;
    const base0 = addDays(enroll, ri(7, 21)); let stopR = stop; if (trend === 'overdue') stopR = addDays(TODAY, -ri(72, 120));
    const dates = [];
    if (base0 <= TODAY && base0 <= stopR) { dates.push(base0); if (trend !== 'insufficient') { let cur = base0; for (;;) { const nx = addDays(cur, ri(35, 56)); if (nx > stopR) break; dates.push(nx); cur = nx; } } }
    const [lo, hi] = INSTS[inst].base; const b0 = ri(lo, hi); const mx = INSTS[inst].max;
    dates.forEach((d, j) => {
      const f = dates.length > 1 ? j / (dates.length - 1) : 0; let m = 1;
      if (trend === 'improving') m = 1 - 0.35 * f * (0.85 + 0.3 * R()); else if (trend === 'worsening') m = 1 + 0.28 * f * (0.85 + 0.3 * R()); else if (trend === 'stable') m = 1 + (R() - 0.5) * 0.12; else if (trend === 'overdue') m = 1 + (R() - 0.5) * 0.1;
      p.readings.push({ d, v: clamp(Math.round(b0 * m), 0, mx) });
    });
    const gk = dxo.goals.slice(); const ng = Math.min(gk.length, ri(1, 2) + (dx2.length && R() < 0.5 ? 1 : 0));
    for (let g = 0; g < ng; g++) {
      const k = gk[g]; const st = addDays(enroll, ri(0, 14)); const sp = ri(5, 15);
      const target = trend === 'improving' ? ri(75, 100) : trend === 'stable' ? ri(40, 55) : trend === 'overdue' ? ri(30, 50) : ri(15, 30);
      const prog = p.readings.filter(r => r.d >= st).map(r => { const f = daysBetween(st, r.d) / Math.max(1, daysBetween(st, stop)); return { d: r.d, pct: clamp(Math.round(sp + (target - sp) * Math.min(1, f)), 0, 100) }; });
      p.goals.push({ k, name: (GOALS.find(x => x[0] === k) || [k, k])[1], start: st, prog });
    }
    const w0 = mondayOf(enroll), wEnd = mondayOf(stop); let wk = 0;
    for (let w = w0; w <= wEnd; w = addDays(w, 7), wk++) {
      if (w > TODAY) break;
      const push = (svc, n) => p.weeks.push({ w, svc, n });
      if (program === 'tdt') push('tdt', 4); else if (program === 'php') push('php', 4); else if (program === 'iop') { push('iop', 2); if (wk % 2 === 0) push('grp', 1); } else push('ind', 1);
      if (family && wk % 2 === 0) push('fam', 1);
      if (wk % 4 === 0) push('cc', 1);
      const pInt = { tdt: 0.6, php: 0.6, iop: 0.5, ind: 0.4 }[program];
      if (R() < pInt && p.goals.length) {
        const n = R() < 0.4 ? 2 : 1;
        for (let q = 0; q < n; q++) {
          const g = p.goals[ri(0, p.goals.length - 1)];
          const pool = IVS.filter(x => x.goals.indexOf(g.k) >= 0); const usePool = pool.length > 0 && R() < 0.85; const list = usePool ? pool : IVS; const iv = list[ri(0, list.length - 1)];
          const d = addDays(w, ri(0, 4)); if (d > (end || TODAY) || d > TODAY) continue;
          wp([{ w: 45, v: 'improved' }, { w: 35, v: 'no change' }, { w: 8, v: 'declined' }, { w: 12, v: 'not recorded' }]); ri(15, 60); ri(55, 99); aid++;
          p.ivs.push({ k: iv.k, name: iv.name, d, observed: R() < 0.06, goal: g.k });
        }
      }
    }
    let m0 = enroll.slice(0, 7) + '-01'; const mEnd = stop.slice(0, 7) + '-01';
    const nm = Math.max(1, daysBetween(m0, mEnd) / 30.4); const b1 = ri(4, 9); let mi = 0;
    for (let m = m0; m <= mEnd; m = addDays(m.slice(0, 7) + '-28', 4).slice(0, 7) + '-01', mi++) {
      const f = mi / nm; const fac = trend === 'improving' ? 1 - 0.6 * f : trend === 'worsening' ? 1 + 0.6 * f : 1;
      p.inc[mkey(m)] = Math.max(0, Math.round(b1 * fac + (R() - 0.5) * 2));
    }
    p.readings.forEach(r => {
      const dir = trend === 'improving' ? 'better' : trend === 'worsening' ? 'worse' : 'same'; const obs = x => (R() < 0.8 ? x : 'same');
      if (age >= 11) { p.fb.push({ d: r.d, src: 'patient', v: ri(3, 5) }); ri(2, 5); }
      if (family) { p.fb.push({ d: r.d, src: 'caregiver', pos: ri(60, 100) >= 80 }); p.fb.push({ d: r.d, src: 'caregiver', pos: obs(dir) === 'better' }); }
      p.fb.push({ d: r.d, src: 'clinician', pos: obs(dir) === 'better' });
      if (program === 'tdt') p.fb.push({ d: r.d, src: 'school', pos: obs(dir) === 'better' });
    });
    // authorization requests: initial, then concurrent reviews while in care
    let sub = addDays(enroll, ri(3, 10)); let prevEnd = null; let kind = 'initial';
    for (let q = 0; q < 5 && sub <= (end || TODAY) && sub <= TODAY; q++) {
      const svc = program === 'tdt' ? 'tdt' : program === 'php' ? 'php' : program === 'iop' ? 'iop' : 'ind';
      const req = { tdt: ri(120, 150), php: ri(90, 120), iop: ri(40, 70), ind: ri(20, 40) }[svc];
      const tat = kind === 'initial' ? (R() < 0.2 ? ri(20, 30) : ri(5, 15)) : ri(7, 21);
      const dec = addDays(sub, tat); const pend = dec > TODAY;
      const dP = payer === 'sentara' ? 0.24 : 0.08; const pP = payer === 'sentara' ? 0.22 : 0.14;
      const rr = R(); const oc = rr < dP ? 'denied' : rr < dP + pP ? 'partial' : 'approved';
      const reason = oc === 'approved' ? null : wp(REASONS.map(x => ({ w: x.w, v: x.k }))).v;
      let approved = oc === 'denied' ? 0 : oc === 'partial' ? Math.round(req * (0.5 + 0.35 * R())) : req;
      let appeal = null; let status = oc;
      if (!pend && oc !== 'approved' && R() < (oc === 'denied' ? 0.45 : 0.12)) {
        const filed = addDays(dec, ri(4, 18));
        if (filed > TODAY) appeal = { filed, outcome: 'open' };
        else { const won = R() < 0.45; appeal = { filed, outcome: won ? 'overturned' : 'upheld' }; if (won) { approved = req; status = 'overturned'; } }
      }
      const covFrom = !pend && approved > 0 ? (appeal && appeal.outcome === 'overturned' ? appeal.filed : dec) : null;
      const cover = covFrom ? [covFrom, addDays(covFrom, 90)] : null;
      aid++;
      p.auths.push({ id: 'AU' + aid, svc, kind: kind, submitted: sub, decided: pend ? null : dec, status: pend ? 'pending' : status, requested: req, approved: pend ? null : approved, reason, appeal, cover });
      if (cover) prevEnd = cover[1];
      kind = 'concurrent';
      if (!prevEnd) break;
      sub = R() < 0.7 ? addDays(prevEnd, -ri(0, 20)) : addDays(prevEnd, ri(3, 25));
    }
    out.push(p);
  }
  return out;
}
let CACHE = null;
export const cohort = () => (CACHE = CACHE || build());

// ---------- filters ----------
export function cohortFilters(raw = {}) {
  return { period: normPeriod(raw.period), site: String(raw.site || ''), payer: String(raw.payer || ''), program: String(raw.program || '') };
}
export const cohortPeriod = F => periodOf(COHORT_AS_OF, F.period);
const inCare = (p, W) => p.enroll <= W.to && (!p.end || p.end >= W.from);
function scope(F) { const W = cohortPeriod(F); return cohort().filter(p => (!F.site || p.site === F.site) && (!F.payer || p.payer === F.payer) && (!F.program || p.program === F.program) && inCare(p, W)); }
export const cohortSiteOptions = () => SITES.map(s => [s[0], s[0]]);
export const cohortPayerOptions = () => Object.entries(PAYERS).map(([k, v]) => [k, v]);
export const cohortProgramOptions = () => PROGRAMS.slice();

// ---------- facts ----------
const dxLabel = k => (DXS.find(d => d.k === k) || { label: k }).label;
export function cohortFacts(F) {
  const W = cohortPeriod(F); const to = W.to;
  return scope(F).map(p => {
    const readings = p.readings.filter(r => r.d <= to);
    const series = readings.length ? [{ inst: p.inst, label: INSTS[p.inst].name, lowerBetter: true, points: readings.map(r => ({ d: r.d, v: r.v })) }] : [];
    const goals = p.goals.map(g => { const pr = g.prog.filter(x => x.d <= to); const ivIn = p.ivs.filter(v => v.goal === g.k && !v.observed && inRange(v.d, W.from, W.to)).length; return { key: g.k, label: g.name, touched: ivIn, pct: pr.length ? pr[pr.length - 1].pct : null }; });
    const ivs = new Map(); for (const v of p.ivs) if (!v.observed && inRange(v.d, W.from, W.to)) { const e = ivs.get(v.k) || { key: v.k, label: v.name, n: 0 }; e.n++; ivs.set(v.k, e); }
    const svc = new Map(); for (const w of p.weeks) if (w.w >= mondayOf(W.from) && w.w <= to) { const sv = SERVICES.find(x => x.k === w.svc); const e = svc.get(w.svc) || { key: w.svc, label: sv.label, n: 0 }; e.n++; svc.set(w.svc, e); }
    const monthly = {}; for (const [m, n] of Object.entries(p.inc)) monthly[m] = { incidents: n, office: 0 };
    const active = !(p.end && p.end <= to);
    const last = readings.length ? readings[readings.length - 1].d : null; const flags = [];
    if (active) { if (!readings.length) flags.push('no_score'); else if (daysBetween(last, to) > 60) flags.push('stale_score'); }
    if (series.length && series[0].points.length > 1 && direction(series[0]) === 'worse') flags.push('worse');
    return { id: p.id, site: p.site, siteLabel: p.site, locality: p.county, referral: p.referral, payer: p.payer, payerLabel: PAYERS[p.payer], age: p.age, ageBand: ageBand(p.age), program: (PROGRAMS.find(x => x[0] === p.program) || [0, p.program])[1],
      status: active ? 'active' : 'discharged', enrolled: p.enroll, ended: p.end, dx: [p.dx, ...p.dx2].map(k => ({ key: k, label: dxLabel(k) })), goals, ivs: [...ivs.values()], series, monthly,
      feedback: p.fb.filter(x => inRange(x.d, W.from, W.to)).map(x => ({ src: x.src, v: x.v, pos: x.pos })), svc: [...svc.values()], units: null, flags,
      have: { goals: p.goals.length > 0, score: readings.length > 0, note: p.ivs.some(v => !v.observed && inRange(v.d, addDays(to, -29), to)), guardian: p.family } };
  });
}
export function cohortRequests(F) {
  const W = cohortPeriod(F); const out = [];
  for (const p of scope(F)) for (const a of p.auths) {
    if (!(inRange(a.submitted, W.from, W.to) || (a.decided && inRange(a.decided, W.from, W.to)))) continue;
    const reason = a.reason ? (REASONS.find(x => x.k === a.reason) || {}).label : null;
    out.push({ id: a.id, payer: p.payer, payerLabel: PAYERS[p.payer], type: a.kind === 'initial' ? 'initial' : 'continued_stay', svc: (SERVICES.find(x => x.k === a.svc) || { label: a.svc }).label, submitted: a.submitted, decided: a.decided, outcome: a.status === 'pending' ? 'pending' : a.status === 'overturned' ? 'approved' : a.status, requested: a.requested, approved: a.approved,
      reason, appealed: !!a.appeal, appealOutcome: a.appeal ? a.appeal.outcome : null, renewal: a.kind === 'concurrent', days: a.decided ? daysBetween(a.submitted, a.decided) : null, extraWork: !!a.appeal || a.status === 'partial' });
  }
  return out;
}

// ---------- sections ----------
const env = (s, F) => ({ min: minN(s), drill: false, provenance: PROV.COHORT, asOf: COHORT_AS_OF, from: cohortPeriod(F).from, ivNote: 'Delivered interventions in the period' });
const tag = P => P.map(p => ({ ...p, provenance: PROV.COHORT }));
export function cohortSection(s, section, rawF) {
  const F = cohortFilters(rawF); const e = env(s, F); const W = cohortPeriod(F);
  const meta = { dataset: PROV.COHORT, period: W, filters: F, asOf: COHORT_AS_OF, source: COHORT_SOURCE, notes: [] };
  if (section === 'payer') { const R_ = cohortRequests(F); return { ...meta, strip: payerStrip(R_, e.min), panels: tag(payerPanels(R_, e)) }; }
  const facts = cohortFacts(F);
  return { ...meta, panels: tag(section === 'outcomes' ? outcomePanels(facts, e) : populationPanels(facts, e)), count: facts.length };
}
export function cohortSummary(s, rawF) { const F = cohortFilters(rawF); return result({ provenance: PROV.COHORT, asOf: COHORT_AS_OF, source: COHORT_SOURCE, rows: [], patients: scope(F).length, total: cohort().length }); }
