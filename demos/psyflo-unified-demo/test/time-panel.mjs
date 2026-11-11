// Track Time in the extension panel (400 px, in-page mode on the mock Lauris): the same model the phone shows (test/time.mjs holds the rules).
// Timer, stopped entry to describe, four figures, correction with a reason, wrong-student protection by Harvest #, the link to the daily note,
// the running-timer strip in every view, and typing one entry into the Lauris Time Tracker (yellow; a person presses Save).
import { suite, assert, api, state, reset, lget, lpost, bridge, playwright, errors, LAURIS, SHOTS } from './lib/index.mjs';

const T = suite('time-panel');
const { chromium } = playwright();
const b = await chromium.launch();
const quiet = errs => errs.filter(e => !/LANG_OFF|Parent(Schedule|Progress)/.test(e));
async function open(staff, path) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await ctx.newPage(); const errs = errors(p);
  await p.goto(`${LAURIS}/login?as=${staff}&next=${encodeURIComponent(path)}`);
  const fr = p.frameLocator('#psyflo-frame'); await fr.locator('.ph').waitFor({ timeout: 15000 }); await p.waitForTimeout(1200);
  return { ctx, p, fr, errs };
}
const view = async fr => { await fr.getByRole('button', { name: /Track Time/ }).first().click(); await fr.locator('.t7-figs').or(fr.getByText('No timer running')).first().waitFor({ timeout: 8000 }); };
const text = fr => fr.locator('body').innerText();
const sleep = ms => new Promise(r => setTimeout(r, ms));

