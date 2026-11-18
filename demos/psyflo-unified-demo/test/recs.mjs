// R6 · Recommendations: the shared engine (web/js/shared/recs.js) and the actions (server/psyflo/actions/x-recs.js).
// Standalone: `BASE=http://localhost:5200 node test/recs.mjs` (test/run-all.mjs starts a fresh server for it).
// Proves: every suggestion is computed from stored records and carries its evidence; a suggestion that needs input cannot be included without the
// clinician's own words; the clinician can add their own; only clinicians decide and read decisions; a decision is an audit event that does not repeat the
// clinician's text; included denial recommendations land in the unsent drafts ("Added from recommendations") and leave when dismissed; included auth
// recommendations are typed into the form boxes by applyToBoxes; the outcome numbers are labelled as an illustrative sample.
import { suite, assert, api, tryApi, state, reset } from './lib/index.mjs';
import { authRecsFor, denialRecsFor, noteRecsFor, summary, insertsFor, applyToBoxes, listFor, textOf, OUTCOME_BASIS, RECS_SECTION, docSection } from '../web/js/shared/recs.js';
import { byRequest } from '../web/js/shared/sel/disputes.js';

const T = suite('recs');
const byId = (a, id) => a.find(x => x.id === id);
const key = (list, k) => list.find(x => x.key === k);

