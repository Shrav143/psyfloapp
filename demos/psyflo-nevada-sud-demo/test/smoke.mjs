// Visit every screen as admin; report console errors and unwired links.
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/node-tools/node_modules/playwright');
const BASE = process.env.BASE || 'http://localhost:4000';
const only = process.argv[2];
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); }); p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await p.goto(BASE + '/#/Login'); await p.evaluate(u => localStorage.setItem('psyflo_user', u), process.env.AS || 'dowens');
const { SCREENS } = await import('../web/js/registry.js');
for (const s of SCREENS) {
  if (only && s.id !== only) continue;
  errs.length = 0;
  await p.goto(BASE + '/#/' + s.id); await p.waitForTimeout(600);
  const txt = (await p.locator('#root').innerText()).slice(0, 80).replace(/\s+/g, ' ');
  const dead = await p.evaluate(() => [...document.querySelectorAll('#root a[href^="#"]:not([href^="#/"])')].map(a => a.getAttribute('href')));
  console.log(`${s.n} ${s.id}: ${errs.length ? 'ERR ' + errs.join(' | ').slice(0, 300) : 'ok'} · anchors:${dead.join(',')} · ${txt}`);
}
await b.close();
