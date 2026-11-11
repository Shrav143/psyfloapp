// Client for the Psyflo store. One shared state, live across every open tab via server-sent events.
//
// DEMO-GRADE sessions (server/psyflo/session.js): signIn(staffId, {presenter}) -> the server returns a token; every call sends it in
// the X-Psyflo-Session header and /api/state returns the state projected for that person's role. Exports:
//   api.state  api.config  api.init(base)  api.refresh()  api.onChange(fn)  api.do(action, args)  (unchanged)
//   api.signIn(staffId, {presenter, pin})     staff session; refreshes state and repaints listeners
//   api.signInPortal(token)                    guardian (family link token) or school user (school token)
//   api.signInAs({portalClient|schoolUser}, {presenter})   presenter views a portal as that person
//   api.signOut()                              ends the session; state falls back to the public roster
//   api.session()                              the actor { kind, id, role, name, presenter, designations... } or null
//   api.roster()                               [{id, name, initials, role, ...}] for the sign-in screen (works signed out)
//   api.token                                  the current token (for links that cannot send a header: /files uses the cookie)
//
// Lazy sign-in so the old shell keeps working: when no token exists but localStorage.psyflo_user holds a staff id, signIn() is called for
// it; portal URLs (/f/<token>, /parent/<token>/...) sign the guardian in from the token.
//
// PRESENTER IS AN EXPLICIT ELEVATION, never a default. Every sign-in this file makes on its own (lazy, legacy, Login role cards) is
// presenter:false; a presenter session comes only from the dock (or a test) calling signIn(id, {presenter:true, pin}). The server grants it when
// DEMO_PRESENTER is not 0 and, if PRESENTER_PIN is set, the pin matches. When a PIN is needed and none is given, the shell's askPin hook
// (api.askPin = async reason => pin | null) is asked; the PIN is remembered for this browser (never sent unless a presenter session is asked for).
// A write to localStorage.psyflo_user never replaces a session that exists. The hosted preview (window.__HOSTED__) is presenter on purpose.
// The Lauris panel (an iframe) keeps its own session in sessionStorage: the panel signs in as the Lauris user on the open page.
const listeners = new Set();
const KEY = 'psyflo_session';
const framed = window.__HOSTED__ ? !window.__VROOT : (() => { try { return window.top !== window; } catch { return true; } })();   // hosted preview: only its srcdoc frames (the panel) count as framed
const box = () => { try { return framed ? sessionStorage : localStorage; } catch { return null; } };
const load = () => { try { return JSON.parse(box().getItem(KEY) || 'null'); } catch { return null; } };
const save = rec => { try { rec ? box().setItem(KEY, JSON.stringify(rec)) : box().removeItem(KEY); } catch { } };
const legacyUser = () => { try { return framed ? null : localStorage.getItem('psyflo_user'); } catch { return null; } };
const PIN_KEY = 'psyflo_pin';
const pinGet = () => { try { return localStorage.getItem(PIN_KEY) || ''; } catch { return ''; } };
const pinSet = p => { try { p ? localStorage.setItem(PIN_KEY, p) : localStorage.removeItem(PIN_KEY); } catch { } };
const hostedPresenter = () => !!window.__HOSTED__;   // the hosted preview signs everyone in as a presenter on purpose (no PIN there)
const fail = (j, fallback) => Object.assign(new Error(j.error || fallback), { status: j.status, pin_required: !!j.pin_required });

