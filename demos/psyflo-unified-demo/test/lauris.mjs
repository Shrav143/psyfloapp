// The mock Lauris pages E7 owns: Authorizations (a person types units), Time Tracker, the demo clock, M.R.'s corpus sessions.
// The "Enter units in Lauris" task closes only by a bridge observation; Psyflo never writes units into Lauris. The bridge contract itself
// (element ids, message shapes) is asserted by test/bridge-contract.mjs.
import fs from 'node:fs';
import { suite, assert, api, tryApi, state, reset, advance, bridge, lget, lpost, LAURIS } from './lib/index.mjs';

const T = suite('lauris');
const snap = async () => (await fetch(LAURIS + '/__test/lauris')).json();
// the text the page bridge reads from .hdr .units
const units = html => ((html.match(/id="consumer-units">([\s\S]*?)<\/div>/) || [])[1] || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
// what the page bridge reports for an authorization flash: the entry number on the flash is its `session`
const entryOf = html => (html.match(/id="lauris-flash" data-event="authorization"[^>]*data-session="(\d+)"/) || [])[1];
const flash = html => (html.match(/id="lauris-flash" data-event="([a-z]+)"[^>]*>/) || [])[1];

await reset('canvas');

await T.test('Authorizations page: a table of every active consumer with payer, dates, units and status; filters; links to the consumer\'s authorization tab', async () => {
  const h = (await lget('/authorizations', 'jperez')).text;
  assert.match(h, /id="authorization-table"/); assert.match(h, /<tr data-consumer="3310" data-status="active">/); assert.match(h, /<tr data-consumer="4492" data-status="none">/, 'T.W. has no authorization in the mock until a person enters it');
  assert.match(h, /name="payer"/); assert.match(h, /name="status"/); assert.match(h, /href="\/consumers\/4492\?tab=auth">Enter units/);
  const none = (await lget('/authorizations?view=none', 'jperez')).text; assert.match(none, /<tr data-consumer="4492"/); assert.noMatch(none, /<tr data-consumer="3310"/, 'only consumers without an authorization');
  const f = (await lget('/authorizations?payer=anthem', 'jperez')).text; assert.match(f, /data-consumer="3310"/); assert.noMatch(f, /data-consumer="4492"/);
  assert.match((await lget('/consumers/3310', 'jperez')).text, /class="lnav[^"]*" href="\/authorizations\?view=none">Consumers w\/o Authorizations<span class="b">\d+<\/span>/, 'the sidebar count is kept');
});
await T.test('the consumer\'s Authorization Information tab: the header says "N units available", the entry form posts to the existing endpoint', async () => {
  const h = (await lget('/consumers/3310?tab=auth', 'jperez')).text;
  assert.match(units(h), /^27 units available/); assert.match(h, /<form method="post" action="\/consumers\/3310\/authorization" id="authorization-form"/);
  for (const [id, label] of [['au-payer', 'Payer'], ['au-units', 'Units authorized'], ['au-start', 'Start date'], ['au-end', 'End date']]) assert.match(h, new RegExp(`<label for="${id}">${label}</label>`));
  assert.noMatch(h, /id="lauris-form"[^>]*data-form="authorization"/, 'it is not a form Psyflo can type into');
  const t = (await lget('/consumers/4492?tab=auth', 'jperez')).text; assert.match(units(t), /No authorizations available/);
});

await T.test('T.W.: truthfully "No authorizations available" until a person enters units; the task closes only when the bridge sees units at or above the award', async () => {
  await api('request.demoReply', { id: 'R-0416', kind: 'approved', units: 120 }, 'dowens+p');
  let s = await state('jperez'); const task = () => s.lauris_tasks.find(x => x.client === 'TW');
  assert.ok(task() && task().status === 'open' && task().units === 120, 'Psyflo opened a human task');
  const before = await snap(); assert.eq(before.consumers.find(c => c.no === 4492).auth, null, 'Psyflo wrote nothing into Lauris');
  assert.match(units((await lget('/consumers/4492', 'jperez')).text), /No authorizations available/);
  // a forged claim is refused: the open page does not show those units
  const forged = await bridge('lauris.observed', { event: 'authorization', consumer: { no: '4492', initials: 'T.W.', units: '120 units available' }, user: 'J. Perez, LPC' });
  assert.ok(!forged.ok && /does not show/.test(forged.error)); s = await state('jperez'); assert.eq(task().status, 'open');
  // a person enters FEWER units than the award: Lauris shows them, the task stays open
  let r = await lpost('/consumers/4492/authorization', 'jperez', { payer: 'humana', units: '100', start: '2026-10-30', end: '2027-01-28' });
  assert.match(r.loc, /\/consumers\/4492\?tab=auth&authorization=4492$/);
  let pg = (await lget(r.loc, 'jperez')).text; assert.eq(flash(pg), 'authorization'); const firstEntry = entryOf(pg); assert.match(pg, /data-consumer="4492" data-session="\d+">Authorization saved · 100 units available/); assert.match(units(pg), /^100 units available · ending 01\/28\/2027/);
  let j = await bridge('lauris.observed', { event: 'authorization', session: entryOf(pg), consumer: { no: '4492', initials: 'T.W.', units: units(pg) }, user: 'J. Perez, LPC' }); assert.ok(j.ok, j.error);
  s = await state('jperez'); assert.eq(task().status, 'open', '100 is below the 120 awarded');
  // the person enters the awarded units: Lauris shows them and the observation closes the task
  r = await lpost('/consumers/4492/authorization', 'jperez', { payer: 'humana', units: '120', start: '2026-10-30', end: '2027-01-28' });
  pg = (await lget(r.loc, 'jperez')).text; assert.match(units(pg), /^120 units available/);
  assert.ok(entryOf(pg) && entryOf(pg) !== firstEntry, 'each entry is its own observed event');
  j = await bridge('lauris.observed', { event: 'authorization', session: entryOf(pg), consumer: { no: '4492', initials: 'T.W.', units: units(pg) }, user: 'J. Perez, LPC' }); assert.ok(j.ok, j.error);
  s = await state('jperez'); assert.eq(task().status, 'done'); assert.eq(task().closed_by, 'jperez'); assert.eq(task().observed_available, 120);
  assert.ok(s.events.some(e => /Units seen in Lauris: 120 available/.test(e.what) && e.actor_kind === 'bridge'), 'closed by an observed page event');
  const snapNow = await snap(); const tw = snapNow.consumers.find(c => c.no === 4492); assert.eq(tw.auth.available, 120); assert.eq(tw.auth_history.length, 1, 'the 100-unit entry is kept as an earlier authorization');
  assert.match((await lget('/consumers/4492?tab=auth', 'jperez')).text, /Earlier authorizations/);
});
await T.test('a script that omits the payer or the end date is not refused (the form requires them); bad numbers and dates are, with a message and no change', async () => {
  const c0 = (await snap()).consumers.find(c => c.no === 3402).auth;
  for (const bad of [{ units: '0' }, { units: 'abc' }, { units: '-5' }, { units: '3000' }, { units: '60', start: '2026-12-01', end: '2026-11-01' }, { units: '60', end: 'tomorrow' }]) {
    const r = await lpost('/consumers/3402/authorization', 'jperez', { start: '2026-11-01', end: '2027-01-30', ...bad });
    assert.match(r.loc, /blocked=/, JSON.stringify(bad)); assert.eq(flash((await lget(r.loc, 'jperez')).text), 'blocked');
  }
  assert.deepEq((await snap()).consumers.find(c => c.no === 3402).auth, c0, 'nothing changed');
  const ok = await lpost('/consumers/3402/authorization', 'jperez', { units: '150', start: '2026-11-01' }); assert.match(ok.loc, /authorization=3402/);
});

await T.test('units gate: a daily note that enters units is refused (and kept as Saved Session) when none are authorized, none are left, or the authorization ended; a note with no units is not', async () => {
  for (const [no, who, why] of [[3402, 'jperez', /0 units available/], [3330, 'khale', /No authorization is on file/]]) {
    const before = (await snap()).consumers.find(c => c.no === no);
    const r = await lpost(`/consumers/${no}/session/dpn`, who, { action: 'process', f2: '220 min', f3: '2', f9: 'note that should not be processed' });
    assert.match(r.loc, new RegExp(`/consumers/${no}/session/dpn\\?id=\\d+&blocked=`), 'back to the form with the reason'); const id = r.loc.match(/id=(\d+)/)[1];
    const pg = (await lget(r.loc, who)).text; assert.eq(flash(pg), 'blocked'); assert.match(decodeURIComponent(r.loc), why); assert.match(pg, /cannot be processed with 2 units/); assert.match(pg, /Your entries are kept in Saved Session/);
    const d = await snap(); const s = d.sessions.find(x => String(x.id) === id); assert.eq(s.status, 'saved', 'nothing was processed'); assert.eq(s.values['Narrative'], 'note that should not be processed', 'what was typed is kept'); assert.deepEq(d.consumers.find(c => c.no === no).active_file, before.active_file, 'the Active File did not change');
    assert.eq(d.consumers.find(c => c.no === no).auth?.available, before.auth?.available, 'no units were drawn');
  }
  assert.match((await lget('/consumers/3402/session/dpn', 'jperez')).text, /id="no-units-note"/, 'the form says so before anyone presses anything');
  const ok = await lpost('/consumers/3402/session/dpn', 'jperez', { action: 'process', f9: 'a note that enters no units' }); assert.match(ok.loc, /processed=\d+/, 'no units entered: not refused');
  const mr = await lpost('/consumers/3310/session/dpn', 'khale', { action: 'process', f2: '220 min', f3: '2', f9: 'with units available' }); assert.match(mr.loc, /processed=\d+/, 'units available: processed');
  await reset('canvas');
});

await T.test('the Lauris pages print the demo clock; a day advance moves Lauris with Psyflo (new pages too)', async () => {
  let s = await state('jperez'); const us = d => d.slice(5, 7) + '/' + d.slice(8) + '/' + d.slice(0, 4);
  for (const p of ['/consumers', '/authorizations', '/time', '/consumers/3310?tab=auth']) assert.match((await lget(p, 'jperez')).text, new RegExp(`id="lauris-clock"[^>]*>${us(s.today)} \\d\\d:\\d\\d`), p);
  assert.match((await lget('/consumers/3310/session/dpn', 'jperez')).text, new RegExp(`Add Session · ${us(s.today)}`));
  const d = await advance(1); s = await state('jperez'); assert.ok(s.today > d.from);
  for (const p of ['/consumers', '/authorizations', '/time']) assert.match((await lget(p, 'jperez')).text, new RegExp(`id="lauris-clock"[^>]*>${us(s.today)} \\d\\d:\\d\\d`), p + ' after the advance');
  assert.eq((await snap()).today, s.today);
  const sv = await lpost('/consumers/3315/session/dpn', 'khale', { action: 'save', f9: 'x' }); const sid = sv.loc.match(/id=(\d+)/)[1];
  assert.eq((await snap()).sessions.find(x => String(x.id) === sid).saved_at.slice(0, 10), s.today, 'a saved form is stamped with the demo day');
});

await reset('canvas');
await T.test('Time Tracker: a page where a person types the time of a service; the page reports it as a saved entry, never as units', async () => {
  const list = (await lget('/time', 'khale')).text; assert.match(list, /id="time-list"/); assert.match(list, /<tr data-consumer="3310">/);
  const h = (await lget('/time?consumer=3310', 'khale')).text;
  assert.match(h, /<form method="post" action="\/time\?consumer=3310" id="lauris-form" data-form="time" data-consumer="3310" data-session=""/); assert.match(h, /<div class="hdr" data-consumer="3310">/);
  for (const [id, label] of [['t-start', 'Start'], ['t-end', 'End'], ['t-min', 'Minutes'], ['t-act', 'Activity'], ['t-obj', 'Objective addressed']]) assert.match(h, new RegExp(`<label for="${id}">${label}</label>`));
  const bad = await lpost('/time?consumer=3310', 'khale', { start: '15:00', end: '14:00', activity: 'x' }); assert.match(bad.loc, /blocked=/);
  const r = await lpost('/time?consumer=3310', 'khale', { action: 'save', start: '13:10', end: '13:40', minutes: '', activity: 'Movement intervention', objective: 'Obj. 1' });
  assert.match(r.loc, /\/time\?consumer=3310&timesaved=(\d+)$/); const id = r.loc.match(/timesaved=(\d+)/)[1];
  const pg = (await lget(r.loc, 'khale')).text; assert.match(pg, new RegExp(`id="lauris-flash" data-event="saved" data-session="${id}" data-form="time" data-consumer="3310"`)); assert.match(pg, /<td>13:10<\/td><td>13:40<\/td><td class="num">30<\/td>/);
  assert.match(pg, /Units come from the daily note/);
  // the bridge's observation is believed only for an entry that exists for that consumer
  const ok = await bridge('lauris.observed', { event: 'saved', form: 'time', session: id, consumer: { no: '3310', initials: 'M.R.' }, user: 'K. Hale' }); assert.ok(ok.ok, ok.error);
  const forged = await bridge('lauris.observed', { event: 'saved', form: 'time', session: '999', consumer: { no: '3310', initials: 'M.R.' }, user: 'K. Hale' }); assert.ok(!forged.ok && /no such saved entry/.test(forged.error));
  const other = await bridge('lauris.observed', { event: 'saved', form: 'time', session: id, consumer: { no: '3315', initials: 'J.T.' }, user: 'K. Hale' }); assert.ok(!other.ok, 'an entry for M.R. is not believed for J.T.');
});

await T.test('M.R. #3310 corpus: E5\'s sessions are in the Active File, newest first; new work gets a higher session number and sorts above the history', async () => {
  const f = new URL('../seed/extra/notes-corpus.json', import.meta.url);
  if (!fs.existsSync(f)) return T.skip('corpus sessions', 'seed/extra/notes-corpus.json is not present');
  const corpus = JSON.parse(fs.readFileSync(f, 'utf8')); const want = ((corpus._lauris_sessions || {}).sessions || []).length || (corpus.notes || []).length;
  const d = await snap(); const mine = d.sessions.filter(s => s.no === 3310 && s.corpus); assert.eq(mine.length, want, 'every corpus session is in the mock');
  assert.ok(mine.every(s => s.status === 'processed' && s.processed_by), 'processed, with who processed them');
  assert.ok(new Set(mine.map(s => s.form)).size >= 3, 'daily, weekly and monthly forms'); assert.ok(d.nextSession > Math.max(...mine.map(s => s.id)), 'new session numbers follow the corpus');
  const act = (await lget('/consumers/3310?tab=active', 'khale')).text; const rows = [...act.matchAll(/<tr><td>(\d\d)\/(\d\d)\/(\d{4})<\/td>/g)].map(m => `${m[3]}-${m[1]}-${m[2]}`);
  assert.ok(rows.length >= want, 'the Active File lists them'); assert.deepEq(rows, [...rows].sort().reverse(), 'newest first');
  const one = mine.find(s => s.form === 'dpn'); const v = (await lget('/sessions/' + one.id, 'khale')).text; assert.match(v, /id="lauris-preview"/); assert.match(v, /<div class="pv" data-label="Narrative">/);
});

await T.test('the test snapshot route exists only with DEMO_TEST=1 (guard in the source; the suite itself runs with it on)', async () => {
  const src = fs.readFileSync(new URL('../server/lauris/site.js', import.meta.url), 'utf8'); assert.match(src, /\/__test\/lauris[\s\S]{0,200}DEMO_TEST !== '1'[\s\S]{0,60}notFound/);
  assert.ok((await fetch(LAURIS + '/__test/lauris')).ok);
});

await T.done();
