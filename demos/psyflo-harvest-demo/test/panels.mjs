// Visit every panel view beside the mock Lauris; save panel screenshots; fail on console errors, more than 100 visible words
// (design prompt §3.1; text inside [data-doc] does not count), more than 3 `?` tips, or an old name in the panel text.
//   BASE=http://localhost:4000 SHOTS=/some/dir node test/panels.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/node22/lib/node_modules/playwright/index.js');
const APP = process.env.BASE || 'http://localhost:4000'; const LAURIS = APP.replace(/:(\d+)$/, (m, p) => ':' + (+p + 1));
const shot = process.env.SHOTS || '/tmp';
const OLD = /Do next|Past due|Draft ready|Needs approval|Awaiting signature|Info requested|Needs me|Waiting on others|New students|Staff dashboard|Review queue|Payer playbook|Use the example|Play the scripted|Signed in as|Who can see what|\(demo\)/i;
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 1200 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
const pages = [['jperez', '/consumers', 'home'], ['khale', '/consumers', 'home-ds'], ['dowens', '/consumers', 'home-admin'], ['cdiaz', '/consumers', 'home-supervisor'],
  ['jperez', '/consumers/3310/session/dpn', 'daily-note'], ['jperez', '/consumers/3310/session/weekly', 'weekly'], ['jperez', '/consumers/3310/session/collateral', 'monthly'], ['jperez', '/consumers/4102/session/incident', 'incident'],
  ['jperez', '/consumers/3310/session/quarterly', 'quarterly'], ['jperez', '/consumers/3310/session/sra-continued', 'continued-stay'], ['jperez', '/consumers/4102/session/discharge', 'discharge'], ['jperez', '/consumers/3315/session/weekly', 'weekly-other'],
  ['jperez', '/consumers/3315/session/incident', 'incident-other'], ['jperez', '/approvals', 'approvals'], ['jperez', '/consumers/5120', 'sebs-off'], ['khale', '/consumers/3310/session/screening', 'ds-screening'], ['jperez', '/consumers/3310', 'record'], ['khale', '/consumers/3310', 'record-ds'],
  ['jperez', '/consumers/new?referral=REF-118', 'new-consumer']];
let fail = 0;
for (const [as, path, name] of pages) {
  errs.length = 0;
  await p.goto(`${LAURIS}/login?as=${as}&next=${encodeURIComponent(path)}`); await p.waitForTimeout(1800);
  const f = p.frames().find(f => f.url().includes('/panel/'));
  let words = -1, tips = -1, text = 'NO PANEL';
  if (f) ({ words, tips, text } = await f.evaluate(() => {
    const root = document.querySelector('#panel'); const clone = root.cloneNode(true);
    clone.querySelectorAll('[data-doc], script, style, input, textarea, select, [hidden]').forEach(n => n.remove());
    return { words: (clone.innerText || clone.textContent).split(/\s+/).filter(Boolean).length, tips: root.querySelectorAll('.hlp').length, text: root.innerText.replace(/\s+/g, ' ') };
  }));
  await p.locator('#psyflo-slot').screenshot({ path: `${shot}/panel-${name}.png` }).catch(() => { });
  const problems = [errs.length && 'ERR ' + errs.join(' | ').slice(0, 160), words > 100 && `${words} words`, tips > 3 && `${tips} tips`, OLD.test(text) && 'old name: ' + text.match(OLD)[0], !f && 'no panel'].filter(Boolean);
  if (problems.length) fail++;
  console.log(`${name.padEnd(16)} ${String(words).padStart(3)} words · ${tips} ? · ${problems.length ? problems.join('; ') : 'ok'} · ${text.slice(0, 90)}`);
}
await b.close();
console.log(fail ? `\n${fail} view(s) with problems` : '\nall panel views ok');
process.exit(fail ? 1 : 0);
