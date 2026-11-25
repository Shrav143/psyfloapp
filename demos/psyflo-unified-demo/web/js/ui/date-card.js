// dateCard: the one date-range card of the list pages (R4: "Authorization period" and "Decision date" must look and behave the same).
// A title (with an optional info hint), a one-line summary, a From and a To date and up to three quick chips. Same width, same spacing, same
// chip style, same "Clear dates" behaviour wherever it is used; the screen decides what the dates match and writes them to the URL.
//
//   ui.dateCard({ id:'auth-dc', title:'Authorization period', from:'', to:'', hint:'What the dates match…',
//     chips:[{ key:'7', label:'Ends in 7 days', on:false }, …],                  a chip with no from/to is a mode (the screen reads `chip`)
//     onChange({ from, to, chip }) { … } })                                      chip = key of the lit chip after the change, '' when none
//   a chip with from/to sets both dates (pressing the lit chip clears them); typing a date clears the lit chip; "Clear dates" clears all.
// State is YOURS (like filterBar and pager): pass it in, react in onChange, repaint. Classes: ui-datecard* (components.css, R4 FMT).
import { esc, autoId, setHandlers, getHandlers, icon } from './util.js';
import { hint } from './hint.js';
import { fmtDate } from '../shared/dates.js';

export function dateCard(o = {}) {
  const id = o.id || autoId('dc'); const from = o.from || '', to = o.to || '';
  const chips = (o.chips || []).slice(0, 3);
  setHandlers(id, { dateCard: true, onChange: o.onChange, chips: chips.map(c => ({ key: String(c.key), from: c.from, to: c.to })) });
  const lit = chips.find(c => c.on);
  const set = !!(from || to || lit);
  const summary = from || to ? `${from ? fmtDate(from) : 'Any'} – ${to ? fmtDate(to) : 'any'}` : lit ? lit.label : 'Any dates';
  const info = o.hint ? hint('info', o.hint, { tone: 'n', label: `About ${o.title}` }) : '';
  const input = (k, label, v) => `<label class="ui-datecard__i"><span class="ui-datecard__l">${esc(label)}</span><input class="ui-input" type="date" id="${esc(id)}-${k}" data-ui-dc="${k}" value="${esc(v)}" aria-label="${esc(o.title)} ${esc(label.toLowerCase())}"></label>`;
  return `<section class="ui-datecard${set ? ' is-set' : ''}" aria-labelledby="${esc(id)}-h" data-ui-id="${esc(id)}" data-ui-datecard>
<div class="ui-datecard__h"><h2 id="${esc(id)}-h" class="ui-datecard__t">${esc(o.title)}</h2>${info}<span class="ui-datecard__s" role="status">${esc(summary)}</span>${set ? `<button type="button" class="ui-linkbtn ui-datecard__x" data-ui-dc-clear>Clear<span class="ui-sr"> dates</span></button>` : ''}</div>
<div class="ui-datecard__f">${input('from', 'From', from)}<span class="ui-datecard__a" aria-hidden="true">${icon('chevR', 14)}</span>${input('to', 'To', to)}</div>
<div class="ui-datecard__q" role="group" aria-label="${esc(o.title)} quick ranges">${chips.map(c => `<button type="button" class="ui-fchip" data-ui-dc-chip data-key="${esc(c.key)}" aria-pressed="${!!c.on}">${esc(c.label)}</button>`).join('')}</div>
</section>`;
}

// ---- one document-level handler (installed once, like the pager and the hint) ----
if (typeof document !== 'undefined' && !window.__uiDateCard) {
  window.__uiDateCard = true;
  const card = el => el.closest('[data-ui-datecard]');
  const read = c => ({ from: (c.querySelector('[data-ui-dc="from"]') || {}).value || '', to: (c.querySelector('[data-ui-dc="to"]') || {}).value || '' });
  const emit = (c, next) => { const h = getHandlers(c.getAttribute('data-ui-id')); if (h.onChange) h.onChange({ from: next.from, to: next.to, chip: next.chip || '' }); };
  document.addEventListener('change', e => { const i = e.target && e.target.closest && e.target.closest('[data-ui-dc]'); const c = i && card(i); if (c) emit(c, { ...read(c), chip: '' }); });
  document.addEventListener('click', e => {
    const t = e.target && e.target.closest ? e.target : null; if (!t) return;
    const x = t.closest('[data-ui-dc-clear]'); if (x && card(x)) { emit(card(x), { from: '', to: '', chip: '' }); return; }
    const b = t.closest('[data-ui-dc-chip]'); const c = b && card(b); if (!c) return;
    const on = b.getAttribute('aria-pressed') === 'true'; const def = (getHandlers(c.getAttribute('data-ui-id')).chips || []).find(k => k.key === b.dataset.key) || {};
    const cur = read(c);
    if (on) emit(c, { from: def.from != null ? '' : cur.from, to: def.to != null ? '' : cur.to, chip: '' });
    else emit(c, { from: def.from != null ? def.from : cur.from, to: def.to != null ? def.to : cur.to, chip: b.dataset.key });
  });
}
