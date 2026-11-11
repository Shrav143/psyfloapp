/* Round 13 (owner EXT13): the extension's Overview — a patient roster for the person using Psyflo, in place of the old Case status view.
   The panel's top row is three compact buttons:  [ Overview ] [ Scribe ] [ Scan & Enhance ]  (each only when the role has it; the
   Overview button is PSY.ext.ovBtn(), placed by PSY.scribe.quickInner). Overview shows "My patients" (DSS: assigned patients; LCS: their
   caseload + referrals not yet in Lauris; admin: everyone, process only, no clinical content) as the list view 'overview'; the other list
   view is 'today' (the day's notes + Track Time). Tapping Overview while a Scribe / Scan & Enhance / time entry is open puts the roster in
   front (nothing is closed: × on the roster brings that work back).
   Rows: initials · Lauris # · a stage chip (where the patient is) · the one next step · "Action required" when something is due today.
   Top: "Today · N need action" and a filter Action required | All. Tap a row → it expands in place: a mini stepper
     Referral → Admission Screening → CNA → ISP → Initial SRA → Sessions → Concurrent SRA,
   the documentation actions (Comprehensive Needs Assessment, Daily Progress Note, Collateral Contact, Monthly Review Note, Admission
   Screening, initial / concurrent SRA), each saying what needs doing, with one-tap buttons: Open in Lauris (that document), Scribe and
   Scan & Enhance (preset to that patient and document), Denial Intelligence ↗ for a payer decision.
   Live, not static: the roster is computed from PSY.state on every request through the demo backend (PSY.api, 07-api.js):
     GET  /roster?filter=all|action           the role's roster (rows, counts)
     GET  /roster/:laurisId                   one patient: stepper + actions
     POST /roster/:laurisId/actions/:key/start { tool: 'lauris' | 'scribe' | 'enhance' | 'di' } → where the tool opens (validated per role)
   Sources: stages from PSY.auth (status, units, decision) and PSY.flowRank (T.W.), actions from the documents in Lauris (today's DPN
   fields, Collateral / Monthly sessions, the Admission Screening / CNA / ISP state) and PSY.alerts (SRA drafts, signatures, low units,
   payer requests). Push today's DPN with Scribe → that action clears; submit an SRA → its stage moves on.
   Wording: the extension says "patient"; SRA, initial SRA, concurrent SRA. Due dates come from the record (payer message, call log,
   notice) or from the demo's own day (today's notes); none is invented.
   PSY.ext.overview = { model: { rows(), row(id), detail(id), count() }, html(o), paint(), open(), close(), STEPS }
   Scenario hook: PSY.presenter.prep.s12 (the roster open for J. Perez on Lauris Consumers). */
