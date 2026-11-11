// The decision pages (34 Additional info, 35 Partial approval, 36 Early discharge, 38 P2P call notes, 39 Appeal letter),
// driven through the UI against a running server:
//   BASE=http://localhost:4320 node test/decisions.mjs        (AS=jperez by default; PW=/path/to/playwright)
// · R-0402 (partial) through each of the three choices on fresh resets
// · the early discharge plan: three dates that agree with each other and with the units
// · R-0408 answered, edited, sent through the mock Availity (and by fax)
// · P2P call notes and a logged outcome on R-0388; the call date on a P2P that has none yet
// · the guardian appeal letter on R-0384 (EN/ES, change the wording, sign, signed PDF)
// · both data presets render every page without a console error
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/node22/lib/node_modules/playwright/index.js');
const BASE = process.env.BASE || 'http://localhost:4000';
const AS = process.env.AS || 'jperez';

let pass = 0, fail = 0;
const log = (ok, msg) => { ok ? pass++ : fail++; console.log((ok ? '  ok   ' : '  FAIL ') + msg); };
const eq = (a, b, msg) => log(a === b, `${msg}${a === b ? '' : ` — got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`}`);
const has = (hay, needle, msg) => log(String(hay).includes(needle), `${msg}${String(hay).includes(needle) ? '' : ` — ${JSON.stringify(String(hay).slice(0, 160))} lacks ${JSON.stringify(needle)}`}`);
const words = t => String(t).trim().split(/\s+/).filter(Boolean).length;

const api = async (action, args = {}) => (await fetch(BASE + '/api/do', { method: 'POST', body: JSON.stringify({ action, args }) })).json();
const state = async () => (await fetch(BASE + '/api/state')).json();
const req = async id => (await state()).requests.find(r => r.id === id);
const reset = async preset => { await api('demo.reset', { preset }); };

// school-day arithmetic, independent of the page code
const dow = d => new Date(d + 'T00:00:00Z').getUTCDay();
const isSchool = d => ![0, 6].includes(dow(d));
const plus = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const schoolFrom = d => { while (!isSchool(d)) d = plus(d, 1); return d; };
const plusSchool = (d, n) => { while (n > 0) { d = plus(d, 1); if (isSchool(d)) n--; } return d; };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = d => `${MON[+d.slice(5, 7) - 1]} ${+d.slice(8, 10)}`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errs = []; page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await page.goto(BASE + '/#/Login'); await page.evaluate(u => localStorage.setItem('psyflo_user', u), AS);

const open = async route => { await page.goto(BASE + '/#/' + route); await page.waitForSelector('#root .u-title, #root .ap-wrap', { timeout: 8000 }); await page.waitForTimeout(250); };
const text = sel => page.locator(sel).first().innerText();
// toasts live a few seconds, so clear them before the action and wait for the one we expect
const clearToasts = () => page.evaluate(() => { const t = document.getElementById('toasts'); if (t) t.innerHTML = ''; });
const toast = async want => { try { await page.locator('#toasts .toast', { hasText: want }).first().waitFor({ timeout: 6000 }); return want; } catch { return (await page.locator('#toasts .toast').allInnerTexts()).join(' | ') || '(no toast)'; } };
const poll = async (fn, ms = 6000) => { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await fn(); if (v) return v; await page.waitForTimeout(150); } return v; };

