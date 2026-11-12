// filterBar: search, status chips (aria-pressed), selects, "More filters", the "N of M" count and Clear. State is YOURS:
// pass it in (`state`), react in `onChange(nextState, {key, value})`. With url:true (default) the kit also writes the state
// into the URL query so a filter survives reload and can be shared (see ui/query.js).
//
// filterBar({
//   id:'auth',                                    stable id (handlers are looked up by it)
//   search:{ key:'q', placeholder:'Search cases', label:'Search' },
//   chips:[{ key:'status', value:'needs', label:'Needs action', count:5 }, …],   one chip per value; clicking the lit chip clears
//   selects:[{ key:'payer', label:'Payer', options:[['', 'All payers'], ['anthem','Anthem']] }],
//   more:[ …selects ],                            behind a "More filters" disclosure
//   state:{ status:'needs', q:'', payer:'' },     current values (from this.params at init, then your own state)
//   shown:7, total:12, noun:'cases',
//   onChange(next, change){ this.setState({ f: next }); }, url:true })
import { esc, cls, icon, autoId, setHandlers } from './util.js';
import { writeQuery } from './query.js';

export function filterBar(o = {}) {
  const id = o.id || autoId('fb'); const st = o.state || {};
  const keys = new Set([o.search?.key, ...(o.chips || []).map(c => c.key), ...[...(o.selects || []), ...(o.more || [])].map(s => s.key)].filter(Boolean));
  setHandlers(id, { onChange: o.onChange, onClear: o.onClear, state: { ...st }, keys: [...keys], url: o.url !== false });
  const val = k => (st[k] == null ? '' : String(st[k]));
  const active = [...keys].filter(k => val(k) !== '' && val(k) !== String((o.defaults || {})[k] ?? '')).length;
  const sel = s => `<label class="ui-fsel${val(s.key) !== '' ? ' is-on' : ''}"><span class="ui-fsel__l">${esc(s.label)}</span><select class="ui-select" id="${esc(id)}-${esc(s.key)}" data-ui-fselect data-key="${esc(s.key)}">${s.options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === (s.value != null ? String(s.value) : val(s.key)) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`;
  const search = o.search ? `<label class="ui-fsearch"><span class="ui-sr">${esc(o.search.label || 'Search')}</span>${icon('search', 16)}<input class="ui-input" id="${esc(id)}-q" type="search" data-ui-fsearch data-key="${esc(o.search.key || 'q')}" placeholder="${esc(o.search.placeholder || 'Search')}" value="${esc(val(o.search.key || 'q'))}" autocomplete="off"></label>` : '';
  const chips = (o.chips || []).length ? `<div class="ui-fchips" role="group" aria-label="${esc(o.chipsLabel || 'Status')}">${o.chips.map(c => `<button type="button" class="ui-fchip" aria-pressed="${val(c.key) === String(c.value)}" data-ui-fchip data-key="${esc(c.key)}" data-value="${esc(c.value)}"><span>${esc(c.label)}</span>${c.count != null ? `<b class="ui-num">${esc(String(c.count))}</b>` : ''}</button>`).join('')}</div>` : '';
  const more = (o.more || []).length ? `<details class="ui-fmore"${(o.more || []).some(s => val(s.key) !== '') ? ' open' : ''}><summary>More filters${(o.more || []).filter(s => val(s.key) !== '').length ? ` (${(o.more || []).filter(s => val(s.key) !== '').length})` : ''}</summary><div class="ui-fmore__b">${o.more.map(sel).join('')}</div></details>` : '';
  // the "N of M" count moved to the pager at the bottom of the table (feedback Nov 12); the filter bar only offers Clear
  const count = active ? `<div class="ui-fcount"><button type="button" class="ui-linkbtn" data-ui-fclear>Clear filters (${active})</button></div>` : '';
  return `<div class="ui-fbar" role="group" aria-label="${esc(o.label || 'Filters')}" data-ui-id="${esc(id)}">${search}${chips}${(o.selects || []).map(sel).join('')}${more}${count}</div>`;
}

// used by the delegated listener (ui/wire.js)
export function emitFilter(h, change) {
  const next = { ...(h.state || {}) };
  if (change.clear) (h.keys || []).forEach(k => { next[k] = ''; }); else next[change.key] = change.value;
  if (h.url) { const patch = {}; (h.keys || []).forEach(k => { patch[k] = next[k]; }); writeQuery(patch); }
  h.state = next;
  if (change.clear && h.onClear) h.onClear(next); else if (h.onChange) h.onChange(next, change);
}
