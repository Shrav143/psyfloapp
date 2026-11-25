// Accessibility and layout probes (review/03-ux-audit.md section j, review/06-demo-and-qa.md d4 and d5, review/06b 4.9). QA1.
// Page-side functions are serialised into the page: no closures. Node-side helpers drive the keyboard.
//
//   structure(o)         h1 count, landmarks, labels, chips, names, ids, headings, lang, live regions, small text
//   contrastSample(o)    up to n text/background pairs (distinct pairs first) with ratios; ui(o) border contrast of form fields
//   targets(o)           interactive controls smaller than min px (inline links in running text exempt; WCAG 2.5.8 spacing exception for 24)
//   hscroll()            horizontal overflow and the elements that cause it
//   motion()             elements whose transition or animation runs while prefers-reduced-motion is on
//   tabWalk(page, o)     press Tab up to max times: stops with where, name, focus indicator, order
//   dialogCheck(page, o) focus entry, Tab and Shift+Tab trap, Escape, focus return, inert page, fits viewport
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function structure(o) {
  const scope = o && o.scope ? document.querySelector(o.scope) : document.body;
  const root = scope || document.body;
  const visible = el => { if (el.closest('[inert],[hidden]')) return false; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const q = s => [...root.querySelectorAll(s)].filter(visible);
  const all = s => [...document.querySelectorAll(s)];
  const text = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  const name = el => {
    const lb = el.getAttribute('aria-labelledby'); if (lb) { const t = lb.split(/\s+/).map(i => { const x = document.getElementById(i); return x ? text(x) : ''; }).join(' ').trim(); if (t) return t; }
    const al = (el.getAttribute('aria-label') || '').trim(); if (al) return al;
    if (el.labels && el.labels.length) { const t = [...el.labels].map(text).join(' ').trim(); if (t) return t; }
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' && /^(button|submit|reset)$/.test(el.type) && el.value) return el.value;
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return (el.getAttribute('title') || '').trim();      // placeholder alone is not a label
    const t = text(el); if (t) return t;
    const img = el.querySelector('img[alt]'); if (img && img.alt.trim()) return img.alt.trim();
    const sv = el.querySelector('svg title'); if (sv && text(sv)) return text(sv);
    return (el.getAttribute('title') || '').trim();
  };
  const sel = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const h1 = q('h1'); const hs = q('h1,h2,h3,h4,h5,h6').map(h => +h.tagName[1]);
  const skipped = []; for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) skipped.push(`h${hs[i - 1]}->h${hs[i]}`);
  const mains = all('main,[role=main]').filter(visible);
  const navs = all('nav,[role=navigation]').filter(visible);
  const fields = q('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]):not([type=image]),select,textarea');
  const unlabeled = fields.filter(e => !name(e)).map(sel);
  const placeholderOnly = fields.filter(e => !name(e) && e.getAttribute('placeholder')).map(sel);
  const chips = q('[data-ui-fchip]'); const chipsNoPressed = chips.filter(c => c.getAttribute('aria-pressed') == null).map(sel);
  const ctrls = q('a[href],button,summary,[role=button],[role=tab],[role=link],[role=menuitem]');
  const unnamed = ctrls.filter(e => !name(e)).map(sel);
  const ids = {}; all('[id]').forEach(e => { ids[e.id] = (ids[e.id] || 0) + 1; }); const dupIds = Object.keys(ids).filter(k => ids[k] > 1);
  const posTab = all('[tabindex]').filter(e => +e.getAttribute('tabindex') > 0).map(sel);
  const imgsNoAlt = q('img').filter(e => !e.hasAttribute('alt')).map(sel);
  const hiddenFocus = all('[aria-hidden="true"]').filter(e => e.querySelector('a[href],button:not([disabled]),input:not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"])')).map(sel);
  const iframesNoTitle = q('iframe').filter(f => !(f.getAttribute('title') || '').trim()).map(sel);
  const tables = q('table'); const tablesNoName = tables.filter(t => !(t.querySelector('caption') || t.getAttribute('aria-label') || t.getAttribute('aria-labelledby'))).map(sel);
  const thNoScope = tables.flatMap(t => [...t.querySelectorAll('th')]).filter(th => !th.getAttribute('scope') && !th.closest('thead')).length;
  const regionsNoName = q('[role=region],section[aria-labelledby],[tabindex="0"][role=region]').filter(r => r.getAttribute('role') === 'region' && !name(r)).map(sel);
  const scrollFocusable = q('[tabindex="0"]').filter(e => !e.matches('a,button,input,select,textarea,summary,tr,[role=button],[role=tab],[role=link]')).map(e => ({ s: sel(e), role: e.getAttribute('role') || '', name: name(e) }));
  const live = all('[aria-live]').map(e => (e.id || e.tagName.toLowerCase()) + ':' + e.getAttribute('aria-live'));
  const small = []; const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) { const t = n.textContent.trim(); if (t.length < 2) continue; const e = n.parentElement; if (!e || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(e.tagName) || !visible(e)) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 11.95) small.push(sel(e) + ':' + fs + ':' + t.slice(0, 20)); }
  const dock = document.getElementById('dock');
  return { h1: h1.length, h1Text: h1.map(text), mains: mains.length, navs: navs.length, navNames: navs.map(n => n.getAttribute('aria-label') || n.getAttribute('aria-labelledby') || ''), headingSkips: skipped, unlabeled, placeholderOnly, chips: chips.length, chipsNoPressed, unnamed, dupIds, posTab, imgsNoAlt, hiddenFocus, iframesNoTitle, tablesNoName, thNoScope, regionsNoName, scrollFocusable,
    lang: document.documentElement.lang || '', title: document.title, live, small: small.slice(0, 8), smallCount: small.length, dockHiddenOrCollapsed: dock ? (dock.hidden || dock.dataset.state !== 'open') : true, dockTabbable: dock && !dock.hidden ? [...dock.querySelectorAll('button')].filter(b => visible(b) && b.tabIndex >= 0).length : 0 };
}

