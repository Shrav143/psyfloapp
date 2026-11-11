// Flow C: ISP → initial SRA drafted and filled → Process Form → internal approval → Get Signature → signed PDF → Send (simulated Sfax).
// Independent of flowA: the lib sets T.W.'s preconditions (family link, eligibility, T.W. in the mock Lauris with a Harvest #).
import { suite, assert, api, state, playwright, errors, LAURIS, BASE, SHOTS, sleep, session } from './lib/index.mjs';
import { prepTW } from './lib/prep.mjs';

const T = suite('flowC');
const { no } = await prepTW();
const { chromium } = playwright();
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = errors(p);
const panel = () => p.frameLocator('#psyflo-frame');
try {
  await p.goto(`${LAURIS}/login?as=jperez&next=${encodeURIComponent(`/consumers/${no}/session/isp`)}`);
  await T.test('ISP: the three goals are filled; Process Form drafts the request (R-0416)', async () => {
    await panel().getByText('Fill the 3 goals').click();
    await p.waitForTimeout(9000);
    await p.getByRole('button', { name: 'Process Form' }).click(); await p.waitForURL(/processed=/); await p.waitForTimeout(1200);
    const s = await state('jperez');
    assert.eq(s.requests.find(r => r.id === 'R-0416')?.stage, 'draft_ready'); assert.eq(s.clients.find(c => c.id === 'TW').goals.length, 3);
  });
  await T.test('SRA: drafted from the call and the school counts; criterion 3 and trauma-informed care left blank; no invented dates or promises', async () => {
    await panel().getByText('Open the initial request (SRA)').click(); await p.waitForURL(/sra-initial/);
    await panel().getByText(/Fill all \d+ boxes/).click();
    await panel().getByText(/boxes typed into the form/).waitFor({ timeout: 30000 });
    await p.screenshot({ path: SHOTS + '/flowC-1-sra.png' });
    const v = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#lauris-form label[for]')].map(l => [l.textContent, document.getElementById(l.htmlFor).value])));
    assert.ok(!v['Section I · criterion 3 — recognise danger to self or others'], 'criterion 3 blank');
    assert.ok(!v['Section III · trauma-informed care'], 'trauma-informed care blank');
    assert.noMatch(v['Care coordination'] || '', /Harvest will coordinate|monthly/i, 'no promise written for the clinician');
    assert.noMatch(Object.values(v).join(' '), /10\/27\/2026 – 01\/23\/2027/, 'no hard-coded dates');
  });
  await T.test('Process Form lands in Pending clinical approval (observed, with the Harvest # and session)', async () => {
    await p.getByRole('button', { name: 'Process Form' }).click(); await p.waitForURL(/processed=/); await p.waitForTimeout(1000);
    const r = (await state('jperez')).requests.find(r => r.id === 'R-0416');
    assert.eq(r.stage, 'needs_approval'); assert.ok(r.lauris_session && r.lauris_consumer === no);
  });
  await T.test('the approver records the approval; then Get Signature in Lauris is observed: the signer is the Lauris user', async () => {
    await api('request.approve', { id: 'R-0416', comment: 'Checked against the call and the school counts' }, 'jperez');
    assert.eq((await state('jperez')).requests.find(r => r.id === 'R-0416').stage, 'awaiting_signature');
    await panel().getByText('Open Forms to Approve').click(); await p.waitForURL(/approvals$/);
    await p.locator('#approval-list tr', { hasText: 'Initial Service' }).filter({ hasText: 'T.W.' }).getByText('Preview').click();
    await panel().getByText('Before you sign').waitFor();
    await p.screenshot({ path: SHOTS + '/flowC-2-signoff.png' });
    await p.getByRole('button', { name: 'Get Signature' }).click(); await p.waitForURL(/signed=/);
    await panel().getByText('Signed in Lauris.').waitFor({ timeout: 10000 });
    const r = (await state('jperez')).requests.find(r => r.id === 'R-0416');
    assert.eq(r.stage, 'signed'); assert.eq(r.signed_by, 'J. Perez, LPC'); assert.eq(r.approved_by, 'jperez');
    const s = await session('jperez'); const pdf = await fetch(BASE + r.signed_pdf, { headers: { 'X-Psyflo-Session': s.token } });
    assert.eq(pdf.status, 200); assert.eq(pdf.headers.get('content-type'), 'application/pdf');
    await p.screenshot({ path: SHOTS + '/flowC-3-signed.png' });
  });
  await T.test('Send is a person\'s action (session actor); the receipt is the simulated Sfax stub', async () => {
    await api('request.send', { id: 'R-0416' }, 'jperez'); await sleep(3600);
    const s = await state('jperez'); const q = s.requests.find(r => r.id === 'R-0416');
    assert.eq(q.stage, 'submitted'); assert.match(q.fax_ref, /^F-\d+/); assert.ok(q.decision_due > s.today, 'decision window from the rules table: ' + q.decision_due);
    assert.ok(s.events.filter(e => e.record === 'R-0416' && /Sfax/.test(e.what)).every(e => e.sim && e.who === 'jperez'));
  });
  await T.test('no console errors', async () => { assert.deepEq(errs, [], errs.join(' | ')); });
} finally { await b.close(); }
await T.done();
