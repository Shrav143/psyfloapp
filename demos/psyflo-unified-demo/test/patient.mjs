// Patient chart (B1, feedback round Nov 11): documentation first, the authorization as one section. The selector refuses out-of-scope patients
// (fail closed), then the screen in a browser per role: tabs, Open/All and Notes/Forms filters, the sample-data chip on forms, Review for a
// reviewer, Open in Lauris as the one action on a note or form (R4: the same helper as the Dashboard; never the administrator), a patient with no
// authorization, another person's patient denied, phone width.
import { suite, assert, state, reset, playwright, errors, login, session, BASE, LAURIS, SHOTS } from './lib/index.mjs';
import { patientChart } from '../web/js/shared/sel/roster.js';

const T = suite('patient');
const actorOf = async id => { const s = await state(id); const u = s.staff.find(x => x.id === id); const a = (await session(id)).actor; return { s, actor: { ...u, designations: a.designations || u.designations || [], presenter: !!a.presenter } }; };

await reset('live');

await T.test('selector fails closed: no actor, a portal actor, an unknown id, and a patient outside the role\'s scope all return null', async () => {
  const { s, actor } = await actorOf('jperez');
  assert.eq(patientChart(s, null, 'MR'), null); assert.eq(patientChart(s, { id: 'x', role: 'guardian' }, 'MR'), null); assert.eq(patientChart(s, actor, 'NOPE'), null);
  const ds = await actorOf('khale'); assert.eq(patientChart(ds.s, ds.actor, 'DW'), null, 'khale cannot open slane\'s patient'); assert.ok(patientChart(ds.s, ds.actor, 'MR'));
  const sup = await actorOf('cdiaz'); assert.eq(patientChart(sup.s, sup.actor, 'TW'), null, 'a Lynchburg client is outside a Campbell supervisor\'s scope'); assert.ok(patientChart(sup.s, sup.actor, 'DW'));
});
await T.test('the chart holds documentation with or without an authorization: T.W. has forms and no authorization; M.R. has both', async () => {
  const { s, actor } = await actorOf('jperez');
  const tw = patientChart(s, actor, 'TW'); assert.eq(tw.auth, null); assert.ok(tw.docs.some(d => d.type === 'intake' && d.group === 'form'), 'T.W. intake is on the chart');
  const mr = patientChart(s, actor, 'MR'); assert.ok(mr.auth && mr.auth.units.warn && mr.auth.requestId, 'M.R. has an authorization summary with the unit flag');
  assert.ok(mr.docs.some(d => d.group === 'note') && mr.docs.some(d => d.group === 'form'));
  assert.ok(mr.can.reviewNotes && mr.can.openCase);
  const ad = await actorOf('dowens'); const a = patientChart(ad.s, ad.actor, 'MR'); assert.ok(!a.can.reviewNotes && !a.can.writeNotes && !a.can.text, 'administrator: status only');
});

const { chromium } = playwright();
const browser = await chromium.launch(); const ctxs = [];
async function open(user, path, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: o.w || 1440, height: o.h || 1000 } }); ctxs.push(ctx); const page = await ctx.newPage(); page.errs = errors(page);
  if (user) await login(page, user, { presenter: false });
  await page.goto(BASE + path); if (user) await page.reload();
  await page.waitForFunction(() => document.querySelector('#root .pt-page') && !document.querySelector('#root .sh-loading'), null, { timeout: 15000 });
  await page.waitForTimeout(300);
  return page;
}
const done = async () => { for (const c of ctxs.splice(0)) await c.close().catch(() => { }); };
const fatal = p => p.errs.filter(e => !/controller (Parent|Family)|404/.test(e));
const rootText = p => p.evaluate(() => document.getElementById('root').innerText);

