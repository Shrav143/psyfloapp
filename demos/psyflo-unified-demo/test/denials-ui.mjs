// Denial Intelligence in the browser (E3): the queue, the redirects of the old routes, scenario S5 by clicking, the K.T. information reply through
// the mock Availity page, role limits (admin reads no clinical text), keyboard and dialog basics, no console errors. Screenshots go to $SHOTS.
// Run: BASE=http://localhost:4840 node test/denials-ui.mjs
import { suite, assert, login, errors, playwright, reset, state, api, BASE, SHOTS } from './lib/index.mjs';

const T = suite('denials-ui');
const { chromium } = playwright();
const browser = await chromium.launch();
const open = async (user, width = 1440) => { const ctx = await browser.newContext({ viewport: { width, height: 900 } }); const page = await ctx.newPage(); page.errs = errors(page); await login(page, user, { presenter: false }); page.ctx = ctx; return page; };
const txt = page => page.evaluate(() => (document.getElementById('root') || {}).innerText || '');
const hash = page => page.evaluate(() => location.hash);
const shot = (page, name) => page.screenshot({ path: `${SHOTS}/e3-${name}.png`, fullPage: true });

await reset('canvas');

await T.test('queue: nine columns, four open cases sorted by deadline, each deadline carries a source chip, rows are links to the case', async () => {
  const p = await open('jperez'); await p.goto(BASE + '/#/DenialIntelligence'); await p.waitForSelector('.ui-qt__row');
  const heads = await p.$$eval('.ui-qt__table th', ths => ths.map(t => t.innerText.trim()));
  assert.deepEq(heads, ['Case', 'Consumer', 'Payer', 'Service', 'Decision', 'Status', 'Next action', 'Deadline', 'Owner']);
  const rows = await p.$$eval('.ui-qt__row', rs => rs.map(r => ({ id: r.dataset.rowId, text: r.innerText, link: (r.querySelector('a') || {}).getAttribute && r.querySelector('a').getAttribute('href'), chips: [...r.querySelectorAll('[data-verification]')].map(c => c.dataset.verification) })));
  assert.eq(rows.length, 4); assert.deepEq(rows.map(r => r.link), ['#/DenialCase?id=R-0408', '#/DenialCase?id=R-0402', '#/DenialCase?id=R-0388', '#/DenialCase?id=R-0384']);
  for (const r of rows) assert.ok(r.chips.length >= 1, 'a source chip on the deadline of ' + r.id);
  assert.match(await txt(p), /Admin|^/); assert.ok(!/Demo: receive|Advance the clock/i.test(await txt(p)), 'no demo buttons on the screen (the dock has them)');
  await p.getByRole('button', { name: /^Deadline/ }).click(); await p.waitForTimeout(200);
  assert.eq((await p.$$eval('.ui-qt__row', rs => rs[0].dataset.rowId)), 'DI-0384', 'sorting by deadline descending');
  await p.getByRole('button', { name: /^Partial/ }).click(); await p.waitForTimeout(200);
  assert.eq(await p.$$eval('.ui-qt__row', rs => rs.length), 2, 'the Partial chip filters'); assert.match(await hash(p), /decision=partial/, 'the filter is in the URL');
  await shot(p, 'queue-1440'); assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('old routes keep working and hand over: Partials, InfoRequest, PeerBrief -> the case; Partials (no id) -> the queue filtered', async () => {
  const p = await open('jperez');
  await p.goto(BASE + '/#/Partials?id=R-0402'); await p.waitForSelector('.d-tabs'); assert.eq(await hash(p), '#/DenialCase?id=R-0402&section=action&action=options'); assert.match(await txt(p), /Decide on the offer/);
  await p.goto(BASE + '/#/InfoRequest?id=R-0408'); await p.waitForSelector('.d-tabs'); assert.match(await hash(p), /DenialCase\?id=R-0408&section=action&action=info/); assert.match(await txt(p), /What was asked/);
  await p.goto(BASE + '/#/PeerBrief?id=R-0388'); await p.waitForSelector('.d-tabs'); assert.match(await hash(p), /DenialCase\?id=R-0388&section=action&action=p2p/); assert.match(await txt(p), /Call notes/);
  await p.goto(BASE + '/#/Partials'); await p.waitForSelector('.ui-qt__row'); assert.match(await hash(p), /DenialIntelligence\?decision=partial/); assert.eq(await p.$$eval('.ui-qt__row', r => r.length), 2);
  await p.goto(BASE + '/#/Partials?id=R-0402&legacy=1'); await p.waitForTimeout(800); assert.match(await hash(p), /legacy=1/, 'the old screen is still reachable with legacy=1');
  assert.deepEq(p.errs.filter(e => !/legacy/.test(e)), [], p.errs.join('|')); await p.ctx.close();
});

await T.test('S5 by clicking: D.W. partial -> evidence and options -> peer-to-peer -> outcome 130 -> back to the authorization with the stage Active', async () => {
  await reset('canvas');
  const p = await open('jperez'); await p.goto(BASE + '/#/DenialIntelligence'); await p.waitForSelector('.ui-qt__row');
  await p.getByRole('link', { name: /R-0402/ }).first().click(); await p.waitForSelector('.d-tabs');
  assert.match(await txt(p), /D\.W\. · Partial approval/); assert.match(await txt(p), /Document[\s\S]*Evidence missing — verify the document reference/);
  await p.getByRole('link', { name: /^Evidence/ }).click(); assert.match(await txt(p), /Evidence missing — verify previous treatment outcome/); assert.match(await txt(p), /Physical aggression toward a peer/);
  await p.getByRole('link', { name: /^Options/ }).click(); const opt = await txt(p);
  assert.match(opt, /Accept decision/); assert.match(opt, /Prepare peer-to-peer/); assert.match(opt, /Payer rule not verified/); assert.match(opt, /Not available here \(2\)/);
  await p.getByRole('button', { name: 'Open' }).nth(1).click(); await p.waitForSelector('#d-h-p2p');
  await p.getByRole('button', { name: /Ask Sentara for a peer-to-peer/ }).click(); await p.getByRole('dialog').getByRole('button', { name: 'Log the request' }).click(); await p.waitForTimeout(700);
  await p.getByRole('button', { name: 'Draft from records' }).click(); await p.waitForTimeout(700);
  assert.match(await txt(p), /Evidence missing — verify the risk of a more restrictive setting/); assert.match(await txt(p), /Simulated/);
  await p.getByRole('button', { name: 'Mark reviewed' }).click(); await p.waitForTimeout(400);
  await p.getByRole('button', { name: 'Set the call' }).click(); await p.fill('#d-when', '2026-11-19T14:00'); await p.getByRole('dialog').getByRole('button', { name: 'Save the call' }).click(); await p.waitForTimeout(600);
  await p.getByRole('button', { name: 'Log the outcome' }).click(); const dlg = p.getByRole('dialog');
  await dlg.getByLabel('Approved in part').check(); await p.fill('#d-ocu', '130');
  await dlg.getByRole('button', { name: 'Record the outcome' }).click(); await p.waitForTimeout(500);
  assert.match(await txt(p), /Document reference|document reference/i, 'a decision needs its document: the dialog stays open and says so'); assert.ok(await p.getByRole('dialog').count(), 'dialog still open');
  await p.fill('#d-ocd', 'Sentara decision letter 2026-11-19'); await dlg.getByRole('button', { name: 'Record the outcome' }).click(); await p.waitForTimeout(900);
  const t = await txt(p); assert.match(t, /Partly overturned/); assert.match(t, /Peer-to-peer: 130 of 150 units approved \(110 offered\)/);
  await shot(p, 's5-done-1440');
  await p.getByRole('link', { name: 'Open authorization' }).click(); await p.waitForTimeout(900);
  assert.match(await hash(p), /#\/Authorization\?id=R-0402|#\/Authorizations/, 'back on the authorization'); const s = await state('jperez');
  assert.eq(s.requests.find(r => r.id === 'R-0402').stage, 'active'); assert.eq(s.clients.find(c => c.id === 'DW').authorization.units, 130); assert.ok(s.lauris_tasks.some(x => x.client === 'DW' && x.units === 130 && x.status === 'open'));
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('K.T. information reply: Evidence-missing blocks review, an edit clears it, Send opens the mock Availity page and the case closes when the page confirms', async () => {
  await reset('canvas');
  const p = await open('jperez'); await p.goto(BASE + '/#/DenialCase?id=R-0408&section=action&action=info'); await p.waitForSelector('#d-h-info');
  assert.match(await txt(p), /2 h left of 24/); await p.getByRole('button', { name: 'Draft from records' }).click(); await p.waitForTimeout(700);
  assert.ok(await p.getByRole('button', { name: 'Mark reviewed' }).isDisabled(), 'review is blocked while a placeholder remains');
  await p.locator('.d-secdoc').nth(2).getByRole('button', { name: 'Edit' }).click();
  const ta = p.locator('.d-edit textarea'); await ta.fill((await ta.inputValue()).replace(/\[Evidence missing[^\]]*\]/, 'The clinician states the supports do not include de-escalation in unstructured periods.'));
  await p.getByRole('button', { name: 'Save section' }).click(); await p.waitForTimeout(600);
  await p.getByRole('button', { name: 'Mark reviewed' }).click(); await p.waitForTimeout(400);
  const [popup] = await Promise.all([p.context().waitForEvent('page'), (async () => { await p.getByRole('button', { name: /Open Availity and send/ }).click(); await p.getByRole('dialog').getByRole('button', { name: /Open Availity/ }).click(); })()]);
  await popup.waitForLoadState(); await popup.waitForSelector('#portal-form'); await popup.click('button[type=submit]'); await popup.waitForSelector('#portal-confirmation');
  await p.bringToFront(); await p.waitForTimeout(1500);
  const s = await state('jperez'); assert.eq(s.requests.find(r => r.id === 'R-0408').stage, 'submitted'); const d = s.disputes.find(x => x.request === 'R-0408'); assert.ok(d.closed); assert.eq(d.status, 'resolved');
  assert.match(await txt(p), /Resolved|Closed/); await shot(p, 'kt-sent-1440'); assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('E.C. appeal on Availity: Mark ready for upload reads "Ready to upload", never "Sent"; the send appears only after the Availity page confirms (QA2 D3)', async () => {
  await reset('canvas');
  const p = await open('jperez'); await p.goto(BASE + '/#/DenialCase?id=R-0384&section=action&action=appeal'); await p.waitForSelector('#d-h-app');
  await p.getByRole('button', { name: 'Draft again from records' }).click(); await p.waitForTimeout(800);
  for (let i = 0; i < 6 && (await p.getByRole('button', { name: 'Mark reviewed' }).isDisabled().catch(() => false)); i++) { const ed = p.locator('.d-secdoc').filter({ hasText: /Evidence missing/ }).first().getByRole('button', { name: 'Edit' }); if (!(await ed.count())) break; await ed.click(); const ta = p.locator('.d-edit textarea'); await ta.fill((await ta.inputValue()).replace(/\[Evidence missing[^\]]*\]/g, 'The clinician adds the dated record before this goes out.')); await p.getByRole('button', { name: 'Save section' }).click(); await p.waitForTimeout(500); }
  await p.getByRole('button', { name: 'Mark reviewed' }).click(); await p.waitForTimeout(600);
  const gr = await fetch(BASE + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portalClient: 'EC', presenter: true }) }); const gt = { token: (await gr.json()).token };
  await api('request.appealSign', { id: 'R-0384', text: (await state(gt)).appeal_drafts['R-0384'].en }, gt);
  await p.goto(BASE + '/#/DenialCase?id=R-0384&section=action&action=appeal'); await p.waitForSelector('#d-h-app');
  await p.getByRole('button', { name: /Mark ready for upload/ }).first().click(); await p.getByRole('dialog').getByRole('button', { name: 'Mark ready' }).click(); await p.waitForTimeout(900);
  const s1 = await state('jperez'); const r1 = s1.requests.find(r => r.id === 'R-0384'); assert.eq(r1.stage, 'denied'); assert.eq(r1.appeal.status, 'ready_to_upload'); assert.ok(!r1.appeal.sent_at && !r1.appeal.ref);
  const t1 = await txt(p); assert.match(t1, /Ready to upload/); assert.match(t1, /Not sent yet/); assert.match(t1, /Upload the signed letter in Availity/);
  assert.ok(!/Sent in Availity|Sent through|portal-upload|Record the payer answer|Submitted/.test(t1), 'nothing says sent before the portal page confirms: ' + t1.match(/.{0,40}(Sent in|Sent through|portal-upload|Submitted).{0,40}/));
  assert.ok(!(await p.getByRole('button', { name: /Mark ready for upload/ }).count()), 'the button is gone, it cannot be pressed twice'); assert.ok(!(await p.locator('.d-next').getByRole('button').count()), 'the next-action bar offers no Send while the upload is pending'); await shot(p, 'ec-ready-to-upload-1440');
  const [popup] = await Promise.all([p.context().waitForEvent('page'), p.getByRole('link', { name: /Open Availity/ }).click()]);
  await popup.waitForLoadState(); assert.match(popup.url(), /kind=appeal/); await popup.waitForSelector('#portal-form'); await popup.click('button[type=submit]'); await popup.waitForSelector('#portal-confirmation');
  const ref = await popup.locator('#confirmation-number').innerText(); await p.bringToFront(); await p.waitForTimeout(1800);
  const s2 = await state('jperez'); const r2 = s2.requests.find(r => r.id === 'R-0384'); assert.eq(r2.stage, 'appeal_sent'); assert.eq(r2.appeal.ref, ref, 'the reference is the number the Availity page showed'); assert.eq(r2.appeal.status, 'sent');
  const t2 = await txt(p); assert.match(t2, new RegExp('Sent in Availity · confirmation ' + ref)); assert.match(t2, /Record the payer answer/); assert.ok(!/Ready to upload/.test(t2));
  await shot(p, 'ec-sent-1440'); assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('admin: the queue and the case show status and deadlines; no clinical text reaches the page', async () => {
  await reset('canvas');
  const p = await open('dowens'); await p.goto(BASE + '/#/DenialIntelligence'); await p.waitForSelector('.ui-qt__row');
  assert.match(await txt(p), /Status view · no clinical text/); assert.eq(await p.$$eval('.ui-qt__row', r => r.length), 4);
  for (const h of ['decision', 'evidence', 'options', 'history']) { await p.goto(BASE + `/#/DenialCase?id=R-0408&section=${h}`); await p.waitForSelector('.d-tabs'); const t = await txt(p); assert.ok(!/Piedmont|physical aggression|hospitali|seven incidents|IEP supports/i.test(t), `no clinical words on the ${h} section: ` + t.slice(0, 120)); }
  await p.goto(BASE + '/#/DenialCase?id=R-0408&section=evidence'); await p.waitForSelector('.d-tabs'); assert.match(await txt(p), /Needs clinician/);
  await p.goto(BASE + '/#/DenialCase?id=R-0408&section=action&action=info'); await p.waitForSelector('.d-tabs'); assert.eq(await p.getByRole('button', { name: 'Draft from records' }).count(), 0, 'no draft button for admin'); assert.match(await txt(p), /Needs clinician/);
  await shot(p, 'admin-info-1440');
  const html = await p.content(); assert.ok(!/Piedmont Counseling|Level 2 incident/.test(html), 'not even in the DOM');
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('keyboard and dialogs: tabs and rows are reachable, the dialog traps focus, Escape closes it and focus returns', async () => {
  await reset('canvas');
  const p = await open('jperez'); await p.goto(BASE + '/#/DenialCase?id=R-0402&section=action&action=options'); await p.waitForSelector('.d-tabs');
  await p.getByRole('button', { name: 'Log the decision' }).focus(); await p.keyboard.press('Enter'); await p.waitForSelector('[role=dialog]');
  assert.ok(await p.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement)), 'focus moved into the dialog');
  for (let i = 0; i < 6; i++) await p.keyboard.press('Tab'); assert.ok(await p.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement)), 'Tab is trapped');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); assert.eq(await p.locator('[role=dialog]').count(), 0); assert.ok(await p.evaluate(() => !!document.activeElement && document.activeElement !== document.body), 'focus returned');
  assert.eq(await p.locator('h1').count(), 1, 'one h1'); assert.ok(await p.locator('main').count() >= 1);
  assert.eq(await p.$$eval('.d-tabs a', as => as.filter(a => a.getAttribute('aria-current') === 'page').length), 1);
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('1024 px and 390 px: no horizontal scroll on the queue or any section', async () => {
  await reset('canvas');
  for (const w of [1024, 390]) {
    const p = await open('jperez', w);
    for (const h of ['/DenialIntelligence', '/DenialCase?id=R-0402&section=decision', '/DenialCase?id=R-0402&section=evidence', '/DenialCase?id=R-0402&section=options', '/DenialCase?id=R-0408&section=action&action=info', '/DenialCase?id=R-0388&section=action&action=p2p', '/DenialCase?id=R-0384&section=action&action=appeal', '/DenialCase?id=R-0402&section=history']) {
      await p.goto(BASE + '/#' + h); await p.waitForTimeout(450); const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      assert.ok(o.sw <= o.cw + 1, `${w}px ${h}: scroll width ${o.sw} > ${o.cw}`);
    }
    if (w === 1024) await shot(p, 'case-1024'); await p.ctx.close();
  }
});

await browser.close();
await T.done();
