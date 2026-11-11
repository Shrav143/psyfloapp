// P19.5 visual tests (review/06-demo-and-qa.md d4, QA1): a screenshot of every major screen and state at 1440x900, 1024x768, 390x844 (and 360x740)
// and the 400 px panel beside the mock Lauris, with automatic checks on each: no text over text, no overflow:hidden cutting text, no horizontal page
// scroll, no text under 12 px, no blank screen, no console errors. Long tables (60 generated rows), empty states, error states, denied states,
// modals and drawers (at 400, 1024 and 1440). One contact sheet per surface goes to SHOTS (contact-*.png) for people to look at.
//   BASE=http://localhost:4920 SHOTS=<dir> node test/visual.mjs        VISUAL_ONLY=<regex on the test title>   VISUAL_SKIP_SHEETS=1
import fs from 'node:fs';
import path from 'node:path';
import { suite, assert, playwright, login, BASE, LAURIS, api, SHOTS, errors } from './lib/index.mjs';
import * as A from './lib/a11y.mjs';
import { installProbes, settle } from './lib/audit.mjs';

const T = suite('visual');
const only = process.env.VISUAL_ONLY ? new RegExp(process.env.VISUAL_ONLY) : null;
const DIR = path.join(SHOTS, 'vis'); fs.mkdirSync(DIR, { recursive: true });
await api('demo.scenario', { id: 'base-live' }, 'dowens+p').catch(() => { });          // a known start, whatever ran before on this server
const { chromium } = playwright();
const browser = await chromium.launch();
const READY = () => document.querySelector('#root main, #root h1, #root [role=main]') && !document.querySelector('#root .sh-loading');
const qs = p => Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
const hashOf = (id, p = {}) => `/#/${id}${Object.keys(p).length ? '?' + qs(p) : ''}`;
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
const short = (a, n = 3) => a.slice(0, n).join('; ') + (a.length > n ? `; +${a.length - n} more` : '');
const sheets = {};                                  // surface -> tiles
const NOTES = [];
const addTile = (surface, file, label, issues) => { (sheets[surface] = sheets[surface] || []).push({ file, label, issues: issues ? issues.length + ' issue(s)' : '' }); };
const resetTo = async id => { try { await api('demo.scenario', { id }, 'dowens+p'); } catch (e) { console.log('  (fixture ' + id + ': ' + e.message + ')'); } };

async function newPage({ who, portal, width = 1440, height = 900, touch = false, present = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 2 : 1 });
  await installProbes(ctx);
  const page = await ctx.newPage(); page.errs = errors(page); page.ctx = ctx;
  if (who) await login(page, who, { presenter: present });
  if (portal) {
    await page.goto(BASE + '/#/Login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(async w => { const r = await fetch('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(w) }); const j = await r.json(); localStorage.setItem('psyflo_session', JSON.stringify({ token: j.token, actor: j.actor })); localStorage.setItem('psyflo_dock', 'open'); if (w.schoolUser) localStorage.setItem('psyflo_school_user', w.schoolUser); }, portal);
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
  return page;
}
async function openAt(page, id, params = {}) { page.errs.length = 0; await page.goto('about:blank'); await page.goto(BASE + hashOf(id, params), { waitUntil: 'domcontentloaded' }); await page.waitForFunction(READY, null, { timeout: 15000 }); await settle(page.mainFrame()); }
const expandAll = page => page.evaluate(() => document.querySelectorAll('#root details:not([open])').forEach(d => { d.open = true; }));

function issuesOf(c, errs, { ph = 12, allowClipped = false } = {}) {
  const o = [];
  if (c.blank) o.push('blank or still loading');
  if (c.hscroll) o.push(`horizontal page scroll ${c.hscroll}px`);
  if (c.overlaps.length) o.push(`text over text: ${short(c.overlaps, 2)}`);
  if (c.clippedCount && !allowClipped) o.push(`${c.clippedCount} elements cut text with overflow hidden: ${short(c.clipped, 2)}`);
  if (c.smallCount) o.push(`${c.smallCount} text nodes under ${ph}px: ${short(c.small, 3)}`);
  if (c.broken.length) o.push(`broken images: ${short(c.broken)}`);
  if (errs.length) o.push(`console errors: ${short(errs, 2)}`);
  if (c.ellipsis.length) NOTES.push('ellipsis without a title: ' + short(c.ellipsis, 2));
  return o;
}
// screenshot (viewport) + checks of the current page
async function shoot(page, { name, surface, label, scope = null, frame = null, full = false, slot = null }) {
  const f = frame || page.mainFrame();
  await settle(f, { quiet: 200, max: 2000 });
  const c = await f.evaluate(A.layoutChecks, { scope });
  const file = path.join(DIR, slug(name) + '.png');
  if (slot) await page.locator(slot).screenshot({ path: file }).catch(() => { }); else await page.screenshot({ path: file, fullPage: full });
  const issues = issuesOf(c, page.errs.slice());
  addTile(surface, file, label || name, issues);
  return { issues, c, file };
}
const run = (id, fn) => (!only || only.test(id)) ? T.test(id, fn) : Promise.resolve();
const verdict = issues => { if (issues.length) throw new Error(issues.join(' · ')); };

