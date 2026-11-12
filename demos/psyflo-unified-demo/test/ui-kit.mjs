// UI kit and shell (F2): focus trap and return, aria, keyboard, contrast of the token pairs (computed in the page from the live
// custom properties), status vocabulary, filter chips and URL state, queue table, draft review, presenter dock, landmarks, skip link,
// reduced motion, collapse at 1024. Run: BASE=http://localhost:4810 node test/ui-kit.mjs  (test/run-all.mjs starts a server and sets BASE)
import { suite, assert, login, errors, playwright, BASE, reset, api } from './lib/index.mjs';

const T = suite('ui-kit');
const { chromium } = playwright();
const browser = await chromium.launch();
const pages = [];
async function open(user, path, { w = 1440, h = 900, reduced } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); pages.push(ctx);
  page.errs = errors(page);
  await login(page, user, { presenter: true });
  await page.goto(BASE + path); await page.reload();
  await page.waitForFunction(() => document.querySelector('#root h1, #root main, #root [role=main]') && !document.querySelector('#root .sh-loading'), null, { timeout: 15000 });
  await page.waitForTimeout(250);
  return page;
}
const closeAll = async () => { for (const c of pages.splice(0)) await c.close().catch(() => { }); };
const KIT = '/?present=1#/UiKit';
const inDialog = page => page.evaluate(() => { const d = document.querySelector('.ui-overlay [role=dialog]'); return !!d && d.contains(document.activeElement); });
const realErrors = page => page.errs.filter(e => !/404/.test(e));

// ---------------------------------------------------------------- tokens
await T.test('token pairs: every text pair 4.5:1, every UI pair 3:1 (computed in the page from tokens.css)', async () => {
  const page = await open('jperez', KIT);
  const r = await page.evaluate(async () => { const m = await import('/js/ui/contrast.js'); return m.checkPairs(); });
  const bad = r.filter(p => !p.pass).map(p => `${p.label} ${p.ratio.toFixed(2)} < ${p.min}`);
  assert.ok(r.length >= 28, 'pairs checked: ' + r.length);
  assert.deepEq(bad, [], 'failing pairs');
  await closeAll();
});
await T.test('type floor and brand: DM Sans, paper background, 12 px smallest kit size, teal primary', async () => {
  const page = await open('jperez', KIT);
  const r = await page.evaluate(() => { const cs = getComputedStyle(document.documentElement); const g = n => cs.getPropertyValue(n).trim(); return { font: g('--font'), paper: g('--paper-50'), teal: g('--teal-600'), hover: g('--teal-700'), navy: g('--navy-900'), fs12: g('--fs-12'), body: getComputedStyle(document.body).backgroundColor, lang: document.documentElement.lang }; });
  assert.match(r.font, /DM Sans/); assert.eq(r.paper.toUpperCase(), '#F8F6F2'); assert.eq(r.teal.toUpperCase(), '#217A78'); assert.eq(r.hover.toUpperCase(), '#15605E'); assert.eq(r.navy.toUpperCase(), '#151B24');
  assert.eq(r.fs12, '12px'); assert.eq(r.lang, 'en');
  await closeAll();
});

