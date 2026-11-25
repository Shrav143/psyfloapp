// R7 · Oprox parity, Denial Intelligence selectors: web/js/shared/sel/denial-intel.js (denialFields, appealAnalysis, patternView, intakeOptions, intakeModel).
// Standalone: `BASE=http://localhost:6400 node test/intel-denial.mjs` (test/run-all.mjs starts a fresh server for it).
// The selectors are pure (no DOM): the platform screens and the extension panel read the same values, so this suite pins them for the four seeded cases
// R-0402 (partial offer), R-0384 (denial), R-0408 (information request), R-0388 (partial award, peer-to-peer booked).
// Proves: the decision fields (payer, service with code, requested, approved or offered, revenue at risk, decision, rationale); the appeal analysis (rationale quoted from
// the stored notice, a synthesis built only from stored records, findings tagged critical or strong, six dimension rows, numbered suggestions, the payer pattern as a labelled
// sample); the wizard model (sanitized record, two step lists, the analogue lines); what is missing is said plainly; nothing in the wording the final copy bans.
import { suite, assert, api, state, reset } from './lib/index.mjs';
import * as D from '../web/js/shared/sel/disputes.js';
import { denialFields, appealAnalysis, patternView, intakeOptions, intakeModel, serviceOf, scrubIdentifiers, evidenceItems } from '../web/js/shared/sel/denial-intel.js';
import { denialRecsFor } from '../web/js/shared/recs.js';
import { atRisk } from '../web/js/shared/intel.js';

const T = suite('intel-denial');
const BANNED = /\b(school|student|TDT|therapeutic day|H2016|guardian|behaviou?r|classroom|teacher)\b/i;
const NO_REASON = "No reason on file. Read the payer's notice and add it before replying.";

await reset('canvas');
const s = await state('jperez');
const of = id => { const r = s.requests.find(x => x.id === id); return [s, D.byRequest(s, id), r]; };
const val = (f, key) => f.rows.find(x => x.key === key).value;

await T.test('denialFields: the parsed decision strip for the four seeded cases (payer, service with code, requested, approved or offered, revenue at risk, decision, rationale)', async () => {
  const want = {
    'R-0402': { from: 'Sentara Health Plans', re: 'D.W. · Intensive outpatient · request R-0402', approvedLabel: 'Offered', approved: '110 units', risk: '$8,200', decision: 'Partial approval · 110 of 150 units offered', rationale: "We'd really like to give you 110. Asked whether ASAM Level 2.1 is still needed for the remaining units after the Oct 9 reassessment", kind: 'partial', due: 'Due tomorrow' },
    'R-0384': { from: 'Anthem HealthKeepers Plus', re: 'E.C. · Intensive outpatient · request R-0384', approvedLabel: 'Approved', approved: '0 units', risk: '$18,450', decision: 'Denied · 0 of 90 units approved', rationale: 'Already connected to other services; Level 1 outpatient is appropriate Does not meet ASAM Level 2.1 criteria', kind: 'denial', due: 'Due Dec 21' },
    'R-0408': { from: 'Anthem HealthKeepers Plus', re: 'K.T. · Intensive outpatient · request R-0408', approvedLabel: 'Approved', approved: 'Not decided yet', risk: '$30,750', decision: 'Information requested · 5 items asked', rationale: 'Anthem asked for 5 items.', kind: 'info', due: 'Due in 2h' },
    'R-0388': { from: 'Sentara Health Plans', re: 'T.N. · Intensive outpatient · request R-0388', approvedLabel: 'Approved', approved: '65 units', risk: '$17,425', decision: 'Partial approval · 65 of 150 units approved', rationale: NO_REASON, kind: 'partial', due: 'Due Dec 9' }
  };
  for (const [id, w] of Object.entries(want)) {
    const [st, d, r] = of(id); const f = denialFields(st, d, r);
    assert.deepEq(f.rows.map(x => x.key), ['from', 're', 'service', 'requested', 'approved', 'risk', 'decision', 'rationale'], id + ' rows in the Oprox order');
    assert.eq(val(f, 'from'), w.from, id); assert.eq(val(f, 're'), w.re, id); assert.eq(val(f, 'service'), 'IOP · H0015', id); assert.eq(val(f, 'requested'), `${r.units_requested} units`, id);
    assert.eq(f.rows.find(x => x.key === 'approved').label, w.approvedLabel, id); assert.eq(val(f, 'approved'), w.approved, id); assert.eq(val(f, 'risk'), w.risk, id); assert.eq(val(f, 'decision'), w.decision, id); assert.eq(val(f, 'rationale'), w.rationale, id);
    assert.eq(f.decision.kind, w.kind, id); assert.eq(f.due.label, w.due, id);
    assert.deepEq(f.risk, atRisk(st, r), id + ' revenue at risk is the lead\'s atRisk, with its basis'); assert.match(f.risk.basis, /units × \$205 a unit \(demo assumption\)/, id);
    assert.eq(f.service.code, 'H0015'); assert.eq(f.service.level, '2.1'); assert.eq(f.rationale.recorded, id !== 'R-0388', id + ' rationale recorded');
    assert.ok(!BANNED.test(JSON.stringify(f.rows)), id + ' final wording in the strip: ' + JSON.stringify(f.rows).match(BANNED));
    assert.ok(!/H2016|TDT/.test(JSON.stringify(f)), id + ' the earlier day-treatment wording does not leak into the fields');
  }
  assert.deepEq(serviceOf({ asam_level: '2.5' }), { text: 'PHP · ASAM 2.5', level: '2.5', code: null, name: 'Partial hospitalization' }); assert.eq(serviceOf({}).text, 'Service not recorded');
});

