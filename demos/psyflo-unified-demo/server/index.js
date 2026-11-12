// Psyflo × Harvest demo server. One process, three origins:
//   APP_PORT  (4000) Psyflo app, portals, phone, panel, API
//   LAURIS_PORT (4001) mock Lauris Online
//   EXT_PORT  (4002) mock Availity / UHC portal / state incident portal / DMAS lookup
//
// Authority (DEMO-GRADE, see server/psyflo/session.js): POST /api/session -> token; every /api/do and /api/state call resolves the
// actor from the token; unknown or missing = 401, except the allow-lists in server/psyflo/authz.js (portal-token actions and the
// page bridge). /api/state is role-projected (server/psyflo/project.js). Environment: DEMO_PRESENTER=0 turns presenter mode off,
// PRESENTER_PIN requires a PIN for it, DEMO_TIME=HH:MM fixes the time of day (tests), ALLOWED_ORIGINS adds CORS origins.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { serveStatic, json, readBody, cors, sseHub, notFound } from './util.js';
import { store, FILES_DIR } from './psyflo/store.js';
import { laurisHandler } from './lauris/site.js';
import { lauris } from './lauris/store.js';
import { externalHandler } from './external/site.js';
import { attest } from './attest.js';
import { createSession, actorFromToken, tokenFrom, signOut, publicActor, presenterEnabled } from './psyflo/session.js';
import { authorize, registerAuthz, Denied } from './psyflo/authz.js';
import { projectState, publicState, registerProjection } from './psyflo/project.js';
import { Refusal } from './psyflo/gates.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');
const APP_PORT = +(process.env.APP_PORT || 4000), LAURIS_PORT = +(process.env.LAURIS_PORT || 4001), EXT_PORT = +(process.env.EXT_PORT || 4002);
process.env.APP_PORT = String(APP_PORT);

// load every action module: default = actions; optional named exports `authz`, `projection`, `hooks`
const actDir = path.join(ROOT, 'server', 'psyflo', 'actions');
for (const f of fs.readdirSync(actDir).filter(f => f.endsWith('.js')).sort()) {
  const mod = await import(pathToFileURL(path.join(actDir, f)).href);
  store.register(mod.default);
  if (mod.authz) registerAuthz(mod.authz);
  if (mod.projection) registerProjection(mod.projection);
  if (mod.hooks) for (const [name, fn] of Object.entries(mod.hooks)) store.hooks.on(name, fn);
}

// ONE clock: Lauris reads Psyflo's store.clock; a reset or a day advance moves both
lauris.setClock(() => store.now());
store.hooks.on('reset', ({ preset }) => { lauris.reset(preset); attest.reset(); });
store.hooks.on('advance', () => lauris.syncToday());
store.hooks.on('scenario', ({ id }) => lauris.scenario(id));
attest.lauris = ev => lauris.verify(ev);
store.laurisFixture = lauris;   // fixtures (demo.scenario) build both stores through the same internal actions the UI path runs
lauris.syncToday();

// the extension ships its own copy of the page bridge (content scripts must be packaged files)
try { fs.copyFileSync(path.join(WEB, 'panel', 'bridge.js'), path.join(ROOT, 'extension', 'bridge.js')); } catch (e) { console.warn('could not copy bridge.js into extension/', e.message); }

const hub = sseHub();
store.listeners.add(st => hub.send('state', { rev: st.rev }));

// ---- origins: the app, Lauris and the portals on this host, extension pages, and ALLOWED_ORIGINS ----
const extraOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
function originAllowed(origin) {
  if (!origin) return true;
  if (/^chrome-extension:\/\//.test(origin)) return true;
  if (extraOrigins.includes(origin)) return true;
  try { const u = new URL(origin); return [APP_PORT, LAURIS_PORT, EXT_PORT].includes(+u.port || (u.protocol === 'https:' ? 443 : 80)) && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) || (u.hostname === (process.env.PUBLIC_HOST || '') && !!process.env.PUBLIC_HOST); } catch { return false; }
}

