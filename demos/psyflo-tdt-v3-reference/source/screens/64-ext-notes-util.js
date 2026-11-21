/* The top half of the extension's Today view (round 9: "Today" = this pane + the Track Time pane, shown together; see 01-core.js) for the
   Lauris pages in this area (consumers, consumer file, Add Session, saved sessions, approvals, reports, user information, time tracker,
   rejected forms, consumers without authorizations). Everything stays short:
   the Consumers page has a greeting and the day (the notes to write for the role's own caseload, PSY.caseload, and two calls),
   the consumer file that consumer's day and one next step, every other page one line or nothing. Time entries are not repeated here:
   the Track Time pane sits right under this one.
   Each builder returns HTML wrapped in <div data-psy="l1a-notes">; screens call PSY.l1a.notes.<name>() at render time and
   PSY.l1a.setNotes(el, PSY.l1a.notes.<name>()) to redraw it in place. Only that wrapper is replaced, never the whole pane.
   Direct support staff see no units-left, authorization or payer lines here.
   Round 10 wording: this pane is extension text, so it says "patient" / "patients" (Lauris's pages keep "consumer"). */
(function () {
  const PSY = window.PSY; const L = PSY.data.lauris; const U = PSY.l1a; const esc = PSY.esc;
  const N = (U.notes = {});

  /* ---------- building blocks (inline styles: the pane can sit on any Lauris screen) ---------- */
  const MUTED = 'color:#525B66';
  const cap = (t) => '<div class="cap" style="margin-bottom:4px">' + esc(t) + '</div>';
  const card = (cls, inner) => '<div class="xcard ' + (cls || '') + '">' + inner + '</div>';
  const line = (html) => '<div style="font-size:12.5px;line-height:1.45;' + MUTED + '">' + html + '</div>';
  const link = (label, attrs) => '<a ' + attrs + ' style="color:#15605E;font-weight:600;text-decoration:underline;cursor:pointer">' + label + '</a>';
  const btn = (label, attrs, cls) => '<button class="btn ' + (cls || 'p') + '" ' + attrs + ' style="width:100%">' + esc(label) + '</button>';
  const lines = (pairs) => '<div style="display:grid;grid-template-columns:86px minmax(0,1fr);gap:5px 10px;font-size:12.5px;line-height:1.4">' + pairs.map((x) => '<div style="font-weight:600">' + esc(x[0]) + '</div><div>' + x[1] + '</div>').join('') + '</div>';
  N.card = card; N.cap = cap;

  U.notesWrap = (html) => '<div data-psy="l1a-notes" style="display:' + (html ? 'flex' : 'none') + ';flex-direction:column;gap:10px;flex:0 0 auto">' + (html || '') + '</div>';
  const wrap = U.notesWrap;
  /* redraw a notes builder's output in place (el = anything inside the Notes pane) */
  U.setNotes = (el, html) => {
    const pane = el && el.closest ? el.closest('[data-pane="notes"]') : null; if (!pane) return;
    const w = pane.querySelector('[data-psy="l1a-notes"]'); if (w) w.outerHTML = html;
  };

  /* ---------- Consumers: the day ---------- */
  const NEED = [['M.R.', '4471'], ['D.W.', '4458'], ['T.N.', '4441'], ['S.B.', '4430']];
  const ROW = 'display:flex;align-items:center;gap:8px;min-height:30px;border-top:1px solid #EFEBE4';
  const CK = 'flex:0 0 18px;width:18px;height:18px;border-radius:50%;border:1.5px solid #B8B2A7;background:#fff;color:#fff;font-size:11px;line-height:1;padding:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center';
  const LBL = 'flex:1;min-width:0;text-align:left;background:none;border:0;font:inherit;font-size:13px;color:#151B24;cursor:pointer;padding:4px 0;line-height:1.25';
  function todoRow(key, label, chip, main, forceDone, title) {
    const S = U.S(); const done = forceDone || !!S.todo[key];
    return '<div style="' + ROW + '"><button style="' + CK + (done ? ';background:#217A78;border-color:#217A78' : '') + '" data-act="l1a-todo-toggle" data-key="' + key + '" aria-label="' + (done ? 'Mark not done' : 'Mark done') + '" title="' + (done ? 'Mark not done' : 'Mark done') + '">' + (done ? '✓' : '') + '</button>' +
      '<button style="' + LBL + (done ? ';text-decoration:line-through;color:#8A857B' : '') + '" ' + main + (title ? ' title="' + esc(title) + '"' : '') + '>' + esc(label) + '</button>' +
      '<span class="chip ' + (done ? 'g' : chip[1]) + '">' + esc(done ? 'done' : chip[0]) + '</span></div>';
  }
  /* round 8: direct support staff see no authorization, payer or units-left data in the extension (their Lauris may not show it either) */
  const dss = () => PSY.role() === 'dss';
  function alertRow(c, text, go) {
    const told = U.S().told[c.ini]; const admin = PSY.role() === 'admin';
    return '<div style="' + ROW + '"><span aria-hidden="true" style="flex:0 0 18px;text-align:center;color:#C2410C;font-weight:700;font-size:14px">!</span><button style="' + LBL + '" data-go="' + go + '">' + esc(text) + '</button>' +
      (admin ? '' : told ? '<span class="chip g">Maria told · ' + esc(told) + '</span>' : '<button class="chip r" data-act="l1a-tell" data-ini="' + esc(c.ini) + '" style="border:0;cursor:pointer;font-family:inherit">tell supervisor</button>') + '</div>';
  }
  const mine = (id) => PSY.inCaseload(id);
  N.consumers = () => {
    const need = NEED.filter((x) => mine(x[1]) && !(x[1] === '4471' && PSY.flag('units-used.4471') > 0));
    const mr = L.byId('4471'), sb = L.byId('4430');
    const first = String(PSY.user().name || '').split(/[ ,]/)[0];
    const hello = '<div style="display:flex;align-items:baseline;gap:10px"><b style="font-size:16px;font-weight:600">Good morning, ' + esc(first) + '.</b><span style="font-size:12.5px;margin-left:auto;' + MUTED + '">Thursday Oct 29</span></div>';
    const n = need.length;
    const notes = n
      ? todoRow('notes', n === 1 ? 'Write the note for ' + need[0][0] : 'Write notes for ' + n + ' patients', [n + ' left', 'y'], 'data-go="lauris-dpn?c=' + need[0][1] + '"', false, need.map((x) => x[0]).join(', '))
      : todoRow('notes', 'Today’s notes are written', ['done', 'g'], 'data-go="lauris-saved"', true);
    const today = '<div>' + cap('Today') +
      '<div style="margin-top:-1px">' + notes +
      (mine('4471') ? todoRow('weekly', 'Call M.R.’s grandmother', ['by Fri', 'n'], 'data-act="l1a-todo-open" data-key="weekly"') : '') +
      (mine('4441') ? todoRow('monthly', 'Check in with T.N.’s counselor', ['Nov 1', 'n'], 'data-act="l1a-todo-open" data-key="monthly"') : '') +
      (dss() || !PSY.can('auth') ? '' : (mine('4471') ? alertRow(mr, 'M.R. is down to ' + L.units(mr) + ' units', 'lauris-consumer?c=4471&amp;tab=auth') : '') +
      (mine('4430') ? alertRow(sb, 'S.B. has ' + L.units(sb) + ' units', 'lauris-consumer?c=4430&amp;tab=auth') : '')) + '</div></div>';
    return wrap(hello + today);
  };

  PSY.acts['l1a-todo-toggle'] = (el) => {
    const S = U.S(); const k = el.getAttribute('data-key'); S.todo[k] = !S.todo[k]; PSY.save();
    U.setNotes(el, N.consumers());
  };
  PSY.acts['l1a-tell'] = (el) => {
    const S = U.S(); const ini = el.getAttribute('data-ini'); const c = L.byIni(ini); if (!c) return;
    S.told[ini] = PSY.now(); PSY.save();
    PSY.log(c.case, 'Jordan told Maria (program director): ' + ini + ' has ' + L.units(c) + ' units left, authorization ends ' + c.ends + '.');
    U.setNotes(el, N.consumers());
    PSY.ui.toast('Maria was told.');
  };
  const TODOS = {
    weekly: { title: 'Call M.R.’s grandmother', sub: 'Weekly call · due by Fri Oct 30 · last call Thu Oct 22, 12 min', lines: ['Last call: she practiced the calm-down corner at home and asked about keeping M.R. in the same classroom.'], file: '4471' },
    monthly: { title: 'Check in with T.N.’s counselor', sub: 'Monthly check-in · due Sun Nov 1 · last contact Thu Oct 1', lines: [], authLines: ['T.N. has 9 units left. Peer-to-peer Dec 9.'], file: '4441' },
  };
  PSY.acts['l1a-todo-open'] = (el, ctx) => {
    const k = el.getAttribute('data-key'); const t = TODOS[k]; if (!t) return; const S = U.S();
    const anchor = el; const lines = t.lines.concat(dss() ? [] : t.authLines || []);
    PSY.ui.modal({
      title: t.title, sub: t.sub, body: lines.map((x) => '<p style="margin:0 0 8px">' + esc(x) + '</p>').join(''),
      actions: [{ label: 'Close' }, { label: 'Open ' + (L.byId(t.file) || {}).ini + '’s file', onClick: () => { PSY.go('lauris-consumer?c=' + t.file); } },
        { label: S.todo[k] ? 'Mark not done' : 'Mark done', primary: true, onClick: () => { S.todo[k] = !S.todo[k]; PSY.save(); if (anchor.isConnected) U.setNotes(anchor, N.consumers()); PSY.ui.toast(S.todo[k] ? 'Marked done.' : 'Marked not done.'); } }],
    });
  };
  PSY.acts['l1a-open-time'] = (el, ctx) => U.openTime(ctx.root, el.getAttribute('data-ini'));

  /* ---------- the consumer file: one compact card, one next step ---------- */
  N.consumer = (c, tab) => {
    const a = U.auth(c); const r = U.req(c); const h = U.hub(c); const u = L.units(c);
    const next = dss() ? (c.discharged ? U.nextStep(c) : { label: 'Open Daily Progress Note', go: 'lauris-dpn?c=' + c.id }) : U.nextStep(c);
    const pairs = [];
    if (!dss()) {
      pairs.push(['Units', a ? '<b>' + u + '</b> left of ' + a.awarded + ' · about ' + Math.max(1, Math.round(u / 3)) + ' school days' : (c.discharged ? 'None, record closed' : 'None')]);
      pairs.push(['Authorization', a ? esc(a.no) + ' · ' + esc(a.from) + ' to ' + esc(a.to) : (r ? esc(r.type) + ' request · ' + esc(r.label.toLowerCase()) : (c.discharged ? 'Closed ' + esc(c.when) : 'None on file'))]);
    }
    if (!c.discharged) pairs.unshift(['Daily note', esc(U.dpnState(c))]);
    pairs.push(['School', esc(c.school || 'On file')]);
    if (tab === 'docs') { const d = h && h.documents; const miss = U.DOCS(c).filter((x) => x.missing); pairs.push(['Documents', (d ? d.have + ' of ' + d.total + ' on file' : U.DOCS(c).length + ' on file') + (miss.length ? ' · missing ' + esc(miss.map((x) => x.name.toLowerCase()).join(', ')) : '')]); }
    else if (tab === 'meds') pairs.push(['Medications', esc((h && h.picture && h.picture.meds) || 'None on file')]);
    else if (tab === 'allergies') { const al = U.ALLG[c.id] || []; pairs.push(['Allergies', al.length ? esc(al.map((x) => x[0]).join(', ')) : 'None on file']); }
    return wrap(card('w', cap(c.ini + ' · today') + lines(pairs)) + btn(next.label, 'data-go="' + next.go + '"'));
  };

  /* ---------- Add Session ---------- */
  const TYPES = { dpn: 'Daily Progress Note – TDT', screening: 'Admission Screening', cna: 'Intake · Comprehensive Needs Assessment', isp: 'Individual Service Plan' };
  U.SESSION = { types: TYPES, routes: { dpn: 'lauris-dpn', screening: 'lauris-screening', cna: 'lauris-cna', isp: 'lauris-isp' } };
  U.sessionDefault = (c) => {
    if (!c) return 'dpn';
    if (c.id === '4492') { const r = PSY.flowRank(); return r === 0 ? 'screening' : r === 1 ? 'cna' : r === 2 ? 'isp' : 'dpn'; }
    return 'dpn';
  };
  N.addSession = () => wrap('');

  /* ---------- the other pages: one line, or nothing ---------- */
  N.saved = () => wrap('');
  N.approvals = () => (dss() || !PSY.can('clinicalRecords') ? wrap('') : wrap(line(link(U.plural(PSY.lauris.counts().forms, 'form') + ' to approve', 'data-go="lauris-forms"'))));
  N.reports = () => {
    if (dss()) return wrap('');
    const ending = L.consumers.filter((c) => c.ends && U.daysTo(c.ends) <= 30 && U.daysTo(c.ends) >= 0).sort((a, b) => U.pd(a.ends) - U.pd(b.ends));
    return wrap(line(U.plural(ending.length, 'authorization') + ' end within 30 days: ' + ending.map((c) => esc(c.ini) + ' ' + esc(c.ends.slice(0, 5))).join(', ') + '. ' + link('Run report', 'data-act="l1a-run-report" data-k="ending"')));
  };
  N.user = () => wrap('');
  N.time = () => wrap('');
  N.rejected = () => (mine('4471') ? wrap(line('Maria sent M.R.’s note back · ' + link('Fix the note', 'data-go="lauris-dpn?c=4471"'))) : wrap(''));
  N.noauth = () => {
    if (dss()) return wrap('');
    const tw = L.consumers.find((c) => c.id === '4492' && L.units(c) == null);
    const nx = tw && U.nextStep(tw);
    return wrap(nx ? line('T.W. · ' + link(esc(nx.label), 'data-go="' + nx.go + '"')) : '');
  };
})();
