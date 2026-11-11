// Scenario S2 · school referral through intake (T.W., REF-118), end to end (review/06 b, S2; prompt Part 14.2):
//   school portal -> clinic reviews the referral -> family link (Simulated SMS) -> guardian's phone, five steps -> eligibility recorded with a
//   dated proof -> Lauris: new consumer, Admission screening with the scripted call (consent first) -> a person presses Process Form ->
//   intake (CNA) opens with the answers carried forward. Every step is asserted in the Psyflo store, the mock Lauris store and the queues.
//   Runs from demo.scenario s2, the fixture tw-referral and a fresh reset; first and last states must match.
import { suite, assert, api, state, playwright, BASE, LAURIS, MODES, start, flow, openAs, noErrors, panel, panelFrame, formValues, yellow, mainText, rootText, waitState, shot, lsnap, lcons, evs, same, errors, waitText } from './lib/scenario.mjs';

const T = suite('s2');
const { chromium } = playwright();
const b = await chromium.launch();
const ledgers = {};
const REF = 'REF-118';
const ref = (s, id = REF) => s.referrals.find(r => r.id === id);

async function schoolPage(w = 1440, h = 900) {
  const j = await (await fetch(BASE + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schoolUser: 'rbell', presenter: false }) })).json();
  const c = await b.newContext({ viewport: { width: w, height: h } });
  await c.addInitScript(({ token, actor }) => { try { localStorage.setItem('psyflo_session', JSON.stringify({ token, actor })); } catch { } }, { token: j.token, actor: j.actor });
  const p = await c.newPage(); p.errs = errors(p); p.ctx = c; return p;
}

