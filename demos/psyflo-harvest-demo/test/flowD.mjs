// Flow D and the phone/portal screens, through the UI.
//   A. School referral consent: submit with "Guardian agrees to the referral" = No is blocked (and referral.create rejects it);
//      Yes creates the referral with form.guardian_agrees = true.
//   B. Family link on the phone: one question per screen, progress dots, EN/ES, five steps → submit → Eligibility flips →
//      record (API) → Parent signs → Parent portal shows the consent done.
//   C. Phone app: voice tag moves the timer, Say what happened (presenter 'example') → Looks right saves a dictation, SUDS saves.
// The app's own Referral and Eligibility pages (owner B1) are read and logged, never relied on: app-side steps use POST /api/do.
//   PW=/opt/node22/lib/node_modules/playwright/index.js BASE=http://localhost:4340 node test/flowD.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/node22/lib/node_modules/playwright/index.js');
const APP = process.env.BASE || 'http://localhost:4000';
const shot = process.env.SHOTS || process.env.TMPDIR || '/tmp';
const rawDo = async (action, args) => fetch(APP + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) }).then(r => r.json());
const doA = async (action, args) => { const r = await rawDo(action, args); if (!r.ok) throw new Error(action + ': ' + r.error); return r.result; };
const state = () => fetch(APP + '/api/state').then(r => r.json());
const log = (...a) => console.log('·', ...a);
const fails = [];
const ok = (cond, msg) => { if (!cond) { fails.push(msg); console.log('  FAIL', msg); } else console.log('  ok  ', msg); };
const txt = async (loc, n = 160) => (await loc.innerText()).replace(/\s+/g, ' ').slice(0, n);

await doA('demo.reset', { preset: 'live' });
const b = await chromium.launch(); const errs = [];
const page = async (w, h, user) => {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto(APP + '/#/Login'); if (user) await p.evaluate(u => localStorage.setItem('psyflo_user', u), user);
  return p;
};

// ---------- A. the school referral and the guardian's agreement ----------
log('A · school referral consent');
const school = await page(1440, 1000);
const before = (await state()).referrals.length;
await school.goto(APP + '/#/ReferralForm'); await school.waitForTimeout(700);
ok(!/About 10 minutes|Has the guardian been told/i.test(await school.locator('#root').innerText()), 'no intro paragraph, old guardian question gone');
await school.fill('#fn', 'Sam'); await school.fill('#ln', 'Torres'); await school.fill('#gn', 'Maria Torres'); await school.fill('#gp', '(434) 555-0188');
await school.locator('input[name=ga][value=no]').check();
ok(/Guardian agreement is needed to refer/.test(await txt(school.locator('#gafield'))), 'No shows "Guardian agreement is needed to refer" beside the field');
await school.locator('#root a[href="#submit"]').click(); await school.waitForTimeout(700);
ok(/ReferralForm/.test(school.url()), 'submit on No stays on the form');
ok((await state()).referrals.length === before, 'no referral was created on No');
const rej = await rawDo('referral.create', { form: { client: 'S.T., 9', guardian_agrees: false } });
ok(rej.ok === false && /Guardian agreement is needed/.test(rej.error), 'referral.create rejects No: ' + rej.error);
const rej2 = await rawDo('referral.create', { form: { client: 'S.T., 9' } });
ok(rej2.ok === false, 'referral.create rejects a missing answer');
await school.screenshot({ path: shot + '/flowD-0-referral-no.png' });
await school.locator('input[name=ga][value=yes]').check(); await school.waitForTimeout(200);
ok(!/Guardian agreement is needed/.test(await txt(school.locator('#gafield'))), 'the line clears on Yes');
await school.locator('#root a[href="#submit"]').click(); await school.waitForTimeout(1200);
ok(/ReferralSent/.test(school.url()), 'Yes submits and opens Referral sent');
let s = await state(); const made = s.referrals[0];
log('new referral:', made.id, made.client, '· guardian_agrees:', made.form?.guardian_agrees, made.guardian_agrees);
ok(s.referrals.length === before + 1 && made.form?.guardian_agrees === true && made.guardian_agrees === true && made.stage === 'needs_screening', 'Yes creates the referral with form.guardian_agrees = true');
// a saved draft cannot slip through on No either
const dr = await doA('referral.create', { form: { client: 'Draft · A.B.', guardian_agrees: '' }, draft: true });
const rej3 = await rawDo('referral.submitDraft', { id: dr.id, form: { guardian_agrees: false } });
ok(rej3.ok === false, 'a draft cannot be submitted on No (referral.submitDraft)');
await doA('referral.submitDraft', { id: dr.id, form: { guardian_agrees: true } });
ok((await state()).referrals.find(r => r.id === dr.id).stage === 'needs_screening', 'a draft submits on Yes');
await school.screenshot({ path: shot + '/flowD-0-referral-sent.png' });
// reconcile list: what the lead should see in the app (owner B1's pages)
const staff = await page(1440, 950, 'jperez');
await staff.goto(APP + '/#/Referrals'); await staff.waitForTimeout(900); // the Intake view (owner B1) is still routed as Referrals
const intakeText = await staff.locator('#root').innerText();
log('Intake view lists the new referral:', intakeText.includes(made.client.split(',')[0]) ? 'yes' : 'NOT FOUND (owner B1: the Intake view should list a referral made through the school form)');
await staff.goto(APP + '/#/Referral?id=' + made.id); await staff.waitForTimeout(900);
const refText = await staff.locator('#root').innerText();
log('Referral page mentions the guardian agreement:', /agree/i.test(refText) ? 'yes' : 'NOT FOUND (owner B1: first checklist line "Guardian agrees")');