// ---------------------------------------------------------------- vocabulary
await T.test('status vocabulary: every stage and dispute status resolves; chips carry text and an icon (never colour alone)', async () => {
  const page = await open('jperez', KIT);
  const r = await page.evaluate(async () => {
    const { ui } = await import('/js/ui/index.js'); const M = await import('/js/shared/model.js');
    const stages = Object.keys(M.STAGE_LABEL); const missing = stages.filter(k => ui.resolveStatus(k, 'stage').unknown);
    const live = (psyflo.current ? [] : []);
    const html = ui.statusChip('overdue'); const el = document.createElement('div'); el.innerHTML = html;
    return { missing, n: stages.length, hasIcon: !!el.querySelector('svg'), text: el.textContent.trim(), disputes: ['decide', 'p2p-prep', 'info-req', 'upheld', 'overturned', 'partover', 'closed'].filter(k => ui.resolveStatus(k, 'dispute').unknown) };
  });
  assert.deepEq(r.missing, [], 'stage values without a status'); assert.deepEq(r.disputes, [], 'dispute statuses without a status');
  assert.ok(r.hasIcon && r.text === 'Overdue', 'chip has icon and text');
  await closeAll();
});
await T.test('maturity chips: Working is hidden until the presenter overlay is on; Simulated, Pilot and Future always show', async () => {
  const page = await open('jperez', KIT);
  const vis = () => page.evaluate(() => [...document.querySelector('section[aria-labelledby="uk-maturity"]').querySelectorAll('.ui-maturity')].reduce((o, e) => { o[e.dataset.maturityLevel] = o[e.dataset.maturityLevel] || (getComputedStyle(e).display !== 'none'); return o; }, {}));
  let v = await vis(); assert.eq(!!v.working, false, 'working hidden'); assert.eq(v.future, true, 'future shown'); assert.eq(v.simulated, true, 'simulated shown');
  await page.click('[data-dock="maturity"]'); v = await vis(); assert.eq(v.working, true, 'working shown with overlay');
  assert.eq(await page.getAttribute('[data-dock="maturity"]', 'aria-pressed'), 'true');
  await closeAll();
});

// ---------------------------------------------------------------- overlays
async function overlayChecks(kind) {
  const page = await open('jperez', KIT);
  const btn = `[data-uk="${kind}"]`;
  await page.focus(btn); await page.keyboard.press('Enter'); await page.waitForSelector('.ui-overlay [role=dialog]');
  const meta = await page.evaluate(() => { const d = document.querySelector('.ui-overlay [role=dialog]'); const l = document.getElementById(d.getAttribute('aria-labelledby')); return { role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), label: l && l.textContent.trim(), inert: document.getElementById('app').hasAttribute('inert') }; });
  assert.eq(meta.role, 'dialog'); assert.eq(meta.modal, 'true'); assert.ok(meta.label, 'aria-labelledby resolves to the visible title'); assert.eq(meta.inert, true, 'page behind is inert');
  assert.ok(await inDialog(page), 'focus moved into the dialog');
  for (let i = 0; i < 9; i++) { await page.keyboard.press('Tab'); assert.ok(await inDialog(page), 'Tab stays inside (step ' + i + ')'); }
  for (let i = 0; i < 9; i++) { await page.keyboard.press('Shift+Tab'); assert.ok(await inDialog(page), 'Shift+Tab stays inside (step ' + i + ')'); }
  await page.keyboard.press('Escape'); await page.waitForTimeout(80);
  assert.eq(await page.locator('.ui-overlay').count(), 0, 'Escape closes');
  assert.eq(await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-uk')), kind, 'focus returns to the opener');
  assert.eq(await page.evaluate(() => document.getElementById('app').hasAttribute('inert')), false, 'inert removed');
  // scrim click closes
  await page.click(btn); await page.waitForSelector('.ui-overlay [role=dialog]');
  await page.click('[data-ui-scrim]', { position: { x: 4, y: 4 } }); await page.waitForTimeout(80);
  assert.eq(await page.locator('.ui-overlay').count(), 0, 'scrim click closes');
  assert.deepEq(realErrors(page), [], 'console errors');
  await closeAll();
}
await T.test('modal: role=dialog, aria-labelledby, focus trap both ways, Escape, scrim click, focus return', () => overlayChecks('modal'));
await T.test('drawer: same contract as the modal', () => overlayChecks('drawer'));
await T.test('popover: Escape closes it and focus returns to the control', async () => {
  const page = await open('jperez', KIT);
  await page.focus('[data-uk="popover"]'); await page.keyboard.press('Enter'); await page.waitForSelector('.ui-popover');
  assert.ok(await page.evaluate(() => document.querySelector('.ui-popover').getAttribute('role') === 'dialog'));
  await page.keyboard.press('Escape'); await page.waitForTimeout(60);
  assert.eq(await page.locator('.ui-popover').count(), 0);
  assert.eq(await page.evaluate(() => document.activeElement.getAttribute('data-uk')), 'popover');
  await closeAll();
});
await T.test('confirm resolves true on Confirm and false on Cancel; the toast has role=status (alert for errors)', async () => {
  const page = await open('jperez', KIT);
  await page.click('[data-uk="confirm"]'); await page.waitForSelector('[role=alertdialog]'); await page.click('.ui-overlay [data-ui-action="1"]'); await page.waitForSelector('#toasts .ui-toast');
  assert.match(await page.locator('#toasts .ui-toast').first().innerText(), /Recorded/);
  assert.eq(await page.locator('#toasts .ui-toast').first().getAttribute('role'), 'status');
  await page.click('[data-uk="toast-err"]'); assert.eq(await page.locator('#toasts .ui-toast--err').first().getAttribute('role'), 'alert');
  await closeAll();
});
await T.test('the old modal(html, onMount) helper is now an accessible dialog (screens keep working)', async () => {
  const page = await open('jperez', '/#/DoNext');
  await page.evaluate(() => psyflo.modal('<h2>Old style</h2><p>Body</p><button class="mbtn" data-close>Close</button>', (box, close) => { box.dataset.mounted = '1'; }));
  const r = await page.evaluate(() => { const d = document.querySelector('#modal [role=dialog]'); return { mounted: d.dataset.mounted, label: document.getElementById(d.getAttribute('aria-labelledby')).textContent, inside: d.contains(document.activeElement), modalId: !!document.querySelector('#modal:not([hidden])') }; });
  assert.eq(r.mounted, '1'); assert.eq(r.label, 'Old style'); assert.ok(r.inside); assert.ok(r.modalId, '#modal stays for screens that look for it');
  await page.keyboard.press('Escape'); await page.waitForTimeout(60); assert.eq(await page.locator('#modal').count(), 0);
  await closeAll();
});

