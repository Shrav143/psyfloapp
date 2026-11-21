// Records the CARES NYC demo video footage (silent), one scene at a time, timed to the script.
// Usage: node record.mjs <outDir> [sceneNumbers...]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const APP = 'http://localhost:4100';
const OUT = path.resolve(process.argv[2] || 'out');
const ONLY = process.argv.slice(3).map(Number);
const W = 1440, H = 900;
fs.mkdirSync(OUT, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const api = (action, args) => fetch(APP + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) }).then(r => r.json());

// Runs in every frame: a visible pointer, and hides demo-only chrome.
const INIT = ({ hide }) => {
  const css = `
    #bar,.xbar{display:none!important}
    .xframe{height:100vh!important}
    #stage{min-height:100vh!important}
    #toasts{display:none!important}
    #__cur{position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;display:none;
      transform:translate(-3px,-2px);filter:drop-shadow(0 1px 2px rgba(0,0,0,.35))}`;
  const add = () => {
    if (document.getElementById('__curstyle')) return;
    const st = document.createElement('style'); st.id = '__curstyle'; st.textContent = css;
    document.documentElement.appendChild(st);
    const c = document.createElement('div'); c.id = '__cur';
    c.innerHTML = '<svg viewBox="0 0 22 22" width="22" height="22"><path d="M3 2 L3 18 L7.5 14 L10.5 20.5 L13 19.4 L10.1 13 L16 13 Z" fill="#fff" stroke="#151B24" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    addEventListener('mousemove', e => { c.style.display = 'block'; c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    document.addEventListener('mouseover', e => { if (e.target && e.target.tagName === 'IFRAME') c.style.display = 'none'; }, true);
    document.addEventListener('mouseout', e => { if (!e.relatedTarget) c.style.display = 'none'; }, true);
    // the panel's demo role switcher
    const hideRole = () => document.querySelectorAll('.lab').forEach(l => { if (/Signed in as \(demo\)/.test(l.textContent)) { const r = l.closest('.row'); if (r) r.style.display = 'none'; } });
    new MutationObserver(hideRole).observe(document.documentElement, { childList: true, subtree: true }); hideRole();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add); else add();
};

let browser;
async function newPage(user) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await ctx.addInitScript(u => { if (location.port === '4100' && !location.pathname.startsWith('/panel')) try { localStorage.setItem('psyflo_user', u); } catch { } }, user);
  await ctx.addInitScript(INIT, { hide: true });
  const page = await ctx.newPage();
  return { ctx, page };
}

const panelFrame = page => page.frames().find(f => f.url().includes('/panel'));
const recordFrame = page => page.frames().find(f => f.url().includes(':4101'));
async function waitFrame(page, fn, ms = 20000) {
  const t = Date.now();
  while (Date.now() - t < ms) { const f = fn(page); if (f) return f; await sleep(200); }
  throw new Error('frame not found');
}

// pointer helpers (coordinates are main-viewport)
let mouse = { x: W / 2, y: H + 50 };
async function glide(page, x, y, ms = 900) {
  const steps = Math.max(8, Math.round(ms / 16));
  const sx = mouse.x, sy = mouse.y;
  for (let i = 1; i <= steps; i++) {
    const k = i / steps, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    await page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e);
    await sleep(ms / steps);
  }
  mouse = { x, y };
}
async function box(loc) { await loc.first().waitFor({ state: 'visible', timeout: 15000 }); return loc.first().boundingBox(); }
async function pointAt(page, loc, { dx = 0.5, dy = 0.5, ms = 900 } = {}) { const b = await box(loc); await glide(page, b.x + b.width * dx, b.y + b.height * dy, ms); return b; }
async function clickAt(page, loc, opts) { await pointAt(page, loc, opts); await sleep(250); await page.mouse.down(); await sleep(90); await page.mouse.up(); }
async function smoothScrollTo(loc, block = 'start') { await loc.first().evaluate((el, block) => el.scrollIntoView({ behavior: 'smooth', block }), block); await sleep(900); }
async function parkMouse(page) { await glide(page, W - 4, H - 4, 500); await page.mouse.move(W + 10, H + 10).catch(() => {}); mouse = { x: W + 10, y: H + 10 }; }

