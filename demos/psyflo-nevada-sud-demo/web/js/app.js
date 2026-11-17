// App shell: routing over the 46 screens, sign-in and roles, the generated sidebar, the demo bar,
// the "How the data gets in" drawer, and the base class every screen controller extends.
import { api } from './api.js';
import { loadScreen, paint, DCLogic, esc, raw, replaceElement, matchClose } from './runtime.js';
import { SCREENS, VISIBLE, BY_ID, LEVEL, homeFor } from './registry.js';
import * as M from './shared/model.js';
import { ExtComposite } from './ext-composite.js';

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
  const p = location.pathname;
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
  if (location.pathname !== '/' && location.pathname !== '/index.html') { location.href = '/' + h; return; }
  if (location.hash === h) route(); else location.hash = h;
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
  Claims: '<path d="M6 2h9l5 5v15H6z"></path><path d="M14 2v6h6M9 13h8M9 17h5"></path>',
  PayerPlaybook: '<path d="M4 4h16v16H4z"></path><path d="M8 9h8M8 13h8M8 17h4"></path>',
  Clients: '<circle cx="9" cy="8" r="3.5"></circle><path d="M2 20a7 7 0 0 1 14 0"></path><path d="M16 4a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-4-6.3"></path>',
  Add: '<rect x="4" y="3" width="16" height="18" rx="2"></rect><path d="M12 8v8M8 12h8"></path>',
  Saved: '<path d="M6 3h12v18l-6-4-6 4z"></path>',
  Rejected: '<circle cx="12" cy="12" r="9"></circle><path d="M9 9l6 6M15 9l-6 6"></path>',
  Approve: '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>',
  Case: '<path d="M4 4h16v16H4z"></path><path d="M8 9h8M8 13h8M8 17h5"></path>',
  Discharge: '<path d="M10 17l5-5-5-5"></path><path d="M15 12H3"></path><path d="M21 3v18"></path>',
  Eligibility: '<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"></path><path d="M9 12l2 2 4-4"></path>',
  Search: '<circle cx="11" cy="11" r="7"></circle><path d="M21 21l-4.3-4.3"></path>',
  Help: '<circle cx="12" cy="12" r="9"></circle><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01"></path>',
  Out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="M16 17l5-5-5-5M21 12H9"></path>',
  Settings: '<circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"></path>',
  dot: '<circle cx="12" cy="12" r="3"></circle>'
};
// which sidebar item is "on" for screens that are not themselves in the nav (value = nav key)
const CLIENTS = 'ExtHome|/consumers';
const NAV_PARENT = { Referral: 'Referrals', Submission: 'Authorizations', InfoRequest: 'Authorizations', Partials: 'Authorizations', EarlyDischarge: 'Authorizations', PeerBrief: 'Authorizations', AppealLetter: 'Claims', ExtSRA: 'Authorizations', ExtQuarterly: CLIENTS };

function counts() {
  const s = api.state;
  const dn = window.__psyfloDoNextCount ? window.__psyfloDoNextCount(s, session.user) : M.doNext(s).length;
  const refs = s.referrals.filter(r => ['needs_screening', 'waiting_on_school'].includes(r.stage)).length;
  const auths = s.requests.filter(r => !['active', 'closed'].includes(r.stage)).length;
  const claims = (s.claims || []).filter(x => x.status === 'denied' || x.status === 'at_risk').length;
  return { DoNext: dn, Referrals: refs, Authorizations: auths, Claims: claims || '' };
}

