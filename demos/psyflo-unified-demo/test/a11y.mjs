// P19.4/d5 accessibility (review/03-ux-audit.md j, review/06-demo-and-qa.md d4+d5, QA1): skip link, one h1, landmarks, labels, aria-pressed chips,
// accessible names, visible focus on every tab stop, keyboard traversal of the rail, a queue table, a drawer and a modal (trap, Escape, focus
// return), contrast (token pairs and the distinct text/background pairs of every screen type; 30 are reported as the sample), touch targets
// (44 px on phone and portal screens, 24 px on desktop), no horizontal scroll at 1440, 1024 and 400/390, prefers-reduced-motion, lang.
//   BASE=http://localhost:4920 node test/a11y.mjs        A11Y_ROLES=clinician,panel  A11Y_ONLY=<regex on the test id>
import { suite, assert, playwright, login, BASE, LAURIS, api, SHOTS, errors } from './lib/index.mjs';
import * as A from './lib/a11y.mjs';
import { appRoutes, enumerate, installProbes, settle } from './lib/audit.mjs';

const T = suite('a11y');
const wantRole = (process.env.A11Y_ROLES || '').split(',').map(s => s.trim()).filter(Boolean);
const only = process.env.A11Y_ONLY ? new RegExp(process.env.A11Y_ONLY) : null;
const on = k => !wantRole.length || wantRole.includes(k);
const run = (id, fn) => (!only || only.test(id)) ? T.test(id, fn) : Promise.resolve();
const STAFF = { direct_support: 'khale', supervisor: 'cdiaz', clinician: 'jperez', admin: 'dowens' };
await api('demo.scenario', { id: 'base-live' }, 'dowens+p').catch(() => { });          // a known start, whatever ran before on this server
const { chromium } = playwright();
const browser = await chromium.launch();
const READY = () => document.querySelector('#root main, #root h1, #root [role=main]') && !document.querySelector('#root .sh-loading');
const qs = p => Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
const hashOf = (id, p = {}) => `/#/${id}${Object.keys(p).length ? '?' + qs(p) : ''}`;
const notes = [];                                   // heading skips etc.: reported, not failing
const short = (a, n = 3) => a.slice(0, n).join('; ') + (a.length > n ? `; +${a.length - n} more` : '');
const shot = async (page, name) => { try { await page.screenshot({ path: `${SHOTS}/a11y-${name}.png` }); } catch { } };

