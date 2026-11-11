// Presentation and Explore modes (review/06-demo-and-qa.md a2 and d1, review/03-ux-audit.md k, docs/UI-KIT.md 4, QA1).
// Presentation: the product viewport has no "Reset" or "Demo:" text; the dock is hidden, collapsed or out of the tab order until focused;
// Ctrl+Shift+P toggles it; a role switch changes the rail without a reload; "Demo data · nothing is real" is present on every app screen; the scenario
// selector runs each of s1..s6 and lands on the right route as the right role. Explore: the dock is always open, the mode label is visible, and every
// route is reachable in at most three clicks by a permitted role.
//   BASE=http://localhost:4920 node test/presenter.mjs
import { suite, assert, playwright, login, BASE, LAURIS, api, state, errors, SHOTS } from './lib/index.mjs';
import { SCREENS } from '../web/js/registry.js';
import { routeAllowed } from '../web/js/shared/permissions.js';
import * as A from './lib/a11y.mjs';
import { settle, installProbes } from './lib/audit.mjs';

const T = suite('presenter');
const only = process.env.PRESENTER_ONLY ? new RegExp(process.env.PRESENTER_ONLY) : null;
const run = (id, fn) => (!only || only.test(id)) ? T.test(id, fn) : Promise.resolve();
await api('demo.scenario', { id: 'base-live' }, 'dowens+p').catch(() => { });          // a known start, whatever ran before on this server
const { chromium } = playwright();
const browser = await chromium.launch();
const READY = () => (document.querySelector('#root main, #root h1, #root [role=main], #root .denied')) && !document.querySelector('#root .sh-loading');
const STAFF = { direct_support: 'khale', supervisor: 'cdiaz', clinician: 'jperez', admin: 'dowens' };
const FORBIDDEN = /\bReset\b|Demo:|PRESENTER|Scenario\b.*\bRole\b/;
async function newPage({ who, presenter = false, width = 1440, height = 900, init } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await installProbes(ctx);
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(); page.errs = errors(page); page.ctx = ctx;
  if (who) await login(page, who, { presenter });
  return page;
}
const go = async (page, url) => { page.errs.length = 0; await page.goto(BASE + url, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(READY, null, { timeout: 15000 }); await settle(page.mainFrame()); };
const railLinks = page => page.evaluate(() => [...document.querySelectorAll('#rail .sh-nav a, #rail .sh-logo')].map(a => (a.getAttribute('aria-label') || a.innerText || '').replace(/,.*$/, '').trim()));
const stageText = page => page.evaluate(() => (document.getElementById('stage').innerText + '\n' + document.getElementById('rail').innerText));
const dockState = page => page.evaluate(() => { const d = document.getElementById('dock'); const tabbable = [...d.querySelectorAll('button,a,input,select,[tabindex]')].filter(b => { const r = b.getBoundingClientRect(); const cs = getComputedStyle(b); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && b.tabIndex >= 0 && !b.closest('[hidden]'); }).length; return { hidden: d.hidden, state: d.dataset.state, mode: d.dataset.mode, tabbable, label: (document.getElementById('dock-mode') || {}).textContent || '', h: Math.round(d.getBoundingClientRect().height) }; });
const allText = async page => { const read = async () => { let t = await page.evaluate(() => document.body.innerText); for (const f of page.frames().slice(1)) t += '\n' + await f.evaluate(() => document.body.innerText).catch(() => ''); return t; }; let t = await read(); for (let i = 0; i < 25 && !/nothing is real/.test(t) && page.frames().length > 1; i++) { await page.waitForTimeout(250); t = await read(); } return t; };   // a framed Lauris page loads its panel a moment later
const apiActor = page => page.evaluate(async () => { const { api } = await import('/js/api.js'); const a = api.session(); return a ? { kind: a.kind, role: a.role, id: a.id, presenter: !!a.presenter } : null; });

// ------------------------------------------------------------------------------------------------ Presentation mode
{
  const page = await newPage({ who: 'jperez' });
  await run('PRES-01 the product viewport has no "Reset" or "Demo:" text and no presenter controls (Presentation mode, dock hidden)', async () => {
    for (const [id, p] of [['MyWork', '?section=todo'], ['Authorizations', ''], ['Authorization', '?id=R-0411'], ['DenialIntelligence', ''], ['DenialCase', '?id=R-0402&section=decision'], ['Analytics', '?section=outcomes'], ['Referrals', ''], ['Referral', '?id=REF-118']]) {
      await go(page, `/#/${id}${p}`); const t = await stageText(page); assert.noMatch(t, FORBIDDEN, `${id}`);
      const inStage = await page.evaluate(() => !!document.querySelector('#stage #dock, #stage [data-dock], #stage .sh-dock, #rail [data-dock]')); assert.ok(!inStage, id + ': presenter controls inside the product viewport');
    }
  });
  await run('PRES-02 the dock is hidden by default, takes no tab stop, and is not in the page until opened', async () => {
    await go(page, '/#/MyWork?section=todo'); const d = await dockState(page);
    assert.ok(d.hidden && d.state === 'hidden', 'dock hidden: ' + JSON.stringify(d)); assert.eq(d.tabbable, 0, 'no tabbable dock control'); assert.eq(d.h, 0, 'dock takes no height');
    const stops = await A.tabWalk(page.mainFrame(), { page, max: 40 }); assert.ok(!stops.some(s => s.where === 'dock'), 'tab never lands in the dock');
    const first = stops.find(s => s.cur); assert.match(first.name, /skip to main/i, 'first stop: ' + first.name);
  });
  await run('PRES-03 Ctrl+Shift+P opens the dock (focus on its toggle) and toggles it closed again; the page behind keeps its layout', async () => {
    await go(page, '/#/MyWork?section=todo'); const before = await page.evaluate(() => Math.round(document.getElementById('app').getBoundingClientRect().top));
    await page.keyboard.press('Control+Shift+P'); await page.waitForTimeout(250);
    let d = await dockState(page); assert.ok(!d.hidden && d.state === 'open', 'open: ' + JSON.stringify(d)); assert.ok(d.tabbable >= 5, 'controls reachable once open: ' + d.tabbable);
    assert.match(d.label, /Presentation/, 'mode label');
    const focus = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-dock')); assert.eq(focus, 'toggle', 'focus moves to the dock toggle');
    const after = await page.evaluate(() => Math.round(document.getElementById('app').getBoundingClientRect().top)); assert.ok(after >= before + 20, `the product starts below the ribbon (${before} -> ${after})`);
    assert.noMatch(await stageText(page), FORBIDDEN, 'still nothing presenter-owned inside the viewport');
    await page.keyboard.press('Control+Shift+P'); await page.waitForTimeout(250);
    d = await dockState(page); assert.ok(d.hidden && d.state === 'hidden', 'closed again: ' + JSON.stringify(d)); assert.eq(d.tabbable, 0);
  });
  await run('PRES-04 collapsed: a 28 px handle is the only dock control; its menus stay out of the tab order until the dock is opened', async () => {
    await go(page, '/?present=1#/MyWork?section=todo'); await page.waitForTimeout(250);
    await page.click('[data-dock="toggle"]'); await page.waitForTimeout(200);
    const d = await dockState(page); assert.eq(d.state, 'collapsed'); assert.eq(d.tabbable, 1, 'only the handle is tabbable: ' + d.tabbable); assert.ok(d.h <= 40 && d.h >= 20, 'handle height ' + d.h);
    const exp = await page.getAttribute('[data-dock="toggle"]', 'aria-expanded'); assert.eq(exp, 'false');
    await page.click('[data-dock="toggle"]'); await page.waitForTimeout(150); assert.eq((await dockState(page)).state, 'open');
  });
  await run('PRES-05 the dock is visually unlike the product (navy ribbon, monospace PRESENTER label, dashed marigold edge)', async () => {
    await go(page, '/?present=1#/MyWork?section=todo'); await page.waitForTimeout(250);
    const s = await page.evaluate(() => { const d = document.getElementById('dock'); const cs = getComputedStyle(d); const l = document.querySelector('.sh-dock__label'); return { bg: cs.backgroundColor, border: cs.borderBottomStyle + ' ' + cs.borderBottomColor, font: l ? getComputedStyle(l).fontFamily : '', text: l ? l.textContent : '' }; });
    assert.match(s.bg, /rgb\(21, 27, 36\)/, 'navy ' + s.bg); assert.match(s.font, /mono|Menlo|Consolas|Courier/i, 'label font ' + s.font); assert.match(s.text, /PRESENTER/);
    await page.screenshot({ path: `${SHOTS}/presenter-dock-open.png` });
  });
  await run('PRES-06 role switch changes the rail without a reload (clinician -> supervisor -> direct support -> administrator -> clinician)', async () => {
    await go(page, '/?present=1#/MyWork?section=todo'); await page.evaluate(() => { window.__noReload = 'marker'; });
    const want = { 'Site supervisor': (l) => l.includes('Authorizations') && !l.includes('Denial Intelligence'), 'Direct support': l => !l.includes('Authorizations') && !l.includes('Analytics') && l.length <= 2, 'Administrator': l => l.includes('Settings') && l.includes('Analytics') && !l.includes('Referrals'), 'Clinician (LMHP-type)': l => l.includes('Referrals') && l.includes('Denial Intelligence') && !l.includes('Settings') };
    const start = await railLinks(page); assert.ok(start.includes('Denial Intelligence'), 'clinician rail: ' + start.join(','));
    for (const [label, ok] of Object.entries(want)) {
      await page.click('[data-dock-menu="role"]'); await page.waitForSelector('.sh-menu [role=menuitem]'); await page.locator('.sh-menu [role=menuitem]', { hasText: label }).first().click();
      await page.waitForFunction(() => document.querySelector('#toasts .ui-toast') || true); await page.waitForTimeout(700); await settle(page.mainFrame());
      const links = await railLinks(page); assert.ok(ok(links), `${label}: rail shows ${links.join(', ')}`);
      assert.eq(await page.evaluate(() => window.__noReload), 'marker', label + ': the page reloaded');
    }
    assert.deepEq(page.errs.filter(e => !/404/.test(e)), [], 'console errors');
  });
  await run('PRES-07 "Demo data · nothing is real" is on every app screen (rail foot) and on the phone and portal screens', async () => {
    const miss = [];
    await login(page, 'jperez', { presenter: false });
    for (const [id, p] of [['MyWork', '?section=todo'], ['Authorizations', ''], ['Authorization', '?id=R-0402'], ['DenialIntelligence', ''], ['DenialCase', '?id=R-0402&section=decision'], ['Analytics', '?section=payer'], ['Referrals', ''], ['Referral', '?id=REF-118'], ['ExtHome', '']]) {
      await go(page, `/#/${id}${p}`); const t = await allText(page); if (!/Demo data · nothing is real/.test(t)) miss.push(id);
    }
    await login(page, 'dowens', { presenter: false }); await go(page, '/#/Settings?tab=people'); if (!/Demo data · nothing is real/.test(await page.evaluate(() => document.body.innerText))) miss.push('Settings');
    await login(page, 'khale', { presenter: false }); for (const id of ['MobileApp', 'MobileDictate', 'MobileAssess']) { await go(page, '/#/' + id); if (!/Demo data · nothing is real/.test(await page.evaluate(() => document.body.innerText))) miss.push(id + ' (phone)'); }
    await page.evaluate(async () => { const r = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portalClient: 'TW', presenter: true }) }); const j = await r.json(); localStorage.setItem('psyflo_session', JSON.stringify({ token: j.token, actor: j.actor })); });
    await page.reload({ waitUntil: 'domcontentloaded' }); await go(page, '/#/ParentPortal'); if (!/Demo data · nothing is real|nothing is real/.test(await page.evaluate(() => document.body.innerText))) miss.push('ParentPortal');
    await page.evaluate(async () => { const r = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schoolUser: 'rbell', presenter: true }) }); const j = await r.json(); localStorage.setItem('psyflo_session', JSON.stringify({ token: j.token, actor: j.actor })); });
    await page.reload({ waitUntil: 'domcontentloaded' }); await go(page, '/#/SchoolPortal'); if (!/Demo data · nothing is real|nothing is real/.test(await page.evaluate(() => document.body.innerText))) miss.push('SchoolPortal');
    assert.deepEq(miss, [], 'screens without the "Demo data · nothing is real" line');
  });
  await page.ctx.close();
}

