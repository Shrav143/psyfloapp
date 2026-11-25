// E2: Referrals queue, the referral case shell and the five-state eligibility panel (scenario S2, REF-118, T.W.).
// Standalone: `BASE=http://localhost:4830 node test/referrals.mjs` (test/run-all.mjs starts a fresh server for it).
import { suite, assert, api, tryApi, state, reset, login, playwright, errors, sleep, session, BASE, SHOTS } from './lib/index.mjs';
import { prepTWTo } from './lib/prep.mjs';
import { eligibilityPanel, clock30, consentOf } from '../web/js/shared/sel/auth.js';

const T = suite('referrals');
const actor = async who => (await session(who)).actor;
const REF = 'REF-118';
const guardianSubmits = async () => {
  const { token } = await api('familyLink.send', { referral: REF }, 'jperez');
  await api('familyLink.open', { token });
  await api('familyLink.step', { token, step: 'guardian', answers: { guardian_name: 'Denise Rivers', relationship: 'grandmother', phone: '(434) 555-0147', language: 'English' } });
  await api('familyLink.step', { token, step: 'insurance', answers: { plan_kind: 'Medicaid through a health plan', medicaid_id: '0912 456 789 01', dob: '2014-03-14' } });
  await api('familyLink.submit', { token }); return token;
};
const { chromium } = playwright();
const b = await chromium.launch();
const mk = async (as, w = 1440, h = 900) => { const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); const errs = errors(p); await login(p, as, { presenter: false }); return { p, errs }; };
const realErrs = e => e.filter(x => !/Parent|MyWork|LANG_OFF/.test(x));
const hasText = async (p, re) => re.test(await p.locator('main').innerText());

