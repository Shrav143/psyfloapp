// Scenario S3 · initial authorization (R-0416, T.W.), end to end (review/06 b, S3; prompt Part 14.2):
//   ISP (panel, 3 goals) -> initial request draft in the panel (7 statements, each with its source; criterion 3 and trauma-informed care left blank)
//   -> edit criterion 1 -> Approve and fill -> a person presses Process Form (Pending clinical approval) -> the approver approves in the platform
//   -> a person presses Get Signature in Lauris (the signer is read from the Lauris event) -> a person presses Send (simulated Sfax stub)
//   -> receipt, decision clock, queue row, timeline, Analytics "Sends with receipts". Each step is asserted in the Psyflo store, the mock Lauris
//   store, the Authorizations queue and the case. Runs from demo.scenario s3 (canvas minus its tail), the fixture tw-isp-ready and a fresh reset.
import { suite, assert, waitText, api, tryApi, state, reset, playwright, BASE, LAURIS, MODES, start, flow, openAs, noErrors, panel, panelFrame, formValues, mainText, rootText, waitState, shot, lsnap, lcons, lsess, req, cli, evs, scoreRows, pilotDom, same, sleep, session } from './lib/scenario.mjs';
import { prepTW } from './lib/prep.mjs';
import { normState } from './lib/norm.mjs';

const T = suite('s3');
const { chromium } = playwright();
const b = await chromium.launch();
const ledgers = {};
const R = 'R-0416';
const queueRow = async (p, id = R) => { await p.goto(BASE + '/#/Authorizations'); await p.waitForSelector('.ui-qt__row'); await p.waitForTimeout(500); const row = p.locator(`.ui-qt__row[data-row-id="${id}"]`); return (await row.count()) ? (await row.first().innerText()).replace(/\s+/g, ' ') : null; };
const twLedger = (s, l, no) => ({ stage: req(s, R).stage, type: req(s, R).type, payer: req(s, R).payer, units: req(s, R).units_requested, goals: cli(s, 'TW').goals.length, twStage: cli(s, 'TW').stage, lauris: ((lcons(l, no) || {}).active_file || []).map(x => x.form).filter((f, i, a) => a.indexOf(f) === i).sort() });

