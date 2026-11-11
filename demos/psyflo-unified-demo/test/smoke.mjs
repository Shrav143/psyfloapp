// Visit every screen each role may open; fail on console/page errors, failed requests and unwired '#anchor' links.
// Usage: BASE=http://localhost:4000 node test/smoke.mjs [ScreenId]   (AS=<staffId> limits it to one role; default jperez, dowens, cdiaz, khale)
// Sign-in: the lib login (session token); portal screens are opened signed out (the family/school link is the identity).
import { suite, assert, login, errors, playwright, BASE } from './lib/index.mjs';
import { SCREENS } from '../web/js/registry.js';
import { routeAllowed } from '../web/js/shared/permissions.js';

const T = suite('smoke');
const only = process.argv[2];
const ROLES = { jperez: 'clinician', dowens: 'admin', cdiaz: 'supervisor', khale: 'direct_support' };
const who = process.env.AS ? [process.env.AS] : Object.keys(ROLES);
const { chromium } = playwright();
const b = await chromium.launch();

async function visit(page, errs, id, label) {
  errs.length = 0;
  await page.goto(BASE + '/#/' + id); await page.waitForTimeout(500);
  const info = await page.evaluate(() => {
    const inst = window.psyflo && window.psyflo.current && window.psyflo.current.inst;
    const dead = [...document.querySelectorAll('#root a[href^="#"]:not([href^="#/"])')].map(a => a.getAttribute('href').slice(1)).filter(n => n && !(inst && inst.anchors && typeof inst.anchors[n] === 'function') && !document.getElementById(n));
    return { dead, text: (document.getElementById('root') || {}).innerText || '', denied: /Not available for/.test((document.getElementById('root') || {}).innerText || '') };
  });
  assert.eq(errs.length, 0, `${label}: console/request errors: ${errs.join(' | ').slice(0, 300)}`);
  assert.deepEq(info.dead, [], `${label}: unwired anchors ${info.dead.join(',')}`);
  return info;
}

try {
  for (const staff of who) {
    const role = ROLES[staff] || 'clinician';
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = errors(p);
    await login(p, staff, { presenter: false });
    for (const s of SCREENS) {
      if (only && s.id !== only) continue;
      if (['parent', 'school'].includes(s.surface) || s.id === 'Login') continue;     // signed-out screens: below
      if (!routeAllowed(role, s.id)) continue;
      await T.test(`${staff} · ${s.n} ${s.id}`, async () => { const i = await visit(p, errs, s.id, `${staff} ${s.id}`); assert.ok(!i.denied, 'the role may open it but the shell says not available'); });
    }
    await ctx.close();
  }
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = errors(p);
  for (const s of SCREENS) {
    if (only && s.id !== only) continue;
    if (!(['parent', 'school'].includes(s.surface) || s.id === 'Login' || s.id === 'WhereThingsLive')) continue;
    await T.test(`signed out · ${s.n} ${s.id}`, async () => { await visit(p, errs, s.id, 'signed out ' + s.id); });
  }
  await ctx.close();
} finally { await b.close(); }
await T.done();
