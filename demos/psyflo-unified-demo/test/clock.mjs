// The demo clock (review/05 section 9): one clock for Psyflo and the mock Lauris, no hard-coded story dates, no silent time pinning,
// deadlines from the rules table, honest "missed" and "closed" states.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { suite, assert, api, tryApi, state, reset, advance, lget, BASE } from './lib/index.mjs';
import * as M from '../web/js/shared/model.js';
import { now, today, nextDay } from '../web/js/shared/clock.js';
import { rule, deadline, decisionDay } from '../web/js/shared/rules.js';

const T = suite('clock');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const laurisDate = async () => (await lget('/consumers/3310/session/dpn', 'jperez')).text.match(/Add Session · (\d\d\/\d\d\/\d{4})/)?.[1];
const US = iso => iso.slice(5, 7) + '/' + iso.slice(8, 10) + '/' + iso.slice(0, 4);

await reset('canvas');
await T.test('both presets start on Oct 29; Psyflo and the mock Lauris print the same date', async () => {
  for (const preset of ['live', 'canvas']) {
    await reset(preset); const s = await state('jperez');
    assert.eq(s.today, '2026-10-29'); assert.eq(s.clock.date, '2026-10-29'); assert.eq(today(s), '2026-10-29');
    assert.eq(await laurisDate(), '10/29/2026', preset);
  }
});
await T.test('advancing the day moves Psyflo AND Lauris together; the default skips the weekend', async () => {
  await reset('canvas');
  const a = await advance(); assert.eq(a.today, '2026-10-30');
  assert.eq((await state('jperez')).today, '2026-10-30'); assert.eq(await laurisDate(), '10/30/2026');
  const b = await advance(); assert.eq(b.today, '2026-11-02', 'Fri -> Mon'); assert.eq(await laurisDate(), '11/02/2026');
  const c = await advance(1, true); assert.eq(c.today, '2026-11-03');
  assert.eq(nextDay('2026-10-30'), '2026-11-02'); assert.eq(nextDay('2026-10-30', { calendar: true }), '2026-10-31');
  const e = (await state('jperez')).events.filter(e => e.record === 'clock').at(-1); assert.ok(e.sim && e.actor_kind === 'demo' && /Lauris/.test(e.what));
});
await T.test('a Lauris stamp uses the same clock (a form processed after the advance is dated that day)', async () => {
  const { lpost } = await import('./lib/index.mjs');
  const p = await lpost('/consumers/3315/session/dpn', 'khale', { action: 'process', f9: 'x' }); const id = p.loc.match(/processed=(\d+)/)[1];
  const page = await lget(`/sessions/${id}`, 'khale'); assert.match(page.text, /processed 11\/03\/2026/);
});
await T.test('the time of day is not the machine clock and is never silently pinned (fixed only through DEMO_TIME)', async () => {
  const s = await state('jperez');
  assert.ok(s.clock && 'anchor_time' in s.clock && 'anchor_wall' in s.clock && 'fixed' in s.clock);
  assert.match(now(s), /^\d{4}-\d\d-\d\dT\d\d:\d\d$/);
  if (s.clock.fixed) assert.eq(now(s), s.today + 'T' + s.clock.fixed, 'DEMO_TIME fixes it for repeatable tests');
  const run = { ...s, clock: { ...s.clock, fixed: null, anchor_time: '09:00', anchor_wall: 1000 } };
  assert.eq(now(run, 1000 + 125 * 60000), s.today + 'T11:05', 'a running clock from the anchor');
});
await T.test('PDU-02 an information request that is not answered becomes "missed" (no 08:40 fudge); the reply-due time is shown', async () => {
  await reset('canvas'); let s = await state('jperez'); const r = s.requests.find(x => x.id === 'R-0408');
  const c0 = M.requestClock(s, r); assert.match(c0.text, /h left of 24 · due Thu Oct 29/); assert.match(c0.text, /^9 h left/, 'at 09:00: 17:40 is 8 h 40 min away');
  await advance(); s = await state('jperez'); const c1 = M.requestClock(s, s.requests.find(x => x.id === 'R-0408'));
  assert.match(c1.text, /reply missed · was due Thu Oct 29/); assert.eq(c1.sev, 'r');
});
await T.test('PDU-01/06 decision clock: "Day N", follow-up on day 10, overdue only after the configured window; each number has a source', async () => {
  await reset('canvas'); let s = await state('jperez'); const r = s.requests.find(x => x.id === 'R-0416');
  assert.match(M.requestClock(s, r).text, /^Day 7 · follow-up call on day 10/);
  const lim = rule(s, 'decision.overdue_after_days'); assert.eq(lim.value, 14); assert.eq(lim.category, 'HARVEST-REPORTED'); assert.ok(lim.source);
  assert.eq(rule(s, 'decision.public_standard_days').value, 7); assert.eq(rule(s, 'decision.public_standard_days').category, 'UNVERIFIED-DEMO-ASSUMPTION');
  assert.eq(rule(s, 'decision.followup_day').value, 10);
  await advance(3, true); s = await state('jperez');   // Nov 1: day 10
  assert.match(M.requestClock(s, s.requests.find(x => x.id === 'R-0416')).text, /^Day 10 · follow-up call due/);
  assert.ok(M.doNext(s).some(i => i.group === 'decisions' && /Day 10/.test(i.title)), 'Do next shows the follow-up call');
  assert.ok(s.requests.find(x => x.id === 'R-0416').stage === 'submitted', 'not overdue yet');
  await advance(5, true); s = await state('jperez');   // Nov 6: day 15 > 14
  const q = s.requests.find(x => x.id === 'R-0416'); assert.eq(q.stage, 'overdue', 'overdue only after the window'); assert.match(M.requestClock(s, q).text, /^Day 15 · 1 day past the 14-day window/);
});
await T.test('the seeded overdue request (R-0399) is overdue by the rule, not by a constant', async () => {
  await reset('canvas'); const s = await state('jperez'); const r = s.requests.find(x => x.id === 'R-0399');
  assert.eq(r.stage, 'overdue'); const dd = decisionDay(s, r.sent, s.today, r.payer); assert.ok(dd.overdue, 'day ' + dd.day + ' > 14');
});
await T.test('EXA-04 appeal window: computed from the notice date (60 days, unverified, confirm on the letter); closed after it, never negative', async () => {
  await reset('canvas'); let s = await state('jperez'); const r = s.requests.find(x => x.id === 'R-0384');
  assert.eq(M.appealDeadline(s, r), '2026-12-21'); assert.match(M.requestClock(s, r).text, /^appeal window · 53 days left \(60 days from the notice; confirm on the letter\)/);
  await advance(54, true); s = await state('jperez');
  assert.eq(M.requestClock(s, s.requests.find(x => x.id === 'R-0384')).text, 'appeal window closed');
});
await T.test('deadlines return the date, the source and the verification label from the rules table', async () => {
  const s = await state('jperez');
  const d = deadline(s, 'isp.due_days_official', '2026-10-21'); assert.eq(d.date, '2026-11-20'); assert.eq(d.category, 'OFFICIAL-VERIFIED'); assert.match(d.source, /Chapter IV/);
  const h = deadline(s, 'isp.due_hours_harvest', '2026-10-21T10:00'); assert.eq(h.date, '2026-10-22T10:00'); assert.eq(h.verification, 'Harvest-reported');
  const b = deadline(s, 'continued_stay.lead_business_days', '2026-11-13', { value: -14 }); assert.ok(b.date < '2026-11-13');
  assert.ok(M.STAGE_LABEL.needs_approval === 'Pending clinical approval');
});
await T.test('no hard-coded story date in the foundation code (the Oct 29 literal, "Oct 29", 10/29, the 08:40 fudge)', () => {
  const files = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(js|mjs)$/.test(f.name)) files.push(p); } };
  for (const d of ['server', 'web/js/shared', 'web/panel']) walk(path.join(ROOT, d));
  files.push(path.join(ROOT, 'web/js/api.js'));
  const bad = [];
  for (const f of files) {
    if (/panel\/panel\.js$/.test(f)) continue;   // E5's panel: reported separately below
    const src = fs.readFileSync(f, 'utf8').split('\n');
    src.forEach((l, i) => { if (/2026-10-29|Oct 29|10\/29|T08:40|'08:40'/.test(l) && !/^\s*(\/\/|\*)/.test(l)) bad.push(`${path.relative(ROOT, f)}:${i + 1}`); });
  }
  assert.deepEq(bad, [], 'hard-coded date literals: ' + bad.join(', '));
  // other owners' files: listed, not failed
  const others = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'web/js/screens')).map(x => path.join(ROOT, 'web/js/screens', x)).concat([path.join(ROOT, 'web/panel/panel.js')])) {
    fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (/'2026-10-29'|"2026-10-29"|T08:40/.test(l)) others.push(`${path.relative(ROOT, f)}:${i + 1}`); });
  }
  if (others.length) console.log('NOTE other owners\' files with a date literal (not failed): ' + others.join(', '));
});

await T.done();
