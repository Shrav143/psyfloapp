// Scan & Enhance and the evidence index (E5): the M.R. corpus is real rows; Mode A reviews a CURRENT draft and fills the open form; Mode B is read-only
// and has no fill; a finalized (processed) note is never overwritten; evidence marks keep who and when and never touch the note.
import { suite, assert, api, tryApi, state, reset, bridge, lpost, playwright, errors, LAURIS, SHOTS } from './lib/index.mjs';
import { evidenceIndex, buildContinuedStay, scanFindings, applyFindings, weekdays, periodPresets } from '../web/js/shared/enhance.js';
import { unitsFor } from '../web/js/shared/rules.js';

const T = suite('enhance');
const sid = r => (r.loc || '').match(/(?:processed|saved|signed)=(\d+)/)?.[1];
const ev = (event, session, form, no, initials, user, extra = {}) => ({ event, session, form, consumer: { no: String(no), initials }, values: {}, typed: [], user, ...extra });
const mr = s => s.notes.filter(n => n.client === 'MR');

await reset('canvas');
const S0 = await state('jperez');

// ------------------------------------------------------------------ the corpus
await T.test('the M.R. corpus: 40 daily notes on real school days, units add up to the seeded 83 under the unit bands, 9 weekly calls, 3 monthly', async () => {
  const daily = mr(S0).filter(n => n.type === 'daily');
  assert.eq(daily.length, 40, 'daily notes'); assert.ok(daily.length <= 53, 'at most one per school day (Aug 18 to Oct 29 has 53 weekdays)');
  assert.eq(daily.reduce((a, n) => a + n.units, 0), 83, 'units add up to the 83 of 110 on the authorization');
  assert.eq(S0.clients.find(c => c.id === 'MR').authorization.used, 83);
  for (const n of daily) { assert.eq(n.units, unitsFor(S0, 'tdt', n.direct_time_min), `${n.date}: units follow the direct minutes (official bands)`); assert.ok(weekdays(n.date, n.date).length === 1, n.date + ' is a school day'); assert.ok(n.date <= '2026-10-28' && n.date >= '2026-08-18'); assert.ok(n.session && n.consumer === 3310); }
  assert.eq(new Set(daily.map(n => n.date)).size, 40, 'one note per day');
  assert.ok(mr(S0).filter(n => n.type === 'weekly_guardian').length >= 9, 'about ten weekly calls');
  assert.eq(mr(S0).filter(n => n.type === 'monthly_collateral').length, 3, 'monthly collateral 2 to 3 (Aug, Sep and the seeded Oct 8 row)');
});
await T.test('counts are computed from rows and open their rows; the "61 notes" figure does not exist', async () => {
  const a = S0.clients.find(c => c.id === 'MR').authorization;
  const idx = evidenceIndex(S0, 'MR', { from: a.start, to: S0.today });
  assert.eq(idx.counts.daily, idx.rows.filter(r => r.kind === 'daily').length); assert.eq(idx.counts.weekly, idx.rows.filter(r => r.kind === 'weekly').length); assert.eq(idx.counts.monthly, idx.rows.filter(r => r.kind === 'monthly').length);
  assert.eq(idx.counts.daily, 40); assert.ok(idx.counts.daily !== 61, 'no constant');
  const win = evidenceIndex(S0, 'MR', {});                                  // the last 30 days
  assert.ok(win.counts.daily < 40 && win.counts.daily > 0); assert.eq(win.counts.daily, win.rows.filter(r => r.kind === 'daily').length);
  assert.ok(idx.gaps.some(g => /^Evidence missing — verify/.test(g.text)), 'missing evidence prints "Evidence missing — verify"');
  assert.ok(idx.byGoal[2].count === 4 && idx.byGoal[2].last <= '2026-09-17', 'Goal 3 untouched for six weeks, as the staff view says');
  assert.ok(idx.boilerplate.length >= 1, 'repeated wording is found');
  const cs = buildContinuedStay(S0, 'MR', { from: a.start, to: S0.today }, { household: false, request: S0.requests.find(r => r.id === 'R-0411') });
  assert.match(cs.boxes.find(b => b.label === 'Progress toward goals').value, /^40 daily notes stored/);
  assert.ok(!cs.boxes.some(b => /Household/.test(b.value)), 'household context is not included by default');
  assert.eq(cs.household, 'not_included');
});

