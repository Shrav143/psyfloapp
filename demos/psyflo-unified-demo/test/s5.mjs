// Scenario S5 · payer decision, end to end (review/06 b, S5; prompt Part 14.2): D.W. R-0402 partial -> Denial Intelligence -> peer-to-peer ->
//   outcome (130 units) -> back to the authorization (stage Active, units reconciled, a human "Enter units in Lauris" task, dispute closed,
//   queues and Analytics updated); then K.T. (information request answered through the mock Availity page), T.N. (peer-to-peer approved at
//   150: the 65 of 65 kept as history) and E.C. (appeal: the guardian signs, staff press Send). Units reach the mock Lauris ONLY when a person
//   types them there and the page bridge reports it. Runs from demo.scenario s5, the fixture payer-decision and a fresh canvas reset.
import { suite, assert, waitText, api, tryApi, state, reset, playwright, login, BASE, LAURIS, MODES, start, flow, openAs, noErrors, mainText, rootText, waitState, shot, lsnap, lcons, req, cli, evs, scoreRows, pilotDom, same, sleep, session, errors } from './lib/scenario.mjs';
import * as V from '../web/js/shared/analytics/view.js';
import * as C from '../web/js/shared/analytics/common.js';

const T = suite('s5');
const { chromium } = playwright();
const b = await chromium.launch();
const ledgers = {};
const disp = (s, r) => s.disputes.find(d => d.request === r);
const payerRows = (s, who) => { const a = (s.staff || []).find(x => x.id === who); return V.sectionView(s, { ...a, designations: [] }, C.PROV.CASE, 'payer', {}); };
const unitsPanel = (s, who) => Object.fromEntries(payerRows(s, who).panels.find(p => p.id === 'pay.units').rows.map(r => [r.label, r.v]));
const queueRows = p => p.$$eval('.ui-qt__row', rs => rs.map(r => ({ id: r.dataset.rowId, text: r.innerText.replace(/\s+/g, ' ') })));
const guardianPage = async (client, route) => {
  const j = await (await fetch(BASE + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portalClient: client, presenter: true }) })).json();
  const c = await b.newContext({ viewport: { width: 390, height: 844 } }); await c.addInitScript(({ token, actor }) => { try { localStorage.setItem('psyflo_session', JSON.stringify({ token, actor })); localStorage.setItem('psyflo_dock', 'open'); } catch { } }, { token: j.token, actor: j.actor });
  const p = await c.newPage(); p.errs = errors(p); p.ctx = c; p.token = j.token; await p.goto(`${BASE}/#/${route}`); await p.waitForSelector('#root main', { timeout: 8000 }); await p.waitForTimeout(300); return p;
};
// a person types the units the payer gave into the Lauris Authorization Information tab and presses Save Authorization (the page bridge reports it)
async function enterUnitsInLauris(lp, no, units, end) {
  await lp.goto(`${LAURIS}/login?as=jperez&next=${encodeURIComponent(`/consumers/${no}?tab=auth`)}`); await lp.waitForSelector('#authorization-form');
  const payer = await lp.locator('#au-payer').inputValue(); if (!payer) await lp.selectOption('#au-payer', { index: 1 });
  await lp.fill('#au-units', String(units)); await lp.fill('#au-end', end); await lp.click('#save-authorization'); await lp.waitForURL(/authorization=\d+/); await lp.waitForTimeout(1500);
}