await reset('canvas');
await T.test('seed: the outcome table is a labelled sample (every family has applied, success and lift); no decisions yet', async () => {
  const s = await state('jperez'); assert.ok(s.rec_outcomes.length >= 15, 'outcomes seeded'); assert.deepEq(s.rec_decisions, []);
  for (const o of s.rec_outcomes) { assert.ok(o.applied > 0 && o.success > 0 && o.success <= 100 && o.lift >= 0, 'sane ' + o.family); }
  assert.match(OUTCOME_BASIS, /Illustrative sample/); assert.eq(s.rec_baseline.basis, 'Illustrative sample');
});
await T.test('authorization recommendations are computed from the stored record, each with evidence or an input prompt, ranked by impact, at most six', async () => {
  const s = await state('jperez'); const r = byId(s.requests, 'R-0402'); const list = authRecsFor(s, r);
  assert.ok(list.length >= 3 && list.length <= 6, 'a short list: ' + list.length);
  const lc = key(list, 'level-cite'); assert.ok(lc && lc.insert.text && /ASAM Level 2\.1/.test(lc.insert.text) && lc.evidence.length, 'the level sentence cites the assessment');
  const d5 = key(list, 'd5-cite'); assert.ok(d5 && d5.insert.box.startsWith('Dimension 5') && d5.evidence.length > 1 && d5.insert.text.length > 20, 'D5 cites the dated records');
  for (const x of list) { assert.ok(x.why && x.title && x.impact && x.id === `auth:R-0402:${x.key}`); assert.ok(x.insert && x.insert.text || x.needsInput || x.act, 'something to do: ' + x.key); assert.ok(x.outcome && x.outcome.lift >= 0 && x.outcome.success, 'sample outcome: ' + x.key); }
  const rank = { high: 0, medium: 1, low: 2 }; for (let i = 1; i < list.length; i++) assert.ok(rank[list[i - 1].impact] <= rank[list[i].impact], 'ranked by impact');
  // a request with ratings that fit a lower level asks the clinician for the reason: no text of Psyflo's own
  const over = authRecsFor(s, byId(s.requests, 'R-0391')); const reason = key(over, 'level-reason');
  assert.ok(reason && reason.needsInput && reason.insert.text === '', 'the reason beyond the ratings is the clinician\'s'); assert.eq(textOf(reason), '');
  // an overdue reassessment is an action, not a sentence
  const stale = key(authRecsFor(s, byId(s.requests, 'R-0395')), 'reassess'); assert.ok(stale && stale.act && stale.act.kind === 'lauris' && /session\/cna$/.test(stale.act.path));
});
await T.test('denial recommendations are built from the same weak points: the clock first, then what answers the payer\'s reason, then what is missing', async () => {
  const s = await state('jperez'); const r = byId(s.requests, 'R-0402'); const d = byRequest(s, 'R-0402'); const list = denialRecsFor(s, d, r);
  assert.ok(list.length >= 4 && list.length <= 10); assert.eq(list[0].key, 'window'); assert.ok(list.some(x => x.key === 'cite-asam' && x.insert.text), 'the ASAM sentence'); assert.ok(list.some(x => x.key.startsWith('incident-')), 'an incident after the assessment');
  assert.ok(list.some(x => x.needsInput && x.insert && x.insert.text === ''), 'a gap asks the clinician');
  assert.ok(list.every(x => x.scope === 'denial' && x.id === `denial:R-0402:${x.key}`));
  const sum = summary(s, list); assert.eq(sum.included, 0); assert.eq(sum.expected, sum.base); assert.match(sum.basis, /Illustrative sample/);
});
await T.test('only a clinician reads or makes decisions; the others get an empty list and a 403', async () => {
  for (const who of ['cdiaz', 'dowens', 'khale']) { const s = await state(who); assert.deepEq(s.rec_decisions, [], who + ' reads no decisions'); }
  await assert.refused(tryApi('recs.decide', { scope: 'auth', ref: 'R-0402', key: 'level-cite', state: 'included' }, 'cdiaz'), /not allowed/i, 403);
  await assert.refused(tryApi('recs.add', { scope: 'auth', ref: 'R-0402', title: 'A thing', text: 'Some text.' }, 'khale'), /not allowed/i, 403);
});
await T.test('include a recommendation that has text; it is audited with who and when, without the clinician\'s words; dismiss and reopen', async () => {
  const r = await api('recs.decide', { scope: 'auth', ref: 'R-0402', key: 'level-cite', state: 'included', context: 'Confirmed with the family.' }, 'jperez');
  assert.eq(r.decision.state, 'included'); assert.eq(r.decision.by, 'jperez');
  let s = await state('jperez'); const ev = s.events.filter(e => e.record === 'R-0402' && /Authorization recommendation included/.test(e.what)).at(-1); assert.ok(ev && ev.who === 'jperez' && !/family/.test(ev.what), 'audited; the context is not in the audit text');
  const list = authRecsFor(s, byId(s.requests, 'R-0402')); assert.eq(key(list, 'level-cite').state, 'included'); assert.eq(key(list, 'level-cite').context, 'Confirmed with the family.');
  await api('recs.decide', { scope: 'auth', ref: 'R-0402', key: 'level-cite', state: 'dismissed' }, 'jperez'); s = await state('jperez'); assert.eq(key(authRecsFor(s, byId(s.requests, 'R-0402')), 'level-cite').state, 'dismissed');
  await api('recs.decide', { scope: 'auth', ref: 'R-0402', key: 'level-cite', state: 'open' }, 'jperez'); s = await state('jperez'); assert.eq(key(authRecsFor(s, byId(s.requests, 'R-0402')), 'level-cite').state, 'open');
  await assert.refused(tryApi('recs.decide', { scope: 'auth', ref: 'R-0402', key: 'level-cite', state: 'maybe' }, 'jperez'), /included, dismissed or open/, 422);
  await assert.refused(tryApi('recs.decide', { scope: 'auth', ref: 'R-0402', key: 'no-such-rec', state: 'included' }, 'jperez'), /not on this case any more/, 409);
  await assert.refused(tryApi('recs.decide', { scope: 'auth', ref: 'R-9999', key: 'x', state: 'included' }, 'jperez'), /not in the tracker/, 404);
});
await T.test('a recommendation that needs input cannot be included without the clinician\'s own words; with them, their words are the text', async () => {
  await assert.refused(tryApi('recs.decide', { scope: 'auth', ref: 'R-0391', key: 'level-reason', state: 'included' }, 'jperez'), /needs your own words/, 422);
  await assert.refused(tryApi('recs.decide', { scope: 'auth', ref: 'R-0391', key: 'level-reason', state: 'included', context: '   ' }, 'jperez'), /needs your own words/, 422);
  const words = 'A lower level was tried in September and the client returned to daily use within a week.';
  await api('recs.decide', { scope: 'auth', ref: 'R-0391', key: 'level-reason', state: 'included', context: words }, 'jperez');
  const s = await state('jperez'); const list = authRecsFor(s, byId(s.requests, 'R-0391')); const x = key(list, 'level-reason'); assert.eq(textOf(x), words);
  const ins = insertsFor(list); assert.eq(ins.length, 1); assert.eq(ins[0].box, 'Reason for the requested level'); assert.eq(ins[0].text, words);
  const long = 'x'.repeat(900); await api('recs.decide', { scope: 'auth', ref: 'R-0391', key: 'level-reason', state: 'included', context: long }, 'jperez');
  assert.eq(key(authRecsFor(await state('jperez'), byId((await state('jperez')).requests, 'R-0391')), 'level-reason').context.length, 600, 'context is capped at 600 characters');
});
await T.test('"Apply selected" is validated as a batch (one refusal changes nothing) and is one audit event; the clinician can add and remove their own', async () => {
  await reset('canvas');
  const before = (await state('jperez')).rec_decisions.length;
  await assert.refused(tryApi('recs.decideMany', { scope: 'auth', ref: 'R-0391', items: [{ key: 'prior', state: 'dismissed' }, { key: 'level-reason', state: 'included' }] }, 'jperez'), /needs your own words/, 422);
  assert.eq((await state('jperez')).rec_decisions.length, before, 'a refused batch changes nothing');
  const r = await api('recs.decideMany', { scope: 'auth', ref: 'R-0402', items: [{ key: 'level-cite', state: 'included' }, { key: 'd5-cite', state: 'included' }, { key: 'prior-cite', state: 'dismissed' }] }, 'jperez');
  assert.eq(r.included, 2); assert.eq(r.dismissed, 1);
  const s = await state('jperez'); assert.eq(s.events.filter(e => e.record === 'R-0402' && /recommendations applied · 2 included, 1 dismissed/.test(e.what)).length, 1);
  await assert.refused(tryApi('recs.add', { scope: 'auth', ref: 'R-0402', title: 'x', text: 'Some text here.' }, 'jperez'), /short title/, 422);
  await assert.refused(tryApi('recs.add', { scope: 'auth', ref: 'R-0402', title: 'Add the safety plan', text: '' }, 'jperez'), /Psyflo does not write it/, 422);
  const add = await api('recs.add', { scope: 'auth', ref: 'R-0402', title: 'Mention the safety plan', text: 'A safety plan was reviewed with the client on Oct 28.', box: 'Continued need / risk' }, 'jperez');
  let list = authRecsFor(await state('jperez'), byId((await state('jperez')).requests, 'R-0402')); const mine = list.find(x => x.custom); assert.ok(mine && mine.state === 'included' && mine.id === add.id && mine.title === 'Mention the safety plan');
  assert.ok(insertsFor(list).some(x => x.box === 'Continued need / risk' && /safety plan/.test(x.text)), 'the clinician\'s own text goes in');
  await assert.refused(tryApi('recs.remove', { scope: 'auth', ref: 'R-0402', key: 'level-cite' }, 'jperez'), /Only a recommendation you added/, 409);
  await api('recs.remove', { scope: 'auth', ref: 'R-0402', key: mine.key }, 'jperez'); list = authRecsFor(await state('jperez'), byId((await state('jperez')).requests, 'R-0402')); assert.ok(!list.some(x => x.custom));
});
await T.test('applyToBoxes appends included text to its form box (after what the clinician already has), never twice, and adds a missing box', async () => {
  const s = await state('jperez'); const list = authRecsFor(s, byId(s.requests, 'R-0402')); // level-cite and d5-cite are included from the previous test
  const boxes = [{ label: 'Level of care', value: 'Level 2.1 is requested.' }, { label: 'Dimension 5 — relapse, continued use, or continued problem potential', value: 'Evidence missing — verify D5.' }, { label: 'Barriers', value: '' }];
  const out = applyToBoxes(boxes, list); const lc = out.boxes.find(b => b.label === 'Level of care'); assert.ok(lc.value.startsWith('Level 2.1 is requested. ') && /ratings support ASAM Level 2\.1/.test(lc.value), 'appended');
  const d5 = out.boxes.find(b => b.label.startsWith('Dimension 5')); assert.ok(!/^Evidence missing/.test(d5.value) && d5.value.length > 20, 'a placeholder is replaced, not extended');
  assert.eq(out.applied.length, 2); const again = applyToBoxes(out.boxes, list); assert.eq(again.applied.length, 0, 'applying twice adds nothing');
  assert.eq(out.boxes.find(b => b.label === 'Barriers').value, '', 'an untouched box stays untouched');
});
await T.test('denial: an included recommendation lands in every unsent draft as "Added from recommendations", un-reviews it, and leaves when dismissed; a sent draft is untouched', async () => {
  await reset('canvas');
  await api('dispute.genDoc', { id: 'DI-0402', doc: 'p2p' }, 'jperez');
  let s = await state('jperez'); let doc = byRequest(s, 'R-0402').docs.p2p; assert.ok(!doc.sections.some(x => x.key === RECS_SECTION), 'nothing included yet');
  const r = byId(s.requests, 'R-0402'); const d = byRequest(s, 'R-0402'); const units = key(denialRecsFor(s, d, r), 'units'); assert.ok(units && units.insert.text);
  const out = await api('recs.decide', { scope: 'denial', ref: 'R-0402', key: 'units', state: 'included' }, 'jperez'); assert.eq(out.docs, 1, 'one unsent draft updated');
  s = await state('jperez'); doc = byRequest(s, 'R-0402').docs.p2p; const sec = doc.sections.find(x => x.key === RECS_SECTION); assert.ok(sec && sec.text.includes(units.insert.text) && sec.title === 'Added from recommendations'); assert.eq(doc.reviewed, null);
  assert.ok(doc.versions.some(v => /Recommendations updated/.test(v.what)), 'the change is a version');
  // a regenerated draft carries the included recommendation too
  await api('dispute.genDoc', { id: 'DI-0402', doc: 'p2p' }, 'jperez'); s = await state('jperez'); assert.ok(byRequest(s, 'R-0402').docs.p2p.sections.some(x => x.key === RECS_SECTION && x.text.includes(units.insert.text)));
  // an ask for the payer goes to the peer-to-peer draft only
  await api('recs.decide', { scope: 'denial', ref: 'R-0402', key: 'ask-criteria', state: 'included' }, 'jperez'); s = await state('jperez');
  assert.ok(/Which criterion/.test(byRequest(s, 'R-0402').docs.p2p.sections.find(x => x.key === RECS_SECTION).text));
  assert.ok(!docSection(denialRecsFor(s, byRequest(s, 'R-0402'), byId(s.requests, 'R-0402')), 'appeal').text.includes('Which criterion'), 'a p2p-only ask is not in an appeal');
  await api('recs.decide', { scope: 'denial', ref: 'R-0402', key: 'units', state: 'dismissed' }, 'jperez'); await api('recs.decide', { scope: 'denial', ref: 'R-0402', key: 'ask-criteria', state: 'dismissed' }, 'jperez');
  s = await state('jperez'); assert.ok(!byRequest(s, 'R-0402').docs.p2p.sections.some(x => x.key === RECS_SECTION), 'dismissed: the section is gone');
});
await T.test('Scan & Enhance recommendations keep the finding\'s question; a decision on a note finding is stored per client and form', async () => {
  const s = await state('jperez');
  const fields = [{ label: 'Narrative', value: 'Observed the client in group and monitored his mood.' }, { label: 'Objective addressed', value: '' }];
  const list = noteRecsFor(s, 'MR', 'dpn', fields); assert.ok(list.length >= 2, 'findings become recommendations'); const w = list.find(x => x.kind === 'wording'); assert.ok(w && w.needsInput && w.needsInput.prompt && w.insert.box === 'Narrative' && w.id.startsWith('note:MR:dpn:wording-narrative'));
  assert.ok(list.every(x => x.scope === 'note' && x.outcome), 'sample outcomes'); assert.eq(listFor(s, 'note', 'MR:dpn', { fields }).length, list.length);
  await assert.refused(tryApi('recs.decide', { scope: 'note', ref: 'MR:dpn', key: w.key, state: 'included', fields }, 'jperez'), /needs your own words/, 422);
  await api('recs.decide', { scope: 'note', ref: 'MR:dpn', key: w.key, state: 'included', context: 'I led a refusal-skills role play and checked in on his mood.', fields }, 'jperez');
  const s2 = await state('jperez'); const again = noteRecsFor(s2, 'MR', 'dpn', fields); assert.eq(again.find(x => x.key === w.key).state, 'included');
  assert.ok(s2.events.some(e => e.record === 'MR' && /Scan & Enhance recommendation included/.test(e.what)));
});
await T.done();
