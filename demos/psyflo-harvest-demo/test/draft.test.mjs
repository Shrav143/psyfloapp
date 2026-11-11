// Acceptance tests from seed/scripts: Flow A (screening call) and Flow B (dictation → daily note).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { draftScreening, enhanceDictation, draftInitialSRA, screeningFacts, screeningPrompts } from '../web/js/shared/draft.js';

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
  assert.equal(v('Prior / current services (provider · dates · outcome)'), 'School counseling weekly since Sep 2025 — ongoing. Outpatient: Piedmont Counseling, Mar–Jun 2025, ~6 sessions, ended (transportation); no improvement seen');
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

test('Flow B · dictation becomes the daily-note paragraph with three chips', () => {
  const mr = seed.clients.find(c => c.id === 'MR');
  const blocks = seed.notes_sample[0].contact_time;
  const e = enhanceDictation({ text: 'played basketball with M.R. after he got upset in math, he cooled down after and went back to class', client: mr, goals: mr.goals, interventions: seed.interventions, blocks });
  assert.equal(e.narrative, seed.notes_sample[0].enhanced);
  assert.match(e.phone, /movement intervention \(basketball, 6 min\).*Goal 1/);
  assert.equal(e.chips.length, 3);
  assert.deepEqual(e.chips.map(c => c.from), ['from the ISP drop-down', 'from your timer and what you said', 'from the plan']);
  assert.ok(e.checks.every(c => c.pass), JSON.stringify(e.checks));
  assert.equal(e.mood, 'Frustrated → calm');
});

test('Flow B · negative case: "observed" is rewritten and the check shows as fixed', () => {
  const mr = seed.clients.find(c => c.id === 'MR');
  const e = enhanceDictation({ text: 'Observed client during math; he stayed on task 15 of 30 min.', client: mr, goals: mr.goals, interventions: seed.interventions });
  assert.equal(e.narrative, 'Worked with M.R. during math using a visual timer and prompted re-entry twice; on task 15 of 30 min (Obj. 3).');
  const c = e.checks.find(c => c.rule === 'No "observed"');
  assert.ok(c.pass && c.fixed);
});

test('Flow C · initial SRA leaves criterion 3 blank when 1 and 2 are met, and never drafts trauma-informed care', () => {
  const sc = draftScreening({ transcript, today: '2026-10-16' });
  const d = draftInitialSRA({ client: { initials: 'T.W.' }, screening: { facts: sc.facts, when: '2026-10-16' }, referral: seed.referrals.find(r => r.id === 'REF-118'), today: '2026-10-22' });
  assert.equal(d.boxes.length, 7);
  assert.ok(d.blank.find(b => b.label.includes('criterion 3')).why.includes('two of three'));
  assert.ok(!d.boxes.find(b => b.label.includes('trauma')));
  assert.match(d.boxes.find(b => b.label.includes('criterion 2')).value, /Piedmont Counseling, Mar–Jun 2025/);
  assert.ok(d.checks.every(c => c.pass), JSON.stringify(d.checks.filter(c => !c.pass)));
});
