// P19.3 interaction audit (review/06-demo-and-qa.md d2, QA1). Every visible control of every route each role can reach is STAMPED with
// data-qa (never clicked by position), clicked from a fresh page state, and classified: NAVIGATED, POPUP, DOWNLOAD, STATE, DETAIL, CLOSE, DOM,
// TOAST-ONLY, DISABLED-EXPLAINED, or a finding (NO-EFFECT, DISABLED-UNEXPLAINED, UNCLICKABLE, unnamed, console error, route dead end).
// Overlays a control opens are swept one level down. Fixtures (demo.scenario) reset the server between groups and after any click that changed it.
// Roles: direct_support, supervisor, clinician, admin at 1440x900; the direct-support phone at 390x844; guardian and school portal sessions at
// 390x844; the Psyflo panel in its in-page mode (400 px slot beside the mock Lauris). Process Form, Get Signature and Send stay person-only: the
// panel sweep never clicks them and fails if the panel offers them.
//
//   BASE=http://localhost:4920 node test/audit.mjs
//   AUDIT_ROLES=clinician,panel   AUDIT_ONLY=<regex on the target id>   AUDIT_FAST=1 (no overlay sweep)   AUDIT_OUT=<dir for the json/md>
import fs from 'node:fs';
import path from 'node:path';
import { suite, assert, playwright, login, BASE, LAURIS, api, SHOTS } from './lib/index.mjs';
import { Sweeper, installProbes, summarize, isFinding, appRoutes } from './lib/audit.mjs';

