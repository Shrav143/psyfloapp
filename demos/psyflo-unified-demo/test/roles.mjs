// Roles and authority (review/05 section 5 and 12): every role against every capability and route, every action has a capability entry,
// anonymous calls are refused, /api/state is projected per role, a role switch changes what the API returns.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { suite, assert, api, tryApi, state, reset, session, BASE, LAURIS, lget, login, playwright, sleep } from './lib/index.mjs';
import { startInstance, stopInstance } from './lib/server.mjs';
import { createSession } from '../server/psyflo/session.js';
import { CAPS, CAP_LIST, ROLES, MATRIX, can, routeAllowed, ROUTE_CAPS, NAV_FOR } from '../web/js/shared/permissions.js';
import { SCREENS } from '../web/js/registry.js';
import { AUTHZ } from '../server/psyflo/authz.js';

const T = suite('roles');
// The expected matrix, typed independently of permissions.js (review/05 section 5). Y yes, A own caseload, D designated, N never.
const EXPECT = {
  'notes.own': 'A N Y N N N', 'notes.review': 'N Y Y N N N', 'notes.view': 'A A Y N N N', 'auth.status': 'A Y Y Y N N', 'drafts.clinical': 'N N Y N N N',
  'approve.sra': 'N D D N N N', 'sign.lauris': 'N N Y N N N', 'send.packet': 'N D Y D N N', 'payer.reply': 'N N Y N N N', 'payer.decision': 'N D Y D N N',
  'eligibility.run': 'N D Y D N N', 'analytics.aggregate': 'N A Y Y N N', 'analytics.drilldown': 'N N A N N N', 'admin.settings': 'N N N Y N N', 'admin.users': 'N N N Y N N',
  'demo.controls': 'D D D D N N', 'referrals': 'N N Y N N N', 'myWork': 'Y Y Y Y N N', 'denials': 'N N Y Y N N', 'authorizations': 'N Y Y Y N N', 'scanEnhance': 'N D Y N N N'
};
const ORDER = ['direct_support', 'supervisor', 'clinician', 'admin', 'guardian', 'school'];

await T.test('matrix: every documented capability, every role', () => {
  for (const [cap, row] of Object.entries(EXPECT)) {
    assert.ok(CAPS[cap], 'capability exists: ' + cap);
    row.split(' ').forEach((v, i) => assert.eq(MATRIX[ORDER[i]][cap], v, `${cap} for ${ORDER[i]}`));
  }
  assert.ok(CAP_LIST.length >= Object.keys(EXPECT).length);
});

await T.test('admin has no clinical-record access; notes.view is never granted by a designation', () => {
  assert.eq(can({ id: 'x', role: 'admin', designations: ['notes.view'] }, 'notes.view'), false);
  assert.eq(can({ id: 'x', role: 'admin' }, 'drafts.clinical'), false);
  assert.eq(can({ id: 'x', role: 'admin' }, 'auth.status'), true);
});

await T.test('can(): A needs the caseload, D needs the designation, unknown role/capability/user fail closed', () => {
  const ds = { id: 'khale', role: 'direct_support', caseload: ['MR'] };
  assert.eq(can(ds, 'notes.own', { clientId: 'MR' }), true); assert.eq(can(ds, 'notes.own', { clientId: 'DW' }), false);
  assert.eq(can({ id: 'c', role: 'supervisor' }, 'send.packet'), false); assert.eq(can({ id: 'c', role: 'supervisor', designations: ['send.packet'] }, 'send.packet'), true);
  assert.eq(can({ id: 'a', role: 'admin' }, 'demo.controls'), false); assert.eq(can({ id: 'a', role: 'admin', presenter: true }, 'demo.controls'), true);
  assert.eq(can(null, 'myWork'), false); assert.eq(can({ role: 'wizard' }, 'myWork'), false); assert.eq(can({ role: 'admin' }, 'nope'), false);
});

