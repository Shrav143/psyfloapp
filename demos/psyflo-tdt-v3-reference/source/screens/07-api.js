/* Round 13 (owner HIST13): PSY.api — the in-browser demo backend. No network: a small request/response service inside the page.
   Handlers validate their input, read and write PSY.state (results persist for the session and every page sees them), wait a
   simulated latency and log every call. Label everywhere: "In-browser demo backend (simulated; no external systems)".
     PSY.api.route(method, pattern, handler, o?)  pattern '/cases/:case/history'; handler({ params, query, body, note }) → data (sync or async).
                                                o = { desc, owner, summary(data, req) → log line }. Re-registering a method+pattern replaces it.
     PSY.api.error(status, message)             throw it from a handler for 400 / 404 / 409 (anything else thrown = 500)
     PSY.api.get(path) · post(path, body) · patch(path, body) · del(path)  → Promise<data>; rejects with { status, message }
     PSY.api.call(method, path, body, { quiet }) synchronous variant for render code (throws { status, message }); logs unless quiet
     PSY.api.latency = [min, max] ms (default [150, 450]; tests set [0, 0])
     PSY.api.log()  newest first [{ id, at, method, path, status, ms, summary }] (PSY.state.api.log, at most 200; Reset Demo clears it)
     PSY.api.routes()  the route table · PSY.api.showLog()  the presenter's "Demo backend · API log" modal · PSY.api.onLog(fn) subscribe
   Routes here: GET /payers, GET /payers/:id, GET /cases/:case. 08-history.js adds the history routes, 09-voice.js the voice calls. */
