// Psyflo × Harvest demo server. One process, three origins:
//   APP_PORT  (4000) Psyflo app, portals, phone, panel, API
//   LAURIS_PORT (4001) mock Lauris Online
//   EXT_PORT  (4002) mock Availity / UHC portal / state incident portal / DMAS lookup
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { serveStatic, json, readBody, cors, sseHub, notFound } from './util.js';
import { store, FILES_DIR } from './psyflo/store.js';
import { laurisHandler } from './lauris/site.js';
import { lauris } from './lauris/store.js';
import { externalHandler } from './external/site.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');
const APP_PORT = +(process.env.APP_PORT || 4000), LAURIS_PORT = +(process.env.LAURIS_PORT || 4001), EXT_PORT = +(process.env.EXT_PORT || 4002);
process.env.APP_PORT = String(APP_PORT);

// load every action module
const actDir = path.join(ROOT, 'server', 'psyflo', 'actions');
for (const f of fs.readdirSync(actDir).filter(f => f.endsWith('.js')).sort()) {
  const mod = await import(pathToFileURL(path.join(actDir, f)).href);
  store.register(mod.default);
}

// the extension ships its own copy of the page bridge (content scripts must be packaged files)
try { fs.copyFileSync(path.join(WEB, 'panel', 'bridge.js'), path.join(ROOT, 'extension', 'bridge.js')); } catch (e) { console.warn('could not copy bridge.js into extension/', e.message); }

const hub = sseHub();
store.listeners.add(st => hub.send('state', { rev: st.rev }));

const app = http.createServer(async (req, res) => {
  if (cors(req, res)) return;
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (p === '/api/state') return json(res, store.state);
    if (p === '/api/stream') return hub.attach(req, res);
    if (p === '/api/config') return json(res, { laurisURL: process.env.LAURIS_URL || `${proto(req)}://${host(req)}:${LAURIS_PORT}`, extURL: process.env.EXT_URL || `${proto(req)}://${host(req)}:${EXT_PORT}`, appURL: `${proto(req)}://${req.headers.host}` });
    if (p === '/api/do' && req.method === 'POST') {
      const { action, args } = JSON.parse(await readBody(req) || '{}');
      if (action === 'demo.reset') lauris.reset(args?.preset || 'live');
      try { const result = await store.run(action, args || {}); return json(res, { ok: true, result, rev: store.state.rev }); }
      catch (e) { return json(res, { ok: false, error: e.message }, 400); }
    }
    if (p.startsWith('/files/')) {
      const f = path.basename(decodeURIComponent(p.slice(7)));
      const full = path.join(FILES_DIR, f);
      if (!fs.existsSync(full)) return notFound(res);
      res.writeHead(200, { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${f.split('__').pop()}"` });
      return fs.createReadStream(full).pipe(res);
    }
    if (p === '/seed/notes.md' || p.startsWith('/seed/scripts/')) return serveStatic(res, path.join(ROOT, 'seed'), p.slice(5));
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