await T.test('denialFields for a non-clinical reader has no rationale: the strip stops at the decision (clinical:false)', async () => {
  const sa = await state('dowens'); const d = D.byRequest(sa, 'R-0402'); const r = sa.requests.find(x => x.id === 'R-0402');
  const f = denialFields(sa, d, r, { clinical: false }); assert.eq(f.rationale, null); assert.deepEq(f.rows.map(x => x.key), ['from', 're', 'service', 'requested', 'approved', 'risk', 'decision']);
  assert.eq(val(f, 'risk'), '$8,200'); assert.eq(f.due.label, 'Due tomorrow'); assert.eq(val(f, 'decision'), 'Partial approval · 110 of 150 units offered', 'money, due and the decision read from the status-only state');
});

await T.test('appealAnalysis: the rationale is the payer\'s own stored words; the synthesis uses only stored sentences; what is missing is said plainly', async () => {
  const a2 = (id) => appealAnalysis(...of(id));
  const a = a2('R-0402');
  assert.eq(a.rationale.text, "Sentara offered 110 of the 150 units requested, stating: “We'd really like to give you 110.” “Asked whether ASAM Level 2.1 is still needed for the remaining units after the Oct 9 reassessment”");
  assert.deepEq(a.rationale.quotes.map(x => x.source), ['Call log · Sentara called Oct 27, 3:30 pm', 'Call log · Sentara called Oct 27, 3:30 pm']);
  assert.deepEq(a.synthesis.sentences.map(x => x.key), ['ratings', 'level', 'change', 'prior', 'clock']);
  assert.eq(a.synthesis.sentences[0].text, 'ASAM reassessment of Oct 9, 2026: D1 intoxication and withdrawal 0; D2 medical conditions 1; D3 emotional and behavioral conditions 2; D4 readiness to change 2; D5 relapse and continued use 3; D6 recovery environment 3.');
  assert.eq(a.synthesis.sentences[1].text, 'The ratings support ASAM Level 2.1: D3 (2), D5 (3), D6 (3) are above what Level 1 can manage.');
  assert.eq(a.synthesis.sentences[2].text, 'Change since Jul 21, 2026. Lower risk: D4 3 to 2.'); assert.eq(a.synthesis.sentences[4].text, 'The latest ratings are 20 days old; the reassessment rule is 30 days at this level.');
  assert.ok(a.synthesis.sentences.every(x => x.ids.length), 'every synthesis sentence is traced to evidence ids'); assert.eq(a.synthesis.text, a.synthesis.sentences.map(x => x.text).join(' '));
  // no stored prior service: the sentence says so, and asks for it
  const b = a2('R-0384'); const prior = b.synthesis.sentences.find(x => x.key === 'prior'); assert.ok(prior.missing && prior.text === 'Nothing on file for previous treatment at a lower level of care: provider, dates and outcome. Add it before replying.', prior.text);
  assert.ok(!/\[Evidence missing/.test(JSON.stringify(b.synthesis) + JSON.stringify(b.findings.map(x => x.text)) + JSON.stringify(b.dimensions)), 'the bracket marker the drafts use is never shown in the analysis text');
  assert.eq(a2('R-0388').rationale.text, NO_REASON); assert.eq(a2('R-0388').rationale.recorded, false);
  const c = a2('R-0408'); assert.eq(c.rationale.text, 'Anthem asked for more information. 5 items are listed below.'); assert.eq(c.rationale.quotes.length, 5);
});

await T.test('appealAnalysis findings: one per weak point, tagged critical (two or more dimensions, or a reassessment or incident gap) or strong (one dimension or one missing record), critical first', async () => {
  const want = {
    'R-0402': [['a-match', 'critical'], ['a-evt-2026-10-28', 'critical'], ['r2', 'critical'], ['g-risk', 'strong'], ['g-isp', 'strong'], ['g-notice', 'strong'], ['r1-c', 'strong']],
    'R-0384': [['a-match', 'critical'], ['r2', 'critical'], ['g-d6', 'strong'], ['g-prior', 'strong'], ['g-services', 'strong']],
    'R-0408': [['a-match', 'critical'], ['r5', 'critical'], ['r1', 'strong'], ['r3', 'strong'], ['r4', 'strong'], ['g-d1', 'strong']],
    'R-0388': [['a-under', 'strong'], ['g-d6', 'strong'], ['g-isp', 'strong'], ['g-notice', 'strong'], ['c-none', 'strong']]
  };
  for (const [id, w] of Object.entries(want)) {
    const [st, d, r] = of(id); const a = appealAnalysis(st, d, r);
    assert.deepEq(a.findings.map(x => [x.key, x.sev]), w, id + ' findings ' + JSON.stringify(a.findings.map(x => [x.key, x.sev])));
    for (const f of a.findings) { assert.ok(f.title && f.text && f.fix, id + ' ' + f.key + ' has a title, a paragraph and a fix'); assert.ok(['critical', 'strong'].includes(f.sev)); assert.eq(f.evidence.length, [...new Set(f.ids)].filter(x => D.evidenceById(D.evidenceIndex(st, d, r), x)).length, id + ' ' + f.key + ' evidence rows resolve'); }
    assert.deepEq(a.caveats.map(x => x.key).sort(), (id === 'R-0408' ? ['x-rule', 'x-seed'] : ['x-held', 'x-rule', 'x-seed']), id + ' meta notes are caveats, not findings');
  }
  const [st, d, r] = of('R-0384'); const a = appealAnalysis(st, d, r);
  assert.eq(a.findings.find(x => x.key === 'g-d6').text, 'No dated record on file for D6. Add one before replying.', 'the lead\'s wording for a missing dimension record');
  assert.eq(a.findings.find(x => x.key === 'g-prior').text, 'Nothing on file for previous treatment at a lower level of care: provider, dates and outcome. Add it before replying.');
  assert.deepEq(a.findings.find(x => x.key === 'a-match').dims, [4, 5, 6]);
  const k = appealAnalysis(...of('R-0402')); assert.eq(k.findings.find(x => x.key === 'a-evt-2026-10-28').title, 'An incident on Oct 28 came after the Oct 9 assessment');
  assert.eq(appealAnalysis(...of('R-0388')).findings.find(x => x.key === 'c-none').text, NO_REASON);
});

await T.test('appealAnalysis dimensions: six rows from the clinician\'s ratings, each with its dated records or the plain statement that none is on file', async () => {
  const want = {
    'R-0402': { ratings: [0, 1, 2, 2, 3, 3], drivers: [3, 5, 6], need: [], date: '2026-10-09' },
    'R-0384': { ratings: [0, 0, 1, 3, 3, 3], drivers: [4, 5, 6], need: [6], date: '2026-10-12' },
    'R-0408': { ratings: [2, 1, 1, 3, 3, 2], drivers: [1, 4, 5], need: [1], date: '2026-10-09' },
    'R-0388': { ratings: [1, 1, 3, 2, 3, 3], drivers: [3, 5, 6], need: [6], date: '2026-10-01' }
  };
  for (const [id, w] of Object.entries(want)) {
    const a = appealAnalysis(...of(id)); const rows = a.dimensions.rows;
    assert.deepEq(rows.map(x => x.short), ['D1', 'D2', 'D3', 'D4', 'D5', 'D6'], id); assert.deepEq(rows.map(x => x.rating), w.ratings, id + ' ratings'); assert.deepEq(rows.filter(x => x.driver).map(x => x.n), w.drivers, id + ' drivers');
    assert.deepEq(rows.filter(x => x.needsRecord).map(x => x.n), w.need, id + ' dimensions with no dated record'); assert.eq(a.dimensions.assessed, w.date, id);
    for (const x of rows) { assert.match(x.text, new RegExp(`^D${x.n} \\(`), id + ' row text leads with the stored rating'); assert.ok(x.evidence.length >= 1 || x.needsRecord, id + ' D' + x.n + ' has evidence or says none is on file'); assert.eq(/No dated record on file for D\d\. Add one before replying\./.test(x.text), x.needsRecord, id + ' D' + x.n); }
    assert.eq(a.dimensions.rated, 6); assert.eq(a.dimensions.withoutRecord, w.need.length);
  }
  const k = appealAnalysis(...of('R-0384')).dimensions; assert.eq(k.heading, 'Six ASAM dimensions, rated Oct 12, 2026'); assert.eq(k.summary, '6 of 6 rated · 3 rated Moderate or higher · 1 dimension needs a dated record');
  assert.eq(k.rows[5].text, 'D6 (recovery environment) was rated 3, significant, on Oct 12. No dated record on file for D6. Add one before replying.'); assert.deepEq(k.rows[5].need, ['the recovery environment (housing, who in the home uses, supports)']);
});

await T.test('appealAnalysis actions: the numbered denial suggestions (denialRecsFor), unchanged in order; the pattern is a labelled sample next to the payer\'s stored behaviour', async () => {
  const want = { 'R-0402': 'window incident-2026-10-28 cite-asam answer-r2 gap-risk gap-isp gap-notice units ask-criteria', 'R-0384': 'cite-asam answer-r1-gap answer-r2 gap-d6 gap-prior gap-services units ask-criteria', 'R-0408': 'window cite-asam answer-r1 answer-r2-gap answer-r3 answer-r4 answer-r5 gap-d1', 'R-0388': 'gap-d6 gap-isp gap-notice units ask-criteria' };
  for (const [id, keys] of Object.entries(want)) {
    const [st, d, r] = of(id); const a = appealAnalysis(st, d, r); const list = denialRecsFor(st, d, r);
    assert.eq(a.actions.map(x => x.key).join(' '), keys, id); assert.deepEq(a.actions.map(x => x.n), a.actions.map((_, i) => i + 1), 'numbered from 1');
    assert.deepEq(a.actions.map(x => x.title), list.map(x => x.title), id + ' same titles as the suggestions drawer'); assert.ok(a.actions.every(x => x.state === 'open'), 'nothing is included until a person includes it');
    assert.ok(a.actions.filter(x => x.needsInput).every(x => x.text === ''), id + ' a card that needs the clinician\'s words has no text of its own');
    const p = a.pattern; assert.ok(p.sample === true && /Illustrative sample/.test(p.basis), 'the pattern is a labelled sample');
  }
  const p = appealAnalysis(...of('R-0402')).pattern;
  assert.deepEq([p.analogous, p.reversedPct, p.p2pOverturnPct, p.partialRate, p.approvalPct], [312, 78, 62, 74, 58]); assert.deepEq(p.strategies.map(x => x.success), [78, 72, 67, 66, 57]); assert.deepEq(p.leverage, { label: 'Quote the six ratings against the payer\'s own level criteria', success: 78 });
  assert.match(p.tends, /Calls to offer fewer units/); assert.match(p.works, /Answer with dated counts/);
  assert.eq(p.lines[2], 'Found 312 analogous cases · 78% reversed on first-level appeal (sample)'); assert.eq(p.lines[3], 'Peer-to-peer: about 62% overturned (sample)'); assert.match(p.lines[4], /^Strongest leverage: Quote the six ratings .* · 78% \(sample\)$/);
  assert.eq(patternView(s, 'anthem').first, 'Anthem'); assert.eq(patternView(s, 'anthem').partialRate, Math.round(s.payers.find(x => x.id === 'anthem').partial_rate * 100));
});

await T.test('intake: stored documents offered for the case; either source is enough; nothing to continue with says why', async () => {
  const names = id => { const o = intakeOptions(...of(id)); return { letters: o.letters.map(x => x.name), clinical: o.clinical.map(x => x.name) }; };
  assert.deepEq(names('R-0402'), { letters: [], clinical: ['ASAM reassessment · Oct 9', 'ASAM initial assessment · Jul 21'] }, 'a phone offer has no letter on file');
  assert.deepEq(names('R-0384'), { letters: ['Availity determination notice · Oct 22'], clinical: ['ASAM initial assessment · Oct 12', 'Treatment plan · done Sep 29'] });
  assert.deepEq(names('R-0388'), { letters: [], clinical: ['ASAM initial assessment · Oct 1'] });
  assert.deepEq(intakeOptions(s, null, null), { letters: [], clinical: [] });
  const [st, d, r] = of('R-0402');
  const none = intakeModel(st, null, null, {}); assert.ok(!none.ready && /Choose which consumer/.test(none.reason));
  const empty = intakeModel(st, d, r, { letter: null, clinical: null }); assert.ok(!empty.ready && empty.reason === 'Add a denial letter or clinical documentation to continue.');
  const blank = intakeModel(st, d, r, { letter: { via: 'file', name: '   ' } }); assert.ok(!blank.ready, 'a blank name is not a source');
  const one = intakeModel(st, d, r, { clinical: { via: 'file', name: 'Clinical Info.docx' } }); assert.ok(one.ready && one.sources.length === 1 && one.sources[0].slot === 'clinical' && one.sources[0].via === 'file', 'either file is enough');
  const lt = intakeModel(st, d, r, { letter: { via: 'file', name: 'Denial letter.pdf' } }); assert.ok(lt.ready && lt.sources[0].label === 'Denial letter');
});

await T.test('intake model: the sanitized record keeps initials only and removes identifiers; two step lists from stored records and the sample; the file is never read, only its name is kept', async () => {
  const [st, d, r] = of('R-0402');
  const m = intakeModel(st, d, r, { clinical: { via: 'stored', name: 'ASAM reassessment · Oct 9' }, context: 'Mother Tamika Wells called on 434-555-0171, member ID: ZX1234567, group notes are in the chart.' });
  assert.ok(m.ready); assert.deepEq(m.case, { id: 'DI-0402', request: 'R-0402', consumer: 'D.W.', payer: 'Sentara' });
  assert.eq(m.record.title, 'Sanitized clinical record'); assert.match(m.record.note, /Initials only/); assert.match(m.record.note, /stays in your browser and is not read/);
  assert.deepEq(m.record.sources, ['CLINICAL DOCUMENTATION · ASAM reassessment · Oct 9']); assert.ok(m.record.removed.includes('Member number') && m.record.removed.includes('Full name'));
  assert.eq(m.record.context, 'Mother [client] [client] called on [removed], [removed], group notes are in the chart.'); assert.eq(m.record.contextRemoved, 4, 'two names, a phone number and a member number');
  assert.deepEq(m.record.fields.map(x => x.key), ['from', 're', 'service', 'requested', 'approved', 'risk', 'decision', 'rationale']);
  const text = JSON.stringify(m); assert.ok(!/Tamika|Wells|ZX1234567|555-0171/.test(text), 'no identifier survives into the model');
  assert.eq(m.read.title, 'Reading and digesting the record'); assert.eq(m.read.steps.length, 8);
  assert.eq(m.read.steps[0], 'Parsing the record structure · 18 dated records on file, 1 held back from drafts');
  assert.match(m.read.steps[1], /^Reading the denial reason and the treatment timeline · 2 stated reasons, records from Jun 30 to Oct 28$/);
  assert.match(m.read.steps[3], /^Comparing reported use with the clinician's rating · 4 dated use records and D5 rated 3, no difference found$/);
  assert.match(m.read.steps[6], /^Validating diagnoses against ICD-10 · 3 codes on file, all in ICD-10 format, 2 codes in the F10 to F19 substance use range \(format check only\)$/);
  assert.match(m.read.steps[7], /^Mapping the ratings against the ASAM Level 2\.1 limits used in this demo · Ratings support Level 2\.1: D3 \(2\), D5 \(3\) and D6 \(3\) are above what Level 1 can manage$/);
  assert.eq(m.appeals.title, 'Cross-referencing historical appeals'); assert.ok(m.appeals.sample); assert.eq(m.appeals.steps.length, 7); assert.deepEq(m.appeals.steps, m.pattern.lines);
  assert.match(m.appeals.steps[1], /^Filtering by the stated reason: “We'd really like to give you 110\.”$/); assert.ok(/\(sample\)/.test(m.appeals.steps[2]));
  // a case with no stated reason says so in the filter line; a file name that holds a name is scrubbed
  const [s8, d8, r8] = of('R-0388'); const m8 = intakeModel(s8, d8, r8, { letter: { via: 'file', name: 'Nakamura 12345678 denial.pdf' } });
  assert.eq(m8.appeals.steps[1], 'No stated reason on file, so every reason is included'); assert.match(m8.read.steps[1], /no stated reason on file/); assert.eq(m8.sources[0].name, 'Nakamura [removed] denial.pdf');
  assert.eq(scrubIdentifiers('Member ID: AB12345 and group notes', s, '').text, '[removed] and group notes', 'group notes is not an identifier');
  assert.ok(!BANNED.test(JSON.stringify({ rows: m.record.fields, read: m.read, appeals: m.appeals, note: m.record.note })), 'final wording');
});

await T.test('evidence rows ready for a chip: the same rows the workspace shows, de-duplicated; unknown ids are dropped', async () => {
  const [st, d, r] = of('R-0402'); const idx = D.evidenceIndex(st, d, r);
  const rows = evidenceItems(idx, ['EV-ASM-ASM-DW-2', 'EV-ASM-ASM-DW-2', 'nope']); assert.eq(rows.length, 1); assert.ok(rows[0].label && rows[0].source && rows[0].date);
  assert.deepEq(evidenceItems(idx, []), []); assert.deepEq(evidenceItems(idx, null), []);
});

await T.test('the selectors are pure: the same inputs give the same outputs, and they never change the state they read', async () => {
  const [st, d, r] = of('R-0384'); const before = JSON.stringify(st);
  const a1 = JSON.stringify(appealAnalysis(st, d, r, {})); const a2 = JSON.stringify(appealAnalysis(st, d, r, {})); assert.eq(a1, a2); assert.eq(JSON.stringify(st), before, 'state untouched');
  const i1 = JSON.stringify(intakeModel(st, d, r, { letter: { via: 'file', name: 'x.pdf' } })); assert.eq(i1, JSON.stringify(intakeModel(st, d, r, { letter: { via: 'file', name: 'x.pdf' } }))); assert.eq(JSON.stringify(st), before);
});

await T.test('a clinician\'s included suggestion shows in the analysis as included, with its own words as the text', async () => {
  await api('recs.decide', { scope: 'denial', ref: 'R-0402', key: 'gap-risk', state: 'included', context: 'The client used on three weekends in October after leaving the lower level.' }, 'jperez');
  const s2 = await state('jperez'); const a = appealAnalysis(s2, D.byRequest(s2, 'R-0402'), s2.requests.find(x => x.id === 'R-0402'));
  const x = a.actions.find(y => y.key === 'gap-risk'); assert.eq(x.state, 'included'); assert.eq(x.text, 'The client used on three weekends in October after leaving the lower level.');
  assert.eq(a.actions.filter(y => y.state === 'included').length, 1);
});

await T.test('a closed case has nothing at risk and no due date; the decision it closed on is still read from the stored record', async () => {
  await api('dispute.choose', { id: 'R-0384', path: 'accept', plan: { mode: 'denial' } }, 'jperez');
  const s3 = await state('jperez'); const d = D.byRequest(s3, 'R-0384'); const r = s3.requests.find(x => x.id === 'R-0384'); assert.ok(d.closed, 'the case is closed');
  const f = denialFields(s3, d, r); assert.eq(f.risk, null); assert.eq(f.due, null); assert.eq(val(f, 'risk'), 'None'); assert.eq(val(f, 'decision'), 'Denied · 0 of 90 units approved');
});

await T.test('hosted-safe: the module reads no Node-only API and no screen or DOM code', async () => {
  const fs = await import('node:fs'); const src = fs.readFileSync(new URL('../web/js/shared/sel/denial-intel.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
  assert.ok(!/node:|require\(|process\.|Buffer|document\.|window\.|localStorage|fetch\(/.test(src), 'no Node-only or browser-only calls: ' + (src.match(/node:|require\(|process\.|Buffer|document\.|window\.|localStorage|fetch\(/) || [''])[0]);
  const imports = [...src.matchAll(/from '([^']+)'/g)].map(m => m[1]); assert.ok(imports.every(x => /^\.\.?\//.test(x) && !/screens|ui\/|app\.js/.test(x)), 'only shared modules: ' + imports.join(', '));
});

await T.done();