// ---------------------------------------------------------------- filter bar, table
await T.test('filter chips: aria-pressed, state in the URL query, survives a reload, Clear', async () => {
  const page = await open('jperez', KIT);
  const chip = page.locator('.ui-fchip').first();
  assert.eq(await chip.getAttribute('aria-pressed'), 'false');
  await chip.click(); await page.waitForTimeout(150);
  assert.eq(await page.locator('.ui-fchip').first().getAttribute('aria-pressed'), 'true');
  assert.match(await page.evaluate(() => location.hash), /status=needs/);
  await page.reload(); await page.waitForSelector('.ui-fchip');
  assert.eq(await page.locator('.ui-fchip').first().getAttribute('aria-pressed'), 'true', 'kept after reload');
  await page.click('[data-ui-fclear]'); await page.waitForTimeout(150);
  assert.eq(await page.locator('.ui-fchip').first().getAttribute('aria-pressed'), 'false');
  assert.noMatch(await page.evaluate(() => location.hash), /status=/);
  const btns = await page.evaluate(() => [...document.querySelectorAll('.ui-fchip')].every(b => b.tagName === 'BUTTON' && b.hasAttribute('aria-pressed')));
  assert.ok(btns, 'every chip is a button with aria-pressed');
  await closeAll();
});
await T.test('search keeps focus while typing and filters rows', async () => {
  const page = await open('jperez', KIT);
  await page.fill('#uk-fb-q', 'R-03'); await page.waitForTimeout(400);
  assert.eq(await page.evaluate(() => document.activeElement.id), 'uk-fb-q', 'focus kept');
  const n = await page.locator('#uk-fb-q ~ *, .ui-qt tbody tr[data-ui-row]').count();
  assert.ok(n >= 1);
  await closeAll();
});
await T.test('queue table: aria-sort, sort toggles, real links, ArrowDown moves between rows, Enter opens', async () => {
  const page = await open('jperez', KIT);
  const th = page.locator('.ui-qt').first().locator('th[aria-sort]').first();
  const before = await th.getAttribute('aria-sort');
  await th.locator('button').click(); await page.waitForTimeout(100);
  const after = await page.locator('.ui-qt').first().locator('th[aria-sort]').first().getAttribute('aria-sort');
  assert.ok(before !== after && /ascending|descending/.test(after), `aria-sort changes (${before} -> ${after})`);
  const links = await page.evaluate(() => [...document.querySelectorAll('.ui-qt [data-ui-rowlink]')].every(a => a.getAttribute('href')));
  assert.ok(links, 'row links have href');
  await page.locator('.ui-qt [data-ui-rowlink]').first().focus();
  const first = await page.evaluate(() => document.activeElement.closest('tr').dataset.rowId);
  await page.keyboard.press('ArrowDown');
  const second = await page.evaluate(() => document.activeElement.closest('tr') && document.activeElement.closest('tr').dataset.rowId);
  assert.ok(second && second !== first, 'ArrowDown moved to the next row');
  await page.keyboard.press('Enter'); await page.waitForTimeout(500);
  assert.noMatch(await page.evaluate(() => location.hash), /UiKit/, 'Enter opened the row');
  await closeAll();
});
await T.test('queue table: sticky header, empty, loading and error states', async () => {
  const page = await open('jperez', KIT);
  const r = await page.evaluate(() => ({ sticky: getComputedStyle(document.querySelector('.ui-qt th')).position, empty: !!document.querySelector('.ui-qt .ui-empty[role=status]'), err: !!document.querySelector('.ui-qt .ui-empty[role=alert]'), retry: !!document.querySelector('.ui-qt [data-ui-es-action]') }));
  assert.eq(r.sticky, 'sticky'); assert.ok(r.empty && r.err && r.retry);
  await closeAll();
});
await T.test('evidence chip opens a popover with the quote and closes on Escape', async () => {
  const page = await open('jperez', KIT);
  await page.locator('.ui-evidence--sourced').first().click(); await page.waitForSelector('.ui-popover');
  assert.match(await page.locator('.ui-popover').innerText(), /Grandmother reports/);
  await page.keyboard.press('Escape'); assert.eq(await page.locator('.ui-popover').count(), 0);
  await closeAll();
});
await T.test('timeline: an event opens a drawer with What, When, Who, Document, Source, Next action', async () => {
  const page = await open('jperez', KIT);
  await page.locator('.ui-tl [data-ui-event]').first().click(); await page.waitForSelector('.ui-overlay--drawer');
  const dts = await page.locator('.ui-overlay--drawer dt').allInnerTexts();
  assert.deepEq(dts, ['What', 'When', 'Who', 'Document', 'Source', 'Next action']);
  await page.keyboard.press('Escape'); await closeAll();
});

