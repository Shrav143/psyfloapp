// R7 · Oprox parity, Authorizations selectors: web/js/shared/sel/auth-intel.js (rowSignals, headerOf, submitOf, trajectoryOf, criteriaView, historicalView, authStatusOf,
// urgentOf, readStatusText, scrubText, previewOf). Standalone: `BASE=http://localhost:6300 node test/intel-auth.mjs` (test/run-all.mjs starts a fresh server for it).
// Proves, with exact values for the seeded requests R-0402, R-0391, R-0411, R-0395 and R-0416: the list and header signals (every role sees the dollars and the clock;
// only the clinician gets the packet line, the lift line and the sample figures), the trajectory (summary, trend, scores, drivers, engagement, risks), the payer criteria
// (rows, tiles, "to maximize"), the historical outcomes (chips, driver, strengths, interpretation), the Submit rule, the authorization panel and the pasted-text reader.
// The selectors are pure: this suite imports them directly, as the browser and the extension panel do.
import { suite, assert, state, reset, session } from './lib/index.mjs';
import { isClinician, bandsOf, recertCount, rowSignals, headerOf, submitOf, trajectoryOf, criteriaView, historicalView, authStatusOf, urgentOf, readStatusText, scrubText, previewOf, ANALYSIS_STEPS } from '../web/js/shared/sel/auth-intel.js';
import { authRecsFor } from '../web/js/shared/recs.js';

const T = suite('intel-auth');
const IDS = ['R-0402', 'R-0391', 'R-0411', 'R-0395', 'R-0416'];
const WORDS = /\b(school|student|TDT|therapeutic day treatment|H2016|guardian|behaviou?r|classroom|teacher)\b/i;
await reset('canvas');
const s = await state('jperez'); const me = (await session('jperez')).actor;
const req = id => s.requests.find(x => x.id === id);
const sup = await state('cdiaz'); const supMe = (await session('cdiaz')).actor;
const adm = await state('dowens'); const admMe = (await session('dowens')).actor;
const round = n => (n == null ? null : Math.round(n * 10) / 10);

await T.test('who is the treating clinician: the clinician only, not the supervisor or the administrator', async () => {
  assert.eq(isClinician(me), true); assert.eq(isClinician(supMe), false); assert.eq(isClinician(admMe), false); assert.eq(isClinician(null), false);
});

await T.test('list signals: urgency, dollars at risk, band, recertification, needs-input count, packet line and lift line (exact, five requests)', async () => {
  const want = {
    'R-0402': { u: 'Due tomorrow', hours: 25.5, risk: [8200, 'gap', 40], band: 'week', recert: false, inputs: 1, packet: 'Packet built · 1 clinical input needed to complete', lift: 'Historically improves approval by +11 pts (sample)' },
    'R-0391': { u: 'Due in 4d', hours: 97.5, risk: [30750, 'pending', 150], band: 'week', recert: false, inputs: 6, packet: 'Packet built · 6 clinical inputs needed to complete', lift: 'Historically improves approval by +12 pts (sample)' },
    'R-0411': { u: 'Overdue 3d', hours: -70.5, risk: [8610, 'renewal', 42], band: 'day', recert: true, inputs: 4, packet: 'Packet built · 4 clinical inputs needed to complete', lift: 'Historically improves approval by +11 pts (sample)' },
    'R-0395': { u: '', hours: null, risk: [8610, 'renewal', 42], band: 'none', recert: true, inputs: 4, packet: 'Packet built · 4 clinical inputs needed to complete', lift: 'Historically improves approval by +11 pts (sample)' },
    'R-0416': { u: 'Due in 3d', hours: 73.5, risk: [30750, 'pending', 150], band: 'week', recert: false, inputs: 5, packet: 'Packet built · 5 clinical inputs needed to complete', lift: 'Historically improves approval by +11 pts (sample)' }
  };
  const b = bandsOf(s);
  for (const id of IDS) {
    const x = rowSignals(s, req(id), me, { bands: b }); const w = want[id];
    assert.deepEq({ u: x.urgency.label, hours: round(x.urgency.hours), risk: [x.risk.dollars, x.risk.kind, x.risk.units], band: x.band, recert: x.recertDue, inputs: x.inputs, packet: x.packet.text, lift: x.lift }, w, id);
    assert.eq(x.clinical, true); assert.match(x.risk.basis, /units × \$205 a unit \(demo assumption\)/); assert.match(x.risk.label, /^\$[\d,]+ at risk$/);
    assert.deepEq(authRecsFor(s, req(id)).length > 0, true, id + ': there are suggestions behind the packet line');
  }
  assert.eq(recertCount(s), 2, 'two recertifications due: R-0411 and R-0395');
  assert.deepEq(b.groups.map(g => [g.key, g.ids]), [['risk', ['R-0399']], ['day', ['R-0411', 'R-0408']], ['week', ['R-0416', 'R-0402', 'R-0391']], ['later', ['R-0388', 'R-0384']], ['none', ['R-0395', 'R-0380', 'R-0377']]], 'the bands over every request');
});

