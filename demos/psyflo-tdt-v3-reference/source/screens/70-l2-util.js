/* L2 shared helpers: the DMAS authorization form, its extension panel, the Lauris authorizations list and Forms to Approve.
   Namespace: PSY.l2. Loaded before the other 7x files (alphabetical order); everything is used lazily at render time.

   State (all under PSY.state.boxes, written with PSY.save()):
     l2.<case>.processed        { at }  Process Form was pressed in Lauris (the form is in Forms to Approve)
     l2.<case>.saved            true    Save Form Data was pressed
     l2.<case>.filled           true    every drafted box was typed from the approved draft
     l2.<case>.fl               { group: true }  drafted boxes typed one at a time
     l2.<case>.step             true    "One at a time" mode is on
     l2.<case>.t.<action>       { text, value, draft, at }  text the extension typed into the DMAS box for that action
     l2.<case>.sc.<key>         also: a section Scan & Enhance pushed after the clinician edited it (amber, check it)
     l2.<case>.dr.<action>      the clinician's input in Scan & Enhance (text / option / date / chips) before it is typed
     l2.<case>.yn.<key>         'y' | 'n'  a Yes/No tick on the form
     l2.<case>.u.<key>          { text, at }  text the clinician typed or pasted into a box by hand (white box, counted as "typed by you")
     l2.<case>.sc.<key>         { text, at }  text the Scribe typed into a box that is not in a draft group (other children's forms), amber
     l2.<case>.scribed          { at }  the Scribe typed this form (the tags say "from the conversation")
     l2.<case>.open             (round 7 Review tab; cleared when an action is done)
     l2.forms.signed.<id>       { at }  a form other than T.W./M.R. that was signed in Forms to Approve
     l2.signed.<case>           { date, at, by, how, ref, line }  the form was signed in Lauris Forms to Approve (status 'ready' until it is submitted, PSY.submit5)

   For other flows (B2, concurrent SRA): PSY.l2.toApprove(case) processes the DMAS form of a fillable case (T.W., M.R.) as Process Form does
   (state flag, status 'review', audit), so it is listed in Forms to Approve and can be signed there. */
