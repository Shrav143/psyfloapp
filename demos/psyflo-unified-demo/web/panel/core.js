// The Psyflo extension panel, core (E5). Same code in the MV3 side panel and in the mock Lauris in-page fallback:
// it talks to the page bridge with postMessage (the side panel relays to the content script).
// It reads the page the user has open, drafts from Psyflo's own records and types into the open form only when the
// user presses a button. It never presses Process Form, Get Signature or Send, and never reads another Lauris page.
//
// This file owns: bridge messaging, the panel state, the session (the Lauris user on the open page), wrong-patient and
// least-privilege guards, the view router, the shared chrome (header, patient bar, status line) and the ctx every view receives.
// Everything a person sees in the body comes from a view module (views/*.js, listed in views/index.js).
import { api } from '../js/api.js';
import { esc } from '../js/runtime.js';
import * as M from '../js/shared/model.js';
import { can } from '../js/shared/permissions.js';
import { fmtDate, fmtTime } from '../js/shared/dates.js';
import { ui } from '../js/ui/index.js';
import * as parts from './parts.js';
import { VIEWS } from './views/index.js';

const { I, banner, legend, FORM_NAME } = parts;
const root = document.getElementById('panel');
const statusEl = document.getElementById('px-status');
export const P = { page: null, event: null, ui: {}, vst: {}, view: null, rec: null, logo: '', seen: null };
window.__psyfloPanel = P;
const framed = window.parent !== window;

// ---------------------------------------------------------------- transport to the page bridge
let seq = 0; const waiting = new Map();
function send(msg) { if (framed) window.parent.postMessage(Object.assign({ psyflo: 'panel' }, msg), '*'); }
export function call(cmd, args = {}) {
  return new Promise(res => { const id = ++seq; waiting.set(id, res); send(Object.assign({ cmd, id }, args)); setTimeout(() => { if (waiting.has(id)) { waiting.delete(id); res({ error: 'The Lauris page did not answer' }); } }, 20000); });
}
window.addEventListener('message', e => {
  if (e.source !== window.parent) return;
  const d = e.data; if (!d || d.psyflo !== 'bridge') return;
  if (d.id && waiting.has(d.id)) { waiting.get(d.id)(d.result); waiting.delete(d.id); return; }
  if (d.type === 'page') onPage(d.page, d.event);
  // presenter commands: { psyflo:'present', cmd:'example'|'script'|'view', ... } (the dock and the tests drive these)
});
// presenter commands: { psyflo:'present', cmd:'example'|'script'|'view', view? }. They arrive as a window message from the frame around the panel, or on the
// BroadcastChannel 'psyflo-present' (the presenter dock and the panel share the app's origin, so the dock can reach a nested panel that way).
function onPresent(d) {
  if (!d || d.psyflo !== 'present') return;
  const v = activeView(); const h = v && v.present && v.present[d.cmd];
  if (h) Promise.resolve(h(ctx, d)).catch(err => flash(err.message || String(err), 'r'));
  else if (d.cmd === 'view' && VIEWS[d.view]) go(d.view);
}
window.addEventListener('message', e => { if (e.source === window || e.source === window.parent || e.source === window.top) onPresent(e.data); });
try { new BroadcastChannel('psyflo-present').onmessage = e => onPresent(e.data); } catch (e) { }

