// The hosted preview (hosted/index.html: the whole unified demo in one file, no server), driven through the UI.
// It opens the file from file:// directly AND inside an outer page <iframe sandbox="allow-scripts allow-forms allow-popups allow-modals">
// (no allow-same-origin, like a published artifact: localStorage, sessionStorage and cookies throw there, frames have opaque origins).
// Build first:  node scripts/build-hosted.mjs        Run:  node test/hosted.mjs
//   MODE=direct|sandbox|srcdoc   one mode (default: direct and sandbox; srcdoc wraps the page as srcdoc, a third, optional way a host may serve it)
//   ONLY=roles,auth,...          scenarios to run (each starts from a fresh page, because a reload resets the demo):
//   static    the file itself: title, no <a download>, no external script, no eval, size
//   roles     every role card, the family-portal and school entries: every route each may open renders without console errors; hidden routes say so
//   narrow    phone, family and school screens at 390 px: no horizontal scroll
//   auth      My Work -> Authorizations -> R-0416 -> Review packet (Lauris overlay: Process Form) -> Approve -> Get Signature -> Send; PDFs open as text
//   denial    Denial Intelligence: R-0402 partial -> peer-to-peer -> outcome; K.T. information reply through the mock Availity overlay
//   analytics three sections, the dataset toggle, export (opens as text, never a download)
//   settings  Settings rules edit (admin), the audit log opens as text
//   referral  REF-118: send the family link, open it (hash route), five steps, consent; eligibility panel, mock DMAS overlay, record result
//   flowA     the Lauris panel: screening (consumer, scripted call via the presenter command, Process Form) and the intake
//   flowB     the phone dictation (example) and the daily note in the Lauris frame
//   flowC     ISP, SRA, Process Form, approval, Get Signature, Send
//   extension the panel home (Scribe, no Track Time) and the phone without a timer; who gets what
//   dock      presenter dock: modes, scenario selector, role switcher, simulate, reset
import { createRequire } from 'node:module'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/node22/lib/node_modules/playwright/index.js');
const FILE_URL = new URL('../hosted/index.html', import.meta.url);
const FILE = FILE_URL.href;
if (!fs.existsSync(FILE_URL)) { console.error('hosted/index.html is missing: run node scripts/build-hosted.mjs'); process.exit(2); }
const { SCREENS } = await import('../web/js/registry.js');
const { routeAllowed } = await import('../web/js/shared/permissions.js');
const MODES = process.env.MODE ? process.env.MODE.split(',') : ['direct', 'sandbox'];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'psyflo-hosted-shots'); fs.mkdirSync(SHOTS, { recursive: true });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'hosted-test-'));
const OUTER = path.join(TMP, 'outer.html');
fs.writeFileSync(OUTER, `<!doctype html><html><body style="margin:0"><iframe id="outer" sandbox="allow-scripts allow-forms allow-popups allow-modals" src="${FILE}" style="width:100vw;height:100vh;border:0"></iframe></body></html>`);

const fails = []; let mode = '';
const ok = (cond, msg) => { if (!cond) { fails.push(`[${mode}] ${msg}`); console.log('  FAIL', msg); } else console.log('  ok  ', msg); };
const log = (...a) => console.log('  ·', ...a);
const until = async (fn, ms = 15000, step = 150) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch { } await new Promise(r => setTimeout(r, step)); } return false; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// console messages that are not about the page: the Google Fonts link (no network in CI)
const BENIGN = m => /fonts\.g(oogleapis|static)\.com/.test(m.location().url) || (/Failed to load resource/.test(m.text()) && /fonts\./.test(m.location().url));

const browser = await chromium.launch();

