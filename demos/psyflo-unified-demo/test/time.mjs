// Track Time (E7): one model for the panel and the phone. Four separate figures; a running timer is none of them; units only through the rules
// table; the timer follows store.clock; wrong-student protection by Harvest #; corrections and discards keep the earlier record; a processed daily note
// makes the time it lists final; processed time is documented only from an observed page event.
import { suite, assert, api, tryApi, state, reset, lpost, bridge } from './lib/index.mjs';
import { timeSummary, timerOf, unionMinutes, entriesInNoteText, parseDirectMinutes, identityCard, sameStudent, micConsentOf, blocksFor, confirmedContact } from '../web/js/shared/time.js';
import { unitsFor } from '../web/js/shared/rules.js';

const T = suite('time');
const sum = async (as = 'khale', client = 'MR') => { const s = await state(as); return { s, x: timeSummary(s, client, s.today, as === 'khale' ? { staff: 'khale' } : {}) }; };
const entry = (s, id) => s.time_entries.find(e => e.id === id);
const FULL_DAY = ['8:05 am–8:35 am · Morning check-in, classroom', '9:50 am–11:05 am · In-class support, math & reading', '11:40 am–12:25 pm · Lunch support', '12:25 pm–1:05 pm · Recess and transition', '1:10 pm–1:40 pm · Movement intervention + co-regulation walk'].join('\n');

await reset('live');

await T.test('the seeded day keeps four separate figures: recorded 310, direct 220, documented none, 2 potentially billable units (official bands, with a source)', async () => {
  const { s, x } = await sum();
  assert.eq(x.recorded, 310, 'recorded includes the unconfirmed afternoon block'); assert.eq(x.direct, 220, 'direct = confirmed blocks only'); assert.eq(x.documented.source, 'none'); assert.eq(x.documented.minutes, 0);
  assert.eq(x.units, 2, '220 min = 2 units under 120/180/300'); assert.eq(x.units, unitsFor(s, 'tdt', 220), 'units come from the rules table');
  assert.eq(x.unitRule.category, 'OFFICIAL-VERIFIED'); assert.ok(x.unitRule.source, 'the unit rule has its source');
  assert.ok(new Set([x.recorded, x.direct, x.documented.minutes]).size === 3, 'three different minute figures');
  assert.ok(x.flags.some(f => f.key === 'unconfirmed'), 'the unconfirmed block is flagged, not counted');
});
await T.test('the older readers of the contact-time rows see the same blocks as the entries', async () => {
  const s = await state('khale'); assert.deepEq(s.timers.khale.blocks, blocksFor(s, 'MR', s.today, 'khale')); assert.eq(s.timers.khale.blocks.length, 6);
});

await T.test('an active timer is never billable: starting, running and pausing change none of the four figures', async () => {
  const before = (await sum()).x;
  const r = await tryApi('time.start', { client: 'MR', harvest_no: 3310 }, 'khale'); assert.ok(r.ok || /running|already/i.test(r.error || '')); // M.R. is already timing in the seed
  const s = await state('khale'); const t = timerOf(s, 'khale');
  assert.ok(t && !t.stale && t.client === 'MR'); await api('time.pause', {}, 'khale'); assert.ok(timerOf(await state('khale'), 'khale').paused); await api('time.resume', {}, 'khale');
  const after = (await sum()).x;
  for (const k of ['recorded', 'direct', 'units']) assert.eq(after[k], before[k], k + ' is unchanged by a running timer');
});

