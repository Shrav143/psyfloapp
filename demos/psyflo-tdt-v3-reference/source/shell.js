/* Psyflo × Harvest prototype v2 runtime.
   The demo is a browser window with tabs. Tab 1 is always Lauris Online (the EHR). The Psyflo extension pops out beside
   Lauris. The Psyflo web platform opens in its own tab. Screens are registered with PSY.register and rendered in Shadow DOM. */
(function () {
  const PSY = (window.PSY = window.PSY || {});
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  PSY.$ = $; PSY.$$ = $$;
  PSY.screens = {}; PSY.acts = {}; PSY.ui = {}; PSY.lauris = {}; PSY.platform = {}; PSY.theme = {}; PSY.ext = PSY.ext || {};
  PSY.css = PSY.css || {}; PSY.assets = PSY.assets || {};
  const KEY = 'psy-tdt-proto-v2';

  /* ---------------- state ---------------- */
  function load() {
    try { const s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (s && s.version === 5) return s; } catch (e) {}
    return PSY.data.seedState();
  }
  PSY.state = load();
  PSY.rev = 0;
  PSY.save = () => { PSY.rev++; try { sessionStorage.setItem(KEY, JSON.stringify(PSY.state)); } catch (e) {} };
  PSY.reset = (o) => { PSY.state = PSY.data.seedState(); PSY.save(); tabs.forEach((t) => { if (t.host) t.host.remove(); }); tabs.length = 0; active = null; view.innerHTML = ''; PSY.ui.closeModal(); if (!(o && o.silent)) PSY.go('lauris-consumers'); };

  PSY.caseById = (id) => PSY.data.cases.find((c) => c.id === id);
  PSY.caseView = (id) => { const b = PSY.caseById(id); if (!b) return null; return Object.assign({}, b, PSY.state.cases[id] || {}); };
  PSY.allCases = () => PSY.data.cases.map((c) => PSY.caseView(c.id));
  PSY.setCase = (id, patch) => { const cur = Object.assign({}, PSY.state.cases[id] || {}); if (patch && patch.stage && !('status5' in patch)) delete cur.status5; PSY.state.cases[id] = Object.assign(cur, patch); PSY.save(); };
  PSY.log = (caseId, text, by) => { PSY.state.log.unshift({ t: nowLabel(), case: caseId, text }); if (PSY.audit) PSY.audit.add({ case: caseId, action: text, by: by || (/^(Psyflo|The extension)|drafted|assembled|read back/i.test(text) ? 'Psyflo (system)' : 'J. Perez, LPC'), silent: true, status: PSY.auth && caseId && PSY.caseById(caseId) ? PSY.auth.status(caseId) : '' }); PSY.save(); };
  PSY.setAction = (key, val) => { PSY.state.actions[key] = Object.assign({ done: true, at: nowLabel() }, val || {}); PSY.save(); };
  PSY.action = (key) => PSY.state.actions[key] || null;
  PSY.flag = (k, v) => { if (v === undefined) return PSY.state.boxes[k]; PSY.state.boxes[k] = v; PSY.save(); return v; };
  function nowLabel() { return '10:42 am'; }
  PSY.now = nowLabel;
  PSY.esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  /* the new-case story of T.W.: referral < screened < cna < isp < approved < signed */
  const RANK = { referral: 0, screened: 1, cna: 2, isp: 3, approved: 4, signed: 5 };
  PSY.flowRank = () => RANK[PSY.state.flow.tw] || 0;
  PSY.locOk = (c) => { const l = (PSY.state.prefs || {}).locality; return !l || l === 'both' || c.loc === l; };

  PSY.counts = () => {
    const cs = PSY.allCases();
    const open = cs.length;
    const di = cs.filter((c) => ['partial', 'p2p', 'denied', 'appeal'].includes(c.stage)).length;
    const needsMe = cs.filter((c) => c.today && ['sign', 'info', 'partial'].includes(c.stage)).length;
    const refs = PSY.data.referrals.filter((r) => (PSY.state.referral[r.id] || r.status) !== 'grant').length;
    const att = PSY.dash && PSY.dash.ov && PSY.dash.ov.attention ? PSY.dash.ov.attention().length : PSY.alerts ? PSY.alerts.all().filter((a) => a.need).length : needsMe; const auth = PSY.auth ? cs.filter((c) => PSY.auth.visible(c.id)).length : open; const diN = PSY.di && PSY.di.open ? PSY.di.open().length : PSY.data.r5 ? PSY.data.r5.disputes.filter((d) => !((PSY.state.disputes5 || {})[d.id] || {}).closed).length : di;
    return { dash: att, ref: refs, auth, di: diN, an: '' };
  };

  /* ---------------- roles ("View as", like the RPM product) — round 9 permissions ----------------
     dss = direct support staff (Scribe + Track time, assigned consumers only) · lcs = licensed clinical staff (+ Scan & Enhance, Authorizations,
     Denial Intelligence for their caseload) · admin = program director (Authorizations, Denial Intelligence, Analytics, Settings, all consumers;
     clinical record content is NOT included by default: an admin role does not automatically see clinical documents).
     PSY.can(feature) reads PSY.PERMS[role], with the admin's overrides from Settings → Roles (PSY.state.perms). */
  PSY.ROLES = {
    dss: { key: 'dss', label: 'Direct support staff', short: 'DSS', name: 'Kayla Hale', lauris: 'Kayla Hale, DSS', cred: 'Direct Support Staff · Campbell ES-1', ini: 'KH', staff: 'K. Hale' },
    lcs: { key: 'lcs', label: 'Licensed clinical staff', short: 'LCS', name: 'Jordan Perez, LPC', lauris: 'Jordan Perez, LPC', cred: 'Assistant Clinical Support Supervisor', ini: 'JP', staff: 'J. Perez' },
    admin: { key: 'admin', label: 'Administrator', short: 'Admin', name: 'Maria Wood', lauris: 'Maria Wood', cred: 'Program Director', ini: 'MW', staff: 'M. Wood' },
  };
  PSY.ROLE_ORDER = ['dss', 'lcs', 'admin'];
  PSY.FEATURES = [
    ['platform', 'Psyflo platform'], ['auth', 'All Authorizations'], ['denials', 'Denial Intelligence'], ['analytics', 'Analytics'], ['flow', 'FLO (data agent, add-on)'], ['settings', 'Settings'],
    ['allConsumers', 'All consumers (else assigned only)'], ['clinicalRecords', 'Clinical record content'],
    ['enhance', 'Scan & Enhance'], ['cases', 'SRA stages in Overview'], ['time', 'Track Time'],
    ['scribe:admission', 'Scribe · Admission Screening'], ['scribe:intake', 'Scribe · Intake'], ['scribe:dpn', 'Scribe · DPN'], ['scribe:collateral', 'Scribe · Collateral'], ['scribe:monthly', 'Scribe · Monthly'],
  ];
  const ALLF = PSY.FEATURES.map((f) => f[0]);
  const permSet = (on) => Object.fromEntries(ALLF.map((f) => [f, on.indexOf(f) >= 0]));
  PSY.PERMS = {
    dss: permSet(['time', 'scribe:dpn', 'scribe:collateral', 'scribe:monthly']),
    lcs: permSet(['platform', 'auth', 'denials', 'analytics', 'flow', 'clinicalRecords', 'enhance', 'cases', 'time', 'scribe:admission', 'scribe:intake', 'scribe:dpn', 'scribe:collateral', 'scribe:monthly']),
    admin: permSet(['platform', 'auth', 'denials', 'analytics', 'flow', 'settings', 'allConsumers', 'cases']),
  };
  /* caseloads (patient-level access): who each role works with. Lauris consumer ids. */
  PSY.caseload = (r) => {
    r = r || PSY.role(); const L = PSY.data.lauris; if (!L) return [];
    if (PSY.can('allConsumers', r)) return L.consumers.map((c) => c.id);
    const me = PSY.ROLES[r].staff;
    return L.consumers.filter((c) => (r === 'dss' ? (c.dsp || []).indexOf(me) >= 0 : c.staff === me)).map((c) => c.id);
  };
  PSY.inCaseload = (laurisId, r) => PSY.caseload(r).indexOf(String(laurisId)) >= 0;
  PSY.caseInCaseload = (caseId, r) => { const L = PSY.data.lauris; const c = L && L.byCase ? L.byCase(caseId) : null; return c ? PSY.inCaseload(c.id, r) : PSY.can('allConsumers', r); };
  PSY.role = () => (PSY.ROLES[PSY.state.role] ? PSY.state.role : 'lcs');
  PSY.user = (r) => PSY.ROLES[r || PSY.role()];
  PSY.can = (f, r) => {
    r = r || PSY.role(); const o = ((PSY.state.perms || {})[r] || {});
    if (r === 'admin' && (f === 'settings' || f === 'platform')) return true; // the admin can always get back to Settings
    return f in o ? !!o[f] : !!(PSY.PERMS[r] || {})[f];
  };
  PSY.setPerm = (r, f, on) => { PSY.state.perms = PSY.state.perms || {}; (PSY.state.perms[r] = PSY.state.perms[r] || {})[f] = !!on; PSY.save(); };
  PSY.setRole = (r, o) => {
    if (!PSY.ROLES[r]) return; PSY.state.role = r; PSY.state.ext.view = null; PSY.save();
    if (PSY.onRole) PSY.onRole(r);
    PSY.refresh(); if (PSY.ext && PSY.ext.apply) PSY.ext.apply();
    if (!(o && o.silent)) PSY.ui.toast('Viewing as ' + PSY.ROLES[r].label + '.');
  };

  /* ---------------- theme: the board palette -> the v01_2 look, applied to every platform screen ---------------- */
  const REMAP = [['217A78', '1D4F43'], ['15605E', '17403A'], ['151B24', '1B1B19'], ['F8F6F2', 'FAF6F1'], ['E6E1D9', 'E5DCD0'], ['EFEBE4', 'EFE8DE'], ['525B66', '6B665E'], ['DDF1EF', 'E3EFEA'],
    ['D9D4CC', 'E0D6C9'], ['EEEBE5', 'EFE8DE'], ['3E4652', '4A453D'], ['5FC0BE', '7FB5A5'], ['F3F0EA', 'F6F0E8'], ['C9D1D6', 'D9D2C6'], ['2A3340', '3A4A42'], ['8E99A6', '9A9388'],
    ['F2F9F8', 'EEF5F1'], ['0E1319', '141413'], ['222A35', '2B3A33'], ['FBE9E4', 'F6DDD6'], ['FCEFD0', 'F6E7C8']];
  const REMAP_RE = REMAP.map(([a, b]) => {
    const n = [0, 2, 4].map((i) => parseInt(a.substr(i, 2), 16));
    return [new RegExp('#' + a + '(?![0-9a-fA-F])', 'gi'), '#' + b, new RegExp('rgb\\(\\s*' + n[0] + ',\\s*' + n[1] + ',\\s*' + n[2] + '\\s*\\)', 'gi'), '#' + b];
  });
  PSY.theme.remap = (s) => { if (!s) return s; REMAP_RE.forEach(([h, hb, r, rb]) => { s = s.replace(h, hb).replace(r, rb); }); return s; };

  /* ---------------- tabs + router ---------------- */
  const APPS = {
    lauris: { name: 'Lauris Online', fav: '#2F3A4A', base: 'https://…laurisonline…/' },
    psyflo: { name: 'Psyflo', fav: '#1D4F43', base: 'https://app.psyflo.com/' },
    public: { name: 'Harvest Outreach Center', fav: '#217A78', base: 'https://app.psyflo.com/' },
  };
  const tabs = []; let active = null;
  const appOf = (def) => def.app || (def.kind === 'ext' ? 'lauris' : def.kind === 'web' ? 'psyflo' : def.kind === 'lauris' ? 'lauris' : 'public');
  PSY.register = (def) => { def.app = appOf(def); PSY.screens[def.id] = def; };
  const sameRoute = (a, b) => a && b && a.id === b.id && JSON.stringify(a.params || {}) === JSON.stringify(b.params || {});
  const qs = (p) => { const e = Object.entries(p || {}); return e.length ? '?' + e.map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&') : ''; };

  function openTab(app) {
    const t = { key: app, app, stack: [], i: -1, host: null, root: null, def: null, ctx: null, seenRev: -1, closable: app !== 'lauris', fresh: true };
    tabs.push(t); return t;
  }
  PSY.REDIRECT = {
    home: () => ({ id: 'auth-list' }), referrals: () => ({ id: 'auth-list' }), 'ref-review': () => ({ id: 'auth-list' }),
    payers: () => ({ id: 'auth-list' }), payer: () => ({ id: 'auth-list' }), 'connect-lauris': () => ({ id: 'auth-list' }),
  };
  PSY.go = (id, params, opts) => {
    opts = opts || {};
    if (typeof id === 'string' && id.includes('?')) { const [a, q] = id.split('?'); id = a; params = Object.assign(Object.fromEntries(new URLSearchParams(q)), params || {}); }
    params = params || {};
    /* round 8: the platform is Authorizations + Analytics; old pages redirect (D may refine the params in PSY.REDIRECT) */
    const red = PSY.REDIRECT[id]; if (red) { const m = red(params) || {}; id = m.id || 'auth-list'; params = m.params || {}; }
    const def = PSY.screens[id] || PSY.screens['lauris-consumers'];
    if (!PSY.screens[id]) { console.warn('unknown screen', id); id = def.id; }
    if (!tabs.length) openTab('lauris');
    const app = def.app;
    let tab = tabs.find((t) => t.app === app) || openTab(app);
    const route = { id, params };
    if (sameRoute(tab.stack[tab.i], route) || opts.replace) { if (tab.i < 0) { tab.stack = [route]; tab.i = 0; } else tab.stack[tab.i] = route; }
    else { tab.stack.length = tab.i + 1; tab.stack.push(route); tab.i = tab.stack.length - 1; }
    if (active && active !== tab) active.seenRev = PSY.rev;
    if (app === 'lauris' && PSY.state.ext && PSY.state.ext.mode === 'focus' && !opts.keepFocus) { PSY.state.ext.mode = 'sidebar'; PSY.state.ext.open = true; }
    active = tab;
    renderTab(tab, opts);
    chrome();
  };
  PSY.back = () => { const t = active; if (t && t.i > 0) { t.i--; renderTab(t, {}); chrome(); } };
  PSY.forward = () => { const t = active; if (t && t.i < t.stack.length - 1) { t.i++; renderTab(t, {}); chrome(); } };
  PSY.reload = () => { if (active) { renderTab(active, { keep: snap(active) }); chrome(); } };
  PSY.refresh = () => { if (active) renderTab(active, { keep: snap(active) }); };
  PSY.activeRoot = () => (active && active.root) || null;
  PSY.current = () => { const t = active; const r = (t && t.stack[t.i]) || {}; return { id: r.id, params: r.params || {}, app: t && t.app }; };
  PSY.tabs = () => tabs.map((t) => ({ app: t.app, route: t.stack[t.i], active: t === active }));
  PSY.activate = (app) => { const t = tabs.find((x) => x.app === app); if (t) activateTab(t); };
  PSY.closeTab = (app) => { const t = tabs.find((x) => x.app === app); if (t && t.closable) closeTab(t); };
  function activateTab(t) {
    if (active === t) return;
    if (active) active.seenRev = PSY.rev;
    active = t;
    if (t.host && t.seenRev === PSY.rev) { showHosts(); chrome(); } else { renderTab(t, { keep: snap(t) }); chrome(); }
  }
  function closeTab(t) {
    const i = tabs.indexOf(t); if (i < 0) return;
    if (t.host) t.host.remove();
    tabs.splice(i, 1);
    if (active === t) { active = tabs[Math.max(0, i - 1)]; if (active.host && active.seenRev === PSY.rev) showHosts(); else renderTab(active, { keep: snap(active) }); }
    chrome();
  }
  function showHosts() { tabs.forEach((x) => { if (x.host) x.host.style.display = x === active ? '' : 'none'; }); fit(); PSY.ext.apply(); }
  function snap(t) {
    const o = {}; if (!t || !t.root || !t.host) return o;
    o.__host = t.host.scrollTop;
    t.root.querySelectorAll('[data-scroll]').forEach((e) => { o[e.getAttribute('data-scroll')] = e.scrollTop; });
    return o;
  }
  /* only a plain #name is read (claude.ai reserves a few names and owns the address bar); the page never writes the hash */
  const RESERVED = /^(settings|sidebar|customize|upgrade|downloads|comment-.*)$/;
  function parseHash() {
    const h = (location.hash || '').replace(/^#/, '');
    if (!/^[a-z0-9-]+$/.test(h) || RESERVED.test(h) || !PSY.screens[h]) return null;
    return { id: h, params: {} };
  }
  window.addEventListener('hashchange', () => { const r = parseHash(); const c = PSY.current(); if (r && !sameRoute(r, c)) PSY.go(r.id, r.params); });

  /* ---------------- render a tab's screen ---------------- */
  const view = $('#view');
  function platformCss() { return PSY.css.platform || ''; }
  function laurisCss() { return PSY.css.lauris || ''; }
  let lastRouteKey = '';

  function renderTab(tab, opts) {
    opts = opts || {};
    const route = tab.stack[tab.i];
    const def = PSY.screens[route.id] || PSY.screens['lauris-consumers'];
    if (tab.def && tab.def.unmount) { try { tab.def.unmount(tab.root); } catch (e) {} }
    if (tab.host) tab.host.remove();
    const host = document.createElement('div');
    host.className = 'host ' + def.app;
    const root = host.attachShadow({ mode: 'open' });
    const ctx = makeCtx(route, def, root, host, tab);
    const key = tab.app + ':' + route.id + JSON.stringify(route.params || {});
    if (!opts.keep && tab === active) PSY.state.ext.tab = null; // a new page opens on its own panel tab
    tab.host = host; tab.root = root; tab.def = def; tab.ctx = ctx; tab.seenRev = PSY.rev;
    let html = '';
    try { html = def.render(route.params, PSY.state, ctx); } catch (e) { console.error(def.id, e); html = '<div style="padding:40px;font:14px sans-serif;color:#8A2E1C">Screen error: ' + PSY.esc(e.message) + '</div>'; }
    let css = (def.app === 'lauris' ? laurisCss() : platformCss()) + (def.css || '');
    if (def.app !== 'lauris' && def.theme !== false) { css = PSY.theme.remap(css); html = PSY.theme.remap(html); }
    root.innerHTML = '<style>' + css + '</style><div class="psy-root ' + def.app + '" part="root">' + html + '</div>';
    view.appendChild(host);
    host.style.setProperty('--vh', view.clientHeight + 'px');
    tabs.forEach((x) => { if (x.host) x.host.style.display = x === active ? '' : 'none'; });
    PSY.ui.wireBasics(root, ctx);
    if (def.mount) { try { def.mount(root, ctx); } catch (e) { console.error('mount', def.id, e); } }
    if (def.app === 'lauris') PSY.ext.apply(false);
    if (def.app === 'lauris' && route.params && route.params.scribe && PSY.scribe && tab === active) setTimeout(() => { if (tab.root === root) { delete route.params.scribe; PSY.scribe.autostart(root); } }, 900);
    if (opts.keep) {
      if (opts.keep.__host) host.scrollTop = opts.keep.__host;
      root.querySelectorAll('[data-scroll]').forEach((e) => { const v = opts.keep[e.getAttribute('data-scroll')]; if (v) e.scrollTop = v; });
    }
    lastRouteKey = key;
  }

  function makeCtx(route, def, root, host, tab) {
    return {
      id: route.id, params: route.params, root, host, state: PSY.state, browserTab: tab,
      go: PSY.go, refresh: PSY.refresh, toast: (m, o) => PSY.ui.toast(m, o), modal: (o) => PSY.ui.modal(o),
      q: (s) => root.querySelector(s), qa: (s) => Array.from(root.querySelectorAll(s)),
      $: (s) => root.querySelector(s), $$: (s) => Array.from(root.querySelectorAll(s)),
    };
  }

  /* declarative wiring: data-go="id?k=v" and data-act="name" work on any element of any screen */
  PSY.ui.wireBasics = (root, ctx) => {
    root.addEventListener('click', (e) => {
      const g = e.target.closest('[data-go]');
      if (g && root.contains(g)) {
        e.preventDefault();
        const to = g.getAttribute('data-go');
        if (to === 'back') { PSY.back(); return; }
        if (to.startsWith('#')) { const t = root.querySelector(to); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
        PSY.go(to);
        return;
      }
      const a = e.target.closest('[data-act]');
      if (a && root.contains(a)) {
        e.preventDefault();
        const fn = PSY.acts[a.getAttribute('data-act')];
        if (fn) fn(a, ctx, e); else console.warn('no act', a.getAttribute('data-act'));
      }
    });
    /* change / input / Enter do not leave the shadow root: data-change="act", data-input="act", data-enter="act" */
    const fire = (attr, e) => {
      const el = e.target && e.target.closest ? e.target.closest('[' + attr + ']') : null;
      if (!el || !root.contains(el)) return;
      const fn = PSY.acts[el.getAttribute(attr)];
      if (fn) fn(el, ctx, e);
    };
    root.addEventListener('change', (e) => fire('data-change', e));
    root.addEventListener('input', (e) => fire('data-input', e));
    root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') fire('data-enter', e); });
  };
  PSY.ui.__l1aWired = true; // (an earlier screen file wraps wireBasics to add the same handlers; the flag tells it not to)

  /* ---------------- window chrome: tab strip, toolbar, scaling ---------------- */
  const ICON = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    fwd: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
    reload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  };
  function urlFor(t) {
    const r = t.stack[t.i]; if (!r) return '';
    const def = PSY.screens[r.id] || {}; const app = APPS[t.app];
    let path = typeof def.url === 'function' ? def.url(r.params || {}) : def.url;
    if (path == null) { path = r.id.replace(/^lauris-/, ''); const q = Object.entries(r.params || {}).filter(([k]) => k !== 'fill'); if (q.length) path += '?' + q.map(([k, v]) => k + '=' + v).join('&'); }
    return app.base + path;
  }
  function titleFor(t) {
    const r = t.stack[t.i]; const def = r && PSY.screens[r.id]; if (!def) return APPS[t.app].name;
    return (typeof def.tabTitle === 'function' ? def.tabTitle(r.params || {}) : def.tabTitle) || (APPS[t.app].name + ' — ' + (def.label || def.id));
  }
  function chrome() {
    showHosts();
    $('#tabList').innerHTML = tabs.map((t) => '<div class="tab' + (t === active ? ' on' : '') + (t.fresh ? ' new' : '') + '" data-tab="' + t.app + '"><span class="fav" style="background:' + APPS[t.app].fav + '"></span><span class="tt">' + PSY.esc(titleFor(t)) + '</span>' + (t.closable ? '<button class="x" data-close="' + t.app + '" title="Close tab">×</button>' : '') + '</div>').join('');
    tabs.forEach((t) => { t.fresh = false; });
    const u = urlFor(active).replace(/^(https:\/\/[^/]+\/)(.*)$/, '<b>$1</b>$2');
    $('#url .u').innerHTML = u;
    $('#tBack').disabled = !(active && active.i > 0);
    $('#tFwd').disabled = !(active && active.i < active.stack.length - 1);
    PSY.ext.updateBtn();
  }
  $('#tabList').addEventListener('click', (e) => {
    const x = e.target.closest('[data-close]'); if (x) { e.stopPropagation(); const t = tabs.find((y) => y.app === x.getAttribute('data-close')); if (t) closeTab(t); return; }
    const tb = e.target.closest('[data-tab]'); if (tb) { const t = tabs.find((y) => y.app === tb.getAttribute('data-tab')); if (t) { activateTab(t); } }
  });
  $('#tBack').innerHTML = ICON.back; $('#tFwd').innerHTML = ICON.fwd; $('#tReload').innerHTML = ICON.reload; $('#url').insertAdjacentHTML('afterbegin', ICON.lock);
  $('#tBack').addEventListener('click', () => PSY.back());
  $('#tFwd').addEventListener('click', () => PSY.forward());
  $('#tReload').addEventListener('click', () => PSY.reload());

  function fit() {
    const MINW = 1180; const W0 = window.innerWidth, H0 = window.innerHeight;
    const k = Math.min(1, W0 / MINW); const win = $('#win');
    win.style.width = (k < 1 ? MINW : W0) + 'px'; win.style.height = (H0 / k) + 'px';
    win.style.transform = k < 1 ? 'scale(' + k + ')' : 'none';
    PSY.k = k;
    tabs.forEach((t) => { if (t.host) t.host.style.setProperty('--vh', view.clientHeight + 'px'); });
  }
  PSY.fit = fit;
  window.addEventListener('resize', fit);

  /* ---------------- toast + modal ---------------- */
  let toastT = null;
  PSY.ui.toast = (msg, opts) => {
    const t = $('#toast'); t.innerHTML = '<i>' + (opts && opts.err ? '!' : '✓') + '</i><span></span>'; t.classList.toggle('err', !!(opts && opts.err)); t.lastChild.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), (opts && opts.ms) || 3200);
  };
  PSY.ui.closeModal = () => { $('#overlay').classList.remove('open'); $('#modal').innerHTML = ''; };
  PSY.ui.modal = (o) => {
    const m = $('#modal'); m.className = o.wide ? 'wide' : '';
    m.innerHTML = '<h3></h3>' + (o.sub ? '<div class="sub"></div>' : '') + '<div class="body"></div><div class="acts"></div>';
    m.querySelector('h3').textContent = o.title || '';
    if (o.sub) m.querySelector('.sub').textContent = o.sub;
    const body = m.querySelector('.body'); if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    const acts = m.querySelector('.acts');
    (o.actions || [{ label: 'Close' }]).forEach((a) => {
      const b = document.createElement('button'); b.className = 'btn ' + (a.primary ? 'p' : 'o'); b.textContent = a.label;
      b.onclick = () => { const r = a.onClick ? a.onClick(m) : undefined; if (r !== false) PSY.ui.closeModal(); };
      acts.appendChild(b);
    });
    $('#overlay').classList.add('open');
    if (o.onOpen) o.onOpen(m);
  };
  $('#overlay').addEventListener('click', (e) => { if (e.target.id === 'overlay') PSY.ui.closeModal(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') PSY.ui.closeModal(); });

  /* ---------------- the Psyflo extension (pops out beside Lauris) ---------------- */
  const X = PSY.ext;
  X.W = 400;
  X.defaults = X.defaults || {}; // X.defaults.time(o) / X.defaults.review(o) are provided by the Lauris screens
  /* three display states (Part 3): collapsed (a small floating control) · sidebar (400 px) · focus (a review workspace over Lauris) */
  X.mode = () => PSY.state.ext.mode || (PSY.state.ext.open ? 'sidebar' : 'collapsed');
  const lroot = () => (active && active.app === 'lauris' && active.root ? active.root : null);
  const curPanel = () => { const r = lroot(); return r ? r.querySelector('[data-psy="panel"]') : null; };
  X.apply = () => {
    const r = lroot(); const p = curPanel(); const m = X.mode(); const o = m !== 'collapsed';
    if (p) { const side = m === 'sidebar'; p.style.flexBasis = side ? X.W + 'px' : '0px'; p.style.opacity = side ? '1' : '0'; p.style.borderLeftWidth = side ? '1px' : '0px'; p.setAttribute('aria-hidden', side ? 'false' : 'true'); }
    if (r) { const pill = r.querySelector('[data-psy="pill"]'); if (pill) { pill.hidden = o; } }
    X.updateBtn();
  };
  X.set = (o) => {
    const was = X.mode(); PSY.state.ext.open = !!o; PSY.state.ext.mode = o ? 'sidebar' : 'collapsed'; if (o) PSY.state.ext.seen = true; PSY.save();
    if (was === 'focus') { PSY.refresh(); return; }
    X.apply();
  };
  X.toggle = () => { if (!active || active.app !== 'lauris') { PSY.go('lauris-consumers'); X.set(true); return; } X.set(X.mode() === 'collapsed'); };
  /* focused review: flow = initial | continued | decision, caseId = the Psyflo case */
  X.focus = (flow, caseId, step) => {
    PSY.state.ext.open = true; PSY.state.ext.seen = true; PSY.state.ext.mode = 'focus'; PSY.state.ext.focus = { flow: flow || 'initial', case: caseId || null, step: step || null }; PSY.save();
    if (!active || active.app !== 'lauris') { const lc = caseId && PSY.data.lauris.byCase(caseId); PSY.go(lc ? 'lauris-consumer?c=' + lc.id : 'lauris-consumers', {}, { keepFocus: true }); return; }
    PSY.refresh(); const r = lroot(); const f = r && r.querySelector('[data-psy="focus"]'); if (f) f.scrollTop = 0;
  };
  X.unfocus = () => { PSY.state.ext.mode = 'sidebar'; PSY.state.ext.open = true; PSY.save(); PSY.refresh(); };
  X.updateBtn = () => {
    const b = $('#extBtn'), tip = $('#extTip'); if (!b) return;
    const onLauris = active && active.app === 'lauris'; const hasPanel = !!curPanel(); const o = X.mode() !== 'collapsed';
    b.classList.toggle('here', !onLauris);
    b.classList.toggle('pulse', false);
    $('#extState').textContent = onLauris ? (o ? 'on' : 'off') : 'Lauris only';
    tip.classList.toggle('show', false);
    b.title = onLauris ? 'Open or close the Psyflo extension' : 'The Psyflo extension works beside Lauris. Click to go back to Lauris.';
  };
  /* round 13: no dropdown. The list under the buttons is one of two views: 'overview' (the patient roster, src/screens/63b-ext-overview.js,
     opened by the Overview button) or 'today' (the page's notes + Track Time). 63b-ext-overview.js owns X.views / X.view / X.setView /
     X.applyView (it loads after 01-core.js); these are the plain defaults. While a Scribe or Scan & Enhance session is open on the page,
     its work area replaces the list. */
  X.VIEWS = { overview: 'Overview', today: 'Today' };
  X.views = () => ['overview', 'today'];
  const VALIAS = { status: 'overview', cases: 'overview', notes: 'today', time: 'today' };
  X.view = () => { const vs = X.views(); let v = PSY.state.ext.view || PSY.state.ext.tab; v = VALIAS[v] || v; return vs.indexOf(v) >= 0 ? v : vs[0]; };
  X.setView = (name) => {
    name = VALIAS[name] || name; if (X.views().indexOf(name) < 0) name = X.views()[0];
    PSY.state.ext.view = name; PSY.state.ext.tab = name; PSY.save();
    const r = active && active.root; if (!r) return;
    r.querySelectorAll('[data-psy="xp-list"] > [data-pane]').forEach((p) => { const k = p.getAttribute('data-pane'); p.hidden = !(k === name || (name === 'today' && (k === 'notes' || k === 'time'))); });
  };
  /* kept for older callers: tab('status') → Overview; tab('review') → Scan & Enhance when the role has it */
  X.tab = (name) => {
    if (name === 'review') { if (PSY.enhance && PSY.enhance.begin && PSY.can('enhance')) { PSY.enhance.begin(); return; } name = 'overview'; }
    X.setView(name);
  };
  /* the work area: PSY.ext.work.register(key, { html(o) → '' | html }); the first provider with something to show wins */
  X.work = X.work || { list: [] };
  X.work.list = X.work.list || [];
  X.work.register = (key, def) => { X.work.list = X.work.list.filter((w) => w.key !== key).concat([Object.assign({ key }, def)]); };
  X.work.html = (o) => {
    for (const w of X.work.list) { try { const h = w.html(o || X.lastPanel || {}); if (h) return h; } catch (e) { console.error('work', w.key, e); } }
    return '';
  };
  X.work.active = () => !!X.work.html(X.lastPanel || {});
  /* repaint the work area in place (keeps the Lauris form and its inputs as they are) */
  X.work.paint = () => {
    const r = active && active.root; if (!r) return;
    const el = r.querySelector('[data-psy="work"]'); const list = r.querySelector('[data-psy="xp-list"]'); if (!el) return;
    const h = X.work.html(X.lastPanel || {}); el.innerHTML = h; el.hidden = !h; if (list) list.hidden = !!h;
    if (h && X.mode() === 'collapsed') X.set(true);
  };
  /* "Captured" card at the top of the Notes tab after Process Form: tells the clinician where it now shows up in Psyflo */
  X.seeIt = (root, o) => {
    const body = root.querySelector('[data-pane="notes"]'); if (!body) return;
    let card = body.querySelector('[data-psy="seeit"]');
    if (!card) { card = document.createElement('div'); card.setAttribute('data-psy', 'seeit'); card.className = 'xcard t'; card.style.flex = '0 0 auto'; body.insertBefore(card, body.firstChild); }
    card.innerHTML = '<div style="font-size:13px"><b>Captured.</b> ' + o.text + '</div><button class="btn p s" style="margin-top:8px" data-go="' + o.to + '">' + o.label + ' →</button>';
    X.tab('notes'); body.scrollTop = 0;
  };
  /* open the panel (with a slide) and pick a tab: used by screens that want Psyflo to speak up, e.g. the DMAS form */
  /* round 13: a document opened from the Overview roster keeps the roster in front (the page's notes wait in Today) */
  X.reveal = (tab) => { if (tab && !(X.overview && X.overview.front && X.overview.front())) X.tab(tab); if (X.mode() === 'collapsed') setTimeout(() => X.set(true), 380); };
  /* the patient in context: from the route (c / id / case), or the case a form page passes */
  X.patient = (o) => {
    const p = PSY.ctx ? PSY.ctx.patient() : null; if (p) return p;
    const k = PSY.ctx ? PSY.ctx.screen() : 'other';
    if (o && o.case && ['cna', 'isp', 'notes', 'authform', 'assessment', 'history'].indexOf(k) >= 0 && PSY.current().id !== 'lauris-saved') { const lc = PSY.data.lauris.byCase(o.case); if (lc) return PSY.ctx.patient({ id: 'x', params: { c: lc.id } }); }
    return null;
  };
  /* the collapsed control: "psyflo ✓ | 2 actions" + the authorization status in context */
  X.pillHtml = (o) => {
    const pt = X.patient(o); const cs = PSY.can('cases'); const n = cs && PSY.alerts ? PSY.alerts.count(pt ? pt.laurisId : null) : 0;
    let st = '';
    if (!cs) return '<button class="xpc" data-psy="pill" data-act="r5-expand" title="Open Psyflo"' + (X.mode() === 'collapsed' ? '' : ' hidden') + '><span class="xpc-row">' + (PSY.assets.logoRev || 'psyflo') + '<span class="xpc-ok" title="Reading this Lauris page" aria-label="Reading this Lauris page">✓</span></span>' + (pt ? '<span class="xpc-st t-gray"><i aria-hidden="true"></i>' + PSY.esc(pt.ini) + '</span>' : '') + '</button>';
    if (pt && pt.caseId && PSY.auth && PSY.auth.visible(pt.caseId)) { const k = PSY.auth.status(pt.caseId); st = '<span class="xpc-st t-' + PSY.auth.tone(k) + '"><i aria-hidden="true"></i>' + PSY.esc(pt.ini) + ' · ' + PSY.esc(n ? 'Action required' : PSY.auth.label(k)) + '</span>'; }
    else if (pt) st = '<span class="xpc-st t-gray"><i aria-hidden="true"></i>' + PSY.esc(pt.ini) + ' · ' + (pt.caseId === 'R-0416' ? 'New case' : 'No authorization') + '</span>';
    return '<button class="xpc" data-psy="pill" data-act="r5-expand" title="Open Psyflo"' + (X.mode() === 'collapsed' ? '' : ' hidden') + '><span class="xpc-row">' + (PSY.assets.logoRev || 'psyflo') + '<span class="xpc-ok" title="Reading this Lauris page" aria-label="Reading this Lauris page">✓</span><span class="xpc-sep" aria-hidden="true"></span>' +
      '<span class="xpc-n' + (n ? '' : ' z') + '">' + (n ? n + (n === 1 ? ' action' : ' actions') : 'No actions') + '</span></span>' + st + '</button>';
  };
  /* the focused review workspace (rendered only in focus mode) */
  X.focusHtml = (o) => {
    if (X.mode() !== 'focus') return '';
    const f = PSY.state.ext.focus || {}; const flow = (PSY.flows || {})[f.flow];
    const cv = f.case ? PSY.caseView(f.case) : null;
    const TITLE = { initial: 'Initial SRA', continued: 'Concurrent SRA', decision: 'Payer decision' };
    let body = '';
    try { body = flow && flow.render ? flow.render(f.case, f, o) : '<div class="xf-empty">Nothing to show</div>'; } catch (e) { console.error('flow', f.flow, e); body = '<div class="xf-empty">Could not open this review: ' + PSY.esc(e.message) + '</div>'; }
    return '<section class="xf" data-psy="focus" data-flow="' + PSY.esc(f.flow || '') + '" data-scroll="xf" aria-label="Focused review"><div class="xf-h">' + (PSY.assets.logoRev || '') + '<div class="xf-t"><b>' + PSY.esc((flow && flow.title) || TITLE[f.flow] || 'Review') + '</b><span>' + (cv ? PSY.esc(cv.ini + ', ' + cv.age + ' · ' + (PSY.data.payers[cv.payer] || {}).name + ' · ' + cv.service) : '') + '</span></div>' +
      '<button class="xf-back" data-act="r5-unfocus" title="Return to the compact sidebar">Return to sidebar <span aria-hidden="true">⟩</span></button></div><div class="xf-b">' + body + '</div></section>';
  };
  /* round 9 header: EHR connection · current consumer + Lauris # · current document (the role chip sits to the right) */
  X.ctxHtml = (o) => {
    const pt = X.patient(o); let doc = o.context || '';
    if (pt && doc) doc = doc.replace(' · ' + pt.ini, '').replace(pt.ini + ' · ', '');
    /* round 10: the extension says "patient" (Lauris's own pages keep "consumer") */
    doc = doc.replace(/\b(C|c)onsumer(s?)\b/g, (m, c, pl) => (c === 'C' ? 'Patient' : 'patient') + pl);
    return '<span class="xp-conn" data-psy="ehr-conn"><i aria-hidden="true"></i>Lauris connected</span>' +
      (pt ? '<span class="xp-pt" data-psy="ctx-consumer"><b>' + PSY.esc(pt.ini) + '</b> · #' + PSY.esc(pt.laurisId) + '</span>' : '') +
      (doc ? '<span class="xp-sub" data-psy="ctx-doc">' + doc + '</span>' : '');
  };
  /* round 10: the small Track Time control at the left of the footer (the time module replaces X.footTime with the live timer) */
  X.footTime = X.footTime || (() => '<button type="button" class="xp-time" data-act="xq-time" data-psy="foot-time" title="Track time"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>Track time</button>');
  X.panelHtml = (o) => {
    o = o || {}; X.lastPanel = o;
    const mode = X.mode(); const side = mode === 'sidebar';
    const v = X.view();
    const blank = '<div class="xcard">Nothing to show</div>';
    const time = o.time != null ? o.time : (X.defaults.time ? X.defaults.time(o) : blank);
    const roster = X.overviewPane ? X.overviewPane(o) : '';
    const work = X.work.html(o);
    /* round 13: the list is the Overview roster or Today (notes + time); the Overview button switches to the roster, its × back to Today */
    const shown = (k) => k === v || (v === 'today' && (k === 'notes' || k === 'time'));
    const pane = (k, html) => '<div class="xp-body" data-pane="' + k + '" data-scroll="xp-' + k + '"' + (shown(k) ? '' : ' hidden') + '>' + html + '</div>';
    const u = PSY.user();
    return '<aside class="xp" data-psy="panel" data-role="' + PSY.role() + '" aria-hidden="' + (side ? 'false' : 'true') + '" style="' + (side ? 'flex-basis:' + X.W + 'px;border-left-width:1px' : 'flex-basis:0px;opacity:0;border-left-width:0px') + '"><div class="xp-in">' +
      '<div class="xp-h">' + (PSY.assets.logoRev || '') + '<div class="xp-ctx">' + X.ctxHtml(o) + '</div>' +
      '<button class="xp-role" data-act="role-menu" title="View as" aria-label="View as: ' + PSY.esc(u.label) + '">' + PSY.esc(u.short) + '<span aria-hidden="true">▾</span></button>' +
      '<button class="xp-x" data-act="ext-close" title="Collapse Psyflo" aria-label="Collapse Psyflo">–</button></div>' +
      (PSY.scribe ? PSY.scribe.quickHtml(o) : '') +
      '<div class="xp-body xp-work" data-psy="work" data-scroll="xp-work"' + (work ? '' : ' hidden') + '>' + work + '</div>' +
      '<div class="xp-list" data-psy="xp-list" data-view="' + v + '"' + (work ? ' hidden' : '') + '>' +
        pane('overview', roster) +
        pane('notes', o.notes || '') +
        pane('time', time) +
      '</div>' +
      '<div class="xp-foot">' + (PSY.can('time') ? X.footTime(o) : '') + '<span class="live off" data-psy="live">' + (PSY.state.ext.paused ? 'Paused' : 'Ready') + '</span>' +
      (PSY.can('platform') ? '<button class="xp-open" data-act="open-platform" title="Open the Psyflo web platform in a new tab">Open Psyflo platform <span aria-hidden="true">↗</span></button>' : '') + '</div>' +
      '</div></aside>' + X.pillHtml(o) + X.focusHtml(o);
  };

  /* ---------------- Lauris page helper ---------------- */
  const LNAV = [['Consumers', 'lauris-consumers'], ['Authorizations', 'lauris-auths'], ['Approvals', 'lauris-approvals'], ['Add Session', 'lauris-add-session'], ['Saved Session', 'lauris-saved', 'saved'], ['Reports', 'lauris-reports'],
    ['User Information', 'lauris-user'], ['Time Tracker', 'lauris-time'], '-', ['Forms to Approve', 'lauris-forms', 'forms'], ['Rejected Forms', 'lauris-rejected', 'rejected'], ['Consumers w/o Authorizations', 'lauris-noauth', 'noauth']];
  PSY.lauris.counts = () => {
    const signedTW = PSY.flowRank() >= 5 ? 1 : 0; const mr = PSY.caseView('R-0411'); const signedMR = mr && mr.stage !== 'sign' ? 1 : 0;
    const noauth = PSY.data.lauris ? PSY.data.lauris.consumers.filter((c) => !c.units).length : 3;
    return { saved: 2, forms: 6 - signedTW - signedMR, rejected: 1, noauth };
  };
  const SHORT = { dss: 'K. Hale', lcs: 'J. Perez', admin: 'M. Wood' };
  Object.defineProperty(PSY.lauris, 'user', { configurable: true, get: () => ({ name: PSY.user().lauris, short: SHORT[PSY.role()] }) });
  /* opts: { active:'Consumers', main:'<html>', panel:{context,notes,time,review,tab,case} | false } */
  PSY.lauris.page = (o) => {
    const c = PSY.lauris.counts();
    /* round 8: Lauris itself hides authorization pages from direct support staff (the No-access page is owner C's) */
    const DSS_HIDE = ['lauris-auths', 'lauris-noauth'];
    const nav = LNAV.filter((n) => n === '-' || PSY.role() !== 'dss' || DSS_HIDE.indexOf(n[1]) < 0).map((n) => n === '-' ? '<div class="lnav-sep"></div>' : '<a class="lnav' + (n[0] === o.active ? ' on' : '') + '" data-go="' + n[1] + '">' + n[0] + (n[2] && c[n[2]] ? '<span class="b">' + c[n[2]] + '</span>' : '') + '</a>').join('');
    return '<div class="lz"><div class="lz-top"><span class="mk">»</span>Lauris Online<span class="rt"><span>Harvest Outreach Center · <b>' + PSY.lauris.user.name + '</b></span><span>Switch to Classic</span><span>Sign Out</span></span></div>' +
      '<div class="lz-body"><nav class="lz-nav" aria-label="Lauris menu">' + nav + '</nav><main class="lz-main ef" data-scroll="main">' + (o.main || '') + '</main>' + (o.panel === false ? '' : X.panelHtml(o.panel || {})) + '</div></div>';
  };

  /* ---------------- built-in actions ---------------- */
  PSY.acts['ext-close'] = () => X.set(false);
  PSY.acts['ext-open'] = () => X.set(true);
  PSY.acts['ext-focus'] = (el) => X.focus(el.getAttribute('data-flow'), el.getAttribute('data-case'));
  PSY.acts['xp-tab'] = (el) => X.tab(el.getAttribute('data-xp-tab'));
  PSY.acts['xp-view'] = (el) => X.setView(el.value);
  /* "View as": the three roles, like the RPM product's switcher */
  PSY.ui.roleMenu = () => {
    const cur = PSY.role();
    PSY.ui.modal({
      title: 'View as',
      body: '<div class="role-list" data-psy="role-list">' + PSY.ROLE_ORDER.map((k) => { const r = PSY.ROLES[k]; return '<button type="button" class="role-opt' + (k === cur ? ' on' : '') + '" data-role="' + k + '"><i>' + PSY.esc(r.ini) + '</i><span><b>' + PSY.esc(r.label) + '</b><small>' + PSY.esc(r.name) + ' · ' + PSY.esc(r.cred) + '</small></span>' + (k === cur ? '<em>✓</em>' : '') + '</button>'; }).join('') + '</div>',
      actions: [{ label: 'Close' }],
      onOpen: (m) => m.querySelectorAll('[data-role]').forEach((b) => b.addEventListener('click', () => { PSY.ui.closeModal(); PSY.setRole(b.getAttribute('data-role')); })),
    });
  };
  PSY.acts['role-menu'] = () => PSY.ui.roleMenu();
  PSY.acts['role-set'] = (el) => PSY.setRole(el.getAttribute('data-role'));
  PSY.acts['xp-pause'] = () => { PSY.state.ext.paused = !PSY.state.ext.paused; PSY.save(); const l = active.root.querySelector('[data-psy="live"]'); if (l) { l.textContent = PSY.state.ext.paused ? 'Paused' : 'Listening'; l.classList.toggle('off', !!PSY.state.ext.paused); } PSY.ui.toast(PSY.state.ext.paused ? 'Paused.' : 'Listening.'); };
  PSY.acts['open-platform'] = (el) => PSY.go(el.getAttribute('data-to') || 'home');
  PSY.acts['open-lauris'] = (el) => PSY.go(el.getAttribute('data-to') || 'lauris-consumers');
  PSY.acts['toast'] = (el) => PSY.ui.toast(el.getAttribute('data-msg') || 'Done.');
  PSY.acts['pf-loc'] = (el) => { PSY.state.prefs.locality = el.getAttribute('data-loc'); PSY.save(); PSY.refresh(); };
  PSY.acts['pf-bell'] = () => {
    const items = (PSY.state.log || []).slice(0, 6).map((l) => '<li><b>' + PSY.esc(l.t) + '</b><span>' + PSY.esc(l.case || '') + ' · ' + PSY.esc(l.text) + '</span></li>').join('') ||
      '<li><b>10:36 am</b><span>Read 3 forms from Lauris</span></li>';
    PSY.ui.modal({ title: 'Notifications', body: '<ul class="log">' + items + '</ul>' });
  };
  PSY.acts['demo-menu'] = () => PSY.ui.modal({ title: 'Demo data', body: '<p>Consumers appear as initials only.</p>', actions: [{ label: 'Close' }, { label: 'Reset demo data', primary: true, onClick: () => { PSY.reset(); PSY.ui.toast('Demo reset.'); } }] });
  $('#extBtn').addEventListener('click', () => { if (active && active.app === 'lauris') { PSY.state.ext.seen = true; X.toggle(); } else activateTab(tabs.find((t) => t.app === 'lauris') || tabs[0]); });
  $('#extTip').addEventListener('click', (e) => { e.stopPropagation(); PSY.state.ext.seen = true; X.set(true); });

  /* ---------------- Psyflo platform: sidebar + page frame ---------------- */
  const I = (p) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const PI = {
    dash: I('<rect x="4" y="4" width="6.5" height="6.5" rx="1.3"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.3"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.3"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.3"/>'),
    cases: I('<circle cx="12" cy="12" r="8"/><path d="M12 8.5v7M8.5 12h7"/>'),
    auth: I('<rect x="5" y="4.5" width="14" height="16" rx="2"/><path d="M9 4.5V3.5h6v1M8.5 12.5l2.2 2.2 4.3-4.6"/>'),
    intel: I('<path d="M12 4v16M6 20h12M5 7h14"/><path d="M7.5 7L4.5 13.5a3 3 0 0 0 6 0L7.5 7zM16.5 7l-3 6.5a3 3 0 0 0 6 0L16.5 7z"/>'),
    an: I('<path d="M5 20V10M12 20V5M19 20v-8"/>'),
    link: I('<path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/>'),
    payers: I('<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M10 20.5v-4h4v4"/>'),
    flask: I('<path d="M9.5 4h5M10.5 4v5.5L5.5 18a1.8 1.8 0 0 0 1.6 2.7h9.8a1.8 1.8 0 0 0 1.6-2.7l-5-8.5V4"/>'),
    gear: I('<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M6 6l1.6 1.6M16.4 16.4L18 18M18 6l-1.6 1.6M7.6 16.4L6 18"/>'),
    help: I('<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.6a2.4 2.4 0 1 1 3.4 2.2c-.8.4-1.1.9-1.1 1.7M12 16.6v.1"/>'),
    bell: I('<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5l1.5-1.5zM10 20.5h4"/>'),
  };
  PSY.platform.icons = PI;
  /* round 8 shared hooks: where a case opens in the platform (owner D may override), and where its Lauris document opens with Scan & Enhance (owner B) */
  PSY.platform.caseRoute = PSY.platform.caseRoute || ((cid) => 'case?case=' + cid);
  PSY.openCase = (cid) => PSY.go(PSY.platform.caseRoute(cid));
  /* round 8: two tabs. Overview, New Cases and Denial Intelligence fold into Authorizations (their old pages highlight it). */
  /* round 9: exactly three tabs, same prominence: Authorizations · Denial Intelligence · Analytics (Overview and New Cases fold into the first) */
  const NAV = [['auth', 'All Authorizations', 'auth-list', PI.auth, 'auth', 'auth'], ['di', 'Denial Intelligence', 'denials', PI.intel, 'di', 'denials'], ['an', 'Analytics', 'analytics', PI.an, 'an', 'analytics']];
  const NAV_ALIAS = { dash: 'auth', ref: 'auth' };
  PSY.ui.sidebar = (active) => {
    const c = PSY.counts(); active = NAV_ALIAS[active] || active; const u = PSY.user();
    const item = (k, label, to, icon, cnt) => '<a class="sb-i' + (k === active ? ' on' : '') + '" data-go="' + to + '">' + icon + label + (cnt ? '<span class="n">' + cnt + '</span>' : '') + '</a>';
    return '<aside class="sb"><div class="sb-logo">' + (PSY.assets.logo || 'psyflo') + '<small>SRA</small></div>' +
      '<div class="sb-sec">Main</div>' + NAV.filter((n) => PSY.can(n[5])).map((n) => item(n[0], n[1], n[2], n[3], c[n[4]])).join('') +
      '<div class="sb-gap"></div>' +
      '<a class="sb-small' + (active === 'settings' ? ' on' : '') + '" data-go="settings">' + PI.gear + 'Settings</a>' +
      '<a class="sb-small' + (active === 'help' ? ' on' : '') + '" data-go="help">' + PI.help + 'Help</a>' +
      '<button type="button" class="sb-user" data-act="role-menu" title="View as" aria-label="View as: ' + PSY.esc(u.label) + '"><i>' + PSY.esc(u.ini) + '</i><div><b>' + PSY.esc(u.name) + '</b><span>' + PSY.esc(u.label) + '</span></div><em aria-hidden="true">⌃</em></button></aside>';
  };
  /* the top bar of every platform page: AS OF + locality switch + demo chip + bell */
  PSY.platform.bar = () => {
    const loc = (PSY.state.prefs || {}).locality || 'both';
    const seg = [['both', 'Both localities'], ['campbell', 'Campbell County'], ['lynchburg', 'Lynchburg City']].map((x) => '<button class="' + (loc === x[0] ? 'on' : '') + '" data-act="pf-loc" data-loc="' + x[0] + '">' + x[1] + '</button>').join('');
    return '<div class="pf-bar"><span class="asof">AS OF</span><b>' + PSY.data.today + '</b><div class="seg">' + seg + '</div><span class="sp"></span><span class="pf-pill" title="Psyflo reads Lauris on screen, only when a page is open"><span class="src" style="font-size:13.5px;color:#1B1B19;font-weight:500">Read from Lauris<em>10:36 am</em></span></span>' + (PSY.can('flow') && PSY.flow && PSY.flow.barHtml ? PSY.flow.barHtml() : '') + '<button class="pf-ib" data-act="pf-bell" title="Notifications">' + PI.bell + '<span class="dot"></span></button></div>';
  };
  /* opts: { active, title, sub, actions, crumbs:[{label,go}], body, bar:false, wide:true } */
  PSY.platform.page = (o) => {
    if (!PSY.can('platform')) return '<div class="pf"><main class="pf-main"><div class="pf-noacc" data-psy="noaccess"><b>No access</b><span>' + PSY.esc(PSY.user().label) + '</span><button class="btn p" data-act="role-menu">View as…</button><button class="btn o" data-act="open-lauris">Back to Lauris</button></div></main></div>';
    const GATE = { an: ['analytics', 'Analytics'], di: ['denials', 'Denial Intelligence'], auth: ['auth', 'All Authorizations'] };
    const g = GATE[NAV_ALIAS[o.active] || o.active];
    if (g && !PSY.can(g[0])) o = Object.assign({}, o, { body: '<div class="pf-noacc" data-psy="noaccess"><b>No access</b><span>' + g[1] + '</span></div>', actions: '', title: g[1], sub: '', crumbs: null });
    const crumbs = o.crumbs ? '<div class="crumb">' + o.crumbs.map((c) => c.go ? '<a data-go="' + c.go + '">' + c.label + '</a>' : '<span>' + c.label + '</span>').join('<span>/</span>') + '</div>' : '';
    const head = o.title ? '<div class="pf-head"><div>' + crumbs + '<h1>' + o.title + '</h1>' + (o.sub ? '<p>' + o.sub + '</p>' : '') + '</div>' + (o.actions ? '<div class="pf-act">' + o.actions + '</div>' : '') + '</div>' : '';
    const flow = PSY.can('flow') && PSY.flow && PSY.flow.html ? PSY.flow.html(o) : ''; // round 11: the FLO data agent (owner FLOW11)
    return '<div class="pf">' + PSY.ui.sidebar(o.active) + flow + '<main class="pf-main">' + (o.bar === false ? '' : PSY.platform.bar()) + '<div class="pf-page"' + (o.wide ? ' style="max-width:none"' : '') + '>' + head + (o.body || '') + '</div></main></div>';
  };

  /* ---------------- boot ---------------- */
  PSY.boot = () => {
    PSY.state.ext.open = false; PSY.state.ext.mode = 'collapsed'; PSY.state.ext.seen = false; PSY.state.ext.tab = null; // Lauris always starts with Psyflo collapsed
    fit();
    if (PSY.presenter) PSY.presenter.ui();
    const r = parseHash();
    PSY.go('lauris-consumers', {}, { replace: true });
    if (r && r.id !== 'lauris-consumers') PSY.go(r.id, r.params);
  };
})();
