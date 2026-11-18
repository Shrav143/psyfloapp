// Scan & Enhance and the evidence index (E5): the M.R. corpus is real rows; Mode A reviews a CURRENT draft and fills the open form; Mode B is read-only
// and has no fill; a finalized (processed) note is never overwritten; evidence marks keep who and when and never touch the note.
import { suite, assert, api, tryApi, state, reset, bridge, lpost, playwright, errors, LAURIS, SHOTS } from './lib/index.mjs';
import { evidenceIndex, buildContinuedStay, scanFindings, applyFindings, weekdays, periodPresets, noteDimensions, useEvents, DIM_BOX, RATING_BOX, dimensionLine } from '../web/js/shared/enhance.js';
import { DIMS, LEVELS, RATING_LABEL, ratingsOf } from '../web/js/shared/asam.js';
import { DIM_LABELS } from '../server/lauris/forms.js';
import { unitsFor } from '../web/js/shared/rules.js';

const T = suite('enhance');
const sid = r => (r.loc || '').match(/(?:processed|saved|signed)=(\d+)/)?.[1];
const ev = (event, session, form, no, initials, user, extra = {}) => ({ event, session, form, consumer: { no: String(no), initials }, values: {}, typed: [], user, ...extra });
const mr = s => s.notes.filter(n => n.client === 'MR');

await reset('canvas');
const S0 = await state('jperez');

// ------------------------------------------------------------------ the corpus
await T.test('the M.R. corpus: 40 IOP daily notes on program days, units add up to the seeded 83 under the unit bands (H0015 · IOP day), 9 weekly family-member contacts, 3 monthly', async () => {
  const daily = mr(S0).filter(n => n.type === 'daily');
  assert.eq(daily.length, 40, 'daily notes'); assert.ok(daily.length <= 53, 'at most one per program day (Aug 18 to Oct 29 has 53 weekdays)');
  assert.eq(daily.reduce((a, n) => a + n.units, 0), 83, 'units add up to the 83 of 110 on the authorization');
  assert.eq(S0.clients.find(c => c.id === 'MR').authorization.used, 83);
  for (const n of daily) { assert.eq(n.units, unitsFor(S0, 'tdt', n.direct_time_min), `${n.date}: units follow the direct minutes (official bands)`); assert.ok(weekdays(n.date, n.date).length === 1, n.date + ' is a program day'); assert.eq(n.fields.Service, 'H0015 (IOP day)', n.date + ' is billed as an IOP day'); assert.ok(n.date <= '2026-10-28' && n.date >= '2026-08-18'); assert.ok(n.session && n.consumer === 3310); }
  assert.eq(new Set(daily.map(n => n.date)).size, 40, 'one note per day');
  assert.ok(mr(S0).filter(n => n.type === 'weekly_guardian').length >= 9, 'about ten weekly family-member contacts');
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
  for (const g of idx.byGoal) { const named = idx.rows.filter(r => r.kind === 'daily' && r.objective === g.n); assert.eq(g.count, named.length, `Goal ${g.n}: the count is the stored rows that name it`); assert.eq(g.last, named.at(-1).date, `Goal ${g.n}: last named`); assert.ok(g.count > 0, `Goal ${g.n} is named`); }
  assert.deepEq(idx.byGoal.map(g => g.dim), [5, 4, 6], 'each goal carries the ASAM dimension the plan ties it to');
  assert.ok(idx.byGoal[2].count < idx.byGoal[0].count, 'Goal 3 (family and recovery supports) is named in fewer notes than Goal 1 (screens and use)');
  assert.ok(idx.boilerplate.length >= 1, 'repeated wording is found');
  const cs = buildContinuedStay(S0, 'MR', { from: a.start, to: S0.today }, { household: false, request: S0.requests.find(r => r.id === 'R-0411') });
  assert.match(cs.boxes.find(b => b.label === 'Progress toward goals').value, /^40 daily notes stored/);
  assert.ok(!cs.boxes.some(b => /Household/.test(b.value)), 'household context is not included by default');
  assert.eq(cs.household, 'not_included');
});