await T.test('stop records a draft at once (never lost); it is not direct time until a person describes and saves it; units follow the rule, not the timer', async () => {
  const b = (await sum()).x;
  const r = await api('time.stop', {}, 'khale'); assert.ok(r.minutes >= 1); assert.eq(r.start, '13:52');
  let { s, x } = await sum(); const e = entry(s, r.id);
  assert.eq(e.status, 'draft'); assert.eq(e.confirmed, false); assert.eq(x.direct, b.direct, 'a draft is not direct time'); assert.eq(x.units, b.units);
  assert.ok(x.recorded >= b.recorded, 'it is recorded'); assert.ok(timerOf(s, 'khale') === null, 'the timer is stopped');
  const bad = await tryApi('time.save', { id: r.id }, 'khale'); assert.eq(bad.status, 422, 'saving needs words'); assert.match(bad.error, /what you did/i);
  await api('time.save', { id: r.id, what: 'Support during afternoon classes' }, 'khale');
  ({ s, x } = await sum()); assert.eq(entry(s, r.id).status, 'saved'); assert.eq(entry(s, r.id).confirmed, true);
  assert.ok(x.direct > b.direct, 'now it counts as direct time'); assert.eq(x.units, unitsFor(s, 'tdt', x.direct));
});
await T.test('entries that overlap count once (two entries for the same minutes never inflate the figures)', async () => {
  assert.eq(unionMinutes([{ start: '13:40', end: '15:10', paused_min: 0 }, { start: '13:52', end: '15:30', paused_min: 0 }]), 110);
  const { s, x } = await sum(); assert.ok(x.overlapIds.length >= 2, 'the overlap is shown'); assert.ok(x.recorded < 310 + 98 + 1, 'recorded is the union: ' + x.recorded);
  assert.ok(s.time_entries.length >= 7);
});

await T.test('the active activity: said at Start in the person\'s own words (optional), changeable while timing, and the starting text of the stopped entry, which still has to be saved', async () => {
  await reset('live');
  const old = await api('time.stop', {}, 'khale'); await api('time.discard', { id: old.id }, 'khale');
  await api('time.start', { client: 'MR', harvest_no: 3310, what: '  Movement walk  ' }, 'khale'); let s = await state('khale'); assert.eq(timerOf(s, 'khale').what, 'Movement walk');
  await api('time.activity', { what: 'Movement walk with basketball' }, 'khale'); s = await state('khale'); assert.eq(timerOf(s, 'khale').what, 'Movement walk with basketball');
  const r = await api('time.stop', {}, 'khale'); s = await state('khale'); const d = entry(s, r.id); assert.eq(d.what, 'Movement walk with basketball'); assert.eq(d.status, 'draft'); assert.eq(d.confirmed, false, 'a typed activity does not confirm anything');
  assert.eq(timerOf(s, 'khale'), null); assert.eq((await tryApi('time.activity', { what: 'x' }, 'khale')).code, 'no_timer');
  await api('time.save', { id: r.id }, 'khale'); assert.eq(entry(await state('khale'), r.id).status, 'saved');
});