await T.test('routes: every registry route has a capability entry; each role opens exactly what the matrix allows', () => {
  for (const sc of SCREENS) assert.ok(sc.id in ROUTE_CAPS, 'ROUTE_CAPS has ' + sc.id);
  for (const id of ['MyWork', 'Authorization', 'DenialIntelligence', 'DenialCase', 'Settings', 'UiKit']) assert.ok(id in ROUTE_CAPS, 'new route ' + id);
  for (const [id, cap] of Object.entries(ROUTE_CAPS)) for (const role of ORDER) {
    const v = cap === null ? 'Y' : MATRIX[role][cap];
    assert.eq(routeAllowed(role, id), cap === null || v === 'Y' || v === 'A', `${role} -> ${id}`);
  }
  assert.eq(routeAllowed('direct_support', 'Authorizations'), false); assert.eq(routeAllowed('admin', 'ExtSRA'), false); assert.eq(routeAllowed('admin', 'Settings'), true);
  assert.eq(routeAllowed('guardian', 'ParentPortal'), true); assert.eq(routeAllowed('guardian', 'Authorizations'), false); assert.eq(routeAllowed('school', 'SchoolPortal'), true);
  assert.ok(NAV_FOR('admin').includes('Settings') && !NAV_FOR('direct_support').includes('Analytics'));
});

await T.test('every action has a capability entry (and nothing is declared for an action that does not exist)', async () => {
  const names = [];
  for (const f of fs.readdirSync(new URL('../server/psyflo/actions/', import.meta.url)).filter(f => f.endsWith('.js'))) {
    const mod = await import(new URL('../server/psyflo/actions/' + f, import.meta.url));
    names.push(...Object.keys(mod.default));
    if (mod.authz) Object.assign(AUTHZ, mod.authz);
  }
  assert.ok(names.length >= 85, 'at least the 85 original actions are present: ' + names.length);
  const missing = names.filter(n => !AUTHZ[n]);
  assert.deepEq(missing, [], 'actions without a capability: ' + missing.join(', '));
  for (const [n, e] of Object.entries(AUTHZ)) assert.ok(e.internal || e.bridge || e.portalToken || (e.any && e.any.length), 'entry has a rule: ' + n);
});

await reset('live');

await T.test('anonymous: /api/state, /api/do (admin and plain actions), /files and the roster', async () => {
  const r = await fetch(BASE + '/api/state'); assert.eq(r.status, 401);
  await assert.refused(tryApi('user.update', { id: 'khale', patch: { role: 'admin' } }), /Sign in/, 401);
  await assert.refused(tryApi('request.send', { id: 'R-0411' }), /Sign in/, 401);
  await assert.refused(tryApi('demo.reset', { preset: 'live' }), /Sign in/, 401);
  assert.eq((await fetch(BASE + '/files/x__y.pdf')).status, 401);
  const roster = await fetch(BASE + '/api/roster').then(r => r.json());
  assert.ok(roster.staff.length >= 7 && roster.clients.length === 0 && roster.notes.length === 0, 'roster only: no records');
});

await T.test('no screening transcript reaches an unauthenticated caller: /api/state is 401, the roster is empty, the scripted call needs a session', async () => {
  assert.eq((await fetch(BASE + '/api/state')).status, 401);
  const roster = JSON.stringify(await fetch(BASE + '/api/roster').then(r => r.json()));
  assert.noMatch(roster, /transcript|Piedmont|grandmother/i); assert.eq((await fetch(BASE + '/api/roster').then(r => r.json())).screenings.length, 0);
  assert.eq((await fetch(BASE + '/seed/scripts/screening_TW.txt')).status, 401);
  const s = await session('jperez'); assert.eq((await fetch(BASE + '/seed/scripts/screening_TW.txt', { headers: { 'X-Psyflo-Session': s.token } })).status, 200);
});

await T.test('a made-up or tampered token is the same as no token', async () => {
  await assert.refused(tryApi('dictation.discard', {}, { token: 'not-a-token' }), /Sign in/, 401);
  const r = await fetch(BASE + '/api/state', { headers: { 'X-Psyflo-Session': 'nope' } }); assert.eq(r.status, 401);
});

await T.test('action sweep: every action x every staff role gets 401/403 exactly when the matrix says no', async () => {
  const staffRoles = [['direct_support', 'khale'], ['supervisor', 'cdiaz'], ['clinician', 'jperez'], ['admin', 'dowens']];
  const actors = { khale: { role: 'direct_support', id: 'khale', designations: [] }, cdiaz: { role: 'supervisor', id: 'cdiaz', designations: ['send.packet', 'payer.decision', 'eligibility.run'] }, jperez: { role: 'clinician', id: 'jperez', designations: ['approve.sra'] }, dowens: { role: 'admin', id: 'dowens', designations: [] } };
  const bad = [];
  for (const [name, e] of Object.entries(AUTHZ)) {
    for (const [, id] of staffRoles) {
      const j = await tryApi(name, {}, id);
      const denied = j.status === 401 || j.status === 403;
      let expectDenied;
      if (e.internal) expectDenied = true; else if (e.bridge || e.portalToken) expectDenied = false;
      else expectDenied = !(e.any || []).some(cap => can(actors[id], cap));
      if (e.portalToken) { if (!denied && j.status !== 401) bad.push(`${name}/${id}`); continue; }   // token actions answer 401 without a valid token
      if (denied !== expectDenied) bad.push(`${name} as ${id}: ${j.status} ${j.error}`);
    }
  }
  assert.deepEq(bad, [], 'authority mismatches:\n' + bad.join('\n'));
});

