// Settings (E1): people and roles (two-person raises, no self change), designated access (second person, no self grant, audit rows),
// the rules table edited through settings.rule (reason required, audited, forward only, the dependent screen changes), unit bands,
// signature mode per document type, family-link questions, the audit log, the presenter tab, and Login.
import { suite, assert, api, tryApi, state, reset, session, playwright, errors, login, BASE, SHOTS } from './lib/index.mjs';
import { worklist } from '../web/js/shared/sel/mywork.js';
import { unitsFor, signatureMode, rule } from '../web/js/shared/rules.js';

const T = suite('settings');
await reset('live');
const lastEvents = async n => (await state('dowens')).events.slice(-n).map(e => e.what);

// ------------------------------------------------------------------------------------------------ people and roles
await T.test('roles: a raise needs a second person (not the proposer, an administrator or a clinician); a lowering applies at once; never your own', async () => {
  await assert.refused(tryApi('settings.role', { id: 'dowens', role: 'clinician', reason: 'testing it' }, 'dowens'), /own role/, 403);
  await assert.refused(tryApi('settings.role', { id: 'khale', role: 'supervisor', reason: '' }, 'dowens'), /Say why/, 422);
  await assert.refused(tryApi('settings.role', { id: 'khale', role: 'supervisor', reason: 'covers a second site' }, 'jperez'), /not allowed/, 403);
  const r = await api('settings.role', { id: 'khale', role: 'supervisor', reason: 'covers a second site' }, 'dowens'); assert.eq(r.status, 'pending');
  assert.eq((await state('dowens')).staff.find(x => x.id === 'khale').role, 'direct_support', 'nothing changed yet');
  await assert.refused(tryApi('settings.roleDecide', { id: r.id, decision: 'approve' }, 'dowens'), /different person/, 403);
  await assert.refused(tryApi('settings.roleDecide', { id: r.id, decision: 'approve' }, 'cdiaz'), /not allowed/, 403);
  assert.eq((await api('settings.roleDecide', { id: r.id, decision: 'approve' }, 'jperez')).status, 'approved');
  assert.eq((await state('dowens')).staff.find(x => x.id === 'khale').role, 'supervisor');
  await assert.refused(tryApi('settings.roleDecide', { id: r.id, decision: 'approve' }, 'jperez'), /already decided/);
  const low = await api('settings.role', { id: 'khale', role: 'direct_support', reason: 'back to the classroom' }, 'dowens'); assert.eq(low.status, 'applied');
  const ev = await lastEvents(5); assert.ok(ev.some(e => /Role change proposed: Kayla Hale/.test(e)) && ev.some(e => /Role changed: Kayla Hale · Site supervisor → Direct support/.test(e)), 'audit rows');
});
await T.test('people: new users start as direct support or supervisor; clinician and administrator go through a role change', async () => {
  await assert.refused(tryApi('settings.userAdd', { name: 'Morgan Ellis', role: 'clinician' }, 'dowens'), /second person/, 422);
  await assert.refused(tryApi('settings.userAdd', { name: 'Morgan Ellis', role: 'admin' }, 'dowens'), /second person/, 422);
  await assert.refused(tryApi('settings.userAdd', { name: 'Morgan Ellis', role: 'supervisor' }, 'cdiaz'), /not allowed/, 403);
  const r = await api('settings.userAdd', { name: 'Morgan Ellis', role: 'supervisor', credential: 'QMHP-C' }, 'dowens'); assert.ok(r.id);
  assert.ok((await state('dowens')).staff.some(x => x.id === r.id && x.role === 'supervisor'));
});
await T.test('designated access: proposed by an administrator, confirmed by someone else, never for yourself, never a clinical-record grant for an administrator', async () => {
  await assert.refused(tryApi('settings.designate', { id: 'dowens', cap: 'send.packet', grant: true, reason: 'because' }, 'dowens'), /own account/, 403);
  await assert.refused(tryApi('settings.designate', { id: 'dowens', cap: 'notes.view', grant: true, reason: 'because' }, 'dowens'), /./, 403);
  await assert.refused(tryApi('settings.designate', { id: 'khale', cap: 'approve.sra', grant: true, reason: 'covers' }, 'dowens'), /cannot be designated/, 422);
  const p = await api('settings.designate', { id: 'cdiaz', cap: 'approve.sra', grant: true, reason: 'covers when the LPC is out' }, 'dowens');
  await assert.refused(tryApi('settings.designate', { id: 'cdiaz', cap: 'approve.sra', grant: true, reason: 'again again' }, 'dowens'), /already waiting/, 409);
  const sup = await session('cdiaz'); assert.ok(!sup.actor.designations.includes('approve.sra'), 'not effective yet');
  await assert.refused(tryApi('settings.designateDecide', { id: p.id, decision: 'approve' }, 'dowens'), /different person/, 403);
  assert.eq((await api('settings.designateDecide', { id: p.id, decision: 'approve' }, 'jperez')).status, 'approved');
  const st = await state('dowens'); assert.ok(st.staff.find(x => x.id === 'cdiaz').designations.includes('approve.sra'), 'effective after the second person');
  const ev = await lastEvents(4); assert.ok(ev.some(e => /Designation proposed: grant approve\.sra for Carla Diaz/.test(e)) && ev.some(e => /Designation approved: grant approve\.sra for Carla Diaz/.test(e)), 'audit rows');
  // the confirmer sees it in My Work; the proposer does not
  const s2 = await state('jperez'); const a2 = { ...s2.staff.find(x => x.id === 'jperez'), designations: (await session('jperez')).actor.designations };
  const rm = await api('settings.designate', { id: 'cdiaz', cap: 'approve.sra', grant: false, reason: 'cover ends today' }, 'dowens');
  const w = worklist(await state('jperez'), a2); assert.ok(w.items.some(i => i.kind === 'confirm-designation' && i.action.id === rm.id), 'the clinician sees "Confirm access"');
  const wa = worklist(await state('dowens'), { ...(await state('dowens')).staff.find(x => x.id === 'dowens') }); assert.ok(!wa.items.some(i => i.kind === 'confirm-designation'), 'the proposer does not');
  await api('settings.designateDecide', { id: rm.id, decision: 'decline' }, 'jperez');
});

