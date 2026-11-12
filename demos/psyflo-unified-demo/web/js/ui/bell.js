// The bell: the notification centre (R3 · Authorizations). A separate system from the work lists: it tells a person what changed or what is
// close, and one click opens the record. Opened by the shell's top bar (window event `psyflo:topbar`, detail.id === 'bell'); the unread
// number on the bell is set with window.psyfloTopbar.setBadge('bell', n) every time the state changes.
//   · the list is computed from the role-projected state by shared/sel/notify.js (flags raised by somebody else, payer items, deadlines,
//     units at the warning threshold, notes sent back, and the enabled workflows' items under Workflows with a "From workflow: <name>" line);
//     a role never gets an item about a record it cannot open
//   · read state is per person: "Mark read" and "Mark all read" call the notify.read action (their own list only; it is not an audit event)
//   · nothing here sends anything to anybody: no email, no text, no push. The bell shows; a person acts.
//   window.psyfloBell = { open(opener?), close(), count() }   (the tests use it)
import { api } from '../api.js';
import { overlay } from './overlay.js';
import { esc, icon } from './util.js';
import { notificationsFor } from '../shared/sel/notify.js';
import { fmtDate, fmtDateTime } from '../shared/dates.js';

const KIND_ICON = { flag: 'flag', payer: 'inbox', deadline: 'clock', units: 'bars', note: 'pencil', workflow: 'bolt' };
const SEV_WORD = { r: 'Urgent', y: 'Soon', n: 'Info' };
const GROUPS = ['Flags', 'Payer', 'Deadlines', 'Units', 'Notes', 'Workflows'];
let handle = null, lastKey = '';

const actorNow = () => { try { return window.psyflo && window.psyflo.session && window.psyflo.session.actor; } catch { return null; } };
const hrefOf = to => { try { return window.psyflo.hrefFor(to); } catch { return '#/' + String(to || '').replace(/\.dc\.html/, ''); } };
const items = () => { const a = actorNow(); return a && api.state ? notificationsFor(api.state, a) : []; };
const when = at => { const d = String(at || '').slice(0, 10); if (!d) return ''; const today = api.state && api.state.today; return String(at).length > 10 && !/T00:00$/.test(String(at)) ? (d === today ? 'Today · ' + fmtDateTime(at).split(', ').pop() : fmtDateTime(at)) : (d === today ? 'Today' : fmtDate(d)); };

const CSS = `
.bell{display:flex;flex-direction:column;gap:var(--sp-3)}
.bell__bar{display:flex;align-items:center;gap:var(--sp-3);flex-wrap:wrap;justify-content:space-between}
.bell__sum{font-size:var(--fs-13);color:var(--muted-700)}
.bell__g{margin:0;font-size:var(--fs-12);font-weight:600;color:var(--muted-700);text-transform:none;letter-spacing:.02em;padding:var(--sp-2) 0 2px}
.bell__l{list-style:none;margin:0;padding:0;border:1px solid var(--line-200);border-radius:var(--r-3);background:var(--surface-0)}
.bell__i{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:2px 12px;align-items:start;padding:12px 14px;border-top:1px solid var(--line-200)}
.bell__i:first-child{border-top:0}
.bell__i.is-unread{background:var(--teal-tint)}
.bell__ic{grid-row:1/3;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:var(--sand-100);color:var(--muted-700)}
.bell__i.sev-r .bell__ic{background:var(--danger-bg);color:var(--danger-fg)}
.bell__i.sev-y .bell__ic{background:var(--warning-bg);color:var(--warning-fg)}
.bell__t{font-weight:600;font-size:var(--fs-14);color:var(--ink-900);text-decoration:none;overflow-wrap:anywhere}
.bell__t:hover{color:var(--teal-700);text-decoration:underline}
.bell__i.is-unread .bell__t::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--teal-600);margin-right:8px;vertical-align:middle}
.bell__s{font-size:var(--fs-13);color:var(--muted-700);overflow-wrap:anywhere}
.bell__m{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:var(--fs-12);color:var(--muted-700)}
.bell__m b{font-weight:600;color:var(--ink-900)}
.bell__x{grid-column:3;grid-row:1/3;align-self:center}
.bell__e{padding:var(--sp-5) var(--sp-3);text-align:center;color:var(--muted-700);font-size:var(--fs-14)}
@media (max-width:480px){.bell__i{grid-template-columns:28px minmax(0,1fr)}.bell__x{grid-column:2;grid-row:auto;justify-self:start}}
`;
if (typeof document !== 'undefined' && !document.getElementById('bell-css')) { const st = document.createElement('style'); st.id = 'bell-css'; st.textContent = CSS; document.head.appendChild(st); }

