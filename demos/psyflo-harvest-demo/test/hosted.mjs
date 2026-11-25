// The hosted preview (hosted/index.html: the whole demo in one file, no server), driven through the UI.
// It opens the file from file:// directly AND inside an outer page <iframe sandbox="allow-scripts allow-forms allow-popups allow-modals">
// (no allow-same-origin, like a published artifact: localStorage, sessionStorage and cookies throw there, frames have opaque origins).
// Build first:  node scripts/build-hosted.mjs        Run:  node test/hosted.mjs        (MODE=direct|sandbox runs one; MODE=srcdoc is a third, optional: the page wrapped as srcdoc; ONLY=roles,flowAC,... picks scenarios)
// Scenarios (each starts from a fresh page, because a reload resets the demo):
//   roles     every role card signs in; every screen in web/js/registry.js a role may open renders without console errors
//   auth      Worklist → Authorizations → open a row → Approve, Send by fax (3 s Sfax stub), fax receipt, Log call, Resend
//   portal    Open Availity in the in-app overlay, submit, the confirmation reaches the request
//   elig      Eligibility re-verification: Verify, the DMAS lookup in the overlay, screenshot, Save
//   family    Flow D: send the family link, open it on the phone view, five steps, guardian signs (signed consent PDF), parent portal
//   phone     phone app: voice tag, Say what happened (example) → Looks right; Flow B: the daily note in the Lauris frame
//   flowAC    Lauris panel Flow A (screening: Fill, scripted call, Fill, Process Form, intake) then Flow C (ISP, SRA, Approve, Get Signature, Open Send)
//   lauris    presenter menu → Open mock Lauris (overlay with the panel, panel chip, sign out/in, search), Back; width of the phone and guardian screens at 390 px
//   demo      presenter menu: Demo: advance a day, receive a reply, Reset (both stores)
import { createRequire } from 'node:module'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/node22/lib/node_modules/playwright/index.js');
const FILE = new URL('../hosted/index.html', import.meta.url).href;
if (!fs.existsSync(new URL('../hosted/index.html', import.meta.url))) { console.error('hosted/index.html is missing: run node scripts/build-hosted.mjs'); process.exit(2); }
const { SCREENS, LEVEL } = await import('../web/js/registry.js');
const MODES = process.env.MODE ? process.env.MODE.split(',') : ['direct', 'sandbox'];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'hosted-test-'));
const OUTER = path.join(TMP, 'outer.html');
fs.writeFileSync(OUTER, `<!doctype html><html><body style="margin:0"><iframe id="outer" sandbox="allow-scripts allow-forms allow-popups allow-modals" src="${FILE}" style="width:100vw;height:100vh;border:0"></iframe></body></html>`);

const fails = []; let mode = '';
const ok = (cond, msg) => { if (!cond) { fails.push(`[${mode}] ${msg}`); console.log('  FAIL', msg); } else console.log('  ok  ', msg); };
const log = (...a) => console.log('  ·', ...a);
const until = async (fn, ms = 15000, step = 150) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch { } await new Promise(r => setTimeout(r, step)); } return false; };
// console messages that are not about the page: the Google Fonts link (no network in CI)
const BENIGN = m => /fonts\.g(oogleapis|static)\.com/.test(m.location().url) || /Failed to load resource/.test(m.text()) && /fonts\./.test(m.location().url);

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
    await page.evaluate(h => { const f = document.createElement('iframe'); f.id = 'outer'; f.setAttribute('sandbox', 'allow-scripts allow-forms allow-popups allow-modals'); f.style.cssText = 'width:100vw;height:100vh;border:0'; f.srcdoc = h; document.body.style.margin = '0'; document.body.appendChild(f); }, fs.readFileSync(new URL('../hosted/index.html', import.meta.url), 'utf8'));
    ui = page.frameLocator('#outer');
  } else { await page.goto(FILE); ui = page; }
  await ui.locator('#root .u-login, #root').first().waitFor();
  const hosted = () => mode !== 'direct' ? page.frames().find(f => f !== page.mainFrame() && f.parentFrame() === page.mainFrame()) : page.mainFrame();
  const ev = (fn, arg) => hosted().evaluate(fn, arg);
  const H = {
    page, ui, errs, leaks, ctx, ev,
    doA: async (action, args) => { const r = await ev(async ([a, g]) => (await fetch('/api/do', { method: 'POST', body: JSON.stringify({ action: a, args: g }) })).json(), [action, args]); if (!r.ok) throw new Error(action + ': ' + r.error); return r.result; },
    state: () => ev(async () => (await fetch('/api/state')).json()),
    go: h => ev(h => window.__vhash(h), h),
    hash: () => ev(() => location.hash),
    signIn: async role => { await ui.getByRole('button', { name: role, exact: true }).click(); await ui.locator('a[href="#signin"]').click(); await ui.locator('a[href="#signin"]').waitFor({ state: 'detached', timeout: 10000 }); },
    root: async (n = 400) => (await ui.locator('#root').innerText()).replace(/\s+/g, ' ').slice(0, n),
    openMenu: () => ui.locator('#present:visible, [data-present]:visible').first().click(),
    menu: async cmd => { await ui.locator('#present:visible, [data-present]:visible').first().click(); await ui.locator(`#pmenu [data-pm-cmd="${cmd}"]`).click(); },
    lauris: ui.frameLocator('iframe.xframe'), close: () => ctx.close()
  };
  H.panel = H.lauris.frameLocator('#psyflo-frame');
  H.lurl = () => H.lauris.locator('body').evaluate(() => window.__vurl).catch(() => '');
  H.lwait = async (re, ms = 15000) => ok(await until(async () => re.test(await H.lurl()), ms), `Lauris page matches ${re}: ${await H.lurl()}`.slice(0, 140));
  H.noErrors = what => { ok(H.errs.length === 0, `no console errors${what ? ' · ' + what : ''}${H.errs.length ? ': ' + H.errs.join(' | ').slice(0, 400) : ''}`); ok(H.leaks.length === 0, `no request leaves the page (only the Google Fonts stylesheet)${H.leaks.length ? ': ' + H.leaks.slice(0, 3).join(', ') : ''}`); };
  return H;
}

