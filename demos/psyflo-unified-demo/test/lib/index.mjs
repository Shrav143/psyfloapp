// Shared test library. Every suite is one process: `node test/<name>.mjs` with env BASE (app URL), optionally LAURIS, EXT, PW (Playwright path),
// SHOTS (screenshot folder). test/run-all.mjs starts a fresh server per suite and sets them. Fail closed: nothing here talks to a server
// that is not at BASE.
//
//   as            = a staff id ('jperez'), 'id+p' for a presenter session ('dowens+p'), {portalToken}, {token}, or null/undefined (anonymous)
//   api(action, args, as)     result, or throws an Error with .status / .refused / .code
//   tryApi(...)               { ok, status, error, result, refused, code } (never throws)
//   state(as)                 the role-projected /api/state for that session (throws when anonymous: 401)
//   reset(preset)             demo.reset as a presenter; waits for it
//   login(page, staffId, {presenter, hash})   signs the browser in (token in localStorage, same keys as web/js/api.js). Presenter is requested
//                             explicitly (default true here, pass {presenter:false} for a plain role session); the page itself never asks for it.
//   suite(name)               .test(title, fn) .skip(title, why) .done(): prints PASS/FAIL lines and a RESULT line; exit code 1 on any FAIL
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

export const BASE = (process.env.BASE || 'http://localhost:4000').replace(/\/$/, '');
const bump = n => BASE.replace(/:(\d+)$/, (m, p) => ':' + (+p + n));
export const LAURIS = (process.env.LAURIS || bump(1)).replace(/\/$/, '');
export const EXT = (process.env.EXT || bump(2)).replace(/\/$/, '');
export const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'psyflo-shots');
fs.mkdirSync(SHOTS, { recursive: true });
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function playwright() {
  const cands = [process.env.PW, '/opt/node22/lib/node_modules/playwright', '/opt/node-tools/node_modules/playwright', 'playwright'].filter(Boolean);
  for (const c of cands) { try { return createRequire(import.meta.url)(c); } catch { } }
  throw new Error('Playwright not found; set PW=/path/to/playwright');
}

// ---- sessions and the API ----
const cache = new Map();
async function post(p, body, token) {
  const r = await fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Psyflo-Session': token } : {}) }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ ok: false, error: 'not json' }));
  return { status: r.status, ...j };
}
export async function session(as) {
  if (!as) return null;
  if (typeof as === 'object') {
    if (as.token) return { token: as.token };
    const key = 'portal:' + as.portalToken; if (cache.has(key)) return cache.get(key);
    const j = await post('/api/session', { portalToken: as.portalToken }); if (!j.ok) throw new Error('portal sign-in: ' + j.error);
    cache.set(key, j); return j;
  }
  if (cache.has(as)) return cache.get(as);
  const [id, flag] = String(as).split('+'); const presenter = flag === 'p';
  const j = await post('/api/session', { staffId: id, presenter, pin: presenter ? process.env.PRESENTER_PIN : undefined }); if (!j.ok) throw new Error(`sign-in as ${as}: ${j.error}`);
  cache.set(as, j); return j;
}
export const forgetSessions = () => cache.clear();
export async function tryApi(action, args = {}, as) {
  const s = await session(as);
  const j = await post('/api/do', { action, args }, s && s.token);
  return j;
}
export async function api(action, args = {}, as) {
  const j = await tryApi(action, args, as);
  if (!j.ok) { const e = new Error(`${action}: ${j.error}`); e.status = j.status; e.refused = !!j.refused; e.code = j.code; throw e; }
  return j.result;
}
export async function state(as) {
  const s = await session(as);
  const r = await fetch(BASE + '/api/state', { headers: s ? { 'X-Psyflo-Session': s.token } : {} });
  if (!r.ok) { const e = new Error('state: ' + r.status); e.status = r.status; throw e; }
  return r.json();
}
export async function reset(preset = 'live') { const r = await api('demo.reset', { preset }, 'dowens+p'); forgetSessions(); return r; }
export async function advance(days = 1, calendar = false) { return api('demo.advanceDay', { days, calendar }, 'dowens+p'); }