// ---------------------------------------------------------------------------------------------------------- 35 Partial approval
console.log('Partial approval · R-0402');
await reset('live');
await open('Partials?id=R-0402');
eq(await text('#root .u-title'), 'Sentara partial approval · 110 of 150 · D.W., 15', 'title');
eq(await text('#root .u-head .u-chip'), 'Reply by Oct 30', 'clock chip');
eq(await page.locator('#root [role=radio]').count(), 3, 'three radio rows');
const rows = await page.locator('#root [role=radio]').allInnerTexts();
has(rows[0], 'Accept 110, spread to Jan 30', 'row 1 title'); has(rows[0], '8 units a week', 'row 1 fragment');
has(rows[1], 'Accept, use them, discharge Dec 18', 'row 2 title'); has(rows[1], 'then new initial', 'row 2 fragment');
has(rows[2], 'Request P2P', 'row 3 title'); has(rows[2], 'call date needed', 'row 3 fragment');
eq(await page.locator('#root [role=radio][aria-checked=true]').count(), 1, 'one row is selected');
const body = await text('#root main');
log(!/Why insurers say no/i.test(body), 'the "Why insurers say no" table is gone');
log(!/logged, not sent/i.test(body), 'no "logged, not sent" chips');
has(await text('#root .b2-last'), 'Last time with Sentara', 'collapsed payer-history line');
has(await text('#root .b2-last'), '150 → 120 → 140 → 110', 'payer history 150 → 120 → 140 → 110');
eq(await page.locator('#root details.b2-last[open]').count(), 0, 'history line starts collapsed');
eq(await page.locator('#root .hlp').count(), 1, 'one ? on the page');
const tipText = await page.locator('#root .hlp').getAttribute('data-help');
log(words(tipText) <= 20, `the ? tip is ${words(tipText)} words (20 at most)`);
await page.hover('#root .hlp'); await page.waitForSelector('.tip[role=tooltip]', { timeout: 3000 }).catch(() => { });
eq(await page.locator('.tip[role=tooltip]').count() > 0 ? await text('.tip') : '(no tip)', tipText, 'hovering the ? shows the tip');
await page.mouse.move(5, 5);
await page.focus('#opt-use_up'); await page.keyboard.press('ArrowDown');
eq(await page.getAttribute('#opt-p2p', 'aria-checked'), 'true', 'arrow keys move the selection');
await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp');
eq(await page.getAttribute('#opt-stretch', 'aria-checked'), 'true', 'arrow keys wrap and move up');
eq(await page.locator('#root .u-btn.pri').count(), 1, 'exactly one filled button');

for (const [k, label, expect] of [['stretch', 'accept and stretch', 'active'], ['use_up', 'accept and use them up', 'early_discharge'], ['p2p', 'request P2P', 'peer_to_peer_requested']]) {
  console.log(`  choice: ${label}`);
  await reset('live');
  await open('Partials?id=R-0402');
  await page.click('#opt-' + k);
  eq(await page.getAttribute('#opt-' + k, 'aria-checked'), 'true', 'row selected');
  await clearToasts(); await page.getByRole('button', { name: 'Log decision' }).click();
  const want = k === 'p2p' ? 'Logged · P2P requested' : 'Logged · 110 units';
  has(await toast(want), want, 'toast');
  const r = await poll(async () => { const x = await req('R-0402'); return x.stage === expect ? x : null; });
  eq(r?.stage, expect, 'stage is ' + expect);
  eq(r?.decision?.door, k, 'decision door is ' + k);
  const ev = (await state()).events.filter(e => e.record === 'R-0402').pop();
  has(ev?.what || '', k === 'p2p' ? 'Asked Sentara for a peer-to-peer call' : 'Decision logged', 'event written on the request');
  if (k === 'stretch') { eq(r.units_awarded, 110, 'units awarded 110'); eq(r.stretch?.until, '2027-01-30', 'stretched to Jan 30'); await page.waitForSelector('#root .u-head .u-chip.ok'); has(await text('#root main'), 'Accept 110, spread to Jan 30', 'the page now shows what was logged'); }
  if (k === 'use_up') { await poll(async () => /EarlyDischarge/.test(page.url())); has(page.url(), 'EarlyDischarge', 'goes on to Early discharge'); }
  if (k === 'p2p') { await poll(async () => /PeerBrief/.test(page.url())); has(page.url(), 'PeerBrief', 'goes on to the call notes'); eq(r.p2p_at, undefined, 'no call date invented'); }
}

