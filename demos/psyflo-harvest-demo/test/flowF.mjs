// Flow F · weekly eligibility re-verification through the UI: the Worklist says "12 due"; Start opens the list (due today first);
// Verify needs a screenshot (a file, or the demo's "Use the DMAS screenshot"); saving calls eligibility.verify, stores the dated proof
// in Psyflo, moves the next due date seven days out, and the Worklist count drops.
//   BASE=http://localhost:4310 PW=/opt/node22/lib/node_modules/playwright/index.js node test/flowF.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/node22/lib/node_modules/playwright/index.js');
const APP = process.env.BASE || 'http://localhost:4000';
const doA = async (action, args) => { const r = await fetch(APP + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) }).then(r => r.json()); if (!r.ok) throw new Error(action + ': ' + r.error); return r.result; };
const state = () => fetch(APP + '/api/state').then(r => r.json());
const log = (...a) => console.log('·', ...a);
let fail = 0; const check = (name, ok, extra = '') => { console.log(ok ? '  ok ' : ' FAIL', name, ok ? '' : extra); if (!ok) fail++; };
const until = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise(r => setTimeout(r, 150)); } return false; };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const shots = process.env.SHOTS || '/tmp';

await doA('demo.reset', { preset: 'live' });
let s = await state();
const due0 = s.eligibility.filter(e => e.kind === 'reverify' && e.next_check <= s.today).length;
log('today', s.today, '· rows due', due0, 'of', s.eligibility.filter(e => e.kind === 'reverify').length);

const b = await chromium.launch(); const errs = [];
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errs.push(m.text()); });
await p.goto(APP + '/#/Login'); await p.evaluate(() => localStorage.setItem('psyflo_user', 'jperez'));
await p.goto(APP + '/#/DoNext'); await p.waitForTimeout(800);
const wl = p.locator('.u-row', { hasText: 'Eligibility re-verification' });
check(`Worklist line reads "${due0} due"`, (await wl.innerText()).includes(`${due0} due`), await wl.innerText());
await wl.getByRole('link', { name: 'Start' }).click(); await p.waitForURL(/#\/Eligibility/); await p.waitForTimeout(500);
check('list is titled Eligibility re-verification', (await p.locator('h1').innerText()) === 'Eligibility re-verification');
const heads = (await p.locator('thead th').allInnerTexts()).map(t => t.replace(/\s*\?$/, '').trim());
check('columns are Student, Last verified, Result, Proof, Next due', ['Student', 'Last verified', 'Result', 'Proof', 'Next due'].every((h, i) => heads[i] === h), heads.join('|'));
const rows = p.locator('tbody tr'); const n0 = await rows.count();
check('every re-verification row is listed', n0 === s.eligibility.filter(e => e.kind === 'reverify').length, String(n0));
const firstNext = await rows.first().locator('td').nth(4).innerText(); check('rows due today are first', firstNext.trim() === 'Oct 29', firstNext);
check('the proof column carries the ? tip', (await p.locator('thead .hlp').getAttribute('data-help')) === 'Dated screenshot kept in Psyflo, not in Lauris.');
await p.locator('thead .hlp').hover(); await p.waitForTimeout(400);
check('the tip shows on hover', (await p.locator('.tip').innerText()) === 'Dated screenshot kept in Psyflo, not in Lauris.');

// first row: Verify needs the screenshot
const client = s.eligibility.filter(e => e.kind === 'reverify').sort((a, b) => a.next_check.localeCompare(b.next_check) || a.checked_at.localeCompare(b.checked_at))[0].client;
const before = (await state()).eligibility.find(e => e.kind === 'reverify' && e.client === client);
await rows.first().getByRole('button', { name: 'Verify' }).click(); await p.locator('#modal .mbox').waitFor();
check('modal links to the mock DMAS lookup in a new tab', await p.locator('#modal a[target=_blank]').getAttribute('href').then(h => /\/dmas\/lookup/.test(h)));
check('Save waits for a screenshot', (await p.locator('#modal [data-go]').getAttribute('aria-disabled')) === 'true');
await p.locator('#modal [data-go]').click({ force: true }); await p.waitForTimeout(300);
check('nothing was saved without a screenshot', (await state()).eligibility.find(e => e.kind === 'reverify' && e.client === client).next_check === before.next_check);
await p.screenshot({ path: shots + '/flowF-1-modal.png' });
await p.locator('#modal #b1-demo').click();
check('Save is enabled once the screenshot is attached', (await p.locator('#modal [data-go]').getAttribute('aria-disabled')) === null);
await p.locator('#modal [data-go]').click();
check('eligibility.verify stored the result', await until(async () => (await state()).eligibility.find(e => e.kind === 'reverify' && e.client === client).next_check === '2026-11-05'));
s = await state(); const after = s.eligibility.find(e => e.kind === 'reverify' && e.client === client);
check('history kept the earlier check', after.history.length === (before.history || []).length + 1);
check('the proof is a dated file kept in Psyflo', /^DMAS_.*\.pdf$/.test(after.screenshot) && s.files.some(f => f.kind === 'eligibility_proof' && f.name === after.screenshot));
const f = s.files.find(f => f.kind === 'eligibility_proof' && f.name === after.screenshot); const pdf = await fetch(APP + f.url);
check('the proof opens as a PDF', pdf.status === 200 && /pdf/.test(pdf.headers.get('content-type')), String(pdf.status));
check('the student event is on the audit trail', s.events.some(e => e.record === client && /^Eligibility re-verified/.test(e.what)));
await p.waitForTimeout(500);
check('the verified row now reads Nov 5', (await p.locator('tbody tr', { hasText: 'Nov 5' }).count()) === 1);

// second row: a picked image file
const client2 = s.eligibility.filter(e => e.kind === 'reverify').sort((a, b) => a.next_check.localeCompare(b.next_check) || a.checked_at.localeCompare(b.checked_at))[0].client;
await p.locator('tbody tr').first().getByRole('button', { name: 'Verify' }).click(); await p.locator('#modal .mbox').waitFor();
await p.locator('#modal #b1-res').selectOption('inactive');
await p.locator('#modal #b1-file').setInputFiles({ name: 'dmas.png', mimeType: 'image/png', buffer: PNG });
await p.locator('#modal #b1-shot').getByText('dmas.png').waitFor();
await p.locator('#modal [data-go]').click();
check('a picked screenshot is accepted', await until(async () => (await state()).eligibility.find(e => e.kind === 'reverify' && e.client === client2).result === 'inactive'));
s = await state(); const e2 = s.eligibility.find(e => e.kind === 'reverify' && e.client === client2);
const f2 = s.files.find(x => x.kind === 'eligibility_proof' && x.name === e2.screenshot); const size2 = f2 ? (await (await fetch(APP + f2.url)).arrayBuffer()).byteLength : 0;
check('the picked image is inside the stored PDF', size2 > (await (await fetch(APP + f.url)).arrayBuffer()).byteLength, String(size2));
check('the client record shows the new status', s.clients.find(c => c.id === client2).medicaid.status === 'inactive');

await p.goto(APP + '/#/DoNext'); await p.waitForTimeout(700);
const wl2 = p.locator('.u-row', { hasText: 'Eligibility re-verification' });
check(`Worklist drops to "${due0 - 2} due"`, (await wl2.innerText()).includes(`${due0 - 2} due`), await wl2.innerText());
await p.screenshot({ path: shots + '/flowF-2-worklist.png' });
log('errors:', errs.length ? errs : 'none'); if (errs.length) fail++;
await b.close();
if (fail) { console.log(fail + ' check(s) failed'); process.exit(1); } else console.log('flow F passed');
