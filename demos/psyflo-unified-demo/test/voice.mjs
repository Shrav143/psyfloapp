// The simulated voice agent and the new Denial Intelligence steps (R3): payer opening hours are demo data with a source label, a closed line cannot be
// called, a call is started and recorded by a person (nothing is saved by the screen on its own), it never moves the request or records a decision,
// and each recorded call carries who and when. Also: analysis, clinical review and the documentation request are person-initiated, audited and
// role-limited. Run: BASE=http://localhost:5300 node test/voice.mjs
import { suite, assert, api, tryApi, state, reset, advance, login, errors, playwright, BASE, SHOTS } from './lib/index.mjs';
import { lineStatus, hoursSummary, callScript, CALL_PURPOSES, missingItems, weakPoints, evidenceIndex, byRequest } from '../web/js/shared/sel/disputes.js';

const T = suite('voice');
const dispute = async (req, as = 'jperez') => (await state(as)).disputes.find(d => d.request === req);
const request = async (id, as = 'jperez') => (await state(as)).requests.find(r => r.id === id);
const events = async (rec, as = 'jperez') => (await state(as)).events.filter(e => e.record === rec);

await reset('canvas');

await T.test('payer hours are demo data with a source label, for every payer, and role-projected', async () => {
  const s = await state('jperez');
  assert.ok(Array.isArray(s.payer_hours) && s.payer_hours.length >= 6, 'hours for each payer');
  for (const h of s.payer_hours) { assert.eq(h.category, 'UNVERIFIED-DEMO-ASSUMPTION', h.payer + ' hours are an assumption'); assert.ok(h.source && /assumption/i.test(h.source), 'a source label'); assert.eq(h.verified_on, null); assert.ok(!/\d{3}[-. ]\d{3}[-. ]\d{4}/.test(JSON.stringify(h)), 'no phone number is stored'); }
  assert.eq((await state('dowens')).payer_hours.length, s.payer_hours.length, 'the administrator may read the hours');
  assert.eq((await state('cdiaz')).payer_hours.length, s.payer_hours.length, 'the site supervisor may read the hours');
  assert.eq((await state('khale')).payer_hours.length, 0, 'direct support has no use for them: withheld');
});

await T.test('the line status: Anthem is open at the story time (Thu 3:30 pm), Sentara closed at 3 pm; the weekend and the next opening are worked out', async () => {
  const s = await state('jperez');
  const a = lineStatus(s, 'anthem'); assert.ok(a.open && a.known, 'Anthem open'); assert.eq(a.summary, 'Mon–Fri 8 am–6 pm');
  const z = lineStatus(s, 'sentara'); assert.ok(!z.open && z.known, 'Sentara closed'); assert.eq(z.nextOpen.label, 'tomorrow 8 am'); assert.eq(z.summary, 'Mon–Fri 8 am–3 pm');
  const sat = lineStatus(s, 'anthem', '2026-10-31T10:00'); assert.ok(!sat.open && /^Mon 8 am$/.test(sat.nextOpen.label), 'closed on Saturday, opens Monday');
  assert.ok(lineStatus(s, 'anthem', '2026-10-30T08:00').open && !lineStatus(s, 'anthem', '2026-10-30T07:59').open && !lineStatus(s, 'anthem', '2026-10-30T18:00').open, 'opening is inclusive, closing is exclusive');
  const none = lineStatus(s, 'nobody'); assert.ok(!none.open && !none.known, 'fails closed when no hours are on file');
  assert.eq(hoursSummary({ mon: ['08:00', '17:00'], tue: ['08:00', '17:00'], thu: ['09:00', '12:30'] }), 'Mon–Tue 8 am–5 pm, Thu 9 am–12:30 pm');
});

await T.test('the script is built from stored case facts only, and the payer side is a labelled placeholder (nothing is made up for the payer)', async () => {
  const s = await state('jperez'); const d = byRequest(s, 'R-0408'); const r = s.requests.find(x => x.id === 'R-0408');
  for (const [k] of CALL_PURPOSES) {
    const lines = callScript(s, d, r, k); assert.ok(lines.some(l => l.who === 'agent') && lines.some(l => l.who === 'payer'));
    const text = lines.map(l => l.text).join(' '); assert.match(text, /R-0408/); assert.match(text, /K\.T/);
    for (const l of lines.filter(l => l.who === 'payer')) assert.match(l.text, /Scripted placeholder/); assert.noMatch(text, /approved|denied|overturn|we will|your request is/i, 'the script states no payer decision');
  }
});

