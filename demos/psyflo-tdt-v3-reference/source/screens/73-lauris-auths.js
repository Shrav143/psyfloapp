/* Lauris > Authorizations.
   lauris-auths            list of authorization requests and authorizations (filters: consumer, status, payer). "Open" opens the DMAS form.
   lauris-auths?c=4471     the authorization history of one consumer: current and previous authorizations (numbers, dates, units, status),
                           the requests, and the request history (PSY.auth.timeline: seed history + the audit trail of this session).
   lauris-auth?id=R-0416   one authorization: summary, history, units used, and a button that opens the DMAS form.
   Statuses come from the case stage and the T.W. flow (see PSY.l2.status in 70-l2-util.js). Filtering is DOM only (no PSY.refresh on Lauris pages). */
(function () {
  'use strict';
  const PSY = window.PSY;
  if (!PSY) return;
  const L2 = (PSY.l2 = PSY.l2 || {});
  const esc = PSY.esc;
  const LD = () => PSY.data.lauris;

  const SERVICE = (c) => (c.service === 'Outpatient' ? 'Outpatient counseling' : c.service + ' · ' + c.code);
  const SVC_CODE = (c) => (c.service === 'Outpatient' ? ['Outpatient', 'counseling'] : [c.code, c.service.replace(/^TDT /, '')]);
  /* units awarded on the current authorization (demo values), to draw "units used" */
  const AWARD = { 'R-0411': 110, 'R-0402': 110, 'R-0388': 65, 'R-0395': 80, 'R-0380': 60, 'R-0377': 24 };

  const CSS = `
  .lz-main{container-type:inline-size;container-name:lzm}
  .au-filters{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;padding:10px 14px;margin-bottom:10px}
  .au-filters .f{display:flex;flex-direction:column;min-width:150px;flex:0 1 190px}
  .au-filters .lsel{width:100%}
  .au-count{margin-left:auto;font-size:12px;color:#6B7280;align-self:center}
  .au-t th,.au-t td{padding:9px 9px}.au-t td:nth-child(2){min-width:118px}.au-t td{vertical-align:top}.au-t td small{display:block;color:#6B7280;font-size:11.5px;margin-top:1px}
  .au-t td.num{white-space:nowrap}
  .au-st{display:inline-block;border-radius:3px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap;border:1px solid transparent}
  .au-st.n{background:#EEF0F3;color:#3B4656;border-color:#D5D9DF}.au-st.b{background:#E3EDFB;color:#1F4E8C;border-color:#B9CDEB}.au-st.y{background:#FFF1D6;color:#8A5A00;border-color:#EDCB86}.au-st.r{background:#FBE5E0;color:#9B2C17;border-color:#EBB3A8}.au-st.g{background:#E1F2E7;color:#1E6B40;border-color:#B5D9C3}
  .au-t .c-wide{display:none}.au-t .c-narrow{display:block}.au-t td.num{white-space:normal}
  @container lzm (min-width:900px){.au-t .c-wide{display:table-cell}.au-t .c-narrow{display:none}.au-t td.num{white-space:nowrap}}
  .au-empty{padding:22px;text-align:center;color:#6B7280}
  .au-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:12px;margin-bottom:12px;align-items:start}
  .au-card{padding:12px 16px}.au-card h4{margin:0 0 8px;font-size:13px;color:#1F3B6B}
  .au-dl{display:grid;grid-template-columns:140px minmax(0,1fr);gap:7px 12px;margin:0;font-size:13px}.au-dl dt{color:#6B7280;font-size:12px;text-transform:uppercase;letter-spacing:.03em;padding-top:2px}.au-dl dd{margin:0}
  .au-open{display:flex;flex-direction:column;gap:8px}.au-open .lb{align-self:flex-start;font-size:14px;padding:10px 18px}
  .au-open p{margin:0;font-size:12.5px;line-height:1.5;color:#444}
  .au-hist{width:100%;border-collapse:collapse;font-size:12.5px}.au-hist td{padding:6px 8px;border-top:1px solid #E7E9ED;vertical-align:top}.au-hist td:first-child{width:128px;color:#6B7280;white-space:nowrap}
  .au-chart{display:flex;flex-direction:column;gap:8px}
  .au-bar{height:14px;background:#E9ECF0;border-radius:3px;overflow:hidden;display:flex}.au-bar i{display:block;height:100%}.au-bar .u{background:#1F4E8C}.au-bar .a{background:#9DB8DE}
  .au-leg{display:flex;gap:14px;font-size:12px;color:#444;flex-wrap:wrap}.au-leg span:before{content:'';display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;background:#1F4E8C;vertical-align:-1px}.au-leg span.a:before{background:#9DB8DE}
  @container lzm (max-width:760px){.au-grid{grid-template-columns:minmax(0,1fr)}}
  .au-acts{white-space:nowrap}.au-acts .lk+.lk{margin-left:10px}
  .au-hl{font-size:12px;font-weight:400;margin-left:10px}
  .ah-sum{display:flex;flex-wrap:wrap;gap:6px 26px;padding:10px 16px;margin-bottom:12px;font-size:13px}.ah-sum span{display:block;color:#6B7280;font-size:11px;text-transform:uppercase;letter-spacing:.03em}
  .ah-h{font-size:13px;font-weight:700;color:#1F3B6B;margin:16px 0 6px;display:flex;align-items:baseline;gap:10px}.ah-h small{font-weight:400;color:#6B7280;font-size:12px}
  .ah-t td,.ah-t th{padding:8px 9px;vertical-align:top}.ah-t td small{display:block;color:#6B7280;font-size:11.5px;margin-top:1px}.ah-t td.num{white-space:nowrap;text-align:right}.ah-t th.num{text-align:right}
  .ah-t tr.cur td{background:#F5F9FF}
  .ah-tl td:first-child{width:128px;color:#6B7280;white-space:nowrap}.ah-tl td:nth-child(3){color:#525B66;width:150px}
  .ah-note{font-size:12px;color:#6B7280;margin:6px 0 0}
  .ah-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:12px;align-items:start}
  @container lzm (max-width:820px){.ah-grid{grid-template-columns:minmax(0,1fr)}}
  `;

  /* ------------------------------------------------------------------ rows */
  function reqType(c) { return c.type; }
  function rowsModel() {
    const L = LD(); const rows = [];
    PSY.allCases().forEach((c) => {
      const r = L.byCase(c.id); const kind = L2.kind(c.id); const st = L2.status(c.id); const d = L2.dates(c.id); const p = L2.payer(c.id);
      const avail = r && L.units(r) != null ? L.units(r) : null;
      const outpatient = !kind;
      rows.push({
        cid: c.id, ini: c.ini, cons: r ? r.id : '', item: outpatient ? 'Authorization' : reqType(c), sub: outpatient || c.stage === 'active' ? (r && r.auth ? r.auth : '') : (kind === 'init' ? 'Initial SRA form' : 'Concurrent SRA form'),
        service: SVC_CODE(c), payer: p.short, payerKey: c.payer, dates: d[0] + ' – ' + d[1], units: c.units && c.units.line || '', avail: avail == null ? '' : avail + ' units available' + (r && r.ends && c.stage === 'active' ? ' · ends ' + r.ends : ''),
        st, open: kind ? 'lauris-dmas?case=' + c.id : 'lauris-auth?id=' + c.id, auth: false,
      });
      if (r && r.auth && c.stage !== 'active') {
        rows.push({ cid: c.id, ini: c.ini, cons: r.id, item: 'Authorization', sub: r.auth, service: SVC_CODE(c), payer: p.short, payerKey: c.payer, dates: 'ends ' + r.ends, units: '', avail: avail + ' units available', st: { key: 'active', label: 'Approved · active', tone: 'g' }, open: 'lauris-auth?id=' + c.id, auth: true });
      }
    });
    return rows;
  }
  const rowHtml = (r) => '<tr class="hov" data-ini="' + esc(r.ini) + '" data-status="' + esc(r.st.label) + '" data-payer="' + esc(r.payerKey) + '" data-cid="' + esc(r.cid) + '">'
    + '<td><a class="lk" data-go="lauris-consumer?c=' + esc(r.cons) + '">' + esc(r.ini) + '</a><small class="c-narrow">' + esc(r.payer) + '</small></td>'
    + '<td>' + esc(r.item) + (r.sub ? '<small>' + esc(r.sub) + '</small>' : '') + '<small class="c-narrow">' + esc(r.service[0] + ' · ' + r.service[1]) + '</small></td>'
    + '<td class="c-wide">' + esc(r.service[0]) + '<small>' + esc(r.service[1]) + '</small></td><td class="c-wide">' + esc(r.payer) + '</td><td class="num">' + esc(r.dates) + '</td>'
    + '<td>' + (r.units ? esc(r.units) : '<span class="lmuted">—</span>') + (r.avail ? '<small>' + esc(r.avail) + '</small>' : '') + '</td>'
    + '<td><span class="au-st ' + r.st.tone + '">' + esc(r.st.label) + '</span></td>'
    + '<td class="au-acts"><a class="lk" data-go="' + esc(r.open) + '" data-psy="open-' + esc(r.cid) + (r.auth ? '-auth' : '') + '">Open</a>' + (r.cons && !r.auth ? '<a class="lk" data-go="lauris-auths?c=' + esc(r.cons) + '" data-psy="hist-' + esc(r.cons) + '">History</a>' : '') + '</td></tr>';

  function renderList() {
    const rows = rowsModel();
    const inis = Array.from(new Set(rows.map((r) => r.ini)));
    const stats = Array.from(new Set(rows.map((r) => r.st.label)));
    const pays = Array.from(new Set(rows.map((r) => r.payerKey))).map((k) => [k, (PSY.data.payers[k] || {}).name || k]);
    const sel = (id, label, opts) => '<div class="f"><label>' + label + '</label><select class="lsel" id="' + id + '" data-psy="' + id + '"><option value="">All</option>' + opts.map((o) => '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>').join('') + '</select></div>';
    const main = '<h3 class="lh1">Authorizations</h3>'
      + '<div class="lcard au-filters">' + sel('au-cons', 'Consumer', inis.map((x) => [x, x])) + sel('au-stat', 'Status', stats.map((x) => [x, x])) + sel('au-pay', 'Payer', pays)
      + '<button class="lb" data-act="au-clear">Clear</button><span class="au-count" data-psy="count">Showing ' + rows.length + ' of ' + rows.length + '</span></div>'
      + '<table class="lt au-t" data-psy="auth-table"><thead><tr><th>Consumer</th><th>Request type</th><th class="c-wide">Service</th><th class="c-wide">Payer</th><th>Dates</th><th>Units</th><th>Status</th><th></th></tr></thead><tbody>' + rows.map(rowHtml).join('') + '</tbody></table>'
      + '<div class="au-empty" data-psy="none" hidden>Nothing to show</div>';
    return PSY.lauris.page({ active: 'Authorizations', main, panel: { context: 'Authorizations', notes: '<div class="xcard"><div class="cap">Authorizations</div></div>' } });
  }
  function mountList(root) {
    const g = (id) => root.querySelector('#' + id);
    const apply = () => {
      const a = g('au-cons').value, b = g('au-stat').value, c = g('au-pay').value; let n = 0; const trs = Array.from(root.querySelectorAll('[data-psy="auth-table"] tbody tr'));
      trs.forEach((tr) => { const ok = (!a || tr.getAttribute('data-ini') === a) && (!b || tr.getAttribute('data-status') === b) && (!c || tr.getAttribute('data-payer') === c); tr.hidden = !ok; if (ok) n++; });
      root.querySelector('[data-psy="count"]').textContent = 'Showing ' + n + ' of ' + trs.length;
      root.querySelector('[data-psy="none"]').hidden = n > 0; root.querySelector('[data-psy="auth-table"]').hidden = n === 0;
    };
    ['au-cons', 'au-stat', 'au-pay'].forEach((id) => g(id).addEventListener('change', apply));
    PSY.acts['au-clear'] = () => { ['au-cons', 'au-stat', 'au-pay'].forEach((id) => { g(id).value = ''; }); apply(); };
  }

  /* ------------------------------------------------------------------ one authorization */
  function weeks(used) {
    const w = [0.9, 1.05, 1, 1.1, 0.95, 1, 1.05, 0.95]; const sum = w.reduce((n, x) => n + x, 0); const out = w.map((x) => Math.round((used * x) / sum));
    out[out.length - 1] += used - out.reduce((n, x) => n + x, 0); return out;
  }
  function unitsBlock(cid) {
    const r = L2.roster(cid); const L = LD(); const c = PSY.caseView(cid); const avail = r ? L.units(r) : null; const cur = PSY.auth ? (PSY.auth.units(cid) || {}).current : null; const award = (cur && cur.authorized) || AWARD[cid];
    if (avail == null || !award) {
      return '<div class="au-chart"><div style="font-size:13px">No units used</div><div class="lmuted">' + esc(c.units && c.units.line || '') + '</div></div>';
    }
    const used = Math.max(0, award - avail); const wk = weeks(used); const mx = Math.max.apply(null, wk) || 1;
    const bars = wk.map((v, i) => '<rect x="' + (i * 34 + 6) + '" y="' + (62 - Math.round((v / mx) * 52)) + '" width="24" height="' + Math.round((v / mx) * 52) + '" rx="2" fill="#1F4E8C"/><text x="' + (i * 34 + 18) + '" y="75" font-size="9" text-anchor="middle" fill="#6B7280" font-family="Arial">w' + (i + 1) + '</text><text x="' + (i * 34 + 18) + '" y="' + (58 - Math.round((v / mx) * 52)) + '" font-size="9" text-anchor="middle" fill="#333" font-family="Arial">' + v + '</text>').join('');
    return '<div class="au-chart"><div class="au-bar"><i class="u" style="width:' + (used / award * 100) + '%"></i><i class="a" style="width:' + (avail / award * 100) + '%"></i></div>'
      + '<div class="au-leg"><span>Used ' + used + '</span><span class="a">Available ' + avail + '</span><span style="color:#6B7280">of ' + award + ' awarded</span></div>'
      + '<svg viewBox="0 0 280 80" width="100%" height="84" role="img" aria-label="Units used per week, last 8 weeks">' + bars + '</svg><div class="lmuted">Units used per week, last 8 weeks · Illustrative demo data</div></div>';
  }
  function historyRows(cid) {
    if (PSY.auth && PSY.auth.timeline) return PSY.auth.timeline(cid).slice().reverse().map((e) => [e.t, e.action]);
    const h = ((PSY.data.hub || {})[cid] || {}).history || []; const live = (PSY.state.log || []).filter((l) => l.case === cid).map((l) => ['Oct 29 · ' + l.t, l.text]);
    const old = h.slice().reverse().map((x) => [x.t, x.text]);
    return live.concat(old);
  }
  function renderAuth(params) {
    const cid = PSY.caseById(params.id || params.case) ? (params.id || params.case) : 'R-0416';
    const c = PSY.caseView(cid); const r = L2.roster(cid) || {}; const kind = L2.kind(cid); const st = L2.status(cid); const d = L2.dates(cid); const p = L2.payer(cid);
    const dl = (k, v) => '<dt>' + k + '</dt><dd>' + v + '</dd>';
    const summary = '<dl class="au-dl">' + dl('Consumer', esc(c.who) + ' · Harvest # ' + esc(r.id || '')) + dl('Request type', esc(c.type)) + dl('Service', esc(SERVICE(c))) + dl('Payer', esc(p.name) + (p.channel ? ' · ' + esc(p.channel) : ''))
      + dl('Dates', esc(d[0] + ' – ' + d[1])) + dl('Units', esc((c.units && c.units.line) || '') + (r.id && LD().units(r) != null ? '<br><span class="lmuted">' + esc(LD().unitsLabel(r)) + (r.ends ? ' · ending ' + esc(r.ends) : '') + '</span>' : ''))
      + dl('Status', '<span class="au-st ' + st.tone + '">' + esc(st.label) + '</span>') + dl('Authorization', esc(r.auth || 'none on file')) + '</dl>';
    const open = kind
      ? '<div class="au-open"><div style="font-weight:700">' + esc(L2.TITLE[kind]) + '</div><div class="lmuted">DMAS form, ' + L2.EDITION[kind] + '</div><button class="lb pri" data-go="lauris-dmas?case=' + cid + '" data-psy="open-dmas">Open the DMAS form</button></div>'
      : '<div class="au-open"><div style="font-weight:700">Outpatient authorization</div></div>';
    const hist = historyRows(cid);
    const main = '<div class="dm-crumbs" style="font-size:12px;color:#6B7280;margin-bottom:8px"><a class="lk" data-go="lauris-auths">Authorizations</a> › <span style="color:#333">' + esc(c.ini) + '</span></div>'
      + '<h3 class="lh1">' + esc(c.ini) + ' · ' + esc(c.type) + (r.id ? ' <a class="lk au-hl" data-go="lauris-auths?c=' + esc(r.id) + '" data-psy="history-link">Authorization history</a>' : '') + '</h3>'
      + '<div class="au-grid"><div class="lcard au-card"><h4>Summary</h4>' + summary + '</div><div class="lcard au-card"><h4>Form</h4>' + open + '</div></div>'
      + '<div class="au-grid"><div class="lcard au-card"><h4>History</h4><table class="au-hist">' + (hist.length ? hist.map((x) => '<tr><td>' + esc(x[0]) + '</td><td>' + esc(x[1]) + '</td></tr>').join('') : '<tr><td colspan="2" class="lmuted">No history yet.</td></tr>') + '</table></div>'
      + '<div class="lcard au-card"><h4>Units used</h4>' + unitsBlock(cid) + '</div></div>';
    return PSY.lauris.page({ active: 'Authorizations', main, panel: { context: 'Authorization · ' + c.ini, notes: '<div class="xcard"><div class="cap">This authorization</div><div class="tx" style="margin-top:3px">' + esc(c.ini) + ' · ' + esc(c.type) + '</div></div>', case: cid } });
  }

  /* ------------------------------------------------------------------ one consumer's authorization history (lauris-auths?c=4471) */
  const MMDD = (s) => { const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']; const m = /^([A-Z][a-z]{2}) (\d{1,2})/.exec(String(s || '')); if (!m) return s || ''; const mo = MON.indexOf(m[1]); if (mo < 0) return s; return String(mo + 1).padStart(2, '0') + '/' + String(+m[2]).padStart(2, '0') + '/' + (mo >= 7 ? 2026 : 2027); };
  const period = (p) => String(p || '').split(/\s*[–-]\s*/).map(MMDD).join(' – ');
  const TONE = { green: 'g', amber: 'y', red: 'r', blue: 'b', gray: 'n' };
  const st5 = (k, label) => '<span class="au-st ' + (TONE[PSY.auth.tone(k)] || 'n') + '">' + esc(label || PSY.auth.label(k)) + '</span>';
  /* earlier authorizations, from the case history (only what the record says; no invented numbers) */
  const EARLIER = {
    'R-0411': [{ ref: 'First authorization', dates: 'from 02/03/2026', note: 'Admitted to TDT school day; first authorization from Anthem.' }],
    'R-0395': [{ ref: 'Earlier authorizations', dates: 'from 01/2026', note: 'Admitted to TDT school day in January. Details are not in this record.' }],
  };
  function historyPage(lid) {
    const L = LD(); const lc = L.byId(String(lid)); if (!lc) return renderList();
    const cid = lc.case; const c = cid ? PSY.caseView(cid) : null; const A = PSY.auth;
    const crumbs = '<div class="dm-crumbs" style="font-size:12px;color:#6B7280;margin-bottom:8px"><a class="lk" data-go="lauris-auths">Authorizations</a> › <span style="color:#333">' + esc(lc.ini) + '</span></div>';
    if (!c || !A) {
      const main = crumbs + '<h3 class="lh1">Authorization history · ' + esc(lc.ini) + '</h3><div class="lcard au-empty">No authorizations on file</div>';
      return PSY.lauris.page({ active: 'Authorizations', main, panel: { context: 'Authorization history · ' + esc(lc.ini) } });
    }
    const m = A.meta(cid); const u = A.units(cid); const st = A.status(cid); const svc = u.service; const un = svc.units; const p = L2.payer(cid);
    const cur = u.current; const sub = PSY.caseView(cid).sendNote || '';
    const sum = '<div class="lcard ah-sum" data-psy="ah-summary"><div><span>Consumer</span>' + esc(c.who) + ' · Harvest # ' + esc(lc.id) + '</div><div><span>Group</span>' + esc(lc.group) + '</div><div><span>Payer</span>' + esc(p.name) + '</div><div><span>Service</span>' + esc(svc.label) + (svc.code ? ' · ' + esc(svc.code) : '') + '</div><div><span>Units</span>' + esc(svc.rule) + '</div></div>';
    /* authorizations: the one in force, then earlier ones */
    const auths = [];
    if (cur) {
      const ending = cur.perDay && u.daysLeft != null && u.daysLeft <= 10;
      auths.push('<tr class="cur" data-psy="ah-current"><td><b>' + esc(lc.auth || m.ref || '') + '</b><small>Current</small></td><td>' + esc(svc.code || svc.short) + '<small>' + esc(svc.short) + '</small></td><td>' + esc(MMDD(cur.start) + ' – ' + MMDD(cur.end)) + '</td><td class="num">' + cur.authorized + '</td><td class="num">' + cur.used + '</td><td class="num"><b>' + cur.remaining + '</b>' + (u.daysLeft != null && cur.perDay ? '<small>≈' + u.daysLeft + ' school days</small>' : '') + '</td><td>' + (ending ? '<span class="au-st y">Active · ending ' + esc(MMDD(cur.end)) + '</span>' : '<span class="au-st g">Approved · active</span>') + '</td></tr>');
    }
    if (m.prior) auths.push('<tr><td>Previous<small>number not in this record</small></td><td>' + esc(svc.code || svc.short) + '</td><td>—</td><td class="num">' + esc(m.prior.authorized) + '</td><td class="num">' + esc(m.prior.authorized) + '</td><td class="num">0<small>' + esc(m.prior.note || '') + '</small></td><td><span class="au-st n">Ended</span></td></tr>');
    (EARLIER[cid] || []).forEach((e) => auths.push('<tr><td>' + esc(e.ref) + '<small>' + esc(e.note) + '</small></td><td>' + esc(svc.code || svc.short) + '</td><td>' + esc(e.dates) + '</td><td class="num">—</td><td class="num">—</td><td class="num">—</td><td><span class="au-st n">Ended</span></td></tr>'));
    const authTable = auths.length ? '<table class="lt ah-t" data-psy="ah-auths"><thead><tr><th>Authorization #</th><th>Service</th><th>Dates</th><th class="num">Authorized</th><th class="num">Used</th><th class="num">Remaining</th><th>Status</th></tr></thead><tbody>' + auths.join('') + '</tbody></table>' : '<div class="lcard au-empty">No authorization in force yet.</div>';
    /* requests: the open (or decided) request, then the one behind the current authorization */
    const reqs = []; const d = m.decision || {}; const appr = u.approved != null ? u.approved : d.approved;
    const curIsReq = cur && u.period && MMDD(cur.start) === MMDD(String(u.period).split(/\s*[–-]\s*/)[0]);
    if (u.requested != null && (st !== 'approved' || (PSY.state.cases[cid] || {}).csStarted)) {
      const kind = m.kind === 'continued' ? 'Concurrent SRA' : 'Initial SRA';
      reqs.push('<tr data-psy="ah-request"><td><b>' + esc(kind) + '</b><small>' + esc(L2.kind(cid) ? L2.TITLE[L2.kind(cid)] : 'Authorization request') + '</small></td><td>' + esc(period(u.period)) + '</td><td class="num">' + esc(u.requested) + '</td><td class="num">' + (appr != null && st !== 'review' && st !== 'ready' ? esc(appr) : '—') + '</td><td>' + esc(sub || (m.submitted ? m.submitted.via + ' · ' + m.submitted.ref : '—')) + '</td><td>' + st5(st) + '</td></tr>');
    } else if (u.requested != null) {
      reqs.push('<tr data-psy="ah-request"><td><b>Next concurrent SRA</b><small>not started</small></td><td>' + esc(period(u.period)) + '</td><td class="num">' + esc(u.requested) + '</td><td class="num">—</td><td>—</td><td><span class="au-st n">Not started</span></td></tr>');
    }
    if (cur && !curIsReq) {
      const line = (c.units && c.units.line) || ''; const mm = /^(\d+)\s*→\s*(\d+) awarded/.exec(line);
      reqs.push('<tr><td>Request for ' + esc(lc.auth || m.ref || 'the current authorization') + '<small>authorization in force</small></td><td>' + esc(MMDD(cur.start) + ' – ' + MMDD(cur.end)) + '</td><td class="num">' + (mm ? esc(mm[1]) : '—') + '</td><td class="num">' + cur.authorized + '</td><td>—</td><td><span class="au-st g">Approved</span></td></tr>');
    }
    const reqTable = '<table class="lt ah-t" data-psy="ah-requests"><thead><tr><th>Request</th><th>Period</th><th class="num">Units requested</th><th class="num">Units approved</th><th>Submitted</th><th>Status</th></tr></thead><tbody>' + (reqs.join('') || '<tr><td colspan="6" class="lmuted">No requests on file.</td></tr>') + '</tbody></table>';
    const tl = A.timeline(cid).slice().reverse();
    const tlTable = '<table class="lt ah-t ah-tl" data-psy="ah-timeline"><thead><tr><th>Date</th><th>Event</th><th>By</th><th>Status</th></tr></thead><tbody>' + (tl.length ? tl.map((e) => '<tr><td>' + esc(e.t) + '</td><td>' + esc(e.action) + (e.doc ? '<small>' + esc(e.doc) + '</small>' : '') + '</td><td>' + esc(e.by) + '</td><td>' + (e.status ? esc(A.label(e.status)) : '') + '</td></tr>').join('') : '<tr><td colspan="4" class="lmuted">No events yet.</td></tr>') + '</tbody></table>';
    const main = crumbs + '<h3 class="lh1">Authorization history · ' + esc(c.who) + '</h3>' + sum +
      '<div class="ah-h">Authorizations</div>' + authTable +
      '<div class="ah-h">Requests</div>' + reqTable +
      '<div class="ah-grid"><div><div class="ah-h">Request history</div>' + tlTable + '</div><div><div class="ah-h">Units used</div><div class="lcard au-card">' + unitsBlock(cid) + '</div>' +
      (L2.kind(cid) ? '<div class="lcard au-card" style="margin-top:12px"><div class="au-open"><a class="lk" data-go="lauris-auth?id=' + esc(cid) + '">Open the authorization</a></div></div>' : '') + '</div></div>';
    return PSY.lauris.page({ active: 'Authorizations', main, panel: { context: 'Authorization history · ' + esc(lc.ini), case: cid } });
  }

  PSY.register({ id: 'lauris-auths', app: 'lauris', label: 'Authorizations', url: (p) => 'authorizations' + (p && p.c ? '?consumer=' + p.c : ''), css: CSS, render: (p) => (p && p.c ? historyPage(p.c) : renderList()), mount: (root, ctx) => { if (!(ctx && ctx.params && ctx.params.c)) mountList(root); } });
  PSY.register({
    id: 'lauris-auth', app: 'lauris', label: 'Authorization', css: CSS, render: (p) => renderAuth(p || {}),
    url: (p) => 'authorizations/' + ((L2.roster((p && (p.id || p.case)) || 'R-0416') || {}).id || ''),
  });
})();
