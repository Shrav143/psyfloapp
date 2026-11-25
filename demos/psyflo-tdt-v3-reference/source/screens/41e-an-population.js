/* Analytics · Patient Population (round 16, AN16). Owner of PSY.anSec.population. Data: the simulated cohort (PSY.cohort).
   Counting rules, stated on the page: consumers are unique people in care in the period; episodes are enrollments; encounters are service records
   (a weekly record can hold several encounters); service hours come from encounter minutes and are never authorization units.
   Demographic groups with fewer than K.MIN_N (5) consumers are not shown: they read "<5" and are not drawn. Intervention counts use delivered
   interventions only: observation-only entries are excluded, and AI-extracted entries carry their confidence and review status.
   Clinical content (named consumers, the pending-review list) needs clinicalRecords; counts and shares are shown to everyone with analytics access.
   State: PSY.state.fb['analytics-v'] = { sec, dxd (diagnosis drill-down), ivs (intervention drill-down) }. */
(function () {
  const PSY = window.PSY; const esc = PSY.esc; const K = () => PSY.cohort; const H = () => PSY.anh; const FB = () => PSY.fb; const SEC = 'analytics-v';
  const MIN = 5; const pct = (n, d) => (d ? Math.round((100 * n) / d) : null); const pcs = (n, d) => (pct(n, d) == null ? '—' : pct(n, d) + '%');
  const delta = (a, b, unit) => { if (a == null || b == null) return null; const d = a - b; return (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(+d.toFixed(unit === '%' ? 0 : 1)) + (unit || ''); };
  const cnt = (n) => (n < MIN ? '<' + MIN : String(n));
  const inM = (d, m) => d >= m.from && d <= m.to;
  const months = (W) => { const out = []; let m = new Date(W.from.getFullYear(), W.from.getMonth(), 1); while (m <= W.to) { const e = new Date(m.getFullYear(), m.getMonth() + 1, 0); out.push({ k: K().mkey(m), label: K().MON[m.getMonth()], from: new Date(Math.max(+m, +W.from)), to: new Date(Math.min(+e, +W.to)) }); m = new Date(m.getFullYear(), m.getMonth() + 1, 1); } return out; };
  const QUARTERS = [['Q3 25', new Date(2025, 6, 1), new Date(2025, 8, 30)], ['Q4 25', new Date(2025, 9, 1), new Date(2025, 11, 31)], ['Q1 26', new Date(2026, 0, 1), new Date(2026, 2, 31)], ['Q2 26', new Date(2026, 3, 1), new Date(2026, 5, 30)], ['Q3 26', new Date(2026, 6, 1), new Date(2026, 8, 30)], ['Q4 26', new Date(2026, 9, 1), new Date(2026, 11, 31)]];

  /* the population of one window */
  function pop(F, W) {
    const pool = K().scope(F); const care = pool.filter((p) => K().inRange(p, W)); const active = care.filter((p) => K().activeAt(p, W.to));
    const adm = pool.filter((p) => p.enroll >= W.from && p.enroll <= W.to); const dis = pool.filter((p) => p.end && p.end >= W.from && p.end <= W.to);
    const avgLen = dis.length ? Math.round(dis.reduce((a, p) => a + K().diff(p.enroll, p.end), 0) / dis.length) : null;
    const progs = {}; active.forEach((p) => { progs[p.program] = 1; });
    return { pool, care, active, adm, dis, avgLen, progs: Object.keys(progs).length, served: care.length };
  }

  /* ---------- A. population summary ---------- */
  function summary(F, W) {
    const cur = pop(F, W); const prev = W.cmp ? pop(F, W.prev) : null;
    const tile = (k, lab, v, p0, tipL, sub) => H().kpi({ key: k, label: lab, value: String(v), change: prev ? delta(v, p0) : null, good: null, sub, tip: tipL, def: '' });
    const arr = [
      tile('served', 'Total consumers served', cur.served, prev && prev.served, ['Unique consumers in care at any point in the period (enrolled and not discharged before the period began).', 'Counts consumers, not episodes or encounters.'], 'unique consumers'),
      tile('active', 'Active consumers', cur.active.length, prev && prev.active.length, ['Enrolled and not discharged on the last day of the period.', 'Unique consumers.'], 'on ' + K().short(W.to)),
      tile('adm', 'New admissions', cur.adm.length, prev && prev.adm.length, ['Consumers enrolled in the period (one enrollment per consumer here).', 'Episodes of care.'], 'enrolled in the period'),
      tile('dis', 'Discharges', cur.dis.length, prev && prev.dis.length, ['Consumers discharged in the period.', 'Episodes of care.'], 'discharged in the period'),
      tile('len', 'Average length of treatment', cur.avgLen == null ? '—' : cur.avgLen + ' days', prev && prev.avgLen != null ? prev.avgLen : null, ['Average days from enrollment to discharge, for discharges in the period.', 'Only shown with five or more discharges; otherwise "<5".'], cur.dis.length >= MIN ? 'n = ' + cur.dis.length : 'fewer than ' + MIN + ' discharges'),
      tile('progs', 'Active programs', cur.progs, prev && prev.progs, ['Programs with at least one active consumer on the last day of the period.', 'Programs, not consumers.'], 'with active consumers'),
    ].map((x) => x.replace(/<div class="an-kv">([^<]*)<\/div>/, (m, v) => '<div class="an-kv">' + v + '</div>'));
    const cmp = prev ? '' : '';
    return H().card('pop-summary', 'Population summary', W.label, '<div class="an-kpis" data-an="pop-kpis">' + arr.join('') + '</div>' + H().note('Definitions are on each card: unique consumers, enrollments (admissions and discharges) and service encounters are counted separately. ' + cmp));
  }

  /* ---------- B. demographics ---------- */
  function groupRows(list, keyOf, labelOf, opts) {
    const c = {}; list.forEach((p) => { const k = keyOf(p); if (k == null) return; c[k] = (c[k] || 0) + 1; });
    const keys = Object.keys(c).sort((a, b) => c[b] - c[a]); const rows = keys.filter((k) => c[k] >= MIN).map((k) => ({ label: labelOf(k), value: c[k], text: String(c[k]), tipLines: [labelOf(k), c[k] + ' consumers'] }));
    const small = keys.filter((k) => c[k] < MIN); if (small.length) rows.push({ label: 'Other (each under ' + MIN + ')', value: 0, text: '<' + MIN + ' · not shown', tipLines: ['Groups under ' + MIN + ' are combined and not shown.', small.length + ' groups'] });
    return rows;
  }
  function demographics(F, W) {
    const cur = pop(F, W).care; const n = cur.length;
    const age = K().AGE_BANDS.map((b) => { const k = cur.filter((p) => p.age >= b[1] && p.age <= b[2]).length; return { label: b[0] + ' years', value: k >= MIN ? k : 0, text: cnt(k), tipLines: [b[0] + ' years', cnt(k) + ' consumers'] }; });
    const cards = [
      H().card('age', 'Age distribution', 'n = ' + n, H().hbars(age, { lw: 110, max: Math.max(1, ...age.map((x) => x.value)) }) + H().note('Ages at the end of the period, unique consumers. Bands under ' + MIN + ' are not drawn.')),
      H().card('geo', 'Geographic distribution', 'by county and site', H().hbars(groupRows(cur, (p) => p.county, (k) => k).concat(groupRows(cur, (p) => p.site, (k) => k)), { lw: 190, max: Math.max(1, n) })),
      H().card('insurance', 'Insurance coverage', 'by payer', H().hbars(groupRows(cur, (p) => p.payer, (k) => K().PAYN(k)), { lw: 200, max: Math.max(1, n) }) + H().note('Coverage is the payer on file for each consumer in the period.')),
      H().card('referral', 'Referral sources', 'ranked', H().hbars(groupRows(cur, (p) => p.referral, (k) => k), { lw: 190, max: Math.max(1, n) })),
      H().card('enrol', 'Program enrollment', 'by program', H().hbars(groupRows(cur, (p) => p.program, (k) => K().PROG(k)), { lw: 230, max: Math.max(1, n) })),
      H().card('locations', 'Service locations', 'where consumers are seen', H().hbars(groupRows(cur, (p) => p.site, (k) => k), { lw: 190, max: Math.max(1, n) })),
    ];
    return '<div class="an-grid">' + cards.slice(0, 2).join('') + '</div><div class="an-grid">' + cards.slice(2, 4).join('') + '</div><div class="an-grid">' + cards.slice(4).join('') + '</div>';
  }

  /* ---------- C. diagnosis and clinical needs ---------- */
  function diagnosis(F, W) {
    const cur = pop(F, W).care; const n = cur.length; const dd = FB().get(SEC, 'dxd', '') || '';
    const rows = K().DXS.map((d) => { const k = cur.filter((p) => p.dx === d.k).length; return { label: d.label, value: k, text: cnt(k) + ' · ' + pcs(k, n), key: d.k, act: 'an-dxd', on: dd === d.k, tipLines: [d.label, k + ' consumers as primary · ' + pcs(k, n) + ' of ' + n + ' consumers', 'Select to drill down'] }; });
    const multi = cur.filter((p) => p.dx2.length > 0).length;
    const listCard = H().card('dx', 'Most common primary diagnoses', 'n = ' + n, H().hbars(rows.map((r) => Object.assign(r, { value: r.value >= MIN ? r.value : 0 })), { lw: 200, max: Math.max(1, ...rows.map((r) => r.value)) }) +
      H().note('Diagnostic categories (not billing codes). Select a category to drill down. Categories overlap: a consumer can have a secondary category, so shares can add to more than 100%. Counts under ' + MIN + ' are not drawn.') +
      '<div class="an-mrow"><span>Consumers with more than one documented diagnosis</span><b>' + multi + ' of ' + n + ' (' + pcs(multi, n) + ')</b></div>');
    let drill = H().empty('Select a diagnosis category to see its co-occurring categories, age and program mix, and its trend.');
    if (dd) {
      const d = K().DXS.find((x) => x.k === dd); const grp = cur.filter((p) => p.dx === dd); const g = grp.length;
      const co = K().DXS.filter((x) => x.k !== dd).map((x) => ({ label: x.label, value: grp.filter((p) => p.dx2.indexOf(x.k) >= 0).length, text: cnt(grp.filter((p) => p.dx2.indexOf(x.k) >= 0).length) })).filter((x) => x.value).sort((a, b) => b.value - a.value);
      const ages = K().AGE_BANDS.map((b) => ({ label: b[0], value: grp.filter((p) => p.age >= b[1] && p.age <= b[2]).length })).map((x) => Object.assign(x, { text: cnt(x.value), value: x.value >= MIN ? x.value : 0 }));
      const progs = groupRows(grp, (p) => p.program, (k) => K().PROG(k));
      drill = '<div class="an-grid"><div><div class="an-hb-h">Co-occurring categories (secondary)</div>' + (co.length ? H().hbars(co, { lw: 190, max: Math.max(1, g) }) : H().empty('No co-occurring categories in this view.')) + '</div>' +
        '<div><div class="an-hb-h">Age distribution in this category</div>' + H().hbars(ages, { lw: 90, max: Math.max(1, ...ages.map((x) => x.value)) }) + '<div class="an-hb-h" style="margin-top:10px">Program mix</div>' + H().hbars(progs, { lw: 200, max: Math.max(1, g) }) + '</div></div>' +
        '<div class="an-acts" style="margin-top:8px"><button type="button" class="btn p s" data-act="an-dx-filter" data-v="' + esc(dd) + '">Filter this page to ' + esc(d.label) + '</button><button type="button" class="btn o s" data-act="an-dxd" data-v="' + esc(dd) + '">Close drill-down</button></div>';
    }
    const drillCard = H().card('dx-drill', dd ? 'Drill-down · ' + (K().DXS.find((x) => x.k === dd) || {}).label : 'Drill-down', dd ? 'n = ' + cur.filter((p) => p.dx === dd).length : '', drill);
    const progs = K().PROGRAMS; const byProg = K().DXS.map((d) => '<tr><td>' + esc(d.label) + '</td>' + progs.map((pr) => '<td class="n">' + cnt(cur.filter((p) => p.dx === d.k && p.program === pr[0]).length) + '</td>').join('') + '<td class="n">' + cnt(cur.filter((p) => p.dx === d.k).length) + '</td></tr>').join('');
    const matrix = H().card('dx-prog', 'Diagnosis by program', 'primary category, consumers in care', '<div class="an-tw"><table class="an-table" data-an="dx-prog"><thead><tr><th>Primary category</th>' + progs.map((pr) => '<th class="n">' + esc(K().PROG(pr[0])) + '</th>').join('') + '<th class="n">All</th></tr></thead><tbody>' + byProg + '</tbody></table></div>');
    const qs = QUARTERS.map((q) => { const m = { label: q[0], parts: K().DXS.map((d, i) => ({ v: pop(F, { from: q[1], to: q[2] > K().TODAY ? K().TODAY : q[2], days: 1 }).adm.filter((p) => p.dx === d.k).length, c: H().C.line[i % 6], name: d.label })) }; return m; });
    const trend = H().card('dx-trend', 'Diagnosis trends over time', 'new admissions by quarter (all quarters shown)', H().stacked(qs.map((q) => ({ label: q.label, parts: q.parts, tipLines: [q.label, 'New admissions: ' + q.parts.reduce((a, b) => a + b.v, 0)] })), {}) + H().legend(K().DXS.map((d, i) => [d.label, H().C.line[i % 6]])) + H().note('Quarters are not filtered by the reporting period, so the trend is visible in full. The other filters still apply. Counts under ' + MIN + ' are not drawn.'));
    return '<div class="an-grid">' + listCard + drillCard + '</div><div class="an-grid">' + matrix + trend + '</div>';
  }

  /* ---------- D. service utilization ---------- */
  function services(F, W, Wp) {
    const wk = K().weeksIn(F, W); const wkp = W.cmp ? K().weeksIn(F, Wp) : null;
    const rowsFor = (list) => K().SERVICES.map((s) => { const r = list.filter((x) => x.svc === s.k); const pids = new Set(r.map((x) => x.pid)); const enc = r.reduce((a, x) => a + x.n, 0); const min = r.reduce((a, x) => a + x.min, 0); return { s, pids: pids.size, enc, hrs: min / 60, avgMin: enc ? Math.round(min / enc) : null, weeks: new Set(r.map((x) => x.w.getTime() + ':' + x.pid)).size }; });
    const cur = rowsFor(wk); const prev = wkp ? rowsFor(wkp) : null;
    const body = cur.filter((r) => r.pids || r.enc).map((r) => { const p0 = prev ? prev.find((x) => x.s.k === r.s.k) : null; const ch = p0 && p0.hrs ? Math.round(((r.hrs - p0.hrs) / p0.hrs) * 100) : null;
      return '<tr><td>' + esc(r.s.label) + '</td><td class="n">' + cnt(r.pids) + '</td><td class="n">' + (r.pids >= MIN ? fmtN(r.enc) : '<' + MIN) + '</td><td class="n">' + (r.pids >= MIN ? fmtN(Math.round(r.hrs)) : '<' + MIN) + '</td><td class="n">' + (r.weeks ? (r.enc / r.weeks).toFixed(1) : '—') + '</td><td class="n">' + (r.avgMin == null ? '—' : r.avgMin + ' min') + '</td><td class="n">' + (ch == null ? '—' : (ch > 0 ? '+' : '') + ch + '%') + '</td></tr>'; }).join('');
    const ms = months(W); const perMonth = ms.map((m) => { const hrs = wk.filter((x) => x.w >= K().monday(m.from) && x.w <= m.to).reduce((a, x) => a + x.min, 0) / 60; return { label: m.label, value: Math.round(hrs), tipLines: [m.label, Math.round(hrs) + ' service hours'] }; });
    return '<div class="an-grid one">' + H().card('svc', 'Service utilization', W.label, '<div class="an-tw"><table class="an-table" data-an="svc-table"><thead><tr><th>Service</th><th class="n">Consumers receiving</th><th class="n">Encounters</th><th class="n">Service hours</th><th class="n">Avg encounters per consumer-week</th><th class="n">Avg length</th><th class="n">Hours vs previous</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
      H().note('Service hours come from service records (encounter minutes). They are not authorization units, which are counted on Payer Performance. Diagnosis, payer, program and location filters apply.')) + '</div>' +
      '<div class="an-grid one">' + H().card('svc-time', 'Service hours over time', 'total hours by month', H().vcols(perMonth, { aria: 'Service hours by month' })) + '</div>';
  }
  const fmtN = (n) => Math.round(n).toLocaleString('en-US');

  /* ---------- E. intervention utilization ---------- */
  const reviewed = (iv) => iv.review === 'confirmed' || !!(PSY.state.anIvOk || {})[iv.id];
  function interventions(F, W, clin) {
    const ivs = K().ivsIn(F, W); const obs = []; K().scope(F).forEach((p) => p.ivs.forEach((x) => { if (x.observed && x.d >= W.from && x.d <= W.to) obs.push(x); }));
    const pending = ivs.filter((x) => !reviewed(x)); const cur = FB().get(SEC, 'ivs', '') || ''; const care = pop(F, W).care.length;
    const rowsFor = K().IVS.map((iv) => { const r = ivs.filter((x) => x.k === iv.k); const pids = new Set(r.map((x) => x.pid)); const conf = r.length ? Math.round((100 * r.reduce((a, x) => a + x.conf, 0)) / r.length) : null;
      return { iv, n: r.length, pids: pids.size, conf, pend: r.filter((x) => !reviewed(x)).length, all: r }; }).sort((a, b) => b.n - a.n);
    const table = '<div class="an-tw"><table class="an-table" data-an="iv-table"><thead><tr><th>Intervention (approved ISP picklist)</th><th class="n">Consumers receiving</th><th class="n">Documented</th><th class="n">AI-extracted, average confidence</th><th class="n">Pending clinician review</th></tr></thead><tbody>' +
      rowsFor.map((r) => '<tr' + (cur === r.iv.k ? ' class="an-row-on"' : '') + '><td><button type="button" class="an-id" data-act="an-ivs" data-v="' + esc(r.iv.k) + '" aria-pressed="' + (cur === r.iv.k) + '">' + esc(r.iv.name) + '</button><small>' + esc(r.iv.code) + '</small></td><td class="n">' + cnt(r.pids) + '</td><td class="n">' + (r.n >= MIN ? r.n : '<' + MIN) + '</td><td class="n">' + (r.conf == null ? '—' : r.conf + '%') + '</td><td class="n">' + (r.pend ? (clin ? r.pend : cnt(r.pend)) : '0') + '</td></tr>').join('') + '</tbody></table></div>';
    const head = H().card('iv-list', 'Most frequently documented interventions', 'n = ' + ivs.length + ' delivered entries', table +
      '<div class="an-mrow"><span>Observation-only entries (not counted as interventions)</span><b>' + obs.length + '</b></div>' +
      H().note('AI-extracted from progress notes, each linked to its source note. Interventions are only the approved picklist names; a simple observation is not counted as a delivered intervention. Confidence below 80% needs clinician review.'));
    let drill = H().empty('Select an intervention to see its monthly trend, and where it is documented by diagnosis, program and goal.');
    if (cur) {
      const iv = K().IVS.find((x) => x.k === cur); const r = ivs.filter((x) => x.k === cur); const ms = months(W);
      const trend = H().vcols(ms.map((m) => { const v = r.filter((x) => inM(x.d, m)).length; return { label: m.label, value: v, tipLines: [m.label, v + ' documented'] }; }), { aria: 'Documented by month' });
      const dxs = K().DXS.map((d) => ({ label: d.label, value: r.filter((x) => x.dx === d.k).length })).filter((x) => x.value >= MIN).map((x) => Object.assign(x, { text: String(x.value) }));
      const prs = K().PROGRAMS.map((pr) => ({ label: pr[1], value: r.filter((x) => x.program === pr[0]).length })).filter((x) => x.value >= MIN).map((x) => Object.assign(x, { text: String(x.value) }));
      const gl = K().GOALS.map((g) => ({ label: g[1], value: iv.goals.indexOf(g[0]) >= 0 ? r.filter((x) => x.goalsOf.indexOf(g[0]) >= 0).length : 0 })).filter((x) => x.value >= MIN).map((x) => Object.assign(x, { text: String(x.value) }));
      drill = '<div class="an-grid"><div><div class="an-hb-h">Documented by month · ' + esc(iv.name) + '</div>' + trend + '</div><div><div class="an-hb-h">Where it is documented</div>' + (dxs.length || prs.length || gl.length ? H().hbars(dxs.concat([{ label: '— by program —', value: 0, text: '' }]).concat(prs).concat([{ label: '— by goal —', value: 0, text: '' }]).concat(gl), { lw: 210, max: Math.max(1, r.length) }) : H().empty('Fewer than five documented entries in each group.')) + '</div></div>';
    }
    const drillCard = H().card('iv-drill', cur ? 'Intervention · ' + (K().IVS.find((x) => x.k === cur) || {}).name : 'Intervention trend', cur ? 'documented entries' : '', drill);
    const pendCard = H().card('iv-review', 'Clinician review of uncertain classifications', pending.length + ' pending', clin
      ? (pending.length ? '<div class="an-tw"><table class="an-table" data-an="iv-pending"><thead><tr><th>Source note</th><th>Intervention</th><th>Date</th><th class="n">Confidence</th><th></th></tr></thead><tbody>' + pending.slice(0, 8).map((x) => '<tr><td>' + esc(x.note) + '<small>' + esc(x.pid) + '</small></td><td>' + esc(x.name) + '</td><td>' + esc(K().short(x.d)) + '</td><td class="n">' + Math.round(x.conf * 100) + '%</td><td><button type="button" class="btn o s" data-act="an-iv-ok" data-id="' + esc(x.id) + '">Mark as clinician confirmed</button></td></tr>').join('') + '</tbody></table></div>' + (pending.length > 8 ? H().note('Showing 8 of ' + pending.length + '. Confirm them in order; each confirmation is recorded in this session.') : '') : H().empty('No entry is waiting for review.'))
      : '<div>' + H().RX() + '</div>' + H().note('Named entries need clinical record access. Counts of pending review are shown above.'));
    return '<div class="an-grid">' + head + drillCard + '</div><div class="an-grid one">' + pendCard + '</div>';
  }

  /* ---------- F. treatment goals and needs ---------- */
  function goals(F, W) {
    const pool = pop(F, W).care; const ivs = K().ivsIn(F, W); const wk = K().weeksIn(F, W); const n = pool.length;
    const rows = K().GOALS.map((g) => { const ps = pool.filter((p) => p.goals.some((x) => x.k === g[0])); const pids = new Set(ps.map((p) => p.id)); const linked = ivs.filter((x) => x.goalsOf.indexOf(g[0]) >= 0 && pids.has(x.pid));
      const c = {}; linked.forEach((x) => { c[x.name] = (c[x.name] || 0) + 1; }); const top = Object.keys(c).sort((a, b) => c[b] - c[a]).slice(0, 2).map((k) => k + ' (' + c[k] + ')').join('; ');
      const hrs = wk.filter((x) => x.goal === g[0]).reduce((a, x) => a + x.min, 0) / 60;
      return { k: g[0], label: g[1], n: ps.length, top, hrs: Math.round(hrs), share: pct(ps.length, n) }; }).sort((a, b) => b.n - a.n);
    const tbl = '<div class="an-tw"><table class="an-table" data-an="goals-table"><thead><tr><th>Treatment goal</th><th class="n">Consumers with the goal</th><th class="n">Share of consumers</th><th>Interventions most often documented</th><th class="n">Service hours</th></tr></thead><tbody>' +
      rows.map((r) => '<tr><td>' + esc(r.label) + '</td><td class="n">' + cnt(r.n) + '</td><td class="n">' + (r.n >= MIN && r.share != null ? r.share + '%' : '—') + '</td><td>' + (r.n >= MIN && r.top ? esc(r.top) : '<span class="an-note">Fewer than five consumers</span>') + '</td><td class="n">' + (r.n >= MIN ? fmtN(r.hrs) : '<' + MIN) + '</td></tr>').join('') + '</tbody></table></div>';
    const qrows = K().GOALS.map((g) => '<tr><td>' + esc(g[1]) + '</td>' + QUARTERS.slice(0, 5).map((q) => { const ps = K().all().filter((p) => K().inRange(p, { from: q[1], to: q[2] })); const have = ps.filter((p) => p.goals.some((x) => x.k === g[0])).length; const share = ps.length ? Math.round((100 * have) / ps.length) : null; return '<td class="n">' + (have >= MIN && share != null ? share + '%' : '<' + MIN) + '</td>'; }).join('') + '</tr>').join('');
    return H().card('goals', 'Treatment Goals & Needs', 'n = ' + n + ' consumers in care', tbl + H().note('Goals are set in each consumer’s plan; a consumer can have more than one. Interventions are linked to a goal through the picklist mapping, not by how the note was written.')) +
      H().card('goal-q', 'Goal distribution over time', 'share of consumers in care at each quarter end', '<div class="an-tw"><table class="an-table" data-an="goal-quarters"><thead><tr><th>Goal</th>' + QUARTERS.slice(0, 5).map((q) => '<th class="n">' + q[0] + '</th>').join('') + '</tr></thead><tbody>' + qrows + '</tbody></table></div>' + H().note('Quarters are not filtered by the reporting period.'));
  }

  /* ---------- G. population trends and the template summary ---------- */
  function trends(F, W) {
    const cur = pop(F, W); const prev = W.cmp ? pop(F, W.prev) : null; const ms = months(W); const MIN2 = MIN;
    const adm = ms.map((m) => ({ label: m.label, parts: [{ v: cur.pool.filter((p) => inM(p.enroll, m)).length, c: H().C.bar, name: 'Admissions' }, { v: cur.pool.filter((p) => p.end && inM(p.end, m)).length, c: H().C.warn, name: 'Discharges' }] }));
    const row = (lab, a, b, unit) => { const u = unit === '%' ? '%' : ''; return '<tr><td>' + esc(lab) + '</td><td class="n">' + (a == null ? '—' : a + u) + '</td><td class="n">' + (b == null ? '—' : b + u) + '</td><td class="n">' + (a != null && b != null ? esc(delta(a, b, unit) || '—') : '—') + '</td></tr>'; };
    const dxRows = K().DXS.map((d) => { const a = cur.care.filter((p) => p.dx === d.k).length, b = prev ? prev.care.filter((p) => p.dx === d.k).length : null; const pa = pct(a, cur.care.length), pb = prev ? pct(b, prev.care.length) : null; return a >= MIN2 || (b || 0) >= MIN2 ? row(d.label + ' (share of consumers in care)', pa, pb, '%') : ''; }).join('');
    const svcH = (list) => list.reduce((a, x) => a + x.min, 0) / 60;
    const svcNow = svcH(K().weeksIn(F, W)), svcPrev = prev ? svcH(K().weeksIn(F, W.prev)) : null;
    const ivNow = K().ivsIn(F, W).length, ivPrev = prev ? K().ivsIn(F, W.prev).length : null;
    const sumLines = [];
    if (prev) {
      sumLines.push('Consumers in care: ' + cur.served + ' in the period against ' + prev.served + ' in the comparison period.');
      sumLines.push('Admissions were ' + cur.adm.length + ' and discharges ' + cur.dis.length + ' (comparison period: ' + prev.adm.length + ' admissions, ' + prev.dis.length + ' discharges).');
      if (svcPrev) sumLines.push('Service hours were ' + fmtN(Math.round(svcNow)) + ', ' + (svcNow >= svcPrev ? 'up ' : 'down ') + Math.abs(Math.round(((svcNow - svcPrev) / svcPrev) * 100)) + '% from the comparison period.');
      sumLines.push('Documented interventions: ' + ivNow + ' (comparison period: ' + ivPrev + ').');
    } else sumLines.push('Turn on “Compare with previous period” to see changes. Current period: ' + cur.served + ' consumers in care, ' + cur.adm.length + ' admissions, ' + cur.dis.length + ' discharges.');
    const summary = '<div class="an-sum" data-an="pop-summary"><b>Summary</b> <span class="an-tag">Built from the figures on this page · a template, not a language model</span><ul>' + sumLines.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></div>';
    return '<div class="an-grid">' + H().card('pop-adm', 'New admissions versus discharges', W.label, H().stacked(adm.map((x) => ({ label: x.label, parts: x.parts, tipLines: [x.label, x.parts.map((q) => q.name + ' ' + q.v).join(' · ')] })), {}) + H().legend([['Admissions', H().C.bar], ['Discharges', H().C.warn]])) +
      H().card('pop-change', 'Changes against the previous period', prev ? cur.served + ' vs ' + prev.served : '', '<div class="an-tw"><table class="an-table" data-an="pop-changes"><thead><tr><th>Measure</th><th class="n">Period</th><th class="n">Comparison</th><th class="n">Change</th></tr></thead><tbody>' +
        row('Consumers in care', cur.served, prev ? prev.served : null) + row('New admissions', cur.adm.length, prev ? prev.adm.length : null) + row('Discharges', cur.dis.length, prev ? prev.dis.length : null) + row('Service hours', Math.round(svcNow), svcPrev == null ? null : Math.round(svcPrev)) + row('Documented interventions', ivNow, ivPrev) + dxRows + '</tbody></table></div>') + '</div>' + summary;
  }

  PSY.anSec.population = {
    html(ctx) {
      const F = ctx.F; const W = ctx.W; const clin = ctx.clin;
      return '<div class="an-grid one">' + summary(F, W) + '</div>' +
        '<div class="an-h2">Patient Demographics</div>' + demographics(F, W) +
        '<div class="an-h2">Diagnosis & Clinical Needs</div>' + diagnosis(F, W) +
        '<div class="an-h2">Service Utilization</div>' + services(F, W, W.prev) +
        '<div class="an-h2">Intervention Utilization</div>' + interventions(F, W, clin) +
        '<div class="an-h2">Treatment Goals & Needs</div>' + '<div class="an-grid one">' + goals(F, W) + '</div>' +
        '<div class="an-h2">Population Trends</div>' + '<div class="an-grid one">' + trends(F, W) + '</div>';
    },
  };

  /* ---------- acts ---------- */
  const refocus = (sel) => { const r = PSY.activeRoot(); const n = r && r.querySelector(sel); if (n) { try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); } } };
  PSY.acts['an-dxd'] = (el) => { const v = el.getAttribute('data-v'); FB().set(SEC, 'dxd', FB().get(SEC, 'dxd', '') === v ? '' : v); PSY.refresh(); refocus('[data-act="an-dxd"][data-v="' + v + '"]'); };
  PSY.acts['an-dx-filter'] = (el) => { FB().set('analytics', 'dx', el.getAttribute('data-v')); PSY.refresh(); PSY.ui.toast('Diagnosis filter applied to every section.'); };
  PSY.acts['an-ivs'] = (el) => { const v = el.getAttribute('data-v'); FB().set(SEC, 'ivs', FB().get(SEC, 'ivs', '') === v ? '' : v); PSY.refresh(); refocus('[data-act="an-ivs"][data-v="' + v + '"]'); };
})();