// ---------------------------------------------------------------- roles and every screen
async function roles() {
  const CARDS = [['Direct support', 'direct_support', 'khale'], ['Supervisor', 'supervisor', 'cdiaz'], ['Clinician', 'clinician', 'jperez'], ['Admin', 'admin', 'dowens']];
  for (const [card, role, user] of CARDS) {
    console.log(`roles · ${card}`);
    const H = await fresh(); const { ui, page, errs } = H;
    await H.signIn(card);
    const st = await H.state(); const landed = await H.hash(); const me = st.staff.find(s => s.id === user);
    ok(await H.ev(() => window.psyflo.session.user && window.psyflo.session.user.id) === user, `signed in as ${me.name} (the session survives without localStorage)`);
    log('landed on', landed || '(first screen)', '·', await H.root(90));
    ok(!(await ui.locator('#root pre.err').count()), 'landing screen has no error block');
    ok(errs.length === 0, 'no console errors at sign-in' + (errs.length ? ': ' + errs.join(' | ').slice(0, 300) : ''));
    const bad = [];
    for (const s of SCREENS) {
      if (s.id === 'Login') continue;
      const allowed = s.min === 0 || LEVEL[role] >= s.min;
      errs.length = 0;
      await H.go('#/' + s.id);
      if (!allowed) { await ui.locator('#root .denied').waitFor({ timeout: 5000 }).catch(() => { }); if (!(await ui.locator('#root .denied').count())) bad.push(s.id + ' should be hidden from ' + role); continue; }
      if (s.surface === 'ext') {
        const shown = await until(async () => /psyflo/i.test(await H.panel.locator('.ph, .pt, #panel').first().innerText().catch(() => '')) && (await H.panel.locator('#panel').innerText().catch(() => '')).length > 20, 15000, 250);
        if (!shown) bad.push(s.id + ' panel did not load');
      } else await ui.locator('#root').locator('*').first().waitFor({ timeout: 5000 }).catch(() => { });
      await page.waitForTimeout(s.surface === 'ext' ? 250 : 220);
      const txt = await H.root(60);
      if (await ui.locator('#root pre.err').count()) bad.push(s.id + ' error block: ' + (await ui.locator('#root pre.err').innerText()).slice(0, 120));
      if (s.surface !== 'ext' && txt.length < 3) bad.push(s.id + ' rendered nothing');
      if (errs.length) bad.push(`${s.id}: ${errs.join(' | ').slice(0, 200)}`);
    }
    const n = SCREENS.filter(s => s.id !== 'Login' && (s.min === 0 || LEVEL[role] >= s.min)).length;
    ok(bad.length === 0, `${n} screens open as ${card}, the rest are hidden${bad.length ? ': ' + bad.join(' ; ') : ''}`);
    await H.close();
  }
}