// colour maths in the page
export function contrastSample(o) {
  const scope = o && o.scope ? document.querySelector(o.scope) : document.body; const root = scope || document.body; const N = (o && o.n) || 30;
  const parse = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) { const m2 = String(c).match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/); if (m2) return { r: m2[1] * 255, g: m2[2] * 255, b: m2[3] * 255, a: m2[4] == null ? 1 : +m2[4] }; return null; } const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => { const a = f.a; return { r: f.r * a + b.r * (1 - a), g: f.g * a + b.g * (1 - a), b: f.b * a + b.b * (1 - a), a: 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const bgOf = el => { const layers = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.backgroundImage && cs.backgroundImage !== 'none') return { unknown: 'image/gradient on ' + e.tagName.toLowerCase() }; const c = parse(cs.backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255, a: 1 }; for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base); return { c: base }; };
  const opacityOf = el => { let o = 1; for (let e = el; e; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity); return o; };
  const visible = el => { if (el.closest('[inert],[hidden],.ui-sr,.ui-sr-only')) return false; const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const sel = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const items = []; const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.replace(/\s+/g, ' ').trim(); if (t.length < 2) continue; const e = n.parentElement; if (!e || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION'].includes(e.tagName) || !visible(e)) continue;
    if (e.closest('[disabled],[aria-disabled=true]')) continue;                                        // inactive components are exempt (WCAG 1.4.3)
    const cs = getComputedStyle(e); const fg = parse(cs.color); if (!fg) continue; const bg = bgOf(e);
    const fs = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight, 10) >= 700; const large = fs >= 24 || (fs >= 18.66 && bold);
    if (bg.unknown) { items.push({ s: sel(e), t: t.slice(0, 30), unknown: bg.unknown, large, fs }); continue; }
    const f = over({ ...fg, a: fg.a * opacityOf(e) }, bg.c); const rr = ratio(f, bg.c);
    items.push({ s: sel(e), t: t.slice(0, 30), fg: `rgb(${Math.round(f.r)},${Math.round(f.g)},${Math.round(f.b)})`, bg: `rgb(${Math.round(bg.c.r)},${Math.round(bg.c.g)},${Math.round(bg.c.b)})`, ratio: Math.round(rr * 100) / 100, large, fs, min: large ? 3 : 4.5 });
  }
  // distinct (fg,bg,size class) first, then fill evenly
  const seen = new Set(); const distinct = []; const rest = [];
  for (const it of items) { const k = it.unknown ? 'u:' + it.unknown : it.fg + '|' + it.bg + '|' + it.large; if (seen.has(k)) rest.push(it); else { seen.add(k); distinct.push(it); } }
  let pick = distinct;
  if (distinct.length > N) { pick = []; const step = distinct.length / N; for (let i = 0; i < N; i++) pick.push(distinct[Math.floor(i * step)]); }
  else if (rest.length) { const need = N - distinct.length; const step = Math.max(1, rest.length / need); for (let i = 0; i < need && Math.floor(i * step) < rest.length; i++) pick.push(rest[Math.floor(i * step)]); }
  // every distinct pair is checked (the failing list is complete); the sample is the part reported as "30 sampled"
  const allDistinct = distinct.filter(x => !x.unknown);
  const failing = allDistinct.filter(x => x.ratio < x.min);
  return { nodes: items.length, distinctPairs: distinct.length, sampled: pick.length, pick, failing: failing.slice(0, 12), failingCount: failing.length, unknown: distinct.filter(x => x.unknown).length, worst: allDistinct.reduce((m, x) => (!m || x.ratio < m.ratio ? x : m), null) };
}