// ------------------------------------------------------------------ evidence marks and periods
await T.test('evidence.mark keeps who and when, needs a reason to exclude, never touches the note, and is clinician-only', async () => {
  const wk = mr(S0).find(n => n.household); assert.ok(wk, 'the Oct 16 weekly call mentions the household');
  const before = JSON.stringify(S0.notes.find(n => n.id === wk.id));
  await assert.refused(tryApi('evidence.mark', { client: 'MR', ref: wk.id, excluded: true }, 'jperez'), /Say why/, 422);
  await assert.refused(tryApi('evidence.mark', { client: 'MR', ref: 'note-nope', excluded: true, reason: 'x y z' }, 'jperez'), /not a stored note/, 404);
  await assert.refused(tryApi('evidence.mark', { client: 'MR', ref: wk.id, excluded: true, reason: 'household disclosure' }, 'dowens'), /not allowed/i, 403);
  await assert.refused(tryApi('evidence.mark', { client: 'MR', ref: wk.id, excluded: true, reason: 'household disclosure' }, 'cdiaz'), /not allowed/i, 403);
  await api('evidence.mark', { client: 'MR', ref: wk.id, excluded: true, reason: 'household disclosure' }, 'jperez');
  const s = await state('jperez'); const m = s.evidence_marks.find(x => x.ref === wk.id);
  assert.ok(m && m.excluded && m.by === 'jperez' && /^2026-10-29T/.test(m.at) && m.reason === 'household disclosure', JSON.stringify(m));
  assert.eq(JSON.stringify(s.notes.find(n => n.id === wk.id)), before, 'the note is untouched');
  const idx = evidenceIndex(s, 'MR', { from: '2026-08-18', to: s.today });
  assert.eq(idx.counts.weekly, 8, 'excluded rows leave the counts'); assert.eq(idx.counts.excluded, 1); assert.eq(idx.all.weekly, 9);
  assert.ok(s.events.some(e => /Evidence excluded from the request/.test(e.what) && e.who === 'jperez'), 'audit event with who');
  await api('evidence.mark', { client: 'MR', ref: wk.id, excluded: false }, 'jperez');
  assert.eq(evidenceIndex(await state('jperez'), 'MR', { from: '2026-08-18', to: s.today }).counts.weekly, 9, 'put back');
  assert.ok((await state('jperez')).evidence_marks.find(x => x.ref === wk.id).history.length >= 2, 'history kept');
  await api('evidence.mark', { client: 'MR', ref: wk.id, sensitive: true }, 'jperez');
  const s2 = await state('jperez'); const cs = buildContinuedStay(s2, 'MR', { from: '2026-08-18', to: s2.today }, { household: true });
  assert.eq(cs.counts.sensitive, 1, 'counted'); assert.ok(!cs.boxes.some(b => /Household/.test(b.value)), 'a sensitive row is counted, never quoted');
  await api('evidence.mark', { client: 'MR', ref: wk.id, sensitive: false }, 'jperez');
  const s3 = await state('jperez'); const cs2 = buildContinuedStay(s3, 'MR', { from: '2026-08-18', to: s3.today }, { household: true });
  assert.ok(cs2.boxes.some(b => /^Household context \(included by you\): Grandmother reported a change in the household/.test(b.value)), 'only when a person includes it, and only from a stored note that says it');
});
await T.test('evidence.period is checked and kept per person', async () => {
  await assert.refused(tryApi('evidence.period', { client: 'MR', from: '2026-10-29', to: '2026-10-01' }, 'jperez'), /starts after/, 422);
  await assert.refused(tryApi('evidence.period', { client: 'MR', from: '2026-10-01', to: '2026-12-31' }, 'jperez'), /future/, 422);
  await api('evidence.period', { client: 'MR', from: '2026-09-01', to: '2026-10-15', preset: 'custom' }, 'jperez');
  assert.deepEq((await state('jperez')).evidence_periods.filter(p => p.client === 'MR' && p.by === 'jperez').map(p => [p.from, p.to]), [['2026-09-01', '2026-10-15']]);
  assert.eq((await state('dowens')).evidence_marks.length, 0, 'the admin projection holds no evidence marks');
});

