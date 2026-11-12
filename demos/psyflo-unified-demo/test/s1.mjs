// Scenario S1 · direct staff daily note (M.R.), end to end across every surface and every store (review/06 b, S1; prompt Part 14.2).
//   phone (M.R. -> say what happened -> review -> save) -> Lauris daily note + panel (the dictation drops in, a person confirms and presses
//   Process Form) -> Psyflo store, mock Lauris store, My Work (staff and supervisor), authorization case units, Analytics pilot scorecard,
//   Denial Intelligence (must not move), audit events. Runs from demo.scenario s1, from the fixture mr-daily and from a fresh reset, and the
//   first and the last state must be the same whichever way it started. (Extends E7's s1: its three phone/Lauris checks are steps 2, 4 and 6.)
import { suite, assert, waitText, api, state, playwright, reset, BASE, LAURIS, MODES, start, flow, openAs, noErrors, panel, panelFrame, formValues, yellow, rootText, mainText, waitState, shot, lsnap, lcons, lsess, req, cli, evs, scoreRows, pilotDom, same, sid } from './lib/scenario.mjs';
import { session } from './lib/index.mjs';

const T = suite('s1');
const { chromium } = playwright();
const b = await chromium.launch();
const SAID = 'played basketball with M.R. after he got upset in math, he cooled down after and went back to class';
const done = s => { const mine = s.clients.filter(c => c.staff === 'khale'); const ok = new Set(s.notes.filter(n => n.staff === 'khale' && n.type === 'daily' && n.date === s.today).map(n => n.client)); return `${mine.filter(c => ok.has(c.id)).length} of ${mine.length}`; };
const ledgers = {};