await T.test('presenter controls need presenter mode, not only a role', async () => {
  await assert.refused(tryApi('demo.advanceDay', {}, 'dowens'), /demo\.controls|presenter/i, 403);
  await assert.refused(tryApi('demo.reset', { preset: 'live' }, 'jperez'), /demo\.controls|presenter/i, 403);
  await assert.refused(tryApi('request.demoReply', { id: 'R-0402', kind: 'approved' }, 'jperez'), /demo\.controls|presenter/i, 403);
  const a = (await session('dowens+p')).actor; assert.eq(a.presenter, true);
  const b = (await session('dowens')).actor; assert.eq(b.presenter, false);
});

await T.test('user.update: a role change is presenter-only; designations go through two people', async () => {
  await assert.refused(tryApi('user.update', { id: 'khale', patch: { role: 'admin' } }, 'dowens'), /presenter|designat/i, 403);
  const p = await api('user.designate', { id: 'cdiaz', cap: 'approve.sra', reason: 'covers approvals on Fridays' }, 'dowens');
  await assert.refused(tryApi('user.designateApprove', { id: p.id }, 'dowens'), /different person/i, 403);
  await api('user.designateApprove', { id: p.id }, 'jperez');
  assert.ok((await state('dowens')).staff.find(x => x.id === 'cdiaz').designations.includes('approve.sra'));
  await assert.refused(tryApi('user.designate', { id: 'khale', cap: 'send.packet', reason: 'because' }, 'dowens'), /cannot be designated/i);
});

await T.test('projection: direct support sees only their caseload; no screenings, drafts, versions, fills, other staff notes', async () => {
  const s = await state('khale');
  assert.deepEq(s.clients.map(c => c.id).sort(), ['AG', 'CB', 'DP', 'ES', 'JT', 'MR']);
  for (const k of ['screenings', 'drafts', 'lauris_versions', 'fills', 'requests', 'referrals', 'family_links', 'consents', 'eligibility', 'internal_quarterlies']) assert.eq((Array.isArray(s[k]) ? s[k].length : Object.keys(s[k] || {}).length), 0, k + ' is empty for direct support');
  assert.ok(s.notes.every(n => n.staff === 'khale'), 'only their own notes');
  assert.ok(s.clients.every(c => !('diagnosis' in c) && !('medicaid' in c)), 'no diagnosis or Medicaid fields');
  assert.ok((s.dictations || []).every(d => d.staff === 'khale'), 'only their own dictations');
});

await T.test('projection: admin sees unit balances and authorization status but no clinical text', async () => {
  const s = await state('dowens');
  assert.ok(s.clients.length >= 15 && s.clients.every(c => !('diagnosis' in c) && !('medicaid' in c) && !('guardian' in c)), 'client rows without clinical fields');
  assert.ok(s.clients.find(c => c.id === 'MR').authorization.units > 0, 'unit balance is visible');
  assert.ok(s.requests.length >= 8 && s.requests.every(r => !('info_reply' in r) && !('typed_boxes' in r) && !('p2p_recording' in r)), 'request status without drafts');
  assert.ok(s.notes.length > 0 && s.notes.every(n => !('fields' in n) && !('enhanced' in n) && !('dictation' in n)), 'note rows are metadata only');
  for (const k of ['screenings', 'drafts', 'lauris_versions', 'fills', 'dictations', 'internal_quarterlies', 'notes_sample', 'family_links', 'consents']) assert.eq((Array.isArray(s[k]) ? s[k].length : Object.keys(s[k] || {}).length), 0, k + ' is empty for admin');
  assert.ok(s.staff.length >= 7 && s.rules.length >= 60, 'users and rules are visible to admin');
  assert.ok(s.events.every(e => !('sms' in e)), 'SMS text is not in the audit view');
});