async function run(mode) {
  const F = flow(T, `S3[${mode}]`); const L = {}; const pages = []; let no = 4492;
  try {
    await start(mode, { scenario: 's3', fixture: 'tw-isp-ready', preset: 'live', fresh: async () => { ({ no } = await prepTW()); } });
    const desk = await openAs(b, 'jperez', { presenter: false }); pages.push(desk);
    const lp = await openAs(b, 'jperez', { width: 1440, height: 1000 }); pages.push(lp);
    // ---------------------------------------------------------------- 1 ISP (the fresh run does the ISP by clicking; the checkpoints already hold it)
    if (mode === 'fresh') {
      await F.step('0 intake (CNA) in Lauris + panel: the boxes are typed from the screening ("copied from screening"); a person presses Process Form', async () => {
        await lp.goto(`${LAURIS}/login?as=jperez&next=${encodeURIComponent(`/consumers/${no}/session/cna`)}`);
        await panel(lp).getByText('copied from screening').first().waitFor(); await panel(lp).getByText(/^Fill \d+ boxes/).click(); await lp.waitForTimeout(4000);
        await lp.getByRole('button', { name: 'Process Form' }).click(); await lp.waitForURL(/processed=/);
        assert.ok(lcons(await lsnap(), no).active_file.some(x => x.form === 'cna'), 'the CNA is in the Lauris Active File');
      });
      await F.step('1 ISP in Lauris + panel: "Fill the 3 goals" types them; a person presses Process Form; Psyflo drafts the request R-0416 (Draft ready) and holds 3 goals', async () => {
        assert.ok(!req(await state('jperez'), R), 'no request exists before the ISP is processed');
        await lp.goto(`${LAURIS}/login?as=jperez&next=${encodeURIComponent(`/consumers/${no}/session/isp`)}`);
        await panel(lp).getByText('Fill the 3 goals').click(); await lp.waitForTimeout(9000);
        await lp.getByRole('button', { name: 'Process Form' }).click(); await lp.waitForURL(/processed=/);
        const s = await waitState(x => req(x, R) && req(x, R).stage === 'draft_ready', { what: 'R-0416 draft_ready' }); assert.eq(cli(s, 'TW').goals.length, 3);
        assert.ok(lcons(await lsnap(), no).active_file.some(x => x.form === 'isp'), 'the ISP is in the Lauris Active File');
      });
    }
    await F.step('first state: R-0416 is a Draft ready initial request (Humana, fax, 150 units), T.W. has 3 goals and a Harvest #, the Authorizations queue lists it as Draft ready', async () => {
      const s = await state('jperez'), l = await lsnap(); no = (cli(s, 'TW').lauris_no) || no;
      assert.eq(req(s, R).stage, 'draft_ready'); assert.eq(req(s, R).type, 'initial'); assert.eq(req(s, R).payer, 'humana'); assert.eq(req(s, R).channel || 'fax', 'fax'); assert.eq(req(s, R).units_requested, 150); assert.eq(cli(s, 'TW').goals.length, 3);
      assert.ok(lcons(l, no), 'T.W. is in the mock Lauris as #' + no);
      const row = await queueRow(desk); assert.ok(row && /Draft ready/.test(row), 'queue row: ' + row);
      L.s0 = s; L.l0 = l; L.first = twLedger(s, l, no); L.rec0 = scoreRows(await state('dowens'), 'dowens').receipts;
      L.ev0 = s.events.filter(e => e.record === R).length;
    });

    // ---------------------------------------------------------------- 2-4 panel: statements, edit, fill
    await F.step('2 the SRA panel: 7 statements, every one with its sources (referral, screening call, school portal, ISP); criterion 3 and trauma-informed care are left for the clinician, never drafted', async () => {
      await lp.goto(`${LAURIS}/login?as=jperez&next=${encodeURIComponent(`/consumers/${no}/session/sra-initial`)}`); await lp.waitForTimeout(2000);
      const home = (await panelFrame(lp).locator('#panel').innerText()).replace(/\s+/g, ' ');
      assert.match(home, /Draft ready · T\.W\./); assert.match(home, /Tracked as R-0416/); assert.match(home, /Left for you · 2/); assert.match(home, /Checks\s*7 of 7 pass/);
      await panel(lp).getByText(/Review 7 statements/).click(); await panel(lp).locator('.ui-dr__item').first().waitFor();
      assert.eq(await panel(lp).locator('.ui-dr__item').count(), 7);
      const items = await panelFrame(lp).evaluate(() => [...document.querySelectorAll('.ui-dr__item')].map(li => ({ label: li.querySelector('.ui-dr__il').textContent.trim(), sources: [...li.querySelectorAll('.ui-dr__src button, .ui-dr__src [data-ui-ev]')].map(x => x.textContent.trim()), missing: /Evidence missing/.test(li.innerText), text: li.querySelector('[data-col=psyflo]').innerText })));
      for (const i of items) assert.ok(i.sources.length > 0 || i.missing, `${i.label}: a statement has sources or says "Evidence missing"`);
      assert.ok(items.every(i => i.sources.length > 0), 'all seven statements carry sources: ' + JSON.stringify(items.map(i => [i.label, i.sources.length])));
      assert.ok(!items.some(i => /criterion 3|trauma/i.test(i.label)), 'criterion 3 and trauma-informed care are not drafted');
      const srcs = items.flatMap(i => i.sources); assert.ok(srcs.some(x => /Referral form/.test(x)) && srcs.some(x => /Screening call/.test(x)) && srcs.some(x => /ISP/.test(x)), 'sources: ' + srcs.slice(0, 8).join(' | '));
      L.items = items.length; await shot(lp, `s3-${mode}-2-panel`);
    });
    await F.step('3 edit criterion 1: the person\'s words replace the draft (Clinician edited, Restore previous appears); the draft is Psyflo\'s, nothing is in Lauris yet', async () => {
      const it = panel(lp).locator('.ui-dr__item', { hasText: 'criterion 1' }); if (!(await it.getByRole('button', { name: 'Edit' }).isVisible())) await it.locator('.ui-dr__ih').click(); await it.getByRole('button', { name: 'Edit' }).click();
      const ta = it.locator('textarea'); const old = await ta.inputValue(); assert.ok(old.length > 20, 'the draft text is in the editor');
      await ta.fill(old + ' (clinician note: confirmed with the guardian on the call.)'); await it.getByRole('button', { name: 'Save wording' }).click(); await lp.waitForTimeout(800);
      assert.match(await it.getAttribute('class'), /--edited/, 'the statement is marked Clinician edited'); await it.locator('.ui-dr__ih').click(); await lp.waitForTimeout(300); assert.ok(await it.getByRole('button', { name: 'Restore previous' }).count() === 1, 'Restore previous appears after a save');
      assert.match(await it.innerText(), /clinician note: confirmed with the guardian/); assert.eq((await lsnap()).sessions.filter(x => x.no === no && x.form === 'sra-initial').length, L.l0.sessions.filter(x => x.no === no && x.form === 'sra-initial').length, 'no SRA session saved in Lauris');
      L.edited = true;
    });
    await F.step('4 Accept the statements with sources, Approve and fill: the boxes are typed yellow (not saved); criterion 3 and trauma-informed care stay blank; the version is recorded by Psyflo', async () => {
      await panel(lp).getByRole('button', { name: /Accept the \d+ with sources/ }).click(); await panel(lp).getByRole('button', { name: 'Approve and fill' }).click();
      await panel(lp).getByText(/boxes typed into the form/).first().waitFor({ timeout: 30000 });
      const v = await formValues(lp); assert.ok(!v['Section I · criterion 3 — recognise danger to self or others'], 'criterion 3 blank'); assert.ok(!v['Section III · trauma-informed care'], 'trauma-informed care blank');
      assert.match(v['Section I · criterion 1 — interpersonal relationships'], /confirmed with the guardian/, 'the clinician\'s edit is what is typed');
      assert.noMatch(Object.values(v).join(' '), /Harvest will coordinate/, 'no promise written for the clinician');
      const s = await state('jperez'); assert.ok(s.doc_versions.some(d => d.client === 'TW' || /sra/i.test(d.form || d.key || '')), 'a saved version / draft record exists in Psyflo'); assert.eq(req(s, R).stage, 'draft_ready', 'filling does not move the request');
      await shot(lp, `s3-${mode}-4-filled`);
    });

    await F.step('4b the drafted request dates start on or after the day the request is drafted (one demo clock, no seed date carried over)', async () => {
      const v = await formValues(lp); const dr = (v['Request dates / units / hours'] || '').match(/(\d\d)\/(\d\d)\/(\d{4})/); const today = (await state('jperez')).today;
      assert.ok(dr && `${dr[3]}-${dr[1]}-${dr[2]}` >= today, 'the drafted request starts before it is drafted (today ' + today + '): ' + (v['Request dates / units / hours'] || '').slice(0, 40));
    }, { soft: true });

    // ---------------------------------------------------------------- 5 Process Form
    let sess;
    await F.step('5 Process Form (a person): Pending clinical approval, Lauris session processed and in Forms to Approve, the queue says so, the timeline gains events', async () => {
      await lp.getByRole('button', { name: 'Process Form' }).click(); await lp.waitForURL(/processed=/); sess = (lp.url().match(/processed=(\d+)/) || [])[1];
      const s = await waitState(x => req(x, R).stage === 'needs_approval', { what: 'R-0416 Pending clinical approval' });
      const r = req(s, R); assert.eq(r.lauris_session, sess); assert.eq(r.lauris_consumer, no); assert.ok(!r.signed_at && !r.sent, 'not signed, not sent');
      assert.ok(s.events.filter(e => e.record === R).length > L.ev0, 'timeline +events'); assert.ok(s.events.some(e => e.record === R && e.actor_kind === 'bridge' && /Process Form pressed in Lauris/.test(e.what)), 'the stage change is from the observed event');
      const l = await lsnap(); assert.eq(lsess(l, sess).status, 'processed'); assert.ok(lcons(l, no).active_file.some(x => x.session === Number(sess) && x.form === 'sra-initial'), 'Active File +1');
      const ap = await (await fetch(LAURIS + '/approvals', { headers: { cookie: 'lauris_user=jperez' } })).text(); assert.match(ap, /Initial Service/); assert.match(ap, /T\.W\./);
      const row = await queueRow(desk); assert.ok(/Pending clinical approval/.test(row), 'queue: ' + row);
    });

    // ---------------------------------------------------------------- 6 approval
    await F.step('6 internal approval (platform): an undesignated supervisor cannot (button disabled with the reason, server 403); the designated clinician approves; Awaiting signature', async () => {
      const sup = await openAs(b, 'cdiaz'); pages.push(sup); await sup.goto(BASE + '/#/Authorization?id=' + R); await sup.waitForTimeout(1000);
      assert.ok(await sup.getByRole('button', { name: 'Approve', exact: true }).first().isDisabled(), 'Approve is disabled for an undesignated supervisor'); assert.match(await mainText(sup), /Needs designated approver/);
      assert.ok(!(await tryApi('request.approve', { id: R }, 'cdiaz')).ok, 'the server refuses too');
      await desk.goto(BASE + '/#/Authorization?id=' + R); await desk.waitForTimeout(1000); assert.match(await mainText(desk), /Pending clinical approval/);
      await desk.getByRole('button', { name: 'Approve', exact: true }).first().click(); await desk.getByRole('dialog').getByRole('button', { name: 'Approve', exact: true }).click();
      const s = await waitState(x => req(x, R).stage === 'awaiting_signature', { what: 'Awaiting signature' }); assert.eq(req(s, R).approved_by, 'jperez');
      await desk.getByRole('link', { name: /Open Forms to Approve/ }).first().waitFor({ timeout: 8000 }); assert.match(await mainText(desk), /Awaiting signature/);
      assert.ok(s.events.some(e => e.record === R && /approv/i.test(e.what) && e.who === 'jperez'), 'who approved is in the timeline');
      const row = await queueRow(desk); assert.ok(/Awaiting signature/.test(row), 'queue: ' + row);
    });

    // ---------------------------------------------------------------- 7 Get Signature (Lauris, a person)
    await F.step('7 Get Signature (a licensed person, in Lauris Forms to Approve): Signed; the signer on the record and the PDF is the Lauris user; Lauris marks the session signed', async () => {
      await panel(lp).getByText('Open Forms to Approve').click(); await lp.waitForURL(/approvals$/);
      await lp.locator('#approval-list tr', { hasText: 'Initial Service' }).filter({ hasText: 'T.W.' }).getByText('Preview').click(); await panel(lp).getByText('Before you sign').waitFor();
      await lp.getByRole('button', { name: 'Get Signature' }).click(); await lp.waitForURL(/signed=/); await panel(lp).getByText('Signed in Lauris.').waitFor({ timeout: 10000 });
      const s = await waitState(x => req(x, R).stage === 'signed', { what: 'signed' }); const r = req(s, R);
      assert.eq(r.signed_by, 'J. Perez, LPC', 'read from the Lauris event'); assert.eq(r.approved_by, 'jperez'); assert.ok(r.signed_pdf);
      const pdf = await fetch(BASE + r.signed_pdf, { headers: { 'X-Psyflo-Session': (await session('jperez')).token } }); assert.eq(pdf.status, 200); assert.eq(pdf.headers.get('content-type'), 'application/pdf');
      const txt = Buffer.from(await pdf.arrayBuffer()).toString('latin1'); assert.match(txt, /signed in Lauris by J\. Perez, LPC/); assert.noMatch(txt, /Jordan Perez/);
      const l = await lsnap(); assert.ok(['approved', 'signed'].includes(lsess(l, sess).status), 'Lauris session: ' + lsess(l, sess).status);
      const row = await queueRow(desk); assert.ok(/Signed/.test(row) && /ready to send/i.test(row), 'queue: ' + row);
      await shot(lp, `s3-${mode}-7-signed`);
    });

    // ---------------------------------------------------------------- 8 Send
    await F.step('8 Send (a person, in the platform): sending, then Submitted with the simulated Sfax receipt: a fax reference F-nnnn, a receipt, the decision clock "Day 0"; the actor is the person, events say simulated', async () => {
      const sender = await openAs(b, 'cdiaz'); pages.push(sender); await sender.goto(BASE + '/#/Authorization?id=' + R); await sender.waitForTimeout(1000);
      assert.ok((await sender.locator('.ui-maturity--simulated').count()) >= 1, 'the Sfax step wears the Simulated chip');
      await sender.getByRole('button', { name: 'Send by fax' }).first().click(); await sender.getByRole('dialog').getByRole('button', { name: 'Send by fax' }).click();
      await waitState(x => ['sending', 'submitted'].includes(req(x, R).stage), { what: 'sending' });
      const s = await waitState(x => req(x, R).stage === 'submitted', { ms: 15000, what: 'the Sfax stub to return its reference' }); const r = req(s, R);
      assert.match(r.fax_ref, /^F-\d+$/); assert.eq(r.sent_by, 'cdiaz'); assert.eq(r.approved_by, 'jperez', 'approver and sender are different people'); assert.ok(r.sent && r.decision_due > s.today, 'decision window from the rules table: ' + r.decision_due);
      assert.ok(r.delivery_receipt || r.receipt || (r.docs || []).length || s.files.some(f => f.request === R || /receipt/i.test(f.name || '')), 'a receipt is stored');
      const sent = s.events.filter(e => e.record === R && /Sfax/.test(e.what)); assert.ok(sent.length >= 2 && sent.every(e => e.sim === true && e.who === 'cdiaz' && /simulated/i.test(e.what)), JSON.stringify(sent.map(e => [e.who, e.sim])));
      assert.ok(!s.events.some(e => e.record === R && e.who === 'Sfax'), 'no actor called Sfax');
      const body = await mainText(sender); await sender.waitForTimeout(600); const t = await mainText(sender); assert.match(t, new RegExp(r.fax_ref)); assert.match(t, /Day 0/); assert.match(t, /Submitted/);
      const row = await queueRow(desk); assert.ok(/Submitted/.test(row), 'queue: ' + row);
      L.r = r; await shot(sender, `s3-${mode}-8-submitted`, true);
    });
    await F.step('9 the timeline and Analytics follow: R-0416 has the full chain of events; the pilot scorecard "Sends with receipts" moves +1 over +1 on the screen and in the selector', async () => {
      await desk.goto(BASE + '/#/Authorization?id=' + R + '&section=timeline'); await desk.waitForTimeout(1000);
      const s = await state('jperez'); const n = s.events.filter(e => e.record === R).length; assert.ok(n >= L.ev0 + 6, `timeline gained ${n - L.ev0} events`);
      assert.ok(await desk.locator('.ui-tl__what').count() >= 6, 'the timeline lists them');
      const a = scoreRows(await state('dowens'), 'dowens').receipts; assert.eq(a.den, L.rec0.den + 1, 'one more send'); assert.eq(a.num, L.rec0.num + 1, 'with its receipt');
      const ad = await openAs(b, 'dowens'); pages.push(ad); await ad.goto(BASE + '/#/Analytics'); await ad.waitForSelector('.a-tile__b'); const dom = await pilotDom(ad); assert.eq(dom.receipts.headline, a.headline, 'screen = selector');
      assert.eq(dom.receipts.headline, `${L.rec0.num + 1} of ${L.rec0.den + 1}`);
      const sa = await state('dowens'); assert.ok(!JSON.stringify(sa.requests.find(r => r.id === R)).includes('Piedmont'), 'no clinical text for admin');
      const e = s.events.filter(x => x.record === R).slice(L.ev0).map(x => x.what.replace(/F-\d+/g, 'F-#').replace(/session \d+/g, 'session #'));
      L.last = { ...twLedger(s, await lsnap(), no), signed_by: req(s, R).signed_by, approved_by: req(s, R).approved_by, sent_by: req(s, R).sent_by, fax: /^F-\d+$/.test(req(s, R).fax_ref), pdf: !!req(s, R).signed_pdf, receipts: dom.receipts.headline, events: e };
    });
    await F.step('no console errors on the desk, Lauris, the panel or the platform', async () => { noErrors(pages); });
  } finally { for (const p of pages) await p.ctx.close().catch(() => { }); }
  ledgers[mode] = { first: L.first, last: L.last };
}

for (const m of MODES) await run(m);
if (MODES.length < 2) T.skip('S3 parity: first and last state across start modes', 'MODES was narrowed to one start mode');
else await T.test('S3 parity: the first and the last state are the same whether it started from demo.scenario, the fixture tw-isp-ready or a fresh reset', async () => {
  const ms = Object.keys(ledgers).filter(m => ledgers[m].last); assert.ok(ms.length >= 2, 'at least two completed runs to compare: ' + ms);
  for (const m of ms.slice(1)) {
    same(ledgers[ms[0]].first, ledgers[m].first, `first state (${ms[0]} vs ${m})`);
    const A = { ...ledgers[ms[0]].last }, B = { ...ledgers[m].last }; const ea = A.events, eb = B.events; delete A.events; delete B.events; delete A.receipts; delete B.receipts;
    same(A, B, `last state (${ms[0]} vs ${m})`); same(ea, eb, `the events a person's clicks add to R-0416 (${ms[0]} vs ${m})`);
  }
});
await b.close();
await T.done();
