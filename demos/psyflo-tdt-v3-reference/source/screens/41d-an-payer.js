/* Analytics · Payer Performance (round 16, AN16). Owner of PSY.anSec.payer. Data: the simulated cohort's authorization requests (PSY.cohort.requests).
   It does not duplicate Denial Intelligence: case work (appeals, peer-to-peer, letters) stays there. The section links to it.
   Outcome of a request (one definition everywhere): approved (an appeal that overturned a denial counts as approved), partially approved, denied,
   or pending. Approved + partial + denied + pending = requests in the period, for every payer and in total.
   Rates use decided requests as the denominator; turnaround is submitted → decided; units are authorization units (never service hours).
   Revenue is shown in three separate lines: estimated exposure (units not approved × the configured rate; not every unit would have been delivered),
   confirmed denied (final denials, not appealed or upheld), and recovered (overturned denials). Nothing is shown in dollars without a configured rate.
   State: PSY.state.fb['analytics-v'] = { sec, pm (chart metric), pay (payer detail), ps (table sort), pq (payer filter) }. */
(function () {
  const PSY = window.PSY; const esc = PSY.esc; const K = () => PSY.cohort; const H = () => PSY.anh; const FB = () => PSY.fb; const SEC = 'analytics-v';
  const PAYERS = ['aetna', 'anthem', 'humana', 'sentara', 'uhc'];
  const MIN = 5;
  const pct = (n, d) => (d ? Math.round((100 * n) / d) : null);
  const pcs = (n, d) => (pct(n, d) == null ? '—' : pct(n, d) + '%');
  const fin = (r) => (r.status === 'overturned' ? 'approved' : r.status);

  /* one summary for a list of requests: the four outcomes reconcile to the count */
  function summ(list) {
    const dec = list.filter((r) => r.decided && r.approved != null); const c = (k) => dec.filter((r) => fin(r) === k).length;
    const approved = c('approved'), partial = c('partial'), denied = c('denied'); const pending = list.length - dec.length;
    const tat = dec.map((r) => K().diff(r.submitted, r.decided)); const avgTat = tat.length ? tat.reduce((a, b) => a + b, 0) / tat.length : null;
    const reqU = dec.reduce((a, r) => a + r.requested, 0); const apprU = dec.reduce((a, r) => a + r.approved, 0);
    const appeals = list.filter((r) => r.appeal && (r.appeal.outcome === 'overturned' || r.appeal.outcome === 'upheld'));
    const won = appeals.filter((r) => r.appeal.outcome === 'overturned').length; const open = list.filter((r) => r.appeal && r.appeal.outcome === 'open').length;
    const ren = list.filter((r) => r.kind === 'concurrent' && r.onTime != null); const onTime = ren.filter((r) => r.onTime).length;
    return { n: list.length, approved, partial, denied, pending, decided: dec.length, avgTat, reqU, apprU, notU: reqU - apprU, appeals: appeals.length, won, open, ren: ren.length, onTime, dec };
  }
  const months = (W) => { const out = []; let m = new Date(W.from.getFullYear(), W.from.getMonth(), 1); while (m <= W.to) { const e = new Date(m.getFullYear(), m.getMonth() + 1, 0); out.push({ k: K().mkey(m), label: K().MON[m.getMonth()], from: new Date(Math.max(+m, +W.from)), to: new Date(Math.min(+e, +W.to)) }); m = new Date(m.getFullYear(), m.getMonth() + 1, 1); } return out; };
  const inM = (d, m) => d >= m.from && d <= m.to;
  const delta = (a, b, pts) => { if (a == null || b == null) return null; const d = pts ? Math.round(a - b) : +(a - b).toFixed(1); return (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(d) + (pts ? ' pts' : '') + ' vs previous period'; };
  const money = (k, pay, svc) => PSY.money.exposure(k, pay, svc);

  /* ---------- summary KPIs ---------- */
  function kpis(all, prev, W) {
    const s = summ(all); const p = prev ? summ(prev) : null;
    const d = (a, b, pts) => (p ? delta(a, b, pts) : null);
    const rate = (x) => pct(x, s.decided); const rate0 = p ? pct(p.approved, p.decided) : null;
    const tipDen = 'Denominator: ' + s.decided + ' decided requests (' + s.pending + ' still pending are excluded).';
    const arr = [
      H().kpi({ key: 'requests', label: 'Total authorization requests', value: String(s.n), change: p ? delta(s.n, p.n) : null, good: null, sub: s.pending + ' pending decision', def: 'Requests submitted in the period, all outcomes.', tip: ['Requests submitted in the period (initial and concurrent). Each request counts once.', 'Approved ' + s.approved + ' · partial ' + s.partial + ' · denied ' + s.denied + ' · pending ' + s.pending + ' = ' + s.n + '.'] }),
      H().kpi({ key: 'full', label: 'Full approval rate', value: pcs(s.approved, s.decided), change: p ? d(rate(s.approved), rate0, true) : null, good: true, sub: s.approved + ' of ' + s.decided + ' decided', def: 'Approved in full (after any overturned appeal) ÷ decided requests.', tip: ['Approved ÷ decided requests. ' + tipDen] }),
      H().kpi({ key: 'partial', label: 'Partial approval rate', value: pcs(s.partial, s.decided), change: p ? d(rate(s.partial), pct(p.partial, p.decided), true) : null, good: false, sub: s.partial + ' of ' + s.decided + ' decided', def: 'Partially approved ÷ decided requests.', tip: ['Partially approved (fewer units than requested) ÷ decided requests. ' + tipDen] }),
      H().kpi({ key: 'denial', label: 'Full denial rate', value: pcs(s.denied, s.decided), change: p ? d(rate(s.denied), pct(p.denied, p.decided), true) : null, good: false, sub: s.denied + ' of ' + s.decided + ' decided', def: 'Denied (no units approved, not overturned) ÷ decided requests.', tip: ['Denied and not overturned on appeal ÷ decided requests. ' + tipDen] }),
      H().kpi({ key: 'turnaround', label: 'Average decision turnaround', value: s.avgTat == null ? '—' : s.avgTat.toFixed(1) + ' days', change: p && p.avgTat != null && s.avgTat != null ? delta(+s.avgTat.toFixed(1), +p.avgTat.toFixed(1)) : null, good: null, sub: 'Submitted → decided, n = ' + s.decided, def: 'Average days from submission to the payer’s decision.', tip: ['Calendar days from submission to decision, for decided requests.', 'n = ' + s.decided + '.'] }),
      H().kpi({ key: 'notu', label: 'Units not approved', value: fmtN(s.notU), change: p ? delta(s.notU, p.notU) : null, good: null, sub: 'of ' + fmtN(s.reqU) + ' requested (decided requests)', def: 'Requested units minus approved units, decided requests.', tip: ['Requested minus approved, for decided requests.', 'Authorization units, not service hours. Not every unit would have been delivered.'] }),
      H().kpi({ key: 'overturn', label: 'Appeals overturned', value: pcs(s.won, s.won + (s.appeals - s.won)), change: null, good: true, sub: s.won + ' overturned · ' + (s.appeals - s.won) + ' upheld · ' + s.open + ' open', def: 'Overturned ÷ resolved appeals (open appeals are excluded).', tip: ['Overturned ÷ (overturned + upheld) appeals resolved in the period.', 'Open appeals: ' + s.open + ' (not in the denominator).'] }),
      H().kpi({ key: 'renewal', label: 'Renewals submitted on time', value: pcs(s.onTime, s.ren), change: null, good: true, sub: s.onTime + ' of ' + s.ren + ' concurrent reviews', def: 'Concurrent requests submitted on or before the current approval’s end date.', tip: ['Concurrent requests submitted on or before the end of the previous approved period ÷ concurrent requests with a previous approval.', 'n = ' + s.ren + '.'] }),
    ];
    return '<div class="an-kpis" data-an="pay-kpis">' + arr.join('') + '</div>' + H().note('Requests and decisions come from the simulated cohort. Full, partial and denial rates use decided requests only; pending requests are shown separately so the outcomes always add up to the total.');
  }
  const fmtN = (n) => Math.round(n).toLocaleString('en-US');

  /* ---------- payer comparison (sortable, filterable; a click opens the detail) ---------- */
  const COLS = [['name', 'Payer'], ['n', 'Requests'], ['full', 'Full approval'], ['partial', 'Partial approval'], ['denial', 'Denial rate'], ['tat', 'Avg turnaround'], ['req', 'Requested units'], ['appr', 'Approved units'], ['overturn', 'Appeal overturn']];
  function comparison(all) {
    const q = (FB().get(SEC, 'pq', '') || '').toLowerCase(); const sort = FB().get(SEC, 'ps', 'n') || 'n'; const sel = FB().get(SEC, 'pay', '');
    let rows = PAYERS.map((k) => { const list = all.filter((r) => r.payer === k); const s = summ(list); return { k, name: K().PAYN(k), short: K().PAY(k), s, full: pct(s.approved, s.decided), partial: pct(s.partial, s.decided), denial: pct(s.denied, s.decided), tat: s.avgTat, req: s.reqU, appr: s.apprU, overturn: pct(s.won, s.won + (s.appeals - s.won)) }; });
    if (q) rows = rows.filter((r) => (r.name + ' ' + r.short).toLowerCase().indexOf(q) >= 0);
    const val = (r) => ({ name: r.short, n: r.s.n, full: r.full, partial: r.partial, denial: r.denial, tat: r.tat, req: r.req, appr: r.appr, overturn: r.overturn })[sort];
    rows.sort((a, b) => { if (sort === 'name') return a.short.localeCompare(b.short); const x = val(a), y = val(b); return (y == null ? -1 : y) - (x == null ? -1 : x); });
    const head = COLS.map((c) => '<th class="' + (c[0] === 'name' ? '' : 'n') + '"><button type="button" data-act="an-psort" data-v="' + c[0] + '" aria-sort="' + (sort === c[0] ? 'descending' : 'none') + '">' + esc(c[1]) + (sort === c[0] ? ' ▾' : '') + '</button></th>').join('');
    const body = rows.map((r) => '<tr class="' + (sel === r.k ? 'an-row-on' : '') + '" data-c="' + esc(r.k) + '"><td><button type="button" class="an-id" data-act="an-payer" data-v="' + esc(r.k) + '" aria-pressed="' + (sel === r.k) + '">' + esc(r.name) + '</button></td>' +
      '<td class="n">' + r.s.n + '</td><td class="n">' + (r.full == null ? '—' : r.full + '%') + '</td><td class="n">' + (r.partial == null ? '—' : r.partial + '%') + '</td><td class="n">' + (r.denial == null ? '—' : r.denial + '%') + '</td><td class="n">' + (r.tat == null ? '—' : r.tat.toFixed(1) + ' d') + '</td><td class="n">' + fmtN(r.req) + '</td><td class="n">' + fmtN(r.appr) + '</td><td class="n">' + (r.overturn == null ? '—' : r.overturn + '%') + '</td></tr>').join('');
    return H().card('comparison', 'Payer comparison', rows.length + ' payers', '<div class="an-fbar2"><label class="fb-f"><span>Find a payer</span><input class="fb-s" type="search" data-input="an-pfilter" value="' + esc(FB().get(SEC, 'pq', '')) + '" placeholder="Name" aria-label="Find a payer"></label></div>' +
      '<div class="an-tw"><table class="an-table" data-an="payer-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
      H().note('Simulated cohort figures, not real payer statistics. Click a payer for its monthly trend and denial reasons. Sort by a column with its header; filter by name.'));
  }

  /* ---------- the detail of one payer ---------- */
  function detail(all, W, pay) {
    if (!pay) return H().card('payer-detail', 'Payer detail', '', H().empty('Choose a payer in the comparison table to see its monthly trend, denial reasons and the Denial Intelligence link.'));
    const list = all.filter((r) => r.payer === pay); const s = summ(list);
    const ms = months(W); const parts = ms.map((m) => { const x = summ(list.filter((r) => inM(r.submitted, m))); return { label: m.label, parts: [{ v: x.approved, c: H().C.good, name: 'Approved' }, { v: x.partial, c: H().C.warn, name: 'Partial' }, { v: x.denied, c: H().C.bad, name: 'Denied' }, { v: x.pending, c: H().C.barLt, name: 'Pending' }], tipLines: [K().PAY(pay) + ' · ' + m.label, x.n + ' requests', 'Approved ' + x.approved + ' · partial ' + x.partial + ' · denied ' + x.denied + ' · pending ' + x.pending] }; });
    const reasons = {}; list.filter((r) => r.reason).forEach((r) => { reasons[r.reason] = (reasons[r.reason] || 0) + 1; });
    const top = Object.keys(reasons).map((k) => ({ label: (K().REASONS.find((x) => x.k === k) || {}).label || k, value: reasons[k] })).sort((a, b) => b.value - a.value).slice(0, 4);
    return H().card('payer-detail', 'Payer detail · ' + K().PAYN(pay), W.label, '<div class="an-grid"><div><div class="an-hb-h">Requests by month and outcome</div>' + H().stacked(parts, { max: Math.max(1, ...parts.map((p) => p.parts.reduce((a, q) => a + q.v, 0))) }) + '</div>' +
      '<div><div class="an-hb-h">Top denial reasons (this payer)</div>' + (top.length ? H().hbars(top.map((t) => ({ label: t.label, value: t.value, color: H().C.bad })), { lw: 230, max: top[0].value }) : H().empty('No denial reasons recorded in this period.')) + '</div></div>' +
      '<div class="an-mt" style="margin-top:6px"><div class="an-mrow"><span>Requests · decided · pending</span><b>' + s.n + ' · ' + s.decided + ' · ' + s.pending + '</b></div><div class="an-mrow"><span>Full approval · partial · denial</span><b>' + pcs(s.approved, s.decided) + ' · ' + pcs(s.partial, s.decided) + ' · ' + pcs(s.denied, s.decided) + '</b></div><div class="an-mrow"><span>Units not approved (decided)</span><b>' + fmtN(s.notU) + ' of ' + fmtN(s.reqU) + '</b></div></div>' +
      '<div class="an-acts" style="margin-top:8px"><button type="button" class="btn p s" data-act="an-di" data-v="' + esc(pay) + '" data-an="investigate">Investigate in Denial Intelligence</button></div>' +
      H().note('Denial Intelligence works on the demo consumer cases (not this simulated cohort). The button opens it filtered to this payer.'));
  }

  /* ---------- authorization trends: one metric at a time ---------- */
  const PM = [['volume', 'Authorization volume'], ['outcomes', 'Full, partial and denied'], ['units', 'Requested vs approved units'], ['kind', 'Initial vs concurrent'], ['tat', 'Turnaround by payer'], ['renew', 'Renewal performance']];
  function trends(all, W) {
    const m = FB().get(SEC, 'pm', 'volume') || 'volume'; const cur = PM.some((x) => x[0] === m) ? m : 'volume'; const ms = months(W); const xs = ms.map((x) => x.label); const MIN = MIN_N();
    let body = '';
    if (cur === 'volume') body = H().vcols(ms.map((x) => { const n = all.filter((r) => inM(r.submitted, x)).length; return { label: x.label, value: n, tipLines: [x.label, n + ' requests submitted'] }; }), { aria: 'Requests submitted by month' });
    if (cur === 'outcomes') body = H().stacked(ms.map((x) => { const s = summ(all.filter((r) => inM(r.submitted, x))); return { label: x.label, parts: [{ v: s.approved, c: H().C.good }, { v: s.partial, c: H().C.warn }, { v: s.denied, c: H().C.bad }, { v: s.pending, c: H().C.barLt }], tipLines: [x.label, 'Approved ' + s.approved + ' · partial ' + s.partial + ' · denied ' + s.denied + ' · pending ' + s.pending] }; })) + H().legend([['Approved', H().C.good], ['Partial', H().C.warn], ['Denied', H().C.bad], ['Pending', H().C.barLt]]);
    if (cur === 'units') body = H().lines([{ name: 'Requested units', color: H().C.bar, pts: ms.map((x) => { const s = summ(all.filter((r) => inM(r.submitted, x))); return { y: s.decided >= MIN ? s.reqU : null, n: s.decided }; }) }, { name: 'Approved units', color: H().C.good, pts: ms.map((x) => { const s = summ(all.filter((r) => inM(r.submitted, x))); return { y: s.decided >= MIN ? s.apprU : null, n: s.decided }; }) }], { xs, min: 0, fmt: (v) => fmtN(v), aria: 'Requested and approved units by month' });
    if (cur === 'kind') { const row = (k, label) => { const s = summ(all.filter((r) => r.kind === k)); return { label, value: pct(s.approved, s.decided) || 0, text: pcs(s.approved, s.decided) + ' full · n = ' + s.decided, tipLines: [label, 'Full approval ' + pcs(s.approved, s.decided), 'Decided ' + s.decided] }; };
      body = H().hbars([row('initial', 'Initial reviews'), row('concurrent', 'Concurrent reviews')], { lw: 150, max: 100 }) + H().note('Full approval rate for each kind of review (decided requests). A difference is an association in this data, not a cause.'); }
    if (cur === 'tat') { const rows = PAYERS.map((k) => { const s = summ(all.filter((r) => r.payer === k)); return { label: K().PAY(k), value: s.avgTat || 0, text: s.avgTat == null ? '—' : s.avgTat.toFixed(1) + ' d · n = ' + s.decided, tipLines: [K().PAYN(k), 'Average ' + (s.avgTat == null ? '—' : s.avgTat.toFixed(1) + ' days'), 'Decided ' + s.decided] }; }); body = H().hbars(rows, { lw: 120 }); }
    if (cur === 'renew') body = H().lines([{ name: 'On-time renewals', color: H().C.good, pts: ms.map((x) => { const s = summ(all.filter((r) => inM(r.submitted, x))); return { y: s.ren >= MIN ? Math.round((100 * s.onTime) / s.ren) : null, n: s.ren }; }) }], { xs, min: 0, max: 100, fmt: (v) => Math.round(v) + '%', aria: 'Share of renewals submitted on time, by month' }) + H().note('Concurrent requests submitted on or before the end of the previous approval, by month of submission.');
    return H().card('trends', 'Authorization trends', W.label, H().chips('Chart metric', PM, cur, 'an-pmetric') + '<div data-an="pay-chart" data-metric="' + cur + '">' + body + '</div>');
  }
  const MIN_N = () => MIN;

  /* ---------- denial patterns ---------- */
  function denials(all, W) {
    const dn = all.filter((r) => r.reason); const reasons = K().REASONS.map((x) => { const list = dn.filter((r) => r.reason === x.k); const payers = {}; list.forEach((r) => { payers[r.payer] = (payers[r.payer] || 0) + 1; }); return { k: x.k, label: x.label, cat: x.cat, n: list.length, payers, svc: {} }; }).sort((a, b) => b.n - a.n);
    const total = dn.length; const topMax = Math.max(1, reasons[0] ? reasons[0].n : 1);
    const reasonRows = reasons.map((x) => ({ label: x.label, value: x.n, key: x.k, act: 'an-reason', on: false, tipLines: [x.label, x.n + ' requests', 'Payers: ' + (Object.keys(x.payers).map((k) => K().PAY(k) + ' ' + x.payers[k]).join(', ') || 'none')] }));
    const byPayer = PAYERS.map((k) => { const list = all.filter((r) => r.payer === k); const dd = list.filter((r) => r.status === 'denied' || r.status === 'partial' || r.status === 'overturned'); const top = (() => { const c = {}; dd.forEach((r) => { if (r.reason) c[r.reason] = (c[r.reason] || 0) + 1; }); const best = Object.keys(c).sort((a, b) => c[b] - c[a])[0]; return best ? (K().REASONS.find((x) => x.k === best) || {}).label : '—'; })(); return { k, denied: list.filter((r) => fin(r) === 'denied').length, partial: list.filter((r) => fin(r) === 'partial').length, top, n: list.length }; });
    const bySvc = K().SERVICES.filter((s) => ['tdt', 'php', 'iop', 'ind'].indexOf(s.k) >= 0).map((s) => { const list = all.filter((r) => r.svc === s.k && r.decided); const t = list.filter((r) => fin(r) !== 'approved').length; return { label: s.label, value: pct(t, list.length) || 0, text: pcs(t, list.length) + ' · n = ' + list.length, tipLines: [s.label, t + ' partial or denied of ' + list.length + ' decided'] }; });
    const doc = dn.filter((r) => (K().REASONS.find((x) => x.k === r.reason) || {}).cat === 'Documentation').length;
    const partialBySvc = bySvc; const appeals = { won: all.filter((r) => r.appeal && r.appeal.outcome === 'overturned').length, upheld: all.filter((r) => r.appeal && r.appeal.outcome === 'upheld').length, open: all.filter((r) => r.appeal && r.appeal.outcome === 'open').length };
    const reasonCard = H().card('reasons', 'Top denial reasons', total + ' partial or denied requests with a reason', (total ? H().hbars(reasonRows, { lw: 280, max: topMax }) + H().note('Reasons as recorded in the payer letters for the simulated requests. Select a reason to see the payers.') : H().empty('No denial reasons in this period.')) +
      '<div class="an-acts"><button type="button" class="btn p s" data-act="an-di" data-v="" data-an="investigate-all">Investigate in Denial Intelligence</button></div>');
    const docCard = H().card('docs', 'Documentation deficiencies', doc + ' requests', '<div class="an-mt"><div class="an-mrow"><span>Requests with a documentation reason</span><b>' + doc + ' of ' + total + ' (' + pcs(doc, total) + ')</b></div>' + reasons.filter((x) => x.cat === 'Documentation').map((x) => '<div class="an-mrow"><span>' + esc(x.label) + '</span><b>' + x.n + '</b></div>').join('') + '</div>' + H().note('A documentation reason means the payer found the record insufficient for that request. It is a pattern, not a finding about any clinician.'));
    const payerCard = H().card('denial-payers', 'Denial frequency by payer', '', '<div class="an-tw"><table class="an-table" data-an="denial-payers-table"><thead><tr><th>Payer</th><th class="n">Denied</th><th class="n">Partial</th><th>Most common reason</th></tr></thead><tbody>' + byPayer.map((x) => '<tr><td>' + esc(K().PAYN(x.k)) + '</td><td class="n">' + x.denied + '</td><td class="n">' + x.partial + '</td><td>' + esc(x.top) + '</td></tr>').join('') + '</tbody></table></div>');
    const svcCard = H().card('denial-svc', 'Denial and partial approval by service', '', H().hbars(bySvc, { lw: 200, max: 100 }) + H().note('Partially approved or denied as a share of decided requests for each service.'));
    const appCard = H().card('appeals', 'Appeal outcomes', appeals.won + appeals.upheld + appeals.open + ' appeals', '<div class="an-mt"><div class="an-mrow"><span>Overturned</span><b>' + appeals.won + '</b></div><div class="an-mrow"><span>Upheld</span><b>' + appeals.upheld + '</b></div><div class="an-mrow"><span>Open</span><b>' + appeals.open + '</b></div><div class="an-mrow"><span>Overturn rate (resolved)</span><b>' + pcs(appeals.won, appeals.won + appeals.upheld) + '</b></div></div>');
    return '<div class="an-grid">' + reasonCard + docCard + '</div><div class="an-grid">' + payerCard + svcCard + '</div><div class="an-grid one">' + appCard + '</div>';
  }

  /* ---------- revenue and service impact ---------- */
  function revenue(all, F, W) {
    const dec = all.filter((r) => r.decided && r.approved != null);
    const reqU = dec.reduce((a, r) => a + r.requested, 0); const apprU = dec.reduce((a, r) => a + r.approved, 0); const notU = reqU - apprU;
    const priced = (list, units) => { let amt = 0, ok = 0; list.forEach((r) => { const u = units(r); if (u <= 0) return; const e = money(u, r.payer, r.svc); if (e.ok) { amt += e.amount; ok++; } }); return { amt, ok, n: list.filter((r) => units(r) > 0).length }; };
    const est = priced(dec, (r) => r.requested - r.approved);
    const finalDen = dec.filter((r) => fin(r) === 'denied' && !(r.appeal && r.appeal.outcome === 'open'));
    const confirmed = priced(finalDen, (r) => r.requested);
    const recovered = priced(all.filter((r) => r.appeal && r.appeal.outcome === 'overturned' && r.status === 'overturned' && r.requested > 0 && (r.decided)), (r) => r.requested);
    const gaps = (() => { const ids = new Set(); const weeks = K().weeksIn(F, W); let uncovered = 0; weeks.forEach((w) => { const p = K().get(w.pid); if (!p) return; const first = p.auths.filter((a) => a.decided).map((a) => a.decided).sort((a, b) => a - b)[0]; if (!first || w.w < first) return; const day = w.w; if (!p.auths.some((a) => a.cover && day >= a.cover[0] && day <= a.cover[1])) { uncovered++; ids.add(p.id); } }); return { consumers: ids.size, weeks: uncovered }; })();
    const tile = (lab, v, sub, tipL) => '<div class="an-tile"' + H().tip(tipL || []) + '><span class="lbl">' + esc(lab) + '</span><b>' + esc(v) + '</b><span>' + esc(sub) + '</span></div>';
    const rate = (x) => x;
    return H().card('revenue', 'Revenue and service impact', W.label, '<div class="an-dl">' +
      tile('Requested units', fmtN(reqU), 'decided requests') + tile('Approved units', fmtN(apprU), 'decided requests') + tile('Units not approved', fmtN(notU), 'authorization units, not service hours') +
      tile('Estimated exposure', est.ok ? PSY.money.fmt(est.amt) : 'Rate not set', est.ok ? 'units not approved × configured rate · priced ' + est.ok + ' of ' + est.n + ' requests' : PSY.money.UNAVAILABLE, ['Estimated exposure: units not approved × the rate set in Settings. Not every unit would have been delivered or reimbursed.']) +
      tile('Confirmed denied', confirmed.ok ? PSY.money.fmt(confirmed.amt) : 'Rate not set', 'final denials (not appealed, or appeal upheld) · ' + confirmed.n + ' requests', ['Confirmed denied: requested units of final denials × the configured rate.']) +
      tile('Recovered after appeal', recovered.ok ? PSY.money.fmt(recovered.amt) : 'Rate not set', 'overturned denials · ' + recovered.n + ' requests', ['Recovered: requested units of denials overturned on appeal × the configured rate. Partial awards that were later overturned are not priced here.']) +
      tile('Service gaps', String(gaps.consumers) + ' consumers', gaps.weeks + ' service weeks with no approved coverage, after the first decision', ['Authorization-related service interruptions: service weeks after a consumer’s first decision with no approved coverage on that day.']) +
      '</div>' + H().note('Three different things, shown apart: estimated exposure (not confirmed), confirmed denied (final decisions), and recovered (overturned on appeal). Rates come from Settings → Units and rates; nothing is priced without one. Service gaps are counted from the simulated service records.'));
  }

  /* ---------- payer insights (rule-based; associations, not causes) ---------- */
  function insights(all, prev, W) {
    const out = []; const pw = W.prev; const lab = K().short(pw.from) + ' – ' + K().short(pw.to);
    PAYERS.forEach((k) => { const a = summ(all.filter((r) => r.payer === k)); const b = prev ? summ(prev.filter((r) => r.payer === k)) : null;
      if (!b || a.decided < 8 || b.decided < 8) return; const pa = pct(a.partial, a.decided), pb = pct(b.partial, b.decided); if (Math.abs(pa - pb) >= 10) out.push({ text: K().PAYN(k) + ' partial approvals were ' + pa + '% of decided requests, ' + (pa > pb ? 'up' : 'down') + ' from ' + pb + '% in the comparison period.', ev: 'Partial ' + a.partial + ' of ' + a.decided + ' decided (this period) against ' + b.partial + ' of ' + b.decided + ' (comparison period ' + lab + ').', n: a.decided, next: 'Investigate in Denial Intelligence', payer: k }); });
    const ini = summ(all.filter((r) => r.kind === 'initial')), con = summ(all.filter((r) => r.kind === 'concurrent'));
    if (ini.avgTat != null && con.avgTat != null && ini.decided >= 8 && con.decided >= 8 && Math.abs(con.avgTat - ini.avgTat) >= 3) out.push({ text: 'Concurrent reviews took ' + con.avgTat.toFixed(1) + ' days on average, against ' + ini.avgTat.toFixed(1) + ' days for initial requests.', ev: 'Decided: concurrent ' + con.decided + ', initial ' + ini.decided + ' (this period).', n: con.decided + ini.decided, next: 'Check renewal submission dates with the clinical team.' });
    const top = (list) => { const c = {}; list.forEach((r) => { if (r.reason) c[r.reason] = (c[r.reason] || 0) + 1; }); const k = Object.keys(c).sort((a, b) => c[b] - c[a])[0]; return k ? { k, n: c[k], total: list.filter((r) => r.reason).length } : null; };
    const t1 = top(all), t0 = prev ? top(prev) : null;
    if (t1 && t0 && t1.total >= 8 && t0.total >= 8) { const s1 = Math.round((100 * t1.n) / t1.total), s0 = t0.k === t1.k ? Math.round((100 * t0.n) / t0.total) : null; if (s0 != null && s1 - s0 >= 10) out.push({ text: 'The most common denial reason was more frequent: “' + (K().REASONS.find((x) => x.k === t1.k) || {}).label + '” now accounts for ' + s1 + '% of reasons, up from ' + s0 + '%.', ev: t1.n + ' of ' + t1.total + ' reasons (this period) against ' + t0.n + ' of ' + t0.total + ' (comparison period).', n: t1.total, next: 'Review documentation for that reason with the clinical team.' }); }
    const svcs = K().SERVICES.filter((s) => ['tdt', 'php', 'iop', 'ind'].indexOf(s.k) >= 0).map((s) => { const x = summ(all.filter((r) => r.svc === s.k)); return { k: s.k, label: s.label, pct: pct(x.partial, x.decided), n: x.decided }; }).filter((x) => x.n >= 8 && x.pct != null);
    const all0 = summ(all); const overall = pct(all0.partial, all0.decided); const hi = svcs.sort((a, b) => b.pct - a.pct)[0];
    if (hi && overall != null && hi.pct - overall >= 10) out.push({ text: hi.label + ' had the highest share of reduced-unit (partial) approvals: ' + hi.pct + '%, against ' + overall + '% overall.', ev: 'Partial share among decided requests for this service (n = ' + hi.n + ').', n: hi.n, next: 'Compare the requested units with the service records for this service.' });
    const body = out.length ? '<div class="an-ins">' + out.slice(0, 4).map((x) => '<div class="an-in"><p>' + esc(x.text) + '</p><span class="ev">Supporting data: ' + esc(x.ev) + ' · Sample size n = ' + x.n + (prev ? ' · Comparison period: ' + esc(lab) : '') + '</span><div class="an-acts"><button type="button" class="btn o s" ' + (x.payer ? 'data-act="an-di" data-v="' + esc(x.payer) + '"' : 'data-act="an-insight-next" data-v="' + esc(x.next) + '"') + '>' + esc(x.next) + '</button></div></div>').join('') + '</div>' : H().empty('No insight meets the sample-size rule (at least 8 decided requests in each period) for this filter.');
    return H().card('insights', 'Payer insights', out.length ? out.length + ' pattern' + (out.length === 1 ? '' : 's') : '', body + H().note('Insights describe patterns in the simulated data. They show an association, not a cause, and each needs review by the team before any change.'));
  }

  /* ---------- the section ---------- */
  PSY.anSec.payer = {
    summ,
    html(ctx) {
      const F = ctx.F; const W = ctx.W;
      const all = K().requests(F, W); const prev = W.cmp ? K().requests(F, W.prev) : null;
      const pay = FB().get(SEC, 'pay', '');
      return kpis(all, prev, W) +
        '<div class="an-grid one">' + comparison(all) + '</div>' +
        '<div class="an-grid">' + trends(all, W) + detail(all, W, pay) + '</div>' +
        '<div class="an-grid one">' + denials(all, W) + '</div>' +
        '<div class="an-grid one">' + revenue(all, F, W) + '</div>' +
        '<div class="an-grid one">' + insights(all, prev, W) + '</div>';
    },
  };

  /* ---------- acts ---------- */
  const refocus = (sel) => { const r = PSY.activeRoot(); const n = r && r.querySelector(sel); if (n) { try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); } } };
  PSY.acts['an-payer'] = (el) => { const v = el.getAttribute('data-v'); FB().set(SEC, 'pay', FB().get(SEC, 'pay', '') === v ? '' : v); PSY.refresh(); refocus('[data-act="an-payer"][data-v="' + v + '"]'); };
  PSY.acts['an-psort'] = (el) => { FB().set(SEC, 'ps', el.getAttribute('data-v')); PSY.refresh(); refocus('[data-act="an-psort"][data-v="' + el.getAttribute('data-v') + '"]'); };
  PSY.acts['an-pfilter'] = (el) => { FB().set(SEC, 'pq', el.value); PSY.refresh(); refocus('[data-input="an-pfilter"]'); };
  PSY.acts['an-pmetric'] = (el) => { FB().set(SEC, 'pm', el.getAttribute('data-v')); PSY.refresh(); refocus('[data-act="an-pmetric"][data-v="' + el.getAttribute('data-v') + '"]'); };
  /* Investigate in Denial Intelligence: the payer filter is applied on the Denial Intelligence page and its queue is shown */
  PSY.acts['an-di'] = (el) => {
    const v = el.getAttribute('data-v') || ''; FB().set('di', 'payer', v); PSY.go('denials');
    PSY.ui.toast(v ? 'Denial Intelligence filtered to ' + K().PAY(v) + '.' : 'Denial Intelligence opened.');
  };
  PSY.acts['an-insight-next'] = (el) => { PSY.ui.toast(el.getAttribute('data-v') + ' (demo: recorded as a next step for the team).'); };
  PSY.acts['an-reason'] = (el) => {
    const k = el.getAttribute('data-v'); const reason = K().REASONS.find((x) => x.k === k) || { label: k };
    const all = K().requests(K().filters(), K().window(K().filters())).filter((r) => r.reason === k);
    const byP = {}; all.forEach((r) => { byP[r.payer] = (byP[r.payer] || 0) + 1; });
    const rows = Object.keys(byP).sort((a, b) => byP[b] - byP[a]).map((p) => '<tr><td>' + esc(K().PAYN(p)) + '</td><td class="n">' + byP[p] + '</td></tr>').join('');
    PSY.ui.modal({ wide: true, title: reason.label, sub: all.length + ' requests in the period', body: '<div class="an-tw"><table class="an-table"><thead><tr><th>Payer</th><th class="n">Requests with this reason</th></tr></thead><tbody>' + (rows || '<tr><td colspan="2">None in this period.</td></tr>') + '</tbody></table></div>' + H().note('Counts from the simulated cohort. Denial Intelligence holds the demo consumer cases.'),
      actions: [{ label: 'Close' }, { label: 'Investigate in Denial Intelligence', primary: true, onClick: () => { FB().set('di', 'payer', ''); PSY.go('denials'); } }] });
  };
})();
