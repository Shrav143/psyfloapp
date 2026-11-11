/* Denial Intelligence (platform tab 2, route 'denials'). Round 11 (BRIEF11, owner DI11-LIST): the page is one table of individual
   denials, in the style of the reference list (no approval chance): Denial · Consumer · Payer · Service · Decision · Status · Next step ·
   Deadline · Owner, sortable by any column (Deadline first by default). Dropdown filters sit on the table's card: search, Status, Decision
   type (Denied / Partial approval / Info requested / Claim), Payer, Service, Assigned clinician, Deadline, Next step;
   "Clear filters" (PSY.fb page 'di'; PSY.di.queue does the filtering). A row opens the case: di-case?case=<caseId>, a claim di-case?id=<CL-…>.
   Round 13 (DI13): the Decision date is a time box with real calendar dates (PSY.fb.dateRange page 'denials': Start date → End date, the
   old choices Today / This week / Before this week as shortcuts, its own Clear) in the page header, top right, apart from the dropdowns;
   the Decision date dropdown is gone. A row shows when its decision date falls in the range. The empty view's Clear filters clears both.
   The rows come from the demo backend's route GET /denials?<filters>&from=&to= (PSY.api, owner DI13; logged once per new set of filters).
   Removed in round 11: the count strip, "Denial trends by payer" and its colour legend, the Illustrative demo data tag, the caseload tag,
   the sub-tabs (claims CL-217 and CL-221 are rows now; payer requirements keep their data and PSY.rules but are not on this page) and the
   Denial patterns section and its Inspect modal (PSY.di.patterns() is unchanged; Analytics shows the patterns with its own Inspect).
   Role scope: licensed staff see their caseload, the admin sees all (PSY.di.records); DSS: No access (the platform gate).
   Old links: denials?case=R-0384 → di-case?case=R-0384, denials?id=DI-391 → di-case?id=DI-391; denials?tab=claims → Decision type Claim;
   denials?show=partial|denied|info|resolved|overturned|deadline → the matching filter; denials?date=today|week|earlier → that date range,
   denials?from=YYYY-MM-DD&to=YYYY-MM-DD → the range. */