try {
  // ------------------------------------------------------------------ the five states, from the records (selectors)
  await reset('live');
  await T.test('eligibility states follow the records: waiting for the link -> details received (check required) -> recorded -> follow-up scheduled', async () => {
    let s = await state('jperez'); let e = eligibilityPanel(s, REF, await actor('jperez'));
    assert.eq(e.status, 'waiting'); assert.eq(e.steps.filter(x => x.done).length, 0); assert.eq(e.steps.find(x => x.current).key, 'details');
    await guardianSubmits(); s = await state('jperez'); e = eligibilityPanel(s, REF, await actor('jperez'));
    assert.eq(e.status, 'details'); assert.eq(e.steps[0].done, true); assert.eq(e.steps.find(x => x.current).key, 'required'); assert.eq(e.lookup.medicaid_id, '0912 456 789 01');
    await api('eligibility.recordProof', { referral: REF, result: 'active', plan: 'humana', effective: '2026-07-01' }, 'jperez');
    s = await state('jperez'); e = eligibilityPanel(s, REF, await actor('jperez'));
    assert.eq(e.status, 'recorded'); assert.eq(e.steps.every(x => x.done), true, 'all five states done'); assert.eq(e.el.checked_by, 'jperez'); assert.ok(e.el.file && /^\/files\//.test(e.el.file), 'dated proof stored');
    assert.eq(e.nextCheck, '2026-11-05', 'follow-up from the rules table (7 days)'); assert.match(e.every.verification, /Unverified/); assert.ok(e.reminder, 'a reminder exists');
  });
  await T.test('who may run the check: a clinician, or a supervisor designated for it; an undesignated admin or direct support may not', async () => {
    await reset('live'); await guardianSubmits();
    await assert.refused(tryApi('eligibility.recordProof', { referral: REF, result: 'active', plan: 'humana', effective: '2026-07-01' }, 'dowens'), /not allowed/i, 403);
    await assert.refused(tryApi('eligibility.recordProof', { referral: REF, result: 'active', plan: 'humana' }, 'khale'), /not allowed/i, 403);
    await assert.refused(tryApi('eligibility.recordProof', { referral: REF, result: 'maybe', plan: 'humana' }, 'cdiaz'), /active or inactive|Pick active/);
    await api('eligibility.recordProof', { referral: REF, result: 'active', plan: 'humana', effective: '2026-07-01' }, 'cdiaz');   // designated
    assert.eq((await state('jperez')).eligibility.find(e => e.referral === REF).checked_by, 'cdiaz');
    assert.eq(eligibilityPanel(await state('dowens'), REF, await actor('dowens')).canRun, false, 'admin without the designation sees why');
  });
  await T.test('before the link is submitted the check is refused (never from the school form alone)', async () => {
    await reset('live');
    await assert.refused(tryApi('eligibility.recordProof', { referral: REF, result: 'active', plan: 'humana' }, 'jperez'), /not found|after the guardian submits|only after/i);
  });
  await T.test('consent and the 30-day clock come from the rules table: not started before intake; send-by from the configured start event; a rule change moves it', async () => {
    await reset('live'); await prepTWTo('isp-ready');
    const s = await state('jperez'); let ck = clock30(s, 'TW');
    assert.eq(ck.event, 'intake_processed'); assert.ok(ck.start && ck.sendBy, 'started at intake'); assert.eq(ck.days, 30); assert.match(ck.rule.verification, /Harvest-reported/); assert.eq(ck.fallback, false);
    assert.eq(ck.sendBy, '2026-11-28');
    await api('settings.rule', { key: 'initial_sra.send_within_days', value: 20, reason: 'test: shorter window' }, 'dowens+p');
    ck = clock30(await state('jperez'), 'TW'); assert.eq(ck.sendBy, '2026-11-18'); assert.eq(ck.days, 20);
    const con = consentOf(await state('jperez'), 'TW'); assert.eq(con.signed, false); assert.eq(con.mode, 'remote_allowed'); assert.match(con.rule.verification, /Harvest-reported/);
  });

  // ------------------------------------------------------------------ the queue (UI)
  await T.test('Referrals: compact queue with status chips and counts, URL state, the old ?f= link, search, sort, real links; roles', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez');
    await p.goto(BASE + '/#/Referrals'); await p.waitForTimeout(900);
    for (const l of ['New', 'Screening booked', 'In intake', 'Grant program', 'All this year']) assert.ok(await p.getByRole('button', { name: new RegExp('^' + l) }).count(), 'chip ' + l);
    assert.ok(await p.locator('a[href^="#/Referral?id="]').count() >= 2, 'rows are real links');
    await p.goto(BASE + '/#/Referrals?f=grant'); await p.waitForTimeout(800);
    assert.match(await p.evaluate(() => location.hash), /status=grant/); assert.noMatch(await p.evaluate(() => location.hash), /[?&]f=/);
    const n = await p.locator('tbody tr[data-ui-row]').count(); assert.ok(n >= 1, 'grant rows ' + n);
    await p.getByRole('button', { name: /^All this year/ }).click(); await p.waitForTimeout(400);
    const all = await p.locator('tbody tr[data-ui-row]').count(); assert.ok(all > n, 'all > grant');
    await p.fill('input[type=search]', 'REF-118'); await p.waitForTimeout(600); assert.eq(await p.locator('tbody tr[data-ui-row]').count(), 1);
    await p.fill('input[type=search]', ''); await p.waitForTimeout(400);
    await p.locator('th button', { hasText: 'Referral' }).click(); await p.waitForTimeout(300); assert.eq(await p.locator('th[aria-sort="ascending"]').count(), 1);
    await p.locator('summary', { hasText: 'From schools' }).click(); assert.ok(await p.locator('table.a-mini tbody tr').count() >= 1, 'the school counts are kept');
    assert.deepEq(realErrs(errs), []); await p.context().close();
    for (const who of ['dowens', 'cdiaz', 'khale']) { const x = await mk(who); await x.p.goto(BASE + '/#/Referrals'); await x.p.waitForTimeout(600); assert.match(await x.p.locator('#root').innerText(), /Not available/, who + ' has no Referrals'); await x.p.context().close(); }
  });

  // ------------------------------------------------------------------ S2 through the case shell (UI)
  await T.test('S2 REF-118: Send the family link (Simulated SMS) -> guardian submits -> five-state eligibility panel -> record with a dated proof -> book the screening call', async () => {
    await reset('live'); const { p, errs } = await mk('jperez');
    await p.goto(BASE + '/#/Referral?id=' + REF); await p.waitForTimeout(900);
    assert.match(await p.locator('main').innerText(), /Next step/); assert.ok(await p.getByRole('button', { name: 'Send the family link' }).count() === 1, 'one state-driven primary action');
    await p.getByText(/Send the family link/).first().click(); await p.waitForTimeout(1300);
    const link = await p.evaluate(() => (document.body.innerText.match(/https?:\/\/\S+\/f\/[\w-]+/) || [])[0]); assert.ok(link, 'the SMS stub shows the link text');
    assert.ok((await p.locator('details[data-sec="link"] .ui-maturity--simulated').count()) >= 1 || (await p.locator('.ui-maturity--simulated').count()) >= 1, 'the SMS carries the Simulated chip');
    const s1 = await state('jperez'); assert.ok(s1.family_links.find(f => f.referral === REF).sent_at); assert.ok(s1.events.some(e => e.record === REF && /SMS stub/.test(e.what) && e.sim));
    const token = s1.family_links.find(f => f.referral === REF).token;
    await api('familyLink.open', { token }); await api('familyLink.step', { token, step: 'guardian', answers: { guardian_name: 'Denise Rivers', relationship: 'grandmother', phone: '(434) 555-0147', language: 'English' } });
    await api('familyLink.step', { token, step: 'insurance', answers: { plan_kind: 'Medicaid through a health plan', medicaid_id: '0912 456 789 01', dob: '2014-03-14' } }); await api('familyLink.submit', { token }); await p.waitForTimeout(1200);
    assert.match(await p.locator('main').innerText(), /Check eligibility/);
    // the old Eligibility route stays inside the referral workspace
    await p.goto(BASE + '/#/Eligibility?referral=' + REF); await p.waitForTimeout(900);
    assert.eq(await p.evaluate(() => location.hash), '#/Referral?id=' + REF + '&panel=eligibility'); assert.ok(await p.locator('details[data-sec="eligibility"][open]').count(), 'panel open');
    const panel = await p.locator('details[data-sec="eligibility"]').innerText();
    for (const l of ['Details received', 'Check required', 'Checked by an authorized user', 'Result', 'Follow-up scheduled']) assert.match(panel, new RegExp(l));
    assert.match(panel, /Simulated/); assert.match(panel, /0912 456 789 01/);
    await p.getByRole('button', { name: 'Record result' }).click(); await p.waitForTimeout(400);
    assert.eq((await state('jperez')).eligibility.find(e => e.referral === REF).status, 'details_received', 'the plan is required: nothing recorded');
    await p.selectOption('#a-el-p', 'humana'); await p.fill('#a-el-e', '2026-07-01'); await p.getByRole('button', { name: 'Record result' }).click(); await p.waitForTimeout(1300);
    const el = (await state('jperez')).eligibility.find(e => e.referral === REF); assert.eq(el.status, 'recorded'); assert.eq(el.checked_by, 'jperez'); assert.ok(el.file);
    const panel2 = await p.locator('details[data-sec="eligibility"]').innerText(); assert.match(panel2, /Humana/); assert.match(panel2, /Open proof/); assert.match(panel2, /Nov 5/); assert.match(panel2, /Unverified/);
    const pdf = await fetch(BASE + el.file, { headers: { 'X-Psyflo-Session': (await session('jperez')).token } }); assert.eq(pdf.status, 200); assert.eq(pdf.headers.get('content-type'), 'application/pdf');
    await p.screenshot({ path: SHOTS + '/referrals-s2-eligibility.png', fullPage: true });
    await p.getByRole('button', { name: 'Book the call' }).first().click(); await p.getByRole('dialog').getByRole('button', { name: /Save and text/ }).click(); await p.waitForTimeout(1100);
    const r = (await state('jperez')).referrals.find(x => x.id === REF); assert.eq(r.stage, 'screening_booked');
    assert.ok((await state('jperez')).events.some(e => e.record === REF && /Guardian texted/.test(e.what) && e.sim), 'the confirmation text is a stub and says so');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('inactive: Hold and tell the family (stub), lift the hold; Route to the grant program', async () => {
    await reset('live'); await guardianSubmits(); const { p, errs } = await mk('jperez');
    await p.goto(BASE + '/#/Referral?id=' + REF + '&panel=eligibility'); await p.waitForTimeout(900);
    await p.selectOption('#a-el-r', 'inactive'); await p.waitForTimeout(300); await p.getByRole('button', { name: 'Record result' }).click(); await p.waitForTimeout(1200);
    assert.eq((await state('jperez')).eligibility.find(e => e.referral === REF).result, 'inactive'); assert.match(await p.locator('main').innerText(), /Not active/);
    await p.getByRole('button', { name: 'Hold and tell the family' }).first().click(); await p.getByRole('dialog').getByRole('button', { name: /Hold and text/ }).click(); await p.waitForTimeout(900);
    assert.ok((await state('jperez')).referrals.find(r => r.id === REF).hold, 'held'); assert.match(await p.locator('main').innerText(), /On hold/);
    await p.getByRole('button', { name: 'Lift hold' }).first().click(); await p.waitForTimeout(800); assert.ok(!(await state('jperez')).referrals.find(r => r.id === REF).hold, 'hold lifted');
    await p.getByRole('button', { name: 'Route to grant program' }).first().click(); await p.getByRole('dialog').getByRole('button', { name: 'Route and notify' }).click(); await p.waitForTimeout(1000);
    assert.eq((await state('jperez')).referrals.find(r => r.id === REF).stage, 'grant_program');
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
  await T.test('the criteria panel keeps its logic: two of three shown, missing items printed as "Evidence missing — verify …"', async () => {
    await reset('canvas'); const { p, errs } = await mk('jperez');
    await p.goto(BASE + '/#/Referral?id=REF-121&panel=criteria'); await p.waitForTimeout(900);
    const t = await p.locator('details[data-sec="criteria"]').innerText(); assert.match(t, /Documented repeated interventions/); assert.match(t, /Evidence missing — verify/);
    assert.deepEq(realErrs(errs), []); await p.context().close();
  });
} finally { await b.close(); }
await T.done();