function itemHtml(n) {
  const link = `<a class="bell__t" href="${esc(hrefOf(n.to))}" data-bell="open" data-id="${esc(n.id)}">${esc(n.title)}<span class="ui-sr">${n.read ? '' : '. Unread'}</span></a>`;
  return `<li class="bell__i sev-${esc(n.sev)}${n.read ? '' : ' is-unread'}" data-bell-item="${esc(n.id)}" data-kind="${esc(n.kind)}">`
    + `<span class="bell__ic" aria-hidden="true">${icon(KIND_ICON[n.kind] || 'dot', 16)}</span>`
    + `<div>${link}${n.sub ? `<div class="bell__s">${esc(n.sub)}</div>` : ''}${n.source && n.source.name ? `<div class="bell__s" data-bell-from>From workflow: ${esc(n.source.name)}</div>` : ''}<div class="bell__m">${n.needsConfirm ? '<b data-bell-confirm>Needs your confirmation</b>' : ''}<b>${esc(SEV_WORD[n.sev] || '')}</b><span>${esc(n.group || '')}</span><span>${esc(when(n.at))}</span></div></div>`
    + (n.read ? '' : `<button type="button" class="ui-btn ui-btn--secondary ui-btn--sm bell__x" data-bell="read" data-id="${esc(n.id)}" aria-label="Mark as read: ${esc(n.title)}">Mark read</button>`)
    + '</li>';
}
function bodyHtml() {
  const list = items(); const unread = list.filter(n => !n.read).length;
  if (!list.length) return `<div class="bell" data-bell-root><div class="bell__e">Nothing needs your attention right now.</div></div>`;
  const by = {}; for (const n of list) (by[n.group || 'Other'] = by[n.group || 'Other'] || []).push(n);
  const order = [...GROUPS.filter(g => by[g]), ...Object.keys(by).filter(g => !GROUPS.includes(g))];
  return `<div class="bell" data-bell-root><div class="bell__bar"><span class="bell__sum" role="status" aria-live="polite">${unread ? `${unread} unread of ${list.length}` : `All ${list.length} read`}</span>`
    + `<button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-bell="all"${unread ? '' : ' disabled'}>Mark all read</button></div>`
    + order.map(g => `<section aria-label="${esc(g)}"><h3 class="bell__g">${esc(g)} <span class="ui-num">${by[g].length}</span></h3><ul class="bell__l">${by[g].map(itemHtml).join('')}</ul></section>`).join('')
    + `<p class="bell__sum">This list is computed from the records you can open. Nothing is sent to anyone; open an item to act on it.</p></div>`;
}
const root = () => handle && handle.dialog && handle.dialog.querySelector('[data-bell-root]');
function repaint() {
  const r = root(); if (!r) return; const host = r.parentElement; const y = handle.dialog.querySelector('.ui-dialog__b'); const top = y ? y.scrollTop : 0;
  host.innerHTML = bodyHtml(); if (y) y.scrollTop = top;
}
async function markRead(payload) {
  try { await api.do('notify.read', payload); } catch { /* the server's reason is already toasted */ }
  badge(); repaint();
}
export function count() { return items().filter(n => !n.read).length; }
export function badge() {
  const n = count(); const key = String(n) + '|' + (actorNow() ? actorNow().id : '');
  if (key === lastKey) return; lastKey = key;
  if (window.psyfloTopbar) window.psyfloTopbar.setBadge('bell', n);
}
export function close() { if (handle) { handle.close('bell'); handle = null; } }
export function open(opener) {
  if (!actorNow() || !api.state) return null;
  if (handle && handle.el && handle.el.isConnected) return handle;
  handle = overlay.drawer({
    title: 'Notifications', className: 'bell-drawer', body: bodyHtml(), returnFocus: opener || undefined,
    onMount(dialog) {
      dialog.addEventListener('click', e => {
        const b = e.target.closest('[data-bell]'); if (!b || b.disabled) return;
        const k = b.dataset.bell;
        if (k === 'all') markRead({ all: true });
        else if (k === 'read') markRead({ ids: [b.dataset.id] });
        else if (k === 'open') { api.do('notify.read', { ids: [b.dataset.id] }).catch(() => { }); setTimeout(close, 0); }   // opening an item reads it; the link navigates and closes the drawer
      });
    },
    onClose() { handle = null; }
  });
  return handle;
}

// the shell's top bar asks for the bell with a window event, so this module needs no import from the shell
window.addEventListener('psyflo:topbar', e => { if (e.detail && e.detail.id === 'bell') open(e.detail.opener); });
// keep the number on the bell and an open drawer current as the state changes (a person acting on an item, a new payer reply)
api.onChange(() => { badge(); if (handle) repaint(); });
setTimeout(badge, 0);
window.psyfloBell = { open, close, count };
