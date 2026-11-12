// App shell: routing (with the redirect table), sessions and roles, the light rail, the presenter dock, landmarks and focus,
// the "How the data gets in" notes drawer, and the base class every screen controller extends.
//
// Product viewport = rail + #stage/#root. The presenter dock (#dock) sits ABOVE it and is the only place presenter controls live.
import * as API from './api.js';
import { loadScreen, paint, DCLogic, esc, raw, matchClose } from './runtime.js';
import { SCREENS, BY_ID, LEVEL, homeTarget, homeFor, resolveRoute, isLive, legacyFor } from './registry.js';
import * as M from './shared/model.js';
import { ExtComposite } from './ext-composite.js';
import { ui } from './ui/index.js';
import { mountDock, presenterDock, MODES } from './ui/dock.js';
import { overlay } from './ui/overlay.js';
import { makeSim } from './ui/sim.js';
import { visibleNav, activeItem } from './shared/nav.js';
import { featuresFor, LEVEL_ORDER } from './shared/maturity.js';
import { icon } from './ui/util.js';
import './ui/flo.js';   // FLO, the assistant: listens for the top bar's `psyflo:topbar` event (id 'flo') and opens its chat drawer
import './ui/bell.js';  // the bell: notification centre (flags, payer items, deadlines, units); listens for `psyflo:topbar` (id 'bell') and keeps the unread number on the bell
import { isHosted, setHash } from './shared/links.js';   // hosted preview (hosted/index.html): no-ops in the Node build

const api = API.api;
let PERM = null; // shared/permissions.js, loaded at boot (the server enforces the same table)

const controllers = {};
export function register(id, Cls) { controllers[id] = Cls; }

// ---------- tiny storage helpers (private windows and blocked storage must not break the page) ----------
const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { } }, del(k) { try { localStorage.removeItem(k); } catch { } } };
const flag = name => { const a = new URLSearchParams(location.search).get(name); if (a != null) return a; const h = location.hash.split('?')[1]; return h ? new URLSearchParams(h).get(name) : null; };

