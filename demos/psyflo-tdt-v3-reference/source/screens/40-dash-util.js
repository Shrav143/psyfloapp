/* Shared helpers for Authorizations and Analytics (the Overview page is gone in round 8; PSY.dash.ov stays for Authorizations and PSY.counts).
   1. locality filter (PSY.state.prefs.locality) and its segmented control
   2. per-case table fields derived from PSY.allCases() (owner, days in state, units, window, next action)
   3. ONE analytics data model (PSY.dash.model): a list of decided requests that every Analytics number is computed from.
   Nothing here edits shared state except prefs.locality and boxes['dash.*' | 'an.*'] flags. */
(function () {
  const PSY = window.PSY;
  const esc = PSY.esc;
  const D = (PSY.dash = PSY.dash || {});

  /* ================= 1 · locality ================= */
  const LOCS = { both: 'Both localities', campbell: 'Campbell County', lynchburg: 'Lynchburg City' };
  D.LOCS = LOCS;
  D.loc = () => { const l = PSY.state.prefs && PSY.state.prefs.locality; return LOCS[l] ? l : 'both'; };
  D.locLabel = () => LOCS[D.loc()];
  D.setLoc = (l) => { PSY.state.prefs = PSY.state.prefs || {}; PSY.state.prefs.locality = l; PSY.save(); };
  D.inLoc = (x) => D.loc() === 'both' || x.loc === D.loc();
  D.locSeg = () => '<div class="seg" role="group" aria-label="Locality">' + Object.keys(LOCS).map((k) =>
    '<button type="button" class="' + (D.loc() === k ? 'on' : '') + '" data-act="dash-loc" data-loc="' + k + '" aria-pressed="' + (D.loc() === k) + '">' + LOCS[k] + '</button>').join('') + '</div>';
  PSY.acts['dash-loc'] = (el) => { D.setLoc(el.getAttribute('data-loc')); PSY.refresh(); };

  D.plural = (n, one, many) => n + ' ' + (n === 1 ? one : (many || one + 's'));
  D.word = (n) => ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'][n] || String(n);
  D.cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  D.curRoot = () => { const h = Array.from(document.querySelectorAll('#view .host')).find((x) => x.style.display !== 'none'); return h && h.shadowRoot; };
  /* keyboard: Enter / Space on a role=button|link element clicks it (the shell wires clicks only) */
  D.keys = (root) => root.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = e.target.closest && e.target.closest('[role="button"][tabindex],[role="link"][tabindex]');
    if (t && root.contains(t)) { e.preventDefault(); t.click(); }
  });

  /* ================= 2 · per-case fields ================= */
  const EX = {
    'R-0416': { win: 'Nov 2 – Jan 29', dueH: 504, st: '7 h' },
    'R-0411': { win: 'Sep 14 – Nov 10', dueH: 60, st: '3 h' },
    'R-0408': { win: 'Oct 22 – Jan 14', dueH: 9, st: '15 h' },
    'R-0402': { win: 'Nov 2 – Feb 5', dueH: 31, st: '2 d' },
    'R-0399': { win: 'Oct 26 – Jan 22', dueH: -72, st: '10 d', late: true },
    'R-0391': { win: 'Nov 2 – Feb 5', dueH: 96, st: '1 d', left: 12 },
    'R-0388': { win: 'Oct 5 – Nov 17', dueH: 984, st: '19 d', left: 41 },
    'R-0384': { win: 'Appeal by Dec 21', dueH: 1440, st: '7 d' },
    'R-0395': { win: 'Aug 10 – Nov 5', dueH: 120, st: '4 d' },
    'R-0380': { win: 'Sep 8 – Dec 8', dueH: 912, st: '—' },
    'R-0377': { win: 'Jul 1 – Dec 31', dueH: 4000, st: '—' },
  };
  const MED = { sign: 'median 1 d', info: 'median 1 d', submitted: 'median 2 d', decision: 'median 6 d', partial: 'median 3 d', p2p: 'median 5 wk', denied: 'median 7 d', appeal: 'median 21 d', active: '' };
  const TONE = { sign: 'b', info: 'y', partial: 'y', submitted: 'n', decision: 'n', p2p: 'n', denied: 'r', appeal: 'y', active: 'g' };
  D.tone = (c) => c.stageTone || TONE[c.stage] || 'n';
  D.payerOf = (c) => PSY.data.payers[c.payer] || { short: c.payer, channel: '', name: c.payer };
  D.withPayers = (c) => ['submitted', 'decision', 'info', 'partial', 'p2p'].includes(c.stage);
  /* same rule as the sidebar badge (PSY.counts().dash) */
  D.needsToday = (c) => !!c.today && ['sign', 'info', 'partial'].includes(c.stage);
  D.cases = () => PSY.allCases().filter(D.inLoc);
  const baseStage = (c) => { const b = PSY.caseById(c.id); return b && b.stage; };

  D.leftOf = (c) => {
    const sub = (c.units && c.units.sub) || '';
    const m = /(\d+)\s+(?:of\s+\d+\s+)?left/.exec(sub);
    if (m) return +m[1];
    const ex = EX[c.id];
    return ex && ex.left != null && baseStage(c) === c.stage ? ex.left : null;
  };
  D.perDay = (c) => { const m = /(\d+)\s*\/\s*day/.exec((c.units && c.units.sub) || ''); return m ? +m[1] : (c.service === 'Outpatient' ? 1 : 3); };
  D.daysLeft = (c) => { const l = D.leftOf(c); return l == null ? null : Math.round(l / D.perDay(c)); };
  D.daysTone = (d) => (d <= 5 ? 'r' : d <= 10 ? 'y' : 'n');
  D.daysLabel = (d) => (d === 1 ? '1 day' : d + ' days');
  /* concurrent SRAs in flight and active/p2p cases show "N left · D days"; everything else shows the ask */
  function showLeft(c) {
    if (D.leftOf(c) == null) return false;
    if (['active', 'p2p'].includes(c.stage)) return true;
    return /^Continued/.test(c.type) && ['sign', 'info', 'submitted', 'decision'].includes(c.stage);
  }
  D.unitsCell = (c) => {
    if (showLeft(c)) return { main: D.leftOf(c) + ' left', sub: c.service === 'Outpatient' ? 'sessions' : D.daysLabel(D.daysLeft(c)) };
    const line = (c.units && c.units.line) || '';
    const m = /^(\d+)(?:\s*→\s*(\d+))?\s*(.*)$/.exec(line);
    if (!m) return { main: '—', sub: '' };
    if (c.stage === 'denied' || c.stage === 'appeal') return { main: m[1] + ' → 0', sub: 'denied' };
    return { main: m[2] ? m[1] + ' → ' + m[2] : m[1], sub: m[3] || '' };
  };
  D.inState = (c) => {
    const ex = EX[c.id] || {};
    const same = baseStage(c) === c.stage;
    return { v: same ? (ex.st || '—') : 'today', med: MED[c.stage] || '', late: same && !!ex.late };
  };
  D.owner = (c) => {
    const s = c.stage;
    if (['sign', 'info', 'partial', 'p2p'].includes(s)) return 'You';
    if (s === 'denied' || s === 'appeal') return 'Guardian';
    if (s === 'submitted' || s === 'decision') return 'Payer';
    if (s === 'active') { const d = D.daysLeft(c); return d != null && d <= 14 && c.service !== 'Outpatient' ? 'You' : 'Site supervisor'; }
    return 'You';
  };
  D.action = (c) => {
    switch (c.stage) {
      case 'sign': return /^Continued/.test(c.type) ? 'Review and sign the concurrent SRA' : 'Review and sign the initial SRA';
      case 'info': return 'Answer the insurer’s question';
      case 'partial': return 'Decide on the offer';
      case 'submitted': return 'Chase the receipt and the decision';
      case 'decision': return 'Wait for the decision';
      case 'p2p': return 'Prepare the call notes';
      case 'denied': return 'Send the appeal letter to the guardian';
      case 'appeal': return 'Wait for the guardian to sign';
      case 'active': { const d = D.daysLeft(c); return d != null && d <= 14 && c.service !== 'Outpatient' ? 'Start the next concurrent SRA' : 'Nothing to do yet'; }
      default: return '—';
    }
  };
  /* one flat row per case for the "All authorizations in flight" table */
  D.row = (c) => {
    const ex = EX[c.id] || {};
    const p = D.payerOf(c); const u = D.unitsCell(c); const st = D.inState(c);
    const clock = c.clock && c.clock.text && c.clock.text !== '—' ? c.clock : null;
    return {
      c, id: c.id, ini: c.ini, school: c.school, payer: p.short, channel: p.channel, service: c.service, code: c.code, type: c.type,
      status: c.stageLabel, tone: D.tone(c), inState: st.v, median: st.med, late: st.late, unitsMain: u.main, unitsSub: u.sub,
      win: ex.win || '—', action: D.action(c), clock, owner: D.owner(c), dueH: ex.dueH == null ? 9999 : ex.dueH,
    };
  };
  D.group = (c) => (D.needsToday(c) ? 0 : (c.needsClinician || ['sign', 'info', 'partial'].includes(c.stage)) ? 1 : (D.withPayers(c) || ['denied', 'appeal'].includes(c.stage)) ? 2 : 3);
  D.sorted = (cs) => cs.map(D.row).sort((a, b) => D.group(a.c) - D.group(b.c) || a.dueH - b.dueH);

  /* referrals (Referrals list screen owns the data; counts follow the sidebar rule: everything not routed to the grant program) */
  D.refStatus = (r) => PSY.state.referral[r.id] || r.status;
  D.refs = () => PSY.data.referrals.filter((r) => D.refStatus(r) !== 'grant' && D.inLoc(r));

  /* ================= 3 · analytics data model ================= */
  const M = (D.model = {});
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const PAYERS = ['sentara', 'anthem', 'aetna', 'humana', 'uhc', 'ffs'];
  M.PAYERS = PAYERS;
  M.payerName = (id) => (PSY.data.payers[id] || {}).short || id;
  M.payerFull = (id) => (PSY.data.payers[id] || {}).name || id;
  M.channel = (id) => (PSY.data.payers[id] || {}).channel || '';
  M.monLabel = (g) => MON[(10 + g) % 12];
  M.monYear = (g) => 2024 + Math.floor((10 + g) / 12);
  M.CUR0 = 12; // global month index of Nov 2025; 23 = Oct 2026; 0..11 = the prior 12 months
  M.REASONS = {
    connected: 'Already connected to other services',
    iep: 'Can be addressed through the IEP',
    outpt: 'Can be addressed in outpatient',
    internal: 'Internalizing symptoms not observable',
    counsel: 'School counseling is not a covered service',
    noprior: 'No documented failed prior service',
    hours: 'Hours do not support 5+ hours a day',
    early: 'Units used early (early discharge questioned)',
  };
  M.HELPS = {
    connected: 'Show what the other service does not cover, and when it ended or was never in place.',
    iep: 'Show the IEP goals are academic and the TDT goals are behavioral and not met at school.',
    outpt: 'Document the outpatient attempt: provider, dates, why it stopped working. The extension asks once and types it in the CNA.',
    internal: 'Add what staff can observe: avoidance, shutdown, missed days, with dates.',
    counsel: 'Name the intervention as clinical treatment by Harvest staff, not school counseling.',
    noprior: 'Fill the prior-services box in the CNA with provider, dates and outcome.',
    hours: 'Attach the school-day schedule and the direct-service hours per day.',
    early: 'Attach the justification: the units were used on a plan, not early by choice.',
  };
  const WEIGHTS = {
    sentara: { hours: 0.36, connected: 0.28, outpt: 0.14, noprior: 0.12, iep: 0.10 },
    anthem: { internal: 0.36, noprior: 0.26, connected: 0.14, outpt: 0.14, counsel: 0.10 },
    aetna: { noprior: 0.38, outpt: 0.30, hours: 0.17, connected: 0.15 },
    humana: { iep: 0.36, connected: 0.30, counsel: 0.20, hours: 0.14 },
    uhc: { counsel: 0.50, outpt: 0.25, iep: 0.25 },
    ffs: { noprior: 1 },
  };
  /* outcome counts [asked as requested, partial, denied], median decision days, info requests, early-discharge resubmits */
  const CUR = {
    sentara: { n: [4, 24, 3], days: 7, info: 5, early: 7 },
    anthem: { n: [14, 27, 3], days: 5, info: 12, early: 5 },
    aetna: { n: [10, 14, 2], days: 7, info: 4, early: 6 },
    humana: { n: [9, 12, 1], days: 6, info: 3, early: 3 },
    uhc: { n: [11, 7, 1], days: 4, info: 2, early: 2 },
    ffs: { n: [3, 1, 0], days: 6, info: 0, early: 0 },
  };
  const PRIOR = {
    sentara: { n: [3, 23, 3], days: 8, info: 6, early: 9 },
    anthem: { n: [11, 26, 3], days: 6, info: 11, early: 8 },
    aetna: { n: [7, 15, 2], days: 8, info: 5, early: 7 },
    humana: { n: [6, 14, 1], days: 7, info: 4, early: 4 },
    uhc: { n: [9, 8, 1], days: 5, info: 3, early: 3 },
    ffs: { n: [2, 2, 1], days: 7, info: 0, early: 0 },
  };
  const MONTH_N_CUR = [13, 12, 14, 15, 11, 7, 4, 9, 17, 16, 15, 13]; // Nov..Oct, 146
  const MONTH_N_PRIOR = [12, 11, 12, 13, 10, 6, 4, 8, 16, 15, 16, 14]; // 137
  /* decisions that belong to the open cases (their ids exist in the prototype, so the drawers can link to the case page) */
  const FIXED = [
    { case: 'R-0402', ini: 'D.W.', age: 14, loc: 'campbell', school: 'HS-1', payer: 'sentara', g: 23, day: 27, type: 'continued', program: 'school', level: 'mid', req: 150, award: 120, outcome: 'partial', days: 7, reason: 'hours' },
    { case: 'R-0391', ini: 'J.O.', age: 14, loc: 'lynchburg', school: 'MS-2', payer: 'aetna', g: 23, day: 29, type: 'initial', early: true, program: 'school', level: 'mid', req: 150, award: 110, outcome: 'partial', days: 7, reason: 'early' },
    { case: 'R-0388', ini: 'T.N.', age: 8, loc: 'campbell', school: 'ES-1', payer: 'sentara', g: 23, day: 9, type: 'initial', program: 'school', level: 'elem', req: 150, award: 65, outcome: 'partial', days: 9, reason: 'connected', p2p: true },
    { case: 'R-0384', ini: 'E.C.', age: 5, loc: 'lynchburg', school: 'ES-3', payer: 'anthem', g: 23, day: 22, type: 'initial', program: 'school', level: 'elem', req: 90, award: 0, outcome: 'denied', days: 5, reason: 'connected' },
    { case: 'R-0395', ini: 'S.B.', age: 11, loc: 'campbell', school: 'MS-1', payer: 'uhc', g: 22, day: 22, type: 'continued', program: 'school', level: 'mid', req: 150, award: 80, outcome: 'partial', days: 4, reason: 'counsel' },
    { case: 'R-0380', ini: 'L.V.', age: 16, loc: 'campbell', school: 'HS-1', payer: 'humana', g: 21, day: 8, type: 'continued', program: 'after', level: 'mid', req: 60, award: 60, outcome: 'asked', days: 6 },
    { case: 'R-0411', ini: 'M.R.', age: 7, loc: 'campbell', school: 'ES-1', payer: 'anthem', g: 22, day: 14, type: 'continued', program: 'school', level: 'elem', req: 150, award: 110, outcome: 'partial', days: 5, reason: 'internal' },
  ];

  function rng(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const r5 = (x) => Math.round(x / 5) * 5;
  const median = (a) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  M.median = median;

  /* integer matrix with given row (payer) and column (month) totals, filled month by month in proportion */
  function allocate(R, C, r) {
    const rem = R.slice(); const out = R.map(() => new Array(C.length).fill(0));
    for (let m = 0; m < C.length; m++) {
      const sr = sum(rem);
      const ideal = rem.map((x) => (sr ? C[m] * x / sr : 0));
      const base = ideal.map(Math.floor);
      let left = C[m] - sum(base);
      const jit = ideal.map(() => r() * 0.01); // drawn up front: the sort must not consume random numbers (engines call comparators differently)
      const idx = ideal.map((v, i) => i).sort((a, b) => (ideal[b] - base[b] + jit[b]) - (ideal[a] - base[a] + jit[a]) || a - b);
      for (let k = 0; left > 0 && k < idx.length * 4; k++) { const i = idx[k % idx.length]; if (base[i] < rem[i]) { base[i]++; left--; } }
      base.forEach((v, i) => { out[i][m] = v; rem[i] -= v; });
    }
    return out;
  }
  /* k decision-day values whose median is exactly t */
  function medSeries(k, t, r) {
    if (k <= 0) return [];
    const d = []; for (let i = 0; i < k; i++) d.push(Math.max(1, r() < 0.36 ? t : t + Math.round((r() - 0.45) * 6)));
    d.sort((a, b) => a - b);
    const mid = Math.floor(k / 2);
    for (let i = 0; i < k; i++) {
      if (k % 2) { if (i < mid) d[i] = Math.min(d[i], t); else if (i > mid) d[i] = Math.max(d[i], t); else d[i] = t; }
      else { d[i] = i < mid ? Math.min(d[i], t) : Math.max(d[i], t); if (i === mid - 1 || i === mid) d[i] = t; }
    }
    return shuffle(d, r);
  }
  function pickReasons(p, k, r) { // k reasons for payer p following its weights (largest remainder), shuffled
    const w = WEIGHTS[p]; const keys = Object.keys(w); const tot = sum(keys.map((x) => w[x]));
    const base = keys.map((x) => Math.floor(k * w[x] / tot)); let left = k - sum(base);
    keys.map((x, i) => i).sort((a, b) => (k * w[keys[b]] / tot - base[b]) - (k * w[keys[a]] / tot - base[a])).forEach((i) => { if (left > 0) { base[i]++; left--; } });
    const out = []; keys.forEach((x, i) => { for (let j = 0; j < base[i]; j++) out.push(x); });
    return shuffle(out, r);
  }
  const FR = { sentara: 0.60, anthem: 0.64, aetna: 0.58, humana: 0.62, uhc: 0.66, ffs: 0.60 };
  const NOISE = [-0.2, -0.12, -0.05, 0.02, 0.09, 0.17, 0.24, -0.16];
  const SCHOOLS = { campbell: { elem: ['ES-1'], mid: ['MS-1', 'HS-1'] }, lynchburg: { elem: ['ES-3'], mid: ['MS-2'] } };
  const LETTERS = 'ABCDEFGHJKLMNPRSTVWZ';

  function build(spec, monthN, g0, seed, fixed, idBase, targetPct, appealOver) {
    const r = rng(seed);
    const recs = fixed.map((f) => Object.assign({ info: false, early: false, p2p: false, appeal: null }, f));
    const left = {}; PAYERS.forEach((p) => { left[p] = { asked: spec[p].n[0], partial: spec[p].n[1], denied: spec[p].n[2] }; });
    fixed.forEach((f) => { left[f.payer][f.outcome]--; });
    const C = monthN.slice(); fixed.forEach((f) => { C[f.g - g0]--; });
    const alloc = allocate(PAYERS.map((p) => sum(Object.values(left[p]))), C, r);
    PAYERS.forEach((p, pi) => {
      const outs = []; ['asked', 'partial', 'denied'].forEach((o) => { for (let i = 0; i < left[p][o]; i++) outs.push(o); });
      const rank = { asked: 2, partial: 1, denied: 0 };
      const keyed = outs.map((o) => ({ o, k: rank[o] + (r() - 0.5) * 12 })).sort((a, b) => a.k - b.k);
      keyed.forEach((x, i) => { outs[i] = x.o; });
      const months = []; alloc[pi].forEach((c, mi) => { for (let i = 0; i < c; i++) months.push(g0 + mi); });
      const mine = outs.map((o, i) => ({ payer: p, outcome: o, g: months[i], day: 1 + Math.floor(r() * 27), info: false, early: false, p2p: false, appeal: null, case: null }));
      const fx = fixed.filter((f) => f.payer === p);
      // early-discharge resubmits: partials first
      let needEarly = spec[p].early - fx.filter((f) => f.early).length;
      shuffle(mine.slice(), r).sort((a, b) => (a.outcome === 'partial' ? 0 : 1) - (b.outcome === 'partial' ? 0 : 1)).forEach((x) => { if (needEarly > 0 && x.outcome !== 'asked') { x.early = true; needEarly--; } });
      shuffle(mine.slice(), r).forEach((x) => { if (needEarly > 0 && x.outcome === 'asked' && !x.early) { x.early = true; needEarly--; } });
      // info requests
      let needInfo = spec[p].info - fx.filter((f) => f.info).length;
      shuffle(mine.slice(), r).sort((a, b) => (a.outcome === 'denied' ? 1 : 0) - (b.outcome === 'denied' ? 1 : 0)).forEach((x) => { if (needInfo > 0) { x.info = true; needInfo--; } });
      const dsr = medSeries(mine.length, spec[p].days, r);
      // reasons: early ones say "early"; the rest follow the payer's weights
      const notAsked = mine.filter((x) => x.outcome !== 'asked');
      const nonEarly = notAsked.filter((x) => !x.early);
      const rs = pickReasons(p, nonEarly.length, r); // the decisions of open cases carry their own reason
      let ri = 0;
      mine.forEach((x, i) => {
        x.days = dsr[i];
        x.type = x.early ? 'initial' : (r() < 0.42 ? 'initial' : 'continued');
        x.loc = r() < 0.5 ? 'campbell' : 'lynchburg';
        x.level = r() < 0.5 ? 'elem' : 'mid';
        const mn = (10 + x.g) % 12; const u = r();
        if (x.early) x.program = 'school';
        else if (mn === 4) x.program = u < 0.8 ? 'summer' : u < 0.9 ? 'after' : 'school';
        else if (mn === 5) x.program = u < 0.55 ? 'summer' : u < 0.7 ? 'after' : 'school';
        else if (mn === 6) x.program = u < 0.3 ? 'summer' : u < 0.42 ? 'after' : 'school';
        else x.program = u < 0.11 ? 'after' : 'school';
        const q = r();
        x.req = x.program === 'school' ? (q < 0.8 ? 150 : q < 0.92 ? 120 : 90) : (q < 0.7 ? 60 : 45);
        if (x.outcome === 'asked') x.award = x.req; else if (x.outcome === 'denied') x.award = 0; else x._f = FR[p] + NOISE[(i * 3 + pi) % NOISE.length];
        if (x.outcome !== 'asked') x.reason = x.early ? 'early' : rs[ri++];
        x.age = x.level === 'elem' ? 5 + Math.floor(r() * 6) : 11 + Math.floor(r() * 6);
        const sc = SCHOOLS[x.loc][x.level]; x.school = sc[Math.floor(r() * sc.length)];
        x.ini = LETTERS[Math.floor(r() * LETTERS.length)] + '.' + LETTERS[Math.floor(r() * LETTERS.length)] + '.';
        recs.push(x);
      });
      // peer-to-peer calls were asked for on about one in five partials or denials
      let needP2p = Math.round(0.2 * (left[p].partial + left[p].denied));
      shuffle(mine.filter((x) => x.outcome !== 'asked'), r).forEach((x) => { if (needP2p > 0) { x.p2p = true; needP2p--; } });
      // one denial was appealed by the guardian (Anthem)
      if (p === 'anthem') { const den = mine.find((x) => x.outcome === 'denied'); if (den) den.appeal = { tried: true, over: !!appealOver }; }
    });
    // unit awards for partials: scale so awarded / requested hits the target
    const synth = recs.filter((x) => x._f != null);
    const totReq = sum(recs.map((x) => x.req));
    const awardAt = (k) => synth.map((x) => Math.max(20, Math.min(x.req - 5, r5(x.req * x._f * k))));
    const totAt = (k) => sum(recs.filter((x) => x._f == null).map((x) => x.award)) + sum(awardAt(k));
    let lo = 0.3, hi = 1.6;
    for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (totAt(mid) / totReq < targetPct / 100) lo = mid; else hi = mid; }
    const aw = awardAt((lo + hi) / 2); synth.forEach((x, i) => { x.award = aw[i]; delete x._f; });
    // ids and dates, oldest first
    recs.sort((a, b) => a.g - b.g || a.day - b.day || PAYERS.indexOf(a.payer) - PAYERS.indexOf(b.payer));
    let n = idBase;
    recs.forEach((x) => { if (!x.case) x.id = 'R-' + String(n++).padStart(4, '0'); else x.id = x.case; x.date = M.monLabel(x.g) + ' ' + x.day; });
    return recs;
  }
  M.records = build(CUR, MONTH_N_CUR, 12, 20261029, FIXED, 237, 71, false).concat(build(PRIOR, MONTH_N_PRIOR, 0, 20251029, [], 100, 66, true));

  /* ---- filters: {period:'12m'|'q', payer:'all'|id, loc:'both'|id, type:'all'|'initial'|'continued'|'early'} ---- */
  M.PERIODS = { '12m': { label: 'Last 12 months', short: '12 months to Oct 2026', cur: [12, 23], prev: [0, 11], vs: 'prior 12 months' }, q: { label: 'This quarter · Aug–Oct', short: 'this quarter (Aug–Oct 2026)', cur: [21, 23], prev: [18, 20], vs: 'last quarter' } };
  M.TYPES = { all: 'All request types', initial: 'Initial SRA', continued: 'Concurrent SRA', early: 'Early discharge + new initial' };
  function pass(x, f) {
    if (f.payer && f.payer !== 'all' && x.payer !== f.payer) return false;
    if (f.loc && f.loc !== 'both' && x.loc !== f.loc) return false;
    if (f.type === 'initial' && x.type !== 'initial') return false;
    if (f.type === 'continued' && x.type !== 'continued') return false;
    if (f.type === 'early' && !x.early) return false;
    return true;
  }
  const inRange = (x, rg) => x.g >= rg[0] && x.g <= rg[1];
  M.select = (f) => M.records.filter((x) => inRange(x, M.PERIODS[f.period || '12m'].cur) && pass(x, f));
  M.prev = (f) => M.records.filter((x) => inRange(x, M.PERIODS[f.period || '12m'].prev) && pass(x, f));
  M.months = (f) => { // always the 12 current months, other filters applied
    const out = []; for (let i = 0; i < 12; i++) out.push({ g: 12 + i, label: M.monLabel(12 + i), year: M.monYear(12 + i), recs: [] });
    M.records.forEach((x) => { if (x.g >= 12 && pass(x, f)) out[x.g - 12].recs.push(x); });
    out.forEach((m) => Object.assign(m, M.stats(m.recs)));
    return out;
  };
  /* hours of unpaid clinical work (placeholder model): screening calls, information requests, peer-to-peers, early-discharge re-intakes, receipt/escalation calls */
  M.HOURS = { screen: 0.65, info: 2, p2p: 3.75, early: 2.5, chase: 0.5 };
  M.stats = (recs) => {
    const n = recs.length;
    const asked = recs.filter((x) => x.outcome === 'asked').length, partial = recs.filter((x) => x.outcome === 'partial').length, denied = recs.filter((x) => x.outcome === 'denied').length;
    const req = sum(recs.map((x) => x.req)), award = sum(recs.map((x) => x.award));
    const days = recs.map((x) => x.days);
    const info = recs.filter((x) => x.info).length, early = recs.filter((x) => x.early).length, p2p = recs.filter((x) => x.p2p).length;
    const past7 = recs.filter((x) => x.days > 7).length;
    const tried = recs.filter((x) => x.appeal && x.appeal.tried).length, over = recs.filter((x) => x.appeal && x.appeal.over).length;
    const a150 = recs.filter((x) => x.req === 150).map((x) => x.award);
    const parts = { screen: Math.round(n * 1.2 * M.HOURS.screen), info: Math.round(info * M.HOURS.info), p2p: Math.round(p2p * M.HOURS.p2p), early: Math.round(early * M.HOURS.early), chase: Math.round(past7 * M.HOURS.chase) };
    const hours = sum(Object.values(parts));
    const pc = (a, b) => (b ? 100 * a / b : null);
    return { n, asked, partial, denied, req, award, medDays: median(days), avgDays: n ? sum(days) / n : null, past7, info, early, p2p, tried, over, med150: median(a150), hours, hourParts: parts,
      pAsked: pc(asked, n), pPartial: pc(partial, n), pDenied: pc(denied, n), pUnits: pc(award, req), pPast7: pc(past7, n), pInfo: pc(info, n) };
  };
  M.byPayer = (f) => PAYERS.filter((p) => !f.payer || f.payer === 'all' || f.payer === p).map((p) => {
    const ff = Object.assign({}, f, { payer: p });
    const cur = M.stats(M.select(ff)); const pr = M.stats(M.prev(ff));
    return Object.assign({ payer: p, prev: pr, trend: cur.n >= 10 && pr.n >= 10 ? cur.pAsked - pr.pAsked : null }, cur);
  });
  M.reasons = (recs) => {
    const c = {}; recs.filter((x) => x.reason).forEach((x) => { c[x.reason] = (c[x.reason] || 0) + 1; });
    const tot = sum(Object.values(c));
    return Object.keys(c).map((k) => ({ key: k, label: M.REASONS[k], n: c[k], pct: tot ? 100 * c[k] / tot : 0 })).sort((a, b) => b.n - a.n);
  };
  /* heat map: rows = payers, columns grouped by request type / program / school level, "all" last */
  M.COLS = [
    { g: 'Request type', k: 'initial', label: 'Initial SRA', test: (x) => x.type === 'initial' },
    { g: 'Request type', k: 'continued', label: 'Concurrent SRA', test: (x) => x.type === 'continued' },
    { g: 'Program', k: 'after', label: 'After-school', test: (x) => x.program === 'after' },
    { g: 'Program', k: 'summer', label: 'Summer', test: (x) => x.program === 'summer' },
    { g: 'School level', k: 'elem', label: 'Elementary', test: (x) => x.level === 'elem' },
    { g: 'School level', k: 'mid', label: 'Middle/High', test: (x) => x.level === 'mid' },
    { g: '', k: 'all', label: 'All cases', test: () => true },
  ];
  M.cell = (recs, col) => { const rs = recs.filter(col.test); const n = rs.length; const asked = rs.filter((x) => x.outcome === 'asked').length; return { n, asked, pct: n ? 100 * asked / n : null, recs: rs }; };
  M.FEW = 10;
  M.fmtPct = (v) => (v == null ? '—' : Math.round(v) + '%');
  M.fmtN = (n) => Number(n).toLocaleString('en-US');
  M.fmtDays = (v) => (v == null ? '—' : (Math.round(v * 10) / 10) + '');

  /* ================= 4 · the authorization model behind Authorizations and PSY.counts() =================
     Computed on each render from PSY.auth / PSY.alerts / PSY.data.r5 / PSY.state and the locality switch, so a status set anywhere
     (Lauris, the extension, Denial Intelligence through PSY.diStatus) changes these numbers. Round 9 adds the count strip's buckets:
     isReview (Pending reviews), isRenewalDue (Renewals due); metrics() returns them as review and renewal. */
  const OV = (D.ov = {});
  const AU = () => PSY.auth;
  const P1 = () => PSY.p1;
  /* the authorizations the platform shows: SRAs only (T.W. once the ISP is processed), this locality, the role's caseload */
  OV.cases = () => PSY.allCases().filter((c) => AU().visible(c.id) && PSY.locOk(c) && (!P1().visibleCase || P1().visibleCase(c.id)));
  /* an authorization is "active" while one is in force (units being used) or the payer approved the request */
  OV.isActive = (id) => { const st = AU().status(id); if (st === 'closed' || st === 'denied') return false; return st === 'approved' || !!AU().units(id).current; };
  OV.PENDING = ['submitted', 'pending', 'recon', 'appeal'];
  OV.isPending = (id) => OV.PENDING.indexOf(AU().status(id)) >= 0;
  /* round 9 "Pending reviews": every request the payer has not decided yet, an open information request included */
  OV.REVIEW = OV.PENDING.concat(['info']);
  OV.isReview = (id) => OV.REVIEW.indexOf(AU().status(id)) >= 0;
  /* days until the authorization in force ends (PSY.p1.unitsOf: an approved appeal runs to the end of the requested period) */
  OV.expDays = (id) => { const x = P1().unitsOf(id); if (!x.end || AU().status(id) === 'closed' || (!x.cur && AU().status(id) !== 'approved')) return null; return P1().daysUntil(x.end); };
  OV.isExpiring = (id) => { const n = OV.expDays(id); return n != null && n >= 0 && n <= OV.SOON; };
  OV.SOON = 30; // "Expiring soon" and "Renewals due": within 30 days (a list threshold, not a payer rule)
  /* "Renewals due": a concurrent SRA whose authorization in force ends soon (or whose units run low) and whose next request has not
     gone to the payer yet (being prepared in Lauris, or not started) */
  OV.isRenewalDue = (id) => {
    const A = AU(); const st = A.status(id); const m = A.meta(id); if (m.kind !== 'continued' || ['draft', 'review', 'ready', 'approved'].indexOf(st) < 0) return false;
    const x = P1().unitsOf(id); if (!x.cur) return false; const n = OV.expDays(id); const soon = n != null && n >= 0 && n <= OV.SOON;
    if (st === 'approved' && m.decision) return soon; // the decided request is the renewal: due again near the end of its period
    return soon || (x.daysLeft != null && x.daysLeft <= P1().lowDays());
  };
  /* disputes (payer decisions being worked) minus the closed ones; filtered by the consumer's locality */
  OV.disputes = () => ((PSY.data.r5 || {}).disputes || []).filter((d) => !P1().disputeClosed(d) && PSY.locOk(PSY.caseView(d.case) || {}));
  OV.disputePayer = (d) => (d.group === 'claim' && d.claim ? d.claim.payer : (PSY.caseView(d.case) || {}).payer);
  OV.disputeService = (d) => AU().meta(d.case).service || 'tdt';
  /* units in dispute: requested − approved. An information request has no decision yet, so nothing is counted. */
  OV.disputedUnits = (d) => {
    const x = (PSY.state.disputes5 || {})[d.id] || {};
    if (d.group === 'claim') return Math.max(0, (d.requested || 0) - (x.approved != null ? x.approved : x.paid != null ? x.paid : d.approved || 0));
    const u = AU().units(d.case); const appr = x.approved != null ? x.approved : u.approved != null ? u.approved : d.approved;
    if (appr == null) return 0;
    return Math.max(0, (u.requested || d.requested || 0) - appr);
  };
  /* disputed units × the rate configured in Settings (PSY.money); never an invented rate */
  OV.exposure = () => {
    const rows = OV.disputes().map((d) => { const units = OV.disputedUnits(d); const e = PSY.money.exposure(units, OV.disputePayer(d), OV.disputeService(d)); return { d, units, e }; }).filter((r) => r.units > 0);
    const priced = rows.filter((r) => r.e.ok); const unpriced = rows.filter((r) => !r.e.ok);
    return { rows, units: rows.reduce((n, r) => n + r.units, 0), amount: priced.reduce((n, r) => n + r.e.amount, 0), priced: priced.length, unpriced: unpriced.length,
      pricedUnits: priced.reduce((n, r) => n + r.units, 0), unpricedUnits: unpriced.reduce((n, r) => n + r.units, 0), ok: priced.length > 0 };
  };
  /* confirmed lost revenue: closed disputes with units not restored (never mixed with the estimate above) */
  OV.lost = () => {
    const rows = ((PSY.data.r5 || {}).disputes || []).filter((d) => P1().disputeClosed(d) && PSY.locOk(PSY.caseView(d.case) || {}))
      .map((d) => { const units = OV.disputedUnits(d); return { d, units, e: PSY.money.exposure(units, OV.disputePayer(d), OV.disputeService(d)) }; }).filter((r) => r.units > 0);
    return { rows, units: rows.reduce((n, r) => n + r.units, 0), amount: rows.filter((r) => r.e.ok).reduce((n, r) => n + r.e.amount, 0), priced: rows.filter((r) => r.e.ok).length };
  };
  OV.metrics = () => {
    const cs = OV.cases(); const ids = (f) => cs.filter((c) => f(c.id)).map((c) => c.id); const st = (k) => (id) => AU().status(id) === k;
    return { active: ids(OV.isActive), pending: ids(OV.isPending), review: ids(OV.isReview), expiring: ids(OV.isExpiring), partial: ids(st('partial')), denied: ids(st('denied')),
      renewal: ids(OV.isRenewalDue), disputes: OV.disputes().map((d) => d.id), exposure: OV.exposure(), lost: OV.lost() };
  };

  /* ---- needs a person: the alerts that ask a person to act (New Cases is gone: referral and intake live in Lauris) ---- */
  const decisionLabel = (a) => (a.action && a.action.label) || 'Review Payer Decision';
  function alertRow(a) {
    const x = a.action || {}; const c = PSY.caseView(a.caseId) || {}; const pay = (PSY.data.payers[c.payer] || {}).short || '';
    const row = { key: a.id, ini: a.ini, caseId: a.caseId, sub: (a.caseId || '') + (pay ? ' · ' + pay : ''), title: a.title, line: a.lines[0] || '', tone: a.tone, rank: a.rank, kind: 'alert' };
    if (x.flow === 'decision') {
      const go = P1().decisionRoute(a.caseId);
      Object.assign(row, { label: decisionLabel(a), attrs: go ? 'data-go="' + esc(go) + '"' : 'data-act="d8-open-case" data-case="' + esc(a.caseId) + '"', kind: 'decision' });
    } else if (x.flow) Object.assign(row, { label: /^Prepare/.test(x.label || '') ? 'Prepare in Lauris' : /^Submit/.test(x.label || '') ? 'Submit in Lauris' : 'Review in Lauris', attrs: P1().enhanceAttrs(a.caseId), kind: 'draft' });
    else if (x.act === 'r5-elig') Object.assign(row, { label: x.label || 'Confirm payer', attrs: 'data-act="r5-elig" data-c="' + esc(x.c || a.laurisId) + '"', kind: 'elig' });
    else Object.assign(row, { label: x.label || 'Open', attrs: PSY.alerts.actAttrs(a) });
    row.dl = a.id.indexOf('elig-') === 0 ? null : P1().deadline(a.caseId);
    row.none = a.id.indexOf('elig-') === 0 ? 'No payer deadline.' : null;
    return row;
  }
  /* alerts that need a person on an authorization (T.W.'s pre-authorization items live in Lauris and the extension), in this locality
     and the role's scope. A payer decision whose dispute is closed needs no one; without the Denials feature, payer decisions are not shown. */
  const inScope = (a) => !!a.caseId && AU().visible(a.caseId) && (!P1().visibleCase || P1().visibleCase(a.caseId));
  OV.needAlerts = () => PSY.alerts.all().filter((a) => a.need && PSY.locOk(PSY.caseView(a.caseId) || {}) && inScope(a) && !((a.action || {}).flow === 'decision' && (() => { const d = P1().disputeOf(a.caseId); return d && P1().disputeClosed(d); })()));
  OV.attention = () => {
    const rows = OV.needAlerts().map(alertRow);
    const t = (r) => (r.dl && r.dl.days != null ? r.dl.days : 9999);
    return rows.sort((a, b) => a.rank - b.rank || t(a) - t(b));
  };

  /* ---- routine: what Psyflo is handling without anyone (cases with no alert that needs a person) ---- */
  const ROUTINE = [
    { k: 'payer', test: (st) => OV.PENDING.indexOf(st) >= 0, one: 'awaiting a payer decision', many: 'awaiting payer decisions', what: '' },
    { k: 'force', test: (st) => st === 'approved', one: 'authorization in force, units and dates monitored', many: 'authorizations in force, units and dates monitored', what: '' },
    { k: 'prep', test: (st) => ['draft', 'review', 'ready'].indexOf(st) >= 0, one: 'request being prepared in Lauris', many: 'requests being prepared in Lauris', what: '' },
    { k: 'other', test: () => true, one: 'decision on file, tracked', many: 'decisions on file, tracked', what: '' },
  ];
  OV.routine = () => {
    const need = new Set(OV.needAlerts().map((a) => a.caseId));
    const items = OV.cases().filter((c) => !need.has(c.id) && AU().status(c.id) !== 'closed').map((c) => {
      const st = AU().status(c.id); const g = ROUTINE.find((x) => x.test(st)); const al = PSY.alerts.all().find((a) => a.caseId === c.id);
      return { c, st, g: g.k, line: (al ? al.lines[0] : g.what) || '' };
    });
    const groups = ROUTINE.map((g) => ({ g, n: items.filter((i) => i.g === g.k).length })).filter((x) => x.n);
    const parts = groups.map((x) => x.n + ' ' + (x.n === 1 ? x.g.one : x.g.many));
    const L = PSY.data.lauris; const elig = L ? L.consumers.filter((con) => con.case && PSY.elig.of(con.id) && PSY.locOk(PSY.caseView(con.case) || {})) : [];
    return { items, parts, text: items.length ? 'Psyflo is handling ' + items.length + ' routine ' + (items.length === 1 ? 'item' : 'items') + ': ' + parts.join(', ') + '.' : 'No routine items in this locality.',
      eligChecked: elig.length, eligChanged: elig.filter((con) => PSY.elig.pending(con.id)).length };
  };
})();