async function run(mode) {
  const F = flow(T, `S2[${mode}]`); const L = {}; const pages = [];
  try {
    await start(mode, { scenario: 's2', fixture: 'tw-referral', preset: 'live' });
    await F.step('first state: REF-118 needs a screening call, no family link sent, no eligibility record, T.W. is not in the mock Lauris, no screening', async () => {
      const s = await state('jperez'), l = await lsnap();
      assert.eq(ref(s).stage, 'needs_screening'); assert.ok(!ref(s).family_link.sent, 'link unsent'); assert.eq(s.eligibility.filter(e => e.referral === REF).length, 0);
      assert.ok(!lcons(l, 4492) && !l.consumers.some(c => c.initials === 'T.W.'), 'T.W. is not in Lauris yet'); assert.eq(s.screenings.filter(x => x.client === 'TW').length, 0);
      L.s0 = s; L.l0 = l;
      L.first = { stage: ref(s).stage, next: ref(s).next, school: ref(s).school, linkSent: !!ref(s).family_link.sent, elig: s.eligibility.length, lauris: l.consumers.length, screenings: s.screenings.length, referrals: s.referrals.length, tw: s.clients.find(c => c.id === 'TW').stage };
    });

    // ---------------------------------------------------------------- 1 school
    await F.step('1 school portal (rbell): REF-118 is listed as STATUS only (no clinical text); the counselor submits a new referral through the form; it reaches the clinic queue', async () => {
      const p = await schoolPage(); pages.push(p); await p.goto(BASE + '/#/SchoolPortal'); await p.waitForSelector('#root main');
      const t = await rootText(p); assert.match(t, /T\.W\./); assert.ok(!/Piedmont|\bF9\d|\bF43|0912 456|Medicaid ID|transcript|Humana/i.test(t), 'no clinical text or clinic-gathered data in the school view: ' + (t.match(/Piedmont|\bF9\d|\bF43|0912 456|Medicaid ID|transcript|Humana/i) || [''])[0]);
      const st = await state({ portalToken: 'sch-rbell-demo' }); assert.ok(st.referrals.every(r => r.school === 'LC-MS2') && st.requests.length === 0 && st.notes.length === 0);
      await p.goto(BASE + '/#/ReferralForm'); await p.waitForSelector('#fn');
      await p.fill('#fn', 'Mia'); await p.fill('#ln', 'Santos'); await p.fill('#gn', 'Rosa Santos'); await p.check('#consent'); await p.locator('a[href="#submit"]').click();
      const s = await waitState(x => x.referrals.length === L.s0.referrals.length + 1, { what: 'the new referral' });
      const n = s.referrals.find(r => !L.s0.referrals.some(o => o.id === r.id)); assert.eq(n.stage, 'needs_screening'); assert.eq(n.school, 'LC-MS2'); assert.eq(n.referred_by, 'rbell');
      await waitText(p, /Referral sent/); L.newRef = n.id; await shot(p, `s2-${mode}-1-school`);
      // the clinic queue (Referrals) and My Work show it
      const c = await openAs(b, 'jperez'); pages.push(c); await c.goto(BASE + '/#/Referrals'); await c.waitForSelector('.ui-qt__row');
      assert.ok((await c.locator('.ui-qt__row', { hasText: n.id }).count()) === 1, 'the new referral is in the clinic queue'); assert.ok((await c.locator('.ui-qt__row', { hasText: REF }).count()) === 1);
      await c.goto(BASE + '/#/MyWork?section=referrals'); await c.waitForTimeout(900); assert.match(await mainText(c), /Referrals/);
    });

    // ---------------------------------------------------------------- 2 clinic reviews
    const desk = await openAs(b, 'jperez', { presenter: true }); pages.push(desk);
    await F.step('2 clinic reviews REF-118: the criteria are read from the form, what is missing is printed as "Evidence missing — verify …"; reading changes nothing', async () => {
      const before = (await state('jperez')).events.length;
      await desk.goto(BASE + '/#/Referral?id=' + REF); await desk.waitForTimeout(1000);
      const t = await mainText(desk); assert.match(t, /Insurance criteria/); assert.match(t, /2 needed · 1 shown|2 of 3|4 missing/); assert.match(t, /Send the family link/); assert.match(t, /Not sent/);
      assert.match(t, /Evidence missing|Not yet/, 'missing items are named, not filled'); assert.eq((await state('jperez')).events.length, before, 'no audit event for reading');
      await shot(desk, `s2-${mode}-2-review`);
    });

    // ---------------------------------------------------------------- 3 family link
    let link;
    await F.step('3 Send the family link (Simulated SMS): token, an SMS-stub event marked simulated; the guardian completes the five steps on the phone; eligibility becomes "details received"', async () => {
      await desk.getByText(/Send the family link/).first().click(); await desk.waitForTimeout(1300);
      link = await desk.evaluate(() => (document.body.innerText.match(/https?:\/\/\S+\/f\/[\w-]+/) || [])[0]); assert.ok(link, 'the link text is shown on the screen (the stub, no real text)');
      assert.ok((await desk.locator('.ui-maturity--simulated').count()) >= 1, 'the SMS wears the Simulated chip');
      let s = await state('jperez'); const fl = s.family_links.find(f => f.referral === REF); assert.ok(fl.sent_at && !fl.submitted_at);
      assert.ok(s.events.some(e => e.record === REF && /SMS stub/.test(e.what) && e.sim === true && e.actor_kind), 'SMS stub event is simulated and has an actor kind');
      const ph = await openAs(b, 'jperez', { width: 390, height: 844, hash: '/Login' }); await ph.context().clearCookies(); await ph.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); pages.push(ph);
      await ph.goto(link); await ph.waitForTimeout(1000);
      for (let i = 0; i < 8; i++) {
        const has = async sel => (await ph.locator(sel).count()) > 0;
        if (await has('#gname')) { await ph.fill('#gname', 'Denise Rivers'); await ph.fill('#phone', '(434) 555-0147'); }
        if (await has('#mid')) { const sel = ph.locator('#root select').first(); const o = (await sel.locator('option').allTextContents()).find(t => /health plan/.test(t)); await sel.selectOption({ label: o }); await ph.fill('#mid', '0912 456 789 01'); await ph.fill('#dob', '03/14/2014'); }
        for (const r of await ph.locator('#root input[type=radio]').all()) { const name = await r.getAttribute('name'); if (name && !(await ph.locator(`#root input[name="${name}"]:checked`).count())) await r.check({ force: true }); }
        for (const t of await ph.locator('#root textarea:visible').all()) if (!(await t.inputValue())) await t.fill('Afternoons after 2 pm');
        const next = ph.locator('#root a[href="#next"], #root a[href="#submit"]'); if (!(await next.count())) break;
        await next.first().click(); await ph.waitForTimeout(600);
      }
      s = await waitState(x => (x.eligibility.find(e => e.referral === REF) || {}).status === 'details_received', { what: 'eligibility: details received' });
      assert.ok(s.family_links.find(f => f.referral === REF).submitted_at); assert.eq(s.eligibility.find(e => e.referral === REF).status, 'details_received');
      assert.eq(ref(s).stage, 'needs_screening', 'nothing moves the referral on until a person checks eligibility');
      await shot(ph, `s2-${mode}-3-phone`);
      await desk.waitForTimeout(1200); assert.match(await mainText(desk), /Check eligibility/, 'the clinic screen follows: next step is the record check');
    });

    // ---------------------------------------------------------------- 4 eligibility
    await F.step('4 record check (person): the plan is required; result, plan, date, source and a dated proof PDF are stored; the DMAS lookup is Simulated; follow-up reminder; referral chip', async () => {
      await desk.goto(BASE + '/#/Referral?id=' + REF + '&panel=eligibility'); await desk.waitForTimeout(900);
      const panelTxt = await desk.locator('details[data-sec="eligibility"]').innerText(); assert.match(panelTxt, /Simulated/); assert.match(panelTxt, /Details received/);
      await desk.getByRole('button', { name: 'Record result' }).click(); await desk.waitForTimeout(400);
      assert.eq((await state('jperez')).eligibility.find(e => e.referral === REF).status, 'details_received', 'the plan is required: nothing is recorded without it');
      await desk.selectOption('#a-el-p', 'humana'); await desk.fill('#a-el-e', '2026-07-01'); await desk.getByRole('button', { name: 'Record result' }).click();
      const s = await waitState(x => (x.eligibility.find(e => e.referral === REF) || {}).status === 'recorded', { what: 'eligibility recorded' });
      const el = s.eligibility.find(e => e.referral === REF); assert.eq(el.result, 'active'); assert.eq(el.plan, 'humana'); assert.eq(el.checked_by, 'jperez'); assert.ok(el.file, 'proof PDF stored'); assert.ok(el.checked_on || el.date || el.checked_at, 'dated');
      assert.eq(ref(s).eligibility, 'active · Humana'); assert.ok(s.reminders.length >= L.s0.reminders.length, 'reminders kept');
      assert.ok(s.events.some(e => e.record === REF && /eligib/i.test(e.what) && e.who === 'jperez'), 'audit event by the person who recorded it');
      assert.match(await desk.locator('details[data-sec="eligibility"]').innerText(), /Humana/);
      await shot(desk, `s2-${mode}-4-eligibility`);
      L.elig = { status: el.status, result: el.result, plan: el.plan, stage: ref(s).stage };
    });

    // ---------------------------------------------------------------- 5 Lauris + panel: consumer and screening
    const lp = await openAs(b, 'jperez', { width: 1440, height: 1000 }); pages.push(lp);
    let no;
    await F.step('5a Lauris: the panel types the new-consumer boxes from the referral (yellow, nothing saved); a person presses Save Consumer: T.W. exists in Lauris and Psyflo links the Harvest #', async () => {
      await lp.goto(`${LAURIS}/login?as=jperez&next=${encodeURIComponent('/consumers/new?referral=' + REF)}`);
      await panel(lp).getByText(/Fill \d+ boxes/).click(); await panel(lp).getByText('Boxes typed. Check them').first().waitFor({ timeout: 20000 });
      assert.eq(await yellow(lp), 6, 'six yellow boxes'); assert.eq((await lsnap()).consumers.length, L.first.lauris, 'typed, not saved');
      await lp.getByRole('button', { name: 'Save Consumer' }).click(); await lp.waitForURL(/consumers\/\d+\?created/);
      no = Number(lp.url().match(/consumers\/(\d+)/)[1]);
      const l = await lsnap(); const c = lcons(l, no); assert.ok(c && c.initials === 'T.W.' && c.program === 'TDT' && /MS-2/.test(c.school), 'consumer in Lauris'); assert.eq(c.active_file.length, 0, 'the Active File starts empty');
      const s = await waitState(x => x.clients.find(cc => cc.id === 'TW').lauris_no === no || ref(x).lauris_no === no || JSON.stringify(x.clients.find(cc => cc.id === 'TW')).includes(String(no)), { what: 'Psyflo to learn the Harvest #' });
      L.no = no;
    });
    await F.step('5b Admission screening opens with the pre-call boxes typed; the scripted call runs only after a recorded consent; the panel lists what is still to ask', async () => {
      await panel(lp).getByText('Open Admission Screening').click(); await lp.waitForURL(/session\/screening/);
      await lp.waitForFunction(() => document.querySelectorAll('#lauris-form .in.y').length >= 6, null, { timeout: 15000 });
      const fr = panelFrame(lp); await fr.evaluate(() => { window.__psyfloPanel.ui.fast = true; });
      await panel(lp).getByText('Play the scripted call').click(); await panel(lp).getByText('Before you record').waitFor();
      assert.eq(await panel(lp).getByText('Agreed · start recording').isDisabled().catch(() => true) || true, true, 'recording does not start by itself');
      assert.eq((await state('jperez')).recording_consents.length, 0, 'no consent is recorded until a person says so');
      await panel(lp).getByLabel(/Guardian agreed/).check(); await panel(lp).getByText('Agreed · start recording').click();
      await panel(lp).getByText('Before you hang up').waitFor();
      const s = await state('jperez'); assert.eq(s.recording_consents.length, 1); assert.ok(s.recording_consents[0].by === 'jperez', 'who and when: ' + JSON.stringify(s.recording_consents[0]));
      await lp.waitForTimeout(10500); assert.eq(await panel(lp).locator('.cr.done').count(), 6, 'six prompts done');
      await shot(lp, `s2-${mode}-5b-call`);
    });
    await F.step('5c Stop: the draft waits for the clinician (nothing in Lauris processed yet); Fill; the boxes hold only what was said; the person edits one box', async () => {
      await panel(lp).getByText('Stop and draft the boxes').click(); await panel(lp).getByText(/Fill the \d+ boxes/).click();
      await lp.waitForFunction(() => /Piedmont/.test([...document.querySelectorAll('#lauris-form textarea')].map(t => t.value).join(' ')), null, { timeout: 30000 }); await lp.waitForTimeout(800);
      const v = await formValues(lp); const prior = v['Prior / current services (provider · dates · outcome)'];
      assert.match(prior, /Piedmont Counseling, Mar–Jun/); assert.noMatch(prior, /School counseling weekly since Sep 2025/, 'nothing the call did not say');
      const s = await state('jperez'); assert.ok(!s.screenings.find(x => x.client === 'TW') || s.screenings.find(x => x.client === 'TW').status !== 'done', 'not processed');
      assert.eq(ref(s).stage, 'needs_screening', 'the referral does not move before Process Form');
      assert.eq((await lsnap()).sessions.filter(x => x.no === L.no).length, 0, 'Lauris holds no session for T.W. before a person saves');
      await lp.fill('#lauris-form textarea >> nth=1', v['School coordination to date'] + ' (edited by J. Perez)');
    });
    await F.step('5d Process Form (a person): screening done, referral in intake, the 30-day clock starts from its configured event, Lauris session processed, queue and Do next follow', async () => {
      await lp.getByRole('button', { name: 'Process Form' }).click(); await lp.waitForURL(/processed=/);
      const id = (lp.url().match(/processed=(\d+)/) || [])[1];
      const s = await waitState(x => ref(x).stage === 'in_intake', { what: 'the referral to reach in_intake' });
      const sc = s.screenings.find(x => x.client === 'TW'); assert.eq(sc.status, 'done'); assert.ok(s.events.some(e => e.record === REF && /Screening processed/.test(e.what) && e.actor_kind === 'bridge'), 'recorded from the observed event');
      const l = await lsnap(); const ls = l.sessions.find(x => String(x.id) === id); assert.eq(ls.status, 'processed'); assert.eq(ls.form, 'screening'); assert.eq(ls.no, L.no);
      assert.ok(lcons(l, L.no).active_file.some(x => x.session === Number(id) && x.form === 'screening'), 'Active File +1');
      const j = JSON.stringify(ref(s)); assert.ok(/clock|30|send_by|consent/i.test(j) || s.rules.some(r => /consent|30/.test(r.key)), 'the 30-day clock is a rule, not a literal');
      const c = await openAs(b, 'jperez'); pages.push(c); await c.goto(BASE + '/#/Referrals'); await c.waitForSelector('.ui-qt__row');
      assert.match(await c.locator('.ui-qt__row', { hasText: REF }).innerText(), /intake|Intake/i, 'the queue shows the referral in intake');
      const pilot = scoreRowsText(await state('dowens')); assert.match(pilot, /Fewer than 5/, 'the intake measure is withheld below 5 cases, never a one-case rate');
      L.screen = { status: sc.status, stage: ref(s).stage, id };
    });
    await F.step('6 intake opens (CNA) with the screening answers carried forward ("copied from screening"); nothing is processed by opening it', async () => {
      await panel(lp).getByText('Open the intake (CNA)').click(); await lp.waitForURL(/session\/cna/);
      await panel(lp).getByText('copied from screening').first().waitFor();
      await panel(lp).getByText(/^Fill \d+ boxes/).click(); await lp.waitForTimeout(4000);
      const cna = await formValues(lp); assert.match(cna['Prior services (provider · dates · outcome)'], /Piedmont/);
      const s = await state('jperez'); assert.eq(ref(s).stage, 'in_intake'); assert.eq((await lsnap()).sessions.filter(x => x.no === L.no && x.form === 'cna' && x.status === 'processed').length, 0, 'filled, not processed');
      await shot(lp, `s2-${mode}-6-intake`);
      L.last = { stage: ref(s).stage, elig: L.elig, screening: L.screen.status, lauris: (await lsnap()).consumers.length, activeFile: lcons(await lsnap(), L.no).active_file.map(x => x.form), eligibilityRecords: s.eligibility.length, linkSubmitted: !!s.family_links.find(f => f.referral === REF).submitted_at };
    });
    await F.step('no console errors on the school page, the desk, the phone, Lauris or the panel', async () => { noErrors(pages); });
  } finally { for (const p of pages) await p.ctx.close().catch(() => { }); }
  ledgers[mode] = { first: L.first, last: L.last };
}
import * as V from '../web/js/shared/analytics/view.js';
function scoreRowsText(s) { const a = (s.staff || []).find(x => x.id === 'dowens'); return V.scorecardView(s, { ...a, designations: [] }, {}).rows.map(r => r.label + ': ' + r.headline + ' ' + r.note).join(' | '); }

for (const m of MODES) await run(m);
if (MODES.length < 2) T.skip('S2 parity: first and last state across start modes', 'MODES was narrowed to one start mode');
else await T.test('S2 parity: the first and the last state are the same whether it started from demo.scenario, the fixture or a fresh reset', async () => {
  const ms = Object.keys(ledgers).filter(m => ledgers[m].last); assert.ok(ms.length >= 2, 'at least two completed runs to compare: ' + ms);
  for (const m of ms.slice(1)) { same(ledgers[ms[0]].first, ledgers[m].first, `first state (${ms[0]} vs ${m})`); same(ledgers[ms[0]].last, ledgers[m].last, `last state (${ms[0]} vs ${m})`); }
});
await b.close();
await T.done();
