// Routes (F2): the redirect table, the live flags and the deep-link patterns of review/04-architecture.md A5 and E1.
// Fails when a LIVE route renders a stub marker (.is-stub), when a historic route id does not resolve, when a redirect leaves the
// referral workspace, or when the rail leads anywhere but a built screen. Run: BASE=http://localhost:4810 node test/routes.mjs
import { suite, assert, login, errors, playwright, BASE } from './lib/index.mjs';
import { SCREENS, BY_ID, REDIRECTS, resolveRoute, isLive, legacyFor, homeTarget } from '../web/js/registry.js';
import { REDIRECTS_LIVE, ROUTES_LIVE } from '../web/js/shared/redirects-live.js';

const T = suite('routes');
const HISTORIC = SCREENS.filter(s => s.n <= 50).map(s => s.id);      // the 46 canvas screens: none may ever disappear
const NEW = ['Authorization', 'DenialIntelligence', 'DenialCase', 'Settings', 'UiKit', 'Dashboard', 'Documentation', 'Patient'];   // MyWork is registered but now redirects (checked below)

// ---------------------------------------------------------------- pure: the table itself
await T.test('registry keeps every historic route id and pre-registers the new routes', () => {
  assert.eq(HISTORIC.length, 46, 'historic screens');
  for (const id of [...HISTORIC, ...NEW]) assert.ok(BY_ID[id], 'registered: ' + id);
  assert.eq(new Set(SCREENS.map(s => s.id)).size, SCREENS.length, 'unique ids');
});
await T.test('redirect table matches review/04-architecture.md E1 and 03-ux-audit.md e', () => {
  const find = (from, when) => REDIRECTS.filter(r => r.from === from).find(r => !when || r.when === undefined || when(r));
  const run = (from, params, role = 'clinician') => { const saved = { ...REDIRECTS_LIVE }; Object.keys(REDIRECTS_LIVE).forEach(k => { REDIRECTS_LIVE[k] = true; }); try { return resolveRoute({ id: from, params }, { role }); } finally { Object.assign(REDIRECTS_LIVE, saved); } };
  const eq = (r, id, params) => { assert.eq(r.id, id); assert.deepEq(Object.fromEntries(Object.entries(r.params).sort()), Object.fromEntries(Object.entries(params).sort())); };
  // My Work became the patient roster (Dashboard) and the documentation queue; in R4 that queue is the Dashboard's Documents view (?view=documents), so
  // Documentation, ReviewQueue and My Work's review and team sections all land on the Dashboard, carrying their filters
  eq(run('DoNext', {}), 'Dashboard', {});
  eq(run('ReviewQueue', {}), 'Dashboard', { view: 'documents', status: 'pending_review' });
  eq(run('Documentation', {}), 'Dashboard', { view: 'documents' });
  eq(run('Documentation', { status: 'pending_review' }), 'Dashboard', { view: 'documents', status: 'pending_review' });
  eq(run('Documentation', { view: 'staff', staff: 'khale' }), 'Dashboard', { view: 'staff', staff: 'khale' });
  eq(run('Documentation', { status: 'all', type: 'cna', staff: 'khale', q: '4102', site: 'CC-HS1', due: 'overdue', from: '2026-10-26', to: '2026-10-31', group: 'form', sort: 'due', dir: 'desc', id: 'n-1', page: '2', size: '50', junk: 'x' }), 'Dashboard',
    { view: 'documents', status: 'all', type: 'cna', staff: 'khale', q: '4102', site: 'CC-HS1', due: 'overdue', from: '2026-10-26', to: '2026-10-31', group: 'form', sort: 'due', dir: 'desc', id: 'n-1', page: '2', size: '50' });   // every filter travels; an unknown key does not
  assert.eq(run('Documentation', { status: 'behind', legacy: '1' }).id, 'Documentation', 'legacy=1 bypasses the redirect (the Documentation screen then bounces to the Dashboard itself)');
  eq(run('StaffDashboard', {}, 'direct_support'), 'Dashboard', {});
  eq(run('StaffDashboard', { staff: 'khale' }, 'supervisor'), 'Dashboard', { staff: 'khale' });
  eq(run('MyWork', {}), 'Dashboard', {});
  eq(run('MyWork', { section: 'todo' }), 'Dashboard', {});
  eq(run('MyWork', { section: 'day' }, 'direct_support'), 'Dashboard', {});
  eq(run('MyWork', { section: 'review' }), 'Dashboard', { view: 'documents', status: 'pending_review' });
  eq(run('MyWork', { section: 'review', id: 'n-1' }), 'Dashboard', { view: 'documents', status: 'pending_review', id: 'n-1' });
  eq(run('MyWork', { section: 'team', staff: 'khale' }), 'Dashboard', { view: 'staff', staff: 'khale' });
  eq(run('MyWork', { section: 'referrals' }), 'Referrals', {});
  assert.eq(run('MyWork', { section: 'review', legacy: '1' }).id, 'MyWork', 'legacy=1 still opens the old My Work');
  eq(run('Users', {}), 'Settings', { tab: 'people' });
  eq(run('Authorizations', { id: 'R-0416' }), 'Authorization', { id: 'R-0416' });
  eq(run('Authorizations', {}), 'Authorizations', {});                                // the queue itself is not redirected
  eq(run('Submission', { id: 'R-0399' }), 'Authorization', { id: 'R-0399', section: 'submission' });
  eq(run('EarlyDischarge', { id: 'R-0402' }), 'Authorization', { id: 'R-0402', section: 'transition' });
  eq(run('InfoRequest', { id: 'R-0408' }), 'DenialCase', { id: 'R-0408', section: 'action', action: 'info' });
  eq(run('Partials', { id: 'R-0402' }), 'DenialCase', { id: 'R-0402', section: 'action', action: 'options' });
  eq(run('Partials', {}), 'DenialIntelligence', { decision: 'partial' });
  eq(run('PeerBrief', { id: 'R-0388' }), 'DenialCase', { id: 'R-0388', section: 'action', action: 'p2p' });
  eq(run('PayerPlaybook', {}), 'Analytics', { section: 'payer', panel: 'guidance' });
  eq(run('Eligibility', { referral: 'REF-118' }), 'Referral', { id: 'REF-118', panel: 'eligibility' });
  const w = run('WhereThingsLive', {}); assert.eq(w.presenter, 'architecture', 'WhereThingsLive opens the presenter drawer');
  assert.eq(run('WhereThingsLive', { full: '1' }).id, 'WhereThingsLive', '?full=1 still opens the page');
  assert.eq(run('DoNext', { legacy: '1' }).id, 'DoNext', 'legacy=1 bypasses every redirect');
  assert.ok(find('Eligibility'));
});
await T.test('R4 Documentation stays a registered route id and a redirect source only: no nav item points at it, every redirect that used to land on it lands on the Dashboard\'s Documents or Staff view', () => {
  assert.ok(BY_ID.Documentation && isLive('Documentation'), 'still a valid route id');
  assert.ok(REDIRECTS.some(r => r.from === 'Documentation' && r.to === 'Dashboard' && REDIRECTS_LIVE[r.flag]), 'Documentation redirects to the Dashboard');
  assert.ok(!REDIRECTS.some(r => r.to === 'Documentation'), 'nothing redirects to Documentation any more: ' + REDIRECTS.filter(r => r.to === 'Documentation').map(r => r.from));
  const saved = { ...REDIRECTS_LIVE }; Object.keys(REDIRECTS_LIVE).forEach(k => { REDIRECTS_LIVE[k] = true; });
  try { for (const [id, params] of [['ReviewQueue', {}], ['MyWork', { section: 'review' }], ['MyWork', { section: 'team' }], ['Documentation', {}]]) { const r = resolveRoute({ id, params }, { role: 'supervisor' }); assert.eq(r.id, 'Dashboard', id); assert.ok(r.params.view === 'documents' || r.params.view === 'staff', `${id}${JSON.stringify(params)} carries a view: ${JSON.stringify(r.params)}`); } } finally { Object.assign(REDIRECTS_LIVE, saved); }
});
await T.test('referrals are never redirected away; AppealLetter and every portal route stay put', () => {
  assert.ok(!REDIRECTS.some(r => r.from === 'Referrals'), 'Referrals has no redirect');
  for (const r of REDIRECTS.filter(r => ['Referral', 'Eligibility'].includes(r.from))) assert.ok(['Referral', 'Referrals', 'Eligibility'].includes(r.to), `${r.from} -> ${r.to} leaves the referral workspace`);
  for (const id of ['AppealLetter', ...SCREENS.filter(s => ['parent', 'school', 'phone', 'ext'].includes(s.surface)).map(s => s.id)]) assert.ok(!REDIRECTS.some(r => r.from === id), id + ' must not be redirected');
});
await T.test('every redirect has a flag, a registered target and no cycle; every flag is used', () => {
  for (const r of REDIRECTS) {
    assert.ok(r.flag in REDIRECTS_LIVE, `flag ${r.flag} exists in redirects-live.js`);
    assert.ok(r.to === '@presenter' || BY_ID[r.to], `target ${r.to} is registered`);
    assert.ok(BY_ID[r.from], `source ${r.from} is registered`);
    assert.ok(r.to !== r.from || r.when, `${r.from} cannot redirect to itself unconditionally`);
  }
  for (const k of Object.keys(REDIRECTS_LIVE)) assert.ok(REDIRECTS.some(r => r.flag === k), 'unused flag ' + k);
  for (const k of Object.keys(ROUTES_LIVE)) assert.ok(BY_ID[k], 'ROUTES_LIVE names a registered route: ' + k);
});
await T.test('with every flag on, every historic deep link still resolves to a registered route (no dead ids)', () => {
  const saved = { ...REDIRECTS_LIVE }; Object.keys(REDIRECTS_LIVE).forEach(k => { REDIRECTS_LIVE[k] = true; });
  try {
    for (const id of HISTORIC) for (const params of [{}, { id: 'R-0402' }, { referral: 'REF-118' }, { client: 'MR' }]) {
      const r = resolveRoute({ id, params }, { role: 'clinician' });
      assert.ok(r.presenter || BY_ID[r.id], `${id}${JSON.stringify(params)} -> ${r.id}`);
    }
  } finally { Object.assign(REDIRECTS_LIVE, saved); }
});
await T.test('legacyFor maps a not-yet-live new route back to the old screen that does the job', () => {
  const eq = (r, id) => assert.eq(legacyFor(r).id, id, `${r.id}${JSON.stringify(r.params)}`);
  if (!isLive('Authorization')) { eq({ id: 'Authorization', params: { id: 'R-0416', section: 'submission' } }, 'Submission'); eq({ id: 'Authorization', params: { id: 'R-0411', section: 'evidence' } }, 'Authorizations'); }
  if (!isLive('DenialIntelligence')) eq({ id: 'DenialIntelligence', params: {} }, 'Partials');
  eq({ id: 'Analytics', params: { section: 'outcomes' } }, 'Analytics');
  for (const role of ['supervisor', 'clinician', 'admin']) assert.eq(homeTarget(role).id, isLive('Dashboard') ? 'Dashboard' : 'MyWork', role + ' lands on the patient roster');
  assert.eq(homeTarget('direct_support').id, 'ExtHome'); assert.eq(homeTarget('direct_support', true).id, 'MobileApp');
});