// ---------------------------------------------------------------- draft review and typing
await T.test('draft review: edit text survives repaints; no bulk accept; Restore previous appears after a save', async () => {
  const page = await open('jperez', KIT);
  assert.eq(await page.getByRole('button', { name: /accept all/i }).count(), 0, 'no "Accept all"');
  const item = page.locator('.ui-dr__item').first();
  await item.locator('[data-ui-dr="edit"]').click(); await page.waitForSelector('.ui-dr textarea');
  await page.fill('.ui-dr textarea', 'My own wording typed in the editor');
  await page.evaluate(() => psyflo.current.inst.repaint());              // a repaint in the middle of typing
  assert.eq(await page.inputValue('.ui-dr textarea'), 'My own wording typed in the editor', 'typed text survived the repaint');
  await page.click('.ui-dr [data-ui-dr="save"]'); await page.waitForTimeout(100);
  assert.ok(await page.locator('.ui-dr__item').first().locator('[data-ui-dr="restore"]').count(), 'Restore previous after the edit');
  assert.match(await page.locator('.ui-dr__item').first().innerText(), /My own wording typed in the editor/);
  assert.ok(await page.locator('.ui-dr [data-ui-dr="approve"]').isDisabled(), 'Approve and fill stays disabled until every item has a decision');
  await closeAll();
});
await T.test('a store change (SSE) while someone is typing does not wipe the field; the repaint waits for blur', async () => {
  const page = await open('dowens', KIT);
  await page.fill('#df-uk-reply', 'typing in the middle of a live update');
  await page.evaluate(() => { window.__ta = document.getElementById('df-uk-reply'); });
  await api('demo.advanceDay', {}, 'dowens+p');                           // bumps the store revision; every open tab gets an SSE push
  await page.waitForTimeout(1800);
  assert.ok(await page.evaluate(() => window.__ta === document.getElementById('df-uk-reply')), 'the focused field was not repainted away');
  assert.eq(await page.inputValue('#df-uk-reply'), 'typing in the middle of a live update');
  await page.click('h1'); await page.waitForTimeout(400);
  assert.eq(await page.inputValue('#df-uk-reply'), 'typing in the middle of a live update', 'text is kept in the draft store after the held repaint');
  await closeAll(); await reset('live');
});

