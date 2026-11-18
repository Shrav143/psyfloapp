// A3 · the ASAM Criteria on the platform screens: what people work in is driven by the stored assessments (seed/extra/asam.json) through
// web/js/shared/asam.js and web/js/shared/sel/asam-view.js. Pure selectors against each role's projected state (who may see the ratings, the notes, the
// level and the reassessment date), then the screens in a browser: the Authorizations list (Level of care cell, chips, flags, two filters), the
// authorization case section, the roster strip, the chart's ASAM tab, the bell, the Denial Intelligence dimension filter; then FLO and Analytics.
// Standalone: `BASE=http://localhost:4830 node test/asam-platform.mjs` (test/run-all.mjs starts a fresh server for it).
import { suite, assert, state, reset, playwright, errors, login, session, BASE, SHOTS } from './lib/index.mjs';
import { authQueue, normalizeParams, authCase } from '../web/js/shared/sel/auth.js';
import { rosterRows, patientChart } from '../web/js/shared/sel/roster.js';
import { notificationsFor } from '../web/js/shared/sel/notify.js';
import { clientReading, assessmentHistory, asamAccess, disputeReason, readReason } from '../web/js/shared/sel/asam-view.js';
import { floAsk, floSuggestions } from '../web/js/shared/flo-engine.js';
import { levelCheck, dueState, latestAssessment } from '../web/js/shared/asam.js';
import * as V from '../web/js/shared/analytics/view.js';
import { PROV } from '../web/js/shared/analytics/common.js';

const T = suite('asam-platform');
const actorOf = async id => { const s = await state(id); const u = s.staff.find(x => x.id === id); const a = (await session(id)).actor; return { s, actor: { ...u, caseload: a.caseload, designations: a.designations || u.designations || [], presenter: !!a.presenter } }; };

await reset('canvas');

// ------------------------------------------------------------------------------------------------ who may see what (the server projection)
await T.test('projection: clinician holds the whole row; the supervisor the ratings but no note and no plan; administrator and direct support the date and level only', async () => {
  const cl = await actorOf('jperez'), sp = await actorOf('cdiaz'), ad = await actorOf('dowens'), ds = await actorOf('khale');
  const tn = s => s.asam_assessments.find(a => a.client === 'TN');
  assert.ok(tn(cl.s).dims['3'].note && tn(cl.s).plan, 'clinician: the note per dimension and the plan');
  assert.ok(tn(sp.s).dims['3'].rating === 3 && tn(sp.s).dims['3'].note === undefined && tn(sp.s).plan === undefined, 'supervisor: the rating, never the note or the plan');
  assert.ok(tn(ad.s).dims === undefined && tn(ad.s).ratings_hidden && tn(ad.s).date, 'administrator: date and kind, no ratings');
  assert.ok(ds.s.asam_assessments.length >= 3 && ds.s.asam_assessments.every(a => ds.s.clients.some(c => c.id === a.client && c.staff === 'khale')), 'direct support: own caseload only');
  assert.ok(ds.s.asam_assessments.every(a => a.dims === undefined && a.plan === undefined), 'direct support: no ratings and no text');
  assert.ok(ds.s.asam_assessments.every(a => !JSON.stringify(a).match(/Generalized|note|Safety plan/)), 'direct support: no clinical text anywhere in the row');
  assert.deepEq(asamAccess(cl.actor), { level: true, ratings: true, text: true }); assert.deepEq(asamAccess(sp.actor), { level: true, ratings: true, text: false });
  assert.deepEq(asamAccess(ad.actor), { level: true, ratings: false, text: false }); assert.deepEq(asamAccess(ds.actor), { level: true, ratings: false, text: false }); assert.deepEq(asamAccess(null), { level: false, ratings: false, text: false });
});

