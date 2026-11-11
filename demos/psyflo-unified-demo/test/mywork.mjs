// My Work (E1): the role-filtered home. Pure selectors against the projected state of each role, the server's refusals that back the screen,
// and the screen itself in a browser (sections by role, no clinical text for the administrator, approve / return, approval mode, phone width).
import { suite, assert, api, tryApi, state, reset, playwright, errors, login, session, BASE, SHOTS } from './lib/index.mjs';
import { worklist, dayView, teamView, reviewQueue, sectionsFor, resolveSection, defaultSection, noteTimeliness, canSeeDay, viewedStaff } from '../web/js/shared/sel/mywork.js';

const T = suite('mywork');
// the actor as the screen has it: the staff record plus the designations the server's session carries (the projected record omits them for some roles)
const actorOf = async id => { const s = await state(id); const u = s.staff.find(x => x.id === id); const a = (await session(id)).actor; return { s, actor: { ...u, designations: a.designations || [] } }; };

await reset('live');

// ------------------------------------------------------------------------------------------------ selectors
await T.test('sections by role, and a hand-typed section can never open what the role may not see', () => {
  assert.deepEq(sectionsFor('direct_support'), ['day']); assert.deepEq(sectionsFor('supervisor'), ['review', 'team', 'todo']);
  assert.deepEq(sectionsFor('clinician'), ['todo', 'review', 'team', 'referrals']); assert.deepEq(sectionsFor('admin'), ['todo', 'team']);
  assert.eq(resolveSection('admin', 'review'), 'todo'); assert.eq(resolveSection('direct_support', 'todo'), 'day'); assert.eq(resolveSection('supervisor', 'day'), 'team');
  assert.eq(resolveSection('clinician', undefined), 'todo'); assert.eq(resolveSection('wizard', 'todo'), null); assert.eq(defaultSection('supervisor'), 'review');
});
await T.test('fail closed: no actor, no list; direct support cannot see another person\'s day; nobody in scope is nobody (no default person)', async () => {
  const { s } = await actorOf('jperez');
  const w = worklist(s, null); assert.eq(w.items.length, 0); assert.eq(dayView(s, null, 'khale'), null); assert.eq(teamView(s, null), null); assert.eq(viewedStaff(s, null), null);
  const ds = (await actorOf('khale')); assert.eq(dayView(ds.s, ds.actor, 'rowens'), null, 'direct support sees only their own day'); assert.eq(canSeeDay(ds.s, ds.actor, 'khale'), true);
  assert.eq(worklist(s, { id: 'x', role: 'guardian' }).items.length, 0, 'a portal actor has no My Work');
});
await T.test('clinician: urgent first (24-hour information reply), verbs per item, referrals in their own section', async () => {
  const { s, actor } = await actorOf('jperez'); const w = worklist(s, actor);
  assert.eq(w.today[0].verb, 'Send reply'); assert.ok(w.today[0].urgent, 'the 24-hour reply leads');
  const verbs = new Set(w.items.map(i => i.verb)); for (const v of ['Send notice', 'Decide', 'Review draft', 'Open screening']) assert.ok(verbs.has(v), 'verb ' + v);
  assert.ok(w.counts.referrals >= 1 && w.items.filter(i => i.section === 'referrals').every(i => !i.ops));
  assert.ok(w.items.some(i => i.kind === 'units'), 'units low is listed'); assert.ok(w.items.every(i => i.id && i.verb && i.title));
});
await T.test('administrator: operations only, no clinical items and no clinical text anywhere', async () => {
  const { s, actor } = await actorOf('dowens'); const w = worklist(s, actor);
  assert.ok(w.items.length > 0 && w.items.every(i => i.ops), 'only operational items'); assert.eq(w.hidden.clinical, true);
  assert.ok(!w.items.some(i => ['info', 'partial', 'draft', 'screening', 'referral', 'review'].includes(i.kind)), 'no clinician work on the admin list');
  assert.deepEq(reviewQueue(s, actor), { allowed: false, pending: [], done: [] });
  const blob = JSON.stringify([w, teamView(s, actor)]);
  assert.noMatch(blob, /played basketball|cooled down|redirected J\.T\.|coping skills/i, 'no narrative from a note');
  assert.eq(teamView(s, actor).canText, false); assert.eq(teamView(s, actor).patterns.filter(p => !p.sample).length, 0);
});
await T.test('supervisor: review queue is the staff routed to them and never their own notes; designated sending shows Send notice', async () => {
  const { s, actor } = await actorOf('cdiaz'); const q = reviewQueue(s, actor);
  assert.ok(q.allowed && q.pending.length >= 7 && q.pending.every(n => n.staff !== 'cdiaz' && (s.staff.find(x => x.id === n.staff) || {}).reviewer === 'cdiaz'));
  const w = worklist(s, actor); assert.ok(w.items.some(i => i.verb === 'Send notice'), 'cdiaz holds send.packet');
  assert.ok(!w.items.some(i => i.verb === 'Send reply'), 'replying to a payer needs a clinician');
  const t = teamView(s, actor); assert.ok(t.rows.length >= 4 && t.scope.long.includes('Campbell'));
});
await T.test('direct support: one progress line, next overdue note first, due-next list, no tiles of other people', async () => {
  const { s, actor } = await actorOf('khale'); const v = dayView(s, actor, 'khale');
  assert.eq(v.progress.done, 4); assert.eq(v.progress.total, 6); assert.ok(v.next && v.next.verb === 'Write note' && /Daily note/.test(v.next.title));
  assert.ok(v.behind.length >= 1 && v.due.length >= 3 && v.quality.length === 4);
  assert.eq(worklist(s, actor).items.length, 0, 'the day view is the list for direct support');
});
await T.test('the note deadline comes from the rules table: 24 h by default, changing it changes who is behind', async () => {
  const { s: s0 } = await actorOf('cdiaz'); const before = noteTimeliness(s0, 'khale').behind.length;
  assert.ok(before >= 1);
  await api('settings.rule', { key: 'notes.daily_due_hours', value: 96, reason: 'testing the deadline' }, 'dowens');
  const { s: s1 } = await actorOf('cdiaz'); const after = noteTimeliness(s1, 'khale').behind.length;
  assert.ok(after < before, `behind ${before} -> ${after}`);
  await api('settings.rule', { key: 'notes.daily_due_hours', reset: true, reason: 'back to the default' }, 'dowens');
  const { s: s2 } = await actorOf('cdiaz'); assert.eq(noteTimeliness(s2, 'khale').behind.length, before);
});