// ---------- session (who is signed in) ----------
// Two paths coexist: the server session of api.js (signIn / signOut / session()) when present, and the old localStorage
// psyflo_user id. session.user is always the staff record of whoever is signed in (or null).
const apiFn = n => (typeof API[n] === 'function' ? API[n] : typeof api[n] === 'function' ? api[n].bind(api) : null);
function apiActor() {
  const f = apiFn('session'); if (!f) return null;
  try { const r = f(); if (!r || typeof r.then === 'function') return null; return r.actor || r.user || r; } catch { return null; }
}
let authPending = null; // a sign-in or sign-out in flight; route() waits for it
export const session = {
  get actor() {
    const u = this.user; if (!u) return null; const a = apiActor();
    return { ...u, presenter: !!(a && a.presenter), designations: (a && a.designations) || u.designations || [] };
  },
  get user() {
    const a = apiActor(); const portal = a && (a.kind === 'guardian' || a.kind === 'school');
    const id = (a && !portal && a.id) || (!portal && ls.get('psyflo_user')) || null;
    if (!id || !api.state) return null;
    return M.byId(api.state.staff, id) || (a && a.id === id ? { id, name: a.name, role: a.role, initials: String(a.name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase(), credential: a.credential } : null);
  },
  // api.js signs in first (a server session), then the old localStorage key follows so both paths agree; Login and the dock await nothing,
  // route() waits for authPending.
  signIn(id, opts) { const f = apiFn('signIn'); if (isHosted()) opts = { presenter: true, ...opts }; /* hosted preview: presenter mode is on for every sign-in */ const p = (async () => { if (f) await f(id, opts); ls.set('psyflo_user', id); })(); authPending = p.catch(() => { }); return p; },
  signOut() { const f = apiFn('signOut'); const p = (async () => { if (f) await f(); ls.del('psyflo_user'); })(); authPending = p.catch(() => { }); return p; },
  get level() { const u = this.user; return u ? LEVEL[u.role] || 0 : 0; },
  get schoolUser() { try { return M.byId(api.state.school_users, ls.get('psyflo_school_user') || 'rbell'); } catch { return (api.state.school_users || [])[0]; } },
  setSchoolUser(id) { ls.set('psyflo_school_user', id); }
};
// May this user open this route? shared/permissions.js decides (the server uses the same table); without it, the old levels.
export function canOpen(id, user = session.user) {
  const meta = BY_ID[id]; if (!meta) return false;
  if (meta.min === 0) return true;
  if (!user) return false;
  if (PERM && id in PERM.ROUTE_CAPS) { const a = apiActor(); return PERM.routeAllowed(user.role, id, { ...user, presenter: !!(a && a.presenter), designations: (a && a.designations) || user.designations || [] }); }
  return meta.min <= (LEVEL[user.role] || 0);
}
// canSee(id) -> may the signed-in user open it; canSee(id, level) -> the old question "would this level see it"
export const canSee = (id, lvl) => { if (lvl == null) return canOpen(id); const s = BY_ID[id]; return !!s && (s.min === 0 || lvl >= s.min); };

// ---------- base controller ----------
export class Screen extends DCLogic {
  constructor(params) { super(params); this.params = params || {}; this.state = {}; }
  get s() { return api.state; }
  get me() { return session.user; }
  get M() { return M; }
  get ui() { return ui; }
  init() { }
  renderVals() { return {}; }
  // optional one-time template surgery: prepare(tpl) => tpl
  async do(action, args) { try { return await api.do(action, args); } catch (e) { toast(e.message, 'err'); throw e; } }
  go(target, params) { go(target, params); }
  toast(m, k) { toast(m, k); }
}
export const sim = makeSim(api, M);
export { api, M, raw, esc, ui, overlay };

// ---------- routing ----------
function parseRoute() {
  const p = isHosted() ? '' : location.pathname;   // hosted: the page can live at any path; routes are hashes
  let m;
  if ((m = p.match(/^\/f\/([\w-]+)/))) return { id: 'FamilyLink', params: { t: m[1] } };
  if ((m = p.match(/^\/parent\/([\w-]+)(?:\/(\w+))?/))) return { id: m[2] || 'ParentPortal', params: { ...Object.fromEntries(new URLSearchParams(location.search)), t: m[1] } };
  const h = location.hash.replace(/^#\/?/, '');
  if (!h) return null;
  const [id, qs] = h.split('?');
  return { id: id.replace(/\.dc\.html$/, ''), params: Object.fromEntries(new URLSearchParams(qs || '')) };
}
function hashFor(id, params) {
  const q = new URLSearchParams(); for (const [k, v] of Object.entries(params || {})) if (v != null && v !== '') q.set(k, v);
  const s = q.toString(); return '#/' + id + (s ? '?' + s : '');
}
// hrefFor('Submission.dc.html?id=R-0399') -> '#/Authorization?id=R-0399&section=submission' once that redirect is live
export function hrefFor(target, params) {
  let [id, qs] = String(target).replace(/^\.?\//, '').replace(/^#\/?/, '').split('?');
  id = id.replace(/\.dc\.html$/, '');
  const q = new URLSearchParams(qs || ''); for (const [k, v] of Object.entries(params || {})) if (v != null) q.set(k, v);
  const r = resolveRoute({ id, params: Object.fromEntries(q) }, { role: session.user?.role });
  if (r.presenter) return hashFor(id, Object.fromEntries(q)); // a presenter redirect has no page of its own: keep the old link
  return hashFor(r.id, r.params);
}
export function go(target, params) {
  const h = hrefFor(target, params);
  if (!isHosted() && location.pathname !== '/' && location.pathname !== '/index.html') { location.href = '/' + h; return; }
  if (location.hash === h) route(); else setHash(h);
}

// ---------- toasts & modal (the old signatures, now on the overlay primitive) ----------
export const toast = ui.toast;
let legacyModal = null;
// modal(html, (box, close) => …): the original helper. Now role=dialog, labelled, trapped, Escape closes, focus returns.
export function modal(html, onMount) {
  if (legacyModal) { legacyModal.close('replaced'); legacyModal = null; }
  const h = overlay.open({ kind: 'modal', legacy: true, html, onClose: () => { if (legacyModal === h) legacyModal = null; } });
  legacyModal = h;
  if (onMount) onMount(h.dialog, () => h.close());
  return h;
}

// ---------- the rail ----------
let LOGO = '';
const roleLabel = r => (PERM && PERM.ROLE_LABEL && PERM.ROLE_LABEL[r]) || M.ROLE_LABEL[r] || r;
function railHTML(currentId) {
  const u = session.user; if (!u || !api.state) return '';
  const nav = visibleNav(session.actor, { allowed: id => canOpen(id), state: api.state });
  const on = (activeItem(currentId) || {}).id;
  const link = (it, small) => {
    const t = it.target; const label = it.label + (it.countText ? ', ' + it.countText : '');
    return `<li><a class="sh-nav__i${small ? ' sh-nav__i--small' : ''}" href="${esc(hrefFor(t.id, t.params))}" aria-label="${esc(label)}" title="${esc(it.label)}"${on === it.id ? ' aria-current="page"' : ''}>${icon(it.icon, small ? 19 : 20)}<span class="sh-nav__l">${esc(it.label)}</span>${it.count ? `<span class="sh-nav__n" aria-hidden="true">${it.count}</span>` : ''}</a></li>`;
  };
  const initials = esc(u.initials || String(u.name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2));
  const logoT = nav.logo.target;
  return `<a class="sh-logo" href="${esc(hrefFor(logoT.id, logoT.params))}" aria-label="Psyflo, Dashboard"${on === 'my-work' ? ' aria-current="page"' : ''}>${LOGO.replace('<svg ', '<svg aria-hidden="true" focusable="false" ').replace(/role="img"\s*aria-label="[^"]*"/, '')}<small>Harvest Outreach Center · TDT</small></a>
  <nav class="sh-nav" aria-label="Main"><ul>${nav.primary.length || nav.secondary.length ? nav.primary.map(i => link(i)).join('') : link({ ...nav.logo, icon: 'home', countText: '', count: 0, target: logoT })}</ul>${nav.secondary.length ? `<div class="sh-nav__sep" role="separator"></div><ul>${nav.secondary.map(i => link(i, true)).join('')}</ul>` : ''}</nav>
  <div class="sh-foot">
    <div class="sh-demo"><i aria-hidden="true"></i><span>Demo data · nothing is real</span></div>
    <button type="button" class="sh-help" data-sh="help" aria-label="Help" title="Help">${icon('help', 19)}<span class="sh-lbl">Help</span></button>
    <div class="sh-user"><span class="sh-user__av" aria-hidden="true">${initials}</span><div class="sh-user__t"><b>${esc(u.name)}</b><span>${esc(roleLabel(u.role))}</span></div><a class="sh-signout" href="#/Login" data-signout aria-label="Sign out ${esc(u.name)}" title="Sign out">${icon('logout', 18)}<span class="sh-lbl">Sign out</span></a></div>
  </div>`;
}
let railKey = '';
function renderRail(force) {
  const rail = document.getElementById('rail'); if (!rail) return;
  const html = current && current.meta.surface === 'app' && current.id !== 'Login' || (!current && session.user) ? railHTML(current ? current.id : '') : '';
  if (!force && html === railKey) return;
  railKey = html;
  const had = rail.contains(document.activeElement) ? (document.activeElement.getAttribute('href') || document.activeElement.dataset.sh) : null;
  rail.innerHTML = html; rail.hidden = !html;
  renderTopbar(!!html);
  if (had) { const el = [...rail.querySelectorAll('a[href],button')].find(e => (e.getAttribute('href') || e.dataset.sh) === had); if (el) el.focus({ preventScroll: true }); }
}
// ---------- the top bar: FLO (the assistant) and the bell (notifications), on every platform page ----------
// The bar only dispatches `psyflo:topbar` ({ id: 'flo' | 'bell', opener }); web/js/ui/flo.js and web/js/ui/bell.js listen and open their drawers.
// window.psyfloTopbar.setBadge('bell', n) puts an unread count on a button.
const TOPBAR = { badges: {} };
function applyTopbarBadges() {
  const el = document.getElementById('topbar'); if (!el) return;
  for (const id of ['flo', 'bell']) {
    const b = el.querySelector(`[data-topbar="${id}"]`); if (!b) continue; const n = TOPBAR.badges[id] || 0; const dot = b.querySelector('.sh-top__dot');
    if (dot) { dot.hidden = !n; dot.textContent = n > 9 ? '9+' : String(n); }
    b.setAttribute('aria-label', (id === 'bell' ? 'Notifications' : 'FLO assistant') + (n ? `, ${n} unread` : ''));
  }
}
function renderTopbar(show) {
  const el = document.getElementById('topbar'); if (!el) return;
  el.hidden = !show;
  if (!show || el.dataset.ready) { if (show) applyTopbarBadges(); return; }
  el.dataset.ready = '1';
  el.innerHTML = `<div class="sh-top__in"><button type="button" class="sh-top__b sh-top__flo" data-topbar="flo" aria-haspopup="dialog" aria-label="FLO assistant">${icon('sparkle', 18)}<span>FLO</span></button><button type="button" class="sh-top__b sh-top__bell" data-topbar="bell" aria-haspopup="dialog" aria-label="Notifications">${icon('bell', 20)}<span class="sh-top__dot" hidden></span></button></div>`;
  el.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-topbar]'); if (b) window.dispatchEvent(new CustomEvent('psyflo:topbar', { detail: { id: b.dataset.topbar, opener: b } })); });
  applyTopbarBadges();
}
window.psyfloTopbar = { setBadge(id, n) { TOPBAR.badges[id] = Math.max(0, +n || 0); applyTopbarBadges(); } };

function openHelp(returnFocus) {
  ui.drawer({ title: 'Help', returnFocus, body: `<h3 class="sh-note__h">Keyboard</h3><dl class="sh-help-k"><dt>${ui.kbd('Tab')}</dt><dd>First stop is "Skip to main content"</dd><dt>${ui.kbd('Esc')}</dt><dd>Close a drawer, dialog or popover</dd><dt>${ui.kbd('↑')} ${ui.kbd('↓')}</dt><dd>Move between rows of a queue</dd><dt>${ui.kbd('Enter')}</dt><dd>Open the focused row</dd></dl>
    <h3 class="sh-note__h">About this demo</h3><p>Demo data · nothing is real. Psyflo drafts and records. A person presses Process Form, Get Signature and Send, and a person signs.</p>` });
}

// ---------- notes drawer ("How the data gets in") ----------
let NOTES = {};
async function loadNotes() {
  try {
    const md = await fetch('/seed/notes.md').then(r => r.text());
    for (const part of md.split(/\n## /).slice(1)) {
      const file = (part.match(/\(`(\w+)\.dc\.html`\)/) || [])[1];
      if (file) NOTES[file] = part.split('\n').slice(1).join('\n').trim();
    }
  } catch { }
}

// ---------- the presenter dock ----------
const DOCK_KEY = 'psyflo_dock', MODE_KEY = 'psyflo_mode', MAT_KEY = 'psyflo_maturity';
let mode = 'presentation', dockState = 'hidden', maturityOn = false;
function initDockState() {
  const m = flag('mode'); mode = MODES[m] ? m : (MODES[ls.get(MODE_KEY)] ? ls.get(MODE_KEY) : 'presentation'); if (MODES[m]) ls.set(MODE_KEY, m);
  const p = flag('present') ?? flag('presenter');
  dockState = ls.get(DOCK_KEY) === 'open' || ls.get(DOCK_KEY) === 'collapsed' ? ls.get(DOCK_KEY) : 'hidden';   // no ribbon until asked for (Ctrl+Shift+P or ?present=1), hosted preview included: it was a distraction in the demo (feedback Nov 12)
  if (p === '0') dockState = 'hidden'; else if (p != null && p !== '') dockState = 'open';
  if (mode === 'explore') dockState = 'open';
  if (innerWidth <= 700 && dockState === 'open') dockState = 'collapsed'; // phone widths: a 24 px handle until tapped
  if (p === '1' || p === 'architecture') ls.set(DOCK_KEY, 'open');
  maturityOn = ls.get(MAT_KEY) === 'all'; document.documentElement.dataset.maturity = maturityOn ? 'all' : '';
}
const dockEl = () => document.getElementById('dock');
function dockModel() {
  const u = session.user;
  const pi = apiFn('presenterInfo') ? apiFn('presenterInfo')() : {}; const a = apiActor();
  return { state: dockState, mode, preset: api.state && api.state.preset, today: api.state ? M.fmtDate(api.state.today, { dow: true }) : '', maturityOn, canSim: !!u, simReason: 'Sign in as staff first', presenter: !!(a && a.presenter), pinRequired: !!(pi && pi.pin_required) };
}
let dockKey = '';
function renderDock(force) {
  const el = dockEl(); if (!el) return;
  const html = presenterDock(dockModel());
  if (force || html !== dockKey || el.dataset.state !== dockState) {
    const focusTag = el.contains(document.activeElement) ? document.activeElement.dataset.dock : null;
    dockKey = html; el.dataset.state = dockState; el.dataset.mode = mode; el.hidden = dockState === 'hidden'; el.innerHTML = html;
    if (focusTag) el.querySelector(`[data-dock="${focusTag}"]`)?.focus({ preventScroll: true });
  }
  measureDock();
}
function measureDock() { const el = dockEl(); const h = !el || dockState === 'hidden' ? 0 : Math.ceil(el.getBoundingClientRect().height); document.documentElement.style.setProperty('--dock-h', h + 'px'); }
function setDock(s) {
  if (mode === 'explore' && innerWidth > 700) s = 'open';
  dockState = s; ls.set(DOCK_KEY, s); renderDock(true);
  if (s === 'hidden') (document.getElementById('main') || document.getElementById('root') || document.body).focus?.({ preventScroll: true });
  else dockEl().querySelector('[data-dock="toggle"]')?.focus({ preventScroll: true });
  if (current) renderRail(true);
}
function setMode(m) {
  mode = m; ls.set(MODE_KEY, m); if (m === 'explore') dockState = 'open'; renderDock(true);
  toast(m === 'explore' ? 'Explore mode · all features by role' : 'Presentation mode');
}
function setMaturity(on) { maturityOn = on; ls.set(MAT_KEY, on ? 'all' : ''); document.documentElement.dataset.maturity = on ? 'all' : ''; renderDock(true); }

const STAFF_FOR_ROLE = { direct_support: 'khale', supervisor: 'cdiaz', clinician: 'jperez', admin: 'dowens' };
const SURFACE_LABEL = { app: 'Platform', ext: 'Lauris panel', phone: 'Phone', parent: 'Family portal', school: 'School portal', canvas: 'Reference' };
const FALLBACK_SCENARIOS = [
  { id: 's1', n: 1, title: 'Daily documentation', role: 'direct_support', caseLabel: 'M.R.', surface: 'phone', route: 'MobileApp' },
  { id: 's2', n: 2, title: 'School referral to intake', role: 'clinician', caseLabel: 'REF-118', surface: 'platform', route: 'Referral', params: { id: 'REF-118' } },
  { id: 's3', n: 3, title: 'Initial authorization', role: 'clinician', caseLabel: 'R-0416', surface: 'Lauris + panel', route: 'ExtSRA', params: { client: 'TW' } },
  { id: 's4', n: 4, title: 'Continued-stay evidence', role: 'clinician', caseLabel: 'M.R.', surface: 'Lauris + panel', route: 'ExtCase', params: { client: 'MR' } },
  { id: 's5', n: 5, title: 'Payer decision', role: 'clinician', caseLabel: 'D.W.', surface: 'platform', route: 'Partials', params: { id: 'R-0402' } },
  { id: 's6', n: 6, title: 'Leadership view', role: 'admin', caseLabel: 'All cases', surface: 'platform', route: 'Analytics' }
];
const SURF = { phone: 'Phone', school: 'School portal', platform: 'Platform', lauris: 'Lauris + panel', panel: 'Lauris + panel', family: 'Family portal' };
function scenarioList() {
  const src = (api.state && api.state.scenarios) || (api.config && api.config.scenarios);
  const arr = Array.isArray(src) ? src : src && typeof src === 'object' ? Object.entries(src).map(([id, v]) => ({ id, ...v })) : null;
  const list = arr && arr.length ? arr : FALLBACK_SCENARIOS;
  const label = c => (c && typeof c === 'object' ? c.label || c.request || c.referral || c.client : c) || '';
  return list.map((s, i) => ({ ...s, id: s.id ?? 's' + (i + 1), n: s.n ?? i + 1, title: s.title || s.name || s.id, roleLabel: roleLabel(s.role) || s.role, caseLabel: s.caseLabel || label(s.case) || s.student || '', surfaceLabel: s.surfaceLabel || SURF[s.surface] || s.surface || '' }));
}
function parseTarget(t, params) {
  if (!t) return null;
  if (typeof t === 'object') return { id: String(t.id || t.route).replace(/\.dc\.html$/, ''), params: { ...(t.params || {}), ...(params || {}) } };
  const [id, qs] = String(t).replace(/^#\/?/, '').replace(/^\.?\//, '').split('?');
  return { id: id.replace(/\.dc\.html$/, ''), params: { ...Object.fromEntries(new URLSearchParams(qs || '')), ...(params || {}) } };
}
// Presenter mode is an explicit elevation (server/psyflo/session.js): nothing signs in as a presenter on its own. The dock's controls call this
// first; the server grants it unless DEMO_PRESENTER=0, and asks for the PIN only when PRESENTER_PIN is set (api.askPin below).
async function ensurePresenter() {
  const a = apiActor(); const u = session.user;
  if (u && a && !a.presenter && apiFn('signIn')) {
    await session.signIn(u.id, { presenter: true }); authPending = null;
    const b = apiActor(); if (!b || !b.presenter) throw new Error('Presenter mode is off on this server.');
  }
}
function askPin(reason) {
  return new Promise(res => {
    const h = ui.modal({ title: 'Presenter PIN', size: 'sm', initialFocus: '#presenter-pin', dismissable: true,
      body: `<p>${esc(reason || 'The presenter tools (reset, advance the day, simulated replies, role switching) need the PIN set for this demo machine.')}</p><div class="ui-field"><label class="ui-label" for="presenter-pin">PIN</label><input class="ui-input" id="presenter-pin" type="password" inputmode="numeric" autocomplete="off" spellcheck="false"></div>`,
      actions: [{ label: 'Cancel', tone: 'secondary', result: null }, { label: 'Unlock presenter tools', tone: 'primary', keepOpen: true, onClick: d => { d.close(d.dialog.querySelector('#presenter-pin').value || ''); return false; } }],
      onMount: d => { d.querySelector('#presenter-pin').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); d.querySelector('[data-ui-action="1"]').click(); } }); } });
    h.closed.then(r => res(typeof r === 'string' && r !== 'scrim' && r !== 'close' && r !== 'Cancel' ? r : null));
  });
}
api.askPin = askPin;
async function signInAs(staffId) { await session.signIn(staffId, { presenter: true }); authPending = null; await api.refresh(true); }
function guardianLink() {
  const fls = (api.state && api.state.family_links) || []; const fl = fls.find(f => f.referral === 'REF-118') || fls[0];
  return fl && fl.token ? '/parent/' + fl.token + '/ParentPortal' : null;
}
async function applyRole(role, staffId, login) {
  const as = apiFn('signInAs');
  if (role === 'guardian') { if (as) { try { await as({ portalClient: (login && login.portalClient) || 'TW' }, { presenter: true }); } catch (e) { toast(e.message, 'err'); } } else { const g = guardianLink(); if (g) { location.href = g; return 'nav'; } } return; }
  if (role === 'school') { const su = (login && login.schoolUser) || 'rbell'; session.setSchoolUser(su); if (as) { try { await as({ schoolUser: su }, { presenter: true }); } catch (e) { toast(e.message, 'err'); } } return; }
  const want = staffId || STAFF_FOR_ROLE[role]; if (!want) return;
  if (session.user && session.user.id === want) return;
  await signInAs(want);
}
async function runScenario(sc) {
  if (!sc) return;
  try { await ensurePresenter(); } catch { }
  let res = null;
  try { res = await api.do('demo.scenario', { id: sc.id }); }
  catch (e) { if (!/unknown action|no such action|not registered|not a function/i.test(e.message)) { toast(e.message, 'err'); return; } }
  let t = parseTarget(res && (res.route || res.target) || sc.route, res && res.params || sc.params);
  if (t) t = legacyFor(t); // a scenario never lands on a route that is still a stub
  const nav = await applyRole((res && (res.role || res.as)) || sc.role, (res && res.staff) || sc.staff, sc.login);
  if (nav === 'nav') return;
  if (t) go(t.id, t.params); else route();
  toast(`Scenario ${sc.n}: ${sc.title}`);
}
async function resetTo(preset) {
  const ok = await ui.confirm({ title: 'Reset the demo data?', body: `<p>Both stores (Psyflo and the mock Lauris) go back to the seed: ${preset === 'canvas' ? 'Canvas snapshot' : 'Live flows'}. Anything typed and not sent is lost.</p>`, confirmLabel: 'Reset' });
  if (!ok) return;
  const uid = session.user && session.user.id;
  try { await ensurePresenter(); await api.do('demo.reset', { preset }); } catch (e) { toast(e.message, 'err'); return; }
  ui.draft.clearAll();
  if (uid && apiFn('session') && !apiActor()) { try { await signInAs(uid); } catch { } }
  toast('Demo data reset · ' + (preset === 'canvas' ? 'Canvas snapshot' : 'Live flows')); route();
}
function roleChoices() {
  const u = session.user; const staff = id => M.byId((api.state && api.state.staff) || [], id);
  const rows = ['direct_support', 'supervisor', 'clinician', 'admin'].map(r => ({ id: r, label: roleLabel(r), sub: (staff(STAFF_FOR_ROLE[r]) || {}).name || STAFF_FOR_ROLE[r], staff: STAFF_FOR_ROLE[r], current: !!u && u.role === r }));
  const kind = (apiActor() || {}).kind;
  return rows.concat([{ id: 'guardian', label: 'Guardian', sub: 'Family portal, T.W.', current: kind === 'guardian' }, { id: 'school', label: 'School user', sub: 'R. Bell · counselor', current: kind === 'school' }]);
}
async function switchRole(r) {
  if (!r) return;
  if (r.id === 'guardian' || r.id === 'school') { const nav = await applyRole(r.id); if (nav !== 'nav') go(r.id === 'school' ? 'SchoolPortal' : 'ParentPortal'); return; }
  try { await signInAs(r.staff); } catch (e) { toast(e.message, 'err'); return; }
  const u = session.user; const cur = parseRoute();
  const keep = cur && BY_ID[cur.id] && BY_ID[cur.id].min > 0 && canOpen(cur.id, u);
  if (keep) route(); else { const h = homeTarget(u.role, innerWidth < 600); go(h.id, h.params); }
  toast(`Signed in as ${u.name} · ${roleLabel(u.role)}`);
}
function pickerScreens() {
  const cur = current && current.id; const u = session.user;
  const own = s => { try { const r0 = { id: s.id, params: {} }; const rr = resolveRoute(r0, { role: u && u.role }); return !rr || rr === r0 || rr.id === s.id; } catch { return true; } };   // an old id that now redirects is not listed (its canonical route is)
  return SCREENS.filter(s => s.id !== 'Login' && s.id !== 'UiKit' && isLive(s.id) && own(s) && (u ? canOpen(s.id, u) : s.min === 0))
    .map(s => ({ id: s.id, title: s.title, surface: s.surface, surfaceLabel: SURFACE_LABEL[s.surface] || s.surface, current: s.id === cur }))
    .sort((a, b) => Object.keys(SURFACE_LABEL).indexOf(a.surface) - Object.keys(SURFACE_LABEL).indexOf(b.surface));
}
export const pickerFor = pickerScreens;
// the All screens picker: a portal screen is opened as that portal's person (presenter view), everything else as the signed-in role
async function openScreen(id) {
  const m = BY_ID[id]; if (!m) return;
  if (m.surface === 'parent') await applyRole('guardian'); else if (m.surface === 'school') await applyRole('school');
  go(id);
}
function surfaces() {
  const u = session.user;
  return [{ id: 'platform', label: 'Platform', sub: 'Rail, queues and cases' }, { id: 'lauris', label: 'Lauris + panel', sub: 'Mock Lauris with the Psyflo panel beside it', external: true }, { id: 'phone', label: 'Phone', sub: 'Direct support, 390 px' }, { id: 'family', label: 'Family', sub: 'Guardian portal' }, { id: 'school', label: 'School', sub: 'Counselor portal' }].filter(s => s.id !== 'platform' || !!u);
}
function openSurface(id) {
  const u = session.user;
  if (id === 'platform') { const h = homeTarget(u ? u.role : 'clinician', innerWidth < 600); go(h.id, h.params); }
  else if (id === 'lauris') window.open(`${api.config.laurisURL}/login?as=${encodeURIComponent((u && u.id) || 'jperez')}`, '_blank', 'noopener');
  else if (id === 'phone') go('MobileApp');
  else if (id === 'family') { const g = guardianLink(); if (g && !isHosted()) location.href = g; else go('ParentPortal'); }
  else if (id === 'school') { session.setSchoolUser('rbell'); go('SchoolPortal'); }
}
// the presenter's simulation controls first make sure the session is a presenter session (a Login sign-in is not)
const simDock = { receiveReply: async () => { try { await ensurePresenter(); } catch { } sim.receiveReply(); }, advanceDay: async () => { try { await ensurePresenter(); } catch { } return sim.advanceDay(); } };
const dockCtx = {
  api, M, sim: simDock, toast, go, current: () => current, model: dockModel, scenarios: scenarioList, runScenario, openScreen, switchRole, resetTo, roleChoices, screens: pickerScreens, surfaces, openSurface,
  unlock: async () => { try { await ensurePresenter(); toast('Presenter tools unlocked'); renderDock(true); } catch (e) { toast(e.message, 'err'); } },
  setDock, setMode, setMaturity, routeMeta: id => BY_ID[id], notes: id => NOTES[id] || '',
  features: id => { const seen = new Set(); return featuresFor(id).filter(f => !seen.has(f.id) && seen.add(f.id)).sort((a, b) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level)); }
};
function openArchitecture() { dockCtx.openNotes('WhereThingsLive', { title: 'Architecture · where things live', extra: `<p><a class="ui-btn ui-btn--secondary" href="#/WhereThingsLive?full=1" data-ui-close>Open the full page</a></p>` }); }