// ------------------------------------------------------------------------------------------------ rules
await T.test('rules: a reason is required, only the administrator edits, the type is kept, and a change is audited with its values', async () => {
  await assert.refused(tryApi('settings.rule', { key: 'decision.followup_day', value: 5, reason: '' }, 'dowens'), /Say why/, 422);
  await assert.refused(tryApi('settings.rule', { key: 'decision.followup_day', value: 5, reason: 'testing it' }, 'jperez'), /not allowed/, 403);
  await assert.refused(tryApi('settings.rule', { key: 'decision.followup_day', value: 'five', reason: 'testing it' }, 'dowens'), /must be a number/, 422);
  await api('settings.rule', { key: 'decision.followup_day', value: 5, reason: 'the clinic calls on day five' }, 'dowens');
  const r = rule(await state('dowens'), 'decision.followup_day'); assert.eq(r.value, 5); assert.eq(r.history.length, 1); assert.eq(r.history[0].from, 10);
  assert.ok((await lastEvents(2)).some(e => /Rule changed: Follow-up call on the decision/.test(e)));
});
await T.test('rules: the dependent screen changes (day-5 follow-up makes the Aetna request a follow-up call in My Work); reset restores it', async () => {
  const mk = async () => { const s = await state('jperez'); return worklist(s, { ...s.staff.find(x => x.id === 'jperez'), designations: (await session('jperez')).actor.designations }); };
  assert.ok((await mk()).items.some(i => i.kind === 'followup' && /J\.O\./.test(i.title)), 'day 6 is past a day-5 follow-up');
  await api('settings.rule', { key: 'decision.followup_day', reset: true, reason: 'back to the default' }, 'dowens');
  assert.ok(!(await mk()).items.some(i => i.kind === 'followup' && /J\.O\./.test(i.title)), 'day 6 is before day 10');
  assert.eq(rule(await state('dowens'), 'decision.followup_day').value, 10);
});
await T.test('units: the alternate bands change the units a day earns; restore returns the official bands (audited)', async () => {
  const s0 = await state('dowens'); assert.eq(unitsFor(s0, 'tdt', 60), 0); assert.eq(unitsFor(s0, 'tdt', 180), 2);
  const alt = rule(s0, 'units.tdt.alt_tiers').value;
  await api('settings.rule', { key: 'units.tdt.day_tiers', value: alt, reason: 'testing the 60-minute rule' }, 'dowens');
  assert.eq(unitsFor(await state('dowens'), 'tdt', 60), 1, 'one hour is a unit under the alternate bands');
  await assert.refused(tryApi('settings.rule', { key: 'units.tdt.day_tiers', value: [[120, 2], [60, 1]], reason: 'bad bands here' }, 'dowens'), /increasing/, 422);
  await api('settings.rule', { key: 'units.tdt.day_tiers', reset: true, reason: 'official bands again' }, 'dowens');
  assert.eq(unitsFor(await state('dowens'), 'tdt', 60), 0);
});
await T.test('signature mode per document type: default remote (not validated); In person changes the rule the family screens read', async () => {
  let s = await state('dowens'); for (const d of ['consent', 'release', 'enrollment', 'quarterly', 'appeal']) assert.eq(signatureMode(s, d), 'remote_allowed', d);
  await api('settings.rule', { key: 'signature.mode.consent', value: 'in_person_required', reason: 'the director said in person' }, 'dowens');
  s = await state('dowens'); assert.eq(signatureMode(s, 'consent'), 'in_person_required'); assert.eq(signatureMode(s, 'release'), 'remote_allowed');
  assert.ok(signatureMode(await state('jperez'), 'consent') === 'in_person_required', 'staff read the same row');
  await api('settings.rule', { key: 'signature.mode.consent', reset: true, reason: 'back to the default' }, 'dowens');
});
await T.test('family link questions: ask and required switches (the guardian link reads them); the insurance question is locked', async () => {
  await assert.refused(tryApi('settings.familyQuestion', { key: 'insurance', ask: false }, 'dowens'), /stays on/, 422);
  await assert.refused(tryApi('settings.familyQuestion', { key: 'address', ask: true }, 'jperez'), /not allowed/, 403);
  await api('settings.familyQuestion', { key: 'address', ask: true }, 'dowens'); await api('settings.familyQuestion', { key: 'address', required: true }, 'dowens');
  let q = (await state('dowens')).settings.family_link.questions.find(x => x.key === 'address'); assert.ok(q.ask && q.required);
  await api('settings.familyQuestion', { key: 'address', ask: false }, 'dowens'); q = (await state('dowens')).settings.family_link.questions.find(x => x.key === 'address'); assert.ok(q.ask === false && !q.required, 'turning a question off clears required');
});
await T.test('the administrator has no clinical-record access: Settings never carries note text, and the matrix says so', async () => {
  const s = await state('dowens'); const blob = JSON.stringify(s.notes);
  assert.noMatch(blob, /played basketball|cooled down|coping skills/i); assert.eq(s.screenings.length, 0); assert.eq(s.drafts.length, 0);
});

