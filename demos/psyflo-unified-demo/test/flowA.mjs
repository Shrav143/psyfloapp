// Flow A end to end: family link → eligibility → create consumer → screening call → Process Form → CNA.
// Sign-in: the clinician's API calls use a session (lib: as 'jperez'); the browser opens the mock Lauris as J. Perez and the panel signs in
// as that Lauris user by itself. No test talks to /api/do anonymously.
import { suite, assert, api, state, reset, playwright, errors, LAURIS, SHOTS, sleep } from './lib/index.mjs';

const T = suite('flowA');
await reset('live');
await T.test('family link → five steps → submit → eligibility recorded (clinician session)', async () => {
  const { token } = await api('familyLink.send', { referral: 'REF-118' }, 'jperez');
  await api('familyLink.open', { token });
  await api('familyLink.step', { token, step: 'guardian', answers: { guardian_name: 'Denise Rivers', relationship: 'grandmother', phone: '(434) 555-0147', language: 'English' } });
  await api('familyLink.step', { token, step: 'insurance', answers: { plan_kind: 'Medicaid through a health plan', medicaid_id: '0912 456 789 01', dob: '2014-03-14' } });
  await api('familyLink.submit', { token });
  await api('eligibility.record', { referral: 'REF-118', result: 'active', plan: 'humana', effective: '2026-07-01' }, 'jperez');
  const s = await state('jperez'); assert.eq(s.eligibility.find(e => e.referral === 'REF-118').status, 'recorded');
});

const { chromium } = playwright();
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await ctx.newPage();
const errs = errors(p);
const panel = () => p.frameLocator('#psyflo-frame');
try {
  await p.goto(`${LAURIS}/login?as=jperez&next=${encodeURIComponent('/consumers/new?referral=REF-118')}`);
  await T.test('new-consumer boxes are typed from the referral (yellow)', async () => {
    await panel().getByText(/Fill \d+ boxes/).click();
    await panel().getByText('Boxes typed. Check them').first().waitFor({ timeout: 20000 });   // the line is also announced in the status region
    assert.eq(await p.evaluate(() => [...document.querySelectorAll('#lauris-form .in.y')].length), 6);
    await p.getByRole('button', { name: 'Save Consumer' }).click();
    await p.waitForURL(/consumers\/\d+\?created/);
  });
  await T.test('screening opens with the pre-call boxes typed', async () => {
    await panel().getByText('Open Admission Screening').click();
    await p.waitForURL(/session\/screening/);
    await p.waitForFunction(() => document.querySelectorAll('#lauris-form .in.y').length >= 6, null, { timeout: 15000 });
    await p.screenshot({ path: SHOTS + '/flowA-1-precall.png' });
  });
  await T.test('scripted call: prompts tick while recording; the draft fills the boxes; only what was said', async () => {
    const fr = p.frames().find(f => f.url().includes('/panel/'));
    await fr.evaluate(() => { window.__psyfloPanel.ui.fast = true; });
    await panel().getByText('Play the scripted call').click();
    await panel().getByText('Before you record').waitFor();
    await panel().getByLabel(/Guardian agreed/).check();                       // a recording never starts without a recorded consent
    await panel().getByText('Agreed · start recording').click();
    await panel().getByText('Before you hang up').waitFor();
    await p.waitForTimeout(10500);
    assert.eq(await panel().locator('.cr.done').count(), 6, 'six prompts done');
    await panel().getByText('Stop and draft the boxes').click();
    await panel().getByText(/Fill the \d+ boxes/).click();
    await p.waitForFunction(() => /Piedmont/.test([...document.querySelectorAll('#lauris-form textarea')].map(t => t.value).join(' ')), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await p.screenshot({ path: SHOTS + '/flowA-3-drafted.png' });
    const vals = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#lauris-form label[for]')].map(l => [l.textContent, document.getElementById(l.htmlFor).value])));
    const prior = vals['Prior / current services (provider · dates · outcome)'];
    assert.match(prior, /Piedmont Counseling, Mar–Jun/); assert.noMatch(prior, /School counseling weekly since Sep 2025/, 'nothing the call did not say');
    assert.ok((vals['Narrative summary'] || '').length > 100);
    await p.fill('#lauris-form textarea >> nth=1', vals['School coordination to date'] + ' (edited by J. Perez)');
  });
  await T.test('Process Form is a person\'s click; Psyflo learns it from the observed page event', async () => {
    await p.getByRole('button', { name: 'Process Form' }).click();
    await p.waitForURL(/processed=/);
    await p.waitForTimeout(1500);
    const s = await state('jperez');
    assert.eq(s.screenings.find(x => x.client === 'TW')?.status, 'done'); assert.eq(s.referrals.find(r => r.id === 'REF-118').stage, 'in_intake');
    assert.ok(s.events.some(e => e.record === 'REF-118' && /Screening processed/.test(e.what) && e.actor_kind === 'bridge'), 'recorded from the bridge event');
  });
  await T.test('the intake (CNA) opens with the screening answers carried forward', async () => {
    await panel().getByText('Open the intake (CNA)').click();
    await p.waitForURL(/session\/cna/);
    await panel().getByText('copied from screening').first().waitFor();
    await panel().getByText(/^Fill \d+ boxes/).click();
    await p.waitForTimeout(4000);
    const cna = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#lauris-form label[for]')].map(l => [l.textContent, document.getElementById(l.htmlFor).value])));
    assert.match(cna['Prior services (provider · dates · outcome)'], /Piedmont/);
  });
  await T.test('no console errors in the page or the panel', async () => { assert.deepEq(errs, [], errs.join(' | ')); });
} finally { await b.close(); }
await T.done();