(function () {
  'use strict';
  const PSY = window.PSY;
  if (!PSY) return;
  const L2 = (PSY.l2 = PSY.l2 || {});
  const esc = PSY.esc;
  L2.esc = esc;

  /* which DMAS form a case has: init = TDT H2016 initial (July 2021), cont = CMHRS continued stay (Dec 2021), none = no TDT form (outpatient) */
  const KIND = { 'R-0416': 'init', 'R-0408': 'init', 'R-0399': 'init', 'R-0391': 'init', 'R-0388': 'init', 'R-0384': 'init', 'R-0411': 'cont', 'R-0402': 'cont', 'R-0395': 'cont', 'R-0380': 'cont' };
  L2.kind = (cid) => KIND[cid] || null;
  L2.TITLE = { init: 'TDT (H2016) Initial Service Authorization Request', cont: 'CMHRS Continued Stay Service Authorization Request' };
  L2.SHORT = { init: 'TDT initial SRA', cont: 'concurrent SRA' };
  L2.FORMKEY = { init: 'sra', cont: 'sra-cs' };
  L2.EDITION = { init: 'July 2021', cont: 'December 2021' };
  L2.DOC = { init: 'DMAS TDT Initial SRA', cont: 'DMAS CMHRS Continued Stay SRA' };

  /* ---- state helpers ---- */
  L2.k = (cid, ...p) => 'l2.' + cid + '.' + p.join('.');
  L2.get = (k, d) => { const v = (PSY.state.boxes || {})[k]; return v === undefined || v === null ? d : v; };
  L2.set = (k, v) => { PSY.state.boxes[k] = v; PSY.save(); return v; };
  L2.del = (k) => { delete PSY.state.boxes[k]; PSY.save(); };
  L2.processed = (cid) => !!L2.get(L2.k(cid, 'processed'), null);
  L2.signedInfo = (cid) => L2.get('l2.signed.' + cid, null);
  L2.cv = (cid) => PSY.caseView(cid);
  L2.roster = (cid) => (PSY.data.lauris && PSY.data.lauris.byCase ? PSY.data.lauris.byCase(cid) : null);
  L2.payer = (cid) => { const c = PSY.caseView(cid); return (c && PSY.data.payers[c.payer]) || { name: '', short: '', channel: '' }; };

  /* draft: the form is being filled · processed: it waits in Forms to Approve · sent: it was signed (anything new is an addendum) */
  L2.mode = (cid) => {
    const c = PSY.caseView(cid); if (!c) return 'sent';
    if (cid === 'R-0416' && PSY.flowRank() >= 5) return 'sent';
    if (L2.signedInfo(cid)) return 'sent'; // signed in Forms to Approve (it may wait for submission: status 'ready')
    if (c.stage === 'sign') return L2.processed(cid) ? 'processed' : 'draft';
    return 'sent';
  };
  /* the two cases whose drafted boxes arrive from the platform (Approve · fill it into Lauris) */
  L2.fillable = (cid) => (cid === 'R-0416' || cid === 'R-0411') && L2.mode(cid) !== 'sent';
  /* the draft was approved on the platform ("Approve · fill it into Lauris"): T.W. moves the flow to 'approved'; M.R. is remembered here */
  L2.approvedInPsyflo = (cid) => (cid === 'R-0416' ? PSY.flowRank() >= 4 : !!L2.get(L2.k(cid, 'approved'), null) || !!PSY.flag('fill.' + cid));
  L2.approvedAt = (cid) => { const a = L2.get(L2.k(cid, 'approved'), null); return (a && a.at) || PSY.now(); };

  /* Lauris status of a request, from the case stage (and the flow of T.W.) */
  L2.status = (cid) => {
    const c = PSY.caseView(cid); const m = L2.mode(cid);
    if (m === 'draft') return { key: 'draft', label: 'Draft form', tone: 'n' };
    if (m === 'processed') return { key: 'wait', label: 'Waiting for signature', tone: 'b' };
    if (m === 'sent' && PSY.auth && PSY.auth.status(cid) === 'ready') return { key: 'ready', label: 'Signed · ready to send', tone: 'b' };
    switch (c.stage) {
      case 'info': return { key: 'info', label: 'Info requested', tone: 'y' };
      case 'partial': case 'p2p': return { key: 'partial', label: 'Partial', tone: 'y' };
      case 'denied': case 'appeal': return { key: 'denied', label: 'Denied', tone: 'r' };
      case 'active': return { key: 'active', label: 'Approved · active', tone: 'g' };
      default: return { key: 'sent', label: 'Signed · sent', tone: 'n' };
    }
  };

  /* request periods (demo values; they match the case hub) */
  L2.DATES = {
    'R-0416': ['10/27/2026', '01/23/2027'], 'R-0411': ['11/16/2026', '02/13/2027'], 'R-0408': ['11/03/2026', '01/30/2027'], 'R-0402': ['11/03/2026', '01/30/2027'],
    'R-0399': ['10/26/2026', '01/22/2027'], 'R-0391': ['11/09/2026', '02/05/2027'], 'R-0388': ['10/09/2026', '02/06/2027'], 'R-0384': ['10/19/2026', '01/15/2027'],
    'R-0395': ['11/06/2026', '02/05/2027'], 'R-0380': ['12/09/2026', '03/05/2027'], 'R-0377': ['08/17/2026', '02/12/2027'],
  };
  L2.dates = (cid) => L2.DATES[cid] || ['', ''];

  /* ---- Forms to Approve: the four forms that are not part of the Psyflo story, plus T.W. and M.R. once they are processed ---- */
  L2.STATIC_FORMS = [
    { id: 'f1', form: 'Comprehensive Needs Assessment', ini: 'C.D., 9', by: 'K. Hale', date: '10/28/2026', att: 'assessment' },
    { id: 'f2', form: 'Individual Service Plan 2.0', ini: 'C.D., 9', by: 'K. Hale', date: '10/28/2026', att: 'plan' },
    { id: 'f3', form: 'Daily Progress Note – TDT (addendum)', ini: 'R.S., 13', by: 'R. Diaz', date: '10/27/2026', att: 'note' },
    { id: 'f4', form: 'Monthly Collateral Contact', ini: 'N.P., 8', by: 'K. Hale', date: '10/27/2026', att: 'note' },
  ];
  L2.staticSigned = (id) => !!L2.get('l2.forms.signed.' + id, null);
  /* A form is in the list when it was processed in Lauris. A draft the clinician already approved on the platform is listed too, marked "not processed yet",
     so the platform's "open Forms to Approve" never leads to an empty list; it opens the form instead of the signature. */
  L2.pendingForms = () => {
    const rows = [];
    ['R-0416', 'R-0411'].forEach((cid) => {
      const m = L2.mode(cid); const c = PSY.caseView(cid);
      if (m === 'processed') { const p = L2.get(L2.k(cid, 'processed'), {}); rows.push({ id: cid, cid, form: L2.TITLE[L2.kind(cid)], ini: c.who, by: 'J. Perez', date: '10/29/2026', time: (p && p.at) || '', att: 'auth' }); }
      else if (m === 'draft' && L2.approvedInPsyflo(cid)) rows.push({ id: cid, cid, form: L2.TITLE[L2.kind(cid)], ini: c.who, by: 'J. Perez', date: '10/29/2026', time: '', att: 'auth', unprocessed: true });
    });
    L2.STATIC_FORMS.forEach((f) => { if (!L2.staticSigned(f.id)) rows.push(Object.assign({ cid: null }, f)); });
    return rows;
  };

  /* the DMAS form goes to Forms to Approve (same effect as Process Form on the form page, without the page) */
  L2.toApprove = (cid, o) => {
    o = o || {}; if (!L2.kind(cid) || L2.processed(cid) || L2.signedInfo(cid)) return false;
    PSY.flag(L2.k(cid, 'processed'), { at: PSY.now() });
    if (cid === 'R-0416' && PSY.flowRank() < 4) PSY.state.flow.tw = 'approved';
    PSY.state.log.unshift({ t: PSY.now(), case: cid, text: 'Form processed in Lauris by J. Perez, LPC. It is in Forms to Approve.' });
    if (PSY.auth && PSY.auth.set) PSY.auth.set(cid, 'review', { action: o.action || ((L2.kind(cid) === 'cont' ? 'Concurrent SRA form' : 'Draft') + ' written to the DMAS form; sent to Forms to Approve'), doc: L2.DOC[L2.kind(cid)] });
    PSY.save(); return true;
  };

  /* the menu badge follows the real list */
  try {
    const orig = PSY.lauris && PSY.lauris.counts;
    if (orig && !orig.l2) {
      const wrapped = function () { const c = orig.apply(this, arguments); try { c.forms = L2.pendingForms().length; } catch (e) {} return c; };
      wrapped.l2 = true; PSY.lauris.counts = wrapped;
    }
  } catch (e) {}


  /* the "Forms to Approve" badge in the Lauris menu of the page that is open (DOM only) */
  L2.updateBadge = (root) => {
    const n = PSY.lauris.counts().forms;
    root.querySelectorAll('.lnav').forEach((a) => {
      if (!/^Forms to Approve/.test(a.textContent.trim())) return;
      let b = a.querySelector('.b');
      if (n && !b) { b = document.createElement('span'); b.className = 'b'; a.appendChild(b); }
      if (b) { if (n) b.textContent = n; else b.remove(); }
    });
  };

  /* ---- small formatters ---- */
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  L2.fmtDate = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? MONTHS[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1] : ''; };
  L2.joinList = (arr) => { // 'Oct 2','Oct 6','Oct 9' -> 'Oct 2, 6 and 9'
    let last = '';
    const parts = arr.map((s) => { const mm = /^([A-Za-z]+) (.*)$/.exec(s); if (mm && mm[1] === last) return mm[2]; last = mm ? mm[1] : ''; return s; });
    return parts.length < 2 ? parts.join('') : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
  };
  L2.chip = (cls, t) => '<span class="chip ' + cls + '">' + esc(t) + '</span>';
  L2.svgCheck = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';

  /* scroll an element of the Lauris main area into view (the page is scaled in small windows, so offsets are corrected by PSY.k) */
  L2.scrollMain = (root, el, pad, smooth) => {
    const main = root.querySelector('.lz-main'); if (!main || !el) return;
    const k = PSY.k || 1; const r = el.getBoundingClientRect(), m = main.getBoundingClientRect();
    const top = (r.top - m.top) / k + main.scrollTop - (pad == null ? 90 : pad);
    try { main.scrollTo({ top: Math.max(0, top), behavior: smooth === false ? 'auto' : 'smooth' }); } catch (e) { main.scrollTop = Math.max(0, top); }
  };
  L2.reduceMotion = () => { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
})();
