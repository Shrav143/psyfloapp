// Flow E · internal approval before signature: a processed request waits as "Pending clinical approval"; the admin approves it in the
// Authorizations drawer; Get Signature (through the API, as the extension reports it) makes it ready to submit; Send by fax in the
// drawer runs the Sfax stub and the request becomes Submitted.
//   BASE=http://localhost:4310 PW=/opt/node22/lib/node_modules/playwright/index.js node test/flowE.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/node22/lib/node_modules/playwright/index.js');
const APP = process.env.BASE || 'http://localhost:4000';
const doA = async (action, args) => { const r = await fetch(APP + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) }).then(r => r.json()); if (!r.ok) throw new Error(action + ': ' + r.error); return r.result; };
const state = () => fetch(APP + '/api/state').then(r => r.json());
const log = (...a) => console.log('·', ...a);
let fail = 0; const check = (name, ok, extra = '') => { console.log(ok ? '  ok ' : ' FAIL', name, ok ? '' : extra); if (!ok) fail++; };
const until = async (fn, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise(r => setTimeout(r, 200)); } return false; };

await doA('demo.reset', { preset: 'live' });
await doA('request.ensure', { id: 'R-0416', client: 'TW', type: 'initial' });
await doA('request.processed', { id: 'R-0416', session: 'flowE' });
let s = await state(); let r = s.requests.find(q => q.id === 'R-0416');
check('processed request is pending approval', r.stage === 'needs_approval', r.stage);

const b = await chromium.launch(); const errs = [];
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errs.push(m.text()); });
await p.goto(APP + '/#/Login'); await p.evaluate(() => localStorage.setItem('psyflo_user', 'dowens'));
await p.goto(APP + '/#/Authorizations'); await p.waitForTimeout(800);
const row = p.locator('tr[data-row="R-0416"]');
check('row reads Pending clinical approval', /Pending clinical approval/.test(await row.innerText()));
check('row button is Approve', (await row.getByRole('button', { name: 'Approve' }).count()) === 1);
await row.click(); await p.locator('.u-drawer').waitFor();
check('drawer has the approval tip', (await p.locator('.u-drawer .hlp').count()) === 1);
await p.screenshot({ path: (process.env.SHOTS || '/tmp') + '/flowE-1-approve.png' });
await p.locator('.u-drawer').getByRole('button', { name: 'Approve' }).click();
check('stage is awaiting_signature after Approve', await until(async () => (await state()).requests.find(q => q.id === 'R-0416').stage === 'awaiting_signature'));
s = await state(); r = s.requests.find(q => q.id === 'R-0416');
check('approval is on the audit trail', s.events.some(e => e.record === 'R-0416' && /^Approved by Dana Owens/.test(e.what)));
check('approved_by is recorded', r.approved_by === 'dowens');
await p.locator('.u-drawer').getByText('Pending signature').waitFor({ timeout: 5000 }).catch(() => { });
check('drawer now points to Lauris for the signature', (await p.locator('.u-drawer').innerText()).includes('Sign in Lauris'));

await doA('request.signed', { id: 'R-0416', preview: [{ text: 'TDT Initial SRA · T.W.' }, { text: 'Section I · criterion 1' }] });
s = await state(); check('stage is signed after Get Signature', s.requests.find(q => q.id === 'R-0416').stage === 'signed');
const send = p.locator('.u-drawer').getByRole('button', { name: 'Send by fax' });
check('drawer shows Send by fax', await send.waitFor({ timeout: 5000 }).then(() => true).catch(() => false));
await p.screenshot({ path: (process.env.SHOTS || '/tmp') + '/flowE-2-send.png' });
await send.click();
check('request becomes submitted (Sfax stub)', await until(async () => (await state()).requests.find(q => q.id === 'R-0416').stage === 'submitted'));
s = await state(); r = s.requests.find(q => q.id === 'R-0416');
log('sent', r.sent, r.fax_ref, 'decision due', r.decision_due, 'call on', r.call_on);
check('fax reference and the 14-day window are set', !!r.fax_ref && r.decision_due === new Date(Date.parse(r.sent.slice(0, 10) + 'T00:00:00Z') + 14 * 864e5).toISOString().slice(0, 10));
await p.waitForTimeout(600);
const drawer = await p.locator('.u-drawer').innerText();
check('drawer status reads Submitted · Day 0', /Submitted · Day 0/.test(drawer), drawer.slice(0, 120));
check('activity log lists the approval and the Sfax receipt', /Approved by Dana Owens/.test(drawer) && /Delivery receipt/.test(drawer));
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
check('Escape closes the drawer', (await p.locator('.u-drawer').count()) === 0);
log('errors:', errs.length ? errs : 'none'); if (errs.length) fail++;
await b.close();
if (fail) { console.log(fail + ' check(s) failed'); process.exit(1); } else console.log('flow E passed');
