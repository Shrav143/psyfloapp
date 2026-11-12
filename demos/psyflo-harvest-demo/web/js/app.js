// App shell: routing over the screens, sign-in and roles, the generated four-item sidebar, the presenter menu (the ⋯
// button: screen picker, switch user, reset, demo controls), the "How the data gets in" drawer, and the base class every
// screen controller extends. Names come from shared/labels.js.
import { api } from './api.js';
import { loadScreen, paint, DCLogic, esc, raw, replaceElement, matchClose } from './runtime.js';
import { SCREENS, BY_ID, LEVEL, homeFor } from './registry.js';
import * as M from './shared/model.js';
import { ExtComposite } from './ext-composite.js';
import { PAGE_TITLE, NAV } from './shared/labels.js';
import { setHash } from './shared/links.js';
export { helpIcon } from './help.js';

const controllers = {};
export function register(id, Cls) { controllers[id] = Cls; }

// ---------- session (who is signed in) ----------
export const session = {
  get user() { try { const id = localStorage.getItem('psyflo_user'); return id ? M.byId(api.state.staff, id) : null; } catch { return null; } },
  signIn(id) { try { localStorage.setItem('psyflo_user', id); } catch { } },
  signOut() { try { localStorage.removeItem('psyflo_user'); } catch { } },
  get level() { const u = this.user; return u ? LEVEL[u.role] || 0 : 0; },
  get schoolUser() { try { return M.byId(api.state.school_users, localStorage.getItem('psyflo_school_user') || 'rbell'); } catch { return api.state.school_users[0]; } },
  setSchoolUser(id) { try { localStorage.setItem('psyflo_school_user', id); } catch { } }
};
export const canSee = (id, lvl = session.level) => { const s = BY_ID[id]; return !!s && (s.min === 0 || lvl >= s.min); };

// ---------- base controller ----------
export class Screen extends DCLogic {
  constructor(params) { super(params); this.params = params || {}; this.state = {}; }
  get s() { return api.state; }
  get me() { return session.user; }
  get M() { return M; }
  init() { }
  renderVals() { return {}; }
  // optional one-time template surgery: prepare(tpl) => tpl
  async do(action, args) { try { return await api.do(action, args); } catch (e) { toast(e.message, 'err'); throw e; } }
  go(target, params) { go(target, params); }
  toast(m, k) { toast(m, k); }
}
export { api, M, raw, esc };

