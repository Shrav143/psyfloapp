// pager: the footer of every table. "Showing 1–10 of 19 patients", a "Rows per page" choice of 10, 25, 50 or 100, previous and next.
// It replaces the "N of M" count that used to sit at the top right of a table and the "Show more" button. State is YOURS: pass `size` and
// `page` in, react in `onChange({ size, page })`. By default the pager also writes `size` and `page` into the URL query (the default size
// is left out), so the choice survives a reload; pass url:false to opt out.
//
//   ui.pager({ id:'dash', total:19, size:25, page:1, noun:'patients', onChange: ({ size, page }) => this.setState({ size, page }) })
//   ui.pager.slice(rows, { size, page })       the rows for the page (page is clamped)
//   ui.pager.fromQuery(params, { size: 25 })   { size, page } from this.params (or any object with size and page)
import { esc, autoId, setHandlers } from './util.js';
import { writeQuery } from './query.js';

export const PAGE_SIZES = [10, 25, 50, 100];
export const DEFAULT_SIZE = 25;
const clampSize = (n, sizes = PAGE_SIZES, d = DEFAULT_SIZE) => (sizes.includes(+n) ? +n : d);
const pages = (total, size) => Math.max(1, Math.ceil((+total || 0) / size));
export const clampPage = (page, total, size) => Math.min(pages(total, size), Math.max(1, parseInt(page, 10) || 1));

export function slice(rows, { size = DEFAULT_SIZE, page = 1 } = {}) {
  const sz = clampSize(size); const p = clampPage(page, (rows || []).length, sz);
  return (rows || []).slice((p - 1) * sz, p * sz);
}
export function fromQuery(params = {}, { size = DEFAULT_SIZE } = {}) {
  const get = k => (params && typeof params.get === 'function' ? params.get(k) : params && params[k]);
  return { size: clampSize(get('size'), PAGE_SIZES, size), page: Math.max(1, parseInt(get('page'), 10) || 1) };
}

const REG = new Map();
export function pager(o = {}) {
  const id = o.id || autoId('pg'); const sizes = o.sizes || PAGE_SIZES;
  const size = clampSize(o.size, sizes, o.defaultSize || DEFAULT_SIZE); const total = Math.max(0, +o.total || 0);
  const n = pages(total, size); const page = clampPage(o.page, total, size);
  const from = total ? (page - 1) * size + 1 : 0, to = Math.min(total, page * size);
  REG.set(id, { onChange: o.onChange, url: o.url !== false, defaultSize: o.defaultSize || DEFAULT_SIZE, total });
  setHandlers(id, { pager: true });
  const noun = o.noun ? ' ' + esc(o.noun) : '';
  return `<nav class="ui-pager" aria-label="${esc(o.label || 'Pagination')}" data-ui-pager="${esc(id)}">
<div class="ui-pager__size"><label for="${esc(id)}-size">Rows per page</label><select class="ui-select" id="${esc(id)}-size" data-ui-pgsize>${sizes.map(s => `<option value="${s}"${s === size ? ' selected' : ''}>${s}</option>`).join('')}</select></div>
<span class="ui-pager__range" role="status" aria-live="polite">${total ? `Showing <b class="ui-num">${from}–${to}</b> of <b class="ui-num">${total}</b>${noun}` : `No${noun || ' rows'}`}</span>
<div class="ui-pager__nav"><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-ui-pgprev aria-label="Previous page"${page <= 1 ? ' disabled' : ''}>Previous</button><span class="ui-pager__pg" aria-hidden="true">Page ${page} of ${n}</span><button type="button" class="ui-btn ui-btn--secondary ui-btn--sm" data-ui-pgnext aria-label="Next page"${page >= n ? ' disabled' : ''}>Next</button></div>
</nav>`;
}
pager.slice = slice; pager.fromQuery = fromQuery; pager.SIZES = PAGE_SIZES; pager.clampPage = clampPage;

function emit(el, next) {
  const nav = el.closest('[data-ui-pager]'); if (!nav) return;
  const h = REG.get(nav.dataset.uiPager); if (!h) return;
  const sz = clampSize(next.size, PAGE_SIZES, h.defaultSize); const pg = clampPage(next.page, h.total, sz);
  if (h.url) writeQuery({ size: sz === h.defaultSize ? '' : sz, page: pg > 1 ? pg : '' });
  if (h.onChange) h.onChange({ size: sz, page: pg });
}
let installed = false;
export function installPager() {
  if (installed || typeof document === 'undefined') return; installed = true;
  document.addEventListener('change', e => {
    const t = e.target; if (!(t && t.matches && t.matches('[data-ui-pgsize]'))) return;
    emit(t, { size: t.value, page: 1 });                                  // a new size goes back to the first page
  });
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('[data-ui-pgprev],[data-ui-pgnext]'); if (!b || b.disabled) return;
    const nav = b.closest('[data-ui-pager]'); const sel = nav.querySelector('[data-ui-pgsize]'); const txt = nav.querySelector('.ui-pager__pg').textContent.match(/Page (\d+)/);
    const cur = txt ? +txt[1] : 1; emit(b, { size: sel.value, page: cur + (b.hasAttribute('data-ui-pgnext') ? 1 : -1) });
  });
}
installPager();
