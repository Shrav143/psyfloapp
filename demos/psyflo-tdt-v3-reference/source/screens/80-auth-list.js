/* All Authorizations (route 'auth-list'), platform tab 1 of 3: tracking and oversight of every SRA.
   Denial Intelligence is its own tab: a denied, partially approved or information-requested authorization links there
   ("Open in Denial Intelligence" → di-case?case=<caseId>); no denial workflow lives here.
   Round 11: no count strip and no "My consumers / All consumers" tag; dropdown filters only (PSY.fb, page 'auth').
   Round 13: the time box. "Authorization period" is real calendar dates (PSY.fb.dateRange, keys from/to) in the page header, top right
   next to the title, apart from the dropdowns: a row shows when its authorization period overlaps the dates. The old "Ends within"
   dropdown is folded in as preset chips (Ends in 7 / 30 / 60 days: today → today + N); while a preset's dates are set, the box matches
   the date the authorization in force ends instead (the chip is lit and the box says so). The "Authorization period" and "Ends within"
   dropdowns are gone; the other ten sit in one even grid (5 × 2): Search · Status · Payer · Service type · Request type · Assigned
   clinician · Location · School · Units remaining · Next step due. The count and "Clear filters" (the time box counts as one, and is
   cleared too) head the table. What the chips did: Status (Active, Pending review, Partially approved, Denied, Renewal due) and
   Ends in 30 days (Expiring soon). One table with the prompt's columns: Consumer · Service · Payer · Assigned clinician ·
   Authorization period (with Initial SRA / Concurrent SRA) · Requested · Approved · Remaining · Status · Next action.
   Deep links: auth-list?status=denied (also any filter key, from=/to= ISO dates, and the old show=<bucket>, st=<status>, exp=30,
   ends=7|30|60, range=<month>, payer=<id>).
   Detail ('auth-detail?case=R-0411', also 'auth-list?case='): where the SRA is (stepper), requested vs approved units, clinical
   documentation (links into Lauris; names and dates only, marked Restricted, without PSY.can('clinicalRecords')), relevant deadlines,
   renewal status, the submission record and the payer decision on file (the facts History does not list), then History
   (PSY.hist.html(case, { scope: 'auth' }): the dropdown with actor tags and pop-ups; it replaces the timeline, the submission history
   and the correspondence list). "Call payer · voice agent" (PSY.voice.button, purpose 'sra-status') on an SRA that is submitted,
   pending or info requested. Without PSY.hist (08-history.js not loaded) the round-12 cards render instead.
   Statuses read PSY.auth, resolution PSY.diStatus (an appeal overturned in Denial Intelligence shows Approved, units restored: PSY.p1.unitsOf).
   Role scope: PSY.caseInCaseload (licensed staff: their caseload; admin: all). DSS: No access (foundation).
   Acts: al5-sort, al5-open (filters: fb-set, fb-clear). Hooks: PSY.platform.caseRoute, PSY.counts().auth, PSY.presenter.prep.s5,
   PSY.authList.facts(caseId) (what each filter reads, for tests and other pages). */