// ---------- routing ----------
function parseRoute() {
  const p = window.__HOSTED__ ? '' : location.pathname;   // hosted preview: the page can live at any path; routes are hashes
  let m;
  if ((m = p.match(/^\/f\/([\w-]+)/))) return { id: 'FamilyLink', params: { t: m[1] } };
  if ((m = p.match(/^\/parent\/([\w-]+)(?:\/(\w+))?/))) return { id: m[2] || 'ParentPortal', params: { ...Object.fromEntries(new URLSearchParams(location.search)), t: m[1] } };
  const h = location.hash.replace(/^#\/?/, '');
  if (!h) return null;
  const [id, qs] = h.split('?');
  return { id: id.replace(/\.dc\.html$/, ''), params: Object.fromEntries(new URLSearchParams(qs || '')) };
}
export function hrefFor(target, params) {
  let [id, qs] = String(target).replace(/^\.?\//, '').split('?');
  id = id.replace(/\.dc\.html$/, '');
  const q = new URLSearchParams(qs || ''); for (const [k, v] of Object.entries(params || {})) if (v != null) q.set(k, v);
  const s = q.toString();
  return '#/' + id + (s ? '?' + s : '');
}
export function go(target, params) {
  const h = hrefFor(target, params);
  if (!window.__HOSTED__ && location.pathname !== '/' && location.pathname !== '/index.html') { location.href = '/' + h; return; }
  if (location.hash === h) route(); else setHash(h);
}

// ---------- toasts & modal ----------
export function toast(msg, kind) {
  const t = document.createElement('div'); t.className = 'toast' + (kind === 'err' ? ' err' : ''); t.setAttribute('role', 'status'); t.textContent = msg;
  document.getElementById('toasts').appendChild(t); setTimeout(() => t.remove(), kind === 'err' ? 6000 : 3800);
}
export function modal(html, onMount) {
  const m = document.getElementById('modal'); m.innerHTML = `<div class="mbox" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false;
  m.onclick = e => { if (e.target === m) m.hidden = true; };
  m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { m.hidden = true; }));
  if (onMount) onMount(m.querySelector('.mbox'), () => { m.hidden = true; });
}

// ---------- sidebar ----------
let LOGO = '';
const ICON = {
  DoNext: '<path d="M3 11l9-8 9 8v10H3z"></path><path d="M9 21v-6h6v6"></path>',
  Referrals: '<path d="M4 4h12l4 4v12H4z M16 4v4h4 M8 13h8M8 17h5"></path>',
  Authorizations: '<path d="M4 6h16M4 12h16M4 18h10"></path>',
  StaffDashboard: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21a8 8 0 0 1 16 0"></path>',
  ReviewQueue: '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>',
  Compliance: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"></path><path d="M9 12l2 2 4-4"></path>',
  Analytics: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"></path>',
  ExtHome: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 9h18M7 6.5h.01M10 6.5h.01"></path>',
  MobileApp: '<rect x="7" y="2" width="10" height="20" rx="2"></rect><path d="M11 18h2"></path>',
  ParentPortal: '<path d="M3 11l9-7 9 7v9H3z"></path><path d="M10 20v-6h4v6"></path>',
  SchoolPortal: '<path d="M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 2 9 2 12 0v-5"></path>',
  Users: '<circle cx="9" cy="8" r="3.5"></circle><path d="M2 20a7 7 0 0 1 14 0"></path><path d="M16 4a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-4-6.3"></path>',
  Migration: '<path d="M4 7h11l-3-3M20 17H9l3 3"></path>',
  SettingsLibrary: '<path d="M4 19V5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z"></path><path d="M8 7h6"></path>',
  FamilyLinkSettings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.7 4.6V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1z"></path>',
  PayerPlaybook: '<path d="M4 4h16v16H4z"></path><path d="M8 9h8M8 13h8M8 17h4"></path>'
};
// which sidebar item is "on" for screens that are not themselves in the nav
const NAV_PARENT = { Referrals: 'Authorizations', Referral: 'Authorizations', Eligibility: 'Authorizations', Submission: 'Authorizations', InfoRequest: 'Authorizations', Partials: 'Authorizations', EarlyDischarge: 'Authorizations', PeerBrief: 'Authorizations', ReviewQueue: 'StaffDashboard' };
// the four sidebar items: route id, name (labels.js), icon
const NAV_ITEMS = [['DoNext', NAV.Worklist], ['Authorizations', NAV.Authorizations], ['StaffDashboard', NAV.Documentation], ['Analytics', NAV.Analytics]];

function counts() {
  const s = api.state;
  let wl = { items: [] }; try { wl = M.worklist(s, session.user && session.user.id); } catch (e) { console.error(e); }
  const dn = window.__psyfloDoNextCount ? window.__psyfloDoNextCount(s, session.user) : wl.items.length;
  const auth = wl.items.filter(i => ['pended', 'followup', 'offers', 'approval', 'drafts', 'calls'].includes(i.group)).length;
  return { DoNext: dn, Authorizations: auth, StaffDashboard: '', Analytics: '' };
}

function sidebarHTML(current) {
  const u = session.user; const lvl = session.level; const c = counts(); const on = NAV_PARENT[current] || current;
  const item = (id, label, badge) => canSee(id, lvl) ? `<a class="nav${on === id ? ' on' : ''}" href="${hrefFor(id)}"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICON[id] || ''}</svg>${label}${badge !== '' && badge != null ? `<span class="n">${badge}</span>` : ''}</a>` : '';
  return `<aside style="flex:0 0 240px;background:#151B24;color:#fff;display:flex;flex-direction:column;padding:22px 16px 18px">
    <div style="padding:0 8px 6px">${LOGO}<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8E99A6;margin-top:4px">Harvest Outreach Center · TDT</div></div>
    <nav style="display:flex;flex-direction:column;gap:2px;margin-top:22px" aria-label="Main">${NAV_ITEMS.map(([id, label]) => item(id, label, c[id])).join('')}</nav>
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:12px;padding-top:18px">
      <div style="font-size:12px;line-height:16px;color:#8E99A6">Demo data · nothing is real</div>
      ${u ? `<div style="display:flex;align-items:center;gap:6px;border-top:1px solid #2A3340;padding-top:14px">
        <button type="button" data-avatar aria-haspopup="true" style="display:flex;align-items:center;gap:10px;background:transparent;border:0;color:inherit;font:inherit;text-align:left;cursor:pointer;padding:0;min-width:0;flex:1">
          <span style="width:36px;height:36px;border-radius:50%;background:#217A78;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;flex:0 0 36px">${esc(u.initials)}</span>
          <span style="min-width:0"><span style="display:block;font-weight:600;font-size:13px">${esc(u.name)}</span><span style="display:block;font-size:12px;color:#8E99A6">${esc([u.credential, u.title].filter(Boolean).join(' · '))}</span></span></button>
        <button type="button" class="pm-dots" data-present aria-label="Presenter menu" title="Presenter menu">⋯</button></div>` : ''}
    </div>
  </aside>`;
}

// ---------- notes drawer ----------
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

// ---------- the presenter menu ----------
// The screens the picker offers for whoever is on the screen now:
// · on a family or school portal screen: that portal's screens (the family / school user's view)
// · signed-in staff: the screens their role opens (portals and sign-in left out)
// · signed out: sign-in, "How it fits" and the portals
export function pickerScreens(cur) {
  const here = BY_ID[cur]; const lvl = session.level;
  let list;
  if (here && (here.surface === 'parent' || here.surface === 'school')) list = SCREENS.filter(s => s.surface === here.surface);
  else if (session.user) list = SCREENS.filter(s => s.min >= 1 && s.min <= lvl);
  else list = SCREENS.filter(s => s.min === 0);
  if (here && !list.includes(here)) list = SCREENS.filter(s => s === here || list.includes(s));
  return list;
}
// Screens (or the panel inside the Lauris frame) can listen for presenter commands: window 'message' events with
// data = { psyflo: 'present', cmd: 'example' | 'script' }. 'example' fills the example dictation; 'script' plays the scripted call.
export function present(cmd) {
  const msg = { psyflo: 'present', cmd };
  window.postMessage(msg, '*');
  const walk = w => { for (let i = 0; i < w.frames.length; i++) { try { w.frames[i].postMessage(msg, '*'); walk(w.frames[i]); } catch { } } };
  walk(window);
}
const PRESENT_CMDS = { phone: [['example', 'Use the example']], ext: [['example', 'Use the example dictation'], ['script', 'Play the scripted call']] };

function presenterHTML(cur) {
  const u = session.user; const here = BY_ID[cur] || {};
  const preset = api.state.preset === 'canvas' ? 'Canvas snapshot' : 'Live flows';
  const opts = pickerScreens(cur).map(s => `<option value="${s.id}"${s.id === cur ? ' selected' : ''}>${s.n} · ${esc(PAGE_TITLE[s.id] || s.title)}</option>`).join('');
  const cmds = (PRESENT_CMDS[here.surface] || []).map(([c, l]) => `<button type="button" data-pm-cmd="${c}">${l}</button>`).join('');
  return `<div class="h">${esc(preset)} · ${esc(M.fmtDate(api.state.today, { dow: true }))}</div>${window.__HOSTED__ ? '<div class="h">Hosted preview · data resets on reload</div>' : ''}
    <label class="sr" for="pm-pick">Go to screen</label><select id="pm-pick">${opts}</select>
    <a href="#/Login">${u ? 'Switch user' : 'Sign in'}</a>
    <button type="button" data-pm="reset">Reset…</button>
    <a href="${esc(api.config.laurisURL)}/login?as=${u ? u.id : 'jperez'}" target="_blank" rel="noopener">Open mock Lauris ↗</a>
    <button type="button" data-pm="notes">How the data gets in</button>
    <a href="#/WhereThingsLive">How it fits</a><a href="#/Roadmap">Roadmap</a>
    ${cmds ? `<div class="h">On this screen</div>${cmds}` : ''}
    ${u && u.role === 'admin' ? `<div class="h">Demo</div><button type="button" data-pm="reply">Demo: receive a reply</button><button type="button" data-pm="advance">Demo: advance a day</button>` : ''}`;
}
function placePop(pop, anchor) {
  pop.hidden = false;
  const r = anchor.getBoundingClientRect(); const w = pop.offsetWidth, h = pop.offsetHeight;
  let x = r.left; if (x + w > innerWidth - 8) x = innerWidth - w - 8; if (x < 8) x = 8;
  let y = r.top - h - 8; if (y < 8) y = Math.min(r.bottom + 8, innerHeight - h - 8);
  if (anchor.closest('aside')) { x = Math.min(r.right + 12, innerWidth - w - 8); y = Math.max(8, Math.min(r.bottom - h, innerHeight - h - 8)); } // from the sidebar the menu opens beside it, not over the nav
  pop.style.left = x + 'px'; pop.style.top = Math.max(8, y) + 'px';
}
function closePop() { const p = document.getElementById('pmenu'); if (p) p.hidden = true; }
function openPresenter(anchor) {
  const pop = document.getElementById('pmenu'); if (!current) return;
  pop.innerHTML = presenterHTML(current.id); placePop(pop, anchor);
  pop.querySelector('#pm-pick').onchange = e => { closePop(); go(e.target.value); };
}
function openAvatar(anchor) {
  const pop = document.getElementById('pmenu'); const u = session.user; if (!u) return;
  pop.innerHTML = `<div class="h">Settings</div>${session.level >= 4 ? `<a href="${hrefFor('Users')}">Users &amp; roles</a>` : ''}${canSee('PayerPlaybook') ? `<a href="${hrefFor('PayerPlaybook')}">Payer rules</a>` : ''}<a href="#/WhereThingsLive">Help</a><a href="#/Login" data-signout>Sign out</a>`;
  placePop(pop, anchor);
}
function onMenuClick(e) {
  if (e.target.closest('[data-signout]')) { session.signOut(); closePop(); return; }
  const b = e.target.closest('[data-pm],[data-pm-cmd]'); if (!b) { if (e.target.closest('a')) closePop(); return; }
  closePop();
  if (b.dataset.pmCmd) return present(b.dataset.pmCmd);
  const act = b.dataset.pm;
  if (act === 'notes') { const d = document.getElementById('drawer'); d.hidden = !d.hidden; if (!d.hidden && current) fillDrawer(current.id); }
  if (act === 'reset') modal(`<h2>Reset the demo</h2><p>Both stores (Psyflo and the mock Lauris) go back to the seed. Pick where to start:</p>
    <div style="display:flex;flex-direction:column;gap:10px;margin:14px 0"><button class="mbtn p" data-p="live">Live flows · T.W. just referred (run Flows D → A → C, and B)</button><button class="mbtn" data-p="canvas">Canvas snapshot · Oct 29 exactly as the design canvas</button></div><button class="mbtn" data-close>Cancel</button>`,
    (box, close) => box.querySelectorAll('[data-p]').forEach(x => x.onclick = async () => { await api.do('demo.reset', { preset: x.dataset.p }); close(); toast('Demo data reset · ' + x.textContent.split('·')[0].trim()); route(); }));
  if (act === 'advance') api.do('demo.advanceDay').then(() => toast('Demo: clock advanced to ' + M.fmtDate(api.state.today, { dow: true }))).catch(err => toast(err.message, 'err'));
  if (act === 'reply') demoReply();
}
function demoReply() {
  const s = api.state;
  const waiting = s.requests.filter(r => ['submitted', 'overdue', 'portal_open', 'appeal_sent'].includes(r.stage));
  if (!waiting.length) return modal(`<h2>Demo: receive a reply</h2><p>No request is waiting on a payer. Send one first.</p><button class="mbtn p" data-close>OK</button>`);
  const def = waiting.find(r => r.id === 'R-0416') || waiting[0];
  const opts = waiting.map(r => `<option value="${esc(r.id)}"${r.id === def.id ? ' selected' : ''}>${esc(r.id)} · ${esc(M.clientLabel(s, r.client))} · ${esc(M.payerTag(s, r.payer))} · ${esc(M.statusChip(s, r).text)}</option>`).join('');
  modal(`<h2>Demo: receive a reply</h2>
    <label style="display:block;font-weight:600;font-size:13px;margin-bottom:4px" for="drq">Request</label>
    <select id="drq" style="width:100%;min-height:40px;border:1px solid #D9D4CC;border-radius:8px;padding:0 10px;font:inherit">${opts}</select>
    <label style="display:block;font-weight:600;font-size:13px;margin:10px 0 4px" for="dun">Units (blank for the default)</label>
    <input id="dun" type="number" min="1" max="300" style="width:140px;min-height:40px;border:1px solid #D9D4CC;border-radius:8px;padding:0 10px;font:inherit">
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 10px"><button class="mbtn" data-k="approved">Authorized</button><button class="mbtn p" data-k="partial">Partial approval</button><button class="mbtn" data-k="info">Pended</button><button class="mbtn" data-k="denied">Denied</button></div><button class="mbtn" data-close>Cancel</button>`,
    (box, close) => box.querySelectorAll('[data-k]').forEach(b => b.onclick = async () => {
      const id = box.querySelector('#drq').value; const units = +box.querySelector('#dun').value || undefined; close();
      try { await api.do('request.demoReply', { id, kind: b.dataset.k, units }); const r = M.byId(api.state.requests, id); toast(`Demo: ${b.textContent.toLowerCase()} for ${id} · now ${M.statusChip(api.state, r).text}`); } catch (e) { toast(e.message, 'err'); }
    }));
}
function fillDrawer(cur) {
  const s = BY_ID[cur];
  document.getElementById('dtitle').textContent = `${s.n} · ${PAGE_TITLE[cur] || s.title}`;
  document.getElementById('dtext').textContent = NOTES[cur] || 'No note for this screen.';
}