// ------------------------------------------------------------------------------------------------ 1. platform screens, 1440x900 and 1024x768
const PLATFORM = {
  clinician: ['jperez', [
    ['MyWork', { section: 'todo' }], ['MyWork', { section: 'review' }], ['MyWork', { section: 'team' }], ['MyWork', { section: 'referrals' }],
    ['Authorizations', {}], ['Authorization', { id: 'R-0411' }], ['Authorization', { id: 'R-0402' }], ['Authorization', { id: 'R-0399', section: 'submission' }], ['Authorization', { id: 'R-0391' }], ['Authorization', { id: 'R-0388' }], ['Authorization', { id: 'R-0384' }],
    ['DenialIntelligence', {}], ['DenialCase', { id: 'R-0402', section: 'decision' }], ['DenialCase', { id: 'R-0402', section: 'evidence' }], ['DenialCase', { id: 'R-0402', section: 'options' }], ['DenialCase', { id: 'R-0402', section: 'action', action: 'options' }], ['DenialCase', { id: 'R-0402', section: 'history' }],
    ['DenialCase', { id: 'R-0408', section: 'action', action: 'info' }], ['DenialCase', { id: 'R-0388', section: 'action', action: 'p2p' }], ['DenialCase', { id: 'R-0384', section: 'action', action: 'appeal' }],
    ['Referrals', {}], ['Referral', { id: 'REF-118' }], ['Referral', { id: 'REF-118', panel: 'eligibility' }], ['Referral', { id: 'REF-121' }],
    ['Analytics', { section: 'outcomes', dataset: 'case' }], ['Analytics', { section: 'outcomes', dataset: 'illustrative' }], ['Analytics', { section: 'payer', dataset: 'case' }], ['Analytics', { section: 'population', dataset: 'illustrative' }]]],
  supervisor: ['cdiaz', [['MyWork', { section: 'review' }], ['MyWork', { section: 'team' }], ['Authorizations', {}], ['Authorization', { id: 'R-0411' }], ['Analytics', { section: 'outcomes' }]]],
  admin: ['dowens', [['MyWork', { section: 'todo' }], ['Authorizations', {}], ['Authorization', { id: 'R-0402' }], ['DenialIntelligence', {}], ['DenialCase', { id: 'R-0402', section: 'decision' }], ['Analytics', { section: 'outcomes' }], ['Analytics', { section: 'payer' }],
    ...['people', 'roles', 'units', 'rules', 'audit', 'family', 'presenter'].map(tab => ['Settings', { tab }])]],
  direct_support: ['khale', [['MyWork', { section: 'day' }], ['ExtHome', {}], ['ExtDPN', {}]]]
};
for (const [role, [who, routes]] of Object.entries(PLATFORM)) {
  const page = await newPage({ who });
  for (const [vw, vh] of [[1440, 900], [1024, 768]]) {
    await page.setViewportSize({ width: vw, height: vh });
    for (const [id, params] of routes) {
      const label = `${role} · ${id}${Object.keys(params).length ? '?' + qs(params) : ''}`;
      await run(`P19.5 visual · ${label} (${vw})`, async () => {
        await openAt(page, id, params);
        if (/^(Authorization|DenialCase|Referral)$/.test(id)) await expandAll(page);
        const r = await shoot(page, { name: `${role}-${id}-${qs(params)}-${vw}`, surface: `platform-${vw}`, label: `${label} · ${vw}`, full: false });
        verdict(r.issues);
      });
    }
  }
  await page.ctx.close();
}
// later checkpoints of the T.W. thread: R-0416 as a draft, signed, sent
{
  const page = await newPage({ who: 'jperez' });
  for (const fx of ['tw-isp-ready', 'tw-signed', 'tw-sent']) {
    await resetTo(fx);
    for (const [vw, vh] of [[1440, 900], [1024, 768]]) {
      await page.setViewportSize({ width: vw, height: vh });
      await run(`P19.5 visual · clinician@${fx} · Authorization?id=R-0416 (${vw})`, async () => {
        await openAt(page, 'Authorization', { id: 'R-0416', section: 'submission' }); await expandAll(page);
        verdict((await shoot(page, { name: `clin-${fx}-R-0416-${vw}`, surface: `platform-${vw}`, label: `clinician@${fx} · Authorization R-0416 · ${vw}` })).issues);
      });
    }
  }
  await page.ctx.close(); await resetTo('base-live');
}