await T.test('roles: the supervisor and the administrator get the same urgency, dollars, band and recertification, and no packet line, lift line or input count', async () => {
  for (const [st, who] of [[sup, supMe], [adm, admMe]]) {
    for (const id of IDS) {
      const mine = rowSignals(s, req(id), me); const theirs = rowSignals(st, st.requests.find(x => x.id === id), who);
      assert.deepEq([theirs.urgency.label, round(theirs.urgency.hours), theirs.risk && theirs.risk.dollars, theirs.band, theirs.recertDue], [mine.urgency.label, round(mine.urgency.hours), mine.risk.dollars, mine.band, mine.recertDue], who.role + ' ' + id);
      assert.eq(theirs.clinical, false); assert.eq(theirs.packet, null); assert.eq(theirs.lift, ''); assert.eq(theirs.inputs, 0);
      const h = headerOf(st, st.requests.find(x => x.id === id), who); assert.eq(h.clinical, false); assert.eq(h.expected, null); assert.eq(h.confidence, null); assert.eq(h.comparable, null); assert.eq(h.risk.dollars, mine.risk.dollars);
    }
    assert.eq(recertCount(st), 2, who.role + ' sees the recertification count');
  }
});

await T.test('case header strip: expected approval, model confidence and comparable cases are sample figures with their basis (exact, five requests)', async () => {
  const want = { 'R-0402': [62, 96, 47, 0.89, 142], 'R-0391': [62, 96, 49, 0.72, 87], 'R-0411': [62, 96, 49, 0.79, 118], 'R-0395': [62, 96, 54, 0.79, 64], 'R-0416': [62, 96, 52, 0.75, 96] };
  for (const id of IDS) {
    const h = headerOf(s, req(id), me); assert.deepEq([h.expected.base, h.expected.expected, h.expected.lift, h.confidence.value, h.comparable.count], want[id], id);
    assert.ok(h.expected.sample && h.confidence.sample && h.comparable.sample, id + ': marked as a sample'); assert.match(h.expected.basis, /Illustrative sample/); assert.match(h.confidence.text, /Validated on similar cases/);
    assert.eq(h.rankedFirst, false, id + ' is not the highest financial risk');
  }
  const top = headerOf(s, s.requests.find(x => x.id === 'R-0399'), me); assert.eq(top.rankedFirst, true, 'R-0399 is the highest financial risk'); assert.eq(top.band, 'risk');
});