// ------------------------------------------------------------------------------------------------------------ 36 Early discharge
console.log('Early discharge · R-0402');
await reset('live');
{
  const s = await state(); const r = s.requests.find(x => x.id === 'R-0402'); const c = s.clients.find(x => x.id === 'DW'); const a = c.authorization;
  await api('request.partialChoice', { id: 'R-0402', choice: 'use_up', plan: {}, by: AS });
  await open('EarlyDischarge?id=R-0402');
  eq(await text('#root .u-title'), 'Early discharge · D.W., 15 · Sentara', 'title');
  const tiles = await page.locator('#root .b2-tile').allInnerTexts();
  eq(tiles.length, 3, 'three date tiles in a row');
  const box = await page.locator('#root .b2-tile').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)));
  log(box.every(y => y === box[0]), 'the tiles share one row');
  const days = Math.ceil(a.units / 3); const runout = plusSchool(schoolFrom(a.start), days - 1);
  const accepted = s.today; const restart = plus(accepted, s.clocks.restart_days);
  const newReq = schoolFrom(restart > plus(runout, 1) ? restart : plus(runout, 1));
  has(tiles[0], 'Units run out', 'tile 1 label'); has(tiles[0], fmt(runout), `units run out ${fmt(runout)} (110 units at 3 a school day = ${days} school days from ${fmt(a.start)})`);
  has(tiles[1], 'Discharge', 'tile 2 label'); has(tiles[1], fmt(runout), `discharge ${fmt(runout)}`);
  has(tiles[2], 'New request earliest', 'tile 3 label'); has(tiles[2], fmt(newReq), `new request earliest ${fmt(newReq)}`);
  log(newReq > runout && newReq >= plus(accepted, s.clocks.restart_days), 'dates agree: run out ≤ discharge < new request, and the new request is ≥ 30 days after acceptance');
  log(!/paragraph/i.test(await text('#root main')) && (await page.locator('#root main p').count()) === 0, 'no paragraph on the page');
  eq(await page.locator('#root .u-btn.pri').count(), 1, 'one filled button');
  await clearToasts(); await page.getByRole('button', { name: 'Set this plan' }).click();
  has(await toast('Plan set'), 'Plan set', 'toast');
  const st = await poll(async () => { const x = await state(); return x.plans.find(p => p.request === 'R-0402') ? x : null; });
  const plan = st?.plans.find(p => p.request === 'R-0402');
  eq(plan?.discharge, runout, 'plan.set stored the discharge date'); eq(plan?.new_initial, newReq, 'plan.set stored the new request date');
  eq(st?.reminders.filter(x => x.record === 'R-0402').length, 3, 'three reminders written');
  await page.waitForSelector('#root .u-head .u-chip.ok'); eq(await text('#root .u-head .u-chip'), 'Plan set', 'chip says Plan set');
  has(await text('#root .b2-foot .u-btn.pri'), 'Update plan', 'button becomes Update plan');
  const t2 = await page.locator('#root .b2-tile').allInnerTexts();
  has(t2[1], fmt(runout), 'tiles unchanged after the plan is set');
}