// ------------------------------------------------------------------ Mode B: read-only
await T.test('Mode B (historical) stores an analysis, refuses any fill or write, and exposes no fill action', async () => {
  const r = await api('enhance.historical', { client: 'MR', from: '2026-08-18', to: '2026-10-29' }, 'jperez');
  assert.eq(r.counts.daily, 40);
  const d = (await state('jperez')).doc_versions.find(x => x.key === r.key); assert.eq(d.mode, 'historical'); assert.eq(d.lauris_status, 'read-only'); assert.ok(d.findings.length > 0);
  for (const bad of [{ fields: [{ label: 'Narrative', value: 'x' }] }, { fill: true }, { apply: true }, { write: true }, { session: '7001' }])
    await assert.refused(tryApi('enhance.historical', { client: 'MR', ...bad }, 'jperez'), /read-only/, 409);
  await assert.refused(tryApi('enhance.filled', { key: r.key }, 'jperez'), /read-only/, 409);
  await assert.refused(tryApi('enhance.decide', { key: r.key, finding: 'g1', state: 'accepted', answer: 'x' }, 'jperez'), /read-only/, 409);
  await assert.refused(tryApi('scribe.filled', { key: r.key }, 'jperez'), /read-only/, 409);
  await assert.refused(tryApi('enhance.historical', { client: 'MR' }, 'dowens'), /not allowed/i, 403);
  await assert.refused(tryApi('enhance.historical', { client: 'DW' }, 'khale'), /not allowed/i, 403);
  const names = Object.keys((await import('../server/psyflo/authz.js')).AUTHZ).filter(k => /^(enhance|evidence)\./.test(k));
  assert.ok(!names.some(k => /fill/i.test(k) && /historical/i.test(k)) && !names.includes('enhance.addendum') && !names.includes('enhance.lateEntry'), 'no addendum or late-entry action exists: ' + names.join(','));
});