// one fresh page = one fresh demo
async function fresh(viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport }); const page = await ctx.newPage(); const errs = []; const leaks = [];
  page.on('request', r => { const u = r.url(); if (!/^(file|data|blob|about):/.test(u) && !/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)) leaks.push(u); });
  page.on('console', m => { if ((m.type() === 'error' || m.type() === 'warning') && !BENIGN(m)) errs.push(`${m.type()}: ${m.text().slice(0, 240)}`); });
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  let ui;
  if (mode === 'sandbox') { await page.goto('file://' + OUTER); ui = page.frameLocator('#outer'); }
  else if (mode === 'srcdoc') {   // a host that wraps the page as srcdoc (about:srcdoc, opaque origin) instead of serving it by URL
    await page.goto('about:blank');
    await page.evaluate(h => { const f = document.createElement('iframe'); f.id = 'outer'; f.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-modals'); f.style.cssText = 'width:100vw;height:100vh;border:0'; f.srcdoc = h; document.body.style.margin = '0'; document.body.appendChild(f); }, fs.readFileSync(FILE_URL, 'utf8'));
    ui = page.frameLocator('#outer');
  } else { await page.goto(FILE); ui = page; }
  await ui.locator('#root').first().waitFor();
  await ui.locator('#root a[data-signin], #root [data-signin]').first().waitFor({ timeout: 15000 });
  const hosted = () => mode !== 'direct' ? page.frames().find(f => f !== page.mainFrame() && f.parentFrame() === page.mainFrame()) : page.mainFrame();
  const ev = (fn, arg) => hosted().evaluate(fn, arg);
  const tokens = {};
  const H = {
    page, ui, errs, leaks, ctx, ev,
    // test-side sessions on the virtual network (window.__vnet.fetch sets no cookie and is never the page's own session): 'jperez', 'dowens+p' (presenter)
    tok: async who => tokens[who] ||= await ev(async ([id, p]) => (await (await window.__vnet.fetch('/api/session', { method: 'POST', body: JSON.stringify({ staffId: id, presenter: p }) })).json()).token, [who.split('+')[0], who.endsWith('+p')]),
    api: async (action, args = {}, as = 'jperez') => { const t = await H.tok(as); const r = await ev(async ([a, g, t]) => (await window.__vnet.fetch('/api/do', { method: 'POST', headers: { 'X-Psyflo-Session': t }, body: JSON.stringify({ action: a, args: g }) })).json(), [action, args, t]); if (!r.ok) throw new Error(action + ': ' + r.error); return r.result; },
    tryApi: async (action, args = {}, as = 'jperez') => { const t = await H.tok(as); return ev(async ([a, g, t]) => (await window.__vnet.fetch('/api/do', { method: 'POST', headers: { 'X-Psyflo-Session': t }, body: JSON.stringify({ action: a, args: g }) })).json(), [action, args, t]); },
    state: async (as = 'jperez') => { const t = await H.tok(as); return ev(async t => (await window.__vnet.fetch('/api/state', { headers: { 'X-Psyflo-Session': t } })).json(), t); },
    go: h => ev(h => window.__vhash(h), h),
    hash: () => ev(() => location.hash),
    signIn: async card => {
      await ui.locator('#root li.lg-role', { has: ui.getByRole('heading', { name: card, exact: true }) }).getByRole('button', { name: 'Sign in' }).click();
      ok(await until(() => ev(() => !!window.psyflo.session.user && !/Login/.test(location.hash)), 10000), `signed in as the ${card} card`);
    },
    signOut: async () => { await ui.locator('[data-signout]').first().click(); await ui.locator('#root [data-signin]').first().waitFor(); },
    root: async (n = 400) => (await ui.locator('#root').innerText()).replace(/\s+/g, ' ').slice(0, n),
    main: async () => (await ui.locator('main').first().innerText()).replace(/\s+/g, ' '),
    shot: async name => { try { await page.screenshot({ path: path.join(SHOTS, `hosted-${mode}-${name}.png`) }); } catch { } },
    // the mock Lauris: inline on an Extension route (iframe.xframe) or in the overlay a popup becomes (#vov)
    L: where => where === 'ov' ? ui.frameLocator('#vov iframe') : ui.frameLocator('iframe.xframe'),
    P: where => (where === 'ov' ? ui.frameLocator('#vov iframe') : ui.frameLocator('iframe.xframe')).frameLocator('#psyflo-frame'),
    lurl: where => (where === 'ov' ? ui.frameLocator('#vov iframe') : ui.frameLocator('iframe.xframe')).locator('body').evaluate(() => window.__vurl).catch(() => ''),
    lwait: async (where, re, ms = 15000) => ok(await until(async () => re.test(await H.lurl(where)), ms), `Lauris page matches ${re}: ${(await H.lurl(where)).replace('https://lauris.invalid', '')}`),
    panelReady: async where => { const P = H.P(where); ok(await until(async () => (await P.locator('#panel').innerText().catch(() => '')).length > 30, 20000, 250), 'the Psyflo panel loaded in the Lauris frame'); await sleep(500); },
    close: () => ctx.close()
  };
  H.noErrors = what => { ok(H.errs.length === 0, `no console errors${what ? ' · ' + what : ''}${H.errs.length ? ': ' + H.errs.join(' | ').slice(0, 400) : ''}`); ok(H.leaks.length === 0, `no request leaves the page (only the Google Fonts stylesheet)${H.leaks.length ? ': ' + H.leaks.slice(0, 3).join(', ') : ''}`); };
  return H;
}
// the SRA draft review in the panel: read the list, accept the statements that have sources (a person looks at the result and clicks again if some are still undecided), then Approve and fill
async function reviewAndFill(P) {
  await sleep(1200); await P.getByText(/Review \d+ statements/).click(); await sleep(500);
  for (let i = 0; i < 3; i++) {
    if (await P.getByText(/Accept the \d+ with sources/).count()) await P.getByText(/Accept the \d+ with sources/).click();
    if (await until(async () => !(await P.getByRole('button', { name: 'Approve and fill' }).isDisabled()), 3000, 200)) break;
  }
  await P.getByRole('button', { name: 'Approve and fill' }).click();
}
const stageOf = async (H, id) => (await H.state()).requests.find(r => r.id === id).stage;
const noDownloads = async (H, what) => ok((await H.ui.locator('a[download]').count()) === 0, `no <a download> on the page${what ? ' · ' + what : ''}`);

// ---------------------------------------------------------------- the file itself
async function staticChecks() {
  console.log('static · the published file');
  const html = fs.readFileSync(FILE_URL, 'utf8'); const size = Buffer.byteLength(html);
  const markup = html.replace(/<script>[\s\S]*?<\/script>/g, '');   // the page's own tags, without the text of its inline scripts
  log(`${(size / 1048576).toFixed(2)} MB`);
  ok(size < 8 * 1048576, 'under 8 MB');
  ok(/<title>Psyflo Harvest Demo<\/title>/.test(html), 'title "Psyflo Harvest Demo" (2-4 words)');
  ok(/:root\{color-scheme:light\}/.test(html) && /<meta name="color-scheme" content="light">/.test(html), 'color-scheme light');
  ok(/background:var\(--paper-50\)/.test(html), 'an explicit body background');
  ok(!/<a\b[^>]*\bdownload\b/i.test(html) && !/\.download\s*=[^=]/.test(html) && !/setAttribute\(\s*['"]download['"]/.test(html), 'no <a download> and no script-driven save');
  ok(!/<script[^>]*\bsrc=/i.test(markup), 'no external script');
  ok(!/\bnew Function\s*\(|[^.\w]eval\s*\(/.test(html), 'no eval / new Function in the executed path');
  ok(!/<link[^>]*rel="manifest"/.test(html), 'no manifest link');
  const hrefs = [...markup.matchAll(/<link[^>]*href="(https?:[^"]+)"/g)].map(m => m[1]);
  ok(hrefs.every(h => /^https:\/\/fonts\.googleapis\.com\//.test(h)), 'the only linked resource is the Google Fonts stylesheet: ' + hrefs.join(' '));
}

// ---------------------------------------------------------------- roles and every screen
async function roles() {
  const CARDS = [['Direct support', 'direct_support', 'khale'], ['Supervisor', 'supervisor', 'cdiaz'], ['Clinician', 'clinician', 'jperez'], ['Admin', 'admin', 'dowens']];
  for (const [card, role, user] of CARDS) {
    console.log(`roles · ${card}`);
    const H = await fresh(); const { ui, page, errs } = H;
    await H.signIn(card);
    ok(await H.ev(() => window.psyflo.session.user && window.psyflo.session.user.id) === user, `the session is ${user} (it survives without localStorage)`);
    const st = await H.state(user); ok(st.staff && st.staff.some(s => s.id === user), 'the role-projected state reaches the page');
    log('landed on', await H.hash(), '·', await H.root(80));
    ok(!(await ui.locator('#root pre.err').count()), 'the landing screen has no error block');
    ok(errs.length === 0, 'no console errors at sign-in' + (errs.length ? ': ' + errs.join(' | ').slice(0, 300) : ''));
    const bad = []; let n = 0;
    for (const s of SCREENS) {
      if (s.id === 'Login' || ['parent', 'school'].includes(s.surface) || !routeAllowed(role, s.id)) continue;
      n++; errs.length = 0;
      await H.go('#/' + s.id);
      if (s.surface === 'ext') {
        const shown = await until(async () => (await H.P().locator('#panel').innerText().catch(() => '')).length > 30, 15000, 250);
        if (!shown) bad.push(s.id + ' panel did not load');
      } else await ui.locator('#root *').first().waitFor({ timeout: 5000 }).catch(() => { });
      await page.waitForTimeout(s.surface === 'ext' ? 250 : 220);
      const txt = await H.root(60);
      if (await ui.locator('#root pre.err').count()) bad.push(s.id + ' error block: ' + (await ui.locator('#root pre.err').innerText()).slice(0, 120));
      if (s.surface !== 'ext' && txt.length < 3) bad.push(s.id + ' rendered nothing');
      if (errs.length) bad.push(`${s.id}: ${errs.join(' | ').slice(0, 200)}`);
    }
    ok(bad.length === 0, `${n} routes open as ${card} without console errors${bad.length ? ': ' + bad.join(' ; ') : ''}`);
    // a route the role may not open says so (the page, not a blank)
    const hidden = { direct_support: 'Authorizations', supervisor: 'Referrals', clinician: 'Settings', admin: 'Referrals' }[role];
    errs.length = 0; await H.go('#/' + hidden); await ui.locator('#root .denied').waitFor({ timeout: 5000 }).catch(() => { });
    ok(/Not available for/.test(await H.root(200)), `${hidden} is not available for ${card}`);
    H.noErrors();
    await H.close();
  }

  console.log('roles · family portal and school entries');
  const H = await fresh(); const { ui, errs } = H;
  await ui.getByRole('link', { name: 'Family portal' }).click();
  await ui.locator('#root h1').first().waitFor({ timeout: 10000 });
  const kind = () => H.ev(async () => ((await (await fetch('/api/session')).json()).actor || {}).kind);   // the page's own session (its cookie): who is signed in
  ok(await kind() === 'guardian', 'the Family portal entry is a guardian session');
  ok(/ParentPortal/.test(await H.hash()), 'Family portal lands on ParentPortal: ' + await H.hash());
  const parents = SCREENS.filter(s => s.surface === 'parent'); const badP = [];
  for (const s of parents) {
    errs.length = 0; await H.go('#/' + s.id + (s.id === 'FamilyLink' ? '?c=TW' : '')); await H.page.waitForTimeout(450);
    if (await ui.locator('#root pre.err').count()) badP.push(s.id + ' error block'); if (errs.length) badP.push(`${s.id}: ${errs.join(' | ').slice(0, 200)}`);
    if ((await H.root(40)).length < 3) badP.push(s.id + ' rendered nothing');
  }
  ok(badP.length === 0, `${parents.length} family screens open as the guardian without console errors${badP.length ? ': ' + badP.join(' ; ') : ''}`);
  await H.go('#/Login');
  await ui.getByRole('link', { name: 'School counselor' }).click(); await ui.locator('#root h1').first().waitFor({ timeout: 10000 });
  ok(/SchoolPortal/.test(await H.hash()), 'School counselor lands on SchoolPortal: ' + await H.hash());
  ok(await kind() === 'school', 'the School counselor entry is a school-user session');
  const schools = SCREENS.filter(s => s.surface === 'school'); const badS = [];
  for (const s of schools) {
    errs.length = 0; await H.go('#/' + s.id); await H.page.waitForTimeout(450);
    if (await ui.locator('#root pre.err').count()) badS.push(s.id + ' error block'); if (errs.length) badS.push(`${s.id}: ${errs.join(' | ').slice(0, 200)}`);
  }
  ok(badS.length === 0, `${schools.length} school screens open as the school counselor without console errors${badS.length ? ': ' + badS.join(' ; ') : ''}`);
  errs.length = 0; await H.go('#/WhereThingsLive'); await H.page.waitForTimeout(500); ok(errs.length === 0 && (await H.root(30)).length > 3, 'the architecture page opens signed in as a portal user');
  H.noErrors('portal entries'); await H.close();
}

// ---------------------------------------------------------------- phone, family and school screens at 390 px
async function narrow() {
  console.log('narrow · 390 px');
  const H = await fresh({ width: 390, height: 844 }); const { ui, errs } = H;
  const over = async () => H.ev(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  const bad = [];
  await ui.getByRole('link', { name: 'Family portal' }).click(); await ui.locator('#root h1').first().waitFor({ timeout: 10000 });
  for (const s of SCREENS.filter(x => x.surface === 'parent')) { await H.go('#/' + s.id + (s.id === 'FamilyLink' ? '?c=TW' : '')); await H.page.waitForTimeout(450); const o = await over(); if (o.sw > o.cw + 1) bad.push(`${s.id} ${o.sw}>${o.cw}`); }
  await H.go('#/Login'); await ui.getByRole('link', { name: 'School counselor' }).click(); await ui.locator('#root h1').first().waitFor({ timeout: 10000 });
  for (const s of SCREENS.filter(x => x.surface === 'school')) { await H.go('#/' + s.id); await H.page.waitForTimeout(450); const o = await over(); if (o.sw > o.cw + 1) bad.push(`${s.id} ${o.sw}>${o.cw}`); }
  await H.go('#/Login'); await H.signIn('Direct support');
  for (const s of SCREENS.filter(x => x.surface === 'phone')) { await H.go('#/' + s.id + (s.id === 'MobileDictate' ? '?client=MR' : '')); await H.page.waitForTimeout(500); const o = await over(); if (o.sw > o.cw + 1) bad.push(`${s.id} ${o.sw}>${o.cw}`); }
  await H.go('#/MobileApp'); await H.shot('narrow-phone');
  ok(bad.length === 0, `no horizontal scroll at 390 px on the family, school and phone screens${bad.length ? ': ' + bad.join(', ') : ''}`);
  H.noErrors('390 px'); await H.close();
}

// ---------------------------------------------------------------- Authorizations: R-0416 through the platform and the mock Lauris frame (scenario S3)
async function auth() {
  console.log('auth · My Work -> Authorizations -> R-0416');
  const H = await fresh(); const { ui, page } = H;
  await H.signIn('Clinician');
  ok(/Dashboard/.test(await H.root(60)), 'the clinician lands on the Dashboard (patient roster)');
  // the presenter dock: Scenario 3 (Initial authorization) resets both stores to the canvas snapshot with R-0416 drafted
  await ui.locator('[data-dock="toggle"]').click();
  await ui.locator('[data-dock-menu="scenario"]').click();
  await ui.locator('.sh-menu [role=menuitem]', { hasText: 'Initial authorization' }).click();
  ok(await until(async () => /R-0416/.test(await H.hash()), 10000), 'the scenario opens the R-0416 case: ' + await H.hash());
  ok((await stageOf(H, 'R-0416')) === 'draft_ready', 'R-0416 is a draft ready for the packet');
  // the rail: Authorizations, then the row
  await ui.locator('#rail a', { hasText: 'Authorizations' }).click();
  await ui.locator('.ui-qt__row', { hasText: 'R-0416' }).waitFor();
  ok(await ui.locator('.ui-qt__row').count() >= 8, 'the Authorizations queue lists the requests');
  await ui.locator('.ui-qt__row', { hasText: 'R-0416' }).click();
  await ui.locator('main h1').filter({ hasText: 'T.W.' }).waitFor(); ok(/Draft ready/.test(await H.main()), 'R-0416 reads Draft ready');
  // Review packet: Open in Lauris (a popup in the Node build; an overlay with Close here), the panel drafts the SRA, a person presses Process Form
  await ui.getByRole('link', { name: /Open in Lauris/ }).first().click();
  await ui.locator('#vov').waitFor(); ok(await ui.locator('#vov .vov-x').count() === 1, 'the popup is an overlay with a Close button');
  await H.lwait('ov', /sra-initial/); await H.panelReady('ov');
  const P = H.P('ov'), L = H.L('ov');
  await reviewAndFill(P);
  await P.getByText(/boxes typed into the form/).first().waitFor({ timeout: 30000 });
  ok((await L.locator('#lauris-form .in.y').count()) >= 4, 'the boxes are typed yellow in the Lauris form');
  await H.shot('auth-1-filled');
  await L.getByRole('button', { name: 'Process Form' }).click();
  await H.lwait('ov', /processed=/);
  ok(await until(async () => (await stageOf(H, 'R-0416')) === 'needs_approval', 10000), 'Process Form (a person\'s click, observed by the page bridge): Pending clinical approval');
  await ui.locator('#vov .vov-x').click(); ok((await ui.locator('#vov').count()) === 0, 'Close closes the overlay');
  // approve (a person)
  await ui.locator('main').getByText('Pending clinical approval').first().waitFor();
  await ui.getByRole('button', { name: 'Approve', exact: true }).first().click();
  await ui.getByRole('dialog').getByRole('button', { name: 'Approve', exact: true }).click();
  ok(await until(async () => (await stageOf(H, 'R-0416')) === 'awaiting_signature'), 'Approve: awaiting signature');
  // Get Signature in Lauris Forms to Approve (a licensed person)
  await ui.getByRole('link', { name: /Open Forms to Approve/ }).first().click();
  await ui.locator('#vov').waitFor(); await H.lwait('ov', /\/approvals/); await H.panelReady('ov');
  const L2 = H.L('ov'), P2 = H.P('ov');
  await L2.locator('#approval-list tr', { hasText: 'Initial Service' }).filter({ hasText: 'T.W.' }).getByText('Preview').click();
  await P2.getByText('Before you sign').waitFor({ timeout: 20000 });
  await L2.getByRole('button', { name: 'Get Signature' }).click();
  await P2.getByText('Signed in Lauris.').waitFor({ timeout: 15000 });
  const r = (await H.state()).requests.find(q => q.id === 'R-0416');
  ok(r.stage === 'signed' && r.signed_by === 'J. Perez, LPC' && r.approved_by === 'jperez', `signed by the Lauris user, approved by the clinician (${r.stage}, ${r.signed_by})`);
  await ui.locator('#vov .vov-x').click();
  // Send by fax (a person; the 3 s Sfax stub answers)
  await ui.getByRole('button', { name: 'Send by fax' }).first().click(); await ui.getByRole('dialog').getByRole('button', { name: 'Send by fax' }).click();
  ok(await until(async () => (await stageOf(H, 'R-0416')) === 'sending', 4000), 'Send by fax: sending');
  ok(await until(async () => (await stageOf(H, 'R-0416')) === 'submitted', 9000), 'the simulated Sfax answers after about 3 s: Submitted');
  const q = (await H.state()).requests.find(x => x.id === 'R-0416'); ok(/^F-\d+/.test(q.fax_ref) && !!q.delivery_receipt, `fax reference ${q.fax_ref} and a receipt are stored`);
  await page.waitForTimeout(500); ok(/Submitted/.test(await H.main()) && /Day 0/.test(await H.main()), 'the case reads Submitted · Day 0');
  await H.shot('auth-2-submitted');
  // PDFs open as text in the viewer overlay, never as a download
  const files = (await H.state()).files.filter(f => f.record === 'R-0416'); const signed = files.find(f => /signed/.test(f.url)), receipt = files.find(f => /fax/.test(f.url));
  ok(!!signed && !!receipt, 'the signed PDF and the fax receipt are stored files: ' + files.map(f => f.kind).join(', '));
  await ui.locator('summary', { hasText: 'Documentation' }).click();
  await ui.locator(`main a[href="${signed.url}"]:visible`).first().click();
  await ui.locator('#vov').waitFor();
  const body = await ui.frameLocator('#vov iframe').locator('body').innerText();
  ok(/Initial Service Authorization Request|TDT Initial SRA/.test(body) && /Electronically signed in Lauris by J\. Perez/.test(body), 'the signed PDF opens as text in the viewer');
  ok((await ui.locator('#vov a, #vov button', { hasText: /Download/i }).count()) === 0, 'the viewer offers no Download');
  await page.keyboard.press('Escape'); await ui.locator('#vov').waitFor({ state: 'detached', timeout: 3000 }); ok(true, 'Escape closes the viewer');
  await ui.locator(`main a[href="${receipt.url}"]:visible`).first().click(); await ui.locator('#vov').waitFor();
  ok(/Sfax/i.test(await ui.frameLocator('#vov iframe').locator('body').innerText()), 'the fax receipt opens as text too');
  await ui.locator('#vov .vov-x').click();
  await noDownloads(H, 'after the PDFs');
  // an unauthorised session cannot read the file either (same rule as GET /files/)
  const url = (await H.state()).files.find(f => /signed/.test(f.url)).url;
  const st = await H.ev(async ([u, t]) => (await window.__vnet.fetch(u, { headers: { 'X-Psyflo-Session': t } })).status, [url, await H.tok('khale')]);
  ok(st === 403, 'direct support may not open the signed PDF (403)');
  H.noErrors(); await H.close();
}

// ---------------------------------------------------------------- Denial Intelligence: S5 by clicking, and the K.T. information reply through the mock Availity overlay
async function denial() {
  console.log('denial · R-0402 partial -> peer-to-peer -> outcome');
  const H = await fresh(); const { ui, page } = H;
  await H.signIn('Clinician');
  await H.api('demo.reset', { preset: 'canvas' }, 'dowens+p'); await page.waitForTimeout(600);
  await H.go('#/DenialIntelligence'); await ui.locator('.ui-qt__row').first().waitFor();
  ok(await ui.locator('.ui-qt__row').count() === 4, 'the queue lists four open cases');
  await ui.getByRole('link', { name: /R-0402/ }).first().click(); await ui.locator('.d-tabs').waitFor();
  ok(/D\.W\. · Partial approval/.test(await H.main()), 'the D.W. partial approval case opens');
  await ui.getByRole('link', { name: /^Evidence/ }).click(); ok(/Evidence missing — verify previous treatment outcome/.test(await H.main()), 'missing evidence prints "Evidence missing — verify …"');
  await ui.getByRole('link', { name: /^Options/ }).click(); const opt = await H.main();
  ok(/Accept decision/.test(opt) && /Prepare peer-to-peer/.test(opt) && /Payer rule not verified/.test(opt), 'options: accept, prepare a peer-to-peer; a payer rule is labelled not verified');
  await ui.getByRole('button', { name: 'Open' }).nth(1).click(); await ui.locator('#d-h-p2p').waitFor();
  await ui.getByRole('button', { name: /Ask Sentara for a peer-to-peer/ }).click(); await ui.getByRole('dialog').getByRole('button', { name: 'Log the request' }).click(); await page.waitForTimeout(600);
  await ui.getByRole('button', { name: 'Draft from records' }).click(); await page.waitForTimeout(600);
  ok(/Evidence missing — verify the risk of a more restrictive setting/.test(await H.main()) && /Simulated/.test(await H.main()), 'the call notes draft from records, with a Simulated chip and no invented evidence');
  await ui.getByRole('button', { name: 'Mark reviewed' }).click(); await page.waitForTimeout(400);
  await ui.getByRole('button', { name: 'Set the call' }).click(); await ui.locator('#d-when').fill('2026-11-19T14:00'); await ui.getByRole('dialog').getByRole('button', { name: 'Save the call' }).click(); await page.waitForTimeout(500);
  await ui.getByRole('button', { name: 'Log the outcome' }).click(); const dlg = ui.getByRole('dialog');
  await dlg.getByLabel('Approved in part').check(); await ui.locator('#d-ocu').fill('130');
  await dlg.getByRole('button', { name: 'Record the outcome' }).click(); await page.waitForTimeout(500);
  ok(await ui.getByRole('dialog').count() === 1 && /document reference/i.test(await ui.getByRole('dialog').innerText()), 'a decision needs its document: the dialog stays open and says so');
  await ui.locator('#d-ocd').fill('Sentara decision letter 2026-11-19'); await dlg.getByRole('button', { name: 'Record the outcome' }).click(); await page.waitForTimeout(900);
  const t = await H.main(); ok(/Partly overturned/.test(t) && /Peer-to-peer: 130 of 150 units approved \(110 offered\)/.test(t), 'the outcome is recorded: 130 of 150 units');
  await H.shot('denial-1-outcome');
  await ui.getByRole('link', { name: 'Open authorization' }).click(); await page.waitForTimeout(900);
  const s = await H.state(); ok(s.requests.find(r => r.id === 'R-0402').stage === 'active' && s.clients.find(c => c.id === 'DW').authorization.units === 130, 'back on the authorization: Active with 130 units');
  ok(s.lauris_tasks.some(x => x.client === 'DW' && x.units === 130 && x.status === 'open'), 'the human task "enter the units in Lauris" is open (Psyflo writes no units)');

  console.log('denial · K.T. information reply through the mock Availity overlay');
  await H.api('demo.reset', { preset: 'canvas' }, 'dowens+p'); await page.waitForTimeout(600);
  await H.go('#/DenialCase?id=R-0408&section=action&action=info'); await ui.locator('#d-h-info').waitFor();
  await ui.getByRole('button', { name: 'Draft from records' }).click(); await page.waitForTimeout(600);
  ok(await ui.getByRole('button', { name: 'Mark reviewed' }).isDisabled(), 'review is blocked while an "Evidence missing" placeholder remains');
  await ui.locator('.d-secdoc').nth(2).getByRole('button', { name: 'Edit' }).click();
  const ta = ui.locator('.d-edit textarea'); await ta.fill((await ta.inputValue()).replace(/\[Evidence missing[^\]]*\]/, 'The clinician states the supports do not include de-escalation in unstructured periods.'));
  await ui.getByRole('button', { name: 'Save section' }).click(); await page.waitForTimeout(500);
  await ui.getByRole('button', { name: 'Mark reviewed' }).click(); await page.waitForTimeout(400);
  await ui.getByRole('button', { name: /Open Availity and send/ }).click(); await ui.getByRole('dialog').getByRole('button', { name: /Open Availity/ }).click();
  await ui.locator('#vov').waitFor(); ok(/Availity|Portal/.test(await ui.locator('#vov .vov-t').innerText()), 'the mock Availity page opens in the overlay: ' + await ui.locator('#vov .vov-t').innerText());
  const AV = ui.frameLocator('#vov iframe'); await AV.locator('#portal-form').waitFor();
  await AV.locator('button[type=submit]').click(); await AV.locator('#portal-confirmation').waitFor({ timeout: 10000 });
  ok(/AV-\d+/.test(await AV.locator('#confirmation-number').innerText()), 'the portal confirms with a number');
  ok(await until(async () => (await stageOf(H, 'R-0408')) === 'submitted', 8000), 'the page bridge in the portal frame reports it: R-0408 is Submitted');
  const d = (await H.state()).disputes.find(x => x.request === 'R-0408'); ok(d.closed && d.status === 'resolved', 'the case closes when the page confirms');
  await ui.locator('#vov .vov-x').click();
  H.noErrors(); await H.close();
}

// ---------------------------------------------------------------- Analytics: three sections, the dataset toggle, export
async function analytics() {
  console.log('analytics · sections, dataset, export');
  const H = await fresh(); const { ui, page } = H;
  await H.signIn('Clinician');
  await H.go('#/Analytics'); await ui.locator('.a-card').first().waitFor();
  const tabs = await ui.locator('.a-tabs a').allInnerTexts(); ok(tabs.join('|') === 'Patient Outcomes|Payer Performance|Patient Population', 'three sections: ' + tabs.join(' | '));
  for (const [name, sec] of [['Payer Performance', 'payer'], ['Patient Population', 'population'], ['Patient Outcomes', 'outcomes']]) {
    await ui.locator('.a-tabs a', { hasText: name }).click(); await page.waitForTimeout(400);
    ok(new RegExp('section=' + sec).test(await H.hash()) && /Case-backed/.test(await ui.locator('.a-banner').innerText()), `${name}: the section opens on the case-backed dataset`);
  }
  await ui.getByRole('link', { name: 'Illustrative cohort' }).click(); await page.waitForTimeout(500);
  ok(/dataset=illustrative/.test(await H.hash()) && /Illustrative|Sample data|cohort/i.test(await ui.locator('.a-banner').innerText()), 'the dataset toggle switches to the illustrative cohort: ' + (await ui.locator('.a-banner').innerText()).replace(/\s+/g, ' ').slice(0, 80));
  ok(await ui.locator('#a-score-h').count() === 0, 'the pilot scorecard is case-backed only (not shown over the cohort)');
  await ui.getByRole('link', { name: 'Case-backed' }).first().click(); await page.waitForTimeout(400);
  await H.shot('analytics-1');
  // export: CSV then the three-section PDF open as text; the only action is "Open file", never a download
  await ui.locator('[data-x="export"]').click(); await ui.locator('[role="dialog"] input[name="a-fmt"]').first().waitFor();
  ok(await ui.getByRole('button', { name: 'Download' }).count() === 0, 'the export dialog does not offer Download');
  await ui.locator('input[name="a-fmt"][value="csv"]').check(); await ui.getByRole('button', { name: 'Open file' }).click(); await ui.locator('#vov').waitFor();
  let body = await ui.frameLocator('#vov iframe').locator('body').innerText();
  ok(/Psyflo analytics report/.test(body) && /Dataset,Case-backed/.test(body), 'the CSV export opens as text with its dataset named');
  await ui.locator('#vov .vov-x').click();
  await ui.locator('[data-x="export"]').click(); await ui.locator('input[name="a-fmt"][value="pdf"]').check(); await ui.locator('input[name="a-scope"][value="all"]').check();
  await ui.getByRole('button', { name: 'Open file' }).click(); await ui.locator('#vov').waitFor();
  body = await ui.frameLocator('#vov iframe').locator('body').innerText();
  ok(/Psyflo × Harvest · Analytics/.test(body) && /Page 1 of \d+/.test(body) && /Patient Outcomes/.test(body) && /Payer Performance/.test(body) && /Patient Population/.test(body), 'the three-section PDF export opens as text');
  await ui.locator('#vov .vov-x').click();
  ok(await until(async () => (await H.state()).events.some(e => /export/i.test(e.what) && /analytics|Analytics/i.test(e.what + e.record)), 3000) || (await H.state()).events.some(e => /export/i.test(e.what)), 'the export is in the audit trail');
  await noDownloads(H, 'after the exports');
  H.noErrors(); await H.close();
}

// ---------------------------------------------------------------- Settings: edit a rule, open the audit log
async function settings() {
  console.log('settings · rules edit');
  const H = await fresh(); const { ui, page } = H;
  await H.signIn('Admin');
  await H.go('#/Settings?tab=rules'); await ui.locator('.ui-qt tbody tr').first().waitFor();
  ok(await ui.locator('.ui-qt tbody tr').count() >= 70, 'all rules are listed');
  await ui.locator('.ui-fsearch input').fill('follow-up'); await page.waitForTimeout(400);
  ok(await ui.locator('.ui-qt tbody tr').count() === 1, 'search narrows to one rule');
  await ui.locator('.ui-qt [data-x="rule"]').click(); await ui.locator('.ui-dialog--drawer').waitFor();
  ok(/Harvest-reported/.test(await ui.locator('.ui-dialog--drawer').innerText()), 'the rule carries its verification label');
  await ui.locator('#se-rv').fill('7'); await ui.locator('.ui-dialog--drawer [data-ui-action="1"]').click(); await page.waitForTimeout(250);
  ok(/Say why/.test(await ui.locator('#se-rerr').innerText()), 'no reason, no change');
  await ui.locator('#se-why').fill('The clinic calls on day seven'); await ui.locator('.ui-dialog--drawer [data-ui-action="1"]').click(); await page.waitForTimeout(700);
  const s = await H.state('dowens'); const row = s.rules.find(r => r.key === 'decision.followup_day'); ok(row && row.value === 7, 'the rule is now 7 (forward only, audited)');
  ok(s.events.some(e => /Rule changed/.test(e.what) && /followup|follow-up/i.test(e.what)), 'the audit trail names the change');
  await H.go('#/Settings?tab=audit'); await ui.locator('.ui-qt tbody tr').first().waitFor();
  ok(await ui.getByRole('button', { name: 'Download CSV' }).count() === 0 && await ui.getByRole('button', { name: 'Open CSV' }).count() === 1, 'the audit log offers Open CSV, not Download CSV');
  await ui.getByRole('button', { name: 'Open CSV' }).click(); await ui.locator('#vov').waitFor();
  ok(/Rule changed/.test(await ui.frameLocator('#vov iframe').locator('body').innerText()), 'the audit log opens as text and holds the rule change');
  await ui.locator('#vov .vov-x').click();
  await H.go('#/Settings?tab=people'); await page.waitForTimeout(500); ok(await ui.locator('#root h1').count() === 1 && /Dana Owens/.test(await H.root(2000)), 'People opens (Users & roles)');
  await noDownloads(H);
  H.noErrors(); await H.close();
}

// ---------------------------------------------------------------- Referral REF-118: family link (hash route), five steps, consent, eligibility, mock DMAS overlay
async function referral() {
  console.log('referral · REF-118');
  const H = await fresh(); const { ui, page } = H;
  await H.signIn('Clinician');
  await H.go('#/Referrals'); await ui.locator('.ui-qt__row').first().waitFor();
  await ui.locator('a[href="#/Referral?id=REF-118"]').first().click(); await ui.locator('main h1').first().waitFor();
  ok(await until(async () => /REF-118/.test(await H.hash()) && /Next step/.test(await H.main()), 8000), 'the referral opens from the list: ' + await H.hash());
  await ui.getByRole('button', { name: 'Send the family link' }).click(); await page.waitForTimeout(1000);
  const href = await ui.locator('#fl-link').getAttribute('href'); ok(/\/f\/[\w-]+$/.test(href), 'the simulated text shows the family link: ' + href);
  ok((await H.state()).events.some(e => e.record === 'REF-118' && /SMS stub/.test(e.what) && e.sim), 'the text is a stub and says so');
  await ui.locator('#fl-link').click(); await ui.locator('#gname').waitFor({ timeout: 10000 });
  ok(/^#\/FamilyLink\?t=/.test(await H.hash()), 'the family link is a hash route of the page: ' + await H.hash());
  ok(/Step 1 of 5/.test(await H.root(2000)) && !!(await H.state()).family_links.find(f => f.referral === 'REF-118').opened_at, 'the link signs the guardian in (token session): the link is marked opened');
  for (let i = 0; i < 8; i++) {
    const has = async sel => (await ui.locator(sel).count()) > 0;
    if (await has('#gname')) { await ui.locator('#gname').fill('Denise Rivers'); await ui.locator('#phone').fill('(434) 555-0147'); }
    if (await has('#mid')) { const sel = ui.locator('#root select').first(); const o = (await sel.locator('option').allTextContents()).find(t => /health plan/.test(t)); await sel.selectOption({ label: o }); await ui.locator('#mid').fill('0912 456 789 01'); await ui.locator('#dob').fill('03/14/2014'); }
    for (const r of await ui.locator('#root input[type=radio]').all()) { const name = await r.getAttribute('name'); if (name && !(await ui.locator(`#root input[name="${name}"]:checked`).count())) await r.check({ force: true }); }
    for (const t of await ui.locator('#root textarea:visible').all()) if (!(await t.inputValue())) await t.fill('Afternoons after 2 pm');
    const next = ui.locator('#root a[href="#next"], #root a[href="#submit"]');
    if (!(await next.count())) break;
    await next.first().click(); await page.waitForTimeout(600);
  }
  const fl = (await H.state()).family_links.find(f => f.referral === 'REF-118'); ok(!!fl.submitted_at && fl.answers.medicaid_id === '0912 456 789 01', 'five steps: the family link is submitted with the insurance details');
  await ui.locator('#root a', { hasText: 'Open your family page' }).click(); await ui.locator('#root h1').first().waitFor();
  ok(/^#\/ParentPortal\?t=/.test(await H.hash()), 'the guardian page opens as a hash route too: ' + await H.hash());
  await H.go('#/ParentSign?t=' + fl.token); await ui.locator('canvas').first().waitFor();
  const bb = await ui.locator('canvas').first().boundingBox();
  await page.mouse.move(bb.x + 20, bb.y + 40); await page.mouse.down(); for (let x = 20; x < bb.width - 20; x += 15) await page.mouse.move(bb.x + x, bb.y + 40 + Math.sin(x / 15) * 20); await page.mouse.up();
  await ui.locator('#root a[href="#sign"]').first().click();
  ok(await until(async () => (await H.state()).consents.some(c => c.client === 'TW' && c.status === 'signed'), 8000), 'the guardian signs the consent (a PDF is stored)');
  const consent = (await H.state()).consents.find(c => c.client === 'TW'); ok(consent.signer === 'Denise Rivers' && /\/files\//.test(consent.file), 'the signer is the guardian behind the link');
  // back to the platform: a staff route restores the clinician; the eligibility panel and the mock DMAS lookup
  await H.go('#/Referral?id=REF-118&panel=eligibility'); await ui.locator('details[data-sec="eligibility"]').waitFor();
  ok(await until(async () => (await H.ev(() => window.psyflo.session.actor && window.psyflo.session.actor.id)) === 'jperez', 8000), 'a staff route restores the clinician session');
  await page.waitForTimeout(600); const panel = await ui.locator('details[data-sec="eligibility"]').innerText();
  ok(/Details received/.test(panel) && /Open the DMAS lookup/.test(panel), 'the eligibility panel: details received, a person runs the DMAS lookup');
  await ui.getByRole('link', { name: 'Open the DMAS lookup' }).click(); await ui.locator('#vov').waitFor();
  ok(/Virginia Medicaid|DMAS|Portal/i.test(await ui.locator('#vov .vov-t').innerText()), 'the mock DMAS lookup opens in the overlay: ' + await ui.locator('#vov .vov-t').innerText());
  const D = ui.frameLocator('#vov iframe'); await D.locator('button', { hasText: 'Look up' }).waitFor();
  await D.locator('button', { hasText: 'Look up' }).click(); await D.locator('.ok', { hasText: 'Active' }).waitFor({ timeout: 10000 });
  ok(/Cardinal Care/.test(await D.locator('body').innerText()), 'the lookup answers inside the overlay (a page load of the virtual portal)');
  await H.shot('referral-dmas'); await ui.locator('#vov .vov-x').click();
  await ui.getByRole('button', { name: 'Record result' }).click(); await page.waitForTimeout(400);
  await ui.locator('#a-el-p').selectOption('humana'); await ui.locator('#a-el-e').fill('2026-07-01'); await ui.getByRole('button', { name: 'Record result' }).click(); await page.waitForTimeout(1200);
  ok((await H.state()).referrals.find(r => r.id === 'REF-118').eligibility === 'active · Humana', 'a person records the DMAS result: active · Humana');
  ok(/Humana/.test(await ui.locator('details[data-sec="eligibility"]').innerText()), 'the eligibility panel shows the recorded result');
  await H.shot('referral-eligibility');
  await noDownloads(H); H.noErrors(); await H.close();
}

// ---------------------------------------------------------------- Flow A: the Lauris panel on a screening call (scripted call by the presenter command), then the intake
async function flowA() {
  console.log('flowA · screening');
  const H = await fresh(); const { ui, page } = H;
  await H.signIn('Clinician');
  await H.api('demo.scenario', { id: 'tw-eligible' }, 'dowens+p'); await page.waitForTimeout(800);
  await H.go('#/ExtScreening'); await H.lwait(null, /consumers\/new/); await H.panelReady();
  const P = H.P(), L = H.L();
  await P.getByText(/Fill \d+ boxes/).click();
  await P.getByText('Boxes typed. Check them').first().waitFor({ timeout: 20000 });
  ok(await L.locator('#lauris-form .in.y').count() === 6, 'the new-consumer boxes are typed from the referral (yellow)');
  await L.getByRole('button', { name: 'Save Consumer' }).click(); await H.lwait(null, /consumers\/\d+\?created/);
  await H.panelReady();
  await P.getByText('Open Admission Screening').click(); await H.lwait(null, /session\/screening/);
  ok(await until(async () => (await L.locator('#lauris-form .in.y').count()) >= 6, 15000), 'the screening opens with the pre-call boxes typed');
  await H.panelReady();
  // the scripted call: the presenter command (the microphone and Web Speech may be unavailable in a hosted page)
  await P.locator('body').evaluate(() => { window.__psyfloPanel.ui.fast = true; });
  await L.locator('body').evaluate(() => document.getElementById('psyflo-frame').contentWindow.postMessage({ psyflo: 'present', cmd: 'script' }, '*'));
  await P.getByText('Before you record').waitFor({ timeout: 10000 });
  ok(await P.getByText('Play the scripted call').count() + await P.getByText(/Agreed · start recording/).count() >= 1, 'the presenter command opens the scripted call (consent first)');
  await P.getByLabel(/Guardian agreed/).check(); await P.getByText('Agreed · start recording').click();
  await P.getByText('Before you hang up').waitFor({ timeout: 10000 });
  ok(await until(async () => (await P.locator('.cr.done').count()) === 6, 25000, 250), 'six prompts tick while the scripted call plays');
  await P.getByText('Stop and draft the boxes').click(); await P.getByText(/Fill the \d+ boxes/).click();
  ok(await until(async () => /Piedmont/.test(await L.locator('#lauris-form textarea').evaluateAll(ts => ts.map(t => t.value).join(' '))), 30000), 'the draft fills the boxes with what the call said (Piedmont Counseling)');
  const vals = await L.locator('#lauris-form label[for]').evaluateAll(ls => Object.fromEntries(ls.map(l => [l.textContent, document.getElementById(l.htmlFor).value])));
  const prior = vals['Prior / current services (provider · dates · outcome)'] || '';
  ok(/Piedmont Counseling, Mar–Jun/.test(prior) && !/School counseling weekly since Sep 2025/.test(prior), 'only what was said: nothing the call did not say');
  await H.shot('flowA-drafted');
  await L.getByRole('button', { name: 'Process Form' }).click(); await H.lwait(null, /processed=/);
  ok(await until(async () => { const s = await H.state(); return s.screenings.find(x => x.client === 'TW')?.status === 'done' && s.referrals.find(r => r.id === 'REF-118').stage === 'in_intake'; }, 10000), 'Process Form (a person) is observed: the screening is done, the referral is in intake');
  ok((await H.state()).events.some(e => e.record === 'REF-118' && /Screening processed/.test(e.what) && e.actor_kind === 'bridge'), 'recorded from the bridge event');
  await H.panelReady(); await P.getByText('Open the intake (CNA)').click(); await H.lwait(null, /session\/cna/);
  await P.getByText('copied from screening').first().waitFor({ timeout: 20000 }); ok(true, 'the intake opens with the screening answers carried forward');
  await H.shot('flowA-cna');
  H.noErrors(); await H.close();
}

// ---------------------------------------------------------------- Flow B: phone dictation (the example) -> the daily note in the Lauris frame -> Process Form
async function flowB() {
  console.log('flowB · phone and daily note');
  const H = await fresh({ width: 390, height: 844 }); const { ui, page } = H;
  await H.signIn('Direct support');
  await H.go('#/MobileApp'); await ui.locator('.pm-chip').first().waitFor();
  ok(/4 of 6 daily notes processed today/.test(await H.root(2000)), 'the phone shows 4 of 6 daily notes today');
  await ui.locator('.pm-chip', { hasText: 'M.R.' }).click(); await page.waitForTimeout(300);
  ok(/Harvest # 3310/.test(await ui.locator('.pm-bar').innerText()), 'M.R. is picked with the Harvest # on the identity card');
  await H.go('#/MobileDictate?client=MR'); await ui.locator('#spoken').waitFor({ timeout: 10000 });
  ok(await ui.locator('a[href="#example"]').count() === 1, 'the presenter example is offered (no microphone needed)');
  await ui.locator('a[href="#example"]').click(); await page.waitForTimeout(400);
  ok(/^played basketball with M\.R\./i.test(await ui.locator('#spoken').inputValue()), 'the example fills the words');
  await ui.getByRole('link', { name: 'Looks right' }).click(); await page.waitForTimeout(300);
  ok(/Save to M\.R\. \(grade 2, Campbell ES-1\)\?/.test(await H.root(3000)), 'a confirmation names the student and the school');
  await ui.getByRole('link', { name: 'Save to M.R.' }).click();
  ok(await until(async () => (await H.state('khale')).dictations.some(d => d.client === 'MR' && d.status === 'waiting'), 8000), 'the dictation waits in Psyflo (with the Harvest #); nothing reaches Lauris');
  ok(/Waiting for Lauris/.test(await H.root(3000)), 'the phone says Waiting for Lauris');
  await H.shot('flowB-phone');
  await H.ctx.close();
  // the daily note, on a desktop page of its own (the same in-memory demo cannot be shared across pages): the dictation is saved through the API first
  const D = await fresh(); const { ui: ui2, page: p2 } = D;
  await D.signIn('Direct support');
  await D.api('dictation.save', { client: 'MR', spoken: 'played basketball with M.R. after he got upset in math, he cooled down after and went back to class', rewritten: '' }, 'khale');
  await D.go('#/ExtDPN?client=MR'); await D.lwait(null, /3310\/session\/dpn/); await D.panelReady();
  const P = D.P(), L = D.L();
  await P.getByText('Dictation dropped in').waitFor({ timeout: 20000 });
  const v = await L.locator('#lauris-form label[for]').evaluateAll(ls => Object.fromEntries(ls.map(l => [l.textContent, document.getElementById(l.htmlFor).value])));
  ok(/^Played basketball with M\.R\. after he got upset in math/.test(v['Narrative'].replace(/\s+/g, ' ').trim()), 'the dictation drops in as the staffer\'s own words');
  ok(v['Mood check-in'] === '' && v['Progress today'] === '' && v['Units'] === '', 'nothing invented: mood and progress stay blank; units are left for the person to type in Lauris');
  await L.getByLabel('Direct time', { exact: true }).fill('3 h 40 min'); await L.getByLabel('Units', { exact: true }).fill('2');
  await L.getByRole('button', { name: 'Process Form' }).click(); await D.lwait(null, /processed=/);
  ok(await until(async () => { const s = await D.state('khale'); const mine = s.clients.filter(c => c.staff === 'khale'); const done = new Set(s.notes.filter(n => n.staff === 'khale' && n.type === 'daily' && n.date === s.today).map(n => n.client)); return mine.filter(c => done.has(c.id)).length === 5; }, 10000), 'Process Form (a person) is observed: 5 of 6 daily notes');
  const st = await D.state('khale'); ok(st.dictations.find(d => d.client === 'MR').status === 'used', 'the dictation is marked used');
  await D.shot('flowB-lauris');
  D.noErrors('daily note'); await D.close(); H.noErrors('phone');
}

// ---------------------------------------------------------------- Flow C: ISP, initial SRA, Process Form, approval, Get Signature, Send
async function flowC() {
  console.log('flowC · ISP, SRA, sign-off');
  const H = await fresh(); const { ui, page } = H;
  await H.signIn('Clinician');
  await H.api('demo.scenario', { id: 'tw-screened' }, 'dowens+p'); await page.waitForTimeout(800);
  const no = (await H.state()).clients.find(c => c.id === 'TW').lauris_no; ok(!!no, 'T.W. is in the mock Lauris with a Harvest #: ' + no);
  await H.go('#/ExtISP'); await H.lwait(null, /session\/isp/); await H.panelReady();
  const P = H.P(), L = H.L();
  await P.getByText('Fill the 3 goals').click();
  await P.getByText(/boxes? typed into the form/).first().waitFor({ timeout: 30000 });
  ok((await L.locator('#lauris-form .in.y').count()) >= 3, 'the three goals are typed (yellow), and the panel says so');
  await L.getByRole('button', { name: 'Process Form' }).click(); await H.lwait(null, /processed=/);
  ok(await until(async () => (await stageOf(H, 'R-0416')) === 'draft_ready', 10000), 'Process Form on the ISP drafts the request R-0416');
  await H.go('#/ExtSRA'); await H.lwait(null, /sra-initial/); await H.panelReady();
  await reviewAndFill(P);
  await P.getByText(/boxes typed into the form/).first().waitFor({ timeout: 30000 });
  const v = await L.locator('#lauris-form label[for]').evaluateAll(ls => Object.fromEntries(ls.map(l => [l.textContent, document.getElementById(l.htmlFor).value])));
  ok(!v['Section I · criterion 3 — recognise danger to self or others'] && !v['Section III · trauma-informed care'], 'criterion 3 and trauma-informed care are left blank: no invented text');
  ok(!/Harvest will coordinate|monthly/i.test(v['Care coordination'] || ''), 'no promise written for the clinician');
  await L.getByRole('button', { name: 'Process Form' }).click(); await H.lwait(null, /processed=/);
  ok(await until(async () => (await stageOf(H, 'R-0416')) === 'needs_approval', 10000), 'Process Form lands in Pending clinical approval (observed)');
  // the approver records the approval in the platform
  await H.go('#/Authorization?id=R-0416'); await ui.locator('main').getByText('Pending clinical approval').first().waitFor();
  await ui.getByRole('button', { name: 'Approve', exact: true }).first().click(); await ui.getByRole('dialog').getByRole('button', { name: 'Approve', exact: true }).click();
  ok(await until(async () => (await stageOf(H, 'R-0416')) === 'awaiting_signature'), 'the approval is recorded: awaiting signature');
  // Get Signature in Forms to Approve, inline on the extension route
  await H.go('#/ExtSignOff'); await H.lwait(null, /\/approvals/); await H.panelReady();
  await L.locator('#approval-list tr', { hasText: 'Initial Service' }).filter({ hasText: 'T.W.' }).getByText('Preview').click();
  await P.getByText('Before you sign').waitFor({ timeout: 20000 }); await H.shot('flowC-signoff');
  await L.getByRole('button', { name: 'Get Signature' }).click(); await H.lwait(null, /signed=/);
  await P.getByText('Signed in Lauris.').waitFor({ timeout: 15000 });
  const r = (await H.state()).requests.find(q => q.id === 'R-0416'); ok(r.stage === 'signed' && r.signed_by === 'J. Perez, LPC' && r.approved_by === 'jperez', 'Get Signature is observed: signed by the Lauris user');
  await H.go('#/Authorization?id=R-0416');
  await ui.getByRole('button', { name: 'Send by fax' }).first().click(); await ui.getByRole('dialog').getByRole('button', { name: 'Send by fax' }).click();
  ok(await until(async () => (await stageOf(H, 'R-0416')) === 'submitted', 12000), 'Send (a person) and the simulated Sfax receipt: Submitted');
  const q = (await H.state()).requests.find(x => x.id === 'R-0416'); ok(/^F-\d+/.test(q.fax_ref) && q.decision_due > (await H.state()).today, 'the decision window comes from the rules table: ' + q.decision_due);
  H.noErrors(); await H.close();
}

// ---------------------------------------------------------------- the extension panel home and the phone, without Track Time (removed on Nov 11)
async function extension() {
  console.log('extension · panel home and phone');
  const H = await fresh(); const { ui } = H;
  await H.signIn('Direct support');
  await H.go('#/ExtDPN?client=MR'); await H.lwait(null, /3310\/session\/dpn/); await H.panelReady();
  const P = H.P();
  // the "psyflo" chip on the Lauris page turns the panel off and on (a virtual cookie and a page load)
  await H.L().locator('#psyflo-toggle').click();
  ok(await until(async () => (await H.L().locator('#psyflo-frame').count()) === 0 && /off/.test(await H.L().locator('#psyflo-toggle').innerText().catch(() => '')), 10000), 'the psyflo chip hides the panel: the mock Lauris page keeps working without it');
  await H.L().locator('#psyflo-toggle').click(); await H.panelReady();
  const t = await P.locator('body').innerText();
  ok(/Scribe/.test(t) && !/Track Time/.test(t) && !/your timer|Confirm \d+ units/.test(t), 'the panel offers Scribe and no Track Time, timer or unit confirmation');
  await H.shot('panel-home');
  // the phone (same demo): no timer, no time figures
  await H.go('#/MobileApp'); await ui.locator('.pm-chip').first().waitFor(); await ui.locator('.pm-chip', { hasText: 'M.R.' }).click(); await sleep(400);
  const pt = await ui.locator('body').innerText(); ok(/Say what happened/.test(pt) && !/Not timing|Current activity|four separate figures|timer/i.test(pt), 'the phone has no timer and no time figures');
  H.noErrors(); await H.close();
  // who gets what: a supervisor has no Scribe or Track Time and is told Scan & Enhance is for licensed clinical staff
  const S2 = await fresh(); await S2.signIn('Supervisor');
  await S2.go('#/ExtHome'); await S2.lwait(null, /lauris\.invalid\/consumers/); await S2.panelReady();
  const st = await S2.P().locator('body').innerText(); ok(!/Track Time/.test(st) && /Scan & Enhance is for licensed clinical staff/.test(st), 'a supervisor sees no Track Time and gets the Scan & Enhance reason');
  S2.noErrors('supervisor'); await S2.close();
}

// ---------------------------------------------------------------- the presenter dock: modes, scenario selector, role switcher, simulate, reset
async function dock() {
  console.log('dock · presenter tools');
  const H = await fresh(); const { ui, page } = H;
  await H.signIn('Supervisor');
  const dockEl = ui.locator('#dock');
  ok(await dockEl.isVisible() && /Hosted preview · data resets on reload/.test(await dockEl.innerText()), 'the dock handle shows the one hosted line: "Hosted preview · data resets on reload"');
  ok(/Presentation/.test(await dockEl.innerText()), 'Presentation mode is the default');
  await ui.locator('[data-dock="toggle"]').click(); await ui.locator('[data-dock-menu="scenario"]').waitFor();
  ok(/Hosted preview/.test(await dockEl.innerText()), 'the line stays when the dock is open');
  // modes
  await ui.locator('[data-dock="mode"]').click(); await page.waitForTimeout(300);
  ok(/Explore/.test(await ui.locator('.sh-dock__mode').innerText()) && await ui.locator('[data-dock-menu="screens"]').count() === 1, 'Explore mode: all features by role, and the All screens menu');
  await ui.locator('[data-dock-menu="screens"]').click(); await ui.locator('.sh-menu__q').fill('Authoriz'); await sleep(200);
  ok(await ui.locator('.sh-menu [role=menuitem]').count() >= 1, 'All screens searches the screens this role may open');
  await ui.locator('.sh-menu [role=menuitem]').first().click(); await sleep(800); ok(/Authorization/.test(await H.hash()), 'All screens opens the screen: ' + await H.hash());
  await ui.locator('[data-dock="mode"]').click(); await page.waitForTimeout(300); ok(/Presentation/.test(await ui.locator('.sh-dock__mode').innerText()), 'back to Presentation mode');
  // the scenario selector signs in as the scenario's person and opens its screen
  await ui.locator('[data-dock-menu="scenario"]').click();
  ok(await ui.locator('.sh-menu [role=menuitem]').count() === 6, 'the scenario selector lists the six scenarios');
  await ui.locator('.sh-menu [role=menuitem]', { hasText: 'Leadership view' }).click();
  ok(await until(async () => /Analytics/.test(await H.hash()) && (await H.ev(() => window.psyflo.session.user && window.psyflo.session.user.id)) === 'dowens', 10000), 'Scenario 6 signs in as the administrator and opens Analytics: ' + await H.hash());
  // the role switcher
  await ui.locator('[data-dock-menu="role"]').click(); await ui.locator('.sh-menu [role=menuitem]', { hasText: 'Clinician' }).click();
  ok(await until(async () => (await H.ev(() => window.psyflo.session.user && window.psyflo.session.user.id)) === 'jperez', 8000), 'Role: Clinician signs in as J. Perez');
  await ui.locator('[data-dock-menu="role"]').click(); await ui.locator('.sh-menu [role=menuitem]', { hasText: 'Guardian' }).click();
  ok(await until(async () => /ParentPortal/.test(await H.hash()), 8000) && (await ui.locator('#root h1').count()) >= 1, 'Role: Guardian opens the family portal: ' + await H.hash());
  await ui.locator('[data-dock-menu="role"]').click(); await ui.locator('.sh-menu [role=menuitem]', { hasText: 'School user' }).click();
  ok(await until(async () => /SchoolPortal/.test(await H.hash()), 8000), 'Role: School user opens the school portal: ' + await H.hash());
  await ui.locator('[data-dock-menu="role"]').click(); await ui.locator('.sh-menu [role=menuitem]', { hasText: 'Clinician' }).click();
  await until(async () => (await H.ev(() => window.psyflo.session.user && window.psyflo.session.user.id)) === 'jperez', 8000);
  // simulate: advance a day moves both clocks
  const before = (await H.state()).today;
  await ui.locator('[data-dock-menu="sim"]').click(); await ui.locator('.sh-menu [role=menuitem]', { hasText: 'Advance a day' }).click();
  ok(await until(async () => (await H.state()).today > before, 8000), `Advance a day: ${before} -> ${(await H.state()).today}`);
  const lauris = await H.ev(async () => { const r = await window.__vnet.lauris('GET', 'https://lauris.invalid/login?as=jperez&next=%2Fconsumers'); return r.html.match(/id="lauris-clock"[^>]*>([^<]+)</)[1]; });
  ok(lauris.slice(0, 10) !== '10/29/2026' && /10\/30\/2026|11\/0\d\/2026/.test(lauris), 'the mock Lauris clock moved with it: ' + lauris);
  // maturity, notes
  await ui.locator('[data-dock="maturity"]').click(); ok(await H.ev(() => document.documentElement.dataset.maturity) === 'all', 'Maturity shows every chip'); await ui.locator('[data-dock="maturity"]').click();
  await ui.locator('[data-dock="notes"]').click(); await ui.locator('.sh-note, [role=dialog]').first().waitFor(); ok(/How the data gets in/.test(await ui.locator('.sh-note, [role=dialog]').first().innerText()), 'Notes: "How the data gets in" for this screen'); await page.keyboard.press('Escape');
  // reset: both stores back to the seed
  await ui.locator('[data-dock-menu="reset"]').click(); await ui.locator('.sh-menu [role=menuitem]', { hasText: 'Live flows' }).click();
  await ui.getByRole('alertdialog').getByRole('button', { name: 'Reset', exact: true }).click();
  ok(await until(async () => { const s = await H.state(); return s.preset === 'live' && s.today === '2026-10-29'; }, 8000), 'Reset (Live flows): the preset and the date are back');
  ok(!(await H.state()).requests.some(r => r.id === 'R-0416'), 'and R-0416 is gone again (T.W. is a referral)');
  await ui.locator('[data-dock="hide"]').click(); ok(await dockEl.isHidden(), 'Hide closes the dock');
  H.noErrors(); await H.close();
}

// ---------------------------------------------------------------- run
const ORDER = [['static', null], ['roles', roles], ['narrow', narrow], ['auth', auth], ['denial', denial], ['analytics', analytics], ['settings', settings], ['referral', referral], ['flowA', flowA], ['flowB', flowB], ['flowC', flowC], ['extension', extension], ['dock', dock]];
for (const [name, fn] of ORDER) {
  if (ONLY && !ONLY.includes(name)) continue;
  if (name === 'static') { mode = 'file'; await staticChecks(); continue; }
  for (const m of MODES) { mode = m; console.log(`\n=== ${name} [${m}] ===`); try { await fn(); } catch (e) { fails.push(`[${m}] ${name}: ${e.message.split('\n')[0]}`); console.log('  FAIL', name, 'threw:', e.stack.split('\n').slice(0, 4).join(' | ')); } }
}
await browser.close();
console.log(fails.length ? `\nFAILED ${fails.length}:\n  ` + fails.join('\n  ') : '\nALL OK');
process.exit(fails.length ? 1 : 0);