// ---------- B. Flow D: the family link ----------
log('B · family link (REF-118)');
const link = await doA('familyLink.send', { referral: 'REF-118', by: 'jperez' });
const url = `${APP}/f/${link.token}`; log('SMS link:', url);
await staff.goto(APP + '/#/Eligibility?referral=REF-118'); await staff.waitForTimeout(700);
log('eligibility before:', await txt(staff.locator('#root main'), 120));
const phone = await page(390, 844);
await phone.goto(url); await phone.waitForTimeout(900);
const seq = []; let oneQ = true, dotsOk = true;
// language toggle: Spanish and back
const first = await txt(phone.locator('#q'));
await phone.locator('#root a[href="#es"]').click(); await phone.waitForTimeout(300);
ok((await txt(phone.locator('#q'))) !== first, 'ES toggle changes the question: "' + first + '" → "' + await txt(phone.locator('#q')) + '"');
await phone.locator('#root a[href="#en"]').click(); await phone.waitForTimeout(300);
for (let i = 0; i < 16; i++) {
  const has = async sel => (await phone.locator(sel).count()) > 0;
  if (!(await has('#q'))) break;
  seq.push(await txt(phone.locator('#q')));
  // one question per screen: one text field, one select, or one radio group, plus a camera link at most
  const fields = await phone.evaluate(() => { const r = document.querySelector('#root'); const names = new Set([...r.querySelectorAll('input[type=radio]')].map(x => x.name)); return r.querySelectorAll('input:not([type=radio]):not([type=file]), select, textarea').length + names.size; });
  if (fields !== 1) { oneQ = false; log('  more than one field on:', seq.at(-1), fields); }
  const dots = await phone.locator('.c-dots i').count(); if (!dots) dotsOk = false;
  if (await has('#gname')) await phone.fill('#gname', 'Denise Rivers');
  if (await has('#phone')) await phone.fill('#phone', '(434) 555-0147');
  if (await has('#plan')) { const o = (await phone.locator('#plan option').allTextContents()).find(t => /health plan/.test(t)); await phone.selectOption('#plan', { label: o }); }
  if (await has('#mid')) await phone.fill('#mid', '0912 456 789 01');
  if (await has('#dob')) await phone.fill('#dob', '03/14/2014');
  for (const r of await phone.locator('#root input[type=radio]').all()) { const name = await r.getAttribute('name'); if (name && !(await phone.locator(`#root input[name="${name}"]:checked`).count())) await r.check({ force: true }); }
  await phone.locator('#root a[href="#next"]').first().click(); await phone.waitForTimeout(500);
  if (i === 1) await phone.screenshot({ path: shot + '/flowD-1-phone-question.png' });
}
log('questions:', seq.join(' | '));
ok(seq.length >= 8, `one question per screen (${seq.length} screens)`); ok(oneQ, 'exactly one field on every screen'); ok(dotsOk, 'progress dots on every screen');
await phone.waitForTimeout(600);
ok(/Thank you/.test(await txt(phone.locator('#root'), 200)), 'done screen: ' + await txt(phone.locator('#root'), 120));
await phone.screenshot({ path: shot + '/flowD-2-phone-done.png' });
await staff.waitForTimeout(800);
s = await state(); const fl = s.family_links.find(f => f.referral === 'REF-118'); const el = s.eligibility.find(e => e.referral === 'REF-118');
ok(!!fl.submitted_at && ['guardian', 'insurance', 'consent', 'best_time', 'transport'].every(k => fl.steps[k]), 'family link submitted, all five steps done');
ok(el.status === 'details_received' && /0912/.test(el.lookup?.medicaid_id || ''), 'Eligibility has the lookup details: ' + el.status + ' · ' + el.lookup?.medicaid_id);
log('eligibility screen now:', await txt(staff.locator('#root main'), 160));
await doA('eligibility.record', { referral: 'REF-118', result: 'active', plan: 'humana', effective: '2026-07-01' });
s = await state();
ok(s.referrals.find(r => r.id === 'REF-118').eligibility === 'active · Humana', 'record → the referral eligibility chip reads: ' + s.referrals.find(r => r.id === 'REF-118').eligibility);
await staff.goto(APP + '/#/Referral?id=REF-118'); await staff.waitForTimeout(800);
await staff.screenshot({ path: shot + '/flowD-3-referral.png' });
// Parent signs → portal
await phone.goto(`${APP}/parent/${fl.token}/ParentSign`); await phone.waitForTimeout(800);
const bb = await phone.locator('canvas').first().boundingBox();
await phone.mouse.move(bb.x + 20, bb.y + 40); await phone.mouse.down(); for (let x = 20; x < bb.width - 20; x += 15) await phone.mouse.move(bb.x + x, bb.y + 40 + Math.sin(x / 15) * 20); await phone.mouse.up();
await phone.locator('#root a[href="#sign"]').first().click(); await phone.waitForTimeout(1500);
s = await state(); const cs = s.consents.find(x => x.client === 'TW');
ok(cs?.status === 'signed' && !!cs.file, 'consent signed with a PDF: ' + cs?.file);
log('parent portal:', await txt(phone.locator('#root'), 200));
await phone.screenshot({ path: shot + '/flowD-4-portal.png' });