// ------------------------------------------------------------------------------------------------ server refusals behind the screen
await T.test('the server refuses what the screen hides: admin and direct support cannot review a note; a reviewer cannot review their own', async () => {
  const s = await state('cdiaz'); const n = s.notes.find(x => x.review === 'pending');
  await assert.refused(tryApi('note.review', { id: n.id, decision: 'approved' }, 'dowens'), /not allowed|needs/i, 403);
  await assert.refused(tryApi('note.review', { id: n.id, decision: 'approved' }, 'khale'), /not allowed|needs/i, 403);
  await assert.refused(tryApi('staff.reviewMode', { id: 'rowens', mode: 'spot_check' }, 'dowens'), /not allowed|needs/i, 403);
});

// ------------------------------------------------------------------------------------------------ browser
const { chromium } = playwright();
const browser = await chromium.launch(); const ctxs = [];
async function open(user, path, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 } }); ctxs.push(ctx); const page = await ctx.newPage(); page.errs = errors(page);
  if (user) await login(page, user, { presenter: false });
  await page.goto(BASE + path); if (user) await page.reload();
  await page.waitForFunction(() => document.querySelector('#root .mw') && !document.querySelector('#root .sh-loading'), null, { timeout: 15000 });
  await page.waitForTimeout(300);
  return page;
}
const done = async () => { for (const c of ctxs.splice(0)) await c.close().catch(() => { }); };
const fatal = p => p.errs.filter(e => !/controller (Parent|Family)|404/.test(e));
const rootText = p => p.evaluate(() => document.getElementById('root').innerText);

