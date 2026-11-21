// Renders the design canvas's .dc.html screens as live templates.
// A screen file is <helmet> styles + markup with {{holes}}, <sc-for>/<sc-if> blocks and onClick="{{fn}}",
// plus a small Component class. Screens can be driven by their own Component (canvas demo state) or by
// a controller registered in web/js/screens/*.js that reads the shared store.

export class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(s) { Object.assign(this.state, s); this.repaint(); }
  forceUpdate() { this.repaint(); }
  repaint() { if (this._paint) this._paint(); }
}

const cache = new Map();

export async function loadScreen(file, base = '/screens/') {
  if (cache.has(file)) return cache.get(file);
  const res = await fetch(base + file, { cache: 'no-store' });
  if (!res.ok) throw new Error('Screen not found: ' + file);
  const src = await res.text();
  const helmet = (src.match(/<helmet>([\s\S]*?)<\/helmet>/) || [, ''])[1];
  const css = [...helmet.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  let body = (src.match(/<x-dc>([\s\S]*?)<\/x-dc>/) || [, src])[1].replace(/<helmet>[\s\S]*?<\/helmet>/, '');
  const script = (src.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/) || [, ''])[1];
  let Component = null;
  if (script.trim()) {
    try { Component = new Function('DCLogic', script + '\n;return Component;')(DCLogic); } catch (e) { console.warn('Component failed for', file, e); }
  }
  const title = (src.match(/<title>([\s\S]*?)<\/title>/) || [, file])[1];
  const scr = { file, css, tpl: body, Component, title };
  // the extension panel half of an extension screen
  const a = body.indexOf('<aside style="flex:0 0 400px');
  if (a >= 0) { const end = matchClose(body, a, 'aside'); scr.aside = body.slice(a, end); }
  cache.set(file, scr);
  return scr;
}

// index just past the matching </tag> for the element starting at `start`
export function matchClose(s, start, tag) {
  const re = new RegExp(`<${tag}[\\s>]|</${tag}>`, 'g'); re.lastIndex = start; let depth = 0, m;
  while ((m = re.exec(s))) { if (m[0][1] === '/') { depth--; if (depth === 0) return m.index + m[0].length; } else depth++; }
  return s.length;
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ESC[c]);
export class Raw { constructor(h) { this.html = h; } toString() { return this.html; } }
export const raw = h => new Raw(h);

function lookup(ctx, p) {
  if (p === 'true') return true; if (p === 'false') return false;
  return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), ctx);
}

// Renders nested <sc-for list="{{x}}" as="y"> and <sc-if value="{{c}}"> blocks, then holes.
export function render(tpl, ctx, handlers) {
  let out = ''; let i = 0;
  const open = /<sc-(for|if)\b([^>]*)>/g;
  while (true) {
    open.lastIndex = i; const m = open.exec(tpl);
    if (!m) { out += holes(tpl.slice(i), ctx, handlers); break; }
    out += holes(tpl.slice(i, m.index), ctx, handlers);
    const tag = 'sc-' + m[1]; const end = matchClose(tpl, m.index, tag);
    const inner = tpl.slice(m.index + m[0].length, end - (`</${tag}>`).length);
    const attrs = m[2];
    if (m[1] === 'for') {
      const list = (attrs.match(/list="\{\{\s*([\w.$]+)\s*\}\}"/) || [])[1]; const as = (attrs.match(/as="(\w+)"/) || [])[1] || 'item';
      const arr = lookup(ctx, list) || [];
      out += arr.map((it, k) => render(inner, Object.assign(Object.create(ctx), { [as]: it, $index: k }), handlers)).join('');
    } else {
      const cond = (attrs.match(/value="\{\{\s*(!?)([\w.$]+)\s*\}\}"/) || []);
      let v = lookup(ctx, cond[2]); if (cond[1]) v = !v;
      if (v) out += render(inner, ctx, handlers);
    }
    i = end;
  }
  return out;
}

function holes(s, ctx, handlers) {
  s = s.replace(/\bon(Click|Input|Change|Submit|Keydown)="\{\{\s*([\w.$]+)\s*\}\}"/g, (m, ev, p) => {
    const fn = lookup(ctx, p); if (typeof fn !== 'function') return '';
    handlers.push([ev.toLowerCase(), fn]); return `data-on${ev.toLowerCase()}="${handlers.length - 1}"`;
  });
  return s.replace(/\{\{\s*([\w.$]+)\s*\}\}/g, (m, p) => {
    const v = lookup(ctx, p);
    if (v === undefined || v === null || typeof v === 'function') return '';
    if (v instanceof Raw) return v.html;
    return esc(v);
  });
}

// Paint a template into root and bind handlers. Returns the root.
export function paint(root, tpl, vals) {
  const handlers = [];
  root.innerHTML = render(tpl, vals || {}, handlers);
  for (const ev of ['click', 'input', 'change', 'submit', 'keydown']) {
    root.querySelectorAll(`[data-on${ev}]`).forEach(el => {
      const h = handlers[+el.getAttribute('data-on' + ev)];
      if (!h) return;
      el.addEventListener(ev, e => { if (ev === 'click' || ev === 'submit') e.preventDefault(); h[1](e, el); });
    });
  }
  root.querySelectorAll('form').forEach(f => f.addEventListener('submit', e => e.preventDefault()));
  return root;
}

// Replace the first element whose opening tag matches `startPattern` (string) with `replacement`.
export function replaceElement(tpl, startPattern, tag, replacement) {
  const a = tpl.indexOf(startPattern); if (a < 0) return tpl;
  const end = matchClose(tpl, a, tag);
  return tpl.slice(0, a) + replacement + tpl.slice(end);
}
