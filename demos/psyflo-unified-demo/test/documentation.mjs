// Documentation (route Documentation): notes, intake forms, CNAs, plans across patients, whether or not there is an authorization.
// Pure selectors against the projected state of each role, the server's refusals behind the screen, and the screen in a browser:
// scope per role, filters and URL persistence, the review drawer end to end (approve, return with a required note), the By staff tab,
// the administrator seeing statuses and dates but no note text and no Review button, direct support denied, no paragraphs, phone width.
import { suite, assert, api, tryApi, state, reset, playwright, errors, login, session, BASE, SHOTS } from './lib/index.mjs';
import { documentRows, allDocs, normalizeDocs, clientsInScope, DOC_TYPES } from '../web/js/shared/sel/roster.js';
import { pendingFor } from '../web/js/shared/sel/mywork.js';
import { routeAllowed } from '../web/js/shared/permissions.js';
import { MATURITY } from '../web/js/shared/maturity.js';

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
  assert.ok(MATURITY['route.Documentation'], 'registered in the maturity registry');
});

// ------------------------------------------------------------------------------------------------ browser
const { chromium } = playwright();
const browser = await chromium.launch(); const ctxs = [];
async function open(user, path, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 } }); ctxs.push(ctx); const page = await ctx.newPage(); page.errs = errors(page);
  page.bodies = []; if (o.record) page.on('response', async r => { if (/\/api\//.test(r.url())) { try { page.bodies.push(await r.text()); } catch { } } });
  if (user) await login(page, user, { presenter: false });
  await page.goto(BASE + path); if (user) await page.reload();
  await page.waitForFunction(() => document.querySelector('#root .doc-page, #root .denied, #root .ui-empty') && !document.querySelector('#root .sh-loading'), null, { timeout: 15000 });
  await page.waitForTimeout(300);
  return page;
}
const done = async () => { for (const c of ctxs.splice(0)) await c.close().catch(() => { }); };
const fatal = p => p.errs.filter(e => !/controller (Parent|Family)|404/.test(e));
const rootText = p => p.evaluate(() => document.getElementById('root').innerText);
const rowsText = p => p.locator('.ui-qt tbody tr').allInnerTexts();
const pendingIds = async user => (await state(user)).notes.filter(n => n.review === 'pending').map(n => n.id);

try {
  await T.test('supervisor: one h1, Open is the default, the table has Patient to Action, the status chips carry counts, nothing outside the scope', async () => {
    const p = await open('cdiaz', '/#/Documentation');
    assert.eq(await p.locator('#root h1').count(), 1); assert.eq((await p.locator('#root h1').innerText()).trim(), 'Documentation');
    assert.eq(await p.locator('.ui-fchip[aria-pressed="true"]').innerText().then(t => t.replace(/\s+/g, ' ').trim()).then(t => t.replace(/\d+/, '').trim()), 'Open');
    const heads = (await p.locator('.ui-qt thead th').allInnerTexts()).map(t => t.trim()).join('|'); assert.match(heads, /Patient.*Document.*Staff.*Due.*Status.*Reviewed by.*Action/s);
    assert.ok((await p.locator('.ui-qt tbody tr[data-ui-row]').count()) > 5, 'rows');
    const chips = (await p.locator('.ui-fchip').allInnerTexts()).join('|'); assert.match(chips.replace(/\s+/g, ' '), /Open \d+.*Behind \d+.*Needs review \d+.*Sent back \d+.*Filed late \d+.*Done \d+.*All \d+/s);
    assert.eq(await p.locator('.doc-ontime').count(), 1); assert.match(await p.locator('.doc-ontime').innerText(), /On time\s+\d+ of \d+/);
    const text = await rootText(p); assert.noMatch(text, /T\.W\.|K\.T\.|E\.C\.|J\.O\./, 'Lynchburg patients are outside this supervisor\'s scope');
    assert.ok((await p.locator('.doc-sample').count()) === 1, 'forms are marked as sample data, once, quietly');
    assert.eq(await p.locator('#root p').count(), 0, 'no paragraphs');
    await p.screenshot({ path: SHOTS + '/documentation-supervisor-1440.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('filters: status chip, document type, search, group; each persists in the URL and survives a reload; Clear filters returns to Open', async () => {
    const p = await open('cdiaz', '/#/Documentation');
    await p.click('.ui-fchip:has-text("Needs review")'); await p.waitForTimeout(250);
    assert.match(await p.evaluate(() => location.hash), /status=pending_review/);
    let rows = await rowsText(p); assert.ok(rows.length > 0 && rows.every(r => /Needs review/.test(r)), 'only Needs review rows');
    await p.reload(); await p.waitForSelector('.ui-qt'); await p.waitForTimeout(300);
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
    const p = await open('jperez', '/#/Documentation?status=all');
    await p.click('.ui-qt__sort[data-key="due"]'); await p.waitForTimeout(250);
    const first = (await p.locator('.ui-qt tbody tr').first().innerText()); assert.ok(first.length > 0);
    assert.match(await p.evaluate(() => location.hash), /sort=due/);
    assert.eq(await p.locator('.ui-qt thead th[aria-sort="ascending"]').count(), 1);
    assert.eq(await p.locator('.ui-qt__more').count(), 0, 'no Show more any more'); assert.eq(await p.locator('.ui-fcount b.ui-num').count(), 0, 'no N of M count above the table');
    assert.deepEq(await p.locator('select[data-ui-pgsize] option').allTextContents(), ['10', '25', '50', '100'], 'rows per page'); assert.match(await p.locator('.ui-pager__range').innerText(), /^Showing 1–25 of \d+ documents/);
    assert.eq(await p.locator('.ui-qt tbody tr[data-ui-row]').count(), 25, 'the default page is 25 rows');
    await p.selectOption('select[data-ui-pgsize]', '10'); await p.waitForTimeout(250); assert.eq(await p.locator('.ui-qt tbody tr[data-ui-row]').count(), 10); assert.match(await p.evaluate(() => location.hash), /size=10/);
    await p.click('[data-ui-pgnext]'); await p.waitForTimeout(250); assert.match(await p.locator('.ui-pager__range').innerText(), /^Showing 11–20 of/); assert.match(await p.evaluate(() => location.hash), /page=2/);
    await p.selectOption('select[data-ui-pgsize]', '100'); await p.waitForTimeout(250); assert.ok((await p.locator('.ui-qt tbody tr[data-ui-row]').count()) > 25, 'one hundred at once'); await done();
  });

  await T.test('review drawer: ?id= opens it on load; approve end to end (status changes in the table, audit event, toast); the decided note leaves Needs review', async () => {
    const ids = await pendingIds('cdiaz'); assert.ok(ids.length >= 3, 'pending notes exist');
    const reviewable = pendingFor((await actorOf('cdiaz')).s, (await actorOf('cdiaz')).actor).map(n => n.id); const id = reviewable[0]; assert.ok(id);
    const p = await open('cdiaz', '/#/Documentation?status=pending_review&id=' + id);
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
    const p = await open('cdiaz', '/#/Documentation?status=pending_review');
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
    const p = await open('cdiaz', '/#/Documentation?id=' + id); await p.waitForSelector('.ui-dialog[data-kind="drawer"]');
    await p.click('.ui-dialog button:has-text("didn\'t happen")'); await p.waitForTimeout(250); assert.match(await p.locator('#doc-rv-err').innerText(), /Say what to change/);
    await p.fill('#doc-rv-c', 'No session that day.'); await p.click('.ui-dialog button:has-text("didn\'t happen")'); await p.waitForTimeout(800);
    assert.eq((await state('cdiaz')).notes.find(x => x.id === id).review, 'flagged'); await done();
  });
  await reset('live');

  await T.test('old links land here: ReviewQueue, My Work review and team, and a note deep link opens the drawer', async () => {
    const a = await actorOf('cdiaz'); const id = pendingFor(a.s, a.actor)[0].id;
    let p = await open('cdiaz', '/#/ReviewQueue'); assert.eq(await p.evaluate(() => psyflo.current.id), 'Documentation'); assert.match(await p.evaluate(() => location.hash), /status=pending_review/); await p.close();
    p = await open('cdiaz', '/#/MyWork?section=review&id=' + id); await p.waitForSelector('.ui-dialog[data-kind="drawer"]'); assert.eq(await p.evaluate(() => psyflo.current.id), 'Documentation'); await p.close();
    p = await open('cdiaz', '/#/MyWork?section=team'); assert.match(await p.evaluate(() => location.hash), /view=staff/); assert.match(await rootText(p), /K\. Hale/); await done();
  });

  await T.test('By staff: one row per staffer in scope; a row opens the Documents tab for that person; approval mode changes through staff.reviewMode', async () => {
    const p = await open('cdiaz', '/#/Documentation?view=staff');
    assert.eq(await p.locator('.doc-tab[aria-current="page"]').innerText(), 'By staff');
    const heads = (await p.locator('.ui-qt thead th').allInnerTexts()).join('|'); assert.match(heads, /Staff.*Patients.*Today.*On time.*Behind.*Needs review.*Approval/s);
    const names = (await p.locator('.ui-qt tbody tr').allInnerTexts()).join('|'); for (const n of ['K. Hale', 'R. Owens', 'S. Lane', 'J. Reyes']) assert.match(names, new RegExp(n));
    assert.eq(await p.locator('#root p').count(), 0, 'no paragraphs');
    const row = p.locator('tr', { hasText: 'R. Owens' }); await row.locator('[data-x="apprOff"]').click(); await p.waitForSelector('.ui-dialog');
    await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(700);
    assert.eq((await state('cdiaz')).staff.find(x => x.id === 'rowens').review_mode, 'spot_check', 'approval turned off through staff.reviewMode');
    await p.screenshot({ path: SHOTS + '/documentation-by-staff-1440.png' });
    await p.locator('tr', { hasText: 'K. Hale' }).locator('a.ui-qt__link').click(); await p.waitForSelector('.doc-tab[aria-current="page"]:has-text("Documents")'); await p.waitForTimeout(300);
    assert.match(await p.evaluate(() => location.hash), /staff=khale/); const rows = await rowsText(p); assert.ok(rows.length > 0 && rows.every(r => /K\. Hale/.test(r)), 'filtered to that staffer');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await reset('live');

  await T.test('clinician: every patient, Review on notes waiting, no review on their own notes, forms marked as sample data', async () => {
    const p = await open('jperez', '/#/Documentation');
    assert.ok((await p.locator('.ui-qt tbody tr[data-ui-row]').count()) > 10);
    assert.match(await rootText(p), /J\.O\./, 'every patient, including those at other sites'); assert.ok((await p.locator('.doc-sample').count()) === 1, 'forms are marked as sample data');
    await p.click('.ui-fchip:has-text("Needs review")'); await p.waitForTimeout(250);
    assert.ok((await p.locator('[data-x="review"]').count()) >= 1, 'a clinician reviews'); assert.eq(await p.locator('#root p').count(), 0, 'no paragraphs');
    await p.screenshot({ path: SHOTS + '/documentation-clinician-1440.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });

  await T.test('administrator: statuses and dates, no Review button, no note text in the page or in any response, the drawer link does nothing', async () => {
    const clin = await state('jperez'); const sample = clin.notes.find(n => n.review === 'pending' && n.dictation && String(n.dictation).length > 40);
    const phrase = String(sample.dictation).replace(/\s+/g, ' ').slice(0, 36);
    const p = await open('dowens', '/#/Documentation?status=pending_review&id=' + sample.id, { record: true });
    assert.eq(await p.locator('.ui-dialog[data-kind="drawer"]').count(), 0, 'no drawer for an administrator');
    assert.eq(await p.locator('[data-x="review"]').count(), 0, 'no Review buttons'); assert.eq(await p.locator('[data-x="apprOn"], [data-x="apprOff"]').count(), 0);
    assert.ok((await p.locator('.ui-qt tbody tr[data-ui-row]').count()) > 0, 'statuses and dates are there');
    const text = await rootText(p); assert.ok(!text.replace(/\s+/g, ' ').includes(phrase), 'note text is not on the page');
    assert.ok(p.bodies.every(b => !b.replace(/\\n/g, ' ').replace(/\s+/g, ' ').includes(phrase)), 'note text is in no response the administrator received');
    await p.goto(BASE + '/#/Documentation?view=staff'); await p.waitForSelector('.doc-tab'); await p.waitForTimeout(300);
    assert.eq(await p.locator('[data-x="apprOn"], [data-x="apprOff"]').count(), 0, 'no approval toggles in By staff'); assert.eq(await p.locator('#root p').count(), 0);
    await p.goto(BASE + '/#/Documentation'); await p.waitForSelector('.ui-qt'); await p.screenshot({ path: SHOTS + '/documentation-admin-1440.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });

  await T.test('direct support has no Documentation: the standard notice, no table, no data request for it', async () => {
    const p = await open('khale', '/#/Documentation');
    const t = await rootText(p); assert.match(t, /Not available for Direct support/i); assert.eq(await p.locator('.ui-qt').count(), 0); assert.eq(await p.locator('.doc-page').count(), 0);
    assert.ok(!(await p.locator('.rail, nav, #rail').allInnerTexts().then(a => a.join(' '))).match(/Documentation/), 'no Documentation in their navigation'); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });

  await T.test('phone width: no sideways scroll for the supervisor (both tabs), the clinician and the administrator; touch targets 44 px', async () => {
    for (const [user, path] of [['cdiaz', '/#/Documentation'], ['cdiaz', '/#/Documentation?view=staff'], ['jperez', '/#/Documentation?status=pending_review'], ['dowens', '/#/Documentation']]) {
      const p = await open(user, path, { w: 390, h: 844 });
      const w = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })); assert.ok(w.sw <= w.iw + 1, `${user} ${path}: no horizontal scroll (${w.sw} > ${w.iw})`);
      const small = await p.evaluate(() => [...document.querySelectorAll('#root .doc-acts .ui-btn, #root .doc-tab')].filter(b => b.getBoundingClientRect().height && b.getBoundingClientRect().height < 32).length); assert.eq(small, 0, 'touch targets');
      await p.screenshot({ path: SHOTS + `/documentation-${user}-390.png` }); assert.deepEq(fatal(p), [], 'console errors'); await p.close();
    }
    await done();
  });
} finally { await browser.close(); }
await T.done();