(function () {
  const PSY = window.PSY;
  const esc = PSY.esc;
  const P = () => PSY.p1;
  const A = () => PSY.auth;
  const OV = () => PSY.dash.ov;
  const FB = () => PSY.fb;
  const AL = { sort: { k: 'default', dir: 1 } };
  const PG = 'auth';
  const KIND = { initial: 'Initial SRA', continued: 'Concurrent SRA' };
  const PAYER_SHORT = { uhc: 'UHC' }; // the table column is narrow; the detail page names the plan in full

  /* Status: the authorization's status, plus the two views the old count chips gave (Active: an authorization in force; Renewal due).
     "Pending review" is every request the payer has not decided yet (an open information request included), as the chip counted it. */
  const STATUS = [['', 'All statuses'], ['active', 'Active'], ['renewal', 'Renewal due'], ['prep', 'Not yet submitted'], ['pending', 'Pending review'], ['info', 'Info requested'],
    ['approved', 'Approved'], ['partial', 'Partially approved'], ['denied', 'Denied'], ['appeal', 'Appeal or reconsideration']];
  /* the time box: today (PSY.data.today, Thu Oct 29 2026) → ISO; "Ends in N days" presets fill today → today + N */
  const TODAY = Date.UTC(2026, 9, 29);
  const isoPlus = (n) => new Date(TODAY + n * 864e5).toISOString().slice(0, 10);
  const ENDS_N = [7, 30, 60];
  const ENDS_P = ENDS_N.map((n) => ['e' + n, 'Ends in ' + n + ' days', isoPlus(0), isoPlus(n)]);
  const DUE = [['', 'Any time'], ['today', 'Today'], ['week', 'Next 7 days'], ['later', 'Later']];
  const REQ = [['', 'All requests'], ['initial', 'Initial SRA'], ['continued', 'Concurrent SRA']];
  const LOC = { campbell: 'Campbell County', lynchburg: 'Lynchburg City' };
  /* the old Show values and statuses (deep links: show=, st=) */
  const SHOW_ALIAS = { all: '', renewals: 'renewal', partials: 'partial', waiting: 'pending', review: 'pending', reviews: 'pending', 'info-requested': 'info', need: '', drafts: '', decision: '', decisions: '' };
  const ST_STATUS = { draft: 'prep', review: 'prep', ready: 'prep', submitted: 'pending', pending: 'pending', info: 'info', recon: 'appeal', appeal: 'appeal', partial: 'partial', denied: 'denied', approved: 'approved', active: 'active' };
  const okOpt = (list, v) => (list.some((x) => x[0] === v) ? v : '');
  const normStatus = (v) => { v = v == null ? '' : String(v); v = Object.prototype.hasOwnProperty.call(SHOW_ALIAS, v) ? SHOW_ALIAS[v] : v; return okOpt(STATUS, v); };
  /* the old range=<month> deep link (Jul–Dec 2026, Jan–Jun 2027: the demo's school year) → that month's first and last day */
  const MON3 = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthDates = (k) => { const i = MON3.indexOf(String(k || '').toLowerCase().slice(0, 3)); if (i < 0) return null; const y = i >= 6 ? 2026 : 2027; const iso = (d) => d.toISOString().slice(0, 10); return [iso(new Date(Date.UTC(y, i, 1))), iso(new Date(Date.UTC(y, i + 1, 0)))]; };
  const okIso = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '');
  const SHORT_ST ={ draft: 'Draft', review: 'Awaiting clinical review', ready: 'Ready to submit', submitted: 'Submitted', pending: 'Pending payer review', info: 'Info requested', approved: 'Approved', partial: 'Partially approved', denied: 'Denied', recon: 'Reconsideration pending', appeal: 'Appeal pending', closed: 'Closed' };

  const CSS = `
  .alx{display:flex;flex-direction:column;gap:18px}
  /* the time box, top right next to the title: a compact two-row panel (title row; dates | presets and what it matches) */
  .pf-head:has(#al5-period){align-items:flex-start}
  .pf-head:has(#al5-period)>div:first-child{flex:1 1 220px}
  #al5-period{display:grid;grid-template-columns:auto auto;grid-template-areas:"h h" "r p" "r t";column-gap:18px;row-gap:5px;padding:10px 14px 11px;box-shadow:0 1px 2px rgba(29,79,67,.06)}
  #al5-period .dr-h{grid-area:h;padding-bottom:2px}
  #al5-period .dr-r{grid-area:r;align-self:end;flex-wrap:nowrap}
  #al5-period .dr-i{width:132px}
  #al5-period .dr-pr{grid-area:p;align-self:end;flex-wrap:nowrap}
  #al5-period .dr-hint{grid-area:t;align-self:end;font-size:11.5px;padding-bottom:1px;white-space:nowrap}
  #al5-period .dr-ps{white-space:nowrap}
  /* the dropdowns: one even grid, two rows of five */
  .alx .fb{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px 14px;align-items:end}
  .alx .fb-f{min-width:0}
  .alx .fb-f>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .alx .fb-s,.alx .fb-q .fb-s{width:100%;max-width:none;min-width:0;text-overflow:ellipsis}
  .al-ct{display:flex;align-items:center;gap:14px;min-height:46px;padding:10px 16px;border-bottom:1px solid #EFE8DE;font-size:13px;color:#6B665E}
  .al-ct b{color:#1B1B19;font-weight:700}
  .al-ct .fb-x{margin-left:auto}
  table.al5t{width:100%;border-collapse:collapse;table-layout:fixed;font-size:13px}
  .al5t th{text-align:left;padding:10px 7px;border-bottom:1px solid #EFE8DE;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#6B665E;font-weight:600;line-height:1.3;vertical-align:bottom}
  .al5t th.n,.al5t td.n{text-align:right;padding-right:12px}
  .al5t th.st,.al5t td.st{padding-left:14px}
  .al5t th button{background:none;border:0;padding:0;font:inherit;letter-spacing:inherit;text-transform:inherit;color:inherit;cursor:pointer;display:inline-flex;align-items:flex-end;gap:4px;text-align:left}
  .al5t th.n button{text-align:right}
  .al5t th button:hover,.al5t th button.on{color:#1D4F43}.al5t th button i{font-style:normal;opacity:.55;font-size:11px}.al5t th button.on i{opacity:1}
  .al5t td{padding:12px 7px;border-top:1px solid #EFE8DE;vertical-align:top;line-height:1.4;overflow-wrap:break-word}
  .al5t td:first-child .al-s{white-space:nowrap;font-size:11.5px}
  .al5t tbody tr:first-child td{border-top:0}
  .al5t th:first-child,.al5t td:first-child{padding-left:16px}.al5t th:last-child,.al5t td:last-child{padding-right:16px}
  .al5t tbody tr{cursor:pointer}.al5t tbody tr:hover td{background:#FCF9F5}
  .al5t .al-s{display:block;color:#6B665E;font-size:12px;margin-top:2px;font-weight:400}
  .al5t .p1-id{font-weight:700;font-size:14px}
  .al5t td.n b{font-weight:600;font-size:13.5px}
  .al5t .st5{white-space:normal;border-radius:10px;align-items:flex-start;text-align:left}
  .al5t .st5 i{margin-top:2px}
  .al5t .al-t{display:block;font-weight:600;color:#4A453D}
  .al5t .al-a .btn{min-height:30px;padding:4px 10px;font-size:12.5px;white-space:normal;line-height:1.2;text-align:left;max-width:100%}
  .al5t .al-a .p1-dl,.al5t .al-a .al-t+.p1-dl{margin-top:5px;display:flex}
  .al5t .al-dl b{font-size:12.5px}
  .al5t .p1-tip{left:auto;right:0}
  @media (max-width:1400px){.al5t th,.al5t td{padding-left:5px;padding-right:5px}.al5t th.n,.al5t td.n{padding-right:9px}.al5t th.st,.al5t td.st{padding-left:10px}.al5t th:first-child,.al5t td:first-child{padding-left:14px}.al5t th:last-child,.al5t td:last-child{padding-right:14px}}
  /* detail */
  .ad{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:18px;align-items:start}
  .ad-col{display:flex;flex-direction:column;gap:18px;min-width:0}
  .ad .card{padding:18px 20px}
  .ad h2{margin:0 0 12px;font-size:18px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .ad h2 .ev5,.ad h2 .st5,.ad h2 .ad-rx{font-family:'DM Sans',system-ui,sans-serif}
  .ad-hd{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
  .ad-g{display:grid;grid-template-columns:140px minmax(0,1fr);gap:7px 14px;font-size:13.5px;margin-top:14px;line-height:1.45}
  .ad-g>span{color:#6B665E}
  .ad-g .rq5-m{margin-top:3px}
  .ad-q{margin:8px 0 0}
  .ad-ln{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px;align-items:center}
  .ad-ban{display:flex;gap:12px;align-items:center;flex-wrap:wrap;background:#FBF3DF;border:1px solid #F0DFB4;border-radius:12px;padding:12px 16px;font-size:13.5px;margin-bottom:18px}
  .ad-un{display:flex;gap:22px;flex-wrap:wrap;font-size:13px}.ad-un b{display:block;font-family:'Newsreader',Georgia,serif;font-size:24px;font-weight:600;line-height:1.15}
  .ad-un span{color:#6B665E;font-size:12px}.ad-un .r b{color:#8A2E1C}
  .ad-bar{margin-top:14px}.ad-bar .t{height:8px;border-radius:99px;background:#EFE8DE;overflow:hidden}.ad-bar .t i{display:block;height:100%;background:#1D4F43;border-radius:99px}
  .ad-bar .l{display:flex;justify-content:space-between;gap:10px;font-size:12.5px;color:#6B665E;margin-bottom:6px}.ad-bar .l b{color:#1B1B19}
  .ad-steps{margin:0 0 12px}
  #ad-units .ad-steps{margin:-2px 0 12px}
  .ad-hw{min-width:0}
  .ad-list{list-style:none;margin:0;padding:0;font-size:13.5px}
  .ad-list li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 12px;align-items:center;padding:9px 0;border-top:1px solid #EFE8DE}
  .ad-list li:first-child{border-top:0;padding-top:2px}
  .ad-list .d{color:#6B665E;font-size:12.5px}
  .ad-list .nm{font-weight:600}
  .ad-rx{display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:#EFE8DE;color:#4A453D;font-size:11.5px;font-weight:700;padding:2px 9px;white-space:nowrap}
  .ad-rx svg{width:12px;height:12px}
  .ad-hist{list-style:none;margin:10px 0 0;padding:0;font-size:13px}
  .ad-hist li{display:grid;grid-template-columns:96px minmax(0,1fr);gap:10px;padding:6px 0;border-top:1px solid #EFE8DE}
  .ad-hist li:first-child{border-top:0}
  .ad-hist .t{color:#6B665E;font-weight:600;font-size:12.5px}
  .ad-dls{display:flex;flex-direction:column;gap:12px}
  .ad .p1-tip{z-index:40}
  @media (max-width:1180px){.ad{grid-template-columns:1fr}}
  `;

  /* ---------------- the rows ---------------- */
  /* every authorization the role may see (its caseload), in the locality of the top bar */
  const cases = () => OV().cases().filter((c) => P().visibleCase(c.id));
  /* the Status views an authorization belongs to (they overlap: T.N. is Active and Partially approved) */
  const statusOf = (id) => {
    const st = A().status(id);
    return { active: OV().isActive(id), renewal: OV().isRenewalDue(id), prep: ['draft', 'review', 'ready'].indexOf(st) >= 0, pending: OV().isReview(id), info: st === 'info',
      approved: st === 'approved', partial: st === 'partial', denied: st === 'denied', appeal: st === 'appeal' || st === 'recon' };
  };
  /* "Oct 5 – Jan 1" → ['2026-10-05', '2027-01-01'] (PSY.fb.iso: Jul–Dec 2026, Jan–Jun 2027) */
  const span = (period) => { const m = /^(.+?)\s*–\s*(.+)$/.exec(period || ''); if (!m) return null; const a = FB().iso(m[1]), b = FB().iso(m[2]); return a && b ? [a, b] : null; };
  /* the time box: a preset "Ends in N days" is on while its exact dates are set (the chip is lit); then the box matches the date the
     authorization in force ends, as the old Ends within dropdown did. Any other dates match an overlap with the authorization period. */
  const endsPreset = (from, to) => { const f = FB().iso(from == null ? g('from') : from), t = FB().iso(to == null ? g('to') : to); const p = ENDS_P.find((x) => x[2] === f && x[3] === t); return p ? +p[0].slice(1) : 0; };
  function passWhen(f, from, to) {
    const D = FB().toDate; const a = D(from), b = D(to); if (!a && !b) return true;
    if (endsPreset(from, to)) { const e = D(f.endIso); return !!e && f.ends != null && f.ends >= 0 && (!a || e >= a) && (!b || e <= b); }
    if (!f.period) return false; const s = D(f.period[0]), e = D(f.period[1]);
    return !(a && e && e < a) && !(b && s && s > b);
  }
  /* the date the Next action column shows (a payer deadline, or the end of the authorization when its renewal is due) */
  const nextDl = (id) => P().actionDeadline(id) || (OV().isRenewalDue(id) ? P().deadline(id) : null);
  /* everything a filter looks at, for one authorization */
  function facts(c) {
    const id = c.id; const x = P().unitsOf(id); const m = A().meta(id); const st = A().status(id); const pay = PSY.data.payers[c.payer] || {}; const lid = P().laurisId(id);
    const school = c.school || ''; const dl = nextDl(id); const exp = OV().expDays(id);
    /* the words Search matches (each typed word must start one of them: "tn" or "T.N.", "4441", "sentara", "ortiz", "AUTH-4458") */
    const words = [c.ini, 'Lauris #' + lid, lid, pay.short, pay.name, P().assignee(id), P().assigneeName(id), school, m.ref, SHORT_ST[st], A().label(st), x.svc.short, x.svc.code, KIND[m.kind]]
      .filter(Boolean).join(' ').toLowerCase().split(/[\s·,()]+/).filter(Boolean);
    return { status: statusOf(id), payer: c.payer, service: m.service || 'tdt', kind: m.kind || '', assigned: P().assignee(id), location: c.loc || '', school, period: span(x.period),
      ends: exp, endIso: exp != null && x.end ? FB().iso(x.end) : '', low: x.daysLeft != null && x.daysLeft <= P().lowDays(), due: dl && dl.days != null ? dl.days : null, words };
  }
  const g = (k) => FB().get(PG, k, '');
  const schoolName = (s) => String(s).split(' · ').pop();
  function defs(fx) {
    const uq = (k) => FB().uniq(fx.map((f) => f[k]));
    return [
      { k: 'q', label: 'Search', type: 'q', ph: 'Initials or Lauris #' },
      { k: 'status', label: 'Status', opts: STATUS },
      { k: 'payer', label: 'Payer', opts: FB().opts('All payers', uq('payer').map((p) => [p, (PSY.data.payers[p] || {}).short || p]).sort((a, b) => (a[1] < b[1] ? -1 : 1))) },
      { k: 'service', label: 'Service type', opts: FB().opts('All services', uq('service').map((k) => [k, A().service(k).short])) },
      { k: 'kind', label: 'Request type', opts: REQ },
      { k: 'assigned', label: 'Assigned clinician', opts: FB().opts('All clinicians', uq('assigned').sort().map((k) => [k, k])) },
      { k: 'location', label: 'Location', opts: FB().opts('All locations', uq('location').sort().map((k) => [k, LOC[k] || k])) },
      { k: 'school', label: 'School', opts: FB().opts('All schools', uq('school').sort().map((k) => [k, schoolName(k)])) },
      { k: 'units', label: 'Units remaining', opts: [['', 'Any'], ['low', 'Low (≤ ' + P().lowDays() + ' days)']] },
      { k: 'due', label: 'Next step due', opts: DUE },
    ];
  }
  const KEYS = ['q', 'status', 'payer', 'service', 'kind', 'assigned', 'location', 'school', 'units', 'due'];
  /* does one authorization pass one filter */
  function pass(f, k, v) {
    if (!v) return true;
    if (k === 'q') { const nd = (w) => w.replace(/\./g, ''); return String(v).toLowerCase().split(/[\s·,()]+/).filter(Boolean).every((t) => f.words.some((w) => w.indexOf(t) === 0 || (nd(t) && nd(w).indexOf(nd(t)) === 0))); }
    if (k === 'status') return !!f.status[v];
    if (k === 'units') return v === 'low' ? f.low : true;
    if (k === 'due') return f.due != null && (v === 'today' ? f.due <= 0 : v === 'week' ? f.due <= 7 : f.due > 7);
    return f[k] === v;
  }
  /* the filters as the page holds them (PSY.state.fb.auth) → one query; select() applies it */
  const current = () => { const o = {}; KEYS.concat(['from', 'to']).forEach((k) => { const v = g(k); if (v) o[k] = String(v); }); return o; };
  const select = (all, flt) => all.filter((x) => KEYS.every((k) => pass(x.f, k, flt[k] || '')) && passWhen(x.f, flt.from || '', flt.to || ''));
  const qs = (o) => { const k = Object.keys(o); return k.length ? '?' + k.map((x) => x + '=' + encodeURIComponent(o[x])).join('&') : ''; };
  /* the list goes through the demo backend (PSY.api, 07-api.js) when it is there: GET /authorizations?<filters> returns the rows the
     role may see. One log line per distinct set of filters (a redraw with the same filters does not log again). */
  let lastQ = null;
  function pick() {
    const all = cases().map((c) => ({ c, f: facts(c) })); const flt = current();
    let ids = null;
    if (PSY.api && typeof PSY.api.call === 'function' && ROUTED) {
      const path = '/authorizations' + qs(flt); const quiet = path === lastQ; lastQ = path;
      try { ids = PSY.api.call('GET', path, null, { quiet }).rows.map((r) => r.case); } catch (e) { ids = null; }
    }
    const rows = ids ? all.filter((x) => ids.indexOf(x.c.id) >= 0) : select(all, flt);
    return { all, rows: sortRows(rows) };
  }
  /* GET /authorizations  query: q, status, payer, service, kind, assigned, location, school, units, due (the dropdown values), from, to
     (ISO). → { total, shown, match: 'overlap'|'ends'|'', rows: [{ case, ini, laurisId, payer, period, request, status }] } */
  let ROUTED = false;
  if (PSY.api && typeof PSY.api.route === 'function') {
    PSY.api.route('GET', '/authorizations', (req) => {
      const q = req.query || {};
      ['from', 'to'].forEach((k) => { if (q[k] && !okIso(q[k])) throw PSY.api.error(400, k + ' must be a date (YYYY-MM-DD)'); });
      if (q.from && q.to && q.from > q.to) throw PSY.api.error(400, 'from is after to');
      if (q.status && !STATUS.some((x) => x[0] === q.status)) throw PSY.api.error(400, 'Unknown status ' + q.status);
      const all = cases().map((c) => ({ c, f: facts(c) })); const rows = select(all, q);
      return { total: all.length, shown: rows.length, match: q.from || q.to ? (endsPreset(q.from || '', q.to || '') ? 'ends' : 'overlap') : '',
        rows: rows.map((x) => ({ case: x.c.id, ini: x.c.ini, laurisId: P().laurisId(x.c.id), payer: (PSY.data.payers[x.c.payer] || {}).name || x.c.payer, period: P().unitsOf(x.c.id).period || '', request: KIND[A().meta(x.c.id).kind] || '', status: A().status(x.c.id) })) };
    }, { owner: 'AUTH13', desc: 'All Authorizations: the rows for a set of filters (time box: overlap with the period, or the end date for an Ends in N days preset)',
      summary: (d, req) => d.shown + ' of ' + d.total + ' authorizations' + (d.match === 'ends' ? ' · ending ' : d.match ? ' · overlapping ' : '') + (d.match ? [req.query.from, req.query.to].map((v) => v || '…').join(' → ') : '') });
    ROUTED = true;
  }
  /* default order: the nearest date that asks for something (a payer deadline, the end of the authorization in force), then status */
  function sortRows(rows) {
    const dd = (x) => { const d = P().actionDeadline(x.c.id); return d && d.days != null ? d.days : 9999; };
    const exp = (x) => { const n = OV().expDays(x.c.id); return n == null || n < 0 ? 9999 : n; };
    const urg = (x) => Math.min(dd(x), exp(x));
    const so = (x) => A().ORDER.indexOf(A().status(x.c.id));
    const rem = (x) => { const r = P().unitsOf(x.c.id).remaining; return r == null ? 99999 : r; };
    const k = AL.sort.k, dir = AL.sort.dir;
    return rows.slice().sort((a, b) => {
      let d;
      if (k === 'consumer') d = a.c.ini < b.c.ini ? -1 : a.c.ini > b.c.ini ? 1 : 0;
      else if (k === 'period') d = exp(a) - exp(b);
      else if (k === 'remaining') d = rem(a) - rem(b);
      else if (k === 'status') d = so(a) - so(b);
      else d = urg(a) - urg(b) || so(a) - so(b);
      return (d || urg(a) - urg(b) || (a.c.id < b.c.id ? -1 : 1)) * (k === 'default' ? 1 : dir);
    });
  }

  /* ---------------- cells ---------------- */
  const num = (v, sub) => '<td class="n">' + (v == null ? '<span class="p1-mut">—</span>' : '<b>' + v + '</b>') + (sub ? '<span class="al-s">' + esc(sub) + '</span>' : '') + '</td>';
  const diLine = (id) => { const s = P().diState(id); return P().hasDecision(id) && s !== 'new' ? '<span class="al-s" data-psy="di-status">' + esc(PSY.diStatus.label(s)) + '</span>' : ''; };
  function nextCell(id) {
    const na = P().nextAction(id); const dl = nextDl(id);
    if (!na && !dl) return '<td class="al-a"><span class="p1-mut">—</span></td>';
    let h = '';
    if (na && na.attrs) h += '<button type="button" class="btn ' + (na.primary ? 'p' : 'o') + ' s" ' + na.attrs + '>' + esc(na.label) + '</button>';
    else if (na) h += '<span class="al-t">' + esc(na.label) + '</span>';
    return '<td class="al-a">' + h + (dl ? P().dlLine(dl) : '') + '</td>';
  }
  function rowHtml(x) {
    const c = x.c, id = c.id, st = A().status(id), pay = PSY.data.payers[c.payer] || {}, u = P().unitsOf(id), m = A().meta(id), svc = u.svc;
    const lid = P().laurisId(id);
    const pEnd = (/–\s*(.+)$/.exec(u.period || '') || [])[1] || '';
    const remSub = u.cur && pEnd && u.remEnd && u.remEnd !== pEnd ? 'ends ' + u.remEnd : u.un !== 'units' && u.remaining != null ? u.un : '';
    return '<tr data-id="' + esc(id) + '" data-act="al5-open">' +
      '<td><a class="p1-id" data-go="auth-detail?case=' + esc(id) + '">' + esc(c.ini) + '</a><span class="al-s">Lauris #' + esc(lid) + '</span></td>' +
      '<td>' + esc(svc.short) + (svc.code ? '<span class="al-s">' + esc(svc.code) + '</span>' : '') + '</td>' +
      '<td>' + esc(PAYER_SHORT[c.payer] || pay.short || c.payer) + '</td>' +
      '<td>' + esc(P().assignee(id) || '—') + '</td>' +
      '<td>' + esc(u.period || '—') + '<span class="al-s">' + esc(KIND[m.kind] || '') + '</span></td>' +
      num(u.req, u.un !== 'units' ? u.un : '') + num(u.appr, u.appr != null && u.word === 'offered' ? 'offered' : '') + num(u.remaining, remSub) +
      '<td class="st">' + A().badge(st, SHORT_ST[st]) + diLine(id) + '</td>' + nextCell(id) + '</tr>';
  }
  function th(k, label, cls) {
    if (!k) return '<th scope="col"' + (cls ? ' class="' + cls + '"' : '') + '>' + label + '</th>';
    const on = AL.sort.k === k;
    return '<th scope="col"' + (cls ? ' class="' + cls + '"' : '') + '><button type="button" class="' + (on ? 'on' : '') + '" data-act="al5-sort" data-k="' + k + '">' + label + ' <i>' + (on ? (AL.sort.dir > 0 ? '↑' : '↓') : '↕') + '</i></button></th>';
  }
  /* column widths (%), wide window and ≤ 1400 px: no word breaks inside a cell (Outpatient, Humana, REQUESTED) and the period on one line */
  const COLW = [9, 7.4, 6.6, 7, 10.6, 7.8, 7.4, 8.4, 13.4, 22.4];
  const COLW_N = [9.7, 8, 6.4, 7, 11.5, 8.3, 7.8, 8.8, 11.4, 21.1];
  const COL_CSS = COLW.map((w, i) => '.al5t col.w' + i + '{width:' + w + '%}').join('') + '@media (max-width:1400px){' + COLW_N.map((w, i) => '.al5t col.w' + i + '{width:' + w + '%}').join('') + '}';
  function tableHtml(rows) {
    return '<table class="al5t"><colgroup>' + COLW.map((w, i) => '<col class="w' + i + '">').join('') + '</colgroup><thead><tr>' +
      th('consumer', 'Consumer') + th(null, 'Service') + th(null, 'Payer') + th(null, 'Assigned clinician') + th('period', 'Authorization period') +
      th(null, 'Requested', 'n') + th(null, 'Approved', 'n') + th('remaining', 'Remaining', 'n') + th('status', 'Status', 'st') + th(null, 'Next action') + '</tr></thead>' +
      '<tbody>' + (rows.length ? rows.map(rowHtml).join('') : '<tr><td colspan="10" style="cursor:default"><div class="p1-empty">Nothing to show. <button type="button" class="p1-lk" data-act="fb-clear" data-page="auth">Clear filters</button></div></td></tr>') + '</tbody></table>';
  }
  /* the table's head line: how many rows the filters leave, and Clear filters */
  function countHtml(x, d) {
    const n = FB().active(PG, d) + (FB().dates(PG).on ? 1 : 0); // the time box counts as one filter
    return '<div class="al-ct" data-fb="count"><span><b>' + x.rows.length + '</b> of ' + x.all.length + ' authorizations</span>' +
      (n ? '<button type="button" class="fb-x" data-act="fb-clear" data-page="' + PG + '">Clear filters (' + n + ')</button>' : '') + '</div>';
  }
  /* a deep link sets the filters it names (old links too: show=denied, st=partial, exp=30, ends=30, range=nov); a plain visit after one
     goes back to everything */
  const fromParams = (p) => {
    const m = { from: '', to: '' }; KEYS.forEach((k) => { m[k] = ''; });
    m.status = normStatus(p.status) || normStatus(p.show) || (p.st ? ST_STATUS[p.st] || '' : '');
    const ends = ENDS_N.indexOf(+p.ends) >= 0 ? +p.ends : p.show === 'expiring' || p.show === 'expiring30' ? 30 : p.exp ? (ENDS_N.indexOf(+p.exp) >= 0 ? +p.exp : 30) : 0;
    const mo = p.range ? monthDates(p.range) : null;
    if (ends) { m.from = isoPlus(0); m.to = isoPlus(ends); } else if (mo) { m.from = mo[0]; m.to = mo[1]; }
    if (okIso(p.from) || okIso(p.to)) { m.from = okIso(p.from); m.to = okIso(p.to); }
    if (p.payer && PSY.data.payers[p.payer]) m.payer = p.payer;
    ['service', 'assigned', 'location', 'school'].forEach((k) => { if (p[k]) m[k] = String(p[k]); });
    m.kind = okOpt(REQ, String(p.kind || '')); m.due = okOpt(DUE, String(p.due || '')); m.units = p.units === 'low' ? 'low' : ''; if (p.q) m.q = String(p.q);
    return m;
  };
  /* the time box (PSY.fb.dateRange, 04b-daterange.js) with this page's presets and a one-line note of what it matches */
  function timeBox() {
    const on = FB().dates(PG).on; const n = endsPreset();
    return PSY.fb.dateRange(PG, { label: 'Authorization period', presets: ENDS_P, id: 'al5-period', hint: on && n ? 'Matches the date the authorization ends' : 'Matches any overlap with the period' });
  }
  function listPage(params) {
    if (!PSY.can('auth')) return PSY.platform.page({ active: 'auth', title: 'All Authorizations', body: '<div class="pf-noacc" data-psy="noaccess"><b>No access</b><span>All Authorizations</span></div>' });
    FB().fromParams(PG, params, fromParams);
    const x = pick(); const d = defs(x.all.map((r) => r.f));
    return PSY.platform.page({ active: 'auth', title: 'All Authorizations', actions: timeBox(), body: '<div class="alx">' + FB().html(PG, d) + '<section class="card p1-tw" id="al5-table">' + countHtml(x, d) + tableHtml(x.rows) + '</section></div>' });
  }

  /* ---------------- the authorization page ---------------- */
  const SIM = /sfax|availity|uhc portal|portal|fax|simulated/i;
  const card = (id, title, body, extra) => '<section class="card" id="' + id + '"><h2>' + title + (extra || '') + '</h2>' + body + '</section>';
  /* requested vs approved, and the authorization in force */
  function unitsCard(id, o) {
    const st = A().status(id); const m = A().meta(id); const x = P().unitsOf(id); const svc = x.svc; const rule = PSY.rules.byId(svc.ruleId); const c = PSY.caseView(id);
    const not = x.req != null && x.appr != null && x.req > x.appr ? x.req - x.appr : null;
    const stat = (v, l, cls) => '<div' + (cls ? ' class="' + cls + '"' : '') + '><b>' + (v == null ? '—' : v) + '</b><span>' + l + '</span></div>';
    const stats = '<div class="ad-un" data-psy="units">' + stat(x.req, 'requested') + stat(x.appr, x.word) + (not ? stat(not, 'not approved', 'r') : '') + stat(x.remaining, 'remaining') + '</div>';
    let bar = '';
    if (x.authorized != null && x.remaining != null) {
      const used = Math.max(0, x.authorized - x.remaining); const pct = Math.round((used / Math.max(1, x.authorized)) * 100);
      bar = '<div class="ad-bar" role="img" aria-label="' + x.remaining + ' of ' + x.authorized + ' ' + x.un + ' left"><div class="l"><span><b>' + x.remaining + '</b> of ' + x.authorized + ' ' + esc(x.un) + ' left</span><span>' + (x.remEnd ? 'ends ' + esc(x.remEnd) : '') + '</span></div><div class="t"><i style="width:' + pct + '%"></i></div></div>';
    }
    return card('ad-units', 'Requested vs approved', (o && o.steps ? stepsHtml(id) : '') + '<div class="ad-hd">' + A().badge(st) + diLine(id).replace('al-s', 'p1-mut p1-sm') + '</div>' + stats + bar +
      '<div class="ad-g"><span>Authorization period</span><b>' + esc(x.period || '—') + '</b>' +
      '<span>Request</span><span style="color:inherit">' + esc(KIND[m.kind] || 'Request') + (m.ref ? ' · ' + esc(m.ref) : '') + '</span>' +
      '<span>Service</span><span style="color:inherit">' + esc(svc.label) + (svc.code ? ' (' + esc(svc.code) + ')' : '') + '</span>' +
      '<span>How units count</span><div>' + esc(svc.rule) + (rule ? '<div class="rq5-m">' + PSY.rules.chip(rule) + '<span>' + esc(rule.source) + '</span></div>' : '') + '</div>' +
      '<span>Payer</span><span style="color:inherit">' + esc((PSY.data.payers[c.payer] || {}).name || c.payer) + '</span>' +
      '<span>Assigned clinician</span><span style="color:inherit">' + esc(P().assigneeName(id) || '—') + '</span></div>');
  }
  /* authorization timeline: where the request is, then every event (seeded history + this session's audit, Denial Intelligence included) */
  const STEPS = ['Drafted', 'Submitted', 'Payer decision', 'In force', 'Renewal'];
  const STEP_AT = { draft: 0, review: 0, ready: 0, submitted: 1, pending: 1, info: 1, partial: 2, denied: 2, recon: 2, appeal: 2, approved: 3, closed: 5 };
  function stepsHtml(id) {
    const st = A().status(id); let at = STEP_AT[st] != null ? STEP_AT[st] : 0; if (st === 'approved' && OV().isRenewalDue(id)) at = 4;
    return '<ol class="sy-flow ad-steps" data-psy="steps" aria-label="Where the authorization is">' + STEPS.map((s, i) => '<li class="' + (i < at ? 'done' : i === at ? 'now' : '') + '"' + (i === at ? ' aria-current="step"' : '') + '>' + s + '</li>').join('') + '</ol>';
  }
  function timelineCard(id) { return card('ad-tl', 'Authorization timeline', stepsHtml(id) + A().timelineHtml(id)); }
  /* clinical documentation in Lauris; names and dates only (Restricted) without clinical record access */
  const DOC_GO = { screen: 'lauris-screening', cna: 'lauris-cna', isp: 'lauris-isp', dpn: 'lauris-dpn' };
  const DOC_NAME = { screen: 'Admission Screening', cna: 'Comprehensive Intake / Needs Assessment', isp: 'Individual Service Plan (ISP)', dpn: 'Daily Progress Notes' };
  function docsOf(id) {
    const L = PSY.data.lauris; const con = L && L.byCase(id); if (!con) return [];
    const base = PSY.l1a && PSY.l1a.DOCS ? PSY.l1a.DOCS(con) : [];
    const out = base.filter((d) => DOC_GO[d.k]).map((d) => ({ k: d.k, name: DOC_NAME[d.k], when: d.when, go: DOC_GO[d.k] + '?c=' + con.id }));
    if (out.length) out.push({ k: 'dpn', name: DOC_NAME.dpn, when: con.updated || '', go: 'lauris-dpn?c=' + con.id });
    base.filter((d) => d.k === 'iep').forEach((d) => out.push({ k: 'iep', name: d.name, when: d.when, missing: d.missing, go: 'lauris-consumer?c=' + con.id + '&tab=docs' }));
    return out;
  }
  function docsCard(id) {
    const open = PSY.can('clinicalRecords'); const docs = docsOf(id);
    const li = (d) => '<li data-doc="' + d.k + '"><div><span class="nm">' + esc(d.name) + '</span><span class="d"> · ' + (d.missing ? esc(d.missing) : esc(d.when || 'On file')) + '</span></div>' +
      (d.missing ? '<span class="st5 t-amber"><i aria-hidden="true">!</i>Missing</span>' : open ? '<button type="button" class="p1-lk" data-go="' + esc(d.go) + '">Open in Lauris ' + P().icons.ext + '</button>' : '') + '</li>';
    const body = docs.length ? '<ul class="ad-list" data-psy="docs">' + docs.map(li).join('') + '</ul>' : '<div class="p1-mut p1-sm">No clinical documents in Lauris yet.</div>';
    return card('ad-docs', 'Clinical documentation', body, open ? '' : '<span class="ad-rx" data-psy="restricted">' + P().icons.lock + 'Restricted · clinical access</span>');
  }
  /* relevant deadlines, each with its source */
  function deadlinesCard(id) {
    const dl = P().actionDeadline(id); const x = P().unitsOf(id); const st = A().status(id); const m = A().meta(id); const items = [];
    if (dl) items.push(P().dlHtml(dl));
    if (x.end && (x.cur || st === 'approved') && st !== 'closed') {
      const n = P().daysUntil(x.end);
      items.push(P().dlHtml({ date: x.end, what: 'Authorization ends', src: 'End date of ' + (m.ref || 'the authorization') + (x.cur ? ' in Lauris · Authorizations' : ' · approved period'), days: n, tone: n == null ? 'n' : n <= 7 ? 'r' : n <= 30 ? 'y' : 'n' }));
    }
    if (!items.length) items.push(P().dlHtml(null));
    return card('ad-dl', 'Deadlines', '<div class="ad-dls">' + items.join('') + '</div>');
  }
  /* renewal status: the concurrent SRA that follows the authorization in force */
  function renewalCard(id) {
    const st = A().status(id); const m = A().meta(id); const x = P().unitsOf(id); const req = m.request || {}; const s = PSY.state.cases[id] || {};
    let chip, lines = '';
    const tone = (t, i, l) => '<span class="st5 t-' + t + '" data-psy="renewal"><i aria-hidden="true">' + i + '</i>' + esc(l) + '</span>';
    if (m.kind !== 'continued' && st !== 'approved') chip = tone('gray', '○', 'Initial SRA · not a renewal');
    else if (m.kind !== 'continued') chip = tone('gray', '○', 'Concurrent SRA before ' + (x.end || 'the end date'));
    else if (['draft', 'review', 'ready'].indexOf(st) >= 0) { chip = tone('amber', '◔', 'Being prepared in Lauris'); lines = '<span>Next period</span><b>' + esc(req.period || '—') + '</b><span>Requested</span><span style="color:inherit">' + (req.units || '—') + ' ' + esc(x.un) + '</span><span>Due before</span><span style="color:inherit">' + esc((x.cur && x.cur.end) || '—') + '</span>'; }
    else if (st === 'approved' && !m.decision) {
      const due = OV().isRenewalDue(id);
      chip = due ? tone(s.csStarted ? 'amber' : 'red', s.csStarted ? '◔' : '!', s.csStarted ? 'Being prepared in Lauris' : 'Due · not started') : tone('green', '✓', 'Not due yet');
      lines = '<span>Next period</span><b>' + esc(req.period || '—') + '</b><span>Due before</span><span style="color:inherit">' + esc(x.end || '—') + '</span>';
    } else if (st === 'approved') chip = tone('green', '✓', 'Approved through ' + (x.end || '—'));
    else if (st === 'closed') chip = tone('gray', '■', 'Closed');
    else { chip = tone('blue', '↗', 'Submitted · ' + A().label(st)); lines = '<span>Period</span><b>' + esc(req.period || '—') + '</b>'; }
    const na = P().nextAction(id); const btn = na && na.renewal && na.attrs ? '<div class="ad-ln"><button type="button" class="btn p s" ' + na.attrs + '>' + esc(na.label) + '</button></div>' : '';
    return card('ad-ren', 'Renewal status', '<div class="ad-hd" style="margin-bottom:0">' + chip + '</div>' + (lines ? '<div class="ad-g">' + lines + '</div>' : '') + btn);
  }
  /* submission history: the record written by the extension or in the demo data, then the submission events of the timeline */
  const SUBM = /(sent to|sent through|faxed|by sfax|submitted|through availity|receipt|reply sent|signed in lauris|signed by)/i;
  function submissionCard(id, c, o) {
    const rec = !!(o && o.record);
    const s = P().submissionOf(id); const ch = PSY.rules.channel(c.payer); const st = A().status(id);
    const chLine = '<div class="rq5-m" style="margin-top:4px">' + PSY.ev.label(ch.kind === 'unverified' ? 'unverified' : ch.kind) + '<span>' + esc(ch.source) + '</span></div>';
    const ev = A().timeline(id).filter((e) => SUBM.test(e.action) && !/^Denial Intelligence/.test(e.action));
    let head;
    if (s) {
      const docs = Array.isArray(s.docs) ? s.docs.map((d) => (typeof d === 'string' ? d : d.label || d.name || d.title || '')).filter(Boolean) : [];
      head = '<div class="ad-hd">' + PSY.ev.label('sent', 'Submission Confirmed') + (s.simulated || SIM.test(String(s.method || '')) ? P().simChip() : '') + '</div>' +
        '<div class="ad-g" style="margin-top:0"><span>Method</span><b>' + esc(s.method || ch.label) + '</b>' + (s.ref ? '<span>Reference</span><b>' + esc(s.ref) + '</b>' : '') + (s.date ? '<span>Date</span><span style="color:inherit">' + esc(s.date) + '</span>' : '') +
        (docs.length ? '<span>Documents</span><span style="color:inherit">' + docs.map(esc).join(' · ') + '</span>' : '') + '<span>Payer’s channel</span><div>' + esc(ch.label) + chLine + '</div></div>';
    } else if (['draft', 'review', 'ready'].indexOf(st) >= 0) {
      head = '<div class="ad-hd"><span class="st5 t-gray"><i aria-hidden="true">○</i>Not submitted</span></div><div class="ad-g" style="margin-top:0"><span>Goes by</span><div><b>' + esc(ch.label) + '</b>' + chLine + '</div></div>';
    } else {
      head = '<div class="ad-g" style="margin-top:0"><span>Payer’s channel</span><div><b>' + esc(ch.label) + '</b>' + chLine + '</div></div>';
    }
    const hist = !rec && ev.length ? '<ol class="ad-hist" data-psy="sub-hist">' + ev.map((e) => '<li><span class="t">' + esc(e.t) + '</span><span>' + esc(e.action) + '</span></li>').join('') + '</ol>' : '';
    return card('ad-sub', rec ? 'Submission' : 'Submission history', head + hist);
  }
  /* payer correspondence: the decision on file with the payer's stated reason, and where Denial Intelligence stands */
  function correspondenceCard(id, o) {
    const m = A().meta(id); const d = m.decision; const st = A().status(id); const x = P().unitsOf(id); const ds = P().diState(id);
    let body;
    if (d) {
      const what = { info: 'Additional information requested', partial: 'Partially approved', reduction: 'Offered fewer units', denial: 'Denied' }[d.type] || A().label(st);
      body = '<div class="ad-hd">' + PSY.ev.label('corr') + '<span class="p1-mut p1-sm">' + esc(what) + ' · ' + esc(d.date) + '</span></div>' +
        '<div class="ad-g" style="margin-top:0"><span>From</span><b>' + esc(d.by) + '</b><span>Received by</span><span style="color:inherit">' + esc(d.via) + '</span>' +
        (d.type !== 'info' ? '<span>Units</span><span style="color:inherit">' + (x.req != null ? x.req : '—') + ' requested · ' + (d.approved != null ? d.approved : '—') + ' ' + (d.type === 'reduction' ? 'offered' : 'approved') + '</span>' : '') +
        (d.said ? '<span>Payer’s stated reason</span><div><blockquote class="q5 ad-q">' + esc(d.said) + '</blockquote></div>' : '') +
        '<span>Denial Intelligence</span><span style="color:inherit" data-psy="di-res">' + esc(PSY.diStatus.label(ds)) + '</span></div>';
    } else if (OV().isPending(id)) {
      const r = PSY.rules.byId('turnaround');
      body = '<div class="ad-hd"><span class="st5 t-gray"><i aria-hidden="true">…</i>No decision yet</span></div>' + (r ? '<div class="ad-g" style="margin-top:0"><span>Decision time</span>' + PSY.rules.line(r) + '</div>' : '');
    } else body = '<div class="p1-mut p1-sm">' + (o && o.record ? 'No payer decision on file.' : 'No payer correspondence on file.') + '</div>';
    return card('ad-corr', o && o.record ? 'Payer decision' : 'Payer correspondence', body);
  }
  /* History and the voice agent (HIST13: 08-history.js, 09-voice.js); the page renders without them */
  const histOk = () => !!(PSY.hist && typeof PSY.hist.html === 'function');
  /* the voice agent's status call: an SRA that is with the payer (submitted, pending, info requested) */
  const CALL_ST = ['submitted', 'pending', 'info'];
  const callable = (id) => CALL_ST.indexOf(A().status(id)) >= 0 && !!(PSY.voice && typeof PSY.voice.button === 'function');
  function detailPage(id) {
    const c = PSY.caseView(id);
    if (!c) return PSY.platform.page({ active: 'auth', crumbs: [{ label: 'All Authorizations', go: 'auth-list' }, { label: esc(id) }], title: 'Nothing to show', body: '<div class="p1-empty"><button type="button" class="btn p" data-go="auth-list">Back to All Authorizations</button></div>' });
    const bl = P().blocked(id); if (bl) return P().noAccess(id, bl);
    const m = A().meta(id); const lid = P().laurisId(id); const na = P().nextAction(id); const vis = A().visible(id);
    const pay = PSY.data.payers[c.payer] || {}; const svc = A().units(id).service;
    let actions = '';
    if (vis && P().hasDecision(id) && P().denialsOk()) actions += '<button type="button" class="btn ' + (P().isDecision(id) ? 'p' : 'o') + '" data-go="' + esc(P().diRoute(id)) + '" data-psy="open-di">Open in Denial Intelligence</button>';
    else if (vis && na && na.attrs) actions += '<button type="button" class="btn ' + (na.primary ? 'p' : 'o') + '" ' + na.attrs + '>' + esc(na.label) + '</button>';
    if (vis && callable(id)) actions += PSY.voice.button(id, { purpose: 'sra-status', scope: 'auth' });
    if (lid) actions += '<button type="button" class="btn o" data-go="lauris-consumer?c=' + esc(lid) + '">' + P().icons.ext + 'Open in Lauris</button>';
    const ban = vis ? '' : '<div class="ad-ban"><span><b>Not requested yet</b></span></div>';
    /* round 13: History (08-history.js) replaces the timeline, the submission history and the correspondence list; the facts it does not
       list stay: where the SRA is (in the units card), the submission record and the payer decision on file. Without it: round 12. */
    const H = histOk();
    const body = ban + '<div class="ad" data-detail="' + esc(id) + '"><div class="ad-col">' + unitsCard(id, { steps: H }) + docsCard(id) + (H ? '' : timelineCard(id)) + '</div><div class="ad-col">' +
      deadlinesCard(id) + renewalCard(id) + submissionCard(id, c, { record: H }) + correspondenceCard(id, { record: H }) + '</div></div>' +
      (H ? '<div class="ad-hw" id="ad-hist">' + PSY.hist.html(id, { scope: 'auth' }) + '</div>' : '');
    return PSY.platform.page({ active: 'auth', crumbs: P().crumbs(id), title: esc(c.ini + ', ' + c.age) + ' · ' + esc(KIND[m.kind] || 'Authorization'),
      sub: esc(['Lauris #' + lid, svc.short + (svc.code ? ' ' + svc.code : ''), pay.name, m.ref].filter(Boolean).join(' · ')), actions, body });
  }

  /* the address bar of a filtered link: authorizations?status=denied */
  const query = (p) => { const q = Object.keys(p || {}).filter((k) => p[k] && p[k] !== 'all').map((k) => k + '=' + encodeURIComponent(p[k])).join('&'); return q ? '?' + q : ''; };
  PSY.register({
    id: 'auth-list', app: 'psyflo', label: 'All Authorizations', url: (p) => 'authorizations' + (p && p.case ? '/' + p.case : query(p)),
    get css() { return P().css + CSS + COL_CSS; },
    render(params) { return params && params.case ? detailPage(params.case) : listPage(params); },
  });
  PSY.register({
    id: 'auth-detail', app: 'psyflo', label: 'Authorization', url: (p) => 'authorizations/' + ((p && p.case) || ''),
    tabTitle: (p) => 'Psyflo — ' + (((PSY.caseView((p && p.case) || '') || {}).ini) || 'Authorization'),
    get css() { return P().css + CSS; },
    render(params) { return detailPage((params && params.case) || 'R-0411'); },
  });
  PSY.acts['al5-sort'] = (el) => { const k = el.getAttribute('data-k'); AL.sort = AL.sort.k === k ? { k, dir: -AL.sort.dir } : { k, dir: 1 }; PSY.refresh(); };
  PSY.acts['al5-open'] = (el) => PSY.go('auth-detail?case=' + el.getAttribute('data-id'));
  /* what each filter reads for one authorization, and whether it passes a set of filters (tests, other pages) */
  PSY.authList = { KEYS, ENDS_P, facts: (id) => { const c = PSY.caseView(id); return c ? facts(c) : null; }, pass: (id, filters) => { const c = PSY.caseView(id); if (!c) return false; const f = facts(c); return Object.keys(filters || {}).every((k) => pass(f, k, filters[k])); },
    /* the time box as it is set now (PSY.state.fb.auth.from/to): does this authorization show */
    when: (id) => { const c = PSY.caseView(id); return !!c && passWhen(facts(c), g('from'), g('to')); }, endsPreset: () => endsPreset() };

  /* ---------------- shared hooks ---------------- */
  /* where a case opens: a payer decision on its Denial Intelligence workspace, everything else on the authorization page */
  PSY.platform.caseRoute = (cid) => (P().isDecision(cid) && P().denialsOk() ? P().diRoute(cid) : 'auth-detail?case=' + cid);
  /* the sidebar badge counts what the role sees in All Authorizations (its caseload, this locality) */
  if (PSY.counts && !PSY.counts.__d9) {
    const baseCounts = PSY.counts;
    PSY.counts = () => { const c = baseCounts(); try { if (PSY.dash && PSY.dash.ov) c.auth = cases().length; } catch (e) {} return c; };
    PSY.counts.__d9 = true;
  }
  /* the removed pages land on All Authorizations; the old case page lands on the authorization page */
  const R = PSY.REDIRECT;
  ['home', 'referrals', 'ref-review', 'payers', 'payer', 'connect-lauris'].forEach((k) => { R[k] = () => ({ id: 'auth-list' }); });
  R.case = (p) => (p && p.case && PSY.caseById(p.case) ? { id: 'auth-detail', params: { case: p.case } } : { id: 'auth-list' });
  /* scenario 5 (admin tracks authorizations): All Authorizations with no filter and the default order, both localities */
  const PR = (PSY.presenter = PSY.presenter || {}); PR.prep = PR.prep || {};
  PR.prep.s5 = () => { PSY.state.fb = PSY.state.fb || {}; PSY.state.fb[PG] = {}; PSY.state.prefs = PSY.state.prefs || {}; PSY.state.prefs.locality = 'both'; AL.sort = { k: 'default', dir: 1 }; PSY.save(); };
})();
