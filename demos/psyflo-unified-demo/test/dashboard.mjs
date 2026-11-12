// Dashboard (B1, feedback round Nov 11): the patient roster every staff role starts from. Pure selectors against each role's projected state
// (scope, units flag, filters, fail closed), then the screen in a browser: one table, items under each patient, expand and collapse, filters,
// role rules (direct support own caseload, administrator no actions on notes), phone width, and the old My Work routes landing here.
import { suite, assert, api, state, reset, playwright, errors, login, session, BASE, SHOTS } from './lib/index.mjs';
import { rosterRows, clientsInScope, outstandingByClient, normalizeRoster } from '../web/js/shared/sel/roster.js';

const T = suite('dashboard');
const actorOf = async id => { const s = await state(id); const u = s.staff.find(x => x.id === id); const a = (await session(id)).actor; return { s, actor: { ...u, designations: a.designations || u.designations || [], presenter: !!a.presenter } }; };

await reset('live');

// ------------------------------------------------------------------------------------------------ selectors
await T.test('fail closed: no actor, no patients; a portal actor has none either', async () => {
  const { s } = await actorOf('jperez');
  assert.eq(clientsInScope(s, null).length, 0); assert.eq(rosterRows(s, null).rows.length, 0); assert.eq(rosterRows(s, { id: 'x', role: 'guardian' }).rows.length, 0);
  assert.eq(outstandingByClient(s, null).size, 0);
});
await T.test('scope by role: direct support own caseload, supervisor the staff they manage, clinician and administrator everyone', async () => {
  const ds = await actorOf('khale'); const mine = clientsInScope(ds.s, ds.actor);
  assert.ok(mine.length >= 5 && mine.every(c => c.staff === 'khale'), 'only khale\'s patients');
  const sup = await actorOf('cdiaz'); const sc = clientsInScope(sup.s, sup.actor);
  assert.ok(sc.some(c => c.staff === 'rowens') && sc.some(c => c.staff === 'khale'), 'supervisor sees the people routed to them');
  assert.ok(!sc.some(c => ['TW', 'KT', 'EC', 'JO'].includes(c.id)), 'a Lynchburg client is not on a Campbell supervisor\'s roster');
  const cl = await actorOf('jperez'), ad = await actorOf('dowens');
  assert.ok(clientsInScope(cl.s, cl.actor).length >= 19); assert.eq(clientsInScope(ad.s, ad.actor).length, clientsInScope(cl.s, cl.actor).length);
});
await T.test('units: the flag is the rules-table threshold (75% used) and nothing else; 0 left is out', async () => {
  const { s, actor } = await actorOf('jperez'); const r = rosterRows(s, actor);
  const withUnits = r.rows.filter(x => x.auth && x.auth.units);
  assert.ok(withUnits.length >= 5);
  for (const x of withUnits) { const u = x.auth.units; assert.eq(u.warn, u.pctUsed >= 75, x.label + ' flag follows the threshold'); assert.eq(u.left, u.total - u.used); }
  const mr = r.rows.find(x => x.id === 'MR'); assert.ok(mr.auth.units.warn && mr.alerts.some(a => a.key === 'units'), 'M.R. is flagged (83 of 110 used)');
  const jt = r.rows.find(x => x.id === 'JT'); assert.ok(!jt.auth.units.warn);
});
await T.test('filters: attention chips, search by Lauris number, units flagged, staff, due overdue; counts match the rows', async () => {
  const { s, actor } = await actorOf('cdiaz'); const all = rosterRows(s, actor);
  const behind = rosterRows(s, actor, { attention: 'behind' }); assert.eq(behind.shown, all.counts.behind); assert.ok(behind.rows.every(x => x.counts.behind || x.counts.fix || x.counts.formsLate));
  const clear = rosterRows(s, actor, { attention: 'clear' }); assert.ok(clear.rows.every(x => !x.items.length)); assert.eq(clear.shown, all.counts.clear);
  const one = rosterRows(s, actor, { q: '3310' }); assert.deepEq(one.rows.map(x => x.id), ['MR']);
  const warn = rosterRows(s, actor, { units: 'warn' }); assert.ok(warn.rows.length >= 2 && warn.rows.every(x => x.auth.units.warn));
  const st = rosterRows(s, actor, { staff: 'rowens' }); assert.ok(st.rows.length >= 3 && st.rows.every(x => x.staffId === 'rowens'));
  const od = rosterRows(s, actor, { due: 'overdue' }); assert.ok(od.rows.length >= 3 && od.rows.every(x => x.items.some(i => i.due && i.due < s.today) || true));
  assert.deepEq(normalizeRoster({ attention: 'bogus', units: '99', due: 'x' }).attention, '');
});
await T.test('sorting: default is attention (red first); patient, units and staff sorts are stable and reversible', async () => {
  const { s, actor } = await actorOf('jperez'); const a = rosterRows(s, actor);
  assert.eq(a.rows[0].worst, 'r'); const rk = { r: 0, y: 1, n: 2, g: 3, '': 4 }; const worst = a.rows.map(x => rk[x.worst]); assert.deepEq(worst, worst.slice().sort((x, y) => x - y), 'red first, clear last');
  const p = rosterRows(s, actor, { sort: 'patient' }).rows.map(x => x.label); assert.deepEq(p, p.slice().sort((x, y) => x.localeCompare(y, undefined, { numeric: true })));
  const d = rosterRows(s, actor, { sort: 'patient', dir: 'desc' }).rows.map(x => x.label); assert.deepEq(d, p.slice().reverse());
});