// ------------------------------------------------------------------ the ASAM layer: which dimension a note addresses, coverage per dimension, the ASAM gaps
await T.test('noteDimensions reads a note\'s own words, its interventions and the goal it names; nothing else', async () => {
  const say = (t, extra = {}) => noteDimensions({ type: 'daily', fields: { Narrative: t }, interventions: [], ...extra });
  assert.deepEq(say('CIWA-Ar score was 0 with no tremor or sweating.'), [1], 'withdrawal -> D1');
  assert.deepEq(say('The pediatrician reports no medical conditions.'), [2], 'medical -> D2');
  assert.deepEq(say('PHQ-9 was 13 with no thoughts of self-harm.'), [3], 'PHQ-9 and safety -> D3');
  assert.deepEq(say('M.R. attended all three blocks and said he is ready to change.'), [4], 'attendance and readiness -> D4');
  assert.deepEq(say('The urine drug screen came back negative.'), [5], 'a screen -> D5');
  assert.deepEq(say('His mother agreed to keep Wednesday night free.'), [6], 'home and supports -> D6');
  assert.deepEq(say('Craving was a 6 out of 10 at check-in.'), [1, 5], 'a craving rating -> D1 and D5');
  assert.deepEq(say('Group started late because of a facility safety drill.'), [], 'a note that says none of it addresses none');
  assert.deepEq(noteDimensions({ type: 'daily', interventions: ['SUD 1.1'], fields: {} }), [4], 'motivational interviewing -> D4');
  assert.deepEq(noteDimensions({ type: 'daily', interventions: ['SUD 2.1', 'SUD 1.2'], fields: {} }), [5, 6], 'family session -> D6, relapse prevention -> D5');
  assert.deepEq(noteDimensions({ type: 'daily', interventions: ['SUD 1.4 Drug and alcohol refusal skills'], fields: {} }), [5], 'a "code name" string works too');
  assert.deepEq(noteDimensions({ type: 'weekly_guardian', fields: { 'What was discussed': 'Short call.' } }), [6], 'a weekly family-member contact is about the home');
  assert.deepEq(noteDimensions({ type: 'daily', objective: 2, interventions: [], fields: { Narrative: 'Short group.' } }, [{ n: 2, dim: 4 }]), [4], 'the goal the note names, when the plan ties it to a dimension');
  assert.deepEq(noteDimensions({ type: 'daily', objective: 2, interventions: [], fields: { Narrative: 'Short group.' } }, [{ n: 2 }]), [], 'a goal with no dimension adds none');
  assert.deepEq(noteDimensions(null), []);
});
await T.test('byDimension: counts and last dates of the notes that address each dimension, from the stored rows, with the clinician\'s stored rating', async () => {
  const a = S0.clients.find(c => c.id === 'MR').authorization; const idx = evidenceIndex(S0, 'MR', { from: a.start, to: S0.today });
  assert.eq(idx.byDimension.length, 6); assert.deepEq(idx.byDimension.map(d => d.n), [1, 2, 3, 4, 5, 6]);
  for (const d of idx.byDimension) {
    const rows = idx.rows.filter(r => !r.excluded && r.dims.includes(d.n)); assert.eq(d.count, rows.length, `D${d.n}: count is the rows`); assert.deepEq(d.dates, rows.map(r => r.date)); assert.eq(d.last, rows.length ? rows.at(-1).date : null);
    assert.eq(d.line, dimensionLine(d)); assert.ok(d.count === 0 || d.dates.every(x => x >= a.start && x <= S0.today));
  }
  assert.deepEq(idx.byDimension.map(d => d.rating), ratingsOf(S0.asam_assessments.filter(x => x.client === 'MR').sort((x, y) => y.date.localeCompare(x.date))[0]), 'ratings from the Oct 14 reassessment');
  assert.eq(idx.byDimension[4].line, 'Dimension 5 · Relapse and continued use · last addressed Oct 28', 'the line the panel prints');
  assert.ok(idx.byDimension.every(d => d.n === 2 || d.count >= 10), 'a daily IOP program addresses every dimension but the medical one most days: ' + idx.byDimension.map(d => d.count));
  const one = evidenceIndex(S0, 'MR', { from: '2026-10-08', to: '2026-10-08' }); assert.ok(one.byDimension.some(d => d.count === 0 && d.line.endsWith('no note in this period')), 'a dimension with no note says so');
  await api('evidence.mark', { client: 'MR', ref: 'mr-d-1028', excluded: true, reason: 'checking the counts' }, 'jperez');
  const ex = evidenceIndex(await state('jperez'), 'MR', { from: a.start, to: S0.today }); assert.ok(ex.byDimension[4].count === idx.byDimension[4].count - 1 && ex.byDimension[4].last < '2026-10-28', 'an excluded note leaves the coverage');
  await api('evidence.mark', { client: 'MR', ref: 'mr-d-1028', excluded: false }, 'jperez');
});

