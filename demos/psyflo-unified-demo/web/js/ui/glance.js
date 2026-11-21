// At-a-glance pieces (feedback round Nov 11): the unit bar and the deadline date. Both say one thing with a number or a date and an icon;
// the explanation lives in the tooltip and the screen-reader sentence, never in visible words.
//   unitsBar({ total, used, left, warn, warnPct }, { compact })  "110 left of 150" with a bar of what is LEFT; amber + warning icon from the
//                                                               rules-table threshold (units.warn_used_pct, default 75% used); red at 0 left
//   dateFlag({ date, text, sev, why }, { icon })                 "Nov 13" plus a yellow warning icon when sev is soon, red when overdue, nothing when ok
// Both return HTML strings (wrap with raw()). Classes: ui-units*, ui-dateflag* (components.css).
import { icon, esc } from './util.js';
import { fmtDate } from '../shared/dates.js';

export function unitsBar(u, o = {}) {
  if (!u || u.total == null) return '<span class="ui-units ui-units--none" aria-label="No units recorded">—</span>';
  const total = Math.max(0, +u.total || 0), left = Math.max(0, u.left != null ? +u.left : total - (+u.used || 0));
  const used = u.used != null ? +u.used : total - left;
  const pctLeft = total ? Math.max(0, Math.min(100, Math.round(100 * left / total))) : 0;
  const pctUsed = total ? Math.round(100 * used / total) : 0;
  const out = total > 0 && left === 0, warn = !!u.warn || out;
  const cls = out ? ' is-out' : warn ? ' is-warn' : '';
  const warnText = out ? 'No units left' : `${pctUsed}% of the units are used${u.warnPct ? ` (flag at ${u.warnPct}%)` : ''}`;
  const sr = `${left} left of ${total} units${warn ? '. ' + warnText : ''}`;
  const flag = warn ? `<span class="ui-units__flag" title="${esc(warnText)}">${icon(out ? 'alert' : 'alert', 14)}</span>` : '';
  return `<span class="ui-units${cls}${o.compact ? ' ui-units--compact' : ''}" role="img" aria-label="${esc(sr)}"><span class="ui-units__bar" aria-hidden="true"><i style="width:${pctLeft}%"></i></span><span class="ui-units__n" aria-hidden="true"><b>${left}</b> left of ${total}</span>${flag}</span>`;
}

export function dateFlag(d, o = {}) {
  if (!d || (!d.date && !d.text)) return '<span class="ui-dateflag ui-dateflag--none" aria-label="No date">—</span>';
  const date = d.date ? String(d.date).slice(0, 10) : '';
  const label = d.text || (date ? fmtDate(date) : '');
  const sev = d.sev === 'overdue' || d.sev === 'r' ? 'overdue' : d.sev === 'soon' || d.sev === 'y' ? 'soon' : 'ok';
  const why = d.why || '';
  const mark = sev === 'overdue' ? `<span class="ui-dateflag__i" title="${esc(why || 'Past due')}">${icon('alert', 14)}</span>` : sev === 'soon' ? `<span class="ui-dateflag__i" title="${esc(why || 'Due soon')}">${icon('alert', 14)}</span>` : '';
  const sr = `${label}${sev === 'overdue' ? '. Overdue' : sev === 'soon' ? '. Due soon' : ''}${why ? '. ' + why : ''}`;
  return `<span class="ui-dateflag ui-dateflag--${sev}" aria-label="${esc(sr)}"${why ? ` title="${esc(why)}"` : ''}><span class="ui-dateflag__t" aria-hidden="true">${esc(label)}</span>${o.icon === false ? '' : mark}</span>`;
}
