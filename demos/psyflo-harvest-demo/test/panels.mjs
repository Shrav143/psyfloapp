// Visit every panel view beside the mock Lauris; report errors and save panel screenshots.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/node-tools/node_modules/playwright');
const APP = process.env.BASE || 'http://localhost:4000'; const LAURIS = APP.replace(/:(\d+)$/, (m, p) => ':' + (+p + 1));
const shot = process.env.SHOTS || '/tmp/claude-0/-home-user/18129bb2-2284-5dc6-923b-ddd08b39fc66/scratchpad';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const pages = [['jperez', '/consumers', 'home'], ['khale', '/consumers', 'home-ds'], ['dowens', '/consumers', 'home-admin'], ['jperez', '/consumers/3310/session/weekly', 'weekly'], ['jperez', '/consumers/3310/session/collateral', 'monthly'], ['jperez', '/consumers/4102/session/incident', 'incident'],
  ['jperez', '/consumers/3310/session/quarterly', 'quarterly'], ['jperez', '/consumers/3310/session/sra-continued', 'case'], ['jperez', '/consumers/4102/session/discharge', 'discharge'], ['jperez', '/consumers/3315/session/weekly', 'weekly-other'],
  ['jperez', '/approvals', 'approvals'], ['jperez', '/consumers/5120', 'sebs-off'], ['khale', '/consumers/3310/session/screening', 'ds-screening'], ['jperez', '/consumers/3310', 'record']];
for (const [as, path, name] of pages) {
  errs.length = 0;
  await p.goto(`${LAURIS}/login?as=${as}&next=${encodeURIComponent(path)}`); await p.waitForTimeout(1600);
  const f = p.frames().find(f => f.url().includes('/panel/'));
  const txt = f ? (await f.locator('#panel').innerText()).replace(/\s+/g, ' ').slice(0, 150) : 'NO PANEL';
  await p.locator('#psyflo-slot').screenshot({ path: `${shot}/panel-${name}.png` }).catch(() => { });
  console.log(`${name}: ${errs.length ? 'ERR ' + errs.join(' | ').slice(0, 200) : 'ok'} · ${txt}`);
}
await b.close();
