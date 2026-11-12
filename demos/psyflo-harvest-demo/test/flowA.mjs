// Flow A end to end: family link → eligibility → create consumer → screening call → Process Form → CNA.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/node-tools/node_modules/playwright');
const APP = process.env.BASE || 'http://localhost:4000'; const LAURIS = APP.replace(/:(\d+)$/, (m, p) => ':' + (+p + 1));
const shot = process.env.SHOTS || '/tmp/claude-0/-home-user/18129bb2-2284-5dc6-923b-ddd08b39fc66/scratchpad';
const doA = async (action, args) => { const r = await fetch(APP + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) }).then(r => r.json()); if (!r.ok) throw new Error(action + ': ' + r.error); return r.result; };
const state = () => fetch(APP + '/api/state').then(r => r.json());
const log = (...a) => console.log('·', ...a);

await doA('demo.reset', { preset: 'live' });
const { token } = await doA('familyLink.send', { referral: 'REF-118' });
await doA('familyLink.open', { token });
await doA('familyLink.step', { token, step: 'guardian', answers: { guardian_name: 'Denise Rivers', relationship: 'grandmother', phone: '(434) 555-0147', language: 'English' } });
await doA('familyLink.step', { token, step: 'insurance', answers: { plan_kind: 'Medicaid through a health plan', medicaid_id: '0912 456 789 01', dob: '2014-03-14' } });
await doA('familyLink.submit', { token });
await doA('eligibility.record', { referral: 'REF-118', result: 'active', plan: 'humana', effective: '2026-07-01' });
log('family link + eligibility recorded');

const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`${LAURIS}/login?as=jperez&next=${encodeURIComponent('/consumers/new?referral=REF-118')}`);
const panel = () => p.frameLocator('#psyflo-frame');
await panel().getByRole('button', { name: /Fill \d+ boxes/ }).click();
await panel().getByText(/\d+ boxes? typed/).waitFor({ timeout: 20000 });
log('new consumer boxes typed:', await p.evaluate(() => [...document.querySelectorAll('#lauris-form .in.y')].length));
await p.getByRole('button', { name: 'Save Consumer' }).click();
await p.waitForURL(/consumers\/\d+\?created/);
await panel().getByRole('button', { name: 'Open screening' }).click();
await p.waitForURL(/session\/screening/);
// stepper Fill · Record · Review: step 1 types the boxes from the referral and the family link
await panel().getByRole('button', { name: /Fill \d+ boxes/ }).click();
await p.waitForFunction(() => document.querySelectorAll('#lauris-form .in.y').length >= 6, null, { timeout: 15000 });
log('pre-call boxes yellow:', await p.evaluate(() => document.querySelectorAll('#lauris-form .in.y').length));
// step 2: Record stays disabled until Consent read is ticked
const rec = panel().getByRole('button', { name: 'Record', exact: true });
await rec.waitFor();
log('Record disabled before consent:', await rec.isDisabled());
await panel().getByLabel('Consent read').check();
await p.waitForTimeout(400);
log('Record enabled after consent:', !(await rec.isDisabled()));
await p.screenshot({ path: shot + '/flowA-1-precall.png' });
const fr = p.frames().find(f => f.url().includes('/panel/'));
await fr.evaluate(() => { window.__psyfloPanel.ui.fast = true; });
// the presenter menu's "Play the scripted call" reaches the panel as a window message (the panel has no button for it)
await p.evaluate(() => document.getElementById('psyflo-frame').contentWindow.postMessage({ psyflo: 'present', cmd: 'script' }, '*'));
await panel().getByText('Still to ask').waitFor();
await p.waitForTimeout(4500);
await p.screenshot({ path: shot + '/flowA-2-recording.png' });
await p.waitForTimeout(6000);
log('prompts ticked while recording:', await panel().locator('.li.done').count());
await panel().getByRole('button', { name: 'Stop', exact: true }).click();
await panel().getByRole('button', { name: /Fill \d+ boxes/ }).click();
await p.waitForFunction(() => /Piedmont/.test(document.querySelector('[id^=f]') && [...document.querySelectorAll('#lauris-form textarea')].map(t => t.value).join(' ')), null, { timeout: 30000 });
await p.waitForTimeout(800);
await p.screenshot({ path: shot + '/flowA-3-drafted.png', fullPage: false });
const vals = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#lauris-form label[for]')].map(l => [l.textContent, document.getElementById(l.htmlFor).value])));
log('Prior services:', vals['Prior / current services (provider · dates · outcome)']);
log('Narrative:', (vals['Narrative summary'] || '').slice(0, 120) + '…');
// the person edits one box, then presses Process Form
await p.fill('#lauris-form textarea >> nth=1', vals['School coordination to date'] + ' (edited by J. Perez)');
await p.getByRole('button', { name: 'Process Form' }).click();
await p.waitForURL(/processed=/);
await p.waitForTimeout(1500);
let s = await state();
log('screening:', s.screenings.find(x => x.client === 'TW')?.status, '· referral stage:', s.referrals.find(r => r.id === 'REF-118').stage, '· clock30:', s.clients.find(c => c.id === 'TW').clock30_start);
await panel().getByRole('button', { name: 'Open intake' }).click();
await p.waitForURL(/session\/cna/);
await panel().getByText('Copied from screening').first().waitFor();
await p.screenshot({ path: shot + '/flowA-4-cna.png' });
await panel().getByRole('button', { name: /^Fill \d+ boxes/ }).click();
await p.waitForTimeout(4000);
const cna = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#lauris-form label[for]')].map(l => [l.textContent, document.getElementById(l.htmlFor).value])));
log('CNA prior services:', cna['Prior services (provider · dates · outcome)']);
log('errors:', errs.length ? errs : 'none');
await b.close();
