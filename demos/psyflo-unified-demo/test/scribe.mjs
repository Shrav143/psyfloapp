// Scribe (E5): guidance asks and never answers for the person; a recording needs a recorded consent; a draft box without stored evidence cannot be accepted
// as it stands; the review has no accept-all; the person's own words are what gets typed; nothing is typed before Approve; Process Form is the person's click.
import { suite, assert, api, tryApi, state, reset, playwright, errors, LAURIS, SHOTS } from './lib/index.mjs';
import { dailyGuidance, weeklyGuidance, collateralGuidance, tidySentence } from '../web/js/shared/enhance.js';
import { timeSummary } from '../web/js/shared/time.js';

const T = suite('scribe');
const item = (id, label, psyflo, sources) => ({ id, label, staff: '', psyflo, sources });
const IN = { n: 1, kind: 'input', label: 'What you said', quote: 'x' };

// ------------------------------------------------------------------ guidance (pure)
await T.test('daily guidance: only what was not said is a question; "observed" is flagged, never replaced; nothing is invented', async () => {
  const client = { initials: 'M.R.', goals: [{ n: 1, name: 'strategy', objective: 'Use a taught strategy', interventions: ['Clinical 2.1'] }] };
  const interventions = [{ code: 'Clinical 2.1', name: 'Movement' }];
  const empty = dailyGuidance('', { client, interventions }); assert.eq(empty.questions.length, 5, 'five questions before anything is said'); assert.ok(empty.empty);
  const said = 'Worked on Objective 1 with a Movement break for 20 minutes. M.R. calmed down and used the card twice.';
  const g = dailyGuidance(said, { client, interventions }); assert.eq(g.questions.length, 0, JSON.stringify(g.questions));
  const ex = dailyGuidance('played basketball with M.R. after he got upset in math, he cooled down after and went back to class', { client, interventions });
  assert.deepEq(ex.questions.map(q => q.key).sort(), ['duration', 'intervention', 'objective', 'progress'], 'the worked example leaves four questions');
  const ob = dailyGuidance('Observed M.R. in math for 30 minutes', { client, interventions }); assert.ok(ob.questions.some(q => q.flag === 'observed' && /What did you do/.test(q.q)));
  assert.eq(tidySentence('played basketball  with M.R.'), 'Played basketball with M.R.', 'tidy changes case and spacing only');
  assert.eq(weeklyGuidance('', { client }).questions.length, 4); assert.eq(collateralGuidance('', { client }).questions.length, 4);
});

// ------------------------------------------------------------------ recording consent
await reset('live');
await T.test('recording needs a recorded consent; declined means typing; the consent keeps who agreed and when', async () => {
  const draft = { client: 'MR', form: 'weekly', input: { kind: 'transcript', text: 'call text' }, items: [item('discussed', 'What was discussed', 'Call text.', [IN])] };
  await assert.refused(tryApi('scribe.draft', draft, 'khale'), /needs a recorded consent/, 409);
  await api('scribe.consent', { client: 'MR', form: 'weekly', kind: 'declined', present: [] }, 'khale');
  await assert.refused(tryApi('scribe.draft', draft, 'khale'), /needs a recorded consent/, 409);
  await assert.refused(tryApi('scribe.consent', { client: 'MR', form: 'weekly', kind: 'given', present: [] }, 'khale'), /Say who agreed/, 422);
  await api('scribe.consent', { client: 'MR', form: 'weekly', kind: 'given', present: ['Guardian'] }, 'khale');
  await api('scribe.draft', draft, 'khale');
  const s = await state('khale'); const c = s.recording_consents.at(-1);
  assert.ok(c.kind === 'given' && c.present[0] === 'Guardian' && c.by === 'khale' && /^2026-10-29T/.test(c.at) && c.mode === 'recording', JSON.stringify(c));
  assert.ok(s.events.some(e => /Recording consent given/.test(e.what)), 'audited');
  await api('scribe.draft', { ...draft, input: { kind: 'typed', text: 'typed instead' } }, 'khale');    // typing never needs one
});