// ---------- rendering ----------
let current = null; // { id, meta, inst, scr, tpl, params }
let routeSeq = 0;
let deferred = false;

function notice(stage, kind, title, body, extra = '') {
  stage.className = 'msg'; current = null;
  document.getElementById('root').innerHTML = `<div class="denied" role="${kind === 'error' ? 'alert' : 'status'}"><h1>${esc(title)}</h1><p>${body}</p>${extra}</div>`;
  ensureMain(document.getElementById('root'));
}

// A failed state load is an error the person can see and act on, never an empty "Nothing needs you right now" (api.error is set by api.js).
// Shown when there is no usable state (nothing loaded yet, or only the public roster for a signed-in token) and when a staff session ended (401).
let loadErrorShown = false;
const noUsableState = () => !api.state || (api.state.public && !!api.token);
const loadErrorNow = () => !!api.error && (noUsableState() || api.error.status === 401);
function showLoadError() {
  const e = api.error; const stage = document.getElementById('stage') || document.body; const signin = e.status === 401;
  loadErrorShown = true;
  notice(stage, 'error', signin ? 'Your session ended' : "Can't reach the Psyflo server",
    signin ? 'Sign in again to carry on. The data on this screen is not current.' : `The demo data did not load${e.status ? ' (error ' + esc(String(e.status)) + ')' : ''}. What is on screen is not current, and nothing is shown as empty on purpose. Try again; if it keeps failing, restart the demo server.`,
    signin ? '<p><a class="ui-btn ui-btn--primary" href="#/Login" data-signin-again>Sign in again</a></p>' : '<p><button type="button" class="ui-btn ui-btn--primary" data-retry>Retry</button></p>');
  const root = document.getElementById('root');
  const again = root.querySelector('[data-signin-again]'); if (again) again.onclick = () => { api.error = null; loadErrorShown = false; };
  const retry = root.querySelector('[data-retry]'); if (retry) retry.onclick = async () => { retry.disabled = true; try { await api.refresh(); } catch { } if (loadErrorNow()) showLoadError(); else { loadErrorShown = false; route(); } };
  try { renderRail(true); } catch { }
  const h = root.querySelector('h1'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
}
async function route() {
  if (loadErrorNow()) { showLoadError(); return; }
  if (!api.state) return;
  loadErrorShown = false;
  const seq = ++routeSeq;
  if (authPending) { const p = authPending; authPending = null; try { await p; } catch { } await api.refresh(true); if (seq !== routeSeq) return; }
  let r = parseRoute();
  let u = session.user;
  if (!r) { const h = u ? homeTarget(u.role, innerWidth < 600) : { id: 'Login', params: {} }; r = { id: h.id, params: h.params }; }
  const rr = resolveRoute(r, { role: u && u.role });
  if (rr !== r) {
    if (rr.presenter) { setTimeout(() => { if (dockState === 'hidden') setDock('open'); openArchitecture(); }, 0); r = { id: homeRouteForCurrent(u), params: {} }; }
    else { r = { id: rr.id, params: rr.params }; if (isHosted() || location.pathname === '/' || location.pathname === '/index.html') history.replaceState(null, '', hashFor(r.id, r.params)); }
  }
  const stage = document.getElementById('stage'); const root = document.getElementById('root');
  const meta = BY_ID[r.id];
  if (meta && meta.min === 0 && (meta.surface === 'parent' || meta.surface === 'school')) { await portalView(meta, r.params); if (seq !== routeSeq) return; }
  else if (meta && meta.min > 0) { await restoreStaff(); if (seq !== routeSeq) return; }
  u = session.user;
  document.body.dataset.surface = meta ? (meta.id === 'Login' ? 'login' : meta.surface) : 'app';
  if (!meta) { notice(stage, 'status', 'Page not found', `There is no page called <b>${esc(r.id)}</b>.`, `<p><a class="ui-btn ui-btn--primary" href="#/">Go to your first screen</a></p>`); renderRail(true); return; }
  if (meta.min > 0 && !u) { setHash('#/Login?next=' + encodeURIComponent(r.id)); return; }
  renderDock();
  if (meta.presenter && dockState === 'hidden' && !(apiActor() || {}).presenter) {
    notice(stage, 'status', 'Presenter only', `This page is the presenter's component gallery. Press ${ui.kbd('Ctrl', 'Shift', 'P')} or open the page with <code>?present=1</code>.`, `<p><a class="ui-btn ui-btn--primary" href="#/">Go to your first screen</a></p>`);
    renderRail(true); return;
  }
  if (!canOpen(meta.id, u)) {
    notice(stage, 'status', `Not available for ${esc(roleLabel(u.role))}`, `${esc(meta.title)} is hidden from this role. Ask an administrator if you need it.`, `<p><a class="ui-btn ui-btn--primary" href="${hrefFor(homeFor(u.role))}">Go to your first screen</a> <a class="ui-btn ui-btn--secondary" href="#/Login">Switch user</a></p>`);
    renderRail(true); return;
  }
  const scr = await loadScreen(meta.id + '.dc.html');
  if (seq !== routeSeq) return;
  const Ctl = controllers[meta.id] || (meta.surface === 'ext' ? ExtComposite : null);
  let inst;
  if (Ctl) { inst = new Ctl(r.params); inst.meta = meta; await inst.init?.(); }
  else if (scr.Component) { inst = new scr.Component({}); inst.params = r.params; }
  else inst = new Screen(r.params);
  if (seq !== routeSeq) return;
  let tpl = scr.tpl;
  if (meta.surface === 'app' && meta.id !== 'Login') tpl = withoutSidebar(tpl);
  if (inst.prepare) tpl = inst.prepare(tpl) || tpl;
  current = { id: meta.id, meta, inst, scr, tpl, params: r.params };
  document.getElementById('scrcss').textContent = scr.css.replace(/body\s*\{[^}]*\}/g, m => m.replace(/background:[^;}]+;?/, '')) + (inst.css || '');
  stage.className = meta.surface === 'phone' || meta.surface === 'parent' ? 'phone' : meta.surface === 'ext' ? 'ext' : '';
  inst._paint = () => paintCurrent();
  deferred = false;
  renderRail(true);
  paintCurrent(true);
  document.title = `${meta.title} — Psyflo × Harvest`;
  announce(meta.title);
}
// A portal screen shows what the guardian or the school user sees, which is a different (smaller) state than a staff member's.
// When a staff session opens one (the presenter, the All screens picker, a pasted link), the shell signs in as that portal person for the
// view and restores the staff session as soon as a staff screen is opened again. A real portal link (token) always wins.
let stashedStaff = null;
async function portalView(meta, params) {
  const a = apiActor(); const kind = a && a.kind;
  try {
    if (meta.surface === 'parent' && kind !== 'guardian') {
      const tok = apiFn('signInPortal'), as = apiFn('signInAs');
      if (kind === 'staff' && !stashedStaff) stashedStaff = { id: a.id };
      current = null; // the screen on show must not repaint with the other person's state while the session changes
      if (params.t && tok) await tok(params.t, { quiet: true }); else if (as) await as({ portalClient: params.c || 'TW' }, { presenter: true, quiet: true }); else return;
      await api.refresh(true);
    } else if (meta.surface === 'school' && kind !== 'school') {
      const as = apiFn('signInAs'); if (!as) return;
      if (kind === 'staff' && !stashedStaff) stashedStaff = { id: a.id };
      current = null;
      await as({ schoolUser: (session.schoolUser && session.schoolUser.id) || 'rbell' }, { presenter: true, quiet: true }); await api.refresh(true);
    }
  } catch (e) { console.warn('portal view', e.message); }
}
async function restoreStaff() {
  const a = apiActor(); const kind = a && a.kind;
  if (stashedStaff && (kind === 'guardian' || kind === 'school')) { const id = stashedStaff.id; stashedStaff = null; current = null; try { await session.signIn(id, { presenter: true }); authPending = null; await api.refresh(true); } catch (e) { console.warn('restore staff', e.message); } }
  else if (kind === 'staff') stashedStaff = null;
}
function homeRouteForCurrent(u) { return u ? homeFor(u.role, innerWidth < 600) : 'Login'; }