// ---------- C. the phone app ----------
log('C · phone app (K. Hale)');
const hand = await page(390, 844, 'khale');
await hand.goto(APP + '/#/MobileApp'); await hand.waitForTimeout(800);
const t0 = (await state()).timers.khale.client;
await hand.evaluate(() => window.postMessage({ psyflo: 'present', cmd: 'example' }, '*')); await hand.waitForTimeout(900);
s = await state(); ok(s.timers.khale.client !== t0 && !!s.timers.khale.started, `voice tag moved the timer ${t0} → ${s.timers.khale.client}`);
await hand.locator('.c-timer .c-btn').click(); await hand.waitForTimeout(700);
s = await state(); ok(!s.timers.khale.started && s.timers.khale.blocks.every(bl => bl[1] >= bl[0]), 'Stop saves a block that does not run backwards');
await hand.locator('a.c-btn.pri.lg').click(); await hand.waitForTimeout(600);
await hand.evaluate(() => window.postMessage({ psyflo: 'present', cmd: 'example' }, '*')); await hand.waitForTimeout(600);
ok((await hand.locator('#spoken').inputValue()).length > 20, 'presenter "example" fills the dictation');
await hand.getByText('Looks right').click(); await hand.waitForTimeout(800);
s = await state(); ok(s.dictations.some(d => d.status === 'waiting' && d.staff === 'khale'), 'Looks right saves a dictation that waits for Lauris');
await hand.screenshot({ path: shot + '/flowD-5-dictation.png' });
await hand.goto(APP + '/#/MobileAssess'); await hand.waitForTimeout(500);
await hand.locator('a', { hasText: 'Ask now' }).first().click(); await hand.waitForTimeout(300);
await hand.locator('.c-num').nth(0).locator('button').nth(4).click(); await hand.locator('.c-num').nth(1).locator('button').nth(6).click();
await hand.getByText('Save answers').click(); await hand.waitForTimeout(700);
s = await state(); ok(s.assessments.some(a => a.instrument === 'SUDS' && a.answers?.now === 4 && a.answers?.worst === 6), 'SUDS answers saved (two questions)');

ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.join(' | ').slice(0, 300) : ''));
await b.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nflowD ok');
process.exit(fails.length ? 1 : 0);