// ---------------------------------------------------------------- page, session, identity
async function onPage(page, event) {
  const changed = !P.page || P.page.url !== page.url;
  P.page = page;
  if (event) P.event = event; else if (changed) P.event = null;
  if (changed) { leaveAll(); P.ui = {}; P.vst = {}; P.view = null; P.seen = null; P.accState = {}; }
  await panelSession();
  draw();
  openHook();
}
function leaveAll() { for (const v of Object.values(VIEWS)) { try { v.leave && v.leave(ctx); } catch (e) { console.error(e); } } }
// The panel acts as the Lauris user on the open page (demo-grade sign-in; the server decides what that person may do).
// An unknown Lauris user has no Psyflo access: fail closed, nothing is read, drafted or typed.
async function panelSession() {
  const me = meFromPage();
  try {
    if (!me.id) { if (api.session && api.session()) await api.signOut(); return; }
    if (!api.session || !api.session() || api.session().id !== me.id) await api.signIn(me.id);
  } catch (e) { console.error('panel sign-in', e); }
}
export const S = () => api.state;
export function meFromPage() {
  const u = P.page?.user || ''; const st = (S() && S().staff) || [];
  // no fallback to a default person: an unrecognised Lauris user is nobody (fail closed)
  return st.find(x => u && (u.startsWith(x.name) || u.startsWith(x.name.replace(/^(\w)\w+ /, '$1. ')))) || { id: null, name: u || 'Unknown user', role: null, unknown: true };
}
// Wrong-patient protection: the Harvest # is the key and the initials on the open page must agree (the identity card).
// Never matched by initials alone.
export function clientForPage() {
  const c = P.page?.consumer; if (!c) return null;
  const no = Number(c.no);
  const m = S().clients.find(x => no && (x.lauris_no === no || x.harvest_no === no)) || null;
  if (m && c.initials && String(c.initials).replace(/\s/g, '') !== m.initials.replace(/\s/g, '')) return null;
  return m;
}
export function identityStop() {
  const c = P.page?.consumer; if (!c || !c.no) return null;
  const no = Number(c.no);
  const m = S().clients.find(x => no && (x.lauris_no === no || x.harvest_no === no));
  return m && c.initials && String(c.initials).replace(/\s/g, '') !== m.initials.replace(/\s/g, '') ? m : null;
}
export const appURL = path => (window.__vapp || location.origin) + '/' + path;   // hosted preview: the panel is a srcdoc frame; the page's virtual app origin
const roleLabel = r => M.ROLE_LABEL[r] || 'Not signed in';
// can() for the signed-in person; an 'A' grant is scoped to the person's caseload (the projection already holds only that caseload)
export function canDo(cap, scope) {
  const a = api.session && api.session(); if (!a) return false;
  const actor = { ...a, caseload: a.role === 'direct_support' ? (S().clients || []).filter(c => c.staff === a.id).map(c => c.id) : a.caseload };
  return can(actor, cap, scope);
}

// ---------------------------------------------------------------- the view router
const SESSION_VIEW = { screening: 'scribe', cna: 'scribe', dpn: 'scribe', weekly: 'scribe', collateral: 'scribe', incident: 'incident', isp: 'authorize', 'sra-initial': 'authorize', 'sra-continued': 'authorize', quarterly: 'docs', discharge: 'docs' };
export function autoView(p) {
  if (!p) return 'home';
  switch (p.kind) {
    case 'session': return SESSION_VIEW[p.form?.type] || 'home';
    case 'new-consumer': return 'scribe';
    case 'approvals': case 'approval': return 'authorize';
    case 'surveys': case 'saved': case 'rejected': case 'portal-form': case 'portal-confirmation': return 'docs';
    default: return 'home';
  }
}
export const activeViewId = () => (P.view && VIEWS[P.view]) ? P.view : autoView(P.page);
const activeView = () => VIEWS[activeViewId()];
export function go(id) { if (!VIEWS[id]) return; if (id !== activeViewId()) { const old = activeView(); try { old && old.leave && old.leave(ctx); } catch (e) { console.error(e); } } P.view = id; P.openKey = null; draw(); window.scrollTo(0, 0); root.scrollTop = 0; openHook(); }
// a view's one-time work when its page opens (typing the boxes the record already holds, dropping a waiting dictation)
async function openHook() {
  const p = P.page; if (!p || !S()) return;
  const key = p.url + '|' + (p.form?.session || 'new') + '|' + activeViewId();
  if (P.openKey === key) return; P.openKey = key;
  const v = activeView();
  if (!clientForPage() && p.kind !== 'new-consumer' && !(v && v.openAlways)) return;
  if (identityStop() || !api.session || !api.session()) return;
  if (v && v.onOpen) { try { await v.onOpen(ctx); } catch (e) { console.error(e); } }
}