// The sidebar uses the words the Client Record (the EHR) uses: Clients, Authorizations, Forms to Approve, Group Notes, Reports.
// Each item that lives in the EHR opens the Client Record with the Psyflo panel beside it. Three roles only: direct support staff, clinician, administrator.
const E = (label, path, icon) => ({ id: 'ExtHome', params: { path }, label, icon: icon || 'ExtHome' });
const P = (id, label, badge, icon) => ({ id, label, badge, icon: icon || id });
function navFor(role) {
  if (role === 'direct_support') return [
    ['Home', [P('StaffDashboard', 'Dashboard')]],
    ['Clients', [E('Clients', '/consumers', 'Clients')]],
    ['Documentation', [P('ExtDPN', 'Group Notes', null, 'Add'), P('ExtWeekly', 'Weekly Sessions', null, 'Saved'), P('ExtMonthly', 'Collateral Contacts', null, 'Clients'), P('ExtIncident', 'Incident Reports', null, 'Rejected')]]
  ];
  if (role === 'clinician') return [
    ['Home', [P('DoNext', 'Dashboard', 'DoNext'), P('StaffDashboard', 'Documentation Status')]],
    ['Clients', [E('Clients', '/consumers', 'Clients'), P('Referrals', 'Referrals', 'Referrals'), P('Eligibility', 'Eligibility')]],
    ['Assessments & Plans', [P('ExtScreening', 'Intake Screening', null, 'Add'), P('ExtCNA', 'ASAM Assessments', null, 'Saved'), P('ExtISP', 'Treatment Plans', null, 'Case'), P('ExtSignOff', 'Forms to Approve', null, 'Approve')]],
    ['Utilization Review', [P('Authorizations', 'Authorizations', 'Authorizations'), P('ExtCase', 'Continued Stay', null, 'Case'), P('ExtDischarge', 'Discharge Summaries', null, 'Discharge')]]
  ];
  return [
    ['Utilization Review', [P('Authorizations', 'Authorizations', 'Authorizations'), P('Referrals', 'Referrals', 'Referrals'), P('Eligibility', 'Eligibility')]],
    ['Billing', [P('Claims', 'Claims & Denials', 'Claims'), P('PayerPlaybook', 'Payer Rules')]],
    ['Reports', [P('Analytics', 'Reports'), P('StaffDashboard', 'Documentation Status')]],
    ['Client Record', [E('Clients', '/consumers', 'Clients')]],
    ['Administration', [P('Users', 'Users & Permissions')]]
  ];
}
const navKey = it => it.id === 'ExtHome' ? 'ExtHome|' + it.params.path : it.id;

function sidebarHTML(current, params) {
  const u = session.user; const lvl = session.level; const c = counts();
  const curKey = current === 'ExtHome' ? 'ExtHome|' + ((params && params.path) || '/consumers') : (NAV_PARENT[current] || current);
  const sec = t => `<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8E99A6;padding:16px 12px 6px">${esc(t)}</div>`;
  const svg = (icon, n = 18) => `<svg aria-hidden="true" width="${n}" height="${n}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[icon] || ICON.dot}</svg>`;
  const item = it => {
    if (!canSee(it.id, lvl)) return '';
    const badge = it.badge ? c[it.badge] : '';
    return `<a class="nav${curKey === navKey(it) ? ' on' : ''}" href="${hrefFor(it.id, it.params)}"${curKey === navKey(it) ? ' aria-current="page"' : ''}>${svg(it.icon)}${esc(it.label)}${badge !== '' && badge != null ? `<span class="n">${badge}</span>` : ''}</a>`;
  };
  const groups = u ? navFor(u.role).map(([t, items]) => { const h = items.map(item).join(''); return h ? sec(t) + h : ''; }).join('') : '';
  const bottom = (id, label, icon, attrs) => `<a class="nav" ${attrs}>${svg(icon)}${label}</a>`;
  return `<aside id="psf-side" style="flex:0 0 240px;background:#151B24;color:#fff;display:flex;flex-direction:column;padding:22px 16px 16px;position:sticky;top:0;height:100vh;align-self:flex-start;overflow-y:auto;box-sizing:border-box">
    <div style="padding:0 8px 6px">${LOGO}<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#8E99A6;margin-top:4px">Community Counseling Center of Southern Nevada</div></div>
    <button type="button" id="gsearch" class="gs" aria-label="Search clients, referrals and authorizations">${svg('Search', 16)}<span>Search</span><kbd>/</kbd></button>
    <nav style="display:flex;flex-direction:column;gap:2px;margin-top:2px" aria-label="Main">${groups}</nav>
    <div style="margin-top:auto;display:flex;flex-direction:column;gap:2px;padding-top:16px">
      ${bottom('help', 'Help', 'Help', 'href="#help" data-help role="button"')}
      ${bottom('out', 'Sign out', 'Out', 'href="#/Login" data-signout')}
      ${u ? `<div style="display:flex;align-items:center;gap:10px;border-top:1px solid #2A3340;padding-top:14px;margin-top:8px">
        <div style="width:36px;height:36px;border-radius:50%;background:#217A78;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;flex:0 0 auto">${esc(u.initials)}</div>
        <div style="min-width:0"><div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(u.name)}</div><div style="font-size:12px;color:#8E99A6">${esc(M.ROLE_LABEL[u.role] || '')}</div></div></div>` : ''}
    </div>
  </aside>`;
}

