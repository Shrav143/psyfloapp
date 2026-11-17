// Acceptance tests from seed/scripts: Flow A (substance use screening call, T.W.), Flow B (group dictation, M.R.) and Flow C (the ASAM request,
// written dimension by dimension from the stored assessment). The worked examples are the tests; the drafting rules stay checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { draftScreening, enhanceDictation, draftInitialSRA, draftSeeded, screeningFacts, screeningPrompts, asamSources, lastUseDate, yearLabel, DIM_BOX, INTERVENTION_LIST } from '../web/js/shared/draft.js';
import { FORMS, BEHAVIOURS, BEHAVIOUR_COLS, INTERVENTIONS, DIM_LABELS } from '../server/lauris/forms.js';
import { unitsFor, unitBands } from '../web/js/shared/rules.js';
import { unitsForDirectMinutes } from '../web/js/shared/dates.js';
import { latestAssessment, levelCheck } from '../web/js/shared/asam.js';

const read = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const transcript = read('../seed/scripts/screening_TW.txt');
const seed = JSON.parse(read('../seed/seed.json'));
const asamState = { asam_assessments: JSON.parse(read('../seed/extra/asam.json')).asam_assessments, rules: JSON.parse(read('../seed/extra/rules.json')).rules };
// the seven substance use interventions (spec), the shape of seed.json interventions
const IVS = [['SUD 1.1', 'Motivational interviewing'], ['SUD 1.2', 'Relapse prevention skills'], ['SUD 1.3', 'Cognitive behavioral skills for substance use'], ['SUD 1.4', 'Drug and alcohol refusal skills'], ['SUD 1.5', 'Contingency management'], ['SUD 2.1', 'Family session'], ['SUD 2.2', 'Recovery support planning']].map(([code, name]) => ({ code, name }));
const MR = { id: 'MR', initials: 'M.R.', goals: [{ n: 1, name: 'screens', objective: 'M.R. will have 4 of 5 weekly urine drug screens negative.' }, { n: 2, name: 'attendance', objective: 'M.R. will attend 4 of 5 scheduled groups each week.' }, { n: 3, name: 'recovery supports', objective: 'M.R. will identify and use two recovery supports.' }] };

test('Flow A · screening transcript drafts the expected boxes', () => {
  const d = draftScreening({ transcript, today: '2026-10-16', guardianPhone: '(434) 555-0147', referral: { id: 'REF-118' } });
  const v = l => d.boxes.find(b => b.label === l)?.value;
  assert.equal(v('Family member on the call'), 'Grandmother (legal custody) · (434) 555-0147');
  for (const [row, cells] of Object.entries({
    'Cannabis': ['Daily for about 8 months (3–4 times a day)', 'About 1 g a day', 'Smoked; vape pen', 'Oct 14 (Wed)'],
    'Nicotine (vape or cigarettes)': ['Daily', 'About 1 pod a week', 'Vaped', 'Oct 16 (the day of the call)'],
    'Alcohol': ['None reported'],
    'Other substances (pills, opioids, stimulants)': ['None reported']
  })) ['Frequency', 'Amount', 'Route', 'Last use'].forEach((c, i) => cells[i] && assert.equal(v(`${row} — ${c}`), cells[i], `${row} ${c}`));
  assert.equal(v('Prior treatment (provider · dates · outcome)'), 'Blue Ridge Pediatrics (Dr. Alvarez), Jun (this past June · confirm the year), 2 visits; no change in use');
  assert.equal(v('Current services to date'), 'Weekly check-in with the counselor (Ms. Bell) since September');
  assert.equal(v('Quit attempts and readiness to change'), 'Two quit attempts (Aug, Sep), each a week at most. Agreed to come; wants to keep playing basketball; does not think they have to stop everything.');
  assert.equal(v('Withdrawal history'), 'Irritable and not sleeping for a few days when stopping; no shaking or vomiting');
  assert.equal(v('Family substance use in the home'), 'No one in the home uses; none is kept in the house');
  assert.equal(v('Medical · medications'), 'No current medications; no medical conditions');
  assert.equal(v('Mood and anxiety symptoms'), 'Worries a lot; stomach pain when nervous; not sad');
  assert.equal(v('Suicidal thoughts and safety'), 'Asked directly; grandmother says no');
  assert.equal(v('Strengths'), 'Basketball; drawing; honest with the family member when asked');
  assert.ok(v('Narrative summary').length > 100, 'narrative drafted');
  assert.ok(!v('Meets admission criteria?') && !v('Preliminary diagnosis'), 'decision and diagnosis left blank');
  assert.equal(d.boxes.at(-1).label, 'Narrative summary', 'narrative last');
  const rows = new Set(d.boxes.map(b => b.row || b.label));
  assert.equal(rows.size, 15, '15 boxes drafted from the call (4 table rows + 11 fields; 2 more left blank)');
  assert.ok(d.checks.every(c => c.pass), JSON.stringify(d.checks.filter(c => !c.pass)));
  // narrative adds no new facts: every number in it appears in the boxes
  const nums = (v('Narrative summary').match(/\d+/g) || []);
  const rest = d.boxes.filter(b => b.label !== 'Narrative summary').map(b => b.value).join(' ');
  for (const n of nums) assert.ok(rest.includes(n), 'narrative number ' + n + ' traced');
  // the table rows and columns are the ones the Lauris form has
  assert.deepEqual([...new Set(d.boxes.filter(b => b.row).map(b => b.row))], BEHAVIOURS);
  for (const b of d.boxes.filter(b => b.row)) assert.ok(BEHAVIOUR_COLS.includes(b.label.split(' — ')[1]), b.label);
});