// ---------------------------------------------------------------- helpers shared by the views
export function flash(msg, kind = 'g') {
  P.ui.flash = { msg, kind }; if (statusEl) statusEl.textContent = msg; draw();
  setTimeout(() => { if (P.ui.flash && P.ui.flash.msg === msg) { P.ui.flash = null; draw(); } }, 6000);
}
const flashHTML = () => P.ui.flash ? banner(P.ui.flash.kind === 'r' ? 'r' : P.ui.flash.kind === 'y' ? 'y' : '', esc(P.ui.flash.msg)) : '';
export const nav = path => call('navigate', { url: path });
const openApp = hash => window.open(appURL(hash), '_blank', 'noopener');

// Type boxes into the open form (yellow) and record what was typed and from which sources (panel.filled). The person presses
// Process Form. Nothing is typed when the page shows a different student than Psyflo's record (the hard stop).
export async function fill(boxes, { form, client, sources, animate = true } = {}) {
  if (identityStop()) { flash('Wrong student? Nothing was typed.', 'r'); return { error: 'wrong patient' }; }
  const clean = (boxes || []).filter(b => b && b.value != null && String(b.value) !== '' && !b.missing && !/^Evidence missing/.test(String(b.value)));
  P.ui.filling = true; draw();
  const r = await call('fill', { fields: clean.map(b => ({ label: b.label, value: b.value })), opts: { animate } });
  P.ui.filling = false;
  if (r.error) { flash(r.error, 'r'); return r; }
  P.ui.filled = (P.ui.filled || []).concat(r.filled || []);
  const done = clean.filter(b => (r.filled || []).includes(b.label));
  if (done.length && client) api.do('panel.filled', { client: client.id, form, boxes: done, sources }).catch(() => { });
  const n = new Set(done.map(b => b.row || b.label)).size;
  flash(`${n} box${done.length === 1 ? '' : 'es'} typed into the form · yellow · check them, then press ${form === 'new-consumer' ? 'Save Consumer' : form === 'survey' ? 'Save Survey' : 'Process Form'}${r.missing?.length ? ` · not found on this form: ${r.missing.join(', ')}` : ''}`, r.missing?.length ? 'y' : 'g');
  return r;
}

const ctx = {
  S, me: meFromPage, role: () => meFromPage().role, client: clientForPage, esc, I, ui, parts, M, fmtDate, fmtTime,
  get page() { return P.page; }, get event() { return P.event; }, get view() { return activeViewId(); }, get pg() { return P.ui; },
  get st() { const id = activeViewId(); return (P.vst[id] = P.vst[id] || {}); },
  stOf: id => (P.vst[id] = P.vst[id] || {}),
  can: canDo, do: (action, args) => api.do(action, args), api, call, fill, flash, draw, go, nav, openApp,
  identityStop, appURL
};
export { ctx };