// pure worlds for the ASAM gaps: M.R.'s stored notes with the assessments, incidents and extra notes the test sets
const world = patch => { const s = structuredClone(S0); patch(s); return s; };
const asm = (date, ratings, extra = {}) => ({ id: 'ASM-T-' + date, client: 'MR', date, kind: 'reassessment', assessor: 'jperez', level_recommended: '2.1', dims: Object.fromEntries(ratings.map((r, i) => [String(i + 1), { rating: r }])), source: 'test', provenance: 'seed', ...extra });
const gapsOf = (s, per = {}) => evidenceIndex(s, 'MR', per).gaps;
const gap = (s, id, per) => gapsOf(s, per).find(g => g.id === id);
const asamIds = gs => gs.map(g => g.id).filter(id => /^(reassess|lapse|dim\d|stepdown)/.test(id));
const note = (id, date, text, extra = {}) => ({ id, client: 'MR', staff: 'khale', type: 'daily', date, processed_at: date + 'T19:30', objective: 1, interventions: [], fields: { Narrative: text }, enhanced: text, origin: 'seed', review: 'approved', ...extra });

await T.test('ASAM gap: reassessment due or overdue is computed from the stored assessment and the rule, and cites the rule', async () => {
  const over = world(s => { s.asam_assessments = [asm('2026-09-24', [0, 0, 2, 2, 2, 2])]; });
  const g = gap(over, 'reassess'); assert.ok(g, 'overdue is a gap'); assert.eq(g.kind, 'missing');
  assert.eq(g.text, 'Evidence missing — verify a current ASAM reassessment: the last one is dated Sep 24 and the 30-day interval ended Oct 24, 5 days ago (ASAM reassessment due after · Unverified demo assumption).');
  assert.deepEq([g.rule.key, g.rule.verification, g.dates], ['asam.reassess_days', 'UNVERIFIED-DEMO-ASSUMPTION', ['2026-09-24']], 'the rule chip convention: key, category, source');
  const soon = gap(world(s => { s.asam_assessments = [asm('2026-10-06', [0, 0, 2, 2, 2, 2])]; }), 'reassess'); assert.ok(soon && soon.kind === 'future' && /^ASAM reassessment due Nov 5: 30 days after the assessment of Oct 6/.test(soon.text), soon && soon.text);
  assert.ok(!gap(world(s => { s.asam_assessments = [asm('2026-10-20', [0, 0, 2, 2, 2, 2])]; }), 'reassess'), 'a current assessment is not a gap');
  const l1 = world(s => { s.asam_assessments = [asm('2026-08-20', [0, 0, 1, 1, 2, 1], { level_recommended: '1' })]; s.requests.find(r => r.client === 'MR').asam_level = '1'; });
  assert.ok(!gap(l1, 'reassess'), 'Level 1 uses its own, longer interval (rule scope "1")');
  const none = world(s => { s.asam_assessments = s.asam_assessments.filter(a => a.client !== 'MR'); });
  assert.match(gap(none, 'reassess').text, /^Evidence missing — verify an ASAM multidimensional assessment for M\.R\. \(none is stored\)/, 'no assessment: not assessed, nothing guessed');
  assert.deepEq(asamIds(gapsOf(world(s => { s.asam_assessments = []; }))), [], 'a projection that holds no assessments claims nothing');
  const real = evidenceIndex(S0, 'MR', {}); assert.deepEq(asamIds(real.gaps), [], 'M.R.: reassessed Oct 14, plan with criteria, the lapse answered in 2 days, every rated dimension addressed');
});
await T.test('ASAM gap: an incident after the last assessment, and a lapse or positive screen with no response in 2 days', async () => {
  const inc = world(s => { s.asam_assessments = [asm('2026-10-09', [0, 1, 2, 2, 3, 3], { plan: 'Reassess within 7 days of any emergency visit or new incident.' })]; s.incidents = [{ date: '2026-10-29T08:00', client: 'MR', level: 2, what: 'Emergency department visit after alcohol and cannabis use', status: 'file_now' }]; });
  const g = gap(inc, 'reassess-incident'); assert.ok(g && g.kind === 'missing', 'a reassessment after the incident'); assert.match(g.text, /^Evidence missing — verify an ASAM reassessment after the incident on Oct 29: the last assessment is dated Oct 9 and its plan says "Reassess within 7 days of any emergency visit or new incident"\.$/);
  const open = gap(inc, 'lapse-open'); assert.ok(open && open.kind === 'future' && /has no response documented yet\. Document a relapse prevention review, a safety check or a family contact by Oct 31\./.test(open.text), open && open.text);
  assert.ok(!gap(world(s => { s.asam_assessments = [asm('2026-10-09', [0, 1, 2, 2, 3, 3])]; s.incidents = [{ date: '2026-10-29T08:00', client: 'MR', what: 'x' }]; s.notes.push(note('t-resp', '2026-10-29', 'Held a safety check and a relapse prevention review with M.R. after the visit.', { processed_at: '2026-10-29T15:00' })); }), 'lapse-open'), 'a response note, processed after the incident, answers it');
  // a closed window: the incident of Oct 17 has no response note by Oct 19 (the Oct 19 note holds a recovery support intervention only)
  const closed = world(s => { s.incidents = [{ date: '2026-10-17T12:00', client: 'MR', what: 'Found with a vape cartridge' }]; });
  const c = gap(closed, 'lapse', { from: '2026-10-01', to: '2026-10-29' }); assert.ok(c && c.kind === 'missing' && /^Evidence missing — verify the response to the incident on Oct 17: no note dated Oct 17 to Oct 19 records a relapse prevention review, a safety check or a family contact\.$/.test(c.text), c && c.text);
  // a lapse reported in a note: unanswered, then answered by a later note within 2 days
  const lapse = world(s => { s.notes.push(note('t-lapse', '2026-10-09', 'M.R. said he had two drinks at a party on Wednesday.')); });
  const l = gap(lapse, 'lapse', { from: '2026-10-01', to: '2026-10-29' }); assert.ok(l && /the response to the use on Oct 9/.test(l.text) && l.refs.includes('t-lapse'), l && l.text);
  const answered = world(s => { s.notes.push(note('t-lapse', '2026-10-09', 'M.R. said he had two drinks at a party on Wednesday.'), note('t-resp2', '2026-10-10', 'Reviewed the lapse with M.R. and set up a family session.')); });
  assert.ok(!gap(answered, 'lapse', { from: '2026-10-01', to: '2026-10-29' }), 'answered within 2 days');
  const late = world(s => { s.notes.push(note('t-lapse', '2026-10-09', 'M.R. said he had two drinks at a party on Wednesday.'), note('t-resp3', '2026-10-12', 'Reviewed the lapse with M.R. and set up a family session.')); });
  assert.ok(gap(late, 'lapse', { from: '2026-10-01', to: '2026-10-29' }), 'a response on day 3 is not within 2 days');
  const pos = world(s => { s.notes.push(note('t-pos', '2026-10-09', 'The urine drug screen came back positive for cannabis.')); });
  assert.match(gap(pos, 'lapse', { from: '2026-10-01', to: '2026-10-29' }).text, /the response to the positive screen on Oct 9/, 'a positive screen is an event');
  const neg = world(s => { s.notes.push(note('t-neg', '2026-10-09', 'M.R. denied any drinks and his screen was negative. He did not use over the weekend.')); });
  assert.ok(!gap(neg, 'lapse', { from: '2026-10-01', to: '2026-10-29' }), 'a sentence that says no, denied or negative is never an event');
  const ev = useEvents(S0, 'MR', evidenceIndex(S0, 'MR', { from: '2026-08-18', to: S0.today }).rows, '2026-08-18', S0.today);
  assert.deepEq(ev.map(e => e.date), ['2026-09-28', '2026-09-29'], 'M.R.: the lapse reported on Sept 28 and the positive screen of Sept 29 (the incident record of the same day is the same event)');
  assert.deepEq(ev.map(e => e.what), ['use', 'positive screen']); assert.ok(ev.every(e => e.ref), 'both are reported in a note');
  assert.ok(!gapsOf(S0, { from: '2026-08-18', to: S0.today }).some(g => /^lapse/.test(g.id)), 'and both were answered within 2 days (relapse prevention review Sept 28, family session Sept 29)');
});
await T.test('ASAM gap: a dimension rated 2 or more that no note in the period addresses; only when notes with text are stored', async () => {
  const w = world(s => { s.asam_assessments = [asm('2026-10-01', [0, 0, 3, 2, 2, 2])]; });
  const per = { from: '2026-10-08', to: '2026-10-08' };       // the Oct 8 daily note (refusal skills) and weekly contact (home): no mood, no PHQ-9, no attendance
  const gs = gapsOf(w, per); const d3 = gs.find(g => g.id === 'dim3'); assert.ok(d3, 'D3 is rated 3 and nothing in the period addresses it'); assert.eq(d3.kind, 'future'); assert.eq(d3.dim, 3);
  assert.eq(d3.text, `Dimension 3 · Emotional and behavioral conditions is rated 3 (Oct 1) and no note in this period addresses it. Write what you did for it in the next note: ${DIMS[2].evidence}.`);
  assert.ok(!gs.some(g => g.id === 'dim5') && !gs.some(g => g.id === 'dim2'), 'D5 is addressed; D2 is rated 0');
  assert.ok(!gapsOf(w, { from: '2026-10-02', to: '2026-10-02' }).some(g => /^dim/.test(g.id)), 'a period with no notes says nothing about the dimensions (the missing-days gap says that)');
  const stubs = world(s => { s.asam_assessments = [asm('2026-10-01', [0, 0, 3, 2, 2, 2])]; for (const n of s.notes.filter(x => x.client === 'MR')) { delete n.fields; delete n.enhanced; delete n.interventions; delete n.text; delete n.mood; delete n.progress; delete n.discussed; delete n.shared; } });
  assert.ok(!gapsOf(stubs, per).some(g => /^dim/.test(g.id)), 'notes whose text Psyflo does not hold can neither address nor miss a dimension');
  assert.ok(gap(stubs, 'notext', per), 'that is the existing "text in Lauris" gap');
});
await T.test('ASAM gap: a step-down plan that states no criteria, or ratings that fit a lower level with no plan', async () => {
  const vague = world(s => { s.asam_assessments = [asm('2026-10-14', [0, 0, 2, 2, 2, 2], { plan: 'Step down when ready.' })]; });
  assert.eq(gap(vague, 'stepdown').text, 'Evidence missing — verify the criteria in the step-down plan of Oct 14: it says "Step down when ready." and names no rating, screen result or number of days.');
  assert.ok(!gap(world(s => { s.asam_assessments = [asm('2026-10-14', [0, 0, 2, 2, 2, 2], { plan: 'Step down to Level 1 when D3 is 1 or lower and there is no use for 30 days.' })]; }), 'stepdown'), 'M.R.\'s stored plan states its criteria');
  const noPlan = world(s => { s.asam_assessments = [asm('2026-10-14', [0, 0, 1, 1, 1, 1])]; s.requests.find(r => r.client === 'MR').asam_level = '2.1'; });
  assert.match(gap(noPlan, 'stepdown').text, /^Evidence missing — verify the reason for Level 2\.1 or the criteria for stepping down to Level 1: the ratings of Oct 14 fit Level 1 \(suggested by the demo rule\) and the assessment holds no plan\.$/);
});
await T.test('the continued-stay "Progress toward goals" box counts the daily notes that address each dimension', async () => {
  const a = S0.clients.find(c => c.id === 'MR').authorization; const cs = buildContinuedStay(S0, 'MR', { from: a.start, to: S0.today }, {});
  const idx = evidenceIndex(S0, 'MR', { from: a.start, to: S0.today }); const want = DIMS.map(d => `${d.short} ${idx.rows.filter(r => r.kind === 'daily' && r.dims.includes(d.n)).length}`).join('; ');
  assert.ok(cs.boxes.find(b => b.label === 'Progress toward goals').value.includes(`Daily notes addressing each ASAM dimension — ${want}.`), want);
});

