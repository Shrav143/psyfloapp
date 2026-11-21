/* Analytics (platform tab 3), round 16 (AN16): three sections on one shared filter bar, all derived from the simulated cohort (85c-cohort.js):
     Patient Outcomes       41c-an-outcomes.js  KPIs · outcomes over time · Treatment Feedback & Engagement · consumer progress timeline ·
                                                 consumers requiring review · data completeness
     Payer Performance      41d-an-payer.js     KPIs · payer comparison · authorization trends · denial patterns · revenue and service impact ·
                                                 payer insights · "Investigate in Denial Intelligence"
     Patient Population     41e-an-population.js population summary · demographics · diagnosis & clinical needs · service utilization ·
                                                 intervention utilization · treatment goals & needs · population trends (+ summary)
   This file: the page shell, the section tabs, the shared filter bar (date range with a previous-period comparison, program, location, payer,
   clinician, diagnosis, population), Reset Filters, Ask FLO (41f: suggested questions) and Export Report (41f: PDF or CSV).
   PSY.anh: the chart and table helpers the sections share. PSY.anSec[key] = { html(ctx) } per section; ctx = { F, W, clin, can }.
   Access: clinical content (consumer rows, timelines, interventions for named consumers) needs PSY.can('clinicalRecords'); aggregates are shown only for
   groups of at least K.MIN_N (5); a clinician sees their own caseload (PSY.cohort.filters). Every button does something.
   Wording: the platform says "consumer" in the product; the simulated cohort is described as "consumers" only inside the cohort notice. */
