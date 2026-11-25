/* Route lauris-dmas: the DMAS form (71-dmas-form.js) with the Psyflo extension beside it.
   lauris-dmas?case=R-0416[&action=a1][&fill=1]    (lauris-case is kept as an alias of the same screen)
     &action=a1 or &fill=1 open Scan & Enhance (76-enhance.js) on the form, on that recommendation.
   Round 8: the Review tab is retired. Scan & Enhance shows the recommendations and types them into the form with the helpers below.
   The extension only types into boxes for the clinician to check. It never processes or signs: Process Form and the signature are Lauris actions.
   Also here: PSY.reco.target(case, action), PSY.l2.form.act (draftOf, valueOf, typedOf, done… used by 76-enhance.js and 75-dmas-scribe.js).
   Acts: l2-save, l2-process, l2-idx, l2-yn */
(function () {
  'use strict';
  const PSY = window.PSY;
  if (!PSY) return;
  const L2 = (PSY.l2 = PSY.l2 || {});
  const F = (L2.form = L2.form || {});
  const esc = PSY.esc;
  const ACT = PSY.acts;
  const DEFAULT_CASE = 'R-0416';

  /* ------------------------------------------------------------------ PSY.reco.target: which DMAS field an action writes into */
  const CRIT_KEY = {
    init: { crit1: 'crit1.sub', crit2: 'crit2.r1.out', crit3: 'crit3.sub', loc: 'loc.b.sub', coord: 'coordplan', trauma: 'sec3', goals: 'g1.obj', docs: 'notes', wording: 'notes', progress: 'notes', family: 'schoolfam' },
    cont: { crit1: 'notes', crit2: 'notes', crit3: 'notes', loc: 'notes', coord: 'coordsince', trauma: 'notes', goals: 'g1.progress', docs: 'notes', wording: 'notes', progress: 'g1.progress', family: 'family' },
  };
  const SEC_LABEL = {
    init: { head: 'Member and provider', req: 'Request for approval of services', s1: 'Section I · Eligibility criteria', s2: 'Section II · Care coordination', s3: 'Section III · Trauma-informed care', s4: 'Section IV · Individual treatment goals', s5: 'Section V · Discharge planning', att: 'Attestation', notes: 'Notes section' },
    cont: { head: 'Member and provider', req: 'Request for approval of services', s1: 'Section I · Care coordination', s2: 'Section II · Treatment progress', s3: 'Section III · Discharge planning', att: 'Attestation', notes: 'Notes section' },
  };
  const PAGE = {
    init: { head: 1, req: 1, s1: 2, s2: 4, s3: 4, s4: 4, s5: 6, att: 7, notes: 8 },
    cont: { head: 1, req: 1, s1: 2, s2: 2, s3: 5, att: 5, notes: 6 },
  };
  function target(cid, a) {
    const kind = L2.kind(cid) || 'init'; const L = (a && a.lauris) || {};
    const key = L.key || CRIT_KEY[kind][a && a.crit] || 'notes';
    const sid = F.secOf ? F.secOf(kind, key) : 's1';
    const sl = SEC_LABEL[kind][sid] || '';
    return { form: L2.FORMKEY[kind], formTitle: L2.TITLE[kind], edition: L2.EDITION[kind], key, sec: sid, secLabel: sl, page: PAGE[kind][sid] || 1,
      section: L.section || sl, field: L.field || '', mode: L.mode === 'append' ? 'append' : 'replace', before: L.before || '', yn: L.yn || '', link: L.link || null,
      text: 'DMAS form · ' + (L.section || sl) };
  }
  if (PSY.reco) PSY.reco.target = target;

  const pick = (params) => { const c = params && (params.case || params.id); return PSY.caseById(c) ? c : DEFAULT_CASE; };
  const cidOf = (ctx) => pick(ctx.params);
  const actionOf = (cid, aid) => PSY.reco.list(cid).find((x) => x.id === aid) || null;
  const toast = (m) => PSY.ui.toast(m);

  /* ------------------------------------------------------------------ the clinician's input in the panel */
  function draftOf(cid, a) {
    const saved = L2.get(L2.k(cid, 'dr', a.id), null); if (saved) return saved;
    const ip = a.input || {};
    if (ip.type === 'choice') return { i: -1 };
    if (ip.type === 'date') return { iso: ip.suggestion || '' };
    if (ip.type === 'chips') { const pre = String(ip.suggestion || '').split(',').map((x) => x.trim()).filter(Boolean); return { sel: (ip.options || []).map((o, i) => (pre.indexOf(o) >= 0 ? i : -1)).filter((i) => i >= 0) }; }
    return { text: ip.suggestion || '' };
  }
  const saveDraft = (cid, a, d) => L2.set(L2.k(cid, 'dr', a.id), d);
  /* short value handed to PSY.reco.complete, or '' while the input is not complete */
  function valueOf(a, d) {
    const ip = a.input || {};
    if (ip.type === 'choice') return d.i >= 0 ? ip.options[d.i] : '';
    if (ip.type === 'date') return L2.fmtDate(d.iso);
    if (ip.type === 'chips') return d.sel && d.sel.length ? L2.joinList(d.sel.slice().sort((x, y) => x - y).map((i) => ip.options[i])) : '';
    return (d.text || '').trim();
  }
  /* the text that is typed into the DMAS box */
  function typedOf(a, d) {
    const L = a.lauris || {}; const v = valueOf(a, d); if (!v) return '';
    if ((a.input || {}).type === 'choice' && Array.isArray(L.writes) && L.writes[d.i] !== undefined) return L.writes[d.i];
    return L.write ? L.write.replace('{value}', v) : v;
  }

  /* ------------------------------------------------------------------ redraw helpers (DOM only: never PSY.refresh on Lauris pages) */
  let typingAid = null;
  /* the drafted text of an action: what is in the box now (it may have been edited), else what the box was marked done with, else what the draft would type */
  function copyTextOf(cid, a) {
    const seg = L2.get(L2.k(cid, 't', a.id), null); if (seg && seg.text) return seg.text;
    const rec = PSY.state.actions[cid + '.' + a.id]; if (rec && rec.typed) return rec.typed;
    const d = draftOf(cid, a); let t = typedOf(a, d);
    if (!t && a.input && a.input.type === 'choice' && typeof a.input.pick === 'number') t = typedOf(a, { i: a.input.pick });
    return t || '';
  }
  /* Scan & Enhance (76-enhance.js) shows the recommendations; this repaints its work area when the form changes */
  function drawReview(root, cid) { if (PSY.enhance && PSY.enhance.isOpen && PSY.enhance.isOpen()) PSY.ext.work.paint(); }
  function drawChrome(root, cid) {
    const b = root.querySelector('[data-psy="banner"]'); if (b) b.innerHTML = F.bannerHtml(cid);
    root.querySelectorAll('[data-psy="status"]').forEach((el) => { const s = L2.status(cid); el.className = 'au-st ' + s.tone; el.textContent = s.label; });
    const sg = F.sigInfo(cid); const sig = root.querySelector('[data-sig]'); if (sig) { sig.textContent = sg.text; sig.classList.toggle('g', sg.done); }
    const sd = root.querySelector('[data-sigdate]'); if (sd) sd.textContent = sg.date;
    const pf = root.querySelector('[data-psy="process"]'); if (pf) { const m = L2.mode(cid); pf.disabled = false; pf.textContent = m === 'processed' ? 'Processed' : 'Process Form'; pf.classList.toggle('dis', m === 'processed'); }
    const dd = root.querySelector('[data-docs]'); if (dd) dd.innerHTML = F.docsHtml(cid);
  }
  function refreshReview(root, cid) { drawReview(root, cid); drawChrome(root, cid); F.drawIndex(root, cid); }
  F.onEdit = null;

  /* ------------------------------------------------------------------ actions on a recommendation (typed by Scan & Enhance and by the Scribe) */
  function clearSegment(root, cid, a) {
    const t = target(cid, a); L2.del(L2.k(cid, 't', a.id));
    const by = L2.get(L2.k(cid, 'ynby', a.id), null);
    if (by) { L2.del(L2.k(cid, 'yn', by)); L2.del(L2.k(cid, 'ynby', a.id)); F.drawYn(root, cid, by); }
    F.drawBox(root, cid, t.key); F.drawIndex(root, cid);
  }
  /* o.by = 'scribe': the Scribe typed it from the conversation (the card says so); o.quiet: no redraw or toast (the caller redraws once) */
  function done(root, cid, aid, o) {
    o = o || {};
    const a = actionOf(cid, aid); if (!a || typingAid) return false;
    const s = L2.get(L2.k(cid, 't', aid), null); if (!s) return false;
    const t = target(cid, a); const el = root.querySelector('.dm-seg[data-aid="' + aid + '"]');
    const text = el ? el.textContent.trim() : (s.text || '').trim(); const ip = a.input || {};
    if (!text && ip.type === 'text') { if (!o.quiet) toast('The box is empty.'); return false; }
    s.text = text; L2.set(L2.k(cid, 't', aid), s);
    const value = ip.type === 'text' ? text : (s.value || text);
    PSY.reco.complete(cid, aid, value);
    const rec = PSY.state.actions[cid + '.' + aid]; if (rec) { rec.typed = text; rec.field = t.field || t.section; rec.where = t.text; if (o.by) rec.by = o.by; PSY.save(); }
    L2.set(L2.k(cid, 'open'), '');
    F.drawBox(root, cid, t.key); F.drawIndex(root, cid);
    if (o.quiet) return true;
    drawReview(root, cid);
    const cv = PSY.reco.coverage(cid);
    toast('Done.' + (cv.total ? ' Requirements addressed: ' + cv.met + ' of ' + cv.total + '.' : ''));
    return true;
  }
  function undo(root, cid, aid) {
    const a = actionOf(cid, aid); if (!a) return;
    PSY.reco.undo(cid, aid); clearSegment(root, cid, a);
    PSY.log(cid, 'Recommendation reopened: ' + a.title + '.');
    drawReview(root, cid); toast('Undone.');
  }
  function dismiss(root, cid, aid) {
    const a = actionOf(cid, aid); if (!a || typingAid) return;
    clearSegment(root, cid, a); L2.set(L2.k(cid, 'open'), '');
    PSY.reco.dismiss(cid, aid); drawReview(root, cid); toast('Marked not needed.');
  }

  /* ---- the Lauris buttons and form controls ---- */
  ACT['l2-save'] = (el, ctx) => { const cid = cidOf(ctx); L2.set(L2.k(cid, 'saved'), { at: PSY.now() }); ctx.toast('Saved.'); };
  ACT['l2-idx'] = (el, ctx) => { const t = ctx.root.querySelector('#dm-' + el.getAttribute('data-t')); if (t) L2.scrollMain(ctx.root, t, 8); };
  ACT['l2-yn'] = (el, ctx) => {
    const cid = cidOf(ctx);
    const k = el.getAttribute('data-k'), v = el.getAttribute('data-v'); const cur = F.ynValue(cid, k);
    L2.set(L2.k(cid, 'yn', k), cur === v ? '' : v); F.drawYn(ctx.root, cid, k); drawReview(ctx.root, cid);
  };
  ACT['l2-process'] = (el, ctx) => {
    const cid = cidOf(ctx), root = ctx.root; const m = L2.mode(cid);
    if (m === 'processed') { ctx.toast('Already processed.'); return; }
    if (F.timers.size || typingAid) { ctx.toast('Still typing.'); return; }
    const high = PSY.reco.list(cid).filter((a) => !a.done && !a.dismissed && a.open);
    const G = L2.GROUPS[cid] || []; const fl = L2.get(L2.k(cid, 'fl'), {}) || {}; const filled = !!L2.get(L2.k(cid, 'filled'), false);
    const empty = L2.fillable(cid) && L2.approvedInPsyflo(cid) && !filled ? G.filter((g) => !fl[g[0]]).length : 0;
    const go = () => doProcess(root, cid, ctx);
    if (!high.length && !empty) { go(); return; }
    const c = PSY.caseView(cid);
    PSY.ui.modal({
      title: 'Process with open recommendations?', sub: c.ini + ' · ' + L2.TITLE[L2.kind(cid)],
      body: (high.length ? '<ul class="log">' + high.map((a) => '<li><b>' + esc(PSY.reco.requirement(cid, a).name) + '</b><span>' + esc(a.title) + '</span></li>').join('') + '</ul>' : '')
        + (empty ? '<p>' + empty + ' drafted boxes are empty.</p>' : ''),
      actions: [{ label: 'Go back to the form' }, { label: 'Process anyway', primary: true, onClick: () => { go(); } }],
    });
  };
  function doProcess(root, cid, ctx) {
    const m = L2.mode(cid); const enh = !!(PSY.enhance && PSY.enhance.isOpen && PSY.enhance.isOpen());
    if (m === 'sent') {
      PSY.log(cid, 'Addendum processed in Lauris by J. Perez, LPC.');
      ctx.toast('Processed.');
      if (enh) drawReview(root, cid); else PSY.ext.seeIt(root, { to: 'auth-list?case=' + cid, label: 'See it in Psyflo', text: '' });
      return;
    }
    PSY.flag(L2.k(cid, 'processed'), { at: PSY.now() });
    if (cid === 'R-0416') { if (PSY.flowRank() < 5) PSY.state.flow.tw = 'approved'; PSY.save(); }
    PSY.state.log.unshift({ t: PSY.now(), case: cid, text: 'Form processed in Lauris by J. Perez, LPC. It is in Forms to Approve.' });
    /* one status model (01-core): the request waits for the clinician's signature */
    if (PSY.auth && PSY.auth.set) PSY.auth.set(cid, 'review', { action: (L2.kind(cid) === 'cont' ? 'Concurrent SRA form' : 'Draft') + ' written to the DMAS form; sent to Forms to Approve', doc: L2.DOC[L2.kind(cid)] || 'DMAS form' });
    else PSY.log(cid, 'Form processed in Lauris by J. Perez, LPC. It is in Forms to Approve.');
    F.drawAll(root, cid); drawChrome(root, cid); L2.updateBadge(root);
    ctx.toast('Processed.');
    /* Scan & Enhance shows the next step itself (Sign in Forms to Approve); otherwise the Notes view says where it went */
    if (enh) drawReview(root, cid); else PSY.ext.seeIt(root, { to: 'lauris-forms', label: 'Open Forms to Approve', text: '' });
  }

  /* ------------------------------------------------------------------ the route */
  function renderNoForm(cid) {
    const c = PSY.caseView(cid);
    const main = '<div class="dm-crumbs"><a data-go="lauris-auths">Authorizations</a> › <span>' + esc(c.ini) + '</span></div><div class="lcard" style="padding:18px 20px;max-width:640px"><h3 class="lh1">No DMAS form for this service</h3><p style="margin:0 0 12px;line-height:1.5">' + esc(c.ini) + ' · outpatient counseling</p><button class="lb pri" data-go="lauris-auth?id=' + cid + '">Open the authorization</button></div>';
    return PSY.lauris.page({ active: 'Authorizations', main, panel: { context: 'Authorization · ' + c.ini, case: cid } });
  }
  function render(params) {
    const cid = pick(params); const kind = L2.kind(cid); const c = PSY.caseView(cid);
    if (!kind) return renderNoForm(cid);
    const main = F.headerHtml(cid) + F.formHtml(cid) + F.barHtml(cid);
    return PSY.lauris.page({ active: 'Authorizations', main, panel: { context: (kind === 'cont' ? 'Concurrent SRA' : 'TDT initial SRA') + ' · ' + c.ini, case: cid } });
  }
  function mount(root, ctx) {
    const cid = pick(ctx.params); if (!L2.kind(cid)) return;
    F.bind(root, cid); F.drawIndex(root, cid); drawChrome(root, cid);
    const dd = root.querySelector('[data-docs]'); if (dd) dd.innerHTML = F.docsHtml(cid);
    typingAid = null; F.stopTimers();
    /* &action=a1 (a link from the platform: "Add it in Lauris") or &fill=1: open Scan & Enhance on this form, on that recommendation */
    const aid = ctx.params.action; const fill = ctx.params.fill;
    if ((aid || fill) && PSY.enhance && PSY.can('enhance') && !(PSY.enhance.isOpen && PSY.enhance.isOpen())) {
      delete ctx.params.fill;
      setTimeout(() => { if (root.isConnected) PSY.enhance.begin({ focus: aid ? 'a-' + aid : null }); }, 0);
    }
  }
  function unmount() { typingAid = null; if (F.stopTimers) F.stopTimers(); if (PSY.enhance && PSY.enhance.reset) PSY.enhance.reset(); }
  /* helpers Scan & Enhance (76-enhance.js) and the Scribe (75-dmas-scribe.js) use to type the way an action does and to mark it done */
  F.act = { draftOf, saveDraft, valueOf, typedOf, actionOf, target, done, undo, dismiss, refreshReview, copyTextOf, drawReview, drawChrome };
  L2.reviewHtml = () => '';

  const DEF = {
    id: 'lauris-dmas', app: 'lauris', label: 'DMAS authorization form', css: '', render, mount, unmount,
    url: (p) => { const cid = pick(p); const r = L2.roster(cid); return 'consumers/' + (r ? r.id : '') + '/authorization/' + (L2.kind(cid) === 'cont' ? 'dmas-continued-stay' : 'dmas-initial-tdt'); },
    tabTitle: (p) => 'Lauris Online — ' + (L2.TITLE[L2.kind(pick(p))] || 'Authorization'),
  };
  PSY.register(DEF);
  PSY.register(Object.assign({}, DEF, { id: 'lauris-case' }));
  const CSS = F.css || '';
  PSY.screens['lauris-dmas'].css = CSS; PSY.screens['lauris-case'].css = CSS;
})();