// borders of form fields against the surface they sit on (WCAG 1.4.11): the stronger of border and fill must reach 3:1
export function uiContrast(o) {
  const scope = o && o.scope ? document.querySelector(o.scope) : document.body; const root = scope || document.body;
  const parse = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const bgOf = el => { const layers = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; } } let base = { r: 255, g: 255, b: 255, a: 1 }; for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base); return base; };
  const visible = el => { if (el.closest('[inert],[hidden]')) return false; const r = el.getBoundingClientRect(); if (r.width < 8 || r.height < 8) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const sel = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const out = [];
  for (const e of root.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=range]):not([type=file]),select,textarea')) {
    if (!visible(e) || e.disabled) continue;
    const cs = getComputedStyle(e); const parentBg = bgOf(e.parentElement || document.body); const own = parse(cs.backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
    const fill = over(own, parentBg); const bw = parseFloat(cs.borderTopWidth) || 0; const bc = parse(cs.borderTopColor);
    const rb = bw >= 1 && bc ? ratio(over(bc, fill), parentBg) : 0; const rf = ratio(fill, parentBg);
    out.push({ s: sel(e), ratio: Math.round(Math.max(rb, rf) * 100) / 100, border: bw, type: e.type || e.tagName.toLowerCase() });
  }
  const failing = out.filter(x => x.ratio < 3);
  return { checked: out.length, failing: failing.slice(0, 10), failingCount: failing.length };
}

export function targets(o) {
  const min = o.min; const scope = o.scope ? document.querySelector(o.scope) : document.body; const root = scope || document.body;
  const SEL = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=link],[role=switch],[role=menuitem],tr[tabindex="0"]';
  const visible = el => { if (el.closest('[inert],[hidden]')) return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('.ui-skip'); };
  const sel = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const text = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28);
  const els = [...root.querySelectorAll(SEL)].filter(visible);
  const rect = el => { let r = el.getBoundingClientRect(); if (el.labels && el.labels.length) { for (const l of el.labels) { const lr = l.getBoundingClientRect(); if (lr.width * lr.height > r.width * r.height) r = lr; } } return r; };
  const inline = el => { if (el.tagName !== 'A') return false; const cs = getComputedStyle(el); if (cs.display !== 'inline') return false; const p = el.parentElement; return !!p && (p.innerText || '').replace(/\s+/g, ' ').trim().length > (el.innerText || '').length + 8; };
  const rs = els.map(e => ({ e, r: rect(e) }));
  const small = [];
  for (const { e, r } of rs) {
    if (Math.min(r.width, r.height) >= min - 0.5) continue; if (inline(e)) continue;
    if (min <= 24) { // WCAG 2.5.8 spacing exception: a 24 px circle on the target's centre must not touch another target
      const cx = r.x + r.width / 2, cy = r.y + r.height / 2; const hit = rs.some(o2 => o2.e !== e && !o2.e.contains(e) && !e.contains(o2.e) && Math.max(o2.r.left, cx - 12) < Math.min(o2.r.right, cx + 12) && Math.max(o2.r.top, cy - 12) < Math.min(o2.r.bottom, cy + 12));
      if (!hit) continue;
    }
    small.push({ s: sel(e), t: text(e), w: Math.round(r.width), h: Math.round(r.height) });
  }
  return { checked: els.length, small: small.slice(0, 15), smallCount: small.length };
}

