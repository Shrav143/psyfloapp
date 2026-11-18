// Denial case workspace (E3, rebuilt in the artifact's layout for R3):
//   #/DenialCase?id=<requestId>&section=overview|said|evidence|weak|action|docreq|history&action=info|options|p2p|appeal|reconsider
// One workspace per request that needs a payer-decision response. The old InfoRequest, Partials and PeerBrief screens are replies here
// (section=action); the old section=decision link opens What the payer said and section=options lands on the Overview at "All paths" (a side drawer; so is History). R6: the Overview
// leads with "What Psyflo would do" (the suggestions: DenialRecs.js, the shared card kit) and a Packet card with Preview packet. The guardian side of
// the appeal stays AppealLetter (E6). Every change goes through a dispute.* action, which calls the existing request.* actions: request.stage
// stays the only lifecycle. The voice agent is Simulated: a person starts it and records it, nothing is dialled.
import { register, Screen, raw, ui, M, api, hrefFor, toast, go } from '../app.js';
import * as D from '../shared/sel/disputes.js';
import * as V from './DenialCaseViews.js';
import { payerGuidance, payerGuidanceBody } from '../shared/payer-guidance.js';
import { fmtDate, fmtDateTime } from '../shared/dates.js';
import { rule } from '../shared/rules.js';
import { srcHint } from './a-fmt.js';
import { can } from '../shared/permissions.js';
import * as R from '../shared/recs.js';
import { openDenialRecs, REC_PHONE_CSS } from './DenialRecs.js';

const esc = ui.esc;
const field = (id, label, control, hint) => `<div class="d-f"><label for="${id}">${esc(label)}</label>${control}${hint ? `<span class="d-modal-note">${esc(hint)}</span>` : ''}</div>`;
const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition;

// R6 overview: What Psyflo would do · Where the case stands · Packet · More, and the drawers that hold the rest. Tokens only (web/css/tokens.css).
const CASE_CSS = `
.d-wwd__lead{margin:0 0 2px}
.d-wwd .rcm__l li{gap:6px 10px;padding:10px 0;flex-wrap:wrap}
.d-wwd .rcm__l li svg{display:none}
.d-wwd .rcm__l li:last-child{border-bottom:0}
.d-wwd__n{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:var(--sand-100);font:600 var(--fs-13)/1 var(--font);font-variant-numeric:tabular-nums}
.d-wwd li[data-state=included] .d-wwd__n{background:var(--teal-600);color:var(--surface-0)}
.d-wwd .rcm__t{flex:1 1 240px}
.d-wwd__go{margin-left:auto}
.d-wwd__note{margin:0}
.d-wwd--quiet{padding-top:var(--sp-3);padding-bottom:var(--sp-3)}.d-wwd--quiet .ui-lockline{margin:0}
.d-two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--sp-3);align-items:start}
.d-two>*{min-width:0}
.d-two:has(>.d-stand:only-child){grid-template-columns:1fr}
@media (max-width:1180px){.d-two{grid-template-columns:1fr}}
.d-stand .d-next{margin:0}
.d-facts{display:flex;flex-direction:column;gap:12px;margin:var(--sp-3) 0 0}
.d-facts>div{display:flex;flex-direction:column;gap:3px}
.d-facts dt{font-size:var(--fs-12);font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted-700)}
.d-facts dd{margin:0;display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;min-width:0;line-height:1.5}
.d-fact__l{display:inline-flex;align-items:center;flex-wrap:wrap;gap:4px 6px}
.d-pk__c{margin:var(--sp-2) 0}
.d-pk__l{list-style:none;margin:0 0 var(--sp-3);padding:0}
.d-pk__r{display:flex;flex-wrap:wrap;gap:8px 12px;justify-content:space-between;align-items:center;padding:10px 0;border-top:1px solid var(--line-200)}
.d-pk__r:first-child{border-top:0}
.d-pk__t{display:flex;flex-direction:column;gap:4px;min-width:0}
.d-pk__m{display:flex;flex-wrap:wrap;gap:4px 6px}
.d-tools__l{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:10px 20px}
.d-tools__i{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.d-menu__x{margin-top:4px;border-top:1px solid var(--line-200);padding-top:6px}
.d-menu__b{display:flex;flex-direction:column;gap:1px;width:100%;padding:8px 10px;border-radius:var(--r-2);background:none;border:0;border-left:3px solid transparent;text-align:left;font:inherit;color:var(--ink-900);cursor:pointer;min-height:36px;box-sizing:border-box;justify-content:center}
.d-menu__b b{font-weight:500;font-size:var(--fs-14)}.d-menu__b span{font-size:var(--fs-12);color:var(--muted-700)}
.d-menu__b:hover{background:var(--sand-50)}
.d-pv{display:flex;flex-direction:column;gap:var(--sp-3)}
.d-pv__lead{margin:0}
.d-pdoc{border:1px solid var(--line-200);border-radius:var(--r-3);padding:12px 14px;background:var(--surface-0);display:flex;flex-direction:column;gap:var(--sp-2);min-width:0}
.d-pdoc__h{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px}.d-pdoc__h h3{margin:0;font-size:var(--fs-16)}
.d-pdoc__n{margin:0;font-size:var(--fs-13)}
.d-pdoc>.ui-btn{align-self:flex-start}
.d-psec{padding:8px 0;border-top:1px solid var(--line-200);display:flex;flex-direction:column;gap:6px}
.d-psec h4{margin:0;font-size:var(--fs-14);display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.d-psec .d-sec__t{margin:0}
.d-psec--rec{border:0;border-left:4px solid var(--teal-600);background:var(--teal-tint);border-radius:0 var(--r-2) var(--r-2) 0;padding:10px 12px;margin:4px 0}
.d-flat .ui-scard{border:0;padding:0;box-shadow:none;background:none}
.d-flat .ui-scard__h h2{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.rc[data-scope=denial] .rc__list{counter-reset:rcn}
.rc[data-scope=denial] .rc__card{counter-increment:rcn}
.rc[data-scope=denial] .rc__t::before{content:counter(rcn) ".";margin-right:.4em;font-weight:700;color:var(--teal-700)}
@media (max-width:760px){.d-menu ul{grid-template-columns:repeat(2,minmax(0,1fr))}.d-menu a,.d-menu__b{min-height:44px}.d-wwd__go,.d-wwd .ui-btn,.d-stand .ui-btn,.d-tools .ui-btn,.d-pk .ui-btn{min-height:44px}.d-pk__r .ui-btn{width:100%}}
`;

