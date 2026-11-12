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

await T.test('queue (artifact layout): nine columns, four open cases sorted by deadline, a source chip on each deadline, rows link to the case, the filters of the artifact, the pager at the foot (no "N of M" at the top)', async () => {
  const p = await open('jperez'); await p.goto(BASE + '/#/DenialIntelligence'); await p.waitForSelector('.ui-qt__row');
  const heads = await p.$$eval('.ui-qt__table th', ths => ths.map(t => t.innerText.trim()));
  assert.deepEq(heads, ['Denial', 'Consumer', 'Payer', 'Service', 'Decision', 'Status', 'Next step', 'Deadline', 'Owner']);
  const rows = await p.$$eval('.ui-qt__row', rs => rs.map(r => ({ id: r.dataset.rowId, text: r.innerText, link: (r.querySelector('a') || {}).getAttribute && r.querySelector('a').getAttribute('href'), chips: [...r.querySelectorAll('[data-verification]')].map(c => c.dataset.verification) })));
  assert.eq(rows.length, 4); assert.deepEq(rows.map(r => r.link), ['#/DenialCase?id=R-0408', '#/DenialCase?id=R-0402', '#/DenialCase?id=R-0388', '#/DenialCase?id=R-0384']);
  assert.match(rows[0].text, /DI-0408/); for (const r of rows) assert.ok(r.chips.length >= 1, 'a source chip on the deadline of ' + r.id);
  assert.ok(!/Demo: receive|Advance the clock/i.test(await txt(p)), 'no demo buttons on the screen (the dock has them)');
  const labels = await p.$$eval('#root .ui-fsel__l', ls => ls.map(l => l.innerText.trim())); assert.deepEq(labels, ['Status', 'Decision type', 'Payer', 'Service', 'Assigned clinician', 'Deadline', 'Next step']);
  assert.ok(await p.locator('.ui-fsearch').count() === 1, 'search');
  // no "N of M" count at the top; the pager sits under the table with 10, 25, 50, 100
  assert.ok(!(await p.locator('.ui-fcount').count()) || !/\d+ of \d+/.test(await p.locator('.ui-fcount').innerText()), 'no N of M in the filter bar');
  const pg = p.locator('.ui-pager'); assert.eq(await pg.count(), 1); assert.deepEq(await pg.locator('select option').allInnerTexts(), ['10', '25', '50', '100']); assert.match(await pg.innerText(), /Showing 1–4 of 4 denials/);
  const yq = await p.evaluate(() => ({ t: document.querySelector('.ui-qt').getBoundingClientRect().bottom, p: document.querySelector('.ui-pager').getBoundingClientRect().top })); assert.ok(yq.p >= yq.t - 1, 'the pager is below the table');
  await pg.locator('select').selectOption('10'); await p.waitForTimeout(250); assert.match(await hash(p), /size=10/, 'the page size is in the URL'); assert.match(await pg.innerText(), /Showing 1–4 of 4 denials/);
  await p.getByRole('button', { name: /^Deadline/ }).click(); await p.waitForTimeout(200);
  assert.eq((await p.$$eval('.ui-qt__row', rs => rs[0].dataset.rowId)), 'DI-0384', 'sorting by deadline descending');
  await p.selectOption('#di-f-decision', 'partial'); await p.waitForTimeout(250);
  assert.eq(await p.$$eval('.ui-qt__row', rs => rs.length), 2, 'the Decision type filter'); assert.match(await hash(p), /decision=partial/, 'the filter is in the URL');
  await p.selectOption('#di-f-decision', ''); await p.waitForTimeout(150);
  // the Decision date card: this week holds three decisions (Oct 27, 27, 28), before this week one (Oct 22), today none
  assert.match(await p.locator('.d-datec').innerText(), /Decision date[\s\S]*Any dates/);
  await p.getByRole('button', { name: 'This week', exact: true }).click(); await p.waitForTimeout(250); assert.eq(await p.$$eval('.ui-qt__row', rs => rs.length), 3); assert.match(await hash(p), /from=2026-10-26&to=2026-11-01/);
  await p.getByRole('button', { name: 'Before this week', exact: true }).click(); await p.waitForTimeout(250); assert.deepEq(await p.$$eval('.ui-qt__row', rs => rs.map(r => r.dataset.rowId)), ['DI-0384']);
  await p.getByRole('button', { name: 'Today', exact: true }).click(); await p.waitForTimeout(250); assert.eq(await p.$$eval('.ui-qt__row', rs => rs.length), 0); assert.match(await txt(p), /Nothing matches/); assert.match(await p.locator('.ui-pager').innerText(), /No denials/);
  await p.getByRole('button', { name: 'Today', exact: true }).click(); await p.waitForTimeout(250); assert.eq(await p.$$eval('.ui-qt__row', rs => rs.length), 4, 'pressing the lit range clears it');
  await shot(p, 'queue-1440'); assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('old routes keep working and hand over: Partials, InfoRequest, PeerBrief -> the case; Partials (no id) -> the queue filtered', async () => {
  const p = await open('jperez');
  await p.goto(BASE + '/#/Partials?id=R-0402'); await p.waitForSelector('.d-menu'); assert.eq(await hash(p), '#/DenialCase?id=R-0402&section=action&action=options'); assert.match(await txt(p), /Decide on the offer/);
  await p.goto(BASE + '/#/InfoRequest?id=R-0408'); await p.waitForSelector('.d-menu'); assert.match(await hash(p), /DenialCase\?id=R-0408&section=action&action=info/); assert.match(await txt(p), /What was asked/);
  await p.goto(BASE + '/#/PeerBrief?id=R-0388'); await p.waitForSelector('.d-menu'); assert.match(await hash(p), /DenialCase\?id=R-0388&section=action&action=p2p/); assert.match(await txt(p), /Call notes/);
  await p.goto(BASE + '/#/Partials'); await p.waitForSelector('.ui-qt__row'); assert.match(await hash(p), /DenialIntelligence\?decision=partial/); assert.eq(await p.$$eval('.ui-qt__row', r => r.length), 2);
  await p.goto(BASE + '/#/Partials?id=R-0402&legacy=1'); await p.waitForTimeout(800); assert.match(await hash(p), /legacy=1/, 'the old screen is still reachable with legacy=1');
  assert.deepEq(p.errs.filter(e => !/legacy/.test(e)), [], p.errs.join('|')); await p.ctx.close();
});

await T.test('S5 by clicking: D.W. partial -> what Sentara said, evidence, all paths -> peer-to-peer -> outcome 130 -> back to the authorization with the stage Active', async () => {
  await reset('canvas');
  const p = await open('jperez'); await p.goto(BASE + '/#/DenialIntelligence'); await p.waitForSelector('.ui-qt__row');
  await p.getByRole('link', { name: /R-0402/ }).first().click(); await p.waitForSelector('.d-menu');
  assert.match(await txt(p), /D\.W\., 15[\s\S]*Partial approval/); assert.match(await txt(p), /Recommended next steps[\s\S]*0 of 7 done/);
  await p.getByRole('link', { name: /^What Sentara said/ }).click(); assert.match(await txt(p), /Decision details[\s\S]*Document[\s\S]*Evidence missing — verify the document reference/);
  await p.getByRole('link', { name: /^Clinical evidence/ }).click(); assert.match(await txt(p), /Evidence missing — verify previous treatment outcome/); assert.match(await txt(p), /Physical aggression toward a peer/);
  await p.getByRole('link', { name: /^Overview/ }).click(); await p.locator('#d-paths > summary').click(); const opt = await txt(p);
  assert.match(opt, /Accept decision/); assert.match(opt, /Prepare peer-to-peer/); assert.match(opt, /Payer rule not verified/); assert.match(opt, /Not available here \(2\)/);
  await p.locator('#d-paths .d-opt').filter({ hasText: 'Prepare peer-to-peer' }).getByRole('button', { name: 'Open' }).click(); await p.waitForSelector('#d-h-p2p');
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
  await p.getByRole('link', { name: 'Open in Authorizations' }).click(); await p.waitForTimeout(900);
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
  const t1 = await txt(p); assert.match(t1, /Ready to upload/); assert.match(t1, /Not sent yet/); assert.match(t1, /uploads the signed letter in Availity/);
  assert.ok(!/Sent in Availity|Sent through|portal-upload|Record the payer answer/.test(t1), 'nothing says sent before the portal page confirms: ' + t1.match(/.{0,40}(Sent in|Sent through|portal-upload).{0,40}/)); assert.eq((await p.locator('.d-steps [aria-current=step] b').innerText()).trim(), 'Response prepared', 'the process line has not reached Submitted');
  assert.ok(!(await p.getByRole('button', { name: /Mark ready for upload/ }).count()), 'the button is gone, it cannot be pressed twice'); await p.getByRole('link', { name: /^Overview/ }).click(); await p.waitForSelector('.d-next'); assert.ok(!(await p.locator('.d-next').getByRole('button').count()), 'the next-action bar offers no Send while the upload is pending'); assert.match(await p.locator('.d-next').innerText(), /Upload the signed letter in Availity · waiting for its confirmation/); await p.getByRole('link', { name: /^Appeal draft/ }).click(); await p.waitForSelector('#d-h-app'); await shot(p, 'ec-ready-to-upload-1440');
  const [popup] = await Promise.all([p.context().waitForEvent('page'), p.getByRole('link', { name: /Open Availity/ }).click()]);
  await popup.waitForLoadState(); assert.match(popup.url(), /kind=appeal/); await popup.waitForSelector('#portal-form'); await popup.click('button[type=submit]'); await popup.waitForSelector('#portal-confirmation');
  const ref = await popup.locator('#confirmation-number').innerText(); await p.bringToFront(); await p.waitForTimeout(1800);
  const s2 = await state('jperez'); const r2 = s2.requests.find(r => r.id === 'R-0384'); assert.eq(r2.stage, 'appeal_sent'); assert.eq(r2.appeal.ref, ref, 'the reference is the number the Availity page showed'); assert.eq(r2.appeal.status, 'sent');
  const t2 = await txt(p); assert.match(t2, new RegExp('Sent in Availity · confirmation ' + ref)); assert.match(t2, /Record the payer answer/); assert.ok(!/Ready to upload/.test(t2));
  await shot(p, 'ec-sent-1440'); assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('admin: the queue and the case show status and deadlines; no clinical text reaches the page; analysis, calls and drafts are locked, marking for review is not', async () => {
  await reset('canvas');
  const p = await open('dowens'); await p.goto(BASE + '/#/DenialIntelligence'); await p.waitForSelector('.ui-qt__row');
  assert.match(await txt(p), /Status view · no clinical text/); assert.eq(await p.$$eval('.ui-qt__row', r => r.length), 4);
  for (const h of ['overview', 'decision', 'said', 'evidence', 'weak', 'options', 'docreq', 'history']) { await p.goto(BASE + `/#/DenialCase?id=R-0408&section=${h}`); await p.waitForSelector('.d-menu'); const t = await txt(p); assert.ok(!/Piedmont|physical aggression|hospitali|seven incidents|IEP supports/i.test(t), `no clinical words on the ${h} section: ` + t.slice(0, 120)); }
  await p.goto(BASE + '/#/DenialCase?id=R-0408&section=evidence'); await p.waitForSelector('.d-menu'); assert.match(await txt(p), /Needs clinician/);
  await p.goto(BASE + '/#/DenialCase?id=R-0408&section=weak'); await p.waitForSelector('.d-menu'); assert.match(await txt(p), /Needs clinician/); assert.eq(await p.getByRole('button', { name: 'Analyze Denial' }).count(), 0);
  await p.goto(BASE + '/#/DenialCase?id=R-0408&section=docreq'); await p.waitForSelector('.d-menu'); assert.match(await txt(p), /Needs clinician/); assert.eq(await p.getByRole('button', { name: /Record the request/ }).count(), 0);
  await p.goto(BASE + '/#/DenialCase?id=R-0408&section=action&action=info'); await p.waitForSelector('.d-menu'); assert.eq(await p.getByRole('button', { name: 'Draft from records' }).count(), 0, 'no draft button for admin'); assert.match(await txt(p), /Needs clinician/);
  await p.goto(BASE + '/#/DenialCase?id=R-0408'); await p.waitForSelector('.d-menu');
  for (const n of ['Analyze Denial', 'Identify Missing Evidence', 'Request Additional Documentation', 'Generate Appeal Draft', 'Generate Peer-to-Peer Script', 'Prepare Reconsideration']) assert.ok(await p.getByRole('button', { name: new RegExp('^' + n) }).isDisabled(), n + ' is locked for the administrator');
  assert.ok(!(await p.getByRole('button', { name: /^Mark for Clinical Review/ }).isDisabled()), 'marking a case for review is not clinical text');
  await p.getByRole('button', { name: /^Mark for Clinical Review/ }).click(); await p.getByRole('dialog').waitFor(); await p.fill('#d-rvn', 'Please look at this one first.'); await p.getByRole('dialog').getByRole('button', { name: 'Mark for Clinical Review' }).click(); await p.waitForTimeout(800);
  assert.match(await txt(p), /Clinical review · Jordan Perez/); assert.ok(!/Please look at this one first/.test(await p.content()), 'the reviewer note is not in the administrator page');
  await shot(p, 'admin-info-1440');
  const html = await p.content(); assert.ok(!/Piedmont Counseling|Level 2 incident/.test(html), 'not even in the DOM');
  await p.locator('.d-upd__b').click(); const items = await p.locator('.d-upd__p button').allInnerTexts(); assert.deepEq(items, ['Update the clinical review…', 'Change the owner…'], 'the administrator\'s status menu offers no clinical step');
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('keyboard and dialogs: tabs and rows are reachable, the dialog traps focus, Escape closes it and focus returns', async () => {
  await reset('canvas');
  const p = await open('jperez'); await p.goto(BASE + '/#/DenialCase?id=R-0402&section=action&action=options'); await p.waitForSelector('.d-menu');
  await p.getByRole('button', { name: 'Log the decision' }).focus(); await p.keyboard.press('Enter'); await p.waitForSelector('[role=dialog]');
  assert.ok(await p.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement)), 'focus moved into the dialog');
  for (let i = 0; i < 6; i++) await p.keyboard.press('Tab'); assert.ok(await p.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement)), 'Tab is trapped');
  await p.keyboard.press('Escape'); await p.waitForTimeout(200); assert.eq(await p.locator('[role=dialog]').count(), 0); assert.ok(await p.evaluate(() => !!document.activeElement && document.activeElement !== document.body), 'focus returned');
  assert.eq(await p.locator('h1').count(), 1, 'one h1'); assert.ok(await p.locator('main').count() >= 1);
  assert.eq(await p.$$eval('.d-menu a', as => as.filter(a => a.getAttribute('aria-current') === 'page').length), 1);
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('overview (artifact layout): header card with the process line, left menu, seven steps; Analyze opens a slide-over and fills "Where the denial is weak"; the review and the documentation request are saved', async () => {
  await reset('canvas');
  const p = await open('jperez'); await p.goto(BASE + '/#/DenialCase?id=R-0408'); await p.waitForSelector('.d-menu');
  const hd = await p.locator('.d-hd').innerText(); assert.match(hd, /K\.T\., 9/); assert.match(hd, /Information request/); assert.match(hd, /Update status/); assert.match(hd, /Call payer · voice agent/); assert.match(hd, /Open in Authorizations/); assert.match(hd, /Open in Lauris/);
  assert.deepEq(await p.$$eval('.d-steps li b', bs => bs.map(b => b.innerText)), ['Decision received', 'Clinical review', 'Response prepared', 'Submitted', 'Payer response', 'Resolved']); assert.eq(await p.locator('.d-steps [aria-current=step]').count(), 1);
  const menu = await p.locator('.d-menu').innerText(); for (const w of ['REVIEW', 'Overview', 'What Anthem asked', 'Clinical evidence', 'Where the denial is weak', 'RESPOND', 'Reply to Anthem', 'Appeal draft', 'Peer-to-peer script', 'Reconsideration', 'Documentation request']) assert.ok(menu.includes(w), 'menu has ' + w);
  assert.deepEq(await p.$$eval('.d-act__t b', bs => bs.map(b => b.innerText)), ['Analyze Denial', 'Identify Missing Evidence', 'Request Additional Documentation', 'Generate Appeal Draft', 'Generate Peer-to-Peer Script', 'Prepare Reconsideration', 'Mark for Clinical Review']);
  assert.match(await txt(p), /What Anthem asked[\s\S]*What the chart shows[\s\S]*Payer correspondence/i); assert.match(await txt(p), /Where the denial is weak[\s\S]*Not analyzed yet/); assert.ok(await p.locator('#d-hist').count() === 1 && !(await p.locator('#d-hist').getAttribute('open')), 'History is collapsed');
  assert.ok(await p.locator('mark.d-miss, .ui-evidence').count() >= 1, 'the chart facts carry their sources');
  await p.getByRole('button', { name: /^Analyze Denial/ }).first().click(); const dr = p.getByRole('dialog'); await dr.waitFor(); assert.match(await dr.innerText(), /Analyze Denial[\s\S]*rule-based[\s\S]*Simulated/); assert.match(await dr.innerText(), /Strong|Gap/);
  await dr.getByRole('button', { name: 'Open the full analysis' }).click(); await p.waitForTimeout(400);
  const w = await txt(p); assert.match(w, /Where the denial is weak[\s\S]*Analyzed Oct 29/); assert.match(w, /Gap[\s\S]*Not documented: why the IEP supports are not enough/); assert.match(w, /Risk[\s\S]*illustrative samples/); assert.match(w, /Strong[\s\S]*The record answers/);
  assert.ok(!/likel|probab|chance of|%/i.test(await p.locator('.d-wk').innerText()), 'no likelihood is given');
  const d = (await state('jperez')).disputes.find(x => x.request === 'R-0408'); assert.eq(d.analysis.by, 'jperez');
  await p.getByRole('link', { name: /^Documentation request/ }).click(); await p.waitForTimeout(300); await p.getByLabel('School counselor').check(); await p.getByRole('button', { name: 'Record the request' }).click(); await p.waitForTimeout(700);
  assert.match(await txt(p), /Requested from School counselor[\s\S]*Psyflo sends no message[\s\S]*Requested[\s\S]*why the IEP supports are not enough/);
  await p.getByRole('button', { name: 'Mark received' }).click(); await p.waitForTimeout(500); assert.match(await txt(p), /1 of 1 received[\s\S]*Received/);
  await p.getByRole('link', { name: /^Overview/ }).click(); await p.waitForTimeout(250); await p.getByRole('button', { name: /^Mark for Clinical Review/ }).click(); const rv = p.getByRole('dialog'); await rv.waitFor(); assert.match(await rv.innerText(), /What the reviewer will find[\s\S]*Analyze Denial[\s\S]*Request Additional Documentation/);
  await rv.getByRole('button', { name: 'Mark for Clinical Review' }).click(); await p.waitForTimeout(700); const o = await txt(p); assert.match(o, /Clinical review · Jordan Perez/); assert.match(o, /3 of 7 done|4 of 7 done/);
  const hs = await p.locator('.d-steps').innerText(); assert.match(hs, /Oct 28/); await shot(p, 'overview-kt-1440'); assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('Update status offers only the recorded steps that fit the stage (status is derived from the request, never typed); Lauris opens on the consumer', async () => {
  await reset('canvas');
  const p = await open('jperez'); const menu = async id => { await p.goto(BASE + '/#/DenialCase?id=' + id); await p.waitForSelector('.d-menu'); await p.locator('.d-upd__b').click(); const it = await p.locator('.d-upd__p button').allInnerTexts(); await p.keyboard.press('Escape'); return it; };
  assert.deepEq(await menu('R-0402'), ['Accept the offer…', 'Ask for a peer-to-peer…', 'Request reconsideration', 'Mark for clinical review…', 'Change the owner…']);
  assert.deepEq(await menu('R-0384'), ['Prepare an appeal', 'Request reconsideration', 'Accept the denial…', 'Mark for clinical review…', 'Change the owner…']);
  assert.deepEq(await menu('R-0388'), ['Change the call…', 'Log the outcome…', 'Mark for clinical review…', 'Change the owner…']);
  assert.deepEq(await menu('R-0408'), ['Draft or review the reply', 'Mark for clinical review…', 'Change the owner…']);
  const href = await p.getByRole('link', { name: /Open in Lauris/ }).getAttribute('href'); assert.match(href, /\/login\?as=jperez&next=%2Fconsumers%2F/); assert.eq(await p.getByRole('link', { name: /Open in Lauris/ }).getAttribute('target'), '_blank');
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('1024 px and 390 px: no horizontal scroll on the queue or any section', async () => {
  await reset('canvas');
  for (const w of [1024, 390]) {
    const p = await open('jperez', w);
    for (const h of ['/DenialIntelligence', '/DenialCase?id=R-0402', '/DenialCase?id=R-0402&section=said', '/DenialCase?id=R-0402&section=evidence', '/DenialCase?id=R-0402&section=weak', '/DenialCase?id=R-0402&section=docreq', '/DenialCase?id=R-0402&section=action&action=options', '/DenialCase?id=R-0408&section=action&action=info', '/DenialCase?id=R-0388&section=action&action=p2p', '/DenialCase?id=R-0384&section=action&action=appeal', '/DenialCase?id=R-0402&section=history']) {
      await p.goto(BASE + '/#' + h); await p.waitForTimeout(450); const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      assert.ok(o.sw <= o.cw + 1, `${w}px ${h}: scroll width ${o.sw} > ${o.cw}`);
    }
    if (w === 1024) await shot(p, 'case-1024'); await p.ctx.close();
  }
});

await browser.close();
await T.done();