async function run(mode) {
  const F = flow(T, `S1[${mode}]`); const L = {}; const pages = [];
  try {
    await start(mode, { scenario: 's1', fixture: 'mr-daily', preset: 'live' });
    await F.step('first state: 4 of 6 notes in, M.R. 27 of 110 units in Psyflo and in Lauris, nothing waiting', async () => {
      const s = await state('jperez'), l = await lsnap();
      assert.eq(done(await state('khale')), '4 of 6'); assert.eq(s.dictations.filter(d => d.client === 'MR' && d.status === 'waiting').length, 0);
      assert.ok(!('timers' in s) && !('time_entries' in s), 'Psyflo no longer records time (Track Time was removed)');
      assert.eq(cli(s, 'MR').authorization.used, 83); assert.eq(cli(s, 'MR').authorization.units, 110);
      const mr = lcons(l, 3310); assert.eq(mr.auth.used, 83); assert.eq(mr.auth.available, 27); assert.eq(l.today, s.today, 'one clock for both stores');
      L.first = { done: done(await state('khale')), used: cli(s, 'MR').authorization.used, lAvail: mr.auth.available, lActive: mr.active_file.length, dictWaiting: 0, mrDaily: s.notes.filter(n => n.client === 'MR' && n.type === 'daily').length, disputes: s.disputes.map(d => d.id + ':' + d.status).sort(), lauris_tasks: s.lauris_tasks.length };
      L.s0 = s; L.l0 = l; L.pilot0 = scoreRows(await state('dowens'), 'dowens');
      L.review0 = (await state('cdiaz')).notes.filter(n => n.review === 'pending').length;
    });

    // ---------------------------------------------------------------- 1-2 phone
    let ph;
    await F.step('1 phone: khale picks M.R. (identity card with Harvest # 3310); picking a student changes nothing in either store', async () => {
      ph = await openAs(b, 'khale', { width: 390, height: 844, presenter: mode === 'scenario' }); pages.push(ph);
      await ph.goto(BASE + '/#/MobileApp'); await ph.waitForSelector('.pm-chip');
      assert.match(await rootText(ph), /4 of 6 daily notes processed today/);
      await ph.locator('.pm-chip', { hasText: 'M.R.' }).click(); await ph.waitForTimeout(400);
      assert.match(await ph.locator('.pm-bar').innerText(), /Harvest # 3310/);
      const s = await state('jperez'); assert.eq(s.events.length, L.s0.events.length, 'no audit event for picking a student'); assert.eq((await lsnap()).sessions.length, L.l0.sessions.length);
      await shot(ph, `s1-${mode}-1-phone`);
    });
    await F.step('2 say what happened, review the draft, save: the dictation WAITS in Psyflo (with the Harvest #), nothing reaches Lauris, the phone says Waiting for Lauris', async () => {
      if (mode === 'scenario') { await ph.goto(BASE + '/?present=1#/MobileDictate?client=MR'); await ph.waitForTimeout(1200); await ph.locator('a[href="#example"]').click(); await ph.waitForTimeout(500); assert.match(await ph.locator('#spoken').inputValue(), /^played basketball with M\.R\. after he got upset in math/, 'the presenter example is loaded'); }
      else { await ph.getByRole('link', { name: 'Type' }).click(); await ph.waitForTimeout(700); await ph.locator('#spoken').fill(SAID); await ph.locator('#spoken').blur(); await ph.waitForTimeout(400); }
      await ph.getByRole('link', { name: 'Looks right' }).click(); await ph.waitForTimeout(300);
      assert.match(await rootText(ph), /Save to M\.R\. \(grade 2, Campbell ES-1\)\?/);
      await ph.getByRole('link', { name: 'Save to M.R.' }).click();
      const s = await waitState(x => x.dictations.some(d => d.client === 'MR' && d.status === 'waiting'), { as: 'khale', what: 'the dictation to wait' });
      const d = s.dictations.find(x => x.client === 'MR' && x.status === 'waiting'); assert.eq(d.harvest_no, 3310); assert.eq(d.spoken.toLowerCase(), SAID.toLowerCase(), 'the staffer\'s own words, unchanged');
      const l = await lsnap(); assert.eq(l.sessions.length, L.l0.sessions.length, 'nothing is sent to Lauris'); assert.eq(lcons(l, 3310).active_file.length, L.first.lActive);
      await waitText(ph, /Waiting for Lauris/); assert.ok(!/Processed in Lauris/.test(await rootText(ph)));
      assert.eq(done(await state('khale')), '4 of 6', 'still 4 of 6: a waiting dictation is not a processed note');
      L.dictId = d.id; await shot(ph, `s1-${mode}-2-phone-waiting`);
    });

    // ---------------------------------------------------------------- 3-6 Lauris + panel
    const lp = await openAs(b, 'khale', { width: 1440, height: 1000 }); pages.push(lp);
    await lp.goto(`${LAURIS}/login?as=khale&next=${encodeURIComponent('/consumers/3310/session/dpn')}`);
    await F.step('3 Lauris daily note + panel: "Dictation dropped in"; the boxes are typed yellow and NOT saved (no session in Lauris, only the panel.filled event in Psyflo)', async () => {
      await panel(lp).getByText('Dictation dropped in').waitFor({ timeout: 20000 });
      const v = await formValues(lp); assert.eq(v['Narrative'].replace(/\s+/g, ' ').trim().slice(0, 40), 'Played basketball with M.R. after he got');
      assert.ok(await yellow(lp) >= 1, 'yellow boxes typed'); assert.eq(v['Units'], '', 'units are for the person to type in Lauris'); assert.eq(v['Direct time'], '', 'direct time is for the person to type in Lauris');
      const l = await lsnap(); assert.eq(l.sessions.length, L.l0.sessions.length, 'typed is not saved: Lauris holds no new session'); assert.eq(lcons(l, 3310).auth.available, 27);
      const s = await state('jperez'); assert.ok(evs(s, /panel|typed|filled|Dictation/i, 'MR').length > evs(L.s0, /panel|typed|filled|Dictation/i, 'MR').length || s.fills.length > L.s0.fills.length, 'the fill is recorded in Psyflo');
      assert.eq(s.notes.filter(n => n.client === 'MR' && n.type === 'daily').length, L.first.mrDaily, 'no note exists before Process Form');
      await shot(lp, `s1-${mode}-3-lauris`);
    });
    await F.step('4 review wording and sources in the panel: the staffer\'s words, the drafted narrative ("Nothing was added"), the questions for what was not said, 2 of 5 checks (how long is not said)', async () => {
      const t = (await panelFrame(lp).locator('#panel').innerText()).replace(/\s+/g, ' ');
      assert.match(t, /SAID INTO THE PHONE/i); assert.match(t, new RegExp('“' + SAID.slice(0, 30), 'i')); assert.match(t, /Nothing was added/); assert.match(t, /Which ISP objective did this address\?/); assert.match(t, /What did you do/);
      assert.match(t, /2 of 5 pass/); assert.match(t, /Daily notes today \(K\. Hale\): 4 of 6/);
      assert.ok(!/basketball.{0,80}(minutes|recess|5 minutes)/i.test(t.replace(SAID, '')), 'no invented time or event');
    });
    await F.step('5 the person types the direct time and the units in Lauris, then Process Form (a person\'s click): the note, the units, the dictation, 3+ audit events, in BOTH stores', async () => {
      await lp.getByLabel('Direct time', { exact: true }).fill('3 h 40 min'); await lp.getByLabel('Units', { exact: true }).fill('2');
      await lp.getByRole('button', { name: 'Process Form' }).click(); await lp.waitForURL(/processed=/);
      const id = (lp.url().match(/processed=(\d+)/) || [])[1]; assert.ok(id);
      const s = await waitState(x => x.notes.some(n => n.session === id), { what: 'the note from the observed event' }); L.sess = id;
      const n = s.notes.find(x => x.session === id); assert.eq(n.client, 'MR'); assert.eq(n.type, 'daily'); assert.eq(n.staff, 'khale'); assert.eq(n.consumer, 3310); assert.eq(n.units, 2, 'the 2 units the person typed in Lauris'); assert.eq(n.date, s.today);
      assert.match(n.fields.Narrative, /^Played basketball with M\.R\./); assert.eq(n.fields['Units'], '2', 'the units are the person\'s own entry');
      assert.eq(cli(s, 'MR').authorization.used, 85, 'tracker 83 -> 85'); assert.eq(s.dictations.find(d => d.id === L.dictId).status, 'used');
      const ee = s.events.filter(e => e.record === 'MR' || e.record === id).slice(L.s0.events.filter(e => e.record === 'MR' || e.record === id).length);
      assert.ok(ee.length >= 2 && ee.some(e => e.actor_kind === 'bridge' && /processed/i.test(e.what) && /khale|K\. Hale/.test(e.who + e.what)), 'audit trail from the bridge event: ' + JSON.stringify(ee.map(e => [e.who, e.actor_kind, e.what])));
      const l = await lsnap(); const ls = lsess(l, id); assert.eq(ls.status, 'processed'); assert.eq(ls.values.Units, '2'); assert.eq(ls.processed_by, 'khale');
      const mr = lcons(l, 3310); assert.eq(mr.active_file.length, L.first.lActive + 1, 'Active File +1'); assert.ok(mr.active_file.some(x => x.session === Number(id) && x.form === 'dpn' && x.date === s.today), 'the new session is in the Active File'); assert.eq(mr.auth.available, 25, 'Lauris units 27 -> 25'); assert.eq(mr.auth.used, 85);
      assert.eq(mr.auth.used, cli(s, 'MR').authorization.used, 'the two stores agree on units used');
      await shot(lp, `s1-${mode}-5-processed`);
    });
    await F.step('6 the phone follows only the observed event: Processed in Lauris, 5 of 6', async () => {
      await ph.goto(BASE + '/#/MobileApp'); await ph.waitForSelector('.pm-chip');
      await waitText(ph, /5 of 6 daily notes processed today/); const t = await rootText(ph); assert.match(t, /Processed in Lauris/); assert.match(t, /Nothing waiting for Lauris/);
      await ph.locator('.pm-chip', { hasText: 'M.R.' }).click(); await ph.waitForTimeout(300);
      await shot(ph, `s1-${mode}-6-phone-processed`);
    });

    // ---------------------------------------------------------------- 7+ the platform follows
    await F.step('7 Dashboard (khale): 5 of 6 in, M.R. no longer open; the supervisor queue follows the review mode (every note: +1; spot check: the note is sampled or not queued, never silently lost)', async () => {
      const s = await state('jperez'), k = await state('khale'); assert.eq(done(k), '5 of 6');
      const kp = await openAs(b, 'khale'); pages.push(kp); await kp.goto(BASE + '/#/Dashboard'); await kp.waitForTimeout(1200);
      // the Dashboard is a patient roster: today's daily note is owed on E.S. and no longer on M.R. (the roster selector is what the screen draws)
      const { rosterRows } = await import('../web/js/shared/sel/roster.js'); const { fmtDate } = await import('../web/js/shared/dates.js'); const ka = (await session('khale')).actor;
      const rr = rosterRows(k, ka).rows, todayLbl = fmtDate(k.clock.date, { dow: true }), openToday = id => ((rr.find(r => r.id === id) || {}).items || []).some(i => i.kind === 'note' && i.type === 'daily' && i.sub === todayLbl);
      assert.ok(openToday('ES'), 'E.S. still owes today\'s daily note'); assert.ok(!openToday('MR'), 'M.R. no longer owes today\'s daily note');
      const kt = await mainText(kp); assert.match(kt, /M\.R\./); assert.match(kt, /E\.S\./);
      const mode_ = s.staff.find(x => x.id === 'khale').review_mode; const n = s.notes.find(x => x.session === L.sess);
      const sup = await state('cdiaz'); const pend = sup.notes.filter(x => x.review === 'pending').length;
      if (mode_ === 'every_note') { assert.eq(n.review, 'pending', 'every-note mode queues the note'); assert.eq(pend, L.review0 + 1, 'supervisor review queue +1'); }
      else { assert.ok(typeof n.review === 'string' && n.review.length, 'spot check: the review state is explicit, never blank: ' + n.review); assert.eq(pend, L.review0 + (n.review === 'pending' ? 1 : 0), 'the queue moves exactly when the note is queued'); }
      L.review = { mode: mode_, note: n.review, pending: pend - L.review0 };
      const sp = await openAs(b, 'cdiaz'); pages.push(sp); await sp.goto(BASE + '/#/Dashboard?view=documents&status=pending_review'); await sp.waitForTimeout(1200);
      const st = await mainText(sp); if (mode_ === 'every_note') assert.match(st, /K\. Hale|M\.R\./, 'the note is in the reviewer\'s list');
      await shot(sp, `s1-${mode}-7-review`);
    });
    await F.step('8 the authorization case follows: R-0411 Units used 85 of 110 (25 left), the same figure Lauris prints', async () => {
      const p = await openAs(b, 'jperez'); pages.push(p); await p.goto(BASE + '/#/Authorization?id=R-0411&section=units'); await p.waitForTimeout(1200);
      const t = await mainText(p); assert.match(t, /85 of 110/); assert.match(t, /25 left/); assert.ok(!/83 of 110/.test(t), 'the old figure is gone');
      const lt = (await (await fetch(LAURIS + '/consumers/3310', { headers: { cookie: 'lauris_user=jperez' } })).text()); assert.match(lt, /25 units available/);
      await shot(p, `s1-${mode}-8-auth-units`);
    });
    await F.step('9 Analytics (admin): the pilot scorecard "Notes on time" moves +1 over +1, the screen shows what the selector computes, no clinical text for admin', async () => {
      const s = await state('dowens'); const a = scoreRows(s, 'dowens'), a0 = L.pilot0;
      assert.eq(a.notes.den, a0.notes.den + 1, 'one more required note'); assert.eq(a.notes.num, a0.notes.num + 1, 'and it is on time');
      const p = await openAs(b, 'dowens'); pages.push(p); await p.goto(BASE + '/#/Analytics'); await p.waitForSelector('.a-tile__b');
      const dom = await pilotDom(p); assert.eq(dom.notes.headline, a.notes.headline, 'screen = selector'); assert.eq(a.notes.headline, `${a0.notes.num + 1} of ${a0.notes.den + 1}`);
      const body = await p.content(); assert.ok(!body.includes('basketball'), 'admin never receives the note text');
      assert.ok(!JSON.stringify(s.notes.find(n => n.session === L.sess) || {}).includes('basketball'), 'not in the admin projection either');
      L.pilot = { notes: a.notes.headline };
      await shot(p, `s1-${mode}-9-analytics`);
    });
    await F.step('10 Denial Intelligence and Authorizations are untouched by a daily note (no dispute opened or closed, no Lauris task)', async () => {
      const s = await state('jperez'); assert.deepEq(s.disputes.map(d => d.id + ':' + d.status).sort(), L.first.disputes); assert.eq(s.lauris_tasks.length, L.first.lauris_tasks);
      assert.eq(req(s, 'R-0411').stage, req(L.s0, 'R-0411').stage, 'R-0411 stays where it was');
      L.last = { done: done(await state('khale')), used: cli(s, 'MR').authorization.used, lAvail: lcons(await lsnap(), 3310).auth.available, lActive: lcons(await lsnap(), 3310).active_file.length, dict: s.dictations.find(d => d.id === L.dictId).status, noteUnits: s.notes.find(n => n.session === L.sess).units, pilotNotes: L.pilot.notes };
    });
    await F.step('no console errors on the phone, Lauris, the panel or the platform', async () => { noErrors(pages); });
  } finally { for (const p of pages) await p.ctx.close().catch(() => { }); }
  ledgers[mode] = { first: L.first, last: L.last };
}

for (const m of MODES) await run(m);

if (MODES.length < 2) T.skip('S1 parity: first and last state across start modes', 'MODES was narrowed to one start mode'); else await T.test('S1 parity: the first and the last state are the same whether it started from demo.scenario, the fixture or a fresh reset', async () => {
  const ms = Object.keys(ledgers).filter(m => ledgers[m].last); assert.ok(ms.length >= 2, 'at least two completed runs to compare: ' + ms);
  for (const m of ms.slice(1)) { same(ledgers[ms[0]].first, ledgers[m].first, `first state (${ms[0]} vs ${m})`); same(ledgers[ms[0]].last, ledgers[m].last, `last state (${ms[0]} vs ${m})`); }
});

await b.close();
await T.done();
