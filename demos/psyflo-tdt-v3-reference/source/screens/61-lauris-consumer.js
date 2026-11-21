/* lauris-consumer?c=ID&tab=general|auth|docs|file|meds|allergies: the consumer file.
   Guardrails: direct support staff see "No access" on payer, authorization and clinical-assessment items (and cannot open a consumer
   not assigned to them: 60-l1a-util.js); a role without clinical record content (the admin by default) sees "Restricted · clinical access"
   on the clinical documents: the session forms, the signed clinical documents and school plans, diagnosis, medications and allergies. */
(function () {
  const PSY = window.PSY; const L = PSY.data.lauris; const U = PSY.l1a; const esc = PSY.esc;
  const TABS = [['general', 'General Information'], ['auth', 'Authorization Information'], ['docs', 'Documents'], ['file', 'Active File'], ['meds', 'Medications'], ['allergies', 'Allergies']];
  const SLUG = { general: 'general', auth: 'authorizations', docs: 'documents', file: 'file', meds: 'medications', allergies: 'allergies' };
  const tabOf = (p) => (TABS.some((t) => t[0] === (p || {}).tab) ? p.tab : 'file');
  const consumerOf = (p) => U.find((p || {}).c) || L.consumers[0];
  const fld = (l, v, wide) => '<div' + (wide ? ' style="grid-column:1/-1"' : '') + '><label>' + esc(l) + '</label><div class="in">' + (v == null || v === '' ? '—' : esc(v)) + '</div></div>';
  const tbl = (head, rows, empty) => '<table class="lt"><thead><tr>' + head.map((h) => '<th' + (h[1] ? ' class="' + h[1] + '"' : '') + '>' + esc(h[0]) + '</th>').join('') + '</tr></thead><tbody>' +
    (rows.length ? rows.join('') : '<tr><td colspan="' + head.length + '"><div class="l1-empty">' + empty + '</div></td></tr>') + '</tbody></table>';

  /* ---------- tab panes ---------- */
  /* direct support staff: Lauris shows "No access" for payer and authorization fields, the screening, intake and plan */
  const noAcc = (l) => '<div><label>' + esc(l) + '</label><div class="in">' + U.NOACC + '</div></div>';
  const restr = (l, wide) => '<div' + (wide ? ' style="grid-column:1/-1"' : '') + '><label>' + esc(l) + '</label><div class="in">' + U.RESTR + '</div></div>';
  function general(c) {
    const cv = U.caseOf(c); const p = U.payerOf(c); const a = U.auth(c); const dss = U.dss();
    const grid = [
      fld('Unique ID', c.id), fld('Name', c.ini), fld('Age', c.age), fld('Date of birth', 'On file'),
      fld('School and site', c.school), fld('Locality', U.locality(c)), fld('Case Load Group', c.group), fld('Assigned staff', c.staff),
      fld('Service', U.svcOf(c)), dss ? noAcc('Medicaid plan') : fld('Medicaid plan', p ? p.name : 'Not on file'), dss ? noAcc('Authorization #') : fld('Authorization #', a ? a.no : 'None on file'), U.clin() || dss ? fld('Primary diagnosis', U.dx(c), true) : restr('Primary diagnosis', true),
      fld('Intake date', U.intake(c)), fld('Treatment plan (ISP)', U.planDate(c)), fld('Guardian', 'On file'), fld('Contact', 'Phone on file'),
    ].join('');
    const note = c.note && !dss ? '<div class="l1-note b">' + esc(c.note) + '</div>' : '';
    const closed = c.discharged ? '<div class="l1-note b">Discharged ' + esc(c.when) + ' · ' + esc(c.why) + '</div>' : '';
    return closed + note + '<div class="l1-card"><h4>General Information</h4><div class="l1-grid">' + grid + '</div></div>';
  }

  function authPane(c) {
    if (U.dss()) return '<div class="l1-card"><h4>Authorizations and requests</h4>' + U.NOACC + '</div>';
    const a = U.auth(c); const r = U.req(c); const pr = U.prior(c); const cv = U.caseOf(c); const none = L.units(c) == null;
    let tiles = '';
    if (a) {
      const days = U.schoolDaysLeft(a.to);
      tiles = '<div class="l1-card"><div class="l1-tiles">' +
        '<div class="l1-tile"><div class="k">Awarded</div><div class="v">' + a.awarded + '</div></div>' +
        '<div class="l1-tile"><div class="k">Used</div><div class="v">' + a.used + '</div></div>' +
        '<div class="l1-tile"><div class="k">Available</div><div class="v" style="color:#1F6FBF">' + a.avail + '</div></div>' +
        '<div class="l1-tile"><div class="k">Ends</div><div class="v">' + esc(a.to) + ' <small>' + days + ' school days</small></div></div></div></div>';
    }
    const rows = [];
    if (a) rows.push('<tr class="hov"><td><b>' + esc(a.no) + '</b><div class="lmuted">Authorization · ' + esc(a.svc) + '</div></td><td>' + esc(a.payer ? a.payer.short : '') + '</td><td class="nw">' + esc(a.from) + ' –<br>' + esc(a.to) + '</td><td>' + a.avail + ' of ' + a.awarded + ' available</td><td>' + U.chip('Active', 'g') + '</td><td class="nw"><a class="lk" data-go="lauris-dmas?case=' + c.case + '">Open</a></td></tr>');
    if (r) rows.push('<tr class="hov"><td><b>' + esc(cv.id) + '</b><div class="lmuted">' + esc(r.type) + ' request</div></td><td>' + esc(r.payer ? r.payer.short : '') + '</td><td class="nw">' + esc(r.date || '—') + '</td><td>' + esc(r.asked || '—') + '</td><td>' + U.chip(r.label, r.tone) + '</td><td class="nw"><a class="lk" data-go="lauris-dmas?case=' + c.case + '">Open</a></td></tr>');
    if (pr) rows.push('<tr class="hov"><td><b>' + esc(pr.no) + '</b><div class="lmuted">SRA · ' + esc(pr.note) + '</div></td><td>' + esc(PSY.data.payers[pr.payer].short) + '</td><td class="nw">' + esc(pr.from) + ' –<br>' + esc(pr.to) + '</td><td>0 of ' + pr.awarded + ' available</td><td>' + U.chip('Closed', 'n') + '</td><td></td></tr>');
    let foot = '';
    if (none && !c.discharged && cv) foot = '<div class="l1-note" style="margin:12px 0 0;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span style="flex:1 1 220px">No authorization available</span><button class="lb pri" data-go="lauris-dmas?case=' + c.case + '">Start a request</button></div>';
    else if (cv && cv.stage === 'active' && a && a.avail <= 20) foot = '<div class="l1-note" style="margin:12px 0 0;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span style="flex:1 1 220px">No request in progress · ends ' + esc(a.to) + '</span><button class="lb pri" data-go="lauris-dmas?case=' + c.case + '">Start the next request</button></div>';
    else if (!r && a) foot = '<div class="lmuted" style="margin-top:10px">No request in progress</div>';
    return tiles + '<div class="l1-card flush"><h4>Authorizations and requests</h4><div style="padding:10px 0 0">' +
      tbl([['Authorization / request'], ['Payer'], ['Dates'], ['Units'], ['Status'], ['']], rows, c.discharged ? 'No authorization open' : 'No authorizations or requests on file') + '</div></div>' + foot;
  }

  function filePane(c) {
    const r = c.id === '4492' ? PSY.flowRank() : 9; const used = !!PSY.flag('units-used.' + c.id);
    /* Open (or Start). Scribe is the extension's button (its chooser takes the form and the consumer from this page).
       Direct support staff: the screening, intake and plan show "No access" (lock = true). */
    const open = (to, label, lock) => (lock && U.dss() ? U.NOACC : !U.clin() && !U.dss() ? U.RESTR : '<a class="lk" data-go="' + to + '">' + label + '</a>');
    const row = (name, sub, chip, when, link) => '<tr class="hov"><td><b>' + esc(name) + '</b>' + (sub ? '<div class="lmuted">' + esc(sub) + '</div>' : '') + '</td><td>' + chip + '</td><td class="nw">' + esc(when) + '</td><td class="nw">' + link + '</td></tr>';
    const rows = [];
    const view = (k) => '<a class="lk" data-act="l1a-view-closed" data-k="' + k + '">View</a>';
    if (c.discharged) {
      ['Admission Screening', 'Intake (CNA)', 'Individual Service Plan', 'Daily Progress Note'].forEach((n, i) => rows.push(row(n, '', U.chip('Closed ' + c.when, 'n'), c.when, U.clin() ? view(['screen', 'cna', 'isp', 'dpn'][i]) : U.RESTR)));
    } else {
      const inTake = U.intake(c);
      rows.push(row('Admission Screening', 'TDT, school-based', r >= 1 ? U.chip('Processed', 'g') : U.chip('Not started', 'n'), r >= 1 ? (c.id === '4492' ? '10/29/2026' : inTake) : '—', open('lauris-screening?c=' + c.id, r >= 1 ? 'Open' : 'Start', true)));
      rows.push(row('Intake (CNA)', 'Comprehensive Needs Assessment', r >= 2 ? U.chip('Processed', 'g') : U.chip('Not started', 'n'), r >= 2 ? (c.id === '4492' ? '10/29/2026' : inTake) : '—', open('lauris-cna?c=' + c.id, r >= 2 ? 'Open' : 'Start', true)));
      rows.push(row('Individual Service Plan', 'ISP 2.0', r >= 3 ? U.chip('Processed', 'g') : U.chip('Not started', 'n'), r >= 3 ? (c.id === '4492' ? '10/29/2026' : U.planDate(c)) : '—', open('lauris-isp?c=' + c.id, r >= 3 ? 'Open' : 'Start', true)));
      const u = L.units(c);
      const ds = U.dpnState(c); const dpnChip = U.chip(ds, { 'Not started': 'n', 'Processed today': 'g', 'Draft saved': 'y', 'Due today': 'y' }[ds] || 'g');
      const dpnWhen = c.id === '4492' ? '—' : c.id === '4471' ? (used ? '10/29/2026' : '10/28/2026') : ds === 'Due today' ? '10/28/2026' : c.updated;
      rows.push(row('Daily Progress Note', 'TDT, one a school day', dpnChip, dpnWhen, open('lauris-dpn?c=' + c.id, c.id === '4492' ? 'Start' : 'Open')));
    }
    return '<div class="l1-card flush"><h4>Session forms</h4><div style="padding:10px 0 0">' + tbl([['Form'], ['Status'], ['Last updated'], ['']], rows, '') + '</div></div>';
  }

  const CLIN_DOCS = ['screen', 'cna', 'isp', 'iep'];
  function docRow(c, d) {
    const S = U.S(); const asked = S.docReq[c.id + '.' + d.k];
    const status = d.missing ? (asked ? U.chip('Requested ' + asked, 'y') : U.chip('Not received', 'r')) : U.chip('On file', 'g');
    const act = U.dss() && ['screen', 'cna', 'isp', 'elig'].indexOf(d.k) >= 0 ? U.NOACC : !U.dss() && !U.clin() && CLIN_DOCS.indexOf(d.k) >= 0 && !d.missing ? U.RESTR
      : d.missing ? '<a class="lk warn" data-act="l1a-doc-req" data-k="' + esc(d.k) + '">' + (asked ? 'Ask again' : 'Request') + '</a>' : '<a class="lk" data-act="l1a-doc-view" data-k="' + esc(d.k) + '">View</a>';
    return '<tr class="hov"><td><b>' + esc(d.name) + '</b><div class="lmuted">' + (d.missing ? esc(d.missing) : esc(d.file)) + '</div></td><td>' + esc(d.type) + '</td><td class="nw">' + esc(d.when || '—') + '</td><td>' + esc(d.by) + '</td><td>' + status + '</td><td class="nw">' + act + '</td></tr>';
  }
  const allDocs = (c) => U.DOCS(c).concat(U.S().docs[c.id] || []);
  function docsTable(c) { return tbl([['Document'], ['Type'], ['Received'], ['From'], ['Status'], ['']], allDocs(c).map((d) => docRow(c, d)), 'No documents on file.'); }
  function docsPane(c) {
    return '<div class="l1-card flush"><div class="l1-row" style="padding:12px 16px 0"><h4 style="padding:0;margin:0;flex:1">Documents</h4>' + (c.discharged ? '' : '<button class="lb" data-act="l1a-doc-add" style="padding:4px 10px;font-size:12px">Add document</button>') + '</div><div style="padding:10px 0 0" data-psy="docs">' + docsTable(c) + '</div></div>';
  }

  function medsPane(c) {
    if (!U.clin() && !U.dss()) return '<div class="l1-card"><h4>Medications</h4>' + U.RESTR + '</div>';
    const h = U.hub(c); const text = h && h.picture && h.picture.meds; const list = U.MEDS[c.id] || [];
    const rows = list.map((m) => '<tr class="hov"><td><b>' + esc(m[0]) + '</b></td><td>' + esc(m[1]) + '</td><td>' + esc(m[2]) + '</td><td>' + esc(m[3]) + '</td><td>' + esc(m[4]) + '</td></tr>');
    return '<div class="l1-card flush"><h4>Medications</h4><div class="l1-sub" style="padding:4px 16px 0">Last reviewed 10/01/2026</div><div>' +
      tbl([['Medication'], ['Dose and schedule'], ['Notes'], ['Prescriber'], ['Started']], rows, 'No active medications reported.') + '</div></div>' +
      (text && !list.length ? '<div class="lmuted">' + esc(text) + '</div>' : '');
  }
  function allergiesPane(c) {
    if (!U.clin() && !U.dss()) return '<div class="l1-card"><h4>Allergies</h4>' + U.RESTR + '</div>';
    const list = U.ALLG[c.id] || [];
    const rows = list.map((m) => '<tr class="hov"><td><b>' + esc(m[0]) + '</b></td><td>' + esc(m[1]) + '</td><td>' + esc(m[2]) + '</td><td>' + esc(m[3]) + '</td></tr>');
    return '<div class="l1-card flush"><h4>Allergies</h4><div style="padding:10px 0 0">' + tbl([['Allergen'], ['Type'], ['Reaction'], ['What staff do']], rows, 'No known allergies on file.') + '</div></div>';
  }

  /* ---------- the screen ---------- */
  PSY.register({
    id: 'lauris-consumer', app: 'lauris', label: 'Consumer', css: U.css,
    url: (p) => 'consumers/' + ((p && p.c) || '') + '/' + SLUG[tabOf(p)],
    tabTitle: (p) => 'Lauris Online — Consumer · ' + consumerOf(p).ini,
    render(p) {
      const c = consumerOf(p); const tab = tabOf(p);
      const strip = '<div class="ltabs" data-psy="ctabs">' + TABS.map((t) => '<a class="ltab' + (t[0] === tab ? ' on' : '') + '" data-act="l1a-ctab" data-tab="' + t[0] + '">' + t[1] + '</a>').join('') + '</div>';
      const pane = (k, html) => '<section data-pane-c="' + k + '"' + (k === tab ? '' : ' hidden') + '>' + html + '</section>';
      const main = U.head(c, { addBtn: true }) + strip + pane('general', general(c)) + pane('auth', authPane(c)) + pane('docs', docsPane(c)) + pane('file', filePane(c)) + pane('meds', medsPane(c)) + pane('allergies', allergiesPane(c));
      return PSY.lauris.page({
        active: 'Consumers', main,
        panel: { context: 'Consumer file', notes: U.notes.consumer(c, tab), student: c.ini, case: c.case || undefined },
      });
    },
  });

  /* ---------- acts ---------- */
  PSY.acts['l1a-ctab'] = (el, ctx) => {
    const tab = el.getAttribute('data-tab'); const root = ctx.root; const c = consumerOf(ctx.params);
    ctx.params.tab = tab; // the route keeps the tab, so a re-render (e.g. coming back from the Psyflo tab) lands on it
    root.querySelectorAll('[data-pane-c]').forEach((s) => { s.hidden = s.getAttribute('data-pane-c') !== tab; });
    root.querySelectorAll('[data-psy="ctabs"] .ltab').forEach((t) => t.classList.toggle('on', t.getAttribute('data-tab') === tab));
    const notes = root.querySelector('[data-pane="notes"]');
    if (notes && !notes.querySelector('[data-psy="seeit"]')) U.setNotes(notes, U.notes.consumer(c, tab));
    U.syncUrl('lauris-consumer');
  };
  PSY.acts['l1a-doc-view'] = (el, ctx) => {
    const c = consumerOf(ctx.params); const d = allDocs(c).find((x) => x.k === el.getAttribute('data-k')); if (!d) return;
    PSY.ui.modal({
      title: d.name, sub: d.file + ' · ' + d.type + ' · received ' + d.when + ' from ' + d.by, wide: false,
      body: '<div style="border:1px solid #D8CEC0;border-radius:6px;padding:18px 20px;background:#FFFEFB;font:13px/1.6 Arial,Helvetica,sans-serif;color:#222"><div style="font-size:10px;letter-spacing:.08em;color:#777">HARVEST OUTREACH CENTER · ' + esc(c.ini) + ' · UNIQUE ID ' + esc(c.id) + '</div><div style="font-weight:700;font-size:15px;margin:6px 0 10px;color:#1F3B6B">' + esc(d.name) + '</div>' + (d.body || ['Scanned document, 1 page.']).map((t) => '<p style="margin:0 0 8px">' + esc(t) + '</p>').join('') + '<div style="margin-top:12px;padding-top:8px;border-top:1px solid #E7E1D6;font-size:11px;color:#777">Page 1 of 1 · filed in Lauris ' + esc(d.when) + '</div></div>',
      actions: [{ label: 'Close' }],
    });
  };
  PSY.acts['l1a-doc-req'] = (el, ctx) => {
    const c = consumerOf(ctx.params); const k = el.getAttribute('data-k'); const d = allDocs(c).find((x) => x.k === k); if (!d) return;
    const S = U.S(); S.docReq[c.id + '.' + k] = PSY.now(); PSY.save();
    const who = /minutes|IEP/.test(d.name) ? 'the school counselor' : 'the guardian';
    ctx.root.querySelector('[data-psy="docs"]').innerHTML = docsTable(c);
    PSY.ui.toast('Request sent to ' + who + '.');
  };
  const nameOf = (f) => { const t = f.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/\b\d{4} \d{2} \d{2}\b/g, '').replace(/\s+/g, ' ').trim() || 'Scanned document'; return t.charAt(0).toUpperCase() + t.slice(1); };
  PSY.acts['l1a-doc-add'] = (el, ctx) => {
    const c = consumerOf(ctx.params);
    PSY.ui.modal({
      title: 'Add document', sub: c.ini + ' · Unique ID ' + c.id,
      body: '<label>Document type</label><select id="l1d-type"><option>Consent</option><option>School record</option><option>Medical record</option><option>Correspondence</option><option>Signed form</option></select><label>File name</label><input type="text" id="l1d-file" value="scan_2026-10-29_' + esc(c.id) + '.pdf">',
      actions: [{ label: 'Cancel' }, {
        label: 'Add to file', primary: true, onClick: (m) => {
          const type = m.querySelector('#l1d-type').value; let file = m.querySelector('#l1d-file').value.trim() || 'scan_2026-10-29.pdf';
          const S = U.S(); (S.docs[c.id] = S.docs[c.id] || []).push({ k: 'x' + Date.now(), name: nameOf(file), file, type, when: '10/29/2026', by: 'J. Perez, LPC', body: ['Scanned document added by J. Perez on 10/29/2026.', 'Filed under ' + type.toLowerCase() + '.'] });
          PSY.save();
          const box = ctx.root.querySelector('[data-psy="docs"]'); if (box) box.innerHTML = docsTable(c);
          PSY.ui.toast('Added ' + file + '.');
        },
      }],
    });
  };
  PSY.acts['l1a-view-closed'] = (el, ctx) => {
    const c = consumerOf(ctx.params); const nm = { screen: 'Admission Screening', cna: 'Intake (CNA)', isp: 'Individual Service Plan', dpn: 'Daily Progress Note' }[el.getAttribute('data-k')] || 'Form';
    PSY.ui.modal({ title: nm, sub: c.ini + ' · closed record', body: '<p>Closed ' + esc(c.when) + ' · ' + esc(c.why) + '</p>', actions: [{ label: 'Close' }] });
  };
})();