// ------------------------------------------------------------------ the draft review: evidence, decisions, roles
await T.test('a box whose source does not resolve is "Evidence missing" and cannot be accepted as it stands; an edit by the person can; there is no accept-all', async () => {
  const items = [item('a', 'Narrative', 'He did great.', [{ n: 1, kind: 'note', ref: 'note-that-does-not-exist', label: 'A note' }]), item('b', 'Mood check-in', 'Calm.', [IN])];
  const { key, missing } = await api('scribe.draft', { client: 'MR', form: 'dpn', input: { kind: 'typed', text: 'x' }, items }, 'khale'); assert.eq(missing, 1);
  let d = (await state('khale')).doc_versions.find(x => x.key === key);
  assert.ok(d.items[0].missing && /^Evidence missing — verify/.test(d.items[0].text) && d.items[0].sources.length === 0, 'the sentence is not kept as evidence: ' + d.items[0].text);
  await assert.refused(tryApi('scribe.decide', { key, item: 'a', state: 'accepted' }, 'khale'), /no stored evidence/, 422);
  await assert.refused(tryApi('scribe.approve', { key }, 'khale'), /still need a decision/, 422);
  await assert.refused(tryApi('scribe.filled', { key }, 'khale'), /Approve the draft/, 422);
  await api('scribe.decide', { key, item: 'a', state: 'edited', text: 'Used the break card twice.' }, 'khale');
  await api('scribe.decide', { key, item: 'b', state: 'rejected' }, 'khale');
  await api('scribe.decide', { key, item: 'a', restore: true }, 'khale'); d = (await state('khale')).doc_versions.find(x => x.key === key);
  assert.ok(/^Evidence missing/.test(d.items[0].text) && d.items[0].state === 'pending', 'restore previous wording');
  await api('scribe.decide', { key, item: 'a', state: 'edited', text: 'Used the break card twice.' }, 'khale');
  const r = await api('scribe.approve', { key }, 'khale');
  assert.deepEq(r.boxes, [{ label: 'Narrative', value: 'Used the break card twice.' }], 'only decided boxes, in the person\'s wording');
  await api('scribe.filled', { key, labels: ['Narrative'] }, 'khale');
  d = (await state('khale')).doc_versions.find(x => x.key === key);
  assert.ok(['original', 'draft', 'edited', 'approved', 'filled'].every(x => d.stages.some(s => s.stage === x)), 'version history: ' + d.stages.map(s => s.stage));
});
await T.test('roles: direct support drafts only notes for their own caseload; clinical drafts are clinicians\'; admin and supervisor draft nothing', async () => {
  const items = [item('n', 'Narrative', 'x.', [IN])]; const base = { input: { kind: 'typed', text: 'x' }, items };
  await assert.refused(tryApi('scribe.draft', { ...base, client: 'DW', form: 'dpn' }, 'khale'), /not allowed/i, 403);
  await assert.refused(tryApi('scribe.draft', { ...base, client: 'TW', form: 'isp' }, 'khale'), /(not allowed|for clinicians)/i, 403);
  await assert.refused(tryApi('scribe.draft', { ...base, client: 'MR', form: 'dpn' }, 'dowens'), /not allowed/i, 403);
  await assert.refused(tryApi('scribe.draft', { ...base, client: 'MR', form: 'dpn' }, 'cdiaz'), /not allowed/i, 403);
  await api('scribe.draft', { ...base, client: 'MR', form: 'dpn' }, 'jperez');
  const s = await state('khale'); assert.ok(s.doc_versions.every(d => d.by === 'khale'), 'direct support sees only their own drafts');
  assert.eq((await state('dowens')).doc_versions.length, 0); assert.eq((await state('cdiaz')).doc_versions.length, 0);
  await assert.refused(tryApi('scribe.decide', { key: (await state('jperez')).doc_versions.find(d => d.by === 'jperez').key, item: 'n', state: 'accepted' }, 'khale'), /belongs to the person/, 403);
});

