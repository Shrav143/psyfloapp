// Scenario S1 end to end across the surfaces (review/06 S1): phone (M.R. -> say what happened -> review -> save) -> Lauris daily note + panel
// (the dictation drops in, a person confirms the units and presses Process Form) -> the phone, Track Time and the staff count follow.
// "Processed" and "In the note" appear only after the page bridge saw a person process the note.
import { suite, assert, api, state, reset, playwright, login, errors, BASE, LAURIS, SHOTS } from './lib/index.mjs';

const T = suite('s1');
const { chromium } = playwright();
const b = await chromium.launch();
const quiet = errs => errs.filter(e => !/LANG_OFF|Parent(Schedule|Progress)/.test(e));
const done = s => { const mine = s.clients.filter(c => c.staff === 'khale'); const ok = new Set(s.notes.filter(n => n.staff === 'khale' && n.type === 'daily' && n.date === s.today).map(n => n.client)); return `${mine.filter(c => ok.has(c.id)).length} of ${mine.length}`; };
await reset('live');
const SAID = 'played basketball with M.R. after he got upset in math, he cooled down after and went back to class';
try {
  const ph = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const pe = errors(ph);
  await login(ph, 'khale', { presenter: false });
  await T.test('phone: pick M.R. (identity card), type what happened, review the draft, confirm "Save to M.R."; it is Waiting for Lauris, not processed', async () => {
    await api('time.stop', {}, 'khale').then(r => api('time.discard', { id: r.id }, 'khale')); await ph.goto(BASE + '/#/MobileApp'); await ph.waitForTimeout(900);
    assert.eq(done(await state('khale')), '4 of 6'); assert.match(await ph.locator('#root').innerText(), /4 of 6 daily notes processed today/);
    await ph.locator('.pm-chip', { hasText: 'M.R.' }).click(); await ph.waitForTimeout(300); assert.match(await ph.locator('.pm-bar').innerText(), /Harvest # 3310/);
    await ph.getByRole('link', { name: 'Type' }).click(); await ph.waitForTimeout(700);
    await ph.locator('#spoken').fill(SAID); await ph.locator('#spoken').blur(); await ph.waitForTimeout(400);
    await ph.getByRole('link', { name: 'Looks right' }).click(); await ph.waitForTimeout(300); assert.match(await ph.locator('#root').innerText(), /Save to M\.R\. \(grade 2, Campbell ES-1\)\?/);
    await ph.getByRole('link', { name: 'Save to M.R.' }).click(); await ph.waitForTimeout(800);
    const d = (await state('khale')).dictations.find(x => x.client === 'MR' && x.status === 'waiting'); assert.ok(d); assert.eq(d.spoken, SAID); assert.eq(d.harvest_no, 3310);
    assert.match(await ph.locator('#root').innerText(), /Waiting for Lauris/); assert.noMatch(await ph.locator('#root').innerText(), /Processed in Lauris/);
    await ph.screenshot({ path: SHOTS + '/s1-1-phone-waiting.png' });
  });

  const lp = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage(); const le = errors(lp);
  const panel = () => lp.frameLocator('#psyflo-frame');
  await lp.goto(`${LAURIS}/login?as=khale&next=${encodeURIComponent('/consumers/3310/session/dpn')}`);
  await T.test('Lauris: opening M.R.\'s daily note drops the waiting dictation in (yellow, the staffer\'s own words); a person confirms the units from the timer and presses Process Form', async () => {
    await panel().getByText('Dictation dropped in').waitFor({ timeout: 20000 });
    const v = await lp.evaluate(() => Object.fromEntries([...document.querySelectorAll('#lauris-form label[for]')].map(l => [l.textContent, document.getElementById(l.htmlFor).value])));
    assert.eq(v['Narrative'].replace(/\s+/g, ' ').trim().slice(0, 40), 'Played basketball with M.R. after he got'); assert.eq(v['Units'], '2'); assert.match(v['Direct time'], /3 h 40 min/);
    await panel().getByText(/^Confirm \d units/).click(); await lp.waitForTimeout(800);
    await lp.screenshot({ path: SHOTS + '/s1-2-lauris-filled.png' });
    await lp.getByRole('button', { name: 'Process Form' }).click(); await lp.waitForURL(/processed=/); await lp.waitForTimeout(1800);
    const s = await state('khale'); assert.eq(done(s), '5 of 6'); assert.eq(s.dictations.find(x => x.client === 'MR').status, 'used');
    const n = s.notes.find(x => x.client === 'MR' && x.date === s.today && x.type === 'daily' && x.session); assert.ok(n && n.consumer === 3310);
  });

  await T.test('phone and Track Time follow only after that observed event: Processed in Lauris, 5 of 6 notes, "In the note" 3 h 40 min with the same 2 units; the entries the note lists are final', async () => {
    await ph.goto(BASE + '/#/MobileApp'); await ph.waitForTimeout(1200);
    let t = await ph.locator('#root').innerText(); assert.match(t, /5 of 6 daily notes processed today/); assert.match(t, /Processed in Lauris/); assert.match(t, /Nothing waiting for Lauris/);
    await ph.locator('.pm-chip', { hasText: 'M.R.' }).click(); await ph.waitForTimeout(300);
    const figs = await ph.locator('.pm-fig').allInnerTexts(); assert.match(figs[1], /3 h 40 min/); assert.match(figs[2], /In the note[\s\S]*3 h 40 min/); assert.match(figs[3], /2 units/);
    const s = await state('khale'); const listed = s.time_entries.filter(e => e.client === 'MR' && e.dpn && e.dpn.note); assert.eq(listed.length, 5, 'the five confirmed blocks are in the note'); assert.ok(!s.time_entries.find(e => e.id === 'te-6').dpn, 'the unconfirmed block is not');
    await ph.screenshot({ path: SHOTS + '/s1-3-phone-processed.png' });
    assert.deepEq(quiet(pe), [], quiet(pe).join(' | ')); assert.deepEq(quiet(le), [], quiet(le).join(' | '));
  });
} finally { await b.close(); }
await T.done();