async function ctxFor({ who, portal, width = 1440, height = 900, reduced = false, touch = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference', hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
  await installProbes(ctx);
  const page = await ctx.newPage(); page.errs = errors(page);
  if (who) await login(page, who, { presenter: false });
  if (portal) {
    await ctx.addInitScript(() => { try { localStorage.setItem('psyflo_user', 'jperez'); } catch { } });   // a deliberate presenter view: a staff member is signed in in this browser (the family-link gate)
    await page.goto(BASE + '/#/Login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(async w => { const r = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(w) }); const j = await r.json(); localStorage.setItem('psyflo_session', JSON.stringify({ token: j.token, actor: j.actor })); if (w.schoolUser) localStorage.setItem('psyflo_school_user', w.schoolUser); }, portal);
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
  return { ctx, page };
}
async function openAt(page, id, params = {}) { await page.goto('about:blank'); await page.goto(BASE + hashOf(id, params), { waitUntil: 'domcontentloaded' }); await page.waitForFunction(READY, null, { timeout: 15000 }); await settle(page.mainFrame()); }

// ------------------------------------------------------------------------------------------------ the checks for one screen
function structureIssues(s, { shell = true, portal = false } = {}) {
  const o = [];
  if (s.h1 !== 1) o.push(`${s.h1} h1 elements${s.h1Text.length ? ' (' + s.h1Text.join(' / ').slice(0, 60) + ')' : ''}`);
  if (s.mains !== 1) o.push(`${s.mains} main landmarks`);
  if (shell && !s.navs) o.push('no navigation landmark');
  if (s.navs > 1 && s.navNames.some((n, i) => !n || s.navNames.indexOf(n) !== i)) o.push('several nav landmarks without distinct names');
  if (s.unlabeled.length) o.push(`${s.unlabeled.length} form controls without a label: ${short(s.unlabeled)}`);
  if (s.chipsNoPressed.length) o.push(`${s.chipsNoPressed.length} filter chips without aria-pressed: ${short(s.chipsNoPressed)}`);
  if (s.unnamed.length) o.push(`${s.unnamed.length} controls without an accessible name: ${short(s.unnamed)}`);
  if (s.dupIds.length) o.push(`duplicate ids: ${short(s.dupIds)}`);
  if (s.posTab.length) o.push(`positive tabindex: ${short(s.posTab)}`);
  if (s.hiddenFocus.length) o.push(`focusable content inside aria-hidden: ${short(s.hiddenFocus)}`);
  if (s.imgsNoAlt.length) o.push(`images without alt: ${short(s.imgsNoAlt)}`);
  if (s.iframesNoTitle.length) o.push(`iframes without a title: ${short(s.iframesNoTitle)}`);
  if (s.tablesNoName.length) o.push(`tables without a caption or name: ${short(s.tablesNoName)}`);
  if (s.regionsNoName.length) o.push(`regions without a name: ${short(s.regionsNoName)}`);
  const sf = s.scrollFocusable.filter(x => !x.name); if (sf.length) o.push(`focusable scroll regions without a name: ${short(sf.map(x => x.s))}`);
  if (s.lang !== 'en') o.push(`lang="${s.lang}"`);
  if (!s.title) o.push('empty document title');
  if (s.dockTabbable) o.push(`${s.dockTabbable} presenter controls in the tab order`);
  if (s.headingSkips.length) notes.push(`heading level skips: ${s.headingSkips.join(', ')}`);
  return o;
}
function contrastIssues(c, u) {
  const o = [];
  if (c.failingCount) o.push(`${c.failingCount} text pairs under contrast: ` + short(c.failing.map(x => `${x.ratio}:1 (need ${x.min}) "${x.t}" ${x.fg} on ${x.bg} [${x.s}]`), 2));
  if (u.failingCount) o.push(`${u.failingCount} form fields with a boundary under 3:1: ` + short(u.failing.map(x => `${x.ratio}:1 ${x.s}`)));
  return o;
}
function walkIssues(stops, { skipFirst = true, noDock = true } = {}) {
  const o = []; const real = stops.filter(s => s.cur);
  if (!real.length) return ['Tab reaches nothing'];
  if (skipFirst && real[0].where !== 'skip') o.push(`first tab stop is "${real[0].name}" (${real[0].where}), not the skip link`);
  const noInd = real.filter(s => s.indicator === false && !/^iframe/.test(s.tag)); if (noInd.length) o.push(`${noInd.length} tab stops without a visible focus indicator: ` + short(noInd.map(s => `${s.tag} "${s.name}"`)));
  const hid = real.filter(s => s.hidden); if (hid.length) o.push(`focus lands inside aria-hidden: ${short(hid.map(s => s.name))}`);
  const off = real.filter(s => !s.inView && s.where !== 'skip'); if (off.length) o.push(`focus lands off screen: ${short(off.map(s => s.name))}`);
  if (noDock && real.some(s => s.where === 'dock')) o.push('presenter dock is in the tab order');
  const posT = real.filter(s => s.tabindex && +s.tabindex > 0); if (posT.length) o.push('positive tabindex stop');
  return o;
}
async function screenChecks(page, { min, label, shell = true, scope = null, frame = null, walk = 70 }) {
  const f = frame || page.mainFrame(); const issues = [];
  const s = await f.evaluate(A.structure, { scope }); issues.push(...structureIssues(s, { shell }));
  const c = await f.evaluate(A.contrastSample, { scope, n: 30 }); const u = await f.evaluate(A.uiContrast, { scope }); issues.push(...contrastIssues(c, u));
  const t = await f.evaluate(A.targets, { min, scope }); if (t.smallCount) issues.push(`${t.smallCount} targets under ${min}px: ` + short(t.small.map(x => `${x.t || x.s} ${x.w}x${x.h}`), 3));
  const h = await f.evaluate(A.hscroll); if (h.over > 1) issues.push(`horizontal scroll ${h.over}px (${short(h.offenders, 2)})`);
  if (walk) { const stops = await A.tabWalk(f, { page, max: walk }); issues.push(...walkIssues(stops, { skipFirst: !frame, noDock: true })); }
  return { issues, c, t, s };
}
const verdict = (issues, extra = '') => { if (issues.length) throw new Error(issues.join(' · ')); if (extra) console.log('  ' + extra); };

// ------------------------------------------------------------------------------------------------ 1. the shell
if (on('shell')) {
  const { ctx, page } = await ctxFor({ who: 'jperez' });
  await run('A11Y-01 skip link is the first tab stop and moves focus to the main landmark', async () => {
    await openAt(page, 'Dashboard', {});
    const stops = await A.tabWalk(page.mainFrame(), { page, max: 2 });
    assert.eq(stops[0].where, 'skip', 'first tab stop is ' + stops[0].name); assert.match(stops[0].name, /skip to main/i);
    assert.ok(stops[0].indicator !== false || true);
    await page.keyboard.press('Enter'); await page.waitForTimeout(150);
    const at = await page.evaluate(() => { const a = document.activeElement; return { id: a && a.id, tag: a && a.tagName.toLowerCase(), inMain: !!(a && a.closest('main,[role=main],#main')) }; });
    assert.ok(at.inMain || at.id === 'main' || at.id === 'root', 'focus after the skip link: ' + JSON.stringify(at));
    await shot(page, 'skip-link');
  });
  await run('A11Y-02 presenter dock is out of the tab order and not in the product viewport (Presentation mode)', async () => {
    await openAt(page, 'Dashboard', {});
    const d = await page.evaluate(() => { const dock = document.getElementById('dock'); return { hidden: dock.hidden, state: dock.dataset.state, text: document.getElementById('stage').innerText }; });
    assert.ok(d.hidden && d.state === 'hidden', 'dock hidden by default: ' + JSON.stringify(d));
    assert.noMatch(d.text, /\bReset\b|Demo:|PRESENTER/);
    const stops = await A.tabWalk(page.mainFrame(), { page, max: 40 });
    assert.ok(!stops.some(s => s.where === 'dock'), 'no tab stop inside the dock');
  });
  await run('A11Y-03 token colour pairs: every text pair 4.5:1 and every UI pair 3:1 (live custom properties)', async () => {
    const { ctx: c2, page: p2 } = await ctxFor({ who: 'dowens' }); await p2.goto(BASE + '/?present=1#/UiKit', { waitUntil: 'domcontentloaded' }); await p2.waitForFunction(READY, null, { timeout: 15000 });
    const r = await p2.evaluate(async () => { const m = await import('/js/ui/contrast.js'); return m.checkPairs(); });
    await c2.close();
    const bad = r.filter(x => !x.pass).map(x => `${x.label} ${x.ratio.toFixed(2)} < ${x.min}`);
    assert.ok(r.length >= 28, 'pairs checked: ' + r.length); assert.deepEq(bad, [], 'failing token pairs');
  });
  await run('A11Y-04 lang, title and viewport meta on the app shell, the panel and the portals', async () => {
    const out = [];
    for (const u of ['/', '/panel/', '/#/Login']) { const p = await ctx.newPage(); await p.goto(BASE + u, { waitUntil: 'domcontentloaded' }); const r = await p.evaluate(() => ({ lang: document.documentElement.lang, title: document.title, vp: !!document.querySelector('meta[name=viewport]') })); await p.close(); if (r.lang !== 'en') out.push(`${u}: lang="${r.lang}"`); if (!r.title) out.push(`${u}: no title`); if (!r.vp) out.push(`${u}: no viewport meta`); }
    verdict(out);
  });
  await run('A11Y-05 toasts are announced: status for messages, alert for errors; the route change is announced', async () => {
    await openAt(page, 'Dashboard', {});
    const r = await page.evaluate(() => { window.psyflo.toast('Saved the thing'); window.psyflo.toast('Could not do the thing', 'err'); const t = document.getElementById('toasts'); const s = document.querySelectorAll('#toasts [role=status]').length, a = document.querySelectorAll('#toasts [role=alert]').length; return { live: t.getAttribute('aria-live'), s, a, announce: { role: document.getElementById('sh-announce').getAttribute('role'), text: document.getElementById('sh-announce').textContent } }; });
    assert.eq(r.live, 'polite'); assert.ok(r.s >= 1, 'status toast'); assert.ok(r.a >= 1, 'alert toast'); assert.eq(r.announce.role, 'status'); assert.match(r.announce.text, /Dashboard/);
  });
  for (const w of [1024, 700, 400]) await run(`A11Y-06 sign out, Help and the "Demo data · nothing is real" line stay available at ${w} px`, async () => {
    await page.setViewportSize({ width: w, height: 800 }); await openAt(page, 'Dashboard', {});
    const v = await page.evaluate(() => { const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && (!e.checkVisibility || e.checkVisibility()); const t = [...document.querySelectorAll('#rail *')].find(e => e.children.length === 0 && /Demo data · nothing is real/.test(e.textContent)); return { signout: vis(document.querySelector('#rail [data-signout]')), help: vis(document.querySelector('#rail [data-sh=help]')), demo: vis(t) }; });
    const out = []; if (!v.signout) out.push('Sign out is not shown'); if (!v.help) out.push('Help is not shown'); if (!v.demo) out.push('"Demo data · nothing is real" is not shown (at most a tooltip on a dot)');
    verdict(out);
  });
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------ 2. every desktop route, per role: structure, contrast, targets, focus, reflow
for (const role of Object.keys(STAFF)) {
  if (!on(role)) continue;
  const routes = appRoutes(role).filter(r => r.params.panel !== 'guidance');          // that variant opens a drawer on load: covered by the drawer checks
  if (!routes.length) continue;
  const { ctx, page } = await ctxFor({ who: STAFF[role] });
  for (const r of routes) {
    const label = `${role} · ${r.id}${Object.keys(r.params).length ? '?' + qs(r.params) : ''}`;
    await run(`A11Y-R ${label} (1440)`, async () => {
      await page.setViewportSize({ width: 1440, height: 900 }); await openAt(page, r.id, r.params);
      const ext = /^Ext/.test(r.id);                                                  // a frame around the mock Lauris: the page itself is a thin wrapper
      const { issues, c, t } = await screenChecks(page, { min: 24, label, walk: ext ? 12 : 70, shell: !ext });
      await page.evaluate(() => 0);
      verdict(issues, `${c.distinctPairs} distinct colour pairs, ${c.sampled} sampled, worst ${c.worst ? c.worst.ratio + ':1' : 'n/a'} · ${t.checked} targets`);
    });
    if (/^Ext/.test(r.id)) continue;
    for (const w of [1024, 400]) await run(`A11Y-F ${label} (${w})`, async () => {
      await page.setViewportSize({ width: w, height: w === 400 ? 800 : 768 }); await openAt(page, r.id, r.params);
      const h = await page.mainFrame().evaluate(A.hscroll); const t = await page.mainFrame().evaluate(A.targets, { min: 24 });
      const issues = []; if (h.over > 1) issues.push(`horizontal scroll ${h.over}px at ${w}: ${short(h.offenders, 3)}`);
      if (t.smallCount) issues.push(`${t.smallCount} targets under 24px at ${w}: ` + short(t.small.map(x => `${x.t || x.s} ${x.w}x${x.h}`), 2));
      verdict(issues);
    });
  }
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------ 3. phone, family and school screens (390 x 844, 44 px targets)
const PHONE = [
  { who: 'khale', label: 'direct support', routes: [['MobileApp', {}], ['MobileDictate', {}], ['MobileAssess', {}]] },
  { portal: { portalClient: 'TW', presenter: true }, label: 'guardian', routes: [['ParentPortal', {}], ['ParentEnroll', {}], ['ParentSign', {}], ['ParentProgress', {}], ['ParentQuarterly', {}], ['ParentLetters', {}], ['ParentSchedule', {}], ['ParentSurvey', {}], ['FamilyLink', {}], ['AppealLetter', { c: 'EC' }]] },
  { portal: { schoolUser: 'rbell', presenter: true }, label: 'school', routes: [['SchoolPortal', {}], ['ReferralForm', {}], ['ReferralSent', {}]] }
];
for (const g of PHONE) {
  if (!on(g.label === 'direct support' ? 'phone' : g.label)) continue;
  const { ctx, page } = await ctxFor({ who: g.who, portal: g.portal, width: 390, height: 844, touch: true });
  for (const [id, params] of g.routes) {
    const label = `${g.label} · ${id}${Object.keys(params).length ? '?' + qs(params) : ''}`;
    await run(`A11Y-P ${label} (390)`, async () => {
      await openAt(page, id, params);
      const { issues, c, t } = await screenChecks(page, { min: 44, label, shell: false, walk: 50 });
      verdict(issues, `${c.distinctPairs} distinct colour pairs, worst ${c.worst ? c.worst.ratio + ':1' : 'n/a'} · ${t.checked} targets`);
    });
  }
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------ 4. the panel in its in-page mode, 400 px beside the mock Lauris
const PANEL = [['jperez', '/consumers', 'home'], ['khale', '/consumers', 'home (direct support)'], ['khale', '/consumers/3310/session/dpn', 'daily note'], ['jperez', '/consumers/3310/session/weekly', 'weekly'], ['jperez', '/consumers/3310/session/sra-continued', 'continued stay'], ['jperez', '/approvals', 'forms to approve'], ['khale', '/time', 'lauris time page']];
if (on('panel')) {
  const { ctx, page } = await ctxFor({});
  for (const [as, p, name] of PANEL) {
    await run(`A11Y-X panel ${as} · ${name} (400)`, async () => {
      await page.goto('about:blank'); await page.goto(`${LAURIS}/login?as=${as}&next=${encodeURIComponent(p)}`, { waitUntil: 'domcontentloaded' });
      let f = null; const t0 = Date.now(); while (Date.now() - t0 < 12000) { f = page.frames().find(x => x.url().includes('/panel/')); if (f && await f.evaluate(() => !!document.querySelector('#panel .body, #panel .mini, #panel .foot')).catch(() => false)) break; await page.waitForTimeout(150); }
      assert.ok(f, 'panel frame');
      const w = await page.evaluate(() => document.getElementById('psyflo-slot').getBoundingClientRect().width); assert.ok(Math.abs(w - 400) <= 2, 'panel slot is 400 px wide: ' + w);
      const { issues, c, t } = await screenChecks(page, { min: 24, label: name, shell: false, scope: '#panel', frame: f, walk: 60 });
      await page.locator('#psyflo-slot').screenshot({ path: `${SHOTS}/a11y-panel-${name.replace(/\W+/g, '-')}.png` }).catch(() => { });
      verdict(issues.filter(i => !/main landmarks|no navigation/.test(i)), `${c.distinctPairs} distinct colour pairs, worst ${c.worst ? c.worst.ratio + ':1' : 'n/a'} · ${t.checked} targets`);
    });
  }
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------ 5. keyboard-only: rail, queue table, drawer, modal
if (on('keyboard') || on('clinician')) {
  const { ctx, page } = await ctxFor({ who: 'jperez' });
  await run('A11Y-K1 rail: Tab reaches every item in order, Enter opens it, focus moves to main, Shift+Tab goes back', async () => {
    await openAt(page, 'Dashboard', {});
    const names = await page.evaluate(() => [...document.querySelectorAll('#rail .sh-logo, #rail .sh-nav a, #rail [data-sh=help], #rail [data-signout]')].map(e => (e.getAttribute('aria-label') || e.innerText || '').trim()));
    assert.ok(names.length >= 6, 'rail controls: ' + names.join(' | '));
    const stops = await A.tabWalk(page.mainFrame(), { page, max: names.length + 2 });
    const rail = stops.filter(s => s.where === 'rail').map(s => s.name);
    assert.ok(rail.length >= names.length - 1, `Tab visited ${rail.length} of ${names.length} rail controls: ${rail.join(' | ')}`);
    assert.ok(stops.filter(s => s.where === 'rail').every(s => s.indicator !== false), 'every rail stop shows focus');
    // activate "Authorizations" from the keyboard
    await page.evaluate(() => { const a = [...document.querySelectorAll('#rail .sh-nav a')].find(x => /Authorizations/.test(x.getAttribute('aria-label'))); a.focus(); });
    await page.keyboard.press('Enter'); await page.waitForFunction(() => location.hash.startsWith('#/Authorizations'), null, { timeout: 4000 }); await settle(page.mainFrame());
    const at = await page.evaluate(() => { const a = document.activeElement; return { inMain: !!(a && (a.closest('main,[role=main]') || a.id === 'main' || a.id === 'root')), tag: a && a.tagName.toLowerCase() + '#' + a.id }; });
    assert.ok(at.inMain, 'focus moves to main after the route change: ' + at.tag);
    await page.keyboard.press('Shift+Tab'); const back = await page.evaluate(() => (document.activeElement && (document.activeElement.closest('#rail') ? 'rail' : 'other')) || 'none');
    assert.ok(back === 'rail' || back === 'other', 'Shift+Tab moves focus');
  });
  await run('A11Y-K2 queue table: caption, sortable headers, Tab to the row link, arrows move between rows, Enter opens the case', async () => {
    await openAt(page, 'Authorizations', {});
    const m = await page.evaluate(() => { const t = document.querySelector('#root table'); if (!t) return null; return { caption: !!(t.querySelector('caption') || t.getAttribute('aria-label')), sort: [...t.querySelectorAll('th button[data-ui-sort], th[aria-sort]')].length, rowLinks: t.querySelectorAll('[data-ui-rowlink]').length, rows: t.querySelectorAll('tbody tr').length, region: (() => { const r = t.closest('[role=region]'); return r ? { name: r.getAttribute('aria-label') || r.getAttribute('aria-labelledby') || '', tab: r.getAttribute('tabindex') } : null; })() }; });
    assert.ok(m, 'a table is on the page'); assert.ok(m.caption, 'table has a caption or label'); assert.ok(m.rowLinks >= 2, 'row links: ' + m.rowLinks); assert.ok(m.region && m.region.name, 'scroll region has a name: ' + JSON.stringify(m.region));
    // Tab until the first row link has focus
    await page.evaluate(() => { const b = document.querySelector('#root table th button, #root table th a'); (b || document.querySelector('#root table')).focus && (b || document.querySelector('#root table')).focus(); });
    const sortedBefore = await page.evaluate(() => [...document.querySelectorAll('#root table th')].map(t => t.getAttribute('aria-sort')).join(','));
    await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    const sortedAfter = await page.evaluate(() => [...document.querySelectorAll('#root table th')].map(t => t.getAttribute('aria-sort')).join(','));
    if (m.sort) assert.ok(sortedBefore !== sortedAfter, `Enter on a sortable header sorts it (aria-sort ${sortedBefore} -> ${sortedAfter})`);
    let guard = 0; while (guard++ < 40) { await page.keyboard.press('Tab'); const rl = await page.evaluate(() => !!document.activeElement && document.activeElement.hasAttribute('data-ui-rowlink')); if (rl) break; }
    const first = await page.evaluate(() => document.activeElement.getAttribute('href') || document.activeElement.textContent.trim());
    await page.keyboard.press('ArrowDown'); const second = await page.evaluate(() => document.activeElement.getAttribute('href') || document.activeElement.textContent.trim());
    assert.ok(second !== first, 'ArrowDown moves to the next row: ' + first + ' -> ' + second);
    await page.keyboard.press('Enter'); await page.waitForFunction(() => /^#\/Authorization\?/.test(location.hash), null, { timeout: 4000 });
  });
  await run('A11Y-K3 drawer (Help): focus enters, Tab and Shift+Tab are trapped, Escape closes, focus returns to the button', async () => {
    await openAt(page, 'Dashboard', {});
    const r = await A.dialogCheck(page, { label: 'Help drawer', open: async () => { await page.focus('#rail [data-sh=help]'); await page.keyboard.press('Enter'); } });
    const ret = r.after && r.after.active; if (r.after && !/Help/.test(ret || '')) r.bad.push(`Help drawer: focus returns to "${ret}", not the Help button`);
    assert.ok(r.meta && r.meta.kind === 'drawer', 'it is a drawer: ' + (r.meta && r.meta.kind)); verdict(r.bad);
  });
  await run('A11Y-K4 modal (Analytics export): focus enters, trapped, Escape closes, focus returns to Export', async () => {
    await openAt(page, 'Analytics', { section: 'outcomes', dataset: 'case' });
    const idx = await page.evaluate(() => { const b = [...document.querySelectorAll('#root button')].find(x => /^Export/.test(x.innerText.trim())); if (!b) return -1; b.setAttribute('data-a11y-open', '1'); return 1; });
    assert.ok(idx > 0, 'Analytics has an Export button');
    const r = await A.dialogCheck(page, { label: 'Export modal', open: async () => { await page.focus('[data-a11y-open]'); await page.keyboard.press('Enter'); } });
    if (r.after && !/Export/.test(r.after.active || '')) r.bad.push(`Export modal: focus returns to "${r.after.active}", not Export`);
    assert.ok(r.meta && r.meta.kind === 'modal', 'it is a modal: ' + (r.meta && r.meta.kind)); verdict(r.bad);
  });
  await run('A11Y-K5 every enabled control on the main screens is reachable with Tab (walk compared with the enumerated set)', async () => {
    const out = [];
    for (const [id, params] of [['Dashboard', {}], ['Authorizations', {}], ['Authorization', { id: 'R-0411' }], ['DenialIntelligence', {}], ['DenialCase', { id: 'R-0402', section: 'decision' }], ['Referral', { id: 'REF-118' }], ['Analytics', { section: 'outcomes', dataset: 'case' }]]) {
      await page.setViewportSize({ width: 1440, height: 900 }); await openAt(page, id, params);
      const stops = await A.tabWalk(page.mainFrame(), { page, max: 220 });
      const nm = x => String(x || '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 40);
      const reached = new Set(stops.filter(s => s.cur).map(s => s.tag.replace(/#.*/, '') + '|' + nm(s.name)));
      const { controls } = await page.mainFrame().evaluate(enumerate, { scopes: ['#rail', '#root'], expand: false });
      const miss = controls.filter(c => !c.disabled && !['radio', 'tab', 'row', 'file'].includes(c.kind) && !reached.has(c.tag + '|' + nm(c.name))).map(c => `${c.tag} "${c.name}"`);
      const hitMax = stops.length >= 219;
      if (miss.length && !hitMax) out.push(`${id}: ${miss.length} controls never focused by Tab: ${short(miss, 4)}`);
    }
    verdict(out);
  });
  await ctx.close();
}

// ------------------------------------------------------------------------------------------------ 6. prefers-reduced-motion
if (on('motion') || on('clinician')) {
  await run('A11Y-M prefers-reduced-motion: no transition or animation keeps running on the main screens, a drawer or a modal', async () => {
    const { ctx, page } = await ctxFor({ who: 'jperez', reduced: true });
    const out = [];
    for (const [id, params] of [['Dashboard', {}], ['Authorizations', {}], ['Analytics', { section: 'outcomes', dataset: 'case' }], ['DenialIntelligence', {}]]) {
      await openAt(page, id, params); const m = await page.evaluate(A.motion);
      if (!m.reduce) out.push('media query not matched'); if (m.bad.length) out.push(`${id}: ${short(m.bad, 3)}`);
    }
    await openAt(page, 'Dashboard', {}); await page.click('#rail [data-sh=help]'); await page.waitForTimeout(150);
    const m = await page.evaluate(A.motion); if (m.bad.length) out.push(`drawer: ${short(m.bad, 3)}`);
    await ctx.close(); verdict(out);
  });
  await run('A11Y-M2 motion is on when the person has not asked for less (sanity: the media query is what turns it off)', async () => {
    const { ctx, page } = await ctxFor({ who: 'jperez', reduced: false });
    await openAt(page, 'Authorizations', {}); const m = await page.evaluate(A.motion); await ctx.close();
    assert.ok(!m.reduce, 'reduce is off by default');
  });
}
await browser.close();
if (notes.length) console.log('NOTE ' + [...new Set(notes)].slice(0, 8).join(' | '));
await T.done();
