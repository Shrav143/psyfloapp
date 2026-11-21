/* Analytics · Patient Outcomes (round 16, AN16). Owner of PSY.anSec.outcomes. Data: PSY.cohort (85c-cohort.js), the simulated cohort.
   Sections, in order: six KPI cards (each with its definition, denominator and the change against the previous period) · Outcomes over time (one
   selectable metric at a time; symptom scores are shown as percent change from each consumer's own baseline, one line per instrument, never added
   across instruments) · Treatment Feedback & Engagement (only the categories that have data; consumer-reported is marked as not clinical evidence) ·
   Patient Progress Timeline (one consumer, clinical access only) · Patients Requiring Review (the workflow actions) · Data completeness.
   Clinical content is restricted without clinicalRecords; aggregates in charts and tables need at least K.MIN_N (5) consumers.
   State: PSY.state.fb['analytics-v'] = { sec, om (metric), rv (status filter), tl (consumer id) }; PSY.state.anIvOk {id: true} (interventions a clinician
   confirmed), PSY.state.anSched {id: iso date} (assessments requested from the review table). Both are read by 41e as well. */
(function () {
  const PSY = window.PSY; const esc = PSY.esc; const K = () => PSY.cohort; const H = () => PSY.anh; const FB = () => PSY.fb; const SEC = 'analytics-v';
  const pct = (n, d) => (d ? Math.round((100 * n) / d) + '%' : '—');
  const SHORT = { vand: 'Vanderbilt', phq: 'PHQ-9', gad: 'GAD-7', scared: 'SCARED', sdq: 'SDQ', cafas: 'CAFAS' };
  const STATUS_ORDER = ['worsening', 'overdue', 'insufficient', 'stable', 'improving'];
  const STATUS_LABEL = { worsening: 'Worsening', overdue: 'Assessment overdue', insufficient: 'Insufficient data', stable: 'Stable', improving: 'Improving' };
  const daysInCare = (p, Wx) => Math.max(0, K().diff(new Date(Math.max(p.enroll, Wx.from)), new Date(Math.min(Wx.to, p.end || Wx.to, K().TODAY))) + 1);

  /* the six KPIs for one window: the consumers in care in it, their status as of the window's last day (the same rules as everywhere) */
  function outcomesFor(pool, Wx) {
    const asOf = Wx.to; const inW = pool.filter((p) => K().inRange(p, Wx)); const active = inW.filter((p) => K().activeAt(p, asOf));
    const sts = active.map((p) => ({ p, s: K().status(p, asOf) })); const measured = sts.filter((x) => x.s.n >= 2);
    const improving = measured.filter((x) => x.s.status === 'improving'); const maintaining = measured.filter((x) => x.s.maintaining);
    const review = sts.filter((x) => x.s.status === 'worsening' || x.s.status === 'overdue');
    const due = active.reduce((a, p) => a + Math.floor(daysInCare(p, Wx) / 42), 0);
    const done = active.reduce((a, p) => a + p.readings.filter((r) => r.d >= Wx.from && r.d <= asOf).length, 0);
    const dis = inW.filter((p) => p.end && p.end >= Wx.from && p.end <= asOf);
    const avgDur = dis.length ? Math.round(dis.reduce((a, p) => a + K().diff(p.enroll, p.end), 0) / dis.length) : null;
    return { active: active.length, measured: measured.length, improving: improving.length, maintaining: maintaining.length, review: review.length, due, done: Math.min(done, due || done), dis: dis.length, avgDur, sts };
  }
  const delta = (a, b, isPct) => { if (b == null || a == null) return null; if (isPct) { const d = Math.round(a - b); return (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(d) + ' pts vs previous period'; } const d = a - b; return (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(d) + ' vs previous period'; };

  function kpis(F, W, pool) {
    const cur = outcomesFor(pool, W); const prev = W.cmp ? outcomesFor(pool, W.prev) : null;
    const pI = pct(cur.improving, cur.measured), pM = pct(cur.maintaining, cur.measured), pC = cur.due ? Math.min(100, Math.round((100 * cur.done) / cur.due)) : null;
    const pI0 = prev && prev.measured ? Math.round((100 * prev.improving) / prev.measured) : null, pM0 = prev && prev.measured ? Math.round((100 * prev.maintaining) / prev.measured) : null;
    const pC0 = prev && prev.due ? Math.min(100, Math.round((100 * prev.done) / prev.due)) : null;
    const rv = (x) => x.review; const tipRules = 'Improving = latest reading at least 10% below the first reading (demo rule, to confirm with clinical leadership).';
    const arr = [
      H().kpi({ key: 'active', label: 'Active Patients', value: String(cur.active), change: prev ? delta(cur.active, prev.active) : null, good: null, def: 'Enrolled and not discharged on the last day of the period.', sub: 'Denominator: the simulated cohort in the filters.', tip: ['Active Patients','Enrolled on or before ' + K().short(W.to) + ' and not discharged before it.', 'Counts consumers, not episodes.'] }),
      H().kpi({ key: 'improving', label: 'Patients Showing Improvement', value: pI, change: prev ? delta(pI === '—' ? null : Math.round((100 * cur.improving) / cur.measured), pI0, true) : null, good: true, sub: cur.improving + ' of ' + cur.measured + ' with two or more assessments', def: 'Latest reading at least 10% below the first reading, on the same instrument.', tip: [tipRules, 'Numerator: ' + cur.improving + '. Denominator: ' + cur.measured + ' active consumers with two or more readings. Scores from different instruments are never combined.'] }),
      H().kpi({ key: 'maintaining', label: 'Patients Maintaining Progress', value: pM, change: prev ? delta(pM === '—' ? null : Math.round((100 * cur.maintaining) / cur.measured), pM0, true) : null, good: true, sub: cur.maintaining + ' of ' + cur.measured + ' with two or more assessments', def: 'Improved at some point, and the latest reading is within 10% of their best.', tip: ['Maintaining progress: an earlier improvement of at least 10% from the first reading, not improving now, and the latest reading no more than 10% above their best.', 'Numerator: ' + cur.maintaining + '. Denominator: ' + cur.measured + '.'] }),
      H().kpi({ key: 'review', label: 'Patients Requiring Clinical Review', value: String(cur.review), change: prev ? delta(cur.review, prev.review) : null, good: false, sub: 'Worsening or assessment overdue, of ' + cur.active + ' active', def: 'Worsening outcome trend, or no assessment in the last 60 days.', tip: ['Requiring review: worsening (latest at least 10% above baseline and rising) or assessment overdue (no assessment in 60 days). Counted once per consumer.', 'Denominator: ' + cur.active + ' active consumers.'] }),
      H().kpi({ key: 'completion', label: 'Assessment Completion Rate', value: pC == null ? '—' : pC + '%', change: prev && pC != null && pC0 != null ? delta(pC, pC0, true) : null, good: true, sub: cur.done + ' of ' + cur.due + ' assessments due', def: 'Assessments completed ÷ assessments due (one every 6 weeks in care).', tip: ['Due = one assessment for every 42 days in care, for each active consumer, in the period.', 'Completed = readings dated in the period. Capped at 100%.', 'Denominator: ' + cur.due + ' due.'] }),
      H().kpi({ key: 'duration', label: 'Average Treatment Duration', value: cur.avgDur == null ? '—' : cur.avgDur + ' days', change: prev && cur.avgDur != null && prev.avgDur != null ? delta(cur.avgDur, prev.avgDur) : null, good: null, sub: cur.dis + ' discharged in the period', def: 'Days from enrollment to discharge, consumers discharged in the period.', tip: ['Average days from enrollment to discharge, for discharges in the period. Active consumers are not included.', 'n = ' + cur.dis + '. Shown only when at least 5 discharges.'] }),
    ];
    if (cur.dis < K().MIN_N) arr[5] = arr[5].replace(/<div class="an-kv">[^<]*<\/div>/, '<div class="an-kv">' + (cur.dis ? '<' + K().MIN_N : '—') + '</div>');
    return '<div class="an-kpis" data-an="kpis">' + arr.join('') + '</div>' + H().note('Measures are the simulated cohort’s, not Harvest Outreach Center results. Denominators are shown on each card. Each measure uses one instrument per consumer.');
  }

  /* ---------- outcomes over time ---------- */
  const METRICS = [['symptom', 'Symptom severity'], ['functional', 'Functional impairment'], ['goal', 'Treatment goal progress'], ['incidents', 'Behavioral incidents'], ['standard', 'Standardized assessments'], ['pro', 'Patient-reported outcomes']];
  function months(W) {
    const out = []; let m = new Date(W.from.getFullYear(), W.from.getMonth(), 1);
    while (m <= W.to) { const e = new Date(m.getFullYear(), m.getMonth() + 1, 0); out.push({ k: K().mkey(m), label: K().MON[m.getMonth()] + (m.getMonth() === 0 || out.length === 0 ? ' ' + String(m.getFullYear()).slice(2) : ''), from: new Date(Math.max(+m, +W.from)), to: new Date(Math.min(+e, +W.to)) }); m = new Date(m.getFullYear(), m.getMonth() + 1, 1); }
    return out;
  }
  const inM = (d, m) => d >= m.from && d <= m.to;
  function chartOf(pool, W, metric) {
    const ms = months(W); const xs = ms.map((m) => m.label); const MIN = K().MIN_N;
    if (metric === 'symptom' || metric === 'functional') {
      const insts = metric === 'functional' ? ['cafas'] : ['vand', 'phq', 'gad', 'scared', 'sdq', 'cafas'];
      const series = insts.map((inst, i) => ({ name: SHORT[inst], color: H().C.line[i % H().C.line.length], pts: ms.map((m) => {
        const xs2 = []; pool.filter((p) => p.inst === inst && p.readings.length).forEach((p) => { const b = p.readings[0].v; if (!b) return; p.readings.forEach((r) => { if (r.d !== p.readings[0].d && inM(r.d, m)) xs2.push((r.v - b) / b * 100); }); });
        const n = xs2.length; return { y: n >= MIN ? xs2.reduce((a, b) => a + b, 0) / n : null, n }; }) })).filter((s) => s.pts.some((p) => p.n));
      if (!series.length) return H().empty('No readings in this period for these consumers.');
      return H().lines(series, { xs, fmt: (v) => (v > 0 ? '+' : '') + Math.round(v) + '%', min: -60, max: 40, aria: 'Percent change from each consumer’s first reading, one line per instrument' }) +
        H().note(metric === 'functional' ? 'Functional impairment: CAFAS total, percent change from each consumer’s first CAFAS reading (lower is better). Points with fewer than ' + MIN + ' readings are not shown.' : 'Each line is one instrument, shown as percent change from each consumer’s own first reading (lower is better). Scores from different instruments are not added together. Points with fewer than ' + MIN + ' readings are not shown.');
    }
    if (metric === 'goal') {
      const pts = ms.map((m) => { const v = []; const ids = {}; pool.forEach((p) => p.goals.forEach((g) => g.prog.forEach((x) => { if (inM(x.d, m)) { v.push(x.pct); ids[p.id] = 1; } }))); const n = Object.keys(ids).length;
        return { y: n >= MIN && v.length ? v.reduce((a, b) => a + b, 0) / v.length : null, n }; });
      return H().lines([{ name: 'Average goal progress (%)', color: H().C.good, pts }], { xs, fmt: (v) => Math.round(v) + '%', min: 0, max: 100, aria: 'Average treatment goal progress by month' }) + H().note('Average of goal progress reviewed in each month (0 to 100%). Clinician-reviewed.');
    }
    if (metric === 'incidents') {
      const pts = ms.map((m) => { const mid = new Date((+m.from + +m.to) / 2); const act = pool.filter((p) => K().activeAt(p, mid)); const n = act.length; const tot = act.reduce((a, p) => a + (p.inc[K().mkey(m.from)] || 0), 0);
        return { y: n >= MIN ? tot / n : null, n }; });
      return H().lines([{ name: 'Incidents per active consumer per month', color: H().C.bad, pts }], { xs, fmt: (v) => v.toFixed(1), min: 0, aria: 'Behavioral incidents per active consumer per month' }) + H().note('Behaviour incidents recorded by the program each month, per active consumer (school and program logs in the simulated record).');
    }
    if (metric === 'pro') {
      const pick = (q) => ms.map((m) => { const v = []; pool.forEach((p) => p.fb.forEach((x) => { if (x.src === 'patient' && x.q.indexOf(q) === 0 && inM(x.d, m)) v.push(x.v); })); return { y: v.length >= MIN ? v.reduce((a, b) => a + b, 0) / v.length : null, n: v.length }; });
      return H().lines([{ name: 'Satisfaction (1 to 5)', color: H().C.line[0], pts: pick('Satisfaction') }, { name: 'Perceived helpfulness (1 to 5)', color: H().C.line[1], pts: pick('Perceived') }], { xs, fmt: (v) => v.toFixed(1), min: 1, max: 5, aria: 'Patient-reported satisfaction and helpfulness by month' }) +
        H().note('Patient-reported. Satisfaction and perceived helpfulness are not direct evidence of clinical improvement; they are shown alongside the measures, not instead of them.');
    }
    /* standardized: raw means per instrument, not combined */
    const rows = ['vand', 'phq', 'gad', 'scared', 'sdq', 'cafas'].map((inst) => { const ps = pool.filter((p) => p.inst === inst && p.readings.length && K().inRange(p, W)); if (!ps.length) return null;
      const b = ps.map((p) => p.readings[0].v); const l = ps.map((p) => { const rs = p.readings.filter((r) => r.d >= W.from && r.d <= W.to); return rs.length ? rs[rs.length - 1].v : null; }).filter((x) => x != null);
      const n = ps.length; const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
      return { inst, n, base: n >= MIN ? mean(b).toFixed(1) : '<' + MIN, latest: l.length >= MIN ? mean(l).toFixed(1) : '<' + MIN, max: K().INST(inst).max, readings: ps.reduce((a, p) => a + p.readings.filter((r) => r.d >= W.from && r.d <= W.to).length, 0) }; }).filter(Boolean);
    if (!rows.length) return H().empty('No assessments in this period.');
    return '<div class="an-tw"><table class="an-table" data-an="standard"><thead><tr><th>Instrument</th><th class="n">Consumers</th><th class="n">Readings in period</th><th class="n">Mean at first reading</th><th class="n">Mean latest in period</th><th class="n">Scale</th></tr></thead><tbody>' +
      rows.map((r) => '<tr><td>' + esc(K().INST(r.inst).name) + '</td><td class="n">' + suppressed(r.n) + '</td><td class="n">' + r.readings + '</td><td class="n">' + r.base + '</td><td class="n">' + r.latest + '</td><td class="n">0 to ' + r.max + '</td></tr>').join('') + '</tbody></table></div>' +
      H().note('Standardized results are raw scores on each instrument’s own scale. They are not combined across instruments and are not compared with one another.');
  }
  function outcomesOverTime(pool, W, F) {
    const m = FB().get(SEC, 'om', 'symptom') || 'symptom';
    return H().card('over-time', 'Outcomes over time', W.label, H().chips('Outcome metric', METRICS, METRICS.some((x) => x[0] === m) ? m : 'symptom', 'an-metric') + '<div data-an="metric-chart" data-metric="' + esc(m) + '">' + chartOf(pool, W, m) + '</div>');
  }

  /* ---------- treatment feedback & engagement ---------- */
  function feedbackCard(pool, W) {
    const fb = []; pool.forEach((p) => p.fb.forEach((x) => { if (x.d >= W.from && x.d <= W.to) fb.push(Object.assign({ p }, x)); }));
    if (!fb.length) return H().card('feedback', 'Treatment Feedback & Engagement', W.label, H().empty('No feedback recorded in this period for these consumers.'));
    const MIN = K().MIN_N; const grp = (src) => fb.filter((x) => x.src === src);
    const mean = (xs) => (xs.length >= MIN ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : '<' + MIN);
    const dist = (xs) => { const c = { better: 0, same: 0, worse: 0 }; xs.forEach((v) => { if (c[v] != null) c[v]++; }); const n = xs.length; return n >= MIN ? ['better', 'same', 'worse'].map((k) => k + ' ' + c[k] + ' (' + pct(c[k], n) + ')').join(' · ') : 'Fewer than ' + MIN + ' responses'; };
    const parts = [];
    const pt = grp('patient'); if (pt.length) { const sat = pt.filter((x) => x.q.indexOf('Satisfaction') === 0).map((x) => x.v); const hlp = pt.filter((x) => x.q.indexOf('Perceived') === 0).map((x) => x.v);
      parts.push('<div class="an-fbc" data-fb-cat="patient"><h3>Patient feedback</h3><span class="an-tag obs">Patient-reported · not clinical evidence</span><div class="an-mrow"><span>Satisfaction with treatment (1 to 5, average)</span><b>' + mean(sat) + ' · n = ' + sat.length + '</b></div><div class="an-mrow"><span>Perceived helpfulness (1 to 5, average)</span><b>' + mean(hlp) + ' · n = ' + hlp.length + '</b></div><p class="an-note">Engagement is shown below in the caregiver and clinician rows, not as a consumer score.</p></div>'); }
    const cl = grp('clinician'); if (cl.length) { const ga = cl.filter((x) => x.q.indexOf('Goal') === 0).map((x) => x.v); const fn = cl.filter((x) => x.q.indexOf('Functional') === 0).map((x) => x.v);
      const ivs = K().ivsIn(K().filters(), W).filter((x) => pool.indexOf(K().get(x.pid)) >= 0); const resp = ivs.map((x) => x.resp);
      parts.push('<div class="an-fbc" data-fb-cat="clinician"><h3>Clinician feedback</h3><span class="an-tag">Clinician-observed</span><div class="an-mrow"><span>Treatment goal attainment (average, %)</span><b>' + (ga.length >= MIN ? Math.round(ga.reduce((a, b) => a + b, 0) / ga.length) + '%' : '<' + MIN) + ' · n = ' + ga.length + '</b></div><div class="an-mrow"><span>Functional change (clinician rating)</span><b>' + dist(fn) + '</b></div><div class="an-mrow"><span>Intervention response documented in notes (AI-extracted, clinician review applies)</span><b>' + (resp.length >= MIN ? dist(resp.map((r) => (r === 'improved' ? 'better' : r === 'declined' ? 'worse' : r === 'no change' ? 'same' : 'x')).filter((x) => x !== 'x')) : 'Fewer than ' + MIN + ' documented responses') + '</b></div></div>'); }
    const cg = grp('caregiver'); if (cg.length) { const eng = cg.filter((x) => x.q.indexOf('Family') === 0).map((x) => x.v); const beh = cg.filter((x) => x.q.indexOf('Changes') === 0).map((x) => x.v);
      parts.push('<div class="an-fbc" data-fb-cat="caregiver"><h3>Caregiver feedback</h3><span class="an-tag">Caregiver-reported</span><div class="an-mrow"><span>Family engagement (share of sessions attended, average)</span><b>' + (eng.length >= MIN ? Math.round(eng.reduce((a, b) => a + b, 0) / eng.length) + '%' : '<' + MIN) + ' · n = ' + eng.length + '</b></div><div class="an-mrow"><span>Changes in behaviour at home (caregiver observed)</span><b>' + dist(beh) + '</b></div></div>'); }
    const sc = grp('school'); if (sc.length) parts.push('<div class="an-fbc" data-fb-cat="school"><h3>School staff feedback</h3><span class="an-tag">School-observed</span><div class="an-mrow"><span>School staff observed change in behaviour</span><b>' + dist(sc.map((x) => x.v)) + '</b></div></div>');
    return H().card('feedback', 'Treatment Feedback & Engagement', 'n = ' + fb.length + ' responses', '<div class="an-fbs">' + parts.join('') + '</div>' + H().note('Only categories with responses in this period are shown. Patient-reported and caregiver-reported information is labelled separately from clinician observations. Satisfaction is not treated as evidence of clinical improvement.'));
  }

  /* ---------- the timeline of one consumer ---------- */
  function events(p) {
    const ev = [];
    ev.push({ d: p.enroll, k: 'adm', h: 'Admission', d2: K().PROG(p.program) + ' · ' + p.site, tags: [] });
    if (p.readings[0]) ev.push({ d: p.readings[0].d, k: 'as', h: 'Baseline assessment · ' + K().INST(p.inst).name, d2: 'Score ' + p.readings[0].v + ' of ' + K().INST(p.inst).max + ' (first reading)', tags: [] });
    p.goals.forEach((g) => ev.push({ d: g.start, k: 'goal', h: 'Treatment goal set · ' + g.name, d2: g.prog.length ? 'Latest progress ' + g.prog[g.prog.length - 1].pct + '%' : 'No progress reviewed yet', tags: [] }));
    p.ivs.forEach((iv) => {
      const after = p.readings.filter((r) => r.d > iv.d)[0]; const base = p.readings[0];
      const next = after ? 'Next assessment ' + K().short(after.d) + ': ' + after.v + ' (' + (base ? Math.round(((after.v - base.v) / base.v) * 100) : 0) + '% from baseline). Documented alongside this intervention; not evidence that it caused the change.' : 'No assessment after this intervention yet.';
      const reviewed = iv.review === 'confirmed' || !!(PSY.state.anIvOk || {})[iv.id];
      ev.push({ d: iv.d, k: iv.observed ? 'obs' : 'iv', h: (iv.observed ? 'Observation (not counted as an intervention) · ' : 'Intervention and progress note · ') + iv.name, d2: iv.code + ' · ' + iv.min + ' min · documented response: ' + iv.resp + ' · ' + next, iv, tags: [iv.observed ? ['obs', 'Observation only'] : ['ai', 'AI-extracted from ' + iv.note], reviewed ? ['', 'Clinician confirmed'] : ['pend', 'Pending review · confidence ' + Math.round(iv.conf * 100) + '%']] });
    });
    p.readings.slice(1).forEach((r) => ev.push({ d: r.d, k: 'as', h: 'Follow-up assessment · ' + K().INST(p.inst).name, d2: 'Score ' + r.v + ' (first reading ' + p.readings[0].v + ')', tags: [] }));
    const fbDates = {}; p.fb.forEach((x) => { fbDates[+x.d] = (fbDates[+x.d] || 0) + 1; }); Object.keys(fbDates).forEach((k) => ev.push({ d: new Date(+k), k: 'fb', h: 'Feedback collected', d2: fbDates[k] + ' responses (consumer, caregiver, clinician' + (p.program === 'tdt' ? ', school staff' : '') + ')', tags: [] }));
    p.reviews.forEach((d) => ev.push({ d, k: 'plan', h: 'Treatment plan review', d2: 'Goals reviewed with the family', tags: [] }));
    if (p.end) ev.push({ d: p.end, k: 'dis', h: 'Discharge', d2: p.endReason || '', tags: [] });
    return ev.sort((a, b) => a.d - b.d);
  }
  function timelineCard(F, W, pool, clin) {
    const list = pool.filter((p) => K().inRange(p, W)).sort((a, b) => (a.ini < b.ini ? -1 : 1));
    const sel = FB().get(SEC, 'tl', ''); const p = list.find((x) => x.id === sel) || null;
    const pick = '<label class="an-tl-pick">Consumer <select data-change="an-tl-set" aria-label="Select a consumer for the timeline"><option value="">Select a consumer</option>' + list.map((x) => '<option value="' + esc(x.id) + '"' + (p && p.id === x.id ? ' selected' : '') + '>' + esc(x.ini) + ' · ' + esc(K().PROG(x.program)) + '</option>').join('') + '</select></label>';
    if (!clin) return H().card('timeline', 'Patient Progress Timeline', '', '<div>' + H().RX() + '</div>' + H().note('Consumer-level timelines show clinical content and are available with clinical record access. Aggregates on this page remain visible.'), null).replace('<section class="card an-c', '<section id="an-tl" class="card an-c');
    if (!p) return H().card('timeline', 'Patient Progress Timeline', '', pick + H().empty('Select a consumer to see admission, assessments, goals, interventions, feedback, plan reviews and discharge in order.'), null).replace('<section class="card an-c', '<section id="an-tl" class="card an-c');
    const s = K().status(p, W.to); const dx = [K().DX(p.dx)].concat(p.dx2.map((k) => K().DX(k))).join(', ');
    const pts = p.readings.map((r) => ({ y: r.v, n: null })); const chart = p.readings.length ? H().lines([{ name: K().INST(p.inst).name, color: H().C.bar, pts }], { xs: p.readings.map((r) => K().short(r.d)), min: 0, max: K().INST(p.inst).max, aria: 'Assessment scores over time for this consumer' }) : H().empty('No assessments yet.');
    const head = '<div class="an-tl-h"><div><b>' + esc(p.ini) + '</b> · age ' + p.age + ' · ' + esc(K().PROG(p.program)) + '</div><div class="an-note">Primary: ' + esc(K().DX(p.dx)) + (p.dx2.length ? ' · Secondary: ' + esc(dx.split(', ').slice(1).join(', ')) : '') + ' · ' + esc(p.clinician) + ' · Enrolled ' + K().short(p.enroll) + (p.end ? ' · Discharged ' + K().short(p.end) : ' · Active') + '</div><div class="an-tl-s">' + H().badge(s.status) + (s.change != null ? ' <span class="an-note">' + (s.change > 0 ? '+' : '') + Math.round(s.change * 100) + '% from the first reading</span>' : '') + '</div></div>';
    const evs = events(p).filter((e) => e.d <= W.to || e.k === 'dis').map((e) => '<div class="an-te k-' + (e.k === 'iv' || e.k === 'obs' ? 'iv' : e.k === 'as' ? 'dx' : e.k === 'dis' ? 'as' : e.k === 'goal' ? 'goal' : e.k === 'fb' ? 'fb' : 'dx') + '" data-ev="' + e.k + '"><div class="h"><b>' + esc(e.h) + '</b><span class="an-note">' + esc(K().short(e.d)) + '</span>' + (e.tags || []).map((t) => '<span class="an-tag ' + t[0] + '">' + esc(t[1]) + '</span>').join('') + (e.iv && (e.tags || []).some((t) => t[0] === 'pend') ? '<button type="button" class="btn o s an-ok" data-act="an-iv-ok" data-id="' + esc(e.iv.id) + '">Mark as clinician confirmed</button>' : '') + '</div><div class="d">' + esc(e.d2) + '</div></div>').join('');
    return H().card('timeline', 'Patient Progress Timeline', 'Clinical · ' + esc(p.ini), pick + head + '<div data-an="tl-chart">' + chart + '</div><div class="an-tl" data-an="tl-events" id="an-tl-events">' + evs + '</div>' +
      H().note('Interventions are linked to the next assessment only to show the order of events. Nothing here shows that an intervention caused a change. Intervention records are AI-extracted from progress notes; confidence below 80% needs clinician review.'), null).replace('<section class="card an-c', '<section id="an-tl" class="card an-c');
  }

  /* ---------- consumers requiring review ---------- */
  function reviewCard(F, W, pool, clin) {
    const cur = FB().get(SEC, 'rv', 'all') || 'all';
    const rows = pool.filter((p) => K().inRange(p, W) && K().activeAt(p, W.to)).map((p) => ({ p, s: K().status(p, W.to) }));
    const counts = {}; rows.forEach((x) => { counts[x.s.status] = (counts[x.s.status] || 0) + 1; });
    const chipsHtml = '<div class="an-chips" role="group" aria-label="Filter by outcome trend">' + [['all', 'All active (' + rows.length + ')']].concat(STATUS_ORDER.map((k) => [k, STATUS_LABEL[k] + ' (' + (counts[k] || 0) + ')'])).map((x) => '<button type="button" class="an-chip' + (cur === x[0] ? ' on' : '') + '" aria-pressed="' + (cur === x[0]) + '" data-act="an-rv" data-v="' + x[0] + '">' + esc(x[1]) + '</button>').join('') + '</div>';
    if (!clin) {
      const body = chipsHtml + '<div>' + H().RX() + '</div>' + H().note('Named consumers appear here with clinical record access. Without it, only the counts above are shown.');
      return H().card('review', 'Patients Requiring Review', 'Workflow recommendations, not clinical decisions', body);
    }
    const shown = rows.filter((x) => cur === 'all' || x.s.status === cur).sort((a, b) => STATUS_ORDER.indexOf(a.s.status) - STATUS_ORDER.indexOf(b.s.status) || (a.p.ini < b.p.ini ? -1 : 1));
    if (!shown.length) return H().card('review', 'Patients Requiring Review', 'Workflow recommendations, not clinical decisions', chipsHtml + H().empty('No consumer with this outcome trend in this view.'));
    const sched = PSY.state.anSched || {};
    const act = (x) => { const st = x.s.status; if (st === 'worsening') return ['Review Consumer Progress', 'an-tl-open']; if (st === 'overdue' || st === 'insufficient') return ['Schedule Assessment', 'an-sched']; return ['Review Treatment Plan', 'an-tl-open']; };
    const suggest = (x) => ({ worsening: 'Review progress and the plan for the goals below target.', overdue: 'No assessment in 60 days: schedule one.', insufficient: 'Fewer than two readings: schedule a follow-up assessment.', stable: 'Stable: check whether the goals still fit.', improving: 'Improving: check that the goals are being updated.' })[x.s.status];
    const body = chipsHtml + '<div class="an-tw"><table class="an-table" data-an="review-table"><thead><tr><th>Consumer</th><th>Program</th><th>Primary clinical concern</th><th>Outcome trend</th><th>Last assessment</th><th class="n">Goal progress</th><th>Assigned clinician</th><th>Suggested review action</th><th>Actions</th></tr></thead><tbody>' +
      shown.map((x) => { const a = act(x); const reqd = (PSY.state.anSched || {})[x.p.id]; const ch = x.s.change != null ? ' ' + (x.s.change > 0 ? '+' : '') + Math.round(x.s.change * 100) + '%' : '';
        return '<tr data-c="' + esc(x.p.id) + '"><td><button type="button" class="an-id" data-act="an-tl-open" data-id="' + esc(x.p.id) + '" aria-label="Open the progress timeline for ' + esc(x.p.ini) + '">' + esc(x.p.ini) + '</button><small>age ' + x.p.age + '</small></td><td>' + esc(K().PROG(x.p.program)) + '</td><td>' + esc(K().DX(x.p.dx)) + '</td><td>' + H().badge(x.s.status) + '<small>' + (x.s.change != null ? esc(ch.trim()) + ' from first' : 'One reading or none') + '</small></td><td>' + (x.s.lastDate ? esc(K().short(x.s.lastDate)) + '<small>' + esc(x.s.instName) + '</small>' : '—') + '</td><td class="n">' + (x.s.goalAvg != null ? x.s.goalAvg + '%' : '—') + '</td><td>' + esc(x.p.clinician) + '</td><td>' + esc(suggest(x)) + '</td><td><div class="an-acts">' +
          (a[1] === 'an-sched' ? (reqd ? '<button type="button" class="btn o s" disabled>Requested ' + esc(K().short(K().dt(reqd))) + '</button>' : '<button type="button" class="btn p s" data-act="an-sched" data-id="' + esc(x.p.id) + '">' + esc(a[0]) + '</button>') : '<button type="button" class="btn p s" data-act="an-tl-open" data-id="' + esc(x.p.id) + '">' + esc(a[0]) + '</button>') +
          '<button type="button" class="btn o s" data-act="an-tl-open" data-id="' + esc(x.p.id) + '" data-doc="1">Review Documentation</button></div></td></tr>'; }).join('') + '</tbody></table></div>' +
      H().note('These are workflow recommendations for the clinical team, not clinical decisions. “Assessment overdue” means no assessment in 60 days. Requests from this table are recorded in this session only.');
    return H().card('review', 'Patients Requiring Review', 'n = ' + shown.length + ' · ' + esc(STATUS_LABEL[cur] || 'all'), body);
  }

  /* ---------- data completeness ---------- */
  function completeness(pool, W) {
    const act = pool.filter((p) => K().inRange(p, W) && K().activeAt(p, W.to)); const n = act.length;
    const base = act.filter((p) => p.readings.some((r) => r.d <= W.to)).length; const fu = act.filter((p) => p.readings.filter((r) => r.d <= W.to).length >= 2).length;
    const over = act.filter((p) => K().status(p, W.to).status === 'overdue').length; const cov = fu;
    const tile = (lab, v, sub) => '<div class="an-tile"><span class="lbl">' + esc(lab) + '</span><b>' + esc(v) + '</b><span>' + esc(sub) + '</span></div>';
    return H().card('completeness', 'Data completeness', 'n = ' + n + ' active', '<div class="an-dl">' + tile('With a baseline assessment', pct(base, n), base + ' of ' + n) + tile('With a follow-up assessment', pct(fu, n), fu + ' of ' + n) + tile('Overdue (no assessment in 60 days)', String(over), over + ' of ' + n) + tile('Outcome data coverage', pct(cov, n), 'Outcome can be calculated for ' + cov + ' of ' + n) + '</div>' +
      (n === 0 ? H().empty('Insufficient data: no active consumers in this period.') : H().note('An outcome that cannot be calculated shows as Insufficient data. Nothing is estimated or filled in with AI-generated values.')));
  }

  /* ---------- the section ---------- */
  PSY.anSec.outcomes = {
    outcomesFor,
    html(ctx) {
      const F = ctx.F; const W = Object.assign({}, ctx.W); const pool = K().scope(F); const clin = ctx.clin;
      return kpis(F, W, pool) +
        '<div class="an-grid one">' + outcomesOverTime(pool, W, F) + '</div>' +
        '<div class="an-grid">' + feedbackCard(pool, W) + completeness(pool, W) + '</div>' +
        timelineCard(F, W, pool, clin) +
        reviewCard(F, W, pool, clin);
    },
  };

  /* ---------- acts ---------- */
  const refocus = (sel) => { const r = PSY.activeRoot(); const n = r && r.querySelector(sel); if (n) { try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); } } };
  const scrollTo = (id) => setTimeout(() => { const r = PSY.activeRoot(); const el = r && r.querySelector('#' + id); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 60);
  PSY.acts['an-metric'] = (el) => { FB().set(SEC, 'om', el.getAttribute('data-v')); PSY.refresh(); refocus('[data-act="an-metric"][data-v="' + el.getAttribute('data-v') + '"]'); };
  PSY.acts['an-rv'] = (el) => { FB().set(SEC, 'rv', el.getAttribute('data-v')); PSY.refresh(); refocus('[data-act="an-rv"][data-v="' + el.getAttribute('data-v') + '"]'); };
  PSY.acts['an-tl-open'] = (el) => { FB().set(SEC, 'tl', el.getAttribute('data-id')); PSY.refresh(); scrollTo('an-tl'); };
  PSY.acts['an-tl-set'] = (el) => { FB().set(SEC, 'tl', el.value); PSY.refresh(); if (el.value) scrollTo('an-tl'); };
  PSY.acts['an-sched'] = (el) => {
    const id = el.getAttribute('data-id'); PSY.state.anSched = PSY.state.anSched || {}; const d = K().add(K().TODAY, 7); PSY.state.anSched[id] = K().iso(d); PSY.save();
    PSY.ui.toast('Assessment requested for ' + K().short(d) + ' (demo: recorded in this session).'); PSY.refresh();
  };
  PSY.acts['an-iv-ok'] = (el) => { const id = el.getAttribute('data-id'); PSY.state.anIvOk = PSY.state.anIvOk || {}; PSY.state.anIvOk[id] = true; PSY.save(); PSY.ui.toast('Marked as clinician confirmed (demo).'); PSY.refresh(); };
})();