// ------------------------------------------------------------------------------------------------ the readings
await T.test('readings: the level of a request against the latest assessment (match, over, under), the reassessment clock, an incident since the last assessment', async () => {
  const { s, actor } = await actorOf('jperez'); const q = authQueue(s, normalizeParams({}), actor);
  const by = id => q.rows.find(r => r.id === id).asam;
  assert.eq(by('R-0391').check.state, 'over', 'J.O.: every rating fits Level 1, Level 2.1 is asked'); assert.eq(by('R-0388').check.state, 'under', 'T.N.: the ratings point above Level 2.1');
  assert.eq(by('R-0388').lowest, '2.5'); assert.eq(by('R-0391').lowest, '1');
  assert.eq(by('R-0411').check.state, 'match'); assert.eq(by('R-0384').check.state, 'match');
  assert.ok(by('R-0395').overdue && by('R-0395').due.limit === 30, 'S.B.: last assessed Sep 24, 30-day rule'); assert.ok(by('R-0380').overdue, 'L.V.: last assessed Sep 10');
  assert.ok(by('R-0402').incident && by('R-0402').incident.date === '2026-10-28' && by('R-0402').flags.some(f => f.key === 'incident'), 'D.W.: the Oct 28 emergency visit came after the Oct 9 assessment');
  assert.ok(!by('R-0411').incident && !by('R-0411').overdue && by('R-0411').change && by('R-0411').changeText.includes('Lower risk'), 'M.R.: reassessed Oct 14, improved, no incident after it');
  // the rule's source is on the reading, and a reading is computed, never stored
  assert.ok(by('R-0395').due.rule && by('R-0395').due.rule.category === 'UNVERIFIED-DEMO-ASSUMPTION' && by('R-0395').due.dueDate === '2026-10-24');
  assert.ok(!JSON.stringify(s.asam_assessments).match(/"state"|"check"|"lowest"/), 'no derived value is stored with the assessments');
});
await T.test('Not assessed is never a guess: a client with no assessment has no level state, no ratings and no clock', async () => {
  const { s, actor } = await actorOf('jperez'); const rd = clientReading(s, actor, 'ES');
  assert.ok(!rd.has && rd.state === 'none' && rd.ratings === null && rd.due.state === 'none' && rd.flags.some(f => f.key === 'none'), JSON.stringify(rd.flags));
  assert.eq(assessmentHistory(s, actor, 'ES').length, 0); assert.ok(levelCheck(null, '2.1').state === 'none');
  const ds = await actorOf('khale'); const row = rosterRows(ds.s, ds.actor).rows.find(r => r.id === 'ES'); assert.ok(row && !row.asam.has, 'direct support sees E.S. as Not assessed too');
});
await T.test('role readings: the supervisor reads the match state; the administrator and direct support get the level tag and the reassessment state only', async () => {
  const q = async id => { const { s, actor } = await actorOf(id); return authQueue(s, normalizeParams({}), actor).rows.find(r => r.id === 'R-0388').asam; };
  const sp = await q('cdiaz'), ad = await q('dowens');
  assert.eq(sp.check.state, 'under'); assert.ok(sp.ratings && sp.ratings.length === 6, 'supervisor: the six ratings');
  assert.eq(ad.level, '2.1'); assert.ok(ad.ratings === null && ad.check === null && ad.state === 'hidden', 'administrator: no ratings, no match state'); assert.ok(ad.due.state && ad.has, 'administrator: the reassessment date');
  const ds = await actorOf('khale'); const mr = rosterRows(ds.s, ds.actor).rows.find(r => r.id === 'MR').asam;
  assert.eq(mr.levelTag, 'ASAM 2.1 · IOP'); assert.ok(mr.ratings === null && mr.check === null && mr.access.ratings === false, 'direct support: the level tag, no ratings');
});

// ------------------------------------------------------------------------------------------------ the Authorizations list: filters
await T.test('filters: Level of care (a level, or what the ratings say about it) and Reassessment (overdue, due soon, not assessed, incident) narrow the queue; both are in the address', async () => {
  const { s, actor } = await actorOf('jperez'); const ids = p => authQueue(s, normalizeParams(p), actor).rows.map(r => r.id).sort();
  assert.deepEq(ids({ level: 'over' }), ['R-0391']); assert.deepEq(ids({ level: 'under' }), ['R-0388']);
  assert.ok(ids({ level: '2.1' }).length >= 9, 'Level 2.1 requests'); assert.ok(ids({ level: '3.1' }).length === 0);
  const od = ids({ reassess: 'overdue' }); assert.ok(od.includes('R-0395') && od.includes('R-0380') && !od.includes('R-0411'), od.join());
  assert.deepEq(ids({ reassess: 'incident' }), ['R-0402']);
  assert.deepEq(normalizeParams({ level: 'bogus', reassess: 'nope' }).level, ''); assert.deepEq(normalizeParams({ level: '2.5', reassess: 'soon' }).reassess, 'soon');
  const ad = await actorOf('dowens'); const qa = authQueue(ad.s, normalizeParams({ level: 'over' }), ad.actor); assert.eq(qa.rows.length, 0, 'the administrator holds no ratings: nothing is "over" for them');
});