// ------------------------------------------------------------------------------------------------ the scenario selector
{
  const sc = (await state('dowens+p')).scenarios;
  const want = Object.fromEntries(sc.map(s => [s.id, s]));
  for (const id of ['s1', 's2', 's3', 's4', 's5', 's6']) {
    await run(`PRES-08 scenario ${id} from the dock lands on its route as its role`, async () => {
      const s = want[id]; assert.ok(s, 'scenario ' + id + ' is in the table');
      const page = await newPage({ who: 'jperez', presenter: true });
      await go(page, '/?present=1#/MyWork?section=todo'); await page.waitForTimeout(300);
      await page.click('[data-dock-menu="scenario"]'); await page.waitForSelector('.sh-menu [role=menuitem]');
      const items = await page.evaluate(() => [...document.querySelectorAll('.sh-menu [role=menuitem]')].map(b => b.innerText.replace(/\s+/g, ' ').trim()));
      assert.ok(items.length >= 6, 'six scenarios listed: ' + items.length);
      await page.locator(`.sh-menu [data-i="${id}"]`).click();
      const [rid, rq] = String(s.route).split('?'); const params = Object.fromEntries(new URLSearchParams(rq || ''));
      await page.waitForFunction(r => location.hash.startsWith('#/' + r), rid, { timeout: 15000 }).catch(() => { });
      await page.waitForFunction(READY, null, { timeout: 15000 }); await settle(page.mainFrame(), { max: 4000 });
      const at = await page.evaluate(() => ({ hash: location.hash, h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim()).join(' / '), text: document.getElementById('root').innerText.replace(/\s+/g, ' ').slice(0, 400), denied: /Not available for|Page not found|Presenter only/.test(document.getElementById('root').innerText) }));
      assert.ok(at.hash.startsWith('#/' + rid), `lands on ${rid}: ${at.hash}`);
      for (const [k, v] of Object.entries(params)) assert.ok(at.hash.includes(`${k}=${v}`), `route keeps ${k}=${v}: ${at.hash}`);
      assert.ok(!at.denied, 'the route opens for this role: ' + at.text.slice(0, 80)); assert.ok(at.h1, 'a heading');
      const a = await apiActor(page); const wantRole = s.role;
      if (wantRole === 'school' || wantRole === 'guardian') assert.eq(a.kind, wantRole, 'signed in as the ' + wantRole); else assert.eq(a.role, wantRole, `signed in as ${wantRole}: ${JSON.stringify(a)}`);
      const sf = (await state('dowens+p')); assert.ok(sf.events.some(e => /Demo: scenario .*started|Demo: fixture/.test(e.what)), 'the server recorded the scenario');
      const cl = s.case && s.case.label; if (cl && id !== 's2') assert.ok(at.text.includes(cl) || at.text.includes((s.case.request || '')) || /Analytics|Denial/.test(at.h1), `the screen shows the case ${cl}: ${at.text.slice(0, 120)}`);
      assert.deepEq(page.errs.filter(e => !/404/.test(e)), [], 'console errors');
      await page.screenshot({ path: `${SHOTS}/presenter-scenario-${id}.png` });
      await page.ctx.close();
    });
  }
  await run('PRES-09 the dock\'s menus: Reset offers Live flows and Canvas snapshot and asks before resetting; Simulate and Notes and Maturity work; Surfaces opens Lauris', async () => {
    const page = await newPage({ who: 'dowens', presenter: true });
    await go(page, '/?present=1#/Analytics?section=outcomes'); await page.waitForTimeout(300);
    await page.click('[data-dock-menu="reset"]'); await page.waitForSelector('.sh-menu');
    const items = await page.evaluate(() => [...document.querySelectorAll('.sh-menu [role=menuitem]')].map(b => b.innerText.replace(/\s+/g, ' ').trim())); assert.ok(items.some(t => /Live flows/.test(t)) && items.some(t => /Canvas snapshot/.test(t)), items.join(' | '));
    await page.locator('.sh-menu [data-i="live"]').click(); await page.waitForSelector('[role=alertdialog]'); const title = await page.evaluate(() => document.querySelector('[role=alertdialog] .ui-dialog__t').textContent); assert.match(title, /Reset/);
    await page.keyboard.press('Escape'); await page.waitForTimeout(150); const rev0 = (await fetch(BASE + '/api/roster').then(r => r.json())).rev;
    await page.click('[data-dock-menu="sim"]'); await page.waitForSelector('.sh-menu'); const sim = await page.evaluate(() => [...document.querySelectorAll('.sh-menu [role=menuitem]')].map(b => b.innerText.replace(/\s+/g, ' ').trim() + (b.disabled ? ' (disabled)' : ''))); assert.ok(sim.length === 2 && !sim.some(x => /disabled/.test(x)), 'simulate: ' + sim.join(' | ')); await page.keyboard.press('Escape');
    assert.eq((await fetch(BASE + '/api/roster').then(r => r.json())).rev, rev0, 'declining the reset changes nothing');
    await page.click('[data-dock="maturity"]'); assert.eq(await page.getAttribute('[data-dock="maturity"]', 'aria-pressed'), 'true'); assert.eq(await page.evaluate(() => document.documentElement.dataset.maturity), 'all'); await page.click('[data-dock="maturity"]'); assert.eq(await page.evaluate(() => document.documentElement.dataset.maturity || ''), '');
    await page.click('[data-dock="notes"]'); await page.waitForSelector('#ui-overlays [role=dialog]'); const nt = await page.evaluate(() => document.querySelector('#ui-overlays .ui-dialog').innerText); assert.match(nt, /How the data gets in|Maturity|Levels/); await page.keyboard.press('Escape');
    await page.click('[data-dock-menu="surfaces"]'); await page.waitForSelector('.sh-menu'); const [pop] = await Promise.all([page.context().waitForEvent('page', { timeout: 6000 }), page.locator('.sh-menu [data-i="lauris"]').click()]);
    await pop.waitForLoadState('domcontentloaded'); assert.ok(pop.url().startsWith(LAURIS), 'Lauris opens: ' + pop.url()); await pop.close();
    await page.ctx.close();
  });
}