// the 240 px canvas sidebar is not part of a screen any more: the rail lives in the shell
function withoutSidebar(tpl) {
  const a = tpl.indexOf('<aside style="flex:0 0 240px');
  if (a < 0) return tpl;
  return tpl.slice(0, a) + tpl.slice(matchClose(tpl, a, 'aside'));
}

function announce(text) { const a = document.getElementById('sh-announce'); if (a) { a.textContent = ''; setTimeout(() => { a.textContent = text; }, 30); } }
// landmarks: the screen's <main> is the main landmark (or #root takes the role); one h1 per route (a hidden one when the screen has none)
function ensureMain(root, meta) {
  let m = root.querySelector('main');
  if (m) { root.removeAttribute('role'); m.id = 'main'; } else { m = root; root.setAttribute('role', 'main'); } // #root keeps its id
  m.setAttribute('tabindex', '-1');
  if (meta && !root.querySelector('h1')) m.insertAdjacentHTML('afterbegin', `<h1 class="ui-sr" data-shell-h1>${esc(meta.title)}</h1>`);
  return m;
}
let firstRoute = true; // the very first paint of a page load must not steal focus from the skip link
function focusMain() { if (firstRoute) { firstRoute = false; scrollTo(0, 0); return; } const m = document.getElementById('main') || document.getElementById('root'); if (m) { m.focus({ preventScroll: true }); } scrollTo(0, 0); }