// ---------------------------------------------------------------- Authorizations: Flow E (approve, send by fax) and Flow G (log a call, resend)
async function auth() {
  console.log('auth · Worklist → Authorizations → drawer');
  const H = await fresh(); const { ui, page } = H;
  await H.signIn('Clinician');
  await H.doA('request.ensure', { id: 'R-0416', client: 'TW', type: 'initial' });
  await H.doA('request.processed', { id: 'R-0416', session: 'hosted' });
  await ui.locator('#root .u-rows, #root .u-headline').first().waitFor();
  ok(/Worklist/.test(await H.root(60)), 'the clinician lands on the Worklist');
  await ui.locator('#root aside a.nav', { hasText: 'Authorizations' }).click();
  await ui.locator('tr[data-row="R-0416"]').waitFor();
  const row = ui.locator('tr[data-row="R-0416"]');
  ok(/Pending clinical approval/.test(await row.innerText()), 'row reads Pending clinical approval');
  await row.click(); await ui.locator('.u-drawer').waitFor();
  const dr = ui.locator('.u-drawer');
  await dr.getByRole('button', { name: 'Approve' }).click();
  ok(await until(async () => (await H.state()).requests.find(q => q.id === 'R-0416').stage === 'awaiting_signature'), 'Approve moves the request to Pending signature');
  await H.doA('request.signed', { id: 'R-0416', preview: [{ text: 'TDT Initial SRA · T.W.' }, { text: 'Section I · criterion 1' }] });   // what the panel reports after Get Signature (done through Lauris in flowAC)
  await dr.getByRole('button', { name: 'Send by fax' }).click();
  ok(await until(async () => (await H.state()).requests.find(q => q.id === 'R-0416').stage === 'sending', 3000), 'Send by fax: the request is sending');
  ok(await until(async () => (await H.state()).requests.find(q => q.id === 'R-0416').stage === 'submitted', 8000), 'the Sfax stub answers after about 3 s: Submitted');
  const r = (await H.state()).requests.find(q => q.id === 'R-0416'); ok(!!r.fax_ref && !!r.delivery_receipt, `fax reference ${r.fax_ref} and a delivery receipt are stored`);
  await page.waitForTimeout(500);
  ok(/Submitted · Day 0/.test(await dr.innerText()) && /Delivery receipt/.test(await dr.innerText()), 'drawer reads Submitted · Day 0 with the delivery receipt in the log');
  await dr.getByRole('button', { name: 'Fax receipt' }).click();
  await ui.locator('#vov').waitFor();
  ok(/Sfax delivery receipt/.test(await ui.locator('#vov iframe').contentFrame().locator('body').innerText()), 'the fax receipt opens in the in-app viewer as a PDF');
  ok((await ui.locator('#vov .vov-b', { hasText: 'Download PDF' }).count()) === 1, 'the viewer offers Download PDF');
  await ui.locator('#vov .vov-x').click(); ok((await ui.locator('#vov').count()) === 0, 'Close closes the viewer');
  await ui.locator('.u-drawer').getByRole('button', { name: 'Signed PDF' }).click();
  ok(/TDT Initial SRA/.test(await ui.locator('#vov iframe').contentFrame().locator('body').innerText()), 'the signed PDF opens too');
  await page.keyboard.press('Escape'); await ui.locator('#vov').waitFor({ state: 'detached', timeout: 3000 }).catch(() => { });
  // Flow G: R-0399 is at day 10; Log call, then "Not found" brings back Resend
  await H.go('#/Authorizations?open=R-0399');
  await ui.locator('.u-drawer').waitFor();
  ok(/Day 10/.test(await ui.locator('tr[data-row="R-0399"]').innerText()), 'R-0399 reads Day 10 · follow-up');
  await dr.getByRole('button', { name: 'Log call' }).click(); await ui.locator('#modal .mbox').waitFor();
  await ui.locator('#modal #b1-note').fill('Spoke to Dee at provider services');
  await ui.locator('#modal [data-go]').click();
  ok(await until(async () => (await H.state()).requests.find(q => q.id === 'R-0399').follow_up?.outcome === 'received'), 'Log call is stored on the request');
  await dr.getByRole('button', { name: 'Log call' }).click(); await ui.locator('#modal .mbox').waitFor();
  await ui.locator('#modal input[value="not_found"]').check(); await ui.locator('#modal [data-go]').click();
  ok(await until(async () => (await H.state()).requests.find(q => q.id === 'R-0399').resend === true), '"Fax not found" flags the request for a resend');
  await dr.getByRole('button', { name: 'Resend' }).click();
  ok(await until(async () => { const q = (await H.state()).requests.find(x => x.id === 'R-0399'); return q.stage === 'submitted' && !q.resend; }, 9000), 'Resend runs the Sfax stub again');
  H.noErrors('Authorizations'); await H.close();
}

// ---------------------------------------------------------------- a portal in the overlay (Availity), confirmation read back
async function portal() {
  console.log('portal · Open Availity in the overlay');
  const H = await fresh(); const { ui, page } = H;
  await H.signIn('Admin');
  await H.doA('request.processed', { id: 'R-0411', session: 'hosted' }); await H.doA('request.approve', { id: 'R-0411', by: 'dowens' }).catch(() => { });
  await H.doA('request.signed', { id: 'R-0411', preview: [{ text: 'CMHRS Continued Stay' }] });
  await H.go('#/Authorizations?open=R-0411'); await ui.locator('.u-drawer').waitFor();
  await ui.locator('.u-drawer').getByRole('button', { name: /Open Availity/ }).click();
  const f = ui.locator('#vov iframe').contentFrame();
  await f.locator('#portal-form').waitFor({ timeout: 10000 });
  ok(/Availity/.test(await ui.locator('#vov .vov-t').innerText()), 'the portal opens in the overlay: ' + await ui.locator('#vov .vov-t').innerText());
  await f.getByRole('button', { name: 'Submit' }).click();
  await f.locator('#portal-confirmation').waitFor({ timeout: 10000 });
  const ref = await f.locator('#confirmation-number').innerText();
  ok(await until(async () => { const q = (await H.state()).requests.find(r => r.id === 'R-0411'); return q.stage === 'submitted' && q.portal_ref === ref; }), `the confirmation ${ref} reached the request: Submitted`);
  await ui.locator('#vov .vov-x').click();
  ok(/Submitted/.test(await ui.locator('.u-drawer').innerText()), 'after Close the drawer shows Submitted');
  // the state incident portal, opened from the panel's "State portal" button (window.open inside the panel frame)
  await H.go('#/ExtIncident?client=DW');
  await H.panel.locator('[data-act="statePortal"]').click({ timeout: 25000 });
  const g = ui.locator('#vov iframe').contentFrame(); await g.getByRole('button', { name: 'File report' }).waitFor({ timeout: 10000 });
  ok(/CHRIS/.test(await ui.locator('#vov .vov-t').innerText()), 'the panel opens the state incident portal in the overlay');
  await g.getByRole('button', { name: 'File report' }).click(); await g.locator('#portal-confirmation').waitFor({ timeout: 10000 });
  ok(await until(async () => (await H.state()).events.some(e => /Level 2 incident filed on the state portal/.test(e.what))), 'filing is logged in Psyflo (the panel button and the confirmation page)');
  H.noErrors('portal'); await H.close();
}