// screencast capture
async function capture(page, name, dur, script) {
  const dir = path.join(OUT, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  let n = 0;
  cdp.on('Page.screencastFrame', async f => {
    const file = path.join(dir, String(n++).padStart(5, '0') + '.jpg');
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, ts: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  const t0 = Date.now() / 1000;
  const first = path.join(dir, 'first.jpg');
  await page.screenshot({ path: first, type: 'jpeg', quality: 95 });
  frames.push({ file: first, ts: t0 });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 95, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  const at = async s => { const w = t0 * 1000 + s * 1000 - Date.now(); if (w > 0) await sleep(w); };
  await script(at);
  await at(dur);
  await cdp.send('Page.stopScreencast');
  await sleep(300);
  const end = t0 + dur;
  const fr = frames.filter(f => f.ts >= t0 - 0.05 && f.ts < end).sort((a, b) => a.ts - b.ts);
  let list = 'ffconcat version 1.0\n';
  fr.forEach((f, i) => { const next = i + 1 < fr.length ? fr[i + 1].ts : end; const d = Math.max(0.001, next - Math.max(f.ts, t0)); list += `file '${f.file}'\nduration ${d.toFixed(4)}\n`; });
  list += `file '${fr.at(-1).file}'\n`;
  fs.writeFileSync(path.join(dir, 'list.txt'), list);
  console.log(`${name}: ${fr.length} frames, ${dur}s`);
}

const want = n => !ONLY.length || ONLY.includes(n);

async function main() {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });

  if (!ONLY.length || ONLY.some(n => n <= 4)) {
    await api('demo.reset', { preset: 'live' });
    const { ctx, page } = await newPage('khale');

    // Scene 1 · ExtHome · 18 s · still
    await page.goto(APP + '/#/ExtHome');
    await waitFrame(page, panelFrame); await panelFrame(page).locator('text=Good').first().waitFor({ timeout: 20000 }); await sleep(1500);
    if (want(1)) await capture(page, 's1', 18, async () => {});

    // Scene 2 · phone · 34 s
    await page.goto(APP + '/#/MobileDictate'); await page.locator('a[href="#example"]').waitFor(); await sleep(1200);
    if (want(2)) await capture(page, 's2', 34, async at => {
      await at(9.5); await clickAt(page, page.locator('a[href="#example"]'), { ms: 1300 });
      await at(14); await pointAt(page, page.locator('text=In note language'), { dx: 0.3, ms: 1200 });
      await at(19); await pointAt(page, page.locator('text=Solving peer conflict').last(), { dx: 0.2, ms: 1200 });
      await at(29);
      const lr = page.locator('a[href="#use"]'); await smoothScrollTo(lr, 'center');
      await at(31.5); await clickAt(page, lr, { ms: 1000 });
    });
    else { await page.locator('a[href="#example"]').click(); await sleep(800); await page.locator('a[href="#use"]').click(); await sleep(1200); }

    // Scene 3 · daily note in the record · 28 s
    mouse = { x: W / 2, y: H + 50 };
    await page.goto(APP + '/#/ExtDPN');
    const pf = await waitFrame(page, panelFrame);
    await pf.locator('text=What Psyflo added').first().waitFor({ timeout: 25000 }); await sleep(2500);
    if (want(3)) await capture(page, 's3', 28, async at => {
      const rf = recordFrame(page);
      await at(2.5); await pointAt(page, rf.locator('textarea').last(), { dx: 0.25, dy: 0.35, ms: 1400 });
      await at(8); const added = pf.locator('text=What Psyflo added'); await pointAt(page, pf.locator('text=Drafted for the narrative'), { dx: 0.2, ms: 900 }); await smoothScrollTo(added, 'center');
      await at(10); const secs = pf.locator('.lab:has-text("What Psyflo added") ~ .sec');
      const cnt = await secs.count();
      for (let i = 0; i < cnt; i++) { await pointAt(page, secs.nth(i), { dx: 0.25, ms: 800 }); await sleep(1100); }
      await at(19); const chk = pf.locator('text=Checked before you process'); await smoothScrollTo(chk, 'center');
      await at(20.5); await pointAt(page, chk, { dx: 0.3, ms: 800 });
      await at(22); await glide(page, mouse.x, mouse.y + 60, 1500); await glide(page, mouse.x, mouse.y + 60, 1500);
    });

    // Scene 4 · Same activity · 28 s
    mouse = { x: W / 2, y: H + 50 };
    await page.goto(APP + '/#/SameActivity'); await page.locator('text=Two different notes').first().waitFor().catch(() => {}); await sleep(1500);
    if (want(4)) await capture(page, 's4', 28, async at => {
      await at(5); await pointAt(page, page.locator('text=spent the day', { exact: false }).first(), { dx: 0.2, ms: 1200 }).catch(() => {});
      await at(10); await pointAt(page, page.locator('text=M.R.').nth(0), { ms: 1200 }).catch(() => {});
      await at(14); await pointAt(page, page.locator('text=J.T.').nth(0), { ms: 1200 }).catch(() => {});
      await at(19); await pointAt(page, page.locator('text=/plan review/i').first(), { ms: 1200 }).catch(() => {});
    });
    await ctx.close();
  }

  if (!ONLY.length || ONLY.some(n => n >= 5)) {
    await api('demo.reset', { preset: 'canvas' });
    const { ctx, page } = await newPage('jperez');
    mouse = { x: W / 2, y: H + 50 };

    // Scene 5 · screening call · 26 s (set up off camera)
    if (want(5)) {
      await page.goto(APP + '/#/ExtScreening');
      const pf = await waitFrame(page, panelFrame);
      await pf.locator('button:has-text("Play the scripted call")').waitFor({ timeout: 25000 });
      await pf.locator('button:has-text("Play the scripted call")').click();
      console.log('s5: scripted call playing (~50 s)…');
      await pf.locator('text=(call ended').first().waitFor({ timeout: 120000 });
      await pf.locator('button:has-text("Stop and draft the boxes")').click();
      await pf.locator('button:has-text("Fill the")').first().waitFor({ timeout: 20000 });
      await pf.locator('button:has-text("Fill the")').first().click();
      await pf.locator('button:has-text("Type them again")').first().waitFor({ timeout: 60000 });
      await sleep(1500);
      await pf.locator('body').evaluate(() => window.scrollTo(0, 0));
      await pf.evaluate(() => { document.scrollingElement && (document.scrollingElement.scrollTop = 0); document.querySelectorAll('*').forEach(e => { if (e.scrollTop) e.scrollTop = 0; }); });
      const rf = recordFrame(page);
      await rf.evaluate(() => { document.querySelectorAll('*').forEach(e => { if (e.scrollTop) e.scrollTop = 0; }); window.scrollTo(0, 0); });
      await sleep(1000);
      await capture(page, 's5', 26, async at => {
        await at(2.5); await pointAt(page, rf.locator('text=GUARDIAN ON THE CALL').first(), { dx: 0.3, ms: 1300 }).catch(() => {});
        await at(5); await pointAt(page, rf.locator('text=Physical aggression').first(), { dx: 0.4, ms: 1200 }).catch(() => {});
        await at(8); await glide(page, mouse.x + 300, mouse.y + 120, 2200);
        await at(15); await pointAt(page, pf.locator('text=left for you').first(), { dx: 0.5, ms: 1300 });
        await at(20); const ny = pf.locator('text=NOT YET ASKED').first();
        if (await ny.count()) { await smoothScrollTo(ny, 'center'); await pointAt(page, ny, { dx: 0.2, ms: 900 }); }
      });
    }

    // Scene 6 · Authorizations · 19 s
    mouse = { x: W / 2, y: H + 50 };
    if (want(6)) {
      await page.goto(APP + '/#/Authorizations'); await page.locator('#stage h1:has-text("Authorizations")').first().waitFor(); await sleep(1500);
      await capture(page, 's6', 19, async at => {
        await at(2); await glide(page, 760, 520, 1000);
        await at(3.5); for (let i = 0; i < 80; i++) { await page.mouse.wheel(0, 5); await sleep(70); }
      });
    }

    // Scene 7 · Close · 17 s
    if (want(7)) {
      await page.goto(APP + '/#/CloseCard'); await page.locator('text=Nothing about how you work changes').first().waitFor(); await sleep(2500);
      await page.evaluate(() => { const c = document.getElementById('__cur'); if (c) c.style.display = 'none'; }); await sleep(300);
      await capture(page, 's7', 17, async () => {});
    }
    await ctx.close();
  }
  await browser.close();
  // leave the demo ready for a manual take
  await api('demo.reset', { preset: 'live' });
}
main().catch(e => { console.error(e); process.exit(1); });