// ------------------------------------------------------------------------------------------------ 2. long tables: 60 generated rows (sticky header, sort works, no clipped cell)
{
  const page = await newPage({ who: 'jperez' });
  const inflate = () => page.evaluate(async () => {
    const { api } = await import('/js/api.js'); const s = api.state; const base = JSON.parse(JSON.stringify(s.requests)); let n = 0;
    while (s.requests.length < 60) { const b = base[n % base.length]; s.requests.push({ ...JSON.parse(JSON.stringify(b)), id: 'R-09' + String(50 + n).padStart(2, '0') }); n++; }
    const dis = JSON.parse(JSON.stringify(s.disputes || [])); let m = 0; while (dis.length && s.disputes.length < 60) { const d = dis[m % dis.length]; s.disputes.push({ ...JSON.parse(JSON.stringify(d)), id: 'DI-09' + String(50 + m).padStart(2, '0') }); m++; }
    const refs = JSON.parse(JSON.stringify(s.referrals)).filter(r => ['needs_screening', 'waiting_on_school', 'screening_booked'].includes(r.stage)); let k = 0; while (refs.length && s.referrals.length < 80) { const b = refs[k % refs.length]; s.referrals.push({ ...JSON.parse(JSON.stringify(b)), id: 'REF-9' + String(50 + k).padStart(2, '0') }); k++; }
    window.psyflo.current.inst.repaint();
    return { requests: s.requests.length, disputes: (s.disputes || []).length, referrals: s.referrals.length };
  });
  for (const [vw, vh] of [[1440, 900], [1024, 768]]) {
    await page.setViewportSize({ width: vw, height: vh });
    for (const [id, label, shotName] of [['Authorizations', 'Authorizations queue', 'auth'], ['DenialIntelligence', 'Denial Intelligence queue', 'denials'], ['Referrals', 'Referrals queue', 'referrals']]) {
      await run(`P19.5 visual · long table · ${label}, 60 rows (${vw})`, async () => {
        await openAt(page, id, {}); const counts = await inflate(); await page.waitForTimeout(300);
        const info = await page.evaluate(async () => {
          const t = document.querySelector('#root table'); if (!t) return null;
          const rows = t.querySelectorAll('tbody tr').length; const reg = t.closest('[role=region]'); const more = [...document.querySelectorAll('#root button')].filter(b => /show \d+ more|show more/i.test(b.innerText)).length;
          const sc = reg && reg.scrollHeight > reg.clientHeight + 20 ? reg : null; const th = t.querySelector('thead th');
          let sticky = null;
          if (sc) { sc.scrollTop = 300; await new Promise(r => setTimeout(r, 120)); sticky = Math.round(th.getBoundingClientRect().top - sc.getBoundingClientRect().top); sc.scrollTop = 0; }
          else { const y0 = th.getBoundingClientRect().top; window.scrollTo(0, 400); await new Promise(r => setTimeout(r, 120)); sticky = Math.round(th.getBoundingClientRect().top); window.scrollTo(0, 0); sticky = sticky - 0; void y0; }
          return { rows, more, scrollRegion: !!sc, sticky, sortable: t.querySelectorAll('th button[data-ui-sort]').length, hasBtn: t.querySelectorAll('th button').length };
        });
        const out = [];
        if (!info) throw new Error('no table on the screen');
        if (info.rows + (info.more ? 1 : 0) < 10) out.push(`only ${info.rows} rows after adding ${JSON.stringify(counts)}`);
        if (info.scrollRegion ? Math.abs(info.sticky) > 2 : Math.abs(info.sticky) > 2) out.push(`header is not sticky (offset ${info.sticky}px after scrolling${info.scrollRegion ? ' the table region' : ' the page'})`);
        // sort works: first sortable header, order changes and aria-sort is set
        const before = await page.evaluate(() => [...document.querySelectorAll('#root table tbody tr')].slice(0, 6).map(r => r.innerText.replace(/\s+/g, ' ').slice(0, 40)).join('|'));
        const clicked = await page.evaluate(() => { const b = [...document.querySelectorAll('#root table th button[data-ui-sort]')].find(x => !/open|action/i.test(x.innerText)); if (!b) return null; b.click(); return b.innerText.trim(); });
        await page.waitForTimeout(250);
        if (clicked) { const after = await page.evaluate(() => ({ rows: [...document.querySelectorAll('#root table tbody tr')].slice(0, 6).map(r => r.innerText.replace(/\s+/g, ' ').slice(0, 40)).join('|'), sort: [...document.querySelectorAll('#root table th[aria-sort]')].map(t => t.getAttribute('aria-sort')).join(',') })); if (!/ascending|descending/.test(after.sort)) out.push(`sorting "${clicked}" sets no aria-sort`); if (after.rows === before && !/ascending|descending/.test(after.sort)) out.push('sorting changes nothing'); }
        else out.push('no sortable header');
        await page.evaluate(() => window.scrollTo(0, 0));
        const r = await shoot(page, { name: `long-${shotName}-${vw}`, surface: 'states', label: `60 rows · ${label} · ${vw}` });
        verdict([...out, ...r.issues]);
      });
    }
  }
  await page.ctx.close();
}