// ---------------------------------------------------------------- Flow F: eligibility re-verification
async function elig() {
  console.log('elig · Eligibility re-verification');
  const H = await fresh(); const { ui, page } = H;
  await H.signIn('Clinician');
  const s0 = await H.state(); const due0 = s0.eligibility.filter(e => e.kind === 'reverify' && e.next_check <= s0.today).length;
  const wl = ui.locator('.u-row', { hasText: 'Eligibility re-verification' });
  await wl.waitFor(); ok((await wl.innerText()).includes(`${due0} due`), `Worklist line reads "${due0} due"`);
  await wl.getByRole('link', { name: 'Start' }).click();
  await ui.locator('tbody tr').first().waitFor();
  const client = s0.eligibility.filter(e => e.kind === 'reverify').sort((a, b) => a.next_check.localeCompare(b.next_check) || a.checked_at.localeCompare(b.checked_at))[0].client;
  await ui.locator('tbody tr').first().getByRole('button', { name: 'Verify' }).click(); await ui.locator('#modal .mbox').waitFor();
  const link = ui.locator('#modal a[target=_blank]'); ok(/dmas\/lookup/.test(await link.getAttribute('href')), 'the modal links to the DMAS lookup');
  await link.click(); await ui.locator('#vov iframe').waitFor();
  const dm = ui.locator('#vov iframe').contentFrame();
  await dm.getByRole('button', { name: 'Look up' }).waitFor({ timeout: 8000 });
  ok(/DMAS/.test(await dm.locator('.top').innerText()), 'the DMAS lookup opens in the overlay (a popup stand-in)');
  await dm.locator('#id').fill('0912 456 789 01'); await dm.getByRole('button', { name: 'Look up' }).click();
  await dm.locator('.ok').waitFor({ timeout: 8000 }); ok(/Active/.test(await dm.locator('.ok').innerText()), 'the lookup answers inside the overlay (a form submit became a virtual page load)');
  await ui.locator('#vov .vov-x').click();
  ok((await ui.locator('#modal [data-go]').getAttribute('aria-disabled')) === 'true', 'Save waits for a screenshot');
  await ui.locator('#modal #b1-demo').click();
  await ui.locator('#modal [data-go]').click();
  ok(await until(async () => (await H.state()).eligibility.find(e => e.kind === 'reverify' && e.client === client).next_check === '2026-11-05'), 'Save stores the result; the next check is seven days out');
  const s = await H.state(); const after = s.eligibility.find(e => e.kind === 'reverify' && e.client === client);
  const f = s.files.find(f => f.kind === 'eligibility_proof' && f.name === after.screenshot);
  ok(!!f, 'the proof is a PDF kept in Psyflo: ' + after.screenshot);
  const pdf = await H.ev(async u => { const r = await fetch(u); return { status: r.status, type: r.headers.get('content-type'), n: (await r.arrayBuffer()).byteLength }; }, f.url);
  ok(pdf.status === 200 && /pdf/.test(pdf.type) && pdf.n > 500, `GET ${f.url} → ${pdf.status} ${pdf.type} ${pdf.n} bytes`);
  H.noErrors('eligibility'); await H.close();
}