export function hscroll() {
  const de = document.documentElement; const over = de.scrollWidth - de.clientWidth; const offenders = [];
  if (over > 1) {
    const vw = de.clientWidth;
    for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (r.width < 1 || r.right <= vw + 1) continue; if (e.closest('[inert],[hidden]')) continue; let p = e.parentElement, clipped = false; while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { clipped = true; break; } p = p.parentElement; } if (!clipped) offenders.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '') + ' right=' + Math.round(r.right)); if (offenders.length >= 4) break; }
  }
  return { over, offenders, scrollWidth: de.scrollWidth, clientWidth: de.clientWidth };
}

export function motion() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; const bad = []; const dur = s => Math.max(0, ...String(s).split(',').map(x => { x = x.trim(); return x.endsWith('ms') ? parseFloat(x) / 1000 : parseFloat(x) || 0; }));
  let scan = 0;
  for (const e of document.querySelectorAll('*')) { scan++; const cs = getComputedStyle(e); const t = dur(cs.transitionDuration), a = dur(cs.animationDuration); if ((t > 0.011 || (a > 0.011 && cs.animationName !== 'none')) ) bad.push(e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '') + ` t=${t}s a=${a}s`); if (bad.length >= 6) break; }
  return { reduce, bad, scan, smooth: getComputedStyle(document.documentElement).scrollBehavior };
}