// ------------------------------------------------------------------------------------------------------------ 34 Additional info
console.log('Additional info · R-0408');
await reset('live');
await open('InfoRequest?id=R-0408');
eq(await text('#root .u-title'), 'Additional info · K.T., 9 · Anthem', 'title');
eq(await text('#root .u-head .u-chip'), '9 h left of 24', 'clock chip');
eq(await page.locator('#root ol.b2-q li').count(), 3, 'the three questions, numbered');
log(await page.locator('#root ol.b2-q[data-doc]').count() === 1, 'the questions sit inside data-doc');
has(await text('#root ol.b2-q'), 'Frequency and duration of physical aggression within the last 30 days', 'question 1 as the payer wrote it');
eq(await page.locator('#root .b2-doc.draft[data-doc] .b2-ans').count(), 3, 'one answer per question, nothing else');
log(await page.locator('#root .b2-doc.draft .b2-src').count() >= 5, 'numbered source chips in the draft');
log(!/Sincerely|Thank you for your request|Please contact me/.test(await text('#root .b2-doc.draft')), 'the reply answers what was asked and stops');
eq(await page.locator('#root .u-btn.pri').count(), 1, 'one filled button');
has(await text('#root .b2-foot .u-btn.pri'), 'Open Availity and send', 'filled button is Open Availity and send');
has(await text('#root .b2-foot'), 'Edit as text', 'Edit as text');
// edit as text
await page.getByRole('button', { name: 'Edit as text' }).click();
await page.waitForSelector('#irText');
const edited = (await page.inputValue('#irText')).replace('K.T. was physically aggressive', 'K.T. was physically aggressive (checked against the incident log)');
await page.fill('#irText', edited);
await clearToasts(); await page.getByRole('button', { name: 'Save' }).click();
has(await toast('Saved'), 'Saved', 'save toast');
const saved = await poll(async () => (await req('R-0408')).info_reply?.text);
has(saved || '', 'checked against the incident log', 'request.infoReply stored the edit');
await page.waitForSelector('#root .b2-doc.draft'); has(await text('#root .u-card, #root main'), 'Edited', 'draft is marked Edited');
// send through the mock Availity portal
const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: 'Open Availity and send' }).click()]);
await popup.waitForURL(/\/availity\/upload/, { timeout: 8000 });
has(popup.url(), 'request=R-0408', 'the mock Availity page opens for R-0408');
has(popup.url(), 'kind=reply', 'as a reply');
let r8 = await poll(async () => { const x = await req('R-0408'); return x.stage === 'portal_open' ? x : null; });
eq(r8?.stage, 'portal_open', 'request.infoSend → Portal open');
has(r8?.info_reply?.text || '', 'checked against the incident log', 'the edited text is what was sent');
await popup.waitForSelector('#portal-form');
await popup.fill('#reply', r8.info_reply.text);
await popup.click('button[type=submit]');
await popup.waitForSelector('#portal-confirmation');
r8 = await poll(async () => { const x = await req('R-0408'); return x.stage === 'submitted' ? x : null; }, 8000);
eq(r8?.stage, 'submitted', 'the extension read the confirmation → Submitted (decision clock restarts)');
await popup.close();
await page.waitForSelector('#root .u-head .u-chip.ok'); eq(await text('#root .u-head .u-chip'), 'Reply sent', 'chip says Reply sent');
eq(await page.locator('#root .b2-foot .u-btn.pri').count(), 0, 'nothing left to send');
// by fax
await reset('live'); await open('InfoRequest?id=R-0408');
await clearToasts(); await page.getByRole('button', { name: 'Send by fax' }).click();
has(await toast('Sent by fax'), 'Sent by fax', 'fax toast');
eq((await poll(async () => { const x = await req('R-0408'); return x.stage === 'submitted' ? x : null; }))?.stage, 'submitted', 'request.infoSend by fax → Submitted');
// drafted answers for a request with no seeded reply (Demo: receive a reply → info)
await reset('live'); await api('request.demoReply', { id: 'R-0399', kind: 'info' });
await open('InfoRequest?id=R-0399');
log(await page.locator('#root ol.b2-q li').count() >= 1, 'a demo information request lists its questions');
log(await page.locator('#root .b2-doc.draft .b2-ans').count() >= 1, 'and a draft that answers each one');