test('Flow A · the last use is a date worked out from the day of the call, and a wrong weekday is said, not hidden', () => {
  assert.equal(lastUseDate('Wed the 14th', '2026-10-16').text, 'Oct 14 (Wed)');
  assert.equal(lastUseDate('this morning', '2026-10-16').text, 'Oct 16 (the day of the call)');
  assert.equal(lastUseDate('yesterday', '2026-10-16').text, 'Oct 15 (the day before the call)');
  assert.equal(lastUseDate('Mon the 14th', '2026-10-16').text, 'Oct 14 (said Mon; Wed on the calendar: check the date)');
  assert.equal(lastUseDate('Sat the 26th', '2026-10-16').iso, '2026-09-26', 'a day later in the month than the call is last month');
  assert.match(lastUseDate('Sat the 26th', '2026-10-29').text, /Oct 26/);
  assert.match(lastUseDate('Wed the 14th', '2026-12-20').text, /^Dec 14|Nov 14/, 'always before the call');
  assert.equal(lastUseDate('Wed the 14th').text, 'Wed the 14th', 'with no day for the call the words are kept as said');
});

test('Flow A · prompts tick as answers are heard', () => {
  const lines = transcript.split('\n');
  const before = screeningPrompts(screeningFacts(lines.slice(0, 8).join('\n')), '2026-10-16');
  assert.ok(before.every(p => !p.done));
  const after = screeningPrompts(screeningFacts(transcript), '2026-10-16');
  assert.deepEqual(after.filter(p => p.done).map(p => p.key).sort(), ['access', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'prior', 'sh']);
  // half way through the call: substances heard, nothing yet on the home or on safety
  const mid = screeningPrompts(screeningFacts(lines.slice(0, 16).join('\n')), '2026-10-16');
  const m = Object.fromEntries(mid.map(p => [p.key, p]));
  assert.ok(m.d1.partial && !m.d1.done, 'last use heard, withdrawal not yet');
  assert.ok(!m.d6.done && !m.sh.done && /safety|Ask directly/i.test(m.sh.text) && m.sh.ask, 'safety still asked');
});

test('Flow A · an empty prior-service outcome blocks and asks (prior treatment needs provider, dates and outcome)', () => {
  const t = transcript.replace(/Not that I could see\. He kept using every day\./, 'I am not sure.');
  const d = draftScreening({ transcript: t, today: '2026-10-16' });
  assert.ok(!d.boxes.find(b => b.label.startsWith('Prior treatment')));
  assert.equal(d.checks.find(c => c.rule.startsWith('Prior')).pass, false);
  assert.match(d.prompts.find(p => p.key === 'prior').ask, /Did it help/);
});

