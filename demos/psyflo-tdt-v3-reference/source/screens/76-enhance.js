/* Scan & Enhance (round 10): the extension's second button, for licensed clinical staff (PSY.can('enhance'); clinical record
   content needs PSY.can('clinicalRecords'); only the role's caseload can be picked).
   1 · Pick: Patient (the caseload) + Document (Comprehensive Needs Assessment · Daily Progress Note · Collateral Contact · Monthly Review Note ·
       Admission Screening · SRA) → Enhance. Works from any Lauris page: Psyflo "scans the patient's chart" (Simulated) and
       finds that document in Lauris (a note: today's when it is written, else the latest one on file). On a document page both are preset.
   2 · Auto-scan: opening one of those documents in Lauris scans it with no click. The Scan & Enhance button and the collapsed pill show the
       recommendation count; with the panel open (and no Scribe session on the page) the result shows in the work area.
   3 · The result: "This document" (what it is, patient, date/author/status, what is in it, what is missing) → the recommendation cards
       (Identified issue · Why it matters · Supporting evidence (PSY.ev.cite, or "Not documented · collect it": Psyflo never fills a gap) ·
       Policy reference (PSY.rules) · Suggested improvement (editable) · Accept / Edit / Reject) → the document (original vs enhanced) → Approve.
   4 · Push, on PSY.sync (Original → AI Draft → Clinician Edited → Approved → Synchronized): on the document's own Lauris page,
       Save & Push to Lauris (a processed note: Save as addendum). Elsewhere: "Open <document> in Lauris" (keeps the approved draft;
       push there) or Save & Copy ("Copy only · Lauris not updated").
   SRA, after the push: Required fields · Process Form in Lauris · Sign in Forms to Approve · Submit (simulated):
   Required-field validation → Final review → PDF capture (PSY.pdf, PSY.download) → Submission package → Simulated payer submission →
   Confirmation number → Status tracking (PSY.auth, Authorizations).
     PSY.enhance = { begin(o), isOpen(), openFor(caseId, o), open(route, o), close(), reset(), select(laurisId, type), run(), count(),
                     ui(), docOf(), cards(), validate(caseId, o), TYPES }
   State: PSY.state.enh[docKey] = { scanned, src, step, dec:{card:'acc'|'rej'}, txt:{card:text}, ed:{card:true}, fe:{field:text}, edits:{}, pushed:{} }
          PSY.state.enhSub[caseId] = { started, n (steps done), val, rev, pdf, pkg, ref }
   Sync keys: 'dpn|<laurisId>|<date>' (shared with the Scribe), 'pa|<caseId>', 'enh|<form>|<laurisId>', 'note|<collateral|monthly>|<laurisId>|<date>'.
   Scenario hook: PSY.presenter.prep.s3 (s4 is in 77-flow-initial.js). */
