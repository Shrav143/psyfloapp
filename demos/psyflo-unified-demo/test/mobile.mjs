// The phone (390 x 844): wrong-student protection, draft versus processed state, one time model with the panel, the four separate figures,
// microphone consent / blocked / unsupported / offline states, no locked-screen promise, 48 px targets, presenter-only example.
import { suite, assert, api, tryApi, state, reset, lpost, bridge, playwright, login, errors, BASE, SHOTS } from './lib/index.mjs';

const T = suite('mobile');
const { chromium } = playwright();
const b = await chromium.launch();
const quiet = errs => errs.filter(e => !/LANG_OFF|Parent(Schedule|Progress)/.test(e));
async function phone(staff, { presenter = false, init, offline = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  if (init) await ctx.addInitScript(init);
  const p = await ctx.newPage(); const errs = errors(p);
  await login(p, staff, { presenter });
  return { ctx, p, errs };
}
const go = async (p, hash) => { await p.goto(BASE + '/#' + hash); await p.waitForTimeout(900); };
const text = p => p.locator('#root').innerText();
const SR_MOCK = (mode) => `(() => { class R { start() { setTimeout(() => this.onerror && this.onerror({ error: ${JSON.stringify(mode)} }), 30); } stop() { setTimeout(() => this.onend && this.onend(), 10); } } window.SpeechRecognition = R; window.webkitSpeechRecognition = R; })();`;
const NO_SR = `delete window.SpeechRecognition; delete window.webkitSpeechRecognition; Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true }); Object.defineProperty(window, 'SpeechRecognition', { value: undefined, configurable: true });`;

await reset('live');

try {
  await T.test('home: My students, Current activity, Say what happened, Review, Ready in Lauris, under a sticky student bar; no default student, no locked-screen promise', async () => {
    await api('time.stop', {}, 'khale').then(r => api('time.discard', { id: r.id }, 'khale'));   // no timer running: nothing may pick a student
    const { ctx, p, errs } = await phone('khale'); await go(p, '/MobileApp');
    const t = await text(p);
    for (const h of ['My students', 'Current activity', 'Say what happened', 'Review', 'Ready in Lauris']) assert.match(t, new RegExp(h), h);
    assert.match(t, /No student selected/, 'nothing is picked for the person'); assert.match(t, /Pick a student to start/);
    assert.eq(await p.locator('.pm-chip').count(), 6, 'six students, no one else'); assert.noMatch(t, /runs with the screen locked|Or just say the name/i, 'no promise the app does not keep');
    assert.eq(await p.locator('.pm-bar').count(), 1); assert.ok(await p.getByRole('button', { name: 'Pick a student to start' }).isDisabled(), 'Start waits for a student');
    await p.screenshot({ path: SHOTS + '/mobile-1-home-none.png' });
    await p.locator('.pm-chip', { hasText: 'M.R.' }).click(); await p.waitForTimeout(300);
    const bar = await p.locator('.pm-bar').innerText(); assert.match(bar, /M\.R\./); assert.match(bar, /Harvest # 3310/); assert.match(bar, /Campbell ES-1/); assert.match(bar, /grade 2/);
    assert.deepEq(quiet(errs), [], quiet(errs).join(' | ')); await ctx.close();
  });

  await T.test('the four figures are separate: recorded, direct service, in the note, potentially billable (with the rule\'s source); a running timer is not billable', async () => {
    await reset('live');
    const { ctx, p } = await phone('khale'); await go(p, '/MobileApp');
    const figs = await p.locator('.pm-fig').allInnerTexts(); assert.eq(figs.length, 4);
    assert.match(figs[0], /Recorded[\s\S]*5 h 10 min \+ running/); assert.match(figs[1], /Direct service[\s\S]*3 h 40 min/); assert.match(figs[2], /In the note[\s\S]*Not yet/); assert.match(figs[3], /Potentially billable[\s\S]*2 units[\s\S]*Officially verified/);
    assert.match(await text(p), /Recorded time only\. A running timer is not billable\./); assert.noMatch(figs.join(' '), /Billable \d|billed/i);
    await p.screenshot({ path: SHOTS + '/mobile-2-four-figures.png' });
    await ctx.close();
  });

  await T.test('one time model with the panel: pause, resume, stop makes a stopped entry to describe; saving it moves direct time and units by the rule; switching student keeps the first one\'s time', async () => {
    await reset('live');
    const { ctx, p, errs } = await phone('khale'); await go(p, '/MobileApp');
    await p.getByRole('button', { name: 'Pause' }).click(); await p.waitForTimeout(500); assert.match(await text(p), /Paused with M\.R\./); await p.getByRole('button', { name: 'Resume' }).click(); await p.waitForTimeout(500);
    await p.getByRole('button', { name: 'Stop' }).click(); await p.waitForTimeout(700);
    let t = await text(p); assert.match(t, /Stopped · M\.R\. · 1:52–3:\d\d pm/); assert.match(t, /Recorded, not counted yet/); assert.match(t, /Not timing/);
    let s = await state('khale'); const d = s.time_entries.find(e => e.status === 'draft'); assert.ok(d && d.confirmed === false && d.source === 'timer', 'it is in the same store the panel reads');
    await p.getByRole('button', { name: 'Save time' }).click(); await p.waitForTimeout(400); assert.eq((await state('khale')).time_entries.find(e => e.id === d.id).status, 'draft', 'words are required');
    await p.locator(`#pm-w-${d.id}`).fill('Support during afternoon classes'); await p.getByRole('button', { name: 'Save time' }).click(); await p.waitForTimeout(700);
    s = await state('khale'); assert.eq(s.time_entries.find(e => e.id === d.id).status, 'saved');
    await p.locator('.pm-chip', { hasText: 'M.R.' }).click(); await p.waitForTimeout(300);
    const figs = await p.locator('.pm-fig').allInnerTexts(); assert.match(figs[1], /5 h 18 min/); assert.match(figs[3], /3 units/, '318 minutes is 3 units under the bands');
    await p.screenshot({ path: SHOTS + '/mobile-3-after-save.png' });
    // start with J.T., then pick M.R. and switch
    await p.locator('.pm-chip', { hasText: 'J.T.' }).click(); await p.getByRole('button', { name: 'Start with J.T.' }).click(); await p.waitForTimeout(600);
    assert.match(await text(p), /With J\.T\. now/); await p.locator('.pm-chip', { hasText: 'M.R.' }).click(); await p.getByRole('button', { name: 'Switch to M.R.' }).click(); await p.waitForTimeout(700);
    s = await state('khale'); assert.eq(s.timers.khale.client, 'MR'); assert.ok(s.time_entries.some(e => e.client === 'JT' && e.status === 'draft'), 'J.T.\'s time was kept as a stopped entry, not lost');
    assert.deepEq(quiet(errs), [], quiet(errs).join(' | ')); await ctx.close();
  });

  await T.test('a left-running timer after a day advance is not guessed: the phone asks when it really ended', async () => {
    await reset('live');
    await api('demo.advanceDay', {}, 'dowens+p');
    const { ctx, p } = await phone('khale'); await go(p, '/MobileApp');
    let t = await text(p); assert.match(t, /Left running since Thu Oct 29 1:52 pm/); assert.match(t, /Nothing is guessed/); assert.eq(await p.locator('#elapsed').count(), 0, 'no invented elapsed time');
    await p.locator('#pm-end').fill('99:99'); await p.getByRole('button', { name: 'Stop and record' }).click(); await p.waitForTimeout(400); assert.ok((await state('khale')).timers.khale.started, 'a bad time is refused');
    await p.locator('#pm-end').fill('14:30'); await p.getByRole('button', { name: 'Stop and record' }).click(); await p.waitForTimeout(700);
    const e = (await state('khale')).time_entries.find(x => x.status === 'draft'); assert.eq(e.date, '2026-10-29'); assert.eq(e.end, '14:30');
    await p.screenshot({ path: SHOTS + '/mobile-4-stale-timer.png' });
    await ctx.close(); await reset('live');
  });

  await T.test('wrong student: no student, or one not on the caseload, is a hard stop; the card shows Harvest # and school; saving asks "Save to M.R. (grade 2, Campbell ES-1)?" with Change', async () => {
    const { ctx, p } = await phone('khale');
    await go(p, '/MobileDictate'); let t = await text(p); assert.match(t, /Who is this about\?/); assert.eq(await p.locator('#spoken').count(), 0, 'nothing to type into until a student is chosen'); assert.noMatch(await p.locator('.pm-bar').innerText(), /M\.R\./, 'no fallback to M.R.');
    await go(p, '/MobileDictate?client=DW'); t = await text(p); assert.match(t, /That student is not on your list/, 'and the other worker\'s student is not even named'); assert.eq(await p.locator('#spoken').count(), 0); await p.screenshot({ path: SHOTS + '/mobile-5-not-on-list.png' });
    await go(p, '/MobileDictate?client=MR'); assert.match(await p.locator('.pm-bar').innerText(), /M\.R\.[\s\S]*Harvest # 3310[\s\S]*Campbell ES-1[\s\S]*grade 2/);
    await p.locator('#spoken').fill('played basketball with M.R. after he got upset in math, he cooled down after and went back to class'); await p.locator('#spoken').blur(); await p.waitForTimeout(500);
    t = await text(p); assert.match(t, /In note language/); assert.match(t, /Draft/); assert.match(t, /Not in your words yet/, 'what was not said stays a question');
    await p.getByRole('link', { name: 'Looks right' }).click(); await p.waitForTimeout(400);
    assert.match(await text(p), /Save to M\.R\. \(grade 2, Campbell ES-1\)\?/); assert.match(await text(p), /Harvest # 3310/); await p.screenshot({ path: SHOTS + '/mobile-6-confirm.png' });
    await p.getByRole('link', { name: 'Change' }).last().click(); await p.waitForTimeout(300);
    assert.match(await text(p), /Change student/); await p.locator('.pm-sheet .pm-btn', { hasText: 'J.T.' }).click(); await p.waitForTimeout(400);
    assert.match(await p.locator('.pm-bar').innerText(), /J\.T\.[\s\S]*Harvest # 3315/, 'the card follows the change'); assert.eq((await state('khale')).dictations.filter(d => d.client === 'JT').length, 0, 'nothing was saved for the wrong student');
    await go(p, '/MobileApp'); await go(p, '/MobileDictate?client=MR'); await p.locator('#spoken').fill('played basketball with M.R. after he got upset in math'); await p.locator('#spoken').blur(); await p.waitForTimeout(400);
    await p.getByRole('link', { name: 'Looks right' }).click(); await p.waitForTimeout(300); await p.getByRole('link', { name: 'Save to M.R.' }).click(); await p.waitForTimeout(800);
    const d = (await state('khale')).dictations.find(x => x.client === 'MR' && x.status === 'waiting'); assert.ok(d, 'saved'); assert.eq(d.harvest_no, 3310); assert.eq(d.input, 'typed'); assert.eq(d.source, 'phone');
    await ctx.close();
    // a clinician on the phone sees the students they are the clinician for, and nothing is chosen for them
    const c = await phone('jperez'); await go(c.p, '/MobileDictate?client=JT'); assert.match(await text(c.p), /not on your list/); assert.eq(await c.p.locator('#spoken').count(), 0); await go(c.p, '/MobileApp'); assert.match(await text(c.p), /No student selected/); await c.ctx.close();
  });

  await T.test('draft versus processed: Draft until saved, Waiting for Lauris once saved, Processed in Lauris only after a processed note was observed; "used" alone is not processed', async () => {
    await reset('live');
    const { ctx, p } = await phone('khale'); await go(p, '/MobileDictate?client=MR');
    await p.locator('#spoken').fill('played basketball with M.R. after he got upset in math, he cooled down after and went back to class'); await p.locator('#spoken').blur(); await p.waitForTimeout(400);
    await p.getByRole('link', { name: 'Done' }).first().click().catch(() => { }); await go(p, '/MobileApp');
    let t = await text(p); assert.match(t, /Draft/); assert.noMatch(t, /Processed in Lauris|Waiting for Lauris(?! \()/, 'a draft is not saved anywhere');
    await go(p, '/MobileDictate?client=MR'); await p.getByRole('link', { name: 'Looks right' }).click(); await p.waitForTimeout(300); await p.getByRole('link', { name: 'Save to M.R.' }).click(); await p.waitForTimeout(800);
    t = await text(p); assert.match(t, /Waiting for Lauris/); assert.match(t, /Saved\./); assert.match(t, /Waiting until M\.R\.'s daily note is open in Lauris \(Harvest # 3310\)/); assert.noMatch(t, /Processed in Lauris/);
    await p.screenshot({ path: SHOTS + '/mobile-7-waiting.png' });
    await go(p, '/MobileApp'); t = await text(p); assert.match(t, /Waiting for Lauris/); assert.match(t, /1 waiting\. It drops in when M\.R\.'s daily note is open in Lauris, matched by Harvest #\./); assert.noMatch(t, /Processed in Lauris/);
    // a person opens M.R.'s daily note in Lauris, presses Process Form; the page bridge reports it (nothing else makes a note "processed")
    const vals = { 'Direct time': '3 h 40 min', 'Units': '2', 'Narrative': 'Played basketball with M.R. after he got upset in math, he cooled down after and went back to class.' };
    const pr = await lpost('/consumers/3310/session/dpn', 'khale', { action: 'process', f2: vals['Direct time'], f3: vals['Units'], f9: vals.Narrative }); const sid = (pr.loc || '').match(/processed=(\d+)/)[1];
    const j = await bridge('lauris.observed', { event: 'processed', session: sid, form: 'dpn', consumer: { no: '3310', initials: 'M.R.' }, values: vals, typed: [], user: 'K. Hale' }); assert.ok(j.ok, j.error);
    await go(p, '/MobileApp'); t = await text(p); assert.match(t, /Processed in Lauris/); assert.match(t, /Nothing waiting for Lauris/); await p.screenshot({ path: SHOTS + '/mobile-8-processed.png' });
    await ctx.close();
    // "used" with no processed note behind it is not shown as processed
    await reset('live'); const w = await phone('khale'); await api('phone.dictation', { client: 'MR', harvest_no: 3310, spoken: 'played basketball with M.R.', input: 'typed' }, 'khale');
    const id = (await state('khale')).dictations.find(d => d.status === 'waiting').id; await api('dictation.used', { id }, 'khale');
    await go(w.p, '/MobileApp'); t = await text(w.p); assert.noMatch(t, /Processed in Lauris/); assert.match(t, /Used in Lauris/); await w.ctx.close();
  });

  await T.test('microphone states are explicit screens: consent first (recorded), then blocked when the browser says no; typing always works and needs no consent', async () => {
    await reset('live');
    const { ctx, p } = await phone('khale', { init: SR_MOCK('not-allowed') }); await go(p, '/MobileDictate?client=MR');
    let t = await text(p); assert.match(t, /Use the microphone\?/); assert.match(t, /Psyflo keeps the text, not the audio/); assert.match(t, /Demo data · nothing is real/, 'the consent screen says the data is synthetic'); assert.eq(await p.locator('#spoken').count(), 1, 'typing is available at once');
    await p.screenshot({ path: SHOTS + '/mobile-9-mic-consent.png' });
    await p.getByRole('link', { name: 'Allow today' }).click(); await p.waitForTimeout(900);
    t = await text(p); assert.match(t, /The microphone is blocked/); assert.match(t, /Try again/); assert.match(t, /Type instead/); await p.screenshot({ path: SHOTS + '/mobile-10-mic-blocked.png' });
    const s = await state('khale'); assert.eq(s.mic_consents.length, 1, 'the answer was recorded'); assert.eq(s.mic_consents[0].granted, true);
    await p.locator('#spoken').fill('played basketball with M.R. after he got upset in math'); assert.eq(await p.locator('#spoken').inputValue(), 'played basketball with M.R. after he got upset in math');
    await ctx.close();
    const u = await phone('khale', { init: NO_SR }); await go(u.p, '/MobileDictate?client=MR'); t = await text(u.p); assert.match(t, /This browser cannot turn speech into text/); assert.noMatch(t, /Use the microphone\?/); await u.p.screenshot({ path: SHOTS + '/mobile-11-no-speech.png' }); await u.ctx.close();
  });

  await T.test('offline is an explicit state: a banner, and the draft cannot be saved until the phone is back online', async () => {
    await reset('live');
    const { ctx, p } = await phone('khale'); await go(p, '/MobileDictate?client=MR');
    await p.locator('#spoken').fill('played basketball with M.R. after he got upset in math'); await p.locator('#spoken').blur(); await p.waitForTimeout(300);
    await ctx.setOffline(true); await p.evaluate(() => window.dispatchEvent(new Event('offline'))); await p.waitForTimeout(500);
    let t = await text(p); assert.match(t, /You are offline/); assert.ok(await p.getByRole('button', { name: /Offline · cannot save/ }).isDisabled()); await p.screenshot({ path: SHOTS + '/mobile-12-offline.png' });
    assert.eq((await state('khale')).dictations.length, 0, 'nothing was saved offline');
    await ctx.setOffline(false); await p.evaluate(() => window.dispatchEvent(new Event('online'))); await p.waitForTimeout(500);
    assert.noMatch(await text(p), /You are offline/); assert.eq(await p.getByRole('link', { name: 'Looks right' }).count(), 1);
    await ctx.close();
  });

  await T.test('the example sentence is presenter chrome: not shown to a person, shown with the presenter handle; the example and script commands both work', async () => {
    await reset('live');
    const a = await phone('khale'); await go(a.p, '/MobileDictate?client=MR'); assert.eq(await a.p.locator('a[href="#example"]').count(), 0, 'people do not see demo controls'); await a.ctx.close();
    const { ctx, p } = await phone('khale', { presenter: true }); await p.goto(BASE + '/?present=1#/MobileDictate?client=MR'); await p.waitForTimeout(1200);
    assert.eq(await p.locator('a[href="#example"]').count(), 1, 'with the presenter dock on'); await p.locator('a[href="#example"]').click(); await p.waitForTimeout(500);
    assert.match(await p.locator('#spoken').inputValue(), /^played basketball with M\.R\. after he got upset in math/);
    await p.locator('#spoken').fill(''); await p.locator('#spoken').blur();
    const kinds = await p.evaluate(() => { const a = window.psyflo.current.inst.anchors; return [typeof a.example, typeof a.script]; }); assert.deepEq(kinds, ['function', 'function']);
    await p.evaluate(() => window.psyflo.current.inst.anchors.script()); await p.waitForTimeout(400); assert.match(await p.locator('#spoken').inputValue(), /basketball/);
    await ctx.close();
  });

  await T.test('assessments: only the person\'s own students, the identity card above the questions, answers wait in Psyflo (Waiting for Lauris)', async () => {
    await reset('live');
    const { ctx, p } = await phone('khale'); await go(p, '/MobileAssess'); let t = await text(p);
    assert.match(t, /SUDS · A\.G\./); assert.match(t, /DSM cross-cutting · E\.S\./); assert.noMatch(t, /D\.W\.|T\.N\./);
    await p.getByRole('button', { name: 'Ask A.G.' }).click(); await p.waitForTimeout(400); assert.match(await p.locator('.pm-bar').innerText(), /A\.G\.[\s\S]*Harvest # 3322/);
    for (const row of await p.locator('.pm-chips').all()) await row.getByRole('button', { name: '3', exact: true }).click(); await p.waitForTimeout(300);
    await p.getByRole('link', { name: 'Save answers' }).click(); await p.waitForTimeout(800);
    t = await text(p); assert.match(t, /Saved here/); assert.match(t, /Waiting for Lauris/); assert.eq((await state('khale')).assessments.filter(a => a.client === 'AG' && a.status === 'waiting').length, 1);
    await ctx.close();
  });

  await T.test('48 px targets and no horizontal scroll on the three phone screens at 390 px', async () => {
    await reset('live');
    const { ctx, p } = await phone('khale');
    for (const [hash, pickM] of [['/MobileApp', true], ['/MobileDictate?client=MR', false], ['/MobileAssess', false]]) {
      await go(p, hash);
      const small = await p.evaluate(() => [...document.querySelectorAll('#root button, #root a[href], #root input, #root select, #root textarea')].filter(e => e.offsetParent !== null && !e.classList.contains('pm-sr')).map(e => ({ n: (e.textContent || e.id || e.tagName).trim().slice(0, 30), h: Math.round(e.getBoundingClientRect().height) })).filter(x => x.h < 47));
      assert.deepEq(small, [], hash + ': targets under 48 px ' + JSON.stringify(small));
      const w = await p.evaluate(() => ({ s: document.documentElement.scrollWidth, i: innerWidth })); assert.ok(w.s <= w.i, `${hash}: horizontal scroll ${w.s} > ${w.i}`);
    }
    await ctx.close();
  });
} finally { await b.close(); }
await T.done();
