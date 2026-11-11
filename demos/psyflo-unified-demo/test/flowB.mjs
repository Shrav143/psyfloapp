// Flow B: a dictation saved on the phone waits in Psyflo; opening M.R.'s daily note drops it in; Process Form → 5 of 6.
// Facts only: the draft is the staffer's own words; nothing is invented (no template, objective or intervention chosen for them).
import { suite, assert, api, state, reset, playwright, errors, LAURIS, SHOTS } from './lib/index.mjs';

const T = suite('flowB');
const nt = s => { const mine = s.clients.filter(c => c.staff === 'khale'); const done = new Set(s.notes.filter(n => n.staff === 'khale' && n.type === 'daily' && n.date === s.today).map(n => n.client)); return `${mine.filter(c => done.has(c.id)).length} of ${mine.length}`; };
await reset('live');
const text = 'played basketball with M.R. after he got upset in math, he cooled down after and went back to class';
await T.test('direct support saves a dictation for a student on their caseload; one off the caseload is refused', async () => {
  assert.eq(nt(await state('khale')), '4 of 6');
  await api('dictation.save', { client: 'MR', spoken: text, rewritten: '' }, 'khale');
  assert.eq((await state('khale')).dictations.filter(d => d.client === 'MR' && d.status === 'waiting').length, 1);
  let refused = false; try { await api('dictation.save', { client: 'DW', spoken: 'x' }, 'khale'); } catch (e) { refused = e.status === 403; }
  assert.ok(refused, 'D.W. is not on K. Hale\'s caseload');
});
const { chromium } = playwright();
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = errors(p);
const panel = () => p.frameLocator('#psyflo-frame');
try {
  await p.goto(`${LAURIS}/login?as=khale&next=${encodeURIComponent('/consumers/3310/session/dpn')}`);
  await T.test('opening M.R.\'s daily note drops the dictation in as the staffer\'s own words, with questions for what was not said', async () => {
    await panel().getByText('Dictation dropped in').waitFor({ timeout: 20000 });
    const v = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#lauris-form label[for]')].map(l => [l.textContent, document.getElementById(l.htmlFor).value])));
    assert.eq(v['Narrative'].replace(/\s+/g, ' ').trim().slice(0, 60), 'Played basketball with M.R. after he got upset in math, he c');
    assert.noMatch(v['Narrative'], /6 minutes|lost the game|walked off|co-regulation|Objective 1/i, 'nothing invented');
    assert.eq(v['Mood check-in'], '', 'mood not stated'); assert.eq(v['Progress today'], '', 'progress not stated');
    assert.ok(/h|min/.test(v['Direct time']), 'direct time comes from the timer');
    assert.eq(v['Units'], '2', 'the confirmed 220 minutes = 2 units (official bands)');
    await p.screenshot({ path: SHOTS + '/flowB-1-dropped.png' });
  });
  await T.test('a person confirms the units and presses Process Form; the note counts: 5 of 6', async () => {
    await panel().getByText(/^Confirm \d units/).click();
    await p.waitForTimeout(800);
    await p.getByRole('button', { name: 'Process Form' }).click();
    await p.waitForURL(/processed=/); await p.waitForTimeout(1500);
    const s = await state('khale');
    assert.eq(nt(s), '5 of 6'); assert.eq(s.dictations.find(d => d.client === 'MR').status, 'used');
    const n = s.notes.find(n => n.client === 'MR' && n.date === s.today && n.type === 'daily' && n.session); assert.ok(n && n.session && n.consumer === 3310, 'note bound to the Lauris session and Harvest #');
    await p.screenshot({ path: SHOTS + '/flowB-2-processed.png' });
  });
  await T.test('no console errors', async () => { assert.deepEq(errs, [], errs.join(' | ')); });
} finally { await b.close(); }
await T.done();
