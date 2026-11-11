// Acceptance tests from seed/scripts: Flow A (screening call) and Flow B (dictation → daily note).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { draftScreening, enhanceDictation, draftInitialSRA, draftSeeded, contactTime, screeningFacts, screeningPrompts } from '../web/js/shared/draft.js';
import { unitsFor, unitBands } from '../web/js/shared/rules.js';
import { unitsForDirectMinutes } from '../web/js/shared/dates.js';

const transcript = fs.readFileSync(new URL('../seed/scripts/screening_TW.txt', import.meta.url), 'utf8');
const seed = JSON.parse(fs.readFileSync(new URL('../seed/seed.json', import.meta.url), 'utf8'));

test('Flow A · screening transcript drafts the expected boxes', () => {
  const d = draftScreening({ transcript, today: '2026-10-16', guardianPhone: '(434) 555-0147', referral: { id: 'REF-118' } });
  const v = l => d.boxes.find(b => b.label === l)?.value;
  assert.equal(v('Guardian on the call'), 'Grandmother (legal guardian) · (434) 555-0147');
  for (const [row, cells] of Object.entries({
    'Physical aggression toward peers': ['Y', '2–3× / week', '5–20 min', 'Moderate', 'Shoved a classmate at lunch; 2 office referrals this month'],
    'Leaving the classroom / building': ['Y', '~1× / week', '10–30 min', 'High', 'Left to the parking lot 10/6 — 1 day ISS'],
    'Verbal aggression / threats': ['Y', 'Daily', '<5 min', 'Low–mod']
  })) ['Y/N', 'Frequency', 'Duration', 'Intensity', 'Example given'].forEach((c, i) => cells[i] && assert.equal(v(`${row} — ${c}`), cells[i], `${row} ${c}`));
  assert.equal(v('Self-harm statements — Y/N'), 'N');
  assert.equal(v('Self-harm statements — Example given'), 'Asked directly; grandmother says no');
  assert.equal(v('Withdrawal / internalizing — Example given'), 'Sleeps well; not sad per guardian; goes to his room after school');
  assert.equal(v('Prior / current services (provider · dates · outcome)'), 'Outpatient: Piedmont Counseling, Mar–Jun (last spring · confirm the year), ~6 sessions, ended (transportation); no improvement seen');
  assert.equal(v('School coordination to date'), 'Behaviour interventionist 2×/week since Sep; check-in/check-out; IEP accommodations in place; school has raised alternative placement twice');
  assert.equal(v('Medical · medications'), 'No current medications; asthma, inhaler at school');
  assert.equal(v('Strengths'), 'Basketball; drawing; does well one-to-one with an adult');
  assert.ok(v('Narrative summary').length > 100, 'narrative drafted');
  assert.ok(!v('Meets admission criteria?') && !v('Preliminary diagnosis'), 'decision and diagnosis left blank');
  assert.equal(d.boxes.at(-1).label, 'Narrative summary', 'narrative last');
  const rows = new Set(d.boxes.map(b => b.row || b.label));
  assert.equal(rows.size, 11, '11 boxes drafted from the call (6 before + 11 + 2 left blank = 19)');
  assert.ok(d.checks.every(c => c.pass), JSON.stringify(d.checks.filter(c => !c.pass)));
  // narrative adds no new facts: every number in it appears in the boxes
  const nums = (v('Narrative summary').match(/\d+/g) || []);
  const rest = d.boxes.filter(b => b.label !== 'Narrative summary').map(b => b.value).join(' ');
  for (const n of nums) assert.ok(rest.includes(n), 'narrative number ' + n + ' traced');
});

test('Flow A · prompts tick as answers are heard', () => {
  const lines = transcript.split('\n');
  const before = screeningPrompts(screeningFacts(lines.slice(0, 8).join('\n')));
  assert.ok(before.every(p => !p.done));
  const after = screeningPrompts(screeningFacts(transcript));
  assert.deepEqual(after.filter(p => p.done).map(p => p.key).sort(), ['c1', 'c2', 'c3', 'int', 'loc', 'sh']);
});

test('Flow A · an empty prior-service outcome blocks and asks', () => {
  const t = transcript.replace(/Not that I could see\./, 'I am not sure.');
  const d = draftScreening({ transcript: t, today: '2026-10-16' });
  assert.ok(!d.boxes.find(b => b.label.startsWith('Prior')));
  assert.equal(d.checks.find(c => c.rule.startsWith('Prior')).pass, false);
});