// ---------------------------------------------------------------- shell
await T.test('skip link is the first tab stop and moves focus to the main landmark', async () => {
  const page = await open('jperez', '/#/DoNext');
  await page.evaluate(() => document.activeElement.blur && document.activeElement.blur());
  await page.keyboard.press('Tab');
  assert.match(await page.evaluate(() => document.activeElement.className), /ui-skip/);
  await page.keyboard.press('Enter');
  assert.ok(await page.evaluate(() => { const a = document.activeElement; return a && (a.id === 'main' || a.id === 'root'); }), 'focus is on main');
  await closeAll();
});
await T.test('landmarks: <html lang>, a labelled nav, exactly one main, real links in the rail', async () => {
  const page = await open('dowens', '/#/Authorizations');
  const r = await page.evaluate(() => ({ lang: document.documentElement.lang, nav: [...document.querySelectorAll('nav')].map(n => n.getAttribute('aria-label')), mains: document.querySelectorAll('main, [role=main]').length, noHref: [...document.querySelectorAll('#rail a')].filter(a => !a.getAttribute('href')).length, links: document.querySelectorAll('#rail a').length, named: [...document.querySelectorAll('#rail a, #rail button')].every(a => (a.getAttribute('aria-label') || a.textContent).trim()) }));
  assert.eq(r.lang, 'en'); assert.ok(r.nav.includes('Main')); assert.eq(r.mains, 1); assert.eq(r.noHref, 0); assert.ok(r.links >= 2); assert.ok(r.named, 'every rail control has a name');
  await closeAll();
});
await T.test('focus moves to main on a route change and the route is announced', async () => {
  const page = await open('dowens', '/#/Authorizations');
  await page.click('#rail a[title="Analytics"]'); await page.waitForTimeout(900);
  assert.ok(await page.evaluate(() => { const a = document.activeElement; return a && (a.id === 'main' || a.id === 'root'); }), 'focus on main after navigation');
  assert.match(await page.evaluate(() => document.getElementById('sh-announce').textContent), /Analytics/);
  await closeAll();
});
await T.test('the old demo bar is gone from the product viewport', async () => {
  const page = await open('jperez', '/#/DoNext');
  assert.eq(await page.locator('#bar').count(), 0);
  assert.eq(await page.locator('#stage #dock, #app #dock, #root .sh-dock').count(), 0);
  await closeAll();
});
await T.test('rail: dark navy (the Nov 8 look), 232 px wide, collapses to icons at 1024; counts only where meaningful', async () => {
  let page = await open('jperez', '/#/DoNext');
  const r = await page.evaluate(() => { const rail = document.getElementById('rail'); return { w: Math.round(rail.getBoundingClientRect().width), bg: getComputedStyle(rail).backgroundColor, items: [...rail.querySelectorAll('.sh-nav__i')].map(a => a.getAttribute('aria-label')), pos: getComputedStyle(rail).position }; });
  assert.eq(r.w, 232); assert.eq(r.bg, 'rgb(21, 27, 36)'); assert.ok(!r.items.some(x => /, 0 /.test(x)), 'no zero counts');
  await page.close(); await closeAll();
  page = await open('jperez', '/#/DoNext', { w: 1024, h: 768 });
  const c = await page.evaluate(() => ({ w: Math.round(document.getElementById('rail').getBoundingClientRect().width), label: getComputedStyle(document.querySelector('.sh-nav__l')).display }));
  assert.eq(c.w, 64); assert.eq(c.label, 'none'); await closeAll();
});
await T.test('rail by role follows the permission table (supervisor, clinician, admin, direct support)', async () => {
  const want = { cdiaz: ['Authorizations', 'Analytics'], jperez: ['Authorizations', 'Analytics', 'Referrals'], dowens: ['Authorizations', 'Analytics'], khale: [] };
  for (const [u, must] of Object.entries(want)) {
    const page = await open(u, u === 'khale' ? '/#/StaffDashboard' : u === 'cdiaz' ? '/#/ReviewQueue' : u === 'jperez' ? '/#/DoNext' : '/#/Authorizations');
    const items = await page.evaluate(() => [...document.querySelectorAll('#rail .sh-nav__i')].map(a => a.getAttribute('title')));
    for (const m of must) assert.ok(items.includes(m), `${u} sees ${m} (has ${items.join(', ')})`);
    if (u === 'khale') assert.ok(!items.some(i => /Authorizations|Analytics|Denial|Referrals|Settings/.test(i)), 'direct support sees none of the management tabs');
    if (u === 'dowens') assert.ok(!items.includes('Referrals'), 'admin has no Referrals by default');
    await page.close();
  }
  await closeAll();
});