// ------------------------------------------------------------------------------------------------ 3. empty, denied and error states
{
  const page = await newPage({ who: 'jperez' });
  for (const [id, params, label] of [['Authorizations', {}, 'Authorizations'], ['DenialIntelligence', {}, 'Denial Intelligence'], ['Referrals', {}, 'Referrals']]) {
    await run(`P19.5 visual · empty state · ${label} (filter that yields none)`, async () => {
      await openAt(page, id, params);
      const has = await page.locator('[data-ui-fsearch]').count(); if (!has) throw new Error('no filter search to empty the list');
      await page.fill('[data-ui-fsearch]', 'zzzzqqqq'); await page.waitForTimeout(450);
      const e = await page.evaluate(() => { const em = document.querySelector('#root .ui-empty, #root [data-ui-empty]'); if (!em) return null; return { text: em.innerText.replace(/\s+/g, ' ').trim(), action: !!em.querySelector('button,a[href]') || !!document.querySelector('#root [data-ui-fclear]') }; });
      const r = await shoot(page, { name: `empty-${slug(label)}`, surface: 'states', label: `empty · ${label}` });
      const out = []; if (!e) out.push('no empty state shown (a table with zero rows or nothing at all)'); else { if (e.text.length < 6) out.push('empty state has no message'); if (!e.action) out.push('empty state has no next action (clear filters, add)'); }
      verdict([...out, ...r.issues]);
    });
  }
  await run('P19.5 visual · empty state · Analytics population with the case-backed dataset (minimum group size)', async () => {
    await openAt(page, 'Analytics', { section: 'population', dataset: 'case' });
    const r = await shoot(page, { name: 'empty-analytics-population-case', surface: 'states', label: 'Analytics · population · case-backed' }); verdict(r.issues);
  });
  await page.ctx.close();
  const ds = await newPage({ who: 'khale' });
  await run('P19.5 visual · denied state · direct support opens Authorizations (a message and a way out)', async () => {
    await openAt(ds, 'Authorizations', {});
    const t = await ds.evaluate(() => ({ text: document.getElementById('root').innerText, link: !!document.querySelector('#root a[href]'), alert: !!document.querySelector('#root [role=alert],#root [role=status]'), h1: document.querySelectorAll('h1').length }));
    const r = await shoot(ds, { name: 'denied-ds-authorizations', surface: 'states', label: 'denied · direct support · Authorizations' });
    const out = []; if (!/Not available/.test(t.text)) out.push('no "Not available" message: ' + t.text.slice(0, 60)); if (!t.link) out.push('no way out (link)'); if (t.h1 !== 1) out.push(t.h1 + ' h1');
    verdict([...out, ...r.issues]);
  });
  await run('P19.5 visual · not found · an unknown route', async () => {
    await openAt(ds, 'NoSuchScreen', {}).catch(() => { });
    const t = await ds.evaluate(() => document.getElementById('root').innerText);
    const r = await shoot(ds, { name: 'notfound', surface: 'states', label: 'page not found' }); assert.match(t, /Page not found/); verdict(r.issues);
  });
  await ds.ctx.close();
  // errors: /api/do answers 500; /api/state answers 500 on load; the event stream is blocked
  const ep = await newPage({ who: 'jperez' });
  await run('P19.5 visual · error state · an action fails (/api/do answers 500): the person is told, the screen stays', async () => {
    await openAt(ep, 'Referral', { id: 'REF-118' });
    await ep.route('**/api/do', r => r.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'The server could not do that.' }) }));
    const btns = await ep.evaluate(() => [...document.querySelectorAll('#root button, #root a.ui-btn')].map(b => b.innerText.trim()).filter(Boolean).slice(0, 8));
    const clicked = await ep.evaluate(() => { const b = [...document.querySelectorAll('#root button.ui-btn--primary, #root .ui-btn--primary')].find(x => !x.disabled); if (!b) return null; b.click(); return b.innerText.trim(); });
    await ep.waitForTimeout(500);
    // a dialog may ask first: press its last action
    const dlg = await ep.evaluate(() => { const b = [...document.querySelectorAll('#ui-overlays [data-ui-action]')].pop(); if (!b || b.disabled) return null; b.click(); return b.innerText.trim(); });
    await ep.waitForTimeout(700);
    const st = await ep.evaluate(() => ({ alert: [...document.querySelectorAll('[role=alert]')].map(e => e.innerText.trim()).filter(Boolean), blank: (document.getElementById('root').innerText || '').trim().length < 20 }));
    const r = await shoot(ep, { name: 'error-do-500', surface: 'states', label: 'error · action 500' });
    await ep.unroute('**/api/do');
    const out = []; if (!clicked && !dlg) out.push('no primary action found to click (buttons: ' + btns.join(', ') + ')'); else if (!st.alert.length) out.push(`"${clicked || dlg}" failed with a 500 and nothing announced the error (no role=alert)`); if (st.blank) out.push('screen went blank');
    verdict([...out, ...r.issues.filter(i => !/console errors/.test(i))]);
  });
  await run('P19.5 visual · error state · the event stream is blocked: screens still work (polling)', async () => {
    await ep.route('**/api/stream', r => r.abort());
    await openAt(ep, 'MyWork', { section: 'todo' }); const r = await shoot(ep, { name: 'error-sse-blocked', surface: 'states', label: 'SSE blocked · My Work' });
    await ep.unroute('**/api/stream'); verdict(r.issues.filter(i => !/console errors/.test(i)));
  });
  await run('P19.5 visual · error state · /api/state fails on load: a message, not an endless "Loading the demo"', async () => {
    await ep.route('**/api/state', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false,"error":"down"}' }));
    await ep.goto('about:blank'); await ep.goto(BASE + hashOf('MyWork', { section: 'todo' }), { waitUntil: 'domcontentloaded' }); await ep.waitForTimeout(2500);
    const t = await ep.evaluate(() => ({ text: document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 200), loading: /Loading the demo/.test(document.body.innerText), alert: !!document.querySelector('[role=alert]'), retry: !!([...document.querySelectorAll('button,a')].find(b => /retry|try again|reload/i.test(b.innerText))) }));
    await ep.screenshot({ path: path.join(DIR, 'error-state-500.png') }); addTile('states', path.join(DIR, 'error-state-500.png'), 'error · /api/state 500', t.loading ? ['x'] : null);
    await ep.unroute('**/api/state');
    if (t.loading && !t.alert) throw new Error('the page stays on "Loading the demo…" forever when the state cannot be loaded: no message, no retry');
    if (!t.alert && !/couldn.t|could not|can.t reach|try again|offline|unavailable|problem|error|went wrong|not loading/i.test(t.text)) throw new Error('/api/state answers 500 and the screen shows a calm empty My Work ("' + t.text.slice(60, 140) + '") with no error and no retry: a server failure reads as "nothing needs you"');
  });
  await ep.ctx.close();
}