// ------------------------------------------------------------------------------------------------ browser
const { chromium } = playwright();
const browser = await chromium.launch(); const ctxs = [];
async function open(user, path, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 } }); ctxs.push(ctx); const page = await ctx.newPage(); page.errs = errors(page);
  if (user) await login(page, user, { presenter: false });
  await page.goto(BASE + path); if (user) await page.reload();
  await page.waitForFunction(() => document.querySelector('#root h1, #root .denied') && !document.querySelector('#root .sh-loading'), null, { timeout: 15000 });
  await page.waitForTimeout(350);
  return page;
}
const done = async () => { for (const c of ctxs.splice(0)) await c.close().catch(() => { }); };
const fatal = p => p.errs.filter(e => !/controller (Parent|Family)|404/.test(e));
const rootText = p => p.evaluate(() => document.getElementById('root').innerText);
await reset('live');

try {
  await T.test('Settings: seven tabs, one h1, every tab renders without console errors; only the administrator opens it', async () => {
    const p = await open('dowens', '/#/Settings?tab=people');
    assert.eq(await p.locator('#root h1').count(), 1); assert.eq(await p.locator('.se-tab').count(), 7);
    for (const t of ['people', 'roles', 'units', 'rules', 'audit', 'family', 'presenter']) {
      await p.goto(BASE + '/#/Settings?tab=' + t); await p.waitForTimeout(400);
      assert.eq(await p.locator('.se-tab[aria-current=page]').getAttribute('href'), '#/Settings?tab=' + t, t);
      assert.eq(await p.locator('#root h1').count(), 1, t);
    }
    assert.deepEq(fatal(p), [], 'console errors'); await p.close();
    for (const u of ['jperez', 'cdiaz', 'khale']) { const q = await open(u, '/#/Settings'); assert.ok(await q.evaluate(() => !!document.querySelector('#root .denied')), u + ' is denied'); await q.close(); }
    await done();
  });
  await T.test('rules tab: filter by source, search, edit in the drawer (reason required, value type kept), history and the audit tab show it', async () => {
    const p = await open('dowens', '/#/Settings?tab=rules');
    const total = await p.locator('.ui-qt tbody tr').count(); assert.ok(total >= 70, 'all rules listed: ' + total);
    await p.click('.ui-fchip[data-value="OFFICIAL-VERIFIED"]'); await p.waitForTimeout(300);
    const off = await p.locator('.ui-qt tbody tr').count(); assert.ok(off > 0 && off < total, 'filtered to officially verified');
    await p.click('.ui-fchip[data-value="OFFICIAL-VERIFIED"]'); await p.fill('.ui-fsearch input', 'follow-up'); await p.waitForTimeout(400);
    assert.eq(await p.locator('.ui-qt tbody tr').count(), 1);
    await p.click('.ui-qt [data-x="rule"]'); await p.waitForSelector('.ui-dialog--drawer');
    assert.match(await p.locator('.ui-dialog--drawer').innerText(), /Harvest-reported/); assert.match(await p.locator('.ui-dialog--drawer').innerText(), /Default\s+10/);
    await p.fill('#se-rv', '7'); await p.click('.ui-dialog--drawer [data-ui-action="1"]'); await p.waitForTimeout(250);
    assert.match(await p.locator('#se-rerr').innerText(), /Say why/, 'no reason, no change'); assert.eq(rule(await state('dowens'), 'decision.followup_day').value, 10);
    await p.fill('#se-why', 'The clinic calls on day seven'); await p.click('.ui-dialog--drawer [data-ui-action="1"]'); await p.waitForTimeout(700);
    assert.eq(rule(await state('dowens'), 'decision.followup_day').value, 7); assert.match(await rootText(p), /7 days after sending/); assert.match(await rootText(p), /Changed/);
    await p.goto(BASE + '/#/Settings?tab=audit'); await p.waitForTimeout(500);
    const t = await rootText(p); assert.match(t, /Rule changed: Follow-up call on the decision · 10 days after sending → 7 days after sending/, 'the audit log shows the values'); assert.match(t, /Dana Owens/);
    await p.screenshot({ path: SHOTS + '/settings-audit.png' }); await p.click('[data-ui-fchip][data-value="refused"]'); await p.waitForTimeout(300);
    assert.deepEq(fatal(p), [], 'console errors'); await done();
    await api('settings.rule', { key: 'decision.followup_day', reset: true, reason: 'back to the default' }, 'dowens');
  });
  await T.test('units tab: the try-it box follows the bands; switching to the alternate asks why and is audited', async () => {
    const p = await open('dowens', '/#/Settings?tab=units');
    await p.fill('#se-min', '300'); assert.match(await p.locator('#se-min-out').innerText(), /3 units/); await p.fill('#se-min', '60'); assert.match(await p.locator('#se-min-out').innerText(), /0 units/);
    await p.click('[data-x="bands"][data-mode="alt"]'); await p.waitForSelector('#se-why'); await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(250);
    assert.match(await p.locator('#se-why-err').innerText(), /Say why/); await p.fill('#se-why', 'Trying the 60-minute rule'); await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(700);
    assert.match(await rootText(p), /Alternate bands/); assert.match(await p.locator('#se-min-out').innerText(), /1 unit/);
    await p.screenshot({ path: SHOTS + '/settings-units.png' });
    await p.click('[data-x="bands"][data-mode="official"]'); await p.waitForSelector('#se-why'); await p.fill('#se-why', 'Official bands again'); await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(700);
    assert.match(await rootText(p), /Official bands/); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('roles tab: the matrix is drawn from permissions.js; designate in the UI, the clinician confirms from My Work, the grant takes effect', async () => {
    const p = await open('dowens', '/#/Settings?tab=roles');
    const cells = await p.locator('.se-matrix').first().locator('tbody tr').count(); assert.ok(cells >= 30, 'matrix rows: ' + cells);
    assert.match(await rootText(p), /Administrators have no clinical-record access/);
    await p.click('[data-x="designate"][data-cap="approve.sra"]'); await p.waitForSelector('#se-who'); await p.selectOption('#se-who', 'cdiaz');
    await p.fill('#se-why', 'Covers when the LPC is out'); await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(700);
    assert.match(await rootText(p), /Designated access\s*1 waiting/); assert.match(await rootText(p), /Waiting for another person/);
    assert.ok(!(await state('dowens')).staff.find(x => x.id === 'cdiaz').designations.includes('approve.sra'));
    const q = await open('jperez', '/#/MyWork'); await q.waitForSelector('[data-x="confirm"]');
    await q.click('[data-x="confirm"]'); await q.waitForSelector('.ui-dialog'); assert.match(await q.locator('.ui-dialog').innerText(), /Carla Diaz/); assert.match(await q.locator('.ui-dialog').innerText(), /Covers when the LPC is out/);
    await q.click('.ui-dialog [data-ui-action="1"]'); await q.waitForTimeout(800);
    assert.ok((await state('dowens')).staff.find(x => x.id === 'cdiaz').designations.includes('approve.sra'), 'effective after confirmation');
    await p.reload(); await p.waitForTimeout(600); assert.match(await rootText(p), /Carla Diaz\s*Remove/);
    await p.click('[data-x="portal"]'); await p.waitForTimeout(250); assert.match(await p.locator('.se-matrix').first().locator('thead').innerText(), /Guardian/);
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('people tab: change a role with a reason (a lowering applies, a raise waits), the second person confirms in Settings or My Work', async () => {
    const p = await open('dowens', '/#/Settings?tab=people');
    await p.locator('tr', { hasText: 'J. Reyes' }).locator('[data-x="role"]').click(); await p.waitForSelector('#se-role'); await p.selectOption('#se-role', 'supervisor');
    await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(250); assert.match(await p.locator('#se-why-err').innerText(), /Say why/);
    await p.fill('#se-why', 'Covers Campbell ES-2'); await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(700);
    assert.match(await rootText(p), /Waiting for a second person/); assert.eq((await state('dowens')).staff.find(x => x.id === 'jreyes').role, 'direct_support');
    assert.eq(await p.locator('tr', { hasText: 'Dana Owens' }).locator('button[disabled]').count(), 1, 'your own role cannot be changed');
    const q = await open('jperez', '/#/MyWork'); await q.waitForSelector('[data-x="confirm"]'); await q.click('[data-x="confirm"]'); await q.waitForSelector('.ui-dialog');
    await q.click('.ui-dialog [data-ui-action="1"]'); await q.waitForTimeout(800); assert.eq((await state('dowens')).staff.find(x => x.id === 'jreyes').role, 'supervisor');
    await p.locator('tr', { hasText: 'J. Reyes' }).locator('[data-x="role"]').click().catch(() => { });
    await p.click('[data-x="addUser"]').catch(async () => { await p.reload(); await p.waitForTimeout(600); await p.click('[data-x="addUser"]'); });
    await p.waitForSelector('#se-nu-name'); await p.fill('#se-nu-name', 'Sam Ortiz'); await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(700);
    assert.ok((await state('dowens')).staff.some(x => x.name === 'Sam Ortiz'), 'user added'); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('family tab: In person changes the rule, asks why, shows Policy not validated; the family-link question switches work', async () => {
    const p = await open('dowens', '/#/Settings?tab=family');
    assert.eq(await p.locator('.se-seg__b[aria-pressed=true]').count(), 5); assert.ok((await p.locator('text=Policy not validated').count()) >= 5);
    await p.click('.se-seg__b[data-key="signature.mode.release"][data-value="in_person_required"]'); await p.waitForSelector('#se-why'); await p.fill('#se-why', 'Director: in person'); await p.click('.ui-dialog [data-ui-action="1"]'); await p.waitForTimeout(700);
    assert.eq(signatureMode(await state('dowens'), 'release'), 'in_person_required');
    assert.eq(await p.locator('.se-seg__b[data-key="signature.mode.release"][aria-pressed=true]').getAttribute('data-value'), 'in_person_required');
    const before = (await state('dowens')).settings.family_link.questions.find(x => x.key === 'dob').required;
    await p.click('[data-key="dob"][data-what="req"]'); await p.waitForTimeout(600); assert.eq((await state('dowens')).settings.family_link.questions.find(x => x.key === 'dob').required, !before);
    assert.eq(await p.locator('[data-key="insurance"][data-what="ask"]').isDisabled(), true, 'the locked question');
    await p.screenshot({ path: SHOTS + '/settings-family.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
    await api('settings.rule', { key: 'signature.mode.release', reset: true, reason: 'back to the default' }, 'dowens');
  });
  await T.test('presenter tab: how it fits, architecture, maturity legend with all four levels, the unresolved decisions with where each is set', async () => {
    const p = await open('dowens', '/#/Settings?tab=presenter'); const t = await rootText(p);
    for (const w of [/How it fits/, /Architecture/, /Page bridge to the open Lauris page/, /Unresolved decisions/, /Guardian signatures: in person or remote/, /Daily minimum/, /Pilot \(preview\)/, /Simulated/, /Future/]) assert.match(t, w);
    assert.noMatch(t, /Lauris API integration|integrates? with Lauris|an integration with Lauris/i, 'say page bridge');
    assert.ok((await p.locator('.se-dec a.ui-btn').count()) >= 8, 'decisions link to their setting');
    await p.click('.se-dec a.ui-btn >> nth=0'); await p.waitForTimeout(600); assert.match(await p.evaluate(() => location.hash), /tab=family/);
    await p.goto(BASE + '/#/Settings?tab=presenter'); await p.waitForTimeout(400); await p.click('[data-x="maturity"]'); await p.waitForTimeout(300);
    assert.eq(await p.evaluate(() => document.documentElement.dataset.maturity), 'all', 'the maturity overlay is on'); await p.click('[data-x="maturity"]');
    await p.screenshot({ path: SHOTS + '/settings-presenter.png' }); assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
  await T.test('Login: four role cards, the family and school entries, no password, no demo chrome; signing in lands on the role\'s home; works at 390', async () => {
    const p = await open(null, '/#/Login', { w: 390, h: 844 });
    const t = await rootText(p); assert.match(t, /Direct support/); assert.match(t, /Supervisor/); assert.match(t, /Clinician/); assert.match(t, /Admin/); assert.match(t, /Family portal/); assert.match(t, /School counselor/);
    assert.noMatch(t, /Demo:|pick a role card|seed staff|password/i); assert.match(t, /Demo data · nothing is real/);
    assert.eq(await p.locator('#root input[type=password]').count(), 0); assert.eq(await p.locator('#root h1').count(), 1);
    const w = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth })); assert.ok(w.sw <= w.iw + 1, 'no sideways scroll');
    assert.eq(await p.evaluate(() => [...document.querySelectorAll('#root button, #root select, #root a.ui-btn')].filter(e => e.getBoundingClientRect().height < 44).length), 0, 'touch targets 44 px');
    await p.screenshot({ path: SHOTS + '/login-390.png' });
    await p.click('[data-signin="supervisor"]'); await p.waitForFunction(() => /MyWork/.test(location.hash), null, { timeout: 8000 }); await p.waitForTimeout(500);
    assert.match(await p.evaluate(() => location.hash), /section=review/); assert.eq((await p.evaluate(() => psyflo.session.user.id)), 'cdiaz');
    assert.deepEq(fatal(p), [], 'console errors'); await done();
  });
} finally { await browser.close(); }
await T.done();