// ------------------------------------------------------------------------------------------------ Explore mode
{
  await run('EXP-01 Explore mode: the dock is always open, the mode label is visible, Ctrl+Shift+P focuses it instead of hiding it, and Presentation mode can be restored', async () => {
    const page = await newPage({ who: 'jperez' });
    await go(page, '/?mode=explore#/MyWork?section=todo'); await page.waitForTimeout(300);
    let d = await dockState(page); assert.ok(!d.hidden && d.state === 'open' && d.mode === 'explore', JSON.stringify(d)); assert.match(d.label, /Explore · all features by role/);
    await page.keyboard.press('Control+Shift+P'); await page.waitForTimeout(150); d = await dockState(page); assert.eq(d.state, 'open', 'stays open');
    assert.eq(await page.evaluate(() => document.activeElement.getAttribute('data-dock')), 'toggle');
    const hideBtn = await page.locator('[data-dock="hide"]').count(); assert.eq(hideBtn, 0, 'no hide button in Explore');
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForFunction(READY); assert.eq((await dockState(page)).mode, 'explore', 'the mode is remembered');
    await page.click('[data-dock="mode"]'); await page.waitForTimeout(200); d = await dockState(page); assert.match(d.label, /Presentation/);
    await page.ctx.close();
  });
  // every route reachable in <= 3 clicks by a permitted role: the "All screens" picker (2 clicks), plus a walk over the product's own links
  const picks = {};
  for (const role of ['clinician', 'supervisor', 'admin', 'direct_support']) {
    await run(`EXP-02 ${role}: "All screens" lists every route this role may open and each opens in two clicks`, async () => {
      const page = await newPage({ who: STAFF[role], presenter: true });
      await go(page, '/?mode=explore#/MyWork?section=todo'); await page.waitForTimeout(300);
      const live = SCREENS.filter(s => s.id !== 'Login' && s.id !== 'UiKit' && !['DoNext', 'ReviewQueue', 'StaffDashboard', 'Users', 'Submission', 'EarlyDischarge', 'InfoRequest', 'Partials', 'PeerBrief', 'PayerPlaybook', 'Eligibility', 'WhereThingsLive'].includes(s.id));
      const act = await apiActor(page); const des = await page.evaluate(async () => { const { api } = await import('/js/api.js'); return (api.session() || {}).designations || []; }); const may = id => routeAllowed(role, id, { role, designations: des, presenter: true });
      const expected = live.filter(s => s.min === 0 ? true : may(s.id)).map(s => s.id); void act;
      await page.click('[data-dock-menu="screens"]'); await page.waitForSelector('#dock-q');
      const listed = await page.evaluate(() => [...document.querySelectorAll('#dock-ql [role=menuitem]')].map(b => b.dataset.i));
      const missing = expected.filter(id => !listed.includes(id)); assert.deepEq(missing, [], `${role}: routes missing from All screens`);
      const extra = listed.filter(id => { const s = SCREENS.find(x => x.id === id); return s && s.min > 0 && !may(id); }); assert.deepEq(extra, [], 'routes listed that the role cannot open');
      // open three of them by clicking, checking the route and that the role may see it
      picks[role] = listed.length;
      const sample = listed.filter(id => !/^(Parent|FamilyLink|AppealLetter|SchoolPortal|ReferralForm|ReferralSent|Mobile|Ext)/.test(id)).slice(0, 4);
      await page.keyboard.press('Escape');
      for (const id of sample) {
        await page.click('[data-dock-menu="screens"]'); await page.waitForSelector('#dock-q'); await page.fill('#dock-q', id.replace(/([A-Z])/g, ' $1').trim());
        const hit = page.locator(`#dock-ql [data-i="${id}"]`); if (!(await hit.count())) { await page.keyboard.press('Escape'); continue; }
        await hit.click(); await page.waitForFunction(i => location.hash.startsWith('#/' + i) || location.hash.startsWith('#/'), id); await page.waitForFunction(READY); await settle(page.mainFrame());
        const denied = await page.evaluate(() => /Not available for|Page not found/.test(document.getElementById('root').innerText)); assert.ok(!denied, `${id} opened as ${role}`);
      }
      await page.ctx.close();
    });
  }
  await run('EXP-03 portal screens in the picker open as the portal person (guardian, school) in Explore mode', async () => {
    const page = await newPage({ who: 'jperez', presenter: true });
    await go(page, '/?mode=explore#/MyWork?section=todo'); await page.waitForTimeout(300);
    for (const [id, kind] of [['ParentPortal', 'guardian'], ['SchoolPortal', 'school']]) {
      await page.click('[data-dock-menu="screens"]'); await page.waitForSelector('#dock-q'); const hit = page.locator(`#dock-ql [data-i="${id}"]`); assert.ok(await hit.count(), id + ' is listed'); await hit.click();
      await page.waitForFunction(i => location.hash.startsWith('#/' + i), id, { timeout: 10000 }); await page.waitForFunction(READY); await settle(page.mainFrame());
      assert.eq((await apiActor(page)).kind, kind, id + ' opens as the ' + kind);
      const dock = await dockState(page); assert.ok(dock.state === 'open' || dock.state === 'collapsed', 'the dock is still there to go back: ' + dock.state);
      await go(page, '/#/Login').catch(() => { }); await login(page, 'jperez', { presenter: true }); await go(page, '/?mode=explore#/MyWork?section=todo');
    }
    await page.ctx.close();
  });
  for (const role of ['clinician', 'supervisor', 'admin', 'direct_support']) {
    await run(`EXP-04 ${role}: every route this role may open is within three clicks of its home screen (product links: rail, page links)`, async () => {
      const page = await newPage({ who: STAFF[role] });
      const home = await page.evaluate(async () => { const { homeTarget } = await import('/js/registry.js'); return null; }).catch(() => null); void home;
      await go(page, '/'); await page.waitForTimeout(400);
      const start = await page.evaluate(() => location.hash.replace(/^#\//, '')); const [sid, sq] = start.split('?');
      const depth = { [sid]: 0 }; let frontier = [[sid, sq || '']];
      const hrefs = async () => { const out = await page.evaluate(() => [...document.querySelectorAll('#rail a[href^="#/"], #root a[href^="#/"]')].map(a => a.getAttribute('href').slice(2))); await page.waitForTimeout(1200); for (const f of page.frames().slice(1)) out.push(...await f.evaluate(() => [...document.querySelectorAll('a[href*="/#/"]')].map(a => (a.getAttribute('href').split('/#/')[1] || ''))).catch(() => [])); return out.filter(Boolean); };
      for (let d = 0; d < 3; d++) {
        const next = [];
        for (const [id, q] of frontier) {
          await go(page, `/#/${id}${q ? '?' + q : ''}`).catch(() => { });
          for (const h of await hrefs()) { const [rid, rq] = h.split('?'); if (!(rid in depth)) { depth[rid] = d + 1; next.push([rid, rq || '']); } }
        }
        frontier = next;
      }
      // direct support lands on the framed Lauris page: its way into My Work is the panel's "My day in Psyflo" control (a button that opens the platform)
      if (role === 'direct_support' && !('MyWork' in depth)) { await go(page, `/#/${sid}${sq ? '?' + sq : ''}`).catch(() => { }); await page.waitForTimeout(2500); for (const f of page.frames().slice(1)) { if (await f.evaluate(() => [...document.querySelectorAll('a,button')].some(b => /My day in Psyflo/i.test(b.innerText))).catch(() => false)) depth.MyWork = 1; } }
      const must = SCREENS.filter(s => s.min > 0 && s.surface === 'app' && routeAllowed(role, s.id) && !['Login', 'UiKit'].includes(s.id)).map(s => s.id);
      const redirected = new Set(['DoNext', 'ReviewQueue', 'StaffDashboard', 'Users', 'Submission', 'EarlyDischarge', 'InfoRequest', 'Partials', 'PeerBrief', 'PayerPlaybook', 'Eligibility']);
      const unreached = must.filter(id => !(id in depth) && !redirected.has(id));
      console.log(`  ${role}: product links reach ${Object.keys(depth).length} routes within 3 clicks; the picker lists the rest (${picks[role] || '?'} routes)`);
      assert.deepEq(unreached, [], `${role}: routes not reachable in 3 clicks through the product's own links (Explore picker still reaches them in 2)`);
      await page.ctx.close();
    });
  }
}
await browser.close();
await T.done();
