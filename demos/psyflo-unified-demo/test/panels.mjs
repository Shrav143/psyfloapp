// Visit every panel view beside the mock Lauris; fail on errors; save panel screenshots. The panel signs in as the Lauris user on the open page.
import { suite, assert, playwright, errors, LAURIS, SHOTS } from './lib/index.mjs';

const T = suite('panels');
const { chromium } = playwright();
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = errors(p);
const pages = [['jperez', '/consumers', 'home'], ['khale', '/consumers', 'home-ds'], ['dowens', '/consumers', 'home-admin'], ['jperez', '/consumers/3310/session/weekly', 'weekly'], ['jperez', '/consumers/3310/session/collateral', 'monthly'], ['jperez', '/consumers/4102/session/incident', 'incident'],
  ['jperez', '/consumers/3310/session/quarterly', 'quarterly'], ['jperez', '/consumers/3310/session/sra-continued', 'case'], ['jperez', '/consumers/4102/session/discharge', 'discharge'], ['jperez', '/consumers/3315/session/weekly', 'weekly-other'],
  ['jperez', '/approvals', 'approvals'], ['jperez', '/consumers/5120', 'sebs-off'], ['khale', '/consumers/3310/session/screening', 'ds-screening'], ['jperez', '/consumers/3310', 'record']];
try {
  for (const [as, path, name] of pages) {
    await T.test(`${name} (${as})`, async () => {
      errs.length = 0;
      await p.goto(`${LAURIS}/login?as=${as}&next=${encodeURIComponent(path)}`); await p.waitForTimeout(1800);
      const f = p.frames().find(f => f.url().includes('/panel/'));
      assert.ok(f, 'the panel is beside the page');
      const txt = (await f.locator('#panel').innerText()).replace(/\s+/g, ' ').slice(0, 200);
      await p.locator('#psyflo-slot').screenshot({ path: `${SHOTS}/panel-${name}.png` }).catch(() => { });
      if (name === 'home-admin') assert.match(txt, /not a Psyflo|no access|Not permitted|not permitted|Sign in/i, 'admin gets no clinical draft: ' + txt);
      assert.deepEq(errs, [], errs.join(' | '));
    });
  }
} finally { await b.close(); }
await T.done();