// ------------------------------------------------------------------------------------------------------------ 38 P2P call notes
console.log('P2P call notes · R-0388');
await reset('live');
await open('PeerBrief?id=R-0388');
eq(await text('#root .u-title'), 'Call notes · T.N., 8 · Sentara · Dec 9, 2:00 pm', 'title');
const docText = await text('#root .b2-doc[data-doc]');
for (const h of ['Opening', 'Points', 'Ask', 'Questions to expect', 'Evidence']) has(docText, h, `block "${h}" is inside data-doc`);
has(docText, 'Oct 1, 3, 8, 10, 15, 17, 22, 24, 28', 'Points carry the dated counts');
has(docText, 'Approve the remaining 85 units', 'Ask');
log(!/Assembled in advance|closing/i.test(docText), 'no intro or closing sentence');
eq(await page.locator('#root .u-btn.pri').count(), 1, 'one filled button');
has(await text('#root .b2-foot'), 'Print', 'Print'); has(await text('#root .b2-foot'), 'Log outcome', 'Log outcome');
const [pdf] = await Promise.all([page.waitForEvent('popup'), page.getByRole('button', { name: 'Print' }).click()]);
const brief = await poll(async () => (await state()).files.find(f => f.kind === 'p2p_brief' && f.record === 'R-0388'));
log(!!brief, 'Print saves the call notes as a PDF on the request');
eq(brief ? (await fetch(BASE + brief.url)).status : 0, 200, 'and the PDF opens');
await pdf.close().catch(() => { });
// log an outcome: awaiting, then the decision
await page.getByRole('button', { name: 'Log outcome' }).click();
await page.waitForSelector('#modal:not([hidden]) [name=oc]');
await page.fill('#ocn', 'Reviewer asked for the timer log');
await clearToasts(); await page.click('#modal [data-go]');
has(await toast('Logged'), 'Logged', 'outcome toast');
let r88 = await poll(async () => { const x = await req('R-0388'); return x.stage === 'p2p_awaiting' ? x : null; });
eq(r88?.stage, 'p2p_awaiting', 'request.p2pLog awaiting → P2P held');
has(r88?.p2p_outcome?.notes || '', 'timer log', 'the note is stored');
await page.waitForSelector('#root .u-head .u-chip.watch');
eq(await text('#root .u-head .u-chip'), 'Awaiting decision', 'chip says Awaiting decision');
has(await text('#root .b2-foot .u-btn.pri'), 'Log decision', 'button becomes Log decision');
await page.getByRole('button', { name: 'Log decision' }).click();
await page.waitForSelector('#modal:not([hidden]) [name=oc]');
await page.check('#modal [name=oc][value=partial]'); await page.fill('#ocu', '100');
await page.click('#modal [data-go]');
r88 = await poll(async () => { const x = await req('R-0388'); return x.stage === 'active' ? x : null; });
eq(r88?.stage, 'active', 'approved in part → Authorized'); eq(r88?.units_awarded, 100, '100 units awarded');
// a P2P with no call date yet: enter the date (stage peer_to_peer_requested)
await reset('live'); await api('request.partialChoice', { id: 'R-0402', choice: 'p2p', plan: {}, by: AS });
await open('PeerBrief?id=R-0402');
eq(await text('#root .u-head .u-chip'), 'Date needed', 'no call date yet → Date needed');
await page.getByRole('button', { name: 'Enter date' }).click();
await page.waitForSelector('#modal:not([hidden]) #p2pd');
await page.fill('#p2pd', '2026-11-19T14:00');
await page.click('#modal [data-go]');
const r02 = await poll(async () => { const x = await req('R-0402'); return x.stage === 'peer_to_peer_booked' ? x : null; });
eq(r02?.p2p_at, '2026-11-19T14:00', 'request.p2pSchedule stored the call date'); eq(r02?.stage, 'peer_to_peer_booked', 'stage is P2P booked');
has(await poll(async () => { const t = await text('#root .u-title'); return /Nov 19/.test(t) ? t : null; }) || await text('#root .u-title'), 'Nov 19, 2:00 pm', 'the title carries the call date');