async function run(mode) {
  const F = flow(T, `S5[${mode}]`); const L = {}; const pages = [];
  try {
    await start(mode, { scenario: 's5', fixture: 'payer-decision', preset: 'canvas' });
    const desk = await openAs(b, 'jperez'); pages.push(desk);
    await F.step('first state: four open cases (D.W. partial 110 of 150, K.T. information request, T.N. peer-to-peer booked, E.C. denied); no Lauris task; Lauris holds D.W. and T.N. as seeded; the queue and Analytics are the baseline', async () => {
      const s = await state('jperez'), l = await lsnap();
      assert.deepEq(s.disputes.map(d => d.request).sort(), ['R-0384', 'R-0388', 'R-0402', 'R-0408']); assert.ok(s.disputes.every(d => !d.closed));
      assert.eq(req(s, 'R-0402').stage, 'partial_decide'); assert.eq(req(s, 'R-0402').units_offered, 110); assert.eq(req(s, 'R-0408').stage, 'info_requested'); assert.eq(req(s, 'R-0388').stage, 'peer_to_peer_booked'); assert.eq(req(s, 'R-0384').stage, 'denied');
      assert.eq(s.lauris_tasks.length, 0); assert.eq(l.today, s.today);
      L.s0 = s; L.l0 = l; L.u0 = unitsPanel(await state('dowens'), 'dowens'); L.sc0 = scoreRows(await state('dowens'), 'dowens'); L.stages0 = Object.fromEntries(['R-0402', 'R-0408', 'R-0388', 'R-0384'].map(r => [r, req(s, r).stage]));
      L.first = { stages: L.stages0, open: s.disputes.filter(d => !d.closed).length, tasks: 0, dwUnits: cli(s, 'DW').authorization.units, tnUnits: cli(s, 'TN').authorization.units, lDW: (lcons(l, 4102).auth || {}).units, lTN: (lcons(l, 3402).auth || {}).units, unresolved: L.sc0.unresolved.headline };
    });
    await F.step('first state (soft): before a decision is recorded the offered 110 units are not already in the tracker and in Lauris (an offer by phone is not an award)', async () => {
      const dw = cli(L.s0, 'DW').authorization, l = lcons(L.l0, 4102).auth;
      assert.ok(!(dw.units === 110 && /partial|offered/.test(dw.note || '') && l && l.units === 110), `D.W. already shows ${dw.units} units in Psyflo ("${dw.note}") and ${l && l.units} in the mock Lauris while R-0402 is still "Partial: decide" and the offer is not accepted`);
    }, { soft: true, once: true });

    // ---------------------------------------------------------------- D.W.
    await F.step('1 D.W.: the Authorizations queue row says Partial: decide and opens the case; "Open in Denial Intelligence" lands on the same case in the queue of four', async () => {
      await desk.goto(BASE + '/#/Authorizations'); await desk.waitForSelector('.ui-qt__row'); await desk.waitForTimeout(400);
      const row = (await queueRows(desk)).find(r => r.id === 'R-0402'); assert.ok(row && /Partial: decide/.test(row.text), 'queue: ' + (row && row.text));
      await desk.goto(BASE + '/#/Authorization?id=R-0402'); await desk.waitForTimeout(1000);
      await desk.getByRole('link', { name: /^Open in Denial Intelligence/ }).first().click(); await desk.waitForSelector('.d-tabs');
      assert.match(await rootText(desk), /D\.W\. · Partial approval/); assert.match(await desk.evaluate(() => location.hash), /DenialCase\?id=R-0402/);
      assert.eq(disp(await state('jperez'), 'R-0402').status, 'decide', 'the dispute already exists: nothing is created by looking');
      const dq = await (async () => { await desk.goto(BASE + '/#/DenialIntelligence'); await desk.waitForSelector('.ui-qt__row'); return queueRows(desk); })(); assert.eq(dq.length, 4, 'four open cases'); assert.ok(dq.some(r => r.id === 'R-0402' || /R-0402/.test(r.text)));
    });
    await F.step('2 evidence and options: dated sourced evidence, "Evidence missing — verify …" for what is not stored, only valid options, unverified paths labelled', async () => {
      await desk.goto(BASE + '/#/DenialCase?id=R-0402&section=evidence'); await desk.waitForSelector('.d-tabs');
      let t = await rootText(desk); assert.match(t, /Evidence missing — verify previous treatment outcome/); assert.match(t, /Physical aggression toward a peer/);
      await desk.getByRole('link', { name: /^Options/ }).click(); t = await rootText(desk);
      assert.match(t, /Accept decision/); assert.match(t, /Prepare peer-to-peer/); assert.match(t, /Payer rule not verified/); assert.match(t, /Not available here \(2\)/);
    });
    await F.step('3 choose peer-to-peer: stage peer_to_peer_requested; the page says it is NOT sent to the payer; a next task appears in My Work; owner and deadline stay visible', async () => {
      await desk.getByRole('button', { name: 'Open' }).nth(1).click(); await desk.waitForSelector('#d-h-p2p');
      await desk.getByRole('button', { name: /Ask Sentara for a peer-to-peer/ }).click(); await desk.getByRole('dialog').getByRole('button', { name: 'Log the request' }).click();
      const s = await waitState(x => req(x, 'R-0402').stage === 'peer_to_peer_requested', { what: 'peer_to_peer_requested' });
      assert.eq(req(s, 'R-0402').decision.door, 'p2p'); assert.eq(req(s, 'R-0402').decision.by, 'jperez'); assert.ok(s.events.some(e => e.record === 'R-0402' && /peer-to-peer/i.test(e.what) && e.who === 'jperez'));
      assert.ok(!s.events.filter(e => e.record === 'R-0402').slice(L.s0.events.filter(e => e.record === 'R-0402').length).some(e => /sent to (Sentara|the payer)|faxed/i.test(e.what)), 'logging a request is not sending anything');
      const mw = await openAs(b, 'jperez'); pages.push(mw); await mw.goto(BASE + '/#/MyWork'); await mw.waitForTimeout(1200); const sa = mw.getByRole('button', { name: /Show all/ }); if (await sa.count()) await sa.first().click(); await mw.waitForTimeout(300); assert.match(await mainText(mw), /Peer-to-peer requested · D\.W\./, 'My Work carries the next step (enter the call date)');
      assert.match(await rootText(desk), /nothing is sent/i, 'the screen says nothing is sent to the payer (a person asks the payer by phone; Psyflo logs it)');
    });
    await F.step('4 brief and schedule: "Draft from records" prints Evidence missing items and Simulated; Mark reviewed; Set the call stores p2p_at (stage booked)', async () => {
      await desk.getByRole('button', { name: 'Draft from records' }).click(); await desk.waitForTimeout(700);
      const t = await rootText(desk); assert.match(t, /Evidence missing — verify the risk of a more restrictive setting/); assert.match(t, /Simulated/);
      await desk.getByRole('button', { name: 'Mark reviewed' }).click(); await desk.waitForTimeout(400);
      await desk.getByRole('button', { name: 'Set the call' }).click(); await desk.fill('#d-when', '2026-11-19T14:00'); await desk.getByRole('dialog').getByRole('button', { name: 'Save the call' }).click();
      const s = await waitState(x => !!req(x, 'R-0402').p2p_at, { what: 'p2p_at' }); assert.match(req(s, 'R-0402').p2p_at, /^2026-11-19/); assert.ok(s.reminders.some(r => /D\.W|R-0402|peer/i.test(JSON.stringify(r))) || s.events.some(e => e.record === 'R-0402' && /call/i.test(e.what)), 'a reminder or timeline event for the call');
    });
    await F.step('5 log the outcome (130 units): a decision needs its document (the dialog stays open and says so); then Active, 130 awarded, dispute resolved and closed, an "Enter units in Lauris" task opens; Psyflo writes NO units into Lauris', async () => {
      await desk.getByRole('button', { name: 'Log the outcome' }).click(); const dlg = desk.getByRole('dialog');
      await dlg.getByLabel('Approved in part').check(); await desk.fill('#d-ocu', '130'); await dlg.getByRole('button', { name: 'Record the outcome' }).click(); await desk.waitForTimeout(500);
      assert.ok(await desk.getByRole('dialog').count(), 'no document reference: the dialog stays open'); assert.eq(req(await state('jperez'), 'R-0402').stage, 'peer_to_peer_booked', 'nothing recorded without the document');
      await desk.fill('#d-ocd', 'Sentara decision letter 2026-11-19'); await dlg.getByRole('button', { name: 'Record the outcome' }).click();
      const s = await waitState(x => req(x, 'R-0402').stage === 'active', { what: 'R-0402 active' }); const r = req(s, 'R-0402');
      assert.eq(r.units_awarded, 130); assert.eq(cli(s, 'DW').authorization.units, 130, 'the tracker is reconciled to 130'); assert.ok(/Sentara decision letter/.test(JSON.stringify(r.decision_log)), 'the document is kept');
      const d = disp(s, 'R-0402'); assert.ok(d.closed && ['partover', 'resolved', 'overturned'].includes(d.status), 'dispute closed: ' + d.status);
      const t = s.lauris_tasks.find(x => x.client === 'DW' && x.status === 'open'); assert.ok(t && t.units === 130, 'the human task: ' + JSON.stringify(t));
      const l = await lsnap(); assert.eq(lcons(l, 4102).auth.units, 110, 'Psyflo never writes units into Lauris: the mock still shows what a person entered before'); assert.eq(lcons(l, 4102).auth.available, 110);
      await waitText(desk, /Partly overturned/); assert.match(await rootText(desk), /130 of 150 units approved/); await shot(desk, `s5-${mode}-5-dw-done`);
    });
    await F.step('6 back to the authorization: R-0402 is Active with 130 units and the "Enter units in Lauris" card (with the Lauris link); the queue says Active; Denial Intelligence lists three open cases', async () => {
      await desk.getByRole('link', { name: 'Open authorization' }).click(); await desk.waitForTimeout(1200);
      const t = await mainText(desk); assert.match(await desk.evaluate(() => location.hash), /#\/Authorization\?id=R-0402|#\/Authorizations/); assert.match(t, /Active/); assert.match(t, /130/); assert.match(t, /Enter units in Lauris/);
      assert.ok(await desk.getByRole('link', { name: /Open Lauris/ }).count() >= 1, 'a link to Lauris for the person');
      await desk.goto(BASE + '/#/Authorizations'); await desk.waitForSelector('.ui-qt__row'); await desk.waitForTimeout(400); const row = (await queueRows(desk)).find(r => r.id === 'R-0402'); assert.ok(/Active/.test(row.text), 'queue row: ' + row.text);
      await desk.goto(BASE + '/#/DenialIntelligence'); await desk.waitForSelector('.ui-qt__row'); await desk.waitForTimeout(400); const dq = await queueRows(desk); assert.eq(dq.length, 3, 'three open cases remain'); assert.ok(!dq.some(r => /R-0402/.test(r.text)), 'D.W. left the open queue');
    });
    await F.step('7 a person enters the units in Lauris (Authorization Information) and the page bridge reports it: the task closes, the mock shows 130, the two stores agree', async () => {
      const lp = await openAs(b, 'jperez', { width: 1440, height: 1000 }); pages.push(lp);
      assert.eq((await state('jperez')).lauris_tasks.find(x => x.client === 'DW').status, 'open');
      await enterUnitsInLauris(lp, 4102, 130, '2027-01-30');
      const s = await waitState(x => x.lauris_tasks.find(t => t.client === 'DW').status === 'done', { what: 'the task to close from the observed event' });
      const l = await lsnap(); assert.eq(lcons(l, 4102).auth.units, 130); assert.eq(cli(s, 'DW').authorization.units, lcons(l, 4102).auth.units, 'tracker = Lauris');
      assert.ok(s.events.some(e => e.record === 'R-0402' && /Units seen in Lauris/.test(e.what) && e.actor_kind === 'bridge'), 'the closure is an observed event');
      await desk.goto(BASE + '/#/Authorization?id=R-0402&section=units'); await desk.waitForTimeout(1000); assert.ok(!/Enter units in Lauris/.test(await mainText(desk)) || /done|Closed|entered/i.test(await mainText(desk)), 'the card no longer asks for the entry');
    });
    await F.step('8 queues and Analytics (admin): unresolved requests -1 (screen = selector), units approved and offers waiting move; the admin payload and the page carry no clinical text', async () => {
      const sa = await state('dowens'); const sc = scoreRows(sa, 'dowens'); assert.eq(sc.unresolved.num, L.sc0.unresolved.num - 1, 'one fewer unresolved request'); const u = unitsPanel(sa, 'dowens');
      assert.eq(u['Offers awaiting a reply'], L.u0['Offers awaiting a reply'] - 1, 'the offer is no longer waiting'); assert.ok(u['Units approved'] > L.u0['Units approved'], `units approved moved: ${L.u0['Units approved']} -> ${u['Units approved']}`);
      const ad = await openAs(b, 'dowens'); pages.push(ad); await ad.goto(BASE + '/#/Analytics?section=payer'); await ad.waitForSelector('.a-tile__b'); await ad.waitForTimeout(500);
      assert.eq((await pilotDom(ad)).unresolved.headline, sc.unresolved.headline, 'screen = selector'); const pt = await mainText(ad); assert.match(pt, /Units approved/);
      assert.ok(!/Sentara decision letter|Physical aggression|Piedmont/.test(await ad.content()), 'no clinical text for admin');
      await shot(ad, `s5-${mode}-8-analytics`);
    });

    // ---------------------------------------------------------------- K.T.
    await F.step('9 K.T. (R-0408, Availity): "Draft from records", a placeholder blocks Mark reviewed, an edit clears it; Open Availity and send opens the mock portal; the case closes ONLY when the portal page confirms; no "faxed" wording', async () => {
      await desk.goto(BASE + '/#/DenialCase?id=R-0408&section=action&action=info'); await desk.waitForSelector('#d-h-info');
      assert.match(await rootText(desk), /2 h left of 24/); await desk.getByRole('button', { name: 'Draft from records' }).click(); await desk.waitForTimeout(700);
      assert.ok(await desk.getByRole('button', { name: 'Mark reviewed' }).isDisabled(), 'review is blocked while a placeholder remains');
      await desk.locator('.d-secdoc').nth(2).getByRole('button', { name: 'Edit' }).click(); const ta = desk.locator('.d-edit textarea'); await ta.fill((await ta.inputValue()).replace(/\[Evidence missing[^\]]*\]/, 'The clinician states the supports do not include de-escalation in unstructured periods.'));
      await desk.getByRole('button', { name: 'Save section' }).click(); await desk.waitForTimeout(600); await desk.getByRole('button', { name: 'Mark reviewed' }).click(); await desk.waitForTimeout(400);
      assert.eq(req(await state('jperez'), 'R-0408').stage, 'info_requested', 'nothing is sent before the portal confirms');
      const [popup] = await Promise.all([desk.context().waitForEvent('page'), (async () => { await desk.getByRole('button', { name: /Open Availity and send/ }).click(); await desk.getByRole('dialog').getByRole('button', { name: /Open Availity/ }).click(); })()]);
      await popup.waitForLoadState(); await popup.waitForSelector('#portal-form'); await popup.click('button[type=submit]'); await popup.waitForSelector('#portal-confirmation'); await desk.bringToFront();
      const s = await waitState(x => req(x, 'R-0408').stage === 'submitted', { what: 'R-0408 submitted after the portal page confirmed' }); const d = disp(s, 'R-0408'); assert.ok(d.closed && d.status === 'resolved');
      assert.ok(!s.events.some(e => e.record === 'R-0408' && /faxed|Sfax/i.test(e.what)), 'an Availity payer is never "faxed through Sfax"'); await popup.close();
    });

    // ---------------------------------------------------------------- T.N.
    await F.step('10 T.N. (R-0388): the peer-to-peer call outcome "approved" at 150: overturned, Active with 150 units, the old 65 of 65 kept as history; the task asks a person for the units in Lauris', async () => {
      await desk.goto(BASE + '/#/DenialCase?id=R-0388&section=action&action=p2p'); await desk.waitForSelector('#d-h-p2p');
      await desk.getByRole('button', { name: 'Log the outcome' }).click(); await desk.waitForTimeout(500); const dlg = desk.getByRole('dialog').last(); try { await dlg.locator('input[type=radio][value=approved]').check({ timeout: 5000 }); } catch (e) { await shot(desk, `s5-${mode}-10-debug`); throw new Error('T.N. outcome dialog: ' + (await desk.locator('[role=dialog]').allInnerTexts()).join(' // ').replace(/\s+/g, ' ').slice(0, 300)); }
      if (await desk.locator('#d-ocu').count()) await desk.fill('#d-ocu', '150'); await desk.fill('#d-ocd', 'Sentara letter Dec 9'); await dlg.getByRole('button', { name: 'Record the outcome' }).click();
      const s = await waitState(x => req(x, 'R-0388').stage === 'active', { what: 'R-0388 active' }); const r = req(s, 'R-0388');
      assert.eq(r.units_awarded, 150); assert.eq(cli(s, 'TN').authorization.units, 150); assert.eq(cli(s, 'TN').authorization_history.at(-1).units, 65, 'the 65 of 65 is history, not overwritten'); assert.ok(disp(s, 'R-0388').closed);
      assert.eq(lcons(await lsnap(), 3402).auth.units, 65, 'Lauris still shows the old authorization until a person enters the new one'); assert.ok(s.lauris_tasks.some(t => t.client === 'TN' && t.units === 150 && t.status === 'open'));
      const lp = await openAs(b, 'jperez', { width: 1440, height: 1000 }); pages.push(lp); await enterUnitsInLauris(lp, 3402, 150, '2027-01-30');
      const s2 = await waitState(x => x.lauris_tasks.find(t => t.client === 'TN').status === 'done', { what: 'T.N. task closed' }); assert.eq(lcons(await lsnap(), 3402).auth.units, 150); assert.eq(cli(s2, 'TN').authorization.units, 150);
    });

    // ---------------------------------------------------------------- E.C.
    await F.step('11 E.C. (R-0384): the clinician drafts and reviews the appeal letter; the guardian signs on the phone (the signer is the guardian behind the link); staff press Send; "faxed" appears only after Send, the reference comes from the stub', async () => {
      await desk.goto(BASE + '/#/DenialCase?id=R-0384&section=action&action=appeal'); await desk.waitForSelector('.d-tabs');
      assert.match(await rootText(desk), /Illustrative sample/);
      await desk.getByRole('button', { name: 'Draft again from records' }).click(); await desk.waitForTimeout(800);
      for (let i = 0; i < 6 && (await desk.getByRole('button', { name: 'Mark reviewed' }).isDisabled().catch(() => false)); i++) { const ed = desk.locator('.d-secdoc').filter({ hasText: /Evidence missing/ }).first().getByRole('button', { name: 'Edit' }); if (!(await ed.count())) break; await ed.click(); const ta = desk.locator('.d-edit textarea'); await ta.fill((await ta.inputValue()).replace(/\[Evidence missing[^\]]*\]/g, 'The clinician adds the dated record before this goes out.')); await desk.getByRole('button', { name: 'Save section' }).click(); await desk.waitForTimeout(500); }
      await desk.getByRole('button', { name: 'Mark reviewed' }).click(); await desk.waitForTimeout(600);
      let s = await state('jperez'); assert.eq(s.appeal_drafts['R-0384'].status, 'ready', 'published to the family portal after review'); assert.ok(!/4 office referrals this month/.test(s.appeal_drafts['R-0384'].en), 'the seeded sample text is gone');
      const g = await guardianPage('EC', 'AppealLetter'); pages.push(g);
      assert.eq(await g.locator('.fp-steps').getAttribute('data-appeal-status'), 'ready'); const gt = await rootText(g); assert.ok(!/Dispute|evidence|options|Sentara/i.test(gt), 'the guardian sees the letter, never the case');
      await g.locator('[data-sig-method="type"]').click(); await g.fill('input[id="sig-name"]', 'Elena Carter'); await g.locator('a[href="#sign"]').click(); await waitState(x => (req(x, 'R-0384').appeal || {}).status === 'signed', { what: 'appeal signed' });
      s = await state('jperez'); assert.eq(req(s, 'R-0384').stage, 'denied', 'signing is not sending'); assert.ok(!s.events.some(e => e.record === 'R-0384' && /faxed|Sfax|sent to Anthem/i.test(e.what) && /appeal/i.test(e.what)), 'no send language before Send'); assert.ok(req(s, 'R-0384').appeal.signer !== 'Elena Carter', 'the signer is the guardian behind the link, never the typed text');
      await desk.goto(BASE + '/#/DenialCase?id=R-0384&section=action&action=appeal'); await desk.waitForSelector('.d-tabs');
      await desk.getByRole('button', { name: /Mark ready for upload/ }).first().click(); await desk.getByRole('dialog').getByRole('button', { name: 'Mark ready' }).click();
      s = await waitState(x => (req(x, 'R-0384').appeal || {}).status === 'ready_to_upload', { ms: 15000, what: 'the person\'s Mark ready' }); const a = req(s, 'R-0384').appeal;
      const e = s.events.filter(x => x.record === 'R-0384' && /Appeal letter ready for the clinician to upload in Availity/.test(x.what)); assert.ok(e.length === 1 && e[0].sim === true && e[0].who === 'jperez', 'the recorded action is a person\'s and says simulated: ' + JSON.stringify(e.map(x => [x.who, x.sim, x.what])));
      assert.ok(a.ready_by === 'jperez' && !a.sent_by && !a.sent_at, 'the person who pressed it is recorded, and nothing is sent yet');
      L.ec = { stage: req(s, 'R-0384').stage, status: a.status, ref: a.ref };
    });
    await F.step('11b E.C. appeal on an Availity payer: "Mark ready for upload" is a person\'s note that a upload is next, NOT a send: the stage stays out of "Appeal sent" and the status out of "sent" until the portal page confirms (the way K.T. does)', async () => {
      assert.ok(L.ec.stage === 'denied' && L.ec.status === 'ready_to_upload' && !L.ec.ref, `after "Mark ready for upload" (no portal upload observed) Psyflo records stage "${L.ec.stage}", appeal status "${L.ec.status}", reference "${L.ec.ref}": ready to upload, not sent, no reference`);
    });
    await F.step('12 the leadership readout agrees with the stores: the four requests show Active, Submitted, Active and the appeal recorded state in the queue; one open Denial Intelligence case remains (the appeal waits for the payer); Analytics = selectors', async () => {
      await desk.goto(BASE + '/#/Authorizations'); await desk.waitForSelector('.ui-qt__row'); await desk.waitForTimeout(400); const rows = await queueRows(desk); const st = id => (rows.find(r => r.id === id) || {}).text || '';
      assert.ok(/Active/.test(st('R-0402')) && /Submitted/.test(st('R-0408')) && /Active/.test(st('R-0388')) && new RegExp(L.ec.stage === 'appeal_sent' ? 'Appeal sent' : 'Denied').test(st('R-0384')), rows.filter(r => /R-0402|R-0408|R-0388|R-0384/.test(r.id)).map(r => r.text).join(' || '));
      const s = await state('jperez'); const open = s.disputes.filter(d => !d.closed); assert.eq(open.length, 1); assert.eq(open[0].request, 'R-0384');
      const sa = await state('dowens'); const sc = scoreRows(sa, 'dowens'); const ad = await openAs(b, 'dowens'); pages.push(ad); await ad.goto(BASE + '/#/Analytics'); await ad.waitForSelector('.a-tile__b'); const dom = await pilotDom(ad);
      for (const k of ['notes', 'receipts', 'unresolved']) assert.eq(dom[k].headline, sc[k].headline, 'tile ' + k + ': screen = selector');
      L.last = { stages: Object.fromEntries(['R-0402', 'R-0408', 'R-0388', 'R-0384'].map(r => [r, req(s, r).stage])), open: open.length, tasks: s.lauris_tasks.map(t => t.client + ':' + t.status).sort(), dwUnits: cli(s, 'DW').authorization.units, tnUnits: cli(s, 'TN').authorization.units, lDW: lcons(await lsnap(), 4102).auth.units, lTN: lcons(await lsnap(), 3402).auth.units, unresolved: sc.unresolved.headline, disputes: s.disputes.map(d => d.request + ':' + d.status).sort() };
    });
    await F.step('no console errors on the desk, the portal, the guardian page, Lauris or Analytics', async () => { noErrors(pages, /LANG_OFF|Parent(Schedule|Progress)/); });
  } finally { for (const p of pages) await p.ctx.close().catch(() => { }); }
  ledgers[mode] = { first: L.first, last: L.last };
}

for (const m of MODES) await run(m);
if (MODES.length < 2) T.skip('S5 parity: first and last state across start modes', 'MODES was narrowed to one start mode');
else await T.test('S5 parity: the first and the last state are the same whether it started from demo.scenario, the fixture payer-decision or a fresh canvas reset', async () => {
  const ms = Object.keys(ledgers).filter(m => ledgers[m].last); assert.ok(ms.length >= 2, 'at least two completed runs to compare: ' + ms);
  for (const m of ms.slice(1)) { same(ledgers[ms[0]].first, ledgers[m].first, `first state (${ms[0]} vs ${m})`); same(ledgers[ms[0]].last, ledgers[m].last, `last state (${ms[0]} vs ${m})`); }
});
await b.close();
await T.done();
