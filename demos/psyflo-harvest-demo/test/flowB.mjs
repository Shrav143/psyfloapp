// Flow B: a dictation saved on the phone waits in Psyflo; opening M.R.'s daily note drops it in; Process Form → 5 of 6.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/node-tools/node_modules/playwright');
const APP = process.env.BASE || 'http://localhost:4000'; const LAURIS = APP.replace(/:(\d+)$/, (m, p) => ':' + (+p + 1));
const shot = process.env.SHOTS || '/tmp/claude-0/-home-user/18129bb2-2284-5dc6-923b-ddd08b39fc66/scratchpad';
const doA = async (action, args) => { const r = await fetch(APP + '/api/do', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, args }) }).then(r => r.json()); if (!r.ok) throw new Error(action + ': ' + r.error); return r.result; };
const state = () => fetch(APP + '/api/state').then(r => r.json());
const log = (...a) => console.log('·', ...a);
const nt = s => { const mine = s.clients.filter(c => c.staff === 'khale'); const done = new Set(s.notes.filter(n => n.staff === 'khale' && n.type === 'daily' && n.date === s.today).map(n => n.client)); return `${mine.filter(c => done.has(c.id)).length} of ${mine.length}`; };

if (!process.env.KEEP) await doA('demo.reset', { preset: 'live' });
log('daily notes today before:', nt(await state()));
if (!(await state()).dictations.some(d => d.client === 'MR' && d.status === 'waiting'))
  await doA('dictation.save', { client: 'MR', staff: 'khale', spoken: 'played basketball with M.R. after he got upset in math, he cooled down after and went back to class', rewritten: '' });
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`${LAURIS}/login?as=khale&next=${encodeURIComponent('/consumers/3310/session/dpn')}`);
const panel = () => p.frameLocator('#psyflo-frame');
await panel().getByText('Dictation dropped in').waitFor({ timeout: 20000 });
const v = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#lauris-form label[for]')].map(l => [l.textContent, document.getElementById(l.htmlFor).value])));
log('Narrative:', v['Narrative'].slice(0, 90) + '…'); log('Direct time:', v['Direct time'], '· Units:', v['Units'], '· Mood:', v['Mood check-in']);
await p.screenshot({ path: shot + '/flowB-1-dropped.png' });
await panel().getByRole('button', { name: /^Confirm \d units/ }).click();
await p.waitForTimeout(800);
await p.getByRole('button', { name: 'Process Form' }).click();
await p.waitForURL(/processed=/); await p.waitForTimeout(1500);
const s = await state();
log('daily notes today after:', nt(s), '· dictation:', s.dictations.find(d => d.client === 'MR').status, '· M.R. units used:', s.clients.find(c => c.id === 'MR').authorization.used);
await p.screenshot({ path: shot + '/flowB-2-processed.png' });
log('errors:', errs.length ? errs : 'none');
await b.close();