// ------------------------------------------------------------------ Mode A on the ASAM Multidimensional Assessment: what to collect per dimension
await T.test('Scan & Enhance on the assessment form asks what to collect for each dimension; nothing is written for the clinician', async () => {
  assert.deepEq(DIM_BOX, DIM_LABELS, 'the dimension box labels agree with server/lauris/forms.js');
  const nobody = scanFindings(S0, 'MR', 'cna', []); const dimF = nobody.filter(f => DIM_BOX.includes(f.box));
  assert.eq(dimF.length, 6, 'an empty form: one finding per dimension');
  DIMS.forEach((d, i) => { const f = dimF.find(x => x.box === DIM_BOX[i]); assert.eq(f.category, 'missing'); assert.ok(f.question.includes(d.evidence), `D${d.n}: the question names what to collect (${d.evidence})`); assert.eq(f.state, 'open'); assert.ok(!('suggestion' in f)); });
  const some = [{ label: DIM_BOX[0], value: 'Last drink Aug 9. CIWA-Ar 1.' }, { label: RATING_BOX(1), value: '1 · Mild' }, { label: DIM_BOX[1], value: 'No medical conditions.' }];
  const fs = scanFindings(S0, 'MR', 'cna', some);
  assert.ok(!fs.some(f => f.box === DIM_BOX[0] || f.box === RATING_BOX(1)), 'D1 has its note and its rating: no finding');
  const noRating = fs.find(f => f.box === RATING_BOX(2)); assert.ok(noRating && /has a note and no rating/.test(noRating.issue) && noRating.options.length === 5 && noRating.options[0] === '0 · None' && noRating.options[4] === '4 · Severe', 'D2 has a note and no rating: the clinician picks');
  assert.ok(fs.some(f => f.box === DIM_BOX[2]) && fs.some(f => f.box === DIM_BOX[5]) && !fs.some(f => f.box === 'Level of care recommendation'), 'D3 to D6 empty; no level finding until all six are rated');
  const all = DIMS.flatMap((d, i) => [{ label: DIM_BOX[i], value: 'Note ' + d.n }, { label: RATING_BOX(d.n), value: [1, 0, 2, 2, 2, 2][i] + ' · ' + RATING_LABEL[[1, 0, 2, 2, 2, 2][i]] }]);
  const full = scanFindings(S0, 'MR', 'cna', all); const lv = full.find(f => f.box === 'Level of care recommendation'); const due = full.find(f => f.box === 'Reassessment due date');
  assert.ok(lv && lv.options.length === LEVELS.length && /fit Level 2\.1 under the demo decision rule: a suggestion/.test(lv.why), lv && lv.why); assert.eq(lv.rule.key, 'asam.level_limits');
  assert.ok(due && due.rule.key === 'asam.reassess_days' && /is 30 days for this level\. If this assessment is dated today, that is Nov 28\./.test(due.why), due && due.why);
  assert.ok(!scanFindings(S0, 'MR', 'cna', [...all, { label: 'Level of care recommendation', value: 'Level 2.1 · Intensive outpatient' }, { label: 'Reassessment due date', value: '11/28/2026' }]).some(f => f.box === 'Level of care recommendation' || f.box === 'Reassessment due date'), 'filled in: nothing to ask');
  // the person's own answer is all that is ever applied
  const ans = fs.map(f => ({ ...f, state: f.box === RATING_BOX(2) ? 'accepted' : 'rejected', answer: f.box === RATING_BOX(2) ? '0 · None' : '' }));
  assert.deepEq(applyFindings(some, ans), [{ label: RATING_BOX(2), before: '', after: '0 · None' }]);
  assert.ok(scanFindings(S0, 'MR', 'cna', [{ label: DIM_BOX[4], value: 'He was drinking 80% of weekends.' }]).some(f => f.category === 'wording' && /percentage/.test(f.issue) && f.box === DIM_BOX[4]), 'the wording checks read the dimension boxes');
});

