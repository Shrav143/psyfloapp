/* Initial SRA (Part 5, Scenario 1) after round 8: the focused-review workspace is retired. The work happens in Scan & Enhance
   (76-enhance.js) on the DMAS form in Lauris; this file keeps what the rest of the demo calls:
     PSY.submit5 — the payer submission, for ANY case (initial or continued); the channel comes from PSY.rules.channel(payer):
       PSY.submit5.submit(caseId)   records it at once: status 'submitted' then 'pending', audit, PSY.state.cases[id].submission5
       PSY.submit5.record(caseId)   → PSY.state.cases[id].submission5 = { date, method, channel, ref, docs:[…], simulated } or null
       PSY.submit5.ready(caseId)    → { ok, why }: signed (status 'ready'), payer confirmed
       PSY.submit5.html / stage8 / stage9   the submission and confirmation cards (kept for older callers)
       Everything is simulated (a Simulated chip sits next to the channel); no payer system is contacted.
     PSY.flows.initial = { title, render, requirements, primary, evidence, missing } (Status hooks; primary opens Scan & Enhance)
     The citation excerpts of T.W.'s record (PSY.ev.excerpt), PSY.presenter.prep.initial (T.W.'s screening, CNA and ISP processed),
     and a wrapper on PSY.alerts.all that keeps T.W.'s alert in step and offers "Submit Authorization" for any signed request. */