function paintCurrent(first) {
  if (!current) return;
  const root = document.getElementById('root'); const y = scrollY;
  const { inst, tpl, id, meta } = current;
  ui.resetAutoIds();
  let vals;
  try { vals = inst.renderVals() || {}; } catch (e) { console.error(e); root.innerHTML = `<pre class="err">${esc(e.stack || e)}</pre>`; return; }
  // keep focus and caret in inputs across live repaints
  const ae = document.activeElement; const focusSel = !first && ae && ae.id && root.contains(ae) ? '#' + CSS.escape(ae.id) : null;
  const caret = focusSel && 'selectionStart' in ae ? [ae.selectionStart, ae.selectionEnd] : null;
  paint(root, tpl, vals);
  ensureMain(root, meta);
  try { inst.after?.(root); } catch (e) { console.error(e); }
  if (focusSel) { const el = root.querySelector(focusSel); if (el) { el.focus({ preventScroll: true }); if (caret) try { el.setSelectionRange(...caret); } catch { } } }
  if (first) focusMain(); else scrollTo(0, y);
}

// is the person typing into something that a repaint would wipe? (a field whose value differs from what the template painted)
function editingInRoot() {
  const a = document.activeElement; const root = document.getElementById('root');
  if (!a || !root.contains(a)) return false;
  if (a.isContentEditable) return true;
  if (a.tagName === 'TEXTAREA') return a.value !== a.defaultValue;
  if (a.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|range|file)$/.test(a.type)) return a.value !== a.defaultValue;
  return false;
}
const repaintHeld = () => !!(current && (current.inst.noRepaint || overlay.isOpen() || document.querySelector('#modal:not([hidden])') || editingInRoot()));
function flushDeferred() { if (deferred && current && !repaintHeld()) { deferred = false; paintCurrent(); } }