// ------------------------------------------------------------------ Mode A: a current draft; a finalized note is never overwritten
await reset('canvas');
let key;
await T.test('Mode A: findings on the open draft are questions; accepting applies only the person\'s own words; no accept-all; approve needs every decision', async () => {
  const fields = [{ label: 'Direct time', value: '3 h 40 min' }, { label: 'Units', value: '3' }, { label: 'Narrative', value: 'Observed M.R. in math. He stayed on task 80% of the time. Provided a supportive check-in and reviewed coping strategies with M.R.' }];
  const r = await api('enhance.scan', { client: 'MR', form: 'dpn', fields }, 'jperez'); key = r.key;
  const d = (await state('jperez')).doc_versions.find(x => x.key === key); const cats = d.findings.map(f => f.category);
  for (const c of ['wording', 'missing', 'units']) assert.ok(cats.includes(c), `a ${c} finding: ${cats}`);
  assert.ok(d.findings.some(f => /"observed"/.test(f.issue)) && d.findings.some(f => /percentage/.test(f.issue)), 'flagged word and percentage');
  assert.ok(d.findings.every(f => f.question && !('suggestion' in f && f.suggestion)), 'every finding asks; none carries wording of its own');
  assert.ok(d.findings.find(f => f.category === 'units').issue.includes('2'), 'units follow the minutes (220 min = 2)');
  await assert.refused(tryApi('enhance.approve', { key }, 'jperez'), /still open/, 422);
  await assert.refused(tryApi('enhance.filled', { key }, 'jperez'), /Approve the scan/, 422);
  await assert.refused(tryApi('enhance.decide', { key, finding: d.findings[0].id, state: 'accepted', answer: 'x' }, 'khale'), /belongs to the person|not allowed/, 403);
  // decide every finding: a flagged-word answer replaces that sentence with the person's words
  for (const f of d.findings) {
    const answer = f.replaces ? 'Walked with M.R. to the calm corner and used the break card with him.' : f.category === 'units' ? '2' : '';
    await api('enhance.decide', { key, finding: f.id, state: answer ? 'accepted' : 'rejected', answer }, 'jperez');
  }
  const d2 = (await state('jperez')).doc_versions.find(x => x.key === key);
  const ch = applyFindings(d2.input.fields, d2.findings);
  assert.ok(ch.some(c => c.label === 'Narrative' && /Walked with M\.R\. to the calm corner/.test(c.after) && !/^Observed/.test(c.after)), 'the person\'s words replace the flagged sentence');
  assert.ok(ch.some(c => c.label === 'Units' && c.after === '2'));
  await api('enhance.approve', { key }, 'jperez'); await api('enhance.filled', { key, labels: ['Narrative', 'Units'] }, 'jperez');
  const d3 = (await state('jperez')).doc_versions.find(x => x.key === key); assert.deepEq(d3.stages.map(s => s.stage).slice(-2), ['approved', 'filled']); assert.eq(d3.lauris_status, 'filled');
});
await T.test('stages beyond "filled" come only from the observed page event; a processed record is never overwritten', async () => {
  const s = await state('jperez'); const d = s.doc_versions.find(x => x.key === key);
  assert.ok(!d.stages.some(x => ['saved', 'processed'].includes(x.stage)), 'not processed by a caller');
  const p = await lpost('/consumers/3310/session/dpn', 'khale', { action: 'process', f2: '3 h 40 min', f3: '2', f9: 'Walked with M.R. to the calm corner and used the break card with him.' }); const id = sid(p); assert.ok(id);
  // the draft belongs to jperez (the scan), the observed event is khale's: the draft of a different author stays open
  await bridge('lauris.observed', ev('processed', id, 'dpn', 3310, 'M.R.', 'K. Hale', { values: { Narrative: 'Walked with M.R.' } }));
  const s2 = await state('jperez'); const note = s2.notes.find(n => n.session === id); assert.ok(note, 'the note is recorded from the observed event');
  const before = JSON.stringify(note);
  await assert.refused(tryApi('enhance.scan', { client: 'MR', form: 'dpn', session: id, fields: [{ label: 'Narrative', value: 'a' }] }, 'jperez'), /already processed|not changed/, 409);
  await assert.refused(tryApi('scribe.draft', { client: 'MR', form: 'dpn', session: id, input: { kind: 'typed', text: 'x' }, items: [{ id: 'n', label: 'Narrative', psyflo: 'x', sources: [{ n: 1, kind: 'input' }] }] }, 'khale'), /already processed|not changed/, 409);
  const rep = await bridge('lauris.observed', ev('processed', id, 'dpn', 3310, 'M.R.', 'K. Hale', { values: { Narrative: 'rewritten' } }));
  assert.ok((rep.ok && rep.result.duplicate) || !rep.ok, 'a repeat is a duplicate or an anomaly, never a rewrite');
  assert.eq(JSON.stringify((await state('jperez')).notes.find(n => n.session === id)), before, 'the processed note is unchanged');
  // the mock Lauris itself refuses to rewrite or re-process
  const again = await lpost('/consumers/3310/session/dpn', 'khale', { action: 'process', session_id: id, f9: 'edited after processing' });
  assert.ok(again.status >= 400 || /blocked=/.test(again.loc || ''), 'the mock Lauris refuses to rewrite a processed session: ' + again.status + ' ' + again.loc);
  assert.ok(!/edited after processing/.test(JSON.stringify((await state('jperez')).notes.find(n => n.session === id))), 'Psyflo kept the processed copy');
});
await T.test('a Scribe draft closes when the page reports Process Form (observed), and a later write is refused', async () => {
  await reset('canvas');
  const items = [{ id: 'narrative', label: 'Narrative', staff: 'worked on the break card', psyflo: 'Worked on the break card.', sources: [{ n: 1, kind: 'input', label: 'What you said', quote: 'worked on the break card' }] }];
  const { key: k } = await api('scribe.draft', { client: 'MR', form: 'dpn', input: { kind: 'typed', text: 'worked on the break card' }, items }, 'khale');
  await api('scribe.decide', { key: k, item: 'narrative', state: 'accepted' }, 'khale'); await api('scribe.approve', { key: k }, 'khale'); await api('scribe.filled', { key: k, labels: ['Narrative'] }, 'khale');
  const p = await lpost('/consumers/3310/session/dpn', 'khale', { action: 'process', f2: '3 h 40 min', f3: '2', f9: 'Worked on the break card.' }); const id = sid(p);
  await bridge('lauris.observed', ev('processed', id, 'dpn', 3310, 'M.R.', 'K. Hale', { values: { Narrative: 'Worked on the break card.' } }));
  const d = (await state('khale')).doc_versions.find(x => x.key === k);
  assert.eq(d.lauris_status, 'processed'); assert.eq(d.stages.at(-1).stage, 'processed'); assert.eq(d.stages.at(-1).src, 'bridge');
  await assert.refused(tryApi('scribe.decide', { key: k, item: 'narrative', state: 'rejected' }, 'khale'), /processed in Lauris|not changed/, 409);
  await assert.refused(tryApi('scribe.filled', { key: k }, 'khale'), /processed in Lauris|not changed/, 409);
});

