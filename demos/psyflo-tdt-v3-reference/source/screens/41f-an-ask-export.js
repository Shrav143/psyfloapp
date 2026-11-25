/* Analytics · Ask FLO (the Analytics question panel) and Export Report (round 16, AN16).
   Ask FLO: suggested questions only. Each one applies its own filters (as stated on the answer), computes from the simulated cohort, draws a chart or
   table, gives a short interpretation, names the data source, explains the calculation, and exports the answer as CSV. A question typed in the box is
   not answered (no natural-language understanding is built into this demo): the panel says so and offers the suggested questions.
   Export Report: Patient Outcomes, Payer Performance, Patient Population or a custom report of all three, as PDF or CSV, for the filters on the page.
   Every report has the title, the reporting period, the comparison period, the applied filters, the definitions, the summary figures, the tables and
   the data-completeness notes. Named consumers appear only with clinical access; small groups (under 5) are not shown. The file is saved with
   PSY.download (the downloads capability). */
(function () {
  const PSY = window.PSY; const esc = PSY.esc; const K = () => PSY.cohort; const H = () => PSY.anh; const FB = () => PSY.fb; const SEC = 'analytics-v';
  const MIN = 5; const pct = (n, d) => (d ? Math.round((100 * n) / d) : null); const pcs = (n, d) => (pct(n, d) == null ? '—' : pct(n, d) + '%');
  const cnt = (n) => (n < MIN ? '<' + MIN : String(n));
  /* computed on first use: this file loads before 85c-cohort.js (file order), so nothing here reads PSY.cohort at load time */
  const LAST_MONTH_ = () => { const d = K().TODAY; const f = new Date(d.getFullYear(), d.getMonth() - 1, 1); const t = new Date(d.getFullYear(), d.getMonth(), 0); return { from: f, to: t, label: K().MON[f.getMonth()] + ' ' + f.getFullYear() }; };
  const SIX_ = () => { const t = K().TODAY; const f = new Date(t.getFullYear(), t.getMonth() - 5, 1); const pt = new Date(f.getFullYear(), f.getMonth(), 0); const pf = new Date(pt.getFullYear(), pt.getMonth() - 5, 1); return { now: { from: f, to: t, label: K().short(f) + ' – ' + K().short(t) }, prev: { from: pf, to: pt, label: K().short(pf) + ' – ' + K().short(pt) } }; };
  const DEF = () => K().window(K().filters());
  const allFilters = () => { const F = K().filters(); return F; };
  const filterLine = (F) => { const names = []; if (F.program) names.push(K().PROG(F.program)); if (F.site) names.push(F.site); if (F.payer) names.push(K().PAYN(F.payer)); if (F.clinician) names.push(F.clinician); if (F.dx) names.push(K().DX(F.dx)); if (F.seg && F.seg !== 'all') names.push((K().SEGMENTS.find((x) => x[0] === F.seg) || [0, F.seg])[1]); return names.length ? names.join(' · ') : 'none (all consumers in your view)'; };

  /* ---------- the suggested questions ---------- */
  const Q = [
    { id: 'improve', text: 'What percentage of consumers showed measurable improvement this quarter?', run() {
      const F = allFilters(); const W = { from: new Date(2026, 9, 1), to: K().TODAY, days: 29 }; const pool = K().scope(F).filter((p) => K().inRange(p, W) && K().activeAt(p, W.to));
      const st = pool.map((p) => K().status(p, W.to)); const m = st.filter((s) => s.n >= 2); const imp = m.filter((s) => s.status === 'improving');
      const rows = [['Measure', 'Value', 'Numerator', 'Denominator']].concat([['Consumers showing improvement', pcs(imp.length, m.length), String(imp.length), String(m.length)]]);
      const bars = [{ label: 'Improving', value: imp.length, text: String(imp.length) }, { label: 'Other with two or more assessments', value: m.length - imp.length, text: String(m.length - imp.length) }];
      return { title: 'Measurable improvement this quarter', period: 'Oct 1 – ' + K().short(K().TODAY) + ', 2026 (this quarter so far)', chart: H().hbars(bars, { lw: 230, max: Math.max(1, m.length) }),
        text: pcs(imp.length, m.length) + ' of the ' + m.length + ' active consumers with two or more assessments showed a latest reading at least 10% below their first. This is a pattern in the simulated cohort, not a measure of treatment effect.',
        source: 'Assessment readings (primary instrument per consumer), active consumers on ' + K().short(K().TODAY) + '. Filters applied: ' + filterLine(F) + '.', calc: 'Improving ÷ active consumers with two or more readings. Improving = latest reading at least 10% below the first reading on the same instrument.', rows }; } },
    { id: 'partial', text: 'Which payer had the highest partial approval rate?', run() {
      const F = allFilters(); const W = DEF(); const all = K().requests(F, W); const pays = ['aetna', 'anthem', 'humana', 'sentara', 'uhc'].map((k) => { const l = all.filter((r) => r.payer === k); const dec = l.filter((r) => r.decided && r.approved != null); const par = dec.filter((r) => r.status === 'partial').length; return { k, n: dec.length, par, rate: pct(par, dec.length) }; }).filter((x) => x.n >= MIN).sort((a, b) => b.rate - a.rate);
      const top = pays[0]; const rows = [['Payer', 'Partial approval rate', 'Partially approved', 'Decided requests']].concat(pays.map((x) => [K().PAYN(x.k), x.rate + '%', String(x.par), String(x.n)]));
      return { title: 'Partial approval rate by payer', period: W.label + ' (decided requests)', chart: H().hbars(pays.map((x) => ({ label: K().PAY(x.k), value: x.rate, text: x.rate + '% · n = ' + x.n })), { lw: 120, max: 100 }),
        text: top ? K().PAYN(top.k) + ' had the highest partial approval rate: ' + top.rate + '% of its ' + top.n + ' decided requests. Payers with fewer than five decided requests are not ranked.' : 'No payer has five or more decided requests in this period.',
        source: 'Authorization requests submitted in the period, decided requests only. Filters applied: ' + filterLine(F) + '.', calc: 'Partially approved ÷ decided requests (approved, partial, denied). Pending requests are excluded.', rows }; } },
    { id: 'adhd', text: 'How many consumers with ADHD received coping-skills interventions last month?', run() {
      const F = Object.assign({}, allFilters(), { dx: '' }); const W = { from: LAST_MONTH_().from, to: LAST_MONTH_().to, days: 30 }; const adhdPool = K().scope(F).filter((p) => p.dx === 'adhd' || p.dx2.indexOf('adhd') >= 0);
      const inCare = adhdPool.filter((p) => K().inRange(p, W)); const got = new Set(); adhdPool.forEach((p) => p.ivs.forEach((x) => { if (!x.observed && x.k === 'coping' && x.d >= W.from && x.d <= W.to) got.add(p.id); }));
      const rows = [['Measure', 'Value', 'Numerator', 'Denominator'], ['Consumers with ADHD (primary or secondary) who received coping-skills practice', pcs(got.size, inCare.length), String(got.size), String(inCare.length)]];
      return { title: 'Coping-skills interventions for consumers with ADHD, ' + LAST_MONTH_().label, period: K().short(W.from) + ' – ' + K().short(W.to) + ', ' + W.to.getFullYear(), chart: H().hbars([{ label: 'Received coping-skills practice', value: got.size, text: cnt(got.size) }, { label: 'In care, no coping-skills entry', value: Math.max(0, inCare.length - got.size), text: cnt(Math.max(0, inCare.length - got.size)) }], { lw: 230, max: Math.max(1, inCare.length) }),
        text: got.size + ' consumers with ADHD (primary or secondary) have a delivered coping-skills entry in ' + LAST_MONTH_().label + ', out of ' + inCare.length + ' in care that month.',
        source: 'Delivered intervention entries (AI-extracted from progress notes; observation-only entries excluded), picklist name “Coping skills practice”. Program, location, payer and clinician filters applied: ' + filterLine(F) + '.', calc: 'Distinct consumers with at least one delivered coping-skills entry in the month, ÷ consumers with ADHD in care in the month.', rows }; } },
    { id: 'anx', text: 'Which interventions are most commonly documented for consumers with anxiety?', run() {
      const F = Object.assign({}, allFilters(), { dx: '' }); const W = DEF(); const pool = K().scope(F).filter((p) => (p.dx === 'anx' || p.dx2.indexOf('anx') >= 0) && K().inRange(p, W));
      const ivs = K().ivsIn(F, W).filter((x) => x.dx === 'anx' || (x.dx2 || []).indexOf('anx') >= 0);
      const c = {}; ivs.forEach((x) => { c[x.name] = c[x.name] || { n: 0, pids: new Set() }; c[x.name].n++; c[x.name].pids.add(x.pid); });
      const list = Object.keys(c).map((k) => ({ k, n: c[k].n, p: c[k].pids.size })).sort((a, b) => b.n - a.n);
      const rows = [['Intervention (approved picklist)', 'Documented entries', 'Consumers']].concat(list.map((x) => [x.k, String(x.n), String(x.p)]));
      return { title: 'Interventions documented for consumers with anxiety', period: W.label, chart: H().hbars(list.slice(0, 6).map((x) => ({ label: x.k, value: x.n, text: x.n + ' · ' + x.p + ' consumers' })), { lw: 230, max: Math.max(1, ...list.slice(0, 6).map((x) => x.n)) }),
        text: list.length ? 'The most documented intervention for consumers with anxiety in this period is “' + list[0].k + '” (' + list[0].n + ' entries, ' + list[0].p + ' consumers). ' + pool.length + ' consumers with an anxiety category are in care.' : 'No delivered interventions are documented for consumers with an anxiety category in this period.',
        source: 'Delivered intervention entries for consumers with an anxiety category (primary or secondary); AI-extracted, with confidence and review status on Patient Population.', calc: 'Count of delivered entries by intervention name, and distinct consumers, for consumers with an anxiety category in care in the period.', rows }; } },
    { id: 'interrupt', text: 'How many consumers experienced authorization-related service interruptions?', run() {
      const F = allFilters(); const W = DEF(); const weeks = K().weeksIn(F, W); const ids = new Set(); let wk = 0;
      weeks.forEach((w) => { const p = K().get(w.pid); if (!p) return; const first = p.auths.filter((a) => a.decided).map((a) => a.decided).sort((a, b) => a - b)[0]; if (!first || w.w < first) return; if (!p.auths.some((a) => a.cover && w.w >= a.cover[0] && w.w <= a.cover[1])) { wk++; ids.add(p.id); } });
      const rows = [['Measure', 'Value'], ['Consumers with a service week after a decision and no approved coverage', String(ids.size)], ['Service weeks with no approved coverage', String(wk)]];
      return { title: 'Authorization-related service interruptions', period: W.label, chart: H().hbars([{ label: 'Consumers affected', value: ids.size, text: cnt(ids.size) }, { label: 'Service weeks without coverage', value: wk, text: String(wk) }], { lw: 230, max: Math.max(1, wk, ids.size) }),
        text: ids.size + ' consumers had service weeks after their first decision with no approved coverage on that day, across ' + wk + ' weeks. Each one needs a look at the renewal timing.',
        source: 'Weekly service records and authorization coverage periods (approved or overturned, 90 days from the decision). Filters applied: ' + filterLine(F) + '.', calc: 'Distinct consumers with at least one service week, after their first decision, that no approved coverage period includes.', rows }; } },
    { id: 'population', text: 'How has our consumer population changed over the past six months?', run() {
      const F = allFilters(); const cur = K().scope(F).filter((p) => K().inRange(p, SIX_().now)); const prev = K().scope(F).filter((p) => K().inRange(p, SIX_().prev));
      const act = (pool, d) => pool.filter((p) => K().activeAt(p, d)).length; const adm = (pool, W) => pool.filter((p) => p.enroll >= W.from && p.enroll <= W.to).length; const dis = (pool, W) => pool.filter((p) => p.end && p.end >= W.from && p.end <= W.to).length;
      const rows = [['Measure', 'Last six months (' + SIX_().now.label + ')', 'Six months before (' + SIX_().prev.label + ')']];
      rows.push(['Consumers in care', String(cur.length), String(prev.length)]); rows.push(['Active on the last day', String(act(K().scope(F), SIX_().now.to)), String(act(K().scope(F), SIX_().prev.to))]); rows.push(['New admissions', String(adm(K().scope(F), SIX_().now)), String(adm(K().scope(F), SIX_().prev))]); rows.push(['Discharges', String(dis(K().scope(F), SIX_().now)), String(dis(K().scope(F), SIX_().prev))]);
      K().DXS.forEach((d) => { const a = cur.filter((p) => p.dx === d.k).length, b = prev.filter((p) => p.dx === d.k).length; rows.push(['Primary category: ' + d.label + ' (share in care)', pcs(a, cur.length), pcs(b, prev.length)]); });
      return { title: 'Consumer population: last six months against the six months before', period: SIX_().now.label + ' against ' + SIX_().prev.label, chart: H().hbars([{ label: 'Admissions', value: adm(K().scope(F), SIX_().now), text: String(adm(K().scope(F), SIX_().now)) }, { label: 'Admissions, six months before', value: adm(K().scope(F), SIX_().prev), text: String(adm(K().scope(F), SIX_().prev)) }, { label: 'Discharges', value: dis(K().scope(F), SIX_().now), text: String(dis(K().scope(F), SIX_().now)) }, { label: 'Discharges, six months before', value: dis(K().scope(F), SIX_().prev), text: String(dis(K().scope(F), SIX_().prev)) }], { lw: 200, max: Math.max(1, adm(K().scope(F), SIX_().now), adm(K().scope(F), SIX_().prev)) }),
        text: 'In the last six months ' + cur.length + ' consumers were in care, against ' + prev.length + ' in the six months before: ' + adm(K().scope(F), SIX_().now) + ' admissions and ' + dis(K().scope(F), SIX_().now) + ' discharges, against ' + adm(K().scope(F), SIX_().prev) + ' admissions and ' + dis(K().scope(F), SIX_().prev) + ' discharges. Category shares are in the table.',
        source: 'Enrollment and discharge dates and primary categories for the simulated cohort. Filters applied: ' + filterLine(F) + '.', calc: 'Consumers in care = enrolled on or before the period end and not discharged before its start. Shares are of consumers in care.', rows }; } },
  ];
  const UNSUPPORTED = 'This demo answers the suggested questions only. A question typed here is not understood (no natural-language reading is built in), so no answer is given. Choose one of the suggested questions, or use the custom data point in FLO.';

  /* ---------- Ask FLO panel ---------- */
  function askList() {
    const qs = Q.map((q) => '<button type="button" class="an-qb" data-act="an-q" data-q="' + q.id + '">' + esc(q.text) + '</button>').join('');
    return '<p class="an-note">Suggested questions for this demo. Each one applies its own period and filters and shows the data behind it.</p><div class="an-q">' + qs + '</div>' +
      '<div class="an-free"><label class="fb-f"><span>Another question</span><input class="fb-s" type="text" data-an="free-q" placeholder="Type a question" aria-label="Another question" style="max-width:none;width:100%"></label><button type="button" class="btn o s" data-act="an-free">Ask</button></div>' +
      '<div data-an="free-msg" role="status" class="an-note"></div>' + (PSY.can('flow') && PSY.flow && PSY.flow.open ? '<p class="an-note">For a custom data point, <button type="button" class="an-lnk" data-act="an-flow">open FLO</button>.</p>' : '');
  }
  function ask() { PSY.ui.modal({ wide: true, title: 'Ask FLO · analytics questions', sub: 'Suggested questions over the simulated cohort', body: askList(), actions: [{ label: 'Close' }] }); }
  function answer(id) {
    const q = Q.find((x) => x.id === id); if (!q) return;
    const a = q.run(); const csv = a.rows; const csvBtn = '<button type="button" class="btn o s" data-act="an-q-csv" data-q="' + q.id + '">Export this answer (CSV)</button>';
    const body = '<div class="an-ans"><h3>' + esc(a.title) + '</h3><div class="an-note">Period: ' + esc(a.period) + '</div>' + a.chart + '<p>' + esc(a.text) + '</p><div class="an-src"><b>Data source.</b> ' + esc(a.source) + '<br><b>Calculation.</b> ' + esc(a.calc) + '</div>' + csvBtn + '</div>';
    PSY.ui.modal({ wide: true, title: 'Ask FLO · ' + q.text, sub: '', body, actions: [{ label: 'Back to questions', onClick: () => { ask(); return false; } }, { label: 'Close' }] });
  }
  PSY.anSec.ask = { open: ask };

  /* ---------- CSV and PDF ---------- */
  const csvCell = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csvOf = (rows) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  PSY.acts['an-q'] = (el) => answer(el.getAttribute('data-q'));
  PSY.acts['an-free'] = () => { const r = PSY.activeRoot(); const inp = document.querySelector('#modal [data-an="free-q"]'); const txt = inp ? inp.value.trim() : ''; const msg = document.querySelector('#modal [data-an="free-msg"]'); if (msg) msg.textContent = txt ? UNSUPPORTED : 'Type a question, or choose a suggested one.'; return undefined; };
  PSY.acts['an-q-csv'] = (el) => { const q = Q.find((x) => x.id === el.getAttribute('data-q')); if (!q) return; const a = q.run(); PSY.download('analytics-' + q.id + '.csv', csvOf(a.rows), { type: 'text/csv' }); };

  /* report builders: each returns { title, period, comparison, filters, defs, summary: [[label, value]], tables: [{ h, head, rows, note }], notes } */
  function outcomesReport(F, W, clin) {
    const pool = K().scope(F); const o = PSY.anSec.outcomes.outcomesFor(pool, W); const pr = W.cmp ? PSY.anSec.outcomes.outcomesFor(pool, W.prev) : null;
    const summary = [['Active consumers', o.active], ['Consumers showing improvement', pcs(o.improving, o.measured) + ' (' + o.improving + ' of ' + o.measured + ')'], ['Consumers maintaining progress', pcs(o.maintaining, o.measured) + ' (' + o.maintaining + ' of ' + o.measured + ')'], ['Consumers requiring clinical review', o.review], ['Assessment completion', o.due ? Math.min(100, Math.round((100 * o.done) / o.due)) + '% (' + o.done + ' of ' + o.due + ')' : '—'], ['Average treatment duration (days)', o.avgDur == null ? '—' : o.avgDur + ' (n = ' + o.dis + ')']];
    const tables = [{ h: 'Summary with the previous period', head: ['Measure', 'Period', 'Previous period'], rows: [['Active consumers', o.active, pr ? pr.active : '—'], ['Showing improvement', o.improving + ' of ' + o.measured, pr ? pr.improving + ' of ' + pr.measured : '—'], ['Requiring review', o.review, pr ? pr.review : '—']] }];
    const stat = {}; o.sts.forEach((x) => { stat[x.s.status] = (stat[x.s.status] || 0) + 1; });
    tables.push({ h: 'Outcome trend (consumers, active)', head: ['Outcome trend', 'Consumers'], rows: ['worsening', 'overdue', 'insufficient', 'stable', 'improving'].map((k) => [k, cnt(stat[k] || 0)]) });
    if (clin) tables.push({ h: 'Consumers requiring review (initials)', head: ['Consumer', 'Program', 'Primary category', 'Trend', 'Assigned clinician'], rows: o.sts.filter((x) => x.s.status === 'worsening' || x.s.status === 'overdue').map((x) => [x.p.ini, K().PROG(x.p.program), K().DX(x.p.dx), x.s.status, x.p.clinician]) });
    return { summary, tables, notes: clin ? 'Consumer rows are shown for clinicians with clinical record access only.' : 'Consumer rows are not included: clinical record access is needed to show them. Counts under ' + MIN + ' are not shown.' };
  }
  function payerReport(F, W) {
    const all = K().requests(F, W); const s = PSY.anSec.payer.summ(all); const sumRows = [['Requests', s.n], ['Full approval', pcs(s.approved, s.decided)], ['Partial approval', pcs(s.partial, s.decided)], ['Full denial', pcs(s.denied, s.decided)], ['Pending', s.pending], ['Average turnaround (days)', s.avgTat == null ? '—' : s.avgTat.toFixed(1)], ['Units requested (decided)', Math.round(s.reqU)], ['Units approved (decided)', Math.round(s.apprU)], ['Units not approved (decided)', Math.round(s.notU)]];
    const payers = ['aetna', 'anthem', 'humana', 'sentara', 'uhc'].map((k) => { const x = PSY.anSec.payer.summ(all.filter((r) => r.payer === k)); return [K().PAYN(k), x.n, pcs(x.approved, x.decided), pcs(x.partial, x.decided), pcs(x.denied, x.decided), x.avgTat == null ? '—' : x.avgTat.toFixed(1), Math.round(x.reqU), Math.round(x.apprU)]; });
    const reasons = K().REASONS.map((r) => [r.label, all.filter((x) => x.reason === r.k).length]).sort((a, b) => b[1] - a[1]);
    return { summary: sumRows, tables: [{ h: 'Payer comparison', head: ['Payer', 'Requests', 'Full approval', 'Partial approval', 'Denial rate', 'Avg turnaround (days)', 'Requested units', 'Approved units'], rows: payers }, { h: 'Denial reasons', head: ['Reason', 'Requests'], rows: reasons }], notes: 'Simulated cohort figures, not real payer statistics. Revenue lines are shown only when a reimbursement rate is set in Settings; estimated exposure, confirmed denied and recovered are never added together. Pending requests are excluded from rates.' };
  }
  function populationReport(F, W) {
    const cur = K().scope(F).filter((p) => K().inRange(p, W)); const act = cur.filter((p) => K().activeAt(p, W.to));
    const sumRows = [['Consumers in care', cnt(cur.length)], ['Active on the last day', cnt(act.length)], ['New admissions', cnt(K().scope(F).filter((p) => p.enroll >= W.from && p.enroll <= W.to).length)], ['Discharges', cnt(K().scope(F).filter((p) => p.end && p.end >= W.from && p.end <= W.to).length)]];
    const dx = K().DXS.map((d) => [d.label, cnt(cur.filter((p) => p.dx === d.k).length), pcs(cur.filter((p) => p.dx === d.k).length, cur.length)]);
    const svc = K().SERVICES.map((s) => { const r = K().weeksIn(F, W).filter((x) => x.svc === s.k); return [s.label, new Set(r.map((x) => x.pid)).size >= MIN ? new Set(r.map((x) => x.pid)).size : '<' + MIN, Math.round(r.reduce((a, x) => a + x.min, 0) / 60)]; });
    const iv = K().IVS.map((k) => { const r = K().ivsIn(F, W).filter((x) => x.k === k.k); return [k.name, cnt(new Set(r.map((x) => x.pid)).size), cnt(r.length), r.filter((x) => x.review !== 'confirmed').length]; });
    return { summary: sumRows, tables: [{ h: 'Diagnosis (primary category)', head: ['Category', 'Consumers', 'Share of consumers in care'], rows: dx }, { h: 'Service utilization (service hours, not authorization units)', head: ['Service', 'Consumers receiving', 'Service hours'], rows: svc }, { h: 'Interventions (delivered entries, AI-extracted)', head: ['Intervention', 'Consumers receiving', 'Documented entries', 'Pending clinician review'], rows: iv }], notes: 'Counts under ' + MIN + ' are not shown. Observation-only entries are not counted as interventions. AI-extracted entries carry confidence and review status in the application.' };
  }
  function reportOf(type, F, W, clin) {
    const parts = type === 'outcomes' ? [['Patient Outcomes', outcomesReport(F, W, clin)]] : type === 'payer' ? [['Payer Performance', payerReport(F, W)]] : type === 'population' ? [['Patient Population', populationReport(F, W)]]
      : [['Patient Outcomes', outcomesReport(F, W, clin)], ['Payer Performance', payerReport(F, W)], ['Patient Population', populationReport(F, W)]];
    const title = type === 'custom' ? 'Custom filtered report · Patient Outcomes, Payer Performance and Patient Population' : parts[0][0] + ' report';
    return { title, period: W.label, comparison: W.cmp ? W.prevLabel : 'not compared', filters: filterLine(F), parts, defs: 'Consumers are unique people; enrollments count admissions and discharges; service hours come from encounter minutes; authorization units are never service hours; full, partial and denial rates use decided requests; improvement = latest reading at least 10% below the first (demo rule, to confirm).', footer: 'Simulated cohort · fictional consumers (initials only) · not Harvest Outreach Center results' };
  }
  function csvOfReport(R) {
    const rows = [['Report', R.title], ['Reporting period', R.period], ['Comparison period', R.comparison], ['Applied filters', R.filters], ['Definitions', R.defs], ['Note', R.parts.map((p) => p[1].notes).join(' ')], ['Footer', R.footer], []];
    R.parts.forEach((p) => { rows.push(['== ' + p[0] + ' ==']); p[1].summary.forEach((s) => rows.push(s)); rows.push([]); p[1].tables.forEach((t) => { rows.push(['-- ' + t.h + ' --']); rows.push(t.head); t.rows.forEach((r) => rows.push(r)); rows.push([]); }); });
    return csvOf(rows);
  }
  function pdfOf(R) {
    const blocks = [{ kv: [['Reporting period', R.period], ['Comparison period', R.comparison], ['Applied filters', R.filters]] }, { h: 'Definitions and data completeness' }, { note: R.defs }];
    R.parts.forEach((p) => { blocks.push({ pagebreak: true }, { h: p[0] }, { table: { head: ['Summary measure', 'Value'], rows: p[1].summary.map((r) => [String(r[0]), String(r[1])]), widths: [0.6, 0.4] } }); p[1].tables.forEach((t) => { blocks.push({ h: t.h }); blocks.push({ table: { head: t.head, rows: t.rows.map((r) => r.map((x) => String(x))) } }); }); blocks.push({ note: p[1].notes }); });
    return PSY.pdfReport({ title: R.title, subtitle: 'Psyflo analytics · ' + R.period, brand: 'Psyflo', footer: R.footer, stamp: 'Simulated cohort', blocks });
  }
  const exportModal = () => {
    const sel = '<label class="fb-f"><span>Report</span><select class="fb-s" data-an="rep-type" aria-label="Report type" style="max-width:none;width:100%"><option value="outcomes">Patient Outcomes report</option><option value="payer">Payer Performance report</option><option value="population">Patient Population report</option><option value="custom">Custom filtered report (all three)</option></select></label>';
    const fmt = '<fieldset class="an-fmt" style="border:0;padding:0;margin:10px 0"><legend class="an-note">Format</legend><label class="an-sw-l"><input type="radio" name="an-fmt" value="pdf" checked> PDF</label> &nbsp; <label class="an-sw-l"><input type="radio" name="an-fmt" value="csv"> CSV</label></fieldset>';
    const body = '<div class="an-exp">' + sel + fmt + '<p class="an-note">The report uses the filters on this page: ' + esc(filterLine(K().filters())) + ' · ' + esc(K().window(K().filters()).label) + (K().filters().cmp ? ' against ' + esc(K().window(K().filters()).prevLabel) : '') + '.</p></div>';
    PSY.ui.modal({ wide: true, title: 'Export Report', sub: 'Simulated cohort · sample reports for the demo', body, actions: [{ label: 'Cancel' }, { label: 'Generate report', primary: true, onClick: () => { generate(); return false; } }] });
  };
  function generate() {
    const r = document.querySelector('#modal [data-an="rep-type"]'); const f = document.querySelector('#modal input[name="an-fmt"]:checked');
    const type = r ? r.value : 'outcomes'; const fmt = f ? f.value : 'pdf'; const F = K().filters(); const W = K().window(F); const clin = PSY.can('clinicalRecords');
    const R = reportOf(type, F, W, clin); const base = 'psyflo-analytics-' + type + '-' + K().iso(K().TODAY);
    if (fmt === 'csv') PSY.download(base + '.csv', csvOfReport(R), { type: 'text/csv' });
    else PSY.download(base + '.pdf', pdfOf(R), { type: 'application/pdf' });
    PSY.ui.closeModal();
  }
  PSY.anSec.export = { open: exportModal };
  PSY.acts['an-export'] = () => exportModal();
})();