// ---------- rendering ----------
let current = null; // { id, inst, scr, tpl }

async function route() {
  if (!api.state) return;
  let r = parseRoute();
  const u = session.user;
  if (!r) r = { id: u ? homeFor(u.role, innerWidth < 600) : 'Login', params: {} };
  if (!BY_ID[r.id]) r = { id: 'WhereThingsLive', params: {} };
  const meta = BY_ID[r.id];
  closePop();
  document.getElementById('drawer').hidden || fillDrawer(r.id);
  if (meta.min > 0 && !u) { setHash('#/Login?next=' + encodeURIComponent(r.id)); return; }
  const stage = document.getElementById('stage'); const root = document.getElementById('root');
  if (meta.min > session.level) {
    stage.className = 'msg'; current = null;
    root.innerHTML = `<div class="denied"><h1>Not available for ${esc(M.ROLE_LABEL[u.role])}</h1><p>${esc(PAGE_TITLE[meta.id] || meta.title)} is hidden from this role. Roles are set on Users &amp; roles.</p><a class="mbtn p" href="${hrefFor(homeFor(u.role))}">Go to your first screen</a> <a class="mbtn" href="#/Login">Switch user</a></div>`;
    return;
  }
  const scr = await loadScreen(meta.id + '.dc.html');
  const Ctl = controllers[meta.id] || (meta.surface === 'ext' ? ExtComposite : null);
  let inst;
  if (Ctl) { inst = new Ctl(r.params); inst.meta = meta; await inst.init?.(); }
  else if (scr.Component) { inst = new scr.Component({}); inst.params = r.params; }
  else inst = new Screen(r.params);
  let tpl = scr.tpl;
  if (meta.surface === 'app' && meta.id !== 'Login') tpl = withSidebar(tpl, meta.id);
  if (inst.prepare) tpl = inst.prepare(tpl) || tpl;
  current = { id: meta.id, inst, scr, tpl, params: r.params };
  document.getElementById('scrcss').textContent = scr.css.replace(/body\s*\{[^}]*\}/g, m => m.replace(/background:[^;}]+;?/, '')) + (inst.css || '');
  stage.className = meta.surface === 'phone' || meta.surface === 'parent' ? 'phone' : meta.surface === 'ext' ? 'ext' : '';
  document.body.dataset.surface = meta.surface;
  inst._paint = () => paintCurrent();
  paintCurrent(true);
  document.title = `${PAGE_TITLE[meta.id] || meta.title} — Psyflo × Harvest`;
}