const T = suite('audit');
const OUT = process.env.AUDIT_OUT || path.resolve(path.dirname(new URL(import.meta.url).pathname), '../review/qa');
fs.mkdirSync(OUT, { recursive: true });
const wantRole = (process.env.AUDIT_ROLES || '').split(',').map(s => s.trim()).filter(Boolean);
const only = process.env.AUDIT_ONLY ? new RegExp(process.env.AUDIT_ONLY) : null;
const ok = role => !wantRole.length || wantRole.includes(role);
const STAFF = { direct_support: 'khale', supervisor: 'cdiaz', clinician: 'jperez', admin: 'dowens' };
const { chromium } = playwright();
const browser = await chromium.launch();
const resetServer = async id => { try { await api('demo.scenario', { id }, 'dowens+p'); } catch (e) { console.log('  (fixture ' + id + ' failed: ' + e.message + ')'); } };
const READY = () => document.querySelector('#root main, #root h1, #root [role=main]') && !document.querySelector('#root .sh-loading');
const PERSON_ONLY = /^(process form|get signature|send|send packet|send to (the )?payer|send request|send now|press send)$/i;       // person actions in Lauris: the panel must not offer or trigger them
const results = [];
function writeReports(results, tag) {
  const sum = summarize(results);
  const rows = Object.entries(sum.by);
  const total = rows.reduce((n, [, v]) => n + v.rows, 0);
  const outcomes = {}; for (const [, v] of rows) for (const [k, n] of Object.entries(v.counts)) outcomes[k] = (outcomes[k] || 0) + n;
  const line = Object.entries(outcomes).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' ' + n).join(' · ');
  const label = (role, kind) => kind === 'panel' ? 'panel · 400 px (all roles)' : kind === 'phone' ? role.replace(/@.*/, '') + ' · 390 px' : role.replace(/@.*/, '') + ' · 1440 px';
  const byRole = {}; for (const [, v] of rows) { const o = byRole[label(v.role, v.kind)] = byRole[label(v.role, v.kind)] || { targets: 0, controls: 0, findings: 0 }; o.targets++; o.controls += v.rows; }
  for (const f of sum.findings) { const k = label(f.role, f.kind); if (byRole[k]) byRole[k].findings++; }
  const md = ['# Interaction audit (QA1)', '', `Controls swept: ${total} on ${rows.length} targets. ${line}`, '', '## Per role', '', '| Role | Targets | Controls | Findings |', '|---|---|---|---|', ...Object.entries(byRole).map(([r, o]) => `| ${r} | ${o.targets} | ${o.controls} | ${o.findings} |`), '',
    '## Per route', '', '| Target | Role | Controls | ' + Object.keys(outcomes).sort().join(' | ') + ' |', '|---|---|---|' + Object.keys(outcomes).map(() => '---').join('|') + '|'];
  for (const [k, v] of rows) md.push(`| ${k} | ${v.role} | ${v.rows}${v.skipped ? ' (' + v.skipped + ')' : ''} | ` + Object.keys(outcomes).sort().map(o => v.counts[o] || '').join(' | ') + ' |');
  md.push('', '## Findings (dead or unexplained controls, unnamed controls, console errors, dead ends)', '');
  if (!sum.findings.length) md.push('None.');
  for (const f of sum.findings) md.push(`- **${f.target}** · ${f.ctl} "${f.name || f.key}" (${f.where || ''}${f.depth === 2 ? ', in the overlay opened by "' + (f.via || '').split('|')[2] + '"' : ''}) → ${f.outcome}${f.detail ? ' · ' + f.detail : ''}${f.flags.length ? ' · ' + f.flags.join(', ') : ''}${f.errors ? ' · ' + f.errors[0].slice(0, 100) : ''}`);
  const weak = results.flatMap(r => r.rows).filter(r => ['FOCUS-ONLY', 'SCROLL', 'NO-EFFECT-ALLOWED'].includes(r.outcome) && r.outcome !== 'NO-EFFECT-ALLOWED'); if (weak.length) { md.push('', '## Weak effects (focus or scroll only; accepted, listed for a manual look)', ''); for (const r of weak) md.push(`- ${r.target} · ${r.ctl} "${r.name || r.key}" → ${r.outcome} · ${r.detail}`); }
  const allowed = results.flatMap(r => r.rows).filter(r => r.outcome === 'NO-EFFECT-ALLOWED'); if (allowed.length) { md.push('', '## No change by design (allowlist: active tab or toggle, text field, link to the current page, radio already selected)', ''); for (const r of allowed) md.push(`- ${r.target} · ${r.ctl} "${r.name || r.key}" · ${r.detail}`); }
  const sk = results.flatMap(r => r.rows).filter(r => r.outcome === 'SKIPPED'); if (sk.length) { md.push('', '## Skipped on purpose', ''); for (const r of sk) md.push(`- ${r.target} · "${r.name}" · ${r.detail}`); }
  const t = tag ? '-' + tag : '';
  fs.writeFileSync(path.join(OUT, `qa1-audit${t}.md`), md.join('\n') + '\n');
  fs.writeFileSync(path.join(OUT, `qa1-audit${t}.json`), JSON.stringify({ at: new Date().toISOString(), total, outcomes, targets: sum.by, findings: sum.findings, results: results.map(r => ({ meta: { ...r.meta, keys: undefined }, rows: r.rows })) }, null, 1));
  return { total, rows, outcomes, line };
}
// AUDIT_MERGE=1: combine the per-shard files (AUDIT_TAG runs) into qa1-audit.md and qa1-audit.json
if (process.env.AUDIT_MERGE) {
  const all = fs.readdirSync(OUT).filter(f => /^qa1-audit-.+\.json$/.test(f)).flatMap(f => JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')).results);
  const r = writeReports(all, ''); console.log(`merged ${r.rows.length} targets, ${r.total} controls: ${r.line}`); process.exit(0);
}

// ------------------------------------------------------------------------------------------------ route inventory
// (shared with a11y.mjs and visual.mjs: appRoutes(role) in test/lib/audit.mjs)
const qs = p => Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
const routeUrl = (id, p) => `/#/${id}${Object.keys(p).length ? '?' + qs(p) : ''}`;
const appTargets = role => appRoutes(role);

// ------------------------------------------------------------------------------------------------ runner
async function runGroup(label, fixture, makeTargets, { viewport = { width: 1440, height: 900 }, who, portal, mobile = false } = {}) {
  const list = makeTargets();
  const sel = list.filter(t => (!only || only.test(t.id)));
  if (!sel.length) return;
  await resetServer(fixture);
  const ctx = await browser.newContext({ viewport, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  await installProbes(ctx);
  await ctx.addInitScript(() => { try { localStorage.removeItem('psyflo_parent_lang'); } catch { } });          // every fresh load starts in English: the language toggle must not leak into the next control
  const page = await ctx.newPage();
  try {
    if (who) await login(page, who, { presenter: false });
    if (portal) await portalSignIn(page, portal);
    // a click can replace the session (a family link opened in this window signs the guardian in over the staff session): every fresh load restores the one the group started with
    if (who || portal) {
      const keep = await page.evaluate(() => ({ psyflo_session: localStorage.getItem('psyflo_session'), psyflo_user: localStorage.getItem('psyflo_user'), psyflo_school_user: localStorage.getItem('psyflo_school_user') }));
      await ctx.addInitScript(a => { try { if (location.origin !== a.origin) return; for (const [k, v] of Object.entries(a.keep)) { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } } catch { } }, { origin: new URL(BASE).origin, keep });
    }
    const sw = new Sweeper({ page, base: BASE, lauris: LAURIS, resetServer, deep: process.env.AUDIT_FAST !== '1' });
    let first = true;
    for (const tg of sel) {
      const target = tg.build(page, { first });
      target.fixture = fixture;
      first = false;
      await T.test(`P19.3 audit · ${target.id}`, async () => {
        const run = async tgt => { try { const r = await sw.sweep(tgt); results.push(r); return r; } catch (e) { const at = String(e.stack || '').split('\n').find(l => /lib\/audit\.mjs/.test(l)) || ''; throw new Error(String(e.message).split('\n')[0] + ' [' + at.trim().replace(/^at /, '').slice(-70) + ']'); } };
        const r = await run(target);
        let more = null;
        if (r.meta.closedDetails > 0 && tg.expand !== false && !r.meta.skipped) {                         // the controls inside collapsed sections
          more = await run({ ...target, id: target.id + ' [sections open]', expand: true, includeRail: false, skipKeys: new Set(r.meta.keys) });
        }
        const rows = [...r.rows, ...(more ? more.rows : [])];
        const bad = rows.filter(isFinding);
        const n = rows.length;
        const line = `${n} controls${more ? ' (+' + more.rows.length + ' in sections)' : ''}, ${bad.length} findings`;
        if (r.meta.skipped) throw new Error(`route not reachable here: ${r.meta.skipped}`);
        if (r.meta.errorsOnLoad.length) throw new Error('errors on load: ' + r.meta.errorsOnLoad.slice(0, 2).join(' | '));
        console.log('  ' + line);
        if (bad.length) throw new Error(`${line}: ` + bad.slice(0, 6).map(x => `${x.outcome !== 'NAVIGATED' && x.outcome !== 'DOM' ? x.outcome : x.flags.join('+')} "${x.name || x.key}"${x.detail ? ' (' + x.detail.slice(0, 50) + ')' : ''}`).join('; ') + (bad.length > 6 ? `; +${bad.length - 6} more` : ''));
      });
    }
  } finally { await ctx.close().catch(() => { }); }
}

async function portalSignIn(page, who) {
  await page.goto(BASE + '/#/Login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async w => {
    const r = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(w) });
    const j = await r.json(); if (!j.ok) throw new Error(j.error);
    localStorage.setItem('psyflo_session', JSON.stringify({ token: j.token, actor: j.actor }));
    if (w.schoolUser) localStorage.setItem('psyflo_school_user', w.schoolUser);
  }, who);
  await page.reload({ waitUntil: 'domcontentloaded' });
}
const appTarget = (role, kind, route, params, o = {}) => ({
  id: `${role} · ${route}${Object.keys(params).length ? '?' + qs(params) : ''}${kind === 'phone' ? ' (390)' : ''}`,
  build: (page, { first }) => ({ id: `${role} · ${route}${Object.keys(params).length ? '?' + qs(params) : ''}${kind === 'phone' ? ' (390)' : ''}`, role, kind, scopes: first || o.rail ? ['#rail', '#root'] : ['#root'], includeRail: !!first,
    async open() { await page.goto('about:blank'); await page.goto(BASE + routeUrl(route, params), { waitUntil: 'domcontentloaded' }); await page.waitForFunction(READY, null, { timeout: 15000 }); },
    frame: () => page.mainFrame(),
    // a signature pad has something to clear only after a stroke
    afterOpen: async () => { if (!/^(ParentSign|AppealLetter)$/.test(route)) return; const cv = page.locator('#root canvas').first(); if (!(await cv.count())) return; await cv.scrollIntoViewIfNeeded().catch(() => { }); const b = await cv.boundingBox(); if (!b) return; await page.mouse.move(b.x + 20, b.y + 20); await page.mouse.down(); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 }); await page.mouse.move(b.x + b.width - 20, b.y + 25, { steps: 4 }); await page.mouse.up(); }, ...(o.target || {}) })
});