try {
  await T.test('clinician: header, Documentation tab with open items first, Open / All and Notes / Forms filters, sample-data chip on forms, tab to Authorization', async () => {
    const p = await open('jperez', '/#/Patient?id=MR');
    assert.eq(await p.locator('#root h1').count(), 1); assert.match(await p.locator('#root h1').innerText(), /M\.R\./);
    assert.match(await rootText(p), /Lauris #\s*3310/); assert.ok(await p.locator('.pt-back').count(), 'back to the Dashboard');
    assert.match(await p.locator('.pt-tab[aria-current=page]').innerText(), /Documentation/);
    const open1 = await p.locator('.ui-qt__row').count(); assert.ok(open1 >= 4, 'open items only by default');
    const first = await p.locator('.ui-qt__row').first().innerText(); assert.match(first, /Behind/, 'what is behind comes first');
    await p.locator('.pt-seg__b', { hasText: 'All' }).first().click(); await p.waitForTimeout(300);
    assert.ok(await p.locator('.ui-qt__row').count() > open1, 'All shows what was filed too');
    await p.locator('.pt-seg__b', { hasText: 'Forms' }).click(); await p.waitForTimeout(300);
    const txt = await rootText(p); assert.match(txt, /Treatment plan|Quarterly report/); assert.match(txt, /sample data, illustrative/i); assert.noMatch(txt, /Daily note/);
    await p.locator('.pt-seg__b', { hasText: 'Notes' }).click(); await p.waitForTimeout(300);
    assert.noMatch(await rootText(p), /sample data, illustrative/i, 'the sample-data chip is only on forms'); assert.match(await rootText(p), /Daily note/);
    await p.screenshot({ path: SHOTS + '/patient-documentation-1440.png' });
    await p.locator('.pt-tab', { hasText: 'Authorization' }).click(); await p.waitForTimeout(500);
    assert.match(await p.evaluate(() => location.hash), /section=authorization/);
    const t2 = await rootText(p); assert.match(t2, /27 left of 110/); assert.ok(await p.locator('.ui-units__flag').count(), 'the unit flag'); assert.ok(await p.locator('.ui-dateflag').count());
    const caseLink = p.locator('a.ui-btn', { hasText: 'Open case' }); assert.match(await caseLink.getAttribute('href'), /Authorization\?id=R-0411/);
    await p.screenshot({ path: SHOTS + '/patient-authorization-1440.png' });
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('a patient with no authorization says so in one line; the chart still shows intake, CNA and plan', async () => {
    const p = await open('jperez', '/#/Patient?id=TW&section=authorization');
    assert.match(await rootText(p), /No authorization/); assert.eq(await p.locator('a.ui-btn', { hasText: 'Open case' }).count(), 0);
    await p.locator('.pt-tab', { hasText: 'Documentation' }).click(); await p.waitForTimeout(400);
    const t = await rootText(p); assert.match(t, /Intake form/); assert.match(t, /CNA/); assert.match(t, /Treatment plan/);
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('supervisor: a Review icon for notes waiting on them opens the Dashboard\'s Documents view with the note; the one other action on a row is Open in Lauris; no write verbs', async () => {
    const p = await open('cdiaz', '/#/Patient?id=DW');
    const reviews = p.locator('a.ui-hint__b[aria-label^="Review"]'); assert.ok(await reviews.count() >= 1, 'Review for a pending note');
    const href = await reviews.first().getAttribute('href'); assert.match(href, /^#\/Dashboard\?/); assert.match(href, /view=documents/); assert.match(href, /id=/); assert.match(href, /status=pending_review/);
    assert.ok(await p.locator('a[data-lauris]').count() >= 3, 'Open in Lauris on the document rows'); assert.eq(await p.locator('.ui-qt a.ui-btn, .ui-qt button.ui-btn').count(), 0, 'no text buttons in the table: icons with hover definitions');
    assert.eq(await p.locator('a.ui-btn', { hasText: /Write note|Fix note/ }).count(), 0, 'a supervisor does not write the note');
    await p.screenshot({ path: SHOTS + '/patient-supervisor-1440.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('direct support: Open in Lauris on what is behind (the same helper as the Dashboard), own patient only; another person\'s patient is denied and shows nothing of theirs', async () => {
    let p = await open('khale', '/#/Patient?id=MR');
    const w = p.locator('a[data-lauris]'); assert.ok(await w.count() >= 2, 'the one action on a note is Open in Lauris');
    const hrefs = await w.evaluateAll(els => els.map(e => e.getAttribute('href'))); assert.ok(hrefs.every(h => h.startsWith(LAURIS + '/login?as=khale&next=%2F')), 'every link is /login?as=khale&next=<path>: ' + hrefs[0]);
    assert.ok(hrefs.some(h => /next=%2Fconsumers%2F3310%2Fsession%2Fdpn/.test(h)) && hrefs.some(h => /next=%2Fconsumers%2F3310%2Fsession%2Fweekly/.test(h)), 'the daily note and the weekly call open their own forms');
    assert.match(await w.first().getAttribute('aria-label'), /^Open in Lauris: M\.R\., /); assert.eq(await p.locator('a.ui-btn', { hasText: /Write note|Fix note/ }).count(), 0, 'no Psyflo-side write links any more');
    assert.eq(await p.locator('a.ui-hint__b[aria-label^="Review"]').count(), 0); await p.close();
    p = await open('khale', '/#/Patient?id=DW'); const t = await rootText(p);
    assert.match(t, /Patient not found/); assert.noMatch(t, /S\. Lane|Sentara|D\.W\./, 'nothing of another caseload'); assert.ok(await p.locator('a', { hasText: 'Back to Dashboard' }).count());
    await p.screenshot({ path: SHOTS + '/patient-denied-1440.png' }); await done();
  });
  await T.test('administrator: statuses only, Open case allowed, no Review, no Open in Lauris, no Write buttons', async () => {
    const p = await open('dowens', '/#/Patient?id=MR');
    assert.eq(await p.locator('a.ui-btn', { hasText: /Review|Write note|Fix note/ }).count(), 0); assert.eq(await p.locator('a[data-lauris], a.ui-hint__b[aria-label^="Review"]').count(), 0, 'no Lauris link, no review icon');
    await p.locator('.pt-tab', { hasText: 'Authorization' }).click(); await p.waitForTimeout(400);
    assert.ok(await p.locator('a.ui-btn', { hasText: 'Open case' }).count(), 'administrators may open the case');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('phone width: the chart has no horizontal scroll and the documentation rows stack with 44 px buttons', async () => {
    const p = await open('khale', '/#/Patient?id=MR', { w: 390, h: 900 });
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow');
    const h = await p.locator('a[data-lauris]').first().evaluate(e => e.getBoundingClientRect().height); assert.ok(h >= 44, 'tap target ' + h);
    await p.screenshot({ path: SHOTS + '/patient-documentation-390.png' });
    const q = await open('jperez', '/#/Patient?id=MR&section=authorization', { w: 390, h: 900 }); assert.ok(await q.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'authorization section: no overflow');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
} finally { await browser.close(); }
await T.done();