function withSidebar(tpl, id) {
  const a = tpl.indexOf('<aside style="flex:0 0 240px');
  if (a < 0) return tpl;
  return tpl.slice(0, a) + '<!--SIDEBAR-->' + tpl.slice(matchClose(tpl, a, 'aside'));
}

function paintCurrent(scrollTop) {
  if (!current) return;
  const root = document.getElementById('root'); const y = scrollY;
  const { inst, tpl, id } = current;
  let vals;
  try { vals = inst.renderVals() || {}; } catch (e) { console.error(e); root.innerHTML = `<pre class="err">${esc(e.stack || e)}</pre>`; return; }
  const t = tpl.replace('<!--SIDEBAR-->', sidebarHTML(id));
  // keep focus and caret in inputs across live repaints
  const ae = document.activeElement; const focusSel = ae && ae.id && root.contains(ae) ? '#' + CSS.escape(ae.id) : null;
  const caret = focusSel && 'selectionStart' in ae ? [ae.selectionStart, ae.selectionEnd] : null;
  paint(root, t, vals);
  try { inst.after?.(root); } catch (e) { console.error(e); }
  if (focusSel) { const el = root.querySelector(focusSel); if (el) { el.focus(); if (caret) try { el.setSelectionRange(...caret); } catch { } } }
  scrollTo(0, scrollTop ? 0 : y);
}