// ------------------------------------------------------------------------------------------------ 4. modals and drawers at 400, 1024 and 1440
{
  const OPENERS = [
    { role: 'jperez', route: ['MyWork', { section: 'todo' }], label: 'Help drawer', open: async p => { const vis = await p.evaluate(() => { const b = document.querySelector('#rail [data-sh=help]'); if (!b) return false; const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; }); if (!vis) throw new Error('Help (and Sign out) are not available in the rail at this width: the rail foot is hidden'); await p.click('#rail [data-sh=help]'); }, kind: 'drawer' },
    { role: 'jperez', route: ['Analytics', { section: 'outcomes', dataset: 'case' }], label: 'Analytics export modal', open: p => p.getByRole('button', { name: /^Export/ }).first().click(), kind: 'modal' },
    { role: 'jperez', route: ['Analytics', { section: 'outcomes', dataset: 'case' }], label: 'Analytics pilot measures drawer', open: p => p.getByRole('button', { name: /measures|defin/i }).first().click(), kind: 'drawer' },
    { role: 'jperez', route: ['Authorization', { id: 'R-0399', section: 'submission' }], label: 'Authorization overdue notice', open: p => p.getByRole('button', { name: /notice|receipt|send/i }).first().click(), kind: 'any' },
    { role: 'jperez', route: ['DenialCase', { id: 'R-0402', section: 'action', action: 'options' }], label: 'Denial case action', open: p => p.locator('#root [data-x="accept"], #root [data-x="p2preq"], #root [data-x="schedule"], #root [data-x="outcome"], #root [data-x="assign"], #root [data-x="recorddoc"]').first().click(), kind: 'any' },
    { role: 'jperez', route: ['Referral', { id: 'REF-118' }], label: 'Referral schedule, hold or route', open: p => p.getByRole('button', { name: /Schedule|Reschedule|Hold|Route/i }).first().click(), kind: 'any' },
    { role: 'dowens', route: ['Settings', { tab: 'people' }], label: 'Settings people action', open: p => p.locator('#root .ui-btn--primary, #root button.ui-btn').first().click(), kind: 'any' },
    { role: 'dowens', route: ['Settings', { tab: 'rules' }], label: 'Settings rule drawer', open: p => p.locator('#root table tbody tr button, #root table tbody tr a').first().click(), kind: 'any' }
  ];
  for (const role of ['jperez', 'dowens']) {
    const page = await newPage({ who: role });
    for (const vw of [400, 1024, 1440]) {
      await page.setViewportSize({ width: vw, height: vw === 400 ? 800 : vw === 1024 ? 768 : 900 });
      for (const o of OPENERS.filter(x => x.role === role)) {
        await run(`P19.5 visual · ${o.label} open (${vw})`, async () => {
          await openAt(page, o.route[0], o.route[1]);
          try { await o.open(page); } catch (e) { throw new Error('could not open: ' + String(e.message).split('\n')[0]); }
          await page.waitForTimeout(350);
          const d = await page.evaluate(() => { const el = document.querySelector('#ui-overlays .ui-dialog, #modal .ui-dialog'); if (!el) return null; const r = el.getBoundingClientRect(); return { kind: (el.closest('.ui-overlay') || {}).dataset ? el.closest('.ui-overlay').dataset.uiOverlay : '', l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), vw: innerWidth, vh: innerHeight, scrolls: el.querySelector('.ui-dialog__b') ? el.querySelector('.ui-dialog__b').scrollHeight > el.querySelector('.ui-dialog__b').clientHeight + 2 : false, btnsVisible: [...el.querySelectorAll('button')].every(b => { const q = b.getBoundingClientRect(); return !q.width || (q.right <= innerWidth + 1 && q.left >= -1); }) }; });
          const out = [];
          if (!d) out.push('no dialog opened');
          else { if (d.l < -1 || d.t < -1 || d.r > d.vw + 1 || d.b > d.vh + 1) out.push(`dialog does not fit the ${d.vw}x${d.vh} viewport (${d.l},${d.t} to ${d.r},${d.b})`); if (!d.btnsVisible) out.push('a dialog button is outside the viewport'); }
          const r = await shoot(page, { name: `dlg-${slug(o.label)}-${vw}`, surface: 'states', label: `${o.label} · ${vw}`, scope: d ? '#ui-overlays' : null });
          await page.keyboard.press('Escape'); await page.waitForTimeout(100);
          verdict([...out, ...r.issues]);
        });
      }
    }
    await page.ctx.close();
  }
}