await T.test('projection: supervisor sees status and their reviewees\' notes; clinician sees clinical text', async () => {
  const sup = await state('cdiaz'); const clin = await state('jperez');
  const text = n => !!(n.fields || n.enhanced || n.dictation || n.discussed || n.shared);
  assert.ok(sup.notes.some(text) && sup.notes.some(n => !text(n)), 'text only for reviewees');
  assert.ok(sup.notes.filter(text).every(n => ['rowens', 'slane'].includes(n.staff)), 'reviewees only');
  assert.eq(sup.screenings.length, 0);
  assert.ok(clin.notes.filter(text).length > sup.notes.filter(text).length);
  assert.ok(clin.notes_sample.length > 0 && clin.requests.some(r => r.type === 'continued_stay'));
});

await T.test('a role switch changes what the API returns (same server, different token)', async () => {
  const a = await state('khale'), b = await state('jperez'), c = await state('dowens');
  assert.ok(a.clients.length < b.clients.length && c.clients.length === b.clients.length);
  assert.ok(a.requests.length === 0 && b.requests.length > 0 && c.requests.length > 0);
  assert.ok(b.referrals.length > 0 && c.referrals.length === 0);
});

await T.test('service line: outpatient (P.G., R-0377) never appears in the staff state', async () => {
  for (const id of ['jperez', 'dowens', 'cdiaz']) { const s = await state(id); assert.ok(!s.clients.some(c => c.id === 'PG') && !s.requests.some(r => r.id === 'R-0377'), id); }
});

await T.test('portal sessions: a guardian sees one child; a school user sees their own school; neither can use staff actions', async () => {
  const link = await api('familyLink.send', { referral: 'REF-118' }, 'jperez');
  const g = await state({ portalToken: link.token });
  assert.ok(g.clients.length <= 1 && g.staff.every(x => !('designations' in x)) && g.requests.length === 0 && g.notes.length === 0 && g.screenings.length === 0 && g.events.length === 0, 'one child, no staff data');
  await assert.refused(tryApi('request.send', { id: 'R-0411' }, { portalToken: link.token }), /not allowed/i, 403);
  await assert.refused(tryApi('familyLink.open', { token: 'wrong' }), /not valid/i, 401);
  const sch = await state({ portalToken: 'sch-rbell-demo' });
  assert.ok(sch.referrals.every(r => r.school === 'LC-MS2') && sch.notes.length === 0 && sch.requests.length === 0);
  await assert.refused(tryApi('referral.create', { form: { school: 'CC-ES1', client: 'X.Y.' } }, { portalToken: 'sch-rbell-demo' }), /own school/i, 403);
});

await T.test('files need a session and the right role', async () => {
  const link = await api('familyLink.send', { referral: 'REF-118' }, 'jperez');
  await api('familyLink.open', { token: link.token });
  const s = await session('jperez'); const r = await fetch(BASE + '/files/none__x.pdf', { headers: { 'X-Psyflo-Session': s.token } });
  assert.ok(r.status === 403 || r.status === 404, 'unknown file: ' + r.status);
});

await T.test('cross-origin: JSON only and an origin allow-list on state-changing calls', async () => {
  const s = await session('jperez');
  let r = await fetch(BASE + '/api/do', { method: 'POST', headers: { 'Content-Type': 'text/plain', 'X-Psyflo-Session': s.token }, body: JSON.stringify({ action: 'dictation.discard', args: {} }) });
  assert.eq(r.status, 415, 'text/plain is refused');
  r = await fetch(BASE + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://evil.example', 'X-Psyflo-Session': s.token }, body: JSON.stringify({ action: 'dictation.discard', args: {} }) });
  assert.eq(r.status, 403, 'an unlisted origin is refused');
  assert.ok(!r.headers.get('access-control-allow-origin'), 'no reflected CORS');
  r = await fetch(BASE + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: LAURIS }, body: JSON.stringify({ action: 'portal.observed', args: {} }) });
  assert.ok(r.status !== 403 && r.headers.get('access-control-allow-origin') === LAURIS, 'the Lauris origin (page bridge) is allowed');
});

await T.test('presenter PIN and DEMO_PRESENTER are honoured by sign-in', async () => {
  const cfg = await fetch(BASE + '/api/config').then(r => r.json());
  assert.ok('presenter' in cfg);
});