(function () {
  'use strict';
  const PSY = window.PSY;
  if (!PSY || !PSY.ext || !PSY.ext.work) return;
  const esc = PSY.esc;
  const E = (PSY.enhance = PSY.enhance || {});
  const L2 = () => PSY.l2 || {};
  const F = () => (PSY.l2 && PSY.l2.form) || {};
  const FA = () => (F().act || {});
  const SY = () => PSY.sync;
  const ME = () => (PSY.user ? PSY.user().name : 'Jordan Perez, LPC');
  const SYS = () => (PSY.r5 || {}).SYS || 'Psyflo (system)';
  const lab = (k, t) => (PSY.ev ? PSY.ev.label(k, t) : '');
  const SIM = () => lab('illustrative', 'Simulated');
  const cite = (l, cid) => (PSY.ev ? PSY.ev.cite(l, cid) : '');
  const ruleOf = (id) => (id && PSY.rules ? PSY.rules.byId(id) : null);
  const toast = (m) => PSY.ui.toast(m);
  const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  /* the extension says "patient" (Lauris's own pages keep "consumer") */
  const pt = (s) => String(s == null ? '' : s).replace(/\b(C|c)onsumer(s?)\b/g, (m, a, b) => (a === 'C' ? 'Patient' : 'patient') + b);
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const TODAY = '2026-10-29';
  const SCAN_MS = 1300;
  const AFTER_SIGN = ['ready', 'submitted', 'pending', 'info', 'approved', 'partial', 'denied', 'recon', 'appeal', 'closed'];
  const AFTER_SUB = ['submitted', 'pending', 'info', 'approved', 'partial', 'denied', 'recon', 'appeal', 'closed'];
  const ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3"/><path d="M12 7.5l1.3 3.2 3.2 1.3-3.2 1.3L12 16.5l-1.3-3.2L7.5 12l3.2-1.3z"/></svg>';
  /* the issue categories (the prompt's examples first) */
  const CAT = {
    func: 'Missing functional impairment', int: 'Incomplete intervention', resp: 'Missing response', goal: 'Weak goal link',
    cs: 'Insufficient concurrent SRA evidence', contra: 'Contradictory information', unsup: 'Unsupported medical-necessity statement',
    docp: 'Missing payer-required documentation', doc: 'Missing documentation', mn: 'Missing medical-necessity evidence',
    prior: 'Prior treatment outcome missing', coord: 'Care coordination not documented', blank: 'Section left blank', decide: 'Clinician decision',
    form: 'Not in the form', need: 'Continuing need not stated', req: 'Request details missing', prog: 'Progress not measured', fam: 'Family involvement not described',
  };
  const ABSENT = 'Not documented · collect it';
  /* a box tall enough for its text (the panel fits about 44 characters a line) */
  const rowsFor = (t, min, max) => { const x = String(t == null ? '' : t); const n = x.split('\n').reduce((a, l) => a + Math.max(1, Math.ceil(l.length / 44)), 0); return Math.max(min || 2, Math.min(max || 7, n)); };

  /* the six documents, in the order the clinician asked for them; route = the Lauris page; scribe = the Scribe type that can start one */
  const TYPES = [
    { k: 'cna', label: 'Comprehensive Needs Assessment', route: 'lauris-cna', scribe: 'intake' },
    { k: 'dpn', label: 'Daily Progress Note', route: 'lauris-dpn', scribe: 'dpn' },
    { k: 'collateral', label: 'Collateral Contact', route: 'lauris-collateral', scribe: 'collateral' },
    { k: 'monthly', label: 'Monthly Review Note', route: 'lauris-monthly', scribe: 'monthly' },
    { k: 'adm', label: 'Admission Screening', route: 'lauris-screening', scribe: 'admission' },
    { k: 'pa', label: 'Initial SRA', route: 'lauris-dmas', scribe: null, sra: 'init' },
    { k: 'pac', label: 'Concurrent SRA', route: 'lauris-dmas', scribe: null, sra: 'cont' }, // round 13: SRA wording, two options
  ];
  const typeOf = (k) => TYPES.find((t) => t.k === k) || null;
  E.TYPES = TYPES.map((t) => ({ k: t.k, label: t.label }));

  /* what Scan & Enhance shows: open (auto = opened by an auto-scan, gives way to the Scribe), the dropdowns (sel) and the result (shown) */
  const ui = { open: false, auto: false, sel: null, shown: null, lastPage: null };
  let phase = 'result'; // 'scan' | 'result'
  let scanT = null;
  let busy = null; // 'push' while Psyflo types into Lauris
  let focusCard = null;
  const pdfCache = {};

  /* ------------------------------------------------------------------ the page, the caseload, a selection → a document */
  const TRANSIENT = ['scribe', 'fill', 'auto', 'action'];
  const keyOf = (id, params) => { const p = params || {}; return id + '|' + Object.keys(p).filter((k) => TRANSIENT.indexOf(k) < 0 && p[k] != null && p[k] !== '').sort().map((k) => k + '=' + p[k]).join('&'); };
  const routeKey = (route) => { const i = route.indexOf('?'); return i < 0 ? keyOf(route, {}) : keyOf(route.slice(0, i), Object.fromEntries(new URLSearchParams(route.slice(i + 1)))); };
  const pageKey = () => { const c = PSY.current(); return keyOf(c.id, c.params); };
  const ds = (k) => { const m = (PSY.state.enh = PSY.state.enh || {}); const s = (m[k] = m[k] || {}); ['dec', 'txt', 'ed', 'fe', 'edits', 'pushed', 'o0'].forEach((x) => { s[x] = s[x] || {}; }); return s; };
  /* a field's original text is kept as it was before Scan & Enhance wrote anything */
  const keepOriginal = (S, cards) => cards.forEach((c) => { const live = c.original; if (!live || live.kept) return; const f = () => { if (S.o0[c.id] == null) S.o0[c.id] = live(); return S.o0[c.id]; }; f.kept = true; c.original = f; });
  const isIso = (x) => /^\d{4}-\d{2}-\d{2}$/.test(x || '');
  const mmdd = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? m[2] + '/' + m[3] : ''; };
  const usd = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? m[2] + '/' + m[3] + '/' + m[1] : ''; };
  const monD = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? MON[+m[2] - 1] + ' ' + (+m[3]) : ''; };
  const LD = () => PSY.data.lauris;
  const mine = () => { try { return PSY.caseload ? PSY.caseload() : LD().consumers.map((c) => c.id); } catch (e) { return []; } };
  const inCase = (id) => mine().indexOf(String(id)) >= 0;
  const iniOf = (id) => (LD().byId(String(id)) || {}).ini || '';
  const canScan = (sel) => !!sel && PSY.can('enhance') && PSY.can('clinicalRecords') && inCase(sel.c);

  /* the document a Lauris page shows: { c: laurisId, t: type, inst: 'today' | a past date | '' } */
  function pageSel(cur) {
    cur = cur || PSY.current(); const p = cur.params || {}; const L = LD();
    if (cur.app && cur.app !== 'lauris') return null;
    const con = () => L.byId(String(p.c || '4471')) || L.byId('4471');
    if (cur.id === 'lauris-dpn') return { c: con().id, t: 'dpn', inst: isIso(p.past) ? p.past : 'today' };
    if (cur.id === 'lauris-collateral' || cur.id === 'lauris-monthly') return { c: con().id, t: cur.id === 'lauris-collateral' ? 'collateral' : 'monthly', inst: isIso(p.past) ? p.past : 'today' };
    if ((cur.id === 'lauris-screening' || cur.id === 'lauris-cna') && PSY.lf) return { c: PSY.lf.child(p, '4492').id, t: cur.id === 'lauris-screening' ? 'adm' : 'cna', inst: '' };
    if (cur.id === 'lauris-dmas' || cur.id === 'lauris-case') {
      const cid = p.case && PSY.caseById(p.case) ? p.case : (p.id && PSY.caseById(p.id) ? p.id : 'R-0416');
      const c = L.byCase(cid); if (!c || !L2().kind || !L2().kind(cid)) return null;
      return { c: c.id, t: L2().kind(cid) === 'cont' ? 'pac' : 'pa', inst: '' };
    }
    return null;
  }
  /* the patient a page is about (a consumer file, a list filtered to one…) */
  const pagePatient = () => { const ps = pageSel(); if (ps) return ps.c; const x = PSY.ctx && PSY.ctx.patient ? PSY.ctx.patient() : null; return x ? x.laurisId : null; };
  const pick = (s) => (s ? s.c + '|' + s.t : '');

  /* ---- reading Lauris (state, so it works from any page) ---- */
  const dpnFlag = (cid, k) => PSY.flag('l1b.dpn.' + cid + '.f.' + k);
  function todayVals(cid) { const v = {}; FIELDS.forEach(([k]) => { const x = dpnFlag(cid, k); v[k] = x == null ? (k === 'date' ? usd(TODAY) : '') : String(x); }); return v; }
  function todayText(cid) {
    const v = todayVals(cid); if (!FIELDS.some(([k]) => k !== 'date' && norm(v[k]))) return '';
    return PSY.dpn && PSY.dpn.compose ? PSY.dpn.compose(v) : FIELDS.map(([k, l]) => l + ': ' + v[k]).join('\n');
  }
  const pastNotes = (cid) => ((PSY.dpn && PSY.dpn.PAST) || {})[cid] || [];
  const pastOf = (cid, iso) => pastNotes(cid).find((p) => p.date === iso) || null;
  const latestPast = (cid) => pastNotes(cid).map((p) => p.date).sort().reverse()[0] || '';
  const dpnAddenda = (cid, iso) => ((((PSY.state.dpn8 || {}).add) || {})[cid + '|' + iso]) || [];

  /* a selection → the document in Lauris: { type, key, skey, c, cid, route, open, name, label, reads, … } or { none: 'No … in Lauris for X', latest?, scribe? } */
  function resolve(sel) {
    if (!sel) return null; const c = LD().byId(String(sel.c)); const T = typeOf(sel.t); if (!c || !T) return null;
    let d;
    if (T.k === 'dpn') d = dpnDesc(c, sel.inst || '');
    else if (T.k === 'collateral' || T.k === 'monthly') d = noteDesc(c, T.k, sel.inst || '');
    else if (T.k === 'adm' || T.k === 'cna') d = lfDesc(c, T.k);
    else d = paDesc(c, T.sra);
    d.T = T; d.t = T.k; d.c = d.c || c; d.cid = d.cid || c.case;
    if (d.none) d.key = 'none|' + T.k + '|' + c.id; else d.onPage = onPageOf(d);
    return d;
  }
  function dpnDesc(c, inst) {
    let past = isIso(inst) ? inst : '';
    if (past && !pastOf(c.id, past)) return { none: 'No Daily Progress Note of ' + usd(past) + ' for ' + c.ini };
    if (!past && !todayText(c.id)) {
      const lp = latestPast(c.id); const latest = lp ? { label: 'DPN ' + mmdd(lp), inst: lp } : null;
      if (inst === 'today') return { none: 'Today’s Daily Progress Note for ' + c.ini + ' is empty', latest, scribe: true };
      if (!lp) return { none: 'No Daily Progress Note in Lauris for ' + c.ini, scribe: true };
      past = lp;
    }
    const iso = past || TODAY; const d8 = mmdd(iso);
    /* the sync record is the Scribe's own (dpn|<id>|<date>): one version of the note, whichever module wrote it */
    return { type: 'dpn', key: 'dpn|' + c.id + '|' + (past || 'today'), skey: 'dpn|' + c.id + '|' + iso, c, cid: c.case, past, review: !!past, iso, date: d8, us: usd(iso), mon: monD(iso),
      name: (past ? 'DPN ' + d8 : 'Today’s DPN') + ' · ' + c.ini, label: 'Daily Progress Note ' + d8 + ' · ' + c.ini, reads: ['DPN ' + d8, 'ISP', 'Intake'].concat(past ? [] : ['Track Time']),
      route: 'lauris-dpn?c=' + c.id + (past ? '&past=' + past : ''), open: past ? 'DPN ' + d8 : 'Daily Progress Note' };
  }
  function noteDesc(c, t, inst) {
    const D = PSY.dpn; const T = typeOf(t); if (!D || !D.session) return { none: 'No ' + T.label + ' in Lauris for ' + c.ini };
    let past = isIso(inst) ? inst : ''; const list = D.sessions(t, c.id);
    if (past && !list.some((x) => x.past === past)) return { none: 'No ' + T.label + ' of ' + usd(past) + ' for ' + c.ini };
    if (!past && !norm(D.session(t, c.id, '').note)) {
      const lp = (list.find((x) => x.past) || {}).past || ''; const latest = lp ? { label: T.label + ' ' + mmdd(lp), inst: lp } : null;
      if (inst === 'today') return { none: 'Today’s ' + T.label + ' for ' + c.ini + ' is empty', latest, scribe: true };
      if (!lp) return { none: 'No ' + T.label + ' in Lauris for ' + c.ini, scribe: true };
      past = lp;
    }
    const s = D.session(t, c.id, past); const iso = past || TODAY;
    return { type: 'note', sub: t, s, key: 'note|' + t + '|' + c.id + '|' + (past || 'today'), skey: 'note|' + t + '|' + c.id + '|' + (t === 'monthly' && !past ? '2026-10' : iso), c, cid: c.case, past, iso, us: usd(iso),
      name: T.label + ' · ' + c.ini, label: T.label + ' ' + (t === 'monthly' && !past ? 'October 2026' : mmdd(iso)) + ' · ' + c.ini,
      reads: t === 'monthly' ? ['Monthly Summary', 'Daily notes', 'ISP', 'Contacts'] : ['Collateral Contact ' + mmdd(iso), 'ISP', 'Daily notes', 'Contacts'],
      route: T.route + '?c=' + c.id + (past ? '&past=' + past : ''), open: T.label };
  }
  function lfDesc(c, t) {
    const id = t === 'adm' ? 'adm' : 'cna'; const K = PSY.lf; const T = typeOf(t);
    if (!K || !K.forms[id]) return { none: 'No ' + T.label + ' in Lauris for ' + c.ini };
    /* round 14: the Intake (CNA) of every patient but T.W. is scanned against the record (76b-cna-scan.js): drafted where the record has it,
       flagged where it does not, never "nothing to change" while the form's boxes are empty */
    const scan = id === 'cna' && !!(PSY.cnaScan && PSY.cnaScan.applies(c));
    /* T.W.'s screening and intake are the demo's; another patient's form exists once something was entered in it */
    const st = (PSY.state.lf || {})[id + '|' + c.id];
    const has = c.id === '4492' || !!(st && (st.processed || Object.keys(st.v || {}).some((k) => norm(st.v[k]))));
    /* Lauris's file lists every other patient's screening and intake as processed on the intake date: that form, addendum only */
    if (!has && !scan) return lfpDesc(c, t);
    return { type: 'lf', scan, lf: id, key: 'lf|' + id + '|' + c.id, skey: 'enh|' + id + '|' + c.id, c, cid: c.case, name: T.label + ' · ' + c.ini, label: (id === 'adm' ? 'Admission Screening' : 'Intake') + ' · ' + c.ini,
      reads: id === 'adm' ? ['Admission Screening', 'Referral'] : scan ? ['Lauris Medications', 'Lauris Allergies', 'Case record', 'Signed documents'] : ['Intake', 'Admission Screening', 'Referral'], route: (id === 'adm' ? 'lauris-screening' : 'lauris-cna') + '?c=' + c.id, open: T.label };
  }
  function lfpDesc(c, t) {
    const id = t === 'adm' ? 'adm' : 'cna'; const T = typeOf(t); const date = PSY.l1a && PSY.l1a.intake ? String(PSY.l1a.intake(c) || '') : '';
    return { type: 'lfp', lf: id, key: 'lfp|' + id + '|' + c.id, skey: 'add|' + id + '|' + c.id, c, cid: c.case, date, name: T.label + ' · ' + c.ini, label: T.label + ' ' + date + ' · ' + c.ini,
      reads: [T.label + ' ' + date.slice(0, 5), 'Daily notes'], route: (id === 'adm' ? 'lauris-screening' : 'lauris-cna') + '?c=' + c.id, open: T.label };
  }
  function paDesc(c, want) {
    const cid = c.case; const kind = cid && L2().kind ? L2().kind(cid) : null;
    if (!kind) return { none: 'No SRA form for ' + c.ini };
    if (want && kind !== want) return { none: 'No ' + (want === 'cont' ? 'concurrent' : 'initial') + ' SRA form for ' + c.ini };
    const tw = cid === 'R-0416', mr = cid === 'R-0411';
    return { type: kind, key: 'dmas|' + cid, skey: 'pa|' + cid, c, cid, name: (kind === 'cont' ? 'Concurrent SRA' : 'Initial SRA') + ' · ' + c.ini, label: ((L2().SHORT || {})[kind] || 'Request') + ' · ' + c.ini,
      reads: kind === 'cont' ? ['DMAS form', mr ? '61 notes' : 'Notes', 'ISP', 'CNA'] : ['DMAS form', tw ? 'Screening 10/16' : 'Screening', tw ? 'Intake 10/20' : 'Intake', tw ? 'ISP 10/21' : 'ISP'],
      route: 'lauris-dmas?case=' + cid, open: 'SRA' };
  }
  /* is that document the page on screen? (push happens only there) */
  function onPageOf(d) {
    const ps = pageSel(); if (!ps || ps.c !== d.c.id || ps.t !== d.t) return false;
    if (d.type === 'dpn' || d.type === 'note') return (isIso(ps.inst) ? ps.inst : '') === (d.past || '');
    return true;
  }
  /* patient-level and record-level access (prompt §2): the role's caseload, and clinical record content */
  function access(d) {
    if (!d || !d.c || !d.c.id) return '';
    if (!PSY.can('clinicalRecords')) return 'Restricted · clinical access';
    if (!inCase(d.c.id)) return 'Not on your caseload';
    return '';
  }
  /* the shown document (null while picking) */
  const cur = () => (ui.open && ui.shown ? resolve(ui.shown) : null);
  const curDoc = () => { const d = cur(); return d && !d.none ? d : null; };

  /* ------------------------------------------------------------------ auto-scan, open, scan, close */
  const repaint = () => { try { PSY.ext.work.paint(); } catch (e) { console.error('enhance paint', e); } try { if (PSY.scribe && PSY.scribe.paint) PSY.scribe.paint(); } catch (e) {} };
  const reduce = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  /* a Scribe session on this page (recording, its chooser, a transcript or a draft it shows): an auto-scan does not take the work area */
  function scribeBusy() {
    const Sc = PSY.scribe; if (!Sc || !Sc.ctx) return false;
    try {
      if (Sc.run) return true;
      if ((PSY.current().params || {}).scribe) return true;
      const c = Sc.ctx(); const key = Sc.key(c); const u = Sc.ui || {};
      if ((u.starting && Date.now() - (u.startAt || 0) < 4000) || u.choose === key || u.gen === key) return true;
      const st = Sc.get(c); if (st && ['rec', 'review', 'draft'].indexOf(st.stage) >= 0 && !st.closed) return true;
    } catch (e) {}
    return false;
  }
  /* recommendations still to review on a document (the auto-scan count) */
  function pendingCount(d) {
    try {
      if (!d || d.none) return 0;
      if (d.type === 'dpn') {
        /* the note as Lauris has it now (a note changed since its last scan is counted afresh, without touching that review) */
        const S = ds(d.key); readDpn(d, S); const now = noteText(d);
        const S1 = norm(S.src) === norm(now) ? S : Object.assign({}, S, { src: now, dec: {}, txt: {}, ed: {}, fe: {} });
        return pendingOf(S1, dpnCards(d, S1)).length;
      }
      return pendingOf(ds(d.key), cardsOf(d)).length;
    } catch (e) { console.error('enhance count', e); return 0; }
  }
  let countMemo = { k: '', n: 0 };
  function pageCount() {
    if (!PSY.can('enhance') || !PSY.can('clinicalRecords')) return 0;
    const cur0 = PSY.current(); if (cur0.app !== 'lauris') return 0;
    const k = pageKey() + '#' + PSY.rev + '#' + PSY.role(); if (countMemo.k === k) return countMemo.n;
    const ps = pageSel(); const n = ps && canScan(ps) ? pendingCount(resolve(ps)) : 0;
    countMemo = { k: pageKey() + '#' + PSY.rev + '#' + PSY.role(), n }; return n;
  }
  E.count = () => pageCount();
  function afterShow(d) {
    const S = ds(d.key); const first = !S.scanned; S.scanned = PSY.now();
    if (d.type === 'dpn') readDpn(d, S, true);
    if (first && d.cid && PSY.audit) PSY.audit.add({ case: d.cid, action: 'Scanned with Scan & Enhance', by: SYS(), doc: d.name, silent: true });
    PSY.save();
  }
  function startScan() {
    clearTimeout(scanT); phase = 'scan';
    const key = JSON.stringify(ui.shown);
    scanT = setTimeout(() => {
      scanT = null; if (!ui.open || JSON.stringify(ui.shown) !== key) return;
      phase = 'result'; const d = curDoc(); if (d) afterShow(d); repaint(); afterPaint();
    }, reduce() ? 0 : SCAN_MS);
  }
  /* show a selection's result: 'scan' (Scanning…, then the result from its first step) or 'result' (at once, where the clinician left it) */
  const showSel = (s, how) => {
    ui.sel = Object.assign({}, s); ui.shown = Object.assign({}, s); const d = curDoc();
    if (how === 'scan') { if (d) ds(d.key).step = 'recs'; startScan(); } else { clearTimeout(scanT); phase = 'result'; if (d) afterShow(d); }
  };
  /* a new Lauris page: an open session follows a document page (and stays on any other page); an auto-scan opens on a document with
     recommendations when the panel is open and no Scribe session is on the page */
  function onNav() {
    const c0 = PSY.current(); if (c0.app !== 'lauris') return;
    const pk = pageKey(); if (pk === ui.lastPage) return; ui.lastPage = pk;
    const act = (c0.params || {}).action;
    const ps = pageSel(c0); const d = ps && canScan(ps) ? resolve(ps) : null; const has = !!(d && !d.none);
    if (ui.open && !ui.auto) {
      if (has) { const s = curDoc(); if (!s || s.key !== d.key) showSel(ps, 'scan'); else { ui.sel = Object.assign({}, ps); ui.shown = Object.assign({}, ps); } }
      if (act) focusCard = 'a-' + act;
      return;
    }
    if (ui.open && ui.auto) { ui.open = false; ui.auto = false; }
    if (has && PSY.ext.mode() === 'sidebar' && !scribeBusy() && pendingCount(d) > 0) {
      ui.open = true; ui.auto = true; busy = null; focusCard = act ? 'a-' + act : null; showSel(ps, 'scan');
    }
  }
  E.isOpen = () => { onNav(); return !!ui.open && PSY.can('enhance') && !(ui.auto && scribeBusy()); };
  E.docOf = () => curDoc();
  E.ui = () => ({ open: E.isOpen(), auto: ui.auto, sel: ui.sel ? Object.assign({}, ui.sel) : null, shown: ui.shown ? Object.assign({}, ui.shown) : null, phase, count: pageCount() });
  /* the dropdowns when nothing is preset: the page's patient (else the last one picked, else the first of the caseload) and the last document type */
  function defaultSel() {
    const ids = mine(); const ps = pageSel(); const pp = pagePatient(); const prev = ui.sel || ui.shown;
    const c = pp && ids.indexOf(pp) >= 0 ? pp : prev && ids.indexOf(prev.c) >= 0 ? prev.c : ids[0] || '';
    const t = ps && ps.c === c ? ps.t : (prev && prev.t) || 'dpn';
    return { c, t, inst: ps && ps.c === c && ps.t === t ? ps.inst : '' };
  }
  /* the Scan & Enhance button */
  E.begin = (o) => {
    o = o || {};
    if (!PSY.can('enhance')) { toast('Not available in this view.'); return; }
    const c0 = PSY.current(); if (c0.app !== 'lauris') PSY.go('lauris-consumers');
    ui.lastPage = pageKey(); focusCard = o.focus || null; busy = null;
    const ps = pageSel();
    if (ps && canScan(ps)) {
      const d = resolve(ps); const s = curDoc(); const same = ui.open && s && d && !d.none && s.key === d.key;
      if (!same || o.rescan) showSel(ps, o.rescan ? 'scan' : 'result');
    } else if (!ui.open || !ui.shown) { ui.sel = defaultSel(); ui.shown = null; }
    ui.open = true; ui.auto = false;
    if (PSY.ext.mode() === 'collapsed') PSY.ext.set(true);
    repaint(); if (phase === 'result') afterPaint();
  };
  E.close = () => { ui.open = false; ui.auto = false; busy = null; clearTimeout(scanT); phase = 'result'; repaint(); };
  /* the form page was left mid-push (its typing timers stop): nothing is typing any more */
  E.reset = () => { busy = null; };
  E.select = (c, t) => { ui.sel = { c: String(c), t, inst: '' }; repaint(); };
  E.run = () => { if (!ui.sel) ui.sel = defaultSel(); ui.open = true; ui.auto = false; focusCard = null; showSel(ui.sel, 'scan'); repaint(); };
  /* open a route with Scan & Enhance open on it (a document route: its result; another page: that patient, o.type or the SRA) */
  function openOn(route, o) {
    o = o || {};
    const id = route.split('?')[0]; const params = Object.fromEntries(new URLSearchParams(route.split('?')[1] || ''));
    PSY.state.ext.open = true; PSY.state.ext.mode = 'sidebar'; PSY.state.ext.seen = true; PSY.save();
    ui.open = true; ui.auto = false; focusCard = o.focus || null; busy = null;
    const ps = pageSel({ id, params, app: 'lauris' });
    let sel = ps && canScan(ps) ? ps : null;
    if (!sel) {
      const lc = params.c ? LD().byId(String(params.c)) : LD().byCase(params.case || params.id || '');
      if (lc && canScan({ c: lc.id })) sel = { c: lc.id, t: o.type || (lc.case && L2().kind && L2().kind(lc.case) ? (L2().kind(lc.case) === 'cont' ? 'pac' : 'pa') : (ui.sel || {}).t || 'dpn'), inst: '' };
    }
    if (sel) { ui.sel = Object.assign({}, sel); ui.shown = Object.assign({}, sel); } else { ui.sel = null; ui.shown = null; }
    const d = curDoc();
    if (d && o.step) ds(d.key).step = o.step;
    phase = d && !(o.rescan === false && ds(d.key).scanned) ? 'scan' : 'result';
    const c0 = PSY.current();
    ui.lastPage = routeKey(route);
    if (!(c0.app === 'lauris' && routeKey(route) === pageKey())) PSY.go(route);
    ui.lastPage = pageKey();
    if (!ui.sel) ui.sel = defaultSel();
    if (phase === 'scan') startScan(); else if (d) afterShow(d);
    repaint(); if (phase === 'result') afterPaint();
  }
  E.openFor = (cid, o) => {
    o = o || {}; const kind = L2().kind ? L2().kind(cid) : null; const lc = LD().byCase(cid);
    const route = kind ? 'lauris-dmas?case=' + cid : (lc ? 'lauris-consumer?c=' + lc.id : 'lauris-consumers');
    if (!PSY.can('enhance')) { PSY.go(route); return; }
    /* a signed request: open on the document step, at the submission */
    const st = PSY.auth ? PSY.auth.status(cid) : '';
    if (kind && AFTER_SIGN.indexOf(st) >= 0 && !o.step) { o.step = 'doc'; o.focus = o.focus || 'enh-steps'; }
    openOn(route, Object.assign({ rescan: false }, o));
  };
  E.open = (route, o) => openOn(route, o);

  /* the old focused review of an initial or concurrent SRA opens Scan & Enhance on its Lauris form */
  const origFocus = PSY.ext.focus;
  if (origFocus && !origFocus.enh) {
    const f = function (flow, caseId, step) {
      const k = flow || (caseId && PSY.flows && PSY.flows.kindFor ? PSY.flows.kindFor(caseId) : 'initial');
      if ((k === 'initial' || k === 'continued') && caseId) { E.openFor(caseId); return; }
      return origFocus(flow, caseId, step);
    };
    f.enh = true; PSY.ext.focus = f;
  }
  /* opening the collapsed panel on a document with recommendations shows them (unless the Scribe is at work on the page) */
  const origSet = PSY.ext.set;
  if (origSet && !origSet.enh) {
    const s = function (o) {
      const was = PSY.ext.mode(); const r = origSet.apply(this, arguments);
      if (o && was === 'collapsed' && !ui.open) {
        const ps = pageSel(); const d = ps && canScan(ps) ? resolve(ps) : null;
        if (d && !d.none && !scribeBusy() && pendingCount(d) > 0) { ui.open = true; ui.auto = true; ui.lastPage = pageKey(); showSel(ps, 'result'); repaint(); }
      }
      return r;
    };
    s.enh = true; PSY.ext.set = s;
  }
  /* the count on the Scan & Enhance button and on the collapsed pill */
  const plural = (n) => n + ' recommendation' + (n === 1 ? '' : 's');
  const Sc0 = PSY.scribe;
  if (Sc0 && Sc0.quickInner && !Sc0.quickInner.enh) {
    const q0 = Sc0.quickInner;
    const q = function () {
      const h = q0.apply(this, arguments); const n = pageCount(); if (!n) return h;
      return h.replace(/(data-act="xq-enhance"[^>]*>[\s\S]*?<\/b>)/, '$1<small data-psy="enh-count" title="' + plural(n) + '">' + n + ' to review</small>');
    };
    q.enh = true; Sc0.quickInner = q;
  }
  const origPill = PSY.ext.pillHtml;
  if (origPill && !origPill.enh) {
    const pl = function (o) {
      const h = origPill.apply(this, arguments); const n = pageCount(); if (!n) return h;
      return h.replace(/<\/button>\s*$/, '<span class="xpc-st xpc-en" data-psy="pill-enh"><i aria-hidden="true"></i>' + plural(n) + '</span></button>');
    };
    pl.enh = true; PSY.ext.pillHtml = pl;
  }
  /* Reset Demo / a scenario: Scan & Enhance starts closed */
  const origReset = PSY.reset;
  if (origReset && !origReset.enh) { const rs = function () { ui.open = false; ui.auto = false; ui.sel = null; ui.shown = null; ui.lastPage = null; clearTimeout(scanT); phase = 'result'; busy = null; return origReset.apply(this, arguments); }; rs.enh = true; PSY.reset = rs; }

  /* after the result is painted: bring a card (or the submission) asked for into view */
  function afterPaint() {
    if (!focusCard) return; const id = focusCard; focusCard = null;
    setTimeout(() => {
      const r = PSY.activeRoot(); const el = r && (r.querySelector('[data-card-id="' + id + '"]') || r.querySelector('[data-psy="' + id + '"]')); const w = r && r.querySelector('[data-psy="work"]'); if (!el || !w) return;
      const k = PSY.k || 1; const top = (el.getBoundingClientRect().top - w.getBoundingClientRect().top) / k + w.scrollTop - 8; w.scrollTop = Math.max(0, top);
      const box = el.querySelector('textarea,input'); if (box) { try { box.focus({ preventScroll: true }); } catch (e) {} }
      el.classList.add('hl'); setTimeout(() => el.classList.remove('hl'), 1800);
    }, 60);
  }

  /* ------------------------------------------------------------------ the work area */
  PSY.ext.work.register('enhance', {
    html: () => {
      if (!E.isOpen()) return '';
      try { return view(); } catch (e) { console.error('enhance view', e); return '<div class="en"><div class="en-empty">Could not scan this document</div></div>'; }
    },
  });
  function view() {
    if (!ui.sel) ui.sel = defaultSel();
    const pend = !ui.shown || pick(ui.sel) !== pick(ui.shown);
    const d = pend ? null : resolve(ui.shown);
    const live = d && !d.none && !access(d);
    const head = '<div class="en-h"><span class="en-ic">' + ICON + '</span><div class="en-ht"><b>Scan &amp; Enhance</b></div>' +
      (live && phase === 'result' ? '<button class="en-ib" data-act="enh-rescan" title="Scan again" aria-label="Scan again">↻</button>' : '') +
      '<button class="en-ib" data-act="enh-close" data-psy="enh-close" title="Close" aria-label="Close Scan & Enhance">×</button></div>';
    if (!PSY.can('clinicalRecords')) return '<div class="en" data-psy="enhance" data-doc="none">' + head + '<div class="en-empty" data-psy="enh-restricted"><b>Restricted · clinical access</b></div></div>';
    const pp = pagePatient();
    const note = pp && !inCase(pp) ? '<div class="en-note" data-psy="enh-restricted">' + esc(iniOf(pp)) + ' · Not on your caseload</div>' : '';
    let body = '';
    if (d) body = d.none ? noneHtml(d) : access(d) ? '<div class="en-empty" data-psy="enh-restricted"><b>' + esc(access(d)) + '</b></div>' : phase === 'scan' ? scanning(d) : result(d);
    return '<div class="en" data-psy="enhance" data-doc="' + esc(d ? (d.none ? 'none' : d.type) : 'pick') + '" data-phase="' + (pend ? 'pick' : phase) + '"' + (d && !d.none ? ' data-on-page="' + (d.onPage ? 1 : 0) + '"' : '') + '>' + head + note + pickHtml(pend) + body + '</div>';
  }
  /* Patient · Document · Enhance */
  function pickHtml(pend) {
    const ids = mine(); const s = ui.sel || {};
    const pOpts = LD().consumers.filter((x) => ids.indexOf(x.id) >= 0).map((x) => '<option value="' + x.id + '"' + (x.id === s.c ? ' selected' : '') + '>' + esc(x.ini) + ' · #' + x.id + '</option>').join('');
    const tOpts = TYPES.map((t) => '<option value="' + t.k + '"' + (t.k === s.t ? ' selected' : '') + '>' + esc(t.label) + '</option>').join('');
    return '<div class="en-pick' + (pend ? ' pend' : '') + '" data-psy="enh-pick"><label class="en-pl"><span>Patient</span><select class="en-ps" data-psy="enh-patient" data-change="enh-sel" data-k="c">' + pOpts + '</select></label>' +
      '<label class="en-pl"><span>Document</span><select class="en-ps" data-psy="enh-type" data-change="enh-sel" data-k="t">' + tOpts + '</select></label>' +
      (pend ? '<button class="btn p en-go" data-act="enh-run" data-psy="enh-run"' + (ids.length ? '' : ' disabled') + '>' + ICON + 'Enhance</button>' : '') + '</div>';
  }
  function scanning(d) {
    const reads = (d.onPage ? [] : ['Chart · ' + d.c.ini]).concat(d.reads);
    return '<div class="en-scan" data-psy="enh-scanning"><div class="en-sh"><span class="en-spin" aria-hidden="true"></span><b>Scanning…</b>' + SIM() + '</div>' +
      '<div class="en-reads" data-psy="enh-reads">' + reads.map((r, i) => '<span style="--i:' + i + '"><i aria-hidden="true">✓</i>' + esc(r) + '</span>').join('<em aria-hidden="true">·</em>') + '</div></div>';
  }
  /* no such document for the patient: say so; a note type can be started with the Scribe; a note on an earlier day can be scanned instead */
  function noneHtml(d) {
    const T = d.T; const links = [];
    if (d.scribe && T.scribe && PSY.scribe && PSY.can('scribe:' + T.scribe) && inCase(d.c.id)) links.push('<button class="en-lk" data-act="enh-scribe" data-t="' + T.k + '" data-c="' + esc(d.c.id) + '" data-psy="enh-start-scribe">Start it with Scribe<span aria-hidden="true">›</span></button>');
    if (d.latest) links.push('<button class="en-lk" data-act="enh-inst" data-inst="' + esc(d.latest.inst) + '" data-psy="enh-latest">Scan ' + esc(d.latest.label) + ' · ' + esc(d.c.ini) + '<span aria-hidden="true">›</span></button>');
    return '<div class="en-empty" data-psy="enh-none"><b>' + esc(d.none) + '</b>' + (links.length ? '<div class="en-links">' + links.join('') + '</div>' : '') + '</div>';
  }
  function result(d) { return ({ dpn: dpnView, init: paView, cont: paView, lf: lfView, lfp: lfpView, note: noteView })[d.type](d); }
  /* ================================================================== cards: shared model and html
     card = { id, kind, cat, issue, why, cites[], absent, rule, prov:'ai'|'need'|'ehr', need, editable,
              text() → the enhanced text for the document, ready() → has a value, edited(), read() html, edit() html, inForm,
              field (document label), sec, original() }
     a card's decision: 'pending' | 'acc' | 'rej' | 'form' (already in Lauris) */
  const decOf = (S, c) => (c.inForm ? 'form' : c.decided ? c.decided() : (S.dec[c.id] || 'pending'));
  const pendingOf = (S, cards) => cards.filter((c) => decOf(S, c) === 'pending');
  const isEditing = (S, c) => !!(c.need || S.ed[c.id]);
  function cardHtml(d, S, c) {
    const id = esc(c.id); const st = decOf(S, c);
    if (st !== 'pending') {
      const T = { acc: ['✓', c.accLabel || 'Accepted'], rej: ['✕', 'Rejected'], form: ['✓', 'In the form'] }[st];
      const undo = st === 'form' || (c.decided && st === 'acc') || busy ? '' : '<button class="lnk5" data-act="enh-undo" data-card="' + id + '" data-psy="enh-undo">Undo</button>';
      return '<div class="en-dc ' + st + '" data-card-id="' + id + '" data-dec="' + st + '"><i aria-hidden="true">' + T[0] + '</i><div class="en-dct"><b>' + esc(pt(c.cat)) + '</b><span>' + esc(pt(c.issue)) + '</span></div><span class="en-dcs">' + T[1] + '</span>' + undo + '</div>';
    }
    const editing = isEditing(S, c);
    const prov = c.edited && c.edited() ? lab('reviewed') : lab(c.prov);
    const ev = (c.cites || []).map((l) => cite(l, d.cid)).join('') + (c.absent ? '<span class="en-none" data-psy="enh-absent">' + esc(c.absent) + '</span>' : '');
    const pol = c.rule ? '<dt>Policy reference</dt><dd data-f="policy"><span class="en-polh">' + PSY.rules.chip(c.rule) + '<span>' + esc(c.rule.source) + '</span></span><span class="en-pol">' + esc(c.rule.text) + '</span></dd>' : '';
    const sug = editing && c.edit ? c.edit() : c.read();
    const dis = busy ? ' disabled' : '';
    return '<article class="en-card' + (c.need ? ' need' : '') + '" data-card-id="' + id + '" data-dec="pending" data-kind="' + esc(c.kind) + '">' +
      '<div class="en-ch"><span class="en-cat" data-f="cat">' + esc(pt(c.cat)) + '</span><span data-lab="' + id + '">' + prov + '</span></div>' +
      '<b class="en-iss" data-f="issue">' + esc(pt(c.issue)) + '</b>' +
      '<dl class="en-f"><dt>Why it matters</dt><dd data-f="why">' + esc(pt(c.why)) + '</dd>' +
      '<dt>Supporting evidence</dt><dd data-f="evidence"><span class="en-cites">' + ev + '</span></dd>' + pol +
      '<dt>Suggested improvement</dt><dd data-f="suggest">' + sug + '</dd></dl>' +
      '<div class="en-acts"><button class="btn p s" data-act="enh-acc" data-card="' + id + '" data-psy="enh-accept"' + dis + '>Accept</button>' +
      (c.editable && !editing ? '<button class="btn o s" data-act="enh-edit" data-card="' + id + '" data-psy="enh-edit"' + dis + '>Edit</button>' : '') +
      '<button class="btn o s" data-act="enh-rej" data-card="' + id + '" data-psy="enh-reject"' + dis + '>Reject</button></div></article>';
  }
  /* a plain text card (DPN fields, drafted DMAS boxes, statements, documents to collect) */
  function textCard(S, x) {
    const c = Object.assign({ kind: 'text', editable: true, cites: [], prov: 'ai' }, x); c.need = c.prov === 'need';
    c.text = () => { const t = S.txt[c.id]; return t != null ? t : (x.suggest || ''); };
    c.edited = () => S.txt[c.id] != null && norm(S.txt[c.id]) !== norm(x.suggest || '');
    c.ready = () => !!norm(c.text());
    c.read = () => (x.lines ? '<ul class="en-lines">' + x.lines.map((l) => '<li>' + esc(l) + '</li>').join('') + '</ul>' : '<p class="en-sug" data-psy="enh-sug">' + (norm(c.text()) ? esc(c.text()) : '—') + '</p>');
    c.edit = () => '<textarea class="en-ta" rows="' + rowsFor(c.text(), c.need ? 3 : 2, 8) + '" data-input="enh-txt" data-card="' + esc(c.id) + '"' + (c.need ? ' data-psy="enh-need" placeholder="What was collected"' : '') + ' aria-label="' + esc(c.need ? 'What was collected: ' + c.issue : 'Suggested improvement: ' + c.issue) + '">' + esc(c.text()) + '</textarea>';
    c.setText = (v) => { S.txt[c.id] = v; };
    if (!c.original) c.original = () => '';
    return c;
  }
  /* the work-area frame of a document: "This document", the two steps, then the step (the version flow and the sync bar on the document step) */
  function frame(d, S, cards, o) {
    const step = S.step === 'doc' ? 'doc' : 'recs';
    if (step === 'doc') ensureSync(d, o);
    const pend = pendingOf(S, cards).length;
    let h = step === 'recs' ? describeHtml(d, S, cards, o) : '';
    h += '<div class="en-tabs" role="tablist" aria-label="Scan & Enhance steps"><button role="tab" aria-selected="' + (step === 'recs') + '" class="' + (step === 'recs' ? 'on' : '') + '" data-act="enh-step" data-step="recs" data-psy="enh-tab-recs">1 · Recommendations' + (pend ? '<span class="n">' + pend + '</span>' : '') + '</button>' +
      '<button role="tab" aria-selected="' + (step === 'doc') + '" class="' + (step === 'doc' ? 'on' : '') + '" data-act="enh-step" data-step="doc" data-psy="enh-tab-doc">2 · ' + esc(o.docTab || 'Document') + '</button></div>';
    if (step === 'recs') h += recsHtml(d, S, cards);
    else h += '<div class="en-vf" data-psy="enh-flow">' + SY().flowHtml(d.skey) + '</div><div class="en-doc" data-psy="enh-doc">' + o.doc() + '</div>' + sbarHtml(d, S, cards, o) + (o.after && d.onPage ? o.after() : '');
    SY().writer(d.skey, o.writer);
    SY().onChange(d.skey, (x, t) => { if (t && t.typing) partial(); else repaint(); });
    return h;
  }
  function recsHtml(d, S, cards) {
    if (!cards.length) return '<div class="en-alld" data-psy="enh-nothing">✓ Nothing to change</div>';
    const pend = pendingOf(S, cards); const need = pend.filter((c) => c.need).length;
    const canAll = pend.some((c) => !c.need && !c.decided && c.ready());
    return '<div class="en-cap"><span class="cap">Recommendations</span><span data-psy="enh-left">' + (pend.length ? pend.length + ' to review' + (need ? ' · ' + need + ' need' + (need === 1 ? 's' : '') + ' you' : '') : 'All reviewed') + '</span></div>' +
      (canAll ? '<button class="btn o s en-all" data-act="enh-acc-all" data-psy="enh-acc-all"' + (busy ? ' disabled' : '') + '>Accept all suggestions</button>' : '') +
      '<div class="en-list" data-psy="enh-cards">' + cards.map((c) => cardHtml(d, S, c)).join('') + '</div>' +
      '<button class="btn ' + (pend.length ? 'o' : 'p') + ' en-next" data-act="enh-step" data-step="doc" data-psy="enh-to-doc">Review document</button>';
  }
  /* Save draft · Approve · Save & Push (PSY.sync); Approve waits until every recommendation is reviewed */
  function sbarHtml(d, S, cards, o) {
    const sd = SY().get(d.skey); if (!sd) return '';
    const pend = pendingOf(S, cards).length; const appr = sd.stage === 'approved' || sd.stage === 'synced';
    let acts = SY().actionsHtml(d.skey, { pushLabel: o.push, copy: !d.onPage });
    /* not on the document's page: open it in Lauris (the approved draft is kept) and push there; Save & Copy is the fallback */
    if (!d.onPage) acts = acts.replace(/<button[^>]*data-act="sync-(?:push|retry)"[^>]*>[^<]*<\/button>/, '<button type="button" class="btn p s" data-act="enh-open-doc" data-psy="enh-open-doc">Open ' + esc(d.open) + ' in Lauris</button>');
    if (pend && !appr) acts = acts.replace('data-act="sync-approve"', 'data-act="sync-approve" disabled');
    if (busy) acts = acts.replace(/<button /g, '<button disabled ');
    return '<div class="en-sbar" data-psy="enh-sbar"><div class="en-sst">' + SY().stateHtml(d.skey) + (o.match && d.onPage ? o.match(sd) : '') +
      (pend && !appr ? '<span class="en-why" data-psy="enh-pending-why">Review ' + pend + ' first</span>' : '') + '</div>' + acts + '</div>';
  }
  /* the version record is made when the clinician first acts on the result (an auto-scan alone changes nothing) */
  function ensureSync(d, o) {
    if (!SY()) return;
    if (d.type === 'dpn') { syncDpn(d, ds(d.key)); return; }
    if (SY().get(d.skey)) return;
    o = o || optsOf(d);
    SY().init(d.skey, { original: o.original(), ai: aiText(d), label: d.label });
    const t = textOf(d); if (t != null && t !== SY().get(d.skey).text) SY().edit(d.skey, t);
  }
  /* the AI Draft: every suggestion as Psyflo wrote it (no decision, no edit) */
  function aiText(d) {
    const S = ds(d.key); const S0 = Object.assign({}, S, { dec: {}, txt: {}, ed: {}, fe: {}, edits: {} });
    return d.type === 'dpn' ? dpnText(d, S0) : d.type === 'init' || d.type === 'cont' ? paText(d, S0) : d.type === 'lf' ? lfText(d, S0) : d.type === 'note' ? noteSync(d, S0) : d.type === 'lfp' ? lfpText(d, S0) : '';
  }
  /* the document text changed (a decision, an edit): the sync record follows (Clinician Edited · Unsaved Changes) */
  function touch(d) {
    if (!d || !d.skey || !SY()) return; ensureSync(d); const sd = SY().get(d.skey); if (!sd || sd.state === 'syncing') return;
    const t = textOf(d); if (t != null && t !== sd.text) SY().edit(d.skey, t);
  }
  const textOf = (d) => (d.type === 'dpn' ? dpnText(d, ds(d.key)) : d.type === 'init' || d.type === 'cont' ? paText(d, ds(d.key)) : d.type === 'lf' ? lfText(d, ds(d.key)) : d.type === 'note' ? noteSync(d, ds(d.key)) : d.type === 'lfp' ? lfpText(d, ds(d.key)) : null);
  const cardsOf = (d) => (d.type === 'dpn' ? (readDpn(d, ds(d.key)), dpnCards(d, ds(d.key))) : d.type === 'init' || d.type === 'cont' ? paCards(d, ds(d.key)) : d.type === 'lf' ? lfCards(d, ds(d.key)) : d.type === 'note' ? noteCards(d, ds(d.key)) : d.type === 'lfp' ? lfpCards(d, ds(d.key)) : []);
  E.cards = () => { const d = curDoc(); return d ? cardsOf(d).map((c) => ({ id: c.id, kind: c.kind, cat: pt(c.cat), issue: pt(c.issue), why: pt(c.why), cites: c.cites, absent: c.absent || '', rule: c.rule ? c.rule.id : null, prov: c.prov, dec: decOf(ds(d.key), c), text: c.text() })) : []; };
  /* "This document": what it is, the patient, date / author / status, what is in it (data) and what is missing (counts) */
  function describeHtml(d, S, cards, o) {
    const x = o.describe ? o.describe() : { what: d.name, status: '', facts: [] };
    const pend = pendingOf(S, cards); const need = pend.filter((c) => c.need).length;
    const miss = !cards.length ? 'Nothing found' : pend.length ? plural(pend.length) + (need ? ' · ' + need + ' need' + (need === 1 ? 's' : '') + ' you' : '') : 'All reviewed';
    const rows = [['Patient', esc(d.c.ini) + ' · #' + esc(d.c.id)]].concat(x.facts || []).concat([['Missing', '<span data-psy="enh-missing-n">' + esc(miss) + '</span>']]);
    return '<section class="en-this" data-psy="enh-this"><div class="en-th"><span class="cap">This document</span>' + (d.onPage ? '<span class="en-on" data-psy="enh-onpage">On screen</span>' : '<span class="en-ch2" data-psy="enh-offpage">From the chart ' + SIM() + '</span>') + '</div>' +
      '<b class="en-tt" data-psy="enh-what">' + esc(x.what) + '</b>' + (x.status ? '<span class="en-ts" data-psy="enh-status">' + esc(x.status) + '</span>' : '') +
      '<dl class="en-kv2">' + rows.map((r) => '<dt>' + r[0] + '</dt><dd data-k="' + r[0].toLowerCase() + '">' + r[1] + '</dd>').join('') + '</dl></section>';
  }
  /* while typing: repaint only the version flow and the sync bar (the textarea keeps focus) */
  function partial() {
    const d = curDoc(); const r = PSY.activeRoot(); if (!d || !d.skey || !r || !E.isOpen()) return;
    const S = ds(d.key); const o = optsOf(d); const cards = cardsOf(d);
    const f = r.querySelector('[data-psy="enh-flow"]'); if (f) f.innerHTML = SY().flowHtml(d.skey);
    const b = r.querySelector('[data-psy="enh-sbar"]'); if (b) b.outerHTML = sbarHtml(d, S, cards, o);
  }
  const optsOf = (d) => (d.type === 'dpn' ? dpnOpts(d) : d.type === 'lf' ? lfOpts(d) : d.type === 'note' ? noteOpts(d) : d.type === 'lfp' ? lfpOpts(d) : paOpts(d));

  /* ================================================================== DPN: today's note, or a past one (Review mode, addendum only) */
  /* the Lauris labels (the note's text format); the extension shows SHOWN (it says "patient") */
  const FIELDS = [['date', 'Service date'], ['goal', 'Treatment goal'], ['intervention', 'Intervention performed'], ['duration', 'Duration'], ['response', 'Consumer response'], ['progress', 'Progress or barriers'], ['needs', 'Continuing clinical needs']];
  const SHOWN = { date: 'Service date', goal: 'Treatment goal', intervention: 'Intervention performed', duration: 'Duration', response: 'Patient response', progress: 'Progress or barriers', needs: 'Continuing clinical needs' };
  const SHORT = { goal: 'Goal', intervention: 'Intervention', duration: 'Duration', response: 'Response', progress: 'Progress', needs: 'Needs' };
  const LABEL_RE = /^\s*(Service date|Treatment goal|Intervention performed|Duration|Consumer response|Progress or barriers|Continuing clinical needs)\s*:/mi;
  const VERB_RE = /\b(observed|monitored|watched)\b/gi;
  const PLAN_RE = /\b(?:will\s+)?continue\s+to\s+(?:monitor|observe)\b|\bwill\s+monitor\b/i;
  const GOALREF_RE = /\b(ISP )?(goal|objective|obj\.)\s*\d/i;
  const INTS = [
    [/basketball|shoot(?:ing)? hoops|movement|\bwalk(?:ed)?\b|stretch/i, 'Clinical 2.1 Movement'],
    [/\bpeers?\b|classmate|shov|\bpush(?:ed)?\b|conflict|turn-taking|took turns|other player/i, 'QMHP 1.9 Solving peer conflict'],
    [/danger|parking lot|left the building|elope|unsafe/i, 'QMHP 1.6 Recognize danger / healthy boundaries'],
  ];
  const GOAL_RE = [[1, /frustrat|upset|walk(?:ed)? (?:out|off)|left (?:the room|(?:his|her|their) seat)|leav(?:e|ing) the room|calm|coping|escalat|walked away/i], [2, /\bpeers?\b|classmate|shov|\bpush|\bhit\b|conflict/i], [3, /on[ -]task|stay(?:ed)? in class|full period|\bmath\b|lesson/i]];
  const RESP_RE = /\b(came back|returned|re-?engaged|went back|calmed|back to (?:class|task|the (?:court|room|game))|rejoined|used (?:his|her|their) words|responded)\b/i;
  const INTENS_RE = /\b(mild|moderate|severe|high|low)\b/i;
  const PROMPT_RE = /\b(prompts?|prompted|independent(?:ly)?|on (?:his|her|their) own)\b/i;
  const GOALS_DEFAULT = [
    { n: 1, name: 'emotional regulation', obj: 'T.W. will use a taught coping strategy before leaving the room in 4 of 5 escalations.' },
    { n: 2, name: 'peer conflict', obj: 'T.W. will respond to peer conflict without physical contact in 4 of 5 incidents.' },
    { n: 3, name: 'staying in class', obj: 'T.W. will stay in class for the full period on 4 of 5 school days.' },
  ];
  /* the patient's ISP goals: the DMAS form when the case has one, else the ISP 2.0 goals of the record */
  function ispGoals(c) {
    const C = c && c.case && L2().content ? (L2().content(c.case) || {}) : {};
    const base = (PSY.l1b && PSY.l1b.data && PSY.l1b.data.ispGoals) || GOALS_DEFAULT;
    return base.map((g, i) => { const own = (C['g' + (i + 1) + '.obj'] || {}).t; return { n: g.n || i + 1, name: g.name, obj: own && /\d+ of \d+/.test(own) && /^[A-Z]\.[A-Z]\./.test(own) ? own : String(g.obj).replace(/^T\.W\./, c ? c.ini : 'T.W.') }; });
  }
  function sentences(t) {
    const DOT = '․'; const prot = t.replace(/\b([A-Z])\.([A-Z])\./g, '$1' + DOT + '$2' + DOT).replace(/\b([ap])\.m\./g, '$1' + DOT + 'm' + DOT);
    return (prot.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [prot]).map((s) => s.split(DOT).join('.').trim()).filter(Boolean);
  }
  const toMin = (s) => { const m = /^(\d{1,2}):(\d\d)/.exec(String(s || '')); if (!m) return 0; let h = +m[1]; if (h < 7) h += 12; return h * 60 + +m[2]; };
  /* the duration the note states: a time range anywhere, else minutes in the intervention sentence */
  function durOf(all, first) {
    let m = /\b(\d{1,2}:\d\d)\s*(?:–|-|to)\s*(\d{1,2}:\d\d)(?:\s*[ap]\.?m\.?)?/i.exec(all || '');
    if (m) return { phrase: m[0], mins: toMin(m[2]) - toMin(m[1]), label: m[0].trim() };
    m = /\b(?:for\s+)?(?:about\s+)?(\d{1,3})\s*(?:minutes|minute|mins|min)\b/i.exec(first || '');
    if (m) return { phrase: m[0], mins: +m[1], label: m[1] + ' min' };
    return null;
  }
  /* Track Time entries for the patient today (owner T9's PSY.time; the round-8 list is read the same way) */
  function timeList(d) {
    if (d.past) return []; const T = PSY.time; if (!T || !T.entries) return [];
    let l = null;
    try { if (T.link) l = T.entries({ laurisId: d.c.id, date: TODAY }); } catch (e) { l = null; }
    if (!Array.isArray(l)) { try { l = T.entries(d.c.ini); } catch (e) { l = []; } }
    return (l || []).filter((e) => e && e.status !== 'draft').map((e) => {
      const s = String(e.s || e.start || ''); const en = String(e.e || e.end || ''); let m = e.m != null ? e.m : e.minutes != null ? e.minutes : e.mins;
      if (m == null && s && en) m = toMin(en) - toMin(s);
      return { id: e.id, s, e: en, m: Math.round(+m || 0), what: String(e.what || e.desc || e.description || e.intervention || ''), dpn: e.dpn || null };
    }).filter((e) => e.m > 0);
  }
  const STOP = ['with', 'from', 'time', 'started', 'extension', 'intervention', 'support', 'classes', 'voice', 'memo'];
  /* the Track Time entry of this session: entries linked to the note, else the one whose description matches the note */
  function trackOf(d, all, ints) {
    const list = timeList(d); if (!list.length) return null;
    const key = 'dpn|' + d.c.id + '|' + TODAY; const linked = list.filter((e) => e.dpn === key);
    if (linked.length) { const m = linked.reduce((n, e) => n + e.m, 0); return { m, label: linked.map((e) => e.s + '–' + e.e).join(', ') + ', ' + m + ' min (Track Time, linked)', n: linked.length }; }
    const hay = (all + ' ' + ints.join(' ')).toLowerCase(); let best = null; let bs = 0;
    list.forEach((e) => { const s = e.what.toLowerCase().split(/[^a-z-]+/).filter((w) => w.length >= 4 && STOP.indexOf(w) < 0).filter((w) => hay.indexOf(w) >= 0).length; if (s > bs) { bs = s; best = e; } });
    return best ? { m: best.m, label: best.s + '–' + best.e + ', ' + best.m + ' min (Track Time)', n: 1, e: best } : null;
  }
  /* the note as Lauris holds it (state, so it reads the same from any page): today's fields as labelled text, or a past note's text */
  function noteText(d) { if (d.past) { const p = pastOf(d.c.id, d.past); return p ? p.text : ''; } return todayText(d.c.id); }
  /* read the note; a note changed since the last scan starts its review over */
  /* the note the result is about: read at the scan (a scan of a changed note starts its review over); kept while the clinician works on it */
  function readDpn(d, S, rescan) {
    let src = noteText(d);
    if (S.src != null && rescan && norm(S.src) !== norm(src)) { S.dec = {}; S.txt = {}; S.ed = {}; S.fe = {}; S.step = 'recs'; }
    if (S.src == null || rescan) S.src = src;
    const cid = d.cid; src = S.src;
    if (cid && PSY.ev) {
      PSY.ev.excerpt(cid, 'Daily note ' + d.mon, src || '(empty)');
      ispGoals(d.c).forEach((g) => PSY.ev.excerpt(cid, 'ISP 2.0 · Goal ' + g.n, 'Individual Service Plan 2.0 · Goal ' + g.n + ' · ' + g.name + ': ' + g.obj));
      const ap = (PSY.l1b && PSY.l1b.APPROVED) || [];
      if (ap.length) PSY.ev.excerpt(cid, 'ISP 2.0 · interventions', 'Interventions on the ISP 2.0 picklist: ' + ap.join(' · '));
      const tl = timeList(d); if (tl.length) PSY.ev.excerpt(cid, 'Time log ' + d.mon, 'Track Time · ' + d.c.ini + ' · ' + d.mon + ': ' + tl.map((e) => e.s + '–' + e.e + ' ' + e.what + ' (' + e.m + ' min)').join(' · '));
    }
  }
  function syncDpn(d, S) {
    readDpn(d, S); const src = S.src;
    /* the shared sync record: created here, or (the Scribe wrote this note) a new AI Draft on it after each scan of a changed note */
    if (SY() && norm(src)) {
      const ai = aiText(d); const sd = SY().get(d.skey); let fresh = false;
      if (!sd) { SY().init(d.skey, { original: src, ai, label: d.label }); fresh = true; }
      else if (S.aiFor !== norm(src) && sd.state !== 'syncing' && norm(sd.text) !== norm(ai)) { SY().setAi(d.skey, ai); fresh = true; }
      S.aiFor = norm(src);
      /* decisions already made on this note: the version is the clinician's edit of the AI Draft */
      if (fresh) { const now = dpnText(d, S); if (norm(now) !== norm(SY().get(d.skey).text)) SY().edit(d.skey, now); }
    }
    PSY.save();
  }
  /* the note as fields: a labelled note (owner A9's seven DPN fields) is parsed; a narrative (a past note) is split into sentences */
  function dpnAn(d, S) {
    const src = String(S.src || ''); let all = norm(src); const out = { cards: [], base: {}, structured: false };
    FIELDS.forEach(([k]) => { out.base[k] = ''; });
    out.base.date = d.us;
    if (!all) return out;
    const structured = LABEL_RE.test(src) && PSY.dpn && PSY.dpn.parse; out.structured = !!structured;
    let first = ''; let planS = [];
    if (structured) {
      const v = PSY.dpn.parse(src); FIELDS.forEach(([k]) => { out.base[k] = norm(v[k] || ''); }); if (!out.base.date) out.base.date = d.us;
      first = out.base.intervention; all = norm(FIELDS.filter(([k]) => k !== 'date').map(([k]) => out.base[k]).join(' '));
    } else {
      const sents = sentences(all); first = sents[0] || '';
      const goalS = sents.slice(1).filter((s) => GOALREF_RE.test(s)); planS = sents.slice(1).filter((s) => PLAN_RE.test(s));
      const rest = sents.slice(1).filter((s) => goalS.indexOf(s) < 0 && planS.indexOf(s) < 0);
      Object.assign(out.base, { goal: goalS.join(' '), intervention: first, response: rest.join(' '), needs: planS.join(' ') });
    }
    const dur = out.base.duration ? (durOf(out.base.duration, out.base.duration) || { phrase: '', mins: 0, label: out.base.duration }) : durOf(structured ? first : all, first);
    if (dur && !out.base.duration) out.base.duration = dur.label;
    const named = (n) => all.toLowerCase().indexOf(n.toLowerCase()) >= 0 || all.toLowerCase().indexOf(n.replace(/^(Clinical|QMHP) [\d.]+ /, '').toLowerCase()) >= 0;
    const ints = INTS.filter(([re, n]) => re.test(all) && !named(n)).map((x) => x[1]);
    const noteL = 'Daily note ' + d.mon; const timeL = 'Time log ' + d.mon; const goals = ispGoals(d.c);
    const push = (x) => out.cards.push(x);
    /* 1 · the intervention: a watching verb, or no ISP intervention named */
    const bad = (/\b(observed|monitored|watched)\b/i.exec(first) || [])[1];
    if (first && (bad || ints.length)) {
      let sug = first; if (dur && dur.phrase && sug.indexOf(dur.phrase) >= 0 && !/–|-|to/.test(dur.phrase)) sug = sug.replace(dur.phrase, '').replace(/\s+([.,;])/g, '$1').replace(/\s{2,}/g, ' ').trim();
      sug = sug.replace(VERB_RE, (m) => (m[0] === m[0].toUpperCase() ? 'Worked with' : 'worked with'));
      if (ints.length) sug = sug.replace(/[.!?]+$/, '') + ' (' + ints.join('; ') + ').';
      const B = bad ? bad[0].toUpperCase() + bad.slice(1).toLowerCase() : '';
      push({ id: 'int', field: 'intervention', cat: CAT.int, issue: bad ? '“' + B + '” reads as watching' + (ints.length ? '; no ISP intervention named' : '') : 'No ISP intervention named',
        why: bad ? 'An audit can read “' + bad.toLowerCase() + '” as no service, so the note names what staff did.' : 'The note should name the ISP intervention staff used.',
        cites: [noteL].concat(ints.length ? ['ISP 2.0 · interventions'] : []), prov: 'ai', suggest: sug, fallback: first });
    }
    /* 2 · the ISP goal */
    if (!norm(out.base.goal) && !GOALREF_RE.test(all)) {
      const gn = (GOAL_RE.find(([, re]) => re.test(all)) || [1])[0]; const g = goals[gn - 1] || goals[0];
      push({ id: 'goal', field: 'goal', cat: CAT.goal, issue: 'No ISP goal named', why: 'The note should show which ISP goal the session worked on.', cites: ['ISP 2.0 · Goal ' + g.n], prov: 'ai', suggest: 'Goal ' + g.n + ': ' + g.obj, fallback: out.base.goal });
    }
    /* 3 · duration: the note against Track Time; a gap is collected, never assumed */
    const tr = trackOf(d, all, ints); const units = ruleOf('tdt-units');
    if (dur && dur.mins && tr && Math.abs(dur.mins - tr.m) >= 5) {
      push({ id: 'dur', field: 'duration', cat: CAT.contra, issue: 'Note says ' + dur.mins + ' min; Track Time logged ' + tr.m + ' min', why: 'Units are counted from recorded time, so the note and the time log must agree.', cites: [noteL, timeL], rule: units, prov: 'ai', suggest: tr.label, fallback: out.base.duration });
    } else if (!dur && !norm(out.base.duration) && !(d.past && (pastOf(d.c.id, d.past) || {}).direct)) {
      if (tr) push({ id: 'dur', field: 'duration', cat: CAT.int, issue: 'Duration not in the note', why: 'Units are counted from recorded time.', cites: [timeL], rule: units, prov: 'ai', suggest: tr.label, fallback: '' });
      else push({ id: 'dur', field: 'duration', cat: CAT.int, issue: 'Duration not documented', why: 'Units are counted from recorded time.', cites: [], absent: ABSENT, rule: units, prov: 'need', suggest: '', fallback: '' });
    }
    /* 4 · the patient's response to the intervention */
    if (!RESP_RE.test(out.base.response || (structured ? '' : all.replace(first, '')))) {
      push({ id: 'resp', field: 'response', mode: 'add', cat: CAT.resp, issue: 'No response to the intervention', why: 'Without a response, the note does not show whether the intervention helped.', cites: [noteL], absent: ABSENT, prov: 'need', suggest: '' });
    }
    /* 5 · functional impairment: intensity and the prompting needed */
    const noI = !INTENS_RE.test(all); const noP = !PROMPT_RE.test(all);
    if (noI || noP) {
      push({ id: 'fx', field: 'progress', mode: 'add', cat: CAT.func, issue: noI && noP ? 'Intensity and prompting not documented' : noI ? 'Intensity not documented' : 'Prompting not documented', why: 'Intensity and the prompts needed show the level of impairment the service treats.', cites: [noteL], absent: ABSENT, prov: 'need', suggest: '' });
    }
    /* 6 · continuing clinical needs: "will continue to monitor" names none */
    const plan = out.base.needs;
    if (PLAN_RE.test(plan) || (structured && !norm(plan))) {
      push({ id: 'needs', field: 'needs', cat: CAT.need, issue: norm(plan) ? '“' + plan.replace(/[.]$/, '') + '” names no clinical need' : 'Continuing clinical needs not stated', why: 'The next step should follow from the ISP goal and today’s response.', cites: [noteL], absent: ABSENT, prov: 'need', suggest: '', fallback: plan });
    }
    return out;
  }
  function dpnCards(d, S) { return dpnAn(d, S).cards.map((x) => textCard(S, Object.assign({ original: () => '' }, x))); }
  /* the enhanced value of one field: an edit on the document step wins; else the card's decision; else the note */
  function fieldVal(f, an, cards, S) {
    if (S.fe[f] != null) return norm(S.fe[f]);
    const base = norm(an.base[f] || ''); const c = cards.find((x) => x.field === f); if (!c) return base;
    const st = decOf(S, c);
    if (st === 'rej') return c.mode === 'add' ? base : norm(c.fallback != null ? c.fallback : base);
    const t = norm(c.text());
    if (c.mode === 'add') return [base, t].filter(Boolean).join(' ');
    return t || norm(c.fallback != null ? c.fallback : base);
  }
  const dpnVals = (d, S) => { const an = dpnAn(d, S); const cards = dpnCards(d, S); const v = {}; FIELDS.forEach(([f]) => { v[f] = fieldVal(f, an, cards, S); }); return v; };
  /* today's note: every field, labelled (PSY.dpn.compose); an addendum: only the fields that have text */
  function dpnText(d, S) {
    const v = dpnVals(d, S);
    /* an addendum: the fields that have text; on a labelled note (a processed DPN), only the fields that changed */
    if (asAddendum(d)) { const o = LABEL_RE.test(S.src || '') && PSY.dpn && PSY.dpn.parse ? PSY.dpn.parse(S.src) : null; return FIELDS.filter(([k]) => k !== 'date' && v[k] && (!o || norm(o[k]) !== v[k])).map(([k, l]) => l + ': ' + v[k]).join('\n'); }
    if (PSY.dpn && PSY.dpn.compose) return PSY.dpn.compose(v);
    return FIELDS.map(([k, l]) => l + ': ' + (v[k] || '')).join('\n');
  }
  /* a past note, or today's once it is processed in Lauris, only takes an addendum */
  const asAddendum = (d) => !!d.past || !!PSY.flag('l1b.dpn.' + d.c.id + '.processed');
  function laurisHas(d, text) {
    const n = norm(text); if (!n) return false;
    if (asAddendum(d)) return dpnAddenda(d.c.id, d.past || TODAY).some((a) => norm(a.text) === n);
    return norm(noteText(d)) === n;
  }
  function dpnOpts(d) {
    const S = ds(d.key); const add = asAddendum(d);
    return {
      push: add ? 'Save as addendum' : 'Save & Push to Lauris', docTab: add ? 'Addendum' : 'Document',
      original: () => String(S.src || ''), text: () => dpnText(d, S),
      writer: (text) => pushDpn(d, text), describe: () => dpnDescribe(d),
      match: (sd) => (sd.state === 'synced' && sd.synced != null ? (laurisHas(d, sd.synced) ? '<span class="en-ok" data-psy="enh-match">✓ Matches Lauris</span>' : '<span class="en-warn" data-psy="enh-match-no">Lauris differs</span>') : ''),
    };
  }
  async function pushDpn(d, text) {
    const root = PSY.activeRoot();
    if (!onPageOf(d)) return { ok: false, reason: 'Open the note in Lauris' };
    if (!PSY.dpn || !PSY.dpn.push) return { ok: false, reason: 'Lauris did not accept the change' };
    const add = asAddendum(d);
    const r = await PSY.dpn.push(root, text, { addendum: add, via: 'Scan & Enhance' });
    if (r && r.ok === false) return r;
    if (PSY.audit) PSY.audit.add({ case: d.cid, action: add ? 'Scan & Enhance: addendum added to the Daily Progress Note of ' + d.us : 'Scan & Enhance: approved note written to the Daily Progress Note', by: ME(), doc: 'Daily Progress Note – TDT · ' + d.c.ini + ' · ' + d.us, silent: true });
    return { ok: true };
  }
  function dpnView(d) {
    const S = ds(d.key); readDpn(d, S);
    const cards = dpnCards(d, S);
    return frame(d, S, cards, Object.assign(dpnOpts(d), { doc: () => dpnDoc(d, S, cards) }));
  }
  /* "This document" for a DPN: the date, who wrote it and whether Lauris processed it; the fields it has; the other notes on file */
  function dpnDescribe(d) {
    const S = ds(d.key); const p = d.past ? pastOf(d.c.id, d.past) : null; const facts = [];
    if (p) facts.push(['In it', esc(['Narrative', p.direct ? 'Direct time ' + p.direct : '', p.units != null ? p.units + ' units' : ''].filter(Boolean).join(' · '))]);
    else {
      const an = dpnAn(d, S); const has = FIELDS.filter(([k]) => k !== 'date' && norm(an.base[k])).map(([k]) => SHORT[k] + (k === 'duration' ? ' ' + norm(an.base[k]) : ''));
      facts.push(['In it', esc(has.join(' · ') || 'Nothing yet')]);
    }
    const others = pastNotes(d.c.id).map((x) => x.date).filter((x) => x !== d.past).sort().reverse();
    if (others.length) facts.push(['Also', others.map((x) => '<button class="lnk5" data-act="enh-inst" data-inst="' + x + '">DPN ' + mmdd(x) + '</button>').join(' · ')]);
    return { what: 'Daily Progress Note · ' + (d.past ? d.us : 'today'), status: p ? 'Processed ' + p.at + ' · ' + p.by + ' · addendum only' : asAddendum(d) ? 'Processed · addendum only' : 'Saved · not processed', facts };
  }
  /* the note as Lauris has it: a labelled note shows only the fields that have text */
  function origHtml(src) {
    if (!(LABEL_RE.test(src) && PSY.dpn && PSY.dpn.parse)) return esc(src);
    const v = PSY.dpn.parse(src); const rows = FIELDS.filter(([k]) => norm(v[k])).map(([k, l]) => '<div><b>' + esc(SHOWN[k] || l) + '</b> ' + esc(v[k]) + '</div>');
    return rows.join('') || '—';
  }
  function dpnDoc(d, S, cards) {
    const an = dpnAn(d, S); const add = asAddendum(d); const pend = pendingOf(S, cards).length;
    const rows = FIELDS.filter(([k]) => k !== 'date').map(([k, l]) => {
      const v = fieldVal(k, an, cards, S);
      return '<label class="en-fld"><span>' + esc(SHOWN[k] || l) + '</span><textarea class="en-ta" rows="' + rowsFor(v, k === 'duration' ? 1 : 2, 6) + '" data-input="enh-fld" data-fld="' + k + '" data-psy="enh-fld-' + k + '" placeholder="Not stated">' + esc(v) + '</textarea></label>';
    }).join('');
    return '<div class="en-dh"><b>Original</b><span>' + esc(d.review ? 'Processed ' + d.us : 'Lauris · ' + d.us) + '</span></div>' +
      '<div class="en-orig" data-psy="enh-orig">' + origHtml(S.src) + '</div>' +
      '<div class="en-dh"><b>' + (add ? 'Addendum' : 'Enhanced') + '</b><span>Service date ' + esc(d.us) + '</span></div>' +
      (pend ? '<div class="en-nrl" data-psy="enh-unreviewed">' + pend + ' not reviewed · <button class="lnk5" data-act="enh-step" data-step="recs">Review</button></div>' : '') +
      '<div class="en-flds" data-psy="enh-fields">' + rows + '</div>';
  }

  /* ================================================================== DMAS initial (SRA) and concurrent SRA (concurrent review) */
  const MAIN = ['crit1.sub', 'loc.b.sub', 'coordplan', 'coordsince', 'g1.progress', 'strengths', 'barriers', 'schoolfam', 'family'];
  const GCITE = {
    'R-0416': { request: ['Referral Oct 13', 'ISP Oct 21'], crit1: ['Behaviour report Oct 13', 'Screening call Oct 16', 'Schedule and grades Oct 15'], crit2: ['Prior-services conversation Oct 16', 'CNA Oct 20'], loc: ['CNA Oct 20', 'Screening call Oct 16'], coord: ['CNA Oct 20', 'ISP Oct 21'], strengths: ['CNA Oct 20', 'Intake with the guardian Oct 20'], barriers: ['CNA Oct 20', 'Behaviour report Oct 13'], schoolfam: ['ISP Oct 21', 'Intake with the guardian Oct 20'], discharge: ['ISP Oct 21'] },
    'R-0411': { request: ['SRA AUTH-4471-B', 'Direct-hours log'], coordsince: ['Monthly collateral Oct 1', 'Weekly guardian contacts'], g1: ['21 daily notes, last 30 days', 'Notes, prior period', 'Daily note Oct 21'], g23: ['23 older notes', 'Daily note Oct 14'], strengths: ['Weekly guardian contacts'], barriers: ['Daily note Oct 21', 'Daily note Oct 6'], family: ['Weekly guardian contacts'], discharge: ['ISP review Aug 11'] },
  };
  /* drafted sections: category, one sentence on why (from the form's own instructions or a cited rule), the rule */
  const GROUP = {
    request: { cat: CAT.req, why: 'The payer reviews the dates, units and hours requested.', rule: (k) => (k === 'cont' ? 'form-cs' : 'form-init') },
    crit1: { cat: CAT.func, why: 'The form asks for the frequency, intensity and duration of each behaviour.', rule: () => 'tdt-clin2' },
    crit2: { cat: CAT.prior, why: 'Criterion 2 rests on documented interventions that were tried.', rule: () => 'tdt-clin2' },
    loc: { cat: CAT.mn, why: 'Level of care needs one of the five criteria, with substantiation.', rule: () => 'tdt-loc1' },
    coord: { cat: CAT.coord, why: 'Every request explains the care coordination that has taken place.', rule: () => 'coord' },
    strengths: { cat: CAT.form, why: 'The form asks for strengths and the people the patient names as supports.', rule: (k) => (k === 'cont' ? 'form-cs' : 'form-init') },
    barriers: { cat: CAT.form, why: 'The form asks for the barriers to treatment.', rule: (k) => (k === 'cont' ? 'form-cs' : 'form-init') },
    schoolfam: { cat: CAT.coord, why: 'The form asks how TDT staff coordinate with the school and the family.', rule: () => 'form-init' },
    discharge: { cat: CAT.form, why: 'Every request explains the plan for step-down.', rule: () => 'coord' },
    coordsince: { cat: CAT.cs, why: 'The concurrent SRA form asks for care coordination since the last authorization.', rule: () => 'coord' },
    g1: { cat: CAT.cs, why: 'The form asks for progress toward each goal and what changed when progress stalled.', rule: () => 'form-cs' },
    g23: { cat: CAT.cs, why: 'Progress is asked for each goal, not only Goal 1.', rule: () => 'form-cs' },
    family: { cat: CAT.cs, why: 'The form asks for family involvement during the service period.', rule: () => 'form-cs' },
  };
  /* a recommended action's category (by criterion), with the issue a few actions read better as */
  const ACT_CAT = { crit1: CAT.func, crit2: CAT.prior, crit3: CAT.func, loc: CAT.mn, coord: CAT.coord, trauma: CAT.blank, goals: CAT.cs, docs: CAT.doc, wording: CAT.int, progress: CAT.cs, family: CAT.decide };
  const ACT_META = {
    'R-0411': { a3: { cat: CAT.contra, issue: 'The request cites an Oct 22 ISP change; the ISP in Lauris has none after Aug 11', cites: ['ISP Oct 22', 'ISP review Aug 11'] } },
  };
  /* a population finding written as if it were this patient's evidence */
  const GENERIC_RE = /[^.]*\b(?:children|youth|adolescents|individuals|kids)\s+with\b[^.]*\bat\s+(?:an\s+)?(?:increased|higher|greater)\s+risk\b[^.]*\.?(?:\s*\([^)]*\))?\.?/i;
  const SUPPORT = {
    'R-0411': { barriers: { add: 'Both recent escalations were in unstructured time: a shove at lunch on Oct 21 and an elopement on Oct 6.', cites: ['Daily note Oct 21', 'Daily note Oct 6'] } },
  };
  const isNeed = (a) => !!(a.need || a.crit === 'trauma');
  const groupFilled = (cid, g) => !!L2().get(L2().k(cid, 'filled'), false) || !!((L2().get(L2().k(cid, 'fl'), {}) || {})[g]);
  const groupKeys = (cid, g) => { const C = L2().content(cid) || {}; return Object.keys(C).filter((k) => C[k].g === g); };
  function boxText(cid, key) {
    if (!F().boxModel) return ''; const m = F().boxModel(cid, key);
    return norm([m.base].concat(m.segs.map((s) => s.text)).filter(Boolean).join(' '));
  }
  const secLabel = (kind, key) => { const s = F().secOf ? F().secOf(kind, key) : ''; const it = ((F().SECS || {})[kind] || []).find((x) => x[0] === s); return it ? it[1] : ''; };
  const secIdx = (kind, key) => { const s = F().secOf ? F().secOf(kind, key) : 'notes'; const i = ((F().SECS || {})[kind] || []).findIndex((x) => x[0] === s); return i < 0 ? 99 : i; };
  const lastSentence = (t) => { const s = sentences(norm(t)); return s.length ? s[s.length - 1] : ''; };
  /* the clinician's input for an action (kept with the form: l2.<case>.dr.<action>); Clinician Input Required starts empty */
  function inputOf(cid, a) {
    const saved = L2().get(L2().k(cid, 'dr', a.id), null); if (saved) return saved;
    const ip = a.input || {};
    if (isNeed(a)) return ip.type === 'choice' ? { i: -1 } : ip.type === 'date' ? { iso: '' } : ip.type === 'chips' ? { sel: [] } : { text: '' };
    if (ip.type === 'choice' && typeof ip.pick === 'number') return { i: ip.pick };
    return FA().draftOf ? FA().draftOf(cid, a) : { text: ip.suggestion || '' };
  }
  const valueOf = (a, inp) => (FA().valueOf ? FA().valueOf(a, inp) : String(inp.text || '').trim());
  function actCard(d, S, a, order) {
    const cid = d.cid; const ip = a.input || {}; const t = FA().target ? FA().target(cid, a) : { key: (a.lauris || {}).key || 'notes' };
    const meta = ((ACT_META[cid] || {})[a.id]) || {}; const req = PSY.reco && PSY.reco.requirement ? PSY.reco.requirement(cid, a) : { id: null };
    const hub = (PSY.data.hub || {})[cid] || {}; const id = 'a-' + a.id; const need = isNeed(a);
    const c = { id, kind: 'action', aid: a.id, a, key: t.key, cat: meta.cat || ACT_CAT[a.crit] || CAT.form, issue: meta.issue || a.title, why: meta.why || lastSentence(a.why || a.short || ''),
      cites: meta.cites || a.cites || ((hub.draft || []).find((x) => x.crit === a.crit) || {}).src || [], rule: ruleOf(req.id), prov: need ? 'need' : 'ai', need, editable: true,
      field: t.field || t.section || a.title, sec: t.secLabel || '', inForm: !!a.done, order, docEdit: true, absent: need ? (a.crit === 'family' ? 'Clinician decision' : ABSENT) : '' };
    c.inp = () => inputOf(cid, a);
    c.text = () => { const o = S.txt[id]; if (o != null) return o; const seg = L2().get(L2().k(cid, 't', a.id), null); if (a.done && seg && seg.text) return seg.text; return FA().typedOf ? FA().typedOf(a, c.inp()) : ''; };
    c.ready = () => !!valueOf(a, c.inp());
    c.edited = () => S.txt[id] != null || (!need && !!L2().get(L2().k(cid, 'dr', a.id), null));
    c.read = () => '<p class="en-sug" data-psy="enh-sug">' + (norm(c.text()) ? esc(c.text()) : '—') + '</p>';
    c.edit = () => (ip.label && (need || ip.type !== 'text') ? '<div class="en-q">' + esc(ip.label) + '</div>' : '') + inputHtml(cid, c);
    c.setText = (v) => { S.txt[id] = v; };
    c.original = () => boxText(cid, t.key);
    return c;
  }
  function inputHtml(cid, card) {
    const ip = card.a.input || {}; const v = card.inp(); const id = esc(card.id);
    if (ip.type === 'choice') return '<div class="en-opts" role="radiogroup" aria-label="' + esc(ip.label || card.issue) + '">' + (ip.options || []).map((o, i) => '<button class="en-o' + (v.i === i ? ' on' : '') + '" role="radio" aria-checked="' + (v.i === i) + '" data-act="enh-opt" data-card="' + id + '" data-i="' + i + '"><i aria-hidden="true"></i><span>' + esc(o) + '</span></button>').join('') + '</div>';
    if (ip.type === 'date') return '<input class="en-date" type="date" data-input="enh-in" data-card="' + id + '" value="' + esc(v.iso || '') + '" aria-label="' + esc(ip.label || card.issue) + '">';
    if (ip.type === 'chips') return '<div class="en-cs">' + (ip.options || []).map((o, i) => { const on = (v.sel || []).indexOf(i) >= 0; return '<button class="en-c' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="enh-chip" data-card="' + id + '" data-i="' + i + '">' + esc(o) + '</button>'; }).join('') + '</div>';
    return '<textarea class="en-ta" rows="' + rowsFor(v.text, card.need ? 4 : 2, 8) + '" data-input="enh-in" data-card="' + id + '"' + (card.need ? ' data-psy="enh-need"' : '') + ' aria-label="' + esc(ip.label || card.issue) + '">' + esc(v.text || '') + '</textarea>';
  }
  function paCards(d, S) {
    const cid = d.cid; const kind = d.type; const C = L2().content(cid) || {}; const out = [];
    const fillNow = !!(L2().fillable && L2().fillable(cid));
    const lid = (d.c || {}).id;
    /* contradictory information: the payer on the referral differs from today's eligibility (T.W.: Anthem → Humana) */
    const el = PSY.elig && lid ? PSY.elig.of(lid) : null;
    if (el && el.change && (PSY.elig.pending(lid) || S.dec['x-elig'] === 'acc' || S.elig)) {
      if (PSY.ev) PSY.ev.excerpt(cid, 'Eligibility check ' + (el.checked || '').replace(/,.*$/, ''), 'Eligibility (simulated check, ' + el.checked + '): ' + el.status + ' · ' + el.plan + ' since ' + el.since + '. Previous: ' + el.change.from + ', ended ' + el.change.fromEnded + '. The school’s referral names ' + el.change.referralSaid + '.');
      const c = textCard(S, { id: 'x-elig', kind: 'elig', cat: CAT.contra, issue: 'Payer: the referral says ' + el.change.from.split(' ')[0] + '; eligibility shows ' + el.change.to.split(' ')[0],
        why: 'The request goes to the plan responsible on the service dates.', cites: ['Referral Oct 13', 'Eligibility check ' + (el.checked || '').replace(/,.*$/, '')], prov: 'ehr', editable: false,
        suggest: 'Confirm ' + el.change.to + ' as the responsible plan.', order: -1, accLabel: 'Payer confirmed' });
      c.decided = () => (!PSY.elig.pending(lid) ? 'acc' : S.dec['x-elig'] === 'rej' ? 'rej' : 'pending');
      S.elig = true; out.push(c);
    }
    /* drafted sections (the boxes the record fills: T.W. initial, M.R. concurrent SRA) */
    if (fillNow || ((L2().GROUPS || {})[cid] && L2().mode && L2().mode(cid) === 'sent')) {
      (L2().GROUPS[cid] || []).forEach(([g, title], gi) => {
        const keys = groupKeys(cid, g); const main = MAIN.find((k) => keys.indexOf(k) >= 0) || null; const G = GROUP[g] || { cat: CAT.form, why: 'The form asks for it.', rule: () => null };
        const textKeys = keys.filter((k) => !/\.(yn|cur)$/.test(k) && String(C[k].t || ''));
        let lines = null;
        if (!main) {
          if (g === 'request') lines = [[C['req.from'] && C['req.to'] ? C['req.from'].t + ' – ' + C['req.to'].t : '', C['req.units'] ? C['req.units'].t + ' units' : '', C['req.hours'] ? C['req.hours'].t + ' h a week' : ''].filter(Boolean).join(' · ')];
          else lines = textKeys.map((k) => C[k].t).slice(0, 4);
        }
        const inForm = !fillNow || groupFilled(cid, g);
        const c = textCard(S, { id: 'g-' + g, kind: 'group', group: g, key: main || textKeys[0] || keys[0], cat: G.cat, issue: title + (inForm ? '' : ' · empty in the form'), why: G.why,
          cites: ((GCITE[cid] || {})[g]) || [], rule: ruleOf(G.rule(kind)), prov: g === 'request' ? 'ehr' : 'ai', editable: !!main, suggest: main ? String(C[main].t || '') : (lines || []).join('\n'), lines: main ? null : lines,
          field: title, sec: secLabel(kind, main || keys[0]), order: secIdx(kind, main || keys[0]) * 100 + gi, docEdit: !!main, inForm });
        c.original = () => (main ? boxText(cid, main) : textKeys.map((k) => boxText(cid, k)).filter(Boolean).join(' · '));
        out.push(c);
      });
    }
    /* unsupported medical-necessity statements: a population finding in a box, offered without it (and with the record's own facts where they exist) */
    ['barriers', 'strengths', 'crit1.sub', 'loc.b.sub', 'coordsince', 'coordplan', 'family', 'g1.progress'].forEach((key) => {
      const id = 'x-uns-' + key; const cur = boxText(cid, key); const m = GENERIC_RE.exec(cur);
      const was = S.pushed[id] != null ? S.pushed[id] : null;
      if (!m && was == null) return;
      const orig = was != null ? (S.orig = S.orig || {})[id] || '' : cur; if (m) (S.orig = S.orig || {})[id] = cur;
      const sup = (SUPPORT[cid] || {})[key] || {};
      const cleaned = norm(orig.replace(GENERIC_RE, ' ')); const sug = [cleaned, sup.add || ''].filter(Boolean).join(' ');
      const fl = key === 'barriers' ? 'Barriers to treatment' : key === 'strengths' ? 'Resources and strengths' : key;
      const c = textCard(S, { id, kind: 'box', key, cat: CAT.unsup, issue: fl + ': a general research claim, not about ' + d.c.ini, why: 'Medical necessity rests on ' + d.c.ini + '’s documented record, not on population research.',
        cites: sup.cites || [], rule: ruleOf('tdt-all3'), prov: 'ai', suggest: sug, field: fl, sec: secLabel(kind, key), order: secIdx(kind, key) * 100 + 40, docEdit: true, inForm: was != null && !m });
      c.original = () => orig; out.push(c);
    });
    /* the recommended actions (30-reco-data.js) */
    if (PSY.reco) PSY.reco.list(cid).forEach((a, ai) => {
      if (a.dismissed && !a.done) return;
      const t = FA().target ? FA().target(cid, a) : { key: 'notes' };
      out.push(actCard(d, S, a, secIdx(kind, t.key) * 100 + 50 + ai));
    });
    /* a document the record says has not arrived: collected, never assumed */
    const hub = (PSY.data.hub || {})[cid] || {}; const miss = (hub.documents || {}).missing;
    if (miss && !/^Starts when/.test(miss)) {
      const payer = /asked/i.test(miss); const req = PSY.reco && PSY.reco.requirement ? PSY.reco.requirement(cid, { crit: 'docs' }) : { id: null };
      const what = miss.replace(/\s*\(.*\)\s*$/, '');
      const c = textCard(S, { id: 'x-doc', kind: 'task', cat: payer ? CAT.docp : CAT.doc, issue: 'Not received: ' + what, why: payer ? 'The payer asked for it, so the request is incomplete without it.' : 'It supports what the form states.',
        cites: [], absent: 'Not received · collect it', rule: ruleOf(req.id), prov: 'ai', suggest: 'Request the ' + (/^[A-Z]{2}/.test(what) ? what : what.charAt(0).toLowerCase() + what.slice(1)) + ' and attach it when it arrives.', field: 'To collect', order: 9900, accLabel: 'To collect' });
      out.push(c);
    }
    keepOriginal(S, out);
    return out.sort((x, y) => (x.order || 0) - (y.order || 0));
  }
  const writes = (c) => c.kind === 'group' || c.kind === 'action' || c.kind === 'box';
  /* the document: every field Psyflo would write (not rejected), in form order */
  function paText(d, S) {
    const cards = paCards(d, S);
    return cards.filter((c) => decOf(S, c) !== 'rej' && (writes(c) || c.kind === 'task')).map((c) => '[' + (c.sec ? c.sec + ' · ' : '') + c.field + ']\n' + norm(c.text())).join('\n\n');
  }
  function paOpts(d) {
    const S = ds(d.key); const cards = () => paCards(d, S);
    return {
      push: 'Save & Push to form', docTab: 'Document',
      original: () => cards().filter((c) => writes(c)).map((c) => '[' + (c.sec ? c.sec + ' · ' : '') + c.field + ']\n' + (norm(c.original()) || 'Empty')).join('\n\n'),
      text: () => paText(d, S), writer: () => pushPa(curDoc()), describe: () => paDescribe(d),
    };
  }
  function paView(d) {
    const S = ds(d.key); const cards = paCards(d, S);
    return frame(d, S, cards, Object.assign(paOpts(d), { doc: () => paDoc(d, S, cards), after: () => stepsHtml(d, cards) }));
  }
  /* "This document" for a request: the form, the payer, its status in Lauris, the request, requirements addressed and required fields */
  function paDescribe(d) {
    const cid = d.cid; const cv = PSY.reco ? PSY.reco.coverage(cid) : { met: 0, total: 0 }; const v = validate(cid);
    const req = [boxText(cid, 'req.from') && boxText(cid, 'req.to') ? boxText(cid, 'req.from') + '–' + boxText(cid, 'req.to') : '', boxText(cid, 'req.units') ? boxText(cid, 'req.units') + ' units' : '', boxText(cid, 'req.hours') ? boxText(cid, 'req.hours') + ' h/week' : ''].filter(Boolean).join(' · ');
    const facts = [['Request', esc(req || 'Not filled in')]];
    if (cv.total) facts.push(['Addressed', '<span data-psy="enh-cov-n">' + cv.met + ' of ' + cv.total + '</span> requirements']);
    facts.push(['Required', '<span data-psy="enh-req-n">' + v.met + ' of ' + v.total + '</span> fields filled']);
    return { what: (d.type === 'cont' ? 'Concurrent SRA' : 'Initial SRA') + ' · ' + (payerOf(cid).name || ''), status: (PSY.auth ? PSY.auth.label(status(cid)) : '') + ' · DMAS ' + ((L2().EDITION || {})[d.type] || '') + ' form', facts };
  }
  function coverageHtml(cid) {
    const cv = PSY.reco ? PSY.reco.coverage(cid) : { met: 0, total: 0, items: [] }; if (!cv.total) return '';
    const seg = (i) => '<i class="' + (i.status === 'met' ? 'm' : i.status === 'partial' ? 'p' : 'o') + '" title="' + esc(i.label) + '"></i>';
    return '<div class="en-cov" data-psy="enh-coverage"><div class="en-cr"><span class="cap">Requirements addressed</span><b data-psy="enh-cov-n">' + cv.met + ' of ' + cv.total + '</b></div><div class="en-segs" aria-hidden="true">' + cv.items.map(seg).join('') + '</div></div>';
  }
  function paDoc(d, S, cards) {
    const fields = cards.filter((c) => writes(c) && decOf(S, c) !== 'rej'); const tasks = cards.filter((c) => c.kind === 'task' && decOf(S, c) === 'acc'); const elig = cards.find((c) => c.kind === 'elig');
    const pend = pendingOf(S, cards).length;
    const fd = (c) => {
      const st = decOf(S, c); const o = norm(c.original()); const ed = c.docEdit && st !== 'form' && !busy;
      return '<div class="en-fd" data-doc-card="' + esc(c.id) + '"><div class="en-fh"><b>' + esc(c.field) + '</b>' + (st === 'pending' ? '<span class="en-nr">Not reviewed</span>' : st === 'form' ? '<span class="en-ok">In the form</span>' : '') + '</div>' +
        (c.sec ? '<div class="en-fs">' + esc(c.sec) + '</div>' : '') +
        '<div class="en-fo"><span class="cap">Original</span><div class="' + (o ? '' : 'mut') + '">' + esc(o || 'Empty') + '</div></div>' +
        '<div class="en-fe"><span class="cap">Enhanced</span>' + (ed ? '<textarea class="en-ta" rows="' + rowsFor(c.text(), 2, 8) + '" data-input="enh-doc-in" data-card="' + esc(c.id) + '" aria-label="' + esc(c.field) + '">' + esc(c.text()) + '</textarea>' : '<div>' + (c.lines ? c.lines.map(esc).join('<br>') : esc(norm(c.text()) || '—')) + '</div>') + '</div></div>';
    };
    return '<div class="en-cap"><span class="cap">Original vs enhanced</span><span>' + fields.length + ' field' + (fields.length === 1 ? '' : 's') + '</span></div>' +
      (pend ? '<div class="en-nrl" data-psy="enh-unreviewed">' + pend + ' not reviewed · <button class="lnk5" data-act="enh-step" data-step="recs">Review</button></div>' : '') +
      (elig ? '<div class="en-fl1" data-psy="enh-doc-elig"><span class="cap">Payer</span>' + (decOf(S, elig) === 'acc' ? '<span class="en-ok">Confirmed</span>' : '<span class="en-warn">Not confirmed</span>') + '</div>' : '') +
      '<div class="en-fds" data-psy="enh-fields">' + fields.map(fd).join('') + '</div>' +
      (tasks.length ? '<div class="en-cap"><span class="cap">To collect</span><span>' + tasks.length + '</span></div><ul class="en-lines" data-psy="enh-tasks">' + tasks.map((c) => '<li>' + esc(norm(c.text())) + '</li>').join('') + '</ul>' : '');
  }
  /* Save & Push to form: Psyflo types every accepted field into the DMAS form (amber boxes, for the clinician to check) */
  function pushPa(d) {
    return new Promise((res) => {
      if (!d || (d.type !== 'init' && d.type !== 'cont') || !onPageOf(d)) { res({ ok: false, reason: 'Open the form in Lauris' }); return; }
      const root = PSY.activeRoot(); const cid = d.cid; const S = ds(d.key);
      if (!root || !root.querySelector('.dm-paper')) { res({ ok: false, reason: 'Open the form in Lauris' }); return; }
      const todo = paCards(d, S).filter((c) => decOf(S, c) === 'acc' && !c.inForm);
      busy = 'push'; repaint();
      let doneN = 0; let settled = false;
      const fin = (r) => { if (settled) return; settled = true; clearTimeout(guard); busy = null; PSY.save(); res(r); setTimeout(repaint, 0); };
      const guard = setTimeout(() => fin({ ok: false, reason: 'Lauris page closed' }), 60000);
      const groups = todo.filter((c) => c.kind === 'group'); const boxes = todo.filter((c) => c.kind === 'box'); const acts = todo.filter((c) => c.kind === 'action');
      todo.filter((c) => c.kind === 'task').forEach((c) => { S.pushed[c.id] = PSY.now(); });
      const step3 = (i) => {
        if (i >= acts.length) {
          if (PSY.audit) PSY.audit.add({ case: cid, action: 'Scan & Enhance: ' + doneN + ' field' + (doneN === 1 ? '' : 's') + ' written to the DMAS form', by: ME(), doc: (L2().DOC || {})[d.type] || 'DMAS form', silent: true });
          try { if (FA().drawChrome) FA().drawChrome(root, cid); if (F().drawIndex) F().drawIndex(root, cid); } catch (e) {}
          fin({ ok: true }); return;
        }
        const c = acts[i]; const a = FA().actionOf ? FA().actionOf(cid, c.aid) : c.a; const inp = c.inp(); const value = valueOf(a, inp);
        if (!a || !value) { step3(i + 1); return; }
        const typed = S.txt[c.id] != null ? S.txt[c.id] : FA().typedOf(a, inp); FA().saveDraft(cid, a, inp);
        F().typeSegment(root, cid, a, typed, { value, draft: JSON.parse(JSON.stringify(inp)) }, () => {
          const ok = FA().done(root, cid, a.id, { quiet: true });
          if (ok !== false) { doneN++; const rec = PSY.state.actions[cid + '.' + a.id]; if (rec) { rec.by = c.need ? 'clinician' : 'scan-enhance'; } }
          step3(i + 1);
        }, { quiet: true, fast: true });
      };
      const step2 = (i) => {
        if (i >= boxes.length) { step3(0); return; }
        const c = boxes[i]; const t = norm(c.text());
        L2().set(L2().k(cid, 'sc', c.key), { text: t, at: PSY.now() }); S.pushed[c.id] = t; doneN++;
        F().typeBase(root, cid, c.key, () => step2(i + 1), { fast: true });
      };
      if (groups.length) {
        groups.forEach((c) => { const t = S.txt[c.id]; if (c.key && t != null && norm(t) !== norm(((L2().content(cid) || {})[c.key] || {}).t)) L2().set(L2().k(cid, 'sc', c.key), { text: t, at: PSY.now() }); });
        F().fillGroups(root, cid, groups.map((c) => c.group), () => { doneN += groups.length; step2(0); });
      } else step2(0);
    });
  }

  /* ------------------------------------------------------------------ required fields: a real check of the form's boxes and ticks */
  const REQ = {
    head: [['m.first', 'Member first name'], ['m.last', 'Member last name'], ['m.medicaid', 'Medicaid #'], ['m.dob', 'Member date of birth'], ['m.plan', 'Member plan ID #'], ['m.guard', 'Parent/guardian'], ['p.org', 'Organization name'], ['p.contact', 'Clinical contact']],
    init: [['req.from', 'Request from'], ['req.to', 'Request to'], ['req.units', 'Units requested'], ['req.hours', 'Hours per week'], ['icd1', 'Primary ICD-10 diagnosis'], ['coordplan', 'Plan to coordinate care'],
      ['strengths', 'Resources and strengths'], ['barriers', 'Barriers to treatment'], ['schoolfam', 'School and family coordination'], ['g1.obj', 'Goal 1 objective'], ['g1.int', 'Goal 1 interventions'], ['dloc', 'Level of care at discharge'], ['ddate', 'Estimated discharge date'],
      ['att.assess', 'Assessment completed on'], ['att.name', 'Printed name of LMHP'], ['att.cred', 'Credentials & NPI']],
    cont: [['admit', 'Initial admission date'], ['avg', 'Average units per week'], ['req.from', 'Request from'], ['req.to', 'Request to'], ['req.units', 'Units requested'], ['req.hours', 'Hours per week'], ['icd1', 'Primary ICD-10 diagnosis'],
      ['coordsince', 'Care coordination since the last authorization'], ['strengths', 'Resources and strengths'], ['barriers', 'Barriers to treatment'],
      ['g1.obj', 'Goal 1 objective'], ['g1.progress', 'Goal 1 progress'], ['g1.lack', 'Goal 1 lack of progress / ISP changes'], ['g2.obj', 'Goal 2 objective'], ['g2.progress', 'Goal 2 progress'], ['g3.obj', 'Goal 3 objective'], ['g3.progress', 'Goal 3 progress'],
      ['family', 'Family involvement'], ['dloc', 'Level of care at discharge'], ['ddate', 'Estimated discharge date'], ['att.assess', 'Assessment completed on'], ['att.name', 'Printed name of LMHP'], ['att.cred', 'Credentials']],
  };
  function validate(cid, o) {
    o = o || {}; const kind = L2().kind ? L2().kind(cid) : null; if (!kind || !F().boxModel) return { ok: false, total: 0, met: 0, missing: [] };
    const items = []; const add = (key, label, ok) => items.push({ key, label, ok: !!ok, sec: secLabel(kind, key.replace(/^yn:/, '')) });
    const T = (k) => boxText(cid, k); const Y = (k) => F().ynValue(cid, k);
    REQ.head.concat(REQ[kind]).forEach(([k, l]) => add(k, l, T(k)));
    if (kind === 'init') {
      const crit = [['crit1.yn', ['crit1.sub'], 'Criterion 1'], ['crit2.yn', ['crit2.r1.out', 'crit2.r2.out', 'crit2.r3.out', 'crit2.r4.out'], 'Criterion 2'], ['crit3.yn', ['crit3.sub'], 'Criterion 3']];
      const on = crit.filter((x) => Y(x[0]) === 'y');
      add('yn:crit1.yn', 'Two of three eligibility criteria checked', on.length >= 2);
      on.forEach((x) => add(x[1][0], x[2] + ' substantiation', x[1].some((k) => T(k))));
      const loc = ['a', 'b', 'c', 'd', 'e'].filter((l) => Y('loc.' + l + '.yn') === 'y');
      add('loc.b.sub', 'Level of care criterion with substantiation', loc.some((l) => T('loc.' + l + '.sub')));
      const tr = Y('trauma.yn'); add('yn:trauma.yn', 'Evidence of trauma (Yes/No)', tr === 'y' || tr === 'n');
      if (tr === 'y') add('sec3', 'Section III plan', T('sec3'));
    }
    if (o.sig) add('sig', 'Signature of LMHP (in Forms to Approve)', F().sigInfo && F().sigInfo(cid).done);
    const missing = items.filter((x) => !x.ok);
    return { ok: !missing.length, total: items.length, met: items.length - missing.length, missing, items };
  }
  E.validate = validate;
  const showKey = (key) => {
    const root = PSY.activeRoot(); if (!root) return;
    if (/^yn:/.test(key)) { const el = root.querySelector('[data-yn="' + key.slice(3) + '"]'); if (el && L2().scrollMain) { L2().scrollMain(root, el.closest('.dm-crit') || el, 110); el.classList.remove('en-flash'); void el.offsetWidth; el.classList.add('en-flash'); setTimeout(() => el.classList.remove('en-flash'), 2200); } return; }
    if (key === 'sig') { const el = root.querySelector('[data-sig]'); if (el && L2().scrollMain) L2().scrollMain(root, el, 110); return; }
    if (F().scrollToKey) F().scrollToKey(root, key, true);
  };
  const missingHtml = (v, max) => '<ul class="en-miss" data-psy="enh-missing">' + v.missing.slice(0, max || 4).map((m) => '<li><span>' + esc(m.label) + '</span><button class="lnk5" data-act="enh-show-key" data-key="' + esc(m.key) + '">Show in form</button></li>').join('') + (v.missing.length > (max || 4) ? '<li class="mut">+ ' + (v.missing.length - (max || 4)) + ' more</li>' : '') + '</ul>';

  /* ------------------------------------------------------------------ after the push: required fields, Process Form, sign, submit */
  const status = (cid) => (PSY.auth ? PSY.auth.status(cid) : 'draft');
  const isSigned = (cid) => !!(L2().signedInfo && L2().signedInfo(cid)) || AFTER_SIGN.indexOf(status(cid)) >= 0;
  const subRec = (cid) => ((PSY.state.cases || {})[cid] || {}).submission5 || null;
  const isSubmitted = (cid) => !!subRec(cid) || AFTER_SUB.indexOf(status(cid)) >= 0;
  function submitReady(cid) {
    if (isSubmitted(cid)) return { ok: false, why: 'Submitted' };
    if (status(cid) !== 'ready') return { ok: false, why: 'Sign in Lauris first' };
    const lid = (PSY.data.lauris.byCase(cid) || {}).id;
    if (PSY.elig && PSY.elig.pending(lid)) return { ok: false, why: 'Confirm the payer first', elig: lid };
    return { ok: true };
  }
  function stepsHtml(d, cards) {
    const cid = d.cid; const S = ds(d.key); const fill = !!(L2().fillable && L2().fillable(cid));
    const processed = !!(L2().processed && L2().processed(cid)) || (L2().mode && L2().mode(cid) === 'sent');
    const signed = isSigned(cid); const R = subSt(cid);
    const tracked = fill || status(cid) === 'ready' || !!subRec(cid) || R.started || processed;
    if (!tracked) return '<div class="en-stat" data-psy="enh-status"><span class="cap">Status</span>' + (PSY.auth ? PSY.auth.badge(status(cid)) : '') + '</div>';
    const row = (done, n, title, extra, cls) => '<li class="' + (done ? 'ok' : '') + (cls ? ' ' + cls : '') + '"><i aria-hidden="true">' + (done ? '✓' : n) + '</i><div><b>' + title + '</b>' + (extra || '') + '</div></li>';
    const left = cards.filter((c) => writes(c) && decOf(S, c) === 'acc').length; const sd = SY().get(d.skey);
    const pushed = !left && cards.some((c) => writes(c) && decOf(S, c) === 'form');
    const v = validate(cid);
    return '<div class="en-steps" data-psy="enh-steps"><span class="cap">Next</span><ol>' +
      row(pushed || !!(sd && sd.stage === 'synced'), 1, 'Push to form', left ? '<span>' + left + ' accepted, not in the form</span>' : '') +
      row(v.ok, 2, 'Required fields', '<span data-psy="enh-req">' + v.met + ' of ' + v.total + '</span>' + (v.ok ? '' : missingHtml(v)), 'req') +
      row(processed, 3, 'Process Form in Lauris', processed ? '' : '<button class="lnk5" data-act="enh-process" data-psy="enh-show-process">Show me</button>') +
      row(signed, 4, 'Sign in Forms to Approve', signed || !processed ? '' : '<button class="lnk5" data-go="lauris-forms" data-psy="enh-open-forms">Open Forms to Approve</button>') +
      row(R.n >= 7 || (isSubmitted(cid) && !R.started), 5, 'Submit ' + SIM(), subHtml(d), 'sub') + '</ol></div>';
  }

  /* ------------------------------------------------------------------ submission (simulated): 7 steps */
  const SUB = [['val', 'Required-field validation'], ['rev', 'Final review'], ['pdf', 'PDF capture'], ['pkg', 'Submission package'], ['send', 'Payer submission'], ['ref', 'Confirmation number'], ['track', 'Status tracking']];
  const subSt = (cid) => { const m = (PSY.state.enhSub = PSY.state.enhSub || {}); return (m[cid] = m[cid] || { n: 0 }); };
  const payerOf = (cid) => (PSY.data.payers || {})[(PSY.caseView(cid) || {}).payer] || { name: '', short: '' };
  const channel = (cid) => (PSY.rules ? PSY.rules.channel((PSY.caseView(cid) || {}).payer) : { label: '', method: '' });
  const pdfName = (d) => 'DMAS-' + (d.type === 'cont' ? 'concurrent SRA' : 'TDT-initial') + '-' + String(d.c.ini || '').replace(/\./g, '') + '-' + TODAY + '.pdf';
  function trackHtml(cid) {
    const day10 = ruleOf('day10');
    return '<div class="en-trk" data-psy="enh-tracking">' + (PSY.auth ? PSY.auth.badge(status(cid)) : '') +
      '<span class="en-ch2"' + (day10 ? ' title="' + esc(day10.source) + '"' : '') + '>Receipt check Nov 8 · ' + lab('observed', 'Harvest practice') + '</span>' +
      '<button class="lnk5" data-go="auth-detail?case=' + esc(cid) + '" data-psy="enh-view-auth">View in All Authorizations</button></div>';
  }
  function subHtml(d) {
    const cid = d.cid; const R = subSt(cid); const rec = subRec(cid); const ch = channel(cid);
    if (!R.started) {
      if (rec || isSubmitted(cid)) return '<div class="en-subd" data-psy="enh-submitted">' + (rec ? '<div class="en-ref">' + esc(rec.channel || ch.method) + ' · <b data-psy="enh-ref">' + esc(rec.ref) + '</b></div>' : '') + trackHtml(cid) + '</div>';
      const rd = submitReady(cid);
      return '<div class="en-subr"><button class="btn p s" data-act="enh-sub-start" data-psy="enh-submit"' + (rd.ok ? '' : ' disabled') + '>Prepare submission</button>' +
        (rd.ok ? '<span class="en-ch2">' + esc(ch.label) + '</span>' : '<span class="en-why" data-psy="enh-why">' + esc(rd.why) + '</span>') +
        (rd.elig ? '<button class="lnk5" data-act="r5-elig" data-c="' + esc(rd.elig) + '">Confirm payer</button>' : '') + '</div>';
    }
    const body = (k) => {
      if (k === 'val') return R.val ? (R.val.ok ? '<span>' + R.val.met + ' of ' + R.val.total + ' required fields</span>' : '<span class="en-why">' + R.val.missing.length + ' missing</span>' + missingHtml(R.val, 6) + '<button class="btn o s" data-act="enh-sub-start" data-psy="enh-sub-recheck">Check again</button>') : '';
      if (k === 'rev') {
        if (R.n > 1) return '<span>Confirmed by ' + esc(R.rev ? R.rev.by : ME()) + '</span>';
        const c = PSY.caseView(cid); const C = L2().content(cid) || {}; const t = F().tally ? F().tally(cid) : { psyflo: 0, you: 0 }; const si = F().sigInfo ? F().sigInfo(cid) : { text: '' };
        const req = [boxText(cid, 'req.from') && boxText(cid, 'req.to') ? boxText(cid, 'req.from') + ' – ' + boxText(cid, 'req.to') : '', boxText(cid, 'req.units') ? boxText(cid, 'req.units') + ' units' : '', boxText(cid, 'req.hours') ? boxText(cid, 'req.hours') + ' h a week' : ''].filter(Boolean).join(' · ');
        return '<dl class="en-kv" data-psy="enh-review-sum"><dt>Form</dt><dd>' + esc((L2().TITLE || {})[d.type] || '') + '</dd><dt>Patient</dt><dd>' + esc(c.ini) + ' · #' + esc(d.c.id || '') + '</dd><dt>Payer</dt><dd>' + esc(payerOf(cid).name) + '</dd>' +
          '<dt>Request</dt><dd>' + esc(req || '—') + '</dd><dt>Typed</dt><dd>' + t.psyflo + ' boxes by Psyflo · ' + t.you + ' by you</dd><dt>Signature</dt><dd>' + esc(si.text) + '</dd></dl>' +
          '<button class="btn p s" data-act="enh-sub-review" data-psy="enh-sub-review">Confirm review</button>';
      }
      if (k === 'pdf') {
        if (R.run === 'pdf') return '<span>Saving the form PDF…</span>';
        return R.pdf ? '<span>' + esc(R.pdf.name) + ' · ' + R.pdf.pages + ' page' + (R.pdf.pages === 1 ? '' : 's') + ' ' + SIM() + '</span><button class="lnk5" data-act="enh-sub-pdf" data-psy="enh-sub-pdf">Download PDF</button>' : '';
      }
      if (k === 'pkg') {
        if (!R.pkg) return '';
        const list = '<ul class="en-pkg" data-psy="enh-pkg">' + R.pkg.map((x) => '<li class="' + (x.inc ? 'in' : 'out') + '"><i aria-hidden="true">' + (x.inc ? '✓' : '○') + '</i><span><b>' + esc(x.t) + '</b>' + (x.s ? ' · ' + esc(x.s) : '') + (x.note ? ' · <em>' + esc(x.note) + '</em>' : '') + '</span></li>').join('') + '</ul>';
        return list + (R.n > 3 ? '' : '<div class="en-subr"><button class="btn p s" data-act="enh-sub-send" data-psy="enh-sub-send">Submit to ' + esc(payerOf(cid).short || 'payer') + '</button><span class="en-ch2">' + esc(ch.label) + ' ' + SIM() + '</span></div>');
      }
      if (k === 'send') return R.run === 'send' ? '<span>Sending · ' + esc(ch.label) + '… ' + SIM() + '</span>' : (R.n > 4 ? '<span>Sent · ' + esc(ch.label) + ' ' + SIM() + '</span>' : '');
      if (k === 'ref') return R.n > 5 && rec ? '<span>' + lab('sent') + ' <b data-psy="enh-ref">' + esc(rec.ref) + '</b></span>' : '';
      if (k === 'track') return R.n > 6 ? trackHtml(cid) : '';
      return '';
    };
    return '<ol class="en-sub" data-psy="enh-sub">' + SUB.map(([k, t], i) => {
      const done = R.n > i || (k === 'track' && R.n >= 7); const cur = !done && R.n === i; const b = done || cur ? body(k) : '';
      return '<li class="' + (done ? 'ok' : cur ? 'cur' : '') + '" data-step="' + k + '"><i aria-hidden="true">' + (done ? '✓' : i + 1) + '</i><div><b>' + esc(t) + '</b>' + b + '</div></li>';
    }).join('') + '</ol>';
  }
  /* the form as Lauris shows it, line by line (the PDF on screen); falls back to the checked fields when the form is not open */
  function captureLines(d) {
    const root = PSY.activeRoot(); const cid = d.cid; const c = PSY.caseView(cid) || {}; const lines = [];
    lines.push({ t: 'Member: ' + c.ini + ' - Lauris # ' + (d.c.id || '') + ' - Medicaid # on file' }, { t: 'Provider: Harvest Outreach Center - Payer: ' + payerOf(cid).name }, { t: '' });
    const paper = root && root.querySelector('.dm-paper');
    if (paper) {
      paper.querySelectorAll('.dm-sec').forEach((sec) => {
        const h = sec.querySelector('.dm-sh'); lines.push({ t: '' }); lines.push({ t: h ? h.textContent.trim() : '', b: true });
        sec.querySelectorAll('[data-fk], [data-yn], [data-sig]').forEach((el) => {
          if (el.hasAttribute('data-yn')) { const on = el.querySelector('a.on'); if (!on) return; const q = el.closest('.dm-crit'); const qt = q ? (q.querySelector('.dm-ct') || q).textContent.trim() : el.getAttribute('data-yn'); lines.push({ t: qt.slice(0, 90) + (qt.length > 90 ? '...' : '') + ': ' + on.textContent.trim() }); return; }
          const v = (el.innerText || el.textContent || '').trim(); if (!v) return;
          const s1 = el.closest('.dm-s1'); const f = el.closest('.dm-f');
          let l = s1 && s1.querySelector('label') ? s1.querySelector('label').textContent.trim() : f && f.querySelector('.dm-q span') ? f.querySelector('.dm-q span').textContent.trim() : '';
          if (l.length > 90) l = l.slice(0, 90) + '...';
          lines.push({ t: (l ? l.replace(/:$/, '') + ': ' : '') + v.replace(/\s+/g, ' ') });
        });
      });
    } else validate(cid, { sig: true }).items.forEach((x) => { if (!/^yn:|^sig$/.test(x.key)) lines.push({ t: x.label + ': ' + (boxText(cid, x.key) || '') }); });
    lines.push({ t: '' }, { t: 'Captured from Lauris Online on 10/29/2026 by Psyflo (simulated agent).' });
    return lines;
  }
  function capturePdf(d) {
    const title = ((L2().TITLE || {})[d.type] || 'Service Authorization Request') + ' - ' + d.c.ini;
    const pdf = PSY.pdf ? PSY.pdf(title, captureLines(d)) : '';
    pdfCache[d.cid] = pdf;
    return { name: pdfName(d), pages: (pdf.match(/\/Type \/Page\b(?!s)/g) || []).length || 1, bytes: pdf.length };
  }
  function pkgOf(d) {
    const cid = d.cid; const S = ds(d.key); const R = subSt(cid);
    const docs = PSY.submit5 && PSY.submit5.docs ? PSY.submit5.docs(cid) : [];
    const out = docs.map((x, i) => (i === 0 ? { t: (R.pdf ? R.pdf.name : pdfName(d)), s: 'signed DMAS form · ' + (x.s || ''), inc: true } : { t: x.t, s: x.s, inc: !!x.inc, note: x.note || '' }));
    const miss = (((PSY.data.hub || {})[cid] || {}).documents || {}).missing;
    if (miss && !/^Starts when/.test(miss)) out.push({ t: miss.replace(/\s*\(.*\)\s*$/, ''), s: '', inc: false, note: S.pushed['x-doc'] || S.dec['x-doc'] === 'acc' ? 'Not received · requested' : 'Not received' });
    return out;
  }
  /* keep the step the clinician is on in view */
  const toStep = () => setTimeout(() => {
    const r = PSY.activeRoot(); const w = r && r.querySelector('[data-psy="work"]'); const li = r && (r.querySelector('[data-psy="enh-sub"] > li.cur') || Array.from(r.querySelectorAll('[data-psy="enh-sub"] > li.ok')).pop());
    if (!w || !li) return; const k = PSY.k || 1; const lr = li.getBoundingClientRect(); const wr = w.getBoundingClientRect();
    if (lr.bottom > wr.bottom - 8) w.scrollTop += (lr.bottom - wr.bottom) / k + 16; else if (lr.top < wr.top) w.scrollTop -= (wr.top - lr.top) / k + 8;
  }, 30);
  PSY.acts['enh-sub-start'] = () => {
    const d = curDoc(); if (!d || !d.cid) return; const cid = d.cid; const R = subSt(cid);
    if (!R.started) { const rd = submitReady(cid); if (!rd.ok) { toast(rd.why + '.'); return; } }
    R.started = true; R.val = validate(cid, { sig: true }); R.n = R.val.ok ? 1 : 0; PSY.save();
    if (PSY.audit) PSY.audit.add({ case: cid, action: 'Required-field validation: ' + R.val.met + ' of ' + R.val.total, by: SYS(), doc: (L2().DOC || {})[d.type] || 'DMAS form', silent: true });
    repaint(); toStep(); if (!R.val.ok) toast(R.val.missing.length + ' missing.');
  };
  PSY.acts['enh-sub-review'] = () => {
    const d = curDoc(); if (!d || !d.cid) return; const cid = d.cid; const R = subSt(cid); if (R.n !== 1) return;
    R.rev = { at: PSY.now(), by: ME() }; R.n = 2; R.run = 'pdf'; PSY.save(); repaint(); toStep();
    if (PSY.audit) PSY.audit.add({ case: cid, action: 'Final review confirmed before submission', by: ME(), doc: (L2().DOC || {})[d.type] || 'DMAS form', silent: true });
    setTimeout(() => {
      const dd = curDoc() || d; R.pdf = capturePdf(dd); R.run = null; R.n = 3; R.pkg = pkgOf(dd); PSY.save();
      if (PSY.audit) PSY.audit.add({ case: cid, action: 'Form PDF saved from Lauris (simulated): ' + R.pdf.name, by: SYS(), doc: R.pdf.name, silent: true });
      repaint(); toStep();
    }, reduce() ? 0 : 600);
  };
  PSY.acts['enh-sub-pdf'] = () => {
    const d = curDoc(); if (!d || !d.cid) return; const R = subSt(d.cid); if (!R.pdf) return;
    const pdf = pdfCache[d.cid] || PSY.pdf(((L2().TITLE || {})[d.type] || 'Request') + ' - ' + d.c.ini, captureLines(d));
    const prev = '<pre style="white-space:pre-wrap;max-height:360px;overflow:auto;font:12px/1.45 ui-monospace,monospace;background:#F8F6F2;border:1px solid #E6E1D9;border-radius:8px;padding:10px;margin:0">' + esc(captureLines(d).map((l) => l.t).join('\n')) + '</pre>';
    PSY.download(R.pdf.name, pdf, { preview: prev });
  };
  PSY.acts['enh-sub-send'] = () => {
    const d = curDoc(); if (!d || !d.cid) return; const cid = d.cid; const R = subSt(cid); if (R.n !== 3 || !PSY.submit5) return;
    R.n = 4; R.run = 'send'; PSY.save(); repaint(); toStep();
    setTimeout(() => {
      const docs = (R.pkg || []).filter((x) => x.inc).map((x) => x.t + (x.s ? ' (' + x.s + ')' : ''));
      const missing = (R.pkg || []).filter((x) => !x.inc && /Not received/.test(x.note || '')).map((x) => x.t + ' · ' + x.note);
      let rec = null; try { rec = PSY.submit5.submit(cid, { docs, pdf: R.pdf, missing, validated: R.val ? R.val.met + ' of ' + R.val.total : '' }); } catch (e) { console.error('submit5', e); }
      R.run = null; R.n = 7; R.ref = rec ? rec.ref : ''; PSY.save();
      try { const root = PSY.activeRoot(); if (FA().drawChrome && root) FA().drawChrome(root, cid); } catch (e) {}
      repaint(); toStep(); toast('Submitted.');
    }, reduce() ? 0 : 800);
  };
  PSY.acts['enh-show-key'] = (el) => showKey(el.getAttribute('data-key'));

  /* ================================================================== Admission Screening and Intake (the Lauris form kit) */
  const LF_META = {
    adm: {
      counts: { cat: CAT.func, why: 'Criterion 1 is read from the frequency, intensity and duration of each behaviour.', cites: ['Behaviour report Oct 13', 'Screening call Oct 16'], rule: 'tdt-clin2' },
      outpt: { cat: CAT.prior, why: 'A prior service counts only when its outcome is written.', cites: ['Prior-services conversation Oct 16'], rule: 'tdt-failed' },
      quote: { cat: CAT.func, why: 'The guardian’s own words document criterion 3.', cites: ['Screening call Oct 16'], rule: 'tdt-clin2' },
      docs: { cat: CAT.doc, why: 'The screening lists the documents that were reviewed.', cites: ['Referral Oct 13', 'Schedule and grades Oct 15'] },
    },
    cna: {
      summ: { cat: CAT.decide, why: 'The formulation is the clinician’s judgement.' },
      svc: { cat: CAT.decide, why: 'The service recommendation is the clinician’s decision.' },
      trauma: { cat: CAT.blank, why: 'Section III of the request draws on the trauma history.', cites: ['Intake with the guardian Oct 20'], rule: 'form-init' },
      prev: { cat: CAT.prior, why: 'Criterion 2 needs the dates and outcomes of the services tried.', cites: ['Prior-services conversation Oct 16', 'CNA Oct 20'], rule: 'tdt-failed' },
      acad: { cat: CAT.func, why: 'School counts show the impairment in a major life activity.', cites: ['Schedule and grades Oct 15'], rule: 'tdt-clin2' },
      barr: { cat: CAT.form, why: 'The request asks for the barriers to treatment.', cites: ['CNA Oct 20'] },
    },
  };
  const iepMissing = (d) => /IEP copy/i.test(((((PSY.data.hub || {})[d.cid] || {}).documents) || {}).missing || '');
  /* round 14: the record-based sections of an Intake (CNA) (76b-cna-scan.js): "fill" ones are drafted, "collect" ones have boxes to type into */
  function scanItems(d) {
    const K = PSY.lf; const c = d.c; const st = K.st('cna', c); const S = ds(d.key);
    const done = (sid) => st.recs[sid] === 'done' || S.pushed['c-' + sid] != null;
    return PSY.cnaScan.model(c, done).map((s) => {
      const fill = s.kind === 'fill';
      return { id: (fill ? 'r-' : 'c-') + s.id, rid: fill ? s.id : null, title: s.title, need: !fill, keys: s.keys, value: s.value, why: s.why, cites: s.cites || [], absent: fill ? '' : ABSENT, cat: s.cat || (fill ? CAT.form : CAT.blank),
        done: fill ? st.recs[s.id] === 'done' : S.pushed['c-' + s.id] != null, skip: fill && st.recs[s.id] === 'skip', scanned: true };
    }).filter((x) => !x.skip);
  }
  function lfItems(d) {
    if (d.scan && PSY.cnaScan) return scanItems(d);
    const K = PSY.lf; const id = d.lf; const c = d.c; const st = K.st(id, c); const fields = K.fields(id); const S = ds(d.key);
    const fieldOf = (k) => fields.find((f) => f.key === k) || null;
    const recs = K.recDefs[id] ? K.recDefs[id](c) : [];
    const covered = {}; const items = [];
    recs.forEach((r) => {
      let value = Object.assign({}, r.value || {}); let title = r.title.replace(/^Your decision: /, '');
      /* the record says the IEP copy has not arrived: it is not listed as reviewed (it is collected instead) */
      if (id === 'adm' && r.id === 'docs' && iepMissing(d) && /IEP copy/.test(value.docs_other || '')) { value.docs_other = String(value.docs_other).replace(/;?\s*IEP copy \([^)]*\)/, '').replace(/^;\s*/, ''); title = title.replace(/ and the IEP copy/, ''); }
      const keys = Object.keys(value); keys.forEach((k) => { covered[k] = 1; });
      const need = keys.some((k) => { const f = fieldOf(k); return f && f.it.human; });
      items.push({ id: 'r-' + r.id, rid: r.id, title, need, keys, value, done: st.recs[r.id] === 'done', skip: st.recs[r.id] === 'skip' });
    });
    fields.filter((f) => f.it.human && f.it.req && !(f.kind === 'dx' && !/\.0$/.test(f.key)) && !covered[f.key] && (S.pushed['f-' + f.key] != null || !String(K.val(id, c, f.key) || '').trim())).forEach((f) => {
      items.push({ id: 'f-' + f.key, title: String(f.it.l).replace(/[:?]$/, '').replace(/^DSM V \/ /, ''), need: true, keys: [f.key], value: {}, done: S.pushed['f-' + f.key] != null, field: true });
    });
    return items.filter((x) => !x.skip);
  }
  function lfInput(d, item, k, many) {
    const K = PSY.lf; const f = K.fields(d.lf).find((x) => x.key === k); if (!f) return '';
    const S = ds(d.key); const ek = item.id + '|' + k; const v0 = item.need ? '' : String(item.value[k] == null ? '' : item.value[k]);
    const v = S.edits[ek] != null ? S.edits[ek] : v0;
    const lbl = esc(f.label || f.it.l);
    if (f.kind === 'check') return '<label class="en-ck"><input type="checkbox" data-change="enh-lf-in" data-item="' + esc(item.id) + '" data-k="' + esc(k) + '"' + (v === '1' ? ' checked' : '') + '> ' + lbl + '</label>';
    const cap = many ? lbl : '';
    if (f.kind === 'dx' || f.kind === 'select') { const opts = f.kind === 'dx' ? K.DX : (f.it.opts || []); return '<label class="en-fl">' + cap + '<select class="en-sel" aria-label="' + lbl + '" data-change="enh-lf-in" data-item="' + esc(item.id) + '" data-k="' + esc(k) + '"><option value=""></option>' + opts.map((o) => '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></label>'; }
    return '<label class="en-fl">' + cap + '<textarea class="en-ta" aria-label="' + lbl + '" rows="' + rowsFor(v, item.need ? 4 : 2, 8) + '" data-input="enh-lf-in" data-item="' + esc(item.id) + '" data-k="' + esc(k) + '"' + (item.need ? ' data-psy="enh-need"' : '') + '>' + esc(v) + '</textarea></label>';
  }
  function lfValues(d, item) {
    const S = ds(d.key); const out = {};
    item.keys.forEach((k) => { const v = S.edits[item.id + '|' + k] != null ? S.edits[item.id + '|' + k] : (item.need ? '' : item.value[k]); if (v != null && String(v) !== '') out[k] = String(v); });
    return out;
  }
  function lfCards(d, S) {
    const K = PSY.lf; const meta = LF_META[d.lf] || {}; const fields = K.fields(d.lf); const out = [];
    lfItems(d).forEach((it, i) => {
      const m = meta[it.rid] || {}; const many = it.keys.length > 1; const fl = (k) => { const f = fields.find((x) => x.key === k); return f ? String(f.label || f.it.l).replace(/[:?]$/, '') : k; };
      const c = { id: it.id, kind: 'lf', item: it, cat: it.cat || (it.field ? CAT.decide : (m.cat || CAT.form)), issue: it.title, why: it.why || (it.field ? 'Lauris will not process the form while it is empty.' : (m.why || 'The form asks for it.')),
        cites: it.cites || m.cites || [], absent: it.absent || (it.field ? 'Clinician decision · not drafted' : ''), rule: ruleOf(m.rule), prov: it.need ? 'need' : 'ai', need: it.need, editable: !it.need, field: it.title, sec: K.forms[d.lf].title, order: i, inForm: it.done, docEdit: true };
      c.vals = () => lfValues(d, it);
      c.text = () => { const v = c.vals(); return it.keys.map((k) => { const x = v[k]; if (!x) return ''; const f = fields.find((y) => y.key === k); return f && f.kind === 'check' ? (x === '1' ? fl(k) : '') : (many ? fl(k) + ': ' : '') + x; }).filter(Boolean).join('\n'); };
      c.ready = () => Object.keys(c.vals()).length > 0;
      c.edited = () => Object.keys(S.edits).some((k) => k.indexOf(it.id + '|') === 0);
      c.read = () => '<p class="en-sug" data-psy="enh-sug">' + (norm(c.text()) ? esc(c.text()).replace(/\n/g, '<br>') : '—') + '</p>';
      c.edit = () => it.keys.map((k) => lfInput(d, it, k, many)).join('');
      c.original = () => it.keys.map((k) => { const x = String(K.val(d.lf, d.c, k) || '').trim(); return x ? (many ? fl(k) + ': ' : '') + x : ''; }).filter(Boolean).join(' · ');
      out.push(c);
    });
    if (d.scan && PSY.cnaScan) PSY.cnaScan.decide(d.c).forEach((t, i) => out.push(textCard(S, { id: 'x-' + t.id, kind: 'task', cat: CAT.decide, issue: t.title, why: t.why, cites: [], absent: 'Your decision', prov: 'ai', suggest: t.ask, field: t.title, order: 900 + i, accLabel: 'Noted' })));
    if (d.lf === 'adm' && iepMissing(d)) {
      out.push(textCard(S, { id: 'x-doc', kind: 'task', cat: CAT.doc, issue: 'Not received: IEP copy', why: 'The school has not sent it, so it cannot be listed as reviewed.', cites: ['Referral Oct 13'], absent: 'Not received · collect it',
        prov: 'ai', suggest: 'Request the IEP copy from the school and attach it when it arrives.', field: 'To collect', order: 999, accLabel: 'To collect' }));
    }
    keepOriginal(S, out);
    return out;
  }
  function lfText(d, S) { return lfCards(d, S).filter((c) => decOf(S, c) !== 'rej').map((c) => '[' + c.field + ']\n' + norm(c.text())).join('\n\n'); }
  function lfOpts(d) {
    const S = ds(d.key);
    return { push: 'Save & Push to form', docTab: 'Document', original: () => lfCards(d, S).filter((c) => c.kind === 'lf').map((c) => '[' + c.field + ']\n' + (norm(c.original()) || 'Empty')).join('\n\n'), text: () => lfText(d, S), writer: () => pushLf(curDoc()), describe: () => lfDescribe(d) };
  }
  async function pushLf(d) {
    if (!d || d.type !== 'lf' || !onPageOf(d)) return { ok: false, reason: 'Open the form in Lauris' };
    const root = PSY.activeRoot(); const S = ds(d.key); const st = PSY.lf.st(d.lf, d.c);
    const todo = lfCards(d, S).filter((c) => decOf(S, c) === 'acc' && !c.inForm);
    busy = 'push'; repaint();
    try {
      for (const c of todo) {
        if (c.kind === 'task') { S.pushed[c.id] = PSY.now(); continue; }
        const vals = c.vals(); if (!Object.keys(vals).length) continue;
        await PSY.lf.fill(root, d.lf, d.c, vals, { human: true });
        if (c.item.rid) st.recs[c.item.rid] = 'done'; else S.pushed[c.id] = PSY.now();
      }
    } catch (e) { console.error('lf fill', e); busy = null; return { ok: false, reason: 'Lauris did not accept the change' }; }
    if (PSY.audit && d.cid) PSY.audit.add({ case: d.cid, action: 'Scan & Enhance: ' + todo.length + ' item' + (todo.length === 1 ? '' : 's') + ' written to the ' + PSY.lf.forms[d.lf].title, by: ME(), doc: PSY.lf.forms[d.lf].title, silent: true });
    busy = null; PSY.save(); setTimeout(repaint, 0); return { ok: true };
  }
  function lfView(d) {
    const S = ds(d.key); const cards = lfCards(d, S);
    return frame(d, S, cards, Object.assign(lfOpts(d), { doc: () => lfDoc(d, S, cards) }));
  }
  /* "This document" for a screening or intake: processed or not, how ready its required boxes are */
  function lfDescribe(d) {
    const K = PSY.lf; const F0 = K.forms[d.lf]; const st = (PSY.state.lf || {})[d.lf + '|' + d.c.id] || {}; const ready = K.ready(d.lf, d.c);
    const n = Object.keys(st.v || {}).filter((k) => norm(st.v[k])).length;
    if (d.scan && PSY.cnaScan) { const S = ds(d.key); const cn = PSY.cnaScan.counts(d.c, (sid) => st.recs[sid] === 'done' || S.pushed['c-' + sid] != null);
      return { what: d.T.label + ' · ' + d.c.ini, status: st.processed ? 'Processed · waiting for ' + (F0.approver || 'approval') : 'Form open in Lauris · not processed',
        facts: [['In it', cn.filled + ' of ' + cn.total + ' boxes filled'], ['From the record', cn.fill + (cn.fill === 1 ? ' section' : ' sections') + ' can be drafted · ' + cn.fillBoxes + ' boxes'], ['Not in the record', cn.collect + (cn.collect === 1 ? ' section' : ' sections') + ' to collect'], ['Your decision', cn.decide + (cn.decide === 1 ? ' section' : ' sections')]] }; }
    return { what: d.T.label + ' · ' + F0.title, status: st.processed ? 'Processed · waiting for ' + (F0.approver || 'approval') : 'Not processed',
      facts: [['In it', n ? n + ' boxes entered' : 'Nothing entered yet'], ['Ready', '<span data-psy="enh-ready">' + ready + '%</span> of required boxes · ' + esc(F0.approver || '')]] };
  }
  function lfDoc(d, S, cards) {
    const items = cards.filter((c) => c.kind === 'lf' && decOf(S, c) !== 'rej'); const tasks = cards.filter((c) => c.kind === 'task' && decOf(S, c) === 'acc'); const pend = pendingOf(S, cards).length;
    return '<div class="en-cap"><span class="cap">Original vs enhanced</span><span>' + items.length + ' field' + (items.length === 1 ? '' : 's') + '</span></div>' +
      (pend ? '<div class="en-nrl" data-psy="enh-unreviewed">' + pend + ' not reviewed · <button class="lnk5" data-act="enh-step" data-step="recs">Review</button></div>' : '') +
      '<div class="en-fds" data-psy="enh-fields">' + items.map((c) => {
        const st = decOf(S, c); const o = norm(c.original());
        return '<div class="en-fd" data-doc-card="' + esc(c.id) + '"><div class="en-fh"><b>' + esc(c.field) + '</b>' + (st === 'pending' ? '<span class="en-nr">Not reviewed</span>' : st === 'form' ? '<span class="en-ok">In the form</span>' : '') + '</div>' +
          '<div class="en-fo"><span class="cap">Original</span><div class="' + (o ? '' : 'mut') + '">' + esc(o || 'Empty') + '</div></div>' +
          '<div class="en-fe"><span class="cap">Enhanced</span>' + (st === 'form' || busy ? '<div>' + esc(norm(c.text()) || '—') + '</div>' : c.edit()) + '</div></div>';
      }).join('') + '</div>' +
      (tasks.length ? '<div class="en-cap"><span class="cap">To collect</span><span>' + tasks.length + '</span></div><ul class="en-lines" data-psy="enh-tasks">' + tasks.map((c) => '<li>' + esc(norm(c.text())) + '</li>').join('') + '</ul>' : '');
  }


  /* ================================================================== a screening or intake processed on an earlier date (addendum only)
     What the record says about it (the citations open the record); a gap the record shows is collected by the clinician, never assumed. */
  const FILED = {
    'cna|4471': { facts: [['Diagnosis', 'F90.2 · ADHD, combined type']], cites: ['CNA · diagnosis'] },
    'cna|4441': { facts: [['Diagnosis', 'F91.3 · Oppositional defiant disorder']], cards: [
      { id: 'prev', cat: CAT.prior, issue: 'Outpatient therapy (Jan – May 2026): no end date in the CNA', why: 'Criterion 2 needs the dates and outcomes of the services tried.', cites: ['CNA · prior services'], rule: 'tdt-failed', absent: ABSENT, prov: 'need' },
    ] },
  };
  const filed = (d) => FILED[d.lf + '|' + d.c.id] || {};
  function lfpCards(d, S) {
    const added = norm(K0().addenda ? K0().addenda(d.lf, d.c).map((a) => a.text).join(' ') : '');
    return (filed(d).cards || []).filter((x) => !(S.pushed[x.id] && added)).map((x) => textCard(S, Object.assign({ field: 'addendum' }, x, { rule: ruleOf(x.rule) })));
  }
  const K0 = () => PSY.lf || {};
  const lfpText = (d, S) => lfpCards(d, S).filter((c) => decOf(S, c) !== 'rej' && norm(c.text())).map((c) => String(c.text()).trim()).join('\n');
  function lfpOpts(d) {
    const S = ds(d.key);
    return { push: 'Save as addendum', docTab: 'Addendum', original: () => '', text: () => lfpText(d, S), writer: (text) => pushLfp(d, text), describe: () => lfpDescribe(d),
      match: (sd) => (sd.state === 'synced' && sd.synced != null ? ((K0().addenda ? K0().addenda(d.lf, d.c) : []).some((a) => norm(a.text) === norm(sd.synced)) ? '<span class="en-ok" data-psy="enh-match">✓ Matches Lauris</span>' : '<span class="en-warn" data-psy="enh-match-no">Lauris differs</span>') : '') };
  }
  async function pushLfp(d0, text) {
    const d = curDoc() || d0; if (!d || d.type !== 'lfp' || !onPageOf(d)) return { ok: false, reason: 'Open the form in Lauris' };
    if (!norm(text)) return { ok: false, reason: 'Nothing new for an addendum' };
    const S = ds(d.key); const r = K0().addAddendum(PSY.activeRoot(), d.lf, d.c, text, PSY.lauris.user.short);
    lfpCards(d, S).forEach((c) => { if (decOf(S, c) !== 'rej') S.pushed[c.id] = PSY.now(); });
    if (PSY.audit) PSY.audit.add({ case: d.cid, action: 'Scan & Enhance: addendum added to the ' + d.T.label + ' of ' + d.date, by: ME(), doc: d.label, silent: true });
    PSY.save(); return r;
  }
  function lfpView(d) {
    const S = ds(d.key); const cards = lfpCards(d, S);
    return frame(d, S, cards, Object.assign(lfpOpts(d), { doc: () => '<div class="en-dh"><b>Addendum</b><span>' + esc(d.T.label) + ' · ' + esc(d.date) + '</span></div><div class="en-orig" data-psy="enh-addendum">' + esc(lfpText(d, S) || '—') + '</div>' +
      (pendingOf(S, cards).length ? '<div class="en-nrl" data-psy="enh-unreviewed">' + pendingOf(S, cards).length + ' not reviewed · <button class="lnk5" data-act="enh-step" data-step="recs">Review</button></div>' : '') }));
  }
  function lfpDescribe(d) {
    const f = filed(d); const n = (K0().addenda ? K0().addenda(d.lf, d.c) : []).length;
    const facts = [['In it', 'Processed form on file' + (n ? ' · ' + n + ' addend' + (n === 1 ? 'um' : 'a') : '')]].concat((f.facts || []).map((x) => [x[0], esc(x[1]) + (f.cites ? ' ' + f.cites.map((l) => cite(l, d.cid)).join('') : '')]));
    return { what: d.T.label + ' · ' + d.date, status: 'Processed ' + d.date + ' · addendum only', facts };
  }

  /* ================================================================== Collateral Contact and Monthly Review Note (Lauris Add Session types)
     A note is Lauris's text (PSY.dpn.session): the recommendations add what the record documents (with the citation) or ask for what only
     the clinician knows ("Not documented · collect it"). Specific checks for M.R.'s and T.N.'s notes; every note gets the generic ones. */
  const PLAN_M = /^[^\n]*\b(?:continue tdt|plan stays the same|no changes? (?:this month|to the plan))\b[^\n]*$/im;
  const sent = (re) => new RegExp('[^.\\n]*\\b' + re + '\\b[^.\\n]*\\.?', 'i');
  const line = (re) => new RegExp('^[^\\n]*\\b' + re + '\\b[^\\n]*$', 'im');
  const NOTE_REC = {
    /* M.R. · a talk with the teacher at pick-up, saved Oct 27 (not processed) */
    'collateral|4471|2026-10-27': { goal: 3, cards: [
      { id: 'lunch', when: (t) => /lunch is going better/i.test(t) && !/10\/21|oct(?:ober)?\s*21/i.test(t), cat: CAT.contra, issue: '“Lunch is going better”; the daily note of Oct 21 records a shove at lunch',
        why: 'A contact note that disagrees with the daily notes weakens the record a reviewer reads.', cites: ['Daily note Oct 21'], absent: ABSENT, prov: 'need', find: sent('lunch is going better') },
      { id: 'math', when: (t) => /math is still hard/i.test(t) && !/math is still hard[^.]*\d/i.test(t), cat: CAT.func, issue: '“Math is still hard” has no count',
        why: 'A count shows the impairment the service treats.', cites: ['Daily note Oct 14', 'Notes, prior period'], absent: ABSENT, prov: 'need', find: sent('math is still hard') },
      { id: 'next', when: (t) => !/\bIEP\b/.test(t), cat: CAT.coord, issue: 'The IEP review on Nov 4 is not in the note',
        why: 'A collateral contact records the coordination with the school.', cites: ['Monthly collateral Oct 1', 'IEP review Nov 4 (School)'], prov: 'ai', suggest: 'Next with the school: the IEP review on 11/04, set at Harvest’s request.' },
    ] },
    /* T.N. · a call with the school counselor, saved Oct 26 (not processed) */
    'collateral|4441|2026-10-26': { goal: 2, cards: [
      { id: 'pm', when: (t) => /afternoons are still hard/i.test(t) && !/afternoons are still hard[^.]*\d/i.test(t), cat: CAT.func, issue: '“Afternoons are still hard” has no count',
        why: 'A count shows the impairment the service treats.', cites: ['Daily notes Oct 1 – 28'], absent: ABSENT, prov: 'need', find: sent('afternoons are still hard') },
      { id: 'iep', when: (t) => !/\bIEP\b/.test(t), cat: CAT.coord, issue: 'The Oct 14 IEP meeting is not in the note',
        why: 'A collateral contact records the coordination with the school.', cites: ['IEP meeting Oct 14'], prov: 'ai', suggest: 'Care coordination: at the 10/14 IEP meeting the school raised an alternative placement.' },
    ] },
    /* M.R. · the October Monthly Summary, a draft saved Oct 28 */
    'monthly|4471|today': { cards: [
      { id: 'g1', when: (t) => /goal 1/i.test(t) && !/goal 1[^\n]*\d+ of \d+/i.test(t), cat: CAT.prog, issue: 'Goal 1 progress has no count',
        why: 'Progress is measured against the ISP objective of 4 of 5.', cites: ['21 daily notes, last 30 days', 'Notes, prior period'], prov: 'ai', find: line('goal 1'),
        suggest: 'Goal 1: used a taught coping strategy first in 3 of 5 escalations in the last 30 days, up from 1 of 6 in the prior period.' },
      { id: 'g23', when: (t) => !/goal 2/i.test(t) || !/goal 3/i.test(t), cat: CAT.prog, issue: 'Goals 2 and 3 are not reported',
        why: 'The monthly review reports progress on each ISP goal.', cites: ['23 older notes', 'Daily note Oct 14'], prov: 'ai', after: line('goal 1'),
        suggest: 'Goal 2: waited for a turn in 3 of 5 group activities, up from 2 of 5.\nGoal 3: on task for 15 of 30 minutes in math on 3 of 5 school days, up from about 10.' },
      { id: 'inc', when: (t) => /one incident/i.test(t), cat: CAT.contra, issue: 'Says one incident; the daily notes record two',
        why: 'The review should match the daily notes it summarizes.', cites: ['Daily note Oct 21', 'Daily note Oct 6'], prov: 'ai', find: line('one incident'),
        suggest: 'Two escalations, both in unstructured time: a shove at lunch on 10/21 and leaving the building on 10/06 (1 day of in-school suspension).' },
      { id: 'fam', when: (t) => /weekly calls/i.test(t) && !/\d+ of \d+ weekly/i.test(t), cat: CAT.fam, issue: '“Weekly calls … continue” does not say how the family took part',
        why: 'The review shows how the family takes part in treatment.', cites: ['Weekly guardian contacts'], prov: 'ai', find: line('weekly calls'),
        suggest: 'His grandmother joined 11 of 12 weekly calls and practices the calm-down corner at home.' },
      { id: 'school', when: (t) => !/\bIEP\b/.test(t), cat: CAT.coord, issue: 'School coordination is not reported',
        why: 'The review records the coordination with the school.', cites: ['Monthly collateral Oct 1', 'IEP review Nov 4 (School)'], prov: 'ai',
        suggest: 'School: monthly contact with the school counselor on 10/01; the IEP review is set for 11/04.' },
    ], planCites: ['21 daily notes, last 30 days'] },
    /* T.N. · the October Monthly Summary, a draft saved Oct 28 */
    'monthly|4441|today': { goal: 2, cards: [
      { id: 'inc', when: (t) => /fewer incidents/i.test(t) && !/fewer incidents[^\n]*\d/i.test(t), cat: CAT.func, issue: '“Fewer incidents” has no count',
        why: 'A count shows the change the service is making.', cites: ['Daily notes Oct 1 – 28'], prov: 'ai', find: line('fewer incidents'),
        suggest: 'Hit or pushed peers on 9 dated days from 10/01 to 10/28, 5 to 10 minutes each (3 a week, down from daily); 6 of the 9 at lunch or transitions.' },
      { id: 'fam', when: (t) => /mother is involved/i.test(t), cat: CAT.fam, issue: '“Her mother is involved” does not say how',
        why: 'The review shows how the family takes part in treatment.', cites: ['Weekly guardian contacts'], prov: 'ai', find: line('mother is involved'),
        suggest: 'Her mother joins the weekly calls and the IEP meetings.' },
      { id: 'iep', when: (t) => !/\bIEP\b/.test(t), cat: CAT.coord, issue: 'The Oct 14 IEP meeting is not reported',
        why: 'The review records the coordination with the school.', cites: ['IEP meeting Oct 14'], prov: 'ai',
        suggest: 'School: at the 10/14 IEP meeting the school raised an alternative placement.' },
    ], planCites: ['Daily notes Oct 1 – 28'] },
  };
  /* T.N.'s record, as the citations open it (the same text Denial Intelligence cites) */
  if (PSY.ev) {
    const X = { 'Daily notes Oct 1 – 28': 'Hitting or pushing peers on Oct 1, 3, 8, 10, 15, 17, 22, 24 and 28, 5 to 10 minutes each, needing staff to separate her. 6 of the 9 incidents were at lunch or in transitions.',
      'IEP meeting Oct 14': 'IEP meeting, Oct 14: the IEP gives a behaviour plan and seating. The school raised an alternative placement.',
      'Weekly guardian contacts': 'Her mother joins the weekly calls and the IEP meetings.' };
    Object.keys(X).forEach((l) => { if (!PSY.ev.excerptOf || !PSY.ev.excerptOf('R-0388', l)) PSY.ev.excerpt('R-0388', l, X[l]); });
  }
  function noteCards(d, S) {
    const s = d.s; const t = String(s.note || ''); const conf = NOTE_REC[d.sub + '|' + d.c.id + '|' + (d.past || 'today')] || {};
    const goals = ispGoals(d.c); const out = [];
    if (d.cid && PSY.ev) goals.forEach((g) => PSY.ev.excerpt(d.cid, 'ISP 2.0 · Goal ' + g.n, 'Individual Service Plan 2.0 · Goal ' + g.n + ' · ' + g.name + ': ' + g.obj));
    if (d.sub === 'collateral' && !norm(s.f.mins)) out.push({ id: 'dur', field: 'mins', cat: CAT.blank, issue: 'Duration not documented', why: 'Lauris records how long each contact took.', cites: [], absent: ABSENT, prov: 'need' });
    if (!/\b(?:goal|objective|obj\.)\s*\d/i.test(t)) {
      const gn = conf.goal || (GOAL_RE.find(([, re]) => re.test(t)) || [1])[0]; const g = goals[gn - 1] || goals[0];
      out.push({ id: 'goal', cat: CAT.goal, issue: 'No ISP goal named', why: d.sub === 'monthly' ? 'The review reports progress against the ISP goals.' : 'The note should show which ISP goal the contact served.',
        cites: ['ISP 2.0 · Goal ' + g.n], prov: 'ai', suggest: 'ISP Goal ' + g.n + ': ' + g.obj, after: d.sub === 'monthly' ? line('summary') : null });
    }
    (conf.cards || []).forEach((x) => { if (!x.when || x.when(t)) out.push(x); });
    if (d.sub === 'monthly') {
      if (!conf.cards && !/\d+\s*of\s*\d+/.test(t)) out.push({ id: 'counts', cat: CAT.prog, issue: 'Progress has no counts', why: 'Progress is measured against the ISP objectives.', cites: [], absent: ABSENT, prov: 'need' });
      const m = PLAN_M.exec(t);
      if (m) out.push({ id: 'plan', cat: CAT.need, issue: '“' + m[0].trim().replace(/\.$/, '') + '” names no continuing need', why: 'The review should say why the service continues, from the goals and this month’s response.', cites: conf.planCites || [], absent: ABSENT, prov: 'need', find: PLAN_M });
    }
    return out.map((x) => { const c = textCard(S, Object.assign({ field: 'note' }, x)); c.find = x.find || null; c.after = x.after || null; return c; });
  }
  /* the enhanced note: a suggestion replaces the sentence it improves, or is added (a monthly line goes before the closing plan line) */
  function noteVals(d, S, cards) {
    let note = String(d.s.note || ''); let mins = String(d.s.f.mins || ''); const nl = d.sub === 'monthly';
    cards.forEach((c) => {
      if (decOf(S, c) === 'rej') return; const t = nl ? String(c.text() || '').trim() : norm(c.text()); if (!t) return;
      if (c.field === 'mins') { mins = norm(t); return; }
      let m = c.find ? c.find.exec(note) : null; if (m) { note = note.replace(m[0], () => /^\s*/.exec(m[0])[0] + t); return; }
      m = c.after ? c.after.exec(note) : null; if (m) { note = note.replace(m[0], () => m[0] + (nl ? '\n' : ' ') + t); return; }
      m = nl && c.id !== 'plan' ? PLAN_M.exec(note) : null; if (m) { note = note.replace(m[0], () => t + '\n' + m[0]); return; }
      note = note.replace(/\s+$/, '') + (nl ? '\n' : ' ') + t;
    });
    if (S.fe.note != null) note = S.fe.note; if (S.fe.mins != null) mins = S.fe.mins;
    return { note, mins, with: d.s.f.with || '', method: d.s.f.method || '' };
  }
  const noteCompose = (d, v) => (d.sub === 'collateral' ? 'Contact with: ' + (v.with || '') + '\nContact method: ' + (v.method || '') + '\nDuration: ' + (v.mins || '') + '\n\n' + v.note : v.note);
  const noteParse = (d, text) => { if (d.sub !== 'collateral') return { note: String(text || '') }; const m = /^Contact with: [^\n]*\nContact method: [^\n]*\nDuration: ([^\n]*)\n\n([\s\S]*)$/.exec(String(text || '')); return m ? { mins: m[1], note: m[2] } : { note: String(text || '') }; };
  function noteSync(d, S) { return noteCompose(d, noteVals(d, S, noteCards(d, S))); }
  /* what a processed note gets: the accepted additions, as a dated addendum */
  const noteAddendum = (d, S) => noteCards(d, S).filter((c) => decOf(S, c) !== 'rej' && norm(c.text())).map((c) => (c.field === 'mins' ? 'Duration: ' : '') + String(c.text()).trim()).join('\n');
  function noteOpts(d) {
    const S = ds(d.key); const proc = !!d.s.processed;
    return {
      push: proc ? 'Save as addendum' : 'Save & Push to Lauris', docTab: proc ? 'Addendum' : 'Document',
      original: () => noteCompose(d, { note: d.s.note, mins: d.s.f.mins, with: d.s.f.with, method: d.s.f.method }), text: () => noteSync(d, S),
      writer: (text) => pushNote(d, text), describe: () => noteDescribe(d),
      match: (sd) => {
        if (sd.state !== 'synced' || sd.synced == null) return '';
        const now = PSY.dpn && PSY.dpn.session ? PSY.dpn.session(d.sub, d.c.id, d.past) : null; const w = noteParse(d, sd.synced);
        const ok = now && (proc ? (now.addenda || []).some((a) => norm(a.text) === norm(noteAddendum(d, S))) : norm(now.note) === norm(w.note) && (w.mins == null || norm(now.f.mins) === norm(w.mins)));
        return ok ? '<span class="en-ok" data-psy="enh-match">✓ Matches Lauris</span>' : '<span class="en-warn" data-psy="enh-match-no">Lauris differs</span>';
      },
    };
  }
  async function pushNote(d0, text) {
    const d = curDoc() || d0; if (!d || d.type !== 'note' || !onPageOf(d)) return { ok: false, reason: 'Open the note in Lauris' };
    if (!PSY.dpn || !PSY.dpn.sessionPush) return { ok: false, reason: 'Lauris did not accept the change' };
    const S = ds(d.key); const proc = !!d.s.processed; const v = noteParse(d, text);
    const r = await PSY.dpn.sessionPush(PSY.activeRoot(), d.sub, d.c.id, d.past, proc ? {} : v, { addendum: proc ? noteAddendum(d, S) : '', via: 'Scan & Enhance' });
    if (r && r.ok === false) return r;
    if (PSY.audit) PSY.audit.add({ case: d.cid, action: 'Scan & Enhance: approved ' + d.T.label + ' written to Lauris', by: ME(), doc: d.label, silent: true });
    return { ok: true };
  }
  function noteView(d) {
    const S = ds(d.key); const cards = noteCards(d, S);
    return frame(d, S, cards, Object.assign(noteOpts(d), { doc: () => noteDoc(d, S, cards) }));
  }
  /* "This document" for a note: who it was with, how and how long (a contact); the goals and counts it states (a review) */
  function noteDescribe(d) {
    const s = d.s; const t = String(s.note || ''); const facts = [];
    if (d.sub === 'collateral') facts.push(['In it', esc([s.f.with || 'Contact not named', s.f.method, s.f.mins ? s.f.mins : 'no duration'].filter(Boolean).join(' · '))]);
    else {
      const goals = Array.from(new Set((t.match(/\bgoal\s*\d/gi) || []).map((x) => 'Goal ' + x.replace(/\D/g, ''))));
      const counts = (t.match(/\b\d+\s*of\s*\d+\b/g) || []).length;
      facts.push(['In it', esc([goals.length ? goals.join(', ') + ' named' : 'No goal named', counts ? counts + ' counts' : 'no counts', t.split('\n').filter((x) => norm(x)).length + ' lines'].join(' · '))]);
    }
    const others = (PSY.dpn && PSY.dpn.sessions ? PSY.dpn.sessions(d.sub, d.c.id) : []).filter((x) => x.past !== (d.past || ''));
    if (others.length) facts.push(['Also', others.map((x) => '<button class="lnk5" data-act="enh-inst" data-inst="' + (x.past || 'today') + '">' + esc(x.past ? mmdd(x.past) : 'Today') + '</button>').join(' · ')]);
    const st = s.processed ? 'Processed · addendum only' : s.saved ? 'Saved ' + s.saved.at + ' · ' + s.saved.by + ' · not processed' : 'Saved · not processed';
    return { what: d.T.label + ' · ' + (d.sub === 'monthly' && !d.past ? 'October 2026' : d.us), status: st, facts };
  }
  function noteDoc(d, S, cards) {
    const v = noteVals(d, S, cards); const pend = pendingOf(S, cards).length; const proc = !!d.s.processed; const f = d.s.f;
    const orig = (d.sub === 'collateral' ? '<div class="en-of"><b>' + esc([f.with, f.method].filter(Boolean).join(' · ') || '—') + '</b> · Duration ' + esc(f.mins || '—') + '</div>' : '') + esc(d.s.note);
    const body = proc
      ? '<div class="en-orig" data-psy="enh-addendum">' + esc(noteAddendum(d, S) || '—') + '</div>'
      : (d.sub === 'collateral' ? '<label class="en-fld"><span>Duration</span><textarea class="en-ta" rows="1" data-input="enh-nf" data-fld="mins" data-psy="enh-fld-mins" placeholder="Not stated">' + esc(v.mins) + '</textarea></label>' : '') +
        '<label class="en-fld"><span>' + (d.sub === 'collateral' ? 'Contact note' : 'Summary') + '</span><textarea class="en-ta" rows="' + rowsFor(v.note, 4, 12) + '" data-input="enh-nf" data-fld="note" data-psy="enh-fld-note">' + esc(v.note) + '</textarea></label>';
    return '<div class="en-dh"><b>Original</b><span>' + esc(s0(d)) + '</span></div><div class="en-orig" data-psy="enh-orig">' + orig + '</div>' +
      '<div class="en-dh"><b>' + (proc ? 'Addendum' : 'Enhanced') + '</b><span>' + esc(d.T.label) + '</span></div>' +
      (pend ? '<div class="en-nrl" data-psy="enh-unreviewed">' + pend + ' not reviewed · <button class="lnk5" data-act="enh-step" data-step="recs">Review</button></div>' : '') +
      '<div class="en-flds" data-psy="enh-fields">' + body + '</div>';
  }
  const s0 = (d) => (d.s.saved ? 'Saved ' + d.s.saved.at.split(' ')[0] : 'Lauris · ' + d.us);
  /* ================================================================== acts */
  const cardOf = (d, id) => cardsOf(d).find((c) => c.id === id) || null;
  /* acting on a result keeps Scan & Enhance open (an auto-scan becomes the clinician's own session) */
  const here = (el) => { const d = curDoc(); if (!d || !d.skey) return null; ui.auto = false; const c = el ? cardOf(d, el.getAttribute('data-card')) : null; return { d, S: ds(d.key), c }; };
  /* a decision changes a field: an edit made on the document step for that field gives way */
  const clearFe = (x) => { if (x.c && x.c.field && (x.d.type === 'dpn' || x.d.type === 'note')) delete x.S.fe[x.c.field]; };
  PSY.acts['enh-close'] = () => E.close();
  PSY.acts['enh-rescan'] = () => { if (!ui.shown) return; ui.auto = false; showSel(ui.shown, 'scan'); repaint(); };
  PSY.acts['enh-open'] = (el) => E.openFor(el.getAttribute('data-case'));
  PSY.acts['enh-go'] = (el) => openOn(el.getAttribute('data-to'), { rescan: true });
  /* the dropdowns and Enhance */
  PSY.acts['enh-sel'] = (el) => { const k = el.getAttribute('data-k'); const s = Object.assign({}, ui.sel || defaultSel()); s[k] = el.value; s.inst = ''; ui.sel = s; ui.auto = false; repaint(); };
  PSY.acts['enh-run'] = () => {
    const r = PSY.activeRoot(); const pc = r && r.querySelector('[data-psy="enh-patient"]'); const tc = r && r.querySelector('[data-psy="enh-type"]');
    const s = Object.assign({}, ui.sel || defaultSel()); if (pc && pc.value) s.c = pc.value; if (tc && tc.value) s.t = tc.value;
    if (!canScan(s)) return; ui.sel = s; ui.open = true; ui.auto = false; focusCard = null; showSel(s, 'scan'); repaint();
  };
  /* another note of the same patient (an earlier DPN, the latest saved contact) */
  PSY.acts['enh-inst'] = (el) => { const base = ui.shown || ui.sel; if (!base) return; ui.auto = false; showSel(Object.assign({}, base, { inst: el.getAttribute('data-inst') || '' }), 'scan'); repaint(); };
  /* push happens on the document's own page: open it (the approved draft is kept), then Save & Push there */
  PSY.acts['enh-open-doc'] = () => { const d = curDoc(); if (!d) return; openOn(d.route, { rescan: false, step: 'doc' }); };
  /* a note that is not in Lauris yet: start it with the Scribe on its page */
  PSY.acts['enh-scribe'] = (el) => {
    const t = typeOf(el.getAttribute('data-t')); const id = el.getAttribute('data-c'); if (!t || !t.scribe || !id) return;
    E.close(); const Sc = PSY.scribe; if (Sc && Sc.ui) { Sc.ui.choose = null; Sc.ui.starting = t.route + '|' + id; Sc.ui.startAt = Date.now(); }
    PSY.go(t.route + '?c=' + id + '&scribe=1');
  };
  PSY.acts['enh-step'] = (el) => {
    const d = curDoc(); if (!d || !d.key) return; ui.auto = false; ds(d.key).step = el.getAttribute('data-step') === 'doc' ? 'doc' : 'recs'; PSY.save(); repaint();
    const r = PSY.activeRoot(); const w = r && r.querySelector('[data-psy="work"]'); if (w) w.scrollTop = 0;
  };
  PSY.acts['enh-acc'] = (el) => {
    const x = here(el); if (!x || !x.c || busy) return; const c = x.c;
    if (c.kind === 'elig') { PSY.acts['r5-elig']({ getAttribute: () => (x.d.c || {}).id }); return; }
    if (!c.ready()) { toast(c.need || c.kind === 'text' ? 'Write it first.' : 'Pick an answer first.'); focusCard = c.id; afterPaint(); return; }
    x.S.dec[c.id] = 'acc'; delete x.S.ed[c.id]; clearFe(x); touch(x.d); PSY.save(); repaint();
  };
  PSY.acts['enh-rej'] = (el) => { const x = here(el); if (!x || !x.c || busy) return; x.S.dec[x.c.id] = 'rej'; delete x.S.ed[x.c.id]; clearFe(x); touch(x.d); PSY.save(); repaint(); };
  PSY.acts['enh-edit'] = (el) => { const x = here(el); if (!x || !x.c || busy) return; x.S.ed[x.c.id] = true; PSY.save(); repaint(); focusCard = x.c.id; afterPaint(); };
  PSY.acts['enh-undo'] = (el) => { const x = here(el); if (!x || !x.c || busy) return; delete x.S.dec[x.c.id]; clearFe(x); touch(x.d); PSY.save(); repaint(); };
  PSY.acts['enh-acc-all'] = () => {
    const d = curDoc(); if (!d || !d.skey || busy) return; ui.auto = false; const S = ds(d.key); let n = 0;
    cardsOf(d).forEach((c) => { if (decOf(S, c) === 'pending' && !c.need && !c.decided && c.ready()) { S.dec[c.id] = 'acc'; if ((d.type === 'dpn' || d.type === 'note') && c.field) delete S.fe[c.field]; n++; } });
    touch(d); PSY.save(); repaint(); toast('Accepted ' + n + '.');
  };
  /* typing in a card's suggestion (no repaint: the box keeps focus) */
  const relabel = (x) => { const r = PSY.activeRoot(); const l = r && r.querySelector('[data-lab="' + x.c.id + '"]'); if (l) l.innerHTML = x.c.edited && x.c.edited() ? lab('reviewed') : lab(x.c.prov); };
  PSY.acts['enh-txt'] = (el) => { const x = here(el); if (!x || !x.c || !x.c.setText) return; x.c.setText(el.value); clearFe(x); PSY.save(); relabel(x); touch(x.d); };
  PSY.acts['enh-doc-in'] = (el) => { const x = here(el); if (!x || !x.c || !x.c.setText) return; x.c.setText(el.value); PSY.save(); touch(x.d); };
  PSY.acts['enh-fld'] = (el) => { const d = curDoc(); if (!d || d.type !== 'dpn') return; ui.auto = false; ds(d.key).fe[el.getAttribute('data-fld')] = el.value; PSY.save(); touch(d); };
  PSY.acts['enh-nf'] = (el) => { const d = curDoc(); if (!d || d.type !== 'note') return; ui.auto = false; ds(d.key).fe[el.getAttribute('data-fld')] = el.value; PSY.save(); touch(d); };
  /* the inputs of a DMAS recommendation (kept with the form: l2.<case>.dr.<action>) */
  PSY.acts['enh-in'] = (el) => {
    const x = here(el); if (!x || !x.c || !x.c.a) return; const inp = Object.assign({}, x.c.inp());
    if (el.tagName === 'TEXTAREA') inp.text = el.value; else inp.iso = el.value;
    delete x.S.txt[x.c.id]; FA().saveDraft(x.d.cid, x.c.a, inp); relabel(x); touch(x.d);
  };
  PSY.acts['enh-opt'] = (el) => { const x = here(el); if (!x || !x.c || !x.c.a) return; const inp = Object.assign({}, x.c.inp()); inp.i = +el.getAttribute('data-i'); delete x.S.txt[x.c.id]; FA().saveDraft(x.d.cid, x.c.a, inp); touch(x.d); repaint(); };
  PSY.acts['enh-chip'] = (el) => { const x = here(el); if (!x || !x.c || !x.c.a) return; const inp = Object.assign({}, x.c.inp()); const i = +el.getAttribute('data-i'); const sel = (inp.sel || []).slice(); inp.sel = sel.indexOf(i) >= 0 ? sel.filter((y) => y !== i) : sel.concat(i); delete x.S.txt[x.c.id]; FA().saveDraft(x.d.cid, x.c.a, inp); touch(x.d); repaint(); };
  PSY.acts['enh-lf-in'] = (el) => {
    const d = curDoc(); if (!d || d.type !== 'lf') return; ui.auto = false; const S = ds(d.key);
    S.edits[el.getAttribute('data-item') + '|' + el.getAttribute('data-k')] = el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value; PSY.save(); touch(d);
    const c = cardOf(d, el.getAttribute('data-item')); if (c) relabel({ c });
  };
  PSY.acts['enh-process'] = () => {
    const r = PSY.activeRoot(); const b = r && r.querySelector('.lz-main [data-psy="process"]'); if (!b) return;
    try { b.scrollIntoView({ block: 'nearest' }); } catch (e) {}
    b.classList.remove('en-flash'); void b.offsetWidth; b.classList.add('en-flash'); setTimeout(() => b.classList.remove('en-flash'), 2200);
  };

  /* ================================================================== scenario 3: an existing DPN to enhance (licensed clinical staff) */
  const S3 = { intervention: 'Observed M.R. playing basketball with staff for 45 minutes.', response: 'He got frustrated when he lost and walked off the court.', needs: 'Will continue to monitor.' };
  PSY.presenter = PSY.presenter || {}; PSY.presenter.prep = PSY.presenter.prep || {};
  PSY.presenter.prep.s3 = function () {
    /* written earlier today by the direct support staff, saved and not processed */
    Object.keys(S3).forEach((k) => PSY.flag('l1b.dpn.4471.f.' + k, S3[k]));
    PSY.flag('l1b.dpn.4471.f.date', '10/29/2026'); PSY.flag('l1b.dpn.4471.inserted', true);
    PSY.state.ext = PSY.state.ext || {}; PSY.state.ext.open = true; PSY.state.ext.mode = 'sidebar'; PSY.state.ext.seen = true;
    PSY.save();
    return 'lauris-dpn?c=4471'; // the start page: today's DPN (not the 05/12 note, which is processed and only takes an addendum)
  };

  /* ------------------------------------------------------------------ css (extension work area + the flash on Lauris's Process Form) */
  PSY.css.lauris = (PSY.css.lauris || '') + `
.xp .en{display:flex;flex-direction:column;gap:10px;min-width:0}
.xp .en-pick{display:grid;grid-template-columns:minmax(0,108px) minmax(0,1fr);gap:4px 8px;align-items:end;flex:none}
.xp .en-pl{display:flex;flex-direction:column;gap:3px;min-width:0;margin:0}
.xp .en-pl>span{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#8E99A6}
.xp .en-ps{display:block;width:100%;min-width:0;height:34px;border:1px solid #C9CDD3;border-radius:8px;padding:0 4px 0 7px;font:inherit;font-size:12.5px;background:#fff;color:#151B24;text-overflow:ellipsis}
.xp .en-ps:focus{outline:2px solid #3B4FA0;outline-offset:0;border-color:#3B4FA0}
.xp .en-pick.pend .en-ps{border-color:#3B4FA0}
.xp .en-go{grid-column:1/-1;display:inline-flex;align-items:center;justify-content:center;gap:7px;height:36px;margin-top:4px;background:#3B4FA0;border-color:#3B4FA0}
.xp .en-go:hover{background:#2F4189}
.xp .en-note{font-size:12.5px;font-weight:600;color:#8A4B0F;background:#FFF6DD;border-radius:8px;padding:6px 10px}
.xp .en-this{border:1px solid #D5DBF0;background:#F7F8FD;border-radius:10px;padding:9px 11px;display:flex;flex-direction:column;gap:2px;flex:none;min-width:0}
.xp .en-th{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:2px}
.xp .en-tt{font-size:13.5px;line-height:1.3;color:#151B24}
.xp .en-ts{font-size:12px;color:#525B66;line-height:1.35}
.xp .en-on{font-size:11.5px;font-weight:600;color:#1E5C3C}
.xp .en-kv2{display:grid;grid-template-columns:66px minmax(0,1fr);gap:2px 8px;margin:5px 0 0;font-size:12.5px;line-height:1.4}
.xp .en-kv2 dt{color:#8E99A6;font-weight:600}.xp .en-kv2 dd{margin:0;min-width:0;color:#2B3038}
.xp .en-kv2 dd[data-k="missing"]{font-weight:600;color:#7A5200}
.xp .en-of{margin-bottom:4px;color:#2B3038}
.xpc-en i{background:#9AA8E8}
.xp .en-kv2 dd .cite5{margin-left:4px}
.lz-main .lf-addh{margin:14px 0 6px;font-size:12px;font-weight:700;color:#1F3B6B;text-transform:uppercase;letter-spacing:.04em}
.lz-main .lf-add{margin:0 0 10px;border:1px solid #E8D9A8;background:#FFFDF2;border-radius:4px;padding:8px 10px;font-size:13px}
.lz-main .lf-addm{font-size:11.5px;color:#1F3B6B;margin-bottom:4px}.lz-main .lf-addt{white-space:pre-wrap;color:#222}
.xp .en-h{display:flex;align-items:center;gap:9px;padding-bottom:8px;border-bottom:1px solid #EFEBE4}
.xp .en-ic{flex:0 0 28px;height:28px;border-radius:50%;background:#3B4FA0;color:#fff;display:inline-flex;align-items:center;justify-content:center}
.xp .en-ht{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.25}.xp .en-ht b{font-size:14px}.xp .en-ht span{font-size:12px;color:#525B66;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.xp .en-ib{flex:none;width:30px;height:30px;border-radius:8px;border:1px solid #D9D4CC;background:#fff;font:inherit;font-size:16px;line-height:1;cursor:pointer;color:#3E4652}
.xp .en-ib:hover{background:#F3F0EA}
.xp .en-scan{border:1px solid #D5DBF0;background:#F5F7FD;border-radius:10px;padding:12px}
.xp .en-sh{display:flex;align-items:center;gap:9px;font-size:13.5px}
.xp .en-spin{width:16px;height:16px;border-radius:50%;border:2px solid #3B4FA0;border-right-color:transparent;animation:enSpin .7s linear infinite;flex:none}
@keyframes enSpin{to{transform:rotate(360deg)}}
.xp .en-reads{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center;margin-top:8px;font-size:13px;color:#2B3038}
.xp .en-reads span{display:inline-flex;gap:4px;align-items:center;opacity:.35;animation:enIn .2s ease forwards;animation-delay:calc(var(--i) * 260ms)}
.xp .en-reads span i{font-style:normal;font-size:11px;color:#3B4FA0;font-weight:700}
.xp .en-reads em{font-style:normal;color:#9A9388}
@keyframes enIn{to{opacity:1}}
@media (prefers-reduced-motion: reduce){.xp .en-reads span{animation:none;opacity:1}.xp .en-spin{animation:none}}
.xp .en-empty{border:1px solid #E6E1D9;border-radius:10px;background:#F8F6F2;padding:12px;display:flex;flex-direction:column;gap:8px}
.xp .en-empty>b{font-size:14px}
.xp .en-links{display:flex;flex-direction:column;gap:5px}
.xp .en-lk{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;text-align:left;border:1px solid #D9D4CC;background:#fff;border-radius:8px;padding:8px 10px;font:inherit;font-size:13px;font-weight:600;color:#151B24;cursor:pointer}
.xp .en-lk:hover{border-color:#3B4FA0;background:#F5F7FD}.xp .en-lk span{color:#3B4FA0;font-size:16px}
.xp .en-rv{display:flex;align-items:center;gap:8px;flex-wrap:wrap;border:1px solid #E8D9A8;background:#FFFBEC;border-radius:8px;padding:6px 10px;font-size:12.5px;color:#4A453D}
.xp .en-rv b{font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:#7A5200}
.xp .en-vf .sy-flow{font-size:10.5px;gap:3px;flex-wrap:nowrap}.xp .en-vf .sy-flow li{padding:2px 6px;white-space:nowrap}
.xp .en-tabs{display:flex;border:1px solid #D9D4CC;border-radius:9px;overflow:hidden;flex:none}
.xp .en-tabs button{flex:1;border:0;background:#fff;font:inherit;font-size:12.5px;font-weight:600;color:#3E4652;padding:7px 8px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.xp .en-tabs button+button{border-left:1px solid #D9D4CC}
.xp .en-tabs button.on{background:#1D4F43;color:#fff}
.xp .en-tabs .n{min-width:18px;height:18px;border-radius:9px;background:#FCEFD0;color:#7A5200;font-size:11px;display:inline-flex;align-items:center;justify-content:center;padding:0 5px}
.xp .en-tabs button.on .n{background:#fff;color:#1D4F43}
.xp .en-list{display:flex;flex-direction:column;gap:7px}
.xp .en-card{border:1px solid #E6E1D9;border-radius:10px;background:#fff;padding:10px 11px;display:flex;flex-direction:column;gap:6px;flex:none}
.xp .en-card.need{border-color:#EFD49A;background:#FFFCF4}
.xp .en-card.hl,.xp .en-sub.hl{box-shadow:0 0 0 2px #3B4FA0}
.xp .en-ch{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.xp .en-ch b{font-size:13.5px;line-height:1.3;min-width:0}.xp .en-ch .ev5{flex:none}
.xp .en-cat{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#6F4A05;line-height:1.35;min-width:0}
.xp .en-iss{font-size:13.5px;line-height:1.35;color:#151B24}
.xp .en-f{margin:0;display:flex;flex-direction:column;gap:2px}
.xp .en-f dt{font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#8E99A6;margin-top:4px}
.xp .en-f dd{margin:0;font-size:12.5px;line-height:1.45;color:#2B3038;min-width:0}
.xp .en-none{display:inline-flex;align-items:center;border-radius:999px;padding:2px 9px;font-size:12px;font-weight:600;background:#FCEFD0;color:#7A5200}
.xp .en-polh{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:11.5px;color:#6B665E}
.xp .en-pol{display:block;margin-top:2px}
.xp .en-sug{margin:0;padding:7px 9px;border-radius:8px;background:#F5F7FD;border:1px solid #E2E7F6;font-size:13px;line-height:1.45;color:#151B24;white-space:pre-wrap}
.xp .en-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:2px}
.xp .en-dc{display:flex;align-items:center;gap:8px;border:1px solid #E6E1D9;border-radius:8px;padding:6px 10px;font-size:12.5px;background:#fff}
.xp .en-dc>i{font-style:normal;flex:0 0 18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:10px;color:#fff;background:#217A78}
.xp .en-dc.rej>i{background:#9A9388}.xp .en-dc.rej{background:#F8F6F2}
.xp .en-dc.acc,.xp .en-dc.form{border-color:#BFE0CC;background:#F1F8F4}
.xp .en-dct{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.3}
.xp .en-dct b{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#4A453D}
.xp .en-dct span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#2B3038}
.xp .en-dcs{flex:none;font-size:11.5px;font-weight:600;color:#1E5C3C}.xp .en-dc.rej .en-dcs{color:#6B665E}
.xp .en-all{align-self:flex-start}
.xp .en-next{align-self:stretch;margin-top:2px}
.xp .en-ta{display:block;width:100%;border:1px solid #C9CDD3;border-radius:8px;padding:7px 9px;font:inherit;font-size:13px;line-height:1.45;resize:vertical;background:#fff;color:#151B24;min-height:36px}
.xp .en-ta:focus,.xp .en-date:focus,.xp .en-sel:focus{outline:2px solid #3B4FA0;outline-offset:0;border-color:#3B4FA0}
.xp .en-q{font-size:12.5px;font-weight:600;color:#2B3038;line-height:1.35;margin-bottom:4px}
.xp .en-date,.xp .en-sel{border:1px solid #C9CDD3;border-radius:8px;padding:6px 8px;font:inherit;font-size:13px;background:#fff;color:#151B24;min-height:34px;max-width:100%}
.xp .en-fl{display:flex;flex-direction:column;gap:4px;font-size:12px;font-weight:600;color:#3E4652;margin-bottom:4px}
.xp .en-ck{display:flex;gap:7px;align-items:center;font-size:13px}
.xp .en-opts{display:flex;flex-direction:column;gap:5px}
.xp .en-o{display:flex;gap:9px;align-items:flex-start;width:100%;text-align:left;border:1px solid #D9D4CC;background:#fff;border-radius:8px;padding:7px 9px;font:inherit;font-size:12.5px;line-height:1.35;cursor:pointer;color:#151B24}
.xp .en-o i{flex:0 0 14px;height:14px;border-radius:50%;border:1.5px solid #8E99A6;margin-top:1px;position:relative}
.xp .en-o.on{border-color:#3B4FA0;box-shadow:0 0 0 1px #3B4FA0 inset}.xp .en-o.on i{border-color:#3B4FA0}.xp .en-o.on i:after{content:'';position:absolute;inset:2.5px;border-radius:50%;background:#3B4FA0}
.xp .en-cs{display:flex;flex-wrap:wrap;gap:5px}
.xp .en-c{border:1px solid #D9D4CC;background:#fff;border-radius:999px;padding:4px 10px;font:inherit;font-size:12px;font-weight:600;cursor:pointer}.xp .en-c.on{background:#3B4FA0;border-color:#3B4FA0;color:#fff}
.xp .en-lines{margin:0;padding-left:16px;font-size:12.5px;line-height:1.45;color:#2B3038;display:flex;flex-direction:column;gap:3px}
.xp .en-cites{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.xp .en-cap{display:flex;justify-content:space-between;align-items:baseline;font-size:12px;color:#525B66;margin-top:2px}
.xp .en-ok{color:#1E5C3C;font-weight:600;font-size:12px}.xp .en-warn{color:#8A4B0F;font-weight:600;font-size:12px}
.xp .en-cov{border:1px solid #E6E1D9;border-radius:10px;padding:9px 11px;background:#F8F6F2;flex:none}
.xp .en-cr{display:flex;align-items:baseline;gap:8px}.xp .en-cr b{margin-left:auto;font-size:18px;font-weight:600;line-height:1.1}
.xp .en-segs{display:flex;gap:3px;margin-top:7px}.xp .en-segs i{flex:1;height:6px;border-radius:2px;background:#E6E1D9}.xp .en-segs i.m{background:#217A78}.xp .en-segs i.p{background:repeating-linear-gradient(90deg,#217A78 0 4px,#E6E1D9 4px 7px)}
.xp .en-meter{height:6px;border-radius:3px;background:#E6E1D9;margin-top:7px;overflow:hidden}.xp .en-meter i{display:block;height:100%;background:#217A78}
.xp .en-alld{font-size:13px;font-weight:600;color:#1E5C3C;background:#E9F4EE;border-radius:8px;padding:8px 10px}
.xp .en-doc{display:flex;flex-direction:column;gap:7px}
.xp .en-dh{display:flex;align-items:baseline;justify-content:space-between;gap:8px;font-size:12px;color:#6B665E;margin-top:2px}.xp .en-dh b{font-size:13px;color:#151B24}
.xp .en-orig{border:1px dashed #D9D4CC;background:#F8F6F2;border-radius:8px;padding:8px 10px;font-size:12.5px;line-height:1.45;color:#4A453D;white-space:pre-wrap;max-height:150px;overflow:auto}
.xp .en-orig>div{white-space:normal}.xp .en-orig>div+div{margin-top:3px}.xp .en-orig b{font-weight:600;color:#2B3038}
.xp .en-flds{display:flex;flex-direction:column;gap:6px}
.xp .en-fld{display:flex;flex-direction:column;gap:3px;font-size:11.5px;font-weight:700;color:#3E4652}
.xp .en-fld .en-ta{font-weight:400;min-height:34px}
.xp .en-nrl{font-size:12px;color:#7A5200;background:#FFF6DD;border-radius:6px;padding:5px 9px}
.xp .en-fds{display:flex;flex-direction:column;gap:7px}
.xp .en-fd{border:1px solid #E6E1D9;border-radius:9px;padding:8px 10px;display:flex;flex-direction:column;gap:5px;background:#fff}
.xp .en-fh{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.xp .en-fh b{font-size:13px}
.xp .en-fs{font-size:11.5px;color:#8E99A6;margin-top:-3px}
.xp .en-nr{font-size:11px;font-weight:700;color:#7A5200;background:#FCEFD0;border-radius:999px;padding:1px 8px;flex:none}
.xp .en-fo,.xp .en-fe{display:flex;flex-direction:column;gap:2px;font-size:12.5px;line-height:1.45;color:#2B3038}
.xp .en-fo>div{color:#6B665E;max-height:90px;overflow:auto}.xp .en-fo .mut{font-style:italic;color:#9A9388}
.xp .en-fe>div{background:#F5F7FD;border-radius:6px;padding:5px 8px}
.xp .en-fl1{display:flex;justify-content:space-between;align-items:center;font-size:12.5px;border:1px solid #E6E1D9;border-radius:8px;padding:6px 10px}
.xp .en-sbar{position:sticky;bottom:-12px;z-index:2;background:#fff;border:1px solid #D9D4CC;border-radius:10px;padding:9px 10px;display:flex;flex-direction:column;gap:7px;box-shadow:0 -6px 14px rgba(255,255,255,.9)}
.xp .en-sst{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.xp .en-sbar .sy-why{display:inline}
.xp .en-steps{border:1px solid #E6E1D9;border-radius:10px;background:#fff;padding:9px 11px;flex:none}
.xp .en-steps>ol{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column}
.xp .en-steps>ol>li{display:flex;gap:9px;align-items:flex-start;padding:7px 0;border-top:1px solid #F0ECE5;font-size:13px}
.xp .en-steps>ol>li:first-child{border-top:0}
.xp .en-steps>ol>li>i{flex:0 0 20px;height:20px;border-radius:50%;border:2px solid #C9C2B6;font-style:normal;display:inline-flex;align-items:center;justify-content:center;font-size:10.5px;font-weight:700;color:#525B66}
.xp .en-steps>ol>li.ok>i{background:#217A78;border-color:#217A78;color:#fff}
.xp .en-steps>ol>li>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;align-items:flex-start}
.xp .en-steps>ol>li>div>b{font-weight:600;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.xp .en-steps>ol>li>div>span{font-size:12px;color:#6B665E}
.xp .en-miss{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;width:100%;font-size:12px}
.xp .en-miss li{display:flex;justify-content:space-between;gap:8px;color:#8A4B0F}.xp .en-miss li.mut{color:#6B665E}
.xp .en-subr{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.xp .en-why{font-size:12px;color:#8A4B0F;font-weight:600}.xp .en-ch2{font-size:12px;color:#525B66;display:inline-flex;gap:5px;align-items:center;flex-wrap:wrap}
.xp .en-sub{list-style:none;margin:2px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;width:100%}
.xp .en-sub>li{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:#8E99A6}
.xp .en-sub>li>i{flex:0 0 16px;height:16px;border-radius:50%;border:1.5px solid #C9C2B6;font-style:normal;font-size:9.5px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;margin-top:1px}
.xp .en-sub>li.ok{color:#1E5C3C}.xp .en-sub>li.ok>i{background:#217A78;border-color:#217A78;color:#fff}
.xp .en-sub>li.cur{color:#151B24}.xp .en-sub>li.cur>i{border-color:#3B4FA0;color:#3B4FA0}
.xp .en-sub>li>div{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;align-items:flex-start}
.xp .en-sub>li>div>b{font-weight:600}
.xp .en-sub>li>div>span{font-size:12px;color:#4A453D;display:inline-flex;gap:5px;align-items:center;flex-wrap:wrap}
.xp .en-kv{display:grid;grid-template-columns:78px 1fr;gap:3px 8px;margin:0;font-size:12px;width:100%}
.xp .en-kv dt{color:#8E99A6;font-weight:600}.xp .en-kv dd{margin:0;color:#2B3038;min-width:0}
.xp .en-pkg{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px;font-size:12px;width:100%}
.xp .en-pkg li{display:flex;gap:6px;align-items:flex-start;color:#2B3038}.xp .en-pkg li i{font-style:normal;color:#217A78;flex:none}.xp .en-pkg li.out{color:#7A5200}.xp .en-pkg li.out i{color:#B07D18}
.xp .en-pkg b{font-weight:600}
.xp .en-subd,.xp .en-trk{display:flex;flex-direction:column;gap:5px;align-items:flex-start}.xp .en-ref{font-size:12.5px;color:#3E4652}
.xp .en-stat{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.xp .en-gl{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0;border-top:1px solid #F0ECE5;font-size:13px}.xp .en-gl:first-of-type{border-top:0}.xp .en-gl b{font-weight:600}
.lz-main .lb.en-flash,.lz-main .dm-yn.en-flash{outline:3px solid #3B4FA0;outline-offset:2px;animation:enFlash 1s ease-out 2}
@keyframes enFlash{0%{box-shadow:0 0 0 0 rgba(59,79,160,.6)}100%{box-shadow:0 0 0 10px rgba(59,79,160,0)}}
`;
})();