(function () {
  'use strict';
  const PSY = window.PSY; if (!PSY || !PSY.ext) return;
  const esc = PSY.esc; const X = PSY.ext;
  const A = () => PSY.auth; const L = () => PSY.data.lauris;
  const TODAY_US = '10/29/2026'; const DAY = 'Thu Oct 29';
  const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const flag = (k) => PSY.flag(k);

  /* ================= the model (pure: reads PSY.state, writes nothing) ================= */
  const STEPS = ['Referral', 'Admission Screening', 'CNA', 'ISP', 'Initial SRA', 'Sessions', 'Concurrent SRA'];
  const S_REF = 0, S_ADM = 1, S_CNA = 2, S_ISP = 3, S_SRA = 4, S_SES = 5, S_CSRA = 6;
  /* the demo day's TDT sessions (the Today list's "notes to write": M.R., D.W., T.N., S.B.) */
  const SESSION_TODAY = ['4471', '4458', '4441', '4430'];
  /* collateral contacts the Today list already plans (family details generic) */
  const COLLATERAL = { '4471': { what: 'Weekly call with the guardian', when: 'by Fri', date: 'Fri Oct 30' }, '4441': { what: 'Monthly check-in with the school counselor', when: 'Nov 1', date: 'Nov 1' } };
  const DOC = { adm: 'Admission Screening', cna: 'Comprehensive Needs Assessment', isp: 'ISP', dpn: 'Daily Progress Note', collateral: 'Collateral Contact', monthly: 'Monthly Review Note', elig: 'Coverage change' };
  const SCRIBE = { adm: 'admission', cna: 'intake', dpn: 'dpn', collateral: 'collateral', monthly: 'monthly' };
  const ENH = { adm: 'adm', cna: 'cna', dpn: 'dpn', collateral: 'collateral', monthly: 'monthly' };
  const ROUTE = { adm: 'lauris-screening', cna: 'lauris-cna', isp: 'lauris-isp', dpn: 'lauris-dpn', collateral: 'lauris-collateral', monthly: 'lauris-monthly' };
  /* the order "the one next step" is picked in */
  const PRI = { sra: 1, adm: 2, cna: 2, isp: 2, elig: 3, dpn: 4, collateral: 5, monthly: 6 };

  const canAuth = () => PSY.can('cases'); // SRA stages and payer events (LCS, admin); DSS see documentation only
  const clin = () => PSY.can('clinicalRecords');
  const payerShort = (cv) => ((cv && PSY.data.payers[cv.payer]) || {}).short || 'the payer';
  const l2kind = (cid) => (PSY.l2 && PSY.l2.kind ? PSY.l2.kind(cid) : null);
  const sraName = (cid) => { const k = l2kind(cid); const m = A().meta(cid); return (k ? k === 'cont' : m.kind === 'continued') ? 'Concurrent SRA' : 'Initial SRA'; };
  const enhTypes = () => ((PSY.enhance && PSY.enhance.TYPES) || []).map((t) => t.k);
  const sraEnh = (cid) => { const t = l2kind(cid) === 'cont' ? 'pac' : 'pa'; const ts = enhTypes(); return ts.indexOf(t) >= 0 ? t : ts.indexOf('pa') >= 0 ? 'pa' : null; };
  const isToday = (due) => /^(Thu,? )?Oct 29\b/.test(String(due || ''));
  const dayOf = (s) => String(s || '').split(' · ')[0].trim();

  /* --- what Lauris holds today --- */
  const DPN_KEYS = ['goal', 'intervention', 'duration', 'response', 'progress', 'needs'];
  function dpnToday(id) {
    const proc = !!flag('l1b.dpn.' + id + '.processed');
    const written = DPN_KEYS.some((k) => norm(flag('l1b.dpn.' + id + '.f.' + k)));
    return { proc, written };
  }
  const sess = (type, id) => { try { return PSY.dpn && PSY.dpn.session ? PSY.dpn.session(type, id, '') : null; } catch (e) { return null; } };
  const lfState = (form, id) => ((PSY.state.lf || {})[form + '|' + id]) || null;

  /* one action: { key, doc, next (the row line), what (the detail line), when ('Due today' | a date | ''), due, done, doneText, tone,
     lauris (route), scribe (type), enhance (type), di (caseId), act ({ attrs, label }) } */
  function act(o) { return Object.assign({ due: false, done: false, when: '', doneText: '', lauris: null, scribe: null, enhance: null, di: null, act: null, tone: 'gray' }, o); }
  function docRoute(key, c) {
    if (!clin()) return 'lauris-consumer?c=' + c.id + '&tab=file'; // an admin without clinical record access: the file, not the document
    return ROUTE[key] + '?c=' + c.id;
  }
  function sraRoute(c, forms) {
    if (forms) return 'lauris-forms';
    if (!clin()) return 'lauris-consumer?c=' + c.id + '&tab=auth';
    return l2kind(c.case) ? 'lauris-dmas?case=' + c.case : 'lauris-auths?c=' + c.id;
  }
  const scribeOk = (k) => !!SCRIBE[k] && PSY.can('scribe:' + SCRIBE[k]);
  const enhOk = () => PSY.can('enhance') && clin();

  /* the documentation of a patient in sessions: today's DPN, a planned collateral contact, the month's review note */
  function sessionDocs(c, out) {
    const id = c.id;
    if (SESSION_TODAY.indexOf(id) >= 0) {
      const d = dpnToday(id);
      out.push(act({ key: 'dpn', doc: DOC.dpn, due: !d.written && !d.proc, done: d.written || d.proc,
        next: 'Write today’s Daily Progress Note', what: d.proc ? 'Processed in Lauris' : d.written ? 'In Lauris for ' + TODAY_US + ' · not processed yet' : 'No note in Lauris for ' + TODAY_US + ' yet',
        when: d.proc ? '✓ Processed' : d.written ? '✓ Written' : 'Due today', lauris: docRoute('dpn', c), scribe: scribeOk('dpn') ? 'dpn' : null, enhance: enhOk() ? 'dpn' : null }));
    }
    const col = COLLATERAL[id];
    if (col) {
      const s = sess('collateral', id); const done = !!(s && (s.processed || norm(s.note)));
      out.push(act({ key: 'collateral', doc: DOC.collateral, done, next: col.what + ' ' + (col.when.indexOf('by') === 0 ? col.when : 'by ' + col.when),
        what: done ? (s.processed ? 'Processed in Lauris' : 'In Lauris for ' + TODAY_US) : col.what + ' · ' + col.date, when: done ? '✓ Written' : col.when,
        lauris: docRoute('collateral', c), scribe: scribeOk('collateral') ? 'collateral' : null, enhance: enhOk() ? 'collateral' : null }));
    }
    const mo = sess('monthly', id);
    if (mo && (norm(mo.note) || mo.processed)) {
      const done = !!mo.processed; const saved = mo.saved ? ' · draft saved ' + String(mo.saved.at || '').split(' ')[0].replace(/\/2026$/, '') : '';
      out.push(act({ key: 'monthly', doc: DOC.monthly, done, next: 'Finish the October Monthly Review Note',
        what: done ? 'Processed in Lauris' : 'October summary' + (saved || ' · draft in Lauris') + ' · not processed', when: done ? '✓ Processed' : 'Draft',
        lauris: docRoute('monthly', c), scribe: scribeOk('monthly') ? 'monthly' : null, enhance: enhOk() ? 'monthly' : null }));
    }
  }
  /* T.W.'s new case before the SRA: Admission Screening → CNA → ISP (PSY.flowRank), done in Lauris */
  function pipelineDocs(c, rank, out) {
    const keys = ['adm', 'cna', 'isp'];
    keys.forEach((k, i) => {
      if (i < rank) { out.push(act({ key: k, doc: DOC[k], done: true, next: '', what: 'Processed in Lauris', when: '✓ Processed', lauris: docRoute(k, c) })); return; }
      if (i > rank) return;
      const lf = lfState(k, c.id); const started = !!(lf && Object.keys(lf.v || {}).length && !lf.processed);
      const NEXT = { adm: 'Complete the Admission Screening', cna: 'Complete the Comprehensive Needs Assessment', isp: 'Write the ISP' };
      out.push(act({ key: k, doc: DOC[k], due: true, next: NEXT[k], what: started ? 'Started in Lauris · finish and Process Form' : k === 'isp' ? 'No plan in Lauris yet' : 'Not started in Lauris',
        when: 'Due today', lauris: docRoute(k, c), scribe: scribeOk(k) ? SCRIBE[k] : null, enhance: enhOk() && ENH[k] && enhTypes().indexOf(ENH[k]) >= 0 ? ENH[k] : null }));
    });
  }
  /* SRA work from the alerts (one source of truth for what needs a person) */
  function sraDocs(c, out) {
    const cid = c.case; if (!cid || !canAuth()) return;
    const cv = PSY.caseView(cid); const m = A().meta(cid); const u = A().units(cid); const d = m.decision || {}; const pay = payerShort(cv); const nm = sraName(cid);
    const alerts = PSY.alerts ? PSY.alerts.forPatient(c.id) : [];
    const pre = (a) => String(a.id).split('-')[0];
    const enh = enhOk() ? sraEnh(cid) : null; const di = PSY.can('platform') ? cid : null;
    alerts.forEach((a) => {
      const k = pre(a);
      if (k === 'elig') out.push(act({ key: 'elig', doc: DOC.elig, due: true, next: 'Confirm the payer · coverage change', what: (a.lines || [])[0] || a.title, when: 'Due today', act: { attrs: PSY.alerts.actAttrs(a), label: esc(a.action.label) } }));
      else if (k === 'sign') out.push(act({ key: 'sra', doc: nm, due: true, next: 'Sign the ' + nm.toLowerCase().replace('sra', 'SRA') + ' in Forms to Approve', what: 'Processed in Lauris · waiting for your signature', when: 'Due today', lauris: sraRoute(c, true) }));
      else if (k === 'ready') out.push(act({ key: 'sra', doc: nm, due: true, next: 'Submit the ' + lc(nm), what: 'Signed · ready to submit · ' + (a.lines || [])[0], when: 'Due today', lauris: sraRoute(c), enhance: enh }));
      else if (k === 'init' || k === 'cs') { /* round 13: a concurrent SRA draft is due before the current authorization ends (as All Authorizations shows it), not today */
        const by = k === 'cs' && u.current && u.current.end ? u.current.end : null;
        out.push(act({ key: 'sra', doc: nm, due: !by, next: 'Review the ' + lc(nm) + ' draft' + (by ? ' by ' + by : ''), what: 'Draft ready · ' + (u.requested ? u.requested + ' ' + u.service.units + ' for ' + u.period : 'review it') + ' · then Process Form', when: by ? 'By ' + by : 'Due today', lauris: sraRoute(c), enhance: enh })); }
      else if (k === 'low') out.push(act({ key: 'sra', doc: 'Concurrent SRA', due: true, next: 'Start the concurrent SRA · ends ' + u.current.end, what: u.current.remaining + ' ' + u.service.units + ' left · authorization ends ' + u.current.end, when: 'Due today', lauris: sraRoute(c), enhance: enhOk() ? (enhTypes().indexOf('pac') >= 0 ? 'pac' : sraEnh(cid)) : null }));
      else if (k === 'info') out.push(act({ key: 'sra', doc: nm, due: isToday(d.due), next: 'Answer ' + pay + '’s questions by ' + d.due, what: pay + ' asked for more information · reply by ' + d.due + (d.via ? ' (' + d.via + ')' : ''), when: isToday(d.due) ? 'Due today' : dayOf(d.due), lauris: sraRoute(c), di }));
      else if (k === 'red') out.push(act({ key: 'sra', doc: nm, due: isToday(d.due), next: 'Reply to ' + pay + '’s offer by ' + d.due, what: 'Offered ' + d.approved + ' of ' + u.requested + ' ' + u.service.units + ' · reply by ' + d.due, when: isToday(d.due) ? 'Due today' : dayOf(d.due), lauris: sraRoute(c), di }));
      else if (k === 'part') out.push(act({ key: 'sra', doc: nm, due: isToday(d.due), next: 'Peer-to-peer ' + d.due, what: (u.approved != null ? u.approved : d.approved) + ' of ' + u.requested + ' ' + u.service.units + ' approved · peer-to-peer ' + d.due, when: isToday(d.due) ? 'Due today' : dayOf(d.due).replace(/, .*$/, ''), lauris: sraRoute(c), di }));
      else if (k === 'den') out.push(act({ key: 'sra', doc: nm, due: isToday(d.due), next: 'Appeal by ' + d.due, what: 'Denied ' + (d.date || '') + ' · appeal by ' + d.due, when: isToday(d.due) ? 'Due today' : dayOf(d.due), lauris: sraRoute(c), di }));
    });
    /* a concurrent SRA started from the extension (no alert any more) */
    const st = A().status(cid);
    if (!out.some((x) => x.key === 'sra') && st === 'approved' && (PSY.state.cases[cid] || {}).csStarted && u.current) out.push(act({ key: 'sra', doc: 'Concurrent SRA', due: true, next: 'Finish the concurrent SRA draft', what: 'Started · ' + u.current.remaining + ' ' + u.service.units + ' left · ends ' + u.current.end, when: 'Due today', lauris: sraRoute(c), enhance: enhOk() ? sraEnh(cid) : null }));
    if (!out.some((x) => x.key === 'sra') && (st === 'submitted' || st === 'pending')) out.push(act({ key: 'sra', doc: nm, done: true, next: '', what: 'Submitted' + (m.submitted ? ' ' + m.submitted.date + ' · ' + m.submitted.via : '') + ' · waiting for ' + pay, when: '✓ Submitted', lauris: sraRoute(c), di: null }));
  }
  const lc = (nm) => nm.charAt(0).toLowerCase() + nm.slice(1);

  /* where the patient is: { at (step), tone, chip } and the stepper */
  function stageOf(c) {
    const cid = c.case;
    if (c.id === '4492' && PSY.flowRank() < 3) { const r = PSY.flowRank(); return { at: r + 1, tone: 'amber', chip: STEPS[r + 1] }; }
    if (!cid) return { at: S_SRA, tone: 'gray', chip: 'No SRA yet' };
    const st = A().status(cid); const u = A().units(cid); const m = A().meta(cid); const cur = !!u.current;
    const cont = l2kind(cid) ? l2kind(cid) === 'cont' : m.kind === 'continued';
    if (!canAuth()) return cur || st === 'approved' ? { at: S_SES, tone: 'green', chip: 'In sessions' } : { at: S_SRA, tone: 'gray', chip: 'Initial SRA' };
    if (st === 'closed') return { at: S_CSRA, tone: 'gray', chip: 'Closed', all: true };
    const D = { draft: ['draft', 'gray'], review: ['draft', 'amber'], ready: ['to submit', 'blue'], submitted: ['submitted', 'blue'], pending: ['submitted', 'blue'], info: ['info requested', 'red'],
      partial: [(m.decision || {}).type === 'reduction' ? 'offer' : 'partial', 'amber'], denied: ['denied', 'red'], recon: ['reconsideration', 'amber'], appeal: ['appeal', 'amber'] };
    if (cont && cur) {
      const low = u.daysLeft != null && u.daysLeft <= 10;
      if (st === 'approved' && !low && !(PSY.state.cases[cid] || {}).csStarted) return { at: S_SES, tone: 'green', chip: 'In sessions' };
      if (st === 'approved') return { at: S_CSRA, tone: 'amber', chip: (PSY.state.cases[cid] || {}).csStarted ? 'Concurrent SRA · draft' : 'Concurrent SRA · due' };
      const x = D[st] || [A().label(st), A().tone(st)]; return { at: S_CSRA, tone: x[1], chip: 'Concurrent SRA · ' + x[0] };
    }
    if (st === 'approved') return { at: S_SES, tone: 'green', chip: 'In sessions' };
    if (cur) return { at: S_SES, tone: A().tone(st), chip: 'In sessions · ' + ((D[st] || [A().label(st)])[0]) + ' SRA' };
    const x = D[st] || [A().label(st), A().tone(st)]; return { at: S_SRA, tone: x[1], chip: 'Initial SRA · ' + x[0] };
  }
  const stepsOf = (stg) => STEPS.map((_, i) => (stg.all || i < stg.at ? 'd' : i === stg.at ? 'c' : ''));

  /* the row line when nothing is due: where the patient stands, as data */
  function idleNext(c, stg) {
    const cid = c.case; if (!cid) return '';
    if (!canAuth()) return 'Nothing due today';
    const st = A().status(cid); const u = A().units(cid); const cv = PSY.caseView(cid); const m = A().meta(cid);
    if (st === 'submitted' || st === 'pending' || st === 'recon' || st === 'appeal') return 'Waiting for ' + payerShort(cv) + (m.submitted && (st === 'submitted' || st === 'pending') ? ' · sent ' + m.submitted.date : '');
    if (u.current) return u.current.remaining + ' ' + u.service.units + ' left · ends ' + u.current.end;
    if (st === 'approved') { const n = L().units(c); return sraName(cid) + ' approved' + (n != null ? ' · ' + n + ' ' + u.service.units + ' available' : ''); }
    return stg.chip;
  }
  function consumerRow(c, full) {
    const tw = c.id === '4492' && PSY.flowRank() < 3;
    const actions = [];
    if (tw) pipelineDocs(c, PSY.flowRank(), actions);
    if (!tw) { sraDocs(c, actions); sessionDocs(c, actions); }
    if (tw && canAuth()) { const el = []; sraDocs(c, el); el.filter((a) => a.key === 'elig').forEach((a) => actions.unshift(a)); }
    const stg = stageOf(c);
    const due = actions.filter((a) => a.due).sort((a, b) => (PRI[a.key] || 9) - (PRI[b.key] || 9));
    const open = actions.filter((a) => !a.due && !a.done && a.next);
    const top = due[0] || open[0] || null;
    const me = L().staff ? Object.values(L().staff).find((s) => s.short === c.staff) : null;
    const row = {
      laurisId: c.id, caseId: c.case || null, ini: c.ini, ref: '#' + c.id, staff: c.staff, staffName: me ? me.name : c.staff,
      stage: { at: stg.at, tone: stg.tone, label: stg.chip }, need: due.length > 0, nDue: due.length,
      next: top ? top.next + (due.length > 1 ? ' · +' + (due.length - 1) + ' more' : '') : idleNext(c, stg), rank: top && top.due ? PRI[top.key] || 9 : 99,
    };
    if (full) {
      /* direct support staff (no Case status): no SRA steps, documentation only */
      row.steps = STEPS.map((label, i) => ({ label, state: stepsOf(stg)[i] })).filter((x) => canAuth() || !/SRA$/.test(x.label));
      const order = (a) => (a.due ? 0 : a.done ? 2 : 1);
      row.actions = actions.slice().sort((a, b) => order(a) - order(b) || (PRI[a.key] || 9) - (PRI[b.key] || 9)).map((a) => Object.assign({}, a, { tools: toolsOf(a) }));
      row.lauris = c.id ? 'lauris-consumer?c=' + c.id : null;
    }
    return row;
  }
  const toolsOf = (a) => ['lauris', 'scribe', 'enhance', 'di'].filter((t) => (t === 'lauris' ? !!a.lauris : t === 'di' ? !!a.di : !!a[t]) && !(a.done && (t === 'scribe' || t === 'enhance')));
  /* a referral not in Lauris yet (PSY.newCases; T.W.'s REF-118 is in Lauris as 4492) */
  const NC_STEP = { referral: S_REF, screening: S_ADM, 'intake-sched': S_CNA, intake: S_CNA, isp: S_ISP, ready: S_SRA };
  function referralRow(x, full) {
    const at = NC_STEP[x.stage.key] || 0; const ini = String(x.who || '').split(',')[0];
    const row = { laurisId: x.id, caseId: null, ini, ref: x.id, staff: '', staffName: '', referral: true, stage: { at, tone: x.stage.tone === 'amber' ? 'amber' : x.stage.tone === 'blue' ? 'blue' : 'gray', label: STEPS[at] },
      need: false, nDue: 0, next: x.next || '', rank: 99 };
    if (full) {
      row.steps = STEPS.map((label, i) => ({ label, state: i < at ? 'd' : i === at ? 'c' : '' }));
      row.actions = at === S_ADM ? [Object.assign(act({ key: 'adm', doc: DOC.adm, next: x.next, what: x.next + ' · not in Lauris yet', when: dayOf(String(x.next).replace(/^Screening call /, '')).replace(/, .*$/, '') }), { tools: [] })] : [];
      row.lauris = null;
    }
    return row;
  }
  const referrals = () => (canAuth() && PSY.newCases && PSY.newCases.active ? PSY.newCases.active().filter((x) => x.id !== 'REF-118') : []);
  function rows(full) {
    const load = PSY.caseload();
    const out = L().consumers.filter((c) => load.indexOf(c.id) >= 0).map((c) => consumerRow(c, full));
    referrals().forEach((x) => out.push(referralRow(x, full)));
    return out.map((r, i) => [r, i]).sort((a, b) => a[0].rank - b[0].rank || a[1] - b[1]).map((x) => x[0]);
  }
  function detail(id) {
    id = String(id);
    const c = L().byId(id);
    if (c) return PSY.inCaseload(id) ? consumerRow(c, true) : null;
    const x = referrals().find((r) => r.id === id); return x ? referralRow(x, true) : null;
  }
  function list(filter) {
    const all = rows(false); const need = all.filter((r) => r.need).length;
    const u = PSY.user();
    return { role: PSY.role(), title: PSY.can('allConsumers') ? 'All patients' : 'My patients', user: u.name, day: DAY, total: all.length, need,
      filter: filter === 'action' ? 'action' : 'all', rows: filter === 'action' ? all.filter((r) => r.need) : all };
  }
  const M = { rows: () => rows(false), row: (id) => rows(false).find((r) => r.laurisId === String(id)) || null, detail, list, count: () => rows(false).filter((r) => r.need).length, STEPS };

  /* ================= the demo backend routes ================= */
  const API = () => (PSY.api && typeof PSY.api.route === 'function' && typeof PSY.api.get === 'function' ? PSY.api : null);
  const err = (s, m) => { if (API() && API().error) return API().error(s, m); const e = new Error(m); e.status = s; return e; };
  const H = {
    list: (q) => { const f = (q.query || {}).filter; if (f && f !== 'all' && f !== 'action') throw err(400, 'filter must be all or action'); return M.list(f); },
    one: (q) => { const r = M.detail(q.params.laurisId); if (!r) throw err(404, 'Not on your roster: ' + q.params.laurisId); return r; },
    start: (q) => {
      const tool = (q.body || {}).tool; if (['lauris', 'scribe', 'enhance', 'di'].indexOf(tool) < 0) throw err(400, 'tool must be lauris, scribe, enhance or di');
      const r = M.detail(q.params.laurisId); if (!r) throw err(404, 'Not on your roster: ' + q.params.laurisId);
      const a = (r.actions || []).find((x) => x.key === q.params.key); if (!a) throw err(404, 'No ' + q.params.key + ' action for ' + r.ini);
      if ((a.tools || []).indexOf(tool) < 0) throw err(409, (tool === 'lauris' ? 'Open in Lauris' : tool === 'di' ? 'Denial Intelligence' : tool === 'scribe' ? 'Scribe' : 'Scan & Enhance') + ' is not available for ' + a.doc + ' · ' + r.ini);
      const out = { laurisId: r.laurisId, ini: r.ini, key: a.key, doc: a.doc, tool };
      if (tool === 'lauris') out.route = a.lauris;
      if (tool === 'scribe') out.preset = { type: a.scribe, laurisId: r.laurisId };
      if (tool === 'enhance') out.preset = { type: a.enhance, laurisId: r.laurisId };
      if (tool === 'di') out.caseId = a.di;
      return out;
    },
  };
  const TOOL = { lauris: 'Open in Lauris', scribe: 'Scribe', enhance: 'Scan & Enhance', di: 'Denial Intelligence' };
  if (API()) {
    const o = (desc, summary) => ({ desc, owner: 'EXT13', summary });
    API().route('GET', '/roster', H.list, o('The extension Overview: the role’s patient roster, computed from the live demo state', (d) => d.total + ' patients · ' + d.need + ' need action today (' + d.role.toUpperCase() + ')'));
    API().route('GET', '/roster/:laurisId', H.one, o('One patient: stage, stepper and the documentation actions due', (d) => d.ini + ' · ' + d.stage.label + ' · ' + (d.actions || []).filter((a) => a.due).length + ' due today'));
    API().route('POST', '/roster/:laurisId/actions/:key/start', H.start, o('Open an action: where Open in Lauris goes, or the Scribe / Scan & Enhance preset (checked for the role)', (d) => TOOL[d.tool] + ' · ' + d.doc + ' · ' + d.ini));
  }
  /* client: through PSY.api when it is there, else the same handlers in place */
  function local(method, path, body) {
    const u = String(path).split('?'); const query = Object.fromEntries(new URLSearchParams(u[1] || '')); const seg = u[0].split('/').filter(Boolean);
    if (method === 'GET' && seg.length === 1) return H.list({ query });
    if (method === 'GET' && seg.length === 2) return H.one({ params: { laurisId: seg[1] }, query });
    if (method === 'POST' && seg.length === 5) return H.start({ params: { laurisId: seg[1], key: seg[3] }, body: body || {} });
    throw err(404, 'No route for ' + method + ' ' + path);
  }
  /* synchronous read for rendering (logged when the person asked for it, quiet for repaints) */
  function read(path, logIt) {
    const a = API();
    if (a && typeof a.call === 'function') { try { return a.call('GET', path, null, { quiet: !logIt }); } catch (e) { if (e && e.status === 404 && /^No route/.test(e.message || '')) return local('GET', path); throw e; } }
    return local('GET', path);
  }
  function post(path, body) {
    const a = API(); if (a) return a.post(path, body);
    try { return Promise.resolve(local('POST', path, body)); } catch (e) { return Promise.reject({ status: e.status || 500, message: e.message }); }
  }

  /* ================= the list view 'overview' (replaces 'cases'), the 'today' view, and "in front" ================= */
  const VAL = { overview: 'overview', cases: 'overview', status: 'overview', roster: 'overview', today: 'today', notes: 'today', time: 'today' };
  const writes = () => PSY.can('time') || ['dpn', 'collateral', 'monthly', 'admission', 'intake'].some((k) => PSY.can('scribe:' + k));
  X.VIEWS = { overview: 'Overview', today: 'Today' };
  X.views = () => ['overview'].concat(writes() ? ['today'] : []);
  const dflt = () => (canAuth() || !writes() ? 'overview' : 'today');
  /* the view picked last (ext.view; "View as" clears it, so a role starts on its own default: LCS / admin the roster, DSS Today) */
  X.view = () => { const vs = X.views(); const v = VAL[PSY.state.ext.view] || dflt(); return vs.indexOf(v) >= 0 ? v : vs[0]; };
  /* the roster in front of an open Scribe / Scan & Enhance / time entry (in memory; × or any of those tools brings them back) */
  let front = null; // { role }
  const isFront = () => !!(front && front.role === PSY.role() && X.view() === 'overview');
  const clearFront = () => { front = null; };
  X.applyView = (root) => {
    root = root || PSY.activeRoot(); const list = root && root.querySelector('[data-psy="xp-list"]'); if (!list) return;
    const v = X.view();
    list.setAttribute('data-view', v); list.setAttribute('data-scroll', 'xp-list');
    list.querySelectorAll(':scope > [data-pane]').forEach((p) => { const k = p.getAttribute('data-pane'); p.hidden = !(k === v || (v === 'today' && (k === 'notes' || k === 'time'))); });
    const notes = list.querySelector(':scope > [data-pane="notes"]');
    if (notes) notes.toggleAttribute('data-empty', !notes.textContent.trim() && !notes.querySelector('button,a,input,select,textarea'));
  };
  X.setView = (name) => {
    name = VAL[name] || name; if (X.views().indexOf(name) < 0) name = X.views()[0];
    PSY.state.ext.view = name; PSY.state.ext.tab = name; PSY.save();
    if (name === 'overview') { if (X.work.active && baseActive()) front = { role: PSY.role() }; } else clearFront();
    X.applyView(); X.work.paint(); paintBtn();
  };
  X.tab = (name) => {
    if (name === 'review') { if (PSY.enhance && PSY.enhance.begin && PSY.can('enhance')) { PSY.enhance.begin(); return; } name = 'overview'; }
    X.setView(name);
  };
  /* the work area gives way to the roster while it is in front; every repaint of the work area refreshes the roster when it shows */
  const baseHtml = X.work.html;
  const baseActive = () => { try { return !!baseHtml(X.lastPanel || {}); } catch (e) { return false; } };
  X.work.html = function (o) { if (isFront()) return ''; return baseHtml.apply(this, arguments); };
  const basePaint = X.work.paint;
  X.work.paint = function () { const r = basePaint.apply(this, arguments); try { paintPane(); paintBtn(); } catch (e) { console.error('overview paint', e); } return r; };
  /* any other tool asked for: the roster steps back */
  const wrapFn = (obj, name) => { if (!obj || typeof obj[name] !== 'function' || obj[name].__ov) return; const f0 = obj[name]; const f = function () { clearFront(); return f0.apply(this, arguments); }; f.__ov = true; obj[name] = f; };
  ['xq-scribe', 'xq-enhance', 'tt-stop', 'enhance-open'].forEach((k) => wrapFn(PSY.acts, k));
  const wrapTools = () => { if (PSY.scribe) ['open', 'begin'].forEach((k) => wrapFn(PSY.scribe, k)); if (PSY.enhance) ['begin', 'run', 'open', 'openFor'].forEach((k) => wrapFn(PSY.enhance, k)); };
  wrapTools();
  if (PSY.boot && !PSY.boot.__ov) { const b0 = PSY.boot; PSY.boot = function () { wrapTools(); ['xq-scribe', 'xq-enhance', 'tt-stop', 'enhance-open'].forEach((k) => wrapFn(PSY.acts, k)); return b0.apply(this, arguments); }; PSY.boot.__ov = true; }
  if (PSY.reset && !PSY.reset.__ov) { const r0 = PSY.reset; PSY.reset = function () { front = null; busy = {}; return r0.apply(this, arguments); }; PSY.reset.__ov = true; }

  /* ================= rendering ================= */
  const ui = () => { const s = (PSY.state.ov = PSY.state.ov || {}); if (s.role !== PSY.role()) { s.role = PSY.role(); s.open = null; s.filter = 'all'; } return s; };
  let busy = {};
  const ICON = {
    roster: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5h6V7H9zM8.5 11.5h1M12 11.5h3.5M8.5 15.5h1M12 15.5h3.5"/></svg>',
    lauris: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    mic: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
    spark: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3"/><path d="M12 7.5l1.3 3.2 3.2 1.3-3.2 1.3L12 16.5l-1.3-3.2L7.5 12l3.2-1.3z"/></svg>',
  };
  const chip = (s) => '<span class="st5 t-' + s.tone + ' ov-st" title="' + esc(s.label) + '">' + esc(s.label) + '</span>';
  const badge = '<span class="ov-ar" data-psy="ov-ar"><i aria-hidden="true">!</i>Action required</span>';
  function stepper(steps) {
    const cur = steps.find((s) => s.state === 'c');
    return '<ol class="ov-sp" data-psy="ov-steps" aria-label="' + esc('Where the patient is: ' + (cur ? cur.label : 'done')) + '">' +
      steps.map((s) => '<li class="' + (s.state || 'n') + '"' + (s.state === 'c' ? ' aria-current="step"' : '') + '><b aria-hidden="true"></b><span>' + esc(s.label).replace(/ (Screening|SRA)$/, '<br>$1') + '</span></li>').join('') + '</ol>';
  }
  const WHEN_TONE = (a) => (a.done ? 'g' : a.due ? 'r' : a.when === 'Draft' ? 'y' : 'n');
  function toolBtn(r, a, t) {
    const b = busy[r.laurisId + '|' + a.key + '|' + t];
    const attrs = 'data-act="ov-tool" data-tool="' + t + '" data-c="' + esc(r.laurisId) + '" data-k="' + esc(a.key) + '"' + (b ? ' aria-busy="true" disabled' : '');
    if (t === 'lauris') return '<button class="btn o s ov-tb" ' + attrs + ' title="Open ' + esc(a.doc) + ' in Lauris">' + ICON.lauris + 'Open in Lauris</button>';
    if (t === 'scribe') return '<button class="btn o s ov-tb ov-sc" ' + attrs + ' title="Scribe · ' + esc(a.doc) + ' · ' + esc(r.ini) + '">' + ICON.mic + 'Scribe</button>';
    if (t === 'enhance') return '<button class="btn o s ov-tb ov-en" ' + attrs + ' title="Scan &amp; Enhance · ' + esc(a.doc) + ' · ' + esc(r.ini) + '">' + ICON.spark + 'Scan &amp; Enhance</button>';
    if (t === 'di') return '<button class="btn o s ov-tb" ' + attrs + '>Denial Intelligence <span aria-hidden="true">↗</span></button>';
    return '';
  }
  function actionHtml(r, a) {
    const tools = (a.tools || []).map((t) => toolBtn(r, a, t)).join('') + (a.act && !a.done ? '<button class="btn p s ov-tb" ' + a.act.attrs + '>' + a.act.label + '</button>' : '');
    return '<li class="ov-a' + (a.due ? ' due' : '') + (a.done ? ' done' : '') + '" data-ov-a="' + esc(a.key) + '"><div class="ov-a1"><b>' + esc(a.doc) + '</b><span class="chip ' + WHEN_TONE(a) + '">' + esc(a.when || (a.done ? 'Done' : '')) + '</span></div>' +
      '<div class="ov-a2">' + esc(a.what) + '</div>' + (tools ? '<div class="ov-ab">' + tools + '</div>' : '') + '</li>';
  }
  function detailHtml(d) {
    if (!d) return '';
    const acts = d.actions || [];
    return '<div class="ov-more" data-psy="ov-detail">' + stepper(d.steps) +
      (acts.length ? '<ul class="ov-al">' + acts.map((a) => actionHtml(d, a)).join('') + '</ul>' : '<div class="ov-none">' + (d.referral ? 'Not in Lauris yet' : 'Nothing due today') + '</div>') +
      (d.lauris && !onFile(d.laurisId) ? '<button class="lnk5 ov-file" data-act="ov-file" data-c="' + esc(d.laurisId) + '">Open ' + esc(d.ini) + '’s file in Lauris</button>' : '') + '</div>';
  }
  const onFile = (id) => { const c = PSY.current(); return c.id === 'lauris-consumer' && String((c.params || {}).c) === String(id); };
  function rowHtml(r, d, f) {
    const open = !!d; const admin = PSY.can('allConsumers');
    return '<div class="ov-row' + (r.need ? ' need' : '') + (open ? ' open' : '') + (r.referral ? ' ref' : '') + '" data-ov="' + esc(r.laurisId) + '">' +
      '<button class="ov-sum" type="button" data-act="ov-toggle" data-c="' + esc(r.laurisId) + '" aria-expanded="' + open + '">' +
        '<span class="ov-l1"><b class="ov-ini">' + esc(r.ini) + '</b><span class="ov-id">' + esc(r.ref) + '</span>' + chip(r.stage) + (r.need && f === 'all' ? badge : '') + '</span>' +
        '<span class="ov-l2" title="' + esc(r.next) + '">' + esc(r.next || '—') + (admin && r.staff ? '<em> · ' + esc(r.staff) + '</em>' : '') + '</span></button>' +
      (open ? detailHtml(d) : '') + '</div>';
  }
  /* the pane (logIt: the person opened it, changed the filter or tapped a row) */
  function paneInner(logIt) {
    const s = ui(); const f = s.filter === 'action' ? 'action' : 'all';
    let data; try { data = read('/roster' + (f === 'action' ? '?filter=action' : ''), logIt === true); } catch (e) { return '<div class="ov-none">Could not load the roster</div>'; }
    let d = null;
    if (s.open && data.rows.some((r) => r.laurisId === s.open)) { try { d = read('/roster/' + encodeURIComponent(s.open), logIt === 'row'); } catch (e) { d = null; } }
    const closeX = X.views().length > 1 ? '<button class="ov-x" data-act="ov-close" title="Close Overview" aria-label="Close Overview">×</button>' : '';
    const seg = (k, label, n) => '<button type="button" class="ov-f' + (f === k ? ' on' : '') + '" data-act="ov-filter" data-f="' + k + '" aria-pressed="' + (f === k) + '">' + label + ' <span>' + n + '</span></button>';
    const body = data.rows.length ? data.rows.map((r) => rowHtml(r, d && d.laurisId === r.laurisId ? d : null, f)).join('')
      : '<div class="ov-none" data-psy="ov-empty">' + (f === 'action' ? 'Nothing needs action today' : 'No patients assigned') + '</div>';
    return '<div class="ov" data-psy="overview" data-filter="' + f + '"><div class="ov-top"><div class="ov-hd"><b>' + esc(data.title) + '</b><span class="ov-day">' + esc(data.day) + '</span>' + closeX + '</div>' +
      '<div class="ov-bar">' + /* round 14: one count each (the toggle), not four: the button badge, the header, a "Today" line and the toggle said the same thing */
        '<span class="ov-seg" role="group" aria-label="Show">' + seg('action', 'Action required', data.need) + seg('all', 'All', data.total) + '</span></div></div>' +
      '<div class="ov-list" data-psy="ov-list">' + body + '</div></div>';
  }
  X.overviewPane = (o) => paneInner(false);
  X.casesPane = X.overviewPane; X.statusPane = X.overviewPane; // older callers
  function paintPane(logIt) {
    const r = PSY.activeRoot(); const pane = r && r.querySelector('[data-psy="xp-list"] > [data-pane="overview"]'); if (!pane) return;
    const list = pane.closest('[data-psy="xp-list"]'); if (!logIt && (list.hidden || pane.hidden)) return;
    const h = paneInner(logIt); if (pane.__ov !== h) { const top = pane.scrollTop; pane.innerHTML = h; pane.__ov = h; pane.scrollTop = top; }
  }
  /* the Overview button (first of the top row) */
  X.ovBtn = () => {
    let n = 0; try { n = M.count(); } catch (e) { n = 0; }
    const on = X.view() === 'overview' && (isFront() || !baseActive());
    return '<button class="xq-b ov' + (on ? ' on' : '') + '" data-act="xq-overview" data-xq="xq-overview" aria-pressed="' + on + '" title="Overview · my patients today"><span class="ic">' + ICON.roster + '</span><span class="tx"><b>Overview</b>' +
      (n ? '<small data-psy="ov-count">' + n + ' need action</small>' : '') + '</span></button>';
  };
  function paintBtn() {
    const r = PSY.activeRoot(); const b = r && r.querySelector('[data-psy="xq"] [data-act="xq-overview"]'); if (!b) return;
    const h = X.ovBtn(); if (b.__ov !== h && b.outerHTML !== h) { const t = document.createElement('template'); t.innerHTML = h; const nb = t.content.firstChild; nb.__ov = h; b.replaceWith(nb); }
  }
  /* live: any saved change (a push into Lauris, a signature, a status) refreshes the button's count and, when it shows, the roster */
  let liveT = null;
  const live = () => { if (liveT) return; liveT = setTimeout(() => { liveT = null; try { paintBtn(); paintPane(); } catch (e) { console.error('overview live', e); } }, 80); };
  if (PSY.save && !PSY.save.__ov) { const s0 = PSY.save; PSY.save = function () { const r = s0.apply(this, arguments); live(); return r; }; PSY.save.__ov = true; }
  const scrollTo = (id) => setTimeout(() => {
    const r = PSY.activeRoot(); const el = r && r.querySelector('[data-pane="overview"] [data-ov="' + id + '"]'); if (!el) return;
    try { el.scrollIntoView({ block: 'nearest' }); } catch (e) {}
  }, 30);

  /* ================= acts ================= */
  function openOverview(o) {
    o = o || {};
    if (!PSY.current().app || PSY.current().app !== 'lauris') PSY.go('lauris-consumers');
    if (X.mode() === 'collapsed') X.set(true);
    PSY.state.ext.view = 'overview'; PSY.state.ext.tab = 'overview'; PSY.save();
    front = baseActive() ? { role: PSY.role() } : null;
    X.applyView(); basePaint.call(X.work); paintPane(o.log === false ? false : true); paintBtn();
  }
  PSY.acts['xq-overview'] = () => openOverview();
  PSY.acts['ov-close'] = () => X.setView('today');
  PSY.acts['ov-filter'] = (el) => { const s = ui(); s.filter = el.getAttribute('data-f') === 'action' ? 'action' : 'all'; PSY.save(); paintPane(true); };
  PSY.acts['ov-toggle'] = (el) => { const s = ui(); const id = el.getAttribute('data-c'); s.open = s.open === id ? null : id; PSY.save(); paintPane(s.open ? 'row' : false); if (s.open) scrollTo(id); };
  PSY.acts['ov-file'] = (el) => PSY.go('lauris-consumer?c=' + el.getAttribute('data-c'));
  PSY.acts['ov-tool'] = (el) => {
    const id = el.getAttribute('data-c'); const key = el.getAttribute('data-k'); const tool = el.getAttribute('data-tool'); const bk = id + '|' + key + '|' + tool;
    if (busy[bk]) return; busy[bk] = true; el.disabled = true; el.setAttribute('aria-busy', 'true');
    post('/roster/' + encodeURIComponent(id) + '/actions/' + encodeURIComponent(key) + '/start', { tool }).then((r) => {
      delete busy[bk];
      /* the document opens in Lauris; the roster stays in front (an auto-scan waits behind it: the Scan & Enhance button shows its count) */
      if (tool === 'lauris') { if (X.view() === 'overview') front = { role: PSY.role() }; PSY.go(r.route); return; }
      if (tool === 'di') { if (PSY.alerts && PSY.alerts.openDecision) PSY.alerts.openDecision(r.caseId); return; }
      if (tool === 'scribe') presetScribe(r.preset); else presetEnhance(r.preset);
    }).catch((e) => { delete busy[bk]; paintPane(); PSY.ui.toast((e && e.message) || 'Could not open it.'); });
  };
  /* a stopped interval waiting in the work area moves to the Today list (as when the Scribe or Scan & Enhance button is tapped) */
  const parkTime = () => { const st = PSY.state.timer; if (st && st.open) { st.open = null; PSY.save(); } };
  function presetScribe(p) {
    const S = PSY.scribe; if (!S || !p || !p.type) return;
    clearFront(); parkTime();
    S.open(); const c = S.ctx(); S.ui.sel = { key: S.key(c), t: p.type, c: String(p.laurisId) }; S.paint();
  }
  function presetEnhance(p) {
    const E = PSY.enhance; if (!E || !p || !p.type) return;
    clearFront(); parkTime();
    E.begin(); E.select(String(p.laurisId), p.type); E.run();
  }

  /* ================= presenter: scenario 12 — the clinician checks the roster in the extension ================= */
  PSY.presenter = PSY.presenter || {}; PSY.presenter.prep = PSY.presenter.prep || {};
  PSY.presenter.prep.s12 = () => {
    PSY.state.role = 'lcs';
    PSY.state.ext.view = 'overview'; PSY.state.ext.tab = 'overview'; PSY.state.ov = { role: 'lcs', filter: 'all', open: null };
    front = null; PSY.save();
    /* the scenario opens Lauris after this hook (with the panel collapsed); open the panel on the roster once it is on screen */
    const show = () => { if (PSY.current().app === 'lauris') { X.set(true); paintPane(true); } };
    (typeof queueMicrotask === 'function' ? queueMicrotask : (f) => Promise.resolve().then(f))(show);
  };

  X.overview = { model: M, html: X.overviewPane, paint: paintPane, open: openOverview, close: () => X.setView('today'), STEPS, front: isFront };

  /* ================= styles (inside the Lauris shadow root) ================= */
  PSY.css.lauris = (PSY.css.lauris || '') + `
.xp-list[data-view="overview"]>[data-pane="overview"]{padding:10px 14px 14px;gap:0}
.ov{display:flex;flex-direction:column;min-width:0}
.ov-top{position:sticky;top:-10px;z-index:2;background:#fff;margin:-10px -14px 0;padding:10px 14px 2px;border-bottom:1px solid #EFEBE4}
.ov-hd{display:flex;align-items:center;gap:7px;min-height:28px}
.ov-hd>b{font-size:14.5px;font-weight:700}
.ov-n{font-size:12px;font-weight:700;color:#6B665E;background:#EFEDE8;border-radius:999px;padding:1px 7px}
.ov-day{margin-left:auto;font-size:12px;color:#6B665E;font-weight:600;white-space:nowrap}
.ov-x{flex:0 0 26px;width:26px;height:26px;border-radius:7px;border:1px solid #D9D4CC;background:#fff;font:inherit;font-size:16px;line-height:1;cursor:pointer;color:#3E4652;display:inline-flex;align-items:center;justify-content:center}
.ov-x:hover{background:#F3F0EA}
.ov-bar{display:flex;align-items:center;gap:8px;margin:6px 0 4px;min-width:0}
.ov-today{font-size:12.5px;font-weight:700;color:#4A453D;white-space:nowrap;min-width:0;overflow:hidden;text-overflow:ellipsis}
.ov-today.on{color:#8A2E1C}
.ov-seg{margin-left:auto;display:inline-flex;border:1px solid #D9D4CC;border-radius:8px;overflow:hidden;flex:0 0 auto}
.ov-f{border:0;background:#fff;font:inherit;font-size:11.5px;font-weight:600;color:#3E4652;padding:4px 8px;cursor:pointer;white-space:nowrap}
.ov-f+.ov-f{border-left:1px solid #D9D4CC}
.ov-f span{color:#6B665E;font-weight:700}
.ov-f.on{background:#1D4F43;color:#fff}.ov-f.on span{color:#CFE3DA}
.ov-f:focus-visible{outline:2px solid #217A78;outline-offset:-2px}
.ov-list{display:flex;flex-direction:column}
.ov-row{border-top:1px solid #EFEBE4;position:relative;scroll-margin-top:72px;scroll-margin-bottom:8px}
.ov-list>.ov-row:first-child{border-top:0}
.ov-row.need:before{content:'';position:absolute;left:-7px;top:8px;bottom:8px;width:3px;border-radius:2px;background:#B23A22}
.ov-row.open{background:#F8F6F2;border:1px solid #E6E1D9;border-radius:10px;margin:3px -7px;padding:0 7px 9px}
.ov-row.open.need:before{left:-1px}
.ov-row.open+.ov-row{border-top:0}
.ov-sum{display:flex;flex-direction:column;gap:3px;width:100%;border:0;background:none;padding:7px 0 6px;font:inherit;color:inherit;text-align:left;cursor:pointer;min-width:0}
.ov-sum:hover .ov-ini{text-decoration:underline}
.ov-sum:focus-visible{outline:2px solid #217A78;outline-offset:2px;border-radius:6px}
.ov-l1{display:flex;align-items:center;gap:6px;min-width:0}
.ov-ini{font-size:13.5px;flex:0 0 auto}
.ov-id{font-size:11.5px;color:#6B665E;flex:0 0 auto}
.ov-st{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:11px;padding:1px 8px}
.ov-ar{margin-left:auto;flex:0 0 auto;display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:700;color:#fff;background:#B23A22;border-radius:999px;padding:2px 8px 2px 4px;white-space:nowrap}
.ov-ar i{font-style:normal;width:13px;height:13px;border-radius:50%;background:#fff;color:#B23A22;font-size:10px;line-height:13px;text-align:center}
.ov-l2{font-size:12px;color:#4A453D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;max-width:100%}
.ov-row.need .ov-l2{color:#151B24;font-weight:600}
.ov-l2 em{font-style:normal;color:#6B665E;font-weight:500}
.ov-row.ref .ov-id{font-size:11px}
.ov-more{display:flex;flex-direction:column;gap:8px;padding-top:2px}
.ov-sp{list-style:none;margin:2px 0 0;padding:0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr))}
.ov-sp li{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0}
.ov-sp li:before{content:'';position:absolute;top:4px;left:-50%;right:50%;height:2px;background:#E0DACF}
.ov-sp li:first-child:before{display:none}
.ov-sp li.d:before,.ov-sp li.c:before{background:#217A78}
.ov-sp b{position:relative;z-index:1;width:10px;height:10px;border-radius:50%;border:2px solid #C9C2B6;background:#fff;box-sizing:border-box}
.ov-sp li.d b{background:#217A78;border-color:#217A78}
.ov-sp li.c b{width:12px;height:12px;margin-top:-1px;background:#1D4F43;border-color:#1D4F43;box-shadow:0 0 0 3px #DCEBE5}
.ov-sp span{font-size:9.5px;line-height:1.15;color:#6B665E;font-weight:600;text-align:center}
.ov-sp li.c span{color:#151B24;font-weight:700}
.ov-al{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.ov-a{background:#fff;border:1px solid #E6E1D9;border-radius:9px;padding:6px 8px 7px;display:flex;flex-direction:column;gap:2px;min-width:0}
.ov-a.due{border-color:#F0C3B8;box-shadow:inset 3px 0 0 #B23A22}
.ov-a.done{background:#F8F6F2}
.ov-a.done .ov-a1 b{color:#4A453D}
.ov-a1{display:flex;align-items:center;gap:6px;min-width:0}
.ov-a1 b{font-size:12.5px;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ov-a1 .chip{flex:0 0 auto;font-size:10.5px}
.ov-a2{font-size:11.5px;color:#4A453D;line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.ov-ab{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.xp .btn.ov-tb{min-height:26px;height:26px;padding:0 8px;font-size:11.5px;gap:5px;border-radius:7px;flex:0 0 auto}
.xp .btn.ov-tb.ov-sc svg{color:#217A78}.xp .btn.ov-tb.ov-en svg{color:#3B4FA0}
.xp .btn.ov-tb[aria-busy="true"]{opacity:.6;cursor:progress}
.ov-none{font-size:12.5px;color:#6B665E;padding:10px 0}
.ov-file{align-self:flex-start;font-size:12px}
`;
})();