// ------------------------------------------------------------------------------------------------ the case section
await T.test('case: authCase carries the reading and the history; the clinician sees the notes, the supervisor does not', async () => {
  const cl = await actorOf('jperez'), sp = await actorOf('cdiaz');
  const c = authCase(cl.s, 'R-0388', cl.actor); assert.eq(c.asam.check.state, 'under'); assert.ok(c.asamHistory.length === 1 && c.asamHistory[0].dims.length === 6 && c.asamHistory[0].dims.every(d => d.note), 'clinician: a note per dimension');
  const s2 = authCase(sp.s, 'R-0388', sp.actor); assert.ok(s2.asamHistory[0].dims.every(d => d.rating != null && d.note === ''), 'supervisor: ratings, no note text');
  const mr = authCase(cl.s, 'R-0411', cl.actor); assert.eq(mr.asamHistory.length, 2); assert.ok(mr.asamHistory[0].date > mr.asamHistory[1].date && mr.asamHistory[0].plan.includes('Step down to Level 1'), 'M.R.: two assessments, newest first, with the step-down plan');
});

// ------------------------------------------------------------------------------------------------ the bell
await T.test('bell: reassessment overdue or due soon, a request level the ratings do not support, an incident since the last assessment; direct support gets none, the administrator no ratings-based item', async () => {
  const cl = await actorOf('jperez'); const n = notificationsFor(cl.s, cl.actor).filter(x => x.kind === 'asam');
  assert.ok(n.every(x => x.group === 'Level of care' && x.id && x.to && x.title && ['r', 'y', 'n'].includes(x.sev)));
  const has = (re, sev) => assert.ok(n.some(x => re.test(x.title) && (!sev || x.sev === sev)), 'item ' + re + ' in ' + n.map(x => x.title).join(' | '));
  has(/D\.W\. · incident Oct 28 after the last assessment/, 'r'); has(/S\.B\. · ASAM reassessment \d+ days? overdue/, 'r'); has(/L\.V\. · ASAM reassessment \d+ days? overdue/, 'r'); has(/J\.O\. · Level 2\.1 is not supported by the ratings/, 'y'); has(/T\.N\. · ratings point above Level 2\.1/);
  assert.ok(n.some(x => /^asam:incident:DW:2026-10-28$/.test(x.id)) && n.some(x => /^asam:over:R-0391:/.test(x.id)), 'ids carry the record and the state that raised them');
  assert.deepEq(notificationsFor(cl.s, cl.actor).filter(x => x.kind === 'asam').map(x => x.id), n.map(x => x.id), 'same state, same ids, same order');
  const ds = await actorOf('khale'); assert.ok(notificationsFor(ds.s, ds.actor).every(x => x.kind !== 'asam'), 'direct support: units and notes only');
  const ad = await actorOf('dowens'); const na = notificationsFor(ad.s, ad.actor).filter(x => x.kind === 'asam');
  assert.ok(na.length >= 3 && na.every(x => /reassessment/.test(x.title)), 'administrator: reassessment dates only: ' + na.map(x => x.title).join(' | '));
  const sp = await actorOf('cdiaz'); const nsp = notificationsFor(sp.s, sp.actor).filter(x => x.kind === 'asam'); assert.ok(nsp.some(x => /incident/.test(x.title)) && nsp.some(x => /not supported/.test(x.title)), 'supervisor: holds the ratings');
});

