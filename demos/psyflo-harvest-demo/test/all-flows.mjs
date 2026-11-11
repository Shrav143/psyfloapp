// Runs every flow test in order against the server named by BASE (default http://localhost:4000). Resets to the live preset first.
//   BASE=http://localhost:4000 node test/all-flows.mjs
import { spawnSync } from 'node:child_process'; import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:4000';
const tests = ['flowD', 'flowA', 'flowB', 'flowC', 'flowE', 'flowF', 'flowG', 'decisions', 'docs-analytics', 'panels'].filter(t => fs.existsSync(new URL(`./${t}.mjs`, import.meta.url)));
let fail = 0;
for (const t of tests) {
  await fetch(BASE + '/api/do', { method: 'POST', body: JSON.stringify({ action: 'demo.reset', args: { preset: 'live' } }) }).catch(() => { });
  const r = spawnSync('node', [new URL(`./${t}.mjs`, import.meta.url).pathname], { env: { ...process.env, BASE }, encoding: 'utf8', timeout: 240000 });
  const ok = r.status === 0; if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${t}`); if (!ok) console.log((r.stdout + r.stderr).split('\n').slice(-12).join('\n'));
}
console.log(`\n${tests.length - fail} of ${tests.length} flow tests pass`); process.exit(fail ? 1 : 0);