await T.test('a closed line cannot be called: the server refuses (nothing recorded, no change); an open line records the call with who, when and a note typed by the person', async () => {
  const before = await request('R-0402');
  const j = await assert.refused(tryApi('dispute.logCall', { id: 'DI-0402', purpose: 'status', outcome: 'They said it is pending.' }, 'jperez'), /closed now/i, 409); assert.eq(j.code, 'payer_closed');
  assert.match(j.error, /Next opening: tomorrow 8 am/); assert.match(j.error, /not verified/i, 'the refusal says the hours are demo hours');
  assert.ok(!(await dispute('R-0402')).calls, 'nothing was recorded');
  // an open line (Anthem), but no note: refused, the person writes what the payer said
  await assert.refused(tryApi('dispute.logCall', { id: 'DI-0408', purpose: 'status', outcome: '' }, 'jperez'), /what the payer said/i, 422);
  await assert.refused(tryApi('dispute.logCall', { id: 'DI-0408', purpose: 'nonsense', outcome: 'x y z' }, 'jperez'), /what the call is about/i, 422);
  const kt0 = await request('R-0408');
  const r = await api('dispute.logCall', { id: 'DI-0408', purpose: 'docs', outcome: 'The representative said the IEP copy is still needed.', ref: 'REF-5521' }, 'jperez'); assert.eq(r.call, 'CALL-1');
  const d = await dispute('R-0408'); assert.eq(d.calls.length, 1); const c = d.calls[0];
  assert.eq(c.by, 'jperez'); assert.ok(/^2026-10-29T15:30/.test(c.at), 'the demo clock time'); assert.eq(c.sim, true); assert.eq(c.purpose, 'docs'); assert.eq(c.ref, 'REF-5521'); assert.eq(c.hours_category, 'UNVERIFIED-DEMO-ASSUMPTION');
  assert.ok(c.script.some(l => l.who === 'payer' && /placeholder/i.test(l.text)), 'the saved transcript keeps the placeholder label');
  const ev = (await events('R-0408')).find(e => /Voice agent call recorded/.test(e.what)); assert.ok(ev, 'an audit event'); assert.eq(ev.who, 'jperez'); assert.eq(ev.sim, true); assert.match(ev.what, /Simulated/); assert.match(ev.what, /not a payer decision/); assert.ok(!/IEP copy/.test(ev.what), 'the typed note stays on the case, not in the audit line');
  // a call is never a decision and never moves the request
  const kt1 = await request('R-0408'); assert.eq(kt1.stage, kt0.stage); assert.eq(JSON.stringify(kt1.decision_log || []), JSON.stringify(kt0.decision_log || [])); assert.eq(d.status, 'info-req'); assert.eq(d.closed, null);
  const after = await request('R-0402'); assert.eq(after.stage, before.stage);
});

await T.test('the call is a clinician\'s: supervisor, administrator and direct support are all refused; the administrator sees only the number of calls', async () => {
  for (const u of ['dowens', 'cdiaz', 'khale']) { const j = await tryApi('dispute.logCall', { id: 'DI-0408', purpose: 'status', outcome: 'x y z' }, u); assert.ok(!j.ok, u); assert.ok([401, 403].includes(j.status), u + ' ' + j.status); }
  const ad = (await state('dowens')).disputes.find(d => d.request === 'R-0408'); assert.eq(ad.calls, 1, 'a count, no transcript'); assert.ok(!JSON.stringify(ad).includes('IEP copy'), 'no call note in the administrator projection');
  assert.ok((await state('jperez')).disputes.find(d => d.request === 'R-0408').calls[0].outcome, 'the clinician reads it');
});

await T.test('closed on a weekend: Anthem refuses on Saturday too (calendar advance), and the refusal names Monday', async () => {
  await advance(2, true);
  const s = await state('jperez'); assert.eq(s.clock.date, '2026-10-31');
  const j = await assert.refused(tryApi('dispute.logCall', { id: 'DI-0384', purpose: 'status', outcome: 'They said nothing new.' }, 'jperez'), /closed now/i, 409); assert.match(j.error, /Mon 8 am/);
  assert.ok(!(await dispute('R-0384')).calls);
  await reset('canvas');
});