// ------------------------------------------------------------------------------------------------ Denial Intelligence: what a reason turns on
await T.test('Denial Intelligence: the payer reason is read against the six dimensions (the reasons table first, then the words); a reason that names none says so', async () => {
  const { s } = await actorOf('jperez');
  const table = [{ reason: '"Already connected to other services"', dims: [5, 6], level: true }, { reason: '"Assessment is not current"', dims: [], level: true }];
  assert.deepEq(readReason({ denial_reasons: table }, 'The payer said it is already connected to other services.').dims, [5, 6]);
  assert.deepEq(readReason({ denial_reasons: table }, 'Assessment is not current').dims, []); assert.eq(readReason({ denial_reasons: table }, 'Assessment is not current').level, true);
  assert.deepEq(readReason({}, 'no documented use in the last 30 days, urine screens negative').dims, [5]); assert.eq(readReason({}, 'we like blue').dims.length, 0);
  const ec = (s.disputes || []).find(d => d.request === 'R-0384'); const x = disputeReason(s, ec); assert.ok(x.dims.length >= 1 && x.level, JSON.stringify(x));
  const tn = (s.disputes || []).find(d => d.request === 'R-0388'); assert.ok(disputeReason(s, tn).none || disputeReason(s, tn).dims.length === 0, 'T.N.: the reason was not recorded; nothing is invented');
});

// ------------------------------------------------------------------------------------------------ FLO
await T.test('FLO: who is due for reassessment · whose ratings do not support the level · the level the ratings suggest · which dimension drives a denial · D5 trends', async () => {
  const cl = await actorOf('jperez'); const ask = (a, q) => floAsk(a.s, a.actor, q);
  const a = ask(cl, 'Who is due for reassessment?'); assert.eq(a.intent, 'reassess'); assert.match(a.summary.join(' '), /overdue/); assert.ok(a.table.rows.some(r => r[0].t === 'S.B.' && r[1] === 'Sep 24' && /overdue/.test(r[3].t)), 'cites the assessment date'); assert.ok(a.list.some(x => /Not assessed/.test(x) && /E\.S\./.test(x)), 'says Not assessed for E.S.');
  const m = ask(cl, 'Whose ratings do not support their requested level?'); assert.eq(m.intent, 'level-mismatch'); assert.ok(m.table.rows.some(r => r[0].t === 'J.O.' && /lower level/.test(r[4].t)) && m.table.rows.some(r => r[0].t === 'T.N.' && /point higher/.test(r[4].t)));
  const l = ask(cl, 'What level do the ratings suggest for T.N.?'); assert.eq(l.intent, 'level-suggest'); assert.match(l.summary[0], /Oct 1/); assert.match(l.summary[0], /Level 2\.5/); assert.match(l.summary.join(' '), /suggested|suggest/); assert.ok(l.table.rows.length === 6);
  const none = ask(cl, 'What level do the ratings suggest for E.S.?'); assert.match(none.summary[0], /Not assessed/);
  const d = ask(cl, 'Which dimension drives the denial on E.C.?'); assert.eq(d.intent, 'denial-dim'); assert.match(d.summary.join(' '), /D5/); assert.ok(d.list.some(x => /rated \d/.test(x) && /Oct 12/.test(x)), 'cites the rating and its date');
  const t = ask(cl, 'Show D5 trends'); assert.eq(t.intent, 'dim-trend'); assert.ok(t.table.rows.some(r => r[0].t === 'M.R.' && /Aug 12: 3 → Oct 14: 2/.test(r[1])), 'M.R. D5 series with dates');
  // role-aware
  const ad = await actorOf('dowens'), ds = await actorOf('khale'), sp = await actorOf('cdiaz');
  for (const q of ['Whose ratings do not support their requested level?', 'Show D5 trends', 'What level do the ratings suggest for T.N.?']) { assert.eq(ask(ad, q).kind, 'blocked', 'administrator · ' + q); assert.eq(ask(ds, q).kind === 'blocked' || !ask(ds, q).table, true, 'direct support · ' + q); }
  assert.eq(ask(ds, 'Who is due for reassessment?').kind, 'answer'); assert.ok(ask(ds, 'Who is due for reassessment?').table.rows.every(r => ['C.B.', 'D.P.', 'J.T.', 'A.G.', 'M.R.', 'E.S.'].includes(r[0].t)), 'direct support: own caseload');
  assert.eq(ask(sp, 'Which dimension drives the denial on E.C.?').kind, 'blocked', 'a supervisor has no denial cases'); assert.eq(ask(sp, 'Show D5 trends').intent, 'dim-trend');
  // no clinician's note is ever quoted
  const secrets = (cl.s.asam_assessments || []).flatMap(x => Object.values(x.dims || {}).map(d => d.note).concat([x.plan])).filter(t => t && t.length > 25).map(t => t.slice(0, 25));
  assert.ok(secrets.length >= 10);
  for (const who of [cl, sp, ad, ds]) for (const q of ['Who is due for reassessment?', 'Whose ratings do not support their requested level?', 'What level do the ratings suggest for D.W.?', 'Show D5 trends', 'Which dimension drives the denial on E.C.?', ...floSuggestions(who.s, who.actor)]) { const j = JSON.stringify(ask(who, q)); for (const sec of secrets) assert.ok(!j.includes(sec), `${who.actor.id} · ${q} quotes a note: ${sec}`); }
  assert.ok(floSuggestions(cl.s, cl.actor).some(q => /reassessment/.test(q)) && floSuggestions(cl.s, cl.actor).some(q => /D5 trends/.test(q)), 'starters');
});