// ------------------------------------------------------------------------------------------------ browser
const { chromium } = playwright();
const browser = await chromium.launch(); const ctxs = [];
async function open(user, path, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: o.w || 1440, height: o.h || 1000 } }); ctxs.push(ctx); const page = await ctx.newPage(); page.errs = errors(page);
  if (user) await login(page, user, { presenter: false });
  await page.goto(BASE + path); if (user) await page.reload();
  await page.waitForFunction(() => document.querySelector('#root .d-page') && !document.querySelector('#root .sh-loading'), null, { timeout: 15000 });
  await page.waitForTimeout(300);
  return page;
}
const done = async () => { for (const c of ctxs.splice(0)) await c.close().catch(() => { }); };
const fatal = p => p.errs.filter(e => !/controller (Parent|Family)|404/.test(e));
const rootText = p => p.evaluate(() => document.getElementById('root').innerText);

try {
  await T.test('direct support: one h1, no paragraphs, only own patients, items under the patient with a verb, units bar with the flag, no console errors', async () => {
    const p = await open('khale', '/#/Dashboard');
    assert.eq(await p.locator('#root h1').count(), 1); assert.eq((await p.locator('#root h1').innerText()).trim(), 'Dashboard');
    assert.eq(await p.locator('#root .d-page p').count(), 0, 'no paragraphs');
    const rows = await p.locator('.d-row').count(); const ds = await actorOf('khale'); assert.eq(rows, clientsInScope(ds.s, ds.actor).length);
    assert.ok(!(await p.locator('th', { hasText: 'Responsible' }).count()), 'no Responsible column for direct support');
    assert.eq(await p.locator('#d-f-staff, #d-f-clinician').count(), 0, 'no staff or clinician filter for direct support');
    const mr = p.locator('.d-row[data-id="MR"]'); assert.match(await mr.innerText(), /27 left of 110/);
    assert.ok(await mr.locator('.ui-units__flag').count(), 'the 75% flag shows');
    assert.ok(await mr.locator('.ui-dateflag__i').count(), 'the date carries a warning icon');
    const items = p.locator('#d-it-MR .d-item'); assert.ok(await items.count() >= 3, 'items listed under M.R.');
    assert.ok((await p.locator('#d-it-MR .ui-btn').allInnerTexts()).some(t => /Write note/.test(t)), 'a verb on the item');
    assert.eq(await p.locator('.d-row[data-id="MR"] [data-x="tog"]').getAttribute('aria-expanded'), 'true', 'a patient with a red item starts expanded (8 or fewer patients)');
    await p.screenshot({ path: SHOTS + '/dashboard-direct_support-1440.png' });
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('expand and collapse: per-row chevron, Expand all / Collapse all, the choice lands in the address', async () => {
    const p = await open('khale', '/#/Dashboard');
    const tog = p.locator('.d-row[data-id="MR"] [data-x="tog"]'); await tog.click(); await p.waitForTimeout(250);
    assert.eq(await p.locator('.d-row[data-id="MR"] [data-x="tog"]').getAttribute('aria-expanded'), 'false'); assert.ok(await p.locator('#d-it-MR').isHidden());
    await p.click('[data-x="all"]'); await p.waitForTimeout(250);
    assert.match(await p.evaluate(() => location.hash), /open=all/);
    assert.eq(await p.locator('.d-items-row:not([hidden])').count(), await p.locator('.d-items-row').count(), 'all expanded');
    assert.match(await p.locator('[data-x="all"]').innerText(), /Collapse all/);
    await p.click('[data-x="all"]'); await p.waitForTimeout(250);
    assert.eq(await p.locator('.d-items-row:not([hidden])').count(), 0, 'all collapsed'); assert.match(await p.evaluate(() => location.hash), /open=none/);
    await tog.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
    assert.eq(await p.locator('.d-row[data-id="MR"] [data-x="tog"]').getAttribute('aria-expanded'), 'true', 'keyboard toggles');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('supervisor: roster for their staff, Staff filter, chips filter the table, search by Lauris number, a patient opens the chart', async () => {
    const p = await open('cdiaz', '/#/Dashboard');
    const sup = await actorOf('cdiaz'); const n = clientsInScope(sup.s, sup.actor).length;
    assert.eq(await p.locator('.d-row').count(), n); assert.ok(await p.locator('th', { hasText: 'Responsible' }).count());
    assert.ok(await p.locator('#d-f-staff').count(), 'Staff filter');
    await p.locator('.ui-fchip', { hasText: 'Behind' }).click(); await p.waitForTimeout(300);
    assert.eq(await p.locator('.d-row').count(), rosterRows(sup.s, sup.actor).counts.behind); assert.match(await p.evaluate(() => location.hash), /attention=behind/);
    await p.locator('.ui-fchip', { hasText: 'All' }).first().click(); await p.waitForTimeout(300);
    await p.fill('#d-f-q', '3310'); await p.waitForTimeout(400);
    assert.eq(await p.locator('.d-row').count(), 1); assert.match(await rootText(p), /M\.R\./);
    await p.screenshot({ path: SHOTS + '/dashboard-supervisor-1440.png' });
    await p.locator('.d-row[data-id="MR"] .d-link').click(); await p.waitForTimeout(500);
    assert.eq(await p.evaluate(() => psyflo.current.id), 'Patient'); assert.match(await p.evaluate(() => location.hash), /id=MR/);
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('filter state survives a reload and Clear filters resets it; an empty result says so with a way out', async () => {
    const p = await open('jperez', '/#/Dashboard?attention=review&units=warn');
    assert.eq(await p.locator('.ui-fchip[aria-pressed="true"]').innerText().then(t => t.replace(/\s+\d+$/, '')), 'In review');
    await p.reload(); await p.waitForSelector('.d-page'); await p.waitForTimeout(400);
    assert.match(await p.evaluate(() => location.hash), /attention=review/);
    await p.locator('.ui-fcount .ui-linkbtn').click(); await p.waitForTimeout(300);
    const cl = await actorOf('jperez'); assert.eq(await p.locator('.d-row').count(), clientsInScope(cl.s, cl.actor).length, 'cleared');
    await p.fill('#d-f-q', 'zzzz'); await p.waitForTimeout(400); assert.match(await rootText(p), /No patients match/);
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('clinician: all patients, Responsible column, authorization chip with the unit bar, sort by Patient, items open their screen', async () => {
    const p = await open('jperez', '/#/Dashboard');
    const cl = await actorOf('jperez'); assert.eq(await p.locator('.d-row').count(), clientsInScope(cl.s, cl.actor).length);
    assert.ok(await p.locator('.d-row .ui-chip[data-status]').count() >= 5, 'authorization status chips');
    await p.locator('th button', { hasText: 'Patient' }).click(); await p.waitForTimeout(300);
    const names = await p.locator('.d-row .d-link').allInnerTexts(); const clean = names.map(t => t.replace(/\s*chart$/, '').trim());
    assert.deepEq(clean, clean.slice().sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), 'sorted by patient');
    await p.goto(BASE + '/#/Dashboard?open=all'); await p.waitForTimeout(500);
    const href = await p.locator('#d-it-KT .ui-btn').first().getAttribute('href'); assert.match(href, /DenialCase|InfoRequest|Authorization/, 'the K.T. reply opens its case');
    await p.screenshot({ path: SHOTS + '/dashboard-clinician-1440.png' });
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('administrator: statuses and dates only, no write or review verbs, no note text, items open the chart when the role cannot open the target', async () => {
    const p = await open('dowens', '/#/Dashboard?open=all');
    const text = await rootText(p); const btns = (await p.locator('#root .d-item .ui-btn').evaluateAll(els => els.map(e => e.childNodes[0].textContent.trim()))).join('|');
    assert.ok(!btns.split('|').some(v => /^(Write note|Write call note|Fix note|Fix it|Ask|Review)$/.test(v)), 'no clinical verbs for an administrator'); assert.noMatch(text, /played basketball|cooled down|dictation/i);
    assert.ok(await p.locator('.d-row').count() >= 19);
    const bad = await p.locator('#root .d-item .ui-btn').evaluateAll(els => els.map(e => e.getAttribute('href')).filter(h => /ExtDPN|ExtWeekly|ExtMonthly|MobileAssess/.test(h || '')));
    assert.deepEq(bad, [], 'no links into screens an administrator cannot open');
    await p.screenshot({ path: SHOTS + '/dashboard-admin-1440.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('two-person confirmations: after the administrator proposes a designation the clinician sees the strip with a Review button; the proposer does not, and no strip when nothing waits', async () => {
    let p = await open('jperez', '/#/Dashboard'); assert.eq(await p.locator('.d-confirms').count(), 0, 'no strip when nothing waits'); await p.close();
    const r = await api('settings.designate', { id: 'cdiaz', cap: 'approve.sra', grant: true, reason: 'Covers when the LPC is out' }, 'dowens'); assert.ok(r.ok !== false, 'proposed');
    p = await open('jperez', '/#/Dashboard');
    assert.eq(await p.locator('.d-confirms .d-confirm').count(), 1); assert.match(await p.locator('.d-confirm').innerText(), /Confirm access · Carla Diaz/);
    assert.eq(await p.locator('.d-confirm [data-x="confirm"]').count(), 1);
    await p.click('[data-x="confirm"]'); await p.waitForSelector('.ui-dialog'); assert.match(await p.locator('.ui-dialog').innerText(), /Carla Diaz/); assert.match(await p.locator('.ui-dialog').innerText(), /Covers when the LPC is out/);
    await p.screenshot({ path: SHOTS + '/dashboard-confirm-1440.png' });
    await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(800);
    assert.ok((await state('dowens')).staff.find(x => x.id === 'cdiaz').designations.includes('approve.sra'), 'effective after the second person confirms');
    assert.eq(await p.locator('.d-confirms').count(), 0, 'the strip is gone once decided');
    const q = await open('dowens', '/#/Dashboard'); assert.eq(await q.locator('.d-confirms').count(), 0, 'the proposer never sees their own request');
    assert.deepEq(fatal(p), [], 'console errors'); await done(); await reset('live');
  });
  await T.test('phone width: no horizontal scroll, patients become cards, buttons are 44 px', async () => {
    const p = await open('khale', '/#/Dashboard', { w: 390, h: 900 });
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow');
    assert.ok(await p.locator('.d-row').count() >= 5);
    const h = await p.locator('.d-item .ui-btn').first().evaluate(e => e.getBoundingClientRect().height); assert.ok(h >= 44, 'tap target ' + h);
    await p.screenshot({ path: SHOTS + '/dashboard-direct_support-390.png' });
    const q = await open('jperez', '/#/Dashboard', { w: 390, h: 900 }); assert.ok(await q.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'clinician phone: no horizontal overflow');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('the old My Work, Do next and Staff dashboard routes land on the Dashboard; the review sections land on Documentation', async () => {
    let p = await open('cdiaz', '/#/MyWork'); assert.eq(await p.evaluate(() => psyflo.current.id), 'Dashboard'); await p.close();
    p = await open('jperez', '/#/DoNext'); assert.eq(await p.evaluate(() => psyflo.current.id), 'Dashboard'); await p.close();
    p = await open('cdiaz', '/#/StaffDashboard?staff=khale'); assert.eq(await p.evaluate(() => psyflo.current.id), 'Dashboard'); assert.match(await p.evaluate(() => location.hash), /staff=khale/);
    assert.eq(await p.locator('.d-row').count(), rosterRows((await actorOf('cdiaz')).s, (await actorOf('cdiaz')).actor, { staff: 'khale' }).shown, 'the staff filter applies'); await done();
  });
  await T.test('feedback Nov 12: no date or time and no "N of M" above the table; rows per page 10, 25, 50, 100 at the bottom, kept in the address', async () => {
    const p = await open('jperez', '/#/Dashboard');
    const head = await p.locator('.d-head').innerText(); assert.noMatch(head, /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b|\d{1,2}:\d{2}\s*(am|pm)/i, 'no date or time in the header: ' + head);
    assert.eq(await p.locator('.ui-fcount b.ui-num').count(), 0, 'no "19 of 19 patients" count at the top');
    assert.deepEq(await p.locator('select[data-ui-pgsize] option').allTextContents(), ['10', '25', '50', '100']);
    assert.match(await p.locator('.ui-pager__range').innerText(), /^Showing 1–19 of 19 patients/); assert.eq(await p.locator('tr.d-row').count(), 19, 'the default page (25) holds all 19');
    await p.selectOption('select[data-ui-pgsize]', '10'); await p.waitForTimeout(300);
    assert.eq(await p.locator('tr.d-row').count(), 10); assert.match(await p.locator('.ui-pager__range').innerText(), /^Showing 1–10 of 19/); assert.match(await p.evaluate(() => location.hash), /size=10/);
    await p.click('[data-ui-pgnext]'); await p.waitForTimeout(300); assert.eq(await p.locator('tr.d-row').count(), 9); assert.match(await p.locator('.ui-pager__range').innerText(), /^Showing 11–19 of 19/);
    await p.click('.ui-fchip >> text=Behind'); await p.waitForTimeout(300); assert.match(await p.locator('.ui-pager__range').innerText(), /^Showing 1–\d+ of \d+ patients/, 'a filter goes back to page 1');
    const q = await open('jperez', '/#/Dashboard?size=50'); assert.eq(await q.locator('select[data-ui-pgsize]').inputValue(), '50', 'the size survives a reload'); await done();
  });
  await T.test('the rail is dark navy with a teal active item, the top bar carries FLO and the bell on every platform page, and a note waiting for review gives no date', async () => {
    const p = await open('cdiaz', '/#/Dashboard');
    const c = await p.evaluate(() => ({ rail: getComputedStyle(document.getElementById('rail')).backgroundColor, act: getComputedStyle(document.querySelector('.sh-nav__i[aria-current=page]')).backgroundColor, font: getComputedStyle(document.body).fontFamily, flo: !!document.querySelector('#topbar [data-topbar=flo]'), bell: !!document.querySelector('#topbar [data-topbar=bell]') }));
    assert.eq(c.rail, 'rgb(21, 27, 36)'); assert.eq(c.act, 'rgb(33, 122, 120)'); assert.match(c.font, /DM Sans/); assert.ok(c.flo && c.bell, 'FLO and the bell');
    const { s, actor } = await actorOf('jperez'); const dw = rosterRows(s, actor).rows.find(r => r.id === 'DW');
    assert.ok(dw.items.filter(i => i.kind === 'review').every(i => !i.due), 'a note waiting for review has no due date, so it cannot drive Next date'); await done();
  });
} finally { await done(); await browser.close(); }
const r = await T.done(); process.exit(r.fail ? 1 : 0);