await T.test('submit rule: not ready while a suggestion still needs the clinician\'s words, then by the next step of the existing flow; ready only when signed', async () => {
  const r402 = req('R-0402'); const sub = submitOf(s, r402, authRecsFor(s, r402)); assert.eq(sub.ok, false); assert.eq(sub.label, 'Open the send step'); assert.match(sub.reason, /^1 suggestion still needs your own words/);
  assert.match(submitOf(s, req('R-0411'), authRecsFor(s, req('R-0411'))).reason, /^4 suggestions still need your own words/);
  assert.eq(submitOf(s, { ...r402, stage: 'draft_ready' }, []).reason, 'Not ready to send. Review the packet: Process Form is pressed in Lauris.');
  assert.match(submitOf(s, { ...r402, stage: 'needs_approval' }, []).reason, /^Not ready to send\. Approve the packet/); assert.match(submitOf(s, { ...r402, stage: 'awaiting_signature' }, []).reason, /^Not ready to send\. Sign in Lauris/);
  assert.deepEq(submitOf(s, { ...r402, stage: 'signed' }, []), { ok: true, label: 'Open the send step', reason: '' });
  assert.eq(submitOf(s, r402, []).reason, 'Nothing to send at this stage (Partial: decide).', 'no dash in the stage name');
});

