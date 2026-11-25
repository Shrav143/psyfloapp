/* Shared filter bar for the platform pages (Authorizations, Denial Intelligence and Analytics).
   Dropdown filters replace the summary boxes that used to sit at the top of each page. Choices live in PSY.state.fb[page]
   (kept while the demo session lasts, cleared by Reset Demo), and every page reads them at render time.

   defs: [{ k, label, opts:[[value, label], …], def:'' }]   a dropdown (value '' or def = "no filter")
         [{ k:'q', label:'Search', type:'q', ph:'…' }]       a search box (re-renders as you type and keeps the cursor)
   PSY.fb.html(page, defs, { shown, total })  → the bar, with "N of M" and "Clear filters" on the right
   PSY.fb.get(page, k, def) · PSY.fb.set(page, k, v) · PSY.fb.clear(page, defs) · PSY.fb.active(page, defs)
   PSY.fb.fromParams(page, params, fn)  applies deep-link params once per distinct set of params (fn(params) → {k:v}).
   PSY.fb.strip(page, items)  round 9 (SPEC9 decision 2): the summary numbers as one compact row of count chips, not tiles.
         items: [{ label, value, k?, v?, id? }]  a chip with k/v applies that filter (click again to clear it); without k it is read-only. */
(function () {
  const PSY = window.PSY; const esc = PSY.esc;
  const FB = (PSY.fb = {});
  FB.st = (page) => { PSY.state.fb = PSY.state.fb || {}; return (PSY.state.fb[page] = PSY.state.fb[page] || {}); };
  FB.get = (page, k, def) => { const v = FB.st(page)[k]; return v == null ? (def == null ? '' : def) : v; };
  FB.set = (page, k, v) => { FB.st(page)[k] = v; PSY.save(); };
  FB.clear = (page, defs) => { const s = FB.st(page); (defs || []).forEach((d) => { delete s[d.k]; }); PSY.save(); };
  FB.active = (page, defs) => (defs || []).filter((d) => String(FB.get(page, d.k, d.def)) !== String(d.def == null ? '' : d.def)).length;
  /* deep links: apply the route's params when they differ from the last time this page rendered with them */
  FB.fromParams = (page, params, fn) => {
    const s = FB.st(page); const sig = JSON.stringify(params || {});
    if (s.__sig === sig) return;
    s.__sig = sig; const m = fn(params || {}); if (m) Object.keys(m).forEach((k) => { s[k] = m[k]; });
  };
  FB.html = (page, defs, o) => {
    o = o || {};
    const n = FB.active(page, defs);
    const field = (d) => {
      const v = String(FB.get(page, d.k, d.def)); const on = v !== String(d.def == null ? '' : d.def);
      if (d.type === 'q') return '<label class="fb-f fb-q' + (on ? ' on' : '') + '"><span>' + esc(d.label || 'Search') + '</span><input class="fb-s" type="search" data-input="fb-set" data-page="' + page + '" data-k="' + d.k + '" placeholder="' + esc(d.ph || '') + '" aria-label="' + esc(d.label || 'Search') + '" value="' + esc(v) + '" autocomplete="off"></label>';
      return '<label class="fb-f' + (on ? ' on' : '') + '"><span>' + esc(d.label) + '</span><select class="fb-s" data-change="fb-set" data-page="' + page + '" data-k="' + d.k + '" aria-label="' + esc(d.label) + '">' +
        d.opts.map((x) => '<option value="' + esc(x[0]) + '"' + (String(x[0]) === v ? ' selected' : '') + '>' + esc(x[1]) + '</option>').join('') + '</select></label>';
    };
    const count = o.shown != null ? '<div class="fb-n" data-fb="count"><span><b>' + o.shown + '</b>' + (o.total != null ? ' of ' + o.total : '') + (o.noun ? ' ' + esc(o.noun) : '') + '</span>' + (n ? '<button type="button" class="fb-x" data-act="fb-clear" data-page="' + page + '">Clear filters (' + n + ')</button>' : '') + (o.extra || '') + '</div>' : '';
    return '<div class="fb" role="group" aria-label="Filters" data-fb="' + page + '">' + defs.map(field).join('') + count + '</div>';
  };
  /* compact count strip: each summary number is a chip; a chip with a filter key applies it */
  FB.strip = (page, items, o) => {
    o = o || {};
    const chip = (it) => {
      const inner = '<span>' + esc(it.label) + '</span><b>' + esc(String(it.value)) + '</b>' + (it.sub ? '<small>' + esc(it.sub) + '</small>' : '');
      const id = it.id ? ' data-c="' + esc(it.id) + '"' : '';
      if (!it.k) return '<span class="fb-c ro"' + id + '>' + inner + '</span>';
      const on = String(FB.get(page, it.k, '')) === String(it.v);
      return '<button type="button" class="fb-c' + (on ? ' on' : '') + '"' + id + ' data-act="fb-chip" data-page="' + page + '" data-k="' + esc(it.k) + '" data-v="' + esc(it.v) + '" aria-pressed="' + on + '">' + inner + '</button>';
    };
    return '<div class="fb-cs" role="group" aria-label="' + esc(o.label || 'Summary') + '" data-fb-strip="' + page + '">' + items.map(chip).join('') + (o.extra || '') + '</div>';
  };
  /* option helpers */
  FB.uniq = (list) => Array.from(new Set(list.filter((x) => x != null && x !== '')));
  FB.opts = (all, pairs) => [['', all]].concat(pairs);

  PSY.acts['fb-set'] = (el) => {
    const page = el.getAttribute('data-page'), k = el.getAttribute('data-k'); const isQ = el.tagName === 'INPUT';
    FB.set(page, k, el.value);
    PSY.refresh();
    const r = PSY.activeRoot(); const n = r && r.querySelector('[data-page="' + page + '"][data-k="' + k + '"]');
    if (n) { n.focus(); if (isQ) { try { const L = n.value.length; n.setSelectionRange(L, L); } catch (e) {} } }
  };
  PSY.acts['fb-chip'] = (el) => {
    const page = el.getAttribute('data-page'), k = el.getAttribute('data-k'), v = el.getAttribute('data-v');
    FB.set(page, k, String(FB.get(page, k, '')) === v ? '' : v); PSY.refresh();
    const r = PSY.activeRoot(); const n = r && r.querySelector('.fb-c[data-k="' + k + '"][data-v="' + v + '"]'); if (n) n.focus();
  };
  PSY.acts['fb-clear'] = (el) => {
    const page = el.getAttribute('data-page'); const s = FB.st(page); const sig = s.__sig;
    Object.keys(s).forEach((k) => { if (k !== '__sig') delete s[k]; }); s.__sig = sig; PSY.save(); PSY.refresh();
  };

  const CSS = `
  .fb{display:flex;flex-wrap:wrap;gap:10px 12px;align-items:flex-end}
  .fb-f{display:flex;flex-direction:column;gap:4px;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:#6B665E;font-weight:700;min-width:0}
  .fb-s{height:36px;font:inherit;font-size:13px;text-transform:none;letter-spacing:0;font-weight:500;color:#1B1B19;background:#fff;border:1px solid #E0D6C9;border-radius:9px;padding:0 10px;max-width:240px;min-width:0}
  select.fb-s{padding-right:6px}
  .fb-s:hover{border-color:#C9BBA8}.fb-s:focus-visible{outline:2px solid #1D4F43;outline-offset:1px}
  .fb-f.on .fb-s{border-color:#1D4F43;background:#F4F9F6;font-weight:600}
  .fb-q .fb-s{width:220px;max-width:220px}
  .fb-n{margin-left:auto;display:flex;align-items:center;gap:14px;font-size:13px;color:#6B665E;padding-bottom:0;height:36px;white-space:nowrap}
  .fb-n b{color:#1B1B19;font-weight:700}
  .fb-x{border:0;background:none;padding:0;font:inherit;font-size:13px;font-weight:600;color:#1D4F43;text-decoration:underline;cursor:pointer}
  .fb-cs{display:flex;flex-wrap:wrap;gap:6px 8px;align-items:center}
  .fb-c{display:inline-flex;align-items:baseline;gap:6px;border:1px solid #E5DCD0;background:#fff;border-radius:999px;padding:5px 12px;font:inherit;font-size:13px;color:#4A453D;cursor:pointer;white-space:nowrap;line-height:1.3}
  .fb-c b{color:#1B1B19;font-weight:700;font-variant-numeric:tabular-nums}
  .fb-c small{font-size:12px;color:#6B665E}
  button.fb-c:hover{border-color:#C9BBA8;background:#FCFAF6}
  .fb-c.on{background:#1D4F43;border-color:#1D4F43;color:#E3EFEA}.fb-c.on b,.fb-c.on small{color:#fff}
  .fb-c.ro{cursor:default;background:#FCFAF6}
  .fb-c:focus-visible{outline:2px solid #1D4F43;outline-offset:2px}
  .fb-empty{padding:30px 22px;color:#6B665E;text-align:center;font-size:14px}
  .fb-empty button{border:0;background:none;padding:0;font:inherit;font-weight:600;color:#1D4F43;text-decoration:underline;cursor:pointer}
  `;
  PSY.css.platform = (PSY.css.platform || '') + CSS;
})();