await T.test('analysis, missing-evidence check, clinical review and the documentation request: person-initiated, audited, role-limited, nothing is sent', async () => {
  const d0 = await dispute('R-0408'); assert.ok(!d0.analysis && !d0.gaps && !d0.review && !d0.docreq);
  const a = await api('dispute.analyze', { id: 'DI-0408', step: 'analyze' }, 'jperez'); assert.ok(a.points >= 2);
  const g = await api('dispute.analyze', { id: 'DI-0408', step: 'gaps' }, 'jperez'); assert.ok(g.missing >= 1);
  let d = await dispute('R-0408'); assert.eq(d.analysis.by, 'jperez'); assert.eq(d.analysis.points, a.points); assert.eq(d.gaps.n, g.missing);
  const evs = (await events('R-0408')).map(e => e.what); assert.ok(evs.some(w => /Denial analyzed from stored records.*Simulated/.test(w))); assert.ok(evs.some(w => /Missing evidence checked/.test(w)));
  // the same count the screen shows comes from the same selector
  const s = await state('jperez'); const dd = byRequest(s, 'R-0408'); const r = s.requests.find(x => x.id === 'R-0408'); const idx = evidenceIndex(s, dd, r);
  assert.eq(weakPoints(s, dd, r, idx).length, a.points); assert.eq(missingItems(s, dd, r, idx).length, g.missing);
  // review: a clinician reviews; a non-clinician cannot be chosen; the administrator may mark, the note stays off the audit line
  await assert.refused(tryApi('dispute.markReview', { id: 'DI-0408', to: 'cdiaz', note: 'x' }, 'jperez'), /licensed clinician/i, 422);
  await assert.refused(tryApi('dispute.markReview', { id: 'DI-0408', to: 'nobody' }, 'jperez'), /who reviews/i, 422);
  await api('dispute.markReview', { id: 'DI-0408', to: 'jperez', note: 'Please check the IEP wording.' }, 'dowens');
  d = await dispute('R-0408'); assert.eq(d.review.to, 'jperez'); assert.eq(d.review.by, 'dowens'); assert.ok(!(await events('R-0408')).some(e => /IEP wording/.test(e.what)));
  const adm = (await state('dowens')).disputes.find(x => x.request === 'R-0408'); assert.ok(adm.review && !adm.review.note, 'the administrator projection has no note');
  // analysis and the documentation request need the clinician
  for (const [act, args] of [['dispute.analyze', { id: 'DI-0408', step: 'analyze' }], ['dispute.docRequest', { id: 'DI-0408', to: 'guardian' }], ['dispute.logCall', { id: 'DI-0408', purpose: 'status', outcome: 'x y z' }]]) { const j = await tryApi(act, args, 'dowens'); assert.ok(!j.ok && j.status === 403, act); }
  // the request: needs a valid recipient and something marked missing; records who was asked; sends nothing; items are marked received by a person
  await assert.refused(tryApi('dispute.docRequest', { id: 'DI-0408', to: 'payer' }, 'jperez'), /who the documentation is requested from/i, 422);
  await assert.refused(tryApi('dispute.docRequest', { id: 'DI-0408', to: 'guardian', keys: ['nope'] }, 'jperez'), /nothing to request/i, 422);
  const sentBefore = (await state('jperez')).events.length;
  const q = await api('dispute.docRequest', { id: 'DI-0408', to: 'school' }, 'jperez'); assert.ok(q.items >= 1);
  d = await dispute('R-0408'); assert.eq(d.docreq.to, 'school'); assert.ok(d.docreq.items.every(x => x.got === null));
  assert.match((await events('R-0408')).find(e => /Documentation requested/.test(e.what)).what, /recorded only: Psyflo sends no message/);
  assert.eq((await state('jperez')).events.length, sentBefore + 1, 'one audit event, no message event');
  const key = d.docreq.items[0].key; await api('dispute.docReceived', { id: 'DI-0408', key }, 'jperez');
  await assert.refused(tryApi('dispute.docReceived', { id: 'DI-0408', key }, 'jperez'), /already marked received/i);
  d = await dispute('R-0408'); assert.ok(d.docreq.items[0].got.by === 'jperez');
  // none of this moves the request
  assert.eq((await request('R-0408')).stage, 'info_requested'); assert.eq(d.status, 'info-req');
});

// ---------------------------------------------------------------------------------------------------------------------------------- the screen
const { chromium } = playwright(); const browser = await chromium.launch();
const open = async (user, width = 1440) => { const ctx = await browser.newContext({ viewport: { width, height: 900 } }); const page = await ctx.newPage(); page.errs = errors(page); await login(page, user, { presenter: false }); page.ctx = ctx; return page; };
const txt = page => page.evaluate(() => (document.getElementById('root') || {}).innerText || '');

