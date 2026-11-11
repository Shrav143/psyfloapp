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
// it (changes to that key are picked up too); portal URLs (/f/<token>, /parent/<token>/...) sign the guardian in from the token.
// The Lauris panel (an iframe) keeps its own session in sessionStorage: the panel signs in as the Lauris user on the open page.
const listeners = new Set();
const KEY = 'psyflo_session';
const framed = window.__HOSTED__ ? !window.__VROOT : (() => { try { return window.top !== window; } catch { return true; } })();   // hosted preview: only its srcdoc frames (the panel) count as framed
const box = () => { try { return framed ? sessionStorage : localStorage; } catch { return null; } };
const load = () => { try { return JSON.parse(box().getItem(KEY) || 'null'); } catch { return null; } };
const save = rec => { try { rec ? box().setItem(KEY, JSON.stringify(rec)) : box().removeItem(KEY); } catch { } };
const legacyUser = () => { try { return framed ? null : localStorage.getItem('psyflo_user'); } catch { return null; } };

export const api = {
  state: null, config: null, base: '', token: null, actor: null, _roster: null, _busy: null, _hooked: false,
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

  // find a way to be signed in without asking: stored token, the old shell's staff id, or a portal link in the address
  async _ensureSession() {
    if (this.token) return;
    const p = location.pathname; let m;
    try {
      if ((m = p.match(/^\/f\/([\w-]+)/)) || (m = p.match(/^\/parent\/([\w-]+)/))) { await this.signInPortal(m[1], { quiet: true }); return; }
      if ((m = p.match(/^\/school\/([\w-]+)/)) && m[1] !== 'index.html') { await this.signInPortal(m[1], { quiet: true }); return; }
    } catch { /* an expired link: the screen shows it */ }
    const hash = location.hash || ''; let h;
    try {
      // demo presenter views (no token in the address): ?c=<child> on a family screen, the school portal screens
      if (!framed && (h = hash.match(/^#\/(Parent\w+|FamilyLink|AppealLetter)(?:\?(.*))?$/))) {
        const c = new URLSearchParams(h[2] || '').get('c') || 'TW';
        await this.signInAs({ portalClient: c }, { presenter: true, quiet: true }); return;
      }
      if (!framed && /^#\/(SchoolPortal|ReferralForm|ReferralSent)\b/.test(hash)) {
        let u = 'rbell'; try { u = localStorage.getItem('psyflo_school_user') || 'rbell'; } catch { }
        await this.signInAs({ schoolUser: u }, { presenter: true, quiet: true }); return;
      }
    } catch { }
    const id = legacyUser();
    if (id) { try { await this.signIn(id, { presenter: true, quiet: true }); } catch { } }
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
  async _legacyChanged(id) {
    try {
      if (id && (!this.actor || this.actor.id !== id)) await this.signIn(id, { presenter: true, quiet: true });
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
  async signIn(staffId, { presenter = false, pin, quiet } = {}) {
    const j = await this._post('/api/session', { staffId, presenter, pin });
    if (!j.ok) throw new Error(j.error || 'Sign-in failed');
    return this._adopt(j, quiet);
  },
  async signInPortal(portalToken, { quiet } = {}) {
    const j = await this._post('/api/session', { portalToken });
    if (!j.ok) throw new Error(j.error || 'This link is not valid any more');
    return this._adopt(j, quiet);
  },
  async signInAs(who, { presenter = true, pin, quiet } = {}) {
    const j = await this._post('/api/session', { ...who, presenter, pin });
    if (!j.ok) throw new Error(j.error || 'Sign-in failed');
    return this._adopt(j, quiet);
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