// ------------------------------------------------------------------ evidence marks and periods
await T.test('evidence.mark keeps who and when, needs a reason to exclude, never touches the note, and is clinician-only', async () => {
  const wk = mr(S0).find(n => n.household); assert.ok(wk, 'the Oct 16 weekly contact mentions the household');
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
  assert.ok(cs2.boxes.some(b => /^Household context \(included by you\): Mother reported a change at home: her sister now stays with them on weekends/.test(b.value)), 'only when a person includes it, and only from a stored note that says it');
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
    const dimTxt = await frame().evaluate(() => ((document.querySelector('[data-acc="ev-dims"]') || {}).textContent || '').replace(/\s+/g, ' '));
    assert.match(dimTxt, /Dimension 5 \u00b7 Relapse and continued use \u00b7 last addressed Oct \d+/, 'the ASAM dimensions accordion: ' + dimTxt.slice(0, 200)); assert.match(dimTxt, /Dimension 2 \u00b7 Medical conditions \u00b7 no note in this period[\s\S]*rated 0 on Oct 14/, 'a dimension no note addresses says so, with the stored rating');
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
  await T.test('Mode A on the open draft: scan, the findings are suggestion cards that ask in the clinician\'s own words (a card cannot be included without them, nothing is typed until Apply selected)', async () => {
    await p.goto(`${LAURIS}/login?as=jperez&next=${encodeURIComponent('/consumers/3315/session/dpn')}`); await p.waitForTimeout(1800);
    await p.fill('#lauris-form textarea >> nth=1', 'Observed J.T. in math. He worked well.');         // narrative box
    await p.waitForTimeout(700);
    await panel().getByRole('button', { name: 'Home' }).click();
    await panel().getByText('Scan & Enhance').first().click();
    await panel().getByRole('button', { name: 'Scan the draft' }).click();
    await panel().locator('.prs').waitFor();
    const txt = (await frame().locator('#panel').innerText()).replace(/\s+/g, ' ');
    assert.match(txt, /Suggested by Psyflo/); assert.match(txt, /"observed" is in the note/); assert.match(txt, /What did you do with J\.T\.\?/i);
    await p.locator('#psyflo-slot').screenshot({ path: SHOTS + '/enhance-modeA.png' }).catch(() => { });
    assert.ok(await panel().locator('.prc[data-rec="wording-narrative"]').getByRole('button', { name: 'Include' }).isDisabled(), 'a finding needs the clinician\'s own words before it can be included');
    assert.ok(await panel().getByRole('button', { name: 'Apply selected' }).isDisabled(), 'nothing is typed until something is included and applied');
    assert.eq(await p.inputValue('#lauris-form textarea >> nth=1'), 'Observed J.T. in math. He worked well.', 'the form is untouched');
  });
  await T.test('S4 in the panel: the request is built from real rows; missing evidence cannot be accepted; household stays out; Approve and fill types the counts', async () => {
    await reset('canvas');
    await p.goto(`${LAURIS}/login?as=jperez&next=${encodeURIComponent('/consumers/3310/session/sra-continued')}`); await p.waitForTimeout(1800);
    await panel().getByRole('button', { name: /Review \d+ statements/ }).click();
    await panel().locator('.ui-dr__item.px-open').getByText(/Evidence missing/).first().waitFor();
    assert.ok(await panel().locator('.ui-dr__item.px-open').getByRole('button', { name: 'Accept' }).count() === 0, 'a box with no stored evidence has no Accept');
    await panel().locator('.ui-dr__item.px-open').getByRole('button', { name: 'Reject' }).click();
    await panel().getByRole('button', { name: /Accept the \d+ with sources/ }).click();
    await panel().getByRole('button', { name: 'Approve and fill' }).click();
    await panel().getByText(/boxes? typed into the form/).first().waitFor({ timeout: 20000 });
    const v = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#lauris-form label[for]')].map(l => [l.textContent, document.getElementById(l.htmlFor).value])));
    const idx = evidenceIndex(await state('jperez'), 'MR', { from: '2026-09-29', to: '2026-10-29' });
    assert.match(v['Progress toward goals'], new RegExp('^' + idx.counts.daily + ' daily notes stored for this period'));
    assert.match(v['Family involvement'], new RegExp('^' + idx.counts.weekly + ' weekly family-member contacts in the period'));
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