// ------------------------------------------------------------------------------------------------ Analytics
await T.test('Analytics: outcomes by level, payer reasons by dimension and denials by level-of-care reading (small groups never shown); the seeded reasons by dimension are sample data', async () => {
  const cl = await actorOf('jperez'); const view = sec => V.sectionView(cl.s, cl.actor, PROV.CASE, sec, { period: 'all' });
  const pay = view('payer'); const byLevel = pay.panels.find(p => p.id === 'asam.by_level'); assert.ok(byLevel, 'outcomes by level of care requested');
  const r21 = byLevel.rows.find(r => /Level 2\.1/.test(r.label)); assert.ok(r21 && r21.n >= 9, 'Level 2.1 requests counted: ' + JSON.stringify(r21));
  assert.ok(byLevel.rows.every(r => r.denied === undefined || typeof r.denied === 'number' || r.denied.suppressed), 'cells are counts or "Fewer than 5"');
  assert.ok(Object.values(r21).some(v => v && v.suppressed), 'the outcome split of a small group is hidden');
  for (const id of ['asam.dims', 'asam.state']) { const p = pay.panels.find(x => x.id === id); assert.ok(p, id); for (const r of p.rows) assert.ok(r.n === undefined || (typeof r.n === 'object' && r.n.suppressed) || r.n >= 5, id + ' shows no group under 5: ' + JSON.stringify(r)); }
  const pop = view('population'); const lv = pop.panels.find(p => p.id === 'pop.level'); assert.ok(lv && lv.rows.some(r => /Level 2\.1/.test(r.label) && r.n >= 5), 'patients by level'); assert.ok(pop.panels.find(p => p.id === 'pop.reassess'), 'patients by reassessment state');
  assert.ok(pop.panels.find(p => p.id === 'pop.reassess').rows.every(r => typeof r.n === 'number' ? r.n >= 5 : r.n.suppressed), 'groups under 5 are suppressed');
  const base = V.baselineView(cl.s); const bd = base.find(p => p.id === 'base.dims'); assert.ok(bd && bd.provenance === 'harvest_export', 'seeded reasons by dimension: sample data, illustrative');
  assert.ok(bd.rows.every(r => typeof r.n === 'number' ? (r.n >= 5 || r.n === 0) : r.n.suppressed), 'small groups hidden in the sample too');
  const ad = await actorOf('dowens'); const apay = V.sectionView(ad.s, ad.actor, PROV.CASE, 'payer', { period: 'all' }); assert.ok(apay.panels.find(p => p.id === 'asam.by_level'), 'an administrator reads the aggregate, not the ratings');
  assert.ok(!JSON.stringify(apay.panels).match(/Generalized|rated \d/), 'no clinical text in an aggregate');
});