// one delegated click handler for links inside screens
function onRootClick(e) {
  const so = e.target.closest('[data-signout]'); if (so) { session.signOut(); return; }
  const pr = e.target.closest('[data-present]'); if (pr) { openPresenter(pr); return; }
  const av = e.target.closest('[data-avatar]'); if (av) { openAvatar(av); return; }
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
  await api.init();
  LOGO = (await fetch('/js/logo.svg').then(r => r.text())).trim();
  await loadNotes();
  await Promise.all(Object.keys(MODULES).map(k => MODULES[k]().catch(e => console.error('controller', k, e))));
  document.getElementById('root').addEventListener('click', onRootClick);
  document.getElementById('present').addEventListener('click', e => { const p = document.getElementById('pmenu'); p.hidden ? openPresenter(e.currentTarget) : closePop(); });
  document.getElementById('pmenu').addEventListener('click', onMenuClick);
  document.addEventListener('click', e => { const p = document.getElementById('pmenu'); if (!p.hidden && !e.target.closest('#pmenu,[data-present],[data-avatar],#present')) closePop(); });
  addEventListener('keydown', e => { if (e.shiftKey && e.key === 'P' && !/input|textarea|select/i.test(document.activeElement?.tagName || '')) { const p = document.getElementById('pmenu'); p.hidden ? openPresenter(document.getElementById('present')) : closePop(); } });
  document.getElementById('close').onclick = () => { document.getElementById('drawer').hidden = true; };
  addEventListener('hashchange', route);
  addEventListener('keydown', e => { if (e.key === 'Escape') { document.getElementById('drawer').hidden = true; document.getElementById('modal').hidden = true; closePop(); } });
  let pending = false;
  api.onChange(() => {
    if (!current || pending) return; pending = true;
    requestAnimationFrame(() => { pending = false; if (!current) return; current.inst.onStore?.(); if (current.inst.noRepaint || document.querySelector('#modal:not([hidden])')) return; paintCurrent(); });
  });
  route();
}

// Controllers live in web/js/screens/<Id>.js and call register(). Listed here so they load up front.
const MODULES = Object.fromEntries(SCREENS.filter(s => s.surface !== 'ext').map(s => [s.id, () => import(`./screens/${s.id}.js`).catch(e => { if (!/Failed to fetch|Importing a module script failed|error loading dynamically/i.test(String(e))) throw e; })]));

export const app = { route, go, toast, modal, session, hrefFor, present, get current() { return current; } };
window.psyflo = app;
boot();
