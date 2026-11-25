// The virtual network of the hosted preview: the Psyflo server code (store, actions, pdf, the mock Client Record and the mock portals) runs
// here, in the page. Frames reach it by postMessage (see prelude.js); the main document calls it directly. Nothing leaves the browser.
// This file does what server/index.js does per URL (same modules, same order), minus HTTP.
import { store, lauris } from './server.js';
import { FILES_DIR } from '../../server/psyflo/store.js';
import { laurisHandler } from '../../server/lauris/site.js';
import { externalHandler } from '../../server/external/site.js';
import { __bytes } from 'node:fs';
import path from 'node:path';
import A from 'hosted:assets';

const APP = 'https://psyflo.invalid', LAU = 'https://client-record.invalid', EXT = 'https://ext.invalid';
const SEED_ROOT = '/app/seed';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TYPES = { '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

// ---------- the data store: broadcast every change to the app and to every frame (the in-process stand-in for /api/stream) ----------
store.listeners.add(st => window.__vemit && window.__vemit('state', { rev: st.rev }));

// ---------- the browser's cookie jar (one for the three virtual origins, like cookies on localhost: the mock Client Record's user and panel toggle) ----------
const jar = {};
const cookieHeader = () => Object.entries(jar).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('; ');
function absorb(set) {
  for (const c of [].concat(set || [])) {
    const [kv, ...attrs] = String(c).split(';'); const i = kv.indexOf('='); if (i < 1) continue;
    const k = kv.slice(0, i).trim(), v = decodeURIComponent(kv.slice(i + 1).trim());
    if (!v || attrs.some(a => /max-age=0/i.test(a))) delete jar[k]; else jar[k] = v;
  }
}

// ---------- fake Node request / response objects for the server-rendered mock sites ----------
function fakeReq(method, url, headers, body) {
  const h = {}; let scheduled = false;
  const req = { method, url, headers, on(ev, fn) { (h[ev] ||= []).push(fn); if (!scheduled) { scheduled = true; queueMicrotask(() => { for (const f of h.data || []) f(Buffer.from(body || '')); for (const f of h.end || []) f(); }); } return req; }, destroy() { } };
  return req;
}
function fakeRes() {
  const o = { status: 200, headers: {}, chunks: [] };
  const res = {
    setHeader(k, v) { o.headers[String(k).toLowerCase()] = v; }, getHeader(k) { return o.headers[String(k).toLowerCase()]; },
    writeHead(code, hdrs) { o.status = code; for (const k in hdrs || {}) o.headers[k.toLowerCase()] = hdrs[k]; return res; },
    write(c) { o.chunks.push(c); return true; }, end(c) { if (c != null) o.chunks.push(c); o.ended = true; }
  };
  return { res, out: () => ({ status: o.status, headers: o.headers, body: o.chunks.map(String).join('') }) };
}
async function runSite(handler, method, u, body) {
  const req = fakeReq(method, u.pathname + u.search, { host: u.host, 'content-type': 'application/x-www-form-urlencoded', cookie: cookieHeader() }, body);
  const { res, out } = fakeRes();
  await handler(req, res);
  const r = out(); if (r.headers['set-cookie']) absorb(r.headers['set-cookie']);
  return r;
}

// ---------- virtual pages ----------
async function renderPage(method, urlStr, body) {
  let url = new URL(urlStr), m = method || 'GET', b = body;
  for (let i = 0; i < 8; i++) {
    const kind = url.origin === LAU ? 'lauris' : url.origin === EXT ? 'ext' : null;
    if (!kind) throw new Error('Not a page of the mock sites: ' + url.href);
    const r = await runSite(kind === 'lauris' ? laurisHandler : externalHandler, m, url, b);
    if (r.status >= 300 && r.status < 400 && r.headers.location) { url = new URL(r.headers.location, url); m = 'GET'; b = null; continue; }
    const isHtml = /text\/html/.test(r.headers['content-type'] || '');
    return { kind, url, status: r.status, html: isHtml ? r.body : `<!doctype html><html><head><meta charset="utf-8"><title>${r.status}</title></head><body><pre style="font:13px/1.5 Arial,sans-serif;padding:24px">${esc(r.body)}</pre></body></html>` };
  }
  throw new Error('Too many redirects');
}
const BOOT_RE = /<script>\s*\(function\(\)\{\s*var APP=[\s\S]*?<\/script>/;
// replaces the page's own boot script: toggle by virtual cookie, and the panel as a srcdoc frame (the bridge text is inlined). server/lauris/site.js writes the original
const LAURIS_BOOT = `(function(){
  var t=document.getElementById('psyflo-toggle');
  t.addEventListener('click',function(){var on=!document.body.classList.contains('psyflo-inpage');window.__vcookie('psyflo_inpage='+(on?'1':'0'));window.__vgo(window.__vurl);});
  function boot(){
    if(!document.body.classList.contains('psyflo-inpage'))return;
    Promise.all([window.__vasset('bridge'),window.__vasset('panel')]).then(function(r){
      var s=document.createElement('script');s.dataset.mode='inpage';s.dataset.app=window.__vapp;s.text=r[0];document.body.appendChild(s);
      var f=document.createElement('iframe');f.title='Psyflo panel';f.id='psyflo-frame';if(window.__vmicOk())f.allow='microphone *';f.srcdoc=window.__vpanelDoc(r[1]);
      document.getElementById('psyflo-slot').appendChild(f);
    });
  }
  setTimeout(boot,60);
})();`;
const inline = s => s.replace(/<\/script/gi, '<\\/script');
function frameDoc(r) {
  const mem = window.__vmem || {};
  const cfg = JSON.stringify({ kind: r.kind, vurl: r.url.href, store: { local: mem.localStorage || {}, session: mem.sessionStorage || {} } }).replace(/</g, '\\u003c');
  let html = r.html.replace(/<head>/i, m => `${m}<script>window.__VCFG=${cfg}</script><script>${inline(A.prelude)}</script><base href="${esc(r.url.href)}">`);
  if (r.kind === 'lauris') html = html.replace(BOOT_RE, () => `<script>${LAURIS_BOOT}</script>`);
  else html = html.replace(/<script src="[^"]*\/panel\/bridge\.js"[^>]*><\/script>/, () => `<script data-mode="portal" data-app="${APP}">${inline(A.bridge)}</script>`);
  return html;
}
async function mountFrame(f, url, method, body) {
  const r = await renderPage(method || 'GET', url, body);
  f.dataset.vurl = r.url.href; if (r.kind === 'lauris' && !f.allow && window.__vmicOk()) f.allow = 'microphone *';   // '*': a srcdoc frame of a file:// or sandboxed page has an opaque origin that a bare 'microphone' cannot name
  const t = (r.html.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
  if (t && f.closest('#vov')) f.closest('#vov').querySelector('.vov-t').textContent = t.replace(/\s+—\s+Client Record \(mock\)|\s*\(mock\)/g, '');
  f.srcdoc = frameDoc(r);
}

// ---------- the overlay: a popup stand-in (a sandboxed page cannot open tabs) ----------
let styled = false;
function overlay(title, build) {
  closeOverlay();
  if (!styled) {
    styled = true;
    const st = document.createElement('style');
    st.textContent = `#vov{position:fixed;inset:0;z-index:120;background:#F8F6F2;display:flex;flex-direction:column}
#vov .vov-bar{flex:0 0 auto;display:flex;align-items:center;gap:12px;background:#151B24;color:#fff;padding:8px 14px;font:600 14px 'DM Sans',system-ui,sans-serif}
#vov .vov-t{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#vov .vov-b{font:600 13px 'DM Sans',system-ui,sans-serif;min-height:34px;padding:0 14px;border-radius:8px;border:1px solid #3E4652;background:#222A35;color:#fff;cursor:pointer}
#vov .vov-b:hover{background:#2A3340}
#vov .vov-f{flex:1 1 auto;width:100%;border:0;background:#fff}`;
    document.head.appendChild(st);
  }
  const ov = document.createElement('div'); ov.id = 'vov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', title);
  ov.innerHTML = `<div class="vov-bar"><span class="vov-t"></span><span class="vov-a"></span><button type="button" class="vov-b vov-x">Close</button></div><iframe class="vov-f" title="${esc(title)}"></iframe>`;
  ov.querySelector('.vov-t').textContent = title;
  ov.querySelector('.vov-x').onclick = closeOverlay;
  document.body.appendChild(ov);
  build(ov.querySelector('iframe'), ov);
}
function closeOverlay() { const o = document.getElementById('vov'); if (o) o.remove(); }
addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('vov')) { closeOverlay(); e.stopPropagation(); } }, true);