await reset('live');
try {
  await T.test('the panel Track Time view shows the open student, the timer, and four separate figures with the unit rule\'s source; it fits in two screens', async () => {
    const { ctx, p, fr, errs } = await open('khale', '/consumers/3310'); await view(fr);
    const t = await text(fr);
    assert.match(t, /Track Time · M\.R\./); assert.match(t, /Timing M\.R\.[\s\S]*Harvest # 3310/); assert.match(t, /Recorded time only\. A running timer is not billable\./);
    const figs = await fr.locator('.t7-fig').allInnerTexts(); assert.eq(figs.length, 4);
    assert.match(figs[0], /Recorded[\s\S]*5 h 10 min \+ running/); assert.match(figs[1], /Direct service[\s\S]*3 h 40 min/); assert.match(figs[2], /In the note[\s\S]*Not yet/); assert.match(figs[3], /Potentially billable[\s\S]*2 units[\s\S]*Officially verified/);
    assert.match(t, /Billable only after the note is processed and an authorization covers it/); assert.match(t, /1 block to confirm \(1 h 30 min, not counted\)/);
    assert.ok(await fr.locator('.t7-figs').first().evaluate(() => document.documentElement.scrollHeight) <= 1500, 'two screens or less');
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/time-panel-1-view.png' });
    assert.deepEq(quiet(errs), [], quiet(errs).join(' | ')); await ctx.close();
  });

  await T.test('pause, resume, stop: the stopped interval is kept as an entry to describe (never lost, not direct time); saving needs words and then moves direct time and units by the rule', async () => {
    await reset('live');
    const { ctx, p, fr } = await open('khale', '/consumers/3310'); await view(fr);
    await fr.getByRole('button', { name: 'Pause' }).click(); await fr.getByText('Paused M.R.').waitFor(); await fr.getByRole('button', { name: 'Resume' }).click(); await fr.getByText('Timing M.R.').waitFor();
    await fr.getByRole('button', { name: 'Stop' }).click(); await fr.getByText(/^Stopped · M\.R\./).waitFor();
    let s = await state('khale'); const d = s.time_entries.find(e => e.status === 'draft'); assert.ok(d && d.source === 'timer' && !d.confirmed); assert.match(await text(fr), /Recorded, not counted yet/);
    await fr.getByRole('button', { name: 'Save time' }).click(); await sleep(400); assert.match(await text(fr), /Say what you did/); assert.eq((await state('khale')).time_entries.find(e => e.id === d.id).status, 'draft');
    await fr.locator(`#t7-w-${d.id}`).fill('Support during afternoon classes'); await fr.getByRole('button', { name: 'Save time' }).click(); await sleep(900);
    s = await state('khale'); assert.eq(s.time_entries.find(e => e.id === d.id).status, 'saved');
    const figs = await fr.locator('.t7-fig').allInnerTexts(); assert.match(figs[1], /5 h 18 min/); assert.match(figs[3], /3 units/);
    assert.match(await text(fr), /No timer running/); await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/time-panel-2-after-save.png' }); await ctx.close();
  });

  await T.test('manual correction in the panel: a reason is required; the earlier version is kept; the figures follow the new version', async () => {
    await reset('live');
    const { ctx, p, fr } = await open('khale', '/consumers/3310'); await view(fr);
    await fr.getByText("Today's entries").click(); await fr.getByRole('button', { name: 'Correct' }).nth(4).click();   // 1:10–1:40 pm
    await fr.locator('#t7-ee').fill('13:45'); await fr.getByRole('button', { name: 'Save correction' }).click(); await sleep(400); assert.match(await text(fr), /Say why it is being corrected/);
    await fr.locator('#t7-er').fill('Walk ran five minutes longer'); await fr.getByRole('button', { name: 'Save correction' }).click(); await sleep(900);
    const s = await state('khale'); const nw = s.time_entries.find(e => e.corrected_from === 'te-5'); assert.ok(nw && nw.minutes === 35 && nw.reason === 'Walk ran five minutes longer'); assert.eq(s.time_entries.find(e => e.id === 'te-5').superseded_by, nw.id);
    assert.match((await fr.locator('.t7-fig').allInnerTexts())[1], /3 h 45 min/); assert.match(await text(fr), /Corrected/); await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/time-panel-3-corrected.png' }); await ctx.close();
  });

  await T.test('wrong student: with another student open in Lauris the timer says whose it is and offers a switch; nothing starts for the wrong Harvest #', async () => {
    await reset('live');
    const { ctx, p, fr } = await open('khale', '/consumers/3315'); await view(fr);
    let t = await text(fr); assert.match(t, /Timing M\.R\./); assert.match(t, /The open Lauris page is J\.T\.; the timer is with M\.R\./); assert.match(t, /Today with J\.T\./i, 'the figures are for the open student');
    await fr.getByRole('button', { name: 'Switch to J.T.' }).click(); await sleep(900);
    const s = await state('khale'); assert.eq(s.timers.khale.client, 'JT'); assert.ok(s.time_entries.some(e => e.client === 'MR' && e.status === 'draft'), 'M.R.\'s time was kept as a stopped entry');
    assert.match(await text(fr), /Timing J\.T\./); await ctx.close();
  });

  await T.test('link to the daily note: linked is not documented; once the note is processed in Lauris the entries are "In the note" and final (no Correct, no Discard)', async () => {
    await reset('live');
    const { ctx, p, fr } = await open('khale', '/consumers/3310'); await view(fr);
    await fr.getByRole('button', { name: /^Link 5 confirmed/ }).click(); await sleep(900);
    let t = await text(fr); assert.match(t, /5 entries are linked/); assert.match((await fr.locator('.t7-fig').allInnerTexts())[2], /Not yet|linked/); assert.noMatch(t, /Processed in Lauris/);
    const FULL = ['8:05 am–8:35 am · Morning check-in, classroom', '9:50 am–11:05 am · In-class support, math & reading', '11:40 am–12:25 pm · Lunch support', '12:25 pm–1:05 pm · Recess and transition', '1:10 pm–1:40 pm · Movement intervention + co-regulation walk'].join('\n');
    const vals = { 'Direct time': '3 h 40 min', 'Units': '2', 'Contact time': FULL, 'Narrative': 'Worked with M.R. today.' };
    const pr = await lpost('/consumers/3310/session/dpn', 'khale', { action: 'process', f2: vals['Direct time'], f3: vals['Units'], f4: vals['Contact time'], f9: vals.Narrative }); const sid = pr.loc.match(/processed=(\d+)/)[1];
    const j = await bridge('lauris.observed', { event: 'processed', session: sid, form: 'dpn', consumer: { no: '3310', initials: 'M.R.' }, values: vals, typed: [], user: 'K. Hale' }); assert.ok(j.ok, j.error);
    await sleep(1500); t = await text(fr);
    assert.match((await fr.locator('.t7-fig').allInnerTexts())[2], /3 h 40 min[\s\S]*Processed in Lauris/); assert.match(t, /Its time is final/);
    await fr.getByText("Today's entries").click(); assert.eq(await fr.getByText('In the note', { exact: true }).count() >= 5, true, 'five entries are in the note');
    assert.eq(await fr.getByRole('button', { name: 'Correct' }).count(), 1, 'only the unconfirmed block can still change'); await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/time-panel-4-documented.png' }); await ctx.close();
  });

  await T.test('the running timer shows as one line in every other view (the home view here), and the Track Time button there opens the view', async () => {
    await reset('live');
    const { ctx, fr } = await open('khale', '/consumers/3310'); const mini = fr.locator('.mini'); await mini.waitFor();
    assert.match(await mini.innerText(), /Timing M\.R\. · 1 h 3\d min/); await mini.getByRole('button', { name: 'Track Time' }).click(); await fr.locator('.t7-figs').waitFor(); assert.match(await text(fr), /Track Time · M\.R\./); await ctx.close();
  });

  await T.test('who may open it: a supervisor and an administrator do not get Track Time (a reason, not a blank); a clinician does', async () => {
    for (const [who, ok] of [['cdiaz', false], ['jperez', true]]) {
      const { ctx, p, fr } = await open(who, '/consumers/3310');
      await p.evaluate(() => document.getElementById('psyflo-frame').contentWindow.postMessage({ psyflo: 'present', cmd: 'view', view: 'time' }, '*')); await sleep(900);
      const t = await text(fr); if (ok) assert.match(t, /Track Time/); else { assert.match(t, /Track Time is for the staff who work with students/); assert.eq(await fr.locator('.t7-figs').count(), 0); }
      await ctx.close();
    }
  });

  await T.test('the Lauris Time Tracker: Track Time types one entry into the open form (yellow) and a person presses Save Time Entry; the page reports a saved entry, not units', async () => {
    await reset('live');
    const { ctx, p, fr } = await open('khale', '/time?consumer=3310'); await view(fr);
    await fr.getByText("Today's entries").click(); await fr.getByRole('button', { name: 'Type into Time Tracker' }).nth(4).click(); await sleep(2500);
    const v = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#lauris-form label[for]')].map(l => { const e = document.getElementById(l.htmlFor); return [l.textContent, [e.value, e.dataset.psyflo || '']]; })));
    assert.deepEq(v['Start'], ['13:10', 'typed']); assert.deepEq(v['End'], ['13:40', 'typed']); assert.deepEq(v['Minutes'], ['30', 'typed']); assert.eq(v['Activity'][0], 'Movement intervention + co-regulation walk'); assert.eq(v['Activity'][1], 'typed');
    await p.getByRole('button', { name: 'Save Time Entry' }).click(); await p.waitForURL(/timesaved=/); await sleep(1800);
    const s = await state('jperez'); assert.ok(s.events.some(e => /time saved in Lauris/.test(e.what) && e.actor_kind === 'bridge'), 'the page bridge saw a person save it');
    const lv = s.lauris_versions.at(-1); assert.eq(lv.form, 'time'); assert.eq(lv.event, 'saved'); assert.ok(lv.kept.length >= 4 || lv.filled && Object.keys(lv.filled).length >= 4, 'Psyflo kept what was saved and compared it with what it typed');
    assert.eq((await state('khale')).time_entries.length, 6, 'saving in Lauris created no Psyflo time entry and no units'); await ctx.close();
  });
} finally { await b.close(); }
await T.done();