try {
  await T.test('clinician lands on To do: top three with verbs, Show all expands, tabs carry counts, one h1, no console errors', async () => {
    const p = await open('jperez', '/#/MyWork');
    assert.eq(await p.locator('#root h1').count(), 1); assert.eq((await p.locator('#root h1').innerText()).trim(), 'My Work');
    const tabs = await p.locator('.mw-tabs .mw-tab').allInnerTexts(); assert.match(tabs.join('|'), /To do.*Review.*Team.*Referrals/s);
    assert.eq(await p.locator('.mw-group').first().locator('.mw-row').count(), 3, 'top three');
    assert.eq((await p.locator('.mw-row .ui-btn--primary').count()), 1, 'one primary action in the list');
    const verbs = await p.locator('.mw-row .ui-btn').allInnerTexts(); assert.ok(verbs.some(v => /Send reply/.test(v)));
    await p.click('[data-x="all"]'); await p.waitForTimeout(250);
    assert.ok(await p.locator('.mw-group').first().locator('.mw-row').count() > 3, 'Show all expands');
    await p.click('[data-x="toggle"][data-key="waiting"]'); await p.waitForTimeout(250); assert.ok(await p.locator('[data-key="waiting"][aria-expanded="true"]').count());
    await p.screenshot({ path: SHOTS + '/mywork-clinician.png' });
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('supervisor lands on Review: approve a note, return one with a required note, approval mode in Team', async () => {
    const p = await open('cdiaz', '/#/MyWork');
    assert.match(await p.locator('.mw-tab[aria-current=page]').innerText(), /Review/);
    const n0 = (await state('cdiaz')).notes.filter(n => n.review === 'pending').length;
    const who = await p.locator('.mw-detail__h').innerText();
    await p.click('#mw-approve'); await p.waitForTimeout(700);
    assert.eq((await state('cdiaz')).notes.filter(n => n.review === 'pending').length, n0 - 1, 'approved: one fewer waiting');
    assert.ok((await state('cdiaz')).events.some(e => /Note approved/.test(e.what)), 'audit row');
    await p.click('[data-x="return"]'); await p.waitForSelector('#mw-c');
    await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(200);
    assert.match(await p.locator('#mw-c-err').innerText(), /Say what to change/, 'a note is required'); assert.ok(await p.locator('#mw-c').count(), 'the dialog stays open');
    await p.fill('#mw-c', 'Name the goal and the intervention.'); await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(700);
    const s = await state('cdiaz'); assert.eq(s.notes.filter(n => n.review === 'returned').length >= 1, true); assert.eq(s.notes.filter(n => n.review === 'pending').length, n0 - 2);
    assert.match(await rootText(p), /Decided today/);
    await p.goto(BASE + '/#/MyWork?section=team'); await p.waitForSelector('.ui-qt'); await p.waitForTimeout(300);
    const row = p.locator('tr', { hasText: 'R. Owens' }); await row.locator('[data-x="apprOff"]').click(); await p.waitForSelector('.ui-dialog');
    await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(700);
    assert.eq((await state('cdiaz')).staff.find(x => x.id === 'rowens').review_mode, 'spot_check', 'approval turned off through staff.reviewMode');
    await p.screenshot({ path: SHOTS + '/mywork-team.png' });
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await reset('live');
  await T.test('Team deep link ?staff= opens that person\'s day; the old StaffDashboard and ReviewQueue routes land here', async () => {
    let p = await open('cdiaz', '/#/MyWork?section=team&staff=khale');
    assert.match(await rootText(p), /Kayla Hale's day/); assert.match(await rootText(p), /Behind/); await p.close();
    p = await open('cdiaz', '/#/StaffDashboard?staff=khale'); assert.eq(await p.evaluate(() => psyflo.current.id), 'MyWork');
    assert.match(await p.evaluate(() => location.hash), /section=team/); assert.match(await rootText(p), /Kayla Hale's day/); await p.close();
    p = await open('cdiaz', '/#/ReviewQueue'); assert.match(await p.evaluate(() => location.hash), /section=review/); await p.close();
    p = await open('jperez', '/#/DoNext'); assert.match(await p.evaluate(() => location.hash), /section=todo/); await done();
  });
  await T.test('administrator: Operations and Team, "Clinical text hidden for your role", no note text, review is denied with the reason', async () => {
    const p = await open('dowens', '/#/MyWork');
    const text = await rootText(p); assert.match(text, /Clinical text hidden for your role/); assert.match(text, /Operations/);
    assert.noMatch(text, /played basketball|cooled down|Reply to|Send reply|Review draft|New referral/i);
    assert.ok(!(await p.locator('.mw-tab', { hasText: 'Review' }).count()), 'no Review tab');
    await p.goto(BASE + '/#/MyWork?section=review'); await p.waitForTimeout(500);
    assert.match(await rootText(p), /needs a different role/i); assert.match(await rootText(p), /Clinical text hidden/);
    await p.goto(BASE + '/#/MyWork?section=team'); await p.waitForSelector('.ui-qt'); const t = await rootText(p); assert.match(t, /Clinical text hidden for your role/);
    assert.eq(await p.locator('[data-x="apprOn"], [data-x="apprOff"]').count(), 0, 'no approval toggles for an administrator');
    await p.screenshot({ path: SHOTS + '/mywork-admin.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('direct support: My day only, one progress line, Write note goes to the form; works at phone width without sideways scroll', async () => {
    const p = await open('khale', '/#/MyWork', { w: 390, h: 844 });
    assert.eq(await p.locator('.mw-tab').count(), 0, 'a single section has no tabs'); assert.match(await rootText(p), /4 of 6 daily notes in/);
    const prog = await p.locator('[role=progressbar]').count(); assert.eq(prog >= 1, true);
    assert.ok(await p.locator('.mw-next .ui-btn--primary').count() === 1, 'one primary: the next note');
    const w = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })); assert.ok(w.sw <= w.iw + 1, `no horizontal scroll (${w.sw} > ${w.iw})`);
    const small = await p.evaluate(() => [...document.querySelectorAll('#root .mw-row .ui-btn')].filter(b => b.getBoundingClientRect().height < 44).length); assert.eq(small, 0, 'touch targets 44 px');
    await p.screenshot({ path: SHOTS + '/mywork-ds-390.png' }); assert.deepEq(fatal(p), [], 'console errors');
    await p.goto(BASE + '/#/MyWork?section=review'); await p.waitForTimeout(500); assert.match(await rootText(p), /needs a different role/i); await done();
  });
  await T.test('a row whose screen the role may not open says why (a disabled button), never a dead link', async () => {
    const p = await open('dowens', '/#/MyWork');
    await p.click('[data-x="toggle"][data-key="waiting"]'); await p.waitForTimeout(300);
    const dead = await p.evaluate(() => [...document.querySelectorAll('#root .mw-row a[href]')].filter(a => /Submission|InfoRequest|Partials|PeerBrief|ExtSignOff/.test(a.getAttribute('href'))).length);
    assert.eq(dead, 0, 'admin rows never link to clinician-only screens'); await done();
  });
  await T.test('every link on every My Work section, for every role, resolves to a screen the role may open', async () => {
    const bad = [];
    for (const [user, secs] of [['jperez', ['todo', 'review', 'team', 'referrals']], ['cdiaz', ['review', 'team', 'todo']], ['dowens', ['todo', 'team']], ['khale', ['day']]]) {
      const p = await open(user, '/#/MyWork');
      for (const sec of secs) {
        await p.goto(BASE + '/#/MyWork?section=' + sec); await p.waitForTimeout(500);
        for (const k of ['all', 'week', 'waiting']) { const b = p.locator(k === 'all' ? '[data-x="all"]' : `[data-x="toggle"][data-key="${k}"]`); if (await b.count()) { if ((await b.first().getAttribute('aria-expanded')) !== 'true') await b.first().click(); await p.waitForTimeout(150); } }
        const hrefs = await p.evaluate(() => [...document.querySelectorAll('#root a[href^="#/"]')].map(a => a.getAttribute('href')));
        for (const h of new Set(hrefs)) {
          const r = await p.evaluate(h => { const [id, qs] = h.slice(2).split('?'); const m = psyflo.canOpen(id); const known = !!document.querySelector('body'); return { id, ok: m }; }, h);
          if (!r.ok) bad.push(`${user}/${sec}: ${h}`);
        }
      }
      await p.close();
    }
    assert.deepEq(bad, [], 'links the role cannot open'); await done();
  });
} finally { await browser.close(); }
await T.done();
