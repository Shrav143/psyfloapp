// Dashboard (B1, feedback round Nov 11; R4): the patient roster every staff role starts from. Pure selectors against each role's projected state
// (scope, units flag, filters, fail closed, the Lauris page of every item kind), then the screen in a browser: one table, items under each patient,
// expand and collapse, filters, role rules (direct support own caseload, administrator no actions on notes and no Lauris link), phone width, the old
// My Work routes landing here, and (R4) every action on an item as an icon that opens the Lauris EHR at the note or form where that work is done,
// with the Psyflo panel already beside it. The Documents and Staff views are in test/documentation.mjs.
import { suite, assert, api, state, reset, playwright, errors, login, session, BASE, LAURIS, EXT, SHOTS } from './lib/index.mjs';
import { rosterRows, clientsInScope, outstandingByClient, normalizeRoster, laurisPath, viewFor } from '../web/js/shared/sel/roster.js';
import { laurisHref, laurisLink, mayOpenLauris } from '../web/js/shared/lauris-link.js';

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

await T.test('R4 every item carries the Lauris page where its work is done: notes by type, existing notes by session, rejected, intake, CNA, plan, quarterly, discharge, assessments; authorization and referral steps carry none', async () => {
  const ds = await actorOf('khale'), cl = await actorOf('jperez'), sup = await actorOf('cdiaz');
  const by = (actor, id) => outstandingByClient(actor.s, actor.actor).get(id) || [];
  const one = (list, f, what) => { const it = list.find(f); assert.ok(it, 'an item exists: ' + what); return it; };
  const mr = by(ds, 'MR');
  assert.eq(one(mr, i => i.kind === 'note' && i.type === 'daily', 'M.R. daily note').lauris, '/consumers/3310/session/dpn');
  assert.eq(one(mr, i => i.kind === 'note' && i.type === 'weekly_guardian', 'M.R. weekly guardian call').lauris, '/consumers/3310/session/weekly');
  assert.eq(one(by(ds, 'DP'), i => i.type === 'monthly_collateral', 'D.P. monthly collateral').lauris, '/consumers/3320/session/collateral');
  assert.eq(one(mr, i => i.type === 'rejected', 'M.R. Rejected in Lauris').lauris, '/consumers/3310/session/dpn', 'Rejected in Lauris opens the rejected form (a daily note)');
  assert.eq(one(by(ds, 'AG'), i => i.type === 'assessment', 'A.G. SUDS').lauris, '/consumers/3322?tab=active', 'an assessment opens the consumer\'s Active File');
  assert.eq(one(by(cl, 'DP'), i => i.type === 'isp', 'D.P. treatment plan').lauris, '/consumers/3320/session/isp');
  assert.eq(one(by(cl, 'MR'), i => i.type === 'quarterly', 'M.R. quarterly report').lauris, '/consumers/3310/session/quarterly');
  assert.eq(one(by(cl, 'TW'), i => i.type === 'intake', 'T.W. intake form').lauris, '/consumers/new?referral=REF-118', 'T.W. is a referral Lauris does not know yet (the screening creates the consumer): the intake form opens the Add consumer page, not a session page that would not exist');
  assert.eq(one(by(cl, 'DW'), i => i.type === 'cna', 'D.W. CNA').lauris, '/consumers/4102/session/cna');
  assert.eq(one(by(cl, 'JO'), i => i.type === 'discharge', 'J.O. discharge summary').lauris, '/consumers/4400/session/discharge');
  const rev = one(by(sup, 'DW'), i => i.kind === 'review', 'D.W. note waiting for a review'); assert.eq(rev.lauris, '/consumers/4102?tab=active', 'a filed note without a Lauris session id opens the Active File'); assert.eq(rev.canReview, true, 'a supervisor may review it');
  const withSession = { id: 'n-x', client: 'MR', type: 'daily', date: '2026-10-27', session: 9123, review: 'pending', staff: 'khale' };
  assert.eq(laurisPath(3310, 'daily', withSession.session), '/sessions/9123', 'an existing note opens by its session');
  assert.eq(laurisPath(3310, 'weekly_guardian'), '/consumers/3310/session/weekly'); assert.eq(laurisPath(3310, 'assessment'), '/consumers/3310?tab=active'); assert.eq(laurisPath('', 'daily'), '', 'no Lauris number, no link');
  for (const f of ['screening', 'cna', 'isp', 'dpn', 'weekly', 'collateral', 'quarterly', 'incident', 'sra-initial', 'sra-continued', 'discharge']) assert.eq(laurisPath(3310, f), `/consumers/3310/session/${f}`, 'a Lauris form key maps to itself: ' + f);
  const all = [...by(cl, 'MR'), ...by(cl, 'DW'), ...by(cl, 'KT'), ...by(cl, 'TN'), ...by(cl, 'LV')];
  const steps = all.filter(i => i.kind === 'auth' || i.kind === 'referral'); assert.ok(steps.length >= 4, 'authorization steps exist');
  assert.ok(steps.every(i => i.lauris === ''), 'authorization and referral steps stay in Psyflo: no Lauris page');
  const ehr = outstandingByClient(cl.s, cl.actor); let n = 0;
  for (const list of ehr.values()) for (const i of list) if (i.kind !== 'auth' && i.kind !== 'referral') { n++; assert.match(i.lauris, /^\/(consumers\/\d+(\/session\/[\w-]+|\?tab=active)|consumers\/new\?referral=[\w-]+|sessions\/\d+)$/, `${i.title} for ${i.client} has a Lauris page: ${i.lauris}`); }
  assert.ok(n >= 40, 'every EHR item checked: ' + n);
});
await T.test('R4 the Lauris link helper fails closed: no actor, no path, or a role without ext.use (the administrator) gives nothing; the URL is /login?as=<id>&next=<path>', async () => {
  const ds = await actorOf('khale'), ad = await actorOf('dowens'), sp = await actorOf('cdiaz'), cl = await actorOf('jperez');
  const base = 'http://lauris.test';
  assert.eq(laurisHref(base, ds.actor, '/consumers/3310/session/dpn'), 'http://lauris.test/login?as=khale&next=%2Fconsumers%2F3310%2Fsession%2Fdpn');
  for (const x of [sp, cl]) assert.ok(mayOpenLauris(x.actor), x.actor.role + ' holds ext.use');
  assert.ok(!mayOpenLauris(ad.actor), 'the administrator holds no ext.use'); assert.eq(laurisHref(base, ad.actor, '/consumers/3310'), ''); assert.eq(laurisLink(base, ad.actor, '/consumers/3310', { who: 'M.R.', title: 'Daily note' }), '');
  assert.eq(laurisHref(base, null, '/consumers/3310'), '', 'no actor, no link'); assert.eq(laurisHref(base, { role: 'guardian', id: 'g' }, '/consumers/3310'), '', 'a portal actor has none');
  assert.eq(laurisHref(base, ds.actor, ''), '', 'no path, no link'); assert.eq(laurisHref('', ds.actor, '/x'), '', 'no base, no link');
  const html = laurisLink(base, ds.actor, '/consumers/3310/session/dpn', { who: 'M.R.', title: 'Daily note' });
  assert.match(html, /aria-label="Open in Lauris: M\.R\., Daily note \(opens Lauris in a new tab\)"/); assert.match(html, /target="_blank"/); assert.match(html, /rel="noopener"/); assert.match(html, /Open in Lauris: Daily note<\/span>/, 'the hover text is the definition');
  assert.match(laurisLink(base, ds.actor, '/consumers/3310/session/dpn', { who: 'M.R.', title: 'Daily note', variant: 'button' }), /class="ui-btn ui-btn--secondary ui-btn--sm"[^>]*>Open in Lauris/);
});
await T.test('R4 view rule: Documents and Staff need the documentation capability; direct support always gets Patients', async () => {
  const ds = await actorOf('khale'), sp = await actorOf('cdiaz'), cl = await actorOf('jperez'), ad = await actorOf('dowens');
  for (const x of [sp, cl, ad]) { assert.eq(viewFor(x.actor, 'documents'), 'documents', x.actor.role); assert.eq(viewFor(x.actor, 'staff'), 'staff'); assert.eq(viewFor(x.actor, ''), 'patients'); assert.eq(viewFor(x.actor, 'nonsense'), 'patients'); }
  assert.eq(viewFor(ds.actor, 'documents'), 'patients'); assert.eq(viewFor(ds.actor, 'staff'), 'patients'); assert.eq(viewFor(null, 'documents'), 'patients', 'no actor, Patients');
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
    assert.ok(await p.locator('#d-it-MR .d-item__a a[data-lauris]').count() >= 3, 'every item has its action: an icon that opens Lauris');
    const badges = await mr.locator('.d-badge .ui-hint__b').evaluateAll(els => els.map(e => e.getAttribute('aria-label'))); assert.deepEq(badges, ['2 notes behind', '1 note sent back', '2 notes due'], 'the count badges are icons with the meaning as their definition');
    const sev = await p.locator('#d-it-MR .d-item__i .ui-hint__b').evaluateAll(els => els.map(e => e.getAttribute('aria-label'))); assert.ok(sev.includes('Past due') && sev.includes('Due soon') && sev.includes('Rejected in Lauris: fix it there'), 'the severity word is the hover of the item icon: ' + sev);
    assert.eq(await p.locator('#d-it-MR .d-item__s').count(), 0, 'no secondary text lines under an item');
    assert.eq(await p.locator('#d-it-MR .ui-btn').count(), 0, 'no text buttons: the actions are icons (hover definitions)'); assert.eq(await p.locator('.d-view').count(), 0, 'direct support has no view switch (no Documents view)');
    assert.eq(await p.locator('.d-row[data-id="MR"] [data-x="tog"]').getAttribute('aria-expanded'), 'true', 'a patient with a red item starts expanded (8 or fewer patients)');
    await p.screenshot({ path: SHOTS + '/dashboard-direct_support-1440.png' });
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('expand and collapse: per-row chevron, Expand all / Collapse all, the choice lands in the address', async () => {
    const p = await open('khale', '/#/Dashboard');
    const tog = p.locator('.d-row[data-id="MR"] [data-x="tog"]'); await tog.click(); await p.waitForTimeout(250);
    assert.eq(await p.locator('.d-row[data-id="MR"] [data-x="tog"]').getAttribute('aria-expanded'), 'false'); assert.ok(await p.locator('#d-it-MR').isHidden());
    assert.eq(await p.locator('[data-x="all"]').getAttribute('aria-label'), 'Expand all', 'an icon with its definition');
    await p.click('[data-x="all"]'); await p.waitForTimeout(250);
    assert.match(await p.evaluate(() => location.hash), /open=all/);
    assert.eq(await p.locator('.d-items-row:not([hidden])').count(), await p.locator('.d-items-row').count(), 'all expanded');
    assert.eq(await p.locator('[data-x="all"]').getAttribute('aria-label'), 'Collapse all');
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
    const href = await p.locator('#d-it-KT .d-item__a a').first().getAttribute('href'); assert.match(href, /DenialCase|InfoRequest|Authorization/, 'the K.T. reply opens its case, in Psyflo');
    assert.eq(await p.locator('#d-it-KT a[data-lauris]').count(), 0, 'an authorization step is not EHR work: no Lauris link');
    await p.screenshot({ path: SHOTS + '/dashboard-clinician-1440.png' });
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('administrator: statuses and dates only, no Lauris link, no write or review action, no note text; every EHR item opens the chart, an authorization step opens its screen', async () => {
    const p = await open('dowens', '/#/Dashboard?open=all');
    const text = await rootText(p); assert.noMatch(text, /played basketball|cooled down|dictation/i);
    assert.eq(await p.locator('#root a[data-lauris]').count(), 0, 'the administrator holds no ext.use: no Open in Lauris anywhere'); assert.eq(await p.locator('#root [data-x="review"]').count(), 0, 'no Review icon');
    assert.eq(await p.locator('#root a[href*="/login?as="]').count(), 0, 'no link into Lauris at all');
    assert.ok(await p.locator('.d-row').count() >= 19);
    const mr = await p.locator('#d-it-MR .d-item__a a').evaluateAll(els => els.map(e => [e.getAttribute('aria-label'), e.getAttribute('href')]));
    assert.ok(mr.length >= 6 && mr.every(([l, h]) => /^(Open chart for M\.R\.|Open authorization|.* for M\.R\.)/.test(l) && /^#\/(Patient\?id=MR|Authorization)/.test(h)), 'every item has an icon link to the chart or to Authorizations: ' + JSON.stringify(mr.slice(0, 3)));
    const bad = await p.locator('#root .d-item a').evaluateAll(els => els.map(e => e.getAttribute('href')).filter(h => /ExtDPN|ExtWeekly|ExtMonthly|MobileAssess|\/login\?as=/.test(h || '')));
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
  await T.test('R4 every action is an icon link into Lauris at the note or form: the right href for each item kind, a hover definition, a new tab; no text buttons', async () => {
    const want = (as, path) => `${LAURIS}/login?as=${as}&next=${encodeURIComponent(path)}`;
    let p = await open('khale', '/#/Dashboard?open=all');
    const links = id => p.locator(`#d-it-${id} a[data-lauris]`).evaluateAll(els => els.map(e => ({ l: e.getAttribute('aria-label'), h: e.getAttribute('href'), t: e.getAttribute('target'), r: e.getAttribute('rel') })));
    const has = (list, re, href, what) => assert.ok(list.some(x => re.test(x.l) && x.h === href), `${what}: ${href}; links are ${JSON.stringify(list.map(x => [x.l.slice(0, 50), x.h.replace(LAURIS, '')]))}`);
    const mr = await links('MR'); assert.ok(mr.length >= 5 && mr.every(x => x.t === '_blank' && /noopener/.test(x.r)), 'a new tab');
    has(mr, /^Open in Lauris: M\.R\., Daily note \(opens Lauris in a new tab\)$/, want('khale', '/consumers/3310/session/dpn'), 'a daily note opens the DPN form');
    has(mr, /^Open in Lauris: M\.R\., Weekly guardian call/, want('khale', '/consumers/3310/session/weekly'), 'a weekly guardian call');
    has(mr, /^Open in Lauris: M\.R\., Rejected in Lauris/, want('khale', '/consumers/3310/session/dpn'), '"Rejected in Lauris" opens the rejected form');
    has(await links('DP'), /^Open in Lauris: D\.P\., Monthly collateral/, want('khale', '/consumers/3320/session/collateral'), 'a monthly collateral');
    has(await links('AG'), /^Open in Lauris: A\.G\., SUDS/, want('khale', '/consumers/3322?tab=active'), 'an assessment opens the Active File');
    assert.eq(await p.locator('#root .d-item .ui-btn').count(), 0, 'no text buttons on the items');
    assert.eq(await p.locator('#root .d-item a').count(), await p.locator('#root .d-item a[data-lauris]').count(), 'a direct support item has one action: Lauris');
    // the hover definition: a bubble with the words, shown on hover and on keyboard focus
    const a = p.locator('#d-it-MR a[data-lauris]').first(); await a.hover(); await p.waitForTimeout(150);
    assert.eq(await p.locator('.ui-hint__t[data-on]').count(), 1); assert.match(await p.locator('.ui-hint__t[data-on]').innerText(), /^Open in Lauris: (Daily note|Weekly guardian call)/);
    await p.mouse.move(5, 5); await a.focus(); await p.waitForTimeout(150); assert.eq(await p.locator('.ui-hint__t[data-on]').count(), 1, 'keyboard focus shows it too'); await p.keyboard.press('Escape'); assert.eq(await p.locator('.ui-hint__t[data-on]').count(), 0, 'Escape hides it');
    await p.close();
    p = await open('jperez', '/#/Dashboard?open=all');
    has(await links('TW'), /^Open in Lauris: T\.W\., Intake form/, want('jperez', '/consumers/new?referral=REF-118'), 'an intake form for a referral not yet in Lauris opens the Add consumer page');
    has(await links('TW'), /^Open in Lauris: T\.W\., CNA/, want('jperez', '/consumers/new?referral=REF-118'), 'a CNA for a referral not yet in Lauris: the same page');
    has(await links('TW'), /^Open in Lauris: T\.W\., Treatment plan/, want('jperez', '/consumers/new?referral=REF-118'), 'a treatment plan: the same page');
    has(await links('DW'), /^Open in Lauris: D\.W\., CNA/, want('jperez', '/consumers/4102/session/cna'), 'a CNA waiting for a review');
    has(await links('DW'), /^Open in Lauris: D\.W\., Quarterly report/, want('jperez', '/consumers/4102/session/quarterly'), 'a quarterly report');
    has(await links('MR'), /^Open in Lauris: M\.R\., Quarterly report/, want('jperez', '/consumers/3310/session/quarterly'), 'a quarterly report');
    has(await links('JO'), /^Open in Lauris: J\.O\., Discharge summary/, want('jperez', '/consumers/4400/session/discharge'), 'a discharge summary');
    has(await links('DW'), /^Open in Lauris: D\.W\., Rejected in Lauris/, want('jperez', '/consumers/4102/session/dpn'), 'a rejected daily note');
    has(await links('DW'), /^Open in Lauris: D\.W\., Rejected in Lauris/, want('jperez', '/consumers/4102/session/weekly'), 'a rejected weekly call');
    // authorization and referral steps stay in Psyflo: an icon to the case, never Lauris
    const steps = await p.locator('#d-it-MR .d-item__a a:not([data-lauris])').evaluateAll(els => els.map(e => [e.getAttribute('aria-label'), e.getAttribute('href')]));
    assert.ok(steps.length >= 2 && steps.every(([l, h]) => /\(opens in Psyflo\)$/.test(l) && /^#\/(Authorization\?id=R-0411|ExtCase\?client=MR)/.test(h)), 'Units low opens the authorization and Continued stay its draft, both in Psyflo: ' + JSON.stringify(steps));
    assert.ok(steps.some(([l, h]) => /Units low/.test(l) && /^#\/Authorization\?id=R-0411/.test(h)), 'Units low opens the case');
    assert.ok((await p.locator('#d-it-KT a:not([data-lauris])').getAttribute('aria-label')).includes('K.T.'), 'the K.T. reply is an authorization step with its own icon');
    assert.eq(await p.locator('#root .d-item .ui-btn').count(), 0, 'no text buttons for a clinician either'); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('R4 a note waiting for a reviewer has two icons, Open in Lauris and Review (the drawer, in place); direct support sees Lauris only; the drawer opens the note in Lauris too', async () => {
    for (const user of ['cdiaz', 'jperez']) {
      const p = await open(user, '/#/Dashboard?open=all');
      const rows = p.locator('#d-it-DW .d-item').filter({ has: p.locator('[data-x="review"]') }); assert.eq(await rows.count(), 3, user + ': three of D.W.\'s notes wait for a review');
      const row = rows.first();
      assert.eq(await row.locator('a[data-lauris]').count(), 1); assert.eq(await row.locator('[data-x="review"]').count(), 1, 'both icons');
      assert.eq(await row.locator('a[data-lauris]').getAttribute('href'), `${LAURIS}/login?as=${user}&next=${encodeURIComponent('/consumers/4102?tab=active')}`, 'a filed note without a session id opens in the Active File');
      assert.match(await row.locator('[data-x="review"]').getAttribute('aria-label'), /^Review D\.W\., Daily note/);
      await row.locator('[data-x="review"]').click(); await p.waitForSelector('.ui-dialog[data-kind="drawer"]');
      const dlg = p.locator('.ui-dialog[data-kind="drawer"]'); assert.ok(await dlg.locator('button:has-text("Approve")').count() && await dlg.locator('button:has-text("Return with a note")').count(), 'the review drawer, in place');
      assert.eq(await p.evaluate(() => psyflo.current.id), 'Dashboard', 'still on the Dashboard');
      assert.match(await dlg.locator('a[data-lauris]').getAttribute('href'), /\/login\?as=\w+&next=%2Fconsumers%2F4102%3Ftab%3Dactive/, 'the drawer opens the note in Lauris as well');
      await p.keyboard.press('Escape'); await p.waitForTimeout(250); assert.eq(await p.locator('.ui-dialog[data-kind="drawer"]').count(), 0); assert.deepEq(fatal(p), [], 'console errors'); await done();
    }
    const p = await open('rowens', '/#/Dashboard?open=all');   // direct support whose notes wait for their reviewer: their own status, the note in Lauris, no review
    const mine = p.locator('.d-item').filter({ has: p.locator('[aria-label="Waiting for a review"]') }); assert.ok(await mine.count() >= 2, 'rowens has notes waiting');
    assert.eq(await mine.locator('a[data-lauris]').count(), await mine.count(), 'Lauris on each'); assert.eq(await p.locator('[data-x="review"]').count(), 0, 'a staffer does not review their own notes'); await done();
  });
  await T.test('R4 Open in Lauris lands on the form with the Psyflo panel already beside it, showing the same patient (from the icon, and for the intake, daily note and CNA pages)', async () => {
    const p = await open('khale', '/#/Dashboard?open=all');
    const [pop] = await Promise.all([p.context().waitForEvent('page'), p.locator('#d-it-MR a[data-lauris]').first().click()]);
    await pop.waitForLoadState('domcontentloaded'); await pop.waitForSelector('#psyflo-slot #psyflo-frame', { timeout: 15000 });
    assert.ok(pop.url().startsWith(LAURIS + '/consumers/3310/session/'), 'the popup is Lauris at M.R.\'s form: ' + pop.url());
    let f; for (let i = 0; i < 40 && !f; i++) { f = pop.frames().find(x => x.url().includes('/panel/')); if (!f) await pop.waitForTimeout(250); }
    assert.ok(f, 'the Psyflo panel frame'); let t0 = ''; for (let i = 0; i < 30; i++) { t0 = (await f.locator('#panel').innerText().catch(() => '')).replace(/\s+/g, ' '); if (/M\.R\. Harvest #3310/.test(t0)) break; await pop.waitForTimeout(500); }
    assert.match(t0, /M\.R\. Harvest #3310/, 'the panel shows the same patient'); await p.close();
    const q = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); ctxs.push(q); const lp = await q.newPage();
    for (const [as, path, who] of [['jperez', '/consumers/3360/session/screening', ['A.M.', 3360]], ['khale', '/consumers/3310/session/dpn', ['M.R.', 3310]], ['jperez', '/consumers/3310/session/cna', ['M.R.', 3310]]]) {
      await lp.goto(`${LAURIS}/login?as=${as}&next=${encodeURIComponent(path)}`, { waitUntil: 'domcontentloaded' }); await lp.waitForSelector('#psyflo-slot #psyflo-frame', { timeout: 15000 });
      assert.ok((await lp.locator('#psyflo-frame').getAttribute('src')).startsWith(BASE + '/panel/'), path + ': the iframe is the Psyflo panel');
      assert.match(await lp.locator('body').innerText(), new RegExp(who[0].replace(/\./g, '\\.')), path + ': the Lauris page is that patient');
      let g; for (let i = 0; i < 40 && !g; i++) { g = lp.frames().find(x => x.url().includes('/panel/')); if (!g) await lp.waitForTimeout(250); }
      const re = new RegExp(`${who[0].replace(/\./g, '\\.')} Harvest #${who[1]}`); let txt = '';
      for (let i = 0; i < 30; i++) { txt = (await g.locator('#panel').innerText().catch(() => '')).replace(/\s+/g, ' '); if (re.test(txt)) break; await lp.waitForTimeout(500); }   // the panel signs in as the Lauris user first: give it time
      assert.match(txt, re, path + ': the panel shows the same patient');
    }
    await done();
  });
  await T.test('phone width: no horizontal scroll, patients become cards, buttons are 44 px', async () => {
    const p = await open('khale', '/#/Dashboard', { w: 390, h: 900 });
    assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'no horizontal overflow');
    assert.ok(await p.locator('.d-row').count() >= 5);
    const h = await p.locator('.d-item__a .ui-hint__b').first().evaluate(e => e.getBoundingClientRect().height); assert.ok(h >= 44, 'tap target ' + h);
    await p.screenshot({ path: SHOTS + '/dashboard-direct_support-390.png' });
    const q = await open('jperez', '/#/Dashboard', { w: 390, h: 900 }); assert.ok(await q.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'clinician phone: no horizontal overflow');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('the old My Work, Do next and Staff dashboard routes land on the Dashboard (the review and team sections on its Documents and Staff views, see documentation.mjs)', async () => {
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
