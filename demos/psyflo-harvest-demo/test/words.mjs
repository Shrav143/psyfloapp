// Word budgets (design prompt §3.1). Visits every registered screen, counts visible words in #root (or inside the panel frame
// for Lauris screens), excluding anything inside [data-doc] (drafted note text, letters, call scripts, transcripts, form boxes).
//   BASE=http://localhost:4000 AS=dowens node test/words.mjs [ScreenId ...]     (--json out.json to save the table)
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)(process.env.PW || '/opt/node22/lib/node_modules/playwright/index.js');
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:4000';
const args = process.argv.slice(2); const ji = args.indexOf('--json'); const jsonOut = ji >= 0 ? args.splice(ji, 2)[1] : null;
const only = args.filter(a => !a.startsWith('--'));
const { SCREENS } = await import('../web/js/registry.js');
const BUDGET = { app: 150, worklist: 120, ext: 100, phone: 60, parent: 70, school: 150, canvas: 400 };
const budgetFor = s => s.id === 'DoNext' ? BUDGET.worklist : BUDGET[s.surface] ?? 150;
// Count in the live DOM: hide what is excluded, then read innerText (a detached clone glues inline elements together and undercounts).
const countWords = () => {
  const root = document.querySelector('#root') || document.body;
  const st = document.createElement('style');
  st.textContent = '[data-doc], aside, script, style, template, input, textarea, select, svg, .tip { display: none !important; }'; // the generated sidebar is shell, not screen copy
  document.head.appendChild(st);
  const n = (root.innerText || '').split(/\s+/).filter(Boolean).length;
  st.remove(); return n;
};
const b = await chromium.launch(); const rows = []; let fail = 0;
for (const s of SCREENS) {
  if (s.id === 'Login' || (only.length && !only.includes(s.id))) continue;
  const narrow = ['phone', 'parent'].includes(s.surface);
  const ctx = await b.newContext({ viewport: narrow ? { width: 390, height: 844 } : { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/#/Login'); await p.evaluate(u => localStorage.setItem('psyflo_user', u), process.env.AS || 'dowens');
  let words = null, err = '';
  try {
    await p.goto(BASE + '/#/' + s.id); await p.waitForTimeout(s.surface === 'ext' ? 2200 : 800);
    if (s.surface === 'ext') { const pf = p.frames().find(f => /\/panel/.test(f.url())); words = pf ? await pf.evaluate(countWords) : null; if (words == null) err = 'no panel frame'; }
    else words = await p.evaluate(countWords);
  } catch (e) { err = String(e).slice(0, 80); }
  const budget = budgetFor(s); const over = words != null && words > budget; if (over || err) fail++;
  rows.push({ n: s.n, id: s.id, surface: s.surface, phase: s.phase, words, budget, over, err });
  await ctx.close();
}
await b.close();
for (const r of rows) console.log(String(r.n).padStart(2), r.id.padEnd(16), r.surface.padEnd(7), String(r.words ?? '-').padStart(4), '/', String(r.budget).padStart(3), r.over ? 'OVER' : r.err ? 'ERR ' + r.err : 'ok');
const tot = rows.filter(r => r.words != null); console.log(`\n${tot.length} screens · total ${tot.reduce((a, r) => a + r.words, 0)} words · ${fail} over budget or failing`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(rows, null, 1));
process.exit(fail ? 1 : 0);
