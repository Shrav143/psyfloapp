/* Round 16 (AN16): the SIMULATED COHORT behind Analytics (Patient Outcomes, Payer Performance, Patient Population).
   Every patient here is fictional (initials only), generated with a fixed seed, so every figure reproduces. The cohort is separate from the
   11 demo consumers in All Authorizations, Denial Intelligence and the case files: Analytics does not reconcile with those tabs, and the page says so.
   PSY.cohort
     all()                 the patients (built once): p.id, p.ini, p.age, p.program ('tdt'|'iop'|'php'|'ind'), p.site, p.county, p.clinician,
                           p.dx ('adhd'|'anx'|'dep'|'trm'|'beh'|'sud'), p.dx2 (secondary categories), p.referral, p.payer (PSY.data.payers key),
                           p.enroll (Date), p.end (Date|null), p.endReason, p.family (bool), p.inst (instrument key),
                           p.readings [{d, v}] (the primary instrument, one instrument per patient), p.goals [{k, name, start, prog [{d, pct}]}],
                           p.ivs [{id, k, name, code, d, min, resp, ai, conf, review ('confirmed'|'pending'), observed (true = observation only, not counted), note}],
                           p.weeks [{w (Monday), svc, n, min, goal}], p.auths [{id, svc, kind, submitted, decided, status, requested, approved,
                           reason, appeal {filed, outcome}|null, cover [from, to]|null, renewal, onTime}], p.fb [{d, src, q, v}], p.inc {monthKey: n}, p.reviews [Date]
     get(id), byIni(ini)    lookups
     filters()              the shared filters (PSY.fb page 'analytics') with defaults: last 90 days, comparison on, caseload for LCS
     window(F)              {from, to, days, cmp, prev:{from,to}, label} (the previous period is the same length, just before)
     scope(F)               patients passing Program, Location, Payer, Clinician, Diagnosis and Population (not the dates)
     inRange(p, W)          the patient was in care at some point in the window
     activeAt(p, d)         enrolled on or before d, not discharged before d
     readings(p, W)         the primary instrument's readings in the window
     status(p, asOf)        {n, status, change, baseline, latest, best, bestChange, earlierImproved, lastDate, overdue, goalAvg, inst, instName}
     requests(F, W)         authorization requests submitted in the window (scope applied)
     weeksIn(F, W)          service records (weekly) whose week starts in the window (scope applied)
     ivsIn(F, W)            delivered (not observation-only) interventions in the window (scope applied)
     feedbackIn(F, W)       feedback records in the window (scope applied)
     covered(p, d)          an approved or overturned authorization covered that day
     PAY(key) · DX(key) · SVC(key) · INST(key) · GOAL(key) · IV(name)  labels
     MIN_N                  groups below this count are not shown (privacy); 5 */