// ---------------------------------------------------------------- chrome
function header(title, { connected = true } = {}) {
  const me = meFromPage();
  return `<header class="ph"><span class="logo">${P.logo}</span><div class="pt"><h1>${esc(title)}</h1><span><i class="${connected ? '' : 'off'}"></i>${connected ? 'Lauris connected' : 'Waiting for Lauris'}</span></div>${me.role ? `<span class="rolechip">${esc(roleLabel(me.role))}</span>` : ''}</header>`;
}
const foot = () => `<div class="foot"><i></i>Demo data · nothing is real · reads only the page you have open</div>`;
function docStatus(p) {
  const f = p.form; if (!f || p.kind !== 'session') return '';
  const s = S(); const sid = f.session;
  if (!sid) return ui.chip('Draft · not saved', { tone: 'neutral', size: 'sm' });
  if ((s.notes || []).some(n => String(n.session) === String(sid)) || (s.lauris_versions || []).some(v => String(v.session) === String(sid) && v.event === 'processed')) return ui.chip('Processed in Lauris', { tone: 'success', size: 'sm', icon: 'check' });
  if ((s.lauris_versions || []).some(v => String(v.session) === String(sid))) return ui.chip('Saved in Lauris', { tone: 'info', size: 'sm' });
  return ui.chip('Open in Lauris', { tone: 'neutral', size: 'sm' });
}
function patientBar(p, c) {
  const k = p.consumer; if (!k || !k.no) return '';
  const sch = c ? M.school(S(), c.school) : null;
  return `<div class="pbar" role="group" aria-label="Open student"><b>${esc(k.initials || (c && c.initials) || '')}</b><span class="m">Harvest #${esc(k.no)}</span>${sch && sch.name ? `<span class="m">${esc(sch.name)}</span>` : ''}<span class="m">${esc(k.program || 'TDT')}</span>${p.kind === 'session' && p.form ? `<span class="m">· ${esc(FORM_NAME[p.form.type] || p.form.title || 'form')}</span>` : ''}<span class="st">${docStatus(p)}</span></div>`;
}
function page(title, body, { legendOn = false, connected = true, p = null, c = null, back = false } = {}) {
  return header(title, { connected }) + (p ? patientBar(p, c) : '') + (legendOn ? legend() : '') + (back ? backRow() : '') + `<div class="body">${flashHTML()}${body}</div>` + foot();
}
const backRow = () => `<div class="back"><button type="button" data-act="__home">${I.back}<span>Home</span></button></div>`;

function stopCard(p, stop) {
  const sch = M.school(S(), stop.school);
  return `<div class="idcard" role="alert"><b>Wrong student?</b> Nothing was read, drafted or typed.
    <dl><dt>Lauris page</dt><dd>${esc(p.consumer.initials)} · Harvest #${esc(p.consumer.no)}</dd><dt>Psyflo record</dt><dd>${esc(stop.initials)} · Harvest #${esc(stop.harvest_no || stop.lauris_no)}${sch && sch.name ? ' · ' + esc(sch.name) : ''}</dd></dl>
    <div class="row w" style="margin-top:10px"><button class="btn o" data-act="__students">Change student</button></div></div>`;
}

function viewHTML() {
  const s = S();
  if (!s) return header('Psyflo', { connected: false }) + '<div class="body">Loading…</div>';
  if (!framed) return page('Psyflo panel', `<p>This is the Psyflo panel. It runs beside a Lauris page: open the mock Lauris (${esc(api.config.laurisURL)}) and the panel appears at the right, or install the extension from <code>extension/</code> and open its side panel.</p><a class="btn p" href="${esc(api.config.laurisURL)}/login?as=jperez">Open the mock Lauris</a>`, { connected: false });
  const p = P.page;
  if (!p) return page('Psyflo', banner('n', 'Waiting for the page… If this stays, reload the Lauris tab.'), { connected: false });
  const me = meFromPage();
  if (p.user && !api.session()) return page('No access', banner('n', `<b>${esc(me.name)} is not a Psyflo user.</b> Nothing is read, drafted or typed. Ask an administrator to add you on Settings.`, { icon: I.no }));
  if (p.kind === 'login') return page('Not signed in', banner('n', '<b>Sign in to Lauris.</b> Psyflo reads only the page you have open and types only into a form you have open. It never signs in for you.'));
  if (me.role === 'admin') return page('No access', banner('n', '<b>Not permitted.</b> The administrator role has no clinical-record access. The panel reads and drafts nothing from this page.', { icon: I.no }));
  const stop = identityStop();
  if (stop) return page('Stop', stopCard(p, stop));
  if (p.consumer && p.consumer.program && p.consumer.program !== 'TDT') return page('Off for this record', banner('n', `<b>Psyflo is off for ${esc(p.consumer.initials)}.</b> This record is in ${esc(p.consumer.program)}. The extension works with TDT consumers only; it reads and types nothing here.`), { p, c: null });
  if (!canDo('ext.use')) return page('No access', banner('n', `<b>Not permitted.</b> ${esc(roleLabel(me.role))} does not use the panel.`, { icon: I.no }));
  const c = clientForPage();
  const vid = activeViewId(); const v = VIEWS[vid];
  if (v.cap && !canDo(v.cap)) {
    const why = { scanEnhance: 'Scan & Enhance is for licensed clinical staff.', trackTime: 'Track Time is for the staff who work with students.', 'drafts.clinical': 'Authorization drafts are for clinicians.', 'notes.own': 'This is for the staff who write the notes.' }[v.cap] || 'Your role does not use this part of the panel.';
    return page(v.label, banner('n', esc(why), { icon: I.lock }) + (vid !== 'home' ? '<button class="btn o" data-act="__home">Back to home</button>' : ''), { p, c });
  }
  let body = ''; try { body = v.html(ctx) || ''; } catch (e) { console.error(e); body = `<pre style="white-space:pre-wrap;color:var(--danger-fg)">${esc(e.stack || e)}</pre>`; }
  let mini = ''; const tv = VIEWS.time; if (tv && tv.mini && vid !== 'time' && canDo('trackTime')) { try { mini = tv.mini(ctx) || ''; } catch (e) { console.error(e); } }
  const title = v.title ? v.title(ctx) : v.label;
  return header(title) + patientBar(p, c) + (v.legend === false ? '' : legend()) + (vid !== 'home' ? backRow() : '') + `<div class="body">${flashHTML()}${body}</div>` + (mini ? `<div class="mini">${mini}</div>` : '') + foot();
}