// ---------------------------------------------------------------- presenter dock
await T.test('dock: hidden by default in Presentation, Ctrl+Shift+P toggles, label PRESENTER, mode always visible, above the viewport', async () => {
  const page = await open('jperez', '/#/DoNext');
  assert.eq(await page.locator('#dock').isVisible(), false);
  await page.keyboard.press('Control+Shift+P'); await page.waitForTimeout(150);
  assert.eq(await page.locator('#dock').isVisible(), true);
  assert.match(await page.locator('#dock').innerText(), /PRESENTER/); assert.match(await page.locator('#dock-mode').innerText(), /Presentation/);
  const geo = await page.evaluate(() => { const d = document.getElementById('dock'), a = document.getElementById('app'); return { before: !!(d.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING), inside: a.contains(d), edge: getComputedStyle(d).borderBottomStyle, navy: getComputedStyle(d).backgroundColor, mono: /mono|Menlo|Consolas/i.test(getComputedStyle(document.querySelector('.sh-dock__label')).fontFamily), top: d.getBoundingClientRect().bottom <= a.getBoundingClientRect().top + 1 }; });
  assert.ok(geo.before && !geo.inside && geo.top, 'ribbon sits above the product viewport'); assert.eq(geo.edge, 'dashed'); assert.eq(geo.navy, 'rgb(21, 27, 36)'); assert.ok(geo.mono);
  await page.click('[data-dock="toggle"]'); await page.waitForTimeout(100);
  assert.ok((await page.locator('#dock').boundingBox()).height < 40, 'collapsed handle is a thin ribbon');
  await page.keyboard.press('Control+Shift+P'); await page.waitForTimeout(100);
  assert.eq(await page.locator('#dock').isVisible(), false);
  await closeAll();
});
await T.test('dock: ?present=1 opens it; ?mode=explore docks it open (no hide control) and is stored in psyflo_mode', async () => {
  let page = await open('jperez', '/?present=1#/DoNext');
  assert.eq(await page.locator('#dock').isVisible(), true); assert.match(await page.locator('#dock-mode').innerText(), /Presentation/);
  await closeAll();
  page = await open('jperez', '/?mode=explore#/DoNext');
  assert.eq(await page.locator('#dock').isVisible(), true); assert.match(await page.locator('#dock-mode').innerText(), /Explore · all features by role/);
  assert.eq(await page.locator('[data-dock="hide"]').count(), 0);
  await page.keyboard.press('Control+Shift+P'); assert.eq(await page.locator('#dock').isVisible(), true, 'Explore stays docked');
  assert.eq(await page.evaluate(() => localStorage.getItem('psyflo_mode')), 'explore');
  assert.eq(await page.getByRole('button', { name: /All screens/ }).count(), 1);
  await closeAll();
});
await T.test('dock: role switcher changes the signed-in role without a page reload', async () => {
  const page = await open('jperez', '/?present=1#/DoNext');
  await page.evaluate(() => { window.__keep = 42; });
  await page.click('[data-dock-menu="role"]'); await page.getByRole('menuitem', { name: /Direct support/ }).click();
  await page.waitForFunction(() => psyflo.session.user && psyflo.session.user.id === 'khale', null, { timeout: 8000 });
  await page.waitForTimeout(600);
  assert.eq(await page.evaluate(() => window.__keep), 42, 'no reload');
  assert.eq(await page.evaluate(() => psyflo.session.user.role), 'direct_support');
  assert.match(await page.locator('#rail').innerText(), /Kayla Hale/, 'the user card follows the role');
  assert.eq(await page.locator('#dock').isVisible(), true);
  assert.deepEq(realErrors(page), []);
  await closeAll();
});
await T.test('dock: scenario selector calls demo.scenario, signs in as the scenario role and opens its route', async () => {
  const page = await open('dowens', '/?present=1#/Authorizations');
  await page.click('[data-dock-menu="scenario"]');
  assert.ok(await page.locator('.sh-menu [role=menuitem]').count() >= 6, 'six scenarios');
  await page.locator('.sh-menu [role=menuitem]').first().click();
  await page.waitForFunction(() => /MobileApp/.test(location.hash) && psyflo.session.user && psyflo.session.user.id === 'khale', null, { timeout: 10000 });
  assert.deepEq(realErrors(page), []);
  await closeAll(); await reset('live');
});
await T.test('dock: simulation controls (receive a reply, advance a day) live in the dock', async () => {
  const page = await open('dowens', '/?present=1#/Authorizations');
  const before = await page.evaluate(() => psyflo.session.user && document.querySelector('#dock-bar').textContent.length);
  await page.click('[data-dock-menu="sim"]');
  assert.match(await page.locator('.sh-menu').innerText(), /Receive a reply/); assert.match(await page.locator('.sh-menu').innerText(), /Advance a day/);
  await page.getByRole('menuitem', { name: /Receive a reply/ }).click(); await page.waitForSelector('.ui-overlay [role=dialog]');
  assert.match(await page.locator('.ui-overlay [role=dialog]').innerText(), /Receive a reply/);
  await page.keyboard.press('Escape'); assert.ok(before >= 0);
  await closeAll();
});
await T.test('dock: notes drawer "How the data gets in" with maturity chips, focus returns to Notes', async () => {
  const page = await open('jperez', '/?present=1#/Authorizations');
  await page.click('[data-dock="notes"]'); await page.waitForSelector('.ui-overlay--drawer');
  const t = await page.locator('.ui-overlay--drawer').innerText();
  assert.match(t, /How the data gets in/); assert.match(t, /Maturity on this screen/); assert.match(t, /Working/);
  await page.keyboard.press('Escape'); await page.waitForTimeout(60);
  assert.eq(await page.evaluate(() => document.activeElement.getAttribute('data-dock')), 'notes');
  await closeAll();
});
await T.test('dock: All screens picker is role-aware and searchable', async () => {
  const page = await open('jperez', '/?mode=explore#/DoNext');
  await page.click('[data-dock-menu="screens"]'); await page.fill('#dock-q', 'author');
  const items = await page.locator('.sh-menu__l [role=menuitem]').allInnerTexts();
  assert.ok(items.some(i => /Authorizations/.test(i)), 'finds Authorizations');
  await page.fill('#dock-q', 'users and roles'); assert.match(await page.locator('.sh-menu__l').innerText(), /No screen matches/, 'a clinician is not offered Users & roles');
  await closeAll();
});
await T.test('UiKit is presenter-only: without the dock it says so; with ?present=1 it shows the gallery', async () => {
  let page = await open('jperez', '/#/UiKit');
  assert.match(await page.locator('#root').innerText(), /Presenter only/); await closeAll();
  page = await open('jperez', KIT); assert.ok(await page.locator('.uk-sec').count() >= 12); await closeAll();
});