// ---- the mock Lauris over HTTP (what a person's browser would do) ----
export async function lget(p, user) {
  const r = await fetch(LAURIS + p, { headers: { cookie: 'lauris_user=' + user }, redirect: 'manual' });
  return { status: r.status, loc: r.headers.get('location'), text: await r.text() };
}
export async function lpost(p, user, form) {
  const r = await fetch(LAURIS + p, { method: 'POST', headers: { cookie: 'lauris_user=' + user, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form), redirect: 'manual' });
  return { status: r.status, loc: r.headers.get('location'), text: await r.text() };
}
// what the page bridge reports after a person's click (same shape as web/panel/bridge.js)
export async function bridge(action, args) {
  const r = await fetch(BASE + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: LAURIS }, body: JSON.stringify({ action, args }) });
  return { status: r.status, ...(await r.json().catch(() => ({}))) };
}

// ---- browser ----
export async function login(page, staffId, { presenter = true, hash = '/Login' } = {}) {
  await page.goto(BASE + '/#' + hash);
  await page.evaluate(async ({ id, presenter, pin }) => {
    const r = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staffId: id, presenter, pin: presenter ? pin : undefined }) });
    const j = await r.json(); if (!j.ok) throw new Error(j.error);
    localStorage.setItem('psyflo_session', JSON.stringify({ token: j.token, actor: j.actor }));
    localStorage.setItem('psyflo_user', id);   // the old shell reads this key; the new shell reads psyflo_session
  }, { id: staffId, presenter, pin: process.env.PRESENTER_PIN || '' });
  // the running page still holds the signed-out roster; reload so api.init() adopts the stored token and loads the projected state BEFORE
  // any route renders (without it a following hash navigation can paint a screen from the roster: "reading 'initials'" on the phone)
  await page.reload();
  await page.waitForFunction(() => window.psyflo && window.psyflo.session && window.psyflo.session.user, null, { timeout: 10000 }).catch(() => { });
  return page;
}
// page errors and unexpected failed requests (the controllers for screens that have none, js/screens/Ext*.js, 404 by design)
export function errors(page) {
  const list = [];
  page.on('pageerror', e => list.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) list.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/\/js\/screens\/Ext\w+\.js$|favicon/.test(r.url()) && !(r.status() === 401 && /\/api\/(state|session)/.test(r.url()))) list.push(`HTTP ${r.status()} ${r.url()}`); });
  return list;
}

// ---- assertions and suites ----
export class AssertionFailed extends Error { }
export const assert = {
  ok(cond, msg = 'expected a truthy value') { if (!cond) throw new AssertionFailed(msg); },
  eq(a, b, msg = '') { if (a !== b) throw new AssertionFailed(`${msg} expected ${JSON.stringify(b)} but got ${JSON.stringify(a)}`.trim()); },
  deepEq(a, b, msg = '') { if (JSON.stringify(a) !== JSON.stringify(b)) throw new AssertionFailed(`${msg} expected ${JSON.stringify(b)} but got ${JSON.stringify(a)}`.trim()); },
  match(s, re, msg = '') { if (!re.test(String(s))) throw new AssertionFailed(`${msg} ${JSON.stringify(String(s).slice(0, 160))} does not match ${re}`.trim()); },
  noMatch(s, re, msg = '') { if (re.test(String(s))) throw new AssertionFailed(`${msg} ${JSON.stringify(String(s).slice(0, 160))} matches ${re}`.trim()); },
  // the call must be refused (status 4xx, ok:false); optionally with a message pattern and/or exact status
  async refused(promise, re, status) {
    const j = await promise;
    if (j.ok) throw new AssertionFailed('expected a refusal but the call succeeded');
    if (status && j.status !== status) throw new AssertionFailed(`expected status ${status} but got ${j.status} (${j.error})`);
    if (re && !re.test(j.error || '')) throw new AssertionFailed(`refusal "${j.error}" does not match ${re}`);
    return j;
  }
};
export function suite(name) {
  const results = []; let n = 0;
  const T = {
    name,
    async test(title, fn) {
      n++;
      try { await fn(); results.push({ title, ok: true }); console.log('PASS', title); }
      catch (e) { results.push({ title, ok: false, err: String(e && e.message || e) }); console.log('FAIL', title, '—', String(e && e.message || e).split('\n')[0]); if (process.env.VERBOSE) console.log(e.stack); }
    },
    skip(title, why) { results.push({ title, skip: true, why }); console.log('SKIP', title, '—', why); },
    async done() {
      const pass = results.filter(r => r.ok).length, fail = results.filter(r => r.ok === false).length, skip = results.filter(r => r.skip).length;
      console.log(`RESULT ${name} pass=${pass} fail=${fail} skip=${skip}`);
      process.exitCode = fail ? 1 : 0;
      return { pass, fail, skip };
    }
  };
  return T;
}
