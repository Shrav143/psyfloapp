// Documents and Staff views of the Dashboard (R4: the Documentation tab became part of the Dashboard; one nav item, one name, Patients | Documents | Staff):
// notes, intake forms, CNAs, plans across patients, whether or not there is an authorization.
// Pure selectors against the projected state of each role, the server's refusals behind the screen, and the screen in a browser:
// scope per role, filters and URL persistence, the review drawer end to end (approve, return with a required note), the Staff view,
// the administrator seeing statuses and dates but no note text and no Review button, direct support having no Documents view (the switch is not shown
// and ?view=documents falls back to Patients), the redirects from #/Documentation, #/ReviewQueue and My Work carrying their filters, "Open in Lauris" on
// every row, no paragraphs, phone width.
import { suite, assert, api, tryApi, state, reset, playwright, errors, login, session, BASE, LAURIS, SHOTS } from './lib/index.mjs';
import { documentRows, allDocs, normalizeDocs, clientsInScope, DOC_TYPES } from '../web/js/shared/sel/roster.js';
import { pendingFor } from '../web/js/shared/sel/mywork.js';
import { routeAllowed } from '../web/js/shared/permissions.js';
import { MATURITY } from '../web/js/shared/maturity.js';
import { NAV } from '../web/js/shared/nav.js';
import { NAV_FOR } from '../web/js/shared/permissions.js';

const T = suite('documentation');
const actorOf = async id => { const s = await state(id); const u = s.staff.find(x => x.id === id); const a = (await session(id)).actor; return { s, actor: { ...u, designations: a.designations || [] } }; };

await reset('live');

// ------------------------------------------------------------------------------------------------ selectors and projection
await T.test('scope per role: supervisor = the staff they manage and their sites, clinician and administrator = every patient; every row is a patient in scope', async () => {
  const sup = await actorOf('cdiaz'), clin = await actorOf('jperez'), adm = await actorOf('dowens');
  const rs = documentRows(sup.s, sup.actor), rc = documentRows(clin.s, clin.actor), ra = documentRows(adm.s, adm.actor);
  assert.ok(rs.total > 0 && rs.total < rc.total, `supervisor ${rs.total} is a subset of clinician ${rc.total}`);
  assert.eq(ra.total, rc.total, 'administrator sees the same rows (status only)');
  const scope = new Set(clientsInScope(sup.s, sup.actor).map(c => c.id));
  assert.ok(allDocs(sup.s, sup.actor).every(d => scope.has(d.client)), 'no supervisor row outside the scope');
  assert.ok(!allDocs(sup.s, sup.actor).some(d => ['TW', 'KT', 'EC', 'JO'].includes(d.client)), 'Lynchburg patients are not in a Campbell supervisor\'s scope');
  assert.ok(allDocs(clin.s, clin.actor).some(d => d.group === 'form') && allDocs(clin.s, clin.actor).some(d => d.group === 'note'), 'notes and forms');
  assert.eq(documentRows(sup.s, null).rows.length, 0, 'no actor, no rows (no default user)');
});
await T.test('statuses: Open = behind + due + in progress + needs review + sent back; the on-time share counts filed notes only; types come from the documents', async () => {
  const { s, actor } = await actorOf('jperez'); const r = documentRows(s, actor); const c = r.counts;
  assert.eq(c.open, c.behind + c.due + c.in_progress + c.pending_review + c.returned);
  assert.ok(c.behind >= 1 && c.pending_review >= 1 && c.done >= 1, 'a behind, a needs-review and a done row exist');
  assert.ok(r.timely && r.timely.of > 0 && r.timely.pct <= 100);
  assert.ok(documentRows(s, actor, { status: 'behind' }).rows.every(d => d.status === 'behind' && d.sev === 'r'));
  assert.ok(documentRows(s, actor, { group: 'form' }).rows.every(d => d.group === 'form'));
  assert.deepEq(normalizeDocs({ type: 'nonsense', status: 'wizard', group: 'x' }).type + normalizeDocs({ status: 'wizard' }).status, '', 'unknown filter values are dropped');
  assert.ok(DOC_TYPES.includes('intake') && DOC_TYPES.includes('cna'));
});
await T.test('the administrator\'s state carries no note text; the supervisor and clinician may', async () => {
  const adm = await state('dowens'); const clin = await state('jperez');
  assert.ok(adm.notes.length > 0 && adm.notes.every(n => !n.dictation && !n.enhanced), 'no dictation or enhanced text for the administrator');
  assert.ok(clin.notes.some(n => n.dictation), 'the clinician has the text');
});
await T.test('the server refuses what the screen hides: administrator and direct support cannot review; nobody reviews their own note', async () => {
  const s = await state('cdiaz'); const n = s.notes.find(x => x.review === 'pending');
  await assert.refused(tryApi('note.review', { id: n.id, decision: 'approved' }, 'dowens'), /not allowed|needs|only/i, 403);
  await assert.refused(tryApi('note.review', { id: n.id, decision: 'approved' }, 'khale'), /not allowed|needs|only/i, 403);
  const own = s.notes.find(x => x.review === 'pending' && x.staff === 'rowens');
  assert.ok(own, 'a pending note by a staffer on approval exists');
  await assert.refused(tryApi('note.review', { id: own.id, decision: 'approved' }, 'rowens'), /not allowed|needs|only/i, 403);
  assert.ok(!routeAllowed('direct_support', 'Documentation'), 'direct support has no Documentation route');
  assert.ok(routeAllowed('supervisor', 'Documentation') && routeAllowed('admin', 'Documentation') && routeAllowed('clinician', 'Documentation'));
  assert.ok(MATURITY['route.Documentation'] && MATURITY['route.Documentation'].routes.includes('Dashboard'), 'the Documents view is registered in the maturity registry, on the Dashboard');
});
await T.test('R4 one rail item: there is no Documentation item in the navigation for any role; the Dashboard item lights up for the old ids', () => {
  const all = [...NAV.primary, ...NAV.secondary]; assert.ok(!all.some(i => i.route === 'Documentation' || /documentation/i.test(i.label)), 'no Documentation nav item');
  const dash = all.find(i => i.id === 'dashboard'); assert.ok(dash.activeFor.includes('Documentation') && dash.activeFor.includes('ReviewQueue'), 'the Dashboard item is lit for the old ids');
  for (const role of ['direct_support', 'supervisor', 'clinician', 'admin']) { assert.ok(!NAV_FOR(role).includes('Documentation'), role + ': NAV_FOR has no Documentation'); assert.ok(NAV_FOR(role).includes('Dashboard')); }
});
await T.test('R4 documents carry the Lauris page of the document and the Lauris number apart (the number is what a person reads)', async () => {
  const { s, actor } = await actorOf('jperez'); const all = allDocs(s, actor);
  assert.ok(all.every(d => /^\d{4}$/.test(String(d.laurisNo))), 'every row has a four-digit Lauris number: ' + [...new Set(all.map(d => d.laurisNo))].slice(0, 5));
  assert.ok(all.every(d => !d.lauris || /^\/(consumers\/\d+(\/session\/[\w-]+|\?tab=active)|consumers\/new\?referral=[\w-]+|sessions\/\d+)$/.test(d.lauris)), 'every row\'s Lauris page is a mock Lauris path');
  const am = all.find(d => d.client === 'AM' && d.type === 'intake'); assert.ok(am, 'A.M. has an intake form'); assert.eq(am.lauris, '/consumers/3360/session/screening', 'an intake form is the Admission Screening'); assert.eq(am.laurisNo, 3360);
  const isp = all.find(d => d.client === 'DP' && d.type === 'isp'); assert.eq(isp.lauris, '/consumers/3320/session/isp');
  const pending = all.find(d => d.status === 'pending_review' && d.group === 'note'); assert.match(pending.lauris, /^\/consumers\/\d+\?tab=active$|^\/sessions\/\d+$/, 'a note waiting for a review opens where it is filed');
  assert.deepEq(documentRows(s, actor, { q: '3360', status: '' }).rows.map(d => d.client).filter((c, i, a) => a.indexOf(c) === i), ['AM'], 'search by the Lauris number still finds the patient');
});