test('Flow A · a suicidal-thoughts answer of yes is a safety alert for the clinician, never drafted as a denial', () => {
  const t = transcript.replace(/No\. Never\. I've asked him straight out\./, 'Once, in the spring. He said he did not want to be here.');
  const d = draftScreening({ transcript: t, today: '2026-10-16' });
  assert.equal(d.facts.safety, 'Y');
  assert.match(d.boxes.find(b => b.label === 'Suicidal thoughts and safety').value, /needs the clinician now/);
  assert.ok(d.prompts.find(p => p.key === 'd3').alert, 'the prompt carries the alert');
});

test('Flow A · a call that names no substance, no date and no dose drafts nothing', () => {
  const NOT = 'Guardian: He has anxiety and refuses to go to school most mornings. He cries and hides. Clinician: How long has this been going on? Guardian: since September.';
  const d = draftScreening({ transcript: NOT, today: '2026-10-29', referral: { id: 'REF-X' } });
  assert.equal(d.boxes.length, 0); assert.deepEqual(d.facts, {});
  assert.ok(d.prompts.length > 0 && d.prompts.every(p => !p.done));
});

test('Flow A · a different call (alcohol and cannabis, alcohol unlocked at home) is read with the same extractors', () => {
  const call = ['JP: Is it okay if I record this call?', 'DT: Sure.', "JP: You're Kayla's father?", 'DT: Yes, her stepmother and I.', 'JP: Tell me about alcohol. How often does Kayla drink?', 'DT: On weekends, mostly. Five to eight drinks when she goes to a party.',
    'JP: When did she last drink?', 'DT: Sunday the fourth. She was sick the next morning.', 'JP: What about cannabis?', 'DT: She smokes weed a couple times a week, a joint at a time, and eats gummies sometimes.', 'JP: When was the last time?', 'DT: Last night.',
    'JP: Any counseling before?', "DT: Piedmont Counseling, January to April. Nine sessions. It didn't help.", 'JP: Does anyone at home drink?', "DT: Yes, I keep beer in the garage and my wife drinks wine at night. It's unlocked.", 'JP: Any shaking when she stops?', 'DT: No.'].join('\n');
  const d = draftScreening({ transcript: call, today: '2026-10-29' }); const v = l => d.boxes.find(b => b.label === l)?.value;
  assert.equal(v('Alcohol — Frequency'), 'Weekends'); assert.equal(v('Alcohol — Amount'), '5–8 drinks'); assert.equal(v('Alcohol — Last use'), 'Oct 4 (Sun)');
  assert.equal(v('Cannabis — Frequency'), '2 times a week'); assert.equal(v('Cannabis — Route'), 'Smoked; edibles'); assert.equal(v('Cannabis — Last use'), 'Oct 28 (the day before the call)');
  assert.equal(v('Prior treatment (provider · dates · outcome)'), 'Piedmont Counseling, Jan–Apr (confirm the year), 9 sessions; no change in use');
  assert.equal(v('Family substance use in the home'), 'Wife drinks; beer is kept in the home and is unlocked');
  assert.equal(v('Withdrawal history'), 'No withdrawal symptoms reported when asked');
  assert.equal(d.checks.find(c => /^Dates/.test(c.rule)).pass, true);
});

test('Flow A · a drinking history is read the same way (frequency, amount, last use) and incomplete rows fail the substance check', () => {
  const t = 'DR: She drinks on weekends, five to eight drinks. Last drink was yesterday.\nJP: Anyone at home drink?\nDR: Her older brother drinks at home.';
  const f = screeningFacts('JP: Does she drink alcohol?\n' + t);
  assert.equal(f.a_freq, 'Weekends'); assert.equal(f.a_amt, '5–8 drinks'); assert.equal(f.a_last, 'yesterday');
  const d = draftScreening({ transcript: 'JP: Does she drink alcohol?\nDR: Some weekends, a few beers.', today: '2026-10-16' });
  const c = d.checks.find(x => /^Substances/.test(x.rule)); assert.equal(c.pass, false); assert.match(c.detail, /Alcohol: no .*last use/);
});

test('Flow B · the phone example (M.R., refusal skills role play): the staffer\'s own words, the craving read from them, a question for everything unsaid', () => {
  const text = 'ran the refusal skills role play with M.R. in group, he practiced saying no to a drink at a party twice, craving was a 5 before and a 2 after';
  const e = enhanceDictation({ text, client: MR, goals: MR.goals, interventions: IVS, today: '2026-10-29' });
  assert.equal(e.narrative, 'Ran the refusal skills role play with M.R. in group, he practiced saying no to a drink at a party twice, craving was a 5 before and a 2 after.');
  assert.equal(e.craving, 2); assert.equal(e.cravingBefore, 5); assert.equal(e.screen, null, 'no screen result was said, none is written');
  assert.ok(e.chips.some(c => c.text === 'craving 5 before, 2 after (0 to 10)'));
  assert.ok(!/6 min|Frustrated|Obj/i.test(e.narrative + e.mood + e.progress), 'nothing added to the words');
  assert.equal(e.objective, null, 'no objective chosen for the staffer'); assert.deepEqual(e.interventions, [], 'no intervention chosen for the staffer');
  assert.equal(e.mood, ''); assert.equal(e.progress, '');
  assert.ok(e.questions.some(q => /ISP objective/.test(q.q)), 'asks which objective');
  assert.ok(e.questions.some(q => /What did you do/.test(q.q)), 'asks what the staffer did');
  assert.ok(e.questions.some(q => /How long/.test(q.q)), 'asks how long');
  assert.ok(!e.questions.some(q => /craving rating|lapse/.test(q.q)), 'the craving was said; a refusal role play is not a lapse');
  assert.equal(e.checks.find(c => /ISP objective/.test(c.rule)).pass, false, 'objective not linked until the staffer names one');
  assert.equal(e.checks.find(c => /^Craving/.test(c.rule)).pass, true); assert.match(e.checks.find(c => /^Craving/.test(c.rule)).detail, /craving 5 before, 2 after/);
});

test('Flow B · a fuller dictation names the objective, the interventions from the list, the minutes, the craving and the screen result', () => {
  const text = 'ran the relapse prevention skills group today, M.R. practiced drug and alcohol refusal skills in a role play about a party, goal 1, craving was 3 of 10, urine screen negative, 40 min';
  const e = enhanceDictation({ text, client: MR, goals: MR.goals, interventions: IVS, today: '2026-10-29' });
  assert.equal(e.narrative, 'Ran the relapse prevention skills group today, M.R. practiced drug and alcohol refusal skills in a role play about a party, goal 1, craving was 3 of 10, urine screen negative, 40 min.');
  assert.equal(e.objective, 1); assert.deepEqual(e.interventions, ['SUD 1.2', 'SUD 1.4'], 'the interventions the staffer named, from the list');
  assert.equal(e.craving, 3); assert.equal(e.cravingBefore, null); assert.equal(e.screen, 'negative');
  for (const c of ['objective 1', 'SUD 1.2, SUD 1.4', '40 min', 'craving 3 of 10', 'screen negative']) assert.ok(e.chips.some(x => x.text === c), c);
  assert.deepEqual(e.questions, [], 'nothing is left to ask');
  assert.ok(e.checks.every(c => c.pass), JSON.stringify(e.checks.filter(c => !c.pass)));
});

test('Flow B · a named objective is used; an unnamed one is a question', () => {
  const e = enhanceDictation({ text: 'Practiced the cognitive behavioral skills for substance use with M.R. in group, goal 2, he attended 3 of 3 groups this week, craving 2 of 10.', client: MR, goals: MR.goals, interventions: IVS });
  assert.equal(e.objective, 2);
  assert.ok(!e.questions.some(q => /ISP objective/.test(q.q)));
  assert.deepEqual(e.interventions, ['SUD 1.3']);
});

test('Flow B · no craving rating is a question, never a number; a lapse or positive screen asks what was done', () => {
  const none = enhanceDictation({ text: 'Ran group, M.R. role-played turning down a drink.', client: MR, goals: MR.goals, interventions: IVS });
  assert.equal(none.craving, null); assert.ok(none.questions.some(q => /craving rating/.test(q.q))); assert.equal(none.checks.find(c => /^Craving/.test(c.rule)).pass, false);
  const lapse = enhanceDictation({ text: 'M.R. used on Saturday at a party, positive urine screen, craving 6 of 10.', client: MR, goals: MR.goals, interventions: IVS });
  assert.equal(lapse.screen, 'positive'); assert.equal(lapse.craving, 6);
  assert.ok(lapse.questions.some(q => q.flag === 'use' && /what did you do/i.test(q.q)), 'asks what was done about the lapse');
  assert.ok(!/\bresponse\b|\breferred\b|called/i.test(lapse.narrative), 'no response written for the staffer');
  const high = enhanceDictation({ text: 'Craving was 14 of 10 today.', client: MR });
  assert.equal(high.craving, null, 'a rating above 10 is not accepted');
});

test('Flow B · negative case: "observed" is flagged and a question is raised; the words are not changed', () => {
  const e = enhanceDictation({ text: 'I observed M.R. at group and he sat alone', client: MR, goals: MR.goals, interventions: IVS });
  assert.equal(e.narrative, 'I observed M.R. at group and he sat alone.');
  assert.match(e.narrative, /observed/);
  assert.ok(!/worked with/i.test(e.narrative), 'no verb substituted');
  assert.ok(e.questions.some(q => q.flag === 'observed'), 'asks what staff did');
  const c = e.checks.find(c => c.rule === 'No "observed"');
  assert.equal(c.pass, false);
});

test('Units · official bands: 0 below 120 minutes, 1/2/3 at 120/180/300; the 60-minute rule is an alternate, not the default', () => {
  for (const [m, u] of [[0, 0], [60, 0], [90, 0], [119, 0], [120, 1], [179, 1], [180, 2], [299, 2], [300, 3], [600, 3]]) assert.equal(unitsForDirectMinutes(m), u, m + ' min');
  const s = { rules: [{ key: 'units.tdt.day_tiers', value: [[120, 1], [180, 2], [300, 3]] }, { key: 'units.tdt.max_per_day', value: 3 }] };
  assert.equal(unitsFor(s, 'tdt', 119), 0); assert.equal(unitsFor(s, 'tdt', 120), 1);
  s.rules[0].value = [[60, 1], [180, 2], [300, 3]];   // the alternate (60-minute) value, set by an administrator
  assert.equal(unitsFor(s, 'tdt', 60), 1);
  // 220 minutes = 2 units under the configured bands
  s.rules[0].value = [[120, 1], [180, 2], [300, 3]];
  assert.equal(unitsFor(s, 'tdt', 220), 2);
  assert.equal(unitsFor(s, 'tdt', 60), 0);
});

test('Evidence · counts come from stored notes; missing evidence prints "Evidence missing"; household is not included by default', () => {
  const mr = { id: 'MR', initials: 'M.R.' };
  const none = draftSeeded('sra-continued', { client: mr, notes: [], today: '2026-10-29' });
  assert.match(none.boxes.find(b => b.label === 'Progress toward goals').value, /Evidence missing/);
  assert.ok(none.boxes.find(b => b.label === 'Progress toward goals').missing);
  assert.ok(!/21|61/.test(none.sources.map(x => x.label).join(' ')), 'no constant counts');
  const notes = [1, 2, 3].map(i => ({ client: 'MR', type: 'daily', date: `2026-10-2${i}`, objective: i === 3 ? 2 : 1, interventions: ['SUD 1.2'] }));
  const some = draftSeeded('sra-continued', { client: mr, notes, today: '2026-10-29' });
  assert.match(some.boxes.find(b => b.label === 'Progress toward goals').value, /3 daily notes/);
  assert.match(some.sources[0].label, /Daily notes \(3\)/);
  assert.ok(!some.boxes.some(b => /household/i.test(b.label)), 'household not included by default');
  assert.equal(some.checks.find(c => c.rule === 'Household disclosure').detail, 'Not included · you decide');
  // another client's quarterly never falls back to M.R.'s numbers
  const q = draftSeeded('quarterly', { client: { id: 'DW', initials: 'D.W.' }, notes: [], today: '2026-10-29' });
  assert.ok(q.boxes.every(b => /Evidence missing/.test(b.value)));
  // a discharge draft writes no future event as done
  const d = draftSeeded('discharge', { client: { id: 'TN', initials: 'T.N.' }, notes: [], today: '2026-10-29' });
  assert.ok(!d.boxes.some(b => /notified|Nov 24|Dec 5/.test(b.value)));
});

// ------------------------------------------------------------------------------------------------ Flow C · the ASAM request, dimension by dimension
const SCHOOL = { reported: '2026-10-19', by: 'rbell', unexcused_absences: 9, iss_days_6mo: 1, oss_days_6mo: 0, classes: 7, passing: 4, incident_dates: ['2026-10-14', '2026-10-20'] };
const REQ = (id, level, extra = {}) => ({ id, asam_level: level, units_requested: 150, dates: '2026-10-27 to 2027-01-23', ...extra });
const initial = (client, level, over = {}) => draftInitialSRA({ client: { initials: client }, screening: { facts: {}, when: null }, referral: { id: 'REF-9' }, school: null, today: '2026-10-29', request: REQ('R-1', level), ...asamSources(asamState, client), ...over });
const box = (d, re) => d.boxes.find(b => re.test(b.label));

test('Flow C · the initial request is written dimension by dimension from the stored assessment, the call and the record', () => {
  const sc = draftScreening({ transcript, today: '2026-10-16' });
  const d = draftInitialSRA({ client: { initials: 'T.W.' }, screening: { facts: sc.facts, when: '2026-10-16' }, referral: { id: 'REF-118' }, school: SCHOOL, today: '2026-10-22', request: REQ('R-0416', '2.1'), ...asamSources(asamState, 'TW') });
  const a = latestAssessment(asamState, 'TW');
  assert.equal(d.boxes.length, 11, 'dates, six dimensions, level of care, care coordination, barriers, discharge');
  DIM_BOX.forEach((label, i) => {
    const b = d.boxes.find(x => x.label === label); assert.ok(b, label);
    assert.match(b.value, new RegExp(`^Rated ${a.dims[i + 1].rating} \\(\\w+\\) at the Oct 16 assessment\\.`), 'rating and date first');
    assert.ok(b.value.includes(a.dims[i + 1].note.replace(/\.$/, '').slice(0, 30)), 'the clinician\'s own note is cited');
    assert.ok(b.src.includes(5), 'cites the assessment (source 5)');
  });
  assert.ok(box(d, /^Dimension 1/).value.includes('cannabis last used Oct 14 (Wed)') && box(d, /^Dimension 1/).src.includes(2), 'the call adds what it said, with its source');
  assert.match(box(d, /^Dimension 5/).value, /Blue Ridge Pediatrics \(Dr\. Alvarez\)/);
  assert.match(box(d, /^Dimension 6/).value, /No one in the home uses|no one in the home uses/); assert.match(box(d, /^Dimension 6/).value, /4 of 7 classes passing/); assert.ok(box(d, /^Dimension 6/).src.includes(3));
  const lvl = box(d, /^Level of care$/).value;
  assert.match(lvl, /^Level 2\.1 \(intensive outpatient\) is requested\./); assert.match(lvl, /lowest level that fits every rating is Level 2\.1/); assert.match(lvl, /suggested/); assert.ok(!/determined/.test(lvl));
  assert.match(lvl, /D3 \(2\) and D5 \(3\) are above what Level 1 can manage/, 'the dimensions that keep the person above Level 1');
  assert.deepEqual(d.blank.map(b => b.label), ['Clinical rationale for the level'], 'no over/under: no reason is asked for');
  assert.ok(!d.boxes.some(b => /criterion|trauma/i.test(b.label)), 'the three TDT criteria are gone');
  assert.ok(d.checks.every(c => c.pass), JSON.stringify(d.checks.filter(c => !c.pass)));
  // every box cites sources that exist and every source carries a date (or says it is unknown)
  const ns = new Set(d.sources.map(x => x.n)); for (const b of d.boxes) for (const n of b.src) assert.ok(ns.has(n), `${b.label}: source ${n}`);
  for (const x of d.sources) assert.ok(x.date && x.date_label, JSON.stringify(x));
  assert.equal(d.level.state, 'match');
});

test('Flow C · a request above what the ratings fit asks the clinician for the reason; a request below it says why too; the rationale (criterion 3 and trauma-informed care of the old request) is never drafted', () => {
  const jo = initial('JO', '2.1');                                     // ratings fit Level 1 (bible: JO)
  assert.equal(jo.level.state, 'over');
  assert.match(box(jo, /^Level of care$/).value, /lowest level that fits every rating is Level 1/); assert.match(box(jo, /^Level of care$/).value, /needs a stated reason/);
  const why = jo.blank.find(b => b.label === 'Reason for the requested level'); assert.ok(why && /Level 2\.1 needs a reason outside the ratings/.test(why.why));
  assert.equal(jo.checks.find(c => c.rule === 'Level of care matches the ratings').pass, false);
  const tn = initial('TN', '2.1');                                     // ratings suggest Level 2.5 (bible: TN)
  assert.equal(tn.level.state, 'under'); assert.match(box(tn, /^Level of care$/).value, /lowest level that fits every rating is Level 2\.5/);
  assert.ok(tn.blank.some(b => b.label === 'Reason for the requested level'));
  const pg = initial('PG', '1'); assert.equal(pg.level.state, 'match'); assert.ok(!pg.blank.some(b => b.label === 'Reason for the requested level'));
  for (const d of [jo, tn, pg]) { assert.ok(d.blank.some(b => b.label === 'Clinical rationale for the level'), 'the rationale is left for the clinician'); assert.ok(!d.boxes.some(b => /rationale|^Reason for the requested level/i.test(b.label)), 'and never drafted'); }
});

test('Flow C · no assessment: every dimension and the level say "Evidence missing", never a rating nobody gave ("Not assessed")', () => {
  const es = initial('ES', '2.1');
  for (const i of [1, 2, 3, 4, 5, 6]) { const b = box(es, new RegExp('^Dimension ' + i)); assert.match(b.value, /^Evidence missing — verify the Dimension \d rating and its evidence \(no ASAM assessment is on file\)/); assert.ok(b.missing); }
  assert.match(box(es, /^Level of care$/).value, /^Evidence missing/);
  assert.equal(es.checks.find(c => c.rule === 'Assessment is current').pass, false); assert.equal(es.checks.find(c => c.rule === 'Every dimension has a rating and a date').pass, false);
  assert.ok(!/\bRated \d/.test(es.boxes.map(b => b.value).join(' ')), 'no rating invented');
  const noReq = draftInitialSRA({ client: { initials: 'T.W.' }, screening: { facts: {} }, referral: { id: 'X' }, today: '2026-10-29', request: { id: 'R-2', units_requested: 10 }, ...asamSources(asamState, 'TW') });
  assert.match(box(noReq, /^Level of care$/).value, /^Evidence missing — verify the ASAM level of care requested/);
});

test('Flow C · an old assessment is overdue on the 30-day rule and the request says so; a stored date older than 30 days carries its year', () => {
  const sb = initial('SB', '2.1');
  const c = sb.checks.find(x => x.rule === 'Assessment is current'); assert.equal(c.pass, false); assert.match(c.detail, /35 days old: reassessment was due Oct 24/);
  assert.equal(yearLabel('One lapse Sept 27 and again Oct 20.', '2026-10-29'), 'One lapse Sept 27, 2026 and again Oct 20.');
  assert.equal(yearLabel('Lapse Sept 27, 2026.', '2026-10-29'), 'Lapse Sept 27, 2026.', 'a date that already has a year is left alone');
  const mr = draftSeeded('sra-continued', { client: { id: 'MR', initials: 'M.R.' }, notes: [], today: '2026-10-29', request: REQ('R-0411', '2.1'), ...asamSources(asamState, 'MR') });
  assert.equal(mr.checks.find(x => x.rule === 'Assessment is current').pass, true, 'M.R. was reassessed Oct 14: current until Nov 13');
  assert.ok(!/Sept 27(?!, 2026)/.test(mr.boxes.map(b => b.value).join(' ')), 'every stored date older than 30 days carries its year');
});

test('Flow C · the continued-stay request cites the reassessment, the change since the last assessment and the step-down plan', () => {
  const notes = [1, 2, 3].map(i => ({ client: 'MR', type: 'daily', date: `2026-10-2${i}`, objective: 1, interventions: ['SUD 1.2'] }));
  const d = draftSeeded('sra-continued', { client: { id: 'MR', initials: 'M.R.' }, notes, today: '2026-10-29', request: REQ('R-0411', '2.1'), ...asamSources(asamState, 'MR') });
  assert.match(box(d, /^Dimension 3/).value, /^Rated 2 \(moderate\) at the Oct 14 reassessment, unchanged from 2 on Aug 12, 2026\. Depressive symptoms persist \(PHQ-9 12/);
  assert.match(box(d, /^Dimension 5/).value, /^Rated 2 \(moderate\) at the Oct 14 reassessment, down from 3 on Aug 12, 2026\. One lapse Sept 27, 2026/);
  assert.ok(box(d, /^Dimension 5/).src.includes(6), 'the earlier assessment is a source of the change');
  const plan = box(d, /^Reassessment and step-down plan$/).value;
  assert.match(plan, /^Reassessed Oct 14 \(ASM-MR-2\)\. Next reassessment due Nov 13 \(30 days between assessments, rule asam\.reassess_days\)\./);
  assert.match(plan, /Change since the Aug 12, 2026 assessment: Lower risk: D1 1 to 0, D4 3 to 2, D5 3 to 2, D6 3 to 2\./);
  assert.match(plan, /Step-down plan on the assessment: "Step down to Level 1 when D3 is 1 or lower and there is no use for 30 days\."/);
  assert.match(plan, /D3 at 1 or lower: D3 is 2 \(not met\)/); assert.match(plan, /no use for 30 days: last use on record Sep 27, 2026, 32 days before today \(met\)/);
  assert.match(box(d, /^Level of care$/).value, /Ratings support Level 2\.1: D3 \(2\) is above what Level 1 can manage/);
  assert.equal(d.level.state, 'match'); assert.ok(d.blank.some(b => b.label === 'Continued need / risk'), 'continued need stays the clinician\'s');
  const ns = new Set(d.sources.map(x => x.n)); for (const b of d.boxes) for (const n of b.src) assert.ok(ns.has(n), `${b.label}: source ${n}`);
  for (const x of d.sources) assert.ok(x.date && x.date_label, JSON.stringify(x));
  // D.W. was assessed Oct 9, before the Oct 28 emergency department visit: the incident draft says a reassessment is indicated
  const inc = draftSeeded('incident', { client: { id: 'DW', initials: 'D.W.' }, today: '2026-10-29', ...asamSources(asamState, 'DW') });
  assert.match(inc.boxes.find(b => b.label === 'Actions taken').note, /last ASAM assessment \(Oct 9\) is before this visit: a reassessment is indicated/);
  assert.equal(inc.checks.find(c => c.rule === 'ASAM reassessment after an incident').pass, false);
});

test('Quarterly · the Assessments box is the stored ratings and their change, never another client\'s', () => {
  const q = draftSeeded('quarterly', { client: { id: 'MR', initials: 'M.R.' }, notes: [], today: '2026-10-29', ...asamSources(asamState, 'MR') });
  assert.match(q.boxes.find(b => b.label === 'Assessments').value, /^ASAM Oct 14 \(reassessment\): D1 0 · D2 0 · D3 2 · D4 2 · D5 2 · D6 2\. Since Aug 12, 2026: Lower risk: D1 1 to 0/);
  const none = draftSeeded('quarterly', { client: { id: 'ES', initials: 'E.S.' }, notes: [], today: '2026-10-29', ...asamSources(asamState, 'ES') });
  assert.match(none.boxes.find(b => b.label === 'Assessments').value, /^Evidence missing/);
});

test('The ASAM assessment form: Psyflo copies what the call said into each dimension and drafts no rating, level or plan', () => {
  const sc = draftScreening({ transcript, today: '2026-10-16' });
  const d = draftSeeded('cna', { client: { id: 'TW', initials: 'T.W.' }, screening: { facts: sc.facts, boxes: sc.boxes, when: '2026-10-16' }, today: '2026-10-16', rules: asamState.rules });
  assert.match(d.boxes.find(b => b.label === 'Presenting issue / reason for referral').value, /^Referred for substance use: cannabis daily for about 8 months/);
  assert.match(d.boxes.find(b => b.label === 'Prior treatment (provider · dates · outcome)').value, /Blue Ridge Pediatrics/);
  for (const l of DIM_BOX) { const b = d.boxes.find(x => x.label === l); assert.ok(b && !b.missing, l + ' drafted from the call'); assert.match(b.value, /the rating is yours/); }
  assert.ok(!d.boxes.some(b => /rating \(0 to 4\)|recommendation/i.test(b.label)), 'no rating or level box is drafted');
  assert.equal(d.boxes.find(b => b.label === 'Reassessment due date').value, '11/15/2026', '30 days from the assessment, from the rule');
  assert.ok(d.blank.some(b => /ratings/i.test(b.label)));
  const none = draftSeeded('cna', { client: { id: 'ZZ', initials: 'Z.Z.' }, today: '2026-10-29' });
  assert.ok(none.boxes.every(b => /^Evidence missing/.test(b.value)), 'with no call the form drafts nothing');
});

test('The sample treatment plan states goals as counts, each tied to an ASAM dimension and the interventions come from the list', () => {
  const d = draftSeeded('isp', { client: { id: 'TW', initials: 'T.W.' }, screening: { facts: screeningFacts(transcript) }, today: '2026-10-29', ...asamSources(asamState, 'TW') });
  assert.match(d.boxes.find(b => b.label === 'Goal 1 · Objective').value, /^T\.W\. will have 4 of 5 weekly urine drug screens negative \(Dimension 5, rated 3 on Oct 16\)\.$/);
  assert.match(d.boxes.find(b => b.label === 'Goal 2 · Objective').value, /4 of 5 scheduled groups each week \(Dimension 4/); assert.match(d.boxes.find(b => b.label === 'Goal 3 · Objective').value, /two recovery supports \(Dimension 6/);
  for (const b of d.boxes.filter(b => /Intervention/.test(b.label))) assert.ok(INTERVENTIONS.includes(b.value), b.value);
  assert.ok(!/%|percent/i.test(d.boxes.map(b => b.value).join(' ')));
  assert.equal(d.illustrative, true); assert.equal(d.sample, 'Illustrative sample');
  assert.ok(d.checks.every(c => c.pass), JSON.stringify(d.checks.filter(c => !c.pass)));
  const off = draftSeeded('isp', { client: { id: 'TW', initials: 'T.W.' }, today: '2026-10-29', interventions: [{ code: 'SUD 1.1', name: 'Motivational interviewing' }] });
  assert.equal(off.checks.find(c => /Interventions from/.test(c.rule)).pass, false, 'an intervention that is not on Harvest\'s list fails the check');
});

test('Lauris forms and the drafts agree: every drafted box is a field on the form, the dimension labels match, the interventions are the seven', () => {
  assert.deepEqual(DIM_BOX, DIM_LABELS);
  assert.equal(FORMS.cna.title, 'ASAM Multidimensional Assessment'); assert.equal(FORMS.cna.short, 'ASAM');
  for (const l of DIM_LABELS) { assert.ok(FORMS['sra-initial'].fields.some(f => f.label === l), 'sra-initial ' + l); assert.ok(FORMS['sra-continued'].fields.some(f => f.label === l), 'sra-continued ' + l); assert.ok(FORMS.cna.fields.some(f => f.label === l && f.type === 'area'), 'cna ' + l); }
  for (let n = 1; n <= 6; n++) { const r = FORMS.cna.fields.find(f => f.label === `Dimension ${n} · rating (0 to 4)`); assert.ok(r && r.type === 'select' && r.options.length === 6 && r.options[1].startsWith('0 ') && r.options[5].startsWith('4 '), 'rating ' + n); }
  assert.ok(FORMS.cna.fields.some(f => f.label === 'Level of care recommendation' && f.type === 'select' && f.options.includes('Level 2.1 · Intensive outpatient')));
  assert.ok(FORMS.cna.fields.some(f => f.label === 'Reassessment due date') && FORMS.cna.fields.some(f => f.label === 'Plan'));
  assert.ok(!FORMS['sra-initial'].fields.some(f => /criterion|trauma/i.test(f.label)), 'no TDT criteria on the request');
  for (const f of ['isp']) for (const n of [1, 2, 3]) for (const k of [1, 2]) assert.deepEqual(FORMS[f].fields.find(x => x.label === `Goal ${n} · Intervention ${k}`).options, ['', ...INTERVENTIONS]);
  assert.deepEqual(INTERVENTIONS, IVS.map(i => `${i.code} ${i.name}`));
  assert.deepEqual(INTERVENTION_LIST, INTERVENTIONS, 'the drafting engine\'s list is the form\'s list');
  assert.deepEqual(seed.interventions.map(i => `${i.code} ${i.name}`), INTERVENTIONS, 'seed.json interventions are the same seven');
  const labelsOf = f => new Set(FORMS[f].fields.flatMap(x => x.type === 'table' ? x.rows.flatMap(r => x.cols.map(c => `${r} — ${c}`)) : [x.label]));
  const sc = draftScreening({ transcript, today: '2026-10-16' }); const scLabels = labelsOf('screening');
  for (const b of sc.boxes) assert.ok(scLabels.has(b.label), 'screening: ' + b.label);
  for (const b of sc.blank) assert.ok(scLabels.has(b.label), 'screening blank: ' + b.label);
  const cnaD = draftSeeded('cna', { client: { id: 'TW' }, screening: { facts: sc.facts, boxes: sc.boxes }, today: '2026-10-16', rules: asamState.rules });
  for (const b of cnaD.boxes) assert.ok(labelsOf('cna').has(b.label), 'cna: ' + b.label);
  const req = REQ('R-0411', '2.1');
  const forms = { 'sra-initial': draftInitialSRA({ client: { initials: 'T.W.' }, screening: { facts: sc.facts, when: '2026-10-16' }, referral: { id: 'REF-118' }, school: SCHOOL, today: '2026-10-22', request: req, ...asamSources(asamState, 'TW') }),
    'sra-continued': draftSeeded('sra-continued', { client: { id: 'MR', initials: 'M.R.' }, notes: [], today: '2026-10-29', request: req, ...asamSources(asamState, 'MR') }),
    isp: draftSeeded('isp', { client: { id: 'TW', initials: 'T.W.' }, screening: { facts: sc.facts }, today: '2026-10-29' }), weekly: draftSeeded('weekly', { client: { id: 'MR' }, today: '2026-10-29' }),
    collateral: draftSeeded('collateral', { client: { id: 'MR' }, today: '2026-10-29' }), quarterly: draftSeeded('quarterly', { client: { id: 'MR' }, notes: [], today: '2026-10-29' }),
    incident: draftSeeded('incident', { client: { id: 'DW' }, today: '2026-10-29' }), discharge: draftSeeded('discharge', { client: { id: 'MR' }, notes: [], today: '2026-10-29' }) };
  for (const [f, d] of Object.entries(forms)) { const ls = labelsOf(f); for (const b of d.boxes) assert.ok(ls.has(b.label), `${f}: "${b.label}" is not a field on the Lauris form`); for (const b of d.blank) assert.ok(ls.has(b.label) || /^Dimension ratings|^Level of care rec|^Clinical rationale/.test(b.label), `${f} blank: ${b.label}`); }
  // the daily note keeps every label other code looks up
  for (const l of ['Objective addressed', 'Interventions', 'Narrative', 'Mood check-in', 'Progress today', 'Direct time', 'Units', 'Contact time']) assert.ok(FORMS.dpn.fields.some(f => f.label === l), l);
  assert.equal(FORMS.dpn.fields.find(f => f.label === 'Service').prefill({ program: 'TDT' }), 'H0015 (IOP day)'); assert.equal(FORMS.dpn.fields.find(f => f.label === 'Service').prefill({ program: 'Outpatient' }), '');
  assert.equal(FORMS.dpn.fields.find(f => f.label === 'Setting').prefill({ school: 'Lynchburg City · Main IOP' }), 'Treatment site · Main IOP');
  // the reading of a stored assessment is asam.js's: the request level check uses its levelCheck
  assert.equal(levelCheck(latestAssessment(asamState, 'JO'), '2.1').state, 'over');
});

// 05b ICE-04: the initial request never states a count, intensity or consequence that the call or the assessment did not give
test('Flow C · initial request: no screening facts, no assessment and no partner numbers = "Evidence missing", never a number nobody gave', () => {
  const none = draftInitialSRA({ client: { initials: 'X.Y.' }, screening: { facts: {}, when: '2026-10-20' }, referral: { id: 'REF-9' }, school: null, today: '2026-10-29', request: { id: 'R-1', units_requested: 150, dates: '2026-10-30 to 2027-01-26' } });
  for (const i of [1, 2, 3, 4, 5, 6]) { const b = box(none, new RegExp('^Dimension ' + i)); assert.match(b.value, /^Evidence missing — verify/); assert.ok(b.missing); }
  assert.ok(!/office referral|incident|moderate|, ,|\?|Rated/i.test(none.boxes.map(b => b.value).join(' ')), 'nothing invented anywhere in the draft');
  // the call but not the assessment or the partner: only the call's words, and the partner's counts reported as missing
  const sc = draftScreening({ transcript, today: '2026-10-16' });
  const call = draftInitialSRA({ client: { initials: 'T.W.' }, screening: { facts: sc.facts, when: '2026-10-16' }, referral: { id: 'REF-118' }, school: null, today: '2026-10-22', request: REQ('R-1', '2.1'), ...asamSources(asamState, 'TW') });
  const v = box(call, /^Dimension 6/).value; assert.ok(!/Unexcused|ISS past|OSS|passing|, ,|\?/.test(v), v);
  // every source of every initial-request draft carries a date (or says it is unknown)
  for (const d of [none, call]) for (const x of d.sources) assert.ok(x.date && x.date_label, JSON.stringify(x));
  assert.equal(none.sources[2].date, 'undated'); assert.equal(none.sources[2].date_label, 'Evidence missing — date unknown');
  assert.equal(none.sources[4].date, 'undated', 'no assessment, no date');
});

// every drafter, called with NO record behind it (a client who has none): nothing that belongs to another client or to the demo story is written
test('drafts with no record behind them print "Evidence missing", never another client\'s facts or the demo\'s', () => {
  const client = { id: 'ZZ', initials: 'Z.Z.' };
  const story = /D\.W\.|T\.W\.|M\.R\.|Centra|Piedmont|Blue Ridge|Alvarez|Oct 6|Nov 24|grandmother|stepfather|cannabis|alcohol|emergency department|vape/i;
  const bad = [];
  for (const form of ['cna', 'isp', 'weekly', 'collateral', 'incident', 'quarterly', 'sra-continued', 'discharge']) {
    const d = draftSeeded(form, { client, notes: [], samples: [], today: '2026-10-29', ...asamSources(asamState, 'ZZ') });
    for (const b of d.boxes) if (!/^Evidence missing/.test(b.value) && story.test(b.value) && !(form === 'isp' && /^Goal|^Start|^Prescribed/.test(b.label))) bad.push(`${form}/${b.label}: ${b.value.slice(0, 80)}`);
    for (const x of d.sources) assert.ok(x.date && x.date_label, `${form} source ${x.n} has a date or says it is unknown`);
  }
  assert.deepEqual(bad, []);
  const none = draftSeeded('incident', { client, today: '2026-10-29' });
  assert.ok(none.boxes.every(b => /^Evidence missing/.test(b.value)));
});
