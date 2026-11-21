/* Lauris Online pages behind the left menu (everything except the session forms, Authorizations and Forms to Approve):
   lauris-add-session, lauris-saved, lauris-approvals, lauris-reports, lauris-user, lauris-rejected, lauris-noauth (lauris-time is 63-ext-time.js).
   Round 8: Add Session has the session types Collateral Contact and Monthly Summary (68-dpn.js); Saved Session lists what the Scribe
   saved to Lauris today (PSY.scribe.saved()) and, under Processed, the past notes (PSY.dpn.past) that open read-only.
   Round 9: Add Session lists the consumers of the role's caseload (PSY.caseload). */
(function () {
  const PSY = window.PSY; const L = PSY.data.lauris; const U = PSY.l1a; const esc = PSY.esc;
  const tbl = (head, rows, empty) => '<table class="lt"><thead><tr>' + head.map((h) => '<th' + (h[1] ? ' class="' + h[1] + '"' : '') + '>' + esc(h[0]) + '</th>').join('') + '</tr></thead><tbody>' +
    (rows.length ? rows.join('') : '<tr><td colspan="' + head.length + '"><div class="l1-empty">' + empty + '</div></td></tr>') + '</tbody></table>';
  const ctxLine = (t) => t;

  /* ================= Add Session ================= */
  const SESSION = {
    types: { dpn: 'Daily Progress Note – TDT', collateral: 'Collateral Contact', monthly: 'Monthly Summary', screening: 'Admission Screening', cna: 'Intake · Comprehensive Needs Assessment', isp: 'Individual Service Plan' },
    routes: { dpn: 'lauris-dpn', collateral: 'lauris-collateral', monthly: 'lauris-monthly', screening: 'lauris-screening', cna: 'lauris-cna', isp: 'lauris-isp' },
  };
  /* direct support staff: Lauris lets them write notes only (no admission screening, intake or plan) */
  const typeOrder = () => ['dpn', 'collateral', 'monthly', 'screening', 'cna', 'isp'].filter((k) => PSY.role() !== 'dss' || ['dpn', 'collateral', 'monthly'].indexOf(k) >= 0);
  const typeFor = (c) => { const d = U.sessionDefault ? U.sessionDefault(c) : 'dpn'; return typeOrder().indexOf(d) >= 0 ? d : 'dpn'; };
  PSY.register({
    id: 'lauris-add-session', app: 'lauris', label: 'Add Session', url: 'sessions/add', css: U.css,
    render(p) {
      const c = p && p.c ? L.byId(p.c) : null; const type = p && typeOrder().indexOf(p.t) >= 0 ? p.t : typeFor(c);
      const mine = PSY.caseload ? PSY.caseload() : L.consumers.map((x) => x.id); // patient-level access: the role's caseload
      const copts = '<option value="">Select a consumer</option>' + L.consumers.filter((x) => mine.indexOf(x.id) >= 0 || (c && c.id === x.id)).map((x) => '<option value="' + x.id + '"' + (c && c.id === x.id ? ' selected' : '') + '>' + esc(x.ini) + ' · ' + x.id + '</option>').join('');
      const topts = typeOrder().map((k) => '<option value="' + k + '"' + (k === type ? ' selected' : '') + '>' + esc(SESSION.types[k]) + '</option>').join('');
      const main = '<h3 class="lh1">Add Session</h3><div class="lcard" style="padding:16px 18px;max-width:760px">' +
        '<div class="l1-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">' +
        '<div><label>Consumer</label><select class="l1-in" data-psy="as-c" data-change="l1a-as-change">' + copts + '</select></div>' +
        '<div><label>Session type</label><select class="l1-in" data-psy="as-t" data-change="l1a-as-change">' + topts + '</select></div>' +
        '<div><label>Service date</label><input class="l1-in" value="10/29/2026" readonly></div>' +
        '<div><label>Staff</label><input class="l1-in" value="' + esc(PSY.lauris.user.name) + '" readonly></div></div>' +
        '<div class="l1-tg" style="border-top:0;padding:14px 0 0"><input type="checkbox" id="l1as-scribe" data-psy="as-scribe" checked><label for="l1as-scribe">Start the Scribe now</label></div>' +
        '<div class="l1-row" style="margin-top:12px"><button class="lb pri" data-act="l1a-as-start">Start</button><button class="lb" data-go="lauris-consumers">Cancel</button><span data-psy="err" style="color:#A3341C;font-size:12px"></span></div></div>';
      return PSY.lauris.page({ active: 'Add Session', main, panel: { context: ctxLine('Add Session'), notes: U.notes.addSession(c, type), student: c ? c.ini : undefined, case: c && c.case ? c.case : undefined } });
    },
  });
  PSY.acts['l1a-as-change'] = (el, ctx) => {
    const root = ctx.root; const cs = root.querySelector('[data-psy="as-c"]'); const ts = root.querySelector('[data-psy="as-t"]');
    const c = cs.value ? L.byId(cs.value) : null;
    if (el === cs) ts.value = typeFor(c); // a new consumer starts on the form that comes next for them
    ctx.params.c = cs.value; ctx.params.t = ts.value;
    root.querySelector('[data-psy="err"]').textContent = '';
  };
  PSY.acts['l1a-as-start'] = (el, ctx) => {
    const root = ctx.root; const id = root.querySelector('[data-psy="as-c"]').value; const t = root.querySelector('[data-psy="as-t"]').value;
    if (!id) { root.querySelector('[data-psy="err"]').textContent = 'Choose a consumer first.'; root.querySelector('[data-psy="as-c"]').focus(); return; }
    const box = root.querySelector('[data-psy="as-scribe"]');
    PSY.go(SESSION.routes[t] + '?c=' + id + (box && box.checked ? '&scribe=1' : ''));
  };

  /* ================= Saved Session ================= */
  const SEED_SAVED = [
    { c: '4471', ini: 'M.R.', label: 'Daily Progress Note – TDT', date: '10/28/2026', at: '10/28/2026 4:12 pm', by: 'J. Perez', go: 'lauris-dpn?c=4471' },
    { c: '4441', ini: 'T.N.', label: 'Daily Progress Note – TDT', date: '10/27/2026', at: '10/27/2026 3:48 pm', by: 'J. Perez', go: 'lauris-dpn?c=4441' },
  ];
  /* a session the Scribe saved today has been processed in Lauris since (it then waits in Forms to Approve) */
  const isProcessed = (r) => {
    if (r.form && PSY.lf && PSY.lf.forms[r.form]) { const c = L.byId(r.c); return !!(c && PSY.lf.st(r.form, c).processed); }
    if (r.type === 'dpn') return !!PSY.flag('l1b.dpn.' + r.c + '.processed');
    if (r.type === 'collateral' || r.type === 'monthly') return !!PSY.flag('l8.' + r.type + '.' + r.c + '.processed');
    return false;
  };
  const fromPsyflo = () => (PSY.scribe && PSY.scribe.saved ? PSY.scribe.saved() : []);
  const savedRows = () => fromPsyflo().filter((r) => !isProcessed(r)).concat(SEED_SAVED);
  const processedRows = () => {
    const today = fromPsyflo().filter(isProcessed).map((r) => ({ c: r.c, ini: r.ini, label: r.label, date: r.date, at: r.date, by: r.by, go: r.go, view: 'Open' }));
    const past = [];
    if (PSY.dpn && PSY.dpn.past) L.consumers.forEach((c) => PSY.dpn.past(c.id).forEach((p) => past.push({ c: c.id, ini: c.ini, label: 'Daily Progress Note – TDT', date: p.date, at: p.at || p.date, by: p.by, go: p.go, iso: p.iso, view: 'View' })));
    past.sort((a, b) => (a.iso < b.iso ? 1 : -1));
    return today.concat(past);
  };
  /* the menu badge counts the saved sessions that are not processed yet */
  if (!PSY.lauris.__saved8) {
    PSY.lauris.__saved8 = true; const counts0 = PSY.lauris.counts;
    PSY.lauris.counts = () => { const c = counts0(); c.saved = savedRows().length; return c; };
  }
  const savedTable = (which) => (which === 'processed'
    ? tbl([['Unique ID'], ['Name'], ['Session'], ['Session date'], ['Processed'], ['Written by'], ['']], processedRows().map((r) => '<tr class="hov" data-saved="' + esc(r.c + '|' + (r.iso || r.date)) + '"><td>' + r.c + '</td><td><a class="lk" data-go="lauris-consumer?c=' + r.c + '">' + esc(r.ini) + '</a></td><td>' + esc(r.label) + '</td><td>' + esc(r.date) + '</td><td class="nw">' + esc(r.at) + '</td><td>' + esc(r.by) + '</td><td class="nw"><a class="lk" data-go="' + esc(r.go) + '">' + r.view + '</a></td></tr>'), 'No processed sessions.')
    : tbl([['Unique ID'], ['Name'], ['Session'], ['Session date'], ['Saved'], ['Saved by'], ['']], savedRows().map((r) => '<tr class="hov" data-saved="' + esc(r.c + '|' + r.label) + '"><td>' + r.c + '</td><td><a class="lk" data-go="lauris-consumer?c=' + r.c + '">' + esc(r.ini) + '</a></td><td>' + esc(r.label) + '</td><td>' + esc(r.date) + '</td><td class="nw">' + esc(r.at) + '</td><td>' + esc(r.by) + '</td><td class="nw"><a class="lk" data-go="' + esc(r.go) + '">Resume</a></td></tr>'), 'No saved sessions.'));
  PSY.register({
    id: 'lauris-saved', app: 'lauris', label: 'Saved Session', url: 'sessions/saved', css: U.css,
    render(p) {
      const w = p && p.tab === 'processed' ? 'processed' : 'saved';
      const main = '<h3 class="lh1">Saved Session</h3><div class="ltabs" data-psy="stabs"><a class="ltab' + (w === 'saved' ? ' on' : '') + '" data-act="l1a-saved-tab" data-w="saved">Saved (' + savedRows().length + ')</a><a class="ltab' + (w === 'processed' ? ' on' : '') + '" data-act="l1a-saved-tab" data-w="processed">Processed (' + processedRows().length + ')</a></div>' +
        '<div class="lcard" style="overflow-x:auto" data-psy="stbl">' + savedTable(w) + '</div>';
      return PSY.lauris.page({ active: 'Saved Session', main, panel: { context: ctxLine('Saved Session'), notes: U.notes.saved(), student: 'M.R.', case: 'R-0411' } });
    },
  });
  PSY.acts['l1a-saved-tab'] = (el, ctx) => {
    const w = el.getAttribute('data-w'); ctx.params.tab = w;
    ctx.root.querySelectorAll('[data-psy="stabs"] .ltab').forEach((t) => t.classList.toggle('on', t.getAttribute('data-w') === w));
    ctx.root.querySelector('[data-psy="stbl"]').innerHTML = savedTable(w);
  };

  /* ================= Approvals ================= */
  const APPROVED = [
    { f: 'Daily Progress Note – TDT', c: 'S.B.', d: '10/28/2026', by: 'K. Hale', ap: 'J. Perez, LPC', at: '10/29/2026 9:14 am', u: 3 },
    { f: 'Daily Progress Note – TDT', c: 'D.W.', d: '10/28/2026', by: 'K. Hale', ap: 'J. Perez, LPC', at: '10/29/2026 9:12 am', u: 3 },
    { f: 'Daily Progress Note – TDT', c: 'L.V.', d: '10/28/2026', by: 'K. Hale', ap: 'J. Perez, LPC', at: '10/29/2026 9:10 am', u: 1 },
    { f: 'Daily Progress Note – TDT', c: 'P.G.', d: '10/27/2026', by: 'K. Hale', ap: 'J. Perez, LPC', at: '10/28/2026 8:52 am', u: 2 },
    { f: 'Individual Service Plan', c: 'K.T.', d: '10/21/2026', by: 'J. Perez, LPC', ap: 'Maria, Program Director', at: '10/22/2026 2:05 pm', u: null },
    { f: 'Intake (CNA)', c: 'A.L.', d: '10/12/2026', by: 'J. Perez, LPC', ap: 'Maria, Program Director', at: '10/13/2026 11:30 am', u: null },
  ];
  const WAITING = [
    { f: 'Individual Service Plan', c: 'J.O.', d: '10/28/2026', by: 'J. Perez, LPC', ap: 'Maria, Program Director', at: 'Submitted 10/28/2026 3:40 pm', u: null },
    { f: 'Intake (CNA)', c: 'E.C.', d: '10/27/2026', by: 'J. Perez, LPC', ap: 'Maria, Program Director', at: 'Submitted 10/27/2026 1:15 pm', u: null },
  ];
  function apprTable(which) {
    const list = which === 'wait' ? WAITING : APPROVED;
    return tbl([['Form'], ['Consumer'], ['Session date'], ['Written by'], [which === 'wait' ? 'Waiting for' : 'Approved by'], [which === 'wait' ? 'Submitted' : 'Approved'], ['']],
      list.map((a, i) => '<tr class="hov"><td>' + esc(a.f) + '</td><td>' + esc(a.c) + '</td><td class="nw">' + a.d + '</td><td>' + esc(a.by) + '</td><td>' + esc(a.ap) + '</td><td class="nw">' + esc(a.at.replace('Submitted ', '')) + '</td><td class="nw"><a class="lk" data-act="l1a-appr-view" data-w="' + which + '" data-i="' + i + '">View</a></td></tr>'), 'Nothing here.');
  }
  PSY.register({
    id: 'lauris-approvals', app: 'lauris', label: 'Approvals', url: 'approvals', css: U.css,
    render() {
      const main = '<h3 class="lh1">Approvals</h3><div class="ltabs" data-psy="atabs"><a class="ltab on" data-act="l1a-appr-tab" data-w="done">Approved (' + APPROVED.length + ')</a><a class="ltab" data-act="l1a-appr-tab" data-w="wait">Waiting for others (' + WAITING.length + ')</a></div>' +
        '<div class="lcard" style="overflow-x:auto" data-psy="atbl">' + apprTable('done') + '</div>';
      return PSY.lauris.page({ active: 'Approvals', main, panel: { context: ctxLine('Approvals'), notes: U.notes.approvals() } });
    },
  });
  PSY.acts['l1a-appr-tab'] = (el, ctx) => {
    const w = el.getAttribute('data-w');
    ctx.root.querySelectorAll('[data-psy="atabs"] .ltab').forEach((t) => t.classList.toggle('on', t.getAttribute('data-w') === w));
    ctx.root.querySelector('[data-psy="atbl"]').innerHTML = apprTable(w);
  };
  PSY.acts['l1a-appr-view'] = (el) => {
    const w = el.getAttribute('data-w'); const a = (w === 'wait' ? WAITING : APPROVED)[+el.getAttribute('data-i')]; if (!a) return;
    PSY.ui.modal({
      title: a.f, sub: a.c + ' · session date ' + a.d,
      body: '<ul class="log"><li><b>Written by</b><span>' + esc(a.by) + '</span></li><li><b>' + (w === 'wait' ? 'Waiting for' : 'Approved by') + '</b><span>' + esc(a.ap) + '</span></li><li><b>' + (w === 'wait' ? 'Submitted' : 'Approved') + '</b><span>' + esc(a.at.replace('Submitted ', '')) + '</span></li>' +
        (a.u ? '<li><b>Units</b><span>' + U.plural(a.u, 'unit') + '</span></li>' : '') +
        '<li><b>Signature</b><span>' + (w === 'wait' ? 'Not signed yet' : 'Electronic signature on file') + '</span></li></ul>',
      actions: [{ label: 'Close' }],
    });
  };

  /* ================= Reports ================= */
  const OCT = { '4471': 54, '4458': 40, '4441': 33, '4430': 45, '4426': 18, '4419': 5 };
  const f1 = (n) => (Math.round(n * 10) / 10).toFixed(1);
  const REPORTS = [
    { k: 'units', name: 'Units used by consumer', desc: 'Units used this month and to date', build() {
      const cols = [{ t: 'Consumer' }, { t: 'Authorization' }, { t: 'Awarded', num: 1 }, { t: 'Used in October', num: 1 }, { t: 'Used to date', num: 1 }, { t: 'Available', num: 1 }, { t: 'Ends' }];
      let aw = 0, mo = 0, ud = 0, av = 0; const rows = [];
      L.consumers.forEach((c) => { const a = U.auth(c); if (!a) return; const oct = (OCT[c.id] || 0) + (PSY.flag('units-used.' + c.id) || 0); aw += a.awarded; mo += oct; ud += a.used; av += a.avail; rows.push([esc(c.ini), esc(a.no), a.awarded, oct, a.used, '<b>' + a.avail + '</b>', esc(a.to)]); });
      return { title: 'Units used by consumer', sub: 'October 2026, as of Thu 10/29 · J. Perez caseload', cols, rows, foot: ['Total', '', aw, mo, ud, av, ''], file: 'units-used-2026-10.csv' };
    } },
    { k: 'hours', name: 'Contact hours by staff', desc: 'Contact time by staff for the week', build() {
      const cols = [{ t: 'Staff' }, { t: 'Role' }, { t: 'Mon 10/26', num: 1 }, { t: 'Tue 10/27', num: 1 }, { t: 'Wed 10/28', num: 1 }, { t: 'Thu 10/29', num: 1 }, { t: 'Week', num: 1 }];
      const today = L.consumers.reduce((n, c) => n + PSY.time.total(c.ini), 0) / 60;
      const kh = [6.3, 6.0, 6.4, today]; const jp = [1.5, 1.0, 1.3, 0];
      const sum = (a) => a.reduce((x, y) => x + y, 0);
      const line = (n, r, a) => [esc(n), esc(r)].concat(a.map(f1)).concat(['<b>' + f1(sum(a)) + '</b>']);
      return { title: 'Contact hours by staff', sub: 'Week of 10/26/2026 · hours in school with a consumer · Thursday is today so far', cols, rows: [line('K. Hale', 'Direct care', kh), line('J. Perez, LPC', 'Clinical supervision', jp)], foot: ['Total', ''].concat([0, 1, 2, 3].map((i) => f1(kh[i] + jp[i]))).concat([f1(sum(kh) + sum(jp))]), file: 'contact-hours-2026-w44.csv' };
    } },
    { k: 'ending', name: 'Authorizations ending in 30 days', desc: 'Open authorizations ending soon', build() {
      const cols = [{ t: 'Consumer' }, { t: 'Authorization' }, { t: 'Ends' }, { t: 'Days left', num: 1 }, { t: 'Units available', num: 1 }, { t: 'Next request' }];
      const list = L.consumers.filter((c) => U.auth(c) && U.daysTo(c.ends) <= 30 && U.daysTo(c.ends) >= 0).sort((a, b) => U.pd(a.ends) - U.pd(b.ends));
      const rows = list.map((c) => { const a = U.auth(c); const r = U.req(c); return [esc(c.ini), esc(a.no), esc(c.ends), U.daysTo(c.ends), '<b>' + a.avail + '</b>', r ? esc(r.label) : 'Not started']; });
      return { title: 'Authorizations ending in 30 days', sub: 'From Thu 10/29/2026 through 11/28/2026', cols, rows, foot: null, file: 'authorizations-ending-30-days.csv' };
    } },
    { k: 'notes', name: 'Daily notes still open', desc: 'Days with contact time and no processed note', build() {
      const cols = [{ t: 'Consumer' }, { t: 'Date' }, { t: 'Contact time' , num: 1 }, { t: 'Units', num: 1 }, { t: 'Status' }];
      const rows = []; let open = 0;
      [['M.R.', '4471'], ['D.W.', '4458'], ['T.N.', '4441'], ['S.B.', '4430']].forEach(([ini, id]) => {
        const done = id === '4471' && PSY.flag('units-used.4471') > 0; const m = PSY.time.total(ini);
        if (!done) open++;
        rows.push([esc(ini), '10/29/2026', m ? esc(U.dur(m)) : '—', m ? PSY.time.unitsFor(m) : '—', done ? 'Processed' : (id === '4471' ? 'Draft saved 10/28' : 'Not started')]);
      });
      return { title: 'Daily notes still open', sub: 'Thu 10/29/2026 · TDT school day', cols, rows, foot: ['Open', '', '', '', open + ' of 4'], file: 'open-notes-2026-10-29.csv' };
    } },
    { k: 'caseload', name: 'Case Load by Group', desc: 'Consumers and units by Case Load Group', build() {
      const cols = [{ t: 'Group' }, { t: 'Consumers', num: 1 }, { t: 'With units', num: 1 }, { t: 'No authorization', num: 1 }, { t: 'Units available', num: 1 }];
      const g = {}; L.consumers.forEach((c) => { const x = (g[c.group] = g[c.group] || { n: 0, w: 0, o: 0, u: 0 }); x.n++; const u = L.units(c); if (u == null) x.o++; else { x.w++; x.u += u; } });
      const keys = Object.keys(g).sort(); const t = { n: 0, w: 0, o: 0, u: 0 };
      const rows = keys.map((k) => { ['n', 'w', 'o', 'u'].forEach((z) => { t[z] += g[k][z]; }); return [esc(k), g[k].n, g[k].w, g[k].o, g[k].u]; });
      return { title: 'Case Load by Group', sub: 'Active consumers on 10/29/2026', cols, rows, foot: ['Total', t.n, t.w, t.o, t.u], file: 'caseload-by-group.csv' };
    } },
    { k: 'status', name: 'Sessions by status', desc: 'Saved, waiting, rejected and approved', build() {
      const c = PSY.lauris.counts(); const cols = [{ t: 'Status' }, { t: 'Sessions', num: 1 }, { t: 'Where to find them' }];
      const rows = [['Saved, not processed', c.saved, 'Saved Session'], ['Waiting for approval', c.forms, 'Forms to Approve'], ['Rejected', c.rejected, 'Rejected Forms'], ['Approved this week', APPROVED.length + 18, 'Approvals']];
      return { title: 'Sessions by status', sub: 'Week of 10/26/2026', cols, rows, foot: null, file: 'sessions-by-status.csv' };
    } },
  ];
  function runReport(k, root) {
    const r = REPORTS.find((x) => x.k === k); if (!r) return; const d = r.build();
    const S = U.S(); S.reports[k] = 'Today ' + PSY.now(); PSY.save();
    const cell = root && root.querySelector('[data-last="' + k + '"]'); if (cell) cell.textContent = S.reports[k];
    PSY.ui.modal({
      title: d.title, sub: d.sub, wide: true, body: U.tableHtml(d.cols, d.rows, d.foot),
      actions: [{ label: 'Close' }, { label: 'Copy as CSV', primary: true, onClick: () => { U.copy(U.csv(d.cols, d.rows, d.foot)).then((ok) => PSY.ui.toast(ok ? 'Copied.' : 'Select the table and copy it.')); return false; } }],
    });
  }
  PSY.register({
    id: 'lauris-reports', app: 'lauris', label: 'Reports', url: 'reports', css: U.css,
    render() {
      const S = U.S();
      const rows = REPORTS.map((r) => '<tr class="hov"><td class="nw"><b>' + esc(r.name) + '</b></td><td>' + esc(r.desc) + '</td><td class="nw lmuted" data-last="' + r.k + '">' + esc(S.reports[r.k] || '—') + '</td><td class="nw"><button class="lb" data-act="l1a-run-report" data-k="' + r.k + '" style="padding:4px 14px;font-size:12px">Run</button></td></tr>');
      const main = '<h3 class="lh1">Reports</h3><div class="lcard" style="overflow-x:auto">' + tbl([['Report'], ['What it shows'], ['Last run'], ['']], rows, '') + '</div>';
      return PSY.lauris.page({ active: 'Reports', main, panel: { context: ctxLine('Reports'), notes: U.notes.reports() } });
    },
  });
  PSY.acts['l1a-run-report'] = (el, ctx) => runReport(el.getAttribute('data-k'), ctx.root);

  /* ================= User Information ================= */
  const group = () => { const g = {}; L.consumers.forEach((c) => { const x = (g[c.group] = g[c.group] || { n: 0, w: 0 }); x.n++; if (L.units(c) != null) x.w++; }); return g; };
  const PREFS = [['rej', 'Email me when a form is rejected'], ['weekly', 'Email me the units summary on Monday mornings'], ['remind', 'Remind me at 2:00 pm if today’s notes are still open']];
  PSY.register({
    id: 'lauris-user', app: 'lauris', label: 'User Information', url: 'user', css: U.css,
    render() {
      const S = U.S(); const fld = (l, v) => '<div><label>' + esc(l) + '</label><div class="in">' + esc(v) + '</div></div>';
      const g = group();
      const gr = Object.keys(g).sort().map((k) => '<tr class="hov"><td><a class="lk" data-act="l1a-user-group" data-g="' + esc(k) + '">' + esc(k) + '</a></td><td class="num">' + g[k].n + '</td><td class="num">' + g[k].w + '</td><td class="num">' + (g[k].n - g[k].w) + '</td></tr>');
      const main = '<h3 class="lh1">User Information</h3>' +
        '<div class="l1-card"><h4>Profile</h4><div class="l1-grid">' + fld('Name', 'Jordan Perez') + fld('Credential', 'LPC') + fld('Role', 'Assistant Clinical Support Supervisor') + fld('Organization', 'Harvest Outreach Center') +
        fld('License', 'LPC, Virginia · on file') + fld('NPI', 'On file (individual)') + fld('Supervisor', 'Maria, Program Director') + fld('User name', 'jperez') + '</div></div>' +
        '<div class="l1-card flush"><h4>Case Load</h4><div style="padding:10px 0 0">' + tbl([['Group'], ['Consumers', 'num'], ['With units', 'num'], ['No authorization', 'num']], gr, '') + '</div></div>' +
        '<div class="l1-card"><h4>Signature</h4><div class="l1-row" style="align-items:flex-end"><div><span class="l1-sig" data-psy="sig">' + esc(S.sig || 'Jordan Perez') + '</span><div class="lmuted" style="margin-top:6px">Electronic signature on file since 08/12/2025</div></div><button class="lb" data-act="l1a-user-sig" style="margin-left:auto">Update signature</button></div></div>' +
        '<div class="l1-card"><h4>Preferences</h4>' + PREFS.map((x) => '<div class="l1-tg"><input type="checkbox" id="l1p-' + x[0] + '" data-k="' + x[0] + '" data-change="l1a-user-pref"' + (S.prefs[x[0]] ? ' checked' : '') + '><label for="l1p-' + x[0] + '">' + esc(x[1]) + '</label></div>').join('') +
        '<div style="margin-top:10px"><button class="lb" data-act="l1a-user-pw">Change password</button></div></div>';
      return PSY.lauris.page({ active: 'User Information', main, panel: { context: ctxLine('User Information'), notes: U.notes.user() } });
    },
  });
  PSY.acts['l1a-user-group'] = (el) => {
    const S = U.S().cons; S.tab = 'active'; S.f = { name: '', rec: '', staff: '', group: el.getAttribute('data-g') }; S.af = Object.assign({}, S.f); PSY.save(); PSY.go('lauris-consumers');
  };
  PSY.acts['l1a-user-pref'] = (el) => { const S = U.S(); S.prefs[el.getAttribute('data-k')] = el.checked; PSY.save(); PSY.ui.toast('Saved.'); };
  PSY.acts['l1a-user-sig'] = (el, ctx) => {
    PSY.ui.modal({
      title: 'Update signature', sub: 'Jordan Perez, LPC',
      body: '<label>Type your name as you sign</label><input type="text" id="l1s-name" value="' + esc(U.S().sig || 'Jordan Perez') + '">',
      actions: [{ label: 'Cancel' }, { label: 'Save signature', primary: true, onClick: (m) => { const v = m.querySelector('#l1s-name').value.trim(); if (!v) return false; U.S().sig = v; PSY.save(); const s = ctx.root.querySelector('[data-psy="sig"]'); if (s) s.textContent = v; PSY.ui.toast('Saved.'); } }],
    });
  };
  PSY.acts['l1a-user-pw'] = () => {
    PSY.ui.modal({
      title: 'Change password', sub: 'jperez',
      body: '<label>Current password</label><input type="text" id="l1w-a" autocomplete="off"><label>New password</label><input type="text" id="l1w-b" autocomplete="off"><label>Repeat new password</label><input type="text" id="l1w-c" autocomplete="off">',
      actions: [{ label: 'Cancel' }, { label: 'Change password', primary: true, onClick: () => { PSY.ui.toast('Password changed.'); } }],
    });
  };

  /* Time Tracker (lauris-time): owner T9 registers it from 63-ext-time.js */

  /* ================= Rejected Forms ================= */
  PSY.register({
    id: 'lauris-rejected', app: 'lauris', label: 'Rejected Forms', url: 'forms/rejected', css: U.css,
    render() {
      const rows = ['<tr class="hov"><td class="nw"><b>Daily Progress Note – TDT</b><div class="lmuted">Session date 10/26/2026</div></td><td><a class="lk" data-go="lauris-consumer?c=4471">M.R.</a></td><td class="nw">J. Perez</td><td class="nw">Maria<div class="lmuted">10/27/2026 4:20 pm</div></td>' +
        '<td style="min-width:180px">“The narrative says <i>observed</i> and <i>monitored</i> and does not name an intervention. Say what staff did and which ISP objective it served, then process the note again.”</td><td class="nw"><button class="lb pri" data-go="lauris-dpn?c=4471" style="padding:4px 14px;font-size:12px">Fix</button></td></tr>'];
      const main = '<h3 class="lh1">Rejected Forms</h3><div class="lcard" style="overflow-x:auto">' + tbl([['Form'], ['Consumer'], ['Written by'], ['Rejected by'], ['Reason'], ['']], rows, 'No rejected forms.') + '</div>';
      return PSY.lauris.page({ active: 'Rejected Forms', main, panel: { context: ctxLine('Rejected Forms'), notes: U.notes.rejected(), student: 'M.R.', case: 'R-0411' } });
    },
  });

  /* ================= Consumers w/o Authorizations ================= */
  PSY.register({
    id: 'lauris-noauth', app: 'lauris', label: 'Consumers w/o Authorizations', url: 'consumers/no-authorization', css: U.css,
    render() {
      const list = L.consumers.filter((c) => L.units(c) == null);
      const rows = list.map((c) => {
        const r = U.req(c); const cv = U.caseOf(c);
        return '<tr class="hov"><td>' + c.id + '</td><td><a class="lk" data-go="lauris-consumer?c=' + c.id + '">' + esc(c.ini) + '</a></td><td>' + esc(c.group) + '</td><td class="nw">' + esc(c.staff) + '</td><td>' + (r ? U.chip(r.label, r.tone) : U.chip('None', 'n')) + '<div class="lmuted">' + esc((r && r.date) || '') + '</div></td><td class="nw"><button class="lb pri" data-go="lauris-dmas?case=' + (cv ? cv.id : '') + '" style="padding:4px 12px;font-size:12px">Start request</button></td></tr>';
      });
      const main = '<h3 class="lh1">Consumers w/o Authorizations</h3><div class="l1-sub">' + U.plural(list.length, 'consumer') + '</div>' +
        '<div class="lcard" style="overflow-x:auto">' + tbl([['Unique ID'], ['Name'], ['Group'], ['Staff'], ['Latest request'], ['']], rows, 'Every consumer has an authorization.') + '</div>';
      return PSY.lauris.page({ active: 'Consumers w/o Authorizations', main, panel: { context: ctxLine('No authorization'), notes: U.notes.noauth(), student: 'T.W.', case: 'R-0416' } });
    },
  });
})();