await T.test('wrong-student protection: a Harvest # that is not the student is refused; no caseload fallback; roles without Track Time are refused', async () => {
  await reset('live');
  const w = await tryApi('time.start', { client: 'MR', harvest_no: 4492 }, 'jperez'); assert.eq(w.status, 409); assert.eq(w.code, 'wrong_patient'); assert.match(w.error, /Harvest # 4492 is not M\.R\./);
  assert.eq((await tryApi('time.start', { client: 'DW' }, 'khale')).status, 403, 'D.W. is not on K. Hale\'s caseload');
  const og = await tryApi('time.start', { client: 'PG', harvest_no: 4300 }, 'jperez'); assert.eq(og.status, 403); assert.eq(og.code, 'not_tdt', 'an outpatient record is off');
  assert.eq((await tryApi('time.start', { client: 'MR' }, 'cdiaz')).status, 403, 'a supervisor does not track time'); assert.eq((await tryApi('time.start', { client: 'MR' }, 'dowens')).status, 403, 'admin neither');
  assert.eq((await tryApi('phone.dictation', { client: 'MR', spoken: 'x' }, 'khale')).code, 'wrong_patient', 'a dictation without a Harvest # is not saved');
  assert.eq((await tryApi('phone.dictation', { client: 'MR', harvest_no: 3315, spoken: 'x' }, 'khale')).code, 'wrong_patient', 'J.T.\'s number is not M.R.\'s');
  assert.deepEq([sameStudent({ clients: [{ id: 'MR', initials: 'M.R.', harvest_no: 3310 }] }, 'MR', 3310).ok, sameStudent({ clients: [{ id: 'MR', initials: 'M.R.', harvest_no: 3310 }] }, 'MR', null).ok], [true, false]);
});

await T.test('the older contact-time rows hold only the student of the timer: another student\'s time never rides along', async () => {
  await reset('live');
  await api('time.add', { client: 'JT', harvest_no: 3315, start: '09:00', end: '09:30', what: 'Check-in', reason: 'forgot to start the timer' }, 'khale');
  let s = await state('khale'); assert.eq(s.timers.khale.client, 'MR'); assert.eq(s.timers.khale.blocks.length, 6, 'J.T.\'s block is not in M.R.\'s rows'); assert.ok(!JSON.stringify(s.timers.khale.blocks).includes('Check-in'));
  assert.eq(blocksFor(s, 'JT', s.today, 'khale').length, 1, 'but the model has it, per student');
});

await T.test('the timer reads the demo clock: a day advance leaves it running from the earlier day; its end is asked for, never guessed', async () => {
  await reset('live');
  await api('time.stop', {}, 'khale'); const d = (await state('khale')).time_entries.at(-1).id; await api('time.discard', { id: d }, 'khale');
  await api('time.start', { client: 'MR', harvest_no: 3310 }, 'khale');
  const before = await state('khale'); assert.ok(!timerOf(before, 'khale').stale);
  await api('demo.advanceDay', {}, 'dowens+p');
  const s = await state('khale'); const t = timerOf(s, 'khale'); assert.ok(t.stale, 'started on an earlier story day'); assert.eq(t.elapsedSec, null, 'no elapsed time is invented');
  const no = await tryApi('time.stop', {}, 'khale'); assert.eq(no.status, 422); assert.eq(no.code, 'stale_timer'); assert.match(no.error, /really ended/);
  assert.eq((await tryApi('time.start', { client: 'MR', harvest_no: 3310 }, 'khale')).code, 'stale_timer', 'a stale timer is resolved before a new one starts');
  const ok = await api('time.stop', { end: '15:45' }, 'khale'); const e = entry(await state('khale'), ok.id); assert.eq(e.date, '2026-10-29', 'the entry is on the day it started'); assert.eq(e.end > '15:30', true);
  assert.deepEq(blocksFor(await state('khale'), undefined, (await state('khale')).today, 'khale'), [], 'the legacy rows follow the new day');
  // the pure arithmetic: the timer counts from the stored start to the clock given, minus pauses
  const st = { clock: {}, timers: { x: { client: 'MR', started: '2026-10-29T13:52:00', paused_sec: 120, paused_at: null } } };
  assert.eq(timerOf(st, 'x', '2026-10-29T15:30:00').elapsedSec, 5880 - 120);
  st.timers.x.paused_at = '2026-10-29T15:00:00'; assert.eq(timerOf(st, 'x', '2026-10-29T15:30:00').elapsedSec, 5880 - 120 - 1800, 'paused time is not counted');
});

await T.test('manual correction keeps the earlier version: reason required, corrected_from, nothing edited in place', async () => {
  await reset('live');
  const bad = await tryApi('time.correct', { id: 'te-5', end: '13:45' }, 'khale'); assert.eq(bad.status, 422); assert.match(bad.error, /why/i);
  assert.match((await tryApi('time.correct', { id: 'te-5', end: '13:45', reason: 'x' }, 'khale')).error, /why/i);
  assert.match((await tryApi('time.correct', { id: 'te-5', reason: 'no change' }, 'khale')).error, /Nothing was changed/);
  assert.match((await tryApi('time.correct', { id: 'te-5', end: '23:00', reason: 'too late' }, 'khale')).error, /after now/, 'no future times on the demo clock');
  assert.match((await tryApi('time.correct', { id: 'te-5', start: '13:50', end: '13:20', reason: 'swapped' }, 'khale')).error, /after the start/);
  const before = (await sum()).x;
  const r = await api('time.correct', { id: 'te-5', end: '13:45', reason: 'Walk ran five minutes longer' }, 'khale');
  const s = await state('khale'); const old = entry(s, 'te-5'), nw = entry(s, r.id);
  assert.eq(old.superseded_by, r.id); assert.eq(old.end, '13:40', 'the earlier version is unchanged'); assert.eq(nw.corrected_from, 'te-5'); assert.eq(nw.minutes, 35); assert.eq(nw.reason, 'Walk ran five minutes longer'); assert.eq(nw.corrected_by, 'khale');
  const after = timeSummary(s, 'MR', s.today, { staff: 'khale' }); assert.eq(after.direct, before.direct + 5); assert.eq(after.entries.length, before.entries.length, 'the new version replaces the old in the figures');
  assert.match((await tryApi('time.correct', { id: 'te-5', end: '13:50', reason: 'again' }, 'khale')).error, /already replaced/, 'correct the latest version');
  assert.ok(s.events.some(e => /Time corrected/.test(e.what) && /earlier version kept/.test(e.what)), 'audited');
});

await T.test('a saved entry is only confirmed by Save; changing its words is a correction with a reason', async () => {
  await reset('live');
  const r = await tryApi('time.save', { id: 'te-5', what: 'Something else entirely' }, 'khale'); assert.eq(r.status, 422); assert.eq(r.code, 'use_correct');
  const ok = await api('time.save', { id: 'te-6', confirm: true }, 'khale'); assert.ok(ok.id); const s = await state('khale'); assert.eq(entry(s, 'te-6').confirmed, true); assert.eq(entry(s, 'te-6').what, 'Afternoon classes, transitions');
});

await T.test('discard: a stopped timer is removed; a saved entry is voided with a reason and kept; the figures drop it', async () => {
  await reset('live');
  const b = (await sum()).x;
  assert.match((await tryApi('time.discard', { id: 'te-3' }, 'khale')).error, /why/i);
  await api('time.discard', { id: 'te-3', reason: 'That was lunch, not a service' }, 'khale');
  let s = await state('khale'); assert.eq(entry(s, 'te-3').status, 'voided'); assert.eq(entry(s, 'te-3').void_reason, 'That was lunch, not a service');
  const a = timeSummary(s, 'MR', s.today, { staff: 'khale' }); assert.eq(a.direct, b.direct - 45); assert.eq(a.recorded, b.recorded - 45);
  const r = await api('time.stop', {}, 'khale'); await api('time.discard', { id: r.id }, 'khale'); s = await state('khale'); assert.ok(!entry(s, r.id), 'a draft is removed entirely');
  assert.eq((await tryApi('time.discard', { id: 'te-3', reason: 'again please' }, 'khale')).status, 409, 'already voided');
});

await T.test('a person adds time they did not time: a reason is required and it is shown as added by hand; no future times', async () => {
  await reset('live');
  assert.match((await tryApi('time.add', { client: 'MR', harvest_no: 3310, start: '14:00', end: '14:10', what: 'Check-in' }, 'khale')).error, /why/i);
  assert.match((await tryApi('time.add', { client: 'MR', harvest_no: 3310, start: '15:00', end: '17:00', what: 'Check-in', reason: 'forgot to start' }, 'khale')).error, /after now/);
  const r = await api('time.add', { client: 'MR', harvest_no: 3310, start: '15:15', end: '15:25', what: 'Check-in after dismissal', reason: 'forgot to start the timer' }, 'khale');
  const e = entry(await state('khale'), r.id); assert.eq(e.source, 'manual'); assert.eq(e.confirmed, true); assert.eq(e.minutes, 10);
});

await T.test('link to the daily note: linking is not documenting; a processed note lists the time and makes it final', async () => {
  await reset('live');
  const lk = await api('time.link', { ids: ['te-1', 'te-2'] }, 'khale'); assert.eq(lk.n, 2);
  assert.match((await tryApi('time.link', { ids: ['te-6'] }, 'khale')).error, /Confirm the entry first/, 'unconfirmed time is not linked');
  let { s, x } = await sum(); assert.eq(x.documented.source, 'none', 'linked is not documented'); assert.eq(x.linkedCount, 2);
  // a person opens M.R.'s daily note in the mock Lauris and presses Process Form; the page bridge reports it
  const vals = { 'Direct time': '3 h 40 min', 'Units': '2', 'Contact time': FULL_DAY, 'Narrative': 'Played basketball with M.R. after he got upset in math, he cooled down and went back to class.' };
  const form = { action: 'process', f2: vals['Direct time'], f3: vals['Units'], f4: vals['Contact time'], f9: vals['Narrative'] };
  const pr = await lpost('/consumers/3310/session/dpn', 'khale', form); const sid = (pr.loc || '').match(/processed=(\d+)/)?.[1]; assert.ok(sid, 'Lauris processed it');
  const ev = { event: 'processed', session: sid, form: 'dpn', consumer: { no: '3310', initials: 'M.R.' }, values: vals, typed: [], user: 'K. Hale' };
  const j = await bridge('lauris.observed', ev); assert.ok(j.ok, j.error);
  ({ s, x } = await sum());
  assert.eq(x.documented.source, 'note'); assert.eq(x.documented.minutes, 220, 'documented = what the processed note states'); assert.eq(x.documented.units, 2);
  for (const id of ['te-1', 'te-2', 'te-3', 'te-4', 'te-5']) assert.ok(entry(s, id).dpn && entry(s, id).dpn.note, id + ' is listed in the processed note');
  assert.ok(!entry(s, 'te-6').dpn, 'the unconfirmed block is not in the note');
  assert.ok(!x.flags.some(f => f.key === 'mismatch' || f.key === 'units'), 'note and entries agree');
  assert.match((await tryApi('time.correct', { id: 'te-1', end: '08:40', reason: 'late fix' }, 'khale')).error, /final/, 'write-once');
  assert.match((await tryApi('time.discard', { id: 'te-2', reason: 'late fix' }, 'khale')).error, /final/);
  assert.match((await tryApi('time.link', { ids: ['te-1'], unlink: true }, 'khale')).error, /final/);
});
await T.test('a note whose time disagrees with the saved entries is flagged, not silently reconciled', async () => {
  await reset('live');
  const vals = { 'Direct time': '5 h 10 min', 'Units': '3', 'Contact time': FULL_DAY, 'Narrative': 'Worked with M.R. today.' };
  const pr = await lpost('/consumers/3310/session/dpn', 'khale', { action: 'process', f2: vals['Direct time'], f3: vals['Units'], f4: vals['Contact time'], f9: vals['Narrative'] }); const sid = (pr.loc || '').match(/processed=(\d+)/)[1];
  const j = await bridge('lauris.observed', { event: 'processed', session: sid, form: 'dpn', consumer: { no: '3310', initials: 'M.R.' }, values: vals, typed: [], user: 'K. Hale' }); assert.ok(j.ok, j.error);
  const { x } = await sum(); assert.ok(x.flags.some(f => f.key === 'mismatch'), 'note says 310, entries say 220'); assert.ok(x.flags.some(f => f.key === 'units'), 'note says 3 units, the rule gives 2');
  assert.eq(x.documented.minutes, 310); assert.eq(x.direct, 220, 'direct time is not rewritten to match the note');
});

await T.test('units follow the configured rule only: change the bands (admin, with a reason) and the same minutes give other units', async () => {
  await reset('live');
  assert.eq((await sum()).x.units, 2);
  await api('settings.rule', { key: 'units.tdt.day_tiers', value: [[120, 1], [240, 2], [300, 3]], reason: 'test of a different band set' }, 'dowens+p');
  const { s, x } = await sum(); assert.eq(x.units, 1, '220 minutes is now 1 unit'); assert.eq(x.units, unitsFor(s, 'tdt', 220));
  await reset('live');
});

await T.test('who sees time: a direct support worker their own entries; clinician all; supervisor and admin none (entries hold activity text)', async () => {
  await reset('live');
  assert.eq((await state('khale')).time_entries.length, 6); assert.eq((await state('jperez')).time_entries.length, 6);
  assert.eq((await state('cdiaz')).time_entries.length, 0); assert.eq((await state('dowens')).time_entries.length, 0);
  assert.eq((await state('slane')).time_entries.length, 0, 'another direct support worker sees none of K. Hale\'s');
  assert.ok(!JSON.stringify(await state('dowens')).includes('Morning check-in'));
});

await T.test('microphone consent is a recorded answer per person per demo day; typing needs none; voice without it is refused', async () => {
  await reset('live');
  const base = { client: 'MR', harvest_no: 3310, spoken: 'played basketball with M.R. after he got upset in math' };
  const typed = await api('phone.dictation', { ...base, input: 'typed' }, 'khale'); assert.ok(typed.id);
  const v = await tryApi('phone.dictation', { ...base, input: 'voice' }, 'khale'); assert.eq(v.code, 'no_consent'); assert.match(v.error, /allowed today/);
  let s = await state('khale'); assert.eq(micConsentOf(s, 'khale').granted, false);
  await api('dictation.micConsent', { granted: true }, 'khale'); s = await state('khale'); assert.eq(micConsentOf(s, 'khale').granted, true); assert.eq(s.mic_consents.at(-1).staff, 'khale');
  const ok = await api('phone.dictation', { ...base, input: 'voice' }, 'khale'); assert.ok(ok.id);
  s = await state('khale'); const d = s.dictations.find(x => x.id === ok.id); assert.eq(d.status, 'waiting'); assert.eq(d.input, 'voice'); assert.eq(d.harvest_no, 3310); assert.eq(d.source, 'phone');
  await api('dictation.micConsent', { granted: false }, 'khale'); assert.eq(micConsentOf(await state('khale'), 'khale').granted, false, 'turning it off is recorded too');
  await api('demo.advanceDay', {}, 'dowens+p'); await api('dictation.micConsent', { granted: true }, 'khale'); await api('demo.advanceDay', {}, 'dowens+p');
  assert.eq(micConsentOf(await state('khale'), 'khale').granted, false, 'the answer lasts for the demo day');
});
await T.test('a dictation saved again replaces the waiting one; a processed (used) one is final', async () => {
  await reset('live');
  const base = { client: 'MR', harvest_no: 3310, input: 'typed' };
  const a = await api('phone.dictation', { ...base, spoken: 'played basketball with M.R. after math' }, 'khale');
  const b = await api('phone.dictation', { ...base, spoken: 'played basketball with M.R. after math, then walked', replace: a.id }, 'khale');
  const s = await state('khale'); const mine = s.dictations.filter(d => d.client === 'MR' && d.status === 'waiting' && d.staff === 'khale'); assert.eq(mine.length, 1); assert.eq(mine[0].id, b.id);
});

await T.test('helpers: identity card, contact-time matching, minutes parsing', async () => {
  const s = await state('khale'); const c = identityCard(s, 'MR'); assert.eq(c.harvest_no, 3310); assert.eq(c.schoolShort, 'Campbell ES-1'); assert.eq(c.grade, 2); assert.match(c.line, /M\.R\. · # 3310 · Campbell ES-1 · grade 2/);
  const list = s.time_entries.filter(e => e.client === 'MR');
  assert.deepEq(entriesInNoteText(list, '08:05–08:35 · x\n13:10–13:40 · y').map(e => e.id), ['te-1', 'te-5']); assert.deepEq(entriesInNoteText(list, FULL_DAY).length, 5);
  assert.deepEq([parseDirectMinutes('3 h 40 min'), parseDirectMinutes('220 min'), parseDirectMinutes('3:40'), parseDirectMinutes('')], [220, 220, 220, null]);
});

await T.test('the Contact time box may carry confirmed direct rows only; a processed note that lists an unconfirmed block is flagged and audited, and the block is not counted or linked', async () => {
  await reset('live');
  let s = await state('khale'); const cc = confirmedContact(s, 'MR', s.today, { staff: 'khale' });
  assert.eq(cc.entries.length, 5); assert.noMatch(cc.lines, /unconfirmed|3:10 pm/); assert.eq(cc.minutes, 220); assert.eq(cc.units, 2); assert.match(cc.lines.split('\n')[0], /^8:05 am–8:35 am · Morning check-in/);
  await api('time.save', { id: 'te-6', confirm: true }, 'khale'); s = await state('khale'); assert.eq(confirmedContact(s, 'MR', s.today, { staff: 'khale' }).entries.length, 6, 'a person pressed Confirm: now it may be typed');
  await reset('live');
  const vals = { 'Direct time': '3 h 40 min', 'Units': '2', 'Contact time': FULL_DAY + '\n1:40 pm–3:10 pm · Afternoon classes, transitions (unconfirmed)', 'Narrative': 'Worked with M.R. today.' };
  const pr = await lpost('/consumers/3310/session/dpn', 'khale', { action: 'process', f2: vals['Direct time'], f3: vals['Units'], f4: vals['Contact time'], f9: vals['Narrative'] }); const sid = (pr.loc || '').match(/processed=(\d+)/)[1];
  const j = await bridge('lauris.observed', { event: 'processed', session: sid, form: 'dpn', consumer: { no: '3310', initials: 'M.R.' }, values: vals, typed: [], user: 'K. Hale' }); assert.ok(j.ok, j.error);
  s = await state('khale'); const x = timeSummary(s, 'MR', s.today, { staff: 'khale' });
  assert.ok(x.flags.some(f => f.key === 'note_lists_unconfirmed' && f.tone === 'danger'), 'flagged'); assert.eq(x.direct, 220, 'not counted'); assert.ok(!entry(s, 'te-6').dpn, 'not linked');
  assert.ok(s.events.some(e => /lists 1 time block nobody confirmed \(1:40–3:10 pm\)/.test(e.what) && e.actor_kind === 'bridge'), 'audited');
});

await T.done();