(function () {
  const PSY = window.PSY;
  const esc = PSY.esc;
  const D = () => PSY.di;
  const EV = PSY.ev;
  const R5 = () => PSY.data.r5;
  const FB = () => PSY.fb;
  const PG = 'di';
  const DPG = 'denials'; // the time box (decision date range)
  const SORT_PG = 'di-sort';
  const FKEYS = ['q', 'status', 'type', 'payer', 'service', 'clinician', 'deadline', 'next'];
  const vw = () => { const o = {}; FKEYS.forEach((k) => { o[k] = FB().get(PG, k, ''); }); o.from = FB().get(DPG, 'from', ''); o.to = FB().get(DPG, 'to', ''); return o; };
  const TYPE_SHORT = { denied: 'Denied', partial: 'Partial approval', info: 'Info requested', claim: 'Claim' };
  /* columns: key, header, width (px; none = shares what is left) */
  const COLS = [['id', 'Denial', 84], ['who', 'Consumer', 94], ['payer', 'Payer', 80], ['service', 'Service', 80], ['decision', 'Decision', null],
    ['status', 'Status', 136], ['next', 'Next step', null], ['deadline', 'Deadline', 104], ['owner', 'Owner', 96]];

  /* ---------------- filters ---------------- */
  function filterDefs(all) {
    const payers = FB().uniq(all.map((r) => r.payer)).map((p) => [p, D().SHORT[p] || (PSY.data.payers[p] || {}).short || p]);
    const svcs = Object.keys(R5().services).map((k) => [k, R5().services[k].short]);
    const L = PSY.data.lauris; const clin = Object.values((L && L.staff) || {}).filter((s) => !s.dss).map((s) => [s.short, s.name]);
    return [
      { k: 'q', label: 'Search', type: 'q', ph: 'Consumer, ID or payer' },
      { k: 'status', label: 'Status', opts: FB().opts('All statuses', D().STATUS_OPTS()) },
      { k: 'type', label: 'Decision type', opts: FB().opts('All types', D().TYPES) },
      { k: 'payer', label: 'Payer', opts: FB().opts('All payers', payers) },
      { k: 'service', label: 'Service', opts: FB().opts('All services', svcs) },
      { k: 'clinician', label: 'Assigned clinician', opts: FB().opts('All clinicians', clin) },
      { k: 'deadline', label: 'Deadline', opts: FB().opts('Any deadline', D().DEADLINES) },
      { k: 'next', label: 'Next step', opts: FB().opts('Any next step', D().NEXT_STEPS) },
    ];
  }
  /* deep links: the filter keys themselves, plus the old tab and Show values */
  const LEGACY_SHOW = { partial: { type: 'partial' }, denied: { type: 'denied' }, info: { type: 'info' }, resolved: { status: 'resolved' }, overturned: { status: 'overturned' }, deadline: { deadline: '7' } };
  function applyParams(params) {
    const deep = {};
    FKEYS.forEach((k) => { if (params[k] != null) deep[k] = params[k]; });
    if (params.show && LEGACY_SHOW[params.show]) Object.assign(deep, LEGACY_SHOW[params.show]);
    if (params.tab === 'claims' || params.tab === 'claim') deep.type = 'claim';
    if (Object.keys(deep).length) FB().fromParams(PG, deep, (p) => { const o = {}; FKEYS.forEach((k) => { o[k] = p[k] || ''; }); return o; });
    /* the decision date: the old ?date=today|week|earlier, or ?from= / ?to= */
    const pre = params.date ? (D().DATE_PRESETS || []).find((x) => x[0] === params.date) : null;
    const rng = pre ? { from: pre[2], to: pre[3] } : params.from != null || params.to != null ? { from: FB().iso(params.from || ''), to: FB().iso(params.to || '') } : null;
    if (rng) FB().fromParams(DPG, rng, (p) => ({ from: p.from || '', to: p.to || '' }));
  }
  /* the time box: Start date → End date, the old Decision date choices as shortcuts */
  const timeBox = () => FB().dateRange(DPG, { label: 'Decision date', presets: D().DATE_PRESETS || [], id: 'di-dates' });

  /* ---------------- sorting ---------------- */
  const sortOf = () => { const s = FB().st(SORT_PG); return { k: s.k || 'deadline', dir: s.dir === 'desc' ? 'desc' : 'asc' }; };
  const ST_ORDER = () => ['new', 'review', 'docs', 'drafted', 'submitted', 'awaiting', 'overturned', 'partover', 'upheld', 'closed'];
  const NX_ORDER = () => D().NEXT_STEPS.map((x) => x[0]);
  const KEY = {
    id: (r) => r.id, who: (r) => r.ini || '', payer: (r) => r.payerShort || '', service: (r) => r.service || '',
    decision: (r) => (r.decisionMs == null ? 9e15 : r.decisionMs),
    status: (r) => { const i = ST_ORDER().indexOf(D().statusKey(r)); return (r.open ? 0 : 100) + (i < 0 ? 50 : i); },
    next: (r) => NX_ORDER().indexOf(D().nextGroup(r)),
    deadline: (r) => (r.open && r.deadline && r.deadline.ms != null ? r.deadline.ms : r.open ? 9e14 : 9e15),
    owner: (r) => r.ownerShort || '',
  };
  function sortRows(rows) {
    const s = sortOf(); const f = KEY[s.k] || KEY.deadline; const m = s.dir === 'desc' ? -1 : 1;
    return rows.map((r, i) => ({ r, i, v: f(r) })).sort((a, b) => (a.v < b.v ? -m : a.v > b.v ? m : a.i - b.i)).map((x) => x.r);
  }

  /* ---------------- the table ---------------- */
  const colgroup = () => '<colgroup>' + COLS.map((c) => '<col' + (c[2] ? ' style="width:' + c[2] + 'px"' : '') + '>').join('') + '</colgroup>';
  function head() {
    const s = sortOf();
    return '<thead><tr>' + COLS.map((c) => {
      const on = s.k === c[0]; const aria = on ? (s.dir === 'asc' ? 'ascending' : 'descending') : 'none';
      return '<th scope="col" aria-sort="' + aria + '"><button type="button" class="dx-sort' + (on ? ' on' : '') + '" data-act="dx-sort" data-k="' + c[0] + '" title="Sort by ' + esc(c[0] === 'decision' ? 'decision date' : c[1].toLowerCase()) + '">' + esc(c[1]) +
        '<i aria-hidden="true">' + (on ? (s.dir === 'asc' ? '↑' : '↓') : '↕') + '</i></button></th>';
    }).join('') + '</tr></thead>';
  }
  const goOf = (r) => (r.isClaim ? 'di-case?id=' + r.id : 'di-case?case=' + r.case);
  function decisionCell(r) {
    let main;
    if (r.isClaim) main = (r.claim && r.claim.code) || 'Claim issue';
    else if (r.kind === 'info' && r.approved == null) main = 'Not decided yet';
    else main = (r.approved != null ? r.approved : 0) + ' of ' + (r.requested != null ? r.requested : '—') + (r.issue === 'reduction' && r.open ? ' offered' : ' approved');
    const tip = (r.reasonText || '') + (r.decision && r.decision.via ? ' — ' + r.decision.via : '');
    return '<span class="dx-dec" title="' + esc(tip) + '"><b>' + esc(main) + '</b><small>' + esc(TYPE_SHORT[r.kind] + ' · ' + (r.decisionDate || '')) + '</small></span>';
  }
  function statusCell(r) {
    if (r.isClaim) return D().stBadge('claim', r.status);
    return D().statusBadge(r.diStatus) + (r.unitsPending ? '<small>units to record</small>' : '');
  }
  const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
  function nextCell(r) {
    const dl = r.open ? r.deadline : null;
    const sub = dl && dl.ms != null ? cap(dl.sub) + ' ' + dl.label : '';
    return '<span class="dx-nx"><b>' + esc(r.next.label) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>';
  }
  function deadlineCell(r) {
    const dl = r.open ? r.deadline : null;
    if (!dl) return '<span class="dx-mut" title="No open deadline">—</span>';
    if (dl.ms == null) return '<span class="dx-dl" title="' + esc(dl.src || '') + '">' + EV.label('unverified', 'Not verified') + '</span>';
    const n = D().dayDiff(dl.ms);
    const txt = n < 0 ? Math.abs(n) + ' d late' : n === 0 ? 'Today' : n + ' d';
    const tone = n <= 1 ? 'r' : n <= 7 ? 'a' : 'n';
    return '<span class="dx-dl" title="' + esc(dl.label + ' · ' + dl.sub + ' · ' + D().inDays(dl.ms) + '\nSource: ' + (dl.src || '')) + '"><span class="dx-dc ' + tone + '" data-days="' + n + '">' + (tone === 'r' ? '<i aria-hidden="true"></i>' : '') + esc(txt) + '</span></span>';
  }
  function rowHtml(r) {
    const go = goOf(r);
    return '<tr class="dx-r' + (r.open ? '' : ' done') + '" data-id="' + esc(r.id) + '" data-case="' + esc(r.case) + '" data-kind="' + esc(r.kind) + '" data-go="' + go + '">' +
      '<td><button type="button" class="dx-id" data-go="' + go + '">' + esc(r.id) + '</button></td>' +
      '<td title="' + esc(r.laurisId ? 'Lauris #' + r.laurisId : '') + '"><b>' + esc(r.who) + '</b></td>' +
      '<td>' + esc(r.payerShort) + '</td>' +
      '<td><span class="dx-svc" title="' + esc(r.serviceLabel) + '">' + esc(r.service) + '</span></td>' +
      '<td>' + decisionCell(r) + '</td>' +
      '<td class="dx-st">' + statusCell(r) + '</td>' +
      '<td>' + nextCell(r) + '</td>' +
      '<td>' + deadlineCell(r) + '</td>' +
      '<td><span class="dx-own" title="' + esc(r.owner) + '">' + esc(r.ownerShort) + '</span></td></tr>';
  }
  /* round 13: the list as a route of the in-browser demo backend: the filters (and the decision dates) in, the matching rows out */
  const LIST_ROW = (x) => ({ id: x.id, case: x.case, ini: x.ini, payer: x.payerShort, type: x.kind, decisionDate: x.decisionDate, status: x.isClaim ? x.status : x.diStatus, next: x.next ? x.next.label : '' });
  if (PSY.api && typeof PSY.api.route === 'function') {
    PSY.api.route('GET', '/denials', (q) => {
      const f = Object.assign({}, q.query || {}); const a = f.from ? FB().toDate(f.from) : null; const z = f.to ? FB().toDate(f.to) : null;
      if ((f.from && !a) || (f.to && !z)) throw PSY.api.error(400, 'Dates are YYYY-MM-DD');
      if (a && z && a > z) throw PSY.api.error(400, 'The start date is after the end date');
      return D().queue(f).map(LIST_ROW);
    }, { owner: 'DI13', desc: 'The Denial Intelligence list for the role: ?q, status, type, payer, service, clinician, deadline, next, from, to (decision dates)',
      summary: (d, q) => d.length + (d.length === 1 ? ' denial' : ' denials') + (q.query.from || q.query.to ? ' · decided ' + (q.query.from || '…') + ' to ' + (q.query.to || '…') : '') });
  }
  let lastQ = null;
  function listIds(v) {
    if (!PSY.api || typeof PSY.api.call !== 'function') return null;
    const qs = Object.keys(v).filter((k) => v[k] !== '' && v[k] != null).map((k) => k + '=' + encodeURIComponent(v[k])).join('&');
    const quiet = qs === lastQ; lastQ = qs;
    return PSY.api.call('GET', '/denials' + (qs ? '?' + qs : ''), null, { quiet }).map((x) => x.id);
  }
  function table(v) {
    const scoped = D().queue({}); const byId = {}; scoped.forEach((r) => { byId[r.id] = r; });
    let ids = null; try { ids = listIds(v); } catch (e) { ids = null; }
    const rows = sortRows(ids ? ids.map((id) => byId[id]).filter(Boolean) : D().queue(v));
    const dr = FB().dates(DPG);
    const empty = '<tr><td colspan="' + COLS.length + '" class="dx-empty">Nothing to show' + (dr.on ? ' for decisions ' + esc(dr.text.replace(/^(From|Until) /, (m0, w) => (w === 'From' ? 'from ' : 'until '))) : '') + '. <button type="button" class="pi-link" data-act="dx-clear-all">Clear filters</button></td></tr>';
    return '<section class="card dx-card" data-psy="di-queue"><div class="dx-filters">' + FB().html(PG, filterDefs(scoped), { shown: rows.length, total: scoped.length, noun: scoped.length === 1 ? 'denial' : 'denials' }) + '</div>' +
      '<div class="dx-wrap"><table class="dx-tb">' + colgroup() + head() + '<tbody>' + (rows.length ? rows.map(rowHtml).join('') : empty) + '</tbody></table></div></section>';
  }

  /* ---------------- page ---------------- */
  function render(params) {
    params = params || {};
    applyParams(params);
    return PSY.platform.page({ active: 'di', title: 'Denial Intelligence', actions: timeBox(), body: table(vw()) });
  }
  PSY.register({
    id: 'denials', kind: 'web', nav: 'di', label: 'Denial Intelligence',
    url: () => 'denial-intelligence',
    tabTitle: 'Psyflo — Denial Intelligence',
    get css() { return D().css + CSS; },
    render,
  });
  /* old links to a case on this page open the case workspace (owner DI11-CASE) */
  PSY.REDIRECT = PSY.REDIRECT || {};
  PSY.REDIRECT.denials = (p) => (p && p.case ? { id: 'di-case', params: { case: p.case } } : p && p.id ? { id: 'di-case', params: { id: p.id } } : { id: 'denials', params: p || {} });

  /* ---------------- acts ---------------- */
  /* the empty view: clear the dropdowns, the search and the decision dates */
  PSY.acts['dx-clear-all'] = () => {
    const s = FB().st(PG); Object.keys(s).forEach((k) => { if (k !== '__sig') delete s[k]; });
    const d = FB().st(DPG); delete d.from; delete d.to; PSY.save(); PSY.refresh();
  };
  PSY.acts['dx-sort'] = (el) => {
    const k = el.getAttribute('data-k'); const s = FB().st(SORT_PG); const cur = sortOf();
    s.k = k; s.dir = cur.k === k && cur.dir === 'asc' ? 'desc' : 'asc'; PSY.save(); PSY.refresh();
    const r = PSY.activeRoot(); const n = r && r.querySelector('.dx-sort[data-k="' + k + '"]'); if (n) n.focus();
  };

  const CSS = `
  /* the time box sits in the page header, top right, apart from the dropdowns */
  .pf-head .pf-act .dr{width:338px;max-width:100%}
  .dx-card{overflow:hidden;margin-bottom:28px}
  .dx-filters{padding:14px 18px 14px;border-bottom:1px solid #EFE8DE;background:#FCFAF6}
  .dx-filters .fb{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px 12px;align-items:end}
  .dx-filters .fb-f{min-width:0}
  .dx-filters .fb-s,.dx-filters .fb-q .fb-s{width:100%;max-width:none;height:34px}
  .dx-filters .fb-n{margin-left:0;justify-content:flex-end;height:34px;grid-column:-2/-1}
  .dx-wrap{overflow-x:auto}
  .dx-tb{width:100%;border-collapse:collapse;table-layout:fixed;font-size:13.5px;color:#1B1B19}
  .dx-tb th{text-align:left;padding:0 6px;background:#fff;border-bottom:1px solid #EFE8DE;vertical-align:middle;height:42px}
  .dx-tb th:first-child,.dx-tb td:first-child{padding-left:20px}.dx-tb th:last-child,.dx-tb td:last-child{padding-right:16px}
  .dx-sort{display:inline-flex;align-items:center;gap:5px;border:0;background:none;padding:0;font:inherit;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#6B665E;font-weight:700;cursor:pointer;line-height:1.2;text-align:left}
  .dx-sort i{font-style:normal;font-size:11px;color:#B5AC9F;letter-spacing:0}
  .dx-sort:hover,.dx-sort.on{color:#1B1B19}.dx-sort.on i{color:#1B1B19}
  .dx-sort:focus-visible{outline:2px solid #1D4F43;outline-offset:2px;border-radius:3px}
  .dx-tb td{padding:12px 6px;border-bottom:1px solid #EFE8DE;vertical-align:middle;line-height:1.35;overflow-wrap:anywhere}
  .dx-tb tbody tr:last-child td{border-bottom:0}
  .dx-tb td b{font-weight:500}
  .dx-tb td small{display:block;color:#6B665E;font-size:12px;margin-top:2px;line-height:1.3}
  .dx-r{cursor:pointer}.dx-r:hover td{background:#FCF9F5}
  .dx-r.done td{color:#6B665E}
  .dx-id{border:0;background:none;padding:0;font:inherit;font-size:13.5px;font-weight:600;color:#1B1B19;text-decoration:underline;text-underline-offset:3px;text-decoration-thickness:1px;cursor:pointer;white-space:nowrap;font-variant-numeric:tabular-nums}
  .dx-id:hover{color:#1D4F43}.dx-id:focus-visible{outline:2px solid #1D4F43;outline-offset:2px;border-radius:3px}
  .dx-svc,.dx-own{display:inline-block;max-width:100%;border-radius:10px;background:#EFEBE4;color:#3D3932;font-size:12px;font-weight:600;padding:3px 9px;line-height:1.3;vertical-align:middle}
  .dx-own{background:#F6F3EE;border:1px solid #E5DCD0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .dx-dec,.dx-nx{display:block}
  .dx-dec b,.dx-nx b{font-weight:500}
  .dx-nx b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  .dx-dl{display:inline-flex;cursor:help}
  .dx-dc{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:700;white-space:nowrap;font-variant-numeric:tabular-nums;background:#EFEBE4;color:#3D3932}
  .dx-dc.a{background:#FCF0D6;color:#6F4A05}
  .dx-dc.r{background:#FBE7E2;color:#8A2E1C}.dx-dc i{width:6px;height:6px;border-radius:50%;background:#B5503A}
  .dx-tb .st5{white-space:normal;line-height:1.25;align-items:flex-start;border-radius:10px;text-align:left;font-size:12px;padding:2px 8px 2px 7px;gap:4px;overflow-wrap:normal;word-break:normal}.dx-tb .st5 i{margin-top:1px}
  .dx-tb .ev5{white-space:nowrap;font-size:11px;padding:2px 7px 2px 6px}
  .dx-empty{padding:28px 18px!important;color:#6B665E;text-align:center}
  .dx-mut{color:#6B665E}
  `;
})();
