// Visit every panel view beside the mock Lauris; fail on errors; save panel screenshots at 400 px. The panel signs in as the Lauris user on the open page.
// Beyond "no errors": what each view must show (and must not), no role toggles, one h1, no horizontal scroll, text 12 px or more, controls 40 px or more.
import { suite, assert, playwright, errors, LAURIS, SHOTS } from './lib/index.mjs';

const T = suite('panels');
const { chromium } = playwright();
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = errors(p);
// [as, path, name, must match, must not match, max panel height]
const pages = [
  ['jperez', '/consumers', 'home', /Scribe[\s\S]*Track Time[\s\S]*Scan & Enhance[\s\S]*Team day in Psyflo/, /Signed in as|Support staff|\(demo\)/, 1200],
  ['khale', '/consumers', 'home-ds', /Scribe[\s\S]*Track Time[\s\S]*My day in Psyflo/, /Signed in as|Support staff|Authorizations/, 1200],
  ['cdiaz', '/consumers', 'home-sup', /Team day in Psyflo[\s\S]*Scan & Enhance is for licensed clinical staff/, /Track Time|Signed in as/, 1200],
  ['dowens', '/consumers', 'home-admin', /Not permitted/, /Scribe|Track Time|Scan & Enhance/, 600],
  ['khale', '/consumers/3310/session/dpn', 'dpn', /Say what happened[\s\S]*Draft it/i, /Observed client|lost the game|walked off the court/, 1700],
  ['jperez', '/consumers/3310/session/weekly', 'weekly', /Weekly guardian contact[\s\S]*Draft it/i, /11 of 12/, 1700],
  ['jperez', '/consumers/3310/session/collateral', 'monthly', /Monthly collateral[\s\S]*Draft it/i, /Illustrative/, 1700],
  ['jperez', '/consumers/4102/session/incident', 'incident', /What happened with D\.W\./, /Level 2 · hospitalization/, 1700],
  ['jperez', '/consumers/3310/session/quarterly', 'quarterly', /Counted from stored notes[\s\S]*Internal quarterly · staff only/, /61 daily|41\/61|11 of 12/, 1700],
  ['jperez', '/consumers/3310/session/sra-continued', 'case', /Daily notes\s*15[\s\S]*Household context[\s\S]*Not included/, /61 notes|Include\s*Exclude/, 1700],
  ['jperez', '/consumers/4102/session/discharge', 'discharge', /Discharge summary/, /68 daily notes|14 weekly/, 1700],
  ['jperez', '/consumers/3315/session/weekly', 'weekly-other', /Weekly guardian contact/, /M\.R\./, 1700],
  ['jperez', '/approvals', 'approvals', /Sign-off[\s\S]*forms wait for a signature/, /Signed in as/, 1700],
  ['jperez', '/consumers/5120', 'sebs-off', /Psyflo is off for H\.B\./, /Scribe|Track Time/, 600],
  ['khale', '/consumers/3310/session/screening', 'ds-screening', /for clinicians|Not permitted/, /Fill the \d+ boxes/, 700],
  ['khale', '/consumers/4102/session/dpn', 'not-my-caseload', /Not on your caseload[\s\S]*Harvest #4102[\s\S]*Change student/, /Say what happened|Draft it|Open a student in Lauris/, 600],
  ['jperez', '/consumers/3310', 'record', /M\.R\.[\s\S]*Harvest #3310/, /Signed in as/, 1700]
];
try {
  for (const [as, path, name, must, mustNot, maxH] of pages) {
    await T.test(`${name} (${as})`, async () => {
      errs.length = 0;
      await p.goto(`${LAURIS}/login?as=${as}&next=${encodeURIComponent(path)}`); await p.waitForTimeout(1800);
      const f = p.frames().find(f => f.url().includes('/panel/'));
      assert.ok(f, 'the panel is beside the page');
      const txt = (await f.locator('#panel').innerText()).replace(/\s+/g, ' ');
      await p.locator('#psyflo-slot').screenshot({ path: `${SHOTS}/panel-${name}.png` }).catch(() => { });
      assert.match(txt, must, name + ' shows what it should'); assert.noMatch(txt, mustNot, name + ' shows nothing it should not');
      if (name === 'home-admin') assert.match(txt, /no access|Not permitted|not permitted/i, 'admin gets no clinical draft: ' + txt.slice(0, 160));
      const m = await f.evaluate(() => {
        const px = document.getElementById('panel');
        const small = []; for (const el of px.querySelectorAll('*')) { if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 12 && el.checkVisibility && el.checkVisibility()) small.push((el.className || el.tagName) + ':' + fs); }
        const low = [...px.querySelectorAll('.btn:not(.sm),.tog,select,summary')].filter(e => e.checkVisibility && e.checkVisibility() && e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 39.5).map(e => (e.className || e.tagName) + ':' + Math.round(e.getBoundingClientRect().height));
        return { h1: px.querySelectorAll('h1').length, scrollX: document.documentElement.scrollWidth - document.documentElement.clientWidth, small: small.slice(0, 5), low: low.slice(0, 5), height: (() => { const body = px.querySelector('.body'); const mini = px.querySelector('.mini'); const foot = px.querySelector('.foot'); return body ? body.offsetTop + body.offsetHeight + (mini ? mini.offsetHeight : 0) + (foot ? foot.offsetHeight : 0) : px.scrollHeight; })(), live: [...document.querySelectorAll('[aria-live]')].map(e => e.id || e.tagName) };
      });
      assert.eq(m.h1, 1, 'one h1'); assert.ok(m.scrollX <= 0, 'no horizontal scroll: ' + m.scrollX); assert.deepEq(m.small, [], 'text below 12 px'); assert.deepEq(m.low, [], 'controls below 40 px');
      assert.deepEq(m.live, ['px-status'], 'aria-live only on the status region');
      assert.ok(m.height <= maxH, `${name} is ${m.height} px tall (limit ${maxH})`);
      assert.deepEq(errs, [], errs.join(' | '));
    });
  }
} finally { await b.close(); }
await T.done();
