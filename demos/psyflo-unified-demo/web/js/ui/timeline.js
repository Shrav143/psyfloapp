// timeline and history. Events are plain objects:
//   { id, at:'2026-10-29T14:10', what:'Packet sent by Sfax', who:'J. Perez', actor:'staff'|'psyflo'|'lauris'|'payer'|'family'|'system',
//     sim:true (adds a Simulated chip), document:{ name, href }, source:'Sfax confirmation F-2291', next:{ label, href }, tone:'success'|… }
// Clicking an event opens a drawer with What · When · Who · Document · Source · Next action. Missing fields read "Not recorded":
// nothing is invented. Pass onOpen(event) to take over (the default drawer is skipped).
import { esc, cls, icon, autoId, setHandlers, jsonAttr } from './util.js';
import { chip, statusChip } from './chip.js';
import { fmtDateTime } from '../shared/dates.js';

const when = at => { try { return fmtDateTime(at); } catch { return String(at ?? ''); } };
const actorChip = e => statusChip(e.actor || 'system', { kind: 'actor' }) + (e.sim ? chip('Simulated', { tone: 'outline', className: 'ui-chip--sim' }) : '');

export function eventDetailHtml(e) {
  const row = (k, v) => `<div class="ui-dl__r"><dt>${k}</dt><dd>${v == null || v === '' ? '<span class="ui-muted">Not recorded</span>' : v}</dd></div>`;
  const doc = e.document ? (e.document.href ? `<a href="${esc(e.document.href)}"${/^https?:|^\/files\//.test(e.document.href) ? ' target="_blank" rel="noopener"' : ''}>${esc(e.document.name || 'Open document')}</a>` : esc(e.document.name || e.document)) : '';
  const next = e.next ? (e.next.href ? `<a class="ui-btn ui-btn--secondary" href="${esc(e.next.href)}" data-ui-close>${esc(e.next.label || 'Open')}</a>` : esc(e.next.label || e.next)) : '';
  return `<dl class="ui-dl">${row('What', esc(e.what))}${row('When', esc(when(e.at)))}${row('Who', esc(e.who) + ' ' + actorChip(e))}${row('Document', doc)}${row('Source', esc(e.source))}${row('Next action', next)}</dl>${e.detail ? `<p class="ui-dl__x">${esc(e.detail)}</p>` : ''}`;
}

// timeline(events, { id, onOpen, newestFirst:true })
export function timeline(events, o = {}) {
  const id = o.id || autoId('tl');
  const list = (events || []).slice(); if (o.newestFirst !== false) list.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  setHandlers(id, { onOpen: o.onOpen, byId: new Map(list.map((e, i) => [String(e.id ?? i), e])) });
  if (!list.length) return `<p class="ui-muted">No events yet.</p>`;
  return `<ol class="ui-tl" data-ui-id="${esc(id)}" aria-label="${esc(o.label || 'Timeline')}">${list.map((e, i) => {
    const eid = String(e.id ?? i);
    return `<li class="ui-tl__i${e.tone ? ' ui-tl__i--' + esc(e.tone) : ''}"><span class="ui-tl__dot" aria-hidden="true"></span><div class="ui-tl__c"><div class="ui-tl__h"><time datetime="${esc(e.at)}">${esc(when(e.at))}</time>${actorChip(e)}</div><button type="button" class="ui-tl__what" data-ui-event="${esc(eid)}" data-ui-event-json="${jsonAttr(e)}" aria-haspopup="dialog">${esc(e.what)}</button><div class="ui-tl__m">${esc(e.who || '')}${e.document ? ` · ${icon('file', 12)} ${esc(e.document.name || '')}` : ''}</div></div></li>`;
  }).join('')}</ol>`;
}

// history(events, { id, title:'History', limit:5, open:false }): the compact accordion version (newest first, "N more" inside)
export function history(events, o = {}) {
  const id = o.id || autoId('hs');
  const list = (events || []).slice().sort((a, b) => String(b.at).localeCompare(String(a.at)));
  setHandlers(id, { onOpen: o.onOpen });
  const lim = o.limit ?? 5;
  const item = (e, i) => `<li class="ui-hist__i"><time datetime="${esc(e.at)}">${esc(when(e.at))}</time><span class="ui-hist__w">${esc(e.what)}</span>${actorChip(e)}<button type="button" class="ui-linkbtn" data-ui-event="${esc(String(e.id ?? i))}" data-ui-event-json="${jsonAttr(e)}" aria-haspopup="dialog">View<span class="ui-sr"> ${esc(e.what)}</span></button></li>`;
  const head = list.slice(0, lim).map(item).join(''); const rest = list.slice(lim);
  return `<details class="ui-hist" data-ui-id="${esc(id)}"${o.open ? ' open' : ''}><summary><span>${esc(o.title || 'History')}</span><span class="ui-chip ui-chip--neutral ui-chip--sm"><span class="ui-chip__t">${list.length}</span></span>${icon('chevD', 16)}</summary>${list.length ? `<ol class="ui-hist__l">${head}</ol>${rest.length ? `<details class="ui-hist__more"><summary>Show ${rest.length} more</summary><ol class="ui-hist__l">${rest.map((e, i) => item(e, i + lim)).join('')}</ol></details>` : ''}` : '<p class="ui-muted">No history yet.</p>'}</details>`;
}
