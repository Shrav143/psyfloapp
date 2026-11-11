// Hosted-preview prelude. Runs first in the main document and, as an inline script, in every srcdoc frame
// (the mock Lauris page, its Psyflo panel, the mock portals). It gives each of them the browser APIs the Node build gets from a server:
//   fetch / EventSource   -> the in-page virtual network (window.__vnetHandle in the main document, reached by postMessage from frames)
//   localStorage / sessionStorage -> a memory fallback when the sandbox makes them throw
//   window.open / link clicks to the virtual origins -> the in-app overlay (popups are blocked in a sandboxed page)
//   frames of the mock Lauris and portals: link clicks and form submits become virtual page loads
//   history.pushState / replaceState -> always a hash-only URL (a sandboxed or srcdoc page may not rewrite its path)
// Frames can have opaque origins (no allow-same-origin), so nothing here touches window.parent's properties or window.top; only postMessage.
(function () {
  if (window.__vprelude) return; window.__vprelude = true;
  var ROOT = !!window.__VROOT, CFG = window.__VCFG || {}, KIND = ROOT ? 'main' : (CFG.kind || 'frame');
  var APPO = 'https://psyflo.invalid', LAUO = 'https://lauris.invalid', EXTO = 'https://ext.invalid';
  window.__HOSTED__ = true; window.__vapp = APPO; window.__vkind = KIND;
  if (CFG.vurl) { window.__vurl = CFG.vurl; try { window.__vloc = new URL(CFG.vurl); } catch (e) { } }
  var isVirt = function (o) { return o === APPO || o === LAUO || o === EXTO; };

  // ---------- memory storage when the real one throws (sandbox without allow-same-origin) ----------
  var mem = { localStorage: Object.assign({}, CFG.store && CFG.store.local), sessionStorage: Object.assign({}, CFG.store && CFG.store.session) };
  window.__vmem = mem;
  var shimmed = false;
  ['localStorage', 'sessionStorage'].forEach(function (name) {
    var ok = true; try { window[name].getItem('__vprobe'); } catch (e) { ok = false; }
    if (ok) return;
    var d = mem[name];
    var s = {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; },
      setItem: function (k, v) { d[k] = String(v); note(name, k, d[k]); },
      removeItem: function (k) { delete d[k]; note(name, k, null); },
      clear: function () { Object.keys(d).forEach(function (k) { delete d[k]; note(name, k, null); }); },
      key: function (i) { var ks = Object.keys(d); return i < ks.length ? ks[i] : null; }
    };
    Object.defineProperty(s, 'length', { get: function () { return Object.keys(d).length; } });
    try { Object.defineProperty(window, name, { configurable: true, get: function () { return s; } }); shimmed = true; } catch (e) { }
  });
  function note(area, k, v) { if (!ROOT) post('ss', { a: area, k: k, v: v }); }
  function applyMem(m) { var d = mem[m.a]; if (!d) return; if (m.v === null) delete d[m.k]; else d[m.k] = m.v; }
  // a reload resets the demo (the server code lives in this page), so a sign-in kept by a browser that CAN store is stale: start signed out
  if (ROOT) { try { ['psyflo_session', 'psyflo_user'].forEach(function (k) { localStorage.removeItem(k); }); sessionStorage.clear(); } catch (e) { } }

  // ---------- transport ----------
  var seq = 0, waiting = {};
  function rpc(kind, payload) {
    if (ROOT) { try { return Promise.resolve(window.__vnetHandle(kind, payload, window)); } catch (e) { return Promise.reject(e); } }
    return new Promise(function (res, rej) { var id = ++seq; waiting[id] = { res: res, rej: rej }; window.parent.postMessage({ __vreq: 1, id: id, kind: kind, payload: payload }, '*'); });
  }
  function post(kind, payload) {
    if (ROOT) { try { window.__vnetHandle(kind, payload, window); } catch (e) { } return; }
    window.parent.postMessage({ __vreq: 1, id: 0, kind: kind, payload: payload }, '*');
  }
  window.__vrpc = rpc; window.__vpost = post;
  var ESs = [];
  function walk(w, msg) { try { for (var i = 0; i < w.frames.length; i++) { try { w.frames[i].postMessage(msg, '*'); } catch (x) { } walk(w.frames[i], msg); } } catch (x) { } }
  window.__vemit = function (type, data) { ESs.slice().forEach(function (es) { es._emit(type, data); }); walk(window, { __vevt: 1, type: type, data: data }); };
  window.addEventListener('message', function (e) {
    var d = e.data; if (!d || typeof d !== 'object') return;
    if (d.__vevt) { ESs.slice().forEach(function (es) { es._emit(d.type, d.data); }); return; }
    if (d.__vres) {
      var w = waiting[d.id]; if (!w) return; delete waiting[d.id];
      if (w.src) { try { w.src.postMessage({ __vres: 1, id: w.id, ok: d.ok, result: d.result, error: d.error }, '*'); } catch (x) { } }
      else if (d.ok) w.res(d.result); else w.rej(new Error(d.error || 'request failed'));
      return;
    }
    if (d.__vreq && e.source && e.source !== window) {
      var src = e.source;
      if (ROOT) {
        Promise.resolve().then(function () { return window.__vnetHandle(d.kind, d.payload, src); }).then(
          function (result) { if (d.id) src.postMessage({ __vres: 1, id: d.id, ok: true, result: result }, '*'); },
          function (err) { if (d.id) src.postMessage({ __vres: 1, id: d.id, ok: false, error: String((err && err.message) || err) }, '*'); });
      } else {
        if (d.kind === 'ss' && d.payload) applyMem(d.payload);
        var id = d.id ? ++seq : 0; if (id) waiting[id] = { src: src, id: d.id };
        window.parent.postMessage({ __vreq: 1, id: id, kind: d.kind, payload: d.payload }, '*');
      }
    }
  });

  // ---------- EventSource (the app's live updates) ----------
  function VES(url) { this.url = url; this.readyState = 1; this._h = {}; ESs.push(this); }
  VES.prototype.addEventListener = function (t, fn) { (this._h[t] = this._h[t] || []).push(fn); };
  VES.prototype.removeEventListener = function (t, fn) { var a = this._h[t] || []; var i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); };
  VES.prototype.close = function () { var i = ESs.indexOf(this); if (i >= 0) ESs.splice(i, 1); this.readyState = 2; };
  VES.prototype._emit = function (t, data) { var ev = { type: t, data: JSON.stringify(data) }; (this._h[t] = this._h[t] || []).slice().forEach(function (f) { try { f(ev); } catch (x) { console.error(x); } }); if (t === 'message' && this.onmessage) this.onmessage(ev); };
  window.EventSource = VES;

  // ---------- fetch ----------
  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  var absUrl = function (u) { return /^[a-z][a-z0-9+.-]*:/i.test(u) ? new URL(u) : new URL(u, APPO + '/'); };
  var headersOf = function (h) { var o = {}; try { new Headers(h || {}).forEach(function (v, k) { o[k.toLowerCase()] = v; }); } catch (e) { } return o; };
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || String(input);
    var abs; try { abs = absUrl(url); } catch (e) { return realFetch ? realFetch(input, init) : Promise.reject(new TypeError('Failed to fetch')); }
    if (!isVirt(abs.origin)) return realFetch ? realFetch(input, init) : Promise.reject(new TypeError('Failed to fetch'));
    init = init || {};
    var method = String(init.method || (input && input.method) || 'GET').toUpperCase();
    var body = init.body == null ? null : typeof init.body === 'string' ? init.body : String(init.body);
    var headers = headersOf(init.headers || (input && typeof input === 'object' ? input.headers : null));
    return rpc('fetch', { url: abs.href, method: method, body: body, headers: headers }).then(function (r) { return new Response(r.body, { status: r.status, headers: r.headers }); });
  };

  // ---------- history and hash routes ----------
  // A sandboxed page opened from file:// refuses fragment navigation ("Not allowed to load local resource"), and a srcdoc page may not rewrite its
  // path, so routes move with history.pushState / replaceState using a hash-only URL, and hashchange is fired by hand.
  (function () {
    var fix = function (u) { if (u == null) return u; var s = String(u), i = s.indexOf('#'); return i >= 0 ? s.slice(i) : ''; };
    ['pushState', 'replaceState'].forEach(function (n) {
      var real = history[n] && history[n].bind(history); if (!real) return;
      history[n] = function (st, t, u) { try { return real(st, t, u == null ? u : fix(u) || undefined); } catch (e) { /* a host that forbids it: the route still changes in memory */ } };
    });
  })();
  window.__vhash = function (h, replace) {
    h = String(h); if (h.charAt(0) !== '#') h = '#' + h;
    if (location.hash === h) return false;
    var before = location.hash;
    try { history[replace ? 'replaceState' : 'pushState'](null, '', h); } catch (e) { }
    if (location.hash === before) { try { location.hash = h; } catch (e) { return false; } return true; }   // pushState was refused: the plain assignment fires hashchange itself
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL: '', newURL: location.href }));
    return true;
  };

  // ---------- window.open and links to the virtual origins ----------
  var realOpen = window.open ? window.open.bind(window) : null; window.__vrealOpen = realOpen;
  var toAbs = function (u) { try { return new URL(String(u), APPO + '/').href; } catch (e) { return String(u); } };
  function stub() {
    var nav = function (u) { post('open', { url: toAbs(u) }); };
    var w = { closed: false, close: function () { w.closed = true; }, focus: function () { }, blur: function () { }, opener: window, document: { write: function () { }, close: function () { } } };
    w.location = { assign: nav, replace: nav, toString: function () { return ''; } };
    Object.defineProperty(w.location, 'href', { get: function () { return ''; }, set: nav });
    return w;
  }
  window.open = function (u) { if (!u || u === 'about:blank') return stub(); post('open', { url: toAbs(u) }); return stub(); };

  var routerFrame = KIND === 'lauris' || KIND === 'ext';
  var hereOrigin = function () { try { return new URL(window.__vurl).origin; } catch (e) { return ''; } };
  var baseFor = function () { return window.__vurl || (ROOT ? document.baseURI : APPO + '/'); };
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null; if (!a) return;
    var href = a.getAttribute('href'); if (!href || /^(javascript:|mailto:|tel:)/i.test(href)) return;
    if (ROOT && href.indexOf('#/') === 0) { e.preventDefault(); window.__vhash(href); return; }
    var u; try { u = new URL(href, baseFor()); } catch (x) { return; }
    var isFile = /^\/files\//.test(u.pathname) && (isVirt(u.origin) || (ROOT && u.protocol === 'file:'));
    if (isFile) { e.preventDefault(); post('open', { url: APPO + u.pathname }); return; }
    if (routerFrame) {
      e.preventDefault();
      if (href.charAt(0) === '#') return;
      if (a.target === '_blank' || (isVirt(u.origin) && u.origin !== hereOrigin())) { post('open', { url: u.href }); return; }
      if (u.origin === hereOrigin()) window.__vgo(u.href);
      return;
    }
    if (isVirt(u.origin) && (a.target === '_blank' || u.origin !== APPO)) { e.preventDefault(); post('open', { url: u.href }); return; }
    if (a.target === '_blank' && ROOT && u.href.split('#')[0] === location.href.split('#')[0]) { e.preventDefault(); post('open', { url: APPO + '/' + u.hash }); }
  }, true);

  // ---------- pages of the mock Lauris and the mock portals: navigation is a virtual page load ----------
  window.__vgo = function (url, method, body) { return rpc('nav', { url: new URL(url, baseFor()).href, method: method || 'GET', body: body || null }); };
  if (routerFrame) {
    document.addEventListener('submit', function (e) {
      var f = e.target; if (!f || f.tagName !== 'FORM') return;
      e.preventDefault();
      var method = String(f.getAttribute('method') || 'GET').toUpperCase();
      var fd; try { fd = new FormData(f, e.submitter || undefined); } catch (x) { fd = new FormData(f); }
      var params = new URLSearchParams(); fd.forEach(function (v, k) { if (typeof v === 'string') params.append(k, v); });
      var u = new URL(f.getAttribute('action') || window.__vurl, window.__vurl);
      // the page's own submit listeners (the Psyflo bridge keeps what was typed) run before this fires
      setTimeout(function () { if (method === 'GET') { u.search = params.toString(); window.__vgo(u.href); } else window.__vgo(u.href, 'POST', params.toString()); }, 0);
    }, true);
  }
  // the microphone is requested for the Lauris and panel frames only where this page itself may use it (else the browser logs a policy warning)
  window.__vmicOk = function () { var pp = document.permissionsPolicy || document.featurePolicy; try { return pp ? pp.allowsFeature('microphone') : true; } catch (e) { return true; } };
  window.__vasset = function (name) { return rpc('asset', { name: name }); };
  window.__vcookie = function (s) { post('cookie', { set: s }); };
  window.__vpanelDoc = function (html) {
    var cfg = JSON.stringify({ kind: 'panel', store: shimmed ? { local: mem.localStorage, session: mem.sessionStorage } : null }).replace(/</g, '\\u003c');
    return html.replace('/*__VCFG__*/', function () { return 'window.__VCFG=' + cfg + ';'; });
  };
})();
