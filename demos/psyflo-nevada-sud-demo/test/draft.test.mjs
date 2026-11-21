// Acceptance tests from seed/scripts (CCC of SN · adult SUD · ASAM): Flow A (intake screening call → boxes),
// the ASAM assessment and treatment plan drafts, Flow C (prior authorization request) and the continued-stay
// "abstinent in treatment" rule, plus the IOP group note dictation (hidden screen).
// Fixtures live here, not in seed.json, so the tests do not depend on the seed's wording.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { draftScreening, enhanceDictation, draftInitialSRA, draftAssessment, draftPlan, draftContinuedStay, screeningFacts, screeningPrompts, levelFromRatings, CHECKS, dimLabel, DIMENSIONS } from '../web/js/shared/draft.js';
import { FORMS } from '../server/lauris/forms.js';

const transcript = fs.readFileSync(new URL('../seed/scripts/screening_TW.txt', import.meta.url), 'utf8');
const TW = { id: 'TW', initials: 'T.W.', medicaid: { plan: 'humana' } };
const MR = { id: 'MR', initials: 'M.R.', service_start: '2026-08-31', abstinent_since: '2026-09-24', quarter: { days: 24, uds: '8 of 8 negative since Sep 24', phq9: [14, 11, 8], bam_use_days: [18, 4, 0] }, authorization: { payer: 'anthem', units: 36, used: 27, start: '2026-10-09', end: '2026-11-13' } };
const sc = () => draftScreening({ transcript, today: '2026-10-16', referral: { id: 'REF-118' } });

// every label Psyflo drafts must exist on the Client Record form it is typed into (the bridge fills by label)
function formLabels(form) {
  const out = new Set();
  for (const f of FORMS[form].fields) {
    if (f.type === 'table') f.rows.forEach(r => f.cols.forEach(c => out.add(`${r} — ${c}`)));
    else if (f.type === 'phq') for (let k = 1; k <= 9; k++) out.add(`PHQ item ${k}`);
    else out.add(f.label);
  }
  return out;
}
const assertLabels = (form, boxes) => { const L = formLabels(form); for (const b of boxes) assert.ok(L.has(b.label), `${form}: no box labelled "${b.label}"`); };

test('Flow A · intake screening transcript drafts the expected boxes', () => {
  const d = sc();
  const v = l => d.boxes.find(b => b.label === l)?.value;
  const op = 'Opioids (fentanyl / heroin / pills)', alc = 'Alcohol', st = 'Stimulants (methamphetamine / cocaine)';
  assert.equal(v(`${op} — Y/N`), 'Y');
  assert.equal(v(`${op} — Last use`), '10/10 · half a pill, while on buprenorphine');
  assert.equal(v(`${op} — Route`), 'Smoked');
  assert.equal(v(`${alc} — Last use`), '10/15 · night before the call');
  assert.equal(v(`${alc} — Amount / notes`), '6–8 beers');
  assert.equal(v(`${st} — Y/N`), 'N');
  assert.match(v('Withdrawal risk (D1)'), /morning tremor and sweats.*no history of seizures or DTs/);
  assert.match(v('MAT / medications · prescriber'), /^Buprenorphine\/naloxone 16 mg daily since Aug 2026 · Dr\. Ahn, Valley Family Medicine \(outside prescriber\); next visit 10\/28; release to coordinate agreed$/);
  assert.equal(v('Overdose history · naloxone'), 'One opioid overdose, Jan 2026, reversed with naloxone by his sister; naloxone in the home');
  assert.equal(v('Prior treatment (provider · level · dates · outcome)'), 'Withdrawal management, Mesa Withdrawal Center, Feb 2025 — completed; returned to use within 2 weeks. Withdrawal management, Mesa Withdrawal Center, Aug 2026, 5 days — completed; buprenorphine started at discharge. Buprenorphine, 2024, about 4 months — abstinent while taking it; returned to use after stopping. Outpatient (Level 1), Canyon Outpatient Services, Jan–Apr 2026, 9 sessions — stopped attending (lost transportation); used throughout; no improvement');
  assert.equal(v('Legal involvement / drug court'), 'Clark County drug court, phase 1 (possession charge, Jul 2026); weekly Tuesday check-ins with random UDS; 3 missed check-ins and 4 positive drug screens since Sep 2026; referral REF-118');
  assert.equal(v('Housing / living situation'), "Staying on his sister's couch in Henderson since Sep 2026, conditional on treatment; slept in his car before that");
  assert.equal(v('Reason for seeking treatment (own words)'), '"I\'m tired of it. I want to see my daughter again."');
  assert.equal(v('Strengths / recovery supports'), 'Wants to keep his warehouse job; his sister; wants his visits with his daughter back');
  assert.ok(v('Narrative summary').length > 200, 'narrative drafted');
  assert.equal(d.boxes.at(-1).label, 'Narrative summary', 'narrative last');
  for (const l of ['HIV / HCV status (optional)', 'Meets admission criteria?', 'Preliminary diagnosis']) {
    assert.ok(!v(l), l + ' not drafted'); assert.ok(d.blank.find(b => b.label === l), l + ' left for the clinician');
  }
  assert.ok(!d.boxes.some(b => /hiv|hcv|hepatitis/i.test(b.value)), 'nothing about HIV / HCV drafted');
  assert.equal(new Set(d.boxes.map(b => b.row || b.label)).size, 13, '13 boxes drafted from the call');
  assert.ok(d.checks.every(c => c.pass), JSON.stringify(d.checks.filter(c => !c.pass)));
  assertLabels('screening', d.boxes);
  // narrative adds no new facts: every number in it appears in the other boxes
  const nums = (v('Narrative summary').match(/\d+/g) || []);
  const rest = d.boxes.filter(b => b.label !== 'Narrative summary').map(b => b.value).join(' ');
  for (const n of nums) assert.ok(rest.includes(n), 'narrative number ' + n + ' traced');
});

