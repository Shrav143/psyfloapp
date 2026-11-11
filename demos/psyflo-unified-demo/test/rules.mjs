// The rules table (review/05c): every row carries its category and source; edits go through settings.rule (admin.settings), are
// audited with a reason, and apply forward only.
import fs from 'node:fs';
import { suite, assert, api, tryApi, state, reset } from './lib/index.mjs';
import { rule, unitsFor, unitBands, CATEGORIES, VERIFICATION, signatureMode } from '../web/js/shared/rules.js';

const T = suite('rules');
await reset('canvas');
const register = fs.readFileSync(new URL('../review/05c-rules-register.md', import.meta.url), 'utf8');

await T.test('every rule has key, label, value, unit, category, source, verified_on, note, default', async () => {
  const s = await state('dowens');
  assert.ok(s.rules.length >= 60, 'rules: ' + s.rules.length);
  for (const r of s.rules) {
    for (const k of ['key', 'label', 'unit', 'category', 'source', 'verified_on', 'note', 'default', 'value']) assert.ok(k in r, `${r.key} has ${k}`);
    assert.ok(CATEGORIES.includes(r.category), `${r.key} category ${r.category}`);
    assert.ok(r.source && r.source.length > 3, `${r.key} has a source`);
    if (r.category === 'OFFICIAL-VERIFIED') assert.ok(r.verified_on, `${r.key} is official so it has a verified_on date`);
  }
  assert.eq(new Set(s.rules.map(r => r.key + '|' + r.scope)).size, s.rules.length, 'keys are unique');
});
await T.test('the register is covered: R-001..R-054 each appear in at least one rule', async () => {
  const s = await state('dowens'); const have = new Set(s.rules.flatMap(r => String(r.register || '').split(/[ ,]+/)));
  const want = [...register.matchAll(/^\| (R-\d{3}) \|/gm)].map(m => m[1]);
  assert.eq(want.length, 54);
  assert.deepEq(want.filter(x => !have.has(x)), []);
});
await T.test('unit bands: official 120/180/300 by default; the 60-minute rule is only an alternate value', async () => {
  const s = await state('jperez');
  assert.deepEq(unitBands(s, 'tdt'), [[120, 1], [180, 2], [300, 3]]); assert.eq(rule(s, 'units.tdt.day_tiers').category, 'OFFICIAL-VERIFIED');
  assert.deepEq(rule(s, 'units.tdt.alt_tiers').value, [[60, 1], [180, 2], [300, 3]]); assert.eq(rule(s, 'units.tdt.alt_tiers').category, 'UNVERIFIED-DEMO-ASSUMPTION');
  for (const [m, u] of [[60, 0], [119, 0], [120, 1], [220, 2], [299, 2], [300, 3]]) assert.eq(unitsFor(s, 'tdt', m), u, m + ' min');
});
await T.test('the named rules exist with the right category: plan due, decision clock, additional info, continued stay, notes, discharge, signature modes, eligibility, group size', async () => {
  const s = await state('jperez'); const cat = (k, c) => assert.eq(rule(s, k).category, c, k);
  cat('isp.due_hours_harvest', 'HARVEST-REPORTED'); cat('isp.due_days_official', 'OFFICIAL-VERIFIED');
  cat('decision.followup_day', 'HARVEST-REPORTED'); cat('decision.overdue_after_days', 'HARVEST-REPORTED'); cat('decision.public_standard_days', 'UNVERIFIED-DEMO-ASSUMPTION');
  assert.eq(rule(s, 'info_request.hours').value, 24); cat('continued_stay.lead_business_days', 'UNVERIFIED-DEMO-ASSUMPTION');
  assert.eq(rule(s, 'notes.daily_due_hours').value, 24); cat('notes.daily_due_hours', 'HARVEST-REPORTED');
  assert.eq(rule(s, 'discharge.lapse_days').value, 31); cat('discharge.lapse_days', 'OFFICIAL-VERIFIED');
  assert.ok(rule(s, 'redesign.tdt_end').value && rule(s, 'eligibility.recheck_days').unit);
  for (const d of ['consent', 'release', 'enrollment', 'quarterly', 'appeal']) assert.ok(['remote_allowed', 'in_person_required', 'pending_validation'].includes(signatureMode(s, d)), d);
  assert.eq(rule(s, 'analytics.min_group_size').value, 5);
  assert.eq(rule(s, 'nope').missing, true);
  assert.ok(VERIFICATION['PAYER-SPECIFIC'] && VERIFICATION['OFFICIAL-VERIFIED'] === 'Officially verified');
});
await T.test('settings.rule: admin only, a reason is required, the change is audited and kept in the row history', async () => {
  await assert.refused(tryApi('settings.rule', { key: 'info_request.hours', value: 12, reason: 'payer asked for 12' }, 'jperez'), /not allowed/, 403);
  await assert.refused(tryApi('settings.rule', { key: 'info_request.hours', value: 12 }, 'dowens'), /Say why/, 422);
  await assert.refused(tryApi('settings.rule', { key: 'info_request.hours', value: 'twelve', reason: 'typo test' }, 'dowens'), /must be a/, 422);
  await assert.refused(tryApi('settings.rule', { key: 'units.tdt.day_tiers', value: [[180, 1], [120, 2]], reason: 'bad bands' }, 'dowens'), /increasing/, 422);
  await api('settings.rule', { key: 'info_request.hours', value: 12, reason: 'Anthem now states 12 hours' }, 'dowens');
  const r = rule(await state('dowens'), 'info_request.hours'); assert.eq(r.value, 12); assert.eq(r.default, 24); assert.eq(r.history.length, 1); assert.eq(r.history[0].by, 'dowens');
  assert.ok((await state('dowens')).events.some(e => /Rule changed: Information request/.test(e.what)));
});
await T.test('a rule change applies forward only: a new information request uses it, stored dates do not move', async () => {
  const before = (await state('jperez')).requests.find(x => x.id === 'R-0408').reply_due;
  await api('request.demoReply', { id: 'R-0402', kind: 'info' }, 'dowens+p');
  const s = await state('jperez'); const q = s.requests.find(x => x.id === 'R-0402');
  assert.eq(new Date(q.reply_due).getTime() - new Date(q.info_requested_at).getTime(), 12 * 3600000, 'new request uses 12 h');
  assert.eq(s.requests.find(x => x.id === 'R-0408').reply_due, before, 'the stored one did not move');
});
await T.test('changing the unit bands changes unitsFor; a reset to the default restores it', async () => {
  await api('settings.rule', { key: 'units.tdt.day_tiers', value: [[60, 1], [180, 2], [300, 3]], reason: 'try the alternate 60-minute rule' }, 'dowens');
  assert.eq(unitsFor(await state('dowens'), 'tdt', 90), 1);
  await api('settings.rule', { key: 'units.tdt.day_tiers', reset: true, reason: 'back to the official bands' }, 'dowens');
  assert.eq(unitsFor(await state('dowens'), 'tdt', 90), 0);
});
await T.test('signature mode: switching consent to in-person refuses a remote signature', async () => {
  await api('settings.rule', { key: 'signature.mode.consent', value: 'in_person_required', reason: 'Harvest confirmed in person' }, 'dowens');
  const link = await api('familyLink.send', { referral: 'REF-118' }, 'jperez');
  await assert.refused(tryApi('consent.sign', { client: 'TW', form: 'Consent for services' }, { portalToken: link.token }), /in-person signature/, 422);
  await api('settings.rule', { key: 'signature.mode.consent', reset: true, reason: 'policy not validated' }, 'dowens');
  await api('consent.sign', { client: 'TW', form: 'Consent for services' }, { portalToken: link.token });
});

await T.done();