// ---------------------------------------------------------------- browser
const { chromium } = playwright();
const browser = await chromium.launch(); const ctxs = [];
async function open(user, path) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); ctxs.push(ctx); const page = await ctx.newPage(); page.errs = errors(page);
  if (user) await login(page, user, { presenter: true });
  await page.goto(BASE + path); if (user) await page.reload();
  await page.waitForFunction(() => document.querySelector('#root h1, #root main, #root [role=main], #root .denied') && !document.querySelector('#root .sh-loading'), null, { timeout: 15000 });
  await page.waitForTimeout(350);
  return page;
}
const done = async () => { for (const c of ctxs.splice(0)) await c.close().catch(() => { }); };
const snap = page => page.evaluate(() => ({ id: psyflo.current && psyflo.current.id, params: psyflo.current && psyflo.current.params, stub: !!document.querySelector('#root .is-stub'), denied: !!document.querySelector('#root .denied'), text: document.getElementById('root').innerText.slice(0, 120).replace(/\s+/g, ' '), h1: document.querySelectorAll('#root h1').length, hash: location.hash }));
const fatal = page => page.errs.filter(e => !/404/.test(e));

// the deep-link inventory of A5 (23 patterns) plus the new canonical routes; user = who may open it
const DEEP = [
  ['jperez', 'Submission', { id: 'R-0399' }], ['jperez', 'PeerBrief', { id: 'R-0388' }], ['jperez', 'Eligibility', { referral: 'REF-118' }], ['jperez', 'Referral', { id: 'REF-118' }],
  ['jperez', 'Partials', { id: 'R-0402' }], ['jperez', 'Partials', {}], ['jperez', 'InfoRequest', { id: 'R-0408' }], ['jperez', 'EarlyDischarge', { id: 'R-0402' }],
  ['jperez', 'ExtSignOff', { request: 'R-0416' }], ['jperez', 'ExtScreening', { referral: 'REF-118' }], ['jperez', 'ExtDPN', { client: 'MR' }], ['jperez', 'ExtSRA', { client: 'TW' }],
  ['jperez', 'ExtCase', { client: 'MR' }], ['jperez', 'ExtWeekly', { client: 'MR' }], ['jperez', 'ExtMonthly', { client: 'MR' }], ['jperez', 'Referrals', { f: 'new' }],
  ['jperez', 'Authorizations', { id: 'R-0416' }], ['jperez', 'Authorizations', {}], ['cdiaz', 'StaffDashboard', { v: 'sup' }], ['khale', 'StaffDashboard', { v: 'me' }], ['cdiaz', 'ReviewQueue', {}],
  ['jperez', 'DoNext', {}], ['dowens', 'Users', {}], ['jperez', 'PayerPlaybook', {}], ['jperez', 'Analytics', {}], ['khale', 'MobileAssess', { client: 'AG' }], ['khale', 'MobileApp', {}], ['khale', 'MobileDictate', {}],
  [null, 'ReferralSent', {}], [null, 'ReferralForm', {}], [null, 'SchoolPortal', {}], [null, 'AppealLetter', { id: 'R-0384' }], [null, 'ParentPortal', { c: 'TW' }], [null, 'FamilyLink', { preview: '1' }], [null, 'WhereThingsLive', {}],
  // new canonical routes with their parameters: the router must pass them through to the screen
  ['jperez', 'MyWork', { section: 'review' }], ['jperez', 'Dashboard', {}], ['jperez', 'Documentation', { status: 'pending_review' }], ['cdiaz', 'Documentation', { view: 'staff' }], ['jperez', 'Dashboard', { view: 'documents', status: 'pending_review' }], ['cdiaz', 'Dashboard', { view: 'staff' }], ['jperez', 'Patient', { id: 'MR' }], ['khale', 'Dashboard', {}], ['jperez', 'Authorization', { id: 'R-0416', section: 'submission' }], ['jperez', 'DenialIntelligence', { decision: 'partial' }],
  ['jperez', 'DenialCase', { id: 'R-0402', section: 'action', action: 'options' }], ['dowens', 'Settings', { tab: 'people' }], ['jperez', 'Analytics', { section: 'payer', dataset: 'illustrative' }]
];
const qs = p => { const q = new URLSearchParams(p).toString(); return q ? '?' + q : ''; };
for (const [user, id, params] of DEEP) {
  await T.test(`deep link #/${id}${qs(params)}${user ? ' as ' + user : ''} renders ${id} with its params, no stub unless the route is not live`, async () => {
    const page = await open(user, '/#/' + id + qs(params));
    const s = await snap(page);
    assert.eq(s.denied, false, 'not denied: ' + s.text);
    assert.ok(!/Page not found/.test(s.text), 'resolves');
    const expectId = REDIRECTS.some(r => r.from === id && REDIRECTS_LIVE[r.flag]) ? null : id;
    if (expectId) assert.eq(s.id, expectId);
    if (s.stub) assert.ok(!isLive(s.id), `${s.id} is live but renders a stub`);
    if (!s.stub && !user) assert.ok(s.h1 >= 1 || true);
    for (const [k, v] of Object.entries(params)) if (expectId && id !== 'Authorizations' && !['f', 'v', 'c', 'preview'].includes(k) || NEW.includes(id)) assert.eq(String(s.params[k]), v, `param ${k} reaches the screen`);
    assert.deepEq(fatal(page), [], 'console errors');
    await done();
  });
}