test('Flow A · "Before you hang up" ticks by ASAM dimension as answers are heard', () => {
  const lines = transcript.split('\n');
  const before = screeningPrompts(screeningFacts(lines.slice(0, 4).join('\n')));
  assert.ok(before.every(p => !p.done));
  const after = screeningPrompts(screeningFacts(transcript));
  assert.deepEqual(after.filter(p => p.done).map(p => p.key).sort(), ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'hiv', 'uds']);
});

test('Flow A · an empty prior-treatment outcome blocks and asks', () => {
  const t = transcript.replace(/It didn't really help\./, 'I am not sure.');
  const d = draftScreening({ transcript: t, today: '2026-10-16' });
  assert.ok(!d.boxes.find(b => b.label.startsWith('Prior')));
  assert.equal(d.checks.find(c => c.rule.startsWith('Prior')).pass, false);
  assert.equal(screeningPrompts(d.facts).find(p => p.key === 'd5').done, false);
});

test('ASAM assessment · six dimensions rated, level of care consistent, UDS recorded', () => {
  const s = sc();
  const a = draftAssessment({ client: TW, screening: { facts: s.facts, boxes: s.boxes, when: '2026-10-16' }, referral: { id: 'REF-118' }, today: '2026-10-20' });
  for (const [d] of DIMENSIONS) { assert.ok(a.boxes.find(b => b.label === dimLabel(d, 'risk (0–4)')), d + ' rated'); assert.ok(a.boxes.find(b => b.label === dimLabel(d, 'narrative')), d + ' narrative'); }
  assert.deepEqual(a.ratings, { D1: 2, D2: 1, D3: 2, D4: 2, D5: 3, D6: 3 });
  assert.equal(a.boxes.find(b => b.label === 'Level-of-care recommendation').value, 'Level 2.1 · Intensive outpatient (IOP)');
  assert.match(a.boxes.find(b => b.label === 'UDS at assessment (date · result)').value, /^10\/20\/2026 · Positive: buprenorphine \(prescribed\), fentanyl/);
  assert.ok(a.boxes.find(b => b.label.startsWith('Presenting')).copied, 'copied from the screening');
  assert.ok(a.blank.find(b => b.label === 'Trauma history'));
  assert.ok(a.checks.every(c => c.pass), JSON.stringify(a.checks.filter(c => !c.pass)));
  assertLabels('cna', a.boxes);
});

test('Level of care follows the ratings', () => {
  assert.equal(levelFromRatings({ D1: 1, D2: 1, D3: 2, D4: 2, D5: 3, D6: 3 }), '2.1');
  assert.equal(levelFromRatings({ D1: 0, D2: 0, D3: 1, D4: 1, D5: 2, D6: 1 }), '1');
  assert.equal(levelFromRatings({ D1: 3, D2: 0, D3: 1, D4: 1, D5: 2, D6: 1 }), 'WM');
  assert.equal(CHECKS.levelMatches({ D1: 0, D2: 0, D3: 1, D4: 1, D5: 1, D6: 1 }, '2.1').pass, false, 'Level 2.1 with low ratings is flagged');
  assert.equal(CHECKS.allRated({ D1: 1, D2: 1, D3: 2, D4: 2, D5: 3 }).pass, false, 'a missing dimension is flagged');
});

test('Treatment plan · goals by dimension, measurable, interventions from the list', () => {
  const p = draftPlan({ client: TW, today: '2026-10-21' });
  assert.equal(p.boxes.find(b => b.label === 'Frequency').value, 'IOP 3 h/day, 3 days/week');
  assert.equal(p.boxes.find(b => b.label === 'Goal 1 · Problem (ASAM dimension)').value, 'D5 Relapse, continued use or continued problem potential');
  assert.deepEqual([1, 2, 3].map(n => p.boxes.find(b => b.label === `Goal ${n} · Intervention 1`).value), ['CBT-RP Relapse prevention (CBT)', 'MAT-C MAT coordination', 'PS Peer recovery support']);
  assert.ok(p.checks.every(c => c.pass), JSON.stringify(p.checks.filter(c => !c.pass)));
  assertLabels('isp', p.boxes);
});

test('Flow C · prior authorization R-0416: 72 units H0015, six dimensions, UDS attached, attestation left blank', () => {
  const s = sc();
  const d = draftInitialSRA({ client: TW, screening: { facts: s.facts, boxes: s.boxes, when: '2026-10-16' }, referral: { id: 'REF-118' }, today: '2026-10-22', cna: { date: '2026-10-20' } });
  assert.equal(d.units, 72);
  assert.equal(d.boxes.find(b => b.label === 'Start date / units / schedule').value, '10/22/2026 – 12/16/2026 · 72 units H0015 · 9/week × 8 weeks (IOP 3 h/day, 3 days/week)');
  for (const [k] of DIMENSIONS) assert.match(d.boxes.find(b => b.label === dimLabel(k, 'medical necessity')).value, /^Risk \d\. /, k);
  assert.match(d.boxes.find(b => b.label === dimLabel('D5', 'medical necessity')).value, /Feb 2025.*Jan–Apr 2026/);
  assert.match(d.boxes.find(b => b.label === 'UDS at assessment').value, /attached to the packet/);
  assert.ok(d.blank.find(b => b.label === 'Clinician attestation'));
  assert.ok(!d.boxes.some(b => /hiv|hcv|hepatitis/i.test(b.value)), 'nothing about HIV / HCV in the request');
  assert.ok(d.checks.every(c => c.pass), JSON.stringify(d.checks.filter(c => !c.pass)));
  assertLabels('sra-initial', d.boxes);
});

test('Flow C · the packet is blocked without the UDS, and a backdated start is caught', () => {
  const s = sc();
  const d = draftInitialSRA({ client: TW, screening: { facts: s.facts, boxes: s.boxes }, today: '2026-10-22', assessment: { ratings: { D1: 1, D2: 1, D3: 2, D4: 2, D5: 3, D6: 3 }, uds: null } });
  assert.equal(d.checks.find(c => c.rule === 'UDS result attached').pass, false);
  assert.equal(CHECKS.noBackdate('2026-10-20', '2026-10-22').pass, false);
  assert.equal(CHECKS.unitsMath(80, { hoursPerDay: 3, daysPerWeek: 3, weeks: 8 }).pass, false);
});

test('Continued stay R-0411 · abstinent in treatment is argued under D5, never "no longer needs"', () => {
  const d = draftContinuedStay({ client: MR, today: '2026-10-29' });
  assert.equal(d.units, 36);
  assert.equal(d.boxes.find(b => b.label === 'Request').value, '11/14/2026 – 12/11/2026 · 36 units H0015 · 9/week × 4 weeks');
  assert.match(d.boxes.find(b => b.label === 'D5 · why Level 2.1 is still needed').value, /inside the Level 2\.1 structure.*negative since Sep 24.*D5 remains 3/);
  assert.ok(d.checks.every(c => c.pass), JSON.stringify(d.checks.filter(c => !c.pass)));
  assertLabels('sra-continued', d.boxes);
  const bad = draftContinuedStay({ client: MR, today: '2026-10-29', wording: 'Client has been abstinent and no longer needs IOP.' });
  assert.equal(bad.checks[0].pass, false, '"no longer needs" is caught');
});

test('Adult language · school and guardian words are caught', () => {
  assert.equal(CHECKS.adultLanguage('Guardian joined the call').pass, false);
  assert.equal(CHECKS.adultLanguage('Sister joined the call').pass, true);
});

test('IOP group note · dictation becomes the note paragraph with three chips', () => {
  const goals = [{ n: 1, name: 'relapse prevention', objective: 'Use a written relapse-prevention plan', interventions: ['CBT relapse prevention', 'Motivational interviewing (MI)'] }];
  const e = enhanceDictation({ text: "Maria shared in group that she had strong cravings Saturday at her cousin's party, she left early and called her sponsor, we practiced urge surfing", client: MR, goals, interventions: [] });
  assert.equal(e.narrative, "Facilitated CBT relapse prevention with M.R. in IOP group. M.R. described strong cravings at her cousin's party on Saturday; she left early and called her sponsor. Staff led an urge-surfing exercise with the group. Addresses treatment plan Goal 1 (relapse prevention, D5).");
  assert.equal(e.chips.length, 3);
  assert.ok(e.checks.every(c => c.pass), JSON.stringify(e.checks));
  const n = enhanceDictation({ text: 'Observed client in group; she participated in 2 of 3 exercises.', client: MR, goals, interventions: [] });
  assert.equal(n.narrative, 'Facilitated CBT relapse prevention with M.R. in IOP group and prompted her to share twice; she participated in 2 of 3 exercises (Goal 1).');
  const c = n.checks.find(c => c.rule === 'No "observed"');
  assert.ok(c.pass && c.fixed);
});