// ---- keyboard (node side) ----
const FOCUS_INFO = () => {
  const a = document.activeElement; if (!a || a === document.body || a === document.documentElement) return null;
  const text = e => (e.innerText || e.textContent || '').replace(/\s+/g, ' ').trim();
  let name = (a.getAttribute('aria-label') || '').trim(); if (!name && a.labels && a.labels.length) name = text(a.labels[0]); if (!name) name = text(a) || a.getAttribute('title') || a.getAttribute('placeholder') || a.getAttribute('name') || '';
  const where = a.closest('[data-ui-skip],.ui-skip') ? 'skip' : a.closest('#dock') ? 'dock' : a.closest('#rail') ? 'rail' : a.closest('.ui-overlay') ? 'overlay' : a.closest('#panel') ? 'panel' : a.closest('#root') ? 'root' : 'other';
  const cs = getComputedStyle(a); const r = a.getBoundingClientRect();
  document.querySelectorAll('[data-tabstop]').forEach(e => e.removeAttribute('data-tabstop'));
  a.setAttribute('data-tabstop', '1');
  return { tag: a.tagName.toLowerCase() + (a.id ? '#' + a.id : ''), role: a.getAttribute('role') || '', name: name.slice(0, 50), where, href: a.getAttribute('href') || '',
    outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, shadow: cs.boxShadow, border: cs.borderTopColor + cs.borderLeftColor, bg: cs.backgroundColor, deco: cs.textDecorationLine, color: cs.color,
    rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], inView: r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth, hidden: a.hasAttribute('aria-hidden') || !!a.closest('[aria-hidden="true"]'), tabindex: a.getAttribute('tabindex') };
};
const PREV_STYLE = () => {
  const a = document.querySelector('[data-tabstop]'); if (!a) return null; const cs = getComputedStyle(a);
  return { outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor, shadow: cs.boxShadow, border: cs.borderTopColor + cs.borderLeftColor, bg: cs.backgroundColor, deco: cs.textDecorationLine, color: cs.color };
};
export const hasIndicator = (cur, prev) => {
  if (!cur) return false;
  const ow = parseFloat((cur.outline.match(/(\d+(\.\d+)?)px/) || [])[1] || 0);
  if (!/^none/.test(cur.outline) && ow >= 1.5) return true;
  if (cur.shadow && cur.shadow !== 'none' && (!prev || cur.shadow !== prev.shadow)) return true;
  if (prev && (cur.border !== prev.border || cur.bg !== prev.bg || cur.deco !== prev.deco || cur.color !== prev.color)) return true;
  return false;
};
// press Tab up to max times; stops = [{i, ...info, indicator}]. Starts from the top of the document (or from `from`: a selector to focus first).
export async function tabWalk(frameOrPage, { page, max = 120, from = null, reverse = false } = {}) {
  const pg = page || (frameOrPage.page ? frameOrPage.page() : frameOrPage); const stops = []; const seen = new Map();
  const ev = fn => frameOrPage.evaluate(fn);
  if (from) await frameOrPage.evaluate(sel => { const e = document.querySelector(sel); if (e) e.focus(); }, from);
  else await frameOrPage.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); window.scrollTo(0, 0); const s = document.createElement('div'); s.id = '__tabstart'; s.tabIndex = -1; document.body.prepend(s); s.focus(); s.remove(); });
  let lastKey = '', same = 0;
  for (let i = 0; i < max; i++) {
    await pg.keyboard.press(reverse ? 'Shift+Tab' : 'Tab');
    // the style of the stop we just left (it still carries the stamp), then the new stop
    const lastStop = stops.filter(x => x.cur).at(-1);
    if (lastStop) { const ps = await ev(PREV_STYLE).catch(() => null); lastStop.indicator = hasIndicator(lastStop.cur, ps); }
    const info = await ev(FOCUS_INFO);
    if (!info) { stops.push({ i, none: true }); break; }
    const key = info.tag + '|' + info.name + '|' + info.href + '|' + info.rect.join(',');
    if (key === lastKey && same < 6) { same++; continue; }                          // date and time inputs hold several Tab stops inside one element
    same = 0; lastKey = key;
    if (seen.has(key)) { stops.push({ i, wrapped: true, ...info }); break; }
    seen.set(key, i); stops.push({ i, ...info, cur: info });
  }
  // the last real stop is judged by its absolute style
  const last = stops.filter(s => s.cur).at(-1); if (last && last.indicator === undefined) last.indicator = hasIndicator(last.cur, null);
  return stops;
}

// a dialog opened by `open()` (async, node side): returns findings (empty list = pass)
export async function dialogCheck(page, { open, label, frame = null, maxTab = 14 }) {
  const f = frame || page; const bad = [];
  const info = fn => f.evaluate(fn);
  await open();
  await page.waitForSelector('#ui-overlays .ui-overlay [role=dialog], #ui-overlays .ui-overlay [role=alertdialog], #modal [role=dialog]', { timeout: 4000 }).catch(() => { });
  await sleep(420);                                                                                // a drawer slides in: measure it at rest
  const meta = await info(() => { const d = document.querySelector('#ui-overlays .ui-overlay .ui-dialog, #modal .ui-dialog'); if (!d) return null; const lb = d.getAttribute('aria-labelledby'); const l = lb && document.getElementById(lb); const r = d.getBoundingClientRect(); return { role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), label: (l && l.textContent.trim()) || d.getAttribute('aria-label') || '', inside: d.contains(document.activeElement), inert: document.getElementById('app') ? document.getElementById('app').hasAttribute('inert') : null, fits: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, kind: (d.closest('.ui-overlay') || {}).dataset ? d.closest('.ui-overlay').dataset.uiOverlay : '' }; });
  if (!meta) return { bad: [`${label}: no dialog appeared`], meta: null, after: null };
  if (!/^(dialog|alertdialog)$/.test(meta.role || '')) bad.push(`${label}: role=${meta.role}`);
  if (meta.modal !== 'true') bad.push(`${label}: aria-modal=${meta.modal}`);
  if (!meta.label) bad.push(`${label}: no accessible name`);
  if (!meta.inside) bad.push(`${label}: focus did not move into the dialog`);
  if (meta.inert === false) bad.push(`${label}: page behind is not inert`);
  if (!meta.fits) bad.push(`${label}: dialog does not fit the viewport`);
  const inDlg = () => info(() => { const d = document.querySelector('#ui-overlays .ui-overlay .ui-dialog, #modal .ui-dialog'); return !!d && d.contains(document.activeElement); });
  for (let i = 0; i < maxTab; i++) { await page.keyboard.press('Tab'); if (!(await inDlg())) { bad.push(`${label}: Tab left the dialog at step ${i + 1}`); break; } }
  for (let i = 0; i < maxTab; i++) { await page.keyboard.press('Shift+Tab'); if (!(await inDlg())) { bad.push(`${label}: Shift+Tab left the dialog at step ${i + 1}`); break; } }
  await page.keyboard.press('Escape'); await sleep(150);
  const after = await info(() => ({ open: !!document.querySelector('#ui-overlays .ui-overlay .ui-dialog, #modal .ui-dialog'), inert: document.getElementById('app') ? document.getElementById('app').hasAttribute('inert') : false, active: document.activeElement ? (document.activeElement.tagName.toLowerCase() + (document.activeElement.id ? '#' + document.activeElement.id : '') + ':' + (document.activeElement.innerText || '').trim().slice(0, 24)) : '' }));
  if (after.open) bad.push(`${label}: Escape did not close it`);
  if (after.inert) bad.push(`${label}: page stays inert after close`);
  return { bad, meta, after };
}