await T.test('screen: a closed line shows Closed now and blocks the call; Cancel saves nothing', async () => {
  await reset('canvas');
  const p = await open('jperez'); await p.goto(BASE + '/#/DenialCase?id=R-0402'); await p.waitForSelector('#d-call');
  await p.click('#d-call'); const dlg = p.getByRole('dialog'); await dlg.waitFor();
  const t = await dlg.innerText(); assert.match(t, /Closed now/); assert.match(t, /opens tomorrow 8 am/); assert.match(t, /Mon–Fri 8 am–3 pm/); assert.match(t, /Simulated/); assert.match(t, /Nothing is dialled/);
  assert.ok(await dlg.locator('[data-verification="unverified"], [data-verification]').count() >= 1, 'the hours carry their source chip');
  assert.ok(await dlg.locator('#d-run').isDisabled(), 'Run is disabled while the line is closed'); assert.ok(await dlg.getByRole('button', { name: 'Save the call record' }).isDisabled(), 'Save is disabled too');
  await dlg.getByRole('button', { name: 'Cancel' }).click(); await p.waitForTimeout(300);
  assert.ok(!(await dispute('R-0402')).calls, 'nothing saved'); assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('screen: an open line runs the scripted call, shows its transcript, saves only when the person records it (with their own note), and History shows it', async () => {
  const p = await open('jperez'); await p.goto(BASE + '/#/DenialCase?id=R-0408'); await p.waitForSelector('#d-call');
  await p.click('#d-call'); const dlg = p.getByRole('dialog'); await dlg.waitFor();
  assert.match(await dlg.innerText(), /Open now/); assert.ok(!(await dlg.locator('#d-run').isDisabled()));
  await dlg.getByLabel('Ask for a peer-to-peer time').check(); await dlg.locator('#d-run').click(); await p.waitForSelector('#d-script li:nth-child(4)', { timeout: 6000 });
  const sc = await dlg.locator('#d-script').innerText(); assert.match(sc, /voice agent · simulated/i); assert.match(sc, /payer line · scripted placeholder/i); assert.match(sc, /peer-to-peer/i); assert.match(sc, /R-0408/);
  // Save without a note: blocked, and still nothing recorded
  await dlg.getByRole('button', { name: 'Save the call record' }).click(); await p.waitForTimeout(500);
  assert.ok(await p.getByRole('dialog').count(), 'the dialog stays open'); assert.ok(!(await dispute('R-0408')).calls, 'nothing recorded without the person\'s note');
  await p.fill('#d-out', 'Reviewer slots are Tuesdays and Thursdays; they will call back.'); await p.fill('#d-ref', 'TT-77');
  await dlg.getByRole('button', { name: 'Save the call record' }).click(); await p.waitForTimeout(900);
  const d = await dispute('R-0408'); assert.eq(d.calls.length, 1); assert.eq(d.calls[0].purpose, 'p2p'); assert.eq(d.calls[0].by, 'jperez'); assert.match(d.calls[0].outcome, /Tuesdays and Thursdays/);
  assert.eq(d.status, 'info-req', 'a call does not move the case'); assert.eq((await request('R-0408')).stage, 'info_requested');
  await p.click('#d-hist summary'); await p.waitForTimeout(300); const t = await txt(p); assert.match(t, /Voice agent call recorded \(Simulated\)/); assert.match(t, /not a payer decision/);
  await p.getByRole('link', { name: /^What Anthem asked/ }).click(); await p.waitForTimeout(300); assert.match(await txt(p), /Payer calls[\s\S]*Reviewer slots are Tuesdays and Thursdays/);
  await p.screenshot({ path: `${SHOTS}/voice-case-1440.png`, fullPage: true });
  assert.deepEq(p.errs, [], p.errs.join('|')); await p.ctx.close();
});

await T.test('screen: running the call and then closing it saves nothing; the administrator has the button disabled with the reason', async () => {
  await reset('canvas');
  const p = await open('jperez'); await p.goto(BASE + '/#/DenialCase?id=R-0408'); await p.waitForSelector('#d-call');
  await p.click('#d-call'); const dlg = p.getByRole('dialog'); await dlg.locator('#d-run').click(); await p.waitForSelector('#d-script li:nth-child(4)', { timeout: 6000 });
  await p.keyboard.press('Escape'); await p.waitForTimeout(400); assert.ok(!(await dispute('R-0408')).calls, 'a closed dialog saves nothing'); await p.ctx.close();
  const a = await open('dowens'); await a.goto(BASE + '/#/DenialCase?id=R-0408'); await a.waitForSelector('.d-hd');
  const b = a.getByRole('button', { name: /Call payer · voice agent/ }); assert.ok(await b.isDisabled()); assert.match(await b.getAttribute('title'), /Needs clinician/);
  assert.ok(!(await a.getByRole('link', { name: /Open in Lauris/ }).count()), 'the administrator has no Lauris link (no ext.use)');
  assert.deepEq(a.errs, [], a.errs.join('|')); await a.ctx.close();
});

await browser.close();
await T.done();