test('Flow B · dictation stays the staffer\'s own facts: no template, no invented times, events or outcomes', () => {
  const mr = seed.clients.find(c => c.id === 'MR');
  const blocks = seed.notes_sample[0].contact_time;
  const text = 'played basketball with M.R. after he got upset in math, he cooled down after and went back to class';
  const e = enhanceDictation({ text, client: mr, goals: mr.goals, interventions: seed.interventions, blocks });
  assert.equal(e.narrative, 'Played basketball with M.R. after he got upset in math, he cooled down after and went back to class.');
  assert.ok(!/6 min|lost the game|walked off|co-regulation|Frustrated|Obj/i.test(e.narrative + e.mood + e.progress), 'nothing added to the words');
  assert.equal(e.objective, null, 'no objective chosen for the staffer');
  assert.equal(e.mood, ''); assert.equal(e.progress, '');
  assert.ok(e.questions.some(q => /ISP objective/.test(q.q)), 'asks which objective');
  assert.ok(e.questions.some(q => /What did you do/.test(q.q)), 'asks what the staffer did');
  assert.equal(e.checks.find(c => /ISP objective/.test(c.rule)).pass, false, 'objective not linked until the staffer names one');
});

test('Flow B · a named objective is used; an unnamed one is a question', () => {
  const mr = seed.clients.find(c => c.id === 'MR');
  const e = enhanceDictation({ text: 'Practiced the visual timer with M.R. in math, goal 3, he stayed on task 15 of 30 min.', client: mr, goals: mr.goals, interventions: seed.interventions });
  assert.equal(e.objective, 3);
  assert.ok(!e.questions.some(q => /ISP objective/.test(q.q)));
});

test('Flow B · negative case: "observed" is flagged and a question is raised; the words are not changed', () => {
  const mr = seed.clients.find(c => c.id === 'MR');
  const e = enhanceDictation({ text: 'I observed her at lunch and she sat alone', client: mr, goals: mr.goals, interventions: seed.interventions });
  assert.equal(e.narrative, 'I observed her at lunch and she sat alone.');
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
  // 220 minutes = 2 units (the confirmed M.R. daily note), and contactTime uses the configured bands
  s.rules[0].value = [[120, 1], [180, 2], [300, 3]];
  assert.equal(unitsFor(s, 'tdt', 220), 2);
  assert.equal(contactTime([['08:00', '11:40', 'a']], { s }).units, 2);
  assert.equal(contactTime([['08:00', '09:00', 'a']], { s }).units, 0);
});

test('Evidence · counts come from stored notes; missing evidence prints "Evidence missing"; household is not included by default', () => {
  const mr = { id: 'MR', initials: 'M.R.' };
  const none = draftSeeded('sra-continued', { client: mr, notes: [], today: '2026-10-29' });
  assert.match(none.boxes.find(b => b.label === 'Progress toward goals').value, /Evidence missing/);
  assert.ok(none.boxes.find(b => b.label === 'Progress toward goals').missing);
  assert.ok(!/21|61/.test(none.sources.map(x => x.label).join(' ')), 'no constant counts');
  const notes = [1, 2, 3].map(i => ({ client: 'MR', type: 'daily', date: `2026-10-2${i}`, objective: i === 3 ? 2 : 1, interventions: ['Clinical 2.1'] }));
  const some = draftSeeded('sra-continued', { client: mr, notes, today: '2026-10-29' });
  assert.match(some.boxes.find(b => b.label === 'Progress toward goals').value, /3 daily notes/);
  assert.match(some.sources[0].label, /Daily notes \(3\)/);
  assert.ok(!some.boxes.some(b => /household/i.test(b.label)), 'household not included by default');
  assert.equal(some.checks.find(c => c.rule === 'Household disclosure').detail, 'Not included · you decide');
  // another student's quarterly never falls back to M.R.'s numbers
  const q = draftSeeded('quarterly', { client: { id: 'DW', initials: 'D.W.' }, notes: [], today: '2026-10-29' });
  assert.ok(q.boxes.every(b => /Evidence missing/.test(b.value)));
  // a discharge draft writes no future event as done
  const d = draftSeeded('discharge', { client: { id: 'TN', initials: 'T.N.' }, notes: [], today: '2026-10-29' });
  assert.ok(!d.boxes.some(b => /notified|Nov 24|Dec 5/.test(b.value)));
});