// ---------------------------------------------------------------------------------------------------- visual checks (test/visual.mjs)
// page side: text over text, text cut by overflow:hidden, text under 12 px, blank screen, broken images, horizontal overflow
export function layoutChecks(o) {
  const root = (o && o.scope && document.querySelector(o.scope)) || document.body;
  const sel = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const hidden = el => {
    try { if (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true, checkVisibilityCSS: true })) return true; } catch { }         // closed <details>, content-visibility, display:none
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e.hasAttribute('hidden')) return true; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return true;
      if (e.classList && (e.classList.contains('ui-sr') || e.classList.contains('ui-sr-only') || e.classList.contains('sr'))) return true;
      if (cs.position === 'absolute' && parseFloat(cs.width) <= 2 && parseFloat(cs.height) <= 2 && /(hidden|clip)/.test(cs.overflow)) return true;      // visually-hidden pattern with any class name (pm-sr, fp-sr ...)
      if (cs.clipPath && cs.clipPath !== 'none' && /inset\((50|100)%/.test(cs.clipPath)) return true; if (cs.clip && /rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test(cs.clip)) return true;
    }
    return false;
  };
  const clipRect = (el, r) => { let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom; for (let p = el; p && p !== document.documentElement; p = p.parentElement) { const cs = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(cs.overflowX + cs.overflowY)) { const pr = p.getBoundingClientRect(); if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) { x1 = Math.max(x1, pr.left); x2 = Math.min(x2, pr.right); } if (/(auto|scroll|hidden|clip)/.test(cs.overflowY)) { y1 = Math.max(y1, pr.top); y2 = Math.min(y2, pr.bottom); } } } return x2 - x1 > 1 && y2 - y1 > 1 ? { left: x1, top: y1, right: x2, bottom: y2 } : null; };
  const rects = []; const small = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n.textContent.replace(/\s+/g, ' ').trim(); if (t.length < 2) continue; const e = n.parentElement; if (!e || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'OPTION', 'TEXTAREA'].includes(e.tagName) || hidden(e)) continue;
    const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 11.95) small.push(sel(e) + ':' + fs + ':' + t.slice(0, 18));
    const range = document.createRange(); range.selectNodeContents(n);
    for (const r of range.getClientRects()) { if (r.width < 4 || r.height < 6) continue; const c = clipRect(e, r); if (!c) continue; rects.push({ e, t: t.slice(0, 24), left: c.left, top: c.top, right: c.right, bottom: c.bottom, ov: !!e.closest('[data-ui-overlay]'), fixed: (() => { for (let p = e; p; p = p.parentElement) { const ps = getComputedStyle(p).position; if (ps === 'fixed' || ps === 'sticky') return true; } return false; })() }); }
  }
  const overlaps = []; rects.sort((a, b) => a.top - b.top);
  for (let i = 0; i < rects.length && overlaps.length < 6; i++) {
    const a = rects[i];
    for (let j = i + 1; j < rects.length; j++) {
      const b = rects[j]; if (b.top >= a.bottom) break; if (a.e === b.e || a.ov !== b.ov || a.fixed !== b.fixed) continue;
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (w <= 3 || h <= 3) continue;
      const area = w * h, minA = Math.min((a.right - a.left) * (a.bottom - a.top), (b.right - b.left) * (b.bottom - b.top)); if (area / minA < 0.25) continue;
      overlaps.push(`"${a.t}" [${sel(a.e)}] over "${b.t}" [${sel(b.e)}]`);
      if (overlaps.length >= 6) break;
    }
  }
  const clipped = []; const ellipsis = [];
  for (const el of root.querySelectorAll('*')) {
    const cs = getComputedStyle(el); if (!/(hidden|clip)/.test(cs.overflowX + cs.overflowY)) continue; if (hidden(el)) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    if (el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1) continue;
    const txt = (el.innerText || '').trim(); if (!txt) continue;
    if (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp && cs.webkitLineClamp !== 'none') { if (!el.getAttribute('title') && !el.getAttribute('aria-label')) ellipsis.push(sel(el) + ' "' + txt.slice(0, 24) + '"'); continue; }
    // text really cut: a text node that extends past the element box
    let cut = false; const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n && !cut; n = tw.nextNode()) { if (n.textContent.trim().length < 2) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const q of rg.getClientRects()) { if (q.width < 2) continue; if (q.right > r.right + 1.5 || q.bottom > r.bottom + 1.5 || q.left < r.left - 1.5) { cut = true; break; } } }
    if (cut) clipped.push(sel(el) + ' "' + txt.replace(/\s+/g, ' ').slice(0, 30) + '"');
  }
  const de = document.documentElement; const over = de.scrollWidth - de.clientWidth;
  const broken = [...root.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0 && !hidden(i)).map(sel);
  const text = ((document.getElementById('root') || document.body).innerText || '').trim();
  return { overlaps, clipped: clipped.slice(0, 6), clippedCount: clipped.length, ellipsis: ellipsis.slice(0, 5), small: small.slice(0, 6), smallCount: small.length, hscroll: over > 1 ? over : 0, broken, blank: text.length < 20 || /Loading the demo/.test(text), textLen: text.length, height: Math.max(de.scrollHeight, document.body.scrollHeight) };
}