// ---------------------------------------------------------------- one review card open at a time (the 400 px budget: <= 2 screens)
// A draft review lists every box; only the card the person is on shows its three-way body. The others show their label and state.
function foldReviews() {
  const stateOf = i => ((i.className.match(/ui-dr__item--(\w+)/) || [])[1]) || 'pending';
  root.querySelectorAll('.ui-dr').forEach(dr => {
    const id = dr.getAttribute('data-ui-id'); const items = [...dr.querySelectorAll('.ui-dr__item')]; if (!items.length) return;
    P.drOpen = P.drOpen || {}; P.drSeen = P.drSeen || {};
    let open = items.find(i => i.dataset.item === P.drOpen[id]);
    const editing = items.find(i => i.querySelector('textarea'));
    if (editing) open = editing;
    else if (!open) open = items.find(i => stateOf(i) === 'pending') || items[0];
    else if (P.drSeen[id + ':' + open.dataset.item] === 'pending' && stateOf(open) !== 'pending') {          // decided: move on to the next card that needs one
      const after = items.slice(items.indexOf(open) + 1).find(i => stateOf(i) === 'pending') || items.find(i => stateOf(i) === 'pending');
      if (after) open = after;
    }
    items.forEach(i => {
      const on = i === open; i.classList.toggle('px-open', on); P.drSeen[id + ':' + i.dataset.item] = stateOf(i);
      const h = i.querySelector('.ui-dr__ih'); if (!h) return;
      h.setAttribute('role', 'button'); h.tabIndex = 0; h.setAttribute('aria-expanded', String(on));
      h.onclick = () => { P.drOpen[id] = i.dataset.item; foldReviews(); }; h.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); h.click(); } };
    });
    P.drOpen[id] = open.dataset.item;
  });
}