// ---------- global search (the "/" key or the Search field in the sidebar) ----------
function searchItems() {
  const s = api.state; const lvl = session.level; const u = session.user; const out = [];
  if (u) for (const [, items] of navFor(u.role)) for (const it of items) if (canSee(it.id, lvl)) out.push({ group: 'Pages', title: it.label, sub: '', href: hrefFor(it.id, it.params) });
  for (const c of s.clients) {
    const no = c.lauris_no || c.harvest_no;
    out.push({ group: 'Clients', title: `${c.initials} · #${no}`, sub: [String(c.diagnosis || '').split(' · ')[0], c.level ? 'Level ' + c.level : '', M.STAGE_LABEL?.[c.stage] || String(c.stage || '').replace(/_/g, ' ')].filter(Boolean).join(' · '), href: hrefFor('ExtHome', { path: '/consumers/' + no }) });
  }
  if (lvl >= 3) {
    for (const r of s.referrals) out.push({ group: 'Referrals', title: `${r.client}`, sub: `${r.id} · ${r.source_label || ''}`, href: 'Referral.dc.html?id=' + r.id });
    for (const r of s.requests) { const c = M.byId(s.clients, r.client); const pay = (M.byId(s.payers, r.payer) || {}).short || r.payer; out.push({ group: 'Authorizations', title: `${(c && c.initials) || r.client} · ${r.service || ''}`, sub: `${r.id} · ${pay} · ${String(r.stage || '').replace(/_/g, ' ')}`, href: M.requestHref(r) }); }
  }
  return out.map(o => ({ ...o, text: (o.title + ' ' + o.sub + ' ' + o.group).toLowerCase() }));
}
let SEARCH = null;
function closeSearch() { if (SEARCH) { SEARCH.remove(); SEARCH = null; } }
function openSearch() {
  if (!session.user) return;
  closeSearch();
  const all = searchItems();
  const el = SEARCH = document.createElement('div'); el.id = 'search';
  el.innerHTML = `<div class="sbox" role="dialog" aria-modal="true" aria-label="Search"><div class="sin"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${ICON.Search}</svg><input id="sq" type="search" autocomplete="off" placeholder="Search clients, referrals, authorizations, pages…" aria-label="Search"><kbd>Esc</kbd></div><div class="sres" id="sres" role="listbox"></div></div>`;
  document.body.appendChild(el);
  const input = el.querySelector('#sq'), res = el.querySelector('#sres'); let sel = 0, shown = [];
  const draw = () => {
    const q = input.value.trim().toLowerCase(); const terms = q.split(/\s+/).filter(Boolean);
    shown = (terms.length ? all.filter(o => terms.every(t => o.text.includes(t))) : all.filter(o => o.group === 'Pages' || o.group === 'Clients').slice(0, 10)).slice(0, 40);
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    let last = ''; res.innerHTML = shown.length ? shown.map((o, i) => `${o.group !== last ? `<div class="sg">${last = o.group}</div>` : ''}<a class="sr1${i === sel ? ' on' : ''}" role="option" href="${esc(hrefFor(o.href))}" data-i="${i}"><b>${esc(o.title)}</b><span>${esc(o.sub)}</span></a>`).join('') : `<div class="sg" style="padding:18px 16px">No match for “${esc(input.value)}”</div>`;
  };
  const open = i => { const o = shown[i]; if (!o) return; closeSearch(); go(o.href); };
  input.oninput = () => { sel = 0; draw(); };
  input.onkeydown = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); draw(); res.querySelector('.on')?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); draw(); res.querySelector('.on')?.scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); open(sel); }
  };
  res.onclick = e => { const a = e.target.closest('[data-i]'); if (a) { e.preventDefault(); open(+a.dataset.i); } };
  el.onclick = e => { if (e.target === el) closeSearch(); };
  draw(); input.focus();
}