(function () {
  'use strict';
  const PSY = window.PSY;
  if (!PSY || !PSY.flows || !PSY.auth) return;
  const esc = PSY.esc; const A = PSY.auth; const EV = PSY.ev; const RU = PSY.rules;
  const ME = PSY.r5.ME, SYS = PSY.r5.SYS;
  const TW = 'R-0416';
  const DATE = 'Oct 29, 2026';
  const L2 = () => PSY.l2 || {};
  const st = (cid) => A.status(cid);
  const meta = (cid) => A.meta(cid);
  const lid = (cid) => meta(cid).laurisId || '';
  const payerOf = (cid) => { const c = PSY.caseView(cid) || {}; return PSY.data.payers[c.payer] || { name: '', short: '' }; };
  const AFTER_SIGN = ['ready', 'submitted', 'pending', 'info', 'approved', 'partial', 'denied', 'recon', 'appeal', 'closed'];
  const AFTER_SUB = ['submitted', 'pending', 'info', 'approved', 'partial', 'denied', 'recon', 'appeal', 'closed'];
  const record = (cid) => ((PSY.state.cases || {})[cid] || {}).submission5 || null;
  const signed = (cid) => AFTER_SIGN.indexOf(st(cid)) >= 0 || !!(L2().signedInfo && L2().signedInfo(cid));
  const submitted = (cid) => !!record(cid) || AFTER_SUB.indexOf(st(cid)) >= 0;
  const processed = (cid) => !!(L2().processed && L2().processed(cid));
  const toast = (m) => PSY.ui.toast(m);
  const SIM = EV.label('illustrative', 'Simulated');
  const reduce = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  const hub = (cid) => (PSY.data.hub || {})[cid] || {};
  const traumaDone = () => { const a = PSY.reco && PSY.reco.list(TW).find((x) => x.crit === 'trauma'); return !!(a && a.done); };
  const filled = (cid) => !!(L2().get && L2().get(L2().k(cid, 'filled'), false));

  /* ================================================================== T.W.'s record, as the citation viewer shows it (every fact is the one in 20-case-data.js and 70-l2-content.js) */
  const EXCERPTS = {
    'Referral Oct 13': 'Referral from the Lynchburg City school counselor (MS-2) through the Psyflo link: TDT during the school day for T.W., 12, for physical and verbal aggression toward peers and leaving the building.',
    'Behaviour report Oct 13': 'School behaviour report: 6 dated incidents of peer aggression in 30 days (shoving, hitting), 2 office referrals, 1 day of in-school suspension (Oct 6, left the building).',
    'Screening call Oct 16': 'Screening call with the grandmother (legal guardian): aggression 2–3 times a week, 5–20 minutes, moderate; leaves the building about weekly, 10–30 minutes. “He doesn’t see what could happen out there.”',
    'Prior-services conversation Oct 16': 'Prior services: school behaviour interventionist 2×/week since Sep 2026, no reduction in incidents (counselor, Oct 15). Outpatient therapy at Piedmont Counseling, Mar – Jun 2025, 6 sessions; ended when transportation fell through; behaviours continued.',
    'Schedule and grades Oct 15': 'School record: 7 classes, passing 4. 9 unexcused absences this year. In-school suspension 1 day (Oct 6); out-of-school 0 days.',
    'CNA Oct 20': 'Comprehensive Needs Assessment: primary diagnosis F91.3 Oppositional defiant disorder. The school has raised alternative placement twice this year. Prior services with dates and outcomes. Asthma; no current medications. Lives with his grandmother, who has raised him since age 4.',
    'Intake with the guardian Oct 20': 'Intake with the grandmother (legal guardian): household, school, health and prior services. A change in the household earlier this year is recorded in general terms only.',
    'ISP Oct 21': 'Individual Service Plan 2.0, signed Oct 21: Goal 1 use a taught coping strategy before leaving the room, 4 of 5 times; Goal 2 respond to peer conflict without physical contact, 4 of 5 times; Goal 3 stay in class for the full period, 4 of 5 days. 5 days a week; 1 hour a week of LMHP supervision and counseling on site.',
    'SRA history': 'No TDT authorization is on file for T.W. in Lauris. This is a new service for the member.',
  };
  Object.keys(EXCERPTS).forEach((k) => EV.excerpt(TW, k, EXCERPTS[k]));

  /* ================================================================== PSY.submit5 · payer submission, any case */
  const S5 = (PSY.submit5 = PSY.submit5 || {});
  const PREFIX = { Sfax: 'SFX', Availity: 'AVL', 'UHC portal': 'UHC' };
  S5.channel = (cid) => RU.channel((PSY.caseView(cid) || {}).payer);
  S5.record = (cid) => record(cid);
  S5.ref = (cid) => (PREFIX[S5.channel(cid).method] || 'SUB') + '-20261029-' + String(cid).replace(/^R-/, '');
  const md = (s) => { const m = /^(\d\d)\/(\d\d)\/\d{4}$/.exec(s || ''); return m ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[1] - 1] + ' ' + (+m[2]) : ''; };
  S5.docs = (cid) => {
    const kind = L2().kind ? L2().kind(cid) : 'init'; const tw = cid === TW; const lm = L2().meta ? L2().meta(cid) || {} : {};
    return [
      { t: 'Signed DMAS form: ' + ((L2().TITLE || {})[kind] || 'Service Authorization Request'), s: 'signed 10/29/2026 by ' + ME, inc: true },
      { t: 'Comprehensive Needs Assessment', s: tw ? 'Oct 20' : (md(lm.assess) || 'current'), inc: true },
      { t: 'Individual Service Plan', s: tw ? 'Oct 21' : 'current', inc: true },
      { t: 'Admission screening', s: tw ? 'Oct 16' : '', inc: false, note: 'attached on request' },
    ];
  };
  S5.ready = (cid) => {
    const s = st(cid);
    if (submitted(cid)) return { ok: false, why: 'Already submitted.' };
    if (s !== 'ready') return { ok: false, why: 'Sign in Lauris first.' };
    if (PSY.elig.pending(lid(cid))) return { ok: false, why: 'Confirm which plan is responsible first.' };
    return { ok: true };
  };
  const busy = {};
  const chLbl = (ch) => EV.label(ch.kind === 'unverified' ? 'unverified' : ch.kind, ch.kind === 'observed' ? 'Harvest practice' : null);
  S5.stage8 = (cid, o) => {
    o = o || {}; const ch = S5.channel(cid); const pay = payerOf(cid); const rd = S5.ready(cid); const docs = o.docs || S5.docs(cid); const rec = record(cid);
    const dl = (rec ? rec.docs.map((t) => ({ t, inc: true })) : docs).map((d) => '<li class="' + (d.inc ? 'in' : 'req') + '"><i aria-hidden="true">' + (d.inc ? '✓' : '○') + '</i><span><b>' + esc(d.t) + '</b>' + (d.s ? ' · ' + esc(d.s) : '') + (d.note ? ' · <em>' + esc(d.note) + '</em>' : '') + '</span></li>').join('');
    let act = '';
    if (rec) act = '<div class="s5-row"><span class="st5 t-blue"><i aria-hidden="true">↗</i>Submitted · ' + esc(rec.ref) + '</span></div>';
    else if (busy[cid]) act = '<ol class="s5-prog" data-psy="submit-progress"><li class="ok">Packet prepared · ' + docs.filter((d) => d.inc).length + ' documents</li><li class="run">Sending · ' + esc(ch.label) + '…</li></ol>';
    else act = (rd.ok ? '' : '<div class="r5i-warn s5-w"><i aria-hidden="true">!</i><div><span>' + esc(rd.why) + '</span></div>' + (PSY.elig.pending(lid(cid)) ? '<button class="btn o s" data-act="r5-elig" data-c="' + esc(lid(cid)) + '">Confirm payer</button>' : st(cid) !== 'ready' && !submitted(cid) ? '<button class="btn o s" data-go="lauris-forms">Open Forms to Approve</button>' : '') + '</div>') +
      '<div class="s5-row"><button class="btn p" data-act="r5-submit" data-case="' + cid + '" data-psy="submit"' + (rd.ok ? '' : ' disabled') + '>Submit (simulated)</button></div>';
    return '<div class="r5i-card s5" data-psy="submit5"><div class="s5-g"><div><div class="cap5">Send to</div><b>' + esc(pay.name) + '</b></div><div><div class="cap5">Submission method</div><b>' + esc(ch.label) + '</b> ' + SIM + '<div class="r5i-rule">' + chLbl(ch) + '<span class="r5i-src">' + esc(ch.source) + '</span></div></div></div>' +
      '<div class="cap5" style="margin-top:12px">Documents included</div><ul class="s5-docs">' + dl + '</ul>' +
      act + '</div>';
  };
  S5.stage9 = (cid) => {
    const rec = record(cid); const c = PSY.caseView(cid); const u = A.units(cid); const pay = payerOf(cid); const ch = S5.channel(cid); const day10 = RU.byId('day10');
    if (!rec) return '<div class="r5i-card">Not submitted yet.</div>';
    const kv = (k, v) => '<div class="r5i-kv"><span>' + esc(k) + '</span><div>' + v + '</div></div>';
    return '<div class="r5i-card s5c" data-psy="confirmation"><div class="s5-ok"><i aria-hidden="true">✓</i><div><h3>Authorization Submitted</h3><span>' + EV.label('sent') + ' ' + SIM + '</span></div></div>' +
      '<div class="r5i-grid">' + kv('Consumer', '<b>' + esc(c.ini + ', ' + c.age) + '</b> · Lauris #' + esc(lid(cid))) + kv('Payer', esc(pay.name)) + kv('Service', esc(u.service.label) + ' · ' + esc(u.service.code)) +
      kv('Submission date', esc(rec.date)) + kv('Submission method', esc(rec.method) + ' ' + chLbl(ch)) + kv('Reference number', '<b data-psy="ref">' + esc(rec.ref) + '</b>') +
      kv('Submitted documentation', '<ul class="s5-dl">' + rec.docs.map((d) => '<li>' + esc(d) + '</li>').join('') + '</ul>') + kv('Current status', A.badge(st(cid))) + '</div>' +
      '<div class="r5i-okl" data-psy="receipt-check"' + (day10 ? ' title="' + esc(day10.source) + '"' : '') + '><i aria-hidden="true">◷</i><span>Receipt check Nov 8 · ' + EV.label('observed', 'Harvest practice') + '</span></div>' +
      '<div class="s5-row"><button class="btn p" data-go="auth-list?case=' + cid + '" data-psy="view-platform">View in Psyflo platform</button><button class="btn o" data-act="r5-history" data-c="' + esc(lid(cid)) + '">Authorization History</button></div></div>';
  };
  S5.html = (cid, o) => (record(cid) ? S5.stage9(cid) : S5.stage8(cid, o));
  /* o (Scan & Enhance's submission steps): { docs:[text], pdf:{name,pages}, missing:[text], validated:'32 of 32' } */
  S5.submit = (cid, o) => {
    if (record(cid)) return record(cid);
    o = o || {};
    const ch = S5.channel(cid); const ref = S5.ref(cid); const kind = L2().kind ? L2().kind(cid) : 'init'; const doc = (L2().DOC || {})[kind] || 'DMAS form';
    const docs = o.docs && o.docs.length ? o.docs.slice() : S5.docs(cid).filter((d) => d.inc).map((d) => d.t + (d.s ? ' (' + d.s + ')' : ''));
    const rec = { date: DATE + ' · ' + PSY.now(), method: ch.label, channel: ch.method, ref, docs, simulated: true, pdf: o.pdf ? o.pdf.name : null, missing: o.missing || [], validated: o.validated || '' };
    A.set(cid, 'submitted', { action: 'Authorization submitted (' + ch.method + ', simulated) · ref ' + ref, by: ME, doc,
      patch: { submission5: rec, sendNote: ch.method + ' · ' + ref, stageLabel: 'Pending payer review', stageTone: 'n', needsClinician: false, today: false,
        next: 'Submitted by ' + ch.label + ' (simulated) · ref ' + ref + ' · receipt check Nov 8', clock: { text: 'receipt check Nov 8 (day 10)', tone: 'n' }, cta: { label: 'View', go: 'auth-list', params: { case: cid }, primary: false } } });
    A.set(cid, 'pending', { action: 'Monitoring the payer response', by: SYS, doc: ch.label + ' · ' + ref });
    const si = L2().signedInfo ? L2().signedInfo(cid) : null;
    if (si && L2().set) L2().set('l2.signed.' + cid, Object.assign({}, si, { ref: ch.method + ' · ' + ref, line: 'Submitted by ' + ch.label + ' (simulated) · ref ' + ref }));
    PSY.state.log.unshift({ t: PSY.now(), case: cid, text: 'Submitted to ' + payerOf(cid).short + ' by ' + ch.label + ' (simulated) · ref ' + ref });
    PSY.save();
    return rec;
  };
  PSY.acts['r5-submit'] = (el) => {
    const cid = el.getAttribute('data-case'); const rd = S5.ready(cid); if (!rd.ok) { toast(rd.why); return; }
    if (busy[cid]) return;
    busy[cid] = true; PSY.refresh();
    setTimeout(() => {
      busy[cid] = false; S5.submit(cid);
      PSY.refresh();
      toast('Submitted (simulated) · ' + S5.ref(cid));
    }, reduce() ? 0 : 1100);
  };


  /* ================================================================== the Status hooks (the review itself is Scan & Enhance on the DMAS form) */
  const enhAttrs = (cid) => 'data-act="enh-open" data-case="' + esc(cid) + '"';
  function render(cid) {
    cid = cid || TW;
    return '<div class="xf-empty"><button class="btn p" ' + enhAttrs(cid) + '>Open Scan &amp; Enhance</button></div>';
  }
  function requirements(cid) {
    if (cid !== TW) return null;
    const pend = PSY.elig.pending(lid(cid)); const sg = signed(cid); const sb = submitted(cid); const pr = processed(cid); const fl = filled(cid);
    const R = (label, value, tone) => ({ label, value, tone });
    return [
      R('Consumer information', 'Retrieved', 'green'),
      pend ? R('Insurance information', 'Coverage changed · confirm', 'amber') : R('Insurance information', 'Retrieved · ' + payerOf(cid).short, 'green'),
      R('Screening, CNA and ISP', 'Retrieved', 'green'),
      R('Clinical input', traumaDone() ? 'Added by clinician' : '1 item required', traumaDone() ? 'green' : 'amber'),
      R('DMAS form', sg ? 'Signed in Lauris' : pr ? 'In Forms to Approve' : fl ? 'Pushed · process it in Lauris' : 'Not pushed yet', sg ? 'green' : pr || fl ? 'blue' : 'gray'),
      R('Clinician signature', sg ? 'Signed' : 'Required', sg ? 'green' : 'amber'),
      R('Submission', sb ? A.label(st(cid)) : sg ? 'Ready to submit' : 'Not submitted', sb ? 'blue' : sg ? 'amber' : 'gray'),
    ];
  }
  function primary(cid) {
    if (cid === TW && PSY.flowRank() < 3) return undefined;
    const s = st(cid);
    if (s === 'draft' || s === 'review') return { label: 'Scan & Enhance', attrs: enhAttrs(cid) };
    if (s === 'ready') return { label: 'Submit Authorization', attrs: enhAttrs(cid) };
    if ((s === 'pending' || s === 'submitted') && record(cid)) return { label: 'View Submission', attrs: enhAttrs(cid) };
    return undefined;
  }
  function evidence(cid) {
    if (cid !== TW) return undefined;
    return Object.keys(EXCERPTS).map((l) => ({ label: l, text: 'Read by Scan & Enhance' }));
  }
  function missingList(cid) {
    if (cid !== TW || traumaDone()) return cid === TW ? [] : undefined;
    return [{ title: 'Section III · trauma-informed care (DMAS initial form)', why: 'The form asks for evidence of trauma and the plan to assess or refer. The record has no answer.', rule: 'DMAS TDT (H2016) Initial SRA form, July 2021 · Section III' }];
  }
  PSY.flows.initial = { title: 'Initial SRA', render, requirements, primary, evidence, missing: missingList };

  /* ================================================================== alerts: T.W.'s alert follows the form; signed requests offer Submit
     (01-core has the 'sign-' and 'ready-' alerts itself; this only adds them if they are missing, and keeps the review alert's lines current) */
  if (PSY.alerts && PSY.alerts.all && !PSY.alerts.all.r5i) {
    const base = PSY.alerts.all;
    const wrapped = function () {
      const out = base.apply(this, arguments);
      out.forEach((a) => {
        if (a.id !== 'init-4492') return;
        if (processed(TW)) { a.title = 'Initial SRA waiting for your signature'; a.lines = ['The DMAS form is processed in Lauris.']; a.action = { label: 'Open Forms to Approve', go: 'lauris-forms' }; }
        else if (traumaDone()) a.lines = [a.lines[0], 'Clinical input added.'];
      });
      PSY.allCases().filter((c) => A.visible(c.id) && (!PSY.locOk || PSY.locOk(c)) && A.status(c.id) === 'ready' && !out.some((a) => a.caseId === c.id && /^ready-/.test(a.id))).forEach((c) => {
        const m = A.meta(c.id); const ch = RU.channel(c.payer);
        out.push({ id: 'ready-' + m.laurisId, laurisId: m.laurisId, caseId: c.id, ini: c.ini, tone: 'amber', title: 'Signed · ready for submission', lines: ['Submit to ' + ((PSY.data.payers[c.payer] || {}).short || 'the payer') + ' by ' + ch.label + ' (simulated).'], action: { label: 'Submit Authorization', flow: PSY.flows.kindFor(c.id) }, need: true, rank: 3 });
      });
      return out.sort((x, y) => x.rank - y.rank);
    };
    wrapped.r5i = true; PSY.alerts.all = wrapped;
  }

  /* ================================================================== presenter: Scenario 1 starts with T.W.'s screening, CNA and ISP processed */
  function lfProcessed(id, route, c, recIds, clin) {
    if (!PSY.lf || !PSY.lf.forms[id]) return;
    const K = PSY.lf; const s = K.st(id, c); const h = PSY.scribe && PSY.scribe.handlers ? PSY.scribe.handlers[route] : null;
    let vals = {}; try { vals = (h && h.extract ? h.extract({ c: c.id }, {}) : {}) || {}; } catch (e) { vals = {}; }
    Object.keys(vals).forEach((k) => { const v = vals[k]; if (v == null || String(v).trim() === '') return; s.v[k] = String(v); s.s[k] = 'a'; });
    const recs = K.recDefs[id] ? K.recDefs[id](c) : [];
    recs.filter((r) => recIds.indexOf(r.id) >= 0).forEach((r) => { const v = r.value || {}; Object.keys(v).forEach((k) => { s.v[k] = String(v[k]); s.s[k] = 'u'; }); s.recs[r.id] = 'done'; });
    /* the clinician's own decisions recorded on the processed form (the diagnosis from the CNA; T.W. was admitted) */
    Object.keys(clin || {}).forEach((k) => { if (K.fields(id).some((f) => f.key === k)) { s.v[k] = clin[k]; s.s[k] = 'u'; } });
    s.processed = true; s.opened = true;
  }
  function prepInitial() {
    const c = PSY.data.lauris.byId('4492'); if (!c) return;
    const DX = 'F91.3 - Oppositional Defiant Disorder'; // primary diagnosis on T.W.'s CNA (case hub)
    lfProcessed('adm', 'lauris-screening', c, ['counts', 'outpt', 'docs'], { 'dx.0': DX, meets: 'Yes' }); // the guardian's words (criterion 3) stay out: the hub says they are not in the screening yet
    lfProcessed('cna', 'lauris-cna', c, ['dx', 'summ', 'svc', 'trauma', 'prev', 'acad', 'barr'], { 'dx.0': DX });
    PSY.flag('cna.opened.4492', true);
    PSY.flag('l1b.isp.n', 3); PSY.flag('l1b.isp.filled', true); PSY.flag('l1b.isp.processed', '10/21/2026 11:40 am'); PSY.flag('l1b.isp.panel.opened', true);
    PSY.state.flows5 = PSY.state.flows5 || {}; PSY.state.flows5[TW] = {};
    PSY.save();
  }
  PSY.presenter = PSY.presenter || {}; PSY.presenter.prep = PSY.presenter.prep || {};
  const prevPrep = PSY.presenter.prep.initial;
  PSY.presenter.prep.initial = function () { if (prevPrep) { try { prevPrep(); } catch (e) { console.error(e); } } prepInitial(); };
  /* round 9 · scenario 4 (licensed clinical staff): T.W.'s initial SRA form in Lauris, with the screening, CNA and ISP processed.
     Start page lauris-dmas?case=R-0416 (Scan & Enhance opens from its button). */
  PSY.presenter.prep.s4 = function () {
    PSY.state.flow.tw = 'isp'; prepInitial();
    PSY.state.ext = PSY.state.ext || {}; PSY.state.ext.open = true; PSY.state.ext.mode = 'sidebar'; PSY.state.ext.seen = true;
    PSY.save();
    return 'lauris-dmas?case=R-0416';
  };

})();