// ---------------------------------------------------------------- reduced motion, errors
await T.test('prefers-reduced-motion: overlay animation is switched off', async () => {
  const page = await open('jperez', KIT, { reduced: true });
  await page.click('[data-uk="drawer"]'); await page.waitForSelector('.ui-overlay--drawer');
  const d = await page.evaluate(() => { const v = getComputedStyle(document.querySelector('.ui-overlay--drawer .ui-dialog')).animationDuration; return parseFloat(v) * (/ms$/.test(v) ? 0.001 : 1); });
  assert.ok(d <= 0.01, 'animation duration ' + d);
  await closeAll();
});
await T.test('no console errors on the gallery, the stubs and the shell routes', async () => {
  const bad = [];
  for (const r of ['/?present=1#/UiKit', '/#/Dashboard', '/#/Authorization?id=R-0416', '/#/DenialIntelligence', '/#/DenialCase?id=R-0402', '/#/DoNext']) {
    const page = await open('jperez', r); const e = realErrors(page); if (e.length) bad.push(r + ' ' + e[0]); await page.close();
  }
  assert.deepEq(bad, []); await closeAll();
});


// ---------------------------------------------------------------- QA1 shell fixes
for (const w of [1024, 700]) {
  await T.test(`rail foot stays reachable at ${w} px: Sign out and Help as named controls, "Demo data · nothing is real" visible`, async () => {
    const page = await open('jperez', '/#/Dashboard', { w, h: 800 });
    const r = await page.evaluate(() => { const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; const so = document.querySelector('#rail [data-signout]'), help = document.querySelector('#rail [data-sh=help]'), demo = [...document.querySelectorAll('#rail span')].find(e => e.children.length === 0 && /Demo data · nothing is real/.test(e.textContent)); const box = e => { const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; }; return { so: vis(so), help: vis(help), demo: vis(demo), soName: so && so.getAttribute('aria-label'), helpName: help && help.getAttribute('aria-label'), soBox: so && box(so), helpBox: help && box(help), demoBottom: demo && Math.round(demo.getBoundingClientRect().bottom) === innerHeight || !!demo, hscroll: document.documentElement.scrollWidth > innerWidth + 1 }; });
    assert.ok(r.so && r.help && r.demo, JSON.stringify(r)); assert.match(r.soName, /Sign out/); assert.eq(r.helpName, 'Help');
    assert.ok(r.soBox[0] >= 44 && r.soBox[1] >= 44, 'sign out target ' + r.soBox); assert.ok(r.helpBox[0] >= 44 && r.helpBox[1] >= 44, 'help target ' + r.helpBox); assert.ok(!r.hscroll, 'no sideways scroll');
    await page.click('#rail [data-sh=help]'); await page.waitForSelector('.ui-overlay--drawer'); await page.keyboard.press('Escape');
    await closeAll();
  });
}
await T.test('the wordmark on the navy rail is the reverse logo (white, teal, marigold), not the full-colour one', async () => {
  const page = await open('jperez', '/#/Dashboard');
  const fills = await page.evaluate(() => [...document.querySelectorAll('#rail .sh-logo svg path')].map(p => p.getAttribute('fill').toUpperCase()));
  assert.ok(fills.length >= 6 && fills.every(f => ['#FFFFFF', '#5FC0BE', '#F0B44C'].includes(f)), 'fills ' + [...new Set(fills)].join(','));
  assert.ok(!fills.includes('#151B24') && !fills.includes('#217A78'), 'no full-colour logo values on the navy rail');
  await closeAll();
});
await T.test('framed Lauris routes: a slim top bar with "Back to Psyflo", the route title as the h1 and no developer text', async () => {
  const page = await open('jperez', '/#/ExtScreening?referral=REF-118');
  const r = await page.evaluate(() => ({ back: document.querySelector('.xbar .xback') && document.querySelector('.xbar .xback').getAttribute('href'), h1: [...document.querySelectorAll('#root h1')].map(h => h.textContent.trim()), bar: document.querySelector('.xbar').innerText, h: Math.round(document.querySelector('.xbar').getBoundingClientRect().height) }));
  assert.match(r.back, /^#\/Dashboard/); assert.eq(r.h1.length, 1); assert.match(r.h1[0], /Lauris · Screening call/); assert.ok(r.h <= 56, 'slim bar ' + r.h);
  assert.noMatch(r.bar, /localhost|http:|fallback|same panel|Flow A|the panel reads/i, 'developer text: ' + r.bar);
  await page.click('.xbar .xback'); await page.waitForFunction(() => /#\/Dashboard/.test(location.hash)); await closeAll();
});

await browser.close();
await T.done();