// node side: a contact sheet (one PNG) from screenshot files. tiles = [{file, label}]
export async function contactSheet(browser, tiles, out, { cols = 3, tileW = 620, title = '' } = {}) {
  const fs = await import('node:fs');
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#2b2b2b;color:#eee;font:12px/1.3 system-ui,sans-serif}h1{margin:0;padding:10px 14px;font-size:15px;background:#111}.g{display:grid;grid-template-columns:repeat(${cols},${tileW}px);gap:10px;padding:10px}.t{background:#1c1c1c;border:1px solid #444}.t b{display:block;padding:4px 6px;font-weight:600;background:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.t img{display:block;width:${tileW}px;height:auto}</style><h1>${title}</h1><div class="g">${tiles.map(t => { let src = ''; try { src = 'data:image/png;base64,' + fs.readFileSync(t.file).toString('base64'); } catch { } return `<div class="t"><b>${String(t.label).replace(/&/g, '&amp;').replace(/</g, '&lt;')}${t.issues ? ' · ' + t.issues : ''}</b>${src ? `<img src="${src}">` : '<div style="padding:30px">missing</div>'}</div>`; }).join('')}</div>`;
  const ctx = await browser.newContext({ viewport: { width: cols * (tileW + 10) + 10, height: 800 } }); const pg = await ctx.newPage();
  await pg.setContent(html, { waitUntil: 'load' }); await pg.screenshot({ path: out, fullPage: true }); await ctx.close();
}
