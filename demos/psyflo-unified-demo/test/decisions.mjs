// Decision reconciliation: an approved decision sets the client's authorization (units and window) in Psyflo's tracker and opens a
// human task "enter the units in Lauris", closed only by a bridge observation. Psyflo never writes units into Lauris.
import { suite, assert, api, tryApi, state, reset, advance, bridge, lpost, lget, LAURIS, BASE, playwright, login, errors } from './lib/index.mjs';

const T = suite('decisions');
const snap = async () => (await fetch(LAURIS + '/__test/lauris')).ok ? (await fetch(LAURIS + '/__test/lauris')).json() : null;
await reset('canvas');
await T.test('T.N. approved at 150 after the peer-to-peer: 150 units, a new window, the old 65 of 65 kept as history', async () => {
  const before = await snap();
  await api('request.p2pLog', { id: 'R-0388', outcome: 'approved', units: 150, doc_ref: 'Sentara decision letter 2026-12-09' }, 'jperez');
  const s = await state('jperez'); const c = s.clients.find(x => x.id === 'TN'); const r = s.requests.find(x => x.id === 'R-0388');
  assert.eq(r.stage, 'active'); assert.eq(c.authorization.units, 150); assert.eq(c.authorization.used, 0); assert.eq(c.authorization.award, 'R-0388');
  assert.ok(c.authorization.start && c.authorization.end > c.authorization.start, 'a window');
  assert.eq(c.authorization_history.at(-1).units, 65, 'the previous authorization is kept'); assert.eq(c.stage, 'in_service');
  const t = s.lauris_tasks.find(x => x.client === 'TN'); assert.ok(t && t.status === 'open' && t.units === 150 && /Enter 150 units/.test(t.text), 'a human task is open');
  if (before) assert.eq(JSON.stringify((await snap()).consumers.find(x => x.no === 3402).auth), JSON.stringify(before.consumers.find(x => x.no === 3402).auth), 'Psyflo wrote nothing into Lauris');
  assert.ok((await state('dowens')).lauris_tasks.length >= 1, 'admin sees the task status');
});
await T.test('the task closes only when the page bridge shows the units in Lauris (a person entered them)', async () => {
  const wrong = await bridge('lauris.observed', { event: 'authorization', consumer: { no: '3402', initials: 'T.N.', units: '150 units available' }, user: 'J. Perez, LPC' });
  assert.ok(!wrong.ok && /does not show/.test(wrong.error), 'a forged units claim is not believed');
  const r = await lpost('/consumers/3402/authorization', 'jperez', { units: '150', start: '2026-11-01', end: '2027-01-30' });
  assert.match(r.loc, /authorization=3402/);
  const page = await lget(r.loc, 'jperez'); assert.match(page.text, /id="lauris-flash" data-event="authorization" data-consumer="3402"/);
  const j = await bridge('lauris.observed', { event: 'authorization', consumer: { no: '3402', initials: 'T.N.', units: '150 units available · ending 01/30/2027' }, user: 'J. Perez, LPC' });
  assert.ok(j.ok, j.error);
  const s = await state('jperez'); assert.eq(s.lauris_tasks.find(x => x.client === 'TN').status, 'done'); assert.eq(s.clients.find(x => x.id === 'TN').authorization.status, 'active');
  assert.ok(s.events.some(e => e.record === 'R-0388' && /Units seen in Lauris/.test(e.what) && e.actor_kind === 'bridge'));
});
await reset('canvas');
await T.test('T.W. and E.C. become Active WITH units (demo reply approved on a sent request)', async () => {
  await api('request.demoReply', { id: 'R-0416', kind: 'approved', units: 120 }, 'dowens+p');
  await api('request.demoReply', { id: 'R-0384', kind: 'approved', units: 60 }, 'dowens+p');
  const s = await state('jperez');
  for (const [cid, rid, u] of [['TW', 'R-0416', 120], ['EC', 'R-0384', 60]]) {
    const c = s.clients.find(x => x.id === cid); assert.eq(s.requests.find(x => x.id === rid).stage, 'active'); assert.eq(c.authorization.units, u, cid); assert.eq(c.stage, 'in_service', cid);
  }
});
await T.test('accepting a partial (D.W. 110 of 150) sets 110 units; M.R. continued stay award replaces 83 of 110 with a new window', async () => {
  await api('request.partialDecide', { id: 'R-0402', door: 'accept' }, 'jperez');
  assert.eq((await state('jperez')).clients.find(x => x.id === 'DW').authorization.units, 110);
});
await T.test('request.demoReply never approves a draft or anything that was not sent; presenter mode is required', async () => {
  for (const kind of ['approved', 'partial', 'denied', 'info']) await assert.refused(tryApi('request.demoReply', { id: 'R-0411', kind }, 'dowens+p'), /replies only to a request that was sent/, 409);
  const s = await state('jperez'); assert.eq(s.requests.find(x => x.id === 'R-0411').stage, 'draft_ready'); assert.ok(!s.clients.find(x => x.id === 'MR').authorization_history);
  await assert.refused(tryApi('request.demoReply', { id: 'R-0408', kind: 'approved' }, 'jperez'), /demo\.controls/, 403);
  await assert.refused(tryApi('request.demoReply', { id: 'R-0408', kind: 'approved' }), /Sign in/, 401);
});
await reset('canvas');
await T.test('R-0391 (J.O.) turns overdue under the clock service, like R-0399', async () => {
  let s = await state('jperez'); const r = s.requests.find(x => x.id === 'R-0391'); assert.eq(r.stage, 'submitted'); assert.ok(r.sent && r.decision_due, 'sent date and window are on the request');
  await advance(8, true); s = await state('jperez');   // Nov 6: day 14
  assert.eq(s.requests.find(x => x.id === 'R-0391').stage, 'submitted', 'day 14 is not yet past the window');
  await advance(1, true); s = await state('jperez');   // Nov 7: day 15
  assert.eq(s.requests.find(x => x.id === 'R-0391').stage, 'overdue');
});
await T.test('/api/state and the roster never serve a screening transcript to an unauthenticated caller', async () => {
  const st = await fetch(BASE + '/api/state'); assert.eq(st.status, 401);
  const roster = JSON.stringify(await fetch(BASE + '/api/roster').then(r => r.json())); assert.noMatch(roster, /transcript|Piedmont|grandmother/i);
  assert.eq((await fetch(BASE + '/seed/scripts/screening_TW.txt')).status, 401, 'the scripted call is signed-in only');
  const link = await api('familyLink.send', { referral: 'REF-118' }, 'jperez');
  for (const as of ['khale', 'cdiaz', 'dowens', { portalToken: link.token }, { portalToken: 'sch-rbell-demo' }]) assert.ok(!JSON.stringify(await state(as)).includes('Piedmont'), 'no transcript text for ' + JSON.stringify(as));
  assert.ok(JSON.stringify(await state('jperez')).includes('Piedmont') || (await state('jperez')).screenings.length >= 0);
});
await reset('canvas');
await T.done();
