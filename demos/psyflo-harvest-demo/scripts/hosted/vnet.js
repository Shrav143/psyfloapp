// The virtual network of the hosted preview: the Psyflo server code (store, actions, mock Lauris, mock portals) runs here, in the page.
// Frames reach it by postMessage (see prelude.js); the main document calls it directly. Nothing leaves the browser.
import 'hosted:actions';
import { store, FILES_DIR } from '../../server/psyflo/store.js';
import { lauris } from '../../server/lauris/store.js';
import { laurisHandler } from '../../server/lauris/site.js';
import { externalHandler } from '../../server/external/site.js';
import { __bytes } from 'node:fs';
import path from 'node:path';
import A from 'hosted:assets';

const APP = 'https://psyflo.invalid', LAU = 'https://lauris.invalid', EXT = 'https://ext.invalid';
const SEED_ROOT = '/app/seed';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TYPES = { '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

// ---------- the data store: broadcast every change to the app and to every frame ----------
store.listeners.add(st => window.__vemit && window.__vemit('state', { rev: st.rev }));

// ---------- fake Node request / response objects for the server-rendered mock sites ----------
const jar = {};
const cookieHeader = () => Object.entries(jar).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('; ');
function absorb(set) {
  for (const c of [].concat(set || [])) {
    const [kv, ...attrs] = String(c).split(';'); const i = kv.indexOf('='); if (i < 1) continue;
    const k = kv.slice(0, i).trim(), v = decodeURIComponent(kv.slice(i + 1).trim());
    if (!v || attrs.some(a => /max-age=0/i.test(a))) delete jar[k]; else jar[k] = v;
  }
}
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
// replaces the page's own boot script: toggle by virtual cookie, and the panel as a srcdoc frame (the bridge text is inlined)
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
  let html = r.html.replace(/<head>/i, m => `${m}<script>window.__VCFG=${cfg}</script><script>${A.prelude}</script><base href="${esc(r.url.href)}">`);
  if (r.kind === 'lauris') html = html.replace(BOOT_RE, () => `<script>${LAURIS_BOOT}</script>`);
  else html = html.replace(/<script src="[^"]*\/panel\/bridge\.js"[^>]*><\/script>/, () => `<script data-mode="portal" data-app="${APP}">${inline(A.bridge)}</script>`);
  return html;
}
async function mountFrame(f, url, method, body) {
  const r = await renderPage(method || 'GET', url, body);
  f.dataset.vurl = r.url.href; if (r.kind === 'lauris' && !f.allow && window.__vmicOk()) f.allow = 'microphone *';   // '*': a srcdoc frame of a file:// or sandboxed page has an opaque origin that a bare 'microphone' cannot name
  const t = (r.html.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
  if (t && f.closest('#vov')) f.closest('#vov').querySelector('.vov-t').textContent = t.replace(/\s*\(mock\)|\s+—\s+Lauris Online \(mock\)/g, '');
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
  const ov = document.createElement('div'); ov.id = 'vov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', title);
  ov.innerHTML = `<div class="vov-bar"><span class="vov-t"></span><span class="vov-a"></span><button type="button" class="vov-b vov-x">Close</button></div><iframe class="vov-f" title="${esc(title)}"></iframe>`;
  ov.querySelector('.vov-t').textContent = title;
  ov.querySelector('.vov-x').onclick = closeOverlay;
  document.body.appendChild(ov);
  build(ov.querySelector('iframe'), ov);
}
function closeOverlay() { const o = document.getElementById('vov'); if (o) o.remove(); }
addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlay(); });

// a generated PDF opens as readable text with a Download button (a sandbox may not show or save PDFs)
function pdfText(bytes) {
  let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  const out = []; const re = /\(((?:\\.|[^\\)])*)\)\s*Tj/g; let m;
  while ((m = re.exec(s))) out.push(m[1].replace(/\\(.)/g, '$1'));
  return out.join('\n');
}
function openFile(name) {
  const bytes = __bytes(path.join(FILES_DIR, name));
  if (!bytes) return;
  const title = name.split('__').pop();
  overlay(title, (f, ov) => {
    f.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title></head><body style="margin:0;background:#F8F6F2;color:#151B24;font:14px/1.55 'DM Sans',system-ui,sans-serif"><pre style="white-space:pre-wrap;max-width:760px;margin:0 auto;padding:24px 28px;font:inherit">${esc(pdfText(bytes))}</pre></body></html>`;
    const dl = document.createElement('button'); dl.type = 'button'; dl.className = 'vov-b'; dl.textContent = 'Download PDF';
    dl.onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' })); a.download = title; document.body.appendChild(a); a.click(); a.remove(); };
    ov.querySelector('.vov-a').appendChild(dl);
  });
}
const route = hash => window.__vhash(hash);
function openUrl(urlStr) {
  let u; try { u = new URL(urlStr); } catch { return; }
  if (u.origin === LAU || u.origin === EXT) return overlay(u.origin === LAU ? 'Lauris Online' : 'Portal', f => mountFrame(f, u.href));
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

// ---------- fetch ----------
const res = (body, type, status = 200) => ({ status, headers: { 'content-type': type }, body });
const json = (o, status) => res(JSON.stringify(o), 'application/json; charset=utf-8', status);
async function vfetch({ url, method, body }) {
  const u = new URL(url); const p = u.pathname;
  if (u.origin === LAU || u.origin === EXT) { const r = await renderPage(method, url, body); return res(r.html, 'text/html; charset=utf-8', r.status); }
  if (p === '/api/state') return json(store.state);
  if (p === '/api/config') return json({ laurisURL: LAU, extURL: EXT, appURL: APP });
  if (p === '/api/do' && method === 'POST') {
    const { action, args } = JSON.parse(body || '{}');
    if (action === 'demo.reset') lauris.reset(args?.preset || 'live');
    try { const result = await store.run(action, args || {}); return json({ ok: true, result, rev: store.state.rev }); }
    catch (e) { return json({ ok: false, error: e.message }, 400); }
  }
  if (p.startsWith('/files/')) {
    const b = __bytes(path.join(FILES_DIR, decodeURIComponent(p.slice(7))));
    return b ? res(b, 'application/pdf') : res('Not found', 'text/plain; charset=utf-8', 404);
  }
  if (p === '/seed/notes.md') return res(A.notes, TYPES['.md']);
  if (p.startsWith('/seed/scripts/')) { const b = __bytes(path.join(SEED_ROOT, 'scripts', path.basename(decodeURIComponent(p)))); return b ? res(b, TYPES[path.extname(p)] || 'text/plain; charset=utf-8') : res('Not found', 'text/plain; charset=utf-8', 404); }
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
// the public face of the virtual network: fetch(url, init) like window.fetch; lauris(method, url, body) → { status, kind, url, html } after redirects
window.__vnet = {
  mountFrame, openUrl,
  lauris: (method, url, body) => renderPage(method, url, body),
  renderPage,
  fetch: async (url, init = {}) => {
    const r = await vfetch({ url: new URL(url, APP + '/').href, method: String(init.method || 'GET').toUpperCase(), body: init.body == null ? null : String(init.body) });
    return new Response(r.body, { status: r.status, headers: r.headers });
  }
};
