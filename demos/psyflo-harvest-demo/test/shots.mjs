// Screenshots of every screen and the key states, for review and the delivery pack.
//   BASE=http://localhost:4000 OUT=/path/to/dir node test/shots.mjs
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/node22/lib/node_modules/playwright/index.js');
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:4000'; const OUT = process.env.OUT || './shots'; fs.mkdirSync(OUT, { recursive: true });
const { SCREENS } = await import('../web/js/registry.js');
const b = await chromium.launch();
const shot = async (name, route, { as = 'dowens', w = 1440, h = 900, full = true, panel = false, wait = 900, after } = {}) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage(); await p.goto(BASE + '/#/Login'); await p.evaluate(u => localStorage.setItem('psyflo_user', u), as);
  try {
    await p.goto(BASE + '/#/' + route); await p.waitForTimeout(wait);
    if (after) await after(p);
    if (panel) { const pf = p.frames().find(f => /\/panel/.test(f.url())); if (pf) { const el = await pf.frameElement(); await el.screenshot({ path: `${OUT}/${name}.png` }); } else await p.screenshot({ path: `${OUT}/${name}.png` }); }
    else await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  } catch (e) { console.log('FAIL', name, String(e).slice(0, 100)); }
  await ctx.close();
};
const only = process.argv.slice(2);
for (const s of SCREENS) {
  if (s.id === 'Login' && false) continue;
  if (only.length && !only.includes(s.id)) continue;
  const narrow = ['phone', 'parent'].includes(s.surface);
  const as = s.id.startsWith('Mobile') ? 'khale' : s.id === 'ReviewQueue' ? 'cdiaz' : 'dowens';
  const nm = String(s.n).padStart(2, '0') + '-' + s.id;
  if (s.surface === 'ext') await shot(nm, s.id, { as, panel: true, wait: 2400 });
  else await shot(nm, s.id, { as, w: narrow ? 390 : 1440, h: narrow ? 844 : 900 });
}
if (!only.length) {
  await shot('state-authorizations-drawer', 'Authorizations?open=R-0399', { wait: 1200 });
  await shot('state-authorizations-intake', 'Referrals', {});
  await shot('state-worklist-supervisor', 'DoNext', { as: 'cdiaz' });
  await shot('state-documentation-own-row', 'StaffDashboard', { as: 'khale' });
  await shot('state-presenter-menu', 'DoNext', { after: async p => { await p.keyboard.press('Shift+P'); await p.waitForTimeout(300); } , full: false });
  await shot('state-help-tip', 'Authorizations', { after: async p => { const h = p.locator('.hlp').first(); if (await h.count()) await h.hover(); await p.waitForTimeout(400); }, full: false });
}
await b.close(); console.log('screenshots in', OUT);