// ---------------------------------------------------------------- drawing
let drawing = false;
export function draw() {
  if (drawing) return; drawing = true;
  requestAnimationFrame(() => {
    drawing = false;
    const y = root.scrollTop; const se = document.scrollingElement; const wy = se ? se.scrollTop : 0;
    const ae = document.activeElement; const inRoot = ae && root.contains(ae);
    const tag = e => (e.dataset.k || e.dataset.f || e.dataset.ref || e.dataset.m || e.dataset.i || e.dataset.id || e.dataset.view || '');
    const fkey = inRoot ? (ae.id ? '#' + ae.id : ae.getAttribute('aria-label') ? 'L' + ae.getAttribute('aria-label') : ae.dataset.in ? 'I' + ae.dataset.in : ae.dataset.ch ? 'C' + ae.dataset.ch : ae.getAttribute('data-ui-draft') ? 'D' + ae.getAttribute('data-ui-draft') : ae.dataset.act ? 'A' + ae.dataset.act + '\u0001' + tag(ae) : ae.dataset.uiDr ? 'R' + ae.dataset.uiDr + '\u0001' + (ae.dataset.item || '') : null) : null;
    const sel = fkey && 'selectionStart' in ae ? [ae.selectionStart, ae.selectionEnd] : null;
    try { root.innerHTML = viewHTML(); } catch (e) { console.error(e); root.innerHTML = header('Psyflo') + `<div class="body"><pre style="white-space:pre-wrap;color:var(--danger-fg)">${esc(e.stack || e)}</pre></div>`; }
    // an accordion keeps the state the person gave it across a repaint (the live state pushes one every few seconds)
    if (P.accState) for (const [id, open] of Object.entries(P.accState)) { const d = root.querySelector(`details[data-acc="${CSS.escape(id)}"]`); if (d && d.open !== open) d.open = open; }
    foldReviews();
    const v = (S() && P.page) ? activeView() : null;
    if (v && v.after) { try { v.after(root, ctx); } catch (e) { console.error(e); } }
    root.scrollTop = y; if (se) se.scrollTop = wy;
    if (fkey) {
      let el = null;
      if (fkey[0] === 'A' || fkey[0] === 'R') {
        const [a, t] = fkey.slice(1).split('\u0001');
        el = [...root.querySelectorAll(fkey[0] === 'A' ? `[data-act="${CSS.escape(a)}"]` : `[data-ui-dr="${CSS.escape(a)}"]`)].find(e => (fkey[0] === 'A' ? tag(e) : (e.dataset.item || '')) === t && !e.disabled) || null;
      } else {
        const q = fkey[0] === '#' ? '#' + CSS.escape(fkey.slice(1)) : fkey[0] === 'L' ? `[aria-label="${CSS.escape(fkey.slice(1))}"]` : fkey[0] === 'I' ? `[data-in="${CSS.escape(fkey.slice(1))}"]` : fkey[0] === 'C' ? `[data-ch="${CSS.escape(fkey.slice(1))}"]` : `[data-ui-draft="${CSS.escape(fkey.slice(1))}"]`;
        el = root.querySelector(q);
      }
      if (el) { el.focus({ preventScroll: true }); if (sel) try { el.setSelectionRange(...sel); } catch (e) { } }
    }
  });
}
root.addEventListener('toggle', e => { const d = e.target; if (d && d.matches && d.matches('details[data-acc]')) { (P.accState = P.accState || {})[d.dataset.acc] = d.open; } }, true);

// ---------------------------------------------------------------- events: data-act / data-in / data-ch -> the active view's handlers
const CORE = {
  __home: () => go('home'),
  __students: () => nav('/consumers'),
  nav: el => nav(el.dataset.href),
  openApp: el => openApp(el.dataset.href),
  goView: el => go(el.dataset.view)
};
const handler = (kind, name) => { const v = activeView(); return (v && v[kind] && v[kind][name]) || (kind === 'acts' ? CORE[name] : null); };
root.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
  const fn = handler('acts', el.dataset.act); if (!fn) return;
  e.preventDefault(); Promise.resolve(fn(el, ctx, e)).catch(err => flash(err.message || String(err), 'r'));
});
root.addEventListener('input', e => { const el = e.target.closest('[data-in]'); const fn = el && handler('ins', el.dataset.in); if (fn) fn(el, ctx, e); });
root.addEventListener('change', e => { const el = e.target.closest('[data-ch]'); const fn = el && handler('chs', el.dataset.ch); if (fn) fn(el, ctx, e); });

// ---------------------------------------------------------------- boot
(async function boot() {
  await api.init('');
  P.logo = (await fetch('/js/logo.svg').then(r => r.text())).replace(/width="\d+" height="\d+"/, 'width="78" height="26"');
  api.onChange(() => draw());
  if (framed) {
    send({ cmd: 'hello' });
    const r = await call('hello');
    if (r && r.page) onPage(r.page, r.event);
  }
  draw();
})();