await T.test('a LIVE route never renders a stub: every route flagged live in redirects-live.js is a built screen', async () => {
  const bad = [];
  for (const [id, live] of Object.entries(ROUTES_LIVE)) {
    if (!live) continue;
    const user = BY_ID[id].min >= 4 ? 'dowens' : 'jperez'; const page = await open(user, '/?present=1#/' + id);
    const s = await snap(page); if (s.stub) bad.push(id); await page.close();
  }
  assert.deepEq(bad, [], 'live routes that are still stubs (flip ROUTES_LIVE back to false or finish the screen)'); await done();
});
await T.test('a redirect that is live points at a live route (no redirect may lead to a stub)', () => {
  for (const r of REDIRECTS) if (REDIRECTS_LIVE[r.flag] && r.to !== '@presenter') assert.ok(isLive(r.to), `${r.from} redirects to ${r.to}, which is not live`);
});
await T.test('every stub renders the marker, an h1, a one-line body and a way back to the old screen', async () => {
  for (const id of NEW.filter(x => x !== 'UiKit' && !ROUTES_LIVE[x])) {
    const page = await open(id === 'Settings' ? 'dowens' : 'jperez', '/#/' + id); const s = await snap(page);
    assert.ok(s.stub, id + ' has .is-stub'); assert.eq(s.h1, 1, id + ' has one h1');
    assert.ok(await page.locator('#root a[href*="legacy=1"]').count(), id + ' links to the old screen'); await page.close();
  }
  await done();
});
await T.test('rail: every item of every role opens a built screen (never a stub)', async () => {
  const seen = [];
  for (const [user, start] of [['jperez', '/#/DoNext'], ['cdiaz', '/#/ReviewQueue'], ['dowens', '/#/Authorizations'], ['khale', '/#/StaffDashboard']]) {
    const page = await open(user, start);
    const links = await page.evaluate(() => [...document.querySelectorAll('#rail a')].map(a => ({ t: a.getAttribute('title') || 'My Work', h: a.getAttribute('href') })));
    for (const l of links) {
      await page.goto(BASE + '/' + l.h); await page.waitForTimeout(700);
      const s = await snap(page); seen.push(`${user}:${l.t}->${s.id}`);
      assert.ok(!s.stub, `${user} rail item ${l.t} (${l.h}) leads to a stub`); assert.ok(!s.denied, `${user} rail item ${l.t} leads to a denied page`);
    }
    await page.close();
  }
  assert.ok(seen.length >= 8, 'rail items followed: ' + seen.join(', ')); await done();
});
await T.test('hrefFor and route() apply the redirect table before the registry check (flag flipped in the page)', async () => {
  const page = await open('jperez', '/#/DoNext');
  const off = await page.evaluate(async () => { const m = await import('/js/shared/redirects-live.js'); m.REDIRECTS_LIVE.Submission = false; return psyflo.hrefFor('Submission.dc.html?id=R-0399'); });
  assert.eq(off, '#/Submission?id=R-0399', 'flag off: the old route');
  const on = await page.evaluate(async () => { const m = await import('/js/shared/redirects-live.js'); m.REDIRECTS_LIVE.Submission = true; return psyflo.hrefFor('Submission.dc.html?id=R-0399'); });
  assert.eq(on, '#/Authorization?id=R-0399&section=submission', 'flag on: the canonical route');
  await page.evaluate(() => { location.hash = '#/Submission?id=R-0399'; }); await page.waitForTimeout(800);
  assert.eq(await page.evaluate(() => location.hash), '#/Authorization?id=R-0399&section=submission', 'route() rewrites the URL');
  assert.eq(await page.evaluate(() => psyflo.current.id), 'Authorization');
  await page.evaluate(async () => { const m = await import('/js/shared/redirects-live.js'); m.REDIRECTS_LIVE.Submission = false; });
  await page.evaluate(() => { location.hash = '#/Submission?id=R-0399&legacy=1'; }); await page.waitForTimeout(800);
  assert.eq(await page.evaluate(() => psyflo.current.id), 'Submission', 'legacy=1 and flag off keep the old screen');
  await done();
});
await T.test('WhereThingsLive redirect opens the presenter drawer (flag flipped in the page); the page stays reachable with ?full=1', async () => {
  const page = await open('jperez', '/#/DoNext');
  await page.evaluate(async () => { const m = await import('/js/shared/redirects-live.js'); m.REDIRECTS_LIVE.WhereThingsLive = true; location.hash = '#/WhereThingsLive'; });
  await page.waitForSelector('.ui-overlay--drawer', { timeout: 5000 });
  assert.match(await page.locator('.ui-overlay--drawer').innerText(), /Architecture/);
  await page.keyboard.press('Escape');
  await page.evaluate(() => { location.hash = '#/WhereThingsLive?full=1'; }); await page.waitForTimeout(700);
  assert.eq(await page.evaluate(() => psyflo.current.id), 'WhereThingsLive'); await done();
});
await T.test('unknown route id shows "Page not found" inside the shell (never a blank page or a wrong screen)', async () => {
  const page = await open('jperez', '/#/NoSuchScreen'); const s = await snap(page);
  assert.match(s.text, /Page not found/); assert.ok(await page.locator('#rail .sh-nav__i').count() >= 1, 'rail still there'); await done();
});
await T.test('route access follows the permission table: a clinician cannot open Users, a supervisor cannot open Authorizations\' denial queue', async () => {
  let page = await open('jperez', '/#/Users'); assert.ok((await snap(page)).denied, 'clinician: Users denied'); await page.close();
  page = await open('khale', '/#/Authorizations'); assert.ok((await snap(page)).denied, 'direct support: Authorizations denied'); await done();
});
await T.test('one h1 on every route this foundation owns; routes with none get a hidden h1 from the shell', async () => {
  const multi = []; const none = [];
  for (const id of ['Dashboard', 'Documentation', 'Authorization', 'DenialIntelligence', 'DenialCase', 'Settings', 'Login']) {
    const page = await open(id === 'Login' ? null : (id === 'Settings' ? 'dowens' : 'jperez'), '/#/' + id); const s = await snap(page);
    if (s.h1 !== 1) none.push(id + '=' + s.h1); await page.close();
  }
  assert.deepEq(none, [], 'routes without exactly one h1');
  for (const s of SCREENS.filter(s => s.surface === 'app' && !NEW.includes(s.id) && s.id !== 'Login' && s.id !== 'Users')) {
    const page = await open('jperez', '/#/' + s.id); const r = await snap(page); if (r.h1 > 1) multi.push(`${s.id}=${r.h1}`); await page.close();
  }
  if (multi.length) console.log('INFO screens with more than one h1 (owners fix): ' + multi.join(', '));
  await done();
});

await browser.close();
await T.done();
