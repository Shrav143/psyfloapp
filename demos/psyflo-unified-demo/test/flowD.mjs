// Flow D through the UI: Referral review → Send the family link → phone link, five steps → Eligibility flips → record → Parent signs → portal.
import { suite, assert, api, state, reset, login, playwright, errors, BASE, SHOTS } from './lib/index.mjs';

const T = suite('flowD');
await reset('live');
const { chromium } = playwright();
const b = await chromium.launch(); const errsAll = [];
const desk = await (await b.newContext({ viewport: { width: 1440, height: 950 } })).newPage(); const ed = errors(desk);
const phone = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: false })).newPage(); const ep = errors(phone);
let link;
try {
  await T.test('the clinician sends the family link from Referral review (SMS stub: not actually sent)', async () => {
    await login(desk, 'jperez', { presenter: true });
    await desk.goto(BASE + '/#/Referral?id=REF-118'); await desk.waitForTimeout(800);
    await desk.getByText(/Send the family link/).first().click(); await desk.waitForTimeout(1200);
    link = await desk.evaluate(() => (document.body.innerText.match(/https?:\/\/\S+\/f\/[\w-]+/) || [])[0]);
    assert.ok(link, 'the link text is shown');
    const s = await state('jperez'); assert.ok(s.family_links.find(f => f.referral === 'REF-118').sent_at);
    assert.ok(s.events.some(e => e.record === 'REF-118' && /SMS stub/.test(e.what) && e.sim), 'the text is a stub and says so');
  });
  await T.test('the guardian opens the link on the phone (token sign-in) and completes the five steps', async () => {
    await phone.goto(link); await phone.waitForTimeout(1000);
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
    await phone.screenshot({ path: SHOTS + '/flowD-1-phone-done.png' });
    await desk.waitForTimeout(1200);
    const s = await state('jperez');
    assert.ok(s.family_links.find(f => f.referral === 'REF-118').submitted_at); assert.eq(s.eligibility.find(e => e.referral === 'REF-118').status, 'details_received');
  });
  await T.test('Eligibility flips to "details received"; a person records the DMAS result', async () => {
    await desk.goto(BASE + '/#/Eligibility?referral=REF-118'); await desk.waitForTimeout(800);
    await desk.screenshot({ path: SHOTS + '/flowD-2-eligibility.png' });
    await api('eligibility.record', { referral: 'REF-118', result: 'active', plan: 'humana', effective: '2026-07-01' }, 'jperez');
    assert.eq((await state('jperez')).referrals.find(r => r.id === 'REF-118').eligibility, 'active · Humana');
  });
  await T.test('the guardian signs the consent on the phone; the signer is the guardian behind the link', async () => {
    const fl = (await state('jperez')).family_links.find(f => f.referral === 'REF-118');
    await phone.goto(`${BASE}/parent/${fl.token}/ParentSign`); await phone.waitForTimeout(1000);
    const c = phone.locator('canvas').first(); const bb = await c.boundingBox();
    await phone.mouse.move(bb.x + 20, bb.y + 40); await phone.mouse.down(); for (let x = 20; x < bb.width - 20; x += 15) await phone.mouse.move(bb.x + x, bb.y + 40 + Math.sin(x / 15) * 20); await phone.mouse.up();
    await phone.locator('#root a[href="#sign"]').first().click(); await phone.waitForTimeout(1500);
    const consent = (await state('jperez')).consents.find(x => x.client === 'TW');
    assert.eq(consent?.status, 'signed'); assert.eq(consent.signer, 'Denise Rivers'); assert.ok(consent.file);
    await phone.screenshot({ path: SHOTS + '/flowD-3-portal.png' });
  });
  await T.test('no console errors on either screen', async () => { assert.deepEq([...ed, ...ep], [], [...ed, ...ep].join(' | ')); });
} finally { await b.close(); }
await T.done();