// the Update status menu (a menu button, not a disclosure): closes on a click away, on Escape and when an item is chosen; arrows move between items
const updClose = (focus) => { const u = document.getElementById('d-upd'); if (!u) return; const p = u.querySelector('.d-upd__p'); const b = u.querySelector('.d-upd__b'); if (p && !p.hidden) { p.hidden = true; b.setAttribute('aria-expanded', 'false'); if (focus) b.focus(); } };
if (typeof document !== 'undefined' && !window.__dUpdClose) {
  window.__dUpdClose = true;
  document.addEventListener('click', ev => { const u = document.getElementById('d-upd'); if (u && !u.contains(ev.target)) updClose(false); });
  document.addEventListener('keydown', ev => {
    const u = document.getElementById('d-upd'); if (!u) return; const p = u.querySelector('.d-upd__p'); if (!p || p.hidden) return;
    if (ev.key === 'Escape') { ev.preventDefault(); updClose(true); return; }
    const items = [...p.querySelectorAll('button')]; const i = items.indexOf(document.activeElement);
    if (ev.key === 'ArrowDown') { ev.preventDefault(); items[(i + 1) % items.length].focus(); } else if (ev.key === 'ArrowUp') { ev.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if (ev.key === 'Tab') updClose(false);
  });
}

register('DenialCase', class extends Screen {
  init() {
    const e = V.entry(this.params);
    this.state = { section: e.section, action: e.action, door: 'plain', editing: null, consent: false, rec: false, drTo: null };
    // old deep links: section=options (no action) meant "All paths open", section=history meant "History open"; both are side drawers now: the link lands on the Overview with that button focused (a page is never opened with a dialog already over it)
    this._arrive = e.paths ? 'paths' : e.section === 'history' ? 'history' : null;
  }
  get reqId() { return this.params.id; }
  get css() { return CASE_CSS + REC_PHONE_CSS; }
  // one context per paint: the case view, the evidence index (lazy) and the history (lazy)
  ctx() {
    const s = this.s; const me = this.me; const cv = D.caseView(s, this.reqId, me);
    let idx = null, hist = null, miss = null, recs = null;
    const cl = cv.c || {}; const no = cl.lauris_no || cl.harvest_no;
    const laurisUrl = api.config && api.config.laurisURL && me ? `${api.config.laurisURL}/login?as=${encodeURIComponent(me.id || 'jperez')}&next=${encodeURIComponent(no ? `/consumers/${no}` : '/consumers')}` : '';
    return { s, me, cv, ui, M, hrefFor, st: this.state, clinical: D.canReadClinical(me), extUrl: api.config && api.config.extURL || '', laurisUrl, canLauris: !!me && can(me, 'ext.use'),
      idx: () => idx || (idx = D.evidenceIndex(s, cv.d, cv.r, { read: D.canReadClinical(me) })), missing: () => D.canReadClinical(me) ? (miss || (miss = D.missingItems(s, cv.d, cv.r, idx || (idx = D.evidenceIndex(s, cv.d, cv.r, { read: true }))))) : [], history: () => hist || (hist = D.historyEvents(s, cv.d, cv.r)),
      // the suggestions (shared/recs.js): the treating clinician only, and only while the case is open (a closed case is write-once)
      recs: () => recs || (recs = D.canReadClinical(me) && cv.d && cv.open ? R.denialRecsFor(s, cv.d, cv.r, idx || (idx = D.evidenceIndex(s, cv.d, cv.r, { read: true }))) : []) };
  }
  renderVals() {
    const s = this.s; const r = M.byId(s.requests, this.reqId);
    const empty = html => ({ head: raw(`<nav class="ui-crumb" aria-label="Breadcrumb"><a href="#/DenialIntelligence">Denial Intelligence</a></nav><h1>Denial case</h1>`), menu: raw(''), body: raw(html), hist: raw('') });
    if (!r) return empty(ui.emptyState({ tone: 'error', title: 'Case not found', body: `There is no request ${this.reqId || ''}.`, action: { label: 'Back to Denial Intelligence', href: '#/DenialIntelligence' } }));
    const c = this.ctx(); const cv = c.cv;
    if (!cv.d) return empty(ui.emptyState({ title: `${r.id} is ${M.STAGE_LABEL[r.stage] || r.stage}`, body: 'Denial Intelligence works requests that need a payer-decision response: a partial offer, an information request, a peer-to-peer, a denial or an appeal.', action: { label: 'Open the authorization', href: hrefFor('Authorizations.dc.html?id=' + r.id) } }));
    const st = this.state;
    const body = { overview: V.overviewSection, said: V.saidSection, evidence: V.evidenceSection, weak: V.weakSection, action: V.actionSection, docreq: V.docreqSection, history: V.overviewSection }[st.section](c);
    return { head: raw(V.header(c)), menu: raw(V.menu(c)), body: raw(body), hist: raw('') };
  }
  after(root) {
    root.querySelectorAll('[data-x]').forEach(el => {
      const x = el.dataset.x;
      if (x === 'door') { el.onchange = () => this.setState({ door: el.value }); return; }
      if (x === 'consent') { el.onchange = () => { this.state.consent = el.checked; }; return; }
      el.onclick = ev => { ev.preventDefault(); if (x === 'upd') { const p = document.getElementById('d-upd-p'); const opening = p.hidden; p.hidden = !opening; el.setAttribute('aria-expanded', String(opening)); if (opening) p.querySelector('button').focus(); return; } updClose(false); this.act(x, el.dataset, el); };
    });
    // the shared card kit's own "Review suggestions" button opens the full list; it gets a stable id so focus can come back after a repaint
    root.querySelectorAll('[data-rc-open]').forEach(b => { b.id = 'd-rec-open'; b.onclick = ev => { ev.preventDefault(); this.openRecs(b); }; });
    if (this._arrive) { const bid = this._arrive === 'paths' ? 'd-t-paths' : 'd-hist-b'; this._arrive = null; setTimeout(() => { const b = document.getElementById(bid); if (b) { b.scrollIntoView({ block: 'center' }); b.focus({ preventScroll: true }); } }, 80); }
    root.querySelectorAll('[name=d-dr-to]').forEach(i => { i.onchange = () => { this.state.drTo = i.value; }; });
    if (this._focus) { const hh = root.querySelector('.d-body h2'); this._focus = false; if (hh) { hh.setAttribute('tabindex', '-1'); hh.focus({ preventScroll: true }); } }
  }
  // move inside the workspace without re-creating the screen: the URL follows (so a link can be copied), local state survives
  go({ section, action }) {
    this.state.section = section; this.state.action = action || null; this.state.editing = null; this._focus = true;
    ui.query.writeQuery({ section, action: action || '' });
    this.repaint();
  }
  async call(action, args, ok) {
    try { const res = await this.do(action, args); if (ok) toast(typeof ok === 'function' ? ok(res) : ok); return res; }
    catch { return null; }   // this.do already toasted the refusal
  }
  get d() { return D.byRequest(this.s, this.reqId); }
  async act(x, data, el) {
    const d = this.d; if (!d && x !== 'tab') return;
    const id = d && d.id;
    switch (x) {
      case 'tab': case 'goto': return this.go({ section: data.section, action: data.action || null });
      case 'step': return this.step(data.k, el);
      case 'call': return this.callFlow(el);
      case 'docreq': { const sec = el.closest('section'); const keys = [...sec.querySelectorAll('[name=d-dr-k]:checked')].map(i => i.value); const to = (sec.querySelector('[name=d-dr-to]:checked') || {}).value; if (!keys.length) return toast('Select at least one missing item', 'err'); return this.call('dispute.docRequest', { id, to, keys }, res => `Request recorded · ${res.items} item${res.items === 1 ? '' : 's'} · nothing was sent`); }
      case 'docrecv': return this.call('dispute.docReceived', { id, key: data.key }, 'Marked received');
      case 'gen': { const r = await this.call('dispute.genDoc', { id, doc: data.doc }, res => `Draft ready · ${res.sections} section${res.sections === 1 ? '' : 's'} from stored records${res.missing ? ` · ${res.missing} marked Evidence missing` : ''}`); return r; }
      case 'review': return this.call('dispute.reviewDoc', { id, doc: data.doc }, 'Reviewed. The review is withdrawn if the text changes.');
      case 'edit': this.setState({ editing: `${data.doc}:${data.sec}` }); return setTimeout(() => document.getElementById(`df-dc-${id}-${data.doc}-${data.sec}`.replace(/[^a-z0-9]+/gi, '-'))?.focus(), 30);
      case 'cancel': { if (this.state.editing) ui.draft.clear(`dc:${id}:${this.state.editing}`); return this.setState({ editing: null }); }
      case 'savesec': {
        const key = `dc:${id}:${data.doc}:${data.sec}`; const text = ui.draft.get(key, null);
        if (text == null) return this.setState({ editing: null });
        const r = await this.call('dispute.editDoc', { id, doc: data.doc, section: data.sec, text }, 'Section saved · review it again before it goes out');
        if (r) { ui.draft.clear(key); this.setState({ editing: null }); }
        return;
      }
      case 'incl': return this.call('dispute.includeEvidence', { id, ref: data.ref, include: data.include === '1' }, data.include === '1' ? 'Included in drafts. Regenerate to use it.' : 'Excluded from drafts. Regenerate to apply.');
      case 'choose': return this.call('dispute.choose', { id, path: data.path }, data.path === 'none' ? 'Path cleared' : 'Path chosen · nothing is sent yet').then(r => { if (r && data.path === 'recon') this.go({ section: 'action', action: 'reconsider' }); });
      case 'accept': return this.acceptFlow(data.mode, el);
      case 'p2preq': return this.p2pRequest(el);
      case 'schedule': return this.scheduleFlow(el);
      case 'outcome': return this.outcomeFlow(el);
      case 'recorddoc': return this.recordDocFlow(el);
      case 'assign': return this.assignFlow(el);
      case 'send': return this.sendFlow(data.doc, el);
      case 'guidance': { const g = payerGuidance(this.s, d.payer); ui.drawer({ title: g ? g.title : 'Payer guidance', body: payerGuidanceBody(g, ui), returnFocus: el }); return; }
      case 'print': return this.print();
      case 'savenotes': return this.saveNotes();
      case 'rec': return this.toggleRec();
      case 'recopen': return this.openRecs(el, { key: data.key });
      case 'recadd': return this.openRecs(el, { add: true });
      case 'packet': return this.openPacket(el);
      case 'paths': return this.openPaths(el);
      case 'level': return this.openLevel(el);
      case 'history': return this.openHistory(el);
      default: return;
    }
  }

  // ---------------------------------------------------------------------------------------------- R6: suggestions, packet preview and the other side drawers
  // "What Psyflo would do" in full: the shared card kit in a side drawer (DenialRecs.js; the queue opens the same drawer). `key` opens it at that card (the words box
  // when the card needs them); `add` opens the "Add your own" form. Focus goes back to the opener when it closes and stays on the same control after a decision.
  openRecs(el, o = {}) { return openDenialRecs({ ref: this.reqId, me: this.me, el, ...o }); }
  // buttons inside a drawer body (the packet preview, All paths): the drawer closes first, then the action runs from the page; `gen` drafts in place
  wireDrawer(dlg, handle, opener, refresh) {
    dlg.addEventListener('click', async ev => {
      const a = ev.target.closest('a[href^="#/"]'); if (a) { handle.close(); return; }
      const b = ev.target.closest('[data-x]'); if (!b) return; ev.preventDefault();
      const x = b.dataset.x; const data = { ...b.dataset };
      if (x === 'gen' && refresh) { const d = this.d; const res = await this.call('dispute.genDoc', { id: d.id, doc: data.doc }, r => `Draft ready · ${r.sections} section${r.sections === 1 ? '' : 's'} from stored records${r.missing ? ` · ${r.missing} marked Evidence missing` : ''}`); if (res) { refresh(); const t = dlg.querySelector(`.d-pdoc[data-doc="${data.doc}"] h3`); if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); } } return; }
      handle.close(); this.act(x, data, x === 'recopen' ? document.getElementById('d-packet') || opener : opener);
    });
  }
  // Preview packet: each draft with the "Added from recommendations" section highlighted and its evidence chips
  openPacket(el) {
    if (!D.canReadClinical(this.me)) return;
    const body = () => V.packetBody(this.ctx());
    return ui.drawer({ title: 'Preview packet', body: body(), returnFocus: el, actions: [{ label: 'Close', tone: 'secondary' }], onMount: (dlg, handle) => this.wireDrawer(dlg, handle, el, () => handle.update({ body: body() })) });
  }
  openPaths(el) { return ui.drawer({ title: 'All paths', body: V.pathsBody(this.ctx()), returnFocus: el, actions: [{ label: 'Close', tone: 'secondary' }], onMount: (dlg, handle) => this.wireDrawer(dlg, handle, el) }); }
  openLevel(el) { return ui.drawer({ title: 'Level of care', body: V.levelBody(this.ctx()), returnFocus: el, actions: [{ label: 'Close', tone: 'secondary' }] }); }
  openHistory(el) { return ui.drawer({ title: 'History', body: V.historyBody(this.ctx()), returnFocus: el, actions: [{ label: 'Close', tone: 'secondary' }] }); }

  // ---------------------------------------------------------------------------------------------- the seven recommended steps (slide-over panels)
  async step(k, el) {
    const d = this.d; if (!d) return; const id = d.id;
    if (k === 'analyze' || k === 'gaps') {
      if (!D.canWork(this.me)) return toast('Needs clinician', 'err');
      const res = await this.call('dispute.analyze', { id, step: k }, r => k === 'analyze' ? `Analysis ready · ${r.points} point${r.points === 1 ? '' : 's'} from stored records` : `${r.missing} item${r.missing === 1 ? '' : 's'} not documented`);
      if (res) this.panel(k, el); return;
    }
    if (k === 'docreq') return this.go({ section: 'docreq' });
    if (k === 'appeal') return this.go({ section: 'action', action: 'appeal' });
    if (k === 'p2p') return this.go({ section: 'action', action: 'p2p' });
    if (k === 'recon') return this.go({ section: 'action', action: 'reconsider' });
    if (k === 'review') return this.panel('review', el);
  }
  panel(k, el) {
    const c = this.ctx(); const d = c.cv.d; const title = { analyze: 'Analyze Denial', gaps: 'Identify Missing Evidence', review: 'Mark for Clinical Review' }[k];
    const review = k === 'review';
    const h = ui.drawer({ title, body: V.panelBody(c, k), returnFocus: el, initialFocus: review ? '#d-rv' : undefined,
      actions: review ? [{ label: 'Cancel', tone: 'secondary' }, { label: d.review ? 'Update review' : 'Mark for Clinical Review', tone: 'primary', onClick: async hh => {
        const to = hh.dialog.querySelector('#d-rv').value; const note = hh.dialog.querySelector('#d-rvn').value;
        const res = await this.call('dispute.markReview', { id: d.id, to, note }, r => `Marked for clinical review · ${M.staff(this.s, r.to).name}`); if (!res) return false;
      } }] : [{ label: 'Close', tone: 'secondary' }],
      onMount: (dlg, handle) => dlg.querySelectorAll('[data-px]').forEach(b => { b.onclick = () => { handle.close(); this.go({ section: b.dataset.section, action: b.dataset.action || null }); }; }) });
    return h;
  }
  // The simulated voice agent. A person starts it and a person records it. Hours come from seed/extra/payer-hours.json (an unverified demo assumption);
  // a closed line cannot be called (the server refuses too). Nothing is saved unless the person presses "Save the call record".
  callFlow(el) {
    const c = this.ctx(); const cv = c.cv; const d = cv.d; const r = cv.r; const pf = cv.payer.first; const ln = cv.line; const now = M.now(this.s);
    const hours = `<dl class="d-hours"><div><dt>Line</dt><dd>${esc(pf)} ${esc((ln.line || 'provider services').toLowerCase())}</dd></div><div><dt>Hours</dt><dd>${esc(ln.summary)} (Eastern) ${srcHint({ category: ln.category, source: ln.source, verified_on: ln.verified_on })}</dd></div><div><dt>Right now</dt><dd>${ln.open ? ui.chip('Open now', { tone: 'success', icon: 'check' }) : ui.chip('Closed now', { tone: 'warning', icon: 'clock' })} <span class="d-sm ui-muted">Demo clock ${esc(fmtDateTime(now, { dow: true }))}${!ln.open && ln.nextOpen ? ' · opens ' + esc(ln.nextOpen.label) : ''}${!ln.known ? ' · no hours on file' : ''}</span></dd></div></dl>`;
    const earlier = (d.calls || []).length ? `<h3 class="d-sm">Earlier call records (${d.calls.length})</h3><ul class="d-calls">${d.calls.slice().reverse().map(x => `<li><b>${esc(fmtDateTime(x.at))}</b> · ${esc(x.purpose_label)} · ${esc(M.staff(this.s, x.by).name)}${x.ref ? ' · ref ' + esc(x.ref) : ''}<br><span class="d-sm">${esc(x.outcome)}</span></li>`).join('')}</ul>` : '';
    const body = `<div class="d-call"><p class="d-modal-note">${ui.chip('Simulated', { tone: 'outline', className: 'ui-chip--sim' })} Nothing is dialled and no payer is contacted. The call runs from a script built from this case. You record what the payer said; nothing is saved until you do. A call is never a payer decision.</p>${hours}
      <fieldset class="d-radios"><legend>What is the call about?</legend>${D.CALL_PURPOSES.map(([k, l], i) => `<label><input type="radio" name="d-cp" value="${k}"${i === 0 ? ' checked' : ''}> ${esc(l)}</label>`).join('')}</fieldset>
      <div class="ui-btnrow"><button type="button" class="ui-btn ui-btn--primary ui-btn--sm" id="d-run"${ln.open ? '' : ' disabled'}>${ui.icon('phone', 14)} Run the simulated call</button>${ln.open ? '' : `<span class="d-sm ui-muted">The line is closed, so no call can be run or recorded.</span>`}</div>
      <ol class="d-script" id="d-script" aria-live="polite" hidden></ol>
      <div id="d-rec" hidden>${field('d-out', 'What did the payer say? (required, your own words)', '<textarea class="ui-textarea" id="d-out" rows="3" maxlength="600" style="width:100%;padding:8px 12px"></textarea>', 'The script above is a placeholder: a payer answer is only what you type here.')}${field('d-ref', 'Reference number the payer gave (optional)', '<input class="ui-input" id="d-ref" maxlength="40">')}</div>${earlier}</div>`;
    this.dialog({ title: `Call ${pf} · voice agent`, size: 'lg', confirm: 'Save the call record', returnFocus: el, initialFocus: '#d-cp', body,
      onMount: dlg => {
        const save = dlg.querySelector('[data-ui-action="1"]'); if (save && !ln.open) save.disabled = true;
        const run = dlg.querySelector('#d-run'); const list = dlg.querySelector('#d-script'); const rec = dlg.querySelector('#d-rec');
        run.onclick = () => {
          const purpose = dlg.querySelector('[name=d-cp]:checked').value; const lines = D.callScript(this.s, d, r, purpose); dlg.dataset.ran = purpose;
          list.innerHTML = ''; list.hidden = false; run.disabled = true;
          const slow = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
          lines.forEach((l, i) => setTimeout(() => {
            const li = document.createElement('li'); li.className = 'd-script__l d-script__l--' + l.who; li.innerHTML = `<span class="d-script__w">${l.who === 'agent' ? 'Voice agent · Simulated' : 'Payer line · scripted placeholder'}</span><span>${esc(l.text)}</span>`; list.appendChild(li);
            if (i === lines.length - 1) { rec.hidden = false; run.disabled = false; run.textContent = 'Run it again'; }
          }, slow ? i * 450 : 0));
        };
      },
      onSubmit: async dlg => {
        const purpose = dlg.dataset.ran; if (!purpose) { toast('Run the simulated call first', 'err'); return false; }
        const outcome = dlg.querySelector('#d-out').value.trim(); if (outcome.length < 3) { toast('Write what the payer said, in your own words', 'err'); return false; }
        const res = await this.call('dispute.logCall', { id: d.id, purpose, outcome, ref: dlg.querySelector('#d-ref').value }, 'Call record saved · simulated, with your name and the time'); if (!res) return false;
      } });
  }

  // ---------------------------------------------------------------------------------------------- dialogs
  dialog({ title, body, confirm = 'Save', tone = 'primary', size = 'md', returnFocus, onSubmit, initialFocus, onMount }) {
    return ui.modal({ title, body, size, returnFocus, initialFocus, onMount, actions: [{ label: 'Cancel', tone: 'secondary' }, { label: confirm, tone, onClick: async h => { try { const ok = await onSubmit(h.dialog); return ok === false ? false : undefined; } catch (e) { return false; } } }] });
  }
  async acceptFlow(mode, el) {
    const c = this.ctx(); const cv = c.cv; const r = cv.r; const u = cv.units; const pf = cv.payer.first; const d = cv.d;
    let text, plan = {};
    if (mode === 'denial') text = `<p>Close ${esc(r.id)}: ${esc(pf)}'s denial is accepted, with no appeal and no reconsideration.</p><p class="d-modal-note">Logged with your name and the time. Nothing is sent to ${esc(pf)}.</p>`;
    else if (mode === 'stretch') { const sp = V.stretchPlan(c); if (!sp) return toast('No end date is recorded to spread the units to', 'err'); plan = { mode, until: sp.until, per_week: Math.max(1, Math.round(sp.perWeek)) }; text = `<p>Accept <b>${u.offered}</b> of ${u.requested} units and spread them to last until <b>${esc(fmtDate(sp.until))}</b>: about <b>${sp.perWeek} units a week</b> (${sp.perDay} a school day) instead of ${sp.usualWeek}.</p><p class="d-modal-note">Logged on the request only. Nothing is sent to ${esc(pf)}. A task asks a person to enter the units in Lauris.</p>`; }
    else if (mode === 'use_up') { plan = { mode, runout: u.runOut }; text = `<p>Accept <b>${u.offered}</b> of ${u.requested} units and keep the same care (${u.rate} a school day). Units run out about <b>${esc(fmtDate(u.runOut))}</b>; then discharge and start a new initial.</p><p class="d-modal-note">Logged on the request only. Next you set the transition dates.</p>`; }
    else { plan = { mode: 'plain' }; text = `<p>Accept <b>${u.offered}</b> of ${u.requested} units as offered.</p><p class="d-modal-note">Logged on the request only. Nothing is sent to ${esc(pf)}. A task asks a person to enter the units in Lauris; Psyflo does not.</p>`; }
    this.dialog({ title: mode === 'denial' ? 'Accept the denial' : 'Log the decision', body: text, confirm: 'Log it', tone: mode === 'denial' ? 'danger' : 'primary', returnFocus: el, onSubmit: async () => {
      const res = await this.call('dispute.choose', { id: d.id, path: 'accept', plan }, mode === 'denial' ? `${r.id} closed · denial accepted` : `Logged on ${r.id}: ${u.offered} units accepted · a task asks a person to enter them in Lauris`);
      if (!res) return false;
      if (mode === 'use_up') go('EarlyDischarge.dc.html', { id: r.id }); else this.go({ section: 'said' });
    } });
  }
  p2pRequest(el) {
    const cv = this.ctx().cv; const d = cv.d; const pf = cv.payer.first;
    this.dialog({ title: `Ask ${pf} for a peer-to-peer`, confirm: 'Log the request', returnFocus: el, initialFocus: '#d-p2pw', body: `<p>Logged on the request; nothing is sent. ${esc(pf)} calls to agree a time, which happens outside Psyflo.</p>${field('d-p2pw', 'Call date and time, if already agreed (optional)', '<input class="ui-input" id="d-p2pw" type="datetime-local">')}`,
      onSubmit: async dlg => { const when = dlg.querySelector('#d-p2pw').value; const res = await this.call('dispute.choose', { id: d.id, path: 'p2p', plan: when ? { when } : {} }, when ? `Peer-to-peer logged · call ${fmtDateTime(when, { dow: true })}` : 'Peer-to-peer requested · enter the date when it is set'); if (!res) return false; this.go({ section: 'action', action: 'p2p' }); } });
  }
  scheduleFlow(el) {
    const cv = this.ctx().cv; const d = cv.d; const r = cv.r; const pf = cv.payer.first;
    this.dialog({ title: r.p2p_at ? 'Change the call' : 'Set the call', confirm: 'Save the call', returnFocus: el, initialFocus: '#d-when',
      body: `<p class="d-modal-note">The time ${esc(pf)} agreed with you by phone. Psyflo does not call anyone.</p>${field('d-when', 'Date and time', `<input class="ui-input" id="d-when" type="datetime-local" value="${esc((r.p2p_at || '').slice(0, 16))}">`)}${field('d-ref', 'Payer reference number (optional)', `<input class="ui-input" id="d-ref" value="${esc((d.p2p || {}).ref || '')}">`)}${field('d-rev', 'Reviewer (optional)', `<input class="ui-input" id="d-rev" value="${esc((d.p2p || {}).reviewer || '')}">`)}`,
      onSubmit: async dlg => { const when = dlg.querySelector('#d-when').value; if (!when) { toast('Enter a date and time', 'err'); return false; } const res = await this.call('dispute.schedule', { id: d.id, when, ref: dlg.querySelector('#d-ref').value, reviewer: dlg.querySelector('#d-rev').value }, `Call set · ${fmtDateTime(when, { dow: true })}`); if (!res) return false; } });
  }
  outcomeFlow(el) {
    const c = this.ctx(); const cv = c.cv; const d = cv.d; const r = cv.r; const pf = cv.payer.first; const isP2P = D.P2P_STAGES.includes(r.stage);
    const kind = isP2P ? 'p2p' : r.stage === 'appeal_sent' ? 'appeal' : 'recon';
    const prior = (r.decision_log || []).some(x => x.kind === kind && !x.superseded_by);
    const opts = isP2P ? [['awaiting', 'Call held · awaiting the decision'], ['approved', `Approved all ${r.units_requested} units`], ['partial', 'Approved in part'], ['denied', 'Denied']] : [['approved', `Approved all ${r.units_requested} units`], ['partial', 'Approved in part'], ['denied', 'Decision upheld (denied)']];
    const def = r.stage === 'p2p_awaiting' ? 'approved' : opts[0][0];
    this.dialog({ title: `Record ${pf}'s outcome`, confirm: 'Record the outcome', returnFocus: el,
      body: `<fieldset class="d-radios"><legend>What did ${esc(pf)} decide?</legend>${opts.map(([v, l]) => `<label><input type="radio" name="d-oc" value="${v}"${v === def ? ' checked' : ''}> ${esc(l)}</label>`).join('')}</fieldset>
      <div id="d-ocu-w" hidden>${field('d-ocu', 'Units approved in total', `<input class="ui-input" id="d-ocu" type="number" min="1" max="${r.units_requested}" style="width:140px">`, `At most ${r.units_requested}. Approved units go to Psyflo's tracker; a person enters them in Lauris.`)}</div>
      <div id="d-ocd-w">${field('d-ocd', 'Document reference (required)', '<input class="ui-input" id="d-ocd" placeholder="Letter, fax or portal reference">', 'A payer decision is stored once, with the document that states it.')}</div>
      ${prior ? field('d-ocr', 'Reason for the correction (a decision is already recorded)', '<input class="ui-input" id="d-ocr">') : ''}
      ${field('d-ocn', 'Note (optional)', `<textarea class="ui-textarea" id="d-ocn" rows="3" style="width:100%;padding:8px 12px">${esc(r.p2p_recording ? 'From the call: ' + String(r.p2p_recording.notes || r.p2p_recording.transcript || '').slice(0, 400) : '')}</textarea>`)}`,
      onMount: dlg => {
        // show the units field only when it applies, and the document field only for a decision
        const sync = () => { const v = dlg.querySelector('[name=d-oc]:checked').value; dlg.querySelector('#d-ocu-w').hidden = !['approved', 'partial'].includes(v); dlg.querySelector('#d-ocd-w').hidden = v === 'awaiting'; const u = dlg.querySelector('#d-ocu'); if (v === 'approved') u.value = r.units_requested; else if (v !== 'partial') u.value = ''; };
        dlg.querySelectorAll('[name=d-oc]').forEach(i => { i.onchange = sync; }); sync();
      },
      onSubmit: async dlg => {
        const outcome = dlg.querySelector('[name=d-oc]:checked').value; const units = +dlg.querySelector('#d-ocu').value || undefined; const doc_ref = dlg.querySelector('#d-ocd').value.trim(); const notes = dlg.querySelector('#d-ocn').value.trim();
        const reason = dlg.querySelector('#d-ocr') ? dlg.querySelector('#d-ocr').value.trim() : undefined;
        if (outcome !== 'awaiting' && doc_ref.length < 3) { toast('Enter the document reference that states the decision', 'err'); return false; }
        if (outcome === 'partial' && !units) { toast('Enter the units approved', 'err'); return false; }
        const res = await this.call('dispute.resolve', { id: d.id, outcome, units: outcome === 'approved' ? (units || r.units_requested) : units, doc_ref: doc_ref || undefined, notes, reason }, rs => {
          const rr = M.byId(this.s.requests, r.id); return `Outcome logged · ${r.id} is now ${M.STAGE_LABEL[rr.stage] || rr.stage}${rr.stage === 'active' ? ` · ${rr.units_awarded} units recorded; a task asks a person to enter them in Lauris` : ''}`; });
        if (!res) return false;
        this.go({ section: 'said' });
      } });
  }
  recordDocFlow(el) {
    const d = this.d;
    this.dialog({ title: 'Record the decision document', confirm: 'Record it', returnFocus: el, initialFocus: '#d-doc', body: `<p class="d-modal-note">The letter, fax or portal reference that states the payer's decision. It is stored once; a correction later needs a reason.</p>${field('d-doc', 'Document reference', '<input class="ui-input" id="d-doc" placeholder="For example: Sentara decision letter, Oct 30">')}`,
      onSubmit: async dlg => { const ref = dlg.querySelector('#d-doc').value.trim(); if (ref.length < 3) { toast('Enter the document reference', 'err'); return false; } const res = await this.call('dispute.recordDecision', { id: d.id, doc_ref: ref }, 'Decision document recorded'); if (!res) return false; } });
  }
  assignFlow(el) {
    const s = this.s; const d = this.d; const staff = (s.staff || []).filter(x => x.role !== 'direct_support');
    const owners = staff.filter(x => x.role === 'clinician'); const opt = (list, cur, none) => (none ? '<option value="">None</option>' : '') + list.map(x => `<option value="${esc(x.id)}"${x.id === cur ? ' selected' : ''}>${esc(x.name)}${x.credential ? ', ' + esc(x.credential) : ''} · ${esc(x.title || x.role)}</option>`).join('');
    this.dialog({ title: 'Owner and backup', confirm: 'Save', returnFocus: el, initialFocus: '#d-own', body: `<p class="d-modal-note">The owner replies to the payer, so must be a licensed clinician. The backup can cover when the owner is away.</p>${field('d-own', 'Owner', `<select class="ui-select" id="d-own">${opt(owners, d.owner)}</select>`)}${field('d-bak', 'Backup', `<select class="ui-select" id="d-bak">${opt(staff.filter(x => x.id !== d.owner), d.backup, true)}</select>`)}`,
      onSubmit: async dlg => { const res = await this.call('dispute.assign', { id: d.id, owner: dlg.querySelector('#d-own').value, backup: dlg.querySelector('#d-bak').value || undefined }, 'Owner saved'); if (!res) return false; } });
  }
  sendFlow(doc, el) {
    const c = this.ctx(); const cv = c.cv; const d = cv.d; const r = cv.r; const pf = cv.payer.first; const portal = r.channel !== 'fax';
    const what = { info: 'the reply to the information request', appeal: 'the signed appeal letter', recon: 'the reconsideration request' }[doc];
    if (doc === 'recon' && portal) {
      const url = `${c.extUrl}/${r.channel}/upload?request=${encodeURIComponent(r.id)}&kind=reply`;
      return this.dialog({ title: `Send in ${M.CHANNEL_LABEL[r.channel]}`, confirm: 'Record the confirmation', returnFocus: el, initialFocus: '#d-conf',
        body: `<p>A person sends the request in their own ${esc(M.CHANNEL_LABEL[r.channel])} login. <a href="${esc(url)}" target="_blank" rel="noopener">Open ${esc(M.CHANNEL_LABEL[r.channel])} (opens a new tab)</a></p>${field('d-conf', 'Confirmation number shown by the portal', '<input class="ui-input" id="d-conf">', 'Entered by you; Psyflo does not read it from the payer.')}`,
        onSubmit: async dlg => { const ref = dlg.querySelector('#d-conf').value.trim(); if (ref.length < 4) { toast('Enter the confirmation number the portal shows', 'err'); return false; } const res = await this.call('dispute.send', { id: d.id, doc, ref }, `Request sent · confirmation ${ref} entered by you`); if (!res) return false; } });
    }
    const appealPortal = doc === 'appeal' && portal;
    this.dialog({ title: appealPortal ? 'Mark ready for upload' : 'Send', confirm: appealPortal ? 'Mark ready' : portal ? `Open ${M.CHANNEL_LABEL[r.channel]}` : 'Send by fax', returnFocus: el,
      body: appealPortal ? `<p>Mark ${esc(what)} ready to upload to ${esc(pf)}.</p><p class="d-modal-note">This is not a send. A person uploads it in ${esc(M.CHANNEL_LABEL[r.channel])}, in their own login. Psyflo does not sign in or submit anything, and records the send only when the ${esc(M.CHANNEL_LABEL[r.channel])} page shows a confirmation number.</p>` : `<p>Send ${esc(what)} to ${esc(pf)}.</p><p class="d-modal-note">${portal ? `Opens ${esc(M.CHANNEL_LABEL[r.channel])} in a new tab, in your own login. The confirmation number is read from that page.` : "A person presses Send. The Sfax stub (simulated) records the reference; nothing real is faxed."}</p>`,
      onSubmit: async () => {
        let w = null; if (portal && !appealPortal) { try { w = window.open('', '_blank'); } catch { } }
        const res = await this.call('dispute.send', { id: d.id, doc }, rr => rr.ref && /^F-\d+/.test(rr.ref) ? `Sent · simulated Sfax ref ${rr.ref}` : appealPortal ? `Marked ready to upload · not sent until ${M.CHANNEL_LABEL[r.channel]} shows a confirmation` : `${M.CHANNEL_LABEL[r.channel]} opened · paste the reply and upload there`);
        if (!res) { if (w) w.close(); return false; }
        if (res.open) { const url = `${c.extUrl}${res.open}`; if (w) w.location.href = url; else window.open(url, '_blank'); } else if (w) w.close();
      } });
  }

  // ---------------------------------------------------------------------------------------------- p2p notes, print, recording
  async saveNotes() {
    const d = this.d; const r = M.byId(this.s.requests, this.reqId); const key = `dc:${d.id}:p2pnotes`; const text = String(ui.draft.get(key, '') || '').trim();
    if (!text) return toast('Type or record notes first', 'err');
    const res = await this.call('request.p2pRecording', { id: r.id, transcript: text, consent: this.state.consent, typed: !this._heard }, this._heard ? 'Recording saved' : 'Call notes saved to ' + r.id);
    if (res !== null) ui.draft.clear(key);
  }
  toggleRec() {
    const d = this.d; const key = `dc:${d.id}:p2pnotes`;
    if (this.state.rec) { this._sr && this._sr.stop(); return; }
    if (!this.state.consent) return toast('Confirm that everyone on the call agreed to be recorded first', 'err');
    const C = SR(); if (!C) return toast('Speech to text needs Chrome; type notes instead', 'err');
    const sr = new C(); sr.continuous = true; sr.interimResults = true; sr.lang = 'en-US';
    const base = String(ui.draft.get(key, '') || '').trim(); let finals = '';
    sr.onresult = ev => { this._heard = true; let interim = ''; for (let i = ev.resultIndex; i < ev.results.length; i++) { const t = ev.results[i][0].transcript; if (ev.results[i].isFinal) finals += t + ' '; else interim += t; } const v = [base, finals + interim].filter(Boolean).join(' ').trim(); ui.draft.set(key, v); const ta = document.getElementById('df-' + key.replace(/[^a-z0-9]+/gi, '-')); if (ta) ta.value = v; };
    sr.onerror = ev => { this.setState({ rec: false }); toast(ev.error === 'not-allowed' ? 'Microphone blocked · type notes instead' : 'Recording stopped · ' + ev.error, 'err'); };
    sr.onend = () => { if (this.state.rec) this.setState({ rec: false }); };
    this._sr = sr; try { sr.start(); this.setState({ rec: true }); } catch { toast('Could not start the microphone', 'err'); }
  }
  async print() {
    const c = this.ctx(); const cv = c.cv; const d = cv.d; const doc = (d.docs || {}).p2p; if (!doc) return toast('Draft the talking points first', 'err');
    const blocks = [{ text: `Peer-to-peer call notes · ${cv.r.id} · ${cv.c.initials} · ${cv.payer.name}`, size: 14, bold: true }, { text: `${cv.r.p2p_at ? 'Call ' + fmtDateTime(cv.r.p2p_at, { dow: true }) : 'Call date not set'} · rule-based draft from stored evidence (Simulated) · ${doc.reviewed ? 'reviewed by a clinician' : 'not reviewed'}`, size: 10 },
      ...doc.sections.flatMap(x => [{ text: x.title, bold: true, gap: 8 }, { text: x.text }]),
      { text: 'Questions to clarify', bold: true, gap: 8 }, ...D.clarifyQuestions(this.s, d, cv.r, c.idx()).map(q => ({ text: '• ' + q })),
      { text: 'Assembled from stored records. Synthetic demo data.', size: 9, gap: 12 }];
    let w = null; try { w = window.open('', '_blank'); } catch { }
    try { const res = await this.do('file.pdf', { name: `${cv.r.id}_peer_to_peer_call_notes.pdf`, title: 'Peer-to-peer call notes', blocks, kind: 'p2p_brief', record: cv.r.id }); const url = res && res.file && res.file.url; if (url) { if (w) w.location.href = url; else window.open(url, '_blank'); } else if (w) w.close(); } catch { if (w) w.close(); }
  }
});