// ---------------- presenter is an explicit elevation (QA2 D1: URA-05, URA-06, URA-10, SVR-09) ----------------
const post = (path, body, token) => fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Psyflo-Session': token } : {}) }, body: JSON.stringify(body) }).then(async r => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));

await T.test('a plain sign-in is never a presenter; the public roster says whether presenter mode exists and needs a PIN, and never carries the PIN', async () => {
  for (const id of ['jperez', 'cdiaz', 'khale', 'dowens']) { const j = await post('/api/session', { staffId: id }); assert.ok(j.ok && j.actor.presenter === false, id + ' presenter by default'); }
  const j = await post('/api/session', { staffId: 'khale', presenter: false }); assert.eq(j.actor.presenter, false);
  const roster = await fetch(BASE + '/api/roster').then(r => r.json());
  assert.ok(roster.presenter && typeof roster.presenter.enabled === 'boolean' && typeof roster.presenter.pin_required === 'boolean', 'roster.presenter {enabled, pin_required}: ' + JSON.stringify(roster.presenter));
  assert.ok(!/PRESENTER_PIN|"pin":"/.test(JSON.stringify(roster)), 'the PIN is never published');
});

await T.test('createSession: PIN required when PRESENTER_PIN is set (wrong or missing is 403 with pin flag), the right PIN elevates, DEMO_PRESENTER=0 never does', () => {
  const st = { staff: [{ id: 'khale', role: 'direct_support', name: 'K', sites: [] }], clients: [], family_links: [], school_users: [], requests: [], referrals: [] };
  const env = { PRESENTER_PIN: '4242', DEMO_PRESENTER: '1' };
  let e; try { createSession(st, { staffId: 'khale', presenter: true }, { env }); } catch (x) { e = x; } assert.ok(e && e.status === 403 && e.pin === true, 'missing pin');
  e = null; try { createSession(st, { staffId: 'khale', presenter: true, pin: '0000' }, { env }); } catch (x) { e = x; } assert.ok(e && e.status === 403 && e.pin === true, 'wrong pin');
  assert.eq(createSession(st, { staffId: 'khale', presenter: true, pin: '4242' }, { env }).actor.presenter, true);
  assert.eq(createSession(st, { staffId: 'khale', pin: '4242' }, { env }).actor.presenter, false);   // a PIN without asking for presenter changes nothing
  assert.eq(createSession(st, { staffId: 'khale', presenter: true }, { env: { DEMO_PRESENTER: '0' } }).actor.presenter, false);
});

const pw = playwright();
const browser = await pw.chromium.launch();
const demoCalls = (token) => Promise.all([['demo.advanceDay', { days: 0 }], ['demo.reset', { preset: 'live' }], ['request.demoReply', { id: 'R-0408', kind: 'approved' }], ['demo.scenario', { id: 's1' }], ['user.update', { id: 'khale', patch: { role: 'admin' } }]]
  .map(async ([action, args]) => [action, (await post('/api/do', { action, args }, token)).status]));

await T.test('regression (URA-05/06/10): writing localStorage.psyflo_user, or reloading, never turns a role session into another person or a presenter', async () => {
  await reset('live');
  const ctx = await browser.newContext(); const p = await ctx.newPage();
  try {
    await login(p, 'khale', { presenter: false });
    const who = () => p.evaluate(() => ({ id: window.psyflo.session.actor.id, role: window.psyflo.session.actor.role, presenter: !!window.psyflo.session.actor.presenter }));
    assert.deepEq(await who(), { id: 'khale', role: 'direct_support', presenter: false });
    await p.evaluate(() => localStorage.setItem('psyflo_user', 'dowens')); await sleep(1800);
    assert.deepEq(await who(), { id: 'khale', role: 'direct_support', presenter: false }, 'a write to psyflo_user replaced the session');
    await p.reload(); await p.waitForFunction(() => window.psyflo && window.psyflo.session && window.psyflo.session.actor, null, { timeout: 8000 }); await sleep(800);
    assert.deepEq(await who(), { id: 'khale', role: 'direct_support', presenter: false }, 'a reload minted a presenter or another person');
    const tok = await p.evaluate(() => JSON.parse(localStorage.getItem('psyflo_session')).token);
    const codes = await demoCalls(tok); assert.ok(codes.every(([, c]) => c === 403), 'demo controls and role changes are refused: ' + JSON.stringify(codes));
    assert.eq(((await state('dowens')).staff.find(x => x.id === 'khale') || {}).role, 'direct_support');
    // a page with no session that finds a legacy psyflo_user signs in as that person, still not as a presenter
    const c2 = await browser.newContext(); const q = await c2.newPage(); await q.goto(BASE + '/#/Login'); await q.evaluate(() => localStorage.setItem('psyflo_user', 'jperez')); await q.reload(); await sleep(1500);
    const a2 = await q.evaluate(() => ({ id: window.psyflo.session.actor && window.psyflo.session.actor.id, presenter: !!(window.psyflo.session.actor && window.psyflo.session.actor.presenter) }));
    assert.deepEq(a2, { id: 'jperez', presenter: false }, 'legacy sign-in must be a plain session'); await c2.close();
    // the Login screen's role cards sign in as plain sessions too
    const c3 = await browser.newContext(); const r = await c3.newPage(); await r.goto(BASE + '/#/Login'); await r.waitForSelector('[data-signin]'); await r.locator('[data-signin]').first().click(); await sleep(1500);
    const a3 = await r.evaluate(() => window.psyflo.session.actor); assert.ok(a3 && a3.presenter === false, 'Login role card: ' + JSON.stringify(a3)); await c3.close();
  } finally { await ctx.close(); await reset('live'); }
});

await T.test('with PRESENTER_PIN set: the server and the dock ask for the PIN, a wrong PIN is refused, the right PIN unlocks the presenter tools (own server)', async () => {
  const base = +new URL(BASE).port + 3;   // app +3, Lauris +4, portals +5: between this runner instance and the next (they are 10 apart)
   const inst = await startInstance({ index: 0, base, dataDir: path.join(os.tmpdir(), 'psyflo-roles-pin-' + process.pid), env: { PRESENTER_PIN: '4242' } });
  const APP = inst.urls.APP;
  const P = (pth, body, token) => fetch(APP + pth, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Psyflo-Session': token } : {}) }, body: JSON.stringify(body) }).then(async r => ({ status: r.status, ...(await r.json().catch(() => ({}))) }));
  try {
    const roster = await fetch(APP + '/api/roster').then(r => r.json()); assert.deepEq(roster.presenter, { enabled: true, pin_required: true });
    const miss = await P('/api/session', { staffId: 'jperez', presenter: true }); assert.ok(miss.status === 403 && miss.pin_required === true, 'missing pin: ' + JSON.stringify(miss));
    const bad = await P('/api/session', { staffId: 'jperez', presenter: true, pin: '1111' }); assert.ok(bad.status === 403 && bad.pin_required === true, 'wrong pin');
    const plain = await P('/api/session', { staffId: 'jperez' }); assert.ok(plain.ok && !plain.actor.presenter, 'a plain sign-in needs no pin and is no presenter');
    assert.eq((await P('/api/do', { action: 'demo.advanceDay', args: { days: 0 } }, plain.token)).status, 403);
    const good = await P('/api/session', { staffId: 'jperez', presenter: true, pin: '4242' }); assert.ok(good.ok && good.actor.presenter === true);
    assert.eq((await P('/api/do', { action: 'demo.advanceDay', args: { days: 0 } }, good.token)).status, 200);
    // the dock
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    await page.goto(APP + '/#/Login'); await page.evaluate(async ({ tok, actor }) => { localStorage.setItem('psyflo_session', JSON.stringify({ token: tok, actor })); localStorage.setItem('psyflo_user', 'jperez'); }, { tok: plain.token, actor: plain.actor });
    await page.goto(APP + '/?present=1#/MyWork'); await page.waitForSelector('#dock [data-dock="unlock"]', { timeout: 10000 });
    await page.click('#dock [data-dock="unlock"]'); await page.waitForSelector('#presenter-pin');
    await page.fill('#presenter-pin', '0000'); await page.click('[data-ui-action="1"]'); await page.waitForFunction(() => /did not match/.test((document.querySelector('[role=dialog]') || {}).innerText || ''), null, { timeout: 8000 });
    await page.fill('#presenter-pin', '4242'); await page.click('[data-ui-action="1"]');
    await page.waitForFunction(() => window.psyflo.session.actor && window.psyflo.session.actor.presenter === true, null, { timeout: 8000 });
    assert.eq(await page.locator('#dock [data-dock="unlock"]').count(), 0, 'the unlock button goes once unlocked'); await ctx.close();
  } finally { await stopInstance(inst); }
});
await browser.close();

await T.done();