// one delegated click handler for links inside screens
function onRootClick(e) {
  const so = e.target.closest('[data-signout]'); if (so) { session.signOut(); return; }
  const a = e.target.closest('a[href]'); if (!a || !current) return;
  const h = a.getAttribute('href');
  if (a.target === '_blank' || /^(https?:|mailto:|tel:|\/files\/)/.test(h)) return;
  if (/\.dc\.html(\?|$)/.test(h)) { e.preventDefault(); go(h); return; }
  if (h.startsWith('#/')) return; // already an app route
  if (h.startsWith('#')) {
    e.preventDefault();
    const name = h.slice(1); const fn = current.inst.anchors && current.inst.anchors[name];
    if (typeof fn === 'function') { fn.call(current.inst, e, a); return; }
    const t = document.getElementById(name); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    console.warn('Unwired anchor', name, 'on', current.id);
    toast('This link is not wired yet: ' + name, 'err');
  }
}

async function boot() {
  initDockState();
  await api.init();
  try { PERM = await import('./shared/permissions.js'); } catch { PERM = null; }
  LOGO = (await fetch('/js/logo.svg').then(r => r.text())).trim();   // the reverse wordmark (white, teal, marigold) for the navy rail
  await loadNotes();
  await Promise.all(Object.keys(MODULES).map(k => MODULES[k]().catch(e => console.error('controller', k, e))));
  const root = document.getElementById('root');
  root.addEventListener('click', onRootClick);
  root.addEventListener('focusout', () => setTimeout(flushDeferred, 0));
  overlay.onIdle(flushDeferred);
  const rail = document.getElementById('rail');
  rail.addEventListener('click', e => {
    if (e.target.closest('[data-signout]')) { session.signOut(); return; }
    const h = e.target.closest('[data-sh="help"]'); if (h) { openHelp(h); return; }
    const a = e.target.closest('a[href^="#/"]'); if (a && a.getAttribute('href') === location.hash) route();
  });
  mountDock(dockEl(), dockCtx);
  addEventListener('hashchange', () => { try { overlay.closeAll(); } catch { } route(); });   // a route change closes any open drawer, modal or popover (no drawer left over a new screen)
  addEventListener('resize', measureDock);
  try { new ResizeObserver(measureDock).observe(dockEl()); } catch { }
  addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && !e.altKey && (e.key === 'P' || e.key === 'p')) { e.preventDefault(); if (mode === 'explore') dockEl().querySelector('[data-dock="toggle"]')?.focus(); else setDock(dockState === 'hidden' ? 'open' : 'hidden'); }
  }, true);
  let pending = false;
  let staleToast = false;
  api.onChange(() => {
    if (loadErrorNow()) { if (!loadErrorShown || !current) showLoadError(); return; }   // the load failed: say so
    if (loadErrorShown && !api.error) { loadErrorShown = false; route(); return; }        // it works again: paint the screen
    if (api.error && !staleToast) { staleToast = true; toast("Can't reach the Psyflo server. You are looking at the last data it sent.", 'err'); }
    if (!api.error) staleToast = false;
    if (!current || pending) return; pending = true;
    requestAnimationFrame(() => {
      pending = false; if (!current) return;
      renderRail(); renderDock(); current.inst.onStore?.();
      if (repaintHeld()) { deferred = true; return; }
      paintCurrent();
    });
  });
  renderDock(true);
  route();
  if (flag('present') === 'architecture') setTimeout(openArchitecture, 300);
}

// Controllers live in web/js/screens/<Id>.js and call register(). Listed here so they load up front.
const MODULES = Object.fromEntries(SCREENS.map(s => [s.id, () => import(`./screens/${s.id}.js`).catch(e => { if (!/Failed to fetch|Importing a module script failed|error loading dynamically/i.test(String(e))) throw e; })]));

export const app = { route, go, toast, modal, session, hrefFor, canOpen, ui, overlay, sim, get current() { return current; }, get dock() { return { state: dockState, mode, maturityOn }; }, setDock, setMode, setMaturity, openNotes: (id, o) => dockCtx.openNotes(id || current?.id, o) };
window.psyflo = app;
boot();