// ---------------------------------------------------------------- Flow D: the family link on the phone view
async function family() {
  console.log('family · Flow D');
  const H = await fresh(); const { ui, page } = H;
  await H.signIn('Clinician');
  await H.go('#/Referral?id=REF-118');
  await ui.getByRole('button', { name: 'Send family link' }).click();
  const a = ui.locator('a.b1-url'); await a.waitFor();
  const href = await a.getAttribute('href'); ok(/#\/FamilyLink\?t=tw-/.test(href), 'the link is a hash route of the page: ' + href.replace(/^.*(#.*)$/, '$1'));
  const tok = (await H.state()).family_links.find(f => f.referral === 'REF-118').token;
  await page.setViewportSize({ width: 390, height: 844 });
  await a.click();
  await ui.locator('#q').waitFor();
  ok((await H.hash()).includes('FamilyLink'), 'clicking the link opens the family screens (same page, hash route)');
  const first = await ui.locator('#q').innerText();
  await ui.locator('#root a[href="#es"]').click(); ok((await ui.locator('#q').innerText()) !== first, 'EN/ES toggle works');
  await ui.locator('#root a[href="#en"]').click();
  const seq = [];
  for (let i = 0; i < 16; i++) {
    const has = async sel => (await ui.locator(sel).count()) > 0;
    if (!(await has('#q'))) break;
    seq.push((await ui.locator('#q').innerText()).replace(/\s+/g, ' '));
    if (await has('#gname')) await ui.locator('#gname').fill('Denise Rivers');
    if (await has('#phone')) await ui.locator('#phone').fill('(434) 555-0147');
    if (await has('#plan')) { const o = (await ui.locator('#plan option').allTextContents()).find(t => /health plan/.test(t)); await ui.locator('#plan').selectOption({ label: o }); }
    if (await has('#mid')) await ui.locator('#mid').fill('0912 456 789 01');
    if (await has('#dob')) await ui.locator('#dob').fill('03/14/2014');
    for (const r of await ui.locator('#root input[type=radio]').all()) { const name = await r.getAttribute('name'); if (name && !(await ui.locator(`#root input[name="${name}"]:checked`).count())) await r.check({ force: true }); }
    await ui.locator('#root a[href="#next"]').first().click(); await page.waitForTimeout(350);
  }
  ok(seq.length >= 8, `one question per screen (${seq.length} screens)`);
  await ui.getByText(/Thank you/).first().waitFor({ timeout: 8000 });
  const wide = await H.ev(() => document.documentElement.scrollWidth); ok(wide <= 390, `no horizontal scroll at 390 px (scrollWidth ${wide})`);
  let s = await H.state(); const fl = s.family_links.find(f => f.referral === 'REF-118'); const el = s.eligibility.find(e => e.referral === 'REF-118');
  ok(!!fl.submitted_at && ['guardian', 'insurance', 'consent', 'best_time', 'transport'].every(k => fl.steps[k]), 'family link submitted, five steps done');
  ok(el.status === 'details_received' && /0912/.test(el.lookup?.medicaid_id || ''), 'Eligibility has the lookup details: ' + el.status);
  await H.doA('eligibility.record', { referral: 'REF-118', result: 'active', plan: 'humana', effective: '2026-07-01' });
  ok((await H.state()).referrals.find(r => r.id === 'REF-118').eligibility === 'active · Humana', 'recording the result updates the referral chip');
  // the guardian signs
  await H.go(`#/ParentSign?t=${tok}`);
  const cv = ui.locator('canvas').first(); await cv.waitFor();
  const bb = await cv.boundingBox();
  await page.mouse.move(bb.x + 20, bb.y + 40); await page.mouse.down(); for (let x = 20; x < bb.width - 20; x += 15) await page.mouse.move(bb.x + x, bb.y + 40 + Math.sin(x / 15) * 20); await page.mouse.up();
  await ui.locator('#root a[href="#sign"]').first().click();
  ok(await until(async () => { const c = (await H.state()).consents.find(x => x.client === 'TW'); return c?.status === 'signed' && !!c.file; }), 'consent signed with a PDF');
  const cf = (await H.state()).consents.find(x => x.client === 'TW').file;
  const cpdf = await H.ev(async u => { const r = await fetch(u); return { status: r.status, type: r.headers.get('content-type'), n: (await r.arrayBuffer()).byteLength }; }, cf);
  ok(cpdf.status === 200 && /pdf/.test(cpdf.type) && cpdf.n > 1000, `the signed consent is a real PDF in the in-page file store: ${cpdf.status} ${cpdf.n} bytes`);
  await H.go(`#/ParentPortal?t=${tok}`);
  ok(/School release/.test(await H.root(600)) && !/Consent for services/.test(await H.root(600)), 'the parent portal moved on: the consent is done, the school release is next');
  H.noErrors('family link'); await H.close();
}

// ---------------------------------------------------------------- the phone app (Flow D, C part) and Flow B
async function phone() {
  console.log('phone · phone app and Flow B');
  const H = await fresh({ width: 390, height: 844 }); const { ui, page } = H;
  await H.signIn('Direct support');
  await ui.locator('.c-timer').waitFor();
  ok(/MobileApp/.test(await H.hash()) || (await ui.locator('.c-timer').count()) === 1, 'Direct support lands on the phone app at 390 px');
  const t0 = (await H.state()).timers.khale.client;
  await H.menu('example'); ok(await until(async () => { const s = await H.state(); return s.timers.khale.client !== t0 && !!s.timers.khale.started; }), 'presenter "Use the example": the voice tag moves the timer');
  await ui.locator('.c-timer .c-btn').click(); ok(await until(async () => !(await H.state()).timers.khale.started), 'Stop saves the block');
  await ui.locator('a.c-btn.pri.lg').click(); await ui.locator('#spoken').waitFor();
  await H.menu('example'); ok(await until(async () => (await ui.locator('#spoken').inputValue()).length > 20), 'the example fills the dictation box (scripted fallback, no microphone needed)');
  await ui.getByText('Looks right').click();
  ok(await until(async () => (await H.state()).dictations.some(d => d.status === 'waiting' && d.staff === 'khale')), 'Looks right saves a dictation that waits for Lauris');
  const wide = await H.ev(() => document.documentElement.scrollWidth); ok(wide <= 390, `no horizontal scroll at 390 px (scrollWidth ${wide})`);
  // Flow B: the daily note in the Lauris frame
  const nt = s => { const mine = s.clients.filter(c => c.staff === 'khale'); const done = new Set(s.notes.filter(n => n.staff === 'khale' && n.type === 'daily' && n.date === s.today).map(n => n.client)); return `${mine.filter(c => done.has(c.id)).length} of ${mine.length}`; };
  const before = nt(await H.state());
  await H.doA('dictation.save', { client: 'MR', staff: 'khale', spoken: 'played basketball with M.R. after he got upset in math, he cooled down after and went back to class', rewritten: '' }).catch(() => { });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await H.go('#/ExtDPN?client=MR');
  await H.panel.getByText('Dictation dropped in').waitFor({ timeout: 25000 });
  const v = await H.lauris.locator('#lauris-form').evaluate(f => Object.fromEntries([...f.querySelectorAll('label[for]')].map(l => [l.textContent, document.getElementById(l.htmlFor).value])));
  ok((v['Narrative'] || '').length > 40, 'Narrative dropped in: ' + (v['Narrative'] || '').slice(0, 70) + '…');
  log('Direct time:', v['Direct time'], '· Units:', v['Units'], '· Mood:', v['Mood check-in']);
  await H.panel.getByRole('button', { name: /^Confirm \d units/ }).click(); await page.waitForTimeout(500);
  await H.lauris.getByRole('button', { name: 'Process Form' }).click();
  await H.lwait(/processed=/);
  ok(await until(async () => nt(await H.state()) !== before), `daily notes today ${before} → ${nt(await H.state())}`);
  H.noErrors('phone and Flow B'); await H.close();
}

// ---------------------------------------------------------------- Flows A and C through the Lauris frame and the panel
async function flowAC() {
  console.log('flowAC · Lauris panel Flows A then C');
  const H = await fresh({ width: 1440, height: 1000 }); const { ui, page } = H; const { lauris, panel } = H;
  await H.signIn('Clinician');
  const { token } = await H.doA('familyLink.send', { referral: 'REF-118' });
  await H.doA('familyLink.open', { token });
  await H.doA('familyLink.step', { token, step: 'guardian', answers: { guardian_name: 'Denise Rivers', relationship: 'grandmother', phone: '(434) 555-0147', language: 'English' } });
  await H.doA('familyLink.step', { token, step: 'insurance', answers: { plan_kind: 'Medicaid through a health plan', medicaid_id: '0912 456 789 01', dob: '2014-03-14' } });
  await H.doA('familyLink.submit', { token });
  await H.doA('eligibility.record', { referral: 'REF-118', result: 'active', plan: 'humana', effective: '2026-07-01' });
  // ---- Flow A
  await H.go('#/ExtScreening');
  await lauris.locator('#lauris-form').waitFor({ timeout: 20000 });
  ok(/consumers\/new\?referral=REF-118/.test(await H.lurl()), 'the Lauris frame opens New Consumer for REF-118: ' + await H.lurl());
  ok(/Lauris Online/.test(await lauris.locator('.top').innerText()), 'the mock Lauris renders in a frame');
  await panel.getByRole('button', { name: /Fill \d+ boxes/ }).click({ timeout: 20000 });
  await panel.getByText(/\d+ boxes? typed/).waitFor({ timeout: 20000 });
  ok((await lauris.locator('#lauris-form .in.y').count()) >= 6, 'new consumer boxes typed (yellow): ' + await lauris.locator('#lauris-form .in.y').count());
  await lauris.getByRole('button', { name: 'Save Consumer' }).click(); await H.lwait(/consumers\/\d+\?created/);
  await panel.getByRole('button', { name: 'Open screening' }).click(); await H.lwait(/session\/screening/);
  await panel.getByRole('button', { name: /Fill \d+ boxes/ }).click();
  ok(await until(async () => (await lauris.locator('#lauris-form .in.y').count()) >= 6), 'pre-call boxes typed yellow');
  const rec = panel.getByRole('button', { name: 'Record', exact: true }); await rec.waitFor();
  ok(await rec.isDisabled(), 'Record is disabled until Consent read is ticked');
  await panel.getByLabel('Consent read').check(); await page.waitForTimeout(300);
  ok(!(await rec.isDisabled()), 'Record is enabled after Consent read');
  await panel.locator('body').evaluate(() => { window.__psyfloPanel.ui.fast = true; });
  await H.menu('script');                                                    // presenter menu → Play the scripted call (no microphone)
  await panel.getByText('Still to ask').waitFor({ timeout: 15000 });
  const nLines = fs.readFileSync(new URL('../seed/scripts/screening_TW.txt', import.meta.url), 'utf8').split('\n').filter(Boolean).length;
  ok(await until(async () => (await panel.locator('body').evaluate(() => (window.__psyfloPanel.ui.transcript || '').split('\n').filter(Boolean).length)) >= nLines, 40000), `the scripted call plays to the end (${nLines} lines); prompts ticked: ${await panel.locator('.li.done').count()}`);
  await panel.getByRole('button', { name: 'Stop', exact: true }).click();
  await panel.getByRole('button', { name: /Fill \d+ boxes/ }).click();
  ok(await until(async () => /Piedmont/.test(await lauris.locator('#lauris-form textarea').evaluateAll(t => t.map(x => x.value).join(' '))), 40000), 'Fill drafts the screening boxes from the scripted call (Piedmont)');
  const ta = lauris.locator('#lauris-form textarea').nth(1); await ta.fill((await ta.inputValue()) + ' (edited by J. Perez)');
  await lauris.getByRole('button', { name: 'Process Form' }).click(); await H.lwait(/processed=/);
  ok(await until(async () => (await H.state()).screenings.find(x => x.client === 'TW')?.status === 'done'), 'Process Form is reported: screening done, 30-day clock ' + (await H.state()).clients.find(c => c.id === 'TW').clock30_start);
  await panel.getByRole('button', { name: 'Open intake' }).click(); await H.lwait(/session\/cna/);
  await panel.getByText('Copied from screening').first().waitFor({ timeout: 15000 });
  ok(true, 'the intake (CNA) shows what was copied from screening');
  // ---- Flow C
  const no = (await H.state()).clients.find(c => c.id === 'TW').lauris_no; ok(!!no, 'T.W. is in Lauris as #' + no);
  await H.go('#/ExtISP');
  await H.lwait(/session\/isp/); await panel.getByRole('button', { name: 'Fill the 3 goals' }).click({ timeout: 20000 });
  await panel.getByText(/\d+ boxes? typed/).waitFor({ timeout: 25000 });
  await lauris.getByRole('button', { name: 'Process Form' }).click(); await H.lwait(/processed=/);
  ok(await until(async () => (await H.state()).requests.find(r => r.id === 'R-0416')?.stage === 'draft_ready' || (await H.state()).requests.some(r => r.id === 'R-0416')), 'the ISP is processed: Psyflo drafts R-0416');
  await panel.getByRole('button', { name: 'Open request' }).click(); await H.lwait(/sra-initial/);
  await panel.getByRole('button', { name: /Fill \d+ boxes/ }).click();
  await panel.getByText(/\d+ boxes? typed/).waitFor({ timeout: 30000 });
  await lauris.getByRole('button', { name: 'Process Form' }).click(); await H.lwait(/processed=/);
  ok(await until(async () => (await H.state()).requests.find(r => r.id === 'R-0416').stage === 'needs_approval'), 'Process Form leaves R-0416 pending clinical approval');
  await panel.getByText(/pending clinical approval/).first().waitFor({ timeout: 15000 });
  await panel.getByRole('button', { name: 'Approve', exact: true }).click();
  await panel.getByText('Pending signature').first().waitFor({ timeout: 15000 });
  ok((await H.state()).requests.find(r => r.id === 'R-0416').stage === 'awaiting_signature', 'Approve in the panel: Pending signature');
  await panel.getByRole('button', { name: 'Open Forms to Approve' }).click(); await H.lwait(/approvals$/);
  await lauris.locator('#approval-list tr', { hasText: 'Initial Service' }).filter({ hasText: 'T.W.' }).getByText('Preview').click(); await H.lwait(/approvals\/\d+/);
  await panel.getByText('Pre-submission checks').waitFor({ timeout: 15000 });
  await lauris.getByRole('button', { name: 'Get Signature' }).click(); await H.lwait(/signed=/);
  await panel.getByText(/Signed.*ready to submit/).first().waitFor({ timeout: 20000 });
  const q = (await H.state()).requests.find(r => r.id === 'R-0416'); ok(q.stage === 'signed' && /\/files\//.test(q.signed_pdf), 'Get Signature: signed PDF saved ' + q.signed_pdf);
  const pdf = await H.ev(async u => { const r = await fetch(u); return { status: r.status, type: r.headers.get('content-type'), n: (await r.arrayBuffer()).byteLength }; }, q.signed_pdf);
  ok(pdf.status === 200 && /pdf/.test(pdf.type) && pdf.n > 1000, `signed PDF → ${pdf.status} ${pdf.type} ${pdf.n} bytes`);
  await panel.getByRole('button', { name: 'Open Send' }).click();            // Node: a new tab on Authorizations; hosted: the page itself moves there
  await ui.locator('.u-drawer').waitFor({ timeout: 15000 });
  ok(/Authorizations/.test(await H.hash()) && /open=R-0416/.test(await H.hash()), 'Open Send opens Authorizations with the request drawer: ' + await H.hash());
  await ui.locator('.u-drawer').getByRole('button', { name: 'Send by fax' }).click();
  ok(await until(async () => (await H.state()).requests.find(r => r.id === 'R-0416').stage === 'submitted', 9000), 'Send by fax: Sfax stub answers in about 3 s');
  const f = (await H.state()).requests.find(r => r.id === 'R-0416'); log('sent', f.sent, f.fax_ref, 'decision due', f.decision_due);
  H.noErrors('Lauris frame, panel and Flows A and C'); await H.close();
}

// ---------------------------------------------------------------- the mock Lauris from the presenter menu, and the narrow screens
async function lauris() {
  console.log('lauris · presenter menu and 390 px');
  const H = await fresh(); const { ui, page } = H;
  await H.signIn('Clinician');
  await H.openMenu();
  ok(/Hosted preview · data resets on reload/.test(await ui.locator('#pmenu').innerText()), 'the presenter menu carries the one hosted-preview line');
  await ui.locator('#pmenu a', { hasText: 'Open mock Lauris' }).click();
  const f = ui.locator('#vov iframe').contentFrame(); await f.locator('#consumer-list').waitFor({ timeout: 15000 });
  ok(await until(async () => (await f.frameLocator('#psyflo-frame').locator('#panel').innerText()).length > 20, 15000), 'Open mock Lauris opens it in the overlay, with the panel');
  ok(/J\. Perez/.test(await f.locator('.top .r').innerText()), 'signed in to Lauris as the presenter\'s role');
  // the panel chip (a virtual cookie + reload), Sign Out and Sign in (a POST), the consumer search (a GET form)
  await f.locator('#psyflo-toggle').click(); await f.locator('#psyflo-toggle', { hasText: 'psyflo · off' }).waitFor({ timeout: 8000 });
  ok((await f.locator('#psyflo-frame').count()) === 0, 'the psyflo chip hides the panel');
  await f.locator('#psyflo-toggle').click(); await f.locator('#psyflo-frame').waitFor({ timeout: 8000 });
  ok(true, 'and shows it again');
  await f.locator('#consumer-list').waitFor(); await f.locator('#fc').fill('M.R.'); await f.getByRole('button', { name: 'Search Consumers' }).click();
  ok(await until(async () => (await f.locator('#consumer-list tr[data-consumer]').count()) === 1 && /M\.R\./.test(await f.locator('#consumer-list').innerText())), 'Search Consumers (a GET form) filters the list');
  await f.getByRole('link', { name: 'Sign Out' }).click(); await f.locator('#u').waitFor({ timeout: 8000 });
  await f.locator('#u').fill('khale'); await f.getByRole('button', { name: 'Sign in' }).click(); await f.locator('#consumer-list').waitFor({ timeout: 8000 });
  ok(/K\. Hale/.test(await f.locator('.top .r').innerText()), 'Sign Out then Sign in as khale (a POST, a Set-Cookie, a redirect)');
  await ui.locator('#vov .vov-x').click();
  // the browser's Back button moves between the page's own routes
  await H.go('#/DoNext'); await H.go('#/Analytics'); await H.ev(() => history.back());
  ok(await until(async () => /DoNext/.test(await H.hash())), 'Back returns to the previous screen: ' + await H.hash());
  const narrow = SCREENS.filter(s => ['phone', 'parent'].includes(s.surface));
  await page.setViewportSize({ width: 390, height: 844 });
  const wide = [];
  for (const s of narrow) { await H.go('#/' + s.id); await page.waitForTimeout(250); const w = await H.ev(() => document.documentElement.scrollWidth); if (w > 390) wide.push(`${s.id} ${w}`); }
  ok(wide.length === 0, `${narrow.length} phone and guardian screens do not scroll sideways at 390 px${wide.length ? ': ' + wide.join(', ') : ''}`);
  H.noErrors('presenter menu and narrow screens'); await H.close();
}

// ---------------------------------------------------------------- the presenter menu's demo controls and Reset (both stores)
async function demo() {
  console.log('demo · receive a reply, advance a day, Reset');
  const H = await fresh(); const { ui, page } = H;
  await H.signIn('Admin');
  const today0 = (await H.state()).today;
  await H.openMenu(); await ui.locator('#pmenu [data-pm="advance"]').click();
  ok(await until(async () => (await H.state()).today !== today0), `Demo: advance a day moves the clock ${today0} → ${(await H.state()).today}`);
  await H.openMenu(); await ui.locator('#pmenu [data-pm="reply"]').click(); await ui.locator('#modal select#drq').waitFor();
  await ui.locator('#modal select#drq').selectOption('R-0399'); await ui.locator('#modal [data-k="partial"]').click();
  ok(await until(async () => (await H.state()).requests.find(r => r.id === 'R-0399').stage === 'partial_decide'), 'Demo: receive a reply → partial approval moves R-0399');
  await H.openMenu(); await ui.locator('#pmenu [data-pm="reset"]').click(); await ui.locator('#modal [data-p="canvas"]').click();
  ok(await until(async () => (await H.state()).preset === 'canvas'), 'Reset → Canvas snapshot resets the Psyflo store');
  const l = await H.ev(async () => { const r = await window.__vnet.renderPage('GET', 'https://lauris.invalid/login?as=jperez&next=%2Fconsumers%2F4492'); return { status: r.status, tw: /T\.W\./.test(r.html) }; });
  ok(l.status === 200 && l.tw, 'and the mock Lauris: T.W. is a consumer in the canvas snapshot');
  H.noErrors('demo controls'); await H.close();
}

const SCENARIOS = { roles, auth, portal, elig, family, phone, flowAC, lauris, demo };
for (mode of MODES) {
  console.log(`\n=== ${mode === 'sandbox' ? 'inside <iframe sandbox="allow-scripts allow-forms allow-popups allow-modals"> (opaque origin: storage and cookies throw)' : mode === 'srcdoc' ? 'the same sandboxed iframe, page given as srcdoc' : 'file:// directly'} ===`);
  for (const [name, fn] of Object.entries(SCENARIOS)) {
    if (ONLY && !ONLY.includes(name)) continue;
    const t = Date.now();
    try { await fn(); } catch (e) { fails.push(`[${mode}] ${name}: ${String(e.message || e).split('\n')[0]}`); console.log('  FAIL', name, 'threw:', String(e.stack || e).split('\n').slice(0, 4).join(' | ')); }
    console.log(`  (${name}: ${((Date.now() - t) / 1000).toFixed(1)} s)`);
  }
}
await browser.close(); fs.rmSync(TMP, { recursive: true, force: true });
console.log(fails.length ? `\n${fails.length} FAILED\n- ` + fails.join('\n- ') : '\nhosted preview: all checks passed');
process.exit(fails.length ? 1 : 0);