(function () {
  const PSY = window.PSY; const esc = PSY.esc; const PG = 'analytics'; const SEC = 'analytics-v';
  const K = () => PSY.cohort; const FB = () => PSY.fb;
  const SECTIONS = [['outcomes', 'Patient Outcomes'], ['payer', 'Payer Performance'], ['population', 'Patient Population']];
  const C = { good: '#168A72', warn: '#E0A93B', bad: '#C9543A', bar: '#4F7CAC', barLt: '#BFD0E4', grid: '#EFE8DE', mute: '#9A9388', ink: '#1B1B19', sub: '#6B665E', line: ['#4F7CAC', '#168A72', '#C9543A', '#B88A0A', '#8B5FBF', '#2A78D6'] };
  PSY.anh = PSY.anh || {};

  /* ---------- formatting and small pieces ---------- */
  const pct = (n, d) => (d ? Math.round((100 * n) / d) + '%' : '—');
  const pctN = (n, d) => (d ? Math.round((100 * n) / d) : null);
  const plural = (n, a, b) => n + ' ' + (n === 1 ? a : b);
  const fmt = (n) => (n == null || isNaN(n) ? '—' : Math.round(n).toLocaleString('en-US'));
  const dash = (n) => (n == null ? '—' : String(n));
  const suppressed = (n) => (n < K().MIN_N ? '<' + K().MIN_N : String(n));
  const tip = (lines) => ' data-tip="' + esc(lines.filter(Boolean).join('\n')) + '"';
  const STAT = { improving: ['Improving', 'good'], stable: ['Stable', 'mute'], worsening: ['Worsening', 'bad'], insufficient: ['Insufficient data', 'warn'], overdue: ['Assessment overdue', 'od'] };
  const badge = (s) => { const x = STAT[s] || [s, 'mute']; return '<span class="an-bd ' + x[1] + '" data-st="' + esc(s) + '">' + esc(x[0]) + '</span>'; };
  const kpi = (o) => {
    const ch = o.change != null ? '<span class="an-chg ' + (o.good === false ? 'bad' : o.good === true ? 'good' : 'mute') + '" data-an="change">' + esc(o.change) + '</span>' : '';
    return '<article class="an-kpi" data-kpi="' + esc(o.key || o.label) + '"' + tip(o.tip || []) + '><div class="an-kl">' + esc(o.label) + '</div><div class="an-kv">' + esc(o.value) + '</div>' + ch +
      (o.sub ? '<div class="an-ks">' + esc(o.sub) + '</div>' : '') + (o.def ? '<div class="an-kd">' + esc(o.def) + '</div>' : '') + '</article>';
  };
  const card = (key, title, n, body, extra, cls) => '<section class="card an-c ' + (cls || '') + '" data-an="' + esc(key) + '"><div class="an-ch"><h2>' + esc(title) + '</h2>' + (n ? '<span class="an-n">' + esc(n) + '</span>' : '') + '<span class="sp"></span>' + (extra || '') + '</div><div class="an-cb">' + body + '</div><div class="an-tip" role="status" aria-live="polite"></div></section>';
  const empty = (t) => '<div class="an-empty">' + esc(t) + '</div>';
  const note = (t) => '<p class="an-note">' + esc(t) + '</p>';
  const chips = (group, items, cur, attrs) => '<div class="an-chips" role="group" aria-label="' + esc(group) + '">' + items.map((x) => '<button type="button" class="an-chip' + (cur === x[0] ? ' on' : '') + '" aria-pressed="' + (cur === x[0]) + '" data-act="' + esc(attrs) + '" data-v="' + esc(x[0]) + '">' + esc(x[1]) + '</button>').join('') + '</div>';
  const simChip = () => PSY.ev.label('illustrative', 'Simulated cohort');
  const flagSet = (k) => (FB().get(SEC, k, '') || '');

  /* horizontal bars: rows [{label, value, max, sub, color, act, on, tipLines, n, key}] ; value text optional (default value) */
  function hbars(rows, o) {
    o = o || {}; const max = o.max || Math.max.apply(null, rows.map((r) => r.value || 0).concat([1]));
    return '<div class="an-hb" style="--lw:' + (o.lw || 150) + 'px">' + rows.map((r) => {
      const w = max ? Math.max(0, Math.min(100, (100 * (r.value || 0)) / max)) : 0;
      const inner = '<span class="l" title="' + esc(r.label) + '">' + esc(r.label) + (r.sub ? ' <small>' + esc(r.sub) + '</small>' : '') + '</span><span class="p"><i style="width:' + w.toFixed(1) + '%;background:' + (r.color || C.bar) + '"></i></span><b>' + esc(r.text != null ? r.text : String(r.value)) + '</b>';
      return r.act ? '<button type="button" class="an-hr' + (r.on ? ' on' : '') + '" data-act="' + esc(r.act) + '" data-v="' + esc(r.key || r.label) + '" aria-pressed="' + !!r.on + '"' + tip(r.tipLines || []) + '>' + inner + '</button>'
        : '<div class="an-hr"' + tip(r.tipLines || []) + '>' + inner + '</div>';
    }).join('') + '</div>';
  }
  /* monthly columns: items [{label, value, text, color, tipLines}] */
  function vcols(items, o) {
    o = o || {}; const max = o.max || Math.max.apply(null, items.map((x) => x.value || 0).concat([1]));
    return '<div class="an-vc" role="img" aria-label="' + esc(o.aria || '') + '">' + items.map((x) => { const h = max ? Math.max(0, Math.min(100, (100 * (x.value || 0)) / max)) : 0;
      return '<div class="an-vcol"' + tip(x.tipLines || []) + '><span class="v">' + esc(x.text != null ? x.text : String(x.value)) + '</span><span class="b"><i style="height:' + h.toFixed(1) + '%;background:' + (x.color || C.bar) + '"></i></span><span class="x">' + esc(x.label) + '</span></div>'; }).join('') + '</div>';
  }
  /* stacked columns: items [{label, parts:[{v,c,name}], tipLines}] */
  function stacked(items, o) {
    o = o || {}; const tot = (x) => x.parts.reduce((a, p) => a + p.v, 0); const max = o.max || Math.max.apply(null, items.map(tot).concat([1]));
    return '<div class="an-vc">' + items.map((x) => { const t = tot(x); return '<div class="an-vcol"' + tip(x.tipLines || []) + '><span class="v">' + t + '</span><span class="b st">' + x.parts.map((p) => '<i style="height:' + (max ? (100 * p.v) / max : 0).toFixed(1) + '%;background:' + p.c + '"></i>').join('') + '</span><span class="x">' + esc(x.label) + '</span></div>'; }).join('') + '</div>';
  }
  /* a legend: items [[label, colour]] */
  const legend = (items) => '<div class="an-lg">' + items.map((x) => '<span><i class="an-sq" style="background:' + x[1] + '"></i>' + esc(x[0]) + '</span>').join('') + '</div>';
  /* a line chart: series [{name, color, pts:[{x (label), y, n}]}] ; y is a number (or null for a gap); the x labels are shared */
  function lines(series, o) {
    o = o || {}; const W = 640, H = 210, L = 46, R = 12, T = 12, B = 30; const xs = o.xs || []; const ys = [];
    series.forEach((s) => s.pts.forEach((p) => { if (p.y != null) ys.push(p.y); }));
    let lo = o.min != null ? o.min : Math.min.apply(null, ys.concat([0])); let hi = o.max != null ? o.max : Math.max.apply(null, ys.concat([1]));
    if (hi === lo) hi = lo + 1;
    const X = (i) => L + (xs.length > 1 ? (i * (W - L - R)) / (xs.length - 1) : (W - L - R) / 2);
    const Y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
    const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => { const v = lo + (hi - lo) * f; return '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="' + C.grid + '"/><text x="' + (L - 6) + '" y="' + (Y(v) + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="' + C.sub + '">' + esc(o.fmt ? o.fmt(v) : Math.round(v)) + '</text>'; }).join('');
    const xl = xs.map((x, i) => (xs.length > 8 && i % 2 ? '' : '<text x="' + X(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" fill="' + C.sub + '">' + esc(x) + '</text>')).join('');
    const body = series.map((s) => { const segs = []; let cur = ''; s.pts.forEach((p, i) => { if (p.y == null) { cur = ''; return; } cur += (cur ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p.y).toFixed(1); }); const path = s.pts.map((p, i) => (p.y == null ? '' : '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="3.5" fill="' + s.color + '" tabindex="0"' + tip([s.name + ' · ' + (xs[i] || ''), (o.fmt ? o.fmt(p.y) : p.y) + (p.n != null ? ' · n = ' + p.n : '')]) + '><title>' + esc(s.name + ' ' + (xs[i] || '') + ': ' + (o.fmt ? o.fmt(p.y) : p.y)) + '</title></circle>')).join('');
      return '<path d="' + cur + '" fill="none" stroke="' + s.color + '" stroke-width="2.2" stroke-linejoin="round"/>' + path; }).join('');
    const leg = '<div class="an-lg">' + series.map((s) => '<span><i class="an-sq" style="background:' + s.color + '"></i>' + esc(s.name) + '</span>').join('') + '</div>';
    return leg + '<svg class="an-svg" viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + esc(o.aria || '') + '">' + grid + xl + body + '</svg>';
  }
  /* the shared formatting helpers, for the sections */
  Object.assign(PSY.anh, { C, pct, pctN, plural, fmt, dash, suppressed, tip, badge, kpi, card, empty, note, chips, simChip, hbars, vcols, stacked, lines, legend, flagSet, RX: () => '<span class="an-rx" data-an="restricted"><i aria-hidden="true">⊘</i>Restricted · clinical access</span>' });
  PSY.anSec = PSY.anSec || {};

  /* ---------- defaults, filters, the filter bar ---------- */
  const OPTS = {
    program: () => FB().opts('All programs', K().PROGRAMS),
    site: () => FB().opts('All locations', K().SITES.map((s) => [s[0], s[0]])),
    payer: () => FB().opts('All payers', ['aetna', 'anthem', 'humana', 'sentara', 'uhc'].map((k) => [k, K().PAY(k)]).sort((a, b) => a[1].localeCompare(b[1]))),
    clinician: () => { const F = K().filters(); if (F.caseload) return [[F.caseClin || '', F.caseClin || 'Your caseload']]; return FB().opts('All clinicians', K().CLINICIANS.map((c) => [c, c])); },
    dx: () => FB().opts('All diagnoses', K().DXS.map((d) => [d.k, d.label])),
    seg: () => K().SEGMENTS.map((x) => [x[0], x[1]]),
  };
  function ensureDefaults() {
    if (FB().get(PG, 'init', '') === '1') return;
    const d = K().DEFAULTS(); ['from', 'to', 'cmp'].forEach((k) => FB().set(PG, k, d[k])); FB().set(PG, 'init', '1');
  }
  function filterBar(F) {
    const dr = FB().dateRange(PG, { label: 'Reporting period', hint: 'Days the reporting period covers. The comparison period is the same length, just before it.', presets: [['30', 'Last 30 days', '2026-09-30', '2026-10-29'], ['90', 'Last 90 days', '2026-07-31', '2026-10-29'], ['q', 'This quarter', '2026-10-01', '2026-12-31'], ['sy', 'School year to date', '2026-08-01', '2026-10-29']], compact: true });
    const cmp = '<label class="an-sw-l"><button type="button" class="an-sw' + (F.cmp ? ' on' : '') + '" role="switch" aria-checked="' + F.cmp + '" aria-labelledby="an-cmp-l" data-act="an-cmp"></button><span id="an-cmp-l">Compare with previous period</span></label>';
    const sel = (k, label, opts) => { const v = FB().get(PG, k, ''); return '<label class="fb-f' + (v ? ' on' : '') + '"><span>' + esc(label) + '</span><select class="fb-s" data-change="an-set" data-k="' + esc(k) + '" aria-label="' + esc(label) + '">' + opts.map((o) => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></label>'; };
    const segV = FB().get(PG, 'seg', '') || 'all';
    const row2 = sel('program', 'Program', OPTS.program()) + sel('site', 'Location', OPTS.site()) + sel('payer', 'Payer', OPTS.payer()) + sel('clinician', 'Clinician', OPTS.clinician()) + sel('dx', 'Diagnosis', OPTS.dx()) + sel('seg', 'Patient population', OPTS.seg().map((x) => x));
    const W = K().window(F);
    return '<div class="an-fbar" data-an="filters"><div class="an-fr"><div class="an-frow">' + dr + '<div class="an-cmpw">' + cmp + '<span class="an-cmpt">' + (F.cmp ? esc(W.label) + ' vs ' + esc(W.prevLabel) : esc(W.label)) + '</span></div></div>' +
      '<div class="an-frow an-f2">' + row2 + '<button type="button" class="btn o s an-reset" data-act="an-reset">Reset Filters</button></div>' + (F.caseload ? '<p class="an-note" data-an="caseload">Showing your caseload (' + esc(F.caseClin || '') + '). The administrator sees every clinician.</p>' : '') + '</div></div>';
  }
  const cohortNotice = () => '<div class="an-notice" data-an="cohort-notice"><b>Simulated cohort.</b> ' + esc(K().all().length + ' fictional consumers generated for this demo (initials only). Figures are not Harvest Outreach Center results and do not reconcile with All Authorizations or Denial Intelligence, which hold the 11 demo consumers. Measures and rules are drafts to confirm with clinical leadership.') + '</div>';

  /* ---------- the page ---------- */
  const sectionKey = () => { const s = flagSet('sec'); return SECTIONS.some((x) => x[0] === s) ? s : 'outcomes'; };
  const askBtn = () => '<button type="button" class="btn o s an-ask-b" data-act="an-ask" data-an="ask-btn" title="Suggested questions with an answer, its data source and its calculation">Ask FLO</button>';
  const exportBtn = () => '<button type="button" class="btn p s" data-act="an-export" data-an="export-btn">Export Report</button>';
  const weekly = () => { const on = PSY.anr.weekly(); return '<div class="an-wk" data-an="weekly"><span id="an-wk-l">Weekly email · Mondays</span><button type="button" class="an-sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" aria-labelledby="an-wk-l" data-act="an-weekly"></button></div>'; };
  PSY.register({
    id: 'analytics', kind: 'web', nav: 'an', label: 'Analytics', url: 'analytics',
    get css() { return CSS + (PSY.anh.CSS2 || ''); },
    render() {
      ensureDefaults();
      const F = K().filters(); const sec = sectionKey(); const sx = PSY.anSec[sec];
      const tabs = '<div class="an-stabs" role="group" aria-label="Analytics sections" data-an="sections">' + SECTIONS.map((s) => '<button type="button" class="an-stab' + (s[0] === sec ? ' on' : '') + '" data-act="an-section" data-v="' + s[0] + '" aria-pressed="' + (s[0] === sec) + '">' + esc(s[1]) + '</button>').join('') + '</div>';
      const body = sx ? sx.html({ F, W: K().window(F), clin: PSY.can('clinicalRecords'), sec }) : empty('This section is not available.');
      return PSY.platform.page({ active: 'an', title: 'Analytics', actions: '<div class="an-hd-a">' + askBtn() + exportBtn() + weekly() + '</div>',
        body: cohortNotice() + tabs + filterBar(F) + '<div class="an-body" data-an="section" data-sec="' + sec + '">' + body + '</div>' });
    },
    mount(root) {
      const show = (el) => {
        const cardEl = el.closest('.an-c, .an-kpi, .an-pat, .card'); if (!cardEl) return; let t = cardEl.querySelector(':scope > .an-tip');
        if (!t) { t = document.createElement('div'); t.className = 'an-tip'; cardEl.style.position = 'relative'; cardEl.appendChild(t); }
        const lines = String(el.getAttribute('data-tip') || '').split('\n');
        t.innerHTML = '<div><b>' + esc(lines[0]) + '</b></div>' + lines.slice(1).map((l) => '<div>' + esc(l) + '</div>').join('');
        const cr = cardEl.getBoundingClientRect(), er = el.getBoundingClientRect(); t.classList.add('on');
        const tw = t.offsetWidth, th = t.offsetHeight; let left = er.left - cr.left + Math.min(er.width, 220) / 2 - tw / 2; left = Math.max(8, Math.min(cr.width - tw - 8, left));
        let top = er.top - cr.top - th - 8; if (top < 4) top = er.bottom - cr.top + 8; t.style.left = left + 'px'; t.style.top = top + 'px';
      };
      const hide = (el) => { const cardEl = el && el.closest && el.closest('.an-c, .an-kpi, .an-pat, .card'); const t = cardEl && cardEl.querySelector(':scope > .an-tip'); if (t) t.classList.remove('on'); };
      root.addEventListener('pointerover', (e) => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t && root.contains(t)) show(t); });
      root.addEventListener('pointerout', (e) => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t && !(e.relatedTarget && t.contains(e.relatedTarget))) hide(t); });
      root.addEventListener('focusin', (e) => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t) show(t); });
      root.addEventListener('focusout', (e) => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t) hide(t); });
    },
  });

  /* ---------- acts ---------- */
  const refocus = (sel) => { const r = PSY.activeRoot(); const n = r && r.querySelector(sel); if (n) { try { n.focus({ preventScroll: true }); } catch (e) { n.focus(); } } };
  PSY.acts['an-section'] = (el) => { FB().set(SEC, 'sec', el.getAttribute('data-v')); PSY.refresh(); refocus('[data-act="an-section"][data-v="' + el.getAttribute('data-v') + '"]'); };
  PSY.acts['an-set'] = (el) => { const k = el.getAttribute('data-k'); FB().set(PG, k, el.value); PSY.refresh(); refocus('[data-change="an-set"][data-k="' + k + '"]'); };
  PSY.acts['an-cmp'] = () => { const F = K().filters(); FB().set(PG, 'cmp', F.cmp ? '0' : '1'); PSY.refresh(); refocus('[data-act="an-cmp"]'); };
  PSY.acts['an-reset'] = () => {
    const d = K().DEFAULTS(); ['program', 'site', 'payer', 'clinician', 'dx', 'seg'].forEach((k) => FB().set(PG, k, '')); ['from', 'to', 'cmp'].forEach((k) => FB().set(PG, k, d[k])); FB().set(PG, 'init', '1');
    PSY.refresh(); PSY.ui.toast('Filters reset to the default period.'); refocus('[data-act="an-reset"]');
  };
  PSY.acts['an-weekly'] = (el) => {
    const on = !PSY.anr.weekly(); PSY.anr.setWeekly(on);
    const r = PSY.activeRoot(); (r ? Array.from(r.querySelectorAll('[data-act="an-weekly"]')) : [el]).forEach((b) => { b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
    PSY.ui.toast(on ? 'Weekly email on.' : 'Weekly email off.');
  };
  PSY.acts['an-flow'] = () => { if (PSY.flow && typeof PSY.flow.open === 'function') PSY.flow.open(); else PSY.ui.toast('FLO is not available.'); };

  /* the stylesheet: the shell and the sections (the sections share these classes) */
  const CSS = `
  .an-notice{background:#F4F7FB;border:1px solid #DCE6F3;border-radius:12px;padding:10px 14px;font-size:13px;line-height:1.45;color:#2E3B4E;margin-bottom:12px}
  .an-hd-a{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .an-ask-b{white-space:nowrap}
  .an-wk{display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:600;color:#1B1B19;background:#fff;border:1px solid #E5DCD0;border-radius:12px;padding:5px 8px 5px 12px}
  .an-sw{position:relative;width:40px;height:24px;border-radius:99px;background:#D9D2C6;border:0;cursor:pointer;padding:0;flex:0 0 40px;transition:background .15s}
  .an-sw:after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .15s;box-shadow:0 1px 2px rgba(0,0,0,.25)}
  .an-sw.on{background:#1D4F43}.an-sw.on:after{transform:translateX(16px)}
  .an-sw:focus-visible{outline:2px solid #1D4F43;outline-offset:2px}
  .an-sw-l{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#1B1B19}
  .an-stabs{display:inline-flex;flex-wrap:wrap;gap:4px;background:#EFE8DE;border-radius:12px;padding:4px;margin:4px 0 12px;max-width:100%}
  .an-stab{border:0;background:none;font:inherit;font-size:14px;font-weight:600;color:#4A453D;padding:8px 16px;border-radius:9px;cursor:pointer;white-space:nowrap}
  .an-stab:hover{color:#1D4F43}.an-stab.on{background:#fff;color:#1D4F43;box-shadow:0 1px 2px rgba(60,40,10,.14)}
  .an-stab:focus-visible,.an-hr:focus-visible,.an-chip:focus-visible,.an-id:focus-visible{outline:2px solid #1D4F43;outline-offset:2px}
  .an-fbar{margin-bottom:14px}
  .an-fr{display:flex;flex-direction:column;gap:10px;background:#FBF9F5;border:1px solid #E8E0D3;border-radius:14px;padding:12px 14px}
  .an-frow{display:flex;align-items:flex-end;gap:10px 14px;flex-wrap:wrap}
  .an-f2 .fb-f{min-width:150px}
  .an-f2 .fb-s{max-width:230px;width:100%}
  .an-cmpw{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .an-cmpt{font-size:12.5px;color:#6B665E}
  .an-reset{margin-left:auto}
  .an-body{display:flex;flex-direction:column;gap:18px}
  .an-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}
  .an-kpi{background:#fff;border:1px solid #E5DCD0;border-radius:14px;padding:12px 14px;display:flex;flex-direction:column;gap:4px;min-width:0}
  .an-kl{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#6B665E}
  .an-kv{font-size:26px;font-weight:600;line-height:1.1;color:#1B1B19;font-variant-numeric:tabular-nums}
  .an-ch{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;padding:14px 18px 0}
  .an-ch h2{font-size:17px;margin:0}
  .an-ch .sp{flex:1}
  .an-cb{padding:12px 18px 16px;display:flex;flex-direction:column;gap:12px;min-width:0}
  .an-c{position:relative;display:flex;flex-direction:column;min-width:0}
  .an-ks,.an-kd{font-size:12px;color:#6B665E;line-height:1.35}
  .an-ch-x{font-size:12.5px;font-weight:600;color:#1D4F43}
  .an-ch-v{font-size:12px;font-weight:700;border-radius:999px;padding:1px 8px;white-space:nowrap;align-self:flex-start}
  .an-chg{font-size:12px;font-weight:700;border-radius:999px;padding:2px 9px;align-self:flex-start;line-height:1.35;max-width:100%}
  .an-chg.good{background:#E3F2EC;color:#0E5C4A}.an-chg.bad{background:#FBE9E3;color:#8A2E1C}.an-chg.mute{background:#EFE8DE;color:#4A453D}
  .an-ch.good,.an-ch-v.good{background:#E3F2EC;color:#0E5C4A}.an-ch.bad,.an-ch-v.bad{background:#FBE9E3;color:#8A2E1C}.an-ch.mute,.an-ch-v.mute{background:#EFE8DE;color:#4A453D}
  .an-ch{}
  .an-n{font-size:12.5px;color:#6B665E;font-variant-numeric:tabular-nums}
  .an-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;align-items:stretch}
  .an-grid.one{grid-template-columns:minmax(0,1fr)}
  .an-empty{font-size:13.5px;color:#6B665E;padding:6px 0}
  .an-note{margin:0;font-size:12.5px;color:#6B665E;line-height:1.45}
  .an-lg{display:flex;gap:6px 16px;flex-wrap:wrap;font-size:12.5px;color:#4A453D;align-items:center}
  .an-lg span{display:inline-flex;align-items:center;gap:6px}
  .an-sq{display:inline-block;width:10px;height:10px;border-radius:2px;flex:0 0 10px}
  .an-chips{display:flex;flex-wrap:wrap;gap:6px}
  .an-chip{border:1px solid #D9CFBF;background:#fff;border-radius:999px;padding:5px 12px;font:inherit;font-size:12.5px;color:#4A453D;cursor:pointer}
  .an-chip:hover{border-color:#9FC2B0}
  .an-chip.on{background:#1D4F43;border-color:#1D4F43;color:#fff}
  .an-bd{display:inline-flex;align-items:center;font-size:12px;font-weight:700;border-radius:999px;padding:2px 9px;white-space:nowrap}
  .an-bd.good{background:#E3F2EC;color:#0E5C4A}.an-bd.bad{background:#FBE9E3;color:#8A2E1C}.an-bd.mute{background:#EFE8DE;color:#4A453D}.an-bd.warn{background:#FBF1D9;color:#6F4A05}.an-bd.od{background:#E8E5F3;color:#473B7A}
  .an-rx{display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:#EFE8DE;color:#4A453D;font-size:11.5px;font-weight:600;padding:2px 9px;white-space:nowrap;align-self:flex-start}
  .an-hb{display:flex;flex-direction:column;gap:7px}
  .an-hr{display:grid;grid-template-columns:var(--lw) minmax(0,1fr) 84px;column-gap:10px;align-items:center;min-height:26px;background:none;border:0;padding:2px 4px;font:inherit;color:inherit;text-align:left;border-radius:6px;width:100%}
  button.an-hr{cursor:pointer}button.an-hr:hover .l{color:#1D4F43;text-decoration:underline;text-underline-offset:2px}
  button.an-hr.on{background:#EEF4F0}button.an-hr.on .l{color:#1D4F43;font-weight:700}
  .an-hr .l{font-size:13px;color:#1B1B19;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
  .an-hr .l small{color:#6B665E;font-size:11.5px}
  .an-hr .p{height:14px;background:#F1ECE4;border-radius:4px;overflow:hidden;display:block}
  .an-hr .p i{display:block;height:100%;border-radius:4px}
  .an-hr b{font-size:12.5px;font-weight:600;text-align:right;font-variant-numeric:tabular-nums;color:#1B1B19}
  .an-vc{display:flex;align-items:flex-end;gap:6px;height:190px;padding-top:8px;min-width:0;overflow-x:auto}
  .an-vcol{flex:1 1 0;min-width:30px;height:100%;display:flex;flex-direction:column;align-items:center;gap:4px}
  .an-vcol .v{font-size:11.5px;font-weight:600;color:#1B1B19;font-variant-numeric:tabular-nums;white-space:nowrap}
  .an-vcol .b{flex:1 1 auto;width:100%;max-width:44px;display:flex;align-items:flex-end;background:#F4F0E9;border-radius:5px 5px 0 0;overflow:hidden;position:relative}
  .an-vcol .b i{display:block;width:100%;border-radius:4px 4px 0 0;min-height:0}
  .an-vcol .b.st{flex-direction:column-reverse;align-items:stretch}
  .an-vcol .b.st i{border-radius:0}
  .an-vcol .x{font-size:11px;color:#6B665E;text-align:center;line-height:1.2;white-space:nowrap}
  .an-svg{display:block;max-width:100%;height:auto;overflow:visible}
  .an-svg circle{cursor:default;outline:none}.an-svg circle:focus-visible{stroke:#1D4F43;stroke-width:2}
  .an-tip{position:absolute;z-index:6;pointer-events:none;background:#fff;border:1px solid #E5DCD0;border-radius:10px;box-shadow:0 6px 20px rgba(60,40,10,.12);padding:8px 11px;font-size:12.5px;line-height:1.45;color:#1B1B19;max-width:280px;opacity:0;transition:opacity .08s}
  .an-tip.on{opacity:1}.an-tip b{font-weight:600}.an-tip div+div{color:#4A453D}
  .an-table{width:100%;border-collapse:collapse;font-size:13px}
  .an-tw{overflow-x:auto;margin:0 -4px;padding:0 4px}
  .an-table th{text-align:left;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:#6B665E;font-weight:700;padding:7px 8px;border-bottom:1px solid #EFE8DE;white-space:nowrap}
  .an-table th button{background:none;border:0;padding:0;font:inherit;color:inherit;letter-spacing:inherit;text-transform:inherit;cursor:pointer;font-weight:700}
  .an-table td{padding:9px 8px;border-bottom:1px solid #EFE8DE;vertical-align:top;line-height:1.4}
  .an-table tr:last-child td{border-bottom:0}
  .an-table td.n{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .an-table small{display:block;color:#6B665E;font-size:11.5px;margin-top:2px}
  .an-id{background:none;border:0;padding:0;font:inherit;font-weight:700;color:#1D4F43;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
  .an-row-on td{background:#F4F9F6}
  .an-acts{display:flex;gap:6px;flex-wrap:wrap}
  .an-acts .btn{min-height:30px;padding:0 10px;font-size:12.5px}
  .an-ins{display:flex;flex-direction:column;gap:10px}
  .an-in{border:1px solid #DCE6F3;background:#F4F7FB;border-radius:12px;padding:11px 14px;display:flex;flex-direction:column;gap:5px}
  .an-in p{margin:0;font-size:13.5px;line-height:1.45;color:#1B1B19}
  .an-in .ev{font-size:12px;color:#4A453D;line-height:1.4}
  .an-tl{display:flex;flex-direction:column;gap:0;border-left:2px solid #E5DCD0;margin-left:8px;padding-left:16px}
  .an-te{position:relative;padding:8px 0 10px;border-bottom:1px solid #F1ECE4}
  .an-te:last-child{border-bottom:0}
  .an-te:before{content:"";position:absolute;left:-23px;top:13px;width:10px;height:10px;border-radius:50%;background:#fff;border:2px solid #9A9388}
  .an-te.k-dx:before{border-color:#4F7CAC}.an-te.k-iv:before{border-color:#168A72}.an-te.k-as:before{border-color:#C9543A}.an-te.k-fb:before{border-color:#B88A0A}.an-te.k-goal:before{border-color:#8B5FBF}
  .an-te .h{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;font-size:13px}
  .an-te .h b{font-weight:600}
  .an-te .d{font-size:12.5px;color:#4A453D;line-height:1.4;margin-top:2px}
  .an-tag{font-size:11px;font-weight:700;border-radius:999px;padding:1px 8px;background:#EFE8DE;color:#4A453D}
  .an-tag.ai{background:#E8E5F3;color:#473B7A}.an-tag.pend{background:#FBF1D9;color:#6F4A05}.an-tag.obs{background:#EFE8DE;color:#6B665E}
  .an-dl{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
  .an-tile{background:#F7F3EC;border:1px solid #EFE8DE;border-radius:12px;padding:10px 12px;display:flex;flex-direction:column;gap:3px}
  .an-tile b{font-size:20px;font-weight:600;font-variant-numeric:tabular-nums}
  .an-tile span{font-size:12px;color:#4A453D;line-height:1.35}
  .an-tile .lbl{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#6B665E}
  .an-q{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px}
  .an-qb{text-align:left;border:1px solid #DCE6F3;background:#fff;border-radius:10px;padding:10px 12px;font:inherit;font-size:13.5px;color:#1B1B19;cursor:pointer}
  .an-qb:hover{border-color:#9FC2B0;background:#F4F9F6}
  .an-ans{display:flex;flex-direction:column;gap:12px}
  .an-ans h3{margin:0;font-size:16px}
  .an-ans p{margin:0;font-size:13.5px;line-height:1.5}
  .an-src{font-size:12.5px;color:#4A453D;line-height:1.5;background:#F7F3EC;border-radius:10px;padding:10px 12px}
  .an-src b{font-weight:600}
  .an-mt{display:flex;flex-direction:column;gap:6px}
  .an-mrow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;font-size:13px;align-items:baseline}
  .an-mrow b{font-variant-numeric:tabular-nums}
  @media (max-width:1180px){.an-grid{grid-template-columns:minmax(0,1fr)}}
  @media (max-width:700px){.an-hr{grid-template-columns:minmax(0,1fr) 60px}.an-hr .p{display:none}}
  `;
  PSY.anh.CSS = CSS;
  PSY.anh.CSS2 = `
  .an-hb-h{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#6B665E;margin:0 0 6px}
  .an-h2{font-size:21px;font-weight:600;color:#1B1B19;margin:14px 0 -6px;padding-top:12px;border-top:1px solid #E5DCD0}
  .an-sum{background:#FBF9F5;border:1px solid #E8E0D3;border-radius:12px;padding:12px 16px;font-size:13.5px;line-height:1.5}
  .an-sum ul{margin:6px 0 0 18px;padding:0}
  .an-sum .an-tag{margin-left:6px}
  .an-fbc{display:flex;flex-direction:column;gap:8px;padding:10px 0;border-top:1px solid #EFE8DE}
  .an-fbc:first-child{border-top:0;padding-top:0}
  .an-fbc h3{margin:0;font-size:14px}
  .an-fbs{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
  .an-tl-h{display:flex;flex-direction:column;gap:4px}
  .an-tl-s{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .an-tl-pick{display:flex;align-items:center;gap:8px;font-size:13px;color:#4A453D;flex-wrap:wrap}
  .an-tl-pick select{height:34px;border:1px solid #E0D6C9;border-radius:9px;padding:0 8px;font:inherit;background:#fff;min-width:260px}
  .an-free{display:flex;gap:10px;align-items:flex-end;margin-top:12px;flex-wrap:wrap}
  .an-free .fb-f{flex:1 1 260px}
  .an-exp{display:flex;flex-direction:column;gap:12px}
  .an-ok{margin-left:auto}
  .an-fbar2 .fb-f{max-width:300px}
  `;
  PSY.anh.askOpen = () => { if (PSY.anSec.ask && PSY.anSec.ask.open) PSY.anSec.ask.open(); };
  PSY.anh.exportOpen = () => { if (PSY.anSec.export && PSY.anSec.export.open) PSY.anSec.export.open(); };
  PSY.acts['an-ask'] = () => PSY.anh.askOpen();
  PSY.acts['an-export'] = () => PSY.anh.exportOpen();

  /* presenter scenarios: 8 (admin, Payer Performance on denial patterns), 9 (admin, Patient Population), 13 (clinician, Patient Outcomes) */
  PSY.presenter = PSY.presenter || {}; PSY.presenter.prep = PSY.presenter.prep || {};
  const prep = (role, sec) => () => { PSY.state.role = role; PSY.state.fb = PSY.state.fb || {}; delete PSY.state.fb[PG]; PSY.state.fb[SEC] = { sec }; PSY.save(); };
  PSY.presenter.prep.s8 = prep('admin', 'payer'); PSY.presenter.prep.s9 = prep('admin', 'population'); PSY.presenter.prep.s13 = prep('lcs', 'outcomes');
})();