(function () {
  const PSY = window.PSY; const K = (PSY.cohort = PSY.cohort || {});
  const TODAY = new Date(2026, 9, 29); const DAY = 864e5;
  const p2 = (n) => String(n).padStart(2, '0');
  const iso = (d) => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  const dt = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const add = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const diff = (a, b) => Math.round((b - a) / DAY);
  const mkey = (d) => d.getFullYear() + '-' + p2(d.getMonth() + 1);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const short = (d) => MON[d.getMonth()] + ' ' + d.getDate();
  const mlabel = (k) => { const x = k.split('-'); return MON[+x[1] - 1] + ' ' + x[0]; };
  const monday = (d) => add(d, -((d.getDay() + 6) % 7));
  Object.assign(K, { TODAY, MIN_N: 5, iso, dt, add, diff, mkey, mlabel, short, MON, monday });

  /* ---------- catalogs (labels only; the instruments' ranges are their published scales) ---------- */
  K.PROGRAMS = [['tdt', 'Therapeutic Day Treatment (school day)'], ['iop', 'Intensive Outpatient Program'], ['php', 'Partial Hospitalization'], ['ind', 'Individual outpatient therapy']];
  K.SITES = [['Lynchburg City · ES-3', 'Lynchburg City'], ['Lynchburg City · MS-2', 'Lynchburg City'], ['Campbell County · ES-1', 'Campbell County'], ['Campbell County · HS-1', 'Campbell County'], ['Campbell County · MS-1', 'Campbell County'], ['Clinic office · Lynchburg', 'Lynchburg City'], ['Clinic office · Campbell', 'Campbell County']];
  K.CLINICIANS = ['J. Perez, LPC', 'S. Ortiz, LPC', 'D. Reyes, LPC', 'A. Kim, LPC'];
  K.DXS = [
    { k: 'adhd', label: 'ADHD', code: 'F90.2', inst: 'vand', goals: ['sch', 'beh'] },
    { k: 'anx', label: 'Anxiety Disorders', code: 'F41.1, F93.0', inst: 'anx', goals: ['emo', 'soc'] },
    { k: 'dep', label: 'Depressive Disorders', code: 'F32.1', inst: 'phq', goals: ['emo', 'fam'] },
    { k: 'trm', label: 'Trauma-Related Disorders', code: 'F43.10', inst: 'cafas', goals: ['emo', 'beh'] },
    { k: 'beh', label: 'Behavioral Disorders', code: 'F91.3', inst: 'sdq', goals: ['beh', 'sch', 'fam'] },
    { k: 'sud', label: 'Substance Use Disorders', code: 'F12.10', inst: 'cafas', goals: ['sub', 'fam'] },
  ];
  K.INSTS = {
    vand: { name: 'Vanderbilt ADHD symptom count', max: 18, base: [10, 16], unit: 'symptoms' },
    phq: { name: 'PHQ-9 depression scale', max: 27, base: [10, 17], unit: 'points' },
    gad: { name: 'GAD-7 anxiety scale (age 11 and over)', max: 21, base: [9, 15], unit: 'points' },
    scared: { name: 'SCARED anxiety scale (under 11)', max: 82, base: [30, 45], unit: 'points' },
    sdq: { name: 'SDQ total difficulties', max: 40, base: [15, 24], unit: 'points' },
    cafas: { name: 'CAFAS functioning total', max: 240, base: [90, 150], unit: 'points' },
  };
  K.GOALS = [['emo', 'Emotional regulation'], ['beh', 'Behavioral stabilization'], ['soc', 'Social functioning'], ['sch', 'School participation'], ['fam', 'Family functioning'], ['sub', 'Substance use recovery']];
  /* intervention names are the approved ISP 2.0 picklist (42-flow.js and 65-forms-util.js). Interventions outside that list are not used. */
  K.IVS = [
    { k: 'coping', name: 'Coping skills practice', code: 'QMHP 1.2', goals: ['emo', 'beh'] },
    { k: 'move', name: 'Movement', code: 'Clinical 2.1', goals: ['emo'] },
    { k: 'mind', name: 'Mindfulness and grounding', code: 'Clinical 2.2', goals: ['emo'] },
    { k: 'feel', name: 'Identify and name feelings', code: 'QMHP 1.1', goals: ['emo'] },
    { k: 'psy', name: 'Psychoeducation', code: 'QMHP 1.3', goals: ['fam', 'sub', 'beh'] },
    { k: 'prob', name: 'Structured problem solving', code: 'QMHP 1.4', goals: ['beh', 'sch'] },
    { k: 'friend', name: 'Make or maintain friendships', code: 'QMHP 1.5', goals: ['soc'] },
    { k: 'bound', name: 'Recognize danger and healthy boundaries', code: 'QMHP 1.6', goals: ['soc', 'sub'] },
    { k: 'social', name: 'Social skills coaching', code: 'QMHP 1.7', goals: ['soc'] },
    { k: 'famc', name: 'Family skills coaching', code: 'QMHP 1.8', goals: ['fam'] },
    { k: 'peer', name: 'Solving peer conflict', code: 'QMHP 1.9', goals: ['soc', 'beh'] },
  ];
  K.SERVICES = [
    { k: 'tdt', label: 'Therapeutic Day Treatment (school day)', min: 300 },
    { k: 'php', label: 'Partial Hospitalization', min: 300 },
    { k: 'iop', label: 'Intensive Outpatient Program (group and individual)', min: 180 },
    { k: 'ind', label: 'Individual therapy', min: 50 },
    { k: 'grp', label: 'Group therapy', min: 60 },
    { k: 'fam', label: 'Family services', min: 50 },
    { k: 'cc', label: 'Care coordination', min: 30 },
  ];
  K.REASONS = [
    { k: 'doc', label: 'Insufficient documentation of continued medical necessity', cat: 'Documentation', w: 26 },
    { k: 'goal', label: 'Treatment plan does not show measurable goals', cat: 'Documentation', w: 14 },
    { k: 'sig', label: 'Missing signature or date on a required form', cat: 'Documentation', w: 10 },
    { k: 'units', label: 'Requested units exceed what the documentation supports', cat: 'Units', w: 22 },
    { k: 'int', label: 'Service intensity not supported by the current assessment', cat: 'Clinical', w: 16 },
    { k: 'rec', label: 'Records not received in time for review', cat: 'Administrative', w: 12 },
  ];
  K.REFERRALS = [['School counselor', 34], ['Family self-referral', 20], ['Pediatrician', 14], ['Community provider', 14], ['Juvenile justice liaison', 6], ['Hospital discharge', 6], ['Other', 6]];
  K.SEGMENTS = [['all', 'All consumers'], ['school', 'School-based (Therapeutic Day Treatment)'], ['clinic', 'Clinic-based (IOP, PHP, individual)'], ['young', 'Ages 5 to 10'], ['older', 'Ages 11 to 17']];
  K.AGE_BANDS = [['5–7', 5, 7], ['8–10', 8, 10], ['11–13', 11, 13], ['14–17', 14, 17]];
  K.QUARTERS = [];

  /* ---------- labels ---------- */
  K.PAY = (k) => (PSY.data.payers[k] || {}).short || k;
  K.PAYN = (k) => (PSY.data.payers[k] || {}).name || k;
  K.DX = (k) => (K.DXS.find((x) => x.k === k) || { label: k }).label;
  K.SVC = (k) => (K.SERVICES.find((x) => x.k === k) || { label: k }).label;
  K.INST = (k) => K.INSTS[k] || { name: k, max: null, unit: '' };
  K.GOAL = (k) => (K.GOALS.find((x) => x[0] === k) || [k, k])[1];
  K.IV = (name) => K.IVS.find((x) => x.name === name) || { name, code: '', goals: [] };
  K.PROG = (k) => (K.PROGRAMS.find((x) => x[0] === k) || [k, k])[1];

  /* ---------- deterministic generator ---------- */
  let s32 = 0x2026 ^ 0x9E3779B9;
  const R = () => { s32 |= 0; s32 = (s32 + 0x6D2B79F5) | 0; let t = Math.imul(s32 ^ (s32 >>> 15), 1 | s32); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const wp = (items) => { const tot = items.reduce((a, x) => a + x.w, 0); let r = R() * tot; for (const x of items) { r -= x.w; if (r <= 0) return x; } return items[items.length - 1]; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const LET = 'ABCDEFGHIJKLMNOPRSTUVWY';

  function build() {
    const start = new Date(2025, 7, 18); const span = diff(start, new Date(2026, 9, 15));
    const used = {}; const out = []; let aid = 0;
    const PAYERS = [{ w: 24, v: 'aetna' }, { w: 22, v: 'anthem' }, { w: 17, v: 'humana' }, { w: 19, v: 'sentara' }, { w: 18, v: 'uhc' }];
    for (let i = 0; i < 120; i++) {
      let ini; do { ini = LET[ri(0, LET.length - 1)] + '.' + LET[ri(0, LET.length - 1)] + '.'; } while (used[ini]); used[ini] = 1;
      const age = (wp([{ w: 12, a: 5, b: 7 }, { w: 25, a: 8, b: 10 }, { w: 33, a: 11, b: 13 }, { w: 30, a: 14, b: 17 }])); const ageN = ri(age.a, age.b);
      const program = wp([{ w: 60, v: 'tdt' }, { w: 20, v: 'iop' }, { w: 5, v: 'php' }, { w: 15, v: 'ind' }]).v;
      const schoolSites = K.SITES.slice(0, 5);
      const site = program === 'tdt' ? wp(schoolSites.map((s, j) => ({ w: [24, 22, 20, 18, 16][j], v: s[0] }))).v : (R() < 0.6 ? 'Clinic office · Lynchburg' : 'Clinic office · Campbell');
      const county = (K.SITES.find((s) => s[0] === site) || [0, 'Lynchburg City'])[1];
      const clinician = wp([{ w: 40, v: K.CLINICIANS[0] }, { w: 30, v: K.CLINICIANS[1] }, { w: 18, v: K.CLINICIANS[2] }, { w: 12, v: K.CLINICIANS[3] }]).v;
      const dx = wp(K.DXS.map((d) => ({ w: { adhd: 22, anx: 18, dep: 12, trm: 8, beh: 25, sud: 8 }[d.k], v: d.k }))).v;
      const dxo = K.DXS.find((d) => d.k === dx);
      const dx2 = []; if (R() < 0.35) { const o = K.DXS.filter((d) => d.k !== dx); dx2.push(o[ri(0, o.length - 1)].k); if (R() < 0.12) { const o2 = K.DXS.filter((d) => d.k !== dx && d.k !== dx2[0]); dx2.push(o2[ri(0, o2.length - 1)].k); } }
      const referral = wp(K.REFERRALS.map((r) => ({ w: r[1], v: r[0] }))).v;
      const payer = wp(PAYERS).v;
      const enroll = add(start, Math.floor(R() * span));
      const discharge = enroll <= new Date(2026, 5, 30) && R() < 0.38;
      let end = null; let endReason = null;
      if (discharge) { const e = add(enroll, ri(120, 300)); if (e <= TODAY) { end = e; endReason = wp([{ w: 30, v: 'Goals met' }, { w: 25, v: 'Step-down to outpatient' }, { w: 15, v: 'Family moved out of the district' }, { w: 15, v: 'Transportation ended' }, { w: 15, v: 'Discharged by request' }]).v; } }
      const trend = wp([{ w: 36, v: 'improving' }, { w: 30, v: 'stable' }, { w: 12, v: 'worsening' }, { w: 12, v: 'insufficient' }, { w: 10, v: 'overdue' }]).v;
      const family = R() < 0.7;
      const inst = dxo.inst === 'gad' ? 'gad' : dx === 'anx' ? (ageN < 11 ? 'scared' : 'gad') : dxo.inst;
      const p = { id: 'S' + p2(0) + String(i + 1).padStart(3, '0'), ini, age: ageN, program, site, county, clinician, dx, dx2, referral, payer, enroll, end, endReason, family, inst, trend, readings: [], goals: [], ivs: [], weeks: [], auths: [], fb: [], inc: {}, reviews: [] };
      const stop = end || TODAY;
      /* assessments: a baseline, then one reading every 5 to 8 weeks while in care; 'overdue' stopped 10 to 17 weeks ago; 'insufficient' has a baseline only */
      const base0 = add(enroll, ri(7, 21));
      let stopR = stop; if (trend === 'overdue') stopR = add(TODAY, -ri(72, 120));
      const dates = [];
      if (base0 <= TODAY && base0 <= stopR) { dates.push(base0); if (trend !== 'insufficient') { let cur = base0; for (;;) { const nx = add(cur, ri(35, 56)); if (nx > stopR) break; dates.push(nx); cur = nx; } } }
      const [lo, hi] = K.INSTS[inst].base; const b0 = ri(lo, hi); const mx = K.INSTS[inst].max;
      dates.forEach((d, j) => {
        const f = dates.length > 1 ? j / (dates.length - 1) : 0;
        let m = 1;
        if (trend === 'improving') m = 1 - 0.35 * f * (0.85 + 0.3 * R());
        else if (trend === 'worsening') m = 1 + 0.28 * f * (0.85 + 0.3 * R());
        else if (trend === 'stable') m = 1 + (R() - 0.5) * 0.12;
        else if (trend === 'overdue') m = 1 + (R() - 0.5) * 0.1;
        p.readings.push({ d, v: clamp(Math.round(b0 * m), 0, mx) });
      });
      /* goals (1 to 3): progress is reviewed at each reading */
      const gk = dxo.goals.slice(); const ng = Math.min(gk.length, ri(1, 2) + (dx2.length && R() < 0.5 ? 1 : 0));
      for (let g = 0; g < ng; g++) {
        const k = gk[g]; const st = add(enroll, ri(0, 14)); const sp = ri(5, 15);
        const target = trend === 'improving' ? ri(75, 100) : trend === 'stable' ? ri(40, 55) : trend === 'overdue' ? ri(30, 50) : ri(15, 30);
        const prog = p.readings.filter((r) => r.d >= st).map((r) => { const f = (diff(st, r.d)) / Math.max(1, diff(st, stop)); return { d: r.d, pct: clamp(Math.round(sp + (target - sp) * Math.min(1, f)), 0, 100) }; });
        p.goals.push({ k, name: K.GOAL(k), start: st, prog, met: !!end && endReason === 'Goals met' });
      }
      /* weekly service records, by program */
      const w0 = monday(enroll); const wEnd = monday(stop);
      let wk = 0;
      for (let w = w0; w <= wEnd; w = add(w, 7), wk++) {
        if (w > TODAY) break;
        const goal = p.goals.length ? p.goals[wk % p.goals.length].k : null;
        const push = (svc, n) => p.weeks.push({ w, svc, n, min: n * (K.SERVICES.find((s) => s.k === svc) || { min: 60 }).min, goal });
        if (program === 'tdt') push('tdt', 4); else if (program === 'php') push('php', 4);
        else if (program === 'iop') { push('iop', 2); if (wk % 2 === 0) push('grp', 1); }
        else push('ind', 1);
        if (p.family && wk % 2 === 0) push('fam', 1);
        if (wk % 4 === 0) push('cc', 1);
        /* interventions documented that week: one or two, from the picklist, linked to a goal the patient has */
        const pInt = { tdt: 0.6, php: 0.6, iop: 0.5, ind: 0.4 }[program];
        if (R() < pInt && p.goals.length) {
          const n = R() < 0.4 ? 2 : 1;
          for (let q = 0; q < n; q++) {
            const g = p.goals[ri(0, p.goals.length - 1)];
            const pool = K.IVS.filter((x) => x.goals.indexOf(g.k) >= 0); const usePool = pool.length > 0 && R() < 0.85; const list = usePool ? pool : K.IVS; const iv = list[ri(0, list.length - 1)];
            const d = add(w, ri(0, 4)); if (d > (end || TODAY) || d > TODAY) continue;
            const resp = wp(trend === 'improving' ? [{ w: 60, v: 'improved' }, { w: 25, v: 'no change' }, { w: 5, v: 'declined' }, { w: 10, v: 'not recorded' }]
              : trend === 'worsening' ? [{ w: 25, v: 'improved' }, { w: 40, v: 'no change' }, { w: 20, v: 'declined' }, { w: 15, v: 'not recorded' }]
              : [{ w: 45, v: 'improved' }, { w: 35, v: 'no change' }, { w: 8, v: 'declined' }, { w: 12, v: 'not recorded' }]).v;
            const conf = R() < 0.12 ? ri(55, 79) : ri(80, 99); aid++;
            p.ivs.push({ id: 'IV' + aid, k: iv.k, name: iv.name, code: iv.code, d, min: ri(15, 60), resp, ai: true, conf: conf / 100, review: conf < 80 ? 'pending' : 'confirmed', observed: R() < 0.06, note: 'PN-' + p.id.slice(1) + '-' + (p.ivs.length + 1), goals: iv.goals });
          }
        }
      }
      /* plan reviews every 90 days */
      for (let d = add(enroll, 90); d <= stop && d <= TODAY; d = add(d, 90)) p.reviews.push(d);
      /* incidents per month (school and program behaviour incidents) */
      let m0 = new Date(enroll.getFullYear(), enroll.getMonth(), 1); const mEnd = new Date(stop.getFullYear(), stop.getMonth(), 1);
      const nm = Math.max(1, diff(m0, mEnd) / 30.4);
      const b1 = ri(4, 9); let mi = 0;
      for (let m = m0; m <= mEnd; m = new Date(m.getFullYear(), m.getMonth() + 1, 1), mi++) {
        const f = mi / nm; const fac = trend === 'improving' ? 1 - 0.6 * f : trend === 'worsening' ? 1 + 0.6 * f : 1;
        p.inc[mkey(m)] = Math.max(0, Math.round(b1 * fac + (R() - 0.5) * 2));
      }
      /* feedback at each reading: patient (11 and over), caregiver (family), clinician, school (school-based only) */
      p.readings.forEach((r) => {
        const dir = trend === 'improving' ? 'better' : trend === 'worsening' ? 'worse' : 'same';
        const obs = (x) => (R() < 0.8 ? x : 'same');
        if (ageN >= 11) { p.fb.push({ d: r.d, src: 'patient', q: 'Satisfaction with treatment (1 to 5)', v: ri(3, 5) }); p.fb.push({ d: r.d, src: 'patient', q: 'Perceived helpfulness (1 to 5)', v: ri(2, 5) }); }
        if (p.family) { p.fb.push({ d: r.d, src: 'caregiver', q: 'Family engagement (share of sessions attended)', v: ri(60, 100) }); p.fb.push({ d: r.d, src: 'caregiver', q: 'Changes in behaviour at home (observed)', v: obs(dir) }); }
        const gs = p.goals.map((g) => (g.prog.find((x) => x.d.getTime() === r.d.getTime()) || {}).pct).filter((x) => x != null);
        if (gs.length) p.fb.push({ d: r.d, src: 'clinician', q: 'Goal attainment (average of goals, %)', v: Math.round(gs.reduce((a, b) => a + b, 0) / gs.length) });
        p.fb.push({ d: r.d, src: 'clinician', q: 'Functional change (clinician rating)', v: obs(dir) });
        if (program === 'tdt') p.fb.push({ d: r.d, src: 'school', q: 'School staff observed change in behaviour', v: obs(dir) });
      });
      /* authorization requests: initial, then concurrent reviews while in care; 'sentara' is set higher on denials and partial approvals */
      let sub = add(enroll, ri(3, 10)); let prevEnd = null; let kind = 'initial';
      for (let q = 0; q < 5 && sub <= (end || TODAY) && sub <= TODAY; q++) {
        const svc = program === 'tdt' ? 'tdt' : program === 'php' ? 'php' : program === 'iop' ? 'iop' : 'ind';
        const req = { tdt: ri(120, 150), php: ri(90, 120), iop: ri(40, 70), ind: ri(20, 40) }[svc];
        const tat = kind === 'initial' ? (R() < 0.2 ? ri(20, 30) : ri(5, 15)) : ri(7, 21);
        const dec = add(sub, tat); const pend = dec > TODAY;
        const dP = payer === 'sentara' ? 0.24 : 0.08; const pP = payer === 'sentara' ? 0.22 : 0.14;
        const rr = R(); const oc = rr < dP ? 'denied' : rr < dP + pP ? 'partial' : 'approved';
        const reason = oc === 'approved' ? null : wp(K.REASONS.map((x) => ({ w: x.w, v: x.k }))).v;
        let approved = oc === 'denied' ? 0 : oc === 'partial' ? Math.round(req * (0.5 + 0.35 * R())) : req;
        let appeal = null; let status = oc;
        if (!pend && oc !== 'approved' && R() < (oc === 'denied' ? 0.45 : 0.12)) {
          const filed = add(dec, ri(4, 18));
          if (filed > TODAY) appeal = { filed, outcome: 'open' };
          else { const won = R() < 0.45; appeal = { filed, outcome: won ? 'overturned' : 'upheld' }; if (won) { approved = req; status = 'overturned'; } }
        }
        const covFrom = !pend && approved > 0 ? (appeal && appeal.outcome === 'overturned' ? appeal.filed : dec) : null;
        const cover = covFrom ? [covFrom, add(covFrom, 90)] : null;
        const onTime = kind === 'concurrent' && prevEnd ? sub <= prevEnd : null;
        aid++;
        p.auths.push({ id: 'AU' + aid, svc, kind, submitted: sub, decided: pend ? null : dec, status: pend ? 'pending' : status, requested: req, approved: pend ? null : approved, reason, appeal, cover, renewal: kind === 'concurrent', onTime });
        if (cover) prevEnd = cover[1];
        kind = 'concurrent';
        if (!prevEnd) break;
        sub = R() < 0.7 ? add(prevEnd, -ri(0, 20)) : add(prevEnd, ri(3, 25));
      }
      out.push(p);
    }
    out.forEach((p) => { p.payer = p.payer; p.fb.sort((a, b) => a.d - b.d); p.readings.sort((a, b) => a.d - b.d); });
    return out;
  }
  let CACHE = null; let BYID = null;
  K.all = () => { if (!CACHE) { CACHE = build(); BYID = {}; CACHE.forEach((p) => { BYID[p.id] = p; }); } return CACHE; };
  K.get = (id) => { K.all(); return BYID[id] || null; };
  K.byIni = (ini) => K.all().find((p) => p.ini === ini) || null;

  /* ---------- filters and periods ---------- */
  const FBK = 'analytics';
  K.DEFAULTS = () => ({ from: iso(add(TODAY, -90)), to: iso(TODAY), cmp: '1', program: '', site: '', payer: '', clinician: '', dx: '', seg: 'all' });
  K.filters = () => {
    const FB = PSY.fb; const d = K.DEFAULTS(); const g = (k) => { const v = FB.get(FBK, k, ''); return v === '' || v == null ? d[k] : v; };
    const from = dt(g('from')) || dt(d.from); const to = dt(g('to')) || dt(d.to);
    const F = { from: from <= to ? from : to, to: from <= to ? to : from, cmp: g('cmp') !== '0', program: FB.get(FBK, 'program', ''), site: FB.get(FBK, 'site', ''), payer: FB.get(FBK, 'payer', ''), clinician: FB.get(FBK, 'clinician', ''), dx: FB.get(FBK, 'dx', ''), seg: FB.get(FBK, 'seg', '') || 'all' };
    if (!PSY.can('allConsumers')) { const me = (PSY.ROLES[PSY.role()] || {}).staff || ''; F.caseClin = K.CLINICIANS.find((c) => c.indexOf(me) === 0) || null; F.clinician = F.caseClin || '(no caseload)'; F.caseload = true; }
    return F;
  };
  K.window = (F) => {
    const days = diff(F.from, F.to) + 1; const pto = add(F.from, -1); const pfrom = add(pto, -(days - 1));
    return { from: F.from, to: F.to, days, cmp: F.cmp, prev: { from: pfrom, to: pto }, label: short(F.from) + ' – ' + short(F.to) + ', ' + F.to.getFullYear(), prevLabel: short(pfrom) + ' – ' + short(pto) };
  };
  K.scope = (F) => K.all().filter((p) => (!F.program || p.program === F.program) && (!F.site || p.site === F.site) && (!F.payer || p.payer === F.payer) && (!F.clinician || p.clinician === F.clinician)
    && (!F.dx || p.dx === F.dx || p.dx2.indexOf(F.dx) >= 0) && (F.seg === 'all' || (F.seg === 'school' && p.program === 'tdt') || (F.seg === 'clinic' && p.program !== 'tdt') || (F.seg === 'young' && p.age <= 10) || (F.seg === 'older' && p.age >= 11)));
  K.inRange = (p, W) => p.enroll <= W.to && (!p.end || p.end >= W.from);
  K.activeAt = (p, d) => p.enroll <= d && (!p.end || p.end > d);
  K.readings = (p, W) => p.readings.filter((r) => r.d >= W.from && r.d <= W.to);
  K.covered = (p, d) => p.auths.some((a) => a.cover && d >= a.cover[0] && d <= a.cover[1]);

  /* the outcome status of one patient as of a date (the same rules everywhere): overdue = no assessment in the last 60 days; insufficient = fewer
     than two readings; improving = latest at least 10% below baseline; worsening = latest at least 10% above baseline and rising; else stable */
  K.status = (p, asOf) => {
    const rs = p.readings.filter((r) => r.d <= asOf); const n = rs.length; const last = n ? rs[n - 1] : null;
    const base = n ? rs[0].v : null; const latest = last ? last.v : null; const prev = n > 1 ? rs[n - 2].v : null;
    const best = n ? Math.min.apply(null, rs.map((r) => r.v)) : null;
    const change = n > 1 && base ? (latest - base) / base : null;
    const bestChange = n > 1 && base ? (best - base) / base : null;
    const lastDate = last ? last.d : null; const overdue = lastDate ? diff(lastDate, asOf) > 60 : (p.enroll <= asOf && diff(p.enroll, asOf) > 60);
    let status;
    if (overdue) status = 'overdue'; else if (n < 2) status = 'insufficient';
    else if (change <= -0.1) status = 'improving'; else if (change >= 0.1 && latest > prev) status = 'worsening'; else status = 'stable';
    const earlierImproved = bestChange != null && bestChange <= -0.1;
    const maintaining = earlierImproved && status !== 'improving' && status !== 'worsening' && latest <= best * 1.1;
    const gs = p.goals.map((g) => { const pr = g.prog.filter((x) => x.d <= asOf); return pr.length ? pr[pr.length - 1].pct : null; }).filter((x) => x != null);
    const goalAvg = gs.length ? Math.round(gs.reduce((a, b) => a + b, 0) / gs.length) : null;
    return { n, status, change, baseline: base, latest, best, bestChange, earlierImproved, maintaining, lastDate, overdue, goalAvg, inst: p.inst, instName: K.INST(p.inst).name, first: rs[0] || null, last };
  };

  /* requests, service weeks, interventions and feedback in a window, for the patients in scope */
  K.requests = (F, W) => { const ids = {}; K.scope(F).forEach((p) => { ids[p.id] = p; }); const out = []; K.scope(F).forEach((p) => p.auths.forEach((a) => { if (a.submitted >= W.from && a.submitted <= W.to) out.push(Object.assign({ pid: p.id, program: p.program, dx: p.dx, site: p.site, clinician: p.clinician, county: p.county }, a, { payer: p.payer })); })); return out; };
  K.weeksIn = (F, W) => { const out = []; K.scope(F).forEach((p) => p.weeks.forEach((x) => { if (x.w >= monday(W.from) && x.w <= W.to) out.push(Object.assign({ pid: p.id, program: p.program, dx: p.dx, payer: p.payer, site: p.site }, x)); })); return out; };
  K.ivsIn = (F, W) => { const out = []; K.scope(F).forEach((p) => p.ivs.forEach((x) => { if (!x.observed && x.d >= W.from && x.d <= W.to) out.push(Object.assign({ pid: p.id, program: p.program, dx: p.dx, dx2: p.dx2, site: p.site, goalsOf: p.goals.map((g) => g.k) }, x)); })); return out; };
  K.feedbackIn = (F, W) => { const out = []; K.scope(F).forEach((p) => p.fb.forEach((x) => { if (x.d >= W.from && x.d <= W.to) out.push(Object.assign({ pid: p.id }, x)); })); return out; };
})();