// ------------------------------------------------------------------ the panel
await reset('live');
const { chromium } = playwright();
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = errors(p);
const panel = () => p.frameLocator('#psyflo-frame');
const frame = () => p.frames().find(f => f.url().includes('/panel/'));
const form = () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#lauris-form label[for]')].map(l => [l.textContent, document.getElementById(l.htmlFor).value])));
try {
  await p.goto(`${LAURIS}/login?as=khale&next=${encodeURIComponent('/consumers/3310/session/dpn')}`); await p.waitForTimeout(1800);
  await T.test('the daily note starts from what the staffer says: guidance shows only what is unanswered, and nothing is typed yet', async () => {
    await panel().getByText('Say what happened').first().waitFor();
    const v = await form(); assert.eq(v['Narrative'], '', 'nothing typed before the person acts');
    await panel().getByText(/Still to answer/).first().waitFor();
    const open0 = await panel().locator('#sg .cr:not(.done)').count(); assert.eq(open0, 4, 'four questions: the timer already answers how long');
    await panel().locator('textarea[data-in="sayText"]').fill('Worked on Objective 1 with M.R. for 20 minutes. He calmed down and used the break card twice.');
    await p.waitForTimeout(500);
    const open1 = await panel().locator('#sg .cr:not(.done)').allInnerTexts(); assert.eq(open1.length, 1, 'one question left: ' + open1.join('|')); assert.match(open1[0], /What did you do with M\.R\./);
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/scribe-dpn-guidance.png' }).catch(() => { });
  });
  await T.test('Draft it opens the three-way review; no box is typed until Approve and fill; the typed words are the person\'s own', async () => {
    await panel().getByRole('button', { name: 'Draft it' }).click();
    await panel().getByText(/Reviewed/).first().waitFor();
    assert.eq((await form())['Narrative'], '', 'a draft is not typed');
    assert.ok(await panel().getByRole('button', { name: 'Approve and fill' }).isDisabled(), 'disabled until every box has a decision');
    assert.eq(await panel().getByRole('button', { name: /^Accept all/ }).count(), 0, 'there is no accept-all');
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/scribe-dpn-review.png' }).catch(() => { });
    await panel().getByRole('button', { name: /Accept the \d+ with sources/ }).click();
    await panel().getByRole('button', { name: 'Approve and fill' }).click();
    await panel().getByText(/boxes? typed into the form/).first().waitFor({ timeout: 20000 });
    const v = await form(); assert.eq(v['Narrative'], 'Worked on Objective 1 with M.R. for 20 minutes. He calmed down and used the break card twice.');
    assert.match(v['Objective addressed'], /^Obj\. 1/); assert.eq(v['Units'], '2', 'the confirmed 220 minutes under the unit bands'); assert.eq(v['Mood check-in'], '', 'mood not said: left empty');
    const s = await state('khale'); const d = s.doc_versions.at(-1);
    assert.ok(d.stages.some(x => x.stage === 'approved') && d.stages.at(-1).stage === 'filled' && d.lauris_status === 'filled');
  });
  await T.test('Process Form is the person\'s click: the version reads Synchronized only after the observed event', async () => {
    assert.ok(!(await state('khale')).doc_versions.at(-1).stages.some(x => x.stage === 'processed'));
    await p.getByRole('button', { name: 'Process Form' }).click(); await p.waitForURL(/processed=/); await p.waitForTimeout(1500);
    const d = (await state('khale')).doc_versions.at(-1); assert.eq(d.lauris_status, 'processed'); assert.eq(d.stages.at(-1).src, 'bridge');
  });
  await T.test('recording asks for consent first; "Type instead" records a refusal and nothing starts', async () => {
    await p.goto(`${LAURIS}/login?as=khale&next=${encodeURIComponent('/consumers/3315/session/dpn')}`); await p.waitForTimeout(1800);
    await panel().getByRole('button', { name: /Record \(microphone\)/ }).click();
    await panel().getByText('Before you record').waitFor();
    assert.eq(await panel().getByText(/Listening/).count(), 0, 'no recording before the consent');
    await panel().getByRole('button', { name: 'Type instead' }).click(); await p.waitForTimeout(700);
    const c = (await state('khale')).recording_consents.at(-1); assert.ok(c.kind === 'declined' && c.client === 'JT' && c.by === 'khale');
    assert.eq(await panel().getByText(/Listening/).count(), 0);
  });
  await T.test('weekly guardian contact: the guardian and date Lauris already holds (green) are left alone; only the staffer\'s words are typed', async () => {
    await p.goto(`${LAURIS}/login?as=khale&next=${encodeURIComponent('/consumers/3310/session/weekly')}`); await p.waitForTimeout(1800);
    const before = await form(); assert.ok(before['Contact with'] && before['Date'], 'Lauris prefills them');
    await panel().locator('textarea[data-in="sayText"]').fill('Spoke with grandmother for 12 minutes about the break card at home. She will practice it after dinner and we will talk again next Tuesday.');
    await panel().getByRole('button', { name: 'Draft it' }).click();
    await panel().getByText(/Reviewed/).first().waitFor();
    await panel().getByRole('button', { name: /Accept the \d+ with sources/ }).click();
    await panel().getByRole('button', { name: 'Approve and fill' }).click();
    await panel().getByText(/boxes? typed into the form/).first().waitFor({ timeout: 20000 });
    const v = await form(); assert.eq(v['Contact with'], before['Contact with'], 'green box untouched'); assert.eq(v['Date'], before['Date']);
    assert.match(v['What was discussed'], /^Spoke with grandmother for 12 minutes about the break card at home\./); assert.eq(v['Duration'], '12 min');
    assert.eq(v['Follow-up'], '', 'what was not separated out is left for the person');
  });
  await T.test('the NOTE selector keeps the type the person picks; a page that cannot take it says so and offers to open that form (it used to be put back silently)', async () => {
    await p.goto(`${LAURIS}/login?as=khale&next=${encodeURIComponent('/consumers/3310/session/weekly')}`); await p.waitForTimeout(1800);
    const sel = panel().locator('#sc-type'); assert.eq(await sel.inputValue(), 'weekly', 'starts on the page\'s own form');
    await sel.selectOption('collateral'); await p.waitForTimeout(600);
    assert.eq(await sel.inputValue(), 'collateral', 'the choice stays'); await p.waitForTimeout(1500); assert.eq(await sel.inputValue(), 'collateral', 'and stays after the panel repaints');
    const t = (await panel().locator('#panel').innerText()).replace(/\s+/g, ' ');
    assert.match(t, /The page open in Lauris is the Weekly guardian contact, so nothing can be typed for this note type/); assert.match(t, /Open the monthly collateral/i);
    assert.eq(await panel().getByText(/Draft it/).count(), 0, 'no drafting for a type the open page cannot take');
    await panel().getByRole('button', { name: /Open the monthly collateral/i }).click(); await p.waitForURL(/session\/collateral/); await p.waitForTimeout(1500);
    assert.eq(await panel().locator('#sc-type').inputValue(), 'collateral', 'on the page that takes it, the type matches');
  });
  // Confirm and "didn't happen" go through the time model (time.save / time.discard), so the note, Track Time and the phone always show the same minutes.
  const sumOf = async () => { const s = await state('khale'); const t = timeSummary(s, 'MR', s.today, { staff: 'khale' }); return { s, t }; };
  await reset('live');
  await p.goto(`${LAURIS}/login?as=khale&next=${encodeURIComponent('/consumers/3310/session/dpn')}`); await p.waitForTimeout(1800);
  await T.test('Confirm saves the block through time.save: the entries, the note boxes and the units all say 5 h 10 min / 3 units; before it, the 90-minute block is not counted', async () => {
    const v0 = await form(); assert.noMatch(v0['Contact time'] || '', /Afternoon classes|unconfirmed/, 'the unconfirmed block is not in the typed Contact time');
    await panel().getByText(/Contact time . your timer/).first().waitFor(); assert.ok(await panel().getByText(/Afternoon classes/).count() >= 1, 'the panel lists it (flagged), not the note');
    let { t } = await sumOf(); assert.eq(t.direct, 220, 'seeded confirmed time'); assert.eq(t.units, 2); assert.eq(t.unconfirmed.length, 1, 'the afternoon block starts unconfirmed'); assert.eq(t.unconfirmed[0].minutes, 90);
    await panel().getByText(/^Confirm 3 units/).click(); await p.waitForTimeout(1500);
    const r = await sumOf(); assert.eq(r.t.unconfirmed.length, 0); assert.eq(r.t.direct, 310); assert.eq(r.t.units, 3);
    const v = await form(); assert.eq(v['Direct time'], '5 h 10 min'); assert.eq(v['Units'], '3', 'the note says what the entries say');
    assert.noMatch(v['Contact time'], /unconfirmed/, 'the confirmed block is no longer marked unconfirmed'); assert.match(v['Contact time'], /1:40 pm\u20133:10 pm . Afternoon classes/, 'listed only after the person pressed Confirm');
    assert.eq(await panel().getByText(/^Confirm \d units/).count(), 0, 'nothing left to confirm');
  });
  await reset('live');
  await p.goto(`${LAURIS}/login?as=khale&next=${encodeURIComponent('/consumers/3310/session/dpn')}`); await p.waitForTimeout(1800);
  await T.test('"The afternoon block didn\'t happen" voids the entry through time.discard (kept in the record with its reason); the note says 3 h 40 min / 2 units', async () => {
    await panel().getByRole('button', { name: /afternoon block didn't happen/ }).click(); await p.waitForTimeout(1500);
    const { s, t } = await sumOf(); const e = s.time_entries.find(x => x.id === 'te-6');
    assert.eq(e.status, 'voided'); assert.ok(e.void_reason && e.void_reason.length >= 4, 'a reason is kept'); assert.eq(t.direct, 220); assert.eq(t.units, 2); assert.eq(t.entries.length, 5);
    const v = await form(); assert.eq(v['Direct time'], '3 h 40 min'); assert.eq(v['Units'], '2'); assert.noMatch(v['Contact time'], /Afternoon classes/);
  });
  await T.test('a supervisor cannot confirm time: the server refuses the call and the block stays unconfirmed', async () => {
    await reset('live');
    await assert.refused(tryApi('time.save', { id: 'te-6', confirm: true }, 'cdiaz'), /./, 403);
    assert.eq((await sumOf()).t.unconfirmed.length, 1, 'still unconfirmed');
  });
  await T.test('no console errors in the page or the panel', async () => { assert.deepEq(errs, [], errs.join(' | ')); });
} finally { await b.close(); }
await T.done();