// ------------------------------------------------------------------------------------------------ the screens
const { chromium } = playwright(); const browser = await chromium.launch(); const ctxs = [];
async function open(user, path, ready = '#root main', o = {}) {
  const ctx = await browser.newContext({ viewport: { width: o.w || 1440, height: o.h || 1000 } }); ctxs.push(ctx); const page = await ctx.newPage(); page.errs = errors(page);
  await login(page, user, { presenter: false }); await page.goto(BASE + path); await page.reload();
  await page.waitForFunction(sel => document.querySelector(sel) && !document.querySelector('#root .sh-loading'), ready, { timeout: 15000 }); await page.waitForTimeout(500);
  return page;
}
const done = async () => { for (const c of ctxs.splice(0)) await c.close().catch(() => { }); };
const fatal = p => p.errs.filter(e => !/controller (Parent|Family)|404|MyWork/.test(e));
const txt = (p, sel = '#root') => p.locator(sel).first().innerText();
try {
  await T.test('Authorizations: the Level of care cell (service, ASAM level, state chip, reassessment flag, level flag) and the two filters', async () => {
    const p = await open('jperez', '/#/Authorizations');
    const row = n => p.locator('tbody tr[data-ui-row]', { hasText: n }).first();
    assert.match(await row('J.O.').innerText(), /ASAM 2\.1 · IOP/); assert.match(await row('J.O.').innerText(), /Step-down likely/); assert.ok(await row('J.O.').locator('[data-asam-flag="over"]').count(), 'J.O.: the level flag');
    assert.match(await row('T.N.').innerText(), /Ratings higher/); assert.match(await row('M.R.').innerText(), /Ratings support/);
    assert.match(await row('M.R.').locator('.a-c-level').innerText(), /IOP day|IOP/, 'the service sits above the level');
    assert.ok(await row('S.B.').locator('[data-asam-due="overdue"] .ui-dateflag--overdue').count(), 'S.B.: the overdue reassessment flag'); assert.ok(await row('S.B.').locator('[data-asam-due] .ui-verify').count(), 'with the rule\'s source icon');
    assert.ok(await row('D.W.').locator('[data-asam-flag="incident"]').count(), 'D.W.: the incident flag');
    assert.eq(await row('M.R.').locator('[data-asam-due]').count(), 0, 'a clock that is not close shows no flag');
    await p.click('#a-filters'); await p.waitForSelector('.a-fd');   // R6: the Level of care and Reassessment filters are in the Filters drawer
    await p.selectOption('select[data-key="level"]', 'over'); await p.waitForTimeout(400); assert.eq(await p.locator('tbody tr[data-ui-row]').count(), 1); assert.match(await p.evaluate(() => location.hash), /level=over/);
    await p.selectOption('select[data-key="level"]', ''); await p.selectOption('select[data-key="reassess"]', 'overdue'); await p.waitForTimeout(400);
    const od = (await p.locator('tbody tr[data-ui-row]').allInnerTexts()).join('|'); assert.ok(/S\.B\./.test(od) && /L\.V\./.test(od) && !/M\.R\./.test(od), od.replace(/\n/g, ' ')); assert.match(await p.evaluate(() => location.hash), /reassess=overdue/);
    await p.keyboard.press('Escape'); assert.deepEq(fatal(p), []); await done();
  });
  await T.test('Authorization case: a Level of care section computed from the assessment: six dimensions with rating, note and date; the reading; the change; the clock with its rule chip; the plan', async () => {
    const p = await open('jperez', '/#/Authorization?id=R-0411&section=level', '#sec-level');
    const sec = p.locator('#sec-level'); const t = await sec.innerText();
    assert.eq(await sec.locator('[data-asam-dims] tbody tr').count(), 6); assert.match(t, /Ratings support Level 2\.1/); assert.match(t, /Oct 14/); assert.match(t, /Since Aug 12/); assert.match(t, /Lower risk/); assert.match(t, /Reassess by Nov 13|Reassess/);
    assert.ok(await sec.locator('[data-asam-clock] .ui-verify').count(), 'the reassessment clock carries the rule\'s source chip'); assert.match(t, /Step down to Level 1 when D3 is 1 or lower/, 'the clinician\'s plan');
    assert.ok((await sec.locator('[data-asam-dims] .asam-nt').allInnerTexts()).every(x => x.trim().length > 10), 'a note per dimension for the clinician'); assert.match(t, /suggested/i, 'a derived level is "suggested"'); assert.noMatch(t, /determined/i);
    await p.goto(BASE + '/#/Authorization?id=R-0388&section=level'); await p.waitForTimeout(700); const tn = await txt(p, '#sec-level'); assert.match(tn, /Ratings higher/); assert.match(tn, /Level 2\.5/);
    assert.deepEq(fatal(p), []); await done();
    const sp = await open('cdiaz', '/#/Authorization?id=R-0388&section=level', '#sec-level'); const st = await txt(sp, '#sec-level');
    assert.eq(await sp.locator('#sec-level [data-asam-dims] tbody tr').count(), 6, 'supervisor: the ratings'); assert.ok(await sp.locator('#sec-level .ui-lockhint').count() >= 1, 'a lock where the clinician\'s note would be'); assert.noMatch(st, /Generalized anxiety|Denies thoughts/, 'supervisor: no note text'); assert.deepEq(fatal(sp), []); await done();
    const ad = await open('dowens', '/#/Authorization?id=R-0388&section=level', '#sec-level'); const at = await txt(ad, '#sec-level');
    assert.eq(await ad.locator('#sec-level [data-asam-dims]').count(), 0, 'administrator: no ratings table'); assert.match(at, /ASAM 2\.1 · IOP/); assert.match(at, /Ratings and notes hidden for your role/); assert.deepEq(fatal(ad), []); await done();
  });
  await T.test('Not assessed in the section: no assessment says so and offers "Open the ASAM assessment in Lauris" (rendered from the same functions)', async () => {
    const p = await open('jperez', '/#/Authorization?id=R-0411&section=level', '#sec-level');
    const html = await p.evaluate(async () => {
      const { levelSection } = await import('/js/screens/asam-ui.js'); const { clientReading } = await import('/js/shared/sel/asam-view.js');
      const { api } = await import('/js/api.js'); const s = api.state; const a = window.psyflo.session.actor; const rd = clientReading(s, a, 'ES', { level: '2.1' });
      const sec = levelSection(rd, { name: 'E.S.', assess: '<a class="ui-btn" href="#x">Open the ASAM assessment in Lauris</a>' }); return sec.sum + '|' + sec.body;
    });
    assert.match(html, /^Not assessed\|/); assert.match(html, /Not assessed/); assert.match(html, /Open the ASAM assessment in Lauris/); assert.match(html, /cannot compare it with ratings that do not exist/);
    await done();
  });
  await T.test('Dashboard roster: a Level of care column with the level chip, the D1 to D6 strip (clinician, supervisor) and the reassessment state; direct support sees the level tag and the state only', async () => {
    const p = await open('jperez', '/#/Dashboard', '#root .d-row');
    const tn = p.locator('.d-row[data-id="TN"]'); assert.eq(await tn.locator('[data-asam-strip] .asam-n').count(), 6, 'six ratings'); assert.match(await tn.innerText(), /ASAM 2\.1 · IOP/);
    assert.deepEq((await tn.locator('[data-asam-strip] .asam-n').allInnerTexts()).map(x => x.trim()), ['1', '1', '3', '2', '3', '3'], 'T.N.: D1 to D6 as rated Oct 1');
    assert.match(await tn.locator('[data-asam-strip]').getAttribute('aria-label'), /D3 3 Significant/);
    const sb = p.locator('.d-row[data-id="SB"]'); assert.ok(await sb.locator('[data-asam-due="overdue"]').count(), 'S.B.: reassessment overdue shown on the row'); assert.ok(await sb.locator('.d-alert').count() >= 1);
    assert.ok(await p.locator('select[data-key="reassess"]').count() && await p.locator('select[data-key="level"]').count(), 'the roster filters'); assert.deepEq(fatal(p), []); await done();
    const ds = await open('khale', '/#/Dashboard', '#root .d-row');
    assert.eq(await ds.locator('[data-asam-strip]').count(), 0, 'direct support: no ratings strip'); assert.ok(await ds.locator('.d-row[data-id="MR"] [data-asam-level]').count(), 'the level tag'); assert.ok(await ds.locator('.d-row[data-id="CB"] [data-asam-due="overdue"]').count(), 'C.B.: reassessment overdue (Sep 18)');
    assert.match(await ds.locator('.d-row[data-id="ES"]').innerText(), /Not assessed/); assert.noMatch(await ds.locator('#root').innerText(), /Generalized|Significant|Moderate/); assert.deepEq(fatal(ds), []); await done();
  });
  await T.test('Patient chart: an ASAM tab with the assessment history (date, kind, assessor, ratings, a note per dimension, change); a clinician reads the notes, a supervisor the ratings, direct support the level and state', async () => {
    const p = await open('jperez', '/#/Patient?id=MR&section=asam', '#root .pt-page');
    assert.match(await p.locator('.pt-tab[aria-current=page]').innerText(), /ASAM/); assert.eq(await p.locator('[data-asam-assessment]').count(), 2, 'two assessments for M.R.');
    const first = p.locator('[data-asam-assessment]').first(); const ft = await first.innerText(); assert.match(ft, /Oct 14, 2026 · Reassessment/); assert.match(ft, /Latest/); assert.match(ft, /Change since Aug 12/); assert.match(ft, /Jordan Perez/); assert.eq(await first.locator('[data-asam-dims] tbody tr').count(), 6);
    assert.match(await p.locator('#root').innerText(), /Step down to Level 1 when D3 is 1 or lower/, 'the plan'); assert.ok(await p.locator('[data-asam-summary] [data-asam-strip]').count(), 'summary strip');
    await p.locator('.pt-tab', { hasText: 'Authorization' }).click(); await p.waitForTimeout(500); assert.match(await p.locator('.pt-auth').innerText(), /Level of care[\s\S]*ASAM 2\.1 · IOP/, 'the authorization section shows the level reading');
    assert.deepEq(fatal(p), []); await done();
    const sp = await open('cdiaz', '/#/Patient?id=DW&section=asam', '#root .pt-page'); const st = await txt(sp, '#root'); assert.eq(await sp.locator('[data-asam-assessment]').count(), 2); assert.noMatch(st, /Psychiatric|Generalized|Reassess within 7 days of any emergency/, 'supervisor: no note text, no plan'); assert.ok(await sp.locator('.ui-lockhint').count() >= 1); assert.deepEq(fatal(sp), []); await done();
    const ds = await open('khale', '/#/Patient?id=ES&section=asam', '#root .pt-page'); const dt = await txt(ds, '#root'); assert.match(dt, /Not assessed/); assert.eq(await ds.locator('[data-asam-dims]').count(), 0); await ds.goto(BASE + '/#/Patient?id=CB&section=asam'); await ds.waitForTimeout(700);
    const cb = await txt(ds, '#root'); assert.eq(await ds.locator('[data-asam-dims]').count(), 0, 'direct support: no ratings table'); assert.match(cb, /ASAM 2\.1 · IOP/); assert.match(cb, /overdue/i); assert.match(cb, /Ratings and notes hidden for your role/); assert.deepEq(fatal(ds), []); await done();
  });
  await T.test('bell and Denial Intelligence: Level of care group in the drawer; the denial list names the dimensions and filters by one', async () => {
    const p = await open('jperez', '/#/Dashboard', '#root .d-row');
    await p.locator('[data-topbar="bell"]').click(); await p.waitForSelector('.bell'); await p.waitForTimeout(400);
    const groups = await p.locator('.bell__g').allInnerTexts(); assert.ok(groups.some(g => /^Level of care/.test(g)), groups.join()); assert.match(await p.locator('.bell').innerText(), /D\.W\. · incident Oct 28 after the last assessment/);
    assert.deepEq(fatal(p), []); await done();
    const di = await open('jperez', '/#/DenialIntelligence', '#root .ui-qt__table');
    assert.ok(await di.locator('[data-asam-dims]').count() >= 1, 'a case row names the dimensions its reason turns on'); const labels = await di.$$eval('#root .ui-fsel__l', ls => ls.map(l => l.innerText.trim())); assert.ok(labels.includes('ASAM dimension'));
    const all = await di.locator('tbody tr[data-ui-row]').count(); await di.selectOption('select[data-key="dim"]', 'level'); await di.waitForTimeout(400); const lv = await di.locator('tbody tr[data-ui-row]').count(); assert.ok(lv >= 1 && lv <= all, `level of care filter ${lv} of ${all}`); assert.match(await di.evaluate(() => location.hash), /dim=level/);
    assert.deepEq(fatal(di), []); await done();
  });
} finally { await done(); await browser.close(); }
T.done();