export const api = {
  state: null, config: null, base: '', token: null, actor: null, _roster: null, _busy: null, _hooked: false, askPin: null,
  async init(base = '') {
    this.base = base;
    this.config = await fetch(base + '/api/config').then(r => r.json());
    const rec = load();
    if (rec && rec.token) { this.token = rec.token; this.actor = rec.actor || null; }
    await this._ensureSession();
    await this.refresh(true);
    this._watchLegacy();
    try {
      const es = new EventSource(base + '/api/stream');
      es.addEventListener('state', async e => { const { rev } = JSON.parse(e.data); if (!this.state || rev !== this.state.rev) await this.refresh(); });
    } catch { /* no SSE: polling below */ }
    setInterval(() => this.refresh(true), 15000);
    return this;
  },
  headers(extra = {}) { return this.token ? { 'X-Psyflo-Session': this.token, ...extra } : extra; },
  session() { return this.actor; },
  roster() { return (this._roster || (this.state && this.state.staff) || []); },
  // { enabled, pin_required }: from the public roster, else the config (the dock asks for a PIN only when one is needed)
  presenterInfo() { const p = (this.state && this.state.presenter) || this._presenter; return p || { enabled: !!(this.config && this.config.presenter), pin_required: !!(this.config && this.config.pin) }; },

  // find a way to be signed in without asking: stored token, the old shell's staff id, or a portal link in the address
  async _ensureSession() {
    if (this.token) return;
    const p = location.pathname; let m;
    try {
      if ((m = p.match(/^\/f\/([\w-]+)/)) || (m = p.match(/^\/parent\/([\w-]+)/))) { await this.signInPortal(m[1], { quiet: true }); return; }
      if ((m = p.match(/^\/school\/([\w-]+)/)) && m[1] !== 'index.html') { await this.signInPortal(m[1], { quiet: true }); return; }
    } catch { /* an expired link: the screen shows it */ }
    // A portal session is NEVER created silently from a bare hash (#/ParentProgress?c=MR, #/SchoolPortal): it comes from a real family-link token
    // in the address (above), a school login, or a deliberate presenter view (a staff session in this browser or the dock, through signInAs, which
    // the shell does). Only the hosted preview, a presenter demo with no staff login in front of it, opens the portal screens by hash.
    const hash = location.hash || ''; let h;
    try {
      if (hostedPresenter() && !framed && (h = hash.match(/^#\/(Parent\w+|FamilyLink|AppealLetter)(?:\?(.*))?$/))) {
        const c = new URLSearchParams(h[2] || '').get('c') || 'TW';
        await this.signInAs({ portalClient: c }, { presenter: true, quiet: true, lazy: true }); return;
      }
      if (hostedPresenter() && !framed && /^#\/(SchoolPortal|ReferralForm|ReferralSent)\b/.test(hash)) {
        let u = 'rbell'; try { u = localStorage.getItem('psyflo_school_user') || 'rbell'; } catch { }
        await this.signInAs({ schoolUser: u }, { presenter: true, quiet: true, lazy: true }); return;
      }
    } catch { }
    const id = legacyUser();
    if (id) { try { await this.signIn(id, { presenter: hostedPresenter(), quiet: true, lazy: true }); } catch { } }
  },
  // the old shell sets localStorage.psyflo_user on sign-in / sign-out: follow it
  _watchLegacy() {
    if (this._hooked || framed) return; this._hooked = true;
    try {
      const set = Storage.prototype.setItem, rem = Storage.prototype.removeItem;
      Storage.prototype.setItem = function (k, v) { set.call(this, k, v); if (this === localStorage && k === 'psyflo_user') api._legacyChanged(v); };
      Storage.prototype.removeItem = function (k) { rem.call(this, k); if (this === localStorage && k === 'psyflo_user') api._legacyChanged(null); };
    } catch { }
  },
  // A page with NO session picks the role the old shell wrote (the same as choosing it on the Login screen: demo identity has no credential).
  // A session that exists is never replaced by a localStorage write, and nothing here asks for presenter mode.
  async _legacyChanged(id) {
    try {
      if (id && !this.actor && !(load() && load().token)) await this.signIn(id, { presenter: hostedPresenter(), quiet: true, lazy: true });   // a stored session (a test or another tab wrote one) is never overwritten by a plain sign-in
      else if (!id && this.actor && this.actor.kind === 'staff') await this.signOut({ quiet: true });
    } catch { }
  },
  async _post(path, body) {
    const r = await fetch(this.base + path, { method: 'POST', headers: this.headers({ 'Content-Type': 'application/json' }), body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({ ok: false, error: 'Bad reply' }));
    return { status: r.status, ...j };
  },
  async _adopt(j, quiet) {
    this.token = j.token; this.actor = j.actor || null;
    save({ token: j.token, actor: j.actor });
    await this.refresh(true);
    for (const l of listeners) l(this.state);   // repaint whoever is listening (the shell, the panel)
    return this.actor;
  },
  // POST /api/session. A presenter request carries the remembered PIN; when the server says a PIN is needed the shell is asked (unless lazy).
  async _session(body, { lazy } = {}) {
    const wants = body.presenter === true;
    const send = pin => this._post('/api/session', wants && pin ? { ...body, pin } : { ...body, pin: undefined });
    let pin = (wants && (body.pin || pinGet())) || '';
    let j = await send(pin);
    for (let n = 0; wants && !j.ok && j.pin_required && !lazy && typeof this.askPin === 'function' && n < 3; n++) {
      const p = await this.askPin(n || pin ? 'That PIN did not match. Try again.' : '');
      if (p == null) break;
      pin = String(p); j = await send(pin);
    }
    if (j.ok && wants && pin) pinSet(pin); else if (wants && j.pin_required) pinSet('');
    if (!j.ok) throw fail(j, 'Sign-in failed');
    return j;
  },
  async signIn(staffId, { presenter = hostedPresenter(), pin, quiet, lazy } = {}) {
    return this._adopt(await this._session({ staffId, presenter: !!presenter, pin }, { lazy }), quiet);
  },
  async signInPortal(portalToken, { quiet } = {}) {
    const j = await this._post('/api/session', { portalToken });
    if (!j.ok) throw fail(j, 'This link is not valid any more');
    return this._adopt(j, quiet);
  },
  // presenter views a portal as that person (needs presenter mode: the server refuses it otherwise)
  async signInAs(who, { presenter = true, pin, quiet, lazy } = {}) {
    return this._adopt(await this._session({ ...who, presenter: !!presenter, pin }, { lazy }), quiet);
  },
  async signOut({ quiet } = {}) {
    try { await this._post('/api/session', { signOut: true }); } catch { }
    this.token = null; this.actor = null; save(null);
    await this.refresh(true);
    for (const l of listeners) l(this.state);
  },

  async refresh(quiet) {
    let s = null;
    if (this.token) {
      const r = await fetch(this.base + '/api/state', { headers: this.headers() }).catch(() => null);
      if (r && r.status === 401) { this.token = null; this.actor = null; save(null); }
      else if (r && r.ok) s = await r.json().catch(() => null);
      else if (!r) return;
    }
    if (!s) s = await fetch(this.base + '/api/roster').then(r => r.json()).catch(() => null);   // signed out: the roster only
    if (!s) return;
    this._roster = s.staff && s.public ? s.staff : this._roster;
    if (s.public && s.presenter) this._presenter = s.presenter;
    const changed = !this.state || s.rev !== this.state.rev || !!s.public !== !!this.state.public;
    this.state = s;
    if (changed || !quiet) for (const l of listeners) l(s);
  },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  async do(action, args = {}) {
    if (!this.token) await this._ensureSession();
    const r = await fetch(this.base + '/api/do', { method: 'POST', headers: this.headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ action, args }) });
    const j = await r.json().catch(() => ({ ok: false, error: 'Bad reply from the server' }));
    if (!j.ok) {
      if (r.status === 401 && this.token) { this.token = null; this.actor = null; save(null); await this.refresh(true); }
      const e = new Error(j.error || 'Action failed'); e.status = r.status; e.refused = !!j.refused; e.code = j.code; throw e;
    }
    await this.refresh();
    return j.result;
  }
};