(function () {
  const PSY = window.PSY; const esc = PSY.esc;
  const API = (PSY.api = PSY.api || {});
  const ROUTES = [];
  const LISTEN = [];
  API.latency = [150, 450];
  API.MAX = 200;
  API.LABEL = 'In-browser demo backend (simulated; no external systems)';

  /* ---------------- demo clock: Thu Oct 29, 2026, starting at 10:42 am when the page loads ---------------- */
  const T0 = Date.now(); const BASE = Date.UTC(2026, 9, 29, 10, 42, 0);
  API.clock = () => new Date(BASE + (Date.now() - T0));
  const two = (n) => String(n).padStart(2, '0');
  API.clockLabel = (d) => { d = d || API.clock(); const h = d.getUTCHours(); return (h % 12 || 12) + ':' + two(d.getUTCMinutes()) + ':' + two(d.getUTCSeconds()) + ' ' + (h < 12 ? 'am' : 'pm'); };

  /* ---------------- routing ---------------- */
  const compile = (pattern) => {
    const keys = []; const src = String(pattern).replace(/\/+$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:([A-Za-z_]\w*)/g, (_, k) => { keys.push(k); return '([^/]+)'; });
    return { re: new RegExp('^' + src + '/?$'), keys };
  };
  API.route = (method, pattern, handler, o) => {
    o = o || {}; method = String(method || 'GET').toUpperCase();
    const c = compile(pattern); const r = { method, pattern, handler, re: c.re, keys: c.keys, desc: o.desc || '', owner: o.owner || '', summary: o.summary || null };
    const i = ROUTES.findIndex((x) => x.method === method && x.pattern === pattern);
    if (i >= 0) ROUTES[i] = r; else ROUTES.push(r);
    return API;
  };
  API.routes = () => ROUTES.map((r) => ({ method: r.method, pattern: r.pattern, desc: r.desc, owner: r.owner }));
  API.error = (status, message) => { const e = new Error(message || 'Error'); e.status = status || 500; e.apiError = true; return e; };
  const parse = (path) => {
    const s = String(path || '/'); const q = s.indexOf('?'); const pathname = (q >= 0 ? s.slice(0, q) : s) || '/'; const query = {};
    if (q >= 0) s.slice(q + 1).split('&').filter(Boolean).forEach((kv) => { const i = kv.indexOf('='); const k = decodeURIComponent(i >= 0 ? kv.slice(0, i) : kv); query[k] = i >= 0 ? decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' ')) : ''; });
    return { pathname: pathname.charAt(0) === '/' ? pathname : '/' + pathname, query };
  };
  const match = (method, pathname) => {
    let other = false;
    for (const r of ROUTES) {
      const m = r.re.exec(pathname); if (!m) continue;
      if (r.method !== method) { other = true; continue; }
      const params = {}; r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
      return { r, params };
    }
    return { miss: other ? 405 : 404 };
  };
  const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

  /* ---------------- the log ---------------- */
  const st = () => { const s = PSY.state; s.api = s.api && Array.isArray(s.api.log) ? s.api : { log: [], n: 0 }; return s.api; };
  const autoSummary = (data) => {
    if (Array.isArray(data)) return data.length + (data.length === 1 ? ' item' : ' items');
    if (data && typeof data === 'object') return data.id ? String(data.id) : Object.keys(data).slice(0, 4).join(', ');
    return data == null ? '' : String(data).slice(0, 80);
  };
  function record(method, path, status, ms, summary) {
    const s = st(); s.n = (s.n || 0) + 1;
    const e = { id: 'call-' + s.n, at: API.clockLabel(), method, path, status, ms: Math.round(ms), summary: String(summary || '').slice(0, 160) };
    s.log.unshift(e); if (s.log.length > API.MAX) s.log.length = API.MAX;
    /* no PSY.save() here: logging must not bump PSY.rev (that would re-render tabs); the next save of any action persists it */
    LISTEN.forEach((f) => { try { f(e); } catch (err) { console.error('api listener', err); } });
    refreshLogModal();
    return e;
  }
  API.log = () => st().log.slice();
  API.clearLog = () => { st().log = []; refreshLogModal(); };
  API.onLog = (f) => { if (typeof f === 'function') LISTEN.push(f); };

  /* ---------------- dispatch ---------------- */
  const OK = { GET: 200, POST: 201, PATCH: 200, PUT: 200, DELETE: 200 };
  function prep(method, path, body) {
    method = String(method || 'GET').toUpperCase(); const u = parse(path); const m = match(method, u.pathname);
    const req = { method, path: u.pathname + (Object.keys(u.query).length ? path.slice(path.indexOf('?')) : ''), params: m.params || {}, query: u.query, body: body == null ? {} : clone(body), summary: '' };
    req.note = (s) => { req.summary = s; };
    return { req, m };
  }
  const fail = (e) => ({ status: (e && e.status) || 500, message: (e && e.message) || 'Server error' });
  const sumOf = (r, data, req) => req.summary || (r.summary ? (() => { try { return r.summary(data, req); } catch (e) { return ''; } })() : autoSummary(data));
  /* synchronous call (render code); a handler that returns a promise must be called with get/post/patch */
  API.call = (method, path, body, o) => {
    o = o || {}; const t0 = performance.now(); const { req, m } = prep(method, path, body);
    if (m.miss) { const e = { status: m.miss, message: m.miss === 405 ? 'Method not allowed' : 'No route for ' + req.method + ' ' + req.path }; if (!o.quiet) record(req.method, req.path, e.status, performance.now() - t0, e.message); throw e; }
    let data;
    try { data = m.r.handler(req); if (data && typeof data.then === 'function') throw API.error(500, 'Async handler: use PSY.api.' + req.method.toLowerCase() + '()'); }
    catch (e) { const f = fail(e); if (!o.quiet) record(req.method, req.path, f.status, performance.now() - t0, f.message); if (!e.apiError) console.error('api', req.method, req.path, e); throw f; }
    if (!o.quiet) record(req.method, req.path, OK[req.method] || 200, performance.now() - t0, sumOf(m.r, data, req));
    return clone(data);
  };
  const rand = () => { const l = API.latency || [0, 0]; const a = +l[0] || 0; const b = l[1] != null ? +l[1] : a; return a + Math.random() * Math.max(0, b - a); };
  API.request = (method, path, body) => new Promise((resolve, reject) => {
    const t0 = performance.now(); const { req, m } = prep(method, path, body);
    setTimeout(async () => {
      if (m.miss) { const e = { status: m.miss, message: m.miss === 405 ? 'Method not allowed' : 'No route for ' + req.method + ' ' + req.path }; record(req.method, req.path, e.status, performance.now() - t0, e.message); reject(e); return; }
      try {
        let data = m.r.handler(req); if (data && typeof data.then === 'function') data = await data;
        record(req.method, req.path, OK[req.method] || 200, performance.now() - t0, sumOf(m.r, data, req));
        resolve(clone(data));
      } catch (e) { const f = fail(e); if (!e.apiError) console.error('api', req.method, req.path, e); record(req.method, req.path, f.status, performance.now() - t0, f.message); reject(f); }
    }, rand());
  });
  API.get = (path) => API.request('GET', path);
  API.post = (path, body) => API.request('POST', path, body);
  API.patch = (path, body) => API.request('PATCH', path, body);
  API.del = (path) => API.request('DELETE', path);

  /* ---------------- base routes ---------------- */
  const MCO = ['aetna', 'anthem', 'humana', 'sentara', 'uhc'];
  const payerOut = (id) => {
    const p = PSY.data.payers[id]; if (!p) return null;
    const ch = PSY.rules && PSY.rules.channel ? PSY.rules.channel(id) : { label: p.channel, kind: 'unverified', source: '' };
    return { id, plan: p.name, mco: p.mco || p.name, short: p.short, channel: ch.label, channelMethod: ch.method || p.channel, channelSource: ch.source || '', channelKind: ch.kind || '' };
  };
  API.route('GET', '/payers', () => MCO.map(payerOut).filter(Boolean), { desc: 'The five Virginia Medicaid managed care plans and how Harvest submits to each', owner: 'HIST13', summary: (d) => d.length + ' Virginia Medicaid MCOs' });
  API.route('GET', '/payers/:id', (q) => { const p = MCO.indexOf(q.params.id) >= 0 ? payerOut(q.params.id) : null; if (!p) throw API.error(404, 'Unknown payer: ' + q.params.id); return p; }, { desc: 'One plan', owner: 'HIST13', summary: (d) => d.plan });
  API.route('GET', '/cases/:case', (q) => {
    const id = q.params.case; const c = PSY.caseView(id); if (!c) throw API.error(404, 'Unknown case: ' + id);
    const A = PSY.auth; const m = A ? A.meta(id) : {}; const u = A ? A.units(id) : {}; const pay = PSY.data.payers[c.payer] || {};
    return { id, ini: c.ini, laurisId: m.laurisId || '', type: c.type, kind: m.kind || '', payer: c.payer, plan: pay.name || '', status: A ? A.status(id) : c.stage, statusLabel: A ? A.label(A.status(id)) : '',
      ref: m.ref || '', requested: u.requested, approved: u.approved, period: u.period || '', current: u.current || null };
  }, { desc: 'One case: status, payer, units', owner: 'HIST13', summary: (d) => d.id + ' · ' + d.ini + ' · ' + d.statusLabel });

  /* ---------------- presenter: "Demo backend · API log" ---------------- */
  const CSS = `
#presBtn{position:relative;z-index:85} /* the presenter can always reach the menu, even with a pop-up open (a live call) */
#modal .api13 h4{margin:14px 0 6px;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:#6B665E;font-weight:700;display:flex;align-items:center;gap:8px}
#modal .api13 h4:first-child{margin-top:2px}
#modal .api13-k{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:12.5px;color:#4A453D;background:#F6F0E8;border-radius:8px;padding:8px 10px}
#modal .api13-k b{font-weight:700;color:#1B1B19}
#modal .api13-w{max-height:38vh;overflow:auto;border:1px solid #EFE8DE;border-radius:10px}
#modal .api13-w.r{max-height:22vh}
#modal table.api13-t{width:100%;border-collapse:collapse;font-size:12.5px;table-layout:fixed}
#modal .api13-t th{position:sticky;top:0;background:#FAF6F1;text-align:left;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:#6B665E;font-weight:700;padding:7px 9px;border-bottom:1px solid #EFE8DE}
#modal .api13-t td{padding:6px 9px;border-top:1px solid #F2EDE6;vertical-align:top;line-height:1.35;overflow:hidden;text-overflow:ellipsis}
#modal .api13-t tr:first-child td{border-top:0}
#modal .api13-t code{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#1B1B19;word-break:break-all}
#modal .api13-m{display:inline-block;min-width:46px;text-align:center;border-radius:5px;padding:1px 5px;font:700 10.5px ui-monospace,SFMono-Regular,Menlo,monospace}
#modal .api13-m.GET{background:#E6EEF8;color:#24476E}#modal .api13-m.POST{background:#E3EFEA;color:#1D4F43}#modal .api13-m.PATCH{background:#FCF0D6;color:#6F4A05}#modal .api13-m.DELETE{background:#FBE7E2;color:#8A2E1C}
#modal .api13-s{font-weight:700;font-size:12px}#modal .api13-s.ok{color:#1E5C3C}#modal .api13-s.no{color:#8A2E1C}
#modal .api13-e{padding:16px;color:#6B665E;font-size:13px;text-align:center}
#modal .api13-d{color:#6B665E}
`;
  const stEl = document.createElement('style'); stEl.textContent = CSS; document.head.appendChild(stEl);
  const sim = () => (PSY.ev ? PSY.ev.label('illustrative', 'Simulated') : '<b>Simulated</b>');
  function logRows() {
    const L = API.log();
    if (!L.length) return '<div class="api13-e" data-psy="api-empty">No calls yet. Click a button in the demo (History, Call payer, the roster) and it appears here.</div>';
    return '<table class="api13-t" data-psy="api-calls"><colgroup><col style="width:92px"><col style="width:64px"><col style="width:36%"><col style="width:52px"><col style="width:52px"><col></colgroup><thead><tr><th>Time</th><th>Method</th><th>Path</th><th>Status</th><th>ms</th><th>Summary</th></tr></thead><tbody>' +
      L.map((e) => '<tr data-call="' + esc(e.id) + '"><td>' + esc(e.at) + '</td><td><span class="api13-m ' + esc(e.method) + '">' + esc(e.method) + '</span></td><td><code>' + esc(e.path) + '</code></td><td><span class="api13-s ' + (e.status < 400 ? 'ok' : 'no') + '">' + e.status + '</span></td><td>' + e.ms + '</td><td title="' + esc(e.summary) + '">' + esc(e.summary) + '</td></tr>').join('') + '</tbody></table>';
  }
  function routeRows() {
    return '<table class="api13-t" data-psy="api-routes"><colgroup><col style="width:64px"><col style="width:40%"><col></colgroup><thead><tr><th>Method</th><th>Route</th><th>What it does</th></tr></thead><tbody>' +
      API.routes().map((r) => '<tr><td><span class="api13-m ' + esc(r.method) + '">' + esc(r.method) + '</span></td><td><code>' + esc(r.pattern) + '</code></td><td class="api13-d">' + esc(r.desc) + '</td></tr>').join('') + '</tbody></table>';
  }
  const body = () => '<div class="api13" data-psy="api-log">' +
    '<div class="api13-k">' + sim() + '<span>The calls below ran a handler in this page: each checks its input, reads or writes the demo state and is logged here.</span></div>' +
    '<h4>Calls <span data-psy="api-n">' + API.log().length + '</span></h4><div class="api13-w" data-psy="api-calls-w">' + logRows() + '</div>' +
    '<h4>Routes <span>' + ROUTES.length + '</span></h4><div class="api13-w r">' + routeRows() + '</div></div>';
  function refreshLogModal() {
    const m = document.getElementById('modal'); const box = m && m.querySelector('[data-psy="api-log"]'); if (!box) return;
    const w = box.querySelector('[data-psy="api-calls-w"]'); if (w) w.innerHTML = logRows();
    const n = box.querySelector('[data-psy="api-n"]'); if (n) n.textContent = API.log().length;
  }
  API.showLog = () => {
    PSY.ui.modal({ wide: true, title: 'Demo backend · API log', sub: API.LABEL, body: body(),
      actions: [{ label: 'Clear log', onClick: () => { API.clearLog(); return false; } }, { label: 'Close', primary: true }] });
  };
})();