// ------------------------------------------------------------------------------------------------------------ denial · 35
console.log('Denial · R-0384');
await reset('live');
await open('Partials?id=R-0384');
has(await text('#root main'), 'Denied · appeal window 51 days', 'one line: Denied · appeal window 51 days');
const gl = page.getByRole('link', { name: 'Guardian letter' });
has(await gl.getAttribute('href'), 'AppealLetter', '[Guardian letter] links to the appeal letter');
eq(await page.locator('#root .hlp').count(), 0, 'nothing else on the denial page (no ?)');
log(words(await text('#root main')) <= 20, 'the denial page is a handful of words');

// ------------------------------------------------------------------------------------------------------------ 39 Appeal letter
console.log('Appeal letter · R-0384 (guardian phone)');
await page.setViewportSize({ width: 390, height: 844 });
await reset('live');
await open('AppealLetter?id=R-0384');
has(await text('#root'), "Ethan's insurance decision", 'header'); has(await text('#root'), 'Anthem said no · Oct 22', 'denial chip');
has(await text('#root .ap-letter'), "I am Ethan's guardian", 'the letter (English)');
log(await page.locator('#root [data-doc]').count() >= 1, 'the letter is data-doc');
await page.getByRole('button', { name: 'ES', exact: true }).click(); await page.waitForTimeout(200);
has(await text('#root .ap-letter'), 'Soy el tutor de Ethan', 'ES toggle → Spanish letter'); has(await text('#root'), 'Firmar y enviar', 'chrome in Spanish');
await page.getByRole('button', { name: 'EN', exact: true }).click(); await page.waitForTimeout(200);
has(await text('#root .ap-letter'), "I am Ethan's guardian", 'EN toggle → English letter');
// change the wording
await page.getByRole('button', { name: 'Change wording' }).click();
await page.waitForSelector('#letter');
await page.fill('#letter', (await page.inputValue('#letter')) + ' Ethan has had four office referrals this month.');
await page.getByRole('button', { name: 'Done' }).click();
// sign and send
await page.getByRole('button', { name: 'Sign and send' }).click();
await page.waitForSelector('#sig');
await page.fill('#signer', 'Test Guardian');
const cv = await page.locator('#sig').boundingBox();
await page.mouse.move(cv.x + 30, cv.y + 60); await page.mouse.down(); await page.mouse.move(cv.x + 120, cv.y + 30, { steps: 6 }); await page.mouse.move(cv.x + 220, cv.y + 80, { steps: 6 }); await page.mouse.up();
await page.getByRole('button', { name: 'Sign and send' }).click();
const r84 = await poll(async () => { const x = await req('R-0384'); return x.stage === 'appeal_sent' ? x : null; });
eq(r84?.stage, 'appeal_sent', 'request.appealSign → Appeal sent');
eq(r84?.appeal?.signer, 'Test Guardian', 'signed by the guardian');
has(r84?.appeal?.text || '', 'four office referrals this month', 'the changed wording is what was signed');
const pdfRes = await fetch(BASE + (r84?.appeal?.file || '/none'));
eq(pdfRes.status, 200, 'the signed letter is a real file'); has(pdfRes.headers.get('content-type'), 'pdf', 'and a PDF');
await page.waitForSelector('#root .ap-card a[href*="/files/"]'); has(await text('#root'), 'Signed letter (PDF)', 'the page links the signed PDF');
eq(await page.locator('#root button', { hasText: 'Sign and send' }).count(), 0, 'nothing left to sign');
await page.setViewportSize({ width: 1440, height: 900 });

// ------------------------------------------------------------------------------------------------------------ both presets
console.log('Both presets render every page');
for (const preset of ['live', 'canvas']) {
  await reset(preset);
  for (const route of ['InfoRequest', 'Partials', 'Partials?id=R-0384', 'PeerBrief', 'EarlyDischarge', 'AppealLetter?id=R-0384']) {
    errs.length = 0;
    await open(route);
    const bad = await page.locator('#root pre.err').count();
    log(bad === 0 && errs.length === 0 && (await text('#root')).length > 20, `${preset} · ${route}${errs.length ? ' — ' + errs.join(' | ').slice(0, 160) : ''}`);
  }
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