// ------------------------------------------------------------------------------------------------ groups
// 1. staff platform, base-live
for (const role of Object.keys(STAFF)) {
  if (!ok(role)) continue;
  await runGroup(`${role} platform`, 'base-live', () => appTargets(role).map(t => appTarget(role, 'app', t.id, t.params)), { who: STAFF[role] });
}
// 2. later checkpoints of the T.W. thread: R-0416 as a draft, signed, sent (the Send and approval buttons exist only there)
if (ok('clinician')) {
  for (const [fx, id] of [['tw-isp-ready', 'draft'], ['tw-signed', 'signed'], ['tw-sent', 'sent']]) {
    await runGroup(`clinician ${fx}`, fx, () => [
      appTarget(`clinician@${fx}`, 'app', 'Authorization', { id: 'R-0416', section: 'submission' }), appTarget(`clinician@${fx}`, 'app', 'Authorizations', {}), appTarget(`clinician@${fx}`, 'app', 'Referral', { id: 'REF-118' })
    ].map(x => x), { who: STAFF.clinician });
  }
}
if (ok('supervisor')) await runGroup('supervisor tw-signed', 'tw-signed', () => [appTarget('supervisor@tw-signed', 'app', 'Authorization', { id: 'R-0416', section: 'submission' })], { who: STAFF.supervisor });
// 3. data-rich fixtures
if (ok('clinician')) await runGroup('clinician analytics-case', 'analytics-case', () => [{ section: 'outcomes', dataset: 'case' }, { section: 'payer', dataset: 'case' }, { section: 'population', dataset: 'case' }].map(p => appTarget('clinician@analytics-case', 'app', 'Analytics', p)), { who: STAFF.clinician });
if (ok('admin')) await runGroup('admin analytics-case', 'analytics-case', () => [{ section: 'outcomes', dataset: 'case' }].map(p => appTarget('admin@analytics-case', 'app', 'Analytics', p)), { who: STAFF.admin });
if (ok('direct_support')) await runGroup('direct_support mr-daily', 'mr-daily', () => [appTarget('direct_support@mr-daily', 'app', 'MyWork', { section: 'day' })], { who: STAFF.direct_support });
// canvas preset (the second preset): the queue, My Work and the denial queue render and work
if (ok('clinician')) await runGroup('clinician base-canvas', 'base-canvas', () => [['MyWork', { section: 'todo' }], ['Authorizations', {}], ['DenialIntelligence', {}], ['Referrals', {}]].map(([r, p]) => appTarget('clinician@canvas', 'app', r, p)), { who: STAFF.clinician });

