// Flow D through the UI: Referral review → Send the family link → phone link, five steps → Eligibility flips → record → Parent signs → portal.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/node-tools/node_modules/playwright');
const APP = process.env.BASE || 'http://localhost:4000';
const shot = process.env.SHOTS || '/tmp/claude-0/-home-user/18129bb2-2284-5dc6-923b-ddd08b39fc66/scratchpad';
const doA = async (action, args) => { const r = await fetch(APP + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) }).then(r => r.json()); if (!r.ok) throw new Error(r.error); return r.result; };
const state = () => fetch(APP + '/api/state').then(r => r.json());
const log = (...a) => console.log('·', ...a);
await doA('demo.reset', { preset: 'live' });
const b = await chromium.launch(); const errs = [];
const desk = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage(); desk.on('pageerror', e => errs.push(e.message));
await desk.goto(APP + '/#/Login'); await desk.evaluate(() => localStorage.setItem('psyflo_user', 'jperez'));
await desk.goto(APP + '/#/Referral?id=REF-118'); await desk.waitForTimeout(800);
await desk.getByText(/Send family link/).first().click(); await desk.waitForTimeout(1200);
const link = await desk.evaluate(() => (document.body.innerText.match(/https?:\/\/\S+\/f\/[\w-]+/) || [])[0]);
log('SMS link:', link);
await desk.goto(APP + '/#/Eligibility?referral=REF-118'); await desk.waitForTimeout(600);
log('eligibility before:', (await desk.locator('#root main').innerText()).replace(/\s+/g, ' ').slice(0, 140));
const phone = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: false })).newPage(); phone.on('pageerror', e => errs.push('phone ' + e.message));
await phone.goto(link); await phone.waitForTimeout(800);
for (let i = 0; i < 8; i++) {
  const has = async sel => (await phone.locator(sel).count()) > 0;
  if (await has('#gname')) { await phone.fill('#gname', 'Denise Rivers'); await phone.fill('#phone', '(434) 555-0147'); }
  if (await has('#mid')) { const sel = phone.locator('#root select').first(); const o = (await sel.locator('option').allTextContents()).find(t => /health plan/.test(t)); await sel.selectOption({ label: o }); await phone.fill('#mid', '0912 456 789 01'); await phone.fill('#dob', '03/14/2014'); }
  for (const r of await phone.locator('#root input[type=radio]').all()) { const name = await r.getAttribute('name'); if (name && !(await phone.locator(`#root input[name="${name}"]:checked`).count())) await r.check({ force: true }); }
  for (const t of await phone.locator('#root textarea:visible').all()) if (!(await t.inputValue())) await t.fill('Afternoons after 2 pm');
  const next = phone.locator('#root a[href="#next"], #root a[href="#submit"]');
  if (!(await next.count())) break;
  await next.first().click(); await phone.waitForTimeout(600);
}
await phone.screenshot({ path: shot + '/flowD-1-phone-done.png' });
await desk.waitForTimeout(1200);
let s = await state(); log('family link submitted:', !!s.family_links.find(f => f.referral === 'REF-118').submitted_at, '· eligibility:', s.eligibility.find(e => e.referral === 'REF-118').status);
log('eligibility screen now:', (await desk.locator('#root main').innerText()).replace(/\s+/g, ' ').slice(0, 160));
await desk.screenshot({ path: shot + '/flowD-2-eligibility.png' });
await doA('eligibility.record', { referral: 'REF-118', result: 'active', plan: 'humana', effective: '2026-07-01' });
await desk.goto(APP + '/#/Referral?id=REF-118'); await desk.waitForTimeout(800);
log('referral chip:', (await state()).referrals.find(r => r.id === 'REF-118').eligibility);
const fl = (await state()).family_links.find(f => f.referral === 'REF-118');
await phone.goto(`${APP}/parent/${fl.token}/ParentSign`); await phone.waitForTimeout(800);
const c = phone.locator('canvas').first(); const bb = await c.boundingBox();
await phone.mouse.move(bb.x + 20, bb.y + 40); await phone.mouse.down(); for (let x = 20; x < bb.width - 20; x += 15) await phone.mouse.move(bb.x + x, bb.y + 40 + Math.sin(x / 15) * 20); await phone.mouse.up();
await phone.locator('#root a[href="#sign"]').first().click(); await phone.waitForTimeout(1500);
s = await state(); log('consent:', s.consents.find(x => x.client === 'TW')?.status, s.consents.find(x => x.client === 'TW')?.file);
log('parent portal:', (await phone.locator('#root').innerText()).replace(/\s+/g, ' ').slice(0, 160));
await phone.screenshot({ path: shot + '/flowD-3-portal.png' });
log('errors:', errs.length ? errs : 'none');
await b.close();