// ------------------------------------------------------------------------------------------------ 5. phone, family and school screens: 390x844 and 360x740
const PHONES = [
  { who: 'khale', label: 'direct support', fx: 'mr-daily', routes: [['MobileApp', {}], ['MobileDictate', {}], ['MobileAssess', {}], ['MyWork', { section: 'day' }]] },
  { portal: { portalClient: 'TW', presenter: true }, label: 'guardian', fx: 'base-live', routes: [['ParentPortal', {}], ['ParentEnroll', {}], ['ParentSign', {}], ['ParentProgress', {}], ['ParentQuarterly', {}], ['ParentLetters', {}], ['ParentSchedule', {}], ['ParentSurvey', {}], ['FamilyLink', {}], ['AppealLetter', { c: 'EC' }]] },
  { portal: { schoolUser: 'rbell', presenter: true }, label: 'school', fx: 'base-live', routes: [['SchoolPortal', {}], ['ReferralForm', {}], ['ReferralSent', {}]] }
];
for (const g of PHONES) {
  await resetTo(g.fx);
  for (const [vw, vh] of [[390, 844], [360, 740]]) {
    const page = await newPage({ who: g.who, portal: g.portal, width: vw, height: vh, touch: true });
    for (const [id, params] of g.routes) {
      await run(`P19.5 visual · ${g.label} · ${id}${Object.keys(params).length ? '?' + qs(params) : ''} (${vw})`, async () => {
        await openAt(page, id, params);
        const r = await shoot(page, { name: `${g.label}-${id}-${vw}`, surface: g.label === 'direct support' ? `phone-${vw}` : `portals-${vw}`, label: `${g.label} · ${id} · ${vw}` });
        verdict(r.issues);
      });
    }
    await page.ctx.close();
  }
}
// the real guardian link
await resetTo('base-live');
{
  const page = await newPage({ width: 390, height: 844, touch: true });
  for (const [u, label] of [['/parent/ar-demo/ParentPortal', 'ParentPortal by link'], ['/f/ar-demo', 'FamilyLink by link']]) {
    await run(`P19.5 visual · guardian ${label} (390)`, async () => {
      page.errs.length = 0; await page.goto('about:blank'); await page.goto(BASE + u, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(READY, null, { timeout: 15000 }); await settle(page.mainFrame());
      verdict((await shoot(page, { name: `guardian-link-${slug(label)}`, surface: 'portals-390', label: `guardian · ${label} · 390` })).issues);
    });
  }
  await page.ctx.close();
}

// ------------------------------------------------------------------------------------------------ 6. the sign-in screen, the presenter dock, the UI kit gallery
{
  for (const [vw, vh] of [[1440, 900], [390, 844]]) {
    const page = await newPage({ width: vw, height: vh, touch: vw < 500 });
    await run(`P19.5 visual · sign-in screen (${vw})`, async () => {
      await openAt(page, 'Login', {}); verdict((await shoot(page, { name: `login-${vw}`, surface: vw < 500 ? 'portals-390' : 'platform-1440', label: `sign-in · ${vw}` })).issues);
    });
    await page.ctx.close();
  }
  const pp = await newPage({ who: 'dowens', present: true });
  await run('P19.5 visual · presenter dock open with the scenario menu (1440)', async () => {
    await pp.goto(BASE + '/?present=1#/MyWork?section=todo', { waitUntil: 'domcontentloaded' }); await pp.waitForFunction(READY, null, { timeout: 15000 }); await pp.waitForTimeout(500);
    await pp.click('[data-dock-menu="scenario"]'); await pp.waitForTimeout(300);
    const r = await shoot(pp, { name: 'dock-scenario-menu', surface: 'states', label: 'presenter dock · scenario menu' }); await pp.keyboard.press('Escape'); verdict(r.issues);
  });
  await run('P19.5 visual · UI kit gallery (1440)', async () => {
    await pp.goto(BASE + '/?present=1#/UiKit', { waitUntil: 'domcontentloaded' }); await pp.waitForFunction(READY, null, { timeout: 15000 }); await pp.waitForTimeout(500);
    const r = await shoot(pp, { name: 'uikit-1440', surface: 'platform-1440', label: 'UI kit gallery · 1440', full: false }); verdict(r.issues);
  });
  await pp.ctx.close();
}

// ------------------------------------------------------------------------------------------------ 7. the panel at 400 px beside the mock Lauris
const PANEL = [
  ['base-live', [['jperez', '/consumers', 'home'], ['khale', '/consumers', 'home-ds'], ['cdiaz', '/consumers', 'home-supervisor'], ['dowens', '/consumers', 'home-admin'], ['jperez', '/consumers/3310', 'record'],
    ['khale', '/consumers/3310/session/dpn', 'daily-note'], ['jperez', '/consumers/3310/session/weekly', 'weekly'], ['jperez', '/consumers/3310/session/collateral', 'monthly'], ['jperez', '/consumers/4102/session/incident', 'incident'],
    ['jperez', '/consumers/3310/session/quarterly', 'quarterly'], ['jperez', '/consumers/3310/session/sra-continued', 'continued-stay'], ['jperez', '/consumers/4102/session/discharge', 'discharge'], ['jperez', '/approvals', 'forms-to-approve'],
    ['khale', '/time', 'time-tracker'], ['jperez', '/consumers/5120', 'psyflo-off'], ['khale', '/consumers/3310/session/screening', 'screening-denied-ds']]],
  ['tw-isp-ready', [['jperez', '/consumers/4492/session/screening', 'tw-screening'], ['jperez', '/consumers/4492/session/cna', 'tw-cna'], ['jperez', '/consumers/4492/session/isp', 'tw-isp'], ['jperez', '/consumers/4492/session/sra-initial', 'tw-sra']]],
  ['tw-signed', [['jperez', '/approvals', 'forms-to-approve-signed']]]
];
{
  const page = await newPage({ width: 1440, height: 900 });
  for (const [fx, list] of PANEL) {
    await resetTo(fx);
    for (const [as, p, name] of list) {
      await run(`P19.5 visual · panel · ${name} (400)`, async () => {
        page.errs.length = 0; await page.goto('about:blank'); await page.goto(`${LAURIS}/login?as=${as}&next=${encodeURIComponent(p)}`, { waitUntil: 'domcontentloaded' });
        let f = null; const t0 = Date.now(); while (Date.now() - t0 < 12000) { f = page.frames().find(x => x.url().includes('/panel/')); if (f && await f.evaluate(() => !!document.querySelector('#panel .body, #panel .mini, #panel .foot, #panel .ph') && !/Loading/.test((document.querySelector('#panel .pt b') || {}).textContent || '')).catch(() => false)) break; await page.waitForTimeout(150); }
        assert.ok(f, 'panel frame'); await page.waitForTimeout(400);
        const w = await page.evaluate(() => document.getElementById('psyflo-slot').getBoundingClientRect().width); assert.ok(Math.abs(w - 400) <= 2, 'slot width ' + w);
        const r = await shoot(page, { name: `panel-${name}`, surface: 'panel-400', label: `panel · ${as} · ${name}`, frame: f, scope: '#panel', slot: '#psyflo-slot' });
        // the page is one document: the panel's own overflow is the panel frame's
        const hs = await f.evaluate(A.hscroll); const out = [...r.issues]; if (hs.over > 1 && !out.some(x => /horizontal/.test(x))) out.push(`panel horizontal scroll ${hs.over}px (${short(hs.offenders, 2)})`);
        verdict(out);
      });
    }
  }
  await page.ctx.close();
}

// ------------------------------------------------------------------------------------------------ contact sheets
if (!process.env.VISUAL_SKIP_SHEETS) {
  const per = { 'platform-1440': [3, 620, 12], 'platform-1024': [3, 620, 12], states: [3, 620, 12], 'phone-390': [6, 300, 12], 'phone-360': [6, 300, 12], 'portals-390': [6, 300, 12], 'portals-360': [6, 300, 12], 'panel-400': [6, 300, 12] };
  const made = [];
  for (const [surface, tiles] of Object.entries(sheets)) {
    const [cols, tileW, perSheet] = per[surface] || [3, 620, 12];
    for (let i = 0, n = 1; i < tiles.length; i += Math.max(perSheet, cols * 2), n++) {
      const out = path.join(SHOTS, `contact-${surface}-${n}.png`);
      await A.contactSheet(browser, tiles.slice(i, i + Math.max(perSheet, cols * 2)), out, { cols, tileW, title: `${surface} · sheet ${n} (${Math.min(tiles.length, i + Math.max(perSheet, cols * 2))}/${tiles.length})` });
      made.push(out);
    }
  }
  console.log('NOTE contact sheets: ' + made.join(' '));
}
if (NOTES.length) console.log('NOTE ' + [...new Set(NOTES)].slice(0, 6).join(' | '));
await browser.close();
await T.done();