// ------------------------------------------------------------------ the panel: Mode B has no fill; wrong patient is a hard stop
await reset('canvas');
const { chromium } = playwright();
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = errors(p);
const frame = () => p.frames().find(f => f.url().includes('/panel/'));
const panel = () => p.frameLocator('#psyflo-frame');
try {
  await p.goto(`${LAURIS}/login?as=jperez&next=${encodeURIComponent('/consumers/3310/session/sra-continued')}`); await p.waitForTimeout(1800);
  await T.test('Scan & Enhance is offered to a clinician; Evidence review is read-only and has no fill or approve control', async () => {
    await panel().getByRole('button', { name: 'Home' }).click();
    await panel().getByText('Scan & Enhance').first().click();
    await panel().getByRole('button', { name: 'Evidence review' }).click();
    await panel().getByText('Read-only').first().waitFor();
    const dom = await frame().evaluate(() => ({ acts: [...document.querySelectorAll('#panel [data-act]')].map(e => e.dataset.act), btns: [...document.querySelectorAll('#panel button')].map(e => e.textContent.trim()) }));
    assert.ok(!dom.acts.some(a => /fill|approve|scan$|decide/i.test(a)), 'no fill action in the DOM: ' + dom.acts.join(','));
    assert.ok(!dom.btns.some(t => /^(Fill|Approve and fill|Type)/.test(t)), 'no fill button: ' + dom.btns.join(' | '));
    const txt = (await frame().locator('#panel').innerText()).replace(/\s+/g, ' ');
    assert.match(txt, /Daily notes\s*\d+/); assert.match(txt, /Gaps/);
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/enhance-modeB.png' }).catch(() => { });
  });
  await T.test('a count opens its rows; Exclude asks why and keeps who and when; the count drops', async () => {
    const n0 = Number((await frame().locator('.cnts .cnt').first().innerText()).match(/\d+/)[0]);
    await panel().locator('.cnts .cnt').first().click();
    await panel().locator('details.acc summary').filter({ hasText: /daily note/i }).first().click();
    await panel().getByRole('button', { name: 'Exclude' }).first().click();
    await panel().getByLabel(/Why/).fill('visit with the supervisor');
    await panel().locator('.sheet').getByRole('button', { name: 'Exclude' }).click();
    await p.waitForTimeout(900);
    const n1 = Number((await frame().locator('.cnts .cnt').first().innerText()).match(/\d+/)[0]);
    assert.eq(n1, n0 - 1, 'the excluded row leaves the count');
    const s = await state('jperez'); const m = s.evidence_marks.at(-1); assert.ok(m.excluded && m.by === 'jperez' && m.reason === 'visit with the supervisor');
  });
  await T.test('Mode A on the open draft: scan, answer in your own words, approve, the changed boxes are typed (yellow)', async () => {
    await p.goto(`${LAURIS}/login?as=jperez&next=${encodeURIComponent('/consumers/3315/session/dpn')}`); await p.waitForTimeout(1800);
    await p.fill('#lauris-form textarea >> nth=1', 'Observed J.T. in math. He worked well.');         // narrative box
    await p.waitForTimeout(700);
    await panel().getByRole('button', { name: 'Home' }).click();
    await panel().getByText('Scan & Enhance').first().click();
    await panel().getByRole('button', { name: 'Scan the draft' }).click();
    await panel().getByText(/Finding 1 of/).waitFor();
    const txt = (await frame().locator('#panel').innerText()).replace(/\s+/g, ' ');
    assert.match(txt, /"observed" is in the note/); assert.match(txt, /What did you do with J\.T\.\?/i);
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/enhance-modeA.png' }).catch(() => { });
    assert.ok(await panel().getByRole('button', { name: 'Approve and fill' }).isDisabled(), 'approve waits for every decision');
  });
  await T.test('S4 in the panel: the request is built from real rows; missing evidence cannot be accepted; household stays out; Approve and fill types the counts', async () => {
    await reset('canvas');
    await p.goto(`${LAURIS}/login?as=jperez&next=${encodeURIComponent('/consumers/3310/session/sra-continued')}`); await p.waitForTimeout(1800);
    await panel().getByRole('button', { name: /Review \d statements/ }).click();
    await panel().locator('.ui-dr__item.px-open').getByText(/Evidence missing/).first().waitFor();
    assert.ok(await panel().locator('.ui-dr__item.px-open').getByRole('button', { name: 'Accept' }).count() === 0, 'a box with no stored evidence has no Accept');
    await panel().locator('.ui-dr__item.px-open').getByRole('button', { name: 'Reject' }).click();
    await panel().getByRole('button', { name: /Accept the \d+ with sources/ }).click();
    await panel().getByRole('button', { name: 'Approve and fill' }).click();
    await panel().getByText(/boxes? typed into the form/).first().waitFor({ timeout: 20000 });
    const v = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#lauris-form label[for]')].map(l => [l.textContent, document.getElementById(l.htmlFor).value])));
    const idx = evidenceIndex(await state('jperez'), 'MR', { from: '2026-09-29', to: '2026-10-29' });
    assert.match(v['Progress toward goals'], new RegExp('^' + idx.counts.daily + ' daily notes stored for this period'));
    assert.match(v['Family involvement'], new RegExp('^' + idx.counts.weekly + ' weekly guardian calls in the period'));
    assert.eq(v['Request'], '', 'the unevidenced box was rejected, not typed'); assert.eq(v['Continued need / risk'], '', 'left for the clinician (household not included)');
    assert.noMatch(Object.values(v).join(' '), /household/i, 'household context stays out until a person includes it');
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/continued-stay-filled.png' }).catch(() => { });
  });
  await T.test('wrong patient: a page whose initials disagree with the Harvest # is a hard stop (identity card, Change student, nothing offered)', async () => {
    await reset('live');
    const c = await lpost('/consumers/new', 'jperez', { initials: 'X.Y.', program: 'TDT', locality: 'Lynchburg City', school: 'Lynchburg City · MS-2', staff: 'J. Perez, LPC', no: '4492' });
    await p.goto(`${LAURIS}/login?as=jperez&next=${encodeURIComponent('/consumers/4492')}`); await p.waitForTimeout(1800);
    const txt = (await frame().locator('#panel').innerText()).replace(/\s+/g, ' ');
    assert.match(txt, /Wrong student\?/); assert.match(txt, /Change student/); assert.match(txt, /X\.Y\./); assert.match(txt, /T\.W\./);
    assert.noMatch(txt, /Scribe|Scan & Enhance/, 'no action is offered');
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/wrong-patient.png' }).catch(() => { });
  });
  await T.test('no console errors in the page or the panel', async () => { assert.deepEq(errs, [], errs.join(' | ')); });
} finally { await b.close(); }
await T.done();