// "How the data gets in" notes: seed/notes.md, then every seed/notes/*.md in name order; a later section for the same screen wins
function notesMarkdown() {
  const parts = [];
  try { parts.push(fs.readFileSync(path.join(ROOT, 'seed', 'notes.md'), 'utf8')); } catch { }
  const dir = path.join(ROOT, 'seed', 'notes');
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()) { try { parts.push(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { } }
  return parts.map(p => p.replace(/\s+$/, '')).join('\n\n') + '\n';
}

const sendErr = (res, status, error, extra = {}) => json(res, { ok: false, error, ...extra }, status);

const app = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (cors(req, res, originAllowed)) return;
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    const s = store.state;
    if (p === '/api/state') {
      const actor = actorFromToken(s, tokenFrom(req));
      if (!actor) return sendErr(res, 401, 'Sign in first.', { signin: true });
      res.setHeader('X-Psyflo-Rev', String(s.rev));
      return json(res, projectState(s, actor));
    }
    if (p === '/api/stream') return hub.attach(req, res);
    if (p === '/api/config') return json(res, { laurisURL: process.env.LAURIS_URL || `${proto(req)}://${host(req)}:${LAURIS_PORT}`, extURL: process.env.EXT_URL || `${proto(req)}://${host(req)}:${EXT_PORT}`, appURL: `${proto(req)}://${req.headers.host}`, presenter: presenterEnabled(), pin: !!process.env.PRESENTER_PIN, demo: true });
    // who can sign in (names and roles only): the sign-in screen and the presenter dock read it
    if (p === '/api/roster') return json(res, publicState(s));
    if (p === '/api/session') {
      if (origin && !originAllowed(origin)) return sendErr(res, 403, 'Origin not allowed');
      if (req.method === 'GET') { const a = actorFromToken(s, tokenFrom(req)); return json(res, { ok: true, actor: publicActor(a) }, a ? 200 : 401); }
      if (req.method !== 'POST') return sendErr(res, 405, 'POST to sign in');
      if (!/^application\/json/i.test(req.headers['content-type'] || '')) return sendErr(res, 415, 'Send JSON');
      const body = JSON.parse(await readBody(req) || '{}');
      if (body.signOut) { signOut(tokenFrom(req)); res.setHeader('Set-Cookie', 'psyflo_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'); return json(res, { ok: true }); }
      try {
        const { token, actor } = createSession(s, body);
        res.setHeader('Set-Cookie', `psyflo_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`);
        return json(res, { ok: true, token, actor: publicActor(actor), presenter: !!actor.presenter });
      } catch (e) { return sendErr(res, e.status || 400, e.message, e.pin ? { pin_required: true } : {}); }
    }
    if (p === '/api/do' && req.method === 'POST') {
      // state-changing calls: JSON only (a cross-origin form post cannot send it) and only from a listed origin
      if (origin && !originAllowed(origin)) return sendErr(res, 403, 'Origin not allowed');
      if (!/^application\/json/i.test(req.headers['content-type'] || '')) return sendErr(res, 415, 'Send application/json.');
      let body; try { body = JSON.parse(await readBody(req) || '{}'); } catch { return sendErr(res, 400, 'Bad JSON'); }
      const { action, args } = body;
      if (!action || typeof action !== 'string') return sendErr(res, 400, 'No action');
      const actor = actorFromToken(store.state, tokenFrom(req));
      let ctx;
      try { ctx = authorize(store.state, action, args || {}, actor); }
      catch (e) {
        if (e instanceof Denied) return sendErr(res, e.status, e.message);
        if (e instanceof Refusal) { return sendErr(res, e.status || 409, e.message, { refused: true }); }
        throw e;
      }
      try { const result = await store.run(action, args || {}, ctx); return json(res, { ok: true, result, rev: store.state.rev }); }
      catch (e) { return sendErr(res, e instanceof Refusal ? e.status || 409 : 400, e.message, e instanceof Refusal ? { refused: true, code: e.code } : {}); }
    }
    if (p.startsWith('/files/')) {
      const actor = actorFromToken(store.state, tokenFrom(req));
      if (!actor) { res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Sign in to open this file.'); }
      const f = path.basename(decodeURIComponent(p.slice(7)));
      const allowed = projectState(store.state, actor).files.some(x => x.url === '/files/' + f);
      if (!allowed) { res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Your role cannot open this file.'); }
      const full = path.join(FILES_DIR, f);
      if (!fs.existsSync(full)) return notFound(res);
      res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${f.split('__').pop()}"`, 'Cache-Control': 'private, no-store' });
      return fs.createReadStream(full).pipe(res);
    }
    if (p === '/seed/notes.md') { res.writeHead(200, { 'Content-Type': 'text/markdown; charset=utf-8', 'Cache-Control': 'no-store' }); return res.end(notesMarkdown()); }
    // the scripted screening call is a transcript: signed-in staff only (header or the session cookie)
    if (p.startsWith('/seed/scripts/')) { if (!actorFromToken(store.state, tokenFrom(req))) { res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Sign in first.'); } return serveStatic(res, path.join(ROOT, 'seed'), p.slice(5)); }
    // portal and phone deep links are routes inside the single-page app
    if (/^\/(app|f|parent|school|phone)(\/|$)/.test(p)) return serveStatic(res, WEB, '/index.html');
    return serveStatic(res, WEB, p);
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end(String(e.message));
  }
});
const proto = req => req.headers['x-forwarded-proto'] || 'http';
const host = req => (req.headers.host || 'localhost').split(':')[0];

const laurisSrv = http.createServer((req, res) => laurisHandler(req, res).catch(e => { console.error(e); res.writeHead(500); res.end(e.message); }));
const extSrv = http.createServer((req, res) => externalHandler(req, res).catch(e => { console.error(e); res.writeHead(500); res.end(e.message); }));

app.listen(APP_PORT, () => console.log(`Psyflo app     http://localhost:${APP_PORT}`));
laurisSrv.listen(LAURIS_PORT, () => console.log(`Mock Lauris    http://localhost:${LAURIS_PORT}`));
extSrv.listen(EXT_PORT, () => console.log(`Mock portals   http://localhost:${EXT_PORT}  (Availity, UHC, state portal, DMAS)`));
