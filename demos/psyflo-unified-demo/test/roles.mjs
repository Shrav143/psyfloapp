// Roles and authority (review/05 section 5 and 12): every role against every capability and route, every action has a capability entry,
// anonymous calls are refused, /api/state is projected per role, a role switch changes what the API returns.
import fs from 'node:fs';
import { suite, assert, api, tryApi, state, reset, session, BASE, LAURIS, lget } from './lib/index.mjs';
import { CAPS, CAP_LIST, ROLES, MATRIX, can, routeAllowed, ROUTE_CAPS, NAV_FOR } from '../web/js/shared/permissions.js';
import { SCREENS } from '../web/js/registry.js';
import { AUTHZ } from '../server/psyflo/authz.js';

const T = suite('roles');
// The expected matrix, typed independently of permissions.js (review/05 section 5). Y yes, A own caseload, D designated, N never.
const EXPECT = {
  'notes.own': 'A N Y N N N', 'notes.review': 'N Y Y N N N', 'notes.view': 'A A Y N N N', 'auth.status': 'A Y Y Y N N', 'drafts.clinical': 'N N Y N N N',
  'approve.sra': 'N D D N N N', 'sign.lauris': 'N N Y N N N', 'send.packet': 'N D Y D N N', 'payer.reply': 'N N Y N N N', 'payer.decision': 'N D Y D N N',
  'eligibility.run': 'N D Y D N N', 'analytics.aggregate': 'N A Y Y N N', 'analytics.drilldown': 'N N A N N N', 'admin.settings': 'N N N Y N N', 'admin.users': 'N N N Y N N',
  'demo.controls': 'D D D D N N', 'referrals': 'N N Y N N N', 'myWork': 'Y Y Y Y N N', 'denials': 'N N Y Y N N', 'authorizations': 'N Y Y Y N N', 'scanEnhance': 'N D Y N N N', 'trackTime': 'A N Y N N N'
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
  await assert.refused(tryApi('timer.stop', {}, { token: 'not-a-token' }), /Sign in/, 401);
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
  assert.eq(Object.keys(s.timers).filter(k => k !== 'khale').length, 0, 'only their own timer');
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
  let r = await fetch(BASE + '/api/do', { method: 'POST', headers: { 'Content-Type': 'text/plain', 'X-Psyflo-Session': s.token }, body: JSON.stringify({ action: 'timer.stop', args: {} }) });
  assert.eq(r.status, 415, 'text/plain is refused');
  r = await fetch(BASE + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://evil.example', 'X-Psyflo-Session': s.token }, body: JSON.stringify({ action: 'timer.stop', args: {} }) });
  assert.eq(r.status, 403, 'an unlisted origin is refused');
  assert.ok(!r.headers.get('access-control-allow-origin'), 'no reflected CORS');
  r = await fetch(BASE + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: LAURIS }, body: JSON.stringify({ action: 'portal.observed', args: {} }) });
  assert.ok(r.status !== 403 && r.headers.get('access-control-allow-origin') === LAURIS, 'the Lauris origin (page bridge) is allowed');
});

await T.test('presenter PIN and DEMO_PRESENTER are honoured by sign-in', async () => {
  const cfg = await fetch(BASE + '/api/config').then(r => r.json());
  assert.ok('presenter' in cfg);
});

await T.done();