function openHelp() {
  const u = session.user;
  modal(`<h2>Help</h2><p style="margin:0 0 10px;color:#525B66">Psyflo sits on top of your Client Record. It drafts the paperwork; a person reviews, signs and sends.</p>
    <div style="display:grid;gap:8px;font-size:14px;margin:14px 0">
      <div><b>Search</b> · press <kbd class="k">/</kbd> anywhere to find a client, referral or authorization.</div>
      <div><b>Client Record</b> · Clients, Group Notes, Intake Screening and the other record pages open your Client Record with the Psyflo panel beside it.</div>
      <div><b>Authorizations</b> · every request shows its payer, units used and the date the authorization ends.</div>
      ${u ? `<div><b>Your access</b> · signed in as ${esc(u.name)}, ${esc(M.ROLE_LABEL[u.role] || '')}.</div>` : ''}
    </div><p style="font-size:12px;color:#525B66;margin:0 0 14px">Demo environment · every name, date and number is synthetic.</p><button class="mbtn p" data-close>Close</button>`);
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

// ---------- presenter tools (hidden: Ctrl+Shift+P) ----------
// The product has no demo bar. Whoever is presenting can press Ctrl+Shift+P for: reset the data, jump to any screen,
// the notes for the screen on show, and the mock Client Record in its own tab.
export function pickerScreens(cur) {
  const here = BY_ID[cur]; const lvl = session.level;
  let list;
  if (here && (here.surface === 'parent' || here.surface === 'school')) list = VISIBLE.filter(s => s.surface === here.surface);
  else if (session.user) list = VISIBLE.filter(s => s.min >= 1 && s.min <= lvl);
  else list = VISIBLE.filter(s => s.min === 0);
  if (here && !list.includes(here)) list = SCREENS.filter(s => s === here || list.includes(s));
  return list;
}

function presenterPanel() {
  const u = session.user; const cur = current ? current.id : 'Login';
  const preset = api.state.preset === 'canvas' ? 'Canvas snapshot' : 'Live flows';
  const an = (current && current.inst && current.inst.anchors) || {};
  const DEMO_ACTS = [['demoReply', 'Receive a plan reply'], ['advanceDay', 'Advance the clock a day'], ['demoPay', 'Payer pays a claim']];
  const screenActs = DEMO_ACTS.filter(([k]) => typeof an[k] === 'function').map(([k, l]) => `<button class="mbtn" data-demo="${k}">${l}</button>`).join('');
  const jumps = pickerScreens(cur).map(s => `<a class="mbtn" style="min-height:34px;font-size:13px;justify-content:flex-start" href="${hrefFor(s.id)}" data-close>${esc(s.title)}</a>`).join('');
  modal(`<h2>Presenter tools</h2><p style="margin:0 0 12px;color:#525B66;font-size:13px">Hidden from the product view · ${esc(preset)} · today ${M.fmtDate(api.state.today, { dow: true })}</p>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">
      <button class="mbtn" data-act="reset-live">Reset · live flows</button><button class="mbtn" data-act="reset-canvas">Reset · canvas snapshot</button>
      <a class="mbtn" href="#/WhereThingsLive" data-close>How it fits</a><button class="mbtn" data-act="notes">How the data gets in</button>
      <a class="mbtn" href="${esc(api.config.laurisURL)}/login?as=${u ? u.id : 'jperez'}" target="_blank" rel="noopener">Client Record in its own tab ↗</a></div>
    ${screenActs ? `<div style="font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#525B66;margin-bottom:6px">On this screen</div><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px">${screenActs}</div>` : ''}
    <div style="font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#525B66;margin-bottom:6px">Go to a screen</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px;margin-bottom:14px">${jumps}</div><button class="mbtn p" data-close>Close</button>`,
  (box, close) => {
    const doReset = async preset => { await api.do('demo.reset', { preset }); close(); toast('Demo data reset'); route(); };
    box.querySelectorAll('[data-demo]').forEach(b => b.onclick = () => { close(); an[b.dataset.demo].call(current.inst); });
    box.querySelector('[data-act="reset-live"]').onclick = () => doReset('live');
    box.querySelector('[data-act="reset-canvas"]').onclick = () => doReset('canvas');
    box.querySelector('[data-act="notes"]').onclick = () => { close(); const d = document.getElementById('drawer'); d.hidden = false; fillDrawer(cur); };
  });
}
function fillDrawer(cur) {
  const s = BY_ID[cur];
  document.getElementById('dtitle').textContent = `${s.n} · ${s.title}`;
  document.getElementById('dtext').textContent = NOTES[cur] || 'No note for this screen.';
}

// ---------- rendering ----------
let current = null; // { id, inst, scr, tpl }

async function route() {
  if (!api.state) return;
  let r = parseRoute();
  const u = session.user;
  if (!r) r = { id: u ? homeFor(u.role, innerWidth < 600) : 'Login', params: {} };
  if (!BY_ID[r.id]) r = { id: u ? homeFor(u.role, innerWidth < 600) : 'Login', params: {} };
  const meta = BY_ID[r.id];
  document.getElementById('drawer').hidden || fillDrawer(r.id);
  if (meta.min > 0 && !u) { location.hash = '#/Login?next=' + encodeURIComponent(r.id); return; }
  const stage = document.getElementById('stage'); const root = document.getElementById('root');
  if (meta.min > session.level) {
    stage.className = 'msg'; current = null;
    root.innerHTML = `<div class="denied"><h1>You do not have access to this page</h1><p>${esc(meta.title)} is not part of your access. An administrator can change it under Users &amp; Permissions.</p><a class="mbtn p" href="${hrefFor(homeFor(u.role))}">Go to your dashboard</a> <a class="mbtn" href="#/Login" data-signout>Sign out</a></div>`;
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
  else if (meta.surface === 'ext') { /* the Client Record frame carries the sidebar placeholder itself */ }
  if (inst.prepare) tpl = inst.prepare(tpl) || tpl;
  current = { id: meta.id, inst, scr, tpl, params: r.params };
  document.getElementById('scrcss').textContent = scr.css.replace(/body\s*\{[^}]*\}/g, m => m.replace(/background:[^;}]+;?/, '')) + (inst.css || '');
  stage.className = meta.surface === 'phone' || meta.surface === 'parent' ? 'phone' : meta.surface === 'ext' ? 'ext' : '';
  document.body.dataset.surface = meta.surface;
  inst._paint = () => paintCurrent();
  paintCurrent(true);
  document.title = `${meta.title} · Psyflo`;
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
  const t = tpl.replace('<!--SIDEBAR-->', sidebarHTML(id, current.params));
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
  const hp = e.target.closest('[data-help]'); if (hp) { e.preventDefault(); openHelp(); return; }
  const gs = e.target.closest('#gsearch'); if (gs) { e.preventDefault(); openSearch(); return; }
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
  document.getElementById('close').onclick = () => { document.getElementById('drawer').hidden = true; };
  addEventListener('hashchange', route);
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { document.getElementById('drawer').hidden = true; document.getElementById('modal').hidden = true; closeSearch(); return; }
    const t = e.target; const typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if ((e.key === 'P' || e.key === 'p') && e.ctrlKey && e.shiftKey) { e.preventDefault(); presenterPanel(); return; }
    if ((e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) || ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey))) { if (session.user) { e.preventDefault(); openSearch(); } }
  });
  let pending = false;
  api.onChange(() => {
    if (!current || pending) return; pending = true;
    requestAnimationFrame(() => { pending = false; if (!current) return; current.inst.onStore?.(); if (current.inst.noRepaint || document.querySelector('#modal:not([hidden])')) return; paintCurrent(); });
  });
  route();
}

// Controllers live in web/js/screens/<Id>.js and call register(). Listed here so they load up front.
const MODULES = Object.fromEntries(SCREENS.map(s => [s.id, () => import(`./screens/${s.id}.js`).catch(e => { if (!/Failed to fetch|Importing a module script failed|error loading dynamically/i.test(String(e))) throw e; })]));

export const app = { route, go, toast, modal, session, hrefFor, get current() { return current; } };
window.psyflo = app;
boot();
