// Helpers for the six end-to-end scenario suites (test/s1.mjs ... test/s6.mjs, QA2). They DRIVE the UI (phone, Lauris + panel, platform) and
// read every store a step must change: the Psyflo store (/api/state, role-projected), the mock Lauris (GET <lauris>/__test/lauris, DEMO_TEST=1),
// the pilot scorecard on the Analytics screen, the audit events. Start modes (review/06-demo-and-qa.md a3, "Each scenario also passes from
// its fixture and from a fresh reset"):
//   scenario  demo.scenario {id: 'sN'}      what the presenter dock calls
//   fixture   demo.scenario {id: <fixture>}  the checkpoint a failed beat reloads
//   fresh     demo.reset {preset} (+ the earlier beats' state built through the same actions and Lauris pages a person's clicks reach)
// MODES=fresh,scenario node test/sN.mjs runs a subset while developing.
import { suite, assert, api, tryApi, state, reset, playwright, login, errors, sleep, session, bridge, lget, lpost, BASE, LAURIS, EXT, SHOTS } from './index.mjs';
import * as V from '../../web/js/shared/analytics/view.js';

export { suite, assert, api, tryApi, state, reset, playwright, login, errors, sleep, session, bridge, lget, lpost, BASE, LAURIS, EXT, SHOTS };
export const MODES = (process.env.MODES || 'scenario,fixture,fresh').split(',').map(x => x.trim()).filter(Boolean);
export const dowens = 'dowens+p';

// ---- the mock Lauris store ----
export const lsnap = async () => { const r = await fetch(LAURIS + '/__test/lauris'); if (!r.ok) throw new Error('the Lauris test snapshot needs DEMO_TEST=1 (' + r.status + ')'); return r.json(); };
export const lcons = (l, no) => l.consumers.find(c => c.no === no);
export const lsess = (l, id) => l.sessions.find(x => String(x.id) === String(id));
export const sid = r => (r.loc || '').match(/(?:processed|saved|signed)=(\d+)/)?.[1];

// ---- start modes ----
export async function start(mode, { scenario, fixture, preset = 'live', fresh }) {
  if (mode === 'scenario') return api('demo.scenario', { id: scenario }, dowens);
  if (mode === 'fixture') return api('demo.scenario', { id: fixture }, dowens);
  await reset(preset); if (fresh) await fresh(); return { fresh: true };
}

// ---- steps: one failed step blocks the rest of that run (reported as SKIP with the reason, never as a pass) ----
export function flow(T, label) {
  let blocked = null;
  return {
    get blocked() { return blocked; },
    async step(title, fn, { soft = false } = {}) {
      const name = `${label} · ${title}`;
      if (blocked) { T.skip(name, 'blocked by an earlier failed step in this run: ' + blocked); return; }
      let failed = false;
      await T.test(name, async () => { try { await fn(); } catch (e) { failed = true; throw e; } });
      if (failed && !soft) blocked = title.slice(0, 60);
    }
  };
}

// ---- browser pages ----
export async function openAs(b, who, { width = 1440, height = 900, presenter = false, hash = '/Login' } = {}) {
  const ctx = await b.newContext({ viewport: { width, height } }); const p = await ctx.newPage(); p.errs = errors(p); p.ctx = ctx;
  await login(p, who, { presenter, hash }); return p;
}
export const noErrors = (pages, allow = /LANG_OFF|Parent(Schedule|Progress)/) => { for (const p of [].concat(pages)) { const e = p.errs.filter(x => !allow.test(x)); assert.deepEq(e, [], e.join(' | ')); } };
export const panelFrame = p => p.frames().find(f => f.url().includes('/panel/'));
export const panel = p => p.frameLocator('#psyflo-frame');
export const formValues = p => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#lauris-form label[for]')].map(l => [l.textContent, document.getElementById(l.htmlFor).value])));
export const yellow = p => p.evaluate(() => document.querySelectorAll('#lauris-form .in.y').length);
export const mainText = p => p.locator('main').first().innerText();
export const rootText = p => p.evaluate(() => (document.getElementById('root') || document.body).innerText);
export async function waitState(pred, { ms = 12000, as = 'jperez', what = 'state' } = {}) {
  const t0 = Date.now(); let s;
  while (Date.now() - t0 < ms) { s = await state(as); if (await pred(s)) return s; await sleep(250); }
  throw new Error('timed out waiting for ' + what);
}
export const waitText = (p, re, ms = 10000) => p.waitForFunction(src => new RegExp(src).test((document.getElementById('root') || document.body).innerText), re.source, { timeout: ms }).catch(() => { throw new Error('timed out waiting for text ' + re + ' on ' + p.url()); });
export const shot = (p, name, full = false) => p.screenshot({ path: `${SHOTS}/qa2-${name}.png`, fullPage: full }).catch(() => { });

// ---- selectors over the store ----
export const req = (s, id) => s.requests.find(r => r.id === id);
export const cli = (s, id) => s.clients.find(c => c.id === id);
export const evs = (s, re, rec) => s.events.filter(e => re.test(e.what) && (!rec || e.record === rec));
export const actorOf = (s, id) => { const r = (s.staff || []).find(x => x.id === id); return { ...r, designations: r.designations || [] }; };
export const scoreRows = (s, who, f = {}) => Object.fromEntries(V.scorecardView(s, actorOf(s, who), f).rows.map(r => [r.id, r]));
// the pilot scorecard as the person reads it (DOM tiles) next to what the selector computes: the screen shows exactly the selector
export const pilotDom = p => p.$$eval('.a-tile__b', bs => Object.fromEntries(bs.map(b => [b.dataset.id, { headline: b.querySelector('b').innerText.trim(), note: b.querySelector('small').innerText.trim() }])));

// ---- ledgers: compact, comparable summaries of state at the first and the last step of a scenario ----
export const same = (a, b, label) => assert.eq(JSON.stringify(a), JSON.stringify(b), label + ' differs between start modes:\n  ' + JSON.stringify(a) + '\n  ' + JSON.stringify(b));
export const ids = rows => (rows || []).map(r => r.id).sort();

// a person downloads the file an Export button writes
export async function download(p, click) { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 15000 }), click()]); const path = await d.path(); const fs = await import('node:fs'); return { name: d.suggestedFilename(), text: fs.readFileSync(path, 'utf8'), path }; }
