// One delegated listener per event type for every kit component. Components stamp data-ui-* attributes; callbacks live in the
// handler registry under the component's data-ui-id (ui/util.js). Importing ui/index.js installs this once.
import { getHandlers, parseJsonAttr, esc } from './util.js';
import { emitFilter } from './filter-bar.js';
import { eventDetailHtml } from './timeline.js';
import { drawer, popover } from './overlay.js';
import { draft } from './misc.js';
import { statusChip } from './chip.js';

let installed = false;
const root = el => el.closest('[data-ui-id]');
const H = el => getHandlers(root(el)?.getAttribute('data-ui-id'));

function openEvidence(btn) {
  const d = parseJsonAttr(btn.getAttribute('data-ui-evidence')) || {};
  const title = d.state === 'missing' ? 'Evidence missing' : [d.n != null ? `Source ${d.n}` : 'Source', d.label].filter(Boolean).join(' · ');
  const body = d.state === 'missing'
    ? `<p>No stored record supports this statement. Verify ${esc(d.label || 'it')} before it is used.</p>`
    : `${d.quote ? `<blockquote class="ui-quote">${esc(d.quote)}</blockquote>` : '<p class="ui-muted">No quote stored for this source.</p>'}<dl class="ui-dl">${d.source ? `<div class="ui-dl__r"><dt>Source</dt><dd>${esc(d.source)}</dd></div>` : ''}${d.date ? `<div class="ui-dl__r"><dt>Date</dt><dd>${esc(d.date)}</dd></div>` : ''}${d.state && d.state !== 'sourced' ? `<div class="ui-dl__r"><dt>Status</dt><dd>${esc(d.state)}${d.reason ? ' · ' + esc(d.reason) : ''}</dd></div>` : ''}</dl>${d.href ? `<a class="ui-btn ui-btn--secondary" href="${esc(d.href)}" target="_blank" rel="noopener">${esc(d.hrefLabel || 'Open in Lauris')}</a>` : ''}`;
  popover({ anchor: btn, title, body, focus: true, returnFocus: btn });
}
function openEvent(btn) {
  const h = H(btn); const eid = btn.getAttribute('data-ui-event');
  const ev = (h.byId && h.byId.get(eid)) || parseJsonAttr(btn.getAttribute('data-ui-event-json'));
  if (!ev) return;
  if (h.onOpen) { h.onOpen(ev); return; }
  drawer({ title: 'Event', body: eventDetailHtml(ev), returnFocus: btn });
}

export function install() {
  if (installed) return; installed = true;
  document.addEventListener('click', e => {
    const t = e.target;
    let el;
    if ((el = t.closest('[data-ui-fchip]'))) { const h = H(el); const cur = el.getAttribute('aria-pressed') === 'true'; emitFilter(h, { key: el.dataset.key, value: cur ? '' : el.dataset.value }); return; }
    if ((el = t.closest('[data-ui-fclear]'))) { emitFilter(H(el), { clear: true }); return; }
    if ((el = t.closest('[data-ui-sort]'))) {
      const h = H(el); const th = el.closest('th'); const was = th.getAttribute('aria-sort');
      h.onSort && h.onSort({ key: el.dataset.key, dir: was === 'ascending' ? 'desc' : 'asc' }); return;
    }
    if ((el = t.closest('[data-ui-more]'))) { const h = H(el); h.onMore && h.onMore(); return; }
    if ((el = t.closest('[data-ui-es-action]'))) { const h = H(el); h.onAction && h.onAction(); return; }
    if ((el = t.closest('[data-ui-evidence]'))) { e.preventDefault(); openEvidence(el); return; }
    if ((el = t.closest('[data-ui-event]'))) { e.preventDefault(); openEvent(el); return; }
    if ((el = t.closest('[data-ui-pop]'))) { const d = parseJsonAttr(el.getAttribute('data-ui-pop')) || {}; popover({ anchor: el, title: d.title, body: d.html || `<p>${esc(d.text || '')}</p>`, focus: true, returnFocus: el }); return; }
    if ((el = t.closest('[data-ui-skip]'))) {
      e.preventDefault(); const target = document.getElementById(el.getAttribute('href').slice(1)) || document.getElementById('root');
      if (target) { if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1'); target.focus(); target.scrollIntoView({ block: 'start' }); } return;
    }
    if ((el = t.closest('[data-ui-dr-tab]'))) {
      const item = el.closest('.ui-dr__item'); const k = el.dataset.uiDrTab;
      item.querySelectorAll('[data-ui-dr-tab]').forEach(b => { const on = b === el; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      item.querySelectorAll('.ui-dr__col').forEach(c => { if (c.dataset.col === k) c.setAttribute('data-active', ''); else c.removeAttribute('data-active'); }); return;
    }
    if ((el = t.closest('[data-ui-dr]'))) {
      const h = H(el); const act = el.dataset.uiDr; const id = el.dataset.item; const fn = { accept: 'onAccept', reject: 'onReject', edit: 'onEdit', restore: 'onRestore', cancel: 'onCancel', approve: 'onApprove', acceptSourced: 'onAcceptSourced', save: 'onSave' }[act];
      if (act === 'save') { const ta = el.closest('.ui-dr__item').querySelector('textarea'); const text = ta ? ta.value : ''; draft.set(`${h.key}:${id}`, text); h.onSave && h.onSave(id, text); }
      else if (fn && h[fn]) h[fn](id);
      return;
    }
    // whole-row open (a click that is not on a control inside the row)
    if ((el = t.closest('tr[data-ui-row]')) && !t.closest('a,button,input,select,textarea,label,summary')) {
      const h = H(el); const link = el.querySelector('[data-ui-rowlink]');
      if (link) { link.click(); return; }
      const id = el.dataset.rowId; h.onOpen && h.onOpen(h.rows && h.rows.get(id), id);
    }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.matches && t.matches('[data-ui-draft]')) { draft.set(t.getAttribute('data-ui-draft'), t.value); return; }
    if (t.matches && t.matches('[data-ui-fsearch]')) {
      const h = H(t); clearTimeout(t._ui); t._ui = setTimeout(() => emitFilter(h, { key: t.dataset.key, value: t.value }), 120);
    }
  });
  document.addEventListener('change', e => {
    const t = e.target; if (t.matches && t.matches('[data-ui-fselect]')) emitFilter(H(t), { key: t.dataset.key, value: t.value });
  });
  document.addEventListener('keydown', e => {
    const t = e.target;
    const row = t.closest && t.closest('tr[data-ui-row]');
    if (row && (e.key === 'Enter' || e.key === ' ') && t === row) { e.preventDefault(); const h = H(row); const id = row.dataset.rowId; h.onOpen && h.onOpen(h.rows && h.rows.get(id), id); return; }
    if (row && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && (t === row || t.matches('[data-ui-rowlink]'))) {
      const rows = [...row.closest('tbody').querySelectorAll('tr[data-ui-row]')]; const i = rows.indexOf(row); const n = rows[i + (e.key === 'ArrowDown' ? 1 : -1)];
      if (n) { e.preventDefault(); (n.querySelector('[data-ui-rowlink]') || n).focus(); } return;
    }
    // tabs inside a draft review item: arrows move between tabs
    if (t.matches && t.matches('[data-ui-dr-tab]') && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const tabs = [...t.parentElement.querySelectorAll('[role=tab]')]; const n = tabs[(tabs.indexOf(t) + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]; n.focus(); n.click();
    }
  });
}
