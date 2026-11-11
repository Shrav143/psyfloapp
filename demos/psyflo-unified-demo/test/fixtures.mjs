// Fixture parity (review/06b section 3.3): demo.scenario {id} builds a checkpoint through the same internal actions the UI path runs.
// This suite builds the checkpoint BOTH ways (a person's clicks in Lauris reported by the page bridge, and the fixture) and compares
// the normalised states, so the fast path cannot silently drift from what the product does. Also: the presenter scenarios s1-s6 resolve.
import { suite, assert, api, tryApi, state, reset, lget, LAURIS } from './lib/index.mjs';
import { prepTWTo } from './lib/prep.mjs';
import { normState } from './lib/norm.mjs';

const T = suite('fixtures');
const diff = (a, b) => { const A = JSON.stringify(a, null, 1).split('\n'), B = JSON.stringify(b, null, 1).split('\n'); return A.map((l, i) => l !== B[i] ? `- ${l}\n+ ${B[i]}` : null).filter(Boolean).slice(0, 6).join('\n'); };

for (const [fx, stage] of [['tw-screened', 'screened'], ['tw-isp-ready', 'isp-ready'], ['tw-signed', 'signed'], ['tw-sent', 'sent']]) {
  await T.test(`${fx}: the fixture and the UI path give the same state`, async () => {
    await prepTWTo(stage); const ui = normState(await state('jperez'));
    const r = await api('demo.scenario', { id: fx }, 'dowens+p'); assert.ok(r.fixture);
    const fixture = normState(await state('jperez'));
    assert.eq(JSON.stringify(fixture), JSON.stringify(ui), 'states differ:\n' + diff(ui, fixture));
    assert.eq((await lget('/consumers/4492', 'jperez')).status, 200, 'T.W. is in the mock Lauris');
  });
}
await T.test('base presets, tw-referral, payer-decision and mr-daily load; the clock and Lauris agree', async () => {
  for (const id of ['base-live', 'base-canvas', 'tw-referral', 'payer-decision', 'mr-daily', 'mr-corpus', 'analytics-case']) { const r = await api('demo.scenario', { id }, 'dowens+p'); assert.eq(r.today, '2026-10-29', id); }
  const s = await state('jperez'); assert.eq(s.preset, 'canvas');
  assert.match((await lget('/consumers/3310/session/dpn', 'jperez')).text, /10\/29\/2026/);
  assert.ok(!(await tryApi('demo.scenario', { id: 'nope' }, 'dowens+p')).ok);
  assert.ok(!(await tryApi('demo.scenario', { id: 'tw-sent' }, 'jperez')).ok, 'fixtures are presenter/test only');
});
await T.test('the presenter scenarios s1-s6 reset, tweak and return where to go', async () => {
  for (const id of ['s1', 's2', 's3', 's4', 's5', 's6']) {
    const r = await api('demo.scenario', { id }, 'dowens+p');
    assert.ok(r.route && r.role && r.steps.length >= 5 && r.preset, id);
    if (id === 's3') assert.eq((await state('jperez')).requests.find(x => x.id === 'R-0416').stage, 'draft_ready', 's3 starts at a draft');
  }
});
await T.test('DEMO_TEST snapshot of the mock Lauris: present when DEMO_TEST=1 (refused otherwise)', async () => {
  const r = await fetch(LAURIS + '/__test/lauris');
  if (process.env.DEMO_TEST !== '1') { assert.eq(r.status, 404); return; }
  assert.eq(r.status, 200); const snap = await r.json(); assert.ok(snap.consumers.length > 10 && snap.sessions.length > 5 && snap.today === '2026-10-29');
});

await T.done();