// a generated PDF (or an exported report) opens as readable text in a viewer. Downloads are blocked by the host page, so there is no Download.
function pdfText(bytes) {
  let s = typeof bytes === 'string' ? bytes : ''; if (typeof bytes !== 'string') for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  const out = []; const re = /\(((?:\\.|[^\\)])*)\)\s*Tj/g; let m;
  while ((m = re.exec(s))) out.push(m[1].replace(/\\([0-7]{3})|\\(.)/g, (x, o, c) => o ? String.fromCharCode(parseInt(o, 8)) : c));
  return out.join('\n');
}
function viewer(title, text, note) {
  overlay(title, (f, ov) => {
    f.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body style="margin:0;background:#F8F6F2;color:#151B24;font:14px/1.55 'DM Sans',system-ui,sans-serif">${note ? `<p style="margin:0;padding:10px 28px;background:#FFF4D6;border-bottom:1px solid #E8C56A;font-size:13px">${esc(note)}</p>` : ''}<pre style="white-space:pre-wrap;max-width:820px;margin:0 auto;padding:24px 28px;font:inherit">${esc(text)}</pre></body></html>`;
  });
}
// a file Psyflo wrote (a PDF in /app/data/files): the same answer as GET /files/<name> in server/index.js
function serveFile(name) {
  const f = path.basename(decodeURIComponent(name));
  const bytes = __bytes(path.join(FILES_DIR, f));
  return bytes ? { status: 200, bytes, name: f } : { status: 404, body: 'Not found' };
}
function openFile(name) {
  const r = serveFile(name);
  if (r.status !== 200) return viewer('File', r.body);
  viewer(r.name.split('__').pop(), pdfText(r.bytes), 'Opened as text in this preview (the PDF viewer and downloads are not available in a hosted page).');
}
// what a download button does here: show the content in the viewer
window.__vsave = (name, content) => viewer(String(name || 'File'), typeof content === 'string' && !/^%PDF-/.test(content) ? content : pdfText(typeof content === 'string' ? content : new Uint8Array(content)), 'Shown here as text: a hosted page cannot save files.');

const route = hash => window.__vhash(hash);
function openUrl(urlStr) {
  let u; try { u = new URL(urlStr); } catch { return; }
  if (u.origin === LAU || u.origin === EXT) return overlay(u.origin === LAU ? 'Client Record' : 'Portal', f => mountFrame(f, u.href));
  if (u.origin === APP) {
    let m;
    if (u.pathname.startsWith('/files/')) return openFile(decodeURIComponent(u.pathname.slice(7)));
    if ((m = u.pathname.match(/^\/f\/([\w-]+)/))) return route('#/FamilyLink?t=' + m[1]);
    if ((m = u.pathname.match(/^\/parent\/([\w-]+)(?:\/(\w+))?/))) return route('#/' + (m[2] || 'ParentPortal') + '?t=' + m[1]);
    if (u.hash) return route(u.hash);
    return;
  }
  if (window.__vrealOpen) window.__vrealOpen(urlStr, '_blank', 'noopener');
}

// ---------- fetch: what server/index.js answers, by URL ----------
const res = (body, type, status = 200, extra = {}) => ({ status, headers: { 'content-type': type, ...extra }, body });
const json = (o, status) => res(JSON.stringify(o), 'application/json; charset=utf-8', status);
async function vfetch({ url, method = 'GET', body = null }) {
  const u = new URL(url); const p = u.pathname;
  if (u.origin === LAU || u.origin === EXT) { const r = await renderPage(method, url, body); return res(r.html, 'text/html; charset=utf-8', r.status); }
  if (p === '/api/state') return json(store.state);
  if (p === '/api/config') return json({ laurisURL: LAU, extURL: EXT, appURL: APP, hosted: true });
  if (p === '/api/do' && method === 'POST') {
    let b; try { b = JSON.parse(body || '{}'); } catch { return json({ ok: false, error: 'Bad JSON' }, 400); }
    const { action, args } = b;
    if (action === 'demo.reset') lauris.reset(args?.preset || 'live');   // same hook as server/index.js: the mock Client Record resets with the store
    try { const result = await store.run(action, args || {}); return json({ ok: true, result, rev: store.state.rev }); }
    catch (e) { return json({ ok: false, error: e.message }, 400); }
  }
  if (p.startsWith('/files/')) {
    const r = serveFile(p.slice(7));
    return r.status === 200 ? res(r.bytes, 'application/pdf', 200, { 'content-disposition': `inline; filename="${r.name.split('__').pop()}"` }) : res(r.body, 'text/plain; charset=utf-8', r.status);
  }
  if (p === '/seed/notes.md') return res(A.notes, TYPES['.md']);
  if (p.startsWith('/seed/scripts/')) {
    const b = __bytes(path.join(SEED_ROOT, 'scripts', path.basename(decodeURIComponent(p))));
    return b ? res(b, TYPES[path.extname(p)] || 'text/plain; charset=utf-8') : res('Not found', 'text/plain; charset=utf-8', 404);
  }
  if (p.startsWith('/screens/') && A.screens[p.slice(9)] != null) return res(A.screens[p.slice(9)], 'text/html; charset=utf-8');
  if (p === '/js/logo.svg') return res(A.logo, TYPES['.svg']);
  return res('Not found', 'text/plain; charset=utf-8', 404);
}

// ---------- requests from the page and from its frames ----------
window.__vnetHandle = async function (kind, payload, source) {
  switch (kind) {
    case 'fetch': return vfetch(payload);
    case 'open': return openUrl(payload.url);
    case 'nav': { const f = [...document.querySelectorAll('iframe')].find(x => x.contentWindow === source); if (f) await mountFrame(f, payload.url, payload.method, payload.body); return {}; }
    case 'asset': return payload.name === 'bridge' ? A.bridge : payload.name === 'panel' ? A.panelDoc : '';
    case 'cookie': absorb(payload.set); return {};
    case 'ss': { const d = window.__vmem && window.__vmem[payload.a]; if (d) { if (payload.v === null) delete d[payload.k]; else d[payload.k] = payload.v; } return {}; }   // frames keep their own copies; this is the root's
    default: throw new Error('Unknown request: ' + kind);
  }
};
// the public face of the virtual network (tests and tools): fetch(url, init) like window.fetch; lauris(method, url, body) -> { status, kind, url, html } after redirects
window.__vnet = {
  mountFrame, openUrl, closeOverlay,
  lauris: (method, url, body) => renderPage(method, url, body),
  renderPage,
  fetch: async (url, init = {}) => {
    const r = await vfetch({ url: new URL(url, APP + '/').href, method: String(init.method || 'GET').toUpperCase(), body: init.body == null ? null : String(init.body) });
    return new Response(r.body, { status: r.status, headers: r.headers });
  }
};