// 4. the phone (direct support, 390x844)
if (ok('phone') || ok('direct_support')) {
  await runGroup('phone', 'mr-daily', () => ['MobileApp', 'MobileDictate', 'MobileAssess'].map(r => appTarget('direct_support', 'phone', r, {}, { rail: false })), { who: STAFF.direct_support, viewport: { width: 390, height: 844 }, mobile: true });
}
// 5. portals (390x844): guardian as T.W.'s grandmother, guardian by real link token, school counselor
if (ok('guardian')) {
  await runGroup('guardian', 'base-live', () => [['ParentPortal', {}], ['ParentEnroll', {}], ['ParentSign', {}], ['ParentProgress', {}], ['ParentQuarterly', {}], ['ParentLetters', {}], ['ParentSchedule', {}], ['ParentSurvey', {}], ['FamilyLink', {}], ['AppealLetter', { c: 'EC' }]].map(([r, p]) => appTarget('guardian', 'phone', r, p, { rail: false })),
    { portal: { portalClient: 'TW', presenter: true }, viewport: { width: 390, height: 844 }, mobile: true });
  await runGroup('guardian link', 'base-live', () => [{ path: '/parent/ar-demo/ParentPortal', n: 'ParentPortal' }, { path: '/f/ar-demo', n: 'FamilyLink' }].map(x => ({ id: `guardian (link ar-demo) · ${x.n} (390)`, build: page => ({ id: `guardian (link ar-demo) · ${x.n} (390)`, role: 'guardian', kind: 'phone', scopes: ['#root'], includeRail: false,
    async open() { await page.goto('about:blank'); await page.goto(BASE + x.path, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(READY, null, { timeout: 15000 }); }, frame: () => page.mainFrame() }) })),
    { viewport: { width: 390, height: 844 }, mobile: true });
}
if (ok('school')) {
  await runGroup('school', 'base-live', () => [['SchoolPortal', {}], ['ReferralForm', {}], ['ReferralSent', {}]].map(([r, p]) => appTarget('school', 'phone', r, p, { rail: false })), { portal: { schoolUser: 'rbell', presenter: true }, viewport: { width: 390, height: 844 }, mobile: true });
}
// 6. signed out: the sign-in screen and the public reference page
if (ok('signed-out')) {
  await runGroup('signed out', 'base-live', () => [['Login', {}], ['WhereThingsLive', { full: '1' }]].map(([r, p]) => ({ id: `signed out · ${r}`, build: page => ({ id: `signed out · ${r}`, role: 'signed-out', kind: 'app', scopes: ['#root'], includeRail: false,
    async open() { await page.goto('about:blank'); await page.goto(BASE + routeUrl(r, p), { waitUntil: 'domcontentloaded' }); await page.waitForFunction(READY, null, { timeout: 15000 }); }, frame: () => page.mainFrame() }) })));
}

// 7. the panel beside the mock Lauris (in-page mode, 400 px slot). Pages follow test/panels.mjs; T.W.'s forms need the tw-isp-ready checkpoint.
const PANEL_PAGES = {
  base: [['jperez', '/consumers', 'home'], ['khale', '/consumers', 'home (direct support)'], ['cdiaz', '/consumers', 'home (supervisor)'], ['dowens', '/consumers', 'home (admin)'],
    ['jperez', '/consumers/3310', 'record'], ['khale', '/consumers/3310/session/dpn', 'daily note'], ['jperez', '/consumers/3310/session/dpn', 'daily note (clinician)'], ['jperez', '/consumers/3310/session/weekly', 'weekly'], ['jperez', '/consumers/3310/session/collateral', 'monthly'],
    ['jperez', '/consumers/4102/session/incident', 'incident'], ['jperez', '/consumers/3310/session/quarterly', 'quarterly'], ['jperez', '/consumers/3310/session/sra-continued', 'continued stay'], ['jperez', '/consumers/4102/session/discharge', 'discharge'],
    ['jperez', '/approvals', 'forms to approve'], ['khale', '/time', 'time tracker'], ['jperez', '/authorizations', 'authorizations'], ['khale', '/consumers/3310/session/screening', 'screening (direct support: not offered)']],
  tw: [['jperez', '/consumers/4492/session/screening', 'T.W. screening'], ['jperez', '/consumers/4492/session/cna', 'T.W. CNA'], ['jperez', '/consumers/4492/session/isp', 'T.W. ISP'], ['jperez', '/consumers/4492/session/sra-initial', 'T.W. initial SRA']],
  signed: [['jperez', '/approvals', 'forms to approve (signed)']]
};
function panelTargets(list) {
  return list.map(([as, p, name]) => ({ id: `panel ${as} · ${name} (400)`, build: page => ({ id: `panel ${as} · ${name} (400)`, role: as, kind: 'panel', scopes: ['#panel'], includeRail: false, expand: false,
    async open() {
      for (let i = 0; i < 4; i++) { try { await page.goto('about:blank'); break; } catch { await page.waitForTimeout(500); } }          // the previous click may still be moving the Lauris page
      await page.goto(`${LAURIS}/login?as=${as}&next=${encodeURIComponent(p)}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => { const f = document.getElementById('psyflo-frame'); return !!f; }, null, { timeout: 15000 }).catch(() => { });
      const t0 = Date.now(); while (Date.now() - t0 < 12000) { const f = page.frames().find(f => f.url().includes('/panel/')); if (f) { const ready = await f.evaluate(() => !!document.querySelector('#panel .body, #panel .ph .pt') && !/Loading/.test((document.querySelector('#panel .pt b') || {}).textContent || '')).catch(() => false); if (ready) return; } await new Promise(r => setTimeout(r, 120)); }
    },
    frame: () => page.frames().find(f => f.url().includes('/panel/')),
    deny: c => PERSON_ONLY.test(c.name) ? 'person-only action: Process Form, Get Signature and Send are pressed by a person in Lauris' : /^send\b/i.test(c.name) ? 'outward send (a person presses it); not clicked by the audit' : null,
    parentForm: () => page.evaluate(() => [...document.querySelectorAll('form input, form textarea, form select')].map(e => e.type === 'checkbox' ? e.checked : e.value).join('|')).catch(() => '') }) }));
}
if (ok('panel')) {
  await runGroup('panel base', 'base-live', () => panelTargets(PANEL_PAGES.base), { viewport: { width: 1440, height: 900 } });
  await runGroup('panel tw', 'tw-isp-ready', () => panelTargets(PANEL_PAGES.tw), { viewport: { width: 1440, height: 900 } });
  await runGroup('panel signed', 'tw-signed', () => panelTargets(PANEL_PAGES.signed), { viewport: { width: 1440, height: 900 } });
  // the panel must not offer Process Form, Get Signature or Send at all
  await T.test('P19.3 audit · panel offers no Process Form, Get Signature or Send (person-only actions)', async () => {
    const offered = results.filter(r => r.meta.kind === 'panel').flatMap(r => r.rows).filter(x => x.outcome === 'SKIPPED' && /person-only/.test(x.detail));
    assert.deepEq(offered.map(x => x.target + ' · ' + x.name), [], 'the panel shows person-only controls');
  });
}

// ------------------------------------------------------------------------------------------------ totals and files
await T.test('P19.3 audit · the sweep covered what it claims (counts per role, no unreachable targets)', async () => {
  const r = writeReports(results, process.env.AUDIT_TAG || '');
  console.log('  controls swept: ' + r.total + ' on ' + r.rows.length + ' targets · ' + r.line);
  assert.ok(r.total > 0, 'nothing was swept');
});
await browser.close();
await T.done();