test('Flow C · initial SRA leaves criterion 3 blank when 1 and 2 are met, and never drafts trauma-informed care', () => {
  const sc = draftScreening({ transcript, today: '2026-10-16' });
  const school = { reported: '2026-10-19', by: 'rbell', unexcused_absences: 9, iss_days_6mo: 1, oss_days_6mo: 0, classes: 7, passing: 4, incident_dates: ['2026-10-14', '2026-10-20'] };
  const d = draftInitialSRA({ client: { initials: 'T.W.' }, screening: { facts: sc.facts, when: '2026-10-16' }, referral: seed.referrals.find(r => r.id === 'REF-118'), school, today: '2026-10-22' });
  assert.equal(d.boxes.length, 7);
  assert.ok(d.blank.find(b => b.label.includes('criterion 3')).why.includes('two of three'));
  assert.ok(!d.boxes.find(b => b.label.includes('trauma')));
  assert.match(d.boxes.find(b => b.label.includes('criterion 2')).value, /Piedmont Counseling, Mar–Jun/);
  assert.ok(d.checks.every(c => c.pass), JSON.stringify(d.checks.filter(c => !c.pass)));
});

// 05b ICE-04: the initial request never states a count, intensity or consequence that the call or the school did not give
test('Flow C · initial SRA: no screening facts and no school numbers = "Evidence missing", never a number nobody gave', () => {
  const none = draftInitialSRA({ client: { initials: 'X.Y.' }, screening: { facts: {}, when: '2026-10-20' }, referral: { id: 'REF-9' }, school: null, today: '2026-10-29', request: { id: 'R-1', units_requested: 150, dates: '2026-10-30 to 2027-01-26' } });
  const c1 = none.boxes.find(b => /criterion 1/.test(b.label));
  assert.match(c1.value, /^Evidence missing — verify/); assert.ok(c1.missing);
  assert.ok(!/office referral|in-school suspension|moderate|lasting \?|, ,/i.test(none.boxes.map(b => b.value).join(' ')), 'nothing invented anywhere in the draft');
  // the call but not the school: only the call's words, an empty-slot-free sentence, and the school's counts reported as missing
  const sc = draftScreening({ transcript, today: '2026-10-16' });
  const call = draftInitialSRA({ client: { initials: 'T.W.' }, screening: { facts: sc.facts, when: '2026-10-16' }, referral: { id: 'REF-118' }, school: null, today: '2026-10-22' });
  const v = call.boxes.find(b => /criterion 1/.test(b.label)).value;
  assert.match(v, /2–3 times a week/); assert.ok(!/Unexcused|ISS past|OSS|passing|, ,|\?/.test(v), v);
  assert.equal(call.checks.find(c => c.rule === 'Numbers').pass, false); assert.match(call.checks.find(c => c.rule === 'Numbers').detail, /Evidence missing — verify the school/);
  // every source of every initial-request draft carries a date (or says it is unknown)
  for (const d of [none, call]) for (const x of d.sources) assert.ok(x.date && x.date_label, JSON.stringify(x));
  assert.equal(none.sources[2].date, 'undated'); assert.equal(none.sources[2].date_label, 'Evidence missing — date unknown');
});

// every drafter, called with NO record behind it (a student who has none): nothing that belongs to another student or to the demo story is written
test('drafts with no record behind them print "Evidence missing", never another student\'s facts or the demo\'s', () => {
  const client = { id: 'ZZ', initials: 'Z.Z.' };
  const story = /D\.W\.|T\.W\.|M\.R\.|Centra|Piedmont|MS-2|Oct 6|R\. Bell|Nov 24|maternal|walked at 13|grandmother|13 months|speech delay|office referral|in-school suspension|moderate/i;
  const bad = [];
  for (const form of ['cna', 'isp', 'weekly', 'collateral', 'incident', 'quarterly', 'sra-continued', 'discharge']) {
    const d = draftSeeded(form, { client, notes: [], samples: [], today: '2026-10-29' });
    for (const b of d.boxes) if (!/^Evidence missing/.test(b.value) && story.test(b.value) && !(form === 'isp' && /^Goal|^Start|^Prescribed|^Goal/.test(b.label))) bad.push(`${form}/${b.label}: ${b.value.slice(0, 80)}`);
    for (const x of d.sources) assert.ok(x.date && x.date_label, `${form} source ${x.n} has a date or says it is unknown`);
  }
  assert.deepEqual(bad, []);
  const none = draftSeeded('incident', { client, today: '2026-10-29' });
  assert.ok(none.boxes.every(b => /^Evidence missing/.test(b.value)));
});

