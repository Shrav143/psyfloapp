// R7 · Oprox parity foundation: web/js/shared/intel.js (selectors), seed/extra/intel.json (the labelled sample), x-intel.js (the audit entries),
// web/js/ui/intel.js (shared parts, rendered in the browser by the owners' suites).
// Standalone: `BASE=http://localhost:5300 node test/intel.mjs` (test/run-all.mjs starts a fresh server for it).
// Proves: dollars at risk are units × the demo rate with their basis; urgency reads the same deadline as the queue; the highest-dollar near case is the
// "highest financial risk" group; the sample is labelled and complete; override patterns count the clinic's own decisions on top of the baseline; the
// footer-action audit entry is clinician-only and does not repeat any text.
import { suite, assert, api, tryApi, state, reset } from './lib/index.mjs';
import { rateUsd, usd, atRisk, urgency, bands, packetLine, liftLine, expectedAll, modelConfidence, comparableCount, payerPulse, payerPattern, historicalCards, insights, overridePatterns, INTEL_BASIS, DECISION_SUPPORT, BAND_LABEL } from '../web/js/shared/intel.js';
import { authRecsFor } from '../web/js/shared/recs.js';

const T = suite('intel');
const byId = (a, id) => a.find(x => x.id === id);

await reset('canvas');
await T.test('the sample is seeded, labelled, and complete: every payer has an approval rate and a comparable count; denial reasons match the stored list', async () => {
  const s = await state('jperez'); const m = s.intel_sample;
  assert.ok(m && /Illustrative sample/.test(m.basis) && INTEL_BASIS.includes('Illustrative sample'), 'labelled');
  for (const p of s.payers) { assert.ok(typeof m.approval_by_payer[p.id] === 'number', 'approval for ' + p.id); assert.ok(m.comparable[p.id] > 0, 'comparable for ' + p.id); }
  const stored = new Set(s.denial_reasons.map(x => x.reason)); for (const x of m.denial_by_payer) assert.ok(stored.has(x.reason), 'same reason text as the stored list: ' + x.reason);
  assert.eq(m.historical_cards.length, 3); assert.ok(m.historical_cards.some(c => c.kind === 'denied') && m.historical_cards.filter(c => c.kind === 'approved').length === 2);
  assert.ok(m.appeals.analogous > 0 && m.appeals.strategies.length >= 4); assert.match(DECISION_SUPPORT, /Not clinical guidance/);
});
await T.test('dollars at risk: units × the demo rate, with the basis printed; nothing for a request with nothing at stake', async () => {
  const s = await state('jperez'); assert.eq(rateUsd(s), 205); assert.eq(usd(14800), '$14,800');
  const pending = atRisk(s, byId(s.requests, 'R-0416')); assert.ok(pending && pending.kind === 'pending' && pending.units === 150 && pending.dollars === 150 * 205 && /units × \$205/.test(pending.basis) && /at risk$/.test(pending.label));
  const gap = atRisk(s, { ...byId(s.requests, 'R-0402'), units_offered: 110 }); assert.ok(gap && gap.kind === 'gap' && gap.units === 40 && gap.dollars === 40 * 205, 'the gap between asked and offered');
  const denied = atRisk(s, byId(s.requests, 'R-0384')); assert.ok(denied && denied.kind === 'denied' && denied.units > 0);
  assert.eq(atRisk(s, { ...byId(s.requests, 'R-0416'), stage: 'closed' }), null); assert.eq(atRisk(s, null), null);
});
await T.test('urgency reads the same deadline the queue shows, in hours from the demo clock; bands put the highest-dollar near case first', async () => {
  const s = await state('jperez'); const rows = s.requests.map(r => { const u = urgency(s, r); const k = atRisk(s, r); return { id: r.id, u, hours: u.hours, dollars: k ? k.dollars : 0 }; });
  const dated = rows.filter(x => x.hours != null); assert.ok(dated.length >= 4, 'several requests have a date: ' + dated.length);
  for (const x of dated) assert.ok(x.u.label, 'a label for ' + x.id);
  const b = bands(rows); assert.ok(b.groups.length >= 2); assert.eq(b.groups[0].key, 'risk', 'the first group is the highest financial risk');
  assert.eq(b.groups[0].ids.length, 1, 'exactly one case is the highest risk'); assert.eq(BAND_LABEL.risk, 'Highest financial risk · act now');
  const top = rows.filter(x => x.hours != null && x.hours <= 72 && x.dollars > 0).sort((a, c) => (c.dollars - a.dollars) || (a.hours - c.hours))[0];
  assert.eq(b.groups[0].ids[0], top.id, 'the highest-dollar case due within 72 hours');
  for (const g of b.groups) for (const id of g.ids) assert.eq(b.byId[id], g.key);
  const synthetic = bands([{ id: 'a', hours: 2, dollars: 100 }, { id: 'b', hours: 30, dollars: 900 }, { id: 'c', hours: 50, dollars: 50 }, { id: 'd', hours: 400, dollars: 5 }, { id: 'e', hours: null, dollars: 0 }]);
  assert.deepEq(synthetic.byId, { a: 'day', b: 'risk', c: 'week', d: 'later', e: 'none' }); assert.deepEq(synthetic.groups.map(g => g.key), ['risk', 'day', 'week', 'later', 'none']);
});
await T.test('packet line, lift line, expected approval and confidence are computed from the suggestions and always sample-labelled', async () => {
  const s = await state('jperez'); const recs = authRecsFor(s, byId(s.requests, 'R-0391'));
  const p = packetLine(recs); assert.ok(p.inputs >= 1 && /clinical input/.test(p.text) && p.tone === 'warning', 'the reason beyond the ratings needs the clinician: ' + p.text);
  assert.match(liftLine(recs), /^Historically improves approval by \+\d+ pts \(sample\)$/);
  const e = expectedAll(s, recs); assert.ok(e.expected > e.base && e.expected <= 96 && /Illustrative sample/.test(e.basis));
  const c = modelConfidence(recs); assert.ok(c.value >= 0.72 && c.value <= 0.95 && /similar cases/.test(c.text) && /Illustrative sample/.test(c.basis));
  assert.ok(comparableCount(s, byId(s.requests, 'R-0402')) > 0); assert.eq(packetLine([]).inputs, 0);
});
await T.test('payer pulse and payer pattern: sample lines with the payer\'s stored behaviour next to them', async () => {
  const s = await state('jperez'); const pulse = payerPulse(s); assert.ok(pulse && /Sentara/.test(pulse.payerName) && /^\$28,000$/.test(pulse.exposure) && pulse.lift_to > pulse.lift_from && /Illustrative/.test(pulse.basis));
  const pat = payerPattern(s, 'sentara'); assert.ok(pat.tends && pat.works && pat.partialRate === 74 && pat.analogous > 0 && pat.strategies.length >= 4 && pat.approvalPct != null);
  assert.deepEq(historicalCards(s).map(c => c.kind), ['approved', 'approved', 'denied']);
});
await T.test('insights: KPIs, approval by payer, denial reasons by payer (percent sums to ~100), impactful suggestions; the clinic\'s own decisions add to the override counts', async () => {
  const s0 = await state('jperez'); const d0 = insights(s0, 'auth');
  assert.eq(d0.kpis.length, 4); assert.deepEq(d0.kpis.map(k => k.key), ['approval', 'cause', 'impact', 'autonomy']); assert.deepEq(d0.sections, ['approval', 'actions', 'reasons', 'overrides']);
  assert.deepEq(insights(s0, 'denial').sections, ['reasons', 'actions', 'approval', 'overrides']);
  assert.ok(d0.denialReasons.length === 9 && Math.abs(d0.denialReasons.reduce((n, x) => n + x.pct, 0) - 100) <= 5, 'percent of denials');
  assert.ok(d0.actions.length === 4 && d0.actions[0].applied >= d0.actions[1].applied, 'ordered by how often applied'); assert.ok(d0.approvalByPayer[0].pct >= d0.approvalByPayer[1].pct);
  assert.eq(d0.overrides.liveTotal, 0); const base = d0.overrides.rows.map(r => r.count);
  // a clinician includes every suggestion on one request (no override) and dismisses one on another (partial)
  const r = byId(s0.requests, 'R-0402'); const list = authRecsFor(s0, r); const free = list.filter(x => !x.needsInput);
  await api('recs.decideMany', { scope: 'auth', ref: 'R-0402', items: free.map(x => ({ key: x.key, state: 'included' })) }, 'jperez');
  const l2 = authRecsFor(s0, byId(s0.requests, 'R-0411')).filter(x => !x.needsInput);
  await api('recs.decide', { scope: 'auth', ref: 'R-0411', key: l2[1].key, state: 'included' }, 'jperez'); await api('recs.decide', { scope: 'auth', ref: 'R-0411', key: l2[0].key, state: 'dismissed' }, 'jperez');
  const l3 = authRecsFor(s0, byId(s0.requests, 'R-0395')); await api('recs.decide', { scope: 'auth', ref: 'R-0395', key: l3[0].key, state: 'dismissed' }, 'jperez');
  const s1 = await state('jperez'); const o1 = overridePatterns(s1); assert.eq(o1.liveTotal, 3); assert.eq(o1.rows[0].count, base[0] + 1, 'no override'); assert.eq(o1.rows[1].count, base[1] + 1, 'partial'); assert.eq(o1.rows[2].count, base[2] + 1, 'full'); assert.eq(o1.rows[0].live, 1);
  assert.ok(o1.autonomy >= 0 && o1.autonomy <= 100);
  // every staff role reads the same override figures: the aggregate lives in state, the decisions themselves stay clinician-only
  const sa = await state('dowens'); assert.deepEq(sa.rec_decisions, [], 'the administrator receives no decisions'); assert.deepEq(sa.intel_live, s1.intel_live, 'but the same aggregate');
  assert.eq(insights(sa).kpis[3].value, insights(s1).kpis[3].value, 'the same autonomy rate for the administrator'); assert.deepEq(overridePatterns(sa).rows.map(r => r.count), o1.rows.map(r => r.count));
});
await T.test('the audit entry for a footer action: clinicians only, a known kind and scope, no text copied into the log', async () => {
  const ok = await api('intel.event', { kind: 'refine', scope: 'auth', ref: 'R-0402', note: 'private clinician words' }, 'jperez'); assert.eq(ok.logged, 'refine'); assert.eq(ok.noted, true);
  const s = await state('jperez'); const ev = s.events.filter(e => /Suggestions refined against the record/.test(e.what)); assert.ok(ev.length >= 1 && ev[ev.length - 1].record === 'R-0402', 'logged against the request');
  assert.ok(!JSON.stringify(s.events).includes('private clinician words'), 'the note stays out of the audit text');
  for (const who of ['cdiaz', 'dowens']) await assert.refused(tryApi('intel.event', { kind: 'refine', scope: 'auth', ref: 'R-0402' }, who), /not allowed/i, 403);
  await assert.refused(tryApi('intel.event', { kind: 'nope', scope: 'auth' }, 'jperez'), /unknown action/i, 422); await assert.refused(tryApi('intel.event', { kind: 'refine', scope: 'zzz' }, 'jperez'), /unknown scope/i, 422); await assert.refused(tryApi('intel.event', { kind: 'refine', scope: 'auth', ref: 'R-9999' }, 'jperez'), /not in the tracker/i, 404);
});

await T.done();
