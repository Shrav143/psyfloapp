// queueTable: the one table for every queue. Sortable headers (aria-sort), sticky header, whole row opens (click, Enter,
// Space), a real link in the first cell when you give hrefs, empty / loading / error states, a "Show more" pager for long tables.
//
// queueTable({
//   id:'auth', caption:'Authorizations',
//   columns:[{ key:'case', label:'Case', sort:true, render:r=>'<b>'+esc(r.case)+'</b>', primary:true, align:'right', hideBelow:1280, width:'14%' }, …],
//   rows:[…], rowId:r=>r.id, href:r=>'#/Authorization?id='+r.id,    (or onOpen(row, id) for non-navigating rows)
//   sort:{ key:'deadline', dir:'asc' }, onSort({key,dir}),
//   rowClass:r=>r.overdue?'is-urgent':'', limit:25, onMore(), total:120, maxHeight:'60vh'|'none',
//   empty:{ title, body, action }, error:{ title, body, onRetry }, loading:false })
// Cell content: render(row) returns trusted HTML; without render the value row[key] is escaped.
import { esc, H, cls, icon, autoId, setHandlers } from './util.js';
import { emptyState } from './misc.js';

export function queueTable(o = {}) {
  const id = o.id || autoId('qt'); const cols = o.columns || [];
  const rowId = o.rowId || (r => r.id);
  const sort = o.sort || {};
  const hasOpen = !!(o.onOpen); const hasHref = typeof o.href === 'function';
  const byId = new Map((o.rows || []).map(r => [String(rowId(r)), r]));
  setHandlers(id, { onSort: o.onSort, onOpen: o.onOpen, onMore: o.onMore, onRetry: o.error && o.error.onRetry, rows: byId });
  const th = c => {
    const on = sort.key === c.key; const ariaSort = on ? (sort.dir === 'desc' ? 'descending' : 'ascending') : 'none';
    const inner = c.sort ? `<button type="button" class="ui-qt__sort${on ? ' is-on' : ''}" data-ui-sort data-key="${esc(c.key)}"><span>${esc(c.label)}</span>${icon(on ? (sort.dir === 'desc' ? 'desc' : 'asc') : 'sort', 14)}</button>` : esc(c.label);
    return `<th scope="col" class="${cls(c.align === 'right' && 'is-r', c.hideBelow && 'ui-hide-lt-' + c.hideBelow)}"${c.sort ? ` aria-sort="${ariaSort}"` : ''}${c.width ? ` style="width:${esc(c.width)}"` : ''}>${inner}</th>`;
  };
  const primary = Math.max(0, cols.findIndex(c => c.primary));
  const rows = (o.limit ? (o.rows || []).slice(0, o.limit) : (o.rows || []));
  const td = (c, r, i) => {
    let v = c.render ? H(c.render(r)) : esc(r[c.key] ?? '');
    if (i === primary && hasHref) v = `<a class="ui-qt__link" data-ui-rowlink href="${esc(o.href(r))}">${v}</a>`;
    return `<td class="${cls(c.align === 'right' && 'is-r', c.hideBelow && 'ui-hide-lt-' + c.hideBelow, c.className)}">${v}</td>`;
  };
  const body = o.loading ? `<tr><td colspan="${cols.length}">${emptyState({ tone: 'loading', title: 'Loading' })}</td></tr>`
    : o.error ? `<tr><td colspan="${cols.length}">${emptyState({ tone: 'error', title: o.error.title || 'Could not load', body: o.error.body, action: o.error.onRetry ? { label: 'Try again' } : null, onAction: o.error.onRetry, id: id + '-err' })}</td></tr>`
    : !rows.length ? `<tr><td colspan="${cols.length}">${emptyState({ title: (o.empty && o.empty.title) || 'Nothing matches', body: o.empty && o.empty.body, action: o.empty && o.empty.action })}</td></tr>`
    : rows.map(r => {
      const rid = String(rowId(r)); const focusable = hasOpen && !hasHref;
      return `<tr data-ui-row data-row-id="${esc(rid)}" class="${cls('ui-qt__row', (hasOpen || hasHref) && 'is-open', o.rowClass && o.rowClass(r))}"${focusable ? ' tabindex="0"' : ''}${o.rowLabel ? ` aria-label="${esc(o.rowLabel(r))}"` : ''}>${cols.map((c, i) => td(c, r, i)).join('')}</tr>`;
    }).join('');
  const total = o.total ?? (o.rows || []).length;
  const more = o.limit && (o.rows || []).length > o.limit ? `<div class="ui-qt__more"><span class="ui-num">Showing ${o.limit} of ${total}</span><button type="button" class="ui-btn ui-btn--secondary" data-ui-more>Show ${Math.min(o.limitStep || o.limit, total - o.limit)} more</button></div>` : '';
  const mh = o.maxHeight === 'none' ? '' : ` style="max-height:${esc(o.maxHeight || 'max(360px, calc(100vh - 300px))')}"`;
  return `<div class="ui-qt" data-ui-id="${esc(id)}"><div class="ui-qt__scroll" role="region" aria-label="${esc(o.caption || 'Queue')}" tabindex="0"${mh}><table class="ui-qt__table"><caption class="ui-sr">${esc(o.caption || 'Queue')}${sort.key ? `, sorted by ${esc((cols.find(c => c.key === sort.key) || {}).label || sort.key)} ${sort.dir === 'desc' ? 'descending' : 'ascending'}` : ''}</caption><thead><tr>${cols.map(th).join('')}</tr></thead><tbody>${body}</tbody></table></div>${more}</div>`;
}

// plain helper for sorting rows the controller holds: sortRows(rows, {key,dir}, { deadline: r=>r.due })
export function sortRows(rows, sort, getters = {}) {
  if (!sort || !sort.key) return rows.slice();
  const g = getters[sort.key] || (r => r[sort.key]); const d = sort.dir === 'desc' ? -1 : 1;
  return rows.slice().sort((a, b) => { const x = g(a), y = g(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * d; });
}