await T.test('clinical trajectory: summary phrases, the ASAM trend by date, stored screening scores, drivers, engagement and risk signals (exact, five requests)', async () => {
  const t2 = trajectoryOf(s, req('R-0402'));
  assert.deepEq(t2.summary.map(x => x.value), ['F12.20, F10.10, F90.2', 'Sentara Health Plans', 'Level 2.1 · Intensive outpatient', 'Partial: decide · Continued stay', 'Lower risk: D4 3 to 2 since Jul 21', 'Ratings support Level 2.1: D3 (2), D5 (3) and D6 (3) are above what Level 1 can manage · 1 input needed']);
  assert.deepEq(t2.summary.map(x => x.label), ['Diagnosis', 'Payer', 'Level of care', 'Status', 'Trajectory', 'Auth readiness']); assert.eq(t2.summary[0].note, 'Client record · Cannabis · alcohol');
  assert.deepEq([t2.trend.labels, t2.trend.series.map(x => [x.name, x.points]), t2.trend.hasTrend, t2.trend.min, t2.trend.max], [['Jul 21', 'Oct 9'], [['Highest rating', [3, 3]], ['D5', [3, 3]], ['D6', [3, 3]], ['D3', [2, 2]]], true, 0, 4]);
  assert.deepEq(t2.trend.callouts.map(x => [x.name, x.value, x.label]), [['Highest rating', 3, 'Significant'], ['D5', 3, 'Significant'], ['D6', 3, 'Significant'], ['D3', 2, 'Moderate']]);
  assert.deepEq(t2.screens.series.map(x => [x.name, x.points]), [['PHQ-9', [9, 9]], ['GAD-7', [null, 10]]]); assert.deepEq(t2.screens.callouts.map(x => [x.name, x.current, x.previous]), [['PHQ-9', 9, 9], ['GAD-7', 10, null]]);
  assert.deepEq(t2.drivers.map(d => [d.short, d.rating, d.ratingLabel, d.date, d.gap]), [['D5', 3, 'Significant', '2026-10-09', ''], ['D6', 3, 'Significant', '2026-10-09', ''], ['D3', 2, 'Moderate', '2026-10-09', ''], ['D4', 2, 'Moderate', '2026-10-09', '']]);
  assert.match(t2.drivers[0].text, /^D5 \(relapse and continued use\) was rated 3, significant, on Oct 9\. Three dated records in the last 30 days\. Reported drinking at a party on Oct 4/); assert.ok(t2.drivers[0].ids.includes('EV-DW-01'), 'the evidence ids behind the sentence');
  assert.deepEq([t2.engagement.score.attended, t2.engagement.score.scheduled, t2.engagement.score.pct, t2.engagement.lines.length, t2.engagement.dailyNotes], [8, 10, 80, 1, 3]); assert.eq(t2.engagement.lines[0].text, 'Attended 8 of 10 scheduled groups from Sept 28 to Oct 9.');
  assert.deepEq(t2.risks.map(x => [x.key, x.tone]), [['incident', 'danger'], ['d5-high', 'warning'], ['d6-high', 'warning'], ['inputs', 'warning']]); assert.eq(t2.risks[0].text, 'An incident on Oct 28 came after the assessment of Oct 9. The ratings may understate current risk.');
  // J.O.: one assessment, no trend; the D4 and D5 records are missing and the driver says so
  const t1 = trajectoryOf(s, req('R-0391'));
  assert.eq(t1.summary[4].value, 'One assessment on file (Oct 20). There is no earlier rating to compare.'); assert.deepEq([t1.trend.hasTrend, t1.trend.labels, t1.screens.series.map(x => [x.name, x.points])], [false, ['Oct 20'], [['PHQ-9', [4]]]]);
  assert.deepEq(t1.drivers.map(d => [d.short, d.rating, d.gap]), [['D4', 2, 'No dated record on file for D4. Still needed: attendance counts for the last 30 days.'], ['D5', 2, 'No dated record on file for D5. Still needed: dated use episodes or urine drug screens from the last 30 days.']]);
  assert.deepEq([t1.engagement.score, t1.risks.map(x => x.key), t1.inputs], [null, ['prior', 'inputs'], 6]); assert.eq(t1.summary[5].value, 'Ratings fit Level 1; Level 2.1 needs a stated reason · 6 inputs needed');
  // M.R.: two assessments, PHQ-9 16 then 12 from the stored scores, attendance from the D4 note
  const tm = trajectoryOf(s, req('R-0411'));
  assert.eq(tm.summary[4].value, 'Lower risk: D1 1 to 0, D4 3 to 2, D5 3 to 2, D6 3 to 2 since Aug 12'); assert.deepEq(tm.trend.series.map(x => [x.name, x.points]), [['Highest rating', [3, 2]], ['D3', [2, 2]], ['D4', [3, 2]], ['D5', [3, 2]]]);
  assert.deepEq([tm.screens.series.map(x => [x.name, x.points]), tm.screens.callouts.map(x => [x.name, x.current, x.previous])], [[['PHQ-9', [16, 12]]], [['PHQ-9', 12, 16]]]);
  assert.deepEq([tm.engagement.score.attended, tm.engagement.score.scheduled, tm.engagement.score.pct, tm.engagement.dailyNotes], [41, 48, 85, 15]); assert.deepEq(tm.risks.map(x => x.key), ['units', 'prior', 'inputs']); assert.eq(tm.risks[0].text, '27 of 110 units are left (75% used).');
  // S.B.: the reassessment is overdue; the engagement count comes from the D4 note
  const tb = trajectoryOf(s, req('R-0395'));
  assert.deepEq(tb.risks.map(x => [x.key, x.tone]), [['reassess', 'danger'], ['units', 'warning'], ['prior', 'warning'], ['inputs', 'warning']]); assert.match(tb.risks[0].text, /^Reassessment was due Oct 24, 5 days ago \(30-day rule\)\.$/);
  assert.deepEq([tb.engagement.score.pct, tb.screens.series.map(x => [x.name, x.points]), tb.screens.hasTrend], [90, [['GAD-7', [9]]], false]);
  // T.W.: initial request, one assessment; no earlier rating
  const tw = trajectoryOf(s, req('R-0416'));
  assert.deepEq([tw.trend.hasTrend, tw.drivers.map(d => d.short), tw.risks.map(x => x.key), tw.inputs, tw.screens.series.map(x => [x.name, x.points])], [false, ['D5', 'D3', 'D4', 'D6'], ['d5-high', 'prior', 'inputs'], 5, [['GAD-7', [11]]]]);
});