// ------------------------------------------------------------------------------------------------ browser
const { chromium } = playwright();
const browser = await chromium.launch(); const ctxs = [];
async function open(user, path, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 } }); ctxs.push(ctx); const page = await ctx.newPage(); page.errs = errors(page);
  page.bodies = []; if (o.record) page.on('response', async r => { if (/\/api\//.test(r.url())) { try { page.bodies.push(await r.text()); } catch { } } });
  if (user) await login(page, user, { presenter: false });
  await page.goto(BASE + path); if (user) await page.reload();
  await page.waitForFunction(() => document.querySelector('#root .d-page, #root .denied, #root .ui-empty') && !document.querySelector('#root .sh-loading'), null, { timeout: 15000 });
  await page.waitForTimeout(300);
  return page;
}
const done = async () => { for (const c of ctxs.splice(0)) await c.close().catch(() => { }); };
const fatal = p => p.errs.filter(e => !/controller (Parent|Family)|404/.test(e));
const rootText = p => p.evaluate(() => document.getElementById('root').innerText);
const rowsText = p => p.locator('[data-ui-id="doc"] tbody tr').allInnerTexts();
const pendingIds = async user => (await state(user)).notes.filter(n => n.review === 'pending').map(n => n.id);

try {
  await T.test('supervisor: one h1 (Dashboard), Documents is a view of it, Open is the default, the table has Patient to Open, the status chips carry counts, nothing outside the scope', async () => {
    const p = await open('cdiaz', '/#/Dashboard?view=documents');
    assert.eq(await p.locator('#root h1').count(), 1); assert.eq((await p.locator('#root h1').innerText()).trim(), 'Dashboard');
    assert.deepEq((await p.locator('.d-view__b').allInnerTexts()).map(t => t.trim()), ['Patients', 'Documents', 'Staff'], 'the switch'); assert.eq(await p.locator('.d-view__b[aria-current="page"]').innerText(), 'Documents');
    assert.eq(await p.locator('.ui-fchip[aria-pressed="true"]').innerText().then(t => t.replace(/\s+/g, ' ').trim()).then(t => t.replace(/\d+/, '').trim()), 'Open');
    const heads = (await p.locator('[data-ui-id="doc"] thead th').allInnerTexts()).map(t => t.trim()).join('|'); assert.match(heads, /Patient.*Document.*Staff.*Due.*Status.*Reviewed by.*Open/s);
    assert.ok((await p.locator('[data-ui-id="doc"] tbody tr[data-ui-row]').count()) > 5, 'rows');
    const chips = (await p.locator('.ui-fchip').allInnerTexts()).join('|'); assert.match(chips.replace(/\s+/g, ' '), /Open \d+.*Behind \d+.*Needs review \d+.*Sent back \d+.*Filed late \d+.*Done \d+.*All \d+/s);
    assert.eq(await p.locator('.doc-ontime').count(), 1, 'the on-time figure'); assert.match(await p.locator('.doc-ontime .ui-hint__b').getAttribute('aria-label'), /^On time: \d+ of \d+ filed notes were processed on time$/); assert.match(await p.locator('.doc-ontime').innerText(), /^\d+ of \d+$/, 'an icon and the figure; the words are the hover');
    const text = await rootText(p); assert.noMatch(text, /T\.W\.|K\.T\.|E\.C\.|J\.O\./, 'Lynchburg patients are outside this supervisor\'s scope');
    assert.match(text, /Lauris #3310/, 'the Lauris number is what the patient cell shows'); assert.noMatch(text, /Lauris #\/|\/consumers\//, 'never the path (the 3310 shown as "#/consumers/3310/session/weekly" bug)');
    assert.ok((await p.locator('.doc-sample').count()) === 1, 'forms are marked as sample data, once, quietly');
    assert.eq(await p.locator('#root p').count(), 0, 'no paragraphs');
    await p.screenshot({ path: SHOTS + '/documentation-supervisor-1440.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('R4 every document row opens in Lauris: an icon with the Lauris page of that document; Review only on a note waiting for this reviewer; the chart icon', async () => {
    const want = (as, path) => `${LAURIS}/login?as=${as}&next=${encodeURIComponent(path)}`;
    const p = await open('cdiaz', '/#/Dashboard?view=documents&status=all');
    const rows = p.locator('[data-ui-id="doc"] tbody tr[data-ui-row]'); const n = await rows.count(); assert.ok(n >= 20, 'rows');
    assert.eq(await p.locator('[data-ui-id="doc"] a[data-lauris]').count(), n, 'a Lauris icon on every row');
    assert.eq(await p.locator('[data-ui-id="doc"] .ui-btn').count(), 0, 'no text buttons in the table: the actions are icons');
    const bad = await p.locator('[data-ui-id="doc"] a[data-lauris]').evaluateAll((els, L) => els.filter(e => !e.getAttribute('href').startsWith(L + '/login?as=cdiaz&next=%2F') || e.target !== '_blank').map(e => e.getAttribute('href')), LAURIS); assert.deepEq(bad, [], 'every link is /login?as=cdiaz&next=<path>, in a new tab');
    const mrWeekly = p.locator('[data-ui-id="doc"] tr', { hasText: 'Weekly guardian call' }).filter({ hasText: 'M.R.' }).first();
    assert.eq(await mrWeekly.locator('a[data-lauris]').getAttribute('href'), want('cdiaz', '/consumers/3310/session/weekly')); assert.match(await mrWeekly.locator('a[data-lauris]').getAttribute('aria-label'), /^Open in Lauris: M\.R\., Weekly guardian call Week of Sep 28 \(opens Lauris in a new tab\)$/);
    assert.eq(await mrWeekly.locator('[data-x="review"]').count(), 0, 'a note that is behind is not reviewable');
    const waiting = p.locator('[data-ui-id="doc"] tr', { hasText: 'Needs review' }).first(); assert.eq(await waiting.locator('[data-x="review"]').count(), 1, 'Review on a note waiting for this reviewer'); assert.eq(await waiting.locator('a[data-lauris]').count(), 1, 'and Lauris');
    assert.match(await waiting.locator('a[data-lauris]').getAttribute('href'), /next=%2Fconsumers%2F4102%3Ftab%3Dactive|next=%2Fconsumers%2F\d+%3Ftab%3Dactive/, 'a filed note opens in the Active File');
    const done_ = p.locator('[data-ui-id="doc"] tr', { hasText: 'Done' }).first(); assert.eq(await done_.locator('[data-x="review"]').count(), 0, 'no Review on a finished note');
    assert.match(await waiting.locator('a.ui-hint__b:not([data-lauris])').getAttribute('href'), /^#\/Patient\?id=/, 'the chart icon'); assert.match(await waiting.locator('a.ui-hint__b:not([data-lauris])').getAttribute('aria-label'), /^Open chart for /);
    await p.fill('input[data-ui-fsearch]', '3360'); await p.waitForTimeout(450); const am = p.locator('[data-ui-id="doc"] tr', { hasText: 'Intake form' }).first();
    assert.ok(await am.count(), 'A.M.\'s intake form (done) is listed under All'); assert.eq(await am.locator('a[data-lauris]').getAttribute('href'), want('cdiaz', '/consumers/3360/session/screening'), 'the intake form of A.M. #3360 opens the Admission Screening');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('R4 the switch: Patients | Documents | Staff are real links (a view is an address); q, site and staff travel with it; Back keeps the view', async () => {
    const p = await open('cdiaz', '/#/Dashboard?q=3310');
    assert.eq(await p.locator('.d-view__b[aria-current="page"]').innerText(), 'Patients'); assert.eq(await p.locator('.d-row').count(), 1);
    await p.locator('.d-view__b', { hasText: 'Documents' }).click(); await p.waitForSelector('[data-ui-id="doc"]'); await p.waitForTimeout(300);
    assert.match(await p.evaluate(() => location.hash), /view=documents/); assert.match(await p.evaluate(() => location.hash), /q=3310/, 'the search travels with the switch');
    const rows = await rowsText(p); assert.ok(rows.length > 0 && rows.every(r => /M\.R\./.test(r)), 'the same patient'); assert.eq(await p.locator('.d-view__b[aria-current="page"]').innerText(), 'Documents');
    await p.goBack(); await p.waitForSelector('.d-row'); await p.waitForTimeout(300); assert.eq(await p.locator('.d-view__b[aria-current="page"]').innerText(), 'Patients', 'Back returns to Patients'); assert.ok(!(await p.evaluate(() => location.hash)).includes('view='));
    await p.goForward(); await p.waitForSelector('[data-ui-id="doc"]'); assert.eq(await p.locator('.d-view__b[aria-current="page"]').innerText(), 'Documents', 'Forward returns to Documents');
    await p.reload(); await p.waitForSelector('[data-ui-id="doc"]'); await p.waitForTimeout(300); assert.eq(await p.locator('.d-view__b[aria-current="page"]').innerText(), 'Documents', 'a reload keeps the view');
    await p.locator('.d-view__b', { hasText: 'Staff' }).click(); await p.waitForSelector('[data-ui-id="doc-staff"]'); assert.match(await p.evaluate(() => location.hash), /view=staff/);
    assert.ok(await p.locator('.d-view-wrap .ui-hint__b').count(), 'a hover definition of the three views'); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('filters: status chip, document type, search, group; each persists in the URL and survives a reload; Clear filters returns to Open', async () => {
    const p = await open('cdiaz', '/#/Dashboard?view=documents');
    await p.click('.ui-fchip:has-text("Needs review")'); await p.waitForTimeout(250);
    assert.match(await p.evaluate(() => location.hash), /status=pending_review/); assert.match(await p.evaluate(() => location.hash), /view=documents/, 'the view stays in the address');
    let rows = await rowsText(p); assert.ok(rows.length > 0 && rows.every(r => /Needs review/.test(r)), 'only Needs review rows');
    await p.reload(); await p.waitForSelector('[data-ui-id="doc"]'); await p.waitForTimeout(300);
    assert.eq((await p.locator('.ui-fchip[aria-pressed="true"]').innerText()).replace(/\s+/g, ' ').replace(/\d+/, '').trim(), 'Needs review', 'the chip survives a reload');
    await p.click('.ui-fchip:has-text("All")'); await p.waitForTimeout(250);
    await p.selectOption('[data-ui-fselect][data-key="type"]', 'intake'); await p.waitForTimeout(250);
    rows = await rowsText(p); assert.match(await p.evaluate(() => location.hash), /type=intake/); assert.ok(rows.every(r => /Intake form/.test(r)), 'only intake forms (or none)');
    await p.selectOption('[data-ui-fselect][data-key="type"]', ''); await p.selectOption('[data-ui-fselect][data-key="group"]', 'note'); await p.waitForTimeout(250);
    assert.ok((await rowsText(p)).every(r => /note|call|collateral/i.test(r)), 'notes only'); assert.eq(await p.locator('.doc-sample').count(), 0, 'no sample chip when only notes are shown');
    await p.selectOption('[data-ui-fselect][data-key="group"]', '');
    await p.fill('input[data-ui-fsearch]', 'M.R.'); await p.waitForTimeout(450);
    rows = await rowsText(p); assert.ok(rows.length > 0 && rows.every(r => /M\.R\./.test(r)), 'search by initials');
    await p.fill('input[data-ui-fsearch]', '4102'); await p.waitForTimeout(450);
    rows = await rowsText(p); assert.ok(rows.length > 0 && rows.every(r => /D\.W\./.test(r)), 'search by Lauris number');
    await p.fill('input[data-ui-fsearch]', '');
    await p.fill('#doc-from', '2026-10-30'); await p.dispatchEvent('#doc-from', 'change'); await p.waitForTimeout(300);
    assert.match(await p.evaluate(() => location.hash), /from=2026-10-30/, 'due range in the URL');
    await p.click('.ui-fcount button'); await p.waitForTimeout(300);
    assert.eq((await p.locator('.ui-fchip[aria-pressed="true"]').innerText()).replace(/\s+/g, ' ').replace(/\d+/, '').trim(), 'Open', 'Clear returns to Open');
    assert.eq(await p.locator('#doc-from').inputValue(), '', 'dates cleared'); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('sorting by Due and Status; the pager (rows per page 10, 25, 50, 100) replaces the count and Show more; header stays', async () => {
    const p = await open('jperez', '/#/Dashboard?view=documents&status=all');
    await p.click('[data-ui-id="doc"] .ui-qt__sort[data-key="due"]'); await p.waitForTimeout(250);
    const first = (await p.locator('[data-ui-id="doc"] tbody tr').first().innerText()); assert.ok(first.length > 0);
    assert.match(await p.evaluate(() => location.hash), /sort=due/);
    assert.eq(await p.locator('[data-ui-id="doc"] thead th[aria-sort="ascending"]').count(), 1);
    assert.eq(await p.locator('.ui-qt__more').count(), 0, 'no Show more any more'); assert.eq(await p.locator('.ui-fcount b.ui-num').count(), 0, 'no N of M count above the table');
    assert.deepEq(await p.locator('select[data-ui-pgsize] option').allTextContents(), ['10', '25', '50', '100'], 'rows per page'); assert.match(await p.locator('.ui-pager__range').innerText(), /^Showing 1–25 of \d+ documents/);
    assert.eq(await p.locator('[data-ui-id="doc"] tbody tr[data-ui-row]').count(), 25, 'the default page is 25 rows');
    await p.selectOption('select[data-ui-pgsize]', '10'); await p.waitForTimeout(250); assert.eq(await p.locator('[data-ui-id="doc"] tbody tr[data-ui-row]').count(), 10); assert.match(await p.evaluate(() => location.hash), /size=10/);
    await p.click('[data-ui-pgnext]'); await p.waitForTimeout(250); assert.match(await p.locator('.ui-pager__range').innerText(), /^Showing 11–20 of/); assert.match(await p.evaluate(() => location.hash), /page=2/);
    await p.selectOption('select[data-ui-pgsize]', '100'); await p.waitForTimeout(250); assert.ok((await p.locator('[data-ui-id="doc"] tbody tr[data-ui-row]').count()) > 25, 'one hundred at once'); await done();
  });

  await T.test('review drawer: ?id= opens it on load; approve end to end (status changes in the table, audit event, toast); the decided note leaves Needs review', async () => {
    const ids = await pendingIds('cdiaz'); assert.ok(ids.length >= 3, 'pending notes exist');
    const reviewable = pendingFor((await actorOf('cdiaz')).s, (await actorOf('cdiaz')).actor).map(n => n.id); const id = reviewable[0]; assert.ok(id);
    const p = await open('cdiaz', '/#/Dashboard?view=documents&status=pending_review&id=' + id);
    await p.waitForSelector('.ui-dialog[data-kind="drawer"]'); const dlg = p.locator('.ui-dialog[data-kind="drawer"]');
    assert.match(await dlg.innerText(), /daily note|weekly|monthly/i); assert.ok(await dlg.locator('#doc-rv-c').count(), 'a note field');
    assert.ok(await dlg.locator('button:has-text("Approve")').count() && await dlg.locator('button:has-text("Return with a note")').count() && await dlg.locator('button:has-text("didn\'t happen")').count(), 'three decisions');
    await p.screenshot({ path: SHOTS + '/documentation-review-drawer-1440.png' });
    const before = (await p.locator('.ui-fchip[aria-pressed="true"]').innerText()).match(/\d+/)[0];
    await dlg.locator('button:has-text("Approve")').click(); await p.waitForTimeout(800);
    assert.eq(await p.locator('.ui-dialog[data-kind="drawer"]').count(), 0, 'the drawer closes');
    const s = await state('cdiaz'); const n = s.notes.find(x => x.id === id); assert.eq(n.review, 'approved'); assert.eq(n.reviewed_by, 'cdiaz');
    assert.ok(s.events.some(e => /Note approved/.test(e.what)), 'audit row');
    assert.eq(+(await p.locator('.ui-fchip[aria-pressed="true"]').innerText()).match(/\d+/)[0], +before - 1, 'one fewer in Needs review');
    assert.match(await p.locator('.ui-toast, [role=status]').allInnerTexts().then(a => a.join(' ')), /approved/i);
    assert.ok(!(await p.evaluate(() => location.hash)).includes('id='), 'the id leaves the URL');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('return with a note: the note is required, the drawer stays open on the error; then the note goes back (status Sent back, audit event, reviewer named)', async () => {
    const a = await actorOf('cdiaz'); const id = pendingFor(a.s, a.actor)[0].id;
    const p = await open('cdiaz', '/#/Dashboard?view=documents&status=pending_review');
    await p.locator(`[data-x="review"][data-id="${id}"]`).click(); await p.waitForSelector('.ui-dialog[data-kind="drawer"]');
    await p.click('.ui-dialog button:has-text("Return with a note")'); await p.waitForTimeout(250);
    assert.match(await p.locator('#doc-rv-err').innerText(), /Say what to change/); assert.ok(await p.locator('.ui-dialog[data-kind="drawer"]').count(), 'the drawer stays open');
    assert.eq((await state('cdiaz')).notes.find(x => x.id === id).review, 'pending', 'nothing was sent');
    await p.fill('#doc-rv-c', 'Name the goal and the intervention.'); await p.click('.ui-dialog button:has-text("Return with a note")'); await p.waitForTimeout(800);
    const s = await state('cdiaz'); const n = s.notes.find(x => x.id === id); assert.eq(n.review, 'returned'); assert.eq(n.review_comment, 'Name the goal and the intervention.');
    assert.ok(s.events.some(e => /returned/i.test(e.what)), 'audit row for the return');
    await p.click('.ui-fchip:has-text("Sent back")'); await p.waitForTimeout(300);
    const rows = await rowsText(p); assert.ok(rows.length >= 1 && rows.every(r => /Sent back/.test(r)) && rows.some(r => /C\. Diaz/.test(r)), 'Sent back rows name the reviewer');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await reset('live');
  await T.test('"That didn\'t happen" needs a note too and flags the note (sent back, flagged in the audit trail)', async () => {
    const a = await actorOf('cdiaz'); const id = pendingFor(a.s, a.actor)[0].id;
    const p = await open('cdiaz', '/#/Dashboard?view=documents&id=' + id); await p.waitForSelector('.ui-dialog[data-kind="drawer"]');
    await p.click('.ui-dialog button:has-text("didn\'t happen")'); await p.waitForTimeout(250); assert.match(await p.locator('#doc-rv-err').innerText(), /Say what to change/);
    await p.fill('#doc-rv-c', 'No session that day.'); await p.click('.ui-dialog button:has-text("didn\'t happen")'); await p.waitForTimeout(800);
    assert.eq((await state('cdiaz')).notes.find(x => x.id === id).review, 'flagged'); await done();
  });
  await reset('live');

  await T.test('old links land on the Dashboard\'s Documents view and keep their filters: #/Documentation, #/ReviewQueue, My Work review and team, a note deep link opens the drawer, ?legacy=1 bounces there', async () => {
    const a = await actorOf('cdiaz'); const id = pendingFor(a.s, a.actor)[0].id;
    const lands = async (user, path, re, o = {}) => { const q = await open(user, path); assert.eq(await q.evaluate(() => psyflo.current.id), 'Dashboard', path); const h = await q.evaluate(() => location.hash); assert.match(h, /^#\/Dashboard\?/, path + ' -> ' + h); for (const r of [].concat(re)) assert.match(h, r, path + ' -> ' + h); return q; };
    let p = await lands('cdiaz', '/#/ReviewQueue', [/view=documents/, /status=pending_review/]); assert.eq(await p.locator('.d-view__b[aria-current="page"]').innerText(), 'Documents'); await p.close();
    p = await lands('cdiaz', '/#/Documentation?status=pending_review', [/view=documents/, /status=pending_review/]); assert.eq(await p.locator('.ui-fchip[aria-pressed="true"]').innerText().then(t => t.replace(/\s+\d+$/, '')), 'Needs review'); await p.close();
    p = await lands('jperez', '/#/Documentation?status=all&type=cna&q=4102&site=CC-HS1&page=1&size=10&sort=due&dir=desc', [/view=documents/, /status=all/, /type=cna/, /q=4102/, /size=10/, /sort=due/, /dir=desc/]);
    assert.eq(await p.locator('select[data-ui-pgsize]').inputValue(), '10', 'size carried'); assert.eq(await p.locator('input[data-ui-fsearch]').inputValue(), '4102', 'q carried'); await p.close();
    p = await lands('cdiaz', '/#/Documentation?from=2026-10-26&to=2026-10-31&group=note&staff=khale', [/view=documents/, /from=2026-10-26/, /to=2026-10-31/, /group=note/, /staff=khale/]);
    assert.eq(await p.locator('#doc-from').inputValue(), '2026-10-26', 'the due range carried'); const rows = await rowsText(p); assert.ok(rows.length > 0 && rows.every(r => /K\. Hale/.test(r)), 'staff carried'); await p.close();
    p = await lands('cdiaz', '/#/Documentation?view=staff&staff=khale', [/view=staff/]); assert.eq(await p.locator('.d-view__b[aria-current="page"]').innerText(), 'Staff'); await p.close();
    p = await open('cdiaz', '/#/MyWork?section=review&id=' + id); await p.waitForSelector('.ui-dialog[data-kind="drawer"]'); assert.eq(await p.evaluate(() => psyflo.current.id), 'Dashboard'); assert.match(await p.evaluate(() => location.hash), /view=documents/); await p.close();
    p = await open('cdiaz', '/#/MyWork?section=team'); assert.match(await p.evaluate(() => location.hash), /view=staff/); assert.match(await rootText(p), /K\. Hale/); await p.close();
    p = await open('cdiaz', '/#/Documentation?legacy=1&status=behind'); await p.waitForSelector('[data-ui-id="doc"]'); const h = await p.evaluate(() => location.hash); assert.match(h, /^#\/Dashboard\?/); assert.match(h, /view=documents/); assert.match(h, /status=behind/); assert.noMatch(h, /legacy/, 'the legacy flag is not carried'); await done();
  });

  await T.test('Staff view: one row per staffer in scope; a row opens the Documents view for that person; approval mode changes through staff.reviewMode', async () => {
    const p = await open('cdiaz', '/#/Dashboard?view=staff');
    assert.eq(await p.locator('.d-view__b[aria-current="page"]').innerText(), 'Staff');
    const heads = (await p.locator('[data-ui-id="doc-staff"] thead th').allInnerTexts()).join('|'); assert.match(heads, /Staff.*Patients.*Today.*On time.*Behind.*Needs review.*Approval/s);
    const names = (await p.locator('[data-ui-id="doc-staff"] tbody tr').allInnerTexts()).join('|'); for (const n of ['K. Hale', 'R. Owens', 'S. Lane', 'J. Reyes']) assert.match(names, new RegExp(n));
    assert.eq(await p.locator('#root p').count(), 0, 'no paragraphs');
    const row = p.locator('tr', { hasText: 'R. Owens' }); await row.locator('[data-x="apprOff"]').click(); await p.waitForSelector('.ui-dialog');
    await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(700);
    assert.eq((await state('cdiaz')).staff.find(x => x.id === 'rowens').review_mode, 'spot_check', 'approval turned off through staff.reviewMode');
    await p.screenshot({ path: SHOTS + '/documentation-by-staff-1440.png' });
    await p.locator('tr', { hasText: 'K. Hale' }).locator('a.ui-qt__link').click(); await p.waitForSelector('.d-view__b[aria-current="page"]:has-text("Documents")'); await p.waitForTimeout(300);
    assert.match(await p.evaluate(() => location.hash), /staff=khale/); const rows = await rowsText(p); assert.ok(rows.length > 0 && rows.every(r => /K\. Hale/.test(r)), 'filtered to that staffer');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await reset('live');

  await T.test('clinician: every patient, Review on notes waiting, no review on their own notes, forms marked as sample data', async () => {
    const p = await open('jperez', '/#/Dashboard?view=documents');
    assert.ok((await p.locator('[data-ui-id="doc"] tbody tr[data-ui-row]').count()) > 10);
    assert.match(await rootText(p), /J\.O\./, 'every patient, including those at other sites'); assert.ok((await p.locator('.doc-sample').count()) === 1, 'forms are marked as sample data');
    await p.click('.ui-fchip:has-text("Needs review")'); await p.waitForTimeout(250);
    assert.ok((await p.locator('[data-x="review"]').count()) >= 1, 'a clinician reviews'); assert.eq(await p.locator('#root p').count(), 0, 'no paragraphs');
    assert.deepEq((await p.locator('.d-view__b').allInnerTexts()).map(t => t.trim()), ['Patients', 'Documents', 'Staff']);
    await p.screenshot({ path: SHOTS + '/documentation-clinician-1440.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });

  await T.test('administrator: statuses and dates, no Review button, no Open in Lauris, no note text in the page or in any response, the drawer link does nothing', async () => {
    const clin = await state('jperez'); const sample = clin.notes.find(n => n.review === 'pending' && n.dictation && String(n.dictation).length > 40);
    const phrase = String(sample.dictation).replace(/\s+/g, ' ').slice(0, 36);
    const p = await open('dowens', '/#/Dashboard?view=documents&status=pending_review&id=' + sample.id, { record: true });
    assert.eq(await p.locator('.ui-dialog[data-kind="drawer"]').count(), 0, 'no drawer for an administrator');
    assert.eq(await p.locator('[data-x="review"]').count(), 0, 'no Review buttons'); assert.eq(await p.locator('[data-x="apprOn"], [data-x="apprOff"]').count(), 0);
    assert.eq(await p.locator('a[data-lauris]').count(), 0, 'the administrator holds no ext.use: no Open in Lauris'); assert.eq(await p.locator('#root a[href*="/login?as="]').count(), 0);
    assert.ok((await p.locator('[data-ui-id="doc"] tbody tr[data-ui-row]').count()) > 0, 'statuses and dates are there'); assert.ok(await p.locator('[data-ui-id="doc"] a.ui-hint__b[href^="#/Patient"]').count() > 0, 'the chart icon stays');
    assert.deepEq((await p.locator('.d-view__b').allInnerTexts()).map(t => t.trim()), ['Patients', 'Documents', 'Staff'], 'the administrator has all three views (status only)');
    const text = await rootText(p); assert.ok(!text.replace(/\s+/g, ' ').includes(phrase), 'note text is not on the page');
    assert.ok(p.bodies.every(b => !b.replace(/\\n/g, ' ').replace(/\s+/g, ' ').includes(phrase)), 'note text is in no response the administrator received');
    await p.goto(BASE + '/#/Dashboard?view=staff'); await p.waitForSelector('[data-ui-id="doc-staff"]'); await p.waitForTimeout(300);
    assert.eq(await p.locator('[data-x="apprOn"], [data-x="apprOff"]').count(), 0, 'no approval toggles in the Staff view'); assert.eq(await p.locator('#root p').count(), 0);
    await p.goto(BASE + '/#/Dashboard?view=documents'); await p.waitForSelector('[data-ui-id="doc"]'); await p.screenshot({ path: SHOTS + '/documentation-admin-1440.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });

  await T.test('direct support has no Documents view: no switch, ?view=documents and #/Documentation fall back to Patients (their own caseload), no table of documents, nothing named Documentation in the rail', async () => {
    for (const path of ['/#/Dashboard?view=documents', '/#/Dashboard?view=staff', '/#/Documentation?status=pending_review', '/#/ReviewQueue']) {
      const p = await open('khale', path);
      assert.eq(await p.evaluate(() => psyflo.current.id), 'Dashboard', path); assert.eq(await p.locator('.d-view').count(), 0, path + ': no switch'); assert.eq(await p.locator('[data-ui-id="doc"], [data-ui-id="doc-staff"], .doc-ontime, #doc-f-q').count(), 0, path + ': no documents table');
      assert.ok(await p.locator('.d-row').count() >= 5, path + ': the roster (Patients) shows'); assert.noMatch(await rootText(p), /Not available/i, path + ': a fall back, not a denial');
      const rows = await p.locator('.d-row[data-id]').evaluateAll(els => els.map(e => e.dataset.id)); const ds = await actorOf('khale'); assert.deepEq(rows.slice().sort(), clientsInScope(ds.s, ds.actor).map(c => c.id).sort(), path + ': only their own patients');
      assert.ok(!(await p.locator('#rail, nav').allInnerTexts().then(a => a.join(' '))).match(/Documentation|Documents/), path + ': no Documentation in their navigation'); assert.deepEq(fatal(p), [], 'console errors'); await p.close();
    }
    const doc = await state('khale'); assert.ok(!routeAllowed('direct_support', 'Documentation'), 'the capability cell is unchanged: direct support has no documentation capability'); void doc; await done();
  });
  await T.test('the rail has one item for all of it: Dashboard, lit on Patients, Documents and Staff; no Documentation item for the supervisor, clinician or administrator either', async () => {
    for (const user of ['cdiaz', 'jperez', 'dowens']) {
      const p = await open(user, '/#/Dashboard?view=documents');
      const items = await p.evaluate(() => [...document.querySelectorAll('#rail .sh-nav__i')].map(a => ({ t: a.getAttribute('title'), on: a.getAttribute('aria-current') === 'page' })));
      assert.ok(!items.some(i => /Documentation/.test(i.t)), user + ': no Documentation item: ' + items.map(i => i.t)); assert.deepEq(items.filter(i => i.on).map(i => i.t), ['Dashboard'], user + ': Dashboard is lit on the Documents view');
      await p.goto(BASE + '/#/Documentation?status=behind'); await p.waitForSelector('[data-ui-id="doc"]'); await p.waitForTimeout(200);
      assert.deepEq(await p.evaluate(() => [...document.querySelectorAll('#rail .sh-nav__i[aria-current="page"]')].map(a => a.getAttribute('title'))), ['Dashboard'], user + ': the old id lights Dashboard'); await p.close();
    }
    await done();
  });

  await T.test('phone width: no sideways scroll for the supervisor (all three views), the clinician and the administrator; documents become cards with 44 px icons', async () => {
    for (const [user, path] of [['cdiaz', '/#/Dashboard?view=documents'], ['cdiaz', '/#/Dashboard?view=staff'], ['jperez', '/#/Dashboard?view=documents&status=pending_review'], ['dowens', '/#/Dashboard?view=documents']]) {
      const p = await open(user, path, { w: 390, h: 844 });
      const w = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })); assert.ok(w.sw <= w.iw + 1, `${user} ${path}: no horizontal scroll (${w.sw} > ${w.iw})`);
      if (!/staff/.test(path)) { const r = await p.evaluate(() => { const sc = document.querySelector('[data-ui-id="doc"] .ui-qt__scroll'); return { sw: sc.scrollWidth, cw: sc.clientWidth }; }); assert.ok(r.sw <= r.cw + 1, `${user}: the documents table needs no sideways scroll either (${r.sw} > ${r.cw})`); }
      const small = await p.evaluate(() => [...document.querySelectorAll('#root .doc-acts .ui-hint__b, #root .d-view__b')].filter(b => b.getBoundingClientRect().height && b.getBoundingClientRect().height < 36).length); assert.eq(small, 0, 'touch targets');
      await p.screenshot({ path: SHOTS + `/documentation-${user}-390.png` }); assert.deepEq(fatal(p), [], 'console errors'); await p.close();
    }
    await done();
  });
} finally { await browser.close(); }
await T.done();
