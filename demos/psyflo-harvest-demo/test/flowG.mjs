// Flow G · the day-10 payer follow-up: a request sent 10 days ago reads "Day 10 · follow-up" (with the ? clock tip) and has a Worklist
// row; Log call writes an entry on the activity log; a logged call takes the row off the Worklist; "Not found" offers Resend, and
// Resend sends the packet again through the Sfax stub (the day count restarts).
//   BASE=http://localhost:4310 PW=/opt/node22/lib/node_modules/playwright/index.js node test/flowG.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/node22/lib/node_modules/playwright/index.js');
const APP = process.env.BASE || 'http://localhost:4000';
const doA = async (action, args) => { const r = await fetch(APP + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) }).then(r => r.json()); if (!r.ok) throw new Error(action + ': ' + r.error); return r.result; };
const state = () => fetch(APP + '/api/state').then(r => r.json());
const log = (...a) => console.log('·', ...a);
let fail = 0; const check = (name, ok, extra = '') => { console.log(ok ? '  ok ' : ' FAIL', name, ok ? '' : extra); if (!ok) fail++; };
const until = async (fn, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise(r => setTimeout(r, 200)); } return false; };
const shots = process.env.SHOTS || '/tmp';

await doA('demo.reset', { preset: 'live' });
let s = await state(); let r = s.requests.find(q => q.id === 'R-0399');
log('R-0399 sent', r.sent, 'today', s.today, 'stage', r.stage);
const b = await chromium.launch(); const errs = [];
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errs.push(m.text()); });
await p.goto(APP + '/#/Login'); await p.evaluate(() => localStorage.setItem('psyflo_user', 'jperez'));

// the Worklist row
await p.goto(APP + '/#/DoNext'); await p.waitForTimeout(800);
const wrow = () => p.locator('.u-row', { hasText: 'Humana · payer follow-up' });
const n0 = parseInt((await p.locator('.u-headline').innerText()), 10); const aw0 = parseInt((await p.locator('.b1-line').innerText()).replace(/\D+/g, ''), 10);
check('Worklist has the day-10 row', (await wrow().count()) === 1 && /Day 10/.test(await wrow().innerText()), await p.locator('.u-rows').innerText());
check('its button opens the request', /open=R-0399/.test(await wrow().getByRole('link', { name: 'Open' }).getAttribute('href')));

// the table row and its ? tip
await p.goto(APP + '/#/Authorizations'); await p.waitForTimeout(800);
const row = p.locator('tr[data-row="R-0399"]');
check('status reads Day 10 · follow-up', /Day 10 · follow-up/.test(await row.innerText()), await row.innerText());
const tip = row.locator('.hlp'); check('the chip carries the ? clock tip', (await tip.getAttribute('data-help')) === 'Harvest calls at day 10. Public rule: 7 days. Many payers take 14.');
await tip.hover(); await p.waitForTimeout(400); check('the tip shows on hover', (await p.locator('.tip').innerText()).startsWith('Harvest calls at day 10'));
await p.keyboard.press('Escape');

// the drawer and Log call
await row.click(); await p.locator('.u-drawer').waitFor();
const dr = p.locator('.u-drawer');
check('drawer offers Log call (filled) and Send notice (secondary)', (await dr.getByRole('button', { name: 'Log call' }).getAttribute('class')).includes('pri') && !(await dr.getByRole('button', { name: 'Send notice' }).getAttribute('class')).includes('pri'));
check('drawer lists the signed PDF and the fax receipt', (await dr.getByRole('button', { name: 'Signed PDF' }).count()) === 1 && (await dr.getByRole('button', { name: 'Fax receipt' }).count()) === 1);
await dr.getByRole('button', { name: 'Log call' }).click(); await p.locator('#modal .mbox').waitFor();
const outs = await p.locator('#modal input[name="b1-out"]').count(); check('the modal has the four outcomes', outs === 4, String(outs));
await p.screenshot({ path: shots + '/flowG-1-log-call.png' });
await p.locator('#modal #b1-note').fill('Spoke to Dee at provider services');
await p.locator('#modal [data-go]').click();
check('request.followUp is stored', await until(async () => (await state()).requests.find(q => q.id === 'R-0399').follow_up?.outcome === 'received'));
s = await state(); r = s.requests.find(q => q.id === 'R-0399');
const ev = s.events.filter(e => e.record === 'R-0399').at(-1);
check('the audit trail has the call', /^Payer follow-up call · receipt confirmed, in review · Spoke to Dee/.test(ev.what), ev.what);
await p.waitForTimeout(500);
check('the drawer activity log shows the call', /Payer follow-up call · receipt confirmed/.test(await dr.innerText()));

// the Worklist after the call
await p.goto(APP + '/#/DoNext'); await p.waitForTimeout(800);
check('the logged call takes the row off the Worklist', (await wrow().count()) === 0);
const n1 = parseInt((await p.locator('.u-headline').innerText()), 10); const aw1 = parseInt((await p.locator('.b1-line').innerText()).replace(/\D+/g, ''), 10);
check('the headline count drops and Awaiting response grows', n1 === n0 - 1 && aw1 === aw0 + 1, `${n0}→${n1}, ${aw0}→${aw1}`);

// a second call: fax not found → Resend
await p.goto(APP + '/#/Authorizations?open=R-0399'); await p.waitForTimeout(800);
await dr.getByRole('button', { name: 'Log call' }).click(); await p.locator('#modal .mbox').waitFor();
await p.locator('#modal input[value="not_found"]').check(); await p.locator('#modal [data-go]').click();
check('"Not found" flags the request for a resend', await until(async () => (await state()).requests.find(q => q.id === 'R-0399').resend === true));
await dr.getByRole('button', { name: 'Resend' }).waitFor({ timeout: 5000 });
check('the drawer now offers Resend', (await dr.getByRole('button', { name: 'Resend' }).count()) === 1 && (await dr.getByRole('button', { name: 'Log call' }).count()) === 0);
await p.goto(APP + '/#/DoNext'); await p.waitForTimeout(700);
check('the Worklist row is back (a resend is needed)', (await wrow().count()) === 1);
await p.goto(APP + '/#/Authorizations?open=R-0399'); await p.waitForTimeout(700);
await dr.getByRole('button', { name: 'Resend' }).click();
check('Resend runs the Sfax stub again', await until(async () => { const q = (await state()).requests.find(x => x.id === 'R-0399'); return q.stage === 'submitted' && String(q.sent).slice(0, 10) === s.today && q.fax_ref !== 'F-2280'; }));
s = await state(); r = s.requests.find(q => q.id === 'R-0399');
check('the resend flag is cleared and the day count restarts', !r.resend && String(r.sent).slice(0, 10) === s.today, JSON.stringify({ resend: r.resend, sent: r.sent }));
await p.waitForTimeout(700);
check('the drawer reads Submitted · Day 0', /Submitted · Day 0/.test(await dr.innerText()));
await p.screenshot({ path: shots + '/flowG-2-resent.png' });
log('errors:', errs.length ? errs : 'none'); if (errs.length) fail++;
await b.close();
if (fail) { console.log(fail + ' check(s) failed'); process.exit(1); } else console.log('flow G passed');