await T.test('payer criteria: the eight rows, the match tile, the sample approval rate, the status line and "to maximize" (exact, five requests)', async () => {
  const want = {
    'R-0402': { rows: 'd1:d: d2:d: d3:d:d3-cite d4:d: d5:d:d5-cite d6:d:d6-cite level:d:level-cite clock:n:', doc: [7, 8, 1, 88], status: '1 item needs strengthening before submission', tiles: ['7/8', '58%', 'ASAM Criteria'], why: [74, 22], inc: ['level-cite', 'd5-cite', 'd6-cite', 'd3-cite', 'prior-cite', 'risk'] },
    'R-0391': { rows: 'd1:d: d2:d: d3:d: d4:n:d4-add d5:n:d5-add d6:d: level:n:level-reason clock:d:', doc: [5, 8, 3, 63], status: '3 items need strengthening before submission', tiles: ['5/8', '55%', 'ASAM Criteria'], why: [31], inc: ['level-reason', 'prior', 'd4-add', 'd5-add', 'risk', 'isp'] },
    'R-0411': { rows: 'd1:d: d2:d: d3:n:d3-add d4:n:d4-add d5:n:d5-add d6:n: level:d:level-cite clock:d:', doc: [4, 8, 4, 50], status: '4 items need strengthening before submission', tiles: ['4/8', '63%', 'ASAM Criteria'], why: [61, 27], inc: ['renewal-lead', 'level-cite', 'prior', 'd3-add', 'd4-add', 'd5-add'] },
    'R-0395': { rows: 'd1:d: d2:d: d3:n:d3-add d4:n:d4-add d5:n:d5-add d6:n: level:d:level-cite clock:n:reassess', doc: [3, 8, 5, 38], status: '5 items need strengthening before submission', tiles: ['3/8', '41%', 'ASAM Criteria'], why: [39, 18], inc: ['reassess', 'level-cite', 'prior', 'd3-add', 'd4-add', 'd5-add'] },
    'R-0416': { rows: 'd1:d: d2:d: d3:n:d3-add d4:n:d4-add d5:n:d5-add d6:n:d6-add level:d:level-cite clock:d:', doc: [4, 8, 4, 50], status: '4 items need strengthening before submission', tiles: ['4/8', '52%', 'ASAM Criteria'], why: [48, 14], inc: ['level-cite', 'd5-add', 'prior', 'd3-add', 'd4-add', 'd6-add'] }
  };
  for (const id of IDS) {
    const c = criteriaView(s, req(id)); const w = want[id];
    assert.eq(c.rows.map(x => `${x.key}:${x.state[0]}:${x.rec}`).join(' '), w.rows, id + ' rows'); assert.deepEq([c.documented, c.total, c.needs, c.pct], w.doc, id + ' counts'); assert.eq(c.status.text, w.status);
    assert.deepEq(c.tiles.map(x => x.value), w.tiles, id + ' tiles'); assert.deepEq(c.maximize.why.reasons.map(x => x.count), w.why, id + ' denial reasons'); assert.deepEq(c.maximize.include.map(x => x.key), w.inc, id + ' what to include');
    assert.deepEq(c.tiles.map(x => x.sample), [false, true, false], 'only the approval rate is a sample'); assert.eq(c.maximize.why.sample, true); assert.match(c.maximize.why.basis, /Illustrative sample/);
    assert.deepEq(c.sources, ['ASAM ratings and dated records', 'Payer notes on file', 'Denial reasons (sample)', 'Rules table (demo assumptions)']);
  }
  const c2 = criteriaView(s, req('R-0402')); assert.match(c2.rows.find(x => x.key === 'clock').text, /incident on Oct 28 came after the assessment of Oct 9/); assert.eq(c2.status.tone, 'warning'); assert.eq(c2.maximize.why.tends.slice(0, 20), 'Calls to offer fewer');
  assert.eq(c2.maximize.include.find(x => x.key === 'risk').needsInput, true); assert.eq(c2.maximize.include.find(x => x.key === 'level-cite').needsInput, false);
  assert.match(criteriaView(s, req('R-0391')).rows.find(x => x.key === 'level').text, /Ratings fit Level 1; Level 2\.1 needs a stated reason\. The reason is the clinician's to give\./);
});

await T.test('historical outcomes: matching chips, the payer\'s top denial reason, the record\'s strengths, the three sample cards and the interpretation (exact, five requests)', async () => {
  const want = {
    'R-0402': { chips: ['Cannabis (F12), Alcohol (F10)', '2.1', 'D3, D4, D5, D6', 'ADHD (F90.2)', '7 of 8 criteria documented'], driver: ['Does not meet ASAM Level 2.1 criteria', 74, 77], sup: 'rated:1 current:1 dated:1 prior:1 reason:1', interp: 'completion' },
    'R-0391': { chips: ['Alcohol (F10), Cannabis (F12)', '2.1', 'D4, D5', 'None on the client record', '5 of 8 criteria documented'], driver: ['No documented use in the last 30 days', 31, 100], sup: 'rated:1 current:1 dated:0 prior:0 reason:1', interp: 'gaps' },
    'R-0411': { chips: ['Alcohol (F10), Cannabis (F12)', '2.1', 'D3, D4, D5, D6', 'Depressive (F32.1)', '4 of 8 criteria documented'], driver: ['Can be managed at a lower level of care (outpatient)', 61, 69], sup: 'rated:1 current:1 dated:0 prior:0 reason:1', interp: 'gaps' },
    'R-0395': { chips: ['Cannabis (F12)', '2.1', 'D3, D4, D5, D6', 'Anxiety (F41.1)', '3 of 8 criteria documented'], driver: ['Co-occurring condition not documented', 39, 68], sup: 'rated:1 current:0 dated:0 prior:0 reason:1', interp: 'gaps' },
    'R-0416': { chips: ['Cannabis (F12), Nicotine (F17)', '2.1', 'D3, D4, D5, D6', 'Anxiety (F41.1)', '4 of 8 criteria documented'], driver: ['Assessment is not current', 48, 77], sup: 'rated:1 current:1 dated:0 prior:0 reason:1', interp: 'gaps' }
  };
  for (const id of IDS) {
    const h = historicalView(s, req(id)); const w = want[id];
    assert.deepEq(h.matching.map(x => x.value), w.chips, id + ' chips'); assert.deepEq([h.driver.reason, h.driver.count, h.driver.pct], w.driver, id + ' driver');
    assert.eq(h.supporting.map(x => `${x.key}:${x.ok ? 1 : 0}`).join(' '), w.sup, id + ' strengths'); assert.eq(h.interpretation.key, w.interp, id + ' interpretation');
    assert.deepEq(h.outcomes.map(x => [x.kind, x.likelihood]), [['approved', 72], ['approved', 67], ['denied', 36]]); assert.eq(h.sample, true); assert.match(h.basis, /Illustrative sample/);
    assert.deepEq(h.matching.map(x => x.label), ['Diagnosis category', 'ASAM level', 'Dimensions rated 2 or more', 'Co-occurring condition', 'Documentation signals']);
    assert.eq(h.driver.observed[0].sample, true); assert.eq(h.driver.observed[1].sample, false, 'the payer notes on file are not a sample');
  }
  const h2 = historicalView(s, req('R-0402')); assert.eq(h2.interpretation.label, 'Approval-favorable with documentation completion'); assert.eq(h2.interpretation.tone, 'warning');
  assert.eq(h2.driver.observed[0].text, 'In the sample, 74 Sentara denials cited this reason (77% of that payer\'s denials).'); assert.match(h2.driver.observed[1].text, /^What Sentara tends to ask, from the payer notes on file: Calls to offer fewer units;/);
  assert.eq(historicalView(s, req('R-0395')).interpretation.label, 'Documentation gaps to close first');
});

await T.test('Analyze a case: the authorization panel from the stored units and the clock, the urgent card, the de-identified preview, the pasted-text reader', async () => {
  const st = authStatusOf(s, req('R-0411')); assert.deepEq([st.approved, st.used, st.remaining, st.start, st.expires, st.daysToExpiry, st.daysOfUnits, st.rate, st.urgent], [110, 83, 27, '2026-08-18', '2026-11-13', 15, 9, 3, true]);
  assert.match(st.action, /^14 business days of IOP at 3 units a day are unpaid if the renewal is late; the payer does not backdate an authorization\.$/);
  const u = urgentOf(s, req('R-0411')); assert.eq(u.title, 'Urgent: units run out in about 9 days'); assert.deepEq(u.lines.slice(0, 3), ['27 of 110 units remain.', 'At 3 units a day they cover about 9 days.', 'The current authorization ends Nov 13 (15 days from today).']);
  assert.eq(urgentOf(s, req('R-0395')).title, 'Urgent: units run out in about 4 days'); assert.eq(urgentOf(s, req('R-0416')), null, 'no authorization recorded yet');
  assert.deepEq([authStatusOf(s, req('R-0416')).approved, authStatusOf(s, req('R-0416')).urgent], [null, false]);
  assert.deepEq(previewOf(s, req('R-0411')), { initials: 'M.R.', age: 15, lines: ['Client M.R., age 15. Level 2.1 · Intensive outpatient requested.', 'Assessed Oct 14: D1 0 · D2 0 · D3 2 · D4 2 · D5 2 · D6 2.', 'Name, member ID and group number are removed before analysis.'] });
  const rd = readStatusText('Healthfirst NY Medicaid HMO. Current authorization: 48 units approved (H0015). Units used to date: 38. Units remaining: 10. Authorization expires in 3 days.');
  assert.deepEq([rd.approved, rd.used, rd.remaining, rd.days, rd.found], [48, 38, 10, 3, 4]); assert.eq(rd.text, 'Psyflo read: 48 units approved · 38 used · 10 remaining · expires in 3 days. Check it against the payer\'s notice.');
  const partial = readStatusText('48 units approved. 38 units used.'); assert.deepEq([partial.approved, partial.used, partial.remaining, partial.days], [48, 38, 10, null], 'the remaining count is worked out from the two it read');
  const none = readStatusText('Client is engaged and attends groups.'); assert.eq(none.found, 0); assert.match(none.text, /^Psyflo found no unit counts in the text\./);
  assert.eq(scrubText('Call 434-555-0162 or jane@x.org, member ABC123456789 grp GRP-00012, SSN 123-45-6789.', ['ABC123456789', 'GRP-00012']), 'Call [removed] or [removed], member [removed] grp [removed], SSN [removed].');
  assert.eq(scrubText('No identifiers here.', ['', ' ']), 'No identifiers here.'); assert.eq(ANALYSIS_STEPS.length, 6);
});

await T.test('the selectors write no clinical claim of their own: no old-service words, no em dash, no prediction in anything they build (stored quotes aside)', async () => {
  const gen = [];
  for (const id of IDS) {
    const r = req(id); const t = trajectoryOf(s, r); const c = criteriaView(s, r); const h = historicalView(s, r); const hd = headerOf(s, r, me); const rs = rowSignals(s, r, me);
    gen.push(...t.summary.filter(x => x.key !== 'diagnosis').map(x => x.value), ...t.risks.map(x => x.text), ...t.drivers.map(x => x.gap), t.trend.title, t.screens.title);
    gen.push(...c.rows.map(x => x.text), c.status.text, ...c.tiles.flatMap(x => [x.label, x.value, x.caption]), ...c.sources);
    gen.push(...h.matching.flatMap(x => [x.label, x.value]), ...h.supporting.map(x => x.label), ...h.driver.observed.map(x => x.text), h.interpretation.label, h.interpretation.text);
    gen.push(hd.risk.label, hd.risk.why, rs.packet.text, rs.lift, rs.urgency.label);
  }
  for (const x of gen) { assert.noMatch(x, WORDS, 'final wording: ' + x); assert.noMatch(x, /—/, 'no em dash: ' + x); assert.noMatch(x, /\b(will be approved|likely to be approved|guarantee|predict)/i, 'no prediction: ' + x); }
});

await T.done();
